# 03 - WebSocket Integration: Real-Time Data Processing

## Executive Summary
This document defines the complete technical framework for real-time data ingestion, event processing, and state management for the side betting decision support system. All calculations and strategies depend on accurate, low-latency event processing.

## Critical Integration Points
- Primary events: `gameStateUpdate`, `newTrade`, `newSideBet`, `playerUpdate`
- Timing compensation required due to 271.5ms mean tick intervals (high variance)
- Event deduplication and chronological ordering essential
- Real-time adaptation to server performance characteristics

---

## WebSocket Connection Framework

### 1. Connection Architecture

#### 1.1 Socket.io Configuration
```javascript
import io from 'socket.io-client';

class RugsWebSocketManager {
  constructor(config = {}) {
    this.socket = null;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    this.messageBuffer = [];
    this.lastHeartbeat = null;
    
    this.config = {
      url: 'wss://backend.rugs.fun',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      ...config
    };
  }
  
  connect() {
    this.socket = io(this.config.url, {
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling']
    });
    
    this.setupEventListeners();
    this.setupConnectionMonitoring();
  }
  
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to Rugs.fun WebSocket');
      this.connectionState = 'connected';
      this.processBufferedMessages();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.connectionState = 'disconnected';
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.connectionState = 'connected';
    });
    
    // Primary event handlers
    this.socket.on('gameStateUpdate', (data) => this.handleGameStateUpdate(data));
    this.socket.on('newTrade', (data) => this.handleNewTrade(data));
    this.socket.on('newSideBet', (data) => this.handleNewSideBet(data));
    this.socket.on('playerUpdate', (data) => this.handlePlayerUpdate(data));
  }
}
```

#### 1.2 Connection Health Monitoring
```javascript
setupConnectionMonitoring() {
  // Heartbeat monitoring
  setInterval(() => {
    if (this.connectionState === 'connected') {
      this.socket.emit('ping', Date.now());
    }
  }, 30000);
  
  this.socket.on('pong', (timestamp) => {
    this.lastHeartbeat = Date.now();
    const latency = this.lastHeartbeat - timestamp;
    this.updateLatencyMetrics(latency);
  });
  
  // Connection quality assessment
  setInterval(() => {
    this.assessConnectionQuality();
  }, 10000);
}

updateLatencyMetrics(latency) {
  if (!this.latencyHistory) this.latencyHistory = [];
  
  this.latencyHistory.push({ latency, timestamp: Date.now() });
  
  // Keep only last 50 measurements
  if (this.latencyHistory.length > 50) {
    this.latencyHistory.shift();
  }
  
  this.currentLatency = latency;
  this.avgLatency = this.latencyHistory.reduce((sum, l) => sum + l.latency, 0) / this.latencyHistory.length;
}
```

### 2. Event Processing Pipeline

#### 2.1 Event Validation and Deduplication
```javascript
class EventProcessor {
  constructor() {
    this.processedEvents = new Set();
    this.eventBuffer = [];
    this.lastProcessedTick = -1;
  }
  
  processEvent(eventType, data, timestamp = Date.now()) {
    // Generate unique event ID
    const eventId = this.generateEventId(eventType, data, timestamp);
    
    // Check for duplicates
    if (this.processedEvents.has(eventId)) {
      console.warn('Duplicate event detected:', eventId);
      return false;
    }
    
    // Validate event structure
    if (!this.validateEvent(eventType, data)) {
      console.error('Invalid event structure:', eventType, data);
      return false;
    }
    
    // Add to processed set
    this.processedEvents.add(eventId);
    
    // Process based on event type
    return this.routeEvent(eventType, data, timestamp);
  }
  
  generateEventId(eventType, data, timestamp) {
    // Create unique ID based on event characteristics
    const keyData = this.extractKeyData(eventType, data);
    return `${eventType}-${JSON.stringify(keyData)}-${timestamp}`;
  }
  
  extractKeyData(eventType, data) {
    switch (eventType) {
      case 'gameStateUpdate':
        return {
          gameId: data.gameId,
          tickCount: data.tickCount,
          active: data.active,
          rugged: data.rugged
        };
      case 'newSideBet':
        return {
          playerId: data.playerId,
          startTick: data.startTick,
          betAmount: data.betAmount,
          timestamp: data.timestamp
        };
      case 'newTrade':
        return {
          username: data.username,
          type: data.type,
          qty: data.qty,
          timestamp: data.timestamp
        };
      default:
        return data;
    }
  }
  
  validateEvent(eventType, data) {
    const validators = {
      gameStateUpdate: this.validateGameStateUpdate,
      newSideBet: this.validateNewSideBet,
      newTrade: this.validateNewTrade,
      playerUpdate: this.validatePlayerUpdate
    };
    
    const validator = validators[eventType];
    return validator ? validator(data) : false;
  }
}
```

