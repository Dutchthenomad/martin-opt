#!/usr/bin/env node
/**
 * Analyze Long Games Script
 * 
 * Processes historical batch data to identify patterns in games exceeding 500 ticks
 * Generates survival curves and statistics for the 500+ tick predictor
 */

const fs = require('fs');
const path = require('path');

// Load path configuration
const pathConfig = require('../../config/paths.json');

// Configuration
const DATA_DIR = path.resolve(path.join(__dirname, '../..', pathConfig.batchDir));
const OUTPUT_FILE = path.resolve(path.join(__dirname, '../..', pathConfig.historicalData, 'long_game_stats.json'));

// Analysis containers
const allGames = [];
const longGames = {
    '400+': [],
    '500+': [],
    '600+': [],
    '700+': []
};

// Statistics tracking
const stats = {
    totalGames: 0,
    totalTicks: 0,
    rugDistribution: {},
    survivalCurves: {},
    clusteringPatterns: [],
    volatilityProfiles: {
        shortGames: [],  // < 100 ticks
        mediumGames: [], // 100-400 ticks
        longGames: []    // 400+ ticks
    }
};

// Load and process batch files
function loadBatchData() {
    console.log('📊 Loading batch data from:', DATA_DIR);
    
    try {
        const files = fs.readdirSync(DATA_DIR);
        const gameFiles = files.filter(f => f.includes('_games.json'));
        
        console.log(`Found ${gameFiles.length} batch game files`);
        
        gameFiles.forEach(file => {
            const filePath = path.join(DATA_DIR, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (data.games && Array.isArray(data.games)) {
                data.games.forEach(game => {
                    processGame(game);
                });
            }
        });
        
        console.log(`✅ Loaded ${allGames.length} total games`);
    } catch (error) {
        console.error('❌ Error loading batch data:', error);
    }
}

// Process individual game
function processGame(game) {
    allGames.push(game);
    stats.totalGames++;
    stats.totalTicks += game.duration;
    
    // Track rug distribution
    const range = getTickRange(game.duration);
    stats.rugDistribution[range] = (stats.rugDistribution[range] || 0) + 1;
    
    // Categorize long games
    if (game.duration >= 400) {
        longGames['400+'].push(game);
    }
    if (game.duration >= 500) {
        longGames['500+'].push(game);
    }
    if (game.duration >= 600) {
        longGames['600+'].push(game);
    }
    if (game.duration >= 700) {
        longGames['700+'].push(game);
    }
    
    // Track volatility profiles
    if (game.volatilityMetrics) {
        if (game.duration < 100) {
            stats.volatilityProfiles.shortGames.push(game.volatilityMetrics.avgVolatility);
        } else if (game.duration < 400) {
            stats.volatilityProfiles.mediumGames.push(game.volatilityMetrics.avgVolatility);
        } else {
            stats.volatilityProfiles.longGames.push(game.volatilityMetrics.avgVolatility);
        }
    }
}

// Get tick range category
function getTickRange(ticks) {
    if (ticks <= 50) return '1-50';
    if (ticks <= 100) return '51-100';
    if (ticks <= 200) return '101-200';
    if (ticks <= 300) return '201-300';
    if (ticks <= 400) return '301-400';
    return '401+';
}

// Calculate survival curves
function calculateSurvivalCurves() {
    console.log('📈 Calculating survival curves...');
    
    const milestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700];
    
    milestones.forEach(milestone => {
        const survived = allGames.filter(g => g.duration >= milestone).length;
        const survivalRate = survived / stats.totalGames;
        stats.survivalCurves[milestone] = {
            count: survived,
            rate: survivalRate,
            percentage: (survivalRate * 100).toFixed(1) + '%'
        };
    });
    
    // Calculate conditional probabilities for 500+
    const conditionalProbs = {};
    milestones.forEach(milestone => {
        if (milestone < 500) {
            const survivedMilestone = allGames.filter(g => g.duration >= milestone);
            const reached500 = survivedMilestone.filter(g => g.duration >= 500).length;
            if (survivedMilestone.length > 0) {
                conditionalProbs[`P(500+|${milestone})`] = {
                    probability: reached500 / survivedMilestone.length,
                    percentage: ((reached500 / survivedMilestone.length) * 100).toFixed(1) + '%',
                    sampleSize: survivedMilestone.length
                };
            }
        }
    });
    
    stats.conditionalProbabilities = conditionalProbs;
}

// Analyze clustering patterns
function analyzeClusteringPatterns() {
    console.log('🔍 Analyzing clustering patterns...');
    
    // Sort games by game number
    const sortedGames = allGames.sort((a, b) => a.gameNumber - b.gameNumber);
    
    // Find 500+ game positions
    const longGamePositions = [];
    sortedGames.forEach((game, index) => {
        if (game.duration >= 500) {
            longGamePositions.push({
                index,
                gameNumber: game.gameNumber,
                duration: game.duration,
                peakMultiplier: game.peakMultiplier
            });
        }
    });
    
    // Analyze gaps between long games
    const gaps = [];
    for (let i = 1; i < longGamePositions.length; i++) {
        const gap = longGamePositions[i].index - longGamePositions[i-1].index;
        gaps.push(gap);
    }
    
    // Calculate clustering metrics
    if (gaps.length > 0) {
        stats.clusteringPatterns = {
            totalLongGames: longGamePositions.length,
            averageGap: gaps.reduce((a, b) => a + b, 0) / gaps.length,
            minGap: Math.min(...gaps),
            maxGap: Math.max(...gaps),
            gapDistribution: calculateDistribution(gaps),
            longGameDetails: longGamePositions
        };
    }
    
    // Check for clustering (games within 15 game window)
    let clusters = 0;
    for (let i = 1; i < longGamePositions.length; i++) {
        if (longGamePositions[i].index - longGamePositions[i-1].index <= 15) {
            clusters++;
        }
    }
    
    stats.clusteringPatterns.clustersFound = clusters;
    stats.clusteringPatterns.clusteringRate = longGamePositions.length > 1 ? 
        clusters / (longGamePositions.length - 1) : 0;
}

