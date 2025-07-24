/**
 * ML Feature Extractor for Post-500 Sequence Integration
 * 
 * Extracts comprehensive features including post-500 sequence context
 * for machine learning model training
 */

const SurvivalCalculator = require('./survival_calculator.js');

class MLFeatureExtractor {
    constructor() {
        this.survivalCalc = new SurvivalCalculator();
        this.gameHistory = [];
    }
    
    /**
     * Extract all ML features for a game at a specific tick
     */
    extractFeatures(gameData, currentTick) {
        const features = {};
        
        // Basic features
        features.tick = currentTick;
        features.price = gameData.price || 1.0;
        features.peakMultiplier = gameData.peakMultiplier || 1.0;
        features.duration = gameData.duration || currentTick;
        
        // Survival context
        const survivalContext = this.survivalCalc.calculateSurvivalContext(
            currentTick, 
            gameData.volatility
        );
        features.survivalRate = survivalContext.survivalRate;
        features.longGameProbability = survivalContext.longGameProbability;
        features.gamesSinceLast500 = survivalContext.gamesSinceLast500;
        features.cycleProgress = survivalContext.cycleProgress;
        
        // Post-500 sequence features
        const post500Context = this.survivalCalc.getPost500Context();
        features.post500Position = post500Context.position;
        features.isInPost500Sequence = post500Context.inSequence;
        features.expectedLengthAdjustment = post500Context.expectedLength;
        features.post500Prob = post500Context.prob500;
        features.post500EarlyRugRate = post500Context.earlyRugRate || 0.221;
        
        // One-hot encoding for sequence position
        features.isPost500Game1 = post500Context.position === 1 ? 1 : 0;
        features.isPost500Game2 = post500Context.position === 2 ? 1 : 0;
        features.isPost500Game3 = post500Context.position === 3 ? 1 : 0;
        
        // Risk assessment
        const riskAssessment = this.survivalCalc.assessCurrentRisk(
            currentTick,
            gameData.volatility,
            gameData.peakMultiplier
        );
        features.riskScore = riskAssessment.riskScore;
        features.rugRiskNext50 = riskAssessment.rugRiskNext50;
        features.durationRiskCategory = this.encodeDurationRisk(riskAssessment.durationRisk);
        features.volatilityRiskCategory = this.encodeVolatilityRisk(riskAssessment.volatilityRisk);
        
        // Clustering metrics
        const clusteringMetrics = this.survivalCalc.getClusteringMetrics();
        features.recent500Count10 = clusteringMetrics.recent500Count10;
        features.recent500Count30 = clusteringMetrics.recent500Count30;
        features.isInCluster = clusteringMetrics.isInCluster ? 1 : 0;
        features.clusterDensity = clusteringMetrics.clusterDensity;
        features.nearestTo500 = clusteringMetrics.nearestTo500;
        
        // Normalized features
        features.normalizedGamesSince500 = features.gamesSinceLast500 / 11.9; // Average cycle
        features.cycleCompletionRatio = Math.min(features.gamesSinceLast500 / 11.9, 2.0);
        
        // Interaction features
        features.positionXvolatility = features.post500Position * (gameData.volatility || 0);
        features.positionXtick = features.post500Position * currentTick;
        features.positionXmultiplier = features.post500Position * features.peakMultiplier;
        
        // Risk-adjusted probabilities
        features.adjustedSurvivalProb = features.survivalRate * 
            (post500Context.inSequence ? post500Context.expectedLength : 1.0);
        features.adjusted500Prob = post500Context.prob500;
        
        // Temporal features
        features.gamesUntilExpected500 = Math.max(0, 11.9 - features.gamesSinceLast500);
        features.inOpportunityWindow = features.isPost500Game3;
        features.inDangerZone = features.isPost500Game2;
        
        // Strategic indicators
        const recommendation = this.survivalCalc.getStrategicRecommendation(
            currentTick,
            gameData.volatility,
            gameData.peakMultiplier
        );
        features.recommendedAction = this.encodeRecommendation(recommendation.recommendation);
        features.expectedValue = recommendation.expectedValue;
        
        // Volatility features
        if (gameData.volatilityMetrics) {
            features.volatilityStdDev = gameData.volatilityMetrics.standardDev || 0;
            features.volatilityPercentage = gameData.volatilityMetrics.percentageVol || 0;
            features.priceRange = gameData.volatilityMetrics.priceRange || 0;
            features.avgPriceChange = gameData.volatilityMetrics.avgChange || 0;
            features.maxPriceChange = gameData.volatilityMetrics.maxChange || 0;
            features.priceAcceleration = gameData.volatilityMetrics.acceleration || 0;
        }
        
        return features;
    }
    
