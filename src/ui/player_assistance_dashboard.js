#!/usr/bin/env node
/**
 * Martingale Side Bet Player Assistance Dashboard v5.0
 * 
 * Provides real-time recommendations and statistics to help players
 * make optimal side bet decisions. No automated betting - player assistance only.
 * 
 * Features historical data preloading for instant recommendations.
 */

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Load path configuration
const pathConfig = require('../../config/paths.json');

// Configuration
const SOCKET_URL = 'https://backend.rugs.fun';
const VERSION = 'v5.0-player-assistance';
const BATCH_DATA_PATH = path.resolve(path.join(__dirname, '../..', pathConfig.batchDir));
const PRELOAD_GAMES = 100; // Number of historical games to preload

// Recommendation Strategies
const STRATEGIES = {
    EARLY_AGGRESSIVE: {
        name: 'Early Aggressive',
        entryTick: 40,
        exitTick: 100,
        sequence: [0.001, 0.002, 0.004, 0.008, 0.016, 0.032],
        description: 'High risk/reward for games ending 40-100 ticks'
    },
    MID_STANDARD: {
        name: 'Mid Game Standard',
        entryTick: 90,
        exitTick: 200,
        sequence: [0.001, 0.0025, 0.006, 0.015, 0.037, 0.092],
        description: 'Balanced approach targeting median duration'
    },
    LATE_CONSERVATIVE: {
        name: 'Late Conservative',
        entryTick: 180,
        exitTick: 500,
        sequence: [0.002, 0.005, 0.012, 0.030, 0.075],
        description: 'Conservative strategy for high probability zones'
    }
};

// Historical Data Loader
class HistoricalDataLoader {
    constructor() {
        this.loadedGames = [];
    }

