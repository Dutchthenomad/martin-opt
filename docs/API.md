# API Documentation

## WebSocket API

The system connects to the Rugs.fun WebSocket server for real-time game data and side bet events.

### Connection

```javascript
const socket = io('wss://backend.rugs.fun');
```

### Incoming Events

#### `gameStateUpdate`
Received whenever the game state changes.

```javascript
socket.on('gameStateUpdate', (data) => {
    // data structure:
    {
        tickCount: 245,          // Current tick number
        active: true,            // Is game active
        cooldownTimer: 0,        // Cooldown in ms (0 if active)
        playersCount: 23,        // Current player count
        totalVolume: 12.456,     // Total SOL volume
        // ... additional fields
    }
});
```

#### `newSideBet`
Triggered when any player places a side bet.

```javascript
socket.on('newSideBet', (data) => {
    // data is an array with one bet object:
    [{
        betAmount: 0.003,        // Amount in SOL
        coinAddress: "So1111...", // Token address (SOL)
        endTick: 554,            // When bet window ends
        playerId: "did:privy:...", // Unique player ID
        startTick: 514,          // When bet was placed
        tickIndex: 514,          // Current tick at placement
        timestamp: 1753372654244, // Unix timestamp
        type: "placed",          // Event type
        username: "Nomad",       // Player display name
        xPayout: 5               // Payout multiplier
    }]
});
```

#### `sideBetResolved`
Fired when a side bet is resolved (win/loss).

```javascript
socket.on('sideBetResolved', (data) => {
    {
        betId: "player123_514_1753372654244",
        playerId: "did:privy:...",
        won: true,               // Outcome
        payout: 0.015,          // Payout amount (if won)
        resolvedAtTick: 540
    }
});
```

#### `newTrade`
Player trading activity (buy/sell tokens).

```javascript
socket.on('newTrade', (data) => {
    {
        type: "buy",            // or "sell"
        amount: 0.1,            // SOL amount
        tokens: 1000,           // Token amount
        price: 0.0001,          // Price per token
        playerId: "did:privy:...",
        username: "Player123"
    }
});
```

### Outgoing Events

Currently, the system only listens to events. Future versions may support:
- `placeSideBet` - Place a side bet
- `getPlayerStats` - Request player statistics
- `subscribe` - Subscribe to specific events

## REST API

### Data Collection Server

The local data collection server provides endpoints for data persistence and analysis.

#### Base URL
```
http://localhost:3000
```

#### Endpoints

##### `GET /api/games`
Retrieve collected game data.

Query Parameters:
- `limit` - Number of games to return (default: 100)
- `offset` - Pagination offset (default: 0)
- `minTicks` - Minimum tick duration
- `maxTicks` - Maximum tick duration

```bash
GET /api/games?limit=50&minTicks=500
```

Response:
```json
{
    "games": [
        {
            "id": "game_1753372654244",
            "duration": 523,
            "endPrice": 45.67,
            "ruggedAt": 523,
            "peakPrice": 52.34,
            "timestamp": "2025-01-24T12:34:56Z",
            "volatilityMetrics": {
                "finalVolatility": 0.0045,
                "avgVolatility": 0.0032
            }
        }
    ],
    "total": 1523,
    "stats": {
        "avgDuration": 245,
        "medianDuration": 198,
        "p25Duration": 87,
        "p75Duration": 342
    }
}
```

##### `POST /api/recommendations`
Save recommendation tracking data.

Request Body:
```json
{
    "recommendation": {
        "type": "recommendation",
        "tickStart": 245,
        "timestamp": 1753372654244,
        "recommendation": "EXIT",
        "confidence": "high",
        "riskScore": 78.5,
        "expectedValue": -0.023,
        "zones": {
            "current": "DANGER",
            "probability": 0.42
        }
    }
}
```

Response:
```json
{
    "success": true,
    "message": "Recommendation saved"
}
```

##### `GET /api/recommendations/performance`
Get recommendation performance metrics.

Query Parameters:
- `timeframe` - Analysis window (1h, 24h, 7d, 30d)
- `strategy` - Filter by strategy type

```bash
GET /api/recommendations/performance?timeframe=24h
```

