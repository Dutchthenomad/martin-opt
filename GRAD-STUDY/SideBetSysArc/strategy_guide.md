# 04 - Strategy Guide: From Basic to Advanced Betting Systems

## Executive Summary
This document provides comprehensive betting strategies for the Rugs.fun side betting system, ranging from conservative approaches to mathematical certainty zones. All strategies account for the critical timing variance discovery and adaptive probability models.

## Strategic Foundation
- **Base EV Formula**: `EV = (P × 4 × Bet) - ((1-P) × Bet) = Bet × (5P - 1)`
- **Breakeven Point**: 16.67% probability (1/6)
- **Timing Reality**: 271.5ms mean tick (251ms median) provides stable baseline
- **Risk Management**: Bankroll protection paramount due to exponential loss potential

---

## Strategy Classification System

### 1. Strategy Tier Overview

| Tier | Name | Risk Level | Bankroll Req. | Success Rate | Complexity |
|------|------|-----------|---------------|--------------|------------|
| **Tier 1** | Conservative | Low | 0.1-0.5 SOL | 65-75% | Beginner |
| **Tier 2** | Moderate | Medium | 0.5-2.0 SOL | 55-70% | Intermediate |
| **Tier 3** | Aggressive | High | 2.0-10.0 SOL | 45-65% | Advanced |
| **Tier 4** | Mathematical | Very High | 10.0+ SOL | 85-95% | Expert |

### 2. Core Strategy Principles

#### 2.1 Timing-Adjusted Probability Framework
```javascript
class TimingAdjustedStrategy {
  constructor(baseStrategy, timingEngine) {
    this.baseStrategy = baseStrategy;
    this.timing = timingEngine;
    this.adaptationHistory = [];
  }
  
  getAdjustedProbability(tick) {
    const baseProb = getBaseProbability(tick);
    const timingFactor = this.timing.getCurrentTickRate() / 250; // Actual vs theoretical
    const reliabilityPenalty = (1 - this.timing.reliability) * 0.05;
    
    // Longer ticks = more time for rug = higher probability
    const timeBonus = (timingFactor - 1) * 0.2;
    
    return Math.max(0.05, Math.min(0.98, baseProb + timeBonus - reliabilityPenalty));
  }
  
  shouldEnterPosition(tick, bankroll, currentLosses) {
    const probability = this.getAdjustedProbability(tick);
    const zone = getZoneForProbability(probability);
    
    return this.baseStrategy.evaluate({
      tick,
      probability,
      zone,
      bankroll,
      currentLosses,
      reliability: this.timing.reliability
    });
  }
}
```

---

## Tier 1: Conservative Strategies

### 1.1 Safe Zone Only Strategy

**Philosophy**: Only bet in mathematical certainty zones (90%+ probability)

```javascript
class SafeZoneStrategy {
  constructor() {
    this.minProbability = 0.90;
    this.maxBetSize = 0.001; // Fixed minimum bet
    this.maxConsecutiveLosses = 3;
    this.consecutiveLosses = 0;
  }
  
  evaluate({ tick, probability, bankroll }) {
    // Only bet in extreme certainty zones
    if (probability < this.minProbability) {
      return { action: 'wait', reason: 'probability_too_low' };
    }
    
    // Stop after consecutive losses (even in safe zones)
    if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
      return { action: 'stop', reason: 'consecutive_loss_limit' };
    }
    
    // Check bankroll safety
    if (bankroll < this.maxBetSize * 10) {
      return { action: 'stop', reason: 'insufficient_bankroll' };
    }
    
    return {
      action: 'bet',
      amount: this.maxBetSize,
      confidence: 'high',
      expectedValue: calculateExpectedValue(probability, this.maxBetSize).expectedValue
    };
  }
  
  onOutcome(won) {
    if (won) {
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
    }
  }
}
```

