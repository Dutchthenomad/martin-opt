# 🎯 Martingale Side Bet Predictor v5.2

A sophisticated real-time betting assistance system for rugs.fun with persistent data collection to filesystem.

## 🚀 New in v5.2
- **Filesystem Data Saving**: All game data now saved to disk automatically
- **Data Save Server**: Node.js server handles file operations (browsers can't write files directly)
- **Automatic Backups**: Games saved individually + batch saves every 50 games
- **Cold Start Loading**: Automatically loads historical data on startup
- **Server Status Monitoring**: Real-time connection status in developer dashboard

## 🚀 Features

- **Real-time WebSocket Integration**: Live connection to rugs.fun backend
- **Statistical Analysis**: Dynamic statistics from collected game data
- **Martingale Strategy Engine**: Progressive betting recommendations
- **Dual Interface**: Terminal dashboard + Enhanced mobile HTML interface
- **Risk Assessment**: Real-time volatility and probability analysis
- **Session Management**: Active betting session tracking
- **Persistent Data Collection**: Automatic saves to filesystem
- **Developer Dashboard**: Built-in debugging and monitoring tools
- **Toast Notifications**: Non-blocking alerts for better UX
- **Responsive UI**: Fixed button issues, smooth interactions

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)

### Setup
```bash
# Clone or download this folder to your computer

# Navigate to the v5_martingale_optimizer folder
cd side-bet-predictor/versions/v5_martingale_optimizer

# Install dependencies
npm install
```

## 🎮 Usage - IMPORTANT: Follow These Steps!

### Easy Method: Use the Start Script
**Windows:** Double-click `START.bat`
**Mac/Linux:** Run `./START.sh`

This will:
1. Start the data save server automatically
2. Open the dashboard in your browser
3. Show you what to check for

### Manual Method:

#### Step 1: Start the Data Save Server (REQUIRED!)
```bash
# In the v5_martingale_optimizer folder, run:
node data-save-server.js

# You should see:
# 🚀 Data Save Server started
# 📡 Listening on port 9876
# 📁 Data directory: .../data/predictor-data
```
**⚠️ Keep this running in a separate terminal window!**

#### Step 2: Use the Mobile Dashboard
```
Open mobile-dashboard.html in any web browser (Chrome/Firefox/Edge)
```

The dashboard will:
1. ✅ Automatically connect to the data server
2. ✅ Load any existing historical data
3. ✅ Save every game to disk automatically
4. ✅ Show "Connected to data save server" toast notification

### Step 3: Verify It's Working
1. **Triple-tap the header** to open Developer Dashboard
2. Look for **"Server: Online"** (green text)
3. Click **"Test Server"** button to verify saves
4. Play or simulate games - you'll see files in `data/predictor-data/`

### Alternative: Terminal Dashboard (Optional)
```bash
# For text-based interface
node player_assistance_dashboard.js
```

## 📊 System Architecture

### Core Components
1. **data-save-server.js**: Node.js server that saves game data to disk (NEW!)
2. **mobile-dashboard.html**: Web interface with automatic data collection
3. **player_assistance_dashboard.js**: Terminal interface with statistical analysis
4. **martingale_session_manager.js**: Session logic and betting strategies

### Data Flow
```
Rugs.fun → WebSocket → Dashboard → Save Server → Filesystem
                           ↓
                    Statistical Analysis
                           ↓
                    Betting Recommendations
```

### Data Storage Structure
```
data/
└── predictor-data/
    ├── game_[timestamp].json      # Individual game files
    ├── rolling_100_games.json     # Last 100 games (auto-updated)
    └── batches/
        ├── batch_[timestamp]_001_summary.json
        └── batch_[timestamp]_001_games.json
```

### Statistical Foundation
- **Historical Games**: 100+ games loaded for baseline analysis
- **Live Games**: Real-time game tracking and analysis
- **Probability Models**: Rug probability calculations for different timeframes
- **Volatility Tracking**: Real-time market volatility assessment

## 🎲 Betting Strategies

### Available Strategies
1. **Conservative**: Lower risk, smaller bets
2. **Moderate**: Balanced risk/reward
3. **Aggressive**: Higher risk, larger potential returns

### Risk Management
- **Position Sizing**: Automatic bet size recommendations
- **Break-even Analysis**: Clear profit/loss projections
- **Max Loss Limits**: Session risk management
- **Confidence Scoring**: Recommendation reliability metrics

## 🛠️ Developer Dashboard

### Access Methods
- **Triple-tap** the header (mobile-friendly)
- Press **'D' key** on desktop
- Click **gear icon** (appears after 10 games collected)

### Dashboard Features
1. **Data Collection Status**
   - Games collected with progress indicator
   - Confidence level (baseline → partial → historical → full)
   - Last game statistics
   - Auto-save countdown

