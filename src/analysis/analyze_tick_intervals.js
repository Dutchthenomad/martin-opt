const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = '/mnt/c/Users/nomad/OneDrive/Desktop/JS-TERMINAL-DATA-Collector/martingale-optimizer-v5.3/data/2025';
const SAMPLE_SIZE = 100; // Number of games to analyze
const OUTPUT_FILE = '/mnt/c/Users/nomad/OneDrive/Desktop/JS-TERMINAL-DATA-Collector/martingale-optimizer-v5.3/data/tick_interval_analysis.json';

// Statistics helper functions
function calculateStats(intervals) {
    if (!intervals || intervals.length === 0) return null;
    
    const sorted = [...intervals].sort((a, b) => a - b);
    const n = sorted.length;
    
    const mean = intervals.reduce((sum, val) => sum + val, 0) / n;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const median = n % 2 === 0 
        ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
        : sorted[Math.floor(n/2)];
    
    const p5 = sorted[Math.floor(n * 0.05)];
    const p25 = sorted[Math.floor(n * 0.25)];
    const p75 = sorted[Math.floor(n * 0.75)];
    const p95 = sorted[Math.floor(n * 0.95)];
    const p99 = sorted[Math.floor(n * 0.99)];
    
    return {
        count: n,
        mean,
        median,
        stdDev,
        variance,
        min: sorted[0],
        max: sorted[n - 1],
        percentiles: { p5, p25, p75, p95, p99 },
        iqr: p75 - p25,
        coefficientOfVariation: stdDev / mean
    };
}

// Get all game files recursively
function getAllGameFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllGameFiles(filePath, fileList);
        } else if (file.startsWith('game-') && file.endsWith('.json')) {
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

// Analyze tick intervals from a single game
function analyzeGameIntervals(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const gameData = JSON.parse(content);
        
        // Check both possible locations for tick intervals
        const tickIntervals = gameData.analysis?.tickIntervals || gameData.tickIntervals;
        
        if (!tickIntervals || tickIntervals.length === 0) {
            return null;
        }
        
        const intervals = tickIntervals.filter(interval => 
            interval > 0 && interval < 10000 // Filter out obvious anomalies
        );
        
        if (intervals.length === 0) return null;
        
        const stats = calculateStats(intervals);
        
        return {
            gameId: gameData.gameId || path.basename(filePath, '.json'),
            timestamp: gameData.recordingStart || gameData.startTime || gameData.timestamp,
            tickCount: gameData.analysis?.finalTick || gameData.tickCount || intervals.length,
            intervals: stats
        };
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
        return null;
    }
}

// Main analysis function
async function analyzeTickIntervals() {
    console.log('Starting tick interval analysis...');
    console.log(`Data directory: ${DATA_DIR}`);
    
    // Get all game files
    const gameFiles = getAllGameFiles(DATA_DIR);
    console.log(`Found ${gameFiles.length} game files`);
    
    // Sample games randomly
    const sampledFiles = gameFiles
        .sort(() => Math.random() - 0.5)
        .slice(0, SAMPLE_SIZE);
    
    console.log(`Analyzing ${sampledFiles.length} games...`);
    
    // Analyze each game
    const gameAnalyses = [];
    const allIntervals = [];
    
    for (const [index, filePath] of sampledFiles.entries()) {
        if (index % 10 === 0) {
            console.log(`Progress: ${index}/${sampledFiles.length}`);
        }
        
        const analysis = analyzeGameIntervals(filePath);
        if (analysis) {
            gameAnalyses.push(analysis);
            
            // Read intervals again for aggregate analysis
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const gameData = JSON.parse(content);
                const tickIntervals = gameData.analysis?.tickIntervals || gameData.tickIntervals;
                if (tickIntervals) {
                    allIntervals.push(...tickIntervals.filter(i => i > 0 && i < 10000));
                }
            } catch (error) {
                // Skip if error
            }
        }
    }
    
    console.log(`Successfully analyzed ${gameAnalyses.length} games`);
    
    // Calculate aggregate statistics
    const aggregateStats = calculateStats(allIntervals);
    
    // Group by tick ranges to see if timing varies by game progression
    const tickRangeAnalysis = {};
    const ranges = [
        { name: 'early', min: 0, max: 100 },
        { name: 'mid', min: 100, max: 300 },
        { name: 'late', min: 300, max: 500 },
        { name: 'veryLate', min: 500, max: Infinity }
    ];
    
    // Distribution analysis
    const distribution = {
        under200ms: allIntervals.filter(i => i < 200).length,
        between200and300ms: allIntervals.filter(i => i >= 200 && i < 300).length,
        between300and500ms: allIntervals.filter(i => i >= 300 && i < 500).length,
        between500and1000ms: allIntervals.filter(i => i >= 500 && i < 1000).length,
        over1000ms: allIntervals.filter(i => i >= 1000).length
    };
    
    // Calculate percentage for each bucket
    const total = allIntervals.length;
    const distributionPercentages = {};
    for (const [key, count] of Object.entries(distribution)) {
        distributionPercentages[key] = ((count / total) * 100).toFixed(2) + '%';
    }
    
    // Compile final report
    const report = {
        metadata: {
            analysisDate: new Date().toISOString(),
            gamesAnalyzed: gameAnalyses.length,
            totalIntervals: allIntervals.length,
            samplingMethod: 'random',
            sampleSize: SAMPLE_SIZE
        },
        aggregateStatistics: aggregateStats,
        distribution: {
            counts: distribution,
            percentages: distributionPercentages
        },
        recommendations: {
            nominalTick: 250,
            observedMean: aggregateStats.mean,
            observedMedian: aggregateStats.median,
            reliableRange: {
                min: aggregateStats.percentiles.p5,
                max: aggregateStats.percentiles.p95
            },
            adaptiveModelRequired: aggregateStats.coefficientOfVariation > 0.3,
            keyFindings: []
        },
        individualGames: gameAnalyses.slice(0, 10) // Include first 10 for reference
    };
    
    // Add key findings
    if (aggregateStats.mean > 300) {
        report.recommendations.keyFindings.push(
            `Average tick interval (${aggregateStats.mean.toFixed(1)}ms) is significantly higher than theoretical 250ms`
        );
    }
    
    if (aggregateStats.coefficientOfVariation > 0.3) {
        report.recommendations.keyFindings.push(
            `High variance detected (CV: ${aggregateStats.coefficientOfVariation.toFixed(2)}). Adaptive timing models are essential.`
        );
    }
    
    if (aggregateStats.percentiles.p95 > aggregateStats.mean * 2) {
        report.recommendations.keyFindings.push(
            `95th percentile (${aggregateStats.percentiles.p95.toFixed(1)}ms) indicates frequent timing spikes`
        );
    }
    
    // Save report
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\nAnalysis complete! Report saved to: ${OUTPUT_FILE}`);
    
    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Mean tick interval: ${aggregateStats.mean.toFixed(1)}ms (theoretical: 250ms)`);
    console.log(`Median tick interval: ${aggregateStats.median.toFixed(1)}ms`);
    console.log(`Standard deviation: ${aggregateStats.stdDev.toFixed(1)}ms`);
    console.log(`95% of ticks fall between ${aggregateStats.percentiles.p5.toFixed(1)}ms and ${aggregateStats.percentiles.p95.toFixed(1)}ms`);
    console.log(`\nDistribution:`);
    Object.entries(distributionPercentages).forEach(([key, pct]) => {
        console.log(`  ${key}: ${pct}`);
    });
}

// Run analysis
analyzeTickIntervals().catch(console.error);