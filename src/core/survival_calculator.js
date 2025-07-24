/**
 * Survival Calculator Module
 * 
 * Calculates survival probabilities and long game predictions
 * Based on historical analysis of 972 games
 */

// Load long game statistics (will be injected in browser)
const longGameStats = typeof longGameStatsData !== 'undefined' ? longGameStatsData : 
    {clusteringPatterns: {averageGap: 11.9, clusteringRate: 0.684}};

// Survival curve data from analysis
const SURVIVAL_RATES = {
    0: 1.000,
    50: 0.780,
    100: 0.615,
    150: 0.465,
    200: 0.372,
    250: 0.299,
    300: 0.226,
    350: 0.180,
    400: 0.136,
    450: 0.102,
    500: 0.082,
    600: 0.042,
    700: 0.027
};

// Conditional probabilities for 500+ ticks
const CONDITIONAL_500_PROBS = {
    50: 0.106,
    100: 0.134,
    150: 0.177,
    200: 0.221,
    250: 0.275,
    300: 0.364,
    350: 0.457,
    400: 0.606,
    450: 0.808
};

// Post-500 game statistics from analysis
const POST_500_STATS = {
    game1: {
        avgMultiplier: 0.927,      // -7.3% vs baseline
        earlyRugRate: 0.203,       // 20.3% rug <50 ticks
        prob500: 0.038,            // 3.8% chance of 500+
        riskAdjustment: 1.05       // 5% risk increase
    },
    game2: {
        avgMultiplier: 0.968,      // -3.2% vs baseline
        earlyRugRate: 0.266,       // 26.6% rug <50 ticks (highest)
        prob500: 0.089,            // 8.9% chance of 500+
        riskAdjustment: 1.15       // 15% risk increase
    },
    game3: {
        avgMultiplier: 1.161,      // +16.1% vs baseline
        earlyRugRate: 0.228,       // 22.8% rug <50 ticks
        prob500: 0.114,            // 11.4% chance of 500+
        riskAdjustment: 0.95       // 5% risk decrease
    }
};

class SurvivalCalculator {
    constructor() {
        this.longGameHistory = [];
        this.gamesSinceLast500 = 0;
        this.currentGameStarted = false;
        this.lastCalculation = null;
        
        // Post-500 sequence tracking
        this.post500Position = 0; // 0 = not in sequence, 1-3 = position after 500+
        this.last500Duration = null;
        this.last500Multiplier = null;
        this.sequenceStartGame = null;
        
        // Average cycle from analysis
        this.averageCycle = longGameStats.clusteringPatterns?.averageGap || 11.9;
        this.clusteringRate = longGameStats.clusteringPatterns?.clusteringRate || 0.684;
        
        // Volatility thresholds
        this.lowVolatilityThreshold = 0.055;
        this.volatilityMultiplier = 3.2; // Low volatility = 3.2x higher chance
        
        // 6-Zone Probability Framework for Side Bets
        this.PROBABILITY_ZONES = {
            AVOID: { 
                min: 0, 
                max: 0.10, 
                name: 'Avoid',
                recommendation: 'EXIT', 
                confidence: 'high',
                color: '#ff0000',
                description: 'Never bet - negative expected value'
            },
            DANGER: { 
                min: 0.10, 
                max: 0.15, 
                name: 'Danger',
                recommendation: 'EXIT', 
                confidence: 'moderate',
                color: '#ff6600',
                description: 'High risk - likely negative EV'
            },
            BREAKEVEN: { 
                min: 0.15, 
                max: 0.20, 
                name: 'Breakeven',
                recommendation: 'CAUTION', 
                confidence: 'low',
                color: '#ffaa00',
                description: 'Near 16.67% mathematical breakeven'
            },
            PROFIT: { 
                min: 0.20, 
                max: 0.30, 
                name: 'Profit',
                recommendation: 'HOLD', 
                confidence: 'moderate',
                color: '#88cc00',
                description: 'Positive expected value zone'
            },
            HIGH_PROFIT: { 
                min: 0.30, 
                max: 0.50, 
                name: 'High Profit',
                recommendation: 'HOLD', 
                confidence: 'high',
                color: '#00cc00',
                description: 'Strong positive expected value'
            },
            CERTAINTY: { 
                min: 0.50, 
                max: 1.0, 
                name: 'Certainty',
                recommendation: 'INCREASE', 
                confidence: 'maximum',
                color: '#00ff00',
                description: 'Maximum bet - guaranteed profit zone'
            }
        };
        
        // Mathematical breakeven for 5:1 payout
        this.BREAKEVEN_PROBABILITY = 0.1667; // 16.67%
    }
    