#### 2.2 Event Validation Schemas
```javascript
validateGameStateUpdate(data) {
  const required = ['gameId', 'tickCount', 'active', 'rugged'];
  return required.every(field => field in data) &&
         typeof data.tickCount === 'number' &&
         typeof data.active === 'boolean' &&
         typeof data.rugged === 'boolean';
}

validateNewSideBet(data) {
  const required = ['betAmount', 'startTick', 'endTick', 'playerId', 'xPayout'];
  return required.every(field => field in data) &&
         typeof data.betAmount === 'number' &&
         typeof data.startTick === 'number' &&
         typeof data.endTick === 'number' &&
         data.xPayout === 5 &&
         data.endTick === data.startTick + 40; // Verify 40-tick window
}

validateNewTrade(data) {
  const required = ['username', 'type', 'qty'];
  return required.every(field => field in data) &&
         ['buy', 'sell'].includes(data.type) &&
         typeof data.qty === 'number' &&
         data.qty >= 0.001 && data.qty <= 5.0;
}

validatePlayerUpdate(data) {
  // Player update structure is more flexible
  return typeof data === 'object' && data !== null;
}
```

### 3. Game State Management

#### 3.1 Centralized State Store
```javascript
class GameStateManager {
  constructor() {
    this.currentGame = null;
    this.gameHistory = [];
    this.activeSideBets = new Map();
    this.playerState = null;
    this.timingEngine = new AdaptiveProbabilityEngine();
    this.subscribers = new Set();
  }
  
  handleGameStateUpdate(data) {
    const previousTick = this.currentGame?.tickCount || -1;
    const currentTick = data.tickCount;
    
    // Calculate tick interval if we have previous data
    if (previousTick >= 0 && currentTick > previousTick) {
      const interval = Date.now() - (this.lastTickTimestamp || Date.now());
      this.timingEngine.updateTimingData(interval, currentTick);
      this.updateTickInterval(interval, currentTick);
    }
    
    this.lastTickTimestamp = Date.now();
    
    // Handle game transitions
    if (this.isNewGame(data)) {
      this.handleNewGame(data);
    } else if (this.isGameEnding(data)) {
      this.handleGameEnd(data);
    } else {
      this.updateCurrentGame(data);
    }
    
    // Notify subscribers
    this.notifySubscribers('gameStateUpdate', data);
  }
  
  isNewGame(data) {
    return !this.currentGame || 
           this.currentGame.gameId !== data.gameId ||
           (data.tickCount === 0 && data.active);
  }
  
  isGameEnding(data) {
    return data.rugged === true || 
           (this.currentGame && !data.active && this.currentGame.active);
  }
  
  handleNewGame(data) {
    // Archive previous game
    if (this.currentGame) {
      this.gameHistory.push({
        ...this.currentGame,
        endTime: Date.now(),
        finalTick: this.currentGame.tickCount
      });
    }
    
    // Initialize new game
    this.currentGame = {
      ...data,
      startTime: Date.now(),
      tickIntervals: [],
      sideBets: [],
      trades: []
    };
    
    // Clear active side bets (they're resolved)
    this.activeSideBets.clear();
    
    console.log('New game started:', data.gameId);
  }
  
  updateCurrentGame(data) {
    if (this.currentGame) {
      // Preserve historical data while updating current state
      const preserved = {
        tickIntervals: this.currentGame.tickIntervals,
        sideBets: this.currentGame.sideBets,
        trades: this.currentGame.trades,
        startTime: this.currentGame.startTime
      };
      
      this.currentGame = { ...data, ...preserved };
    }
  }
}
```

