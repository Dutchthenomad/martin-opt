#!/usr/bin/env node
/**
 * Recommendation Performance Analyzer
 * 
 * Analyzes saved recommendation data to measure actual performance
 * and identify areas for improvement.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const RECOMMENDATIONS_DIR = path.join(__dirname, '../../data/recommendations');
const OUTPUT_DIR = path.join(__dirname, '../../data/analysis');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Load all recommendation files
 */
function loadRecommendationFiles() {
    const pattern = path.join(RECOMMENDATIONS_DIR, 'recommendations_*.json');
    const files = glob.sync(pattern);
    
    console.log(`Found ${files.length} recommendation files`);
    
    const allRecommendations = [];
    
    files.forEach(file => {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (data.recommendations) {
                allRecommendations.push(...data.recommendations);
            }
        } catch (err) {
            console.error(`Error loading ${file}:`, err.message);
        }
    });
    
    return allRecommendations;
}

/**
 * Analyze recommendation performance
 */
function analyzePerformance(recommendations) {
    const analysis = {
        totalRecommendations: recommendations.length,
        byType: {
            EXIT: { count: 0, correct: 0, accuracy: 0 },
            HOLD: { count: 0, correct: 0, accuracy: 0 },
            REDUCE: { count: 0, correct: 0, accuracy: 0 },
            INCREASE: { count: 0, correct: 0, accuracy: 0 }
        },
        byTickWindow: {},
        byRiskScore: {},
        byVolatility: {},
        byPost500: {
            notInSequence: { count: 0, correct: 0 },
            position1: { count: 0, correct: 0 },
            position2: { count: 0, correct: 0 },
            position3: { count: 0, correct: 0 }
        },
        confidenceCalibration: {},
        patterns: {
            falseExits: [],
            missedExits: [],
            perfectExits: []
        }
    };
    
    // Initialize tick windows
    const windows = [10, 20, 30, 40, 50, 60, 70];
    windows.forEach(w => {
        analysis.byTickWindow[w] = {
            exitPredictions: 0,
            correctExits: 0,
            accuracy: 0
        };
    });
    
    // Process each recommendation
    recommendations.forEach(rec => {
        if (!rec.outcome) return; // Skip if no outcome recorded
        
        // By type analysis
        if (analysis.byType[rec.recommendation]) {
            analysis.byType[rec.recommendation].count++;
            if (rec.outcome.correctPrediction) {
                analysis.byType[rec.recommendation].correct++;
            }
        }
        
        // Exit/Reduce predictions by tick window
        if (rec.recommendation === 'EXIT' || rec.recommendation === 'REDUCE') {
            windows.forEach(w => {
                analysis.byTickWindow[w].exitPredictions++;
                if (rec.outcome[`within${w}`]) {
                    analysis.byTickWindow[w].correctExits++;
                }
            });
            
            // Pattern detection
            if (rec.outcome.ticksElapsed <= 40) {
                // Perfect exit
                analysis.patterns.perfectExits.push({
                    tickStart: rec.tickStart,
                    ticksElapsed: rec.outcome.ticksElapsed,
                    riskScore: rec.riskScore,
                    volatility: rec.gameState.volatility
                });
            } else if (rec.outcome.ticksElapsed > 100) {
                // False exit
                analysis.patterns.falseExits.push({
                    tickStart: rec.tickStart,
                    ticksElapsed: rec.outcome.ticksElapsed,
                    riskScore: rec.riskScore,
                    volatility: rec.gameState.volatility
                });
            }
        } else if (rec.recommendation === 'HOLD' || rec.recommendation === 'INCREASE') {
            // Check for missed exits
            if (rec.outcome.ticksElapsed <= 40) {
                analysis.patterns.missedExits.push({
                    tickStart: rec.tickStart,
                    ticksElapsed: rec.outcome.ticksElapsed,
                    riskScore: rec.riskScore,
                    volatility: rec.gameState.volatility
                });
            }
        }
        
        // By risk score buckets
        const riskBucket = Math.floor(rec.riskScore / 10) * 10;
        if (!analysis.byRiskScore[riskBucket]) {
            analysis.byRiskScore[riskBucket] = { count: 0, correct: 0 };
        }
        analysis.byRiskScore[riskBucket].count++;
        if (rec.outcome.correctPrediction) {
            analysis.byRiskScore[riskBucket].correct++;
        }
        
        // By volatility level
        const vol = rec.gameState.volatility;
        let volLevel = 'unknown';
        if (vol !== null) {
            if (vol > 0.005) volLevel = 'extreme';
            else if (vol > 0.003) volLevel = 'high';
            else if (vol > 0.002) volLevel = 'elevated';
            else volLevel = 'low';
        }
        
        if (!analysis.byVolatility[volLevel]) {
            analysis.byVolatility[volLevel] = { count: 0, correct: 0 };
        }
        analysis.byVolatility[volLevel].count++;
        if (rec.outcome.correctPrediction) {
            analysis.byVolatility[volLevel].correct++;
        }
        
        // By post-500 position
        const pos = rec.gameState.post500Position || 0;
        const posKey = pos === 0 ? 'notInSequence' : `position${pos}`;
        if (analysis.byPost500[posKey]) {
            analysis.byPost500[posKey].count++;
            if (rec.outcome.correctPrediction) {
                analysis.byPost500[posKey].correct++;
            }
        }
        
        // Confidence calibration
        const conf = rec.confidence || 'unknown';
        if (!analysis.confidenceCalibration[conf]) {
            analysis.confidenceCalibration[conf] = { count: 0, correct: 0 };
        }
        analysis.confidenceCalibration[conf].count++;
        if (rec.outcome.correctPrediction) {
            analysis.confidenceCalibration[conf].correct++;
        }
    });
    
    // Calculate accuracies
    Object.keys(analysis.byType).forEach(type => {
        const data = analysis.byType[type];
        data.accuracy = data.count > 0 ? (data.correct / data.count * 100).toFixed(1) : 0;
    });
    
    windows.forEach(w => {
        const data = analysis.byTickWindow[w];
        data.accuracy = data.exitPredictions > 0 ? 
            (data.correctExits / data.exitPredictions * 100).toFixed(1) : 0;
    });
    
    Object.keys(analysis.byRiskScore).forEach(score => {
        const data = analysis.byRiskScore[score];
        data.accuracy = (data.correct / data.count * 100).toFixed(1);
    });
    
    Object.keys(analysis.byVolatility).forEach(level => {
        const data = analysis.byVolatility[level];
        data.accuracy = (data.correct / data.count * 100).toFixed(1);
    });
    
    Object.keys(analysis.byPost500).forEach(pos => {
        const data = analysis.byPost500[pos];
        data.accuracy = data.count > 0 ? (data.correct / data.count * 100).toFixed(1) : 0;
    });
    
    Object.keys(analysis.confidenceCalibration).forEach(conf => {
        const data = analysis.confidenceCalibration[conf];
        data.accuracy = (data.correct / data.count * 100).toFixed(1);
    });
    
    return analysis;
}

