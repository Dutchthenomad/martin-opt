# CLAUDE.md - v5.3 Mobile Dashboard with Post-500 Tracking & Data Consolidation

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Version: v5.3 (January 2025) - Cleanup Completed

### ✅ CRITICAL ISSUES FIXED
1. **Missing Post-500 UI Elements** - ✅ HTML/CSS added
2. **Batch Overflow** - ✅ Fixed to cap at 50 games
3. **Storage Calculation** - ✅ Now includes server data
4. **Data Bloat** - ✅ rolling_100_games.json reduced from 60MB to 20KB
5. **File Accumulation** - ✅ 2752 game files archived, batches created

### Major Features Added
1. **Filesystem Data Persistence**: All games now save to disk automatically via Node.js server
2. **Data Save Server**: Runs on port 9876, handles all file operations
3. **Total Games Tracking**: Tracks cumulative games collected (not just last 100)
4. **Enhanced Developer Dashboard**: Shows server status, total games, batch progress, volatility
5. **Automatic Cold Start Loading**: Loads historical data from server on startup
6. **Dynamic Statistics**: Gracefully transitions from baseline → blended → full empirical stats
7. **Real-time Volatility Tracking**: 6 volatility metrics calculated tick-by-tick
8. **Volatility-Adjusted Confidence**: Reduces confidence during high volatility periods

## Working Setup Commands

```bash
# Install dependencies (if not already done)
npm install

# Start data save server (REQUIRED for filesystem saves)
node data-save-server.js

# Open mobile dashboard in browser
# Games will auto-save to ../data/predictor-data/
```

### ⚠️ Data Directory Issues
- Server saves to: `../data/predictor-data/` (relative to v5_martingale_optimizer)
- This resolves to: `/side-bet-predictor/versions/data/predictor-data/`
- Also exists: `/side-bet-predictor/data/` (old location)
- Migration needed to consolidate data

## Project Architecture

### Core Components
1. **data-save-server.js** - Node.js server for filesystem operations
   - Port: 9876
   - Saves individual games + batches every 50 games
   - Maintains rolling_100_games.json
   - Provides load-history endpoint

2. **mobile-dashboard.html** - Main interface
   - WebSocket connection to rugs.fun
   - Posts game data to save server
   - Developer dashboard (triple-tap header)
   - Toast notifications for all events

3. **player_assistance_dashboard.js** - Terminal interface
   - Loads historical data from ../data/batches/
   - Provides text-based recommendations

## Critical WebSocket Field Names

**IMPORTANT**: These field names are CORRECT and working:
```javascript
// From rugs.fun WebSocket
data.tickCount    // Current tick number
data.price        // Current multiplier
data.active       // Game active status
data.cooldownTimer // >0 means game ended (KEY for detection)
```

## Data Flow

```
1. Game ends → cooldownTimer > 0 detected
2. Game data saved to:
   - localStorage (backup)
   - Save server via POST /save-game
   - Server writes to data/predictor-data/
3. Developer dashboard updates every second
4. Batch saves every 50 games automatically
```

## Known Issues & Solutions

