#!/usr/bin/env python3
"""
Player-Integrated PRNG Game Data Analysis
Combines game metrics with detailed player trading analysis
"""
import json
import csv
import sys
from datetime import datetime
from statistics import mean, median, stdev
from collections import defaultdict

def analyze_player_trading(events):
    """Analyze individual player trading patterns from events"""
    trade_events = [e for e in events if e.get('eventType') == 'newTrade']
    
    player_stats = defaultdict(lambda: {
        'trades': 0, 'buy_count': 0, 'sell_count': 0, 'total_volume': 0,
        'total_cost': 0, 'total_proceeds': 0, 'username': 'unknown', 'level': 0,
        'entry_tick': None, 'exit_tick': None, 'buy_prices': [], 'sell_prices': []
    })
    
    # Process each trade
    for trade in trade_events:
        data = trade.get('data', {})
        player_id = data.get('playerId', 'unknown')
        trade_type = data.get('type', 'unknown')
        price = data.get('price', 0)
        qty = data.get('qty', 0)
        tick = data.get('tickIndex', 0)
        
        stats = player_stats[player_id]
        stats['trades'] += 1
        stats['total_volume'] += qty
        stats['username'] = data.get('username', 'unknown')
        stats['level'] = data.get('level', 0)
        
        # Track entry and exit ticks
        if stats['entry_tick'] is None:
            stats['entry_tick'] = tick
        stats['exit_tick'] = tick
        
        if trade_type == 'buy':
            stats['buy_count'] += 1
            stats['total_cost'] += data.get('cost', 0)
            stats['buy_prices'].append(price)
        elif trade_type == 'sell':
            stats['sell_count'] += 1
            stats['total_proceeds'] += data.get('proceeds', 0)
            stats['sell_prices'].append(price)
    
    # Calculate derived metrics
    for player_id, stats in player_stats.items():
        stats['buy_sell_ratio'] = stats['buy_count'] / max(stats['sell_count'], 1)
        stats['avg_trade_size'] = stats['total_volume'] / max(stats['trades'], 1)
        stats['profit_loss'] = stats['total_proceeds'] - stats['total_cost']
        stats['avg_buy_price'] = mean(stats['buy_prices']) if stats['buy_prices'] else 0
        stats['avg_sell_price'] = mean(stats['sell_prices']) if stats['sell_prices'] else 0
        stats['trading_duration'] = (stats['exit_tick'] or 0) - (stats['entry_tick'] or 0)
    
    return dict(player_stats)

def classify_trading_pattern(player_stats, game_duration):
    """Classify player trading behavior pattern"""
    trades = player_stats['trades']
    volume = player_stats['total_volume']
    duration = player_stats['trading_duration']
    entry_tick = player_stats['entry_tick'] or 0
    
    # Classification logic
    if trades >= 5 and volume < 0.1:
        return 'scalper'
    elif trades <= 2 and volume > 1.0:
        return 'whale'
    elif player_stats['sell_count'] == 0:
        return 'hodler'
    elif trades >= 4 and player_stats['buy_count'] == player_stats['sell_count']:
        return 'flipper'
    elif entry_tick < game_duration * 0.3:
        return 'early_bird'
    elif entry_tick > game_duration * 0.7:
        return 'late_joiner'
    else:
        return 'regular'

