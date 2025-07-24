# Timing Analysis Summary - July 2025

## Executive Summary
Comprehensive analysis of 100 randomly sampled games containing 22,507 tick intervals provides the empirical foundation for all timing-based calculations in the Rugs.fun side betting system.

## Key Findings

### Central Tendency
- **Mean**: 271.5ms (8.6% above theoretical 250ms)
- **Median**: 251.0ms (remarkably close to theoretical)
- **Mode**: ~251ms (most common interval)

### Variability
- **Standard Deviation**: 295.3ms
- **Variance**: 87,174.6
- **Coefficient of Variation**: 1.09 (high variability)
- **IQR (Interquartile Range)**: 9ms (246ms to 255ms)

### Distribution
- **98.14%** of ticks fall between 200-300ms
- **0.39%** under 200ms
- **1.00%** between 300-500ms
- **0.03%** between 500-1000ms
- **0.44%** over 1000ms (outliers/spikes)

### Percentiles
- **5th**: 237ms
- **25th**: 246ms
- **75th**: 255ms
- **95th**: 269ms
- **99th**: 332ms

## Strategic Implications

### 1. Probability Calculations
- Use **median (251ms)** for real-time decisions due to stability
- Use **mean (271.5ms)** for long-term planning and EV calculations
- Account for **95% range (237-269ms)** in confidence intervals

### 2. Window Duration
- **Theoretical**: 40 ticks × 250ms = 10.0 seconds
- **Empirical Mean**: 40 ticks × 271.5ms = 10.86 seconds
- **Empirical Median**: 40 ticks × 251ms = 10.04 seconds
- **Conservative (95th)**: 40 ticks × 269ms = 10.76 seconds

### 3. Adaptive Models
- High CV (1.09) mandates adaptive timing models
- Blend current observations with empirical baseline
- Use reliability scoring based on recent performance vs. empirical norms

### 4. Risk Management
- Plan for occasional spikes (0.44% > 1000ms)
- Conservative strategies should use 95th percentile (269ms)
- Gap risk calculations must account for variance

## Implementation Guidelines

### For Real-Time Systems
```javascript
const TIMING_CONSTANTS = {
  EMPIRICAL_MEAN: 271.5,
  EMPIRICAL_MEDIAN: 251.0,
  EMPIRICAL_STDDEV: 295.3,
  THEORETICAL: 250,
  RELIABLE_MIN: 237,  // 5th percentile
  RELIABLE_MAX: 269   // 95th percentile
};
```

### For Probability Models
```javascript
// Use median for immediate calculations
const immediateWindowDuration = 40 * 251; // 10.04 seconds

// Use mean for expected value
const expectedWindowDuration = 40 * 271.5; // 10.86 seconds

// Use variance for confidence intervals
const windowVariance = 40 * 87174.6; // Account for accumulation
```

## Data Source
- **Games Analyzed**: 100 (randomly sampled)
- **Total Tick Intervals**: 22,507
- **Date Range**: July 2025
- **Analysis File**: `/data/tick_interval_analysis.json`

## Conclusion
While the system operates close to theoretical specifications (median 251ms), the mean of 271.5ms and high variance require sophisticated adaptive models. The key insight is that 98%+ of ticks are highly predictable within a narrow range, but outliers must be handled gracefully.

---

*This analysis supersedes the earlier single-game observation of 558.6ms average, providing a statistically robust foundation for all timing-dependent calculations.*