#### 3.2 Side Bet Tracking
```javascript
handleNewSideBet(data) {
  const sideBet = {
    ...data,
    placedAt: Date.now(),
    currentTick: this.currentGame?.tickCount || data.startTick,
    expectedEndTick: data.endTick,
    status: 'active',
    probability: this.timingEngine.getAdaptedProbability(data.startTick)
  };
  
  // Track in active side bets
  this.activeSideBets.set(data.playerId, sideBet);
  
  // Add to current game history
  if (this.currentGame) {
    this.currentGame.sideBets.push(sideBet);
  }
  
  // Update side bet analytics
  this.updateSideBetAnalytics(sideBet);
  
  this.notifySubscribers('newSideBet', sideBet);
}

updateSideBetAnalytics(sideBet) {
  // Track side bet patterns for analysis
  if (!this.sideBetAnalytics) {
    this.sideBetAnalytics = {
      totalBets: 0,
      totalVolume: 0,
      averageBetSize: 0,
      tickDistribution: new Map(),
      successRate: 0
    };
  }
  
  this.sideBetAnalytics.totalBets++;
  this.sideBetAnalytics.totalVolume += sideBet.betAmount;
  this.sideBetAnalytics.averageBetSize = this.sideBetAnalytics.totalVolume / this.sideBetAnalytics.totalBets;
  
  // Track tick distribution
  const tick = sideBet.startTick;
  const tickBucket = Math.floor(tick / 50) * 50; // 50-tick buckets
  this.sideBetAnalytics.tickDistribution.set(
    tickBucket,
    (this.sideBetAnalytics.tickDistribution.get(tickBucket) || 0) + 1
  );
}
```

### 4. Timing Compensation System

#### 4.1 Adaptive Tick Tracking
```javascript
class TickTimingManager {
  constructor() {
    this.tickHistory = [];
    this.intervalHistory = [];
    this.currentAverageInterval = 558.6; // Start with observed average
    this.reliability = 1.0;
  }
  
  updateTickInterval(interval, tickNumber) {
    const now = Date.now();
    
    this.tickHistory.push({
      tick: tickNumber,
      interval: interval,
      timestamp: now,
      deviation: Math.abs(interval - 250) // Deviation from theoretical
    });
    
    this.intervalHistory.push(interval);
    
    // Maintain rolling windows
    if (this.tickHistory.length > 100) {
      this.tickHistory.shift();
      this.intervalHistory.shift();
    }
    
    this.recalculateMetrics();
  }
  
  recalculateMetrics() {
    if (this.intervalHistory.length === 0) return;
    
    // Calculate current average
    this.currentAverageInterval = this.intervalHistory.reduce((sum, i) => sum + i, 0) / this.intervalHistory.length;
    
    // Calculate variance and reliability
    const variance = this.calculateVariance(this.intervalHistory);
    const coefficientOfVariation = Math.sqrt(variance) / this.currentAverageInterval;
    
    // Reliability decreases with higher variance
    this.reliability = Math.max(0.1, 1 - coefficientOfVariation);
    
    // Detect anomalous intervals
    this.detectAnomalies();
  }
  
  detectAnomalies() {
    const recent = this.intervalHistory.slice(-10);
    const average = recent.reduce((sum, i) => sum + i, 0) / recent.length;
    
    // Flag intervals that are more than 3 standard deviations from mean
    const standardDev = Math.sqrt(this.calculateVariance(recent));
    const threshold = 3 * standardDev;
    
    const anomalies = recent.filter(interval => Math.abs(interval - average) > threshold);
    
    if (anomalies.length > 0) {
      console.warn(`Detected ${anomalies.length} anomalous tick intervals:`, anomalies);
      this.handleTimingAnomalies(anomalies);
    }
  }
  
  handleTimingAnomalies(anomalies) {
    // Adjust reliability and alert system
    this.reliability *= 0.9; // Reduce reliability
    
    // If too many anomalies, suggest user awareness
    if (anomalies.length > 5) {
      this.notifyHighLatencyCondition();
    }
  }
  
  getTimingPrediction(ticksAhead = 40) {
    const predictedDuration = this.currentAverageInterval * ticksAhead;
    const uncertainty = Math.sqrt(this.calculateVariance(this.intervalHistory)) * ticksAhead;
    
    return {
      expectedDuration: predictedDuration,
      uncertainty: uncertainty,
      reliability: this.reliability,
      range: {
        min: predictedDuration - uncertainty,
        max: predictedDuration + uncertainty
      }
    };
  }
}
```

