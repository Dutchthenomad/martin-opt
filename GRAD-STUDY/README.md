# GRAD-STUDY Knowledge Base

A comprehensive research and system-wide knowledge base for the Rugs.fun PRNG game analysis project.

## Directory Structure

### 01-CORE-SPECS/
Core technical specifications and unified documentation.

- **rugs-game-phases-unified.md** - Complete game phase documentation (Active → Rugged → Presale loop)
- **rugs-websocket-complete-guide.md** - WebSocket integration reference with Socket.io configuration
- **rugs-data-schema-unified.md** - Comprehensive data field definitions and structures
- **rugs-player-mechanics.md** - Player update mechanics and behavior documentation

### 02-ANALYSIS/

#### BAYESIAN/
Bayesian modeling and statistical analysis.
- **bayesian-models.md** - Bayesian approaches to game analysis
- **rugs-bayesian-data.csv** - Bayesian analysis dataset

#### PRNG/
Pseudo-random number generator analysis and prediction research.
- **PRNG_Master_Analysis.md** - Master analysis of PRNG patterns and meta-algorithms
- **prng-mechanics-unified.md** - PRNG mechanics documentation
- **prng-reverse-engineering.md** - Reverse engineering analysis
- **prng-reverse-engineering-plan.md** - Detailed reverse engineering methodology
- **prng-prediction-research.pdf** - Advanced ML prediction approaches
- **prediction-methodology-plan.pdf** - Prediction methodology research

#### TRADING/
Trading analysis, patterns, and implementation guides.
- **trading-zones-analysis.md** - Trading zone patterns and analysis
- **tick-by-tick-guide.md** - Tick-by-tick analysis methodology
- **volatility-reference.md** - Volatility calculations and logarithmic references
- **comprehensive-analysis-report.md** - Complete trading analysis report
- **individual-player-trading-data.md** - Individual player behavior analysis
- **player-integrated-csv-guide.md** - Guide to player-integrated data format
- **practical-implementation-notes.txt** - Implementation notes and tips

### 03-IMPLEMENTATION/

#### CODE/
Python scripts and analysis tools.
- **analyze-rugs-data.py** - Main data analysis script
- **player-integrated-analysis.py** - Player-specific analysis
- **tick-by-tick-analysis.py** - Tick-by-tick analysis implementation
- **probability-game-notebook.py** - Probability calculations notebook

#### DATA/
Datasets for analysis.
- **player-integrated-data.csv** - Integrated player trading data
- **rugs-bayesian-data.csv** - Bayesian analysis dataset

#### UI/
User interface components.
- **basic-rugs-dashboard.html** - Interactive dashboard for data visualization

### 04-RESEARCH/

#### external-conversations/
External research discussions and AI conversations.
- **gemini-conversation.pdf** - Gemini AI conversation analysis
- **activepieces-claude-research.md** - ActivePieces Claude integration research

#### methodology/
Research methodologies and approaches.
- **martingale-calculator-research.md** - Martingale strategy calculator research
- **game-prompt.md** - Game system prompts and specifications

#### references/
External references and resources.
- **best-ai-frontend-assistants.pdf** - AI frontend assistant comparison

## Quick Start Guide

1. **Understanding the Game**: Start with `01-CORE-SPECS/rugs-game-phases-unified.md`
2. **WebSocket Integration**: Refer to `01-CORE-SPECS/rugs-websocket-complete-guide.md`
3. **Data Fields**: See `01-CORE-SPECS/rugs-data-schema-unified.md` for all field definitions
4. **Analysis Tools**: Check `03-IMPLEMENTATION/CODE/` for ready-to-use Python scripts
5. **Trading Strategies**: Explore `02-ANALYSIS/TRADING/` for patterns and strategies

## Key Insights

- The game operates on a 3-phase loop with PRNG-determined outcomes
- WebSocket provides real-time data streams (listen-only connection)
- Multiple analytical approaches: Bayesian, PRNG pattern analysis, trading zones
- Player behavior follows identifiable patterns (whales, sharks, cautious players)

## Recent Updates

- Consolidated overlapping documentation into unified files
- Standardized naming conventions (lowercase with hyphens)
- Organized content by function (specs, analysis, implementation, research)
- Removed ~10 redundant files through consolidation
- Created clear navigation structure

## Contributing

When adding new content:
1. Follow the established naming convention (lowercase-with-hyphens)
2. Place files in appropriate directories based on content type
3. Update this README with new additions
4. Avoid creating duplicate content - check existing files first