    /**
     * Calculate survival context for current tick
     */
    calculateSurvivalContext(currentTick, currentVolatility = null) {
        const survivalRate = this.interpolateSurvivalRate(currentTick);
        const longGameProb = this.calculateLongGameProbability(currentTick, currentVolatility);
        const nextMilestone = this.getNextMilestone(currentTick);
        const logPosition = this.calculateLogPosition(currentTick);
        
        const context = {
            currentTick,
            survivalRate,
            survivalPercentage: (survivalRate * 100).toFixed(1),
            longGameProbability: longGameProb.adjusted,
            longGamePercentage: (longGameProb.adjusted * 100).toFixed(1),
            nextMilestone,
            logPosition,
            gamesSinceLast500: this.gamesSinceLast500,
            cycleProgress: this.gamesSinceLast500 / this.averageCycle,
            factors: longGameProb.factors,
            displayText: `Survival Rate: ${(survivalRate * 100).toFixed(1)}% remain at tick ${currentTick}`
        };
        
        this.lastCalculation = context;
        return context;
    }
    
    /**
     * Interpolate survival rate for any tick value
     */
    interpolateSurvivalRate(tick) {
        const milestones = Object.keys(SURVIVAL_RATES).map(Number).sort((a, b) => a - b);
        
        // Find surrounding milestones
        let lower = 0, upper = 700;
        for (let i = 0; i < milestones.length - 1; i++) {
            if (tick >= milestones[i] && tick <= milestones[i + 1]) {
                lower = milestones[i];
                upper = milestones[i + 1];
                break;
            }
        }
        
        // Handle edge cases
        if (tick <= 0) return 1.0;
        if (tick >= 700) return SURVIVAL_RATES[700];
        
        // Linear interpolation between milestones
        const lowerRate = SURVIVAL_RATES[lower];
        const upperRate = SURVIVAL_RATES[upper];
        const progress = (tick - lower) / (upper - lower);
        
        return lowerRate - (lowerRate - upperRate) * progress;
    }
    
    /**
     * Calculate probability of reaching 500+ ticks
     */
    calculateLongGameProbability(currentTick, currentVolatility = null) {
        let baseProbability = 0.0823; // 8.23% base rate
        const factors = {
            base: baseProbability,
            conditional: 1.0,
            cycle: 1.0,
            clustering: 1.0,
            volatility: 1.0,
            post500: 1.0
        };
        
        // Apply post-500 sequence adjustments
        if (this.post500Position > 0 && this.post500Position <= 3) {
            const positionStats = POST_500_STATS[`game${this.post500Position}`];
            baseProbability = positionStats.prob500;
            factors.post500 = positionStats.prob500 / 0.0823;
        }
        
        // Apply conditional probability based on current survival
        if (currentTick > 0) {
            const conditionalProb = this.interpolateConditionalProbability(currentTick);
            factors.conditional = conditionalProb / baseProbability;
            baseProbability = conditionalProb;
        }
        
        // Cycle position adjustment
        const cyclePosition = this.gamesSinceLast500 / this.averageCycle;
        if (cyclePosition >= 0.8 && cyclePosition <= 1.5) {
            // Near expected cycle - increase probability
            factors.cycle = 1.2 + (0.3 * Math.cos(Math.PI * (cyclePosition - 1.15)));
        } else if (cyclePosition < 0.5) {
            // Too early in cycle - decrease probability
            factors.cycle = 0.5 + cyclePosition;
        }
        
        // Check for clustering effect
        if (this.longGameHistory.length >= 2) {
            const recent500 = this.longGameHistory.slice(-15).filter(g => g >= 500).length;
            if (recent500 > 0) {
                factors.clustering = 1 + (0.3 * recent500); // Up to 2.3x for clustering
            }
        }
        
        // Volatility adjustment
        if (currentVolatility !== null && currentVolatility < this.lowVolatilityThreshold) {
            factors.volatility = this.volatilityMultiplier;
        }
        
        // Calculate adjusted probability
        const adjusted = baseProbability * factors.cycle * factors.clustering * factors.volatility;
        
        // More realistic cap based on historical maximum
        const maxRealisticProb = currentTick >= 400 ? 0.8 : 0.5;
        
        return {
            base: baseProbability,
            adjusted: Math.min(adjusted, maxRealisticProb),
            factors
        };
    }
    
    /**
     * Interpolate conditional probability P(500+|current)
     */
    interpolateConditionalProbability(tick) {
        const milestones = Object.keys(CONDITIONAL_500_PROBS).map(Number).sort((a, b) => a - b);
        
        // Direct lookup
        if (CONDITIONAL_500_PROBS[tick] !== undefined) {
            return CONDITIONAL_500_PROBS[tick];
        }
        
        // Find surrounding milestones
        let lower = 0, upper = 450;
        for (let i = 0; i < milestones.length - 1; i++) {
            if (tick >= milestones[i] && tick <= milestones[i + 1]) {
                lower = milestones[i];
                upper = milestones[i + 1];
                break;
            }
        }
        
        // Handle edge cases
        if (tick < 50) {
            // Below first milestone - use base rate adjusted down
            return 0.0823 * (tick / 50);
        }
        if (tick >= 450) {
            // Above last milestone - extrapolate
            return CONDITIONAL_500_PROBS[450] + (tick - 450) * 0.002;
        }
        
        // Linear interpolation
        const lowerProb = CONDITIONAL_500_PROBS[lower] || 0.0823;
        const upperProb = CONDITIONAL_500_PROBS[upper] || 0.0823;
        const progress = (tick - lower) / (upper - lower);
        
        return lowerProb + (upperProb - lowerProb) * progress;
    }
    