**Target Zones**:
- Tick 450+: 95%+ probability
- Minimum bankroll: 0.1 SOL
- Expected success rate: 85-95%

### 1.2 Conservative Progression Strategy

**Philosophy**: Small, consistent progression with strict limits

```javascript
class ConservativeProgression {
  constructor() {
    this.baseBet = 0.001;
    this.maxBet = 0.008; // 8x base bet maximum
    this.minProbability = 0.70;
    this.sequence = [0.001, 0.001, 0.002, 0.003, 0.005, 0.008]; // Fibonacci-like
    this.currentStep = 0;
    this.maxSteps = 6;
  }
  
  evaluate({ tick, probability, bankroll, currentLosses }) {
    // Require good probability
    if (probability < this.minProbability) {
      return { action: 'wait', reason: 'probability_below_threshold' };
    }
    
    // Check if we've reached maximum progression
    if (this.currentStep >= this.maxSteps) {
      return { action: 'stop', reason: 'max_progression_reached' };
    }
    
    const betAmount = this.sequence[this.currentStep];
    
    // Bankroll check
    if (bankroll < betAmount * 5) { // Need 5x buffer
      return { action: 'stop', reason: 'insufficient_buffer' };
    }
    
    const ev = calculateExpectedValue(probability, betAmount);
    
    return {
      action: 'bet',
      amount: betAmount,
      step: this.currentStep + 1,
      confidence: probability > 0.80 ? 'high' : 'medium',
      expectedValue: ev.expectedValue
    };
  }
  
  onOutcome(won) {
    if (won) {
      this.currentStep = 0; // Reset progression on win
    } else {
      this.currentStep = Math.min(this.currentStep + 1, this.maxSteps - 1);
    }
  }
}
```

---

## Tier 2: Moderate Strategies

### 2.1 Zone-Based Dynamic Strategy

**Philosophy**: Adjust bet size based on probability zones

```javascript
class ZoneBasedStrategy {
  constructor() {
    this.zoneBetting = {
      OPPORTUNITY: { multiplier: 1.0, minProb: 0.25 },
      STRONG: { multiplier: 2.0, minProb: 0.50 },
      EXCELLENT: { multiplier: 3.0, minProb: 0.75 },
      CERTAINTY: { multiplier: 5.0, minProb: 0.90 }
    };
    this.baseBet = 0.001;
    this.maxTotalRisk = 0.15; // 15% of initial bankroll
    this.currentRisk = 0;
  }
  
  evaluate({ tick, probability, zone, bankroll, initialBankroll }) {
    const zoneConfig = this.zoneBetting[zone.name];
    
    if (!zoneConfig || probability < zoneConfig.minProb) {
      return { action: 'wait', reason: 'zone_not_qualified' };
    }
    
    const betAmount = this.baseBet * zoneConfig.multiplier;
    const projectedRisk = this.currentRisk + betAmount;
    const maxAllowedRisk = initialBankroll * this.maxTotalRisk;
    
    if (projectedRisk > maxAllowedRisk) {
      return { action: 'stop', reason: 'max_risk_exceeded' };
    }
    
    const ev = calculateExpectedValue(probability, betAmount);
    
    return {
      action: 'bet',
      amount: betAmount,
      zone: zone.name,
      multiplier: zoneConfig.multiplier,
      projectedRisk: projectedRisk,
      expectedValue: ev.expectedValue
    };
  }
  
  onOutcome(won, betAmount) {
    if (won) {
      this.currentRisk = Math.max(0, this.currentRisk - betAmount * 3); // Reduce risk by winnings
    } else {
      this.currentRisk += betAmount;
    }
  }
}
```

### 2.2 Adaptive Timing Strategy

**Philosophy**: Adjust strategy based on server performance