/**
 * Generate insights and recommendations
 */
function generateInsights(analysis) {
    const insights = {
        strengths: [],
        weaknesses: [],
        improvements: []
    };
    
    // Find strengths
    if (parseFloat(analysis.byTickWindow[40].accuracy) > 60) {
        insights.strengths.push(`40-tick EXIT accuracy is ${analysis.byTickWindow[40].accuracy}% (good)`);
    }
    if (parseFloat(analysis.byTickWindow[70].accuracy) > 75) {
        insights.strengths.push(`70-tick EXIT accuracy is ${analysis.byTickWindow[70].accuracy}% (excellent)`);
    }
    
    // Find weaknesses
    if (analysis.patterns.falseExits.length > analysis.patterns.perfectExits.length * 0.5) {
        insights.weaknesses.push('Too many false EXIT signals (game continued 100+ ticks)');
        insights.improvements.push('Increase risk threshold for EXIT recommendations');
    }
    
    if (analysis.patterns.missedExits.length > analysis.patterns.perfectExits.length * 0.3) {
        insights.weaknesses.push('Missing early exit opportunities');
        insights.improvements.push('Lower threshold for high-volatility situations');
    }
    
    // Volatility-based insights
    const extremeVolAccuracy = parseFloat(analysis.byVolatility.extreme?.accuracy || 0);
    const lowVolAccuracy = parseFloat(analysis.byVolatility.low?.accuracy || 0);
    
    if (extremeVolAccuracy < 50) {
        insights.weaknesses.push(`Poor performance in extreme volatility (${extremeVolAccuracy}% accuracy)`);
        insights.improvements.push('Add specific patterns for extreme volatility detection');
    }
    
    // Risk score calibration
    const highRiskAccuracy = parseFloat(analysis.byRiskScore[80]?.accuracy || 0);
    if (highRiskAccuracy < 70) {
        insights.weaknesses.push(`High risk scores (80+) not reliable enough (${highRiskAccuracy}% accuracy)`);
        insights.improvements.push('Recalibrate risk scoring thresholds');
    }
    
    // Post-500 insights
    const pos2Accuracy = parseFloat(analysis.byPost500.position2.accuracy || 0);
    if (pos2Accuracy < 50 && analysis.byPost500.position2.count > 10) {
        insights.weaknesses.push(`Poor performance in post-500 position 2 (${pos2Accuracy}% accuracy)`);
        insights.improvements.push('Adjust for known volatility spike in game 2 after 500+');
    }
    
    return insights;
}

