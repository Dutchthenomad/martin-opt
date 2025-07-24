#!/usr/bin/env node
/**
 * Martingale Session Manager v5.1
 * Provides stable, committed betting sequences for player assistance
 * 
 * Key Features:
 * - Commits to a statistical baseline when session starts
 * - Tracks martingale progression with fixed parameters
 * - Provides clear bet sizing and stop-loss guidance
 * - Smooths out tick-by-tick noise for consistent recommendations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const io = require('socket.io-client');

// Load path configuration
const pathConfig = require('../../config/paths.json');

// Configuration
const SOCKET_URL = 'https://backend.rugs.fun';
const VERSION = 'v5.1-session-manager';
const BATCH_DATA_PATH = path.resolve(path.join(__dirname, '../..', pathConfig.batchDir));
const PRELOAD_GAMES = 100;

/**
 * Martingale Session Manager
 * Handles committed betting sequences with statistical backing
 */
class MartingaleSessionManager {
    constructor() {
        this.isSessionActive = false;
        this.sessionConfig = null;
        this.currentBet = 0;
        this.totalRisked = 0;
        this.betHistory = [];
        this.startTick = 0;
        this.baselineStats = null;
        
        // Martingale sequences (progressive multipliers)
        this.sequences = {
            conservative: [0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.128, 0.256, 0.512],
            moderate: [0.001, 0.003, 0.009, 0.027, 0.081, 0.243, 0.729, 2.187],
            aggressive: [0.001, 0.005, 0.025, 0.125, 0.625, 3.125]
        };
    }

    /**
     * Start a new martingale session with committed parameters
     * @param {Object} config - Session configuration
     */
    startSession(config) {
        this.isSessionActive = true;
        this.sessionConfig = {
            startTick: config.startTick,
            strategy: config.strategy || 'conservative', // conservative, moderate, aggressive
            maxLoss: config.maxLoss || 1.0, // SOL
            statisticalBaseline: config.statisticalBaseline,
            entryReason: config.entryReason,
            timestamp: Date.now()
        };
        
        this.currentBet = 0;
        this.totalRisked = 0;
        this.betHistory = [];
        this.startTick = config.startTick;
        this.baselineStats = config.statisticalBaseline;
        
        console.log('\n🎯 MARTINGALE SESSION STARTED');
        console.log('═'.repeat(50));
        console.log(`📍 Entry Tick: ${this.startTick}`);
        console.log(`🎲 Strategy: ${this.sessionConfig.strategy.toUpperCase()}`);
        console.log(`💰 Max Loss: ${this.sessionConfig.maxLoss} SOL`);
        console.log(`📊 Entry Reason: ${this.sessionConfig.entryReason}`);
        console.log(`📈 Baseline: ${this.baselineStats.mean.toFixed(1)} mean, ${this.baselineStats.median} median`);
        console.log('═'.repeat(50));
        
        return this.getNextRecommendation();
    }

    /**
     * Get the next betting recommendation for active session
     * @param {number} currentTick - Current game tick
     * @returns {Object} Betting recommendation
     */
    getNextRecommendation(currentTick = null) {
        if (!this.isSessionActive) {
            return { error: 'No active session' };
        }

        const sequence = this.sequences[this.sessionConfig.strategy];
        const nextBetAmount = sequence[this.currentBet] || sequence[sequence.length - 1];
        const projectedRisk = this.totalRisked + nextBetAmount;
        
        // Calculate potential payout (5:1 side bet)
        const potentialPayout = nextBetAmount * 5;
        const netProfit = potentialPayout - projectedRisk;
        
        // Risk assessment
        const riskLevel = projectedRisk / this.sessionConfig.maxLoss;
        let riskStatus = '🟢 LOW';
        if (riskLevel > 0.5) riskStatus = '🟡 MEDIUM';
        if (riskLevel > 0.8) riskStatus = '🔴 HIGH';
        if (riskLevel > 1.0) riskStatus = '⛔ EXCEEDED';
        
        // Session progress
        const ticksElapsed = currentTick ? currentTick - this.startTick : 0;
        const baselineRemaining = this.baselineStats.median - ticksElapsed;
        
        return {
            sessionActive: true,
            betNumber: this.currentBet + 1,
            recommendedBet: nextBetAmount,
            totalRisked: this.totalRisked,
            projectedRisk: projectedRisk,
            potentialPayout: potentialPayout,
            netProfit: netProfit,
            riskLevel: riskLevel,
            riskStatus: riskStatus,
            maxLoss: this.sessionConfig.maxLoss,
            ticksElapsed: ticksElapsed,
            baselineRemaining: baselineRemaining,
            shouldContinue: projectedRisk <= this.sessionConfig.maxLoss,
            strategy: this.sessionConfig.strategy
        };
    }