```javascript
class AdaptiveTimingStrategy {
  constructor() {
    this.reliabilityThresholds = {
      HIGH: 0.8,    // High reliability conditions
      MEDIUM: 0.6,  // Medium reliability conditions
      LOW: 0.4      // Low reliability conditions
    };
    this.strategyModes = new Map();
    this.initializeStrategyModes();
  }
  
  initializeStrategyModes() {
    this.strategyModes.set('HIGH', {
      minProbability: 0.60,
      maxBetSize: 0.005,
      aggressiveness: 1.0
    });
    
    this.strategyModes.set('MEDIUM', {
      minProbability: 0.70,
      maxBetSize: 0.003,
      aggressiveness: 0.7
    });
    
    this.strategyModes.set('LOW', {
      minProbability: 0.85,
      maxBetSize: 0.001,
      aggressiveness: 0.4
    });
  }
  
  evaluate({ tick, probability, reliability, bankroll }) {
    const mode = this.getReliabilityMode(reliability);
    const config = this.strategyModes.get(mode);
    
    if (probability < config.minProbability) {
      return { 
        action: 'wait', 
        reason: 'probability_below_threshold',
        mode: mode,
        required: config.minProbability,
        current: probability
      };
    }
    
    const baseBetSize = Math.min(config.maxBetSize, bankroll * 0.02);
    const adjustedBetSize = baseBetSize * config.aggressiveness;
    
    const ev = calculateExpectedValue(probability, adjustedBetSize);
    
    return {
      action: 'bet',
      amount: adjustedBetSize,
      mode: mode,
      reliability: reliability,
      expectedValue: ev.expectedValue,
      confidence: this.calculateConfidence(probability, reliability)
    };
  }
  
  getReliabilityMode(reliability) {
    if (reliability >= this.reliabilityThresholds.HIGH) return 'HIGH';
    if (reliability >= this.reliabilityThresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }
  
  calculateConfidence(probability, reliability) {
    const baseConfidence = probability;
    const reliabilityBonus = (reliability - 0.5) * 0.2; // Max 20% bonus
    return Math.max(0, Math.min(1, baseConfidence + reliabilityBonus));
  }
}
```

---

## Tier 3: Aggressive Strategies

### 3.1 Controlled Martingale Strategy

**Philosophy**: Traditional doubling with strict risk controls

```javascript
class ControlledMartingale {
  constructor() {
    this.sequence = [0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064];
    this.currentStep = 0;
    this.maxSteps = 7;
    this.minProbability = 0.40;
    this.maxTotalRisk = 0.127; // Sum of sequence
    this.emergencyStop = false;
  }
  
  evaluate({ tick, probability, bankroll, totalLosses }) {
    if (this.emergencyStop) {
      return { action: 'stop', reason: 'emergency_stop_activated' };
    }
    
    if (probability < this.minProbability) {
      return { action: 'wait', reason: 'probability_too_low' };
    }
    
    if (this.currentStep >= this.maxSteps) {
      return { action: 'stop', reason: 'max_steps_reached' };
    }
    
    const betAmount = this.sequence[this.currentStep];
    
    // Calculate remaining risk in sequence
    const remainingRisk = this.sequence
      .slice(this.currentStep)
      .reduce((sum, bet) => sum + bet, 0);
    
    if (bankroll < remainingRisk * 1.5) { // Need 1.5x buffer
      return { action: 'stop', reason: 'insufficient_bankroll_for_sequence' };
    }
    
    // Emergency stop if we're deep in sequence with low probability
    if (this.currentStep >= 4 && probability < 0.60) {
      this.emergencyStop = true;
      return { action: 'stop', reason: 'emergency_stop_deep_sequence_low_prob' };
    }
    
    const ev = calculateExpectedValue(probability, betAmount);
    
    return {
      action: 'bet',
      amount: betAmount,
      step: this.currentStep + 1,
      remainingSteps: this.maxSteps - this.currentStep,
      totalRiskIfContinue: remainingRisk,
      expectedValue: ev.expectedValue
    };
  }
  
  onOutcome(won, betAmount) {
    if (won) {
      this.currentStep = 0; // Reset on win
      this.emergencyStop = false;
    } else {
      this.currentStep++;
    }
  }
  
  reset() {
    this.currentStep = 0;
    this.emergencyStop = false;
  }
}
```