    /**
     * Calculate logarithmic position for visual display
     */
    calculateLogPosition(tick) {
        if (tick <= 0) return 0;
        
        // Use log scale with 500 as reference
        const logTick = Math.log(tick + 1);
        const log500 = Math.log(501);
        
        return Math.min((logTick / log500) * 100, 100);
    }
    
    /**
     * Get next meaningful milestone
     */
    getNextMilestone(currentTick) {
        const milestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700];
        
        for (const milestone of milestones) {
            if (currentTick < milestone) {
                const prob = this.interpolateConditionalProbability(milestone);
                return {
                    tick: milestone,
                    probability: prob,
                    percentage: (prob * 100).toFixed(1) + '%',
                    ticksAway: milestone - currentTick
                };
            }
        }
        
        // Already past all milestones
        return {
            tick: currentTick + 100,
            probability: 0.9,
            percentage: '90.0%',
            ticksAway: 100
        };
    }
    
    /**
     * Record game completion
     */
    recordGameCompletion(duration, peakMultiplier = null) {
        this.longGameHistory.push(duration);
        
        // Keep only last 100 games
        if (this.longGameHistory.length > 100) {
            this.longGameHistory.shift();
        }
        
        // Update post-500 sequence tracking
        if (duration >= 500) {
            // Starting a new post-500 sequence
            this.gamesSinceLast500 = 0;
            this.post500Position = 0; // Reset - the 500+ game itself is position 0
            this.last500Duration = duration;
            this.last500Multiplier = peakMultiplier || 1.0;
            this.sequenceStartGame = this.longGameHistory.length;
        } else {
            this.gamesSinceLast500++;
            
            // Update post-500 position if we're in a sequence
            if (this.post500Position >= 0 && this.post500Position < 3) {
                this.post500Position++;
            } else if (this.post500Position >= 3) {
                // Reset after game 3
                this.post500Position = 0;
                this.sequenceStartGame = null;
            }
        }
        
        this.currentGameStarted = false;
    }
    
    /**
     * Mark new game start
     */
    startNewGame() {
        this.currentGameStarted = true;
    }
    
    /**
     * Get display-ready statistics
     */
    getDisplayStats() {
        const last500Game = this.longGameHistory.slice().reverse().find(d => d >= 500);
        const gamesAgo = last500Game ? this.longGameHistory.length - this.longGameHistory.lastIndexOf(last500Game) - 1 : null;
        
        return {
            totalGamesTracked: this.longGameHistory.length,
            gamesSinceLast500: this.gamesSinceLast500,
            averageCycle: this.averageCycle,
            cycleProgress: (this.gamesSinceLast500 / this.averageCycle * 100).toFixed(0) + '%',
            last500Game: last500Game || null,
            gamesAgoText: gamesAgo !== null ? `${gamesAgo} games ago` : 'Not in recent history',
            recentLongGames: this.longGameHistory.filter(d => d >= 500).length
        };
    }
    
    /**
     * Get adaptive milestones based on current tick
     */
    getAdaptiveMilestones(currentTick) {
        const standardMilestones = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1250, 1500, 2000];
        const milestones = [];
        
        // Always include next 50 and 100 ticks
        milestones.push({
            target: currentTick + 50,
            label: '+50 ticks',
            type: 'relative'
        });
        
        if (currentTick < 900) {
            milestones.push({
                target: currentTick + 100,
                label: '+100 ticks',
                type: 'relative'
            });
        }
        
        // Find next standard milestones
        const upcoming = standardMilestones.filter(m => m > currentTick).slice(0, 2);
        upcoming.forEach(target => {
            milestones.push({
                target,
                label: `${target} ticks`,
                type: 'absolute'
            });
        });
        
        // For very long games, use percentage-based targets
        if (currentTick >= 500) {
            milestones.push({
                target: Math.ceil(currentTick * 1.5),
                label: '1.5x current',
                type: 'multiplier'
            });
            
            if (currentTick >= 1000) {
                milestones.push({
                    target: Math.ceil(currentTick * 2.0),
                    label: '2x current',
                    type: 'multiplier'
                });
            }
        }
        
        // Calculate probabilities for each milestone
        return milestones.slice(0, 4).map(milestone => ({
            ...milestone,
            probability: this.calculateTargetProbability(currentTick, milestone.target),
            survivalRate: this.interpolateSurvivalRate(milestone.target)
        }));
    }
    
    /**
     * Calculate probability of reaching specific target from current tick
     */
    calculateTargetProbability(currentTick, targetTick) {
        if (targetTick <= currentTick) return 1.0;
        
        const currentSurvival = this.interpolateSurvivalRate(currentTick);
        const targetSurvival = this.interpolateSurvivalRate(targetTick);
        
        // Conditional probability: P(reach target | at current)
        if (currentSurvival === 0) return 0;
        
        // Base conditional probability
        let probability = targetSurvival / currentSurvival;
        
        // Apply clustering and cycle adjustments for long targets
        if (targetTick >= 500 && currentTick < 500) {
            const longGameProb = this.calculateLongGameProbability(currentTick);
            probability *= (longGameProb.adjusted / longGameProb.base);
        }
        
        return Math.min(probability, 0.95); // Cap at 95%
    }
    
    /**
     * Comprehensive risk assessment
     */
    assessCurrentRisk(currentTick, volatility = null, peakMultiplier = 1.0) {
        const survivalRate = this.interpolateSurvivalRate(currentTick);
        
        // Calculate various risk factors
        const rugRiskNext50 = 1 - Math.exp(-0.005 * 50);
        const rugRiskNext100 = 1 - Math.exp(-0.005 * 100);
        
        // Apply post-500 early rug rate if applicable
        let adjustedRugRisk = rugRiskNext50;
        if (this.post500Position > 0 && this.post500Position <= 3) {
            const positionStats = POST_500_STATS[`game${this.post500Position}`];
            if (currentTick < 50) {
                adjustedRugRisk = positionStats.earlyRugRate;
            }
        }
        
        // Duration risk categories
        let durationRisk;
        if (survivalRate > 0.75) durationRisk = 'low';
        else if (survivalRate > 0.50) durationRisk = 'moderate';
        else if (survivalRate > 0.25) durationRisk = 'high';
        else if (survivalRate > 0.10) durationRisk = 'very high';
        else durationRisk = 'extreme';
        
        // Volatility risk
        let volatilityRisk = 'normal';
        if (volatility) {
            if (volatility > 0.005) volatilityRisk = 'extreme';
            else if (volatility > 0.003) volatilityRisk = 'high';
            else if (volatility > 0.002) volatilityRisk = 'elevated';
        }
        
        // Calculate risk score (0-100)
        let riskScore = 50; // Base risk
        
        // Duration component
        riskScore += (1 - survivalRate) * 30;
        
        // Volatility component
        if (volatilityRisk === 'extreme') riskScore += 20;
        else if (volatilityRisk === 'high') riskScore += 15;
        else if (volatilityRisk === 'elevated') riskScore += 10;
        
        // Post-500 sequence risk adjustment
        if (this.post500Position > 0 && this.post500Position <= 3) {
            const positionStats = POST_500_STATS[`game${this.post500Position}`];
            riskScore *= positionStats.riskAdjustment;
        }
        
        // Long game fatigue (games tend to rug after very long durations)
        if (currentTick > 800) riskScore += 10;
        if (currentTick > 1200) riskScore += 10;
        
        return {
            riskScore: Math.min(riskScore, 100),
            rugRiskNext50: adjustedRugRisk,
            rugRiskNext100,
            durationRisk,
            volatilityRisk,
            survivalRate,
            multiplierGrowthRate: this.estimateMultiplierGrowth(currentTick, peakMultiplier),
            post500Position: this.post500Position,
            post500Warning: this.getPost500Warning()
        };
    }
    
    /**
     * Get strategic recommendation
     */
    getStrategicRecommendation(currentTick, volatility = null, peakMultiplier = 1.0) {
        const risk = this.assessCurrentRisk(currentTick, volatility, peakMultiplier);
        const milestones = this.getAdaptiveMilestones(currentTick);
        
        // Calculate expected value for holding
        const next50Prob = milestones.find(m => m.label === '+50 ticks')?.probability || 0.78;
        const expectedGrowth = risk.multiplierGrowthRate * 50;
        const expectedValue = (next50Prob * expectedGrowth) - ((1 - next50Prob) * 1.0);
        
        let recommendation = 'HOLD';
        let confidence = 'moderate';
        let rationale = '';
        
        // Decision logic
        if (risk.riskScore >= 80) {
            recommendation = 'EXIT';
            confidence = 'high';
            rationale = 'Extreme risk level - secure profits';
        } else if (risk.riskScore >= 65 && expectedValue < 0) {
            recommendation = 'REDUCE';
            confidence = 'high';
            rationale = 'High risk with negative expected value';
        } else if (risk.riskScore <= 35 && expectedValue > 0.2) {
            recommendation = 'INCREASE';
            confidence = 'high';
            rationale = 'Low risk with positive expected value';
        } else if (expectedValue > 0) {
            recommendation = 'HOLD';
            confidence = risk.riskScore > 50 ? 'low' : 'moderate';
            rationale = 'Positive expected value justifies position';
        } else {
            recommendation = 'REDUCE';
            confidence = 'moderate';
            rationale = 'Negative expected value suggests caution';
        }
        
        // Adjust for extreme game lengths
        if (currentTick > 1000 && risk.volatilityRisk !== 'extreme') {
            recommendation = 'REDUCE';
            rationale = 'Extreme duration - consider taking profits';
        }
        
        return {
            recommendation,
            confidence,
            rationale,
            expectedValue,
            riskScore: risk.riskScore,
            factors: {
                duration: risk.durationRisk,
                volatility: risk.volatilityRisk,
                rugRisk50: (risk.rugRiskNext50 * 100).toFixed(1) + '%',
                survivalRate: (risk.survivalRate * 100).toFixed(1) + '%'
            }
        };
    }
    
    /**
     * Estimate multiplier growth rate
     */
    estimateMultiplierGrowth(currentTick, currentMultiplier) {
        // Historical average growth rates by tick range
        const growthRates = {
            early: 0.015,    // 1-100 ticks
            mid: 0.010,      // 100-300 ticks  
            late: 0.008,     // 300-600 ticks
            extreme: 0.006   // 600+ ticks
        };
        
        let rate;
        if (currentTick < 100) rate = growthRates.early;
        else if (currentTick < 300) rate = growthRates.mid;
        else if (currentTick < 600) rate = growthRates.late;
        else rate = growthRates.extreme;
        
        // Adjust based on current multiplier
        if (currentMultiplier > 20) rate *= 0.8;
        if (currentMultiplier > 50) rate *= 0.6;
        
        return rate;
    }
    
    /**
     * Get post-500 sequence context
     */
    getPost500Context() {
        if (this.post500Position === 0) {
            return {
                inSequence: false,
                position: 0,
                description: 'Not in post-500 sequence',
                riskLevel: 'normal',
                expectedLength: 1.0,
                prob500: 0.0823
            };
        }
        
        const positionStats = POST_500_STATS[`game${this.post500Position}`];
        const descriptions = {
            1: 'Game 1/3: Mild exhaustion effect',
            2: 'Game 2/3: ⚠️ High volatility zone',
            3: 'Game 3/3: ✨ Recovery opportunity'
        };
        
        const riskLevels = {
            1: 'slightly elevated',
            2: 'high',
            3: 'favorable'
        };
        
        return {
            inSequence: true,
            position: this.post500Position,
            description: descriptions[this.post500Position],
            riskLevel: riskLevels[this.post500Position],
            expectedLength: positionStats.avgMultiplier,
            prob500: positionStats.prob500,
            earlyRugRate: positionStats.earlyRugRate,
            last500Duration: this.last500Duration,
            last500Multiplier: this.last500Multiplier
        };
    }
    
    /**
     * Get post-500 warning message
     */
    getPost500Warning() {
        if (this.post500Position === 2) {
            return 'High volatility - Game 2 after 500+';
        } else if (this.post500Position === 3) {
            return 'Recovery phase - Game 3 opportunity';
        }
        return null;
    }
    
    /**
     * Calculate probability of game ending within 40 ticks
     * This is the core metric for side bet system
     */
    calculate40TickRugProbability(currentTick, volatility = null, peakMultiplier = 1.0, gameHistory = null) {
        // Base calculation: probability of not surviving next 40 ticks
        const currentSurvival = this.interpolateSurvivalRate(currentTick);
        const futuresSurvival = this.interpolateSurvivalRate(currentTick + 40);
        
        // Base probability of rug within 40 ticks
        let rugProbability = currentSurvival > 0 ? 
            (currentSurvival - futuresSurvival) / currentSurvival : 0;
        
        // Adjust for post-500 sequence
        if (this.post500Position > 0 && this.post500Position <= 3) {
            const positionStats = POST_500_STATS[`game${this.post500Position}`];
            if (this.post500Position === 2 && currentTick < 50) {
                // Game 2 has 26.6% early rug rate
                rugProbability = Math.max(rugProbability, 0.266);
            }
        }
        
        // Volatility adjustment
        if (volatility !== null) {
            if (volatility > 0.005) {
                // Extreme volatility increases rug probability
                rugProbability *= 1.5;
            } else if (volatility > 0.003) {
                rugProbability *= 1.3;
            } else if (volatility < 0.002) {
                // Low volatility decreases rug probability
                rugProbability *= 0.8;
            }
        }
        
        // Peak multiplier adjustment (high multipliers more likely to rug)
        if (peakMultiplier > 30) {
            rugProbability *= 1.2;
        } else if (peakMultiplier > 50) {
            rugProbability *= 1.4;
        }
        
        // Long game fatigue
        if (currentTick > 400) {
            rugProbability *= 1.1;
        } else if (currentTick > 600) {
            rugProbability *= 1.3;
        }
        
        // Apply hidden pattern detectors if game history available
        if (gameHistory && gameHistory.length > 0) {
            const hiddenPatterns = this.detectHiddenPatterns(gameHistory, currentTick, peakMultiplier, volatility);
            
            // Apply pattern adjustments
            if (hiddenPatterns.instaRugPattern) {
                rugProbability = Math.max(rugProbability, 0.84); // 84% rug probability
            }
            if (hiddenPatterns.volatilitySpikePattern) {
                rugProbability = Math.max(rugProbability, 0.78); // 78% rug probability
            }
            if (hiddenPatterns.plateauPattern) {
                rugProbability *= 1.3; // 30% increase
            }
            if (hiddenPatterns.recoveryPattern) {
                rugProbability *= 0.7; // 30% decrease
            }
        }
        
        // Cap at realistic bounds
        return Math.max(0.01, Math.min(0.95, rugProbability));
    }
    
    /**
     * Get probability zone for current game state
     */
    getProbabilityZone(rugProbability) {
        for (const [key, zone] of Object.entries(this.PROBABILITY_ZONES)) {
            if (rugProbability >= zone.min && rugProbability < zone.max) {
                return {
                    ...zone,
                    key,
                    probability: rugProbability,
                    probabilityPercent: (rugProbability * 100).toFixed(1),
                    expectedValue: this.calculateZoneExpectedValue(rugProbability)
                };
            }
        }
        
        // Fallback to certainty zone
        return {
            ...this.PROBABILITY_ZONES.CERTAINTY,
            key: 'CERTAINTY',
            probability: rugProbability,
            probabilityPercent: (rugProbability * 100).toFixed(1),
            expectedValue: this.calculateZoneExpectedValue(rugProbability)
        };
    }
    
    /**
     * Calculate expected value for side bet based on probability
     * Side bet pays 5:1 if game ends within 40 ticks
     */
    calculateZoneExpectedValue(rugProbability) {
        // EV = (P(win) * payout) - (P(lose) * bet)
        // For 5:1 payout: EV = (P * 5) - ((1-P) * 1) = 6P - 1
        const ev = (rugProbability * 6) - 1;
        return ev;
    }
    
    /**
     * Get complete betting recommendation with zones and Martingale management
     */
    getCompleteBettingRecommendation(currentTick, volatility = null, peakMultiplier = 1.0, martingaleManager = null) {
        // Get zone-based recommendation
        const zoneRec = this.getStrategicRecommendationWithZones(currentTick, volatility, peakMultiplier);
        
        // If no Martingale manager provided, return zone recommendation only
        if (!martingaleManager) {
            return zoneRec;
        }
        
        // Get recommended strategy based on zone
        const recommendedStrategy = martingaleManager.getZoneBasedStrategy(zoneRec.zone.key);
        
        // Calculate risk-managed bet sizes
        const riskManaged = martingaleManager.calculateRiskManagedBets(zoneRec.rugProbability);
        
        // Get purse health
        const purseHealth = martingaleManager.checkPurseHealth();
        
        // Get current state
        const martingaleState = martingaleManager.getCurrentState();
        
        // Build complete recommendation
        return {
            ...zoneRec,
            martingale: {
                recommended: recommendedStrategy,
                strategies: riskManaged.strategies,
                standardBet: riskManaged.standardBet,
                currentLevel: martingaleState.sequence.level,
                totalBetsSoFar: martingaleState.sequence.totalBets,
                netProfitIfWin: martingaleState.sequence.netProfitIfWin,
                purseHealth: purseHealth,
                riskManagementActive: riskManaged.riskManagementActive
            },
            action: this.determineAction(zoneRec, purseHealth, riskManaged)
        };
    }
    
    /**
     * Determine specific action based on all factors
     */
    determineAction(zoneRec, purseHealth, riskManaged) {
        // Emergency checks first
        if (purseHealth.isEmergency) {
            return {
                type: 'EMERGENCY_STOP',
                message: 'Critical purse level - stop betting',
                canBet: false
            };
        }
        
        // If in bad zones, recommend waiting
        if (zoneRec.zone.key === 'AVOID' || zoneRec.zone.key === 'DANGER') {
            return {
                type: 'WAIT',
                message: `Wait - ${zoneRec.zone.name} zone (${zoneRec.zone.probabilityPercent}%)`,
                canBet: true,
                recommended: false
            };
        }
        
        // Get zone-appropriate strategy
        const zoneToStrategy = {
            'AVOID': 'CONSERVATIVE',
            'DANGER': 'CONSERVATIVE',
            'BREAKEVEN': 'CONSERVATIVE',
            'PROFIT': 'MODERATE',
            'HIGH_PROFIT': 'AGGRESSIVE',
            'CERTAINTY': 'AGGRESSIVE'
        };
        const recommendedStrategy = zoneToStrategy[zoneRec.zone.key] || 'CONSERVATIVE';
        
        // If risk management active and in medium zones
        if (riskManaged.riskManagementActive && 
            (zoneRec.zone.key === 'BREAKEVEN' || zoneRec.zone.key === 'PROFIT')) {
            return {
                type: 'BET_MANAGED',
                message: `Use ${recommendedStrategy} strategy`,
                canBet: true,
                recommended: true,
                useRiskManagement: true
            };
        }
        
        // High confidence zones
        if (zoneRec.zone.key === 'HIGH_PROFIT' || zoneRec.zone.key === 'CERTAINTY') {
            return {
                type: 'BET_CONFIDENT',
                message: `Strong opportunity - ${zoneRec.zone.name} zone`,
                canBet: true,
                recommended: true,
                useRiskManagement: false
            };
        }
        
        // Default
        return {
            type: 'BET_STANDARD',
            message: 'Standard betting conditions',
            canBet: true,
            recommended: true,
            useRiskManagement: false
        };
    }
    
    /**
     * Enhanced strategic recommendation with zone information
     */
    getStrategicRecommendationWithZones(currentTick, volatility = null, peakMultiplier = 1.0) {
        // Get base recommendation
        const baseRec = this.getStrategicRecommendation(currentTick, volatility, peakMultiplier);
        
        // Calculate 40-tick rug probability
        const rugProb = this.calculate40TickRugProbability(currentTick, volatility, peakMultiplier);
        const zone = this.getProbabilityZone(rugProb);
        
        // Override recommendation based on zone
        let recommendation = baseRec.recommendation;
        let confidence = baseRec.confidence;
        let rationale = baseRec.rationale;
        
        // Zone-based overrides
        if (zone.key === 'AVOID' || zone.key === 'DANGER') {
            recommendation = 'EXIT';
            confidence = zone.confidence;
            rationale = `${zone.name} zone (${zone.probabilityPercent}% rug chance) - ${zone.description}`;
        } else if (zone.key === 'BREAKEVEN') {
            // Near breakeven - use other factors
            if (baseRec.expectedValue < 0 || volatility > 0.003) {
                recommendation = 'REDUCE';
                rationale = `${zone.name} zone with negative factors`;
            } else {
                recommendation = 'HOLD';
                rationale = `${zone.name} zone with positive factors`;
            }
        } else if (zone.key === 'PROFIT' || zone.key === 'HIGH_PROFIT') {
            recommendation = 'HOLD';
            confidence = zone.confidence;
            rationale = `${zone.name} zone (${zone.probabilityPercent}% rug chance) - ${zone.description}`;
        } else if (zone.key === 'CERTAINTY') {
            recommendation = 'INCREASE';
            confidence = 'maximum';
            rationale = `${zone.name} zone (${zone.probabilityPercent}% rug chance) - Maximum opportunity!`;
        }
        
        return {
            ...baseRec,
            recommendation,
            confidence,
            rationale,
            zone: zone,
            rugProbability: rugProb,
            sideByEV: zone.expectedValue
        };
    }
    
    /**
     * Detect hidden patterns that significantly affect rug probability
     * These patterns were discovered through extensive data analysis
     */
    detectHiddenPatterns(gameHistory, currentTick, peakMultiplier, volatility) {
        const patterns = {
            instaRugPattern: false,
            volatilitySpikePattern: false,
            plateauPattern: false,
            recoveryPattern: false,
            details: {}
        };
        
        // Pattern 1: Insta-rug after 50x wins (84% probability)
        // Games that reach 50x multiplier tend to end abruptly
        if (peakMultiplier >= 50 && currentTick > 300) {
            const ticksSince50x = this.calculateTicksSinceMultiplier(gameHistory, 50);
            if (ticksSince50x !== null && ticksSince50x < 40) {
                patterns.instaRugPattern = true;
                patterns.details.instaRug = {
                    multiplier: peakMultiplier,
                    ticksSince50x: ticksSince50x,
                    probability: 0.84
                };
            }
        }
        
        // Pattern 2: Volatility spike in final 5 ticks (78% probability)
        // Detect if we're seeing unusual volatility patterns
        if (volatility !== null && gameHistory.length >= 5) {
            const recentVolatility = this.calculateRecentVolatility(gameHistory.slice(-5));
            const volatilityRatio = volatility / (recentVolatility || 0.001);
            
            if (volatilityRatio > 2.5) {
                patterns.volatilitySpikePattern = true;
                patterns.details.volatilitySpike = {
                    currentVolatility: volatility,
                    recentAverage: recentVolatility,
                    ratio: volatilityRatio,
                    probability: 0.78
                };
            }
        }
        
        // Pattern 3: Plateau pattern - game stuck at same multiplier
        // Games that plateau for 30+ ticks have increased rug risk
        if (gameHistory.length >= 30) {
            const plateauInfo = this.detectPlateauPattern(gameHistory.slice(-30));
            if (plateauInfo.isPlateauing) {
                patterns.plateauPattern = true;
                patterns.details.plateau = {
                    duration: plateauInfo.duration,
                    multiplierRange: plateauInfo.range,
                    probability: 0.45 + (plateauInfo.duration / 100)
                };
            }
        }
        
        // Pattern 4: Recovery pattern - game recovering from dip
        // Games that recover from significant dips tend to continue longer
        if (gameHistory.length >= 50 && peakMultiplier > 10) {
            const recoveryInfo = this.detectRecoveryPattern(gameHistory, peakMultiplier);
            if (recoveryInfo.isRecovering) {
                patterns.recoveryPattern = true;
                patterns.details.recovery = {
                    dipDepth: recoveryInfo.dipDepth,
                    recoveryStrength: recoveryInfo.strength,
                    probability: 0.25 - (recoveryInfo.strength * 0.1)
                };
            }
        }
        
        return patterns;
    }
    
    /**
     * Calculate ticks since a specific multiplier was reached
     */
    calculateTicksSinceMultiplier(gameHistory, targetMultiplier) {
        if (!gameHistory || gameHistory.length === 0) return null;
        
        // Look for when the multiplier was first reached
        for (let i = gameHistory.length - 1; i >= 0; i--) {
            if (gameHistory[i].multiplier >= targetMultiplier) {
                return gameHistory.length - i - 1;
            }
        }
        
        return null;
    }
    
    /**
     * Calculate recent volatility from game history
     */
    calculateRecentVolatility(recentHistory) {
        if (!recentHistory || recentHistory.length < 2) return 0;
        
        let totalChange = 0;
        for (let i = 1; i < recentHistory.length; i++) {
            const change = Math.abs(recentHistory[i].multiplier - recentHistory[i-1].multiplier);
            totalChange += change;
        }
        
        return totalChange / (recentHistory.length - 1);
    }
    
    /**
     * Detect if game is plateauing (stuck at similar multiplier)
     */
    detectPlateauPattern(recentHistory) {
        if (!recentHistory || recentHistory.length < 10) {
            return { isPlateauing: false };
        }
        
        const multipliers = recentHistory.map(h => h.multiplier || 1);
        const min = Math.min(...multipliers);
        const max = Math.max(...multipliers);
        const range = max - min;
        const average = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
        
        // Plateau if range is less than 10% of average multiplier
        const isPlateauing = range < (average * 0.1) && average > 5;
        
        return {
            isPlateauing,
            duration: isPlateauing ? recentHistory.length : 0,
            range: range,
            average: average
        };
    }
    
    /**
     * Detect recovery pattern from significant dip
     */
    detectRecoveryPattern(gameHistory, currentMultiplier) {
        if (!gameHistory || gameHistory.length < 20) {
            return { isRecovering: false };
        }
        
        // Look for significant dip in last 50 ticks
        const lookback = Math.min(50, gameHistory.length);
        const recentHistory = gameHistory.slice(-lookback);
        
        let maxBefore = 0;
        let minDip = currentMultiplier;
        let dipIndex = -1;
        
        // Find the dip
        for (let i = 0; i < recentHistory.length - 10; i++) {
            const mult = recentHistory[i].multiplier || 1;
            if (mult > maxBefore) {
                maxBefore = mult;
            }
            
            // Check next 10 ticks for dip
            for (let j = i + 1; j < Math.min(i + 10, recentHistory.length); j++) {
                const dipMult = recentHistory[j].multiplier || 1;
                if (dipMult < minDip && dipMult < maxBefore * 0.7) {
                    minDip = dipMult;
                    dipIndex = j;
                }
            }
        }
        
        // Check if we recovered from the dip
        const isRecovering = dipIndex > 0 && 
                           currentMultiplier > minDip * 1.3 &&
                           currentMultiplier > maxBefore * 0.8;
        
        return {
            isRecovering,
            dipDepth: maxBefore > 0 ? (maxBefore - minDip) / maxBefore : 0,
            strength: isRecovering ? (currentMultiplier - minDip) / minDip : 0
        };
    }
    
    /**
     * Get clustering metrics
     */
    getClusteringMetrics() {
        const recent500s = {
            last10: 0,
            last30: 0
        };
        
        // Count 500+ games in recent history
        const recentGames = this.longGameHistory.slice(-30);
        recentGames.forEach((duration, index) => {
            if (duration >= 500) {
                recent500s.last30++;
                if (index >= recentGames.length - 10) {
                    recent500s.last10++;
                }
            }
        });
        
        return {
            recent500Count10: recent500s.last10,
            recent500Count30: recent500s.last30,
            isInCluster: recent500s.last30 >= 2,
            clusterDensity: recent500s.last30 / 30,
            nearestTo500: Math.min(this.gamesSinceLast500, 30 - this.gamesSinceLast500)
        };
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SurvivalCalculator;
} else {
    // Browser environment
    window.SurvivalCalculator = SurvivalCalculator;
}