    /**
     * Record the result of a bet
     * @param {boolean} won - Whether the bet won
     * @param {number} amount - Bet amount
     */
    recordBet(won, amount) {
        if (!this.isSessionActive) return;
        
        this.betHistory.push({
            betNumber: this.currentBet + 1,
            amount: amount,
            won: won,
            timestamp: Date.now()
        });
        
        if (won) {
            // Session complete - calculate final result
            const totalPayout = amount * 5;
            const finalProfit = totalPayout - (this.totalRisked + amount);
            
            console.log('\n🎉 SESSION WON!');
            console.log('═'.repeat(40));
            console.log(`💰 Final Payout: ${totalPayout} SOL`);
            console.log(`📈 Net Profit: +${finalProfit.toFixed(3)} SOL`);
            console.log(`🎯 Bets Placed: ${this.betHistory.length}`);
            console.log('═'.repeat(40));
            
            this.endSession('won');
        } else {
            // Add to total risk and continue
            this.totalRisked += amount;
            this.currentBet++;
            
            console.log(`❌ Bet ${this.currentBet} lost: ${amount} SOL`);
            console.log(`📊 Total Risked: ${this.totalRisked.toFixed(3)} SOL`);
        }
    }

    /**
     * End the current session
     * @param {string} reason - Reason for ending
     */
    endSession(reason = 'manual') {
        if (!this.isSessionActive) return;
        
        const duration = Date.now() - this.sessionConfig.timestamp;
        const finalLoss = reason === 'won' ? 0 : this.totalRisked;
        
        console.log('\n📋 SESSION SUMMARY');
        console.log('═'.repeat(40));
        console.log(`🕐 Duration: ${Math.round(duration / 1000)}s`);
        console.log(`🎯 Strategy: ${this.sessionConfig.strategy}`);
        console.log(`📊 Bets Placed: ${this.betHistory.length}`);
        console.log(`💸 Final Loss: ${finalLoss.toFixed(3)} SOL`);
        console.log(`🏁 End Reason: ${reason}`);
        console.log('═'.repeat(40));
        
        this.isSessionActive = false;
        this.sessionConfig = null;
    }

    /**
     * Get current session status
     */
    getSessionStatus() {
        if (!this.isSessionActive) {
            return { active: false };
        }

        return {
            active: true,
            startTick: this.startTick,
            strategy: this.sessionConfig.strategy,
            currentBet: this.currentBet + 1,
            totalRisked: this.totalRisked,
            maxLoss: this.sessionConfig.maxLoss,
            betHistory: this.betHistory,
            config: this.sessionConfig
        };
    }
}

/**
 * Enhanced Statistics Tracker with session integration
 */
class SessionAwareStatsTracker {
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

    /**
     * Get stabilized entry recommendations
     * Returns smoothed recommendations that don't change every tick
     */
    getEntryRecommendations(currentTick) {
        const stats100 = this.windows[100].stats;
        if (!stats100.count || stats100.count < 10) {
            return { recommendations: [], confidence: 0 };
        }

        const mean = parseFloat(stats100.mean);
        const median = stats100.median;
        
        // Define entry zones based on statistical position
        const recommendations = [];
        
        // Early entry (50-75% of median)
        const earlyZone = { min: Math.round(median * 0.5), max: Math.round(median * 0.75) };
        if (currentTick >= earlyZone.min && currentTick <= earlyZone.max) {
            recommendations.push({
                type: 'early',
                strategy: 'conservative',
                confidence: 0.7,
                reason: `In early entry zone (${earlyZone.min}-${earlyZone.max}), ${(currentTick/median*100).toFixed(0)}% of median`,
                statisticalBasis: { mean, median, position: 'early' }
            });
        }
        
        // Prime entry (75-125% of median)
        const primeZone = { min: Math.round(median * 0.75), max: Math.round(median * 1.25) };
        if (currentTick >= primeZone.min && currentTick <= primeZone.max) {
            recommendations.push({
                type: 'prime',
                strategy: 'moderate',
                confidence: 0.85,
                reason: `In prime entry zone (${primeZone.min}-${primeZone.max}), ${(currentTick/median*100).toFixed(0)}% of median`,
                statisticalBasis: { mean, median, position: 'prime' }
            });
        }
        
        // Late entry (125%+ of median)
        if (currentTick > median * 1.25) {
            recommendations.push({
                type: 'late',
                strategy: 'aggressive',
                confidence: 0.9,
                reason: `Past median (${currentTick} > ${median}), ${(currentTick/median*100).toFixed(0)}% of median`,
                statisticalBasis: { mean, median, position: 'late' }
            });
        }
        
        return {
            recommendations,
            confidence: Math.min(stats100.count / 50, 1.0),
            stats: { mean, median, count: stats100.count }
        };
    }

    // ... (include existing methods from StatisticalTracker)
    addGame(gameData) {
        Object.keys(this.windows).forEach(size => {
            const window = this.windows[size];
            window.games.push(gameData);
            
            if (window.games.length > parseInt(size)) {
                window.games.shift();
            }
            
            this.calculateStats(size);
        });
        
        this.liveGamesAdded++;
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
        
        window.stats = {
            count: durations.length,
            mean: mean.toFixed(2),
            median: median,
            range: { min: Math.min(...durations), max: Math.max(...durations) }
        };
    }
}

module.exports = {
    MartingaleSessionManager,
    SessionAwareStatsTracker
};

// If run directly, provide CLI interface
if (require.main === module) {
    console.log('🎯 Martingale Session Manager v5.1');
    console.log('This module provides structured martingale session tracking.');
    console.log('Use: const { MartingaleSessionManager } = require("./martingale_session_manager");');
} 