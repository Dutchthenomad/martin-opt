/**
 * Enhanced Martingale Manager with Bankroll Tracking
 * 
 * Implements sophisticated Martingale betting sequences with:
 * - Immediate purse deduction tracking
 * - NET profit calculations across sequences
 * - Kelly Criterion risk management
 * - Integration with probability zones
 */

class EnhancedMartingaleManager {
    constructor(initialPurse = 0.5) {
        // Bankroll management
        this.initialPurse = initialPurse;
        this.currentPurse = initialPurse;
        this.purseHistory = [initialPurse];
        
        // Martingale sequence tracking
        this.currentLevel = 1;
        this.sequenceActive = false;
        this.totalBetsSoFar = 0;
        this.currentBet = null;
        this.sequenceHistory = [];
        
        // Standard Martingale progression (SOL)
        this.MARTINGALE_SEQUENCE = [
            0.001,  // Level 1
            0.002,  // Level 2
            0.004,  // Level 3
            0.008,  // Level 4
            0.016,  // Level 5 - Risk management activation
            0.032,  // Level 6
            0.064,  // Level 7
            0.128,  // Level 8
            0.256,  // Level 9
            0.512   // Level 10
        ];
        
        // Risk management parameters
        this.RISK_MANAGEMENT_LEVEL = 5;
        this.PAYOUT_RATIO = 5; // 5:1 payout
        this.EMERGENCY_PURSE_THRESHOLD = 0.20; // 20% of initial
        
        // Kelly Criterion parameters
        this.KELLY_FRACTION = 0.25; // Conservative 25% Kelly
        
        // Risk strategies
        this.RISK_STRATEGIES = {
            CONSERVATIVE: {
                name: 'Conservative',
                pursePercent: 0.02,
                recoveryTarget: 0.15,
                winProbAssumption: 0.50
            },
            MODERATE: {
                name: 'Moderate',
                pursePercent: 0.05,
                recoveryTarget: 0.30,
                winProbAssumption: 0.70
            },
            AGGRESSIVE: {
                name: 'Aggressive',
                pursePercent: 0.10,
                recoveryTarget: 0.50,
                winProbAssumption: 0.90
            }
        };
    }
    
    /**
     * Place a bet and immediately deduct from purse
     */
    placeBet(betAmount = null, useStandardMartingale = true) {
        // Determine bet amount
        if (betAmount === null) {
            betAmount = useStandardMartingale ? 
                this.getStandardBet() : 
                this.getStandardBet(); // Will be replaced with risk-managed bet
        }
        
        // Validate sufficient funds
        if (betAmount > this.currentPurse) {
            return {
                success: false,
                error: 'Insufficient funds',
                required: betAmount,
                available: this.currentPurse
            };
        }
        
        // CRITICAL: Money leaves purse immediately
        this.currentPurse -= betAmount;
        this.currentBet = betAmount;
        this.totalBetsSoFar += betAmount;
        this.purseHistory.push(this.currentPurse);
        
        // Mark sequence as active
        if (!this.sequenceActive) {
            this.sequenceActive = true;
            this.sequenceHistory.push({
                startTime: Date.now(),
                startLevel: this.currentLevel,
                startPurse: this.currentPurse + betAmount,
                bets: []
            });
        }
        
        // Record bet in current sequence
        const currentSequence = this.sequenceHistory[this.sequenceHistory.length - 1];
        currentSequence.bets.push({
            level: this.currentLevel,
            amount: betAmount,
            purseAfter: this.currentPurse,
            timestamp: Date.now()
        });
        
        return {
            success: true,
            betAmount,
            currentPurse: this.currentPurse,
            totalBetsSoFar: this.totalBetsSoFar,
            netProfitIfWin: this.calculateNetProfit(betAmount),
            payoutIfWin: betAmount * this.PAYOUT_RATIO,
            pursePercentage: (betAmount / (this.currentPurse + betAmount)) * 100
        };
    }
    
