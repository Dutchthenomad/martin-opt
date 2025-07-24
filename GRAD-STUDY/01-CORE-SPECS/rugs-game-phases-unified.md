# Rugs.fun Game Phases - Unified Specification

## Overview

The Rugs.fun game operates in a **perpetual 3-phase loop** that repeats continuously:

```
ACTIVE → RUGGED → PRESALE → [repeat]
```

This document consolidates all game phase information from multiple sources, resolving discrepancies and providing a single authoritative reference.

---

## Phase Architecture

### Core Loop Structure

The game consists of three distinct phases that cycle perpetually:

1. **ACTIVE** - Live gameplay with price movements and trading
2. **RUGGED** - Game termination with provably fair seed revelation
3. **PRESALE** - Optional pre-game buy-in at guaranteed 1.00x price

### Phase Timing Overview

- **ACTIVE Phase**: Variable duration (1-5000 ticks, 250ms per tick)
- **RUGGED Phase**: Instantaneous dual-event pattern
- **COOLDOWN Period**: 15 seconds total, split into:
  - **Pure Cooldown**: 14900ms → 10100ms (4.8 seconds)
  - **PRESALE Window**: 10000ms → 0ms (exactly 10 seconds)

---

## Phase 1: ACTIVE

The main gameplay phase where live trading occurs with real-time price movements.

### Primary Detection Logic

```javascript
// DEFINITIVE ACTIVE PHASE IDENTIFIER
if (data.active === true && data.tickCount > 0 && data.tradeCount > 0) {
  return "ACTIVE_GAMEPLAY";
}

// GAME ACTIVATION (start of active phase)
if (data.active === true && data.tickCount === 0) {
  return "GAME_ACTIVATION";
}
```

### Key Characteristics

| Field | Value | Description |
|-------|-------|-------------|
| `active` | `true` | Game is actively running |
| `rugged` | `false` | Game has not ended |
| `allowPreRoundBuys` | `false` | Presale disabled during active phase |
| `cooldownTimer` | `0` | No cooldown during active gameplay |
| `tickCount` | `0` → `5000` max | Current game tick (increments every 250ms) |
| `price` | `1.0` at tick 0, then variable | ALWAYS starts at exactly 1.00x |
| `tradeCount` | `> 0` | Total trades executed in current game |

### Trading Rules

- **Starting Price**: ALWAYS precisely 1.00x at `tickCount: 0`
- **Price Movement**: Determined by PRNG algorithm after first tick
- **Trading**: Both buy and sell orders allowed
- **Trade Limits**: 0.001 to 5.0 SOL per trade
- **Duration**: Variable based on PRNG (minimum 1 tick, maximum 5000 ticks)

### PRNG Parameters

```javascript
const GAME_PARAMS = {
  STARTING_PRICE: 1.0,
  RUG_PROB: 0.005,              // 0.5% per tick
  TICK_MS: 250,                 // 250ms per tick
  MIN_VALID_TICKS: 1,
  MAX_TICKS: 5000,
  DRIFT_MIN: -0.02,             // -2% per tick
  DRIFT_MAX: 0.03,              // +3% per tick
  BIG_MOVE_CHANCE: 0.125,       // 12.5%
  GOD_CANDLE_CHANCE: 0.00001    // 0.001% (v3+)
};
```

### Real-time Data Available

- **Price Updates**: Current multiplier via `price` field
- **Candle Data**: OHLC data (no volume) via `candles` and `currentCandle`
- **Leaderboard**: Top 10 players with real-time P&L calculations
- **Trade Feed**: Individual trades via `newTrade` events
- **Statistics**: Rolling averages, peak multiplier, player counts

---

## Phase 2: RUGGED

The game termination phase featuring a dual-event pattern for provably fair seed revelation.

### Definitive Detection Logic

```javascript
// ONLY DEFINITIVE RUG EVENT IDENTIFIER
if (data.gameHistory && Array.isArray(data.gameHistory)) {
  // gameHistory ONLY appears during rug events - NEVER any other time
  
  if (data.active === true && data.rugged === true) {
    return "RUG_EVENT_1_SEED_REVEAL";
  } else if (data.active === false && data.rugged === true) {
    return "RUG_EVENT_2_NEW_GAME_SETUP";
  }
}
```

