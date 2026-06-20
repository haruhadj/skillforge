import { Volume2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AudioService } from '../services/AudioService';

interface PhaseStartProps {
  onStart: () => void;
  highScore: number;
}

export default function PhaseStart({ onStart, highScore }: PhaseStartProps) {
  const handleStartClick = () => {
    // Unlock Audio Context explicitly on click
    AudioService.init();
    AudioService.resume();
    onStart();
  };

  return (
    <div className="flex flex-col items-center justify-between text-center h-full px-6 py-12 z-10 max-w-md mx-auto">
      {/* Title Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mt-10"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-semibold px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-sm shadow-inner">
          Pitch Training Game
        </span>
        <h1 className="text-5xl font-black text-white tracking-tighter mt-6 mb-2">
          PITCH<span className="text-purple-500">.</span>PERFECT
        </h1>
        <p className="text-zinc-500 text-sm font-medium">
          The ultimate physical test of human pitch memory
        </p>
      </motion.div>

      {/* Decorative Icon & Ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative my-6 flex items-center justify-center w-48 h-48 rounded-full border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm"
      >
        <div className="absolute inset-2 rounded-full border border-zinc-950 bg-black" />
        {/* Animated glowing wave lines */}
        <div className="absolute inset-4 rounded-full border border-purple-500/10 animate-ping" />
        <div className="absolute inset-8 rounded-full border border-cyan-500/10 animate-pulse" />
        
        <div className="z-10 flex flex-col items-center">
          <Volume2 className="w-14 h-14 text-cyan-400 mb-1 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
            Audio Ready
          </span>
        </div>
      </motion.div>

      {/* Mechanics details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-left bg-zinc-950/60 p-5 rounded-2xl border border-zinc-900/80 backdrop-blur-sm w-full space-y-3 shadow-2xl"
      >
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
          <Zap className="w-3.5 h-3.5 text-purple-400" /> Game Rules
        </h3>
        <ul className="text-xs text-zinc-400 space-y-2 font-medium">
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold">•</span>
            <span>Listen to a pristine mystery target frequency (from <b className="text-zinc-200">80Hz</b> to <b className="text-zinc-200">1200Hz</b>) for 3 seconds.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-500 font-bold">•</span>
            <span>Drag a logarithmic tactile slider to tune and match the target pitch.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">•</span>
            <span>Submit to get scored. Accuracy under 2 cents lands 50.00 max points! Play 5 complete rounds.</span>
          </li>
        </ul>
      </motion.div>

      {/* Play Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full mt-4"
      >
        {highScore > 0 && (
          <div className="text-xs font-mono text-zinc-500 mb-4 uppercase tracking-wider">
            Personal Best: <span className="text-purple-400 font-bold">{(highScore).toFixed(2)} pts</span>
          </div>
        )}

        <button
          id="btn-start"
          onClick={handleStartClick}
          className="w-full py-4 px-6 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold text-base tracking-tight transition-all duration-300 shadow-xl border border-white hover:shadow-cyan-500/10 hover:border-cyan-400 cursor-pointer flex items-center justify-center gap-2"
        >
          START CHALLENGE
        </button>
      </motion.div>
    </div>
  );
}