    /**
     * Calculate NET profit if current bet wins
     * This is the most critical calculation
     */
    calculateNetProfit(betAmount = null) {
        if (betAmount === null) {
            betAmount = this.currentBet || 0;
        }
        
        // NET profit = (payout) - (all money bet in sequence)
        const payout = betAmount * this.PAYOUT_RATIO;
        const netProfit = payout - this.totalBetsSoFar;
        
        return netProfit;
    }
    
    /**
     * Record win outcome
     */
    recordWin() {
        if (!this.currentBet) {
            return { success: false, error: 'No active bet' };
        }
        
        // Calculate payout
        const payout = this.currentBet * this.PAYOUT_RATIO;
        this.currentPurse += payout;
        this.purseHistory.push(this.currentPurse);
        
        // Calculate NET profit
        const netProfit = payout - this.totalBetsSoFar;
        
        // Record in sequence history
        const currentSequence = this.sequenceHistory[this.sequenceHistory.length - 1];
        currentSequence.outcome = 'WIN';
        currentSequence.endTime = Date.now();
        currentSequence.endPurse = this.currentPurse;
        currentSequence.netProfit = netProfit;
        currentSequence.totalBets = this.totalBetsSoFar;
        
        // Reset sequence
        this.resetSequence();
        
        return {
            success: true,
            payout,
            netProfit,
            currentPurse: this.currentPurse,
            purseGrowth: ((this.currentPurse - this.initialPurse) / this.initialPurse) * 100
        };
    }
    
    /**
     * Record loss outcome
     */
    recordLoss(continueSequence = true) {
        if (!this.currentBet) {
            return { success: false, error: 'No active bet' };
        }
        
        // Money already deducted, just update state
        const lostAmount = this.currentBet;
        
        // Check if we should continue
        if (continueSequence && this.currentLevel < this.MARTINGALE_SEQUENCE.length) {
            // Move to next level
            this.currentLevel++;
            this.currentBet = null;
            
            return {
                success: true,
                lostAmount,
                currentPurse: this.currentPurse,
                nextLevel: this.currentLevel,
                nextBet: this.getStandardBet(),
                totalBetsSoFar: this.totalBetsSoFar,
                continueSequence: true
            };
        } else {
            // End sequence
            const currentSequence = this.sequenceHistory[this.sequenceHistory.length - 1];
            currentSequence.outcome = 'LOSS';
            currentSequence.endTime = Date.now();
            currentSequence.endPurse = this.currentPurse;
            currentSequence.netProfit = -this.totalBetsSoFar;
            currentSequence.totalBets = this.totalBetsSoFar;
            
            this.resetSequence();
            
            return {
                success: true,
                lostAmount,
                currentPurse: this.currentPurse,
                totalLost: currentSequence.totalBets,
                continueSequence: false
            };
        }
    }
    
    /**
     * Get standard Martingale bet for current level
     */
    getStandardBet() {
        return this.MARTINGALE_SEQUENCE[this.currentLevel - 1] || this.MARTINGALE_SEQUENCE[9];
    }
    
    /**
     * Calculate risk-managed bet sizes using Kelly Criterion
     */
    calculateRiskManagedBets(winProbability) {
        const standardBet = this.getStandardBet();
        
        // Kelly Criterion: f = (bp - q) / b
        // where b = odds (4 for 5:1), p = win prob, q = loss prob
        const b = this.PAYOUT_RATIO - 1; // 4 for 5:1 payout
        const p = winProbability;
        const q = 1 - p;
        const fullKelly = (b * p - q) / b;
        const conservativeKelly = Math.max(0, fullKelly * this.KELLY_FRACTION);
        
        // Calculate risk-managed alternatives
        const strategies = {};
        
        for (const [key, strategy] of Object.entries(this.RISK_STRATEGIES)) {
            // Base calculation on purse percentage
            let betSize = this.currentPurse * strategy.pursePercent;
            
            // Apply Kelly adjustment
            betSize = betSize * (conservativeKelly / strategy.pursePercent);
            
            // Ensure minimum bet
            betSize = Math.max(0.001, betSize);
            
            // Cap at 50% of standard bet for safety
            betSize = Math.min(betSize, standardBet * 0.5);
            
            strategies[key] = {
                ...strategy,
                betAmount: betSize,
                percentOfStandard: (betSize / standardBet) * 100,
                percentOfPurse: (betSize / this.currentPurse) * 100,
                netProfitIfWin: this.calculateNetProfit(betSize),
                kellyFraction: conservativeKelly
            };
        }
        
        return {
            standardBet,
            winProbability,
            kellyFraction: conservativeKelly,
            strategies,
            currentLevel: this.currentLevel,
            totalAtRisk: this.totalBetsSoFar + standardBet,
            riskManagementActive: this.currentLevel >= this.RISK_MANAGEMENT_LEVEL
        };
    }
    
