#!/usr/bin/env python3
"""
PRNG Game Data Analysis for Bayesian Calculator
Extracts key fields and generates CSV for Google Sheets
"""
import json
import csv
import sys
from datetime import datetime
from statistics import mean, median

def analyze_games(jsonl_file, csv_output):
    """
    Analyze PRNG game data and extract fields for Bayesian calculations
    """
    games = []
    stats = {
        'duration_ticks': [],
        'peak_multipliers': [],
        'instarug_count': 0,
        'total_games': 0
    }
    
    # Read JSONL file
    with open(jsonl_file, 'r') as f:
        for line in f:
            try:
                game = json.loads(line.strip())
                if game:  # Skip empty lines
                    games.append(game)
            except json.JSONDecodeError as e:
                print(f"Error parsing line: {e}")
                continue
    
    # Extract data for CSV
    csv_data = []
    for game in games:
        try:
            # Basic game info
            game_id = game.get('gameId', '')
            timestamp = game.get('recordingStart', '')
            
            # Analysis data
            analysis = game.get('analysis', {})
            
            # Duration in ticks (finalTick)
            duration_ticks = analysis.get('finalTick', 0)
            
            # Peak multiplier
            peak_multiplier = analysis.get('peakMultiplier', 0)
            
            # Determine rug tick (assuming final tick is when rug happened)
            rug_tick = duration_ticks
            
            # Final price before rug (from priceProgression)
            price_progression = analysis.get('priceProgression', [])
            final_price = 0
            if price_progression:
                # Get the second-to-last price (before the rug drop)
                if len(price_progression) >= 2:
                    final_price = price_progression[-2].get('price', 0)
                elif len(price_progression) == 1:
                    final_price = price_progression[0].get('price', 0)
            
            # Check if instarug (< 11 ticks)
            is_instarug = duration_ticks < 11
            
            # Add to CSV data
            csv_data.append({
                'gameId': game_id,
                'duration_ticks': duration_ticks,
                'peak_multiplier': peak_multiplier,
                'rug_tick': rug_tick,
                'final_price': final_price,
                'timestamp': timestamp,
                'is_instarug': is_instarug
            })
            
            # Collect stats
            stats['duration_ticks'].append(duration_ticks)
            stats['peak_multipliers'].append(peak_multiplier)
            if is_instarug:
                stats['instarug_count'] += 1
            stats['total_games'] += 1
            
        except Exception as e:
            print(f"Error processing game {game.get('gameId', 'unknown')}: {e}")
            continue
    
    # Write CSV file
    with open(csv_output, 'w', newline='') as csvfile:
        fieldnames = ['gameId', 'duration_ticks', 'peak_multiplier', 'rug_tick', 'final_price', 'timestamp', 'is_instarug']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in csv_data:
            writer.writerow(row)
    
    # Calculate and print statistics
    if stats['duration_ticks']:
        duration_mean = mean(stats['duration_ticks'])
        duration_median = median(stats['duration_ticks'])
        duration_min = min(stats['duration_ticks'])
        duration_max = max(stats['duration_ticks'])
    else:
        duration_mean = duration_median = duration_min = duration_max = 0
    
    if stats['peak_multipliers']:
        peak_mean = mean(stats['peak_multipliers'])
        peak_median = median(stats['peak_multipliers'])
        peak_min = min(stats['peak_multipliers'])
        peak_max = max(stats['peak_multipliers'])
    else:
        peak_mean = peak_median = peak_min = peak_max = 0
    
    instarug_rate = (stats['instarug_count'] / stats['total_games'] * 100) if stats['total_games'] > 0 else 0
    
    print("=" * 50)
    print("📊 PRNG GAME DATA ANALYSIS REPORT")
    print("=" * 50)
    print(f"Total Games Analyzed: {stats['total_games']}")
    print(f"CSV File Generated: {csv_output}")
    print()
    print("📈 DURATION STATISTICS (Ticks)")
    print(f"  Mean: {duration_mean:.1f} ticks")
    print(f"  Median: {duration_median:.1f} ticks")
    print(f"  Range: {duration_min}-{duration_max} ticks")
    print()
    print("🎯 PEAK MULTIPLIER STATISTICS")
    print(f"  Mean: {peak_mean:.2f}x")
    print(f"  Median: {peak_median:.2f}x")
    print(f"  Range: {peak_min:.2f}x-{peak_max:.2f}x")
    print()
    print("⚡ INSTARUG ANALYSIS")
    print(f"  Instarug Count: {stats['instarug_count']} games")
    print(f"  Instarug Rate: {instarug_rate:.1f}%")
    print()
    print("✅ Ready for Google Sheets import!")
    print("=" * 50)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python analyze_rugs_data.py <input_jsonl> <output_csv>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    analyze_games(input_file, output_file)