    async loadHistoricalData() {
        console.log('🔄 Loading historical data from batch files...');
        
        try {
            console.log(`📂 Looking for batch files in: ${BATCH_DATA_PATH}`);
            // Find all batch game files
            const gameFiles = glob.sync(BATCH_DATA_PATH + '/*_games.json');
            
            if (gameFiles.length === 0) {
                console.log('⚠️  No batch data found. Starting with empty history.');
                return [];
            }

            // Sort files by batch number (newest first)
            gameFiles.sort((a, b) => {
                const aMatch = a.match(/(\d+)_games\.json$/);
                const bMatch = b.match(/(\d+)_games\.json$/);
                if (aMatch && bMatch) {
                    return parseInt(bMatch[1]) - parseInt(aMatch[1]);
                }
                return 0;
            });

            console.log(`📁 Found ${gameFiles.length} batch files`);

            // Load games from newest to oldest until we have enough
            let allGames = [];
            
            for (const file of gameFiles) {
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (data.games && Array.isArray(data.games)) {
                        // Add games from this batch (newest first)
                        allGames = allGames.concat(data.games.reverse());
                        
                        console.log(`📊 Loaded ${data.games.length} games from ${path.basename(file)}`);
                        
                        // Stop if we have enough games
                        if (allGames.length >= PRELOAD_GAMES) {
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  Error reading ${path.basename(file)}: ${error.message}`);
                }
            }

            // Take only the most recent games we need
            const recentGames = allGames.slice(0, PRELOAD_GAMES);
            
            // Convert to the format expected by StatisticalTracker
            this.loadedGames = recentGames.map(game => ({
                gameId: game.gameId,
                duration: game.duration,
                peakMultiplier: game.peakMultiplier,
                timestamp: new Date().getTime() - (recentGames.length - recentGames.indexOf(game)) * 60000 // Spread timestamps
            }));

            console.log(`✅ Successfully loaded ${this.loadedGames.length} historical games`);
            console.log(`📈 Date range: Last ${this.loadedGames.length} games from batch data`);
            
            // Show quick stats
            const durations = this.loadedGames.map(g => g.duration);
            const mean = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
            const median = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];
            
            console.log(`📊 Historical Stats: Mean ${mean} ticks, Median ${median} ticks`);
            console.log('🚀 Dashboard ready with full statistical foundation!\n');
            
            return this.loadedGames;
            
        } catch (error) {
            console.error('❌ Error loading historical data:', error.message);
            console.error('Full error:', error);
            console.log('⚠️  Starting with empty history. Recommendations will improve as games are observed.\n');
            return [];
        }
    }

    getLoadedGames() {
        return this.loadedGames;
    }

    getLoadedGameCount() {
        return this.loadedGames.length;
    }
}

// Statistical tracking for different windows
class StatisticalTracker {
    constructor() {
        this.windows = {
            100: { games: [], stats: {} },
            50: { games: [], stats: {} },
            25: { games: [], stats: {} },
            10: { games: [], stats: {} }
        };
        this.historicalGamesLoaded = 0;
        this.liveGamesAdded = 0;
    }

    async initializeWithHistoricalData(loader) {
        const historicalGames = await loader.loadHistoricalData();
        
        // Add all historical games
        historicalGames.forEach(game => {
            this.addGameToWindows(game, true); // Mark as historical
        });
        
        this.historicalGamesLoaded = historicalGames.length;
        console.log(`🔢 Initialized with ${this.historicalGamesLoaded} historical games`);
        
        return this.historicalGamesLoaded;
    }

    addGame(gameData) {
        this.addGameToWindows(gameData, false); // Mark as live
        this.liveGamesAdded++;
    }

    addGameToWindows(gameData, isHistorical = false) {
        Object.keys(this.windows).forEach(size => {
            const window = this.windows[size];
            window.games.push(gameData);
            
            if (window.games.length > parseInt(size)) {
                window.games.shift();
            }
            
            this.calculateStats(size);
        });
    }

    calculateStats(windowSize) {
        const window = this.windows[windowSize];
        const durations = window.games.map(g => g.duration);
        
        if (durations.length === 0) return;
        
        const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        const sorted = [...durations].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        const frequency = {};
        durations.forEach(d => {
            frequency[d] = (frequency[d] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.keys(frequency)
            .filter(k => frequency[k] === maxFreq)
            .map(Number);
        
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        
        const p25 = sorted[Math.floor(sorted.length * 0.25)];
        const p75 = sorted[Math.floor(sorted.length * 0.75)];
        const p90 = sorted[Math.floor(sorted.length * 0.90)];
        
        window.stats = {
            count: durations.length,
            mean: mean.toFixed(2),
            median: median,
            mode: modes.length === 1 ? modes[0] : modes,
            range: { min, max },
            stdDev: stdDev.toFixed(2),
            percentiles: { p25, p50: median, p75, p90 }
        };
    }

    getStats(windowSize) {
        return this.windows[windowSize].stats;
    }

    getCurrentProbabilities(currentTick) {
        const probabilities = {};
        
        [10, 25, 50, 100].forEach(horizon => {
            const targetTick = currentTick + horizon;
            let count = 0;
            
            this.windows[100].games.forEach(game => {
                if (game.duration >= currentTick && game.duration < targetTick) {
                    count++;
                }
            });
            
            const totalGames = this.windows[100].games.filter(g => g.duration >= currentTick).length;
            probabilities[horizon] = totalGames > 0 ? (count / totalGames * 100).toFixed(1) : 0;
        });
        
        return probabilities;
    }

    getRecommendationScore(currentTick) {
        const probs = this.getCurrentProbabilities(currentTick);
        const prob10 = parseFloat(probs[10]);
        
        if (prob10 >= 8) return { level: 'HIGH', color: '🟢', confidence: 'Strong' };
        if (prob10 >= 5) return { level: 'MEDIUM', color: '🟡', confidence: 'Moderate' };
        if (prob10 >= 3) return { level: 'LOW', color: '🟠', confidence: 'Weak' };
        return { level: 'AVOID', color: '🔴', confidence: 'Poor' };
    }

    getDataStatus() {
        return {
            historicalGames: this.historicalGamesLoaded,
            liveGames: this.liveGamesAdded,
            totalGames: this.historicalGamesLoaded + this.liveGamesAdded,
            isFullyInitialized: this.historicalGamesLoaded >= 50 // Good baseline
        };
    }
}

// Recommendation Engine
class RecommendationEngine {
    constructor() {
        this.currentRecommendations = [];
        this.playerState = {
            activeBets: 0,
            totalInvested: 0,
            sessionProfit: 0,
            lastStrategy: null,
            consecutiveLosses: 0
        };
    }

    generateRecommendations(tick, stats, volatility = 0) {
        this.currentRecommendations = [];
        
        // Check data quality first
        const dataStatus = stats.getDataStatus();
        if (!dataStatus.isFullyInitialized) {
            return []; // No recommendations until we have enough data
        }
        
        // Check each strategy
        Object.values(STRATEGIES).forEach(strategy => {
            if (tick >= strategy.entryTick && tick < strategy.exitTick) {
                const recommendation = this.evaluateStrategy(strategy, tick, stats, volatility);
                if (recommendation) {
                    this.currentRecommendations.push(recommendation);
                }
            }
        });
        
        // Sort by confidence
        this.currentRecommendations.sort((a, b) => b.confidence - a.confidence);
        
        return this.currentRecommendations;
    }

    evaluateStrategy(strategy, tick, stats, volatility) {
        const score = stats.getRecommendationScore(tick);
        const probs = stats.getCurrentProbabilities(tick);
        
        // Calculate confidence based on multiple factors
        let confidence = parseFloat(probs[10]) * 10; // Base confidence from 10-tick probability
        
        // Adjust for volatility
        if (volatility > 0.15) confidence *= 0.5; // High volatility penalty
        if (volatility > 0.1) confidence *= 0.8;  // Medium volatility penalty
        
        // Adjust for game position relative to historical data
        const stats100 = stats.getStats(100);
        if (stats100.median) {
            const relativePosition = tick / stats100.median;
            if (relativePosition > 0.8) confidence *= 1.2; // Near median, boost confidence
            if (relativePosition > 1.5) confidence *= 1.5; // Past median, higher confidence
        }
        
        // Skip if confidence too low
        if (confidence < 30) return null;
        
        // Calculate suggested bet amount (first in sequence)
        const suggestedBet = strategy.sequence[0];
        
        // Calculate break-even requirement
        const breakEven = suggestedBet / 5; // 5:1 payout
        
        return {
            strategy: strategy.name,
            description: strategy.description,
            confidence: Math.min(confidence, 100),
            suggestedBet: suggestedBet,
            breakEven: breakEven,
            maxSequenceLoss: strategy.sequence.reduce((a, b) => a + b, 0),
            tickRange: `${strategy.entryTick}-${strategy.exitTick}`,
            probability10: probs[10],
            score: score.level,
            color: score.color,
            recommendation: this.getRecommendationText(confidence, strategy)
        };
    }

    getRecommendationText(confidence, strategy) {
        if (confidence >= 80) return `STRONG BET: Excellent conditions for ${strategy.name}`;
        if (confidence >= 60) return `GOOD BET: Favorable conditions for ${strategy.name}`;
        if (confidence >= 40) return `CONSIDER: Moderate opportunity for ${strategy.name}`;
        return `CAUTION: Low confidence for ${strategy.name}`;
    }

    updatePlayerState(bet, won) {
        if (won) {
            this.playerState.sessionProfit += (bet * 5) - bet;
            this.playerState.consecutiveLosses = 0;
        } else {
            this.playerState.sessionProfit -= bet;
            this.playerState.consecutiveLosses++;
        }
    }
}

// Main application state
let currentGame = null;
let statsTracker = new StatisticalTracker();
let recommendationEngine = new RecommendationEngine();
let historicalLoader = new HistoricalDataLoader();
let lastDisplayTime = 0;
let isInitialized = false;

// Enhanced display function
function displayDashboard(data, volatility = 0) {
    const now = Date.now();
    if (now - lastDisplayTime < 500) return; // Update every 500ms
    lastDisplayTime = now;
    
    // Only clear console after initialization is complete
    if (isInitialized) {
        console.clear();
    }
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║               MARTINGALE SIDE BET ADVISOR v5.0               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    // Data status indicator
    const dataStatus = statsTracker.getDataStatus();
    const statusColor = dataStatus.isFullyInitialized ? '🟢' : '🟡';
    const statusText = dataStatus.isFullyInitialized ? 'READY' : 'WARMING UP';
    console.log(`\n${statusColor} STATUS: ${statusText} | Historical: ${dataStatus.historicalGames} | Live: ${dataStatus.liveGames} | Total: ${dataStatus.totalGames}`);
    
    // Current game info with visual indicators
    const volatilityColor = volatility > 0.15 ? '🔴' : volatility > 0.1 ? '🟡' : '🟢';
    console.log(`\n📊 CURRENT GAME STATUS`);
    console.log(`   Tick: ${data.tickCount} | Price: ${data.price.toFixed(2)}x | Volatility: ${(volatility * 100).toFixed(2)}% ${volatilityColor}`);
    
    // Quick reference statistics
    console.log(`\n📈 STATISTICAL REFERENCE`);
    [100, 50, 25, 10].forEach(size => {
        const stats = statsTracker.getStats(size);
        if (stats.count > 0) {
            const progress = data.tickCount > stats.median ? '🔥' : data.tickCount > stats.mean ? '⚡' : '📍';
            console.log(`   Last ${size.toString().padStart(3)}: Mean ${stats.mean} | Median ${stats.median} | Range ${stats.range.min}-${stats.range.max} ${progress}`);
        }
    });
    
    // Probability analysis
    const probs = statsTracker.getCurrentProbabilities(data.tickCount);
    const score = statsTracker.getRecommendationScore(data.tickCount);
    console.log(`\n🎲 RUG PROBABILITY ANALYSIS`);
    console.log(`   Next 10 ticks: ${probs[10]}% | 25 ticks: ${probs[25]}% | 50 ticks: ${probs[50]}% | 100 ticks: ${probs[100]}%`);
    console.log(`   Overall Assessment: ${score.color} ${score.level} (${score.confidence} confidence)`);
    
    // Strategy recommendations
    const recommendations = recommendationEngine.generateRecommendations(data.tickCount, statsTracker, volatility);
    console.log(`\n💡 BETTING RECOMMENDATIONS`);
    
    if (!dataStatus.isFullyInitialized) {
        console.log(`   ⏳ Building statistical foundation... Need ${50 - dataStatus.totalGames} more games for recommendations`);
        console.log(`   📊 Current confidence: ${Math.min(100, (dataStatus.totalGames / 50) * 100).toFixed(0)}%`);
    } else if (recommendations.length === 0) {
        console.log(`   ❌ No favorable betting opportunities at tick ${data.tickCount}`);
        console.log(`   📋 Waiting for optimal entry points...`);
    } else {
        recommendations.slice(0, 3).forEach((rec, index) => {
            const priority = index === 0 ? '⭐ PRIMARY' : index === 1 ? '🔸 SECONDARY' : '🔹 TERTIARY';
            console.log(`   ${priority}: ${rec.color} ${rec.recommendation}`);
            console.log(`      💰 Suggested Bet: ${rec.suggestedBet} SOL | Break-even: ${rec.breakEven.toFixed(3)} SOL`);
            console.log(`      📊 Confidence: ${rec.confidence.toFixed(1)}% | Max Loss: ${rec.maxSequenceLoss.toFixed(3)} SOL`);
            console.log(`      🎯 Strategy: ${rec.strategy} (${rec.tickRange} ticks)`);
            if (index < recommendations.length - 1) console.log('');
        });
    }
    
    // Game context and warnings
    console.log(`\n⚠️  RISK ASSESSMENT`);
    const stats10 = statsTracker.getStats(10);
    const warnings = [];
    
    if (!dataStatus.isFullyInitialized) warnings.push('🟡 Limited data - recommendations warming up');
    if (volatility > 0.15) warnings.push('🔴 HIGH VOLATILITY - Consider avoiding bets');
    if (stats10.mean && parseFloat(stats10.mean) < 50) warnings.push('🟡 Recent games ending quickly');
    if (data.tickCount < 20) warnings.push('🟠 Early game - higher instarug risk');
    if (warnings.length === 0) warnings.push('🟢 Normal conditions detected');
    
    warnings.forEach(warning => console.log(`   ${warning}`));
    
    // Position in game context
    const stats100 = statsTracker.getStats(100);
    if (stats100.median) {
        const relativePosition = (data.tickCount / stats100.median * 100).toFixed(0);
        const positionText = data.tickCount < stats100.median ? 'before median' : 'past median';
        console.log(`\n📍 GAME POSITION`);
        console.log(`   Current: ${relativePosition}% of historical median (${positionText})`);
        console.log(`   Percentile: ${data.tickCount < stats100.percentiles.p25 ? 'Bottom 25%' : 
                     data.tickCount < stats100.percentiles.p50 ? '25-50%' :
                     data.tickCount < stats100.percentiles.p75 ? '50-75%' : 'Top 25%'}`);
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 PLACE BETS MANUALLY BASED ON RECOMMENDATIONS ABOVE  🎯  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
}

// Initialize the application
async function initializeApp() {
    console.log('🚀 Starting Martingale Side Bet Player Assistance Dashboard...');
    console.log('💡 This tool provides recommendations only - you place bets manually');
    console.log('📊 Initializing with historical data for instant recommendations...\n');
    
    // Load historical data
    const gamesLoaded = await statsTracker.initializeWithHistoricalData(historicalLoader);
    
    if (gamesLoaded > 0) {
        console.log('✅ Dashboard fully initialized and ready for live recommendations!');
        isInitialized = true;
    } else {
        console.log('⚠️  No historical data found. Will build recommendations as games are observed.');
        isInitialized = false;
    }
    
    // Connect to WebSocket after initialization
    connectToGame();
}

// Connect to WebSocket
function connectToGame() {
    const socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
    });

    // Socket event handlers
    socket.on('connect', () => {
        console.log(`\n📡 Connected to Rugs.fun - Player Assistance Dashboard ${VERSION}`);
        console.log('🎮 Providing real-time recommendations based on statistical analysis...\n');
    });

    socket.on('gameStateUpdate', (data) => {
        // Handle cooldown phase
        if (data.cooldownTimer && data.cooldownTimer > 0) {
            if (currentGame && currentGame.phase === 'active') {
                // Game just ended, record the result
                const gameData = {
                    gameId: currentGame.gameId,
                    duration: currentGame.lastTick,
                    peakMultiplier: data.peakMultiplier || 1,
                    timestamp: Date.now()
                };
                
                statsTracker.addGame(gameData);
                
                // Show end-of-game summary during cooldown
                if (data.cooldownTimer > 10000) { // Only show once at start of cooldown
                    const dataStatus = statsTracker.getDataStatus();
                    console.log(`\n🏁 GAME ENDED at tick ${currentGame.lastTick} | Peak: ${gameData.peakMultiplier.toFixed(2)}x`);
                    console.log(`⏳ Cooldown: ${Math.ceil(data.cooldownTimer / 1000)}s | Total games analyzed: ${dataStatus.totalGames}`);
                    console.log(`📊 Live games added this session: ${dataStatus.liveGames}`);
                }
                
                currentGame = null;
            }
            return;
        }
        
        // Handle active game
        if (data.active === true && data.tickCount > 0 && !data.gameHistory) {
            if (!currentGame || currentGame.phase !== 'active') {
                currentGame = {
                    phase: 'active',
                    gameId: data.gameId,
                    startTime: Date.now(),
                    startTick: data.tickCount
                };
            }
            
            currentGame.lastTick = data.tickCount;
            
            // Calculate simple volatility (placeholder - you can enhance this)
            const volatility = 0.05; // You can integrate this with your volatility calculation from v2.2+
            
            // Display the dashboard
            displayDashboard(data, volatility);
        }
    });

    socket.on('disconnect', () => {
        console.log('📡 Disconnected from backend - attempting to reconnect...');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down Player Assistance Dashboard...');
        const dataStatus = statsTracker.getDataStatus();
        console.log(`📊 Session Summary:`);
        console.log(`   Historical games loaded: ${dataStatus.historicalGames}`);
        console.log(`   Live games observed: ${dataStatus.liveGames}`);
        console.log(`   Total games analyzed: ${dataStatus.totalGames}`);
        
        const stats = statsTracker.getStats(100);
        if (stats.count > 0) {
            console.log(`📈 Final Stats: Mean ${stats.mean} ticks | Median ${stats.median} ticks`);
        }
        console.log('Thank you for using the Martingale Side Bet Advisor! 🎯');
        process.exit(0);
    });
}

// Start the application
initializeApp(); 