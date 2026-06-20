import { Play, Volume2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AudioService } from '../services/AudioService';

interface PhaseMemorizeProps {
  roundIndex: number;
  totalRounds: number;
  targetFreq: number;
  timeLeft: number;
  onTimeTick: () => void;
  onNextPhase: () => void;
  playCount: number;
  incrementPlayCount: () => void;
  setWaveActive: (active: boolean) => void;
}

export default function PhaseMemorize({
  roundIndex,
  totalRounds,
  targetFreq,
  timeLeft,
  onNextPhase,
  playCount,
  incrementPlayCount,
  setWaveActive,
}: PhaseMemorizeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const durationSecs = 2.5;

  const handlePlayTone = () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setWaveActive(true);
    setProgress(100);
    incrementPlayCount();

    // Play target pitch
    AudioService.playTone(targetFreq, 'target', durationSecs, () => {
      setIsPlaying(false);
      setWaveActive(false);
      setProgress(0);
    });
  };

  // Animate the progression outline ring during the 2.5s sound playing window
  useEffect(() => {
    if (!isPlaying) return;

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.max(0, 100 - (elapsed / durationSecs) * 100);
      setProgress(pct);
      if (elapsed >= durationSecs) {
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto">
      {/* Top Header Row */}
      <div className="flex justify-between items-center w-full mt-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Round</span>
          <span className="text-2xl font-black text-white tracking-tight">
            {roundIndex} <span className="text-zinc-600">/</span> {totalRounds}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Focused Time</span>
          <span className="text-lg font-mono font-bold text-cyan-400">
            {timeLeft}s To Remember
          </span>
        </div>
      </div>

      {/* Main Focus Play Area */}
      <div className="flex flex-col items-center justify-center flex-1 my-6 relative">
        {/* Rounded interactive disk wrapper */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          
          {/* Circular progress background */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="128"
              cy="128"
              r="110"
              className="stroke-zinc-900 line"
              strokeWidth="4"
              fill="transparent"
            />
            {isPlaying && (
              <motion.circle
                cx="128"
                cy="128"
                r="110"
                className="stroke-purple-500"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 110}
                animate={{ strokeDashoffset: (2 * Math.PI * 110) * (1 - progress / 100) }}
                transition={{ ease: "linear", duration: 0.1 }}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Core Interactive Center Button */}
          <motion.button
            id="btn-play-target"
            whileHover={{ scale: isPlaying ? 1 : 1.05 }}
            whileTap={{ scale: isPlaying ? 1 : 0.95 }}
            onClick={handlePlayTone}
            disabled={isPlaying}
            className={`w-48 h-48 rounded-full flex flex-col items-center justify-center border transition-all duration-300 relative cursor-pointer ${
              isPlaying
                ? 'bg-purple-950/20 border-purple-500/40 shadow-inner'
                : 'bg-zinc-950 border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900/40 shadow-xl shadow-black/80'
            }`}
          >
            {/* Pulsing state ring */}
            {isPlaying ? (
              <motion.div
                className="absolute inset-0 rounded-full border border-purple-500/30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            ) : null}

            {isPlaying ? (
              <Volume2 className="w-12 h-12 text-purple-400 mb-2 animate-bounce" />
            ) : (
              <Play className="w-12 h-12 text-white mb-2 ml-1" />
            )}
            
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
              {isPlaying ? "PLAYING TARGET" : "HEAR TONE"}
            </span>
            <span className="text-[8px] text-zinc-600 font-mono mt-1 font-bold">
              {durationSecs} SECONDS PITCH
            </span>
          </motion.button>
        </div>

        {/* Text Guidelines */}
        <div className="mt-8 text-center px-4 max-w-xs">
          <p className="text-sm font-semibold text-zinc-300 mb-1">
            {isPlaying ? "Focusing sound waves..." : "Listen carefully to the pitch"}
          </p>
          <p className="text-xs text-zinc-500">
            {playCount === 0 
              ? "Press the button above to play the reference sound." 
              : `You have listened ${playCount} ${playCount === 1 ? 'time' : 'times'}. Ready to guess?`}
          </p>
        </div>
      </div>

      {/* Footer Navigation Button */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full mt-2"
      >
        <button
          id="btn-go-tuning"
          onClick={onNextPhase}
          disabled={playCount === 0}
          className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all duration-300 ${
            playCount > 0
              ? 'bg-purple-600 text-white border-purple-500 hover:bg-purple-700 cursor-pointer shadow-lg shadow-purple-500/10'
              : 'bg-zinc-900/40 text-zinc-600 border-zinc-900 cursor-not-allowed'
          }`}
        >
          {playCount === 0 ? "LISTEN ONCE TO START" : "RECORD GUESS"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
