#!/usr/bin/env node
/**
 * Data Save Server for Mobile Dashboard
 * 
 * Provides HTTP endpoints for saving game data to filesystem
 * since browsers cannot directly write files.
 * 
 * Port: 9876 (uncommon port to avoid conflicts)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Load path configuration
const pathConfig = require('../../config/paths.json');
const PORT = pathConfig.serverPort || 9876;

// Data directory paths from config
const DATA_DIR = path.resolve(path.join(__dirname, '../..', pathConfig.liveData));
const ROLLING_FILE = path.resolve(path.join(__dirname, '../..', pathConfig.rollingFile));
const BATCH_DIR = path.resolve(path.join(__dirname, '../..', pathConfig.batchDir));
const RECOMMENDATIONS_DIR = path.resolve(path.join(__dirname, '../..', 'data/recommendations'));

// Ensure directories exist
[DATA_DIR, BATCH_DIR, RECOMMENDATIONS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json({ limit: '10mb' })); // Support larger payloads

// Remove server-side batch tracking - let client control batching
let batchNumber = 1;

// Load batch number from existing files
try {
    const batchFiles = fs.readdirSync(BATCH_DIR).filter(f => f.startsWith('batch_'));
    if (batchFiles.length > 0) {
        // Extract batch numbers and find the highest
        const numbers = batchFiles.map(f => {
            const match = f.match(/batch_\d+_(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        batchNumber = Math.max(...numbers) + 1;
    }
} catch (err) {
    console.log('Starting with batch number 1');
}

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Data Save Server',
        version: '1.0',
        port: PORT,
        endpoints: {
            'POST /save-game': 'Save a single game',
            'POST /save-batch': 'Save multiple games',
            'POST /save-recommendations': 'Save recommendation tracking data',
            'GET /load-history': 'Load historical games',
            'GET /stats': 'Get server statistics'
        }
    });
});

// Save single game endpoint (for immediate testing)
app.post('/save-game', (req, res) => {
    try {
        const gameData = req.body;
        
        // Validate game data
        if (!gameData || !gameData.duration || !gameData.timestamp) {
            return res.status(400).json({ error: 'Invalid game data' });
        }
        
        // Save individual game file
        const filename = `game_${gameData.timestamp || Date.now()}.json`;
        const filepath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(gameData, null, 2));
        
        // Update rolling 100 games file
        updateRollingFile(gameData);
        
        console.log(`✅ Saved game: ${gameData.duration} ticks, peak: ${gameData.peakPrice?.toFixed(2)}x`);
        
        res.json({
            success: true,
            filename: filename,
            message: 'Game saved successfully'
        });
        
    } catch (error) {
        console.error('❌ Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save batch endpoint - client controls batching
app.post('/save-batch', (req, res) => {
    try {
        const { games, batchNumber: clientBatchNumber } = req.body;
        
        if (!Array.isArray(games) || games.length === 0) {
            return res.status(400).json({ error: 'Invalid batch data' });
        }
        
        // Use client's batch number if provided
        const batchNum = clientBatchNumber || batchNumber;
        
        // Save the batch directly as provided by client
        const timestamp = Date.now();
        const batchId = `batch_${timestamp}_${String(batchNum).padStart(3, '0')}`;
        
        // Save batch summary
        const summary = {
            batchId: batchId,
            batchNumber: batchNum,
            timestamp: new Date().toISOString(),
            games: games.length,
            stats: calculateStats(games)
        };
        
        fs.writeFileSync(
            path.join(BATCH_DIR, `${batchId}_summary.json`),
            JSON.stringify(summary, null, 2)
        );
        
        // Save batch games
        fs.writeFileSync(
            path.join(BATCH_DIR, `${batchId}_games.json`),
            JSON.stringify({ batchId, games }, null, 2)
        );
        
        console.log(`📦 Batch ${batchNum} saved: ${games.length} games`);
        
        // Update batch number for next time
        if (batchNum >= batchNumber) {
            batchNumber = batchNum + 1;
        }
        
        res.json({
            success: true,
            batchId: batchId,
            gamesReceived: games.length,
            message: `Batch ${batchNum} saved successfully`
        });
        
    } catch (error) {
        console.error('❌ Batch save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Load historical data endpoint
app.get('/load-history', (req, res) => {
    try {
        // First try to load from rolling file
        if (fs.existsSync(ROLLING_FILE)) {
            const data = JSON.parse(fs.readFileSync(ROLLING_FILE, 'utf8'));
            return res.json({
                success: true,
                source: 'rolling',
                games: data.games || [],
                stats: data.stats || null,
                totalGamesCollected: data.totalGamesCollected || (data.games ? data.games.length : 0)
            });
        }
        
        // Otherwise, load from recent batch files
        const games = [];
        const batchFiles = fs.readdirSync(BATCH_DIR)
            .filter(f => f.endsWith('_games.json'))
            .sort((a, b) => b.localeCompare(a)) // Newest first
            .slice(0, 2); // Last 2 batches
        
        for (const file of batchFiles) {
            try {
                const batchData = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, file), 'utf8'));
                if (batchData.games) {
                    games.push(...batchData.games);
                }
            } catch (err) {
                console.error(`Error loading ${file}:`, err);
            }
        }
        
        // Take most recent 100 games
        const recentGames = games.slice(0, 100);
        
        res.json({
            success: true,
            source: 'batches',
            games: recentGames,
            totalAvailable: games.length
        });
        
    } catch (error) {
        console.error('❌ Load history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save recommendations endpoint
app.post('/save-recommendations', (req, res) => {
    try {
        const { recommendations, timestamp } = req.body;
        
        if (!Array.isArray(recommendations) || recommendations.length === 0) {
            return res.status(400).json({ error: 'Invalid recommendations data' });
        }
        
        // Create filename with timestamp
        const date = new Date(timestamp || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `recommendations_${dateStr}_${timeStr}.json`;
        const filepath = path.join(RECOMMENDATIONS_DIR, filename);
        
        // Calculate accuracy stats
        const stats = {
            total: recommendations.length,
            exitCount: 0,
            holdCount: 0,
            correctPredictions: 0,
            accuracyByWindow: {
                within10: { correct: 0, total: 0 },
                within20: { correct: 0, total: 0 },
                within30: { correct: 0, total: 0 },
                within40: { correct: 0, total: 0 },
                within50: { correct: 0, total: 0 },
                within60: { correct: 0, total: 0 },
                within70: { correct: 0, total: 0 }
            }
        };
        
        // Analyze recommendations
        recommendations.forEach(rec => {
            if (rec.recommendation === 'EXIT' || rec.recommendation === 'REDUCE') {
                stats.exitCount++;
                if (rec.outcome) {
                    if (rec.outcome.within10) stats.accuracyByWindow.within10.correct++;
                    if (rec.outcome.within20) stats.accuracyByWindow.within20.correct++;
                    if (rec.outcome.within30) stats.accuracyByWindow.within30.correct++;
                    if (rec.outcome.within40) stats.accuracyByWindow.within40.correct++;
                    if (rec.outcome.within50) stats.accuracyByWindow.within50.correct++;
                    if (rec.outcome.within60) stats.accuracyByWindow.within60.correct++;
                    if (rec.outcome.within70) stats.accuracyByWindow.within70.correct++;
                    stats.accuracyByWindow.within10.total++;
                    stats.accuracyByWindow.within20.total++;
                    stats.accuracyByWindow.within30.total++;
                    stats.accuracyByWindow.within40.total++;
                    stats.accuracyByWindow.within50.total++;
                    stats.accuracyByWindow.within60.total++;
                    stats.accuracyByWindow.within70.total++;
                }
            } else {
                stats.holdCount++;
            }
            
            if (rec.outcome && rec.outcome.correctPrediction) {
                stats.correctPredictions++;
            }
        });
        
        // Calculate percentages
        Object.keys(stats.accuracyByWindow).forEach(window => {
            const data = stats.accuracyByWindow[window];
            data.percentage = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(1) : '0.0';
        });
        
        stats.overallAccuracy = stats.total > 0 ? 
            ((stats.correctPredictions / stats.total) * 100).toFixed(1) : '0.0';
        
        // Save data
        const saveData = {
            timestamp: new Date().toISOString(),
            recommendations,
            stats
        };
        
        fs.writeFileSync(filepath, JSON.stringify(saveData, null, 2));
        
        console.log(`📊 Saved ${recommendations.length} recommendations with ${stats.overallAccuracy}% accuracy`);
        console.log(`   40-tick accuracy: ${stats.accuracyByWindow.within40.percentage}%`);
        console.log(`   70-tick accuracy: ${stats.accuracyByWindow.within70.percentage}%`);
        
        res.json({
            success: true,
            filename,
            stats,
            message: `Saved ${recommendations.length} recommendations`
        });
        
    } catch (error) {
        console.error('❌ Recommendations save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Server statistics endpoint
app.get('/stats', (req, res) => {
    try {
        const gameFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('game_'));
        const batchFiles = fs.readdirSync(BATCH_DIR).filter(f => f.startsWith('batch_'));
        
        res.json({
            uptime: process.uptime(),
            batchNumber: batchNumber,
            totalGameFiles: gameFiles.length,
            totalBatchFiles: batchFiles.length,
            dataDirectory: DATA_DIR
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to update rolling 100 games file
function updateRollingFile(newGame) {
    try {
        let data = { games: [], stats: null, lastUpdated: null };
        
        // Load existing data
        if (fs.existsSync(ROLLING_FILE)) {
            data = JSON.parse(fs.readFileSync(ROLLING_FILE, 'utf8'));
        }
        
        // Add new game
        data.games.push(newGame);
        
        // Keep only last 100
        if (data.games.length > 100) {
            data.games = data.games.slice(-100);
        }
        
        // Update stats
        data.stats = calculateStats(data.games);
        data.lastUpdated = new Date().toISOString();
        data.totalGamesCollected = (data.totalGamesCollected || data.games.length) + 1;
        
        // Save
        fs.writeFileSync(ROLLING_FILE, JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Error updating rolling file:', error);
    }
}

// Helper function removed - client controls batching
// Batch saving is now handled entirely in the /save-batch endpoint

// Calculate statistics
function calculateStats(games) {
    if (!games || games.length === 0) return null;
    
    const durations = games.map(g => g.duration).sort((a, b) => a - b);
    const n = durations.length;
    
    const sum = durations.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 === 0 
        ? (durations[n/2 - 1] + durations[n/2]) / 2 
        : durations[Math.floor(n/2)];
    
    const variance = durations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    return {
        count: n,
        mean: mean,
        median: median,
        std: std,
        min: durations[0],
        max: durations[n - 1],
        percentiles: {
            p25: durations[Math.floor(n * 0.25)],
            p50: median,
            p75: durations[Math.floor(n * 0.75)],
            p90: durations[Math.floor(n * 0.90)],
            p95: durations[Math.floor(n * 0.95)]
        }
    };
}

// Start server
app.listen(PORT, () => {
    console.log('🚀 Data Save Server started');
    console.log(`📡 Listening on port ${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`📦 Starting at batch number: ${batchNumber}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log('\nEndpoints:');
    console.log('  POST http://localhost:9876/save-game          - Save single game');
    console.log('  POST http://localhost:9876/save-batch         - Save multiple games');
    console.log('  POST http://localhost:9876/save-recommendations - Save recommendations');
    console.log('  GET  http://localhost:9876/load-history       - Load historical data');
    console.log('  GET  http://localhost:9876/stats              - Server statistics');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n📊 Shutting down Data Save Server...');
    console.log('👋 Server stopped');
    process.exit(0);
});