**CRITICAL**: The presence of `gameHistory` array is the **ONLY** definitive indicator of a rug event.

### Dual Event Pattern

The rug phase consists of two distinct back-to-back `gameStateUpdate` events:

#### Event 1: Seed Reveal
*Occurs milliseconds after PRNG triggers rug*

```json
{
  "active": true,                    // Still true in first event
  "rugged": true,                    // Rug state confirmed
  "gameHistory": [/* 10 games */],   // ONLY TIME this appears
  "gameId": "20250618-7117...",     // Current game ID (that just rugged)
  "tickCount": 291,                  // Final tick count
  "price": 0.0046638832,            // Rug price (extremely low)
  "provablyFair": {
    "serverSeedHash": "9d3c862e..."  // Hash for game that just rugged
  }
}
```

#### Event 2: New Game Setup
*Immediate follow-up event*

```json
{
  "active": false,                   // Now false - cooldown begins
  "rugged": true,                    // Still shows rugged state
  "gameHistory": [/* same array */], // Same gameHistory data
  "gameId": "20250618-4370...",     // NEW game ID generated
  "cooldownTimer": 14900,            // Cooldown timer activated
  "provablyFair": {
    "serverSeedHash": "e17c39a6..."  // NEW hash for next game
  }
}
```

### gameHistory Structure

```typescript
interface GameHistory {
  id: string;                    // Completed game ID
  candles: Array<Object>;        // Complete OHLC data
  gameVersion: string;           // Game logic version (e.g., "v3")
  globalTrades: Array<any>;      // Always empty array
  peakMultiplier: number;        // Highest multiplier achieved
  provablyFair: {
    serverSeed: string;          // REVEALED seed for verification
    serverSeedHash: string;      // Original promised hash
  };
  rugged: boolean;               // Always true
}
```

**Note**: `gameHistory[0]` contains the most recently completed game (the one that just rugged).

### Provably Fair Integration

1. **Reveals** `serverSeed` for the game that just completed
2. **Generates** new `serverSeedHash` for the next game
3. **Allows** verification: `SHA256(serverSeed) === serverSeedHash`
4. **Commits** to new seed for upcoming game

### Special Rules

- **Instarug Detection**: If `tickCount <= 6`, presale players enter rugpool
- **Position Liquidation**: Active positions liquidated at rug price
- **House Edge**: House takes 0.05% of liquidated value (except instarug)

---

## Phase 3: PRESALE (within Cooldown)

The pre-game phase where players can optionally buy positions at guaranteed 1.00x starting price.

### Cooldown Structure

Total cooldown after rug: **15 seconds** (14900ms total)

#### Part 1: Pure Cooldown (14900ms → 10100ms)
- **Duration**: 4.8 seconds
- **State**: `rugged: true`, `active: false`, `allowPreRoundBuys: false`
- **Purpose**: Settlement and preparation period
- **Actions**: No trading allowed

#### Part 2: Presale Window (10000ms → 0ms)
- **Duration**: Exactly 10 seconds (always, no exceptions)
- **State**: `allowPreRoundBuys: true`
- **Purpose**: Optional pre-game buy-in
- **Actions**: Buy orders only (no selling)

### Detection Logic

```javascript
// PRESALE PHASE DETECTION
if (data.cooldownTimer > 0 && 
    data.cooldownTimer <= 10000 && 
    data.allowPreRoundBuys === true) {
  return "PRESALE_PHASE";
}

// PURE COOLDOWN DETECTION  
if (data.cooldownTimer > 10000 && 
    data.rugged === true && 
    data.active === false) {
  return "COOLDOWN_PHASE";
}
```

### Presale Characteristics

- **Participation**: Optional - players choose whether to buy
- **Price**: Fixed at exactly 1.00x (guaranteed starting price)
- **Trading**: Buy orders only, selling blocked until game activates
- **Visibility**: All presale positions visible on `leaderboard`
- **Trade Classification**: Presale buys count as regular trade events

