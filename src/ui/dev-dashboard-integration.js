/**
 * Enhanced Developer Dashboard Integration
 * 
 * Connects the enhanced dev dashboard to real game data
 * and provides all the advanced analytics features
 */

class EnhancedDevDashboard {
    constructor(gameData, survivalCalc, martingaleManager) {
        this.gameData = gameData;
        this.survivalCalc = survivalCalc;
        this.martingaleManager = martingaleManager;
        
        // Dashboard state
        this.isActive = false;
        this.currentTab = 'overview';
        this.updateInterval = null;
        
        // Data storage
        this.gameHistory = [];
        this.zoneHistory = [];
        this.patternHistory = [];
        this.recommendationHistory = [];
        this.patternAccuracy = {
            instaRug: { detected: 0, correct: 0 },
            volatilitySpike: { detected: 0, correct: 0 },
            plateau: { detected: 0, correct: 0 },
            recovery: { detected: 0, correct: 0 }
        };
        
        // Initialize dashboard
        this.initializeDashboard();
    }
    
    initializeDashboard() {
        // Create dashboard HTML if not exists
        if (!document.getElementById('enhanced-dev-dashboard')) {
            this.injectDashboardHTML();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize chart if available
        this.initializeCharts();
    }
    
    injectDashboardHTML() {
        const dashboardHTML = `
            <div id="enhanced-dev-dashboard" class="enhanced-dev-dashboard">
                <!-- Dashboard content will be injected here -->
            </div>
            
            <div id="dev-toggle-enhanced" class="dev-toggle-enhanced">
                <span>🛠️</span>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    }
    
    setupEventListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('dev-toggle-enhanced');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    toggle() {
        this.isActive = !this.isActive;
        const dashboard = document.getElementById('enhanced-dev-dashboard');
        
        if (this.isActive) {
            dashboard.classList.add('active');
            this.startUpdates();
        } else {
            dashboard.classList.remove('active');
            this.stopUpdates();
        }
    }
    
    startUpdates() {
        this.update();
        this.updateInterval = setInterval(() => this.update(), 100);
    }
    
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    update() {
        if (!this.isActive) return;
        
        // Update based on current tab
        switch (this.currentTab) {
            case 'overview':
                this.updateOverview();
                break;
            case 'zones':
                this.updateZones();
                break;
            case 'patterns':
                this.updatePatterns();
                break;
            case 'martingale':
                this.updateMartingale();
                break;
            case 'history':
                this.updateHistory();
                break;
            case 'analytics':
                this.updateAnalytics();
                break;
        }
        
        // Always update critical indicators
        this.updateCriticalIndicators();
    }
    
    updateOverview() {
        // Current game stats
        this.updateElement('current-tick', this.gameData.tickIndex);
        this.updateElement('current-multi', this.gameData.currentPrice.toFixed(2) + 'x');
        
        // Calculate current volatility
        const volatility = this.calculateCurrentVolatility();
        this.updateElement('current-vol', (volatility * 100).toFixed(2) + '%');
        
        // Get risk assessment
        const risk = this.survivalCalc.assessCurrentRisk(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice
        );
        this.updateElement('risk-score', risk.riskScore.toFixed(0));
        
        // Update zone
        const rugProb = this.survivalCalc.calculate40TickRugProbability(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            this.gameHistory
        );
        const zone = this.survivalCalc.getProbabilityZone(rugProb);
        
        this.updateElement('quick-zone', zone.name + ' Zone');
        const zoneElem = document.getElementById('quick-zone');
        if (zoneElem) zoneElem.style.color = zone.color;
        
        // Update patterns
        this.updateActivePatterns();
        
        // Update recommendation
        const recommendation = this.survivalCalc.getStrategicRecommendationWithZones(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice
        );
        
        this.updateElement('current-rec', recommendation.recommendation);
        this.updateElement('rec-confidence', `Confidence: ${recommendation.confidence}`);
    }
    
    updateZones() {
        const volatility = this.calculateCurrentVolatility();
        const rugProb = this.survivalCalc.calculate40TickRugProbability(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            this.gameHistory
        );
        const zone = this.survivalCalc.getProbabilityZone(rugProb);
        
        // Update zone visualization
        const markerPosition = Math.min(rugProb * 100, 95);
        const marker = document.getElementById('zone-marker');
        if (marker) marker.style.left = markerPosition + '%';
        
        // Update zone info
        this.updateElement('zone-name', zone.name);
        this.updateElement('rug-prob', (rugProb * 100).toFixed(1) + '%');
        this.updateElement('zone-ev', (zone.expectedValue * 100).toFixed(1) + '%');
        this.updateElement('zone-rec', zone.recommendation);
        
        // Add to history every 10 ticks
        if (this.gameData.tickIndex % 10 === 0 && this.gameData.gameActive) {
            this.addZoneHistory(zone, rugProb);
        }
    }
    
    updatePatterns() {
        if (!this.gameHistory.length) return;
        
        const volatility = this.calculateCurrentVolatility();
        const patterns = this.survivalCalc.detectHiddenPatterns(
            this.gameHistory,
            this.gameData.tickIndex,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            volatility
        );
        
        // Update pattern displays
        this.updatePatternDisplay('pattern-insta', patterns.instaRugPattern, patterns.details.instaRug);
        this.updatePatternDisplay('pattern-vol', patterns.volatilitySpikePattern, patterns.details.volatilitySpike);
        this.updatePatternDisplay('pattern-plateau', patterns.plateauPattern, patterns.details.plateau);
        this.updatePatternDisplay('pattern-recovery', patterns.recoveryPattern, patterns.details.recovery);
        
        // Update accuracy stats
        this.updatePatternAccuracy();
    }
    
    updatePatternDisplay(elementId, isActive, details) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (isActive) {
            element.classList.add('active');
            if (details) {
                const detailsElem = element.querySelector('.pattern-details');
                if (detailsElem) {
                    let detailText = 'DETECTED! ';
                    
                    if (details.multiplier) {
                        detailText += `Multiplier: ${details.multiplier.toFixed(1)}x`;
                    } else if (details.currentVolatility) {
                        detailText += `Volatility: ${(details.currentVolatility * 100).toFixed(2)}% (${details.ratio.toFixed(1)}x normal)`;
                    } else if (details.duration) {
                        detailText += `Duration: ${details.duration} ticks`;
                    } else if (details.recoveryStrength) {
                        detailText += `Recovery strength: ${details.recoveryStrength.toFixed(1)}x`;
                    }
                    
                    detailsElem.textContent = detailText;
                }
            }
        } else {
            element.classList.remove('active');
        }
    }
    
    updateMartingale() {
        if (!this.martingaleManager) return;
        
        const state = this.martingaleManager.getCurrentState();
        
        // Update purse visualization
        this.updatePurseDisplay(state.purse);
        
        // Update sequence info
        this.updateSequenceDisplay(state.sequence);
        
        // Update risk management
        this.updateRiskManagement(state);
    }
    
    updateActivePatterns() {
        const container = document.getElementById('active-patterns');
        if (!container) return;
        
        const volatility = this.calculateCurrentVolatility();
        const patterns = this.survivalCalc.detectHiddenPatterns(
            this.gameHistory,
            this.gameData.tickIndex,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            volatility
        );
        
        let activePatterns = [];
        if (patterns.instaRugPattern) activePatterns.push('⚠️ Insta-rug');
        if (patterns.volatilitySpikePattern) activePatterns.push('⚡ Volatility Spike');
        if (patterns.plateauPattern) activePatterns.push('⏸️ Plateau');
        if (patterns.recoveryPattern) activePatterns.push('✅ Recovery');
        
        if (activePatterns.length > 0) {
            container.innerHTML = activePatterns.map(p => 
                `<div style="padding: 5px; margin: 2px; background: rgba(255,255,255,0.1); border-radius: 4px;">${p}</div>`
            ).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No patterns detected</div>';
        }
    }
    
    updateCriticalIndicators() {
        // Always visible indicators that update regardless of tab
        const volatility = this.calculateCurrentVolatility();
        const rugProb = this.survivalCalc.calculate40TickRugProbability(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            this.gameHistory
        );
        
        // Update any always-visible indicators here
    }
    
    calculateCurrentVolatility() {
        if (this.gameHistory.length < 5) return 0.002; // Default
        
        const recent = this.gameHistory.slice(-5);
        let totalChange = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const change = Math.abs(recent[i].multiplier - recent[i-1].multiplier);
            totalChange += change / recent[i-1].multiplier;
        }
        
        return totalChange / (recent.length - 1);
    }
    
    addZoneHistory(zone, probability) {
        this.zoneHistory.push({
            timestamp: Date.now(),
            tick: this.gameData.tickIndex,
            zone: zone.name,
            probability: probability,
            expectedValue: zone.expectedValue
        });
        
        // Keep only last 100 entries
        if (this.zoneHistory.length > 100) {
            this.zoneHistory.shift();
        }
        
        // Update display
        this.renderZoneHistory();
    }
    
    renderZoneHistory() {
        const tbody = document.getElementById('zone-history');
        if (!tbody) return;
        
        // Clear existing
        tbody.innerHTML = '';
        
        // Add last 10 entries
        const recent = this.zoneHistory.slice(-10).reverse();
        recent.forEach(entry => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
                <td>${entry.zone}</td>
                <td>${(entry.probability * 100).toFixed(1)}%</td>
                <td>${(entry.expectedValue * 100).toFixed(1)}%</td>
            `;
        });
    }
    
    updatePatternAccuracy() {
        // Update accuracy displays
        Object.keys(this.patternAccuracy).forEach(pattern => {
            const stats = this.patternAccuracy[pattern];
            const accuracy = stats.detected > 0 ? 
                ((stats.correct / stats.detected) * 100).toFixed(0) + '%' : '-';
            
            const elementId = `acc-${pattern.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            this.updateElement(elementId, accuracy);
        });
    }
    
    recordGameEnd(duration, peakMultiplier) {
        // Record game data
        this.gameHistory.push({
            timestamp: Date.now(),
            duration: duration,
            peakMultiplier: peakMultiplier,
            patterns: this.getCurrentPatterns(),
            finalZone: this.getCurrentZone()
        });
        
        // Update pattern accuracy based on outcomes
        this.updatePatternOutcomes(duration);
        
        // Clear current game history
        this.gameHistory = [];
    }
    
    getCurrentPatterns() {
        const volatility = this.calculateCurrentVolatility();
        return this.survivalCalc.detectHiddenPatterns(
            this.gameHistory,
            this.gameData.tickIndex,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            volatility
        );
    }
    
    getCurrentZone() {
        const volatility = this.calculateCurrentVolatility();
        const rugProb = this.survivalCalc.calculate40TickRugProbability(
            this.gameData.tickIndex,
            volatility,
            this.gameData.peakMultiplier || this.gameData.currentPrice,
            this.gameHistory
        );
        return this.survivalCalc.getProbabilityZone(rugProb);
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element && element.textContent !== value) {
            element.textContent = value;
        }
    }
    
    exportData() {
        const data = {
            timestamp: Date.now(),
            gameHistory: this.gameHistory,
            zoneHistory: this.zoneHistory,
            patternHistory: this.patternHistory,
            patternAccuracy: this.patternAccuracy,
            recommendationHistory: this.recommendationHistory
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dev-dashboard-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export for use in mobile dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedDevDashboard;
} else {
    window.EnhancedDevDashboard = EnhancedDevDashboard;
}