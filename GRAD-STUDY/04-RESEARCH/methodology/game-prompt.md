# Statistical Probability Game - System Design Prompt

## Game Mechanics

### Core Rules
- **Clock System**: A clock starts at zero and ticks every 200ms (5 ticks per second)
- **Stop Probability**: 0.05% chance per tick that the clock stops (using PRNG)
- **Game Duration**: Clock can stop anywhere between >0 and <1000 ticks
- **Betting Window**: Players can bet for 10-second windows (50 ticks) 
- **Payout**: 5-to-1 payout if clock stops during their betting window
- **Betting Rules**: 
  - Can bet any amount at any time
  - Only 1 active bet at a time
  - Can place sequential bets after each 10-second window ends

### Mathematical Foundation
- **Distribution Type**: Geometric distribution with parameter p = 0.0005
- **Win Probability per Bet**: ~2.48% (calculated as 1 - (0.9995)^50)
- **Expected Value**: Negative (~-85.12% per dollar bet)
- **Memoryless Property**: Past ticks don't affect future probabilities

## Analysis Requirements

### Statistical Measures to Track
- Mean, median, mode, range, standard deviation of stopping times
- Running probability calculations
- Historical game data analysis

### Betting Strategies to Analyze
1. **Fixed Bet Strategy**: Consistent bet amounts
2. **Modified Martingale**: 
   - Start with $1 bet
   - Bet $1 for first 5 attempts
   - Then escalate: $2, $3, $4, $6, $8, etc.
   - Reset after win or adapt based on bankroll

### Visualization Goals
- **Real-time Dashboard** or **Static Infographic** showing:
  - Probability distributions
  - Strategy outcome permutations
  - Risk/reward calculations
  - Bankroll management scenarios
  - Maximum odds calculations for profitable play

## Technical Implementation
- **Starting Bankroll**: $100 (example)
- **Target Platform**: Jupyter notebook, HTML dashboard, or interactive visualization
- **Key Question**: How to visualize all permutations and provide maximum odds recommendations for profitable play

## Research Focus
Design a system that can:
1. Calculate and display real-time probabilities
2. Show statistical analysis of historical stopping patterns
3. Visualize betting strategy outcomes and permutations
4. Provide decision-support for optimal betting timing and amounts
5. Demonstrate why timing-based strategies may not work (memoryless property)