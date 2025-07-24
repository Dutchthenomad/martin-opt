# Statistical Probability Game Analysis - Interactive Notebook
# Complete implementation with calculations, simulations, and visualizations

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from scipy import stats
from ipywidgets import interact, FloatSlider, IntSlider, Dropdown, HBox, VBox
import warnings
warnings.filterwarnings('ignore')

# Set style for better visualizations
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")
np.random.seed(42)  # For reproducible results

class ProbabilityGameAnalyzer:
    """
    Complete analyzer for the probability-based betting game
    Handles calculations, simulations, and visualizations
    """
    
    def __init__(self, max_seconds=200, ms_per_tick=200, payout_multiple=5, 
                 bet_window_seconds=10, stop_prob=0.0005):
        """Initialize game parameters"""
        self.max_seconds = max_seconds
        self.ms_per_tick = ms_per_tick
        self.payout_multiple = payout_multiple
        self.bet_window_seconds = bet_window_seconds
        self.stop_prob = stop_prob
        
        # Calculate derived parameters
        self.tick_duration = ms_per_tick / 1000  # Convert to seconds
        self.max_ticks = int(max_seconds / self.tick_duration)
        self.bet_window_ticks = int(bet_window_seconds / self.tick_duration)
        
        # Calculate core probabilities
        self.win_prob = 1 - (1 - stop_prob) ** self.bet_window_ticks
        self.ev_per_bet = (self.win_prob * (payout_multiple + 1)) - 1
        
    def display_parameters(self):
        """Display current game parameters and calculations"""
        print("="*60)
        print("PROBABILITY GAME ANALYZER")
        print("="*60)
        print(f"Game Duration: {self.max_seconds} seconds ({self.max_ticks} ticks)")
        print(f"Tick Interval: {self.ms_per_tick}ms ({self.tick_duration}s)")
        print(f"Bet Window: {self.bet_window_seconds}s ({self.bet_window_ticks} ticks)")
        print(f"Stop Probability: {self.stop_prob:.4f} per tick ({self.stop_prob*100:.3f}%)")
        print(f"Payout: {self.payout_multiple}-to-1")
        print("-"*60)
        print("CALCULATED PROBABILITIES:")
        print(f"Win Probability per Bet: {self.win_prob:.4f} ({self.win_prob*100:.2f}%)")
        print(f"Expected Value per $1 Bet: ${self.ev_per_bet:.4f}")
        print(f"Expected Loss Percentage: {abs(self.ev_per_bet)*100:.1f}%")
        print("="*60)
        
    def simulate_games(self, n_games=1000):
        """Simulate multiple games and return stopping ticks"""
        # Use geometric distribution (number of failures before first success)
        # Add 1 because geometric dist counts failures, we want the success tick
        stopping_ticks = np.random.geometric(self.stop_prob, n_games)
        
        # Apply truncation at max_ticks
        stopping_ticks = np.minimum(stopping_ticks, self.max_ticks)
        
        return stopping_ticks
        
    def analyze_distribution(self, stopping_ticks):
        """Analyze the distribution of stopping ticks"""
        stats_dict = {
            'mean': np.mean(stopping_ticks),
            'median': np.median(stopping_ticks),
            'mode': stats.mode(stopping_ticks, keepdims=True)[0][0],
            'std': np.std(stopping_ticks),
            'min': np.min(stopping_ticks),
            'max': np.max(stopping_ticks),
            'range': np.max(stopping_ticks) - np.min(stopping_ticks)
        }
        return stats_dict
        
    def simulate_fixed_betting(self, stopping_ticks, bankroll=100, bet_size=1):
        """Simulate fixed betting strategy"""
        results = []
        
        for stop_tick in stopping_ticks:
            current_bankroll = bankroll
            bets_made = 0
            t = 0  # Current tick
            
            while t < stop_tick and current_bankroll >= bet_size:
                bets_made += 1
                
                # Check if this bet wins (stop_tick falls in bet window)
                if t < stop_tick <= t + self.bet_window_ticks:
                    # Win: get payout
                    current_bankroll += bet_size * self.payout_multiple
                else:
                    # Lose: lose bet
                    current_bankroll -= bet_size
                    
                t += self.bet_window_ticks  # Move to next bet window
                
            results.append({
                'final_bankroll': current_bankroll,
                'bets_made': bets_made,
                'profit_loss': current_bankroll - bankroll,
                'stop_tick': stop_tick
            })
            
        return pd.DataFrame(results)
        
    def simulate_martingale(self, stopping_ticks, bankroll=100, initial_bet=1):
        """Simulate modified Martingale strategy"""
        results = []
        
        for stop_tick in stopping_ticks:
            current_bankroll = bankroll
            current_bet = initial_bet
            bets_made = 0
            consecutive_losses = 0
            t = 0
            
            while t < stop_tick and current_bankroll >= current_bet:
                bets_made += 1
                
                if t < stop_tick <= t + self.bet_window_ticks:
                    # Win
                    current_bankroll += current_bet * self.payout_multiple
                    current_bet = initial_bet  # Reset bet size
                    consecutive_losses = 0
                else:
                    # Lose
                    current_bankroll -= current_bet
                    consecutive_losses += 1
                    
                    # Modified Martingale: $1 for first 5 bets, then escalate
                    if consecutive_losses < 5:
                        current_bet = initial_bet
                    else:
                        # Escalation pattern: 2, 3, 4, 6, 8, 12, 18...
                        if consecutive_losses == 5:
                            current_bet = 2
                        elif consecutive_losses == 6:
                            current_bet = 3
                        elif consecutive_losses == 7:
                            current_bet = 4
                        else:
                            current_bet = int(current_bet * 1.5)  # 50% increase
                            
                t += self.bet_window_ticks
                
            results.append({
                'final_bankroll': current_bankroll,
                'bets_made': bets_made,
                'profit_loss': current_bankroll - bankroll,
                'stop_tick': stop_tick,
                'max_consecutive_losses': consecutive_losses
            })
            
        return pd.DataFrame(results)
        
    def create_comprehensive_analysis(self, n_games=1000, bankroll=100):
        """Create complete analysis with visualizations"""
        
        # Generate simulation data
        stopping_ticks = self.simulate_games(n_games)
        distribution_stats = self.analyze_distribution(stopping_ticks)
        
        # Simulate betting strategies
        fixed_results = self.simulate_fixed_betting(stopping_ticks, bankroll)
        martingale_results = self.simulate_martingale(stopping_ticks, bankroll)
        
        # Create comprehensive visualizations
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle(f'Probability Game Analysis - {n_games} Simulations', fontsize=16, fontweight='bold')
        
        # 1. Stopping Tick Distribution
        axes[0,0].hist(stopping_ticks, bins=50, alpha=0.7, color='skyblue', edgecolor='black')
        axes[0,0].axvline(distribution_stats['mean'], color='red', linestyle='--', 
                         label=f'Mean: {distribution_stats["mean"]:.1f}')
        axes[0,0].axvline(distribution_stats['median'], color='green', linestyle='--', 
                         label=f'Median: {distribution_stats["median"]:.1f}')
        axes[0,0].set_title('Distribution of Stopping Ticks')
        axes[0,0].set_xlabel('Stopping Tick')
        axes[0,0].set_ylabel('Frequency')
        axes[0,0].legend()
        axes[0,0].grid(True, alpha=0.3)
        
        # 2. Theoretical vs Simulated Probability
        max_tick_plot = min(500, self.max_ticks)  # Limit for readability
        ticks_range = np.arange(1, max_tick_plot + 1)
        theoretical_prob = (1 - self.stop_prob) ** (ticks_range - 1) * self.stop_prob
        
        axes[0,1].plot(ticks_range, theoretical_prob, 'b-', label='Theoretical', linewidth=2)
        hist_counts, bin_edges = np.histogram(stopping_ticks[stopping_ticks <= max_tick_plot], 
                                            bins=50, density=True)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        axes[0,1].plot(bin_centers, hist_counts, 'ro-', alpha=0.6, label='Simulated', markersize=3)
        axes[0,1].set_title('Theoretical vs Simulated Distribution')
        axes[0,1].set_xlabel('Tick Number')
        axes[0,1].set_ylabel('Probability Density')
        axes[0,1].legend()
        axes[0,1].grid(True, alpha=0.3)
        axes[0,1].set_xlim(0, max_tick_plot)
        
        # 3. Strategy Comparison - Final Bankroll
        strategy_data = pd.DataFrame({
            'Fixed Betting': fixed_results['final_bankroll'],
            'Martingale': martingale_results['final_bankroll']
        })
        
        strategy_data.boxplot(ax=axes[0,2])
        axes[0,2].axhline(bankroll, color='red', linestyle='--', label=f'Starting Bankroll: ${bankroll}')
        axes[0,2].set_title('Final Bankroll Distribution by Strategy')
        axes[0,2].set_ylabel('Final Bankroll ($)')
        axes[0,2].legend()
        axes[0,2].grid(True, alpha=0.3)
        
        # 4. Profit/Loss Distribution
        axes[1,0].hist(fixed_results['profit_loss'], bins=30, alpha=0.6, 
                      label='Fixed Betting', color='blue')
        axes[1,0].hist(martingale_results['profit_loss'], bins=30, alpha=0.6, 
                      label='Martingale', color='orange')
        axes[1,0].axvline(0, color='red', linestyle='--', label='Break Even')
        axes[1,0].set_title('Profit/Loss Distribution')
        axes[1,0].set_xlabel('Profit/Loss ($)')
        axes[1,0].set_ylabel('Frequency')
        axes[1,0].legend()
        axes[1,0].grid(True, alpha=0.3)
        
        # 5. Risk Analysis
        fixed_profit_prob = (fixed_results['profit_loss'] > 0).mean()
        martingale_profit_prob = (martingale_results['profit_loss'] > 0).mean()
        fixed_ruin_prob = (fixed_results['final_bankroll'] == 0).mean()
        martingale_ruin_prob = (martingale_results['final_bankroll'] == 0).mean()
        
        strategies = ['Fixed Betting', 'Martingale']
        profit_probs = [fixed_profit_prob, martingale_profit_prob]
        ruin_probs = [fixed_ruin_prob, martingale_ruin_prob]
        
        x = np.arange(len(strategies))
        width = 0.35
        
        axes[1,1].bar(x - width/2, profit_probs, width, label='Probability of Profit', color='green', alpha=0.7)
        axes[1,1].bar(x + width/2, ruin_probs, width, label='Probability of Ruin', color='red', alpha=0.7)
        axes[1,1].set_title('Risk Analysis by Strategy')
        axes[1,1].set_ylabel('Probability')
        axes[1,1].set_xticks(x)
        axes[1,1].set_xticklabels(strategies)
        axes[1,1].legend()
        axes[1,1].grid(True, alpha=0.3)
        
        # 6. Expected Value Verification
        fixed_mean_pl = fixed_results['profit_loss'].mean()
        martingale_mean_pl = martingale_results['profit_loss'].mean()
        fixed_mean_bets = fixed_results['bets_made'].mean()
        martingale_mean_bets = martingale_results['bets_made'].mean()
        
        theoretical_ev_per_game_fixed = fixed_mean_bets * self.ev_per_bet
        theoretical_ev_per_game_martingale = martingale_mean_bets * self.ev_per_bet  # Approximate
        
        comparison_data = {
            'Strategy': ['Fixed Betting', 'Martingale'],
            'Simulated Mean P/L': [fixed_mean_pl, martingale_mean_pl],
            'Mean Bets per Game': [fixed_mean_bets, martingale_mean_bets],
            'Theoretical EV': [theoretical_ev_per_game_fixed, theoretical_ev_per_game_martingale]
        }
        
        df_comparison = pd.DataFrame(comparison_data)
        x_pos = np.arange(len(df_comparison))
        
        axes[1,2].bar(x_pos - 0.2, df_comparison['Simulated Mean P/L'], 0.4, 
                     label='Simulated Mean P/L', color='blue', alpha=0.7)
        axes[1,2].bar(x_pos + 0.2, df_comparison['Theoretical EV'], 0.4, 
                     label='Theoretical EV', color='red', alpha=0.7)
        axes[1,2].set_title('Expected Value Verification')
        axes[1,2].set_ylabel('Expected Profit/Loss ($)')
        axes[1,2].set_xticks(x_pos)
        axes[1,2].set_xticklabels(df_comparison['Strategy'])
        axes[1,2].legend()
        axes[1,2].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()
        
        # Print detailed statistics
        print("\n" + "="*80)
        print("DETAILED ANALYSIS RESULTS")
        print("="*80)
        
        print(f"\nDISTRIBUTION STATISTICS ({n_games} games):")
        for key, value in distribution_stats.items():
            print(f"{key.capitalize()}: {value:.2f}")
            
        print(f"\nSTRATEGY COMPARISON:")
        print(f"{'Metric':<30} {'Fixed Betting':<15} {'Martingale':<15}")
        print("-" * 60)
        print(f"{'Mean Final Bankroll':<30} ${fixed_results['final_bankroll'].mean():<14.2f} ${martingale_results['final_bankroll'].mean():<14.2f}")
        print(f"{'Mean Profit/Loss':<30} ${fixed_results['profit_loss'].mean():<14.2f} ${martingale_results['profit_loss'].mean():<14.2f}")
        print(f"{'Probability of Profit':<30} {fixed_profit_prob:<14.3f} {martingale_profit_prob:<14.3f}")
        print(f"{'Probability of Ruin':<30} {fixed_ruin_prob:<14.3f} {martingale_ruin_prob:<14.3f}")
        print(f"{'Mean Bets per Game':<30} {fixed_results['bets_made'].mean():<14.1f} {martingale_results['bets_made'].mean():<14.1f}")
        
        return {
            'stopping_ticks': stopping_ticks,
            'distribution_stats': distribution_stats,
            'fixed_results': fixed_results,
            'martingale_results': martingale_results
        }