    /**
     * Extract features for an entire game sequence
     */
    extractSequenceFeatures(gameSequence) {
        const sequenceFeatures = [];
        
        for (let i = 0; i < gameSequence.length; i++) {
            const game = gameSequence[i];
            
            // Record game completion for sequence tracking
            if (i > 0) {
                const prevGame = gameSequence[i - 1];
                this.survivalCalc.recordGameCompletion(
                    prevGame.duration, 
                    prevGame.peakMultiplier
                );
            }
            
            // Extract features at multiple checkpoints
            const checkpoints = [50, 100, 150, 200, 250, 300, 400, 500];
            
            for (const checkpoint of checkpoints) {
                if (game.duration >= checkpoint) {
                    const features = this.extractFeatures(game, checkpoint);
                    features.gameId = game.gameId;
                    features.checkpoint = checkpoint;
                    features.willSurvive500 = game.duration >= 500 ? 1 : 0;
                    features.finalDuration = game.duration;
                    sequenceFeatures.push(features);
                }
            }
        }
        
        return sequenceFeatures;
    }
    
    /**
     * Create feature matrix for ML training
     */
    createFeatureMatrix(games) {
        const allFeatures = [];
        
        // Reset calculator for fresh sequence
        this.survivalCalc = new SurvivalCalculator();
        
        for (const game of games) {
            const gameFeatures = this.extractSequenceFeatures([game]);
            allFeatures.push(...gameFeatures);
        }
        
        return allFeatures;
    }
    
    /**
     * Export features to CSV format
     */
    exportToCSV(features) {
        if (!features.length) return '';
        
        // Get all unique keys
        const headers = Object.keys(features[0]);
        
        // Create CSV header
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        for (const row of features) {
            const values = headers.map(header => {
                const value = row[header];
                // Handle undefined/null
                if (value === undefined || value === null) return '';
                // Quote strings that contain commas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        }
        
        return csv;
    }
    
    /**
     * Encode categorical variables
     */
    encodeDurationRisk(risk) {
        const mapping = {
            'low': 0,
            'moderate': 1,
            'high': 2,
            'very high': 3,
            'extreme': 4
        };
        return mapping[risk] || 0;
    }
    
    encodeVolatilityRisk(risk) {
        const mapping = {
            'normal': 0,
            'elevated': 1,
            'high': 2,
            'extreme': 3
        };
        return mapping[risk] || 0;
    }
    
    encodeRecommendation(recommendation) {
        const mapping = {
            'EXIT': 0,
            'REDUCE': 1,
            'HOLD': 2,
            'INCREASE': 3
        };
        return mapping[recommendation] || 2;
    }
    
    /**
     * Get feature importance hints
     */
    getFeatureImportance() {
        return {
            critical: [
                'post500Position',
                'isPost500Game2',
                'riskScore',
                'survivalRate',
                'volatilityStdDev'
            ],
            important: [
                'gamesSinceLast500',
                'cycleProgress',
                'recent500Count30',
                'isInCluster',
                'expectedValue'
            ],
            useful: [
                'positionXvolatility',
                'adjustedSurvivalProb',
                'inOpportunityWindow',
                'inDangerZone',
                'nearestTo500'
            ],
            experimental: [
                'positionXtick',
                'positionXmultiplier',
                'gamesUntilExpected500',
                'clusterDensity'
            ]
        };
    }
}

// Export for use in data processing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLFeatureExtractor;
} else {
    window.MLFeatureExtractor = MLFeatureExtractor;
}