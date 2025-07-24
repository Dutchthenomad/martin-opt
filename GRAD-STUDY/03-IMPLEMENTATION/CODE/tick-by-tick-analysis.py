#!/usr/bin/env python3
"""
Tick-by-Tick PRNG Game Analysis
Analyzes player movements, volatility, and rug timing at granular tick level
"""
import json
import csv
import sys
from statistics import mean, stdev
from collections import defaultdict

def calculate_price_volatility(prices):
    """Calculate volatility metrics from price sequence"""
    if len(prices) < 2:
        return 0, 0, 0
    
    # Price changes
    changes = [abs(prices[i] - prices[i-1]) for i in range(1, len(prices))]
    
    # Volatility metrics
    avg_change = mean(changes) if changes else 0
    volatility = stdev(changes) if len(changes) > 1 else 0
    max_change = max(changes) if changes else 0
    
    return avg_change, volatility, max_change

def analyze_tick_progression(game):
    """Extract tick-by-tick data for a single game"""
    game_id = game.get('gameId', '')
    analysis = game.get('analysis', {})
    events = game.get('events', [])
    
    # Basic game info
    final_tick = analysis.get('finalTick', 0)
    peak_multiplier = analysis.get('peakMultiplier', 0)
    is_instarug = final_tick < 11
    
    # Get price progression
    price_progression = analysis.get('priceProgression', [])
    
    # Get tick intervals for timing analysis
    tick_intervals = analysis.get('tickIntervals', [])
    
    # Extract trade events
    trade_events = [e for e in events if e.get('eventType') == 'newTrade']
    
    # Create tick-by-tick records
    tick_records = []
    
    # Process each tick that has price data
    for i, price_point in enumerate(price_progression):
        tick = price_point.get('tick', i)
        price = price_point.get('price', 0)
        timestamp = price_point.get('timestamp', '')
        
        # Calculate relative position in game
        tick_position_ratio = tick / max(final_tick, 1)
        ticks_to_rug = final_tick - tick
        
        # Calculate price metrics up to this tick
        prices_so_far = [p.get('price', 0) for p in price_progression[:i+1]]
        current_peak = max(prices_so_far) if prices_so_far else 0
        peak_ratio = price / max(current_peak, 0.001)
        
        # Price movement analysis
        price_change_1tick = 0
        price_change_5tick = 0
        price_velocity = 0
        
        if i > 0:
            prev_price = price_progression[i-1].get('price', 0)
            price_change_1tick = (price - prev_price) / max(prev_price, 0.001)
        
        if i >= 5:
            price_5_ago = price_progression[i-5].get('price', 0)
            price_change_5tick = (price - price_5_ago) / max(price_5_ago, 0.001)
        
        if i >= 2:
            # Calculate velocity (acceleration of price changes)
            recent_prices = prices_so_far[-3:]
            if len(recent_prices) == 3:
                change1 = recent_prices[1] - recent_prices[0]
                change2 = recent_prices[2] - recent_prices[1]
                price_velocity = change2 - change1
        
        # Volatility analysis (rolling window)
        window_size = min(10, len(prices_so_far))
        window_prices = prices_so_far[-window_size:]
        avg_change, volatility, max_change = calculate_price_volatility(window_prices)
        
        # Trading activity at this tick
        trades_at_tick = [t for t in trade_events 
                         if t.get('data', {}).get('tickIndex') == tick]
        
        buy_orders_at_tick = len([t for t in trades_at_tick 
                                 if t.get('data', {}).get('type') == 'buy'])
        sell_orders_at_tick = len([t for t in trades_at_tick 
                                  if t.get('data', {}).get('type') == 'sell'])
        volume_at_tick = sum(t.get('data', {}).get('qty', 0) for t in trades_at_tick)
        
        # Player activity metrics
        players_active_at_tick = len(set(t.get('data', {}).get('playerId', '') 
                                       for t in trades_at_tick))
        
        # Get tick timing
        tick_interval = 0
        if i < len(tick_intervals):
            tick_interval = tick_intervals[i]
        
        # Timing anomaly detection
        avg_interval = mean(tick_intervals[:i+1]) if tick_intervals[:i+1] else 0
        interval_deviation = (tick_interval - avg_interval) / max(avg_interval, 1)
        
        # Market pressure indicators
        buy_sell_ratio_at_tick = buy_orders_at_tick / max(sell_orders_at_tick, 1)
        net_order_flow = buy_orders_at_tick - sell_orders_at_tick
        
        # Rug proximity indicators
        is_near_rug = ticks_to_rug <= 5
        is_very_near_rug = ticks_to_rug <= 2
        
        # Create tick record
        tick_record = {
            'gameId': game_id,
            'tick': tick,
            'price': round(price, 6),
            'timestamp': timestamp,
            
            # Position in game
            'tick_position_ratio': round(tick_position_ratio, 4),
            'ticks_to_rug': ticks_to_rug,
            'is_near_rug': is_near_rug,
            'is_very_near_rug': is_very_near_rug,
            
            # Price analysis
            'current_peak_so_far': round(current_peak, 6),
            'peak_ratio': round(peak_ratio, 4),
            'price_change_1tick': round(price_change_1tick, 4),
            'price_change_5tick': round(price_change_5tick, 4),
            'price_velocity': round(price_velocity, 6),
            
            # Volatility metrics
            'rolling_volatility': round(volatility, 6),
            'rolling_avg_change': round(avg_change, 6),
            'rolling_max_change': round(max_change, 6),
            
            # Trading activity
            'buy_orders_at_tick': buy_orders_at_tick,
            'sell_orders_at_tick': sell_orders_at_tick,
            'volume_at_tick': round(volume_at_tick, 4),
            'players_active_at_tick': players_active_at_tick,
            'buy_sell_ratio_at_tick': round(buy_sell_ratio_at_tick, 3),
            'net_order_flow': net_order_flow,
            
            # Timing analysis
            'tick_interval': tick_interval,
            'interval_deviation': round(interval_deviation, 4),
            
            # Game context
            'final_tick': final_tick,
            'peak_multiplier': round(peak_multiplier, 6),
            'is_instarug': is_instarug
        }
        
        tick_records.append(tick_record)
    
    return tick_records

