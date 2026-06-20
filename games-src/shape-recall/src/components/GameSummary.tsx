/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoundData } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Award, 
  RotateCcw, 
  TrendingUp, 
  Zap, 
  Target, 
  Maximize2, 
  Map, 
  FileText 
} from 'lucide-react';

interface GameSummaryProps {
  roundsLog: RoundData[];
  onPlayAgain: () => void;
}

export default function GameSummary({ roundsLog, onPlayAgain }: GameSummaryProps) {
  
  const totalScore = roundsLog.reduce((sum, r) => sum + r.totalScore, 0);
  const averageAccuracy = (totalScore / 50) * 100;
  
  const bestRound = [...roundsLog].sort((a, b) => b.totalScore - a.totalScore)[0];
  const worstRound = [...roundsLog].sort((a, b) => a.totalScore - b.totalScore)[0];

  // Cartesian rating bracket
  const getOverallRank = (points: number) => {
    if (points >= 48) return {
      title: "Universal Dimension Overlord 🌌",
      desc: "Perfect spatial recall. Your brain operates with high-precision GIS alignment systems.",
      color: "from-emerald-500 to-teal-400 bg-gradient-to-r bg-clip-text text-transparent"
    };
    if (points >= 45) return {
      title: "Master Surveyor of the Metric Grid 📐",
      desc: "Phenomenal retention. You can accurately measure coordinate points and scales in your sleep.",
      color: "from-cyan-400 to-blue-500 bg-gradient-to-r bg-clip-text text-transparent"
    };
    if (points >= 40) return {
      title: "Coordinate Cartographer 🗺️",
      desc: "Exceptionally solid depth and alignment calibration. Easily navigates visual projections.",
      color: "from-indigo-400 to-purple-500 bg-gradient-to-r bg-clip-text text-transparent"
    };
    if (points >= 30) return {
      title: "Slightly Drifted Voyager ⛵",
      desc: "Good spatial comprehension, but you suffer from minor calibration variance under game timers.",
      color: "from-yellow-400 to-orange-500 bg-gradient-to-r bg-clip-text text-transparent"
    };
    return {
      title: "Uncalibrated Entity 🌫️",
      desc: "Substantial coordinate draft. Reset your coordinates, focus, and let the grid guide you.",
      color: "from-red-400 to-rose-600 bg-gradient-to-r bg-clip-text text-transparent"
    };
  };

  const rank = getOverallRank(totalScore);

  // Parse chart data for recharts
  const chartData = roundsLog.map((r) => ({
    name: `Rn ${r.roundNumber}`,
    'Total Score': r.totalScore,
    'Position Accuracy': r.posScore,
    'Scale Accuracy': r.sizeScore,
  }));

  // Format shape name prettily
  const formatShapeName = (shape: string) => {
    return shape.charAt(0) + shape.slice(1).toLowerCase();
  };

  return (
    <div
      id="game-summary-screen"
      className="flex h-full w-full flex-col overflow-y-auto bg-zinc-950 font-sans text-zinc-100"
      style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
    >

      {/* Top Banner */}
      <div
        className="border-b border-zinc-900 bg-zinc-900/40 px-5 py-6 backdrop-blur-md sm:px-12 sm:py-8"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center space-x-3 text-cyan-400">
            <Award className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest sm:text-xs">
              Ninth-Dimension Calibration Finished
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Spatial Evaluation Summary
          </h1>
          <p className="mt-2 max-w-xl text-xs text-zinc-400 sm:text-sm">
            A comprehensive breakdown of your geometric coordinates memory, offset calculations, and dimensional reconstruction accuracy.
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="mx-auto mt-6 grid w-full max-w-5xl grid-cols-1 gap-6 px-5 sm:mt-8 sm:gap-8 sm:px-12 lg:grid-cols-3">
        
        {/* Left column - KPI stats & ranking */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Big Rank Card */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
              Assigned Archetype
            </span>
            <div className={`mt-3 font-display text-2xl font-black leading-tight ${rank.color}`}>
              {rank.title}
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              {rank.desc}
            </p>

            <div className="mt-6 border-t border-zinc-900 pt-6 space-y-4">
              <div>
                <div className="text-xs text-zinc-500 font-mono">TOTAL ACCUMULATED SCORE</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-4xl font-black text-white font-mono">{totalScore.toFixed(2)}</span>
                  <span className="text-zinc-600 font-mono text-sm ml-1">/ 50.00</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-500 font-mono">AVERAGE CONGRUENCE</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-3xl font-extrabold text-cyan-400 font-mono">{averageAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Carousel / Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Target className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Best Accuracy</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-white">
                {bestRound?.totalScore.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Round {bestRound?.roundNumber} ({formatShapeName(bestRound?.shapeType)})
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-4">
              <div className="flex items-center space-x-2 text-purple-400">
                <Maximize2 className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Worst Drift</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-white">
                {worstRound?.totalScore.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Round {worstRound?.roundNumber} ({formatShapeName(worstRound?.shapeType)})
              </div>
            </div>
          </div>

          {/* Action trigger button */}
          <button
            id="retry-game-button"
            onClick={onPlayAgain}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-cyan-500 py-4 font-semibold text-black hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all outline-none"
          >
            <RotateCcw className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Align New Coordinates</span>
          </button>

        </div>

        {/* Right column - Chart & Logs breakdowns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart Section */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  Chronological Accuracy Curve
                </h3>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">ROUNDS 1 - 5</span>
            </div>

            {/* Recharts canvas */}
            <div className="mt-6 h-64 w-full text-zinc-400">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717a" 
                    fontSize={11} 
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    stroke="#71717a" 
                    fontSize={11} 
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Total Score" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Logs List */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-900 pb-2">
              <FileText className="h-4 w-4 text-zinc-500" />
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-400">
                Granular Calibration Logs
              </h3>
            </div>

            <div className="space-y-3">
              {roundsLog.map((log) => (
                <div 
                  key={log.roundNumber}
                  id={`log-item-round-${log.roundNumber}`}
                  className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    {/* Visual Shape Mini Representation */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-950 border border-zinc-800/50">
                      {log.shapeType === 'SQUARE' && <div className="h-5 w-5 rounded bg-gradient-to-tr from-cyan-500 to-indigo-500" />}
                      {log.shapeType === 'CIRCLE' && <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500" />}
                      {log.shapeType === 'TRIANGLE' && (
                        <div 
                          className="h-5 w-5 bg-gradient-to-tr from-cyan-500 to-indigo-500" 
                          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-display font-bold text-white text-md">
                        Round {log.roundNumber}: {formatShapeName(log.shapeType)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-zinc-500">
                        <span>Target: X:{log.target.x.toFixed(0)}% Y:{log.target.y.toFixed(0)}% W:{log.target.width.toFixed(0)}% H:{log.target.height.toFixed(0)}%</span>
                        <span className="hidden sm:inline text-zinc-700">|</span>
                        <span>Guessed: X:{log.guess.x.toFixed(0)}% Y:{log.guess.y.toFixed(0)}% W:{log.guess.width.toFixed(0)}% H:{log.guess.height.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center md:text-right space-x-4 md:space-x-0">
                    <div className="md:mr-4">
                      <div className="font-mono text-zinc-500 text-[9px] uppercase tracking-wider">Metrics</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 space-y-0.5">
                        <div>Pos match: <span className="font-mono text-zinc-300">{(log.posScore * 20).toFixed(0)}%</span></div>
                        <div>Size match: <span className="font-mono text-zinc-300">{(log.sizeScore * 20).toFixed(0)}%</span></div>
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-zinc-900 hidden md:block" />
                    <div className="md:pl-4 min-w-[70px]">
                      <div className="font-mono text-zinc-500 text-[9px] uppercase tracking-wider">Score</div>
                      <div className="font-mono text-lg font-bold text-cyan-400 mt-0.5">
                        {log.totalScore.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