### Game Activation

When `cooldownTimer` reaches 0:
- `active` becomes `true`
- `tickCount` starts at 0
- `price` begins at exactly 1.00x
- Trading (buy/sell) fully enabled

---

## Complete Phase Detection Implementation

```javascript
function detectGamePhase(data) {
  // RUGGED - Most specific, check first
  if (data.gameHistory && Array.isArray(data.gameHistory)) {
    if (data.active === true && data.rugged === true) {
      return "RUG_EVENT_1_SEED_REVEAL";
    }
    if (data.active === false && data.rugged === true) {
      return "RUG_EVENT_2_NEW_GAME_SETUP";
    }
  }
  
  // PRESALE
  if (data.cooldownTimer > 0 && 
      data.cooldownTimer <= 10000 && 
      data.allowPreRoundBuys === true) {
    return "PRESALE_PHASE";
  }
  
  // COOLDOWN (post-rug, pre-presale)
  if (data.cooldownTimer > 10000 && 
      data.rugged === true && 
      data.active === false) {
    return "COOLDOWN_PHASE";
  }
  
  // ACTIVE
  if (data.active === true && 
      data.tickCount > 0 && 
      data.tradeCount > 0) {
    return "ACTIVE_GAMEPLAY";
  }
  
  // GAME STARTING
  if (data.active === true && data.tickCount === 0) {
    return "GAME_ACTIVATION";
  }
  
  return "UNKNOWN_PHASE";
}
```

---

## Critical Implementation Notes

### Phase Detection Priority
1. **Check for `gameHistory` first** - Definitive rug phase indicator
2. **Evaluate `cooldownTimer`** - Determines presale vs pure cooldown
3. **Confirm boolean flags** - `active`, `rugged`, `allowPreRoundBuys`
4. **Validate tick progression** - `tickCount` for active phase confirmation

### WebSocket Event Handling
- **Primary Event**: `gameStateUpdate` (~250ms frequency during active play)
- **Trade Events**: `newTrade` (filter `coinAddress === null` for real SOL)
- **No Emissions**: Connection is READ-ONLY, do not emit any events

### Data Validation Requirements
- **Verify** `gameHistory` only appears during rug events
- **Confirm** presale window is always exactly 10 seconds
- **Validate** starting price is always 1.00x at `tickCount: 0`
- **Cross-reference** `gameId` changes between rug events
- **Filter** practice trades (where `coinAddress !== null`)

### Bot Integration Points

**Active Phase:**
- Monitor tick progression and price movements
- Execute trading strategies based on risk assessment
- Track position changes via leaderboard
- Calculate rug risk based on tick count and historical patterns

**Rugged Phase:**
- Capture both rug events for complete data
- Store revealed `serverSeed` for verification
- Extract new `gameId` and `serverSeedHash` for next game
- Reset position tracking for new game

**Presale Phase:**
- Evaluate entry opportunities at guaranteed 1.00x
- Track presale positions on leaderboard
- Prepare position sizing for game start
- Monitor countdown to game activation

---

## Summary

The Rugs.fun game operates in a perpetual 3-phase loop (ACTIVE → RUGGED → PRESALE), with the PRESALE phase embedded within a 15-second cooldown period after each rug event. The system uses a provably fair PRNG algorithm to determine game outcomes, with seeds revealed post-game for verification. All game state monitoring occurs through the `gameStateUpdate` WebSocket event, which provides comprehensive real-time data at ~250ms intervals during active gameplay.

Key distinctions:
- **3 phases**, not 4 (PRESALE is part of the cooldown period)
- **15-second total cooldown** (4.8s pure cooldown + 10s presale)
- **Dual rug events** provide seed revelation and new game setup
- **gameHistory presence** is the definitive rug indicator
- **All trades** must be filtered for `coinAddress === null` (real SOL only)

This unified specification serves as the authoritative reference for all Rugs.fun game phase implementations and trading bot development.