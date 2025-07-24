# Scientific Method Roadmap for Side Bet Predictor

## Project Goal
Develop a real-time prediction system that achieves >16.67% accuracy for 10-tick rug predictions, enabling positive expected value on 5:1 payout side bets.

## Current Status
- **Baseline Accuracy**: 5.3% (Version 1)
- **Required Accuracy**: 16.67% (3.14x improvement needed)
- **Key Finding**: Traditional hazard models failed due to incorrect assumptions

## Scientific Methodology

### Phase 1: Baseline Calibration ✅ COMPLETE
**Hypothesis**: Rug probability increases with tick count
**Method**: Implement graduated hazard rate model
**Result**: REJECTED - Risk profile is inverted (early > late)
**Learning**: Need empirical rather than theoretical approach

### Phase 2: Empirical Rate Adjustment (CURRENT)
**Hypothesis**: Using actual measured rates will improve accuracy
**Method**: 
1. Replace theoretical rates with calibration data
2. Implement empirical hazard rates by tick range
3. Test on new data sample

**Expected Outcome**: 
- Accuracy improvement from 5.3% to ~6-7%
- Still below profitability threshold
- Foundation for conditional factors

### Phase 3: Volatility Enhancement
**Hypothesis**: Price volatility spikes 78% before rugs (from research)
**Method**:
1. Add 10-tick rolling volatility calculation
2. Multiply base probability by factor when volatility > 0.3
3. Track accuracy improvement with/without volatility

**Success Metrics**:
- Measure accuracy on high-volatility windows
- Compare to overall accuracy
- Document volatility threshold optimization

### Phase 4: Cross-Game State Tracking
**Hypothesis**: Previous game outcomes affect next game (84% instarug after >50x)
**Method**:
1. Track previous game peak multiplier
2. Boost early tick probabilities after high multiplier games
3. Measure conditional accuracy

**Key Tests**:
- Accuracy after >50x games
- Accuracy after normal games
- Optimal multiplier thresholds

### Phase 5: Multi-Factor Integration
**Hypothesis**: Combining factors multiplicatively improves accuracy
**Method**:
1. Integrate volatility + cross-game + empirical rates
2. Test different weighting schemes
3. Optimize thresholds

**Formula**:
```
P(rug) = Base_Rate × Volatility_Multiplier × CrossGame_Multiplier × Confidence_Factor
```

### Phase 6: Pattern Detection (Advanced)
**Hypothesis**: Complex patterns exist beyond simple factors
**Method**:
1. Implement pattern recognition for:
   - Trading volume anomalies
   - Player behavior patterns
   - Timing irregularities
2. Use ML techniques from research
3. Validate on out-of-sample data

## Experiment Protocol

### For Each Version:
1. **Document Hypothesis**: Clear prediction of improvement
2. **Define Metrics**: 
   - Overall accuracy
   - Accuracy by tick range
   - Precision/recall for high-confidence predictions
3. **Sample Size**: Minimum 1000 10-tick windows
4. **Control**: Compare to Version 1 baseline
5. **Analysis**: Statistical significance testing

### Data Collection Standards
```javascript
// Every prediction must log:
{
  gameId: "...",
  windowStart: 141,
  windowEnd: 150,
  predictions: [/* 10 probabilities */],
  actualRug: false,
  rugTick: null,
  volatility: 0.15,
  previousGamePeak: 3.2,
  confidence: 0.65
}
```

## Success Criteria

### Minimum Viable Predictor
- **Accuracy**: >16.67% on any identifiable subset
- **Confidence**: Can identify when NOT to bet
- **Consistency**: Results reproducible

### Stretch Goals
- 20%+ accuracy on high-confidence windows
- Real-time alerts for high-probability events
- Automated betting recommendations

## Timeline

### Week 1: Empirical Rates (Phase 2)
- Day 1-2: Implement v2 with empirical rates
- Day 3-4: Collect calibration data
- Day 5-7: Analysis and documentation

### Week 2: Volatility (Phase 3)
- Day 1-2: Add volatility tracking
- Day 3-4: Optimize thresholds
- Day 5-7: Validate improvements

### Week 3: Integration (Phase 4-5)
- Day 1-3: Cross-game state tracking
- Day 4-5: Multi-factor integration
- Day 6-7: Performance analysis

### Week 4: Advanced Patterns (Phase 6)
- Day 1-3: Pattern detection implementation
- Day 4-5: ML model training
- Day 6-7: Final validation

## Risk Mitigation

### Known Risks:
1. **House Edge**: May be mathematically impossible
2. **Overfitting**: Models may not generalize
3. **Platform Changes**: Game mechanics may change

### Mitigation Strategies:
1. Focus on understanding rather than profit
2. Use proper train/test splits
3. Version control all findings

## Documentation Requirements

### For Each Experiment:
1. Create `research/experiments/experiment_XXX_name.md`
2. Include:
   - Hypothesis
   - Method
   - Results (with data)
   - Conclusion
   - Next steps

### Weekly Reports:
1. Summary of experiments
2. Key findings
3. Adjusted hypotheses
4. Updated timeline

## Ethical Considerations
- This is research, not financial advice
- Document limitations clearly
- Warn users about gambling risks
- Focus on understanding the system

## Next Immediate Steps
1. Implement Version 2 with empirical rates
2. Set up enhanced logging system
3. Run 1000+ window calibration
4. Document accuracy improvements
5. Prepare Version 3 volatility framework

---

*"In research, negative results are still results. Understanding why something doesn't work is as valuable as finding what does."*