# Calibration Data Analysis

## Summary Statistics

- **Total Games Tracked**: 100
- **Total 10-Tick Windows**: 1,000
- **Overall Rug Rate**: 5.3% (53 rugs in 1,000 windows)

## Detailed Results by Tick Range

| Tick Range | Windows | Rugs | Actual Rate | Predicted Rate | Difference |
|------------|---------|------|-------------|----------------|------------|
| 1-50       | 230     | 14   | 6.09%       | ~2.5%          | +3.59%     |
| 51-100     | 179     | 9    | 5.03%       | ~3.75%         | +1.28%     |
| 101-200    | 234     | 12   | 5.13%       | ~5.0%          | +0.13%     |
| 201-300    | 140     | 8    | 5.71%       | ~7.5%          | -1.79%     |
| 301-400    | 78      | 5    | 6.41%       | ~10.0%         | -3.59%     |
| 401+       | 139     | 5    | 3.60%       | ~15.0%         | -11.40%    |

## Key Findings

### 1. Overall Accuracy
- **Actual 10-tick rug rate**: 5.3%
- **Required for profit**: >16.67% (for 5:1 payout)
- **Current gap**: -11.37 percentage points
- **Conclusion**: Not profitable with uniform betting

### 2. Model Calibration Issues

Our hazard model significantly **underestimates** early game risk and **overestimates** late game risk:

- **Early Game (1-100 ticks)**: Actual rates are 1.3-3.6% higher than predicted
- **Mid Game (101-200 ticks)**: Model is well-calibrated (+0.13% difference)
- **Late Game (201+ ticks)**: Actual rates are much lower than predicted

### 3. Surprising Pattern

The actual rug probability does **NOT** increase linearly with tick count as our model assumes. Instead:
- Early game has higher than expected rug rates
- Late game has lower than expected rug rates
- The 401+ range has the LOWEST rug rate (3.60%)

### 4. Statistical Confidence

With our sample sizes:
- **Best sampled**: 101-200 tick range (234 windows)
- **Worst sampled**: 301-400 tick range (78 windows)
- **95% Confidence Intervals** (approximate):
  - 1-50: 6.09% ± 3.09%
  - 401+: 3.60% ± 3.08%

## Implications for Strategy

### 1. No Profitable Windows Found
With the highest actual rate at 6.41% (301-400 range), we're far below the 16.67% threshold needed for positive EV.

### 2. Model Needs Complete Revision
The current hazard rate model is fundamentally flawed:
- Should not assume increasing risk with ticks
- Early game is riskier than expected
- Late game is safer than expected

### 3. Possible Explanations
- **Psychological factors**: Players/bots may trigger rugs early when profits are taken
- **Game mechanics**: There may be hidden factors affecting rug probability
- **Survivorship bias**: Games that last long may have different characteristics

## Recommendations

### 1. Immediate Actions
- **Stop using current model** for any real betting
- **Collect more data** to confirm these patterns
- **Investigate game mechanics** more deeply

### 2. Model Improvements
- Consider non-linear hazard functions
- Look for other predictive features beyond tick count
- Test if specific tick ranges have patterns (e.g., round numbers)

### 3. Alternative Approaches
- Focus on other game features (price movements, volume, player count)
- Look for conditional probabilities (e.g., after big moves)
- Consider the actual PRNG implementation details

## Conclusion

The calibration reveals that our Bayesian hazard model is poorly calibrated and that the side bet mechanism appears to have a strong house edge. With actual rug rates averaging 5.3% across all windows and never exceeding 6.41% in any range, the 5:1 payout structure ensures the house maintains a significant advantage.

**Bottom Line**: The side bet is not profitable with our current approach or any simple tick-based strategy.