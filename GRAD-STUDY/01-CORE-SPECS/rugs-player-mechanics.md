# WebSocket Event: playerUpdate

## Overview

The `playerUpdate` event provides **player-specific status updates** for the authenticated user. This is one of the **4 primary events** that must be tracked for complete game monitoring.

### Event Classification

**✅ PRIMARY EVENTS** (Must Track):
- `gameStateUpdate` - Main game state
- `newTrade` - Individual trade notifications  
- **`playerUpdate`** - **This document** - Player-specific status

**❌ IGNORED EVENTS** (Do Not Track):
- `tournamentUpdate`, `crateInfo`, `newChatMessage`, `newSideBet`, `goldenHourUpdate`, `maintenanceUpdate`, `leaderboardData`

## Event Characteristics

- **Direction:** Server → Client
- **Frequency:** Triggered by player state changes (low frequency)
- **Purpose:** Personal balance, position, experience, and authentication updates
- **Scope:** Authenticated player only (not broadcast to all users)

## Event Structure

```json
{
  "type": "playerUpdate",
  "data": {
    // Player-specific fields (see below)
  }
}
```

## Data Object Fields

Based on verified user-provided example:

### 💰 Financial Status

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `cash` | Number | `0` | Player's cash balance (SOL) |
| `bonusBalance` | Number | `0` | Player's bonus balance |
| `positionQty` | Number | `0` | Current position quantity |
| `avgCost` | Number | `0` | Average entry cost of position |

### 🎮 Game State

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `selectedCoin` | String/Null | `null` | Currently selected trading asset |
| `authenticated` | Boolean | `false` | Session authentication status |

### 📊 Progression System

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `levelInfo` | Object | `{...}` | Player level and XP data |
| `crateKeys` | Object | `{...}` | Available reward crate keys |

## Nested Object Structures

### levelInfo Object

Player progression details (not needed for core trading logic):

```typescript
interface LevelInfo {
  level: number;           // Current player level
  xp: number;              // Current experience points
  xpForNextLevel: number;  // XP required for next level
}
```

**Example:**
```json
{
  "level": 0,
  "xp": 0, 
  "xpForNextLevel": 100
}
```

### crateKeys Object

Reward crate key inventory (not needed for core trading logic):

```typescript
interface CrateKeys {
  tier0: number;    // Iron crate keys
  tier1?: number;   // Higher tier keys (if present)
  tier2?: number;   // Even higher tier keys
  // ... potentially up to tier9, referral
}
```

**Example:**
```json
{
  "tier0": 0
}
```

## Complete Example Event

```json
{
  "type": "playerUpdate",
  "data": {
    "cash": 0,
    "bonusBalance": 0,
    "positionQty": 0,
    "avgCost": 0,
    "selectedCoin": null,
    "levelInfo": {
      "level": 0,
      "xp": 0,
      "xpForNextLevel": 100
    },
    "crateKeys": {
      "tier0": 0
    },
    "authenticated": false
  }
}
```

## Bot Integration Guidelines

### Critical Monitoring Points

#### 🚨 Authentication Status
```javascript
if (data.authenticated === false) {
  // CRITICAL: Re-authentication required
  // Bot should pause trading and alert user
}
```

#### 💰 Position Tracking
```javascript
// Monitor position changes
if (data.positionQty !== previousPositionQty) {
  // Update internal position tracking
  updateBotPosition(data.positionQty, data.avgCost);
}
```

#### 💳 Balance Monitoring
```javascript
// Track balance changes
if (data.cash !== previousCash) {
  // Update available trading capital
  updateTradingBalance(data.cash);
}
```

### Event Handling Strategy

1. **Store Previous State:** Keep track of previous values for change detection
2. **Authentication Alerts:** Immediately handle authentication state changes
3. **Position Validation:** Cross-reference with `gameStateUpdate` leaderboard data
4. **Balance Management:** Update available capital for position sizing

### Data Relationships

#### Validation with Other Events

**Cross-Reference with gameStateUpdate:**
- `playerUpdate.positionQty` should match `gameStateUpdate.leaderboard[playerIndex].positionQty`
- `playerUpdate.avgCost` should match `gameStateUpdate.leaderboard[playerIndex].avgCost`

**Complementary to newTrade:**
- Position and balance changes should align with trade executions
- Use for trade confirmation and position reconciliation

## Implementation Checklist

### Core Requirements

- [ ] **Authentication Monitoring:** Implement auth state change handlers
- [ ] **Position Tracking:** Maintain real-time position state
- [ ] **Balance Management:** Track available trading capital
- [ ] **State Validation:** Cross-reference with other events
- [ ] **Error Recovery:** Handle disconnection/re-authentication flows

### Advanced Features

- [ ] **Position Reconciliation:** Compare with leaderboard data
- [ ] **Balance Alerts:** Notify on significant balance changes
- [ ] **Performance Tracking:** Monitor XP and level progression
- [ ] **Crate Management:** Track reward accumulation

## Notes & Considerations

### Data Precision
- Financial fields (`cash`, `bonusBalance`, `avgCost`) represent SOL amounts
- Position quantities may be fractional
- All monetary values should be handled with appropriate precision

### State Synchronization
- This event provides player-specific updates not visible to other users
- Critical for maintaining accurate internal bot state
- Should be used alongside `gameStateUpdate` for complete picture

### Authentication Flow
- `authenticated: false` requires immediate attention
- Bot should implement automatic re-authentication if possible
- Consider pausing all trading activities until authentication restored

---

*This event is essential for maintaining accurate player state and ensuring proper bot operation within the authenticated session.*