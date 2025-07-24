#!/usr/bin/env node
/**
 * Analyze game patterns following 500+ tick games
 * Examines the next 3 games after each 500+ tick game
 */

const fs = require('fs');
const path = require('path');

// Load path configuration
const pathConfig = require('../../config/paths.json');

// Load batch data
const batchDir = path.resolve(path.join(__dirname, '../..', pathConfig.batchDir));
const batchFiles = fs.readdirSync(batchDir)
    .filter(f => f.includes('_games.json'))
    .sort();

console.log(`📊 Analyzing Post-500+ Game Patterns\n`);
console.log(`Found ${batchFiles.length} batch files to analyze\n`);

// Collect all games in sequence
let allGames = [];
for (const file of batchFiles) {
    const batchData = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8'));
    allGames = allGames.concat(batchData.games);
}

console.log(`Total games loaded: ${allGames.length}\n`);

// Find all 500+ games and analyze the next 3
const post500Patterns = {
    game1: [],
    game2: [],
    game3: [],
    all3Combined: [],
    sequences: []
};

// Identify 500+ games and their following games
for (let i = 0; i < allGames.length - 3; i++) {
    if (allGames[i].duration >= 500) {
        const sequence = {
            trigger: {
                index: i,
                duration: allGames[i].duration,
                multiplier: allGames[i].peakMultiplier
            },
            following: []
        };
        
        // Collect next 3 games
        for (let j = 1; j <= 3; j++) {
            if (i + j < allGames.length) {
                const nextGame = allGames[i + j];
                sequence.following.push({
                    position: j,
                    duration: nextGame.duration,
                    multiplier: nextGame.peakMultiplier
                });
                
                // Add to individual game arrays
                post500Patterns[`game${j}`].push(nextGame.duration);
                post500Patterns.all3Combined.push(nextGame.duration);
            }
        }
        
        if (sequence.following.length === 3) {
            post500Patterns.sequences.push(sequence);
        }
    }
}

console.log(`🎯 Found ${post500Patterns.sequences.length} complete 500+ → 3-game sequences\n`);

// Calculate statistics for each position
function calculateStats(durations, label) {
    if (durations.length === 0) return null;
    
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const mean = sum / durations.length;
    
    // Calculate percentiles
    const p25 = sorted[Math.floor(durations.length * 0.25)];
    const p50 = sorted[Math.floor(durations.length * 0.50)];
    const p75 = sorted[Math.floor(durations.length * 0.75)];
    
    // Calculate standard deviation
    const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    // Count by ranges
    const ranges = {
        '0-50': durations.filter(d => d <= 50).length,
        '51-100': durations.filter(d => d > 50 && d <= 100).length,
        '101-200': durations.filter(d => d > 100 && d <= 200).length,
        '201-300': durations.filter(d => d > 200 && d <= 300).length,
        '301-400': durations.filter(d => d > 300 && d <= 400).length,
        '401-500': durations.filter(d => d > 400 && d <= 500).length,
        '500+': durations.filter(d => d > 500).length
    };
    
    // Calculate range percentages
    const rangePercentages = {};
    for (const [range, count] of Object.entries(ranges)) {
        rangePercentages[range] = {
            count,
            percentage: ((count / durations.length) * 100).toFixed(1) + '%'
        };
    }
    
    console.log(`\n📈 ${label}:`);
    console.log(`   Sample size: ${durations.length} games`);
    console.log(`   Average duration: ${mean.toFixed(1)} ticks`);
    console.log(`   Median: ${p50} ticks`);
    console.log(`   Std Dev: ${stdDev.toFixed(1)} ticks`);
    console.log(`   Range: ${Math.min(...durations)} - ${Math.max(...durations)} ticks`);
    console.log(`   Quartiles: P25=${p25}, P50=${p50}, P75=${p75}`);
    console.log(`\n   Distribution by range:`);
    for (const [range, data] of Object.entries(rangePercentages)) {
        console.log(`      ${range}: ${data.count} games (${data.percentage})`);
    }
    
    return {
        mean,
        median: p50,
        stdDev,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p25,
        p75,
        ranges: rangePercentages,
        sampleSize: durations.length
    };
}

// Analyze each position
const stats = {
    game1: calculateStats(post500Patterns.game1, 'Game 1 (immediately after 500+)'),
    game2: calculateStats(post500Patterns.game2, 'Game 2 (two games after 500+)'),
    game3: calculateStats(post500Patterns.game3, 'Game 3 (three games after 500+)'),
    all3: calculateStats(post500Patterns.all3Combined, 'All 3 games combined')
};

// Compare to overall game statistics
const allGameDurations = allGames.map(g => g.duration);
const overallStats = calculateStats(allGameDurations, 'Overall game population (baseline)');

