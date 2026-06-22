import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Volume2, Activity, Disc } from 'lucide-react';
import { getSnarkyMessage } from '../utils';
import { AudioService } from '../services/AudioService';

interface PhaseResultsProps {
  roundIndex: number;
  totalRounds: number;
  targetFreq: number;
  guessedFreq: number;
  score: number;
  centsDifference: number;
  onNextRound: () => void;
  setWaveActive: (active: boolean) => void;
  setWaveFreq: (freq: number) => void;
}

export default function PhaseResults({
  roundIndex,
  totalRounds,
  targetFreq,
  guessedFreq,
  score,
  centsDifference,
  onNextRound,
  setWaveActive,
  setWaveFreq,
}: PhaseResultsProps) {
  const [playingType, setPlayingType] = useState<'target' | 'guess' | 'none'>('none');

  // Trigger waveform background based on what pitch is playing
  useEffect(() => {
    if (playingType === 'target') {
      setWaveActive(true);
      setWaveFreq(targetFreq);
    } else if (playingType === 'guess') {
      setWaveActive(true);
      setWaveFreq(guessedFreq);
    } else {
      setWaveActive(false);
    }
  }, [playingType, targetFreq, guessedFreq, setWaveActive, setWaveFreq]);

  // Safely stop audio if user advances or component unmounts
  useEffect(() => {
    return () => {
      AudioService.stopTone();
    };
  }, []);

  const playTone = (freq: number, type: 'target' | 'guess') => {
    if (playingType === type) {
      AudioService.stopTone();
      setPlayingType('none');
      return;
    }

    setPlayingType(type);
    AudioService.playTone(freq, type, 2.0, () => {
      setPlayingType('none');
    });
  };

  const centsFormatted = centsDifference > 0 
    ? `+${centsDifference.toFixed(1)} cents (sharp)` 
    : centsDifference < 0 
      ? `${centsDifference.toFixed(1)} cents (flat)` 
      : 'Perfect match';

  const snarkyMessage = getSnarkyMessage(score);

  // Gradient color based on score performance
  const getScoreColor = (s: number) => {
    if (s >= 9.0) return 'text-emerald-400';
    if (s >= 7.0) return 'text-cyan-400';
    if (s >= 4.0) return 'text-purple-400';
    return 'text-rose-500';
  };

  return (
    <div className="flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto">
      
      {/* Header Stat row */}
      <div className="flex justify-between items-start w-full mt-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Round</span>
          <span className="text-2xl font-black text-white tracking-tight">
            {roundIndex} <span className="text-zinc-600">/</span> {totalRounds}
          </span>
        </div>
        
        {/* Large Rounded Score Box */}
        <div className="text-right">
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Points Earned</span>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 10 }}
            className={`text-4xl font-black ${getScoreColor(score)} tracking-tight`}
          >
            {score.toFixed(2)}
          </motion.div>
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider max-w-[180px] block mt-1 leading-normal">
            {snarkyMessage}
          </span>
        </div>
      </div>

      {/* Comparisons visualizer cards */}
      <div className="flex-1 flex flex-col justify-center gap-5 my-6">
        
        {/* Interactive sound player boxes */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => playTone(targetFreq, 'target')}
            className={`p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center border-2 transition-all duration-300 text-center gap-3 cursor-pointer ${
              playingType === 'target'
                ? 'bg-purple-950/30 border-purple-500 shadow-xl shadow-purple-500/10'
                : 'bg-zinc-950/60 border-zinc-900 hover:border-purple-500/40 hover:bg-zinc-900/20'
            }`}
          >
            <Disc className={`w-10 h-10 ${playingType === 'target' ? 'text-purple-400 animate-spin' : 'text-zinc-400'}`} style={{ animationDuration: '3s' }} />
            <div className="flex flex-col">
              <div className="text-[11px] uppercase font-bold tracking-widest text-zinc-500">Target Tone</div>
              <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">{targetFreq.toFixed(2)} Hz</div>
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-purple-400 bg-purple-950/50 px-3 py-1 rounded-full border border-purple-500/20 mt-1 font-bold">
              {playingType === 'target' ? 'Playing' : 'Listen'}
            </div>
          </button>

          <button
            onClick={() => playTone(guessedFreq, 'guess')}
            className={`p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center border-2 transition-all duration-300 text-center gap-3 cursor-pointer ${
              playingType === 'guess'
                ? 'bg-cyan-950/30 border-cyan-500 shadow-xl shadow-cyan-500/10'
                : 'bg-zinc-950/60 border-zinc-900 hover:border-cyan-500/40 hover:bg-zinc-900/20'
            }`}
          >
            <Activity className={`w-10 h-10 ${playingType === 'guess' ? 'text-cyan-400 animate-pulse' : 'text-zinc-400'}`} />
            <div className="flex flex-col">
              <div className="text-[11px] uppercase font-bold tracking-widest text-zinc-500">Your Guess</div>
              <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">{guessedFreq.toFixed(2)} Hz</div>
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded-full border border-cyan-500/20 mt-1 font-bold">
              {playingType === 'guess' ? 'Playing' : 'Listen'}
            </div>
          </button>
        </div>

        {/* Detailed Cents difference pill */}
        <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900/80 text-center text-zinc-400">
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase mb-1">Acoustic Cents Offset</span>
          <span className={`text-sm font-bold font-mono ${score >= 40 ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {centsFormatted}
          </span>
        </div>
      </div>

      {/* Footer Comparison metrics & progression button */}
      <div className="flex justify-between items-center w-full mt-4 border-t border-zinc-900/80 pt-6">
        
        {/* Equal size Target and Guess stats in bottom left layout */}
        <div className="text-left select-none flex gap-8 flex-1">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-0.5">TARGET</span>
            <div className="text-2xl font-black text-white tracking-tighter">
              {targetFreq.toFixed(2)} <span className="text-xs text-purple-400 font-bold font-sans">Hz</span>
            </div>
          </div>
          
          <div className="border-l border-zinc-900/50 pl-8">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-0.5">GUESS</span>
            <div className="text-2xl font-black text-white tracking-tighter">
              {guessedFreq.toFixed(2)} <span className="text-xs text-cyan-400 font-bold font-sans">Hz</span>
            </div>
          </div>
        </div>

        {/* Circular proceed button bottom right as requested by guidelines */}
        <div className="ml-4">
          <motion.button
            id="btn-next-round"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              AudioService.stopTone();
              onNextRound();
            }}
            className="w-16 h-16 rounded-full bg-white text-black hover:bg-zinc-200 cursor-pointer flex items-center justify-center shadow-lg hover:shadow-cyan-500/20 shadow-black/80 border border-white"
          >
            <ArrowRight className="w-7 h-7 text-black" strokeWidth={3} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
