# Project Structure

```
martingale-optimizer-v5.3/
├── src/
│   ├── core/                 # Core business logic
│   │   ├── martingale_session_manager.js
│   │   ├── survival_calculator.js
│   │   └── ml_feature_extractor.js
│   ├── ui/                   # User interfaces
│   │   ├── mobile-dashboard.html
│   │   └── player_assistance_dashboard.js
│   ├── server/               # Backend services
│   │   └── data-save-server.js
│   └── analysis/             # Analysis tools
│       ├── analyze_long_games.js
│       └── analyze_post_500_patterns.js
├── data/
│   ├── live/                 # Active game data
│   │   └── rolling_100_games.json
│   ├── historical/           # Analysis results
│   │   ├── batches/         # Game batches
│   │   ├── long_game_stats.json
│   │   └── post_500_analysis.json
│   └── archive/              # Archived game files
├── docs/                     # Documentation
│   ├── README.md
│   ├── CLAUDE.md
│   ├── ROADMAP.md
│   ├── calibration_analysis.md
│   └── post_500_summary.md
├── scripts/                  # Utility scripts
│   ├── START.bat
│   └── START.sh
├── config/                   # Configuration
│   └── paths.json
├── package.json
├── package-lock.json
└── .gitignore
```

## Quick Start

1. Start the data server:
   ```bash
   node src/server/data-save-server.js
   ```

2. Open the dashboard:
   - Open `src/ui/mobile-dashboard.html` in your browser

3. For terminal interface:
   ```bash
   node src/ui/player_assistance_dashboard.js
   ```