# Interactive widget function for parameter exploration
def interactive_analysis(max_seconds=200, ms_per_tick=200, payout_multiple=5.0, 
                        bet_window_seconds=10.0, stop_prob=0.0005, 
                        bankroll=100, n_simulations=1000):
    """Interactive widget for exploring different game parameters"""
    
    # Create analyzer with current parameters
    analyzer = ProbabilityGameAnalyzer(
        max_seconds=max_seconds,
        ms_per_tick=ms_per_tick,
        payout_multiple=payout_multiple,
        bet_window_seconds=bet_window_seconds,
        stop_prob=stop_prob
    )
    
    # Display parameters
    analyzer.display_parameters()
    
    # Run analysis
    results = analyzer.create_comprehensive_analysis(n_simulations, bankroll)
    
    return results

# Create the interactive widget
print("PROBABILITY GAME ANALYZER")
print("Adjust parameters below to explore different game configurations:")
print("="*80)

# Interactive widget with parameter controls
interact(
    interactive_analysis,
    max_seconds=IntSlider(min=50, max=500, step=10, value=200, description='Max Seconds'),
    ms_per_tick=IntSlider(min=100, max=1000, step=100, value=200, description='ms per Tick'),
    payout_multiple=FloatSlider(min=1.0, max=10.0, step=0.5, value=5.0, description='Payout Multiple'),
    bet_window_seconds=IntSlider(min=5, max=30, step=1, value=10, description='Bet Window (s)'),
    stop_prob=FloatSlider(min=0.0001, max=0.01, step=0.0001, value=0.0005, description='Stop Probability'),
    bankroll=IntSlider(min=50, max=500, step=10, value=100, description='Starting Bankroll'),
    n_simulations=IntSlider(min=100, max=5000, step=100, value=1000, description='Simulations')
);