### 3.2 Volatility Arbitrage Strategy

**Philosophy**: Exploit timing volatility for profit

```javascript
class VolatilityArbitrageStrategy {
  constructor() {
    this.volatilityThresholds = {
      LOW: 0.2,    // Low timing variance
      HIGH: 0.8    // High timing variance
    };
    this.baseBet = 0.002;
    this.maxMultiplier = 10;
  }
  
  evaluate({ tick, probability, reliability, timingVariance, bankroll }) {
    const volatilityLevel = this.classifyVolatility(timingVariance);
    
    // Different strategies for different volatility conditions
    switch (volatilityLevel) {
      case 'LOW':
        return this.lowVolatilityStrategy({ tick, probability, reliability, bankroll });
      case 'HIGH':
        return this.highVolatilityStrategy({ tick, probability, reliability, bankroll });
      default:
        return this.mediumVolatilityStrategy({ tick, probability, reliability, bankroll });
    }
  }
  
  lowVolatilityStrategy({ tick, probability, reliability, bankroll }) {
    // Stable conditions - use standard probability thresholds
    if (probability < 0.55) {
      return { action: 'wait', reason: 'stable_conditions_require_higher_prob' };
    }
    
    const betSize = this.baseBet * Math.min(3, probability * 5);
    
    return {
      action: 'bet',
      amount: betSize,
      strategy: 'low_volatility',
      expectedValue: calculateExpectedValue(probability, betSize).expectedValue
    };
  }
  
  highVolatilityStrategy({ tick, probability, reliability, bankroll }) {
    // Volatile conditions - exploit extended time windows
    if (probability < 0.35) {
      return { action: 'wait', reason: 'volatile_conditions_require_minimum_prob' };
    }
    
    // Higher bets in volatile conditions due to extended time windows
    const volatilityBonus = 1.5;
    const betSize = this.baseBet * volatilityBonus * Math.min(2, probability * 3);
    
    return {
      action: 'bet',
      amount: betSize,
      strategy: 'high_volatility',
      volatilityBonus: volatilityBonus,
      expectedValue: calculateExpectedValue(probability, betSize).expectedValue
    };
  }
  
  classifyVolatility(variance) {
    if (variance < this.volatilityThresholds.LOW) return 'LOW';
    if (variance > this.volatilityThresholds.HIGH) return 'HIGH';
    return 'MEDIUM';
  }
}
```

---

## Tier 4: Mathematical Certainty Strategies

### 4.1 Bankroll-Based Certainty Strategy

**Philosophy**: Calculate exact bankroll needed for mathematical certainty