#### 4.2 Real-Time Probability Updates
```javascript
class RealTimeProbabilityUpdater {
  constructor(gameStateManager, timingManager) {
    this.gameState = gameStateManager;
    this.timing = timingManager;
    this.currentProbabilities = new Map();
    this.probabilityTrends = [];
  }
  
  updateProbabilities(currentTick) {
    const timingPrediction = this.timing.getTimingPrediction(40);
    const baseProbability = getBaseProbability(currentTick);
    
    // Adjust for timing variance
    const timeAdjustment = this.calculateTimeAdjustment(timingPrediction);
    const reliabilityPenalty = (1 - this.timing.reliability) * 0.1;
    
    const adjustedProbability = Math.min(0.98, 
      Math.max(0.02, baseProbability + timeAdjustment - reliabilityPenalty)
    );
    
    // Calculate expected value
    const ev = calculateRiskAdjustedEV(adjustedProbability, 0.001, this.timing.reliability);
    
    // Determine zone
    const zone = getZoneForProbability(adjustedProbability);
    
    const probabilityData = {
      tick: currentTick,
      baseProbability: baseProbability,
      adjustedProbability: adjustedProbability,
      timeAdjustment: timeAdjustment,
      reliabilityPenalty: reliabilityPenalty,
      expectedValue: ev.adjustedEV,
      zone: zone.name,
      reliability: this.timing.reliability,
      timing: timingPrediction,
      timestamp: Date.now()
    };
    
    this.currentProbabilities.set(currentTick, probabilityData);
    this.updateTrends(probabilityData);
    
    return probabilityData;
  }
  
  calculateTimeAdjustment(timingPrediction) {
    // Longer expected duration = higher chance of rug within window
    const theoreticalWindow = 40 * 250; // 10 seconds
    const actualWindow = timingPrediction.expectedDuration;
    
    const ratio = actualWindow / theoreticalWindow;
    
    // Cap adjustment at 50% increase
    return Math.min(0.5, (ratio - 1) * 0.3);
  }
  
  updateTrends(probabilityData) {
    this.probabilityTrends.push(probabilityData);
    
    // Keep only recent history
    if (this.probabilityTrends.length > 50) {
      this.probabilityTrends.shift();
    }
    
    // Calculate trend metrics
    if (this.probabilityTrends.length >= 10) {
      this.calculateTrendMetrics();
    }
  }
  
  getTrendAnalysis() {
    if (this.probabilityTrends.length < 10) {
      return { status: 'insufficient_data' };
    }
    
    const recent = this.probabilityTrends.slice(-10);
    const start = recent[0].adjustedProbability;
    const end = recent[recent.length - 1].adjustedProbability;
    const change = end - start;
    const rate = change / recent.length;
    
    return {
      status: 'available',
      change: change,
      rate: rate,
      direction: change > 0.05 ? 'increasing' : change < -0.05 ? 'decreasing' : 'stable',
      acceleration: this.calculateAcceleration(recent),
      reliability: this.timing.reliability
    };
  }
}
```

### 5. Event Subscription System

#### 5.1 Publisher-Subscriber Pattern
```javascript
class EventSubscriptionManager {
  constructor() {
    this.subscribers = new Map();
    this.eventQueue = [];
    this.processing = false;
  }
  
  subscribe(eventType, callback, priority = 0) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    this.subscribers.get(eventType).push({
      callback,
      priority,
      id: Math.random().toString(36).substr(2, 9)
    });
    
    // Sort by priority
    this.subscribers.get(eventType).sort((a, b) => b.priority - a.priority);
  }
  
  publish(eventType, data) {
    if (this.subscribers.has(eventType)) {
      const callbacks = this.subscribers.get(eventType);
      
      callbacks.forEach(({ callback }) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} subscriber:`, error);
        }
      });
    }
  }
  
  unsubscribe(eventType, callbackId) {
    if (this.subscribers.has(eventType)) {
      const callbacks = this.subscribers.get(eventType);
      const index = callbacks.findIndex(sub => sub.id === callbackId);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}
```

### 6. Error Handling and Recovery

#### 6.1 Connection Recovery System
```javascript
class ConnectionRecoveryManager {
  constructor(websocketManager) {
    this.wsManager = websocketManager;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.backoffBase = 1000;
    this.missedEvents = [];
  }
  
  handleConnectionLoss() {
    console.warn('Connection lost, initiating recovery...');
    this.reconnectAttempts = 0;
    this.attemptReconnection();
  }
  
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyConnectionFailure();
      return;
    }
    
    const delay = this.backoffBase * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
      this.wsManager.connect();
    }, delay);
  }
  
  handleReconnectionSuccess() {
    console.log('Reconnection successful');
    this.reconnectAttempts = 0;
    this.requestMissedEvents();
  }
  
  requestMissedEvents() {
    // In a production system, we might request missed events from the server
    // For now, we'll just clear the missed events and start fresh
    console.log('Clearing missed events buffer and resuming normal operation');
    this.missedEvents = [];
  }
}
```

#### 6.2 Data Integrity Validation
```javascript
class DataIntegrityValidator {
  constructor() {
    this.lastValidGameState = null;
    this.suspiciousEvents = [];
  }
  