    /**
     * Get recommended strategy based on probability zone
     */
    getZoneBasedStrategy(zone) {
        const zoneStrategies = {
            'AVOID': 'CONSERVATIVE',
            'DANGER': 'CONSERVATIVE',
            'BREAKEVEN': 'CONSERVATIVE',
            'PROFIT': 'MODERATE',
            'HIGH_PROFIT': 'AGGRESSIVE',
            'CERTAINTY': 'AGGRESSIVE'
        };
        
        return zoneStrategies[zone] || 'CONSERVATIVE';
    }
    
    /**
     * Check purse health and warnings
     */
    checkPurseHealth() {
        const pursePercentage = this.currentPurse / this.initialPurse;
        const emergencyThreshold = this.initialPurse * this.EMERGENCY_PURSE_THRESHOLD;
        
        return {
            currentPurse: this.currentPurse,
            initialPurse: this.initialPurse,
            pursePercentage: pursePercentage * 100,
            isHealthy: pursePercentage >= 0.5,
            isWarning: pursePercentage < 0.5 && pursePercentage >= this.EMERGENCY_PURSE_THRESHOLD,
            isEmergency: this.currentPurse < emergencyThreshold,
            canContinue: this.currentPurse >= this.getStandardBet(),
            emergencyThreshold,
            message: this.getPurseHealthMessage(pursePercentage)
        };
    }
    
    /**
     * Get purse health message
     */
    getPurseHealthMessage(percentage) {
        if (percentage >= 0.8) return 'Purse healthy';
        if (percentage >= 0.5) return 'Purse adequate';
        if (percentage >= 0.3) return 'Caution: Purse depleting';
        if (percentage >= this.EMERGENCY_PURSE_THRESHOLD) return 'Warning: Low purse';
        return 'EMERGENCY: Critical purse level!';
    }
    
    /**
     * Reset sequence
     */
    resetSequence() {
        this.currentLevel = 1;
        this.sequenceActive = false;
        this.totalBetsSoFar = 0;
        this.currentBet = null;
    }
    
    /**
     * Get current state for UI display
     */
    getCurrentState() {
        return {
            purse: {
                current: this.currentPurse,
                initial: this.initialPurse,
                percentage: (this.currentPurse / this.initialPurse) * 100,
                health: this.checkPurseHealth()
            },
            sequence: {
                active: this.sequenceActive,
                level: this.currentLevel,
                totalBets: this.totalBetsSoFar,
                currentBet: this.currentBet,
                standardBet: this.getStandardBet(),
                netProfitIfWin: this.currentBet ? this.calculateNetProfit() : 0
            },
            history: {
                sequences: this.sequenceHistory.length,
                wins: this.sequenceHistory.filter(s => s.outcome === 'WIN').length,
                losses: this.sequenceHistory.filter(s => s.outcome === 'LOSS').length,
                totalProfit: this.sequenceHistory.reduce((sum, s) => sum + (s.netProfit || 0), 0)
            }
        };
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedMartingaleManager;
} else {
    window.EnhancedMartingaleManager = EnhancedMartingaleManager;
}