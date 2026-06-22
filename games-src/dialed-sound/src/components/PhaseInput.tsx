import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, HelpCircle } from 'lucide-react';
import { MIN_FREQ, MAX_FREQ, frequencyToPosition, positionToFrequency } from '../utils';
import { AudioService } from '../services/AudioService';

interface PhaseInputProps {
  roundIndex: number;
  totalRounds: number;
  initialFreq: number;
  onSubmitGuess: (freq: number) => void;
  setWaveActive: (active: boolean) => void;
  setWaveFreq: (freq: number) => void;
}

export default function PhaseInput({
  roundIndex,
  totalRounds,
  initialFreq,
  onSubmitGuess,
  setWaveActive,
  setWaveFreq,
}: PhaseInputProps) {
  const [freq, setFreq] = useState<number>(initialFreq);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);

  // Update background waves
  useEffect(() => {
    setWaveFreq(freq);
  }, [freq, setWaveFreq]);

  // Clean play state on unmount
  useEffect(() => {
    return () => {
      AudioService.stopTone();
      setWaveActive(false);
    };
  }, [setWaveActive]);

  const updateFrequencyFromEvent = (clientY: number) => {
    if (!sliderTrackRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    
    // Bottom of the screen represents 0% (MIN_FREQ), top represents 100% (MAX_FREQ)
    const rawRatio = (rect.bottom - clientY) / rect.height;
    const ratio = Math.max(0, Math.min(1, rawRatio));
    
    const newFreq = positionToFrequency(ratio);
    setFreq(newFreq);
    AudioService.setFrequency(newFreq);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Exclude button clicks so controls can be touched normally
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    setIsDragging(true);
    setWaveActive(true);
    setShowTooltip(false);
    updateFrequencyFromEvent(e.clientY);
    
    const rect = sliderTrackRef.current?.getBoundingClientRect();
    if (rect) {
      const rawRatio = (rect.bottom - e.clientY) / rect.height;
      const ratio = Math.max(0, Math.min(1, rawRatio));
      const initialClickedFreq = positionToFrequency(ratio);
      AudioService.startTuning(initialClickedFreq);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateFrequencyFromEvent(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Exclude button interactions
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    if (e.touches.length === 0) return;
    setIsDragging(true);
    setWaveActive(true);
    setShowTooltip(false);
    const clientY = e.touches[0].clientY;
    updateFrequencyFromEvent(clientY);

    // Initial audio trigger
    const rect = sliderTrackRef.current?.getBoundingClientRect();
    if (rect) {
      const rawRatio = (rect.bottom - clientY) / rect.height;
      const ratio = Math.max(0, Math.min(1, rawRatio));
      const initialTouchedFreq = positionToFrequency(ratio);
      AudioService.startTuning(initialTouchedFreq);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const clientY = e.touches[0].clientY;
    updateFrequencyFromEvent(clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const sliderRatio = frequencyToPosition(freq);

  // Frequency pitch category indicator
  const getFrequencyLabel = (f: number) => {
    if (f < 140) return "Sub Bass";
    if (f < 250) return "Bass / Low End";
    if (f < 500) return "Low Midrange";
    if (f < 800) return "Midrange";
    return "Upper Midrange";
  };

  return (
    <div
      ref={sliderTrackRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className={`flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto select-none relative cursor-ns-resize transition-colors duration-300 ${
        isDragging ? 'bg-cyan-950/5' : ''
      }`}
    >
      {/* Dynamic full-screen horizontal tuning bar / line indicator */}
      <div
        className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none transition-all duration-75 flex items-center justify-between px-4"
        style={{
          bottom: `${sliderRatio * 100}%`,
          boxShadow: '0 0 15px rgba(34, 211, 238, 0.8), 0 0 30px rgba(34, 211, 238, 0.4)',
        }}
      >
        {/* Left tick */}
        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-black/80 px-2 py-0.5 rounded border border-cyan-500/20 shadow-lg -translate-y-1/2">
          {freq.toFixed(0)} Hz
        </span>
        {/* Glowing alignment core */}
        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
        {/* Right tick */}
        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-black/80 px-2 py-0.5 rounded border border-cyan-500/20 shadow-lg -translate-y-1/2">
          ↕ Drag
        </span>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-center w-full mt-6 relative z-20">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Guessing</span>
          <span className="text-2xl font-black text-white tracking-tight">
            Round {roundIndex} <span className="text-zinc-600">/</span> {totalRounds}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 block">Category</span>
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/20">
            {getFrequencyLabel(freq)}
          </span>
        </div>
      </div>

      {/* Jumbo Numeric Pitch Display */}
      <div className="text-center mt-4 relative z-20">
        <div className="flex items-baseline justify-center font-black">
          <motion.span
            className="text-7xl md:text-8xl text-white tracking-tighter"
            key={freq}
          >
            {freq.toFixed(2)}
          </motion.span>
          <span className="text-2xl text-cyan-500 tracking-tight ml-2 font-black font-sans">
            Hz
          </span>
        </div>
        <p className="text-xs text-zinc-400 block font-mono mt-1 font-semibold uppercase tracking-wider bg-zinc-950/40 py-1 px-3 rounded-full border border-zinc-900/40 inline-flex items-center gap-1.5 mx-auto">
          {isDragging ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              🔊 Tuning Pitch Live...
            </>
          ) : (
            "Drag screen up or down to tune"
          )}
        </p>
      </div>

      {/* Grid frequency lines in the background - purely decorative and functional */}
      <div className="absolute inset-0 top-32 bottom-36 flex flex-col justify-between pointer-events-none opacity-20 px-8">
        {[1000, 800, 600, 400, 200].map((v) => {
          const ratio = frequencyToPosition(v);
          return (
            <div
              key={v}
              className="w-full border-t border-dashed border-zinc-800 flex justify-between pt-1 text-[8px] font-mono text-zinc-600 font-bold"
              style={{
                position: 'absolute',
                bottom: `${ratio * 100}%`,
                left: 0,
                right: 0,
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
              }}
            >
              <span>{v} Hz</span>
              <span>—</span>
            </div>
          );
        })}
      </div>

      {/* Interactive visual tooltips guide centered */}
      <div className="flex-1 flex flex-col justify-center items-center my-6 relative z-10 pointer-events-none">
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-cyan-950/70 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/20 text-center max-w-xs shadow-2xl space-y-2 pointer-events-auto"
          >
            <HelpCircle className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
            <h4 className="text-xs font-black tracking-wider text-white uppercase">Tap & Drag Interface</h4>
            <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
              Drag your finger or cursor <span className="text-cyan-400 font-bold">anywhere on the screen</span> to tune the oscillator. Tap submit once you dial it in!
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-[9px] uppercase font-mono font-bold text-zinc-400 hover:text-white underline cursor-pointer pt-1 block mx-auto"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </div>

      {/* Buttons / Options panel */}
      <div className="space-y-3 w-full relative z-20">
        {/* Central Lock In Button */}
        <button
          id="btn-submit-guess"
          onClick={() => {
            AudioService.stopTone();
            onSubmitGuess(freq);
          }}
          disabled={isDragging}
          type="button"
          className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-black font-black text-base tracking-tight transition-all duration-300 shadow-xl border border-white hover:shadow-cyan-500/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5 text-black" strokeWidth={3} />
          SUBMIT GUESS
        </button>
      </div>
    </div>
  );
}