### Issue: Game End Detection
**Solution**: Use `data.cooldownTimer > 0` in gameStateUpdate (NOT gameResult event which doesn't exist)

### Issue: Total Games Tracking
**Solution**: Added totalGamesCollected variable that persists across sessions

### Issue: Developer Dashboard Not Updating
**Solution**: setInterval runs updateDevDashboard() every 1000ms when dashboard is open

## Recent Fixes (v5.2)

1. **Total Games Counter**: 
   - Added totalGamesCollected tracking
   - Persists in localStorage and server saves
   - Shows in dev dashboard as "Total Collected"

2. **Batch Progress Display**:
   - Changed from "X games remaining" to "X/50" format
   - Clearer progress indication

3. **Statistical Display**:
   - Added null checks for all stats
   - Shows '-' when no data available
   - Prevents NaN errors

4. **Server Integration**:
   - Returns totalGamesCollected in load-history
   - Maintains count across server restarts
   - Updates rolling file properly

5. **Dynamic Statistics Implementation**:
   - Baseline stats (1000+ games empirical data) for cold start
   - Intelligent blending: 0-19 games use baseline, 20-99 blend with actual, 100+ pure actual
   - Dynamic zones: P25/P75 percentiles adjust based on collected data
   - Confidence levels: baseline/partial/historical/full

6. **Volatility Tracking**:
   - 6 metrics: standard deviation, percentage volatility, price range, avg change, max change, acceleration
   - Real-time calculation every tick using 20-tick rolling window
   - Visual indicators: color-coded volatility display (green→yellow→orange→red)
   - Volatility-adjusted confidence: reduces entry confidence during high volatility
   - Extreme volatility zone: special warning with pulsing animation

7. **Developer Dashboard Enhancements**:
   - Added volatility display and status
   - Color-coded volatility status indicator
   - Volatility metrics saved with each game

## Data Storage Structure (Fixed)

```
versions/data/predictor-data/
├── archive/                   # Archived individual game files
│   └── games_[timestamp]/     # 2752 archived files
├── batches/                   # Properly organized batches
│   └── batch_cleanup_XXX.json # 56 batch files (50 games each)
└── rolling_100_games.json     # Fixed: 20KB (was 60MB)
```

## Proposed v5.3 Structure

```
martingale-optimizer-v5.3/
├── src/
│   ├── core/              # Core logic files
│   ├── ui/                # Dashboard files
│   ├── server/            # Backend server
│   └── analysis/          # Analysis scripts
├── data/
│   ├── live/              # Active game data
│   ├── historical/        # Analysis results
│   └── calibration/       # Baseline data
├── docs/                  # Documentation
├── config/                # Configuration
└── scripts/               # Utility scripts
```

## Developer Dashboard Features

Triple-tap header to access:
- **Games**: X/100 (rolling window)
- **Total Collected**: All-time count
- **Confidence**: baseline/partial/historical/full
- **Last Game**: Duration in ticks
- **Batch Progress**: X/50 (⚠️ BROKEN - shows 2143+)
- **Server**: Online/Offline status
- **Statistics**: Mean, median, std dev, quartiles
- **Current Game**: Live tick, price, peak, status
- **Post-500**: Game X/3 status (⚠️ NOT DISPLAYING)
- **Storage Info**: ⚠️ Shows 0KB (only checks localStorage)

### Known Issues
- Uses `alert()` instead of toast notifications
- Storage calculation ignores server data
- Post-500 row might not insert properly

## Testing Checklist

1. ✅ Server running (port 9876)
2. ✅ Dashboard shows "Server: Online" (green)
3. ✅ Games save to filesystem
4. ✅ Total games increment properly
5. ✅ Batch saves at 50 games
6. ✅ Stats update in real-time
7. ✅ Cold start loads historical data

## What NOT to Change

1. WebSocket field names (tickCount, price, cooldownTimer)
2. Port 9876 for save server
3. Game end detection logic
4. ~~Data directory structure~~ (NEEDS RESTRUCTURING)

## Cleanup Status (v5.3)

### Phase 1: Critical Bug Fixes ✅ COMPLETED
- [x] Add missing post-500 indicator HTML/CSS
- [x] Fix recordGameCompletion parameter passing
- [x] Fix batch reset logic (cap at 50)
- [x] Fix storage info calculation
- [x] Replace alerts with toasts

### Phase 2: Data Cleanup ✅ COMPLETED
- [x] Create migration script (data_cleanup.js)
- [x] Archive 2752 individual game files
- [x] Fix rolling_100_games.json (60MB → 20KB)
- [x] Create proper batch structure (56 batches)

### Phase 3: Code Organization - PENDING
- [ ] Implement new folder structure
- [ ] Update all paths
- [ ] Create config system

### Phase 4: Enhancements - PENDING
- [ ] Add proper logging
- [ ] Implement data export
- [ ] Create backup system

### Phase 5: Testing & Docs - PENDING
- [ ] Update all documentation
- [ ] Create test suite
- [ ] Add setup guide

## Cleanup Scripts Created

1. **data_cleanup.js** - Archives individual game files, creates batches
2. **fix_rolling_file.js** - Reduces rolling file size by keeping only essential data

## Environment

- Runs in browser (Chrome/Firefox/Edge)
- Requires Node.js for save server
- WebSocket to backend.rugs.fun
- localStorage for backup/cache

## Implemented Enhancement: Post-500+ Sequence Tracking & ML Integration

### Overview
Based on analysis of 79 sequences following 500+ tick games, we discovered predictable patterns that have been integrated into the system for improved predictions and risk assessment.

### Key Discoveries from Historical Analysis

1. **Game 1** (immediately after 500+):
   - Average length: 183.2 ticks (-7.3% vs baseline)
   - Early rug rate: 20.3% (similar to baseline)
   - 500+ probability: 3.8% (less than half baseline)
   - Risk adjustment: +5%

2. **Game 2** (two games after 500+):
   - Average length: 191.3 ticks (-3.2% vs baseline)
   - Early rug rate: 26.6% (highest volatility)
   - 500+ probability: 8.9% (back to baseline)
   - Risk adjustment: +15%

3. **Game 3** (three games after 500+):
   - Average length: 229.4 ticks (+16.1% vs baseline)
   - Early rug rate: 22.8% (normalized)
   - 500+ probability: 11.4% (40% above baseline)
   - Risk adjustment: -5%

### Implementation Details

#### 1. Enhanced Survival Calculator (`survival_calculator.js`)
- Added `post500Position` tracking (0-3)
- Post-500 statistics constants for each position
- Risk score adjustments based on sequence position
- New methods:
  - `getPost500Context()`: Returns current sequence status
  - `getPost500Warning()`: Provides position-specific warnings
  - `getClusteringMetrics()`: Analyzes 500+ game clustering

#### 2. UI Updates (`mobile-dashboard.html`)
- Post-500 sequence indicator with visual states:
  - Yellow border + mild warning for Game 1
  - Orange pulsing animation for Game 2 (danger zone)
  - Green border for Game 3 (opportunity)
- Developer dashboard shows "Post-500: Game X/3" status
- Risk assessment automatically adjusts based on position

#### 3. ML Feature Extraction (`ml_feature_extractor.js`)
- 20+ new features for machine learning models:
  - One-hot encoding: `isPost500Game1`, `isPost500Game2`, `isPost500Game3`
  - Risk adjustments: `expectedLengthAdjustment`, `post500EarlyRugRate`
  - Interaction features: `positionXvolatility`, `positionXtick`
  - Temporal features: `gamesUntilExpected500`, `inOpportunityWindow`
  - Clustering metrics: `recent500Count30`, `clusterDensity`

### Benefits

1. **More Accurate Predictions**: Adjusts expectations based on post-500 position
2. **Better Risk Management**: Warns about Game 2 volatility spike (26.6% early rug rate)
3. **Opportunity Recognition**: Highlights Game 3's favorable odds (+16.1% duration)
4. **ML Model Enhancement**: Rich feature set captures sequence dynamics

### Testing
Run `node test_post500_integration.js` to validate:
- Sequence tracking (0→1→2→3→0 cycle)
- Risk score adjustments
- ML feature extraction
- Clustering detection

### Visual Indicators
- **Game 1**: "Game 1/3: Mild exhaustion effect"
- **Game 2**: "Game 2/3: ⚠️ High volatility zone" (with pulsing animation)
- **Game 3**: "Game 3/3: ✨ Recovery opportunity"

### Data Patterns (from 972 games analysis)
- **Base rate**: 8.23% of games exceed 500 ticks
- **Clustering**: 24.1% chance of another 500+ within 3 games
- **Survival curves**: Exponential decay with milestone probabilities
- **Average cycle**: 11.9 games between 500+ occurrences

## Recommendation Tracking System (v5.3.1)

### Overview
Implemented a comprehensive recommendation tracking system to measure actual EXIT/HOLD accuracy (replacing guessed 63%/78% metrics).

### Key Components

1. **Frontend Tracking** (`mobile-dashboard.html`)
   - `trackRecommendation()` - Logs each recommendation with game state
   - `checkRecommendationOutcome()` - Measures accuracy when games end
   - Tracks outcomes across multiple windows: 10, 20, 30, 40, 50, 60, 70 ticks
   - Saves recommendations in batches of 25

2. **Server Endpoint** (`data-save-server.js`)
   - `POST /save-recommendations` - Stores recommendation tracking data
   - Calculates accuracy statistics by time window
   - Saves to `data/recommendations/` directory

3. **Analysis Tool** (`recommendation_analyzer.js`)
   - Analyzes performance by type, risk score, volatility, post-500 position
   - Identifies patterns: perfect exits, false exits, missed opportunities
   - Generates actionable insights

4. **Developer Dashboard Updates**
   - Shows real-time accuracy: overall%, 40-tick%, 70-tick%
   - Fixed layout bug (changed from table to div structure)
   - Displays in Statistics section

### Usage
```bash
# Collect data
node src/server/data-save-server.js
# Open dashboard and let it run

# Analyze performance
node src/analysis/recommendation_analyzer.js
```

### Data Format
Recommendations are tracked with:
- Game state (tick, price, volatility, post-500 position)
- Recommendation type and confidence
- Risk score and expected value
- Outcome (ticks elapsed, accuracy by window)

## SideBetSysArc Integration (COMPLETED)

### Phase 1: 6-Zone Probability Framework ✅
Implemented mathematical zones based on 40-tick rug probability:
- **Avoid**: <10% (never bet)
- **Danger**: 10-15% (negative EV)
- **Breakeven**: 15-20% (16.67% threshold)
- **Profit**: 20-30% (positive EV)
- **High Profit**: 30-50% (strong bet)
- **Certainty**: >50% (maximum bet)

### Hidden Patterns Implemented ✅
- 84% instarug probability after 50x cumulative wins
- 78% volatility spike in final 5 ticks before rug
- Adjusted timing for actual 271.5ms tick time

## Enhanced Developer Dashboard (v5.3.2) ✅

### Fixed Issues
1. **Null Reference Errors**: Added `safeUpdate()` helper function to check element existence
2. **Legacy Elements**: Removed references to non-existent elements from old dashboard
3. **Tab Switching**: Fixed panel visibility and active tab state management
4. **Error Handling**: Added proper error checking throughout dashboard code

### Features
- 6 tabs: Overview, Zones, Patterns, Martingale, History, Analytics
- Real-time zone visualization with probability bars
- Pattern detection status with confidence indicators
- Martingale sequence tracking with risk levels
- Historical game browser with filtering
- Performance analytics with accuracy metrics

## Project Repository (v5.3.3) ✅

### GitHub Details
- **Repository**: https://github.com/Dutchthenomad/martin-opt
- **Created**: January 24, 2025
- **Structure**: Cleaned and organized for public release
- **Documentation**: Comprehensive README with screenshots

### Key Documentation Created
1. **INTEGRATION_PLAN.md**: Detailed integration architecture for martingale and side bet tracking
2. **API.md**: Complete WebSocket and REST API documentation
3. **README.md**: Project overview with installation instructions and screenshots

### Project Cleanup Completed
- Moved test files to proper directory structure
- Removed temporary and debug files
- Created proper .gitignore and .gitattributes
- Updated package.json with correct metadata
- Added visual documentation (screenshots)

## Current Working Directory
`/mnt/c/Users/nomad/OneDrive/Desktop/JS-TERMINAL-DATA-Collector/martingale-optimizer-v5.3`

## Next Implementation Phase
Phase 1 of INTEGRATION_PLAN.md: Create LiveSideBetTracker in src/services/