```javascript
class MathematicalCertaintyStrategy {
  constructor(initialBankroll) {
    this.initialBankroll = initialBankroll;
    this.certaintyThreshold = 0.85; // 85% minimum probability
    this.maxSequenceLength = this.calculateMaxSequence();
    this.guaranteedWinZones = this.calculateGuaranteedZones();
  }
  
  calculateMaxSequence() {
    // Calculate how many consecutive losses we can sustain
    let totalRisk = 0;
    let bet = 0.001;
    let steps = 0;
    
    while (totalRisk + bet <= this.initialBankroll * 0.8) { // Use 80% of bankroll
      totalRisk += bet;
      bet *= 2;
      steps++;
    }
    
    return steps;
  }
  
  calculateGuaranteedZones() {
    // Calculate tick ranges where we have mathematical certainty
    const zones = [];
    
    for (let requiredSteps = 1; requiredSteps <= this.maxSequenceLength; requiredSteps++) {
      const totalRisk = this.calculateSequenceRisk(requiredSteps);
      const successProbability = this.calculateSequenceSuccessProbability(requiredSteps);
      
      if (successProbability >= 0.99) { // 99% success rate
        zones.push({
          requiredSteps: requiredSteps,
          totalRisk: totalRisk,
          successProbability: successProbability,
          minTick: this.getMinTickForSteps(requiredSteps)
        });
      }
    }
    
    return zones;
  }
  
  calculateSequenceRisk(steps) {
    let risk = 0;
    let bet = 0.001;
    for (let i = 0; i < steps; i++) {
      risk += bet;
      bet *= 2;
    }
    return risk;
  }
  
  calculateSequenceSuccessProbability(steps) {
    // Probability of winning at least once in the sequence
    const avgProbability = 0.85; // Conservative estimate
    const failureProbability = Math.pow(1 - avgProbability, steps);
    return 1 - failureProbability;
  }
  
  evaluate({ tick, probability, bankroll }) {
    // Find the appropriate guaranteed zone
    const applicableZone = this.guaranteedWinZones.find(zone => 
      tick >= zone.minTick && bankroll >= zone.totalRisk * 1.2
    );
    
    if (!applicableZone) {
      return { 
        action: 'wait', 
        reason: 'no_guaranteed_zone_available',
        nextZone: this.getNextAvailableZone(tick, bankroll)
      };
    }
    
    return {
      action: 'bet',
      amount: 0.001, // Always start with base bet
      strategy: 'mathematical_certainty',
      guaranteedZone: applicableZone,
      maxSteps: applicableZone.requiredSteps,
      successProbability: applicableZone.successProbability,
      totalRiskRequired: applicableZone.totalRisk
    };
  }
  
  getNextAvailableZone(currentTick, bankroll) {
    return this.guaranteedWinZones.find(zone => 
      currentTick < zone.minTick && bankroll >= zone.totalRisk * 1.2
    );
  }
}
```

### 4.2 Professional Bankroll Management

**Philosophy**: Scientific bankroll allocation for sustained profitability

```javascript
class ProfessionalBankrollManagement {
  constructor(totalBankroll) {
    this.totalBankroll = totalBankroll;
    this.sessionAllocation = this.calculateSessionAllocation();
    this.riskParameters = this.calculateRiskParameters();
    this.profitTargets = this.calculateProfitTargets();
  }
  
  calculateSessionAllocation() {
    return {
      conservative: this.totalBankroll * 0.05,  // 5% per session
      moderate: this.totalBankroll * 0.10,      // 10% per session
      aggressive: this.totalBankroll * 0.20,    // 20% per session
      maximum: this.totalBankroll * 0.30        // 30% absolute maximum
    };
  }
  
  calculateRiskParameters() {
    return {
      maxDrawdown: 0.25,           // 25% maximum drawdown
      stopLoss: 0.15,              // 15% stop loss per session
      profitProtection: 0.10,      // Protect 10% of profits
      emergencyReserve: 0.20       // 20% emergency reserve
    };
  }
  
  calculateProfitTargets() {
    return {
      conservative: 0.02,          // 2% profit target
      moderate: 0.05,              // 5% profit target
      aggressive: 0.10,            // 10% profit target
      maximum: 0.15                // 15% maximum target
    };
  }
  
  getSessionParameters(riskLevel = 'moderate') {
    const allocation = this.sessionAllocation[riskLevel];
    const target = this.profitTargets[riskLevel];
    
    return {
      sessionBankroll: allocation,
      profitTarget: allocation * target,
      stopLoss: allocation * this.riskParameters.stopLoss,
      maxBetSize: allocation * 0.05, // 5% of session bankroll per bet
      sequenceLimit: this.calculateSequenceLimit(allocation)
    };
  }
  
  calculateSequenceLimit(sessionBankroll) {
    // Calculate maximum Martingale sequence possible
    let totalRisk = 0;
    let bet = 0.001;
    let steps = 0;
    
    while (totalRisk + bet <= sessionBankroll * 0.8) {
      totalRisk += bet;
      bet *= 2;
      steps++;
    }
    
    return Math.max(1, steps - 1); // Leave buffer
  }
  
  shouldContinueSession(currentProfit, currentLoss, sessionParams) {
    // Profit target reached
    if (currentProfit >= sessionParams.profitTarget) {
      return {
        continue: false,
        reason: 'profit_target_reached',
        action: 'lock_in_profits'
      };
    }
    
    // Stop loss triggered
    if (currentLoss >= sessionParams.stopLoss) {
      return {
        continue: false,
        reason: 'stop_loss_triggered',
        action: 'end_session'
      };
    }
    
    // Bankroll insufficient for sequence
    const remainingBankroll = sessionParams.sessionBankroll - currentLoss;
    if (remainingBankroll < this.calculateSequenceRisk(3)) { // Need at least 3-step sequence
      return {
        continue: false,
        reason: 'insufficient_bankroll_for_sequence',
        action: 'end_session'
      };
    }
    
    return {
      continue: true,
      remainingBankroll: remainingBankroll,
      profitBuffer: sessionParams.profitTarget - currentProfit
    };
  }
}
```