/**
 * Save analysis results
 */
function saveAnalysis(analysis, insights) {
    const timestamp = new Date().toISOString();
    const filename = `recommendation_analysis_${timestamp.split('T')[0]}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    const output = {
        timestamp,
        analysis,
        insights,
        summary: {
            overallAccuracy: analysis.totalRecommendations > 0 ?
                ((analysis.byType.EXIT.correct + analysis.byType.HOLD.correct + 
                  analysis.byType.REDUCE.correct + analysis.byType.INCREASE.correct) / 
                 analysis.totalRecommendations * 100).toFixed(1) : 0,
            exitAccuracy40: analysis.byTickWindow[40].accuracy,
            exitAccuracy70: analysis.byTickWindow[70].accuracy,
            totalAnalyzed: analysis.totalRecommendations
        }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`📊 Analysis saved to: ${filename}`);
    
    return output;
}

/**
 * Print summary to console
 */
function printSummary(output) {
    console.log('\n=== Recommendation Performance Analysis ===\n');
    console.log(`Total recommendations analyzed: ${output.summary.totalAnalyzed}`);
    console.log(`Overall accuracy: ${output.summary.overallAccuracy}%`);
    console.log(`\nEXIT/REDUCE accuracy by window:`);
    console.log(`  40 ticks: ${output.summary.exitAccuracy40}%`);
    console.log(`  70 ticks: ${output.summary.exitAccuracy70}%`);
    
    console.log(`\nAccuracy by recommendation type:`);
    Object.entries(output.analysis.byType).forEach(([type, data]) => {
        console.log(`  ${type}: ${data.accuracy}% (${data.count} total)`);
    });
    
    console.log(`\nKey Insights:`);
    console.log('\nStrengths:');
    output.insights.strengths.forEach(s => console.log(`  ✅ ${s}`));
    
    console.log('\nWeaknesses:');
    output.insights.weaknesses.forEach(w => console.log(`  ⚠️ ${w}`));
    
    console.log('\nSuggested Improvements:');
    output.insights.improvements.forEach(i => console.log(`  💡 ${i}`));
}

// Main execution
function main() {
    console.log('🔍 Loading recommendation data...');
    const recommendations = loadRecommendationFiles();
    
    if (recommendations.length === 0) {
        console.log('❌ No recommendation data found. Run the system to collect data first.');
        return;
    }
    
    console.log(`📊 Analyzing ${recommendations.length} recommendations...`);
    const analysis = analyzePerformance(recommendations);
    
    console.log('💡 Generating insights...');
    const insights = generateInsights(analysis);
    
    const output = saveAnalysis(analysis, insights);
    printSummary(output);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    loadRecommendationFiles,
    analyzePerformance,
    generateInsights
};