2. **Live Statistics**
   - Mean, median, standard deviation
   - Percentiles (P25, P50, P75, P90, P95)
   - Real-time updates after each game

3. **Current Game Monitor**
   - Live tick counter
   - Current and peak price
   - Game status indicator

4. **Data Management Tools**
   - Export data as JSON
   - Clear all data
   - Force save to localStorage
   - Log stats to console
   - Storage usage info
   - Simulate games for testing

## 🔧 Configuration

### WebSocket Connection
- **URL**: `https://backend.rugs.fun`
- **Transport**: WebSocket with polling fallback
- **Reconnection**: Automatic with 5 attempts

### Statistical Parameters
- **Historical Window**: 100 games for baseline
- **Live Updates**: Real-time game tracking
- **Volatility Thresholds**: Configurable risk levels
- **Confidence Levels**: Recommendation reliability scoring

## 📈 Performance Metrics

### Real-time Monitoring
- **Tick Counter**: Live game progress tracking
- **Price Multiplier**: Current game price
- **Volatility**: Market volatility percentage
- **Game Position**: Relative to historical median

### Statistical Analysis
- **Mean/Median**: Historical game duration analysis
- **Probability Models**: Rug probability for different timeframes
- **Risk Assessment**: Current game risk evaluation
- **Recommendation Confidence**: Strategy reliability scoring

## 🛡️ Safety Features

### Risk Warnings
- High volatility alerts
- Early game risk warnings
- Poor confidence recommendations
- Maximum loss limits

### Data Validation
- WebSocket connection monitoring
- Data integrity checks
- Fallback transport mechanisms
- Error handling and recovery

## 📚 Documentation

Additional documentation available in the `docs/` folder:
- `CORE_ISSUE_FIXED.md`: Technical issue resolution record
- `INTEGRATION_TEST_REPORT.md`: System integration testing results

## 🎯 Quick Start

### For Mobile Dashboard (Easiest!)
1. **Open** `mobile-dashboard.html` in any web browser
2. **Wait** for active game to see live data
3. **Triple-tap** header to access developer tools

### For Terminal Dashboard
1. **Install Dependencies**: `npm install`
2. **Run**: `node player_assistance_dashboard.js`

### For Both Interfaces
1. **Install Dependencies**: `npm install`
2. **Terminal**: `node player_assistance_dashboard.js`
3. **Browser**: Open `mobile-dashboard.html`

## ⚠️ Important Notes

- **Manual Betting**: This system provides recommendations only - you place bets manually
- **Risk Management**: Always set personal loss limits
- **Live Data**: System requires active games for real-time updates
- **Historical Foundation**: Statistical analysis improves with more historical data

## 🛠️ Troubleshooting

### Server Won't Start
```bash
# Check if port 9876 is in use
lsof -i :9876

# Kill any existing process
kill -9 [PID]

# Try starting again
node data-save-server.js
```

### Dashboard Shows "Server: Offline"
1. Make sure data-save-server.js is running
2. Check firewall isn't blocking port 9876
3. Try refreshing the dashboard page
4. Click "Test Server" in developer dashboard

### No Data Being Saved
1. Check `data/predictor-data/` folder for new files
2. Look at server terminal for save confirmations
3. Verify "Server: Online" in developer dashboard
4. Try "Simulate Game" to test saves

## 📁 What Your Friend Gets

When you send this folder, they'll have:
- All necessary files to run the system
- Your historical data (if you include the data folder)
- Automatic data collection that works immediately
- No complex setup required

## 🔄 Version History

### v5.2 (Current)
- ✅ Filesystem data persistence via Node.js server
- ✅ Automatic game saves to disk
- ✅ Cold start data loading
- ✅ Server status monitoring
- ✅ Batch saves every 50 games
- ✅ Data export to specific directory structure

### v5.1
- ✅ Toast notifications replace blocking alerts
- ✅ Fixed button responsiveness issues
- ✅ Real-time data collection system
- ✅ Developer dashboard with debugging tools
- ✅ Dynamic statistics from collected games
- ✅ localStorage for data persistence

### v5.0
- ✅ Fixed WebSocket data field mapping
- ✅ Dual interface (Terminal + HTML)
- ✅ Complete statistical analysis engine
- ✅ Real-time martingale recommendations
- ✅ Mobile-responsive design
- ✅ Session management system

---

**🎯 Ready for production use with persistent data collection to filesystem!**

## 💡 Quick Tips for Your Friend

1. **Always start the data server first** - Without it, data only saves to browser storage
2. **Check developer dashboard** - Triple-tap header to see all stats and server status
3. **Data is valuable** - The more games collected, the better the predictions
4. **Backup regularly** - Copy the `data/predictor-data` folder periodically
5. **Leave it running** - System can collect data 24/7 if left running 