---

## Strategy Selection Framework

### 1. Bankroll-Based Strategy Recommendation

```javascript
function recommendStrategy(bankroll, experience, riskTolerance) {
  const recommendations = {
    beginner: {
      small: 'SafeZoneStrategy',           // < 0.5 SOL
      medium: 'ConservativeProgression',   // 0.5-2.0 SOL
      large: 'ZoneBasedStrategy'           // > 2.0 SOL
    },
    intermediate: {
      small: 'ConservativeProgression',    // < 1.0 SOL
      medium: 'AdaptiveTimingStrategy',    // 1.0-5.0 SOL
      large: 'ControlledMartingale'        // > 5.0 SOL
    },
    advanced: {
      small: 'ZoneBasedStrategy',          // < 2.0 SOL
      medium: 'VolatilityArbitrageStrategy', // 2.0-10.0 SOL
      large: 'MathematicalCertaintyStrategy' // > 10.0 SOL
    }
  };
  
  const size = bankroll < 0.5 ? 'small' : bankroll < 2.0 ? 'medium' : 'large';
  return recommendations[experience][size];
}
```

### 2. Dynamic Strategy Switching

```javascript
class DynamicStrategyManager {
  constructor(initialBankroll, strategies) {
    this.bankroll = initialBankroll;
    this.strategies = strategies;
    this.currentStrategy = null;
    this.performanceHistory = [];
    this.switchingRules = this.defineSwitchingRules();
  }
  
  defineSwitchingRules() {
    return {
      profitability: {
        threshold: -0.10,        // Switch if losing more than 10%
        action: 'switch_to_conservative'
      },
      volatility: {
        threshold: 0.8,          // Switch if high volatility
        action: 'switch_to_adaptive'
      },
      bankroll: {
        thresholds: [
          { min: 10.0, strategy: 'MathematicalCertaintyStrategy' },
          { min: 2.0, strategy: 'ControlledMartingale' },
          { min: 0.5, strategy: 'ZoneBasedStrategy' },
          { min: 0.1, strategy: 'SafeZoneStrategy' }
        ]
      }
    };
  }
  
  evaluateStrategySwitch(currentPerformance, marketConditions) {
    const recommendations = [];
    
    // Check profitability-based switching
    if (currentPerformance.roi < this.switchingRules.profitability.threshold) {
      recommendations.push({
        reason: 'poor_performance',
        action: this.switchingRules.profitability.action,
        priority: 'high'
      });
    }
    
    // Check volatility-based switching
    if (marketConditions.volatility > this.switchingRules.volatility.threshold) {
      recommendations.push({
        reason: 'high_volatility',
        action: this.switchingRules.volatility.action,
        priority: 'medium'
      });
    }
    
    // Check bankroll-based switching
    const bankrollStrategy = this.switchingRules.bankroll.thresholds
      .find(rule => this.bankroll >= rule.min);
    
    if (bankrollStrategy && this.currentStrategy.name !== bankrollStrategy.strategy) {
      recommendations.push({
        reason: 'bankroll_optimization',
        action: `switch_to_${bankrollStrategy.strategy}`,
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}
```