def analyze_all_games_tick_by_tick(jsonl_file, csv_output):
    """Analyze all games at tick level"""
    games = []
    
    # Read JSONL file
    with open(jsonl_file, 'r') as f:
        for line in f:
            try:
                game = json.loads(line.strip())
                if game:
                    games.append(game)
            except json.JSONDecodeError as e:
                print(f"Error parsing line: {e}")
                continue
    
    # Process all games
    all_tick_records = []
    
    for i, game in enumerate(games):
        try:
            print(f"Processing game {i+1}/{len(games)}: {game.get('gameId', 'unknown')}")
            tick_records = analyze_tick_progression(game)
            all_tick_records.extend(tick_records)
        except Exception as e:
            print(f"Error processing game {game.get('gameId', 'unknown')}: {e}")
            continue
    
    # Write comprehensive tick-by-tick CSV
    if all_tick_records:
        fieldnames = list(all_tick_records[0].keys())
        
        with open(csv_output, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for row in all_tick_records:
                writer.writerow(row)
        
        # Calculate summary statistics
        total_ticks = len(all_tick_records)
        unique_games = len(set(r['gameId'] for r in all_tick_records))
        avg_ticks_per_game = total_ticks / unique_games
        
        # Volatility analysis
        volatilities = [r['rolling_volatility'] for r in all_tick_records if r['rolling_volatility'] > 0]
        avg_volatility = mean(volatilities) if volatilities else 0
        
        # Trading activity analysis
        total_trades = sum(r['buy_orders_at_tick'] + r['sell_orders_at_tick'] for r in all_tick_records)
        avg_trades_per_tick = total_trades / total_ticks
        
        # Rug proximity analysis
        near_rug_ticks = [r for r in all_tick_records if r['is_near_rug']]
        near_rug_volatility = mean([r['rolling_volatility'] for r in near_rug_ticks if r['rolling_volatility'] > 0]) if near_rug_ticks else 0
        
        print(f"\\n✅ Tick-by-tick analysis complete!")
        print(f"📊 Generated: {csv_output}")
        print(f"📈 Total tick records: {total_ticks:,}")
        print(f"🎮 Games analyzed: {unique_games}")
        print(f"📋 Average ticks per game: {avg_ticks_per_game:.1f}")
        print(f"📊 Fields per tick: {len(fieldnames)}")
        
        print(f"\\n🎯 TICK-LEVEL INSIGHTS:")
        print(f"   • Average volatility: {avg_volatility:.6f}")
        print(f"   • Average trades per tick: {avg_trades_per_tick:.2f}")
        print(f"   • Near-rug volatility: {near_rug_volatility:.6f}")
        print(f"   • Volatility spike before rug: {near_rug_volatility / max(avg_volatility, 0.000001):.2f}x")
        
        print(f"\\n📋 ANALYSIS CAPABILITIES:")
        print("   • Price movement and volatility tracking")
        print("   • Player trading patterns by tick")
        print("   • Rug proximity indicators and warnings")
        print("   • Timing anomaly detection")
        print("   • Market pressure analysis")
        print("   • Rolling volatility calculations")
        
        return all_tick_records
    else:
        print("❌ No tick data processed")
        return []

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python tick_by_tick_analysis.py <input_jsonl> <output_csv>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    analyze_all_games_tick_by_tick(input_file, output_file)