// Calculate distribution statistics
function calculateDistribution(values) {
    if (values.length === 0) return {};
    
    values.sort((a, b) => a - b);
    
    return {
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: values[Math.floor(values.length / 2)],
        min: values[0],
        max: values[values.length - 1],
        p25: values[Math.floor(values.length * 0.25)],
        p75: values[Math.floor(values.length * 0.75)]
    };
}

// Calculate volatility statistics
function calculateVolatilityStats() {
    console.log('📊 Calculating volatility statistics...');
    
    Object.keys(stats.volatilityProfiles).forEach(category => {
        const volatilities = stats.volatilityProfiles[category];
        if (volatilities.length > 0) {
            stats.volatilityProfiles[category] = {
                count: volatilities.length,
                average: volatilities.reduce((a, b) => a + b, 0) / volatilities.length,
                distribution: calculateDistribution(volatilities)
            };
        }
    });
}

// Generate final report
function generateReport() {
    console.log('\n=== LONG GAME ANALYSIS REPORT ===\n');
    
    const report = {
        metadata: {
            generatedAt: new Date().toISOString(),
            totalGamesAnalyzed: stats.totalGames,
            totalTicksProcessed: stats.totalTicks,
            dataSource: DATA_DIR
        },
        
        baseRates: {
            '400+': {
                count: longGames['400+'].length,
                rate: longGames['400+'].length / stats.totalGames,
                percentage: ((longGames['400+'].length / stats.totalGames) * 100).toFixed(2) + '%'
            },
            '500+': {
                count: longGames['500+'].length,
                rate: longGames['500+'].length / stats.totalGames,
                percentage: ((longGames['500+'].length / stats.totalGames) * 100).toFixed(2) + '%'
            },
            '600+': {
                count: longGames['600+'].length,
                rate: longGames['600+'].length / stats.totalGames,
                percentage: ((longGames['600+'].length / stats.totalGames) * 100).toFixed(2) + '%'
            }
        },
        
        survivalCurves: stats.survivalCurves,
        conditionalProbabilities: stats.conditionalProbabilities,
        rugDistribution: stats.rugDistribution,
        clusteringPatterns: stats.clusteringPatterns,
        volatilityProfiles: stats.volatilityProfiles,
        
        keyFindings: {
            averageGameDuration: Math.round(stats.totalTicks / stats.totalGames),
            medianFromSample: calculateMedianDuration(),
            longGameCharacteristics: analyzeLongGameCharacteristics()
        }
    };
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n✅ Analysis complete! Report saved to: ${OUTPUT_FILE}`);
    
    // Print summary
    console.log('\n📊 KEY FINDINGS:');
    console.log(`- Total games analyzed: ${stats.totalGames}`);
    console.log(`- Games exceeding 500 ticks: ${longGames['500+'].length} (${report.baseRates['500+'].percentage})`);
    console.log(`- Average gap between 500+ games: ${stats.clusteringPatterns.averageGap?.toFixed(1) || 'N/A'} games`);
    console.log(`- Clustering rate: ${(stats.clusteringPatterns.clusteringRate * 100).toFixed(1)}%`);
    console.log(`- Survival rate at 500 ticks: ${stats.survivalCurves[500]?.percentage || 'N/A'}`);
    
    return report;
}

// Calculate median game duration
function calculateMedianDuration() {
    const durations = allGames.map(g => g.duration).sort((a, b) => a - b);
    return durations[Math.floor(durations.length / 2)];
}

// Analyze long game characteristics
function analyzeLongGameCharacteristics() {
    if (longGames['500+'].length === 0) return {};
    
    const characteristics = {
        count: longGames['500+'].length,
        averageDuration: 0,
        averagePeakMultiplier: 0,
        volatilityProfile: {
            average: 0,
            belowThreshold: 0
        }
    };
    
    let totalDuration = 0;
    let totalPeak = 0;
    let totalVolatility = 0;
    let validVolatilityCount = 0;
    
    longGames['500+'].forEach(game => {
        totalDuration += game.duration;
        totalPeak += game.peakMultiplier || 0;
        
        if (game.volatilityMetrics && game.volatilityMetrics.avgVolatility) {
            totalVolatility += game.volatilityMetrics.avgVolatility;
            validVolatilityCount++;
            
            if (game.volatilityMetrics.avgVolatility < 0.055) {
                characteristics.volatilityProfile.belowThreshold++;
            }
        }
    });
    
    characteristics.averageDuration = Math.round(totalDuration / longGames['500+'].length);
    characteristics.averagePeakMultiplier = totalPeak / longGames['500+'].length;
    
    if (validVolatilityCount > 0) {
        characteristics.volatilityProfile.average = totalVolatility / validVolatilityCount;
        characteristics.volatilityProfile.belowThresholdRate = 
            characteristics.volatilityProfile.belowThreshold / validVolatilityCount;
    }
    
    return characteristics;
}

// Main execution
console.log('🚀 Starting Long Game Analysis...\n');

loadBatchData();
calculateSurvivalCurves();
analyzeClusteringPatterns();
calculateVolatilityStats();
generateReport();

console.log('\n✨ Analysis complete!');