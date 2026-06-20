import { Award, RotateCcw, Heart, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { RoundData } from '../types';

interface PhaseSummaryProps {
  rounds: RoundData[];
  onRestart: () => void;
  highScore: number;
}

export default function PhaseSummary({ rounds, onRestart, highScore }: PhaseSummaryProps) {
  const totalScore = rounds.reduce((acc, r) => acc + (r.score || 0), 0);
  const averageError = rounds.reduce((acc, r) => acc + Math.abs(r.centsDifference || 0), 0) / rounds.length;

  const getRankBadge = (score: number) => {
    if (score >= 49.0) return { name: "Golden Oscillator", desc: "Unbelievable. Are you half-bat, half-synthesizer? Perfect auditory cortex. 🦇🔊", color: "text-purple-400 border-purple-500 bg-purple-950/20" };
    if (score >= 44.0) return { name: "Platinum Ears", desc: "Superb. You could effortlessly tune symphony orchestras in your sleep. 🎻⭐", color: "text-cyan-400 border-cyan-500 bg-cyan-950/20" };
    if (score >= 36.0) return { name: "Studio Engineer", desc: "Excellent. Outstanding pitch comprehension and acoustic memory. 🎚️🎙️", color: "text-emerald-400 border-emerald-500 bg-emerald-950/20" };
    if (score >= 24.0) return { name: "Decent Amateur", desc: "Nice. Respectable frequency recognition, though you trend flat or sharp under pressure. 🎸", color: "text-amber-400 border-amber-500 bg-amber-950/20" };
    return { name: "Tin Foil Ears", desc: "Did you mute your computer? Perhaps enjoy music as a pure listener! 🔈🤖", color: "text-rose-400 border-rose-500 bg-rose-950/20" };
  };

  const badge = getRankBadge(totalScore);

  return (
    <div className="flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto">
      
      {/* Upper Section (Score and Badge Card) */}
      <div className="text-center mt-6 flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative inline-block mb-4"
        >
          <span className="text-xs uppercase font-extrabold tracking-[0.2em] text-zinc-500 block mb-1">
            CONGRATULATIONS
          </span>
          <h2 className="text-5xl font-black text-white tracking-tighter">
            {totalScore.toFixed(2)}
            <span className="text-lg text-zinc-500 font-bold ml-1">/ 50</span>
          </h2>
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400 mt-1">
            Average Error: {averageError.toFixed(1)} Cents
          </p>
        </motion.div>

        {/* Badge Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`p-5 rounded-2xl border ${badge.color} backdrop-blur-sm text-center my-4 space-y-2 shadow-2xl relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
          <Award className="w-10 h-10 mx-auto animate-pulse" />
          <h3 className="text-lg font-black tracking-tight uppercase">
            {badge.name}
          </h3>
          <p className="text-xs leading-relaxed font-medium text-zinc-300">
            {badge.desc}
          </p>
        </motion.div>

        {/* Round Breakdown Table */}
        <div className="bg-zinc-950/80 rounded-2xl border border-zinc-900 overflow-hidden shadow-xl mb-4 text-left">
          <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-900/20 flex justify-between items-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Detailed Analysis</span>
            {totalScore >= highScore && (
              <span className="text-[8px] uppercase tracking-wider font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                New Personal Best!
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-900 max-h-48 overflow-y-auto">
            {rounds.map((round, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-[10px] text-zinc-400 font-bold flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex font-mono text-[10px] gap-1 text-zinc-500">
                      <span>{round.targetFreq.toFixed(0)}Hz target</span>
                      <span>•</span>
                      <span className={Math.abs(round.centsDifference || 0) <= 10 ? 'text-emerald-400/80 font-bold' : ''}>
                        {round.centsDifference && round.centsDifference > 0 ? '+' : ''}{round.centsDifference?.toFixed(0)}c
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-zinc-100 font-mono">
                    {round.score?.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-zinc-600 block leading-none">points</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full"
      >
        <button
          id="btn-restart"
          onClick={onRestart}
          className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-black font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-xl border border-white hover:shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-black" strokeWidth={3} />
          PLAY NEW CHALLENGE
        </button>
      </motion.div>
    </div>
  );
}