---

## Strategy Performance Metrics

### 1. Key Performance Indicators

```javascript
class StrategyPerformanceTracker {
  constructor() {
    this.metrics = {
      totalBets: 0,
      wins: 0,
      losses: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      largestWin: 0,
      largestLoss: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      averageBetSize: 0,
      roi: 0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };
    
    this.sessionHistory = [];
    this.betHistory = [];
  }
  
  recordBet(amount, outcome, probability) {
    this.betHistory.push({
      amount,
      outcome,
      probability,
      timestamp: Date.now(),
      profit: outcome ? amount * 4 : -amount
    });
    
    this.updateMetrics(amount, outcome);
  }
  
  updateMetrics(amount, won) {
    this.metrics.totalBets++;
    this.metrics.totalWagered += amount;
    
    if (won) {
      this.metrics.wins++;
      const winAmount = amount * 4;
      this.metrics.totalWon += winAmount;
      this.metrics.largestWin = Math.max(this.metrics.largestWin, winAmount);
    } else {
      this.metrics.losses++;
      this.metrics.totalLost += amount;
      this.metrics.largestLoss = Math.max(this.metrics.largestLoss, amount);
    }
    
    this.calculateAdvancedMetrics();
  }
  
  calculateAdvancedMetrics() {
    const netProfit = this.metrics.totalWon - this.metrics.totalLost;
    this.metrics.roi = this.metrics.totalWagered > 0 ? 
      netProfit / this.metrics.totalWagered : 0;
    
    this.metrics.winRate = this.metrics.totalBets > 0 ? 
      this.metrics.wins / this.metrics.totalBets : 0;
    
    this.metrics.averageBetSize = this.metrics.totalBets > 0 ? 
      this.metrics.totalWagered / this.metrics.totalBets : 0;
    
    this.calculateSharpeRatio();
    this.calculateMaxDrawdown();
    this.calculateStreaks();
  }
  
  getPerformanceReport() {
    return {
      summary: {
        totalBets: this.metrics.totalBets,
        winRate: `${(this.metrics.winRate * 100).toFixed(1)}%`,
        roi: `${(this.metrics.roi * 100).toFixed(2)}%`,
        netProfit: this.metrics.totalWon - this.metrics.totalLost,
        sharpeRatio: this.metrics.sharpeRatio.toFixed(3)
      },
      detailed: this.metrics,
      recent: this.betHistory.slice(-20)
    };
  }
}
```

---

## Implementation Roadmap

### Phase 1: Basic Strategy Implementation
- [ ] Safe Zone Only Strategy
- [ ] Conservative Progression
- [ ] Basic zone-based betting
- [ ] Performance tracking

### Phase 2: Intermediate Strategies
- [ ] Adaptive timing strategy
- [ ] Controlled Martingale with limits
- [ ] Dynamic strategy switching
- [ ] Enhanced risk management

### Phase 3: Advanced Mathematical Systems
- [ ] Mathematical certainty calculations
- [ ] Professional bankroll management
- [ ] Volatility arbitrage system
- [ ] Multi-strategy portfolio management

### Phase 4: Optimization and Automation
- [ ] Machine learning strategy optimization
- [ ] Real-time strategy adaptation
- [ ] Automated execution system
- [ ] Advanced performance analytics

---

*Next: [05-bankroll-management.md](./05-bankroll-management.md) - Mathematical certainty zones and optimal allocation systems*