  validateGameStateConsistency(newState) {
    if (!this.lastValidGameState) {
      this.lastValidGameState = newState;
      return { valid: true };
    }
    
    const issues = [];
    
    // Check tick progression
    if (newState.active && newState.tickCount < this.lastValidGameState.tickCount) {
      issues.push('Tick regression detected');
    }
    
    // Check game ID consistency
    if (newState.gameId !== this.lastValidGameState.gameId && 
        newState.tickCount > 0 && !newState.rugged) {
      issues.push('Game ID changed without game ending');
    }
    
    // Check logical state transitions
    if (this.lastValidGameState.rugged && newState.active && 
        newState.gameId === this.lastValidGameState.gameId) {
      issues.push('Game became active after being rugged');
    }
    
    if (issues.length === 0) {
      this.lastValidGameState = newState;
      return { valid: true };
    } else {
      this.suspiciousEvents.push({
        timestamp: Date.now(),
        issues: issues,
        state: newState
      });
      
      return { 
        valid: false, 
        issues: issues,
        action: 'use_previous_state'
      };
    }
  }
}
```

### 7. Performance Monitoring

#### 7.1 WebSocket Performance Metrics
```javascript
class WebSocketPerformanceMonitor {
  constructor() {
    this.metrics = {
      messagesReceived: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      connectionUptime: 0,
      reconnections: 0,
      errors: 0
    };
    
    this.startTime = Date.now();
    this.lastMetricsUpdate = Date.now();
    this.messageTimestamps = [];
  }
  
  recordMessage(eventType, processingTime) {
    this.metrics.messagesReceived++;
    this.messageTimestamps.push(Date.now());
    
    // Clean old timestamps (keep last minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.messageTimestamps = this.messageTimestamps.filter(ts => ts > oneMinuteAgo);
    
    // Update messages per second
    this.metrics.messagesPerSecond = this.messageTimestamps.length / 60;
    
    // Update processing time metrics
    this.updateProcessingMetrics(processingTime);
  }
  
  updateProcessingMetrics(processingTime) {
    if (!this.processingTimes) this.processingTimes = [];
    
    this.processingTimes.push(processingTime);
    
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length;
  }
  
  getPerformanceReport() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      messageBuffer: this.messageTimestamps.length,
      isHealthy: this.assessHealth()
    };
  }
  
  assessHealth() {
    return this.metrics.messagesPerSecond > 0 &&
           this.metrics.averageProcessingTime < 100 &&
           this.metrics.errors < 10;
  }
}
```

---

## Implementation Checklist

### Core WebSocket Integration
- [ ] Socket.io connection management with reconnection
- [ ] Event validation and deduplication system
- [ ] Centralized game state management
- [ ] Real-time tick timing analysis
- [ ] Side bet tracking and analytics

### Timing Compensation
- [ ] Adaptive tick interval tracking
- [ ] Timing anomaly detection
- [ ] Probability adjustment for timing variance
- [ ] Real-time window duration prediction

### Performance & Reliability
- [ ] Connection health monitoring
- [ ] Data integrity validation
- [ ] Error recovery mechanisms
- [ ] Performance metrics collection

### Event Processing
- [ ] Primary event handlers (gameStateUpdate, newSideBet, etc.)
- [ ] Event subscription system
- [ ] Chronological event ordering
- [ ] Buffer management for offline periods

---

*Next: [04-strategy-guide.md](./04-strategy-guide.md) - Complete betting strategies from basic to advanced*