// Calculate relative differences
console.log('\n\n🔍 Comparison to Baseline:');
console.log('\nAverage duration vs baseline:');
console.log(`   Game 1: ${stats.game1.mean.toFixed(1)} ticks (${((stats.game1.mean / overallStats.mean - 1) * 100).toFixed(1)}% difference)`);
console.log(`   Game 2: ${stats.game2.mean.toFixed(1)} ticks (${((stats.game2.mean / overallStats.mean - 1) * 100).toFixed(1)}% difference)`);
console.log(`   Game 3: ${stats.game3.mean.toFixed(1)} ticks (${((stats.game3.mean / overallStats.mean - 1) * 100).toFixed(1)}% difference)`);
console.log(`   All 3: ${stats.all3.mean.toFixed(1)} ticks (${((stats.all3.mean / overallStats.mean - 1) * 100).toFixed(1)}% difference)`);

// Look for patterns in sequences
console.log('\n\n🔄 Sequential Patterns:');
let immediateRugs = 0; // Games that rug <50 ticks after 500+
let quickRecovery = 0; // Another 500+ within 3 games
let gradualRecovery = 0; // Games progressively getting longer

for (const seq of post500Patterns.sequences) {
    // Check for immediate rug
    if (seq.following[0].duration < 50) {
        immediateRugs++;
    }
    
    // Check for quick recovery (another 500+)
    if (seq.following.some(g => g.duration >= 500)) {
        quickRecovery++;
    }
    
    // Check for gradual recovery pattern
    if (seq.following[0].duration < seq.following[1].duration && 
        seq.following[1].duration < seq.following[2].duration) {
        gradualRecovery++;
    }
}

console.log(`   Immediate rugs (<50 ticks): ${immediateRugs}/${post500Patterns.sequences.length} (${((immediateRugs / post500Patterns.sequences.length) * 100).toFixed(1)}%)`);
console.log(`   Quick recovery (500+ within 3): ${quickRecovery}/${post500Patterns.sequences.length} (${((quickRecovery / post500Patterns.sequences.length) * 100).toFixed(1)}%)`);
console.log(`   Gradual recovery pattern: ${gradualRecovery}/${post500Patterns.sequences.length} (${((gradualRecovery / post500Patterns.sequences.length) * 100).toFixed(1)}%)`);

// Examine specific examples
console.log('\n\n📋 Example Sequences:');
const examples = post500Patterns.sequences.slice(0, 5);
examples.forEach((seq, i) => {
    console.log(`\nExample ${i + 1}:`);
    console.log(`   500+ game: ${seq.trigger.duration} ticks (${seq.trigger.multiplier.toFixed(1)}x)`);
    console.log(`   Next 3: ${seq.following.map(g => `${g.duration} ticks`).join(' → ')}`);
});

// Statistical significance test
console.log('\n\n📊 Statistical Observations:');
console.log('\nKey Findings:');
if (stats.game1.mean < overallStats.mean * 0.85) {
    console.log(`   ⚠️  Game 1 shows significant exhaustion effect (${((1 - stats.game1.mean / overallStats.mean) * 100).toFixed(1)}% shorter)`);
}
if (stats.game1.ranges['0-50'].count / stats.game1.sampleSize > 0.25) {
    console.log(`   ⚠️  High immediate rug rate: ${stats.game1.ranges['0-50'].percentage} rug within 50 ticks`);
}
if (stats.game3.mean > stats.game1.mean * 1.2) {
    console.log(`   ✅ Recovery pattern detected: Game 3 averages ${((stats.game3.mean / stats.game1.mean - 1) * 100).toFixed(1)}% longer than Game 1`);
}

// Save detailed analysis
const analysisReport = {
    metadata: {
        analyzedAt: new Date().toISOString(),
        totalGames: allGames.length,
        sequences500Plus: post500Patterns.sequences.length
    },
    individualGameStats: {
        game1: stats.game1,
        game2: stats.game2,
        game3: stats.game3,
        combined: stats.all3
    },
    baseline: overallStats,
    patterns: {
        immediateRugRate: (immediateRugs / post500Patterns.sequences.length),
        quickRecoveryRate: (quickRecovery / post500Patterns.sequences.length),
        gradualRecoveryRate: (gradualRecovery / post500Patterns.sequences.length)
    },
    sequences: post500Patterns.sequences
};

fs.writeFileSync(
    path.resolve(path.join(__dirname, '../..', pathConfig.historicalData, 'post_500_analysis.json')),
    JSON.stringify(analysisReport, null, 2)
);

console.log('\n\n✅ Analysis complete! Detailed report saved to post_500_analysis.json');