def calculate_comprehensive_metrics(game):
    """Calculate comprehensive game + player metrics"""
    game_id = game.get('gameId', '')
    timestamp = game.get('recordingStart', '')
    analysis = game.get('analysis', {})
    events = game.get('events', [])
    
    # Basic game metrics
    duration_ticks = analysis.get('finalTick', 0)
    peak_multiplier = analysis.get('peakMultiplier', 0)
    is_instarug = duration_ticks < 11
    total_trades = analysis.get('totalTrades', 0)
    unique_players = analysis.get('uniquePlayers', 0)
    
    # Get final price
    price_progression = analysis.get('priceProgression', [])
    final_price = 0
    if price_progression and len(price_progression) >= 2:
        final_price = price_progression[-2].get('price', 0)
    
    # Trading activity
    trading_activity = analysis.get('tradingActivity', {})
    buy_orders = trading_activity.get('buyOrders', 0)
    sell_orders = trading_activity.get('sellOrders', 0)
    
    # Player analysis
    player_stats = analyze_player_trading(events)
    
    # Player-derived metrics
    total_players_trading = len(player_stats)
    if player_stats:
        top_player_volume = max(p['total_volume'] for p in player_stats.values())
        total_game_volume = sum(p['total_volume'] for p in player_stats.values())
        avg_player_trades = mean([p['trades'] for p in player_stats.values()])
        avg_player_volume = mean([p['total_volume'] for p in player_stats.values()])
        
        # Player concentration metrics
        top_player_volume_ratio = top_player_volume / max(total_game_volume, 0.001)
        
        # Trading pattern distribution
        patterns = [classify_trading_pattern(p, duration_ticks) for p in player_stats.values()]
        pattern_counts = {pattern: patterns.count(pattern) for pattern in set(patterns)}
        
        # Profit/loss analysis
        profitable_players = sum(1 for p in player_stats.values() if p['profit_loss'] > 0)
        profitable_player_ratio = profitable_players / len(player_stats)
        
        total_profits = sum(max(0, p['profit_loss']) for p in player_stats.values())
        total_losses = abs(sum(min(0, p['profit_loss']) for p in player_stats.values()))
        
        # Entry timing analysis
        early_entries = sum(1 for p in player_stats.values() if (p['entry_tick'] or 0) < duration_ticks * 0.3)
        late_entries = sum(1 for p in player_stats.values() if (p['entry_tick'] or 0) > duration_ticks * 0.7)
        
        # Player level analysis
        avg_player_level = mean([p['level'] for p in player_stats.values() if p['level'] > 0])
        high_level_players = sum(1 for p in player_stats.values() if p['level'] > 30)
        
    else:
        # Defaults if no player data
        top_player_volume_ratio = 0
        avg_player_trades = 0
        avg_player_volume = 0
        profitable_player_ratio = 0
        total_profits = 0
        total_losses = 0
        early_entries = 0
        late_entries = 0
        avg_player_level = 0
        high_level_players = 0
        pattern_counts = {}
    
    # Risk assessment
    duration_risk = max(0, 1 - (duration_ticks / 500))  # Normalized risk
    concentration_risk = top_player_volume_ratio
    activity_risk = min(total_trades / 100, 1)
    
    composite_risk = (0.4 * duration_risk + 0.3 * concentration_risk + 0.3 * activity_risk)
    
    return {
        # Basic identifiers
        'gameId': game_id,
        'timestamp': timestamp,
        
        # Core game metrics
        'duration_ticks': duration_ticks,
        'peak_multiplier': round(peak_multiplier, 3),
        'final_price': round(final_price, 6),
        'is_instarug': is_instarug,
        
        # Trading overview
        'total_trades': total_trades,
        'unique_players': unique_players,
        'buy_orders': buy_orders,
        'sell_orders': sell_orders,
        'buy_sell_ratio': round(buy_orders / max(sell_orders, 1), 3),
        
        # Player activity metrics
        'players_actually_trading': total_players_trading,
        'avg_trades_per_player': round(avg_player_trades, 2),
        'avg_volume_per_player': round(avg_player_volume, 3),
        'top_player_volume_ratio': round(top_player_volume_ratio, 3),
        
        # Player profitability
        'profitable_players': profitable_players if player_stats else 0,
        'profitable_player_ratio': round(profitable_player_ratio, 3),
        'total_profits': round(total_profits, 3),
        'total_losses': round(total_losses, 3),
        'profit_loss_ratio': round(total_profits / max(total_losses, 0.001), 3),
        
        # Player timing behavior
        'early_entry_players': early_entries,
        'late_entry_players': late_entries,
        'early_entry_ratio': round(early_entries / max(total_players_trading, 1), 3),
        
        # Player demographics
        'avg_player_level': round(avg_player_level, 1),
        'high_level_players': high_level_players,
        'high_level_ratio': round(high_level_players / max(total_players_trading, 1), 3),
        
        # Trading pattern distribution
        'scalpers': pattern_counts.get('scalper', 0),
        'whales': pattern_counts.get('whale', 0),
        'hodlers': pattern_counts.get('hodler', 0),
        'flippers': pattern_counts.get('flipper', 0),
        'early_birds': pattern_counts.get('early_bird', 0),
        'late_joiners': pattern_counts.get('late_joiner', 0),
        'regular_traders': pattern_counts.get('regular', 0),
        
        # Risk assessment
        'duration_risk': round(duration_risk, 3),
        'concentration_risk': round(concentration_risk, 3),
        'activity_risk': round(activity_risk, 3),
        'composite_risk_score': round(composite_risk, 3)
    }

def analyze_games_with_players(jsonl_file, csv_output):
    """Analyze games with integrated player data"""
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
    
    # Calculate comprehensive metrics
    comprehensive_data = []
    for game in games:
        try:
            metrics = calculate_comprehensive_metrics(game)
            comprehensive_data.append(metrics)
        except Exception as e:
            print(f"Error processing game {game.get('gameId', 'unknown')}: {e}")
            continue
    
    # Write comprehensive CSV
    if comprehensive_data:
        fieldnames = list(comprehensive_data[0].keys())
        
        with open(csv_output, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for row in comprehensive_data:
                writer.writerow(row)
        
        print(f"✅ Player-integrated analysis complete!")
        print(f"📊 Generated: {csv_output}")
        print(f"📈 Records: {len(comprehensive_data)}")
        print(f"📋 Fields: {len(fieldnames)}")
        print("\n🎯 PLAYER-INTEGRATED METRICS INCLUDED:")
        print("   • Game Core: Duration, Peak, Risk Assessment")
        print("   • Player Activity: Trading counts, volume distribution")
        print("   • Player Profitability: Profits, losses, success rates")
        print("   • Player Timing: Entry patterns, early vs late behavior")
        print("   • Player Types: Scalpers, whales, hodlers, flippers")
        print("   • Player Demographics: Levels, experience distribution")
        print("   • Risk Analysis: Concentration, activity, duration risks")
        
        return comprehensive_data
    else:
        print("❌ No data processed")
        return []

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python player_integrated_analysis.py <input_jsonl> <output_csv>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    analyze_games_with_players(input_file, output_file)