Response:
```json
{
    "performance": {
        "totalRecommendations": 156,
        "accuracy": {
            "within40Ticks": 0.72,
            "within70Ticks": 0.84,
            "overall": 0.78
        },
        "byType": {
            "EXIT": {
                "count": 89,
                "accuracy": 0.82
            },
            "HOLD": {
                "count": 45,
                "accuracy": 0.71
            },
            "ENTER": {
                "count": 22,
                "accuracy": 0.68
            }
        }
    }
}
```

##### `GET /api/patterns/analysis`
Analyze patterns in historical data.

Query Parameters:
- `pattern` - Pattern type (instaRug, volatilitySpike, plateau, recovery)
- `minGames` - Minimum games for analysis

```bash
GET /api/patterns/analysis?pattern=instaRug
```

Response:
```json
{
    "pattern": "instaRug",
    "occurrences": 45,
    "accuracy": 0.84,
    "avgTriggerTick": 72,
    "distribution": {
        "50-100": 23,
        "100-150": 15,
        "150+": 7
    }
}
```

## Data Schemas

### Game Object
```typescript
interface Game {
    id: string;
    startTime: string;
    endTime: string;
    duration: number;
    endPrice: number;
    ruggedAt: number;
    peakPrice: number;
    timestamp: string;
    volatilityMetrics: {
        finalVolatility: number;
        avgVolatility: number;
        maxVolatility: number;
        volatilitySpikes: number;
    };
    tickIntervals: number[];
    outcomes: {
        rugType: 'instant' | 'gradual' | 'plateau';
        profitableExit: number; // Last profitable tick
    };
}
```

### Recommendation Object
```typescript
interface Recommendation {
    type: 'recommendation' | 'outcome';
    tickStart: number;
    tickEnd?: number;
    timestamp: number;
    recommendation: 'ENTER' | 'EXIT' | 'HOLD' | 'REDUCE';
    confidence: 'low' | 'medium' | 'high';
    riskScore: number;
    expectedValue: number;
    zones: {
        current: string;
        probability: number;
    };
    patterns?: {
        instaRug: boolean;
        volatilitySpike: boolean;
        plateau: boolean;
        recovery: boolean;
    };
    outcome?: {
        actualDuration: number;
        correctPrediction: boolean;
        within40: boolean;
        within70: boolean;
    };
}
```

### Side Bet Object
```typescript
interface SideBet {
    betId: string;
    playerId: string;
    username: string;
    betAmount: number;
    startTick: number;
    endTick: number;
    placedAtTick: number;
    timestamp: number;
    status: 'active' | 'won' | 'lost';
    payout?: number;
    resolvedAtTick?: number;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - WebSocket disconnected |

## Rate Limits

- WebSocket events: No limit (passive listening)
- REST API: 100 requests per minute per IP
- Data saves: Batched every 50 games

## Integration Examples

### Basic WebSocket Connection
```javascript
const socket = io('wss://backend.rugs.fun');

socket.on('connect', () => {
    console.log('Connected to Rugs.fun');
});

socket.on('gameStateUpdate', (data) => {
    if (data.active && data.tickCount > 100) {
        // Game is active and past early phase
        analyzeGameState(data);
    }
});

socket.on('newSideBet', (bets) => {
    const bet = bets[0];
    if (bet.betAmount > 0.1) {
        // Whale alert!
        console.log(`🐋 ${bet.username} bet ${bet.betAmount} SOL`);
    }
});
```

### Strategy Evaluation Request
```javascript
async function evaluateStrategy(gameContext) {
    const response = await fetch('/api/strategy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tick: gameContext.currentTick,
            volatility: gameContext.volatility,
            patterns: gameContext.detectedPatterns,
            purse: gameContext.remainingPurse,
            currentLevel: gameContext.martingaleLevel
        })
    });
    
    const recommendations = await response.json();
    return recommendations.recommendations[0]; // Top recommendation
}
```

### Performance Tracking
```javascript
async function trackRecommendation(recommendation, outcome) {
    // Save initial recommendation
    await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation })
    });
    
    // Later, update with outcome
    await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recommendation: {
                ...recommendation,
                type: 'outcome',
                tickEnd: outcome.endTick,
                outcome: {
                    actualDuration: outcome.duration,
                    correctPrediction: outcome.success,
                    within40: outcome.endTick - recommendation.tickStart <= 40,
                    within70: outcome.endTick - recommendation.tickStart <= 70
                }
            }
        })
    });
}