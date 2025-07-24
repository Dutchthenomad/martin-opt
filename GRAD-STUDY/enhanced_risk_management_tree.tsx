import React, { useState } from 'react';

// Core constants
const BETTING_SEQUENCE = [0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.128, 0.256, 0.512];
const PAYOUT_RATIO = 5;
const INITIAL_PURSE = 0.5;

/**
 * Simple purse visualization
 */
const PurseDisplay = ({ purse, totalBetsSoFar }) => {
  const percentage = (purse / INITIAL_PURSE) * 100;
  const totalLost = INITIAL_PURSE - purse;
  
  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-blue-300 mb-2">Purse</h3>
      
      {/* Visual purse */}
      <div className="relative w-full h-24 bg-gray-800 rounded-lg mb-3 overflow-hidden">
        <div 
          className="absolute bottom-0 left-0 bg-blue-500 transition-all duration-500"
          style={{ width: '100%', height: `${percentage}%` }}
        >
          <div className="absolute top-1 left-2 text-white text-sm font-bold">
            {purse.toFixed(3)} SOL
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-gray-400">Remaining</div>
          <div className="text-blue-400 font-bold">{purse.toFixed(3)} SOL</div>
        </div>
        <div>
          <div className="text-gray-400">Already Bet</div>
          <div className="text-red-400 font-bold">{totalBetsSoFar.toFixed(3)} SOL</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Risk management strategies for Level 5+
 */
const getRiskStrategies = (level, purse) => {
  if (level < 5) return null;
  
  return {
    conservative: Math.max(0.001, purse * 0.02), // 2% of remaining purse
    moderate: Math.max(0.001, purse * 0.05),     // 5% of remaining purse 
    aggressive: Math.max(0.001, purse * 0.1)     // 10% of remaining purse
  };
};

/**
 * Main application
 */
const App = () => {
  const [level, setLevel] = useState(1);
  const [purse, setPurse] = useState(INITIAL_PURSE);
  const [totalBetsSoFar, setTotalBetsSoFar] = useState(0); // Total amount bet in this sequence
  const [currentBet, setCurrentBet] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  // Calculate what the net profit would be if we win the current bet
  const calculateNetProfitIfWin = () => {
    if (!currentBet) return 0;
    const payout = currentBet * PAYOUT_RATIO; // What we get back
    const netProfit = payout - totalBetsSoFar - currentBet; // Subtract all money bet so far
    return netProfit;
  };

  // Place a bet
  const placeBet = (betAmount) => {
    if (betAmount > purse) return;
    
    setPurse(prev => prev - betAmount);
    setTotalBetsSoFar(prev => prev + betAmount);
    setCurrentBet(betAmount);
  };

  // Win the current bet
  const winBet = () => {
    if (!currentBet) return;
    
    const payout = currentBet * PAYOUT_RATIO;
    setPurse(prev => prev + payout);
    setGameOver(true);
    setWon(true);
  };

  // Lose the current bet
  const loseBet = () => {
    if (!currentBet) return;
    
    setGameOver(true);
    setWon(false);
  };

  // Continue to next level (SAME or DOUBLE) - REMOVED UNUSED FUNCTION

  // Reset game
  const resetGame = () => {
    setLevel(1);
    setPurse(INITIAL_PURSE);
    setTotalBetsSoFar(0);
    setCurrentBet(null);
    setGameOver(false);
    setWon(false);
  };

  const standardBet = level <= BETTING_SEQUENCE.length ? BETTING_SEQUENCE[level - 1] : 0.512;
  const riskStrategies = getRiskStrategies(level, purse);
  const netProfitIfWin = calculateNetProfitIfWin();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-blue-400 text-center mb-8">
          Martingale Calculator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purse Display */}
          <div>
            <PurseDisplay purse={purse} totalBetsSoFar={totalBetsSoFar} />
            
            {/* Emergency Alert */}
            {purse < INITIAL_PURSE * 0.2 && (
              <div className="mt-4 bg-red-800 p-3 rounded-lg border border-red-600">
                <div className="text-red-100 font-bold">⚠️ LOW PURSE</div>
                <div className="text-red-200 text-sm">Only {((purse/INITIAL_PURSE)*100).toFixed(1)}% remaining</div>
              </div>
            )}
          </div>

          {/* Game State */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-blue-300 mb-4">Level {level}</h2>
            
            {/* Current State */}
            {currentBet && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Bet:</span>
                  <span className="text-blue-400 font-bold">{currentBet.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bet So Far:</span>
                  <span className="text-red-400 font-bold">{totalBetsSoFar.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payout If Win:</span>
                  <span className="text-yellow-400 font-bold">{(currentBet * PAYOUT_RATIO).toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">NET Profit If Win:</span>
                  <span className={`font-bold ${netProfitIfWin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {netProfitIfWin >= 0 ? '+' : ''}{netProfitIfWin.toFixed(3)} SOL
                  </span>
                </div>
              </div>
            )}

            {/* Game Over State */}
            {gameOver && (
              <div className="mb-6">
                <div className={`text-2xl font-bold text-center mb-4 ${won ? 'text-green-400' : 'text-red-400'}`}>
                  {won ? '🎉 WON!' : '💥 LOST'}
                </div>
                <div className="text-center text-lg">
                  {won 
                    ? `NET Result: ${netProfitIfWin >= 0 ? '+' : ''}${netProfitIfWin.toFixed(3)} SOL`
                    : `Total Lost: -${totalBetsSoFar.toFixed(3)} SOL`
                  }
                </div>
                <button
                  onClick={resetGame}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 py-3 px-4 rounded-lg font-bold"
                >
                  New Sequence
                </button>
              </div>
            )}

            {/* Outcome Buttons (when bet is placed) */}
            {currentBet && !gameOver && (
              <div className="space-y-3 mb-6">
                <h3 className="text-lg font-semibold text-gray-300">Bet Outcome</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={winBet}
                    className="bg-green-600 hover:bg-green-700 py-3 px-4 rounded-lg font-bold"
                  >
                    WIN
                  </button>
                  <button
                    onClick={loseBet}
                    className="bg-red-600 hover:bg-red-700 py-3 px-4 rounded-lg font-bold"
                  >
                    LOSS
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-300">Or Continue</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setCurrentBet(null)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 px-4 rounded-lg font-semibold"
                  >
                    SAME (Level {level} again)
                  </button>
                  {level < BETTING_SEQUENCE.length && (
                    <button
                      onClick={() => {
                        setLevel(level + 1);
                        setCurrentBet(null);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg font-semibold"
                    >
                      DOUBLE (Level {level + 1})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bet Placement (when no bet is active) */}
            {!currentBet && !gameOver && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-300">Place Bet</h3>
                
                <button
                  onClick={() => placeBet(standardBet)}
                  disabled={standardBet > purse}
                  className={`w-full py-3 px-4 rounded-lg font-bold ${
                    standardBet > purse 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Standard Bet: {standardBet.toFixed(3)} SOL
                </button>
                
                <div className="text-center text-gray-400 text-sm">
                  Risk: {((standardBet / purse) * 100).toFixed(1)}% of purse
                </div>
              </div>
            )}
          </div>

          {/* Risk Management */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-orange-300 mb-4">Risk Management</h2>
            
            {level >= 5 && riskStrategies && !currentBet && !gameOver ? (
              <div className="space-y-3">
                <p className="text-gray-300 text-sm mb-4">
                  Level {level} - Consider smaller bets
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => placeBet(riskStrategies.conservative)}
                    className="w-full bg-green-700 hover:bg-green-600 py-2 px-4 rounded-lg text-left"
                  >
                    <div className="font-semibold">Conservative</div>
                    <div className="text-sm">{riskStrategies.conservative.toFixed(4)} SOL (2% of purse)</div>
                  </button>
                  
                  <button
                    onClick={() => placeBet(riskStrategies.moderate)}
                    className="w-full bg-yellow-700 hover:bg-yellow-600 py-2 px-4 rounded-lg text-left"
                  >
                    <div className="font-semibold">Moderate</div>
                    <div className="text-sm">{riskStrategies.moderate.toFixed(4)} SOL (5% of purse)</div>
                  </button>
                  
                  <button
                    onClick={() => placeBet(riskStrategies.aggressive)}
                    className="w-full bg-orange-700 hover:bg-orange-600 py-2 px-4 rounded-lg text-left"
                  >
                    <div className="font-semibold">Aggressive</div>
                    <div className="text-sm">{riskStrategies.aggressive.toFixed(4)} SOL (10% of purse)</div>
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-700 rounded text-sm">
                  <div className="text-gray-400">vs Standard:</div>
                  <div className="text-red-300 font-semibold">{standardBet.toFixed(3)} SOL</div>
                </div>
              </div>
            ) : level >= 5 ? (
              <div className="text-gray-400 text-sm">
                Risk management available when placing bets
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                Risk management unlocks at Level 5
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;