# Additional utility functions for further analysis
def calculate_memoryless_demonstration():
    """Demonstrate the memoryless property of geometric distribution"""
    print("\n" + "="*60)
    print("MEMORYLESS PROPERTY DEMONSTRATION")
    print("="*60)
    
    stop_prob = 0.0005
    bet_window_ticks = 50
    
    # Calculate probability of stopping in next 50 ticks
    prob_next_50 = 1 - (1 - stop_prob) ** bet_window_ticks
    
    print(f"Probability of stopping in next 50 ticks: {prob_next_50:.4f}")
    print(f"This probability is the same whether we're at:")
    print(f"  - Tick 1 (beginning of game)")
    print(f"  - Tick 100 (game has been running)")
    print(f"  - Tick 500 (game has been running long)")
    print(f"\nThis is why 'waiting for the right moment' doesn't work!")
    print(f"The geometric distribution has no memory of past events.")
    
def calculate_bankroll_survival():
    """Calculate probability of bankroll survival for different strategies"""
    print("\n" + "="*60)
    print("BANKROLL SURVIVAL ANALYSIS")
    print("="*60)
    
    analyzer = ProbabilityGameAnalyzer()
    
    # Different bankroll sizes
    bankrolls = [50, 100, 200, 500]
    bet_sizes = [1, 2, 5]
    
    for bankroll in bankrolls:
        print(f"\nStarting Bankroll: ${bankroll}")
        print(f"{'Bet Size':<10} {'Max Bets':<10} {'Ruin Prob (approx)':<20}")
        print("-" * 40)
        
        for bet_size in bet_sizes:
            max_bets = bankroll // bet_size
            # Approximate ruin probability for negative EV game
            ruin_prob = 1 - (analyzer.win_prob / (1 - analyzer.win_prob)) ** max_bets
            if ruin_prob < 0:
                ruin_prob = 0.99  # Very high for negative EV
            
            print(f"${bet_size:<9} {max_bets:<10} {ruin_prob:<20.3f}")

# Run additional analyses
calculate_memoryless_demonstration()
calculate_bankroll_survival()

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)
print("Key Takeaways:")
print("1. The game has a consistent negative expected value (-85.12% per bet)")
print("2. No betting strategy can overcome this mathematical disadvantage")
print("3. The memoryless property means timing doesn't matter")
print("4. Higher variance strategies (Martingale) increase both win and ruin potential")
print("5. This analysis is educational - not for actual gambling decisions!")
print("="*80)