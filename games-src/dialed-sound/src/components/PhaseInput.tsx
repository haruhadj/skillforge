import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, HelpCircle } from 'lucide-react';
import { frequencyToPosition, positionToFrequency } from '../utils';
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
  const [isTuning, setIsTuning] = useState<boolean>(false);
  const [isMouseDragging, setIsMouseDragging] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const freqRef = useRef<number>(initialFreq);
  const lastTouchYRef = useRef<number | null>(null);
  const lastMouseYRef = useRef<number | null>(null);

  // Keep freqRef in sync so imperative wheel handler always sees latest value
  useEffect(() => {
    freqRef.current = freq;
  }, [freq]);

  useEffect(() => {
    setWaveFreq(freq);
  }, [freq, setWaveFreq]);

  useEffect(() => {
    return () => {
      AudioService.stopTone();
      setWaveActive(false);
    };
  }, [setWaveActive]);

  // Imperatively add wheel listener so we can pass { passive: false }
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      AudioService.startTuning(freqRef.current); // idempotent
      setIsTuning(true);
      setWaveActive(true);
      setShowTooltip(false);

      const currentRatio = frequencyToPosition(freqRef.current);
      const newRatio = Math.max(0, Math.min(1, currentRatio - e.deltaY * 0.001));
      const newFreq = positionToFrequency(newRatio);
      freqRef.current = newFreq;
      setFreq(newFreq);
      AudioService.setFrequency(newFreq);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setWaveActive]);

  // Touch handlers — delta-based so a swipe anywhere on screen tunes
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    lastTouchYRef.current = e.touches[0].clientY;
    AudioService.startTuning(freqRef.current);
    setIsTuning(true);
    setWaveActive(true);
    setShowTooltip(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lastTouchYRef.current === null || e.touches.length === 0) return;
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - lastTouchYRef.current;
    lastTouchYRef.current = clientY;

    // Swipe up (negative deltaY) = higher freq, swipe down = lower
    const currentRatio = frequencyToPosition(freqRef.current);
    const newRatio = Math.max(0, Math.min(1, currentRatio - deltaY * 0.004));
    const newFreq = positionToFrequency(newRatio);
    freqRef.current = newFreq;
    setFreq(newFreq);
    AudioService.setFrequency(newFreq);
  };

  const handleTouchEnd = () => {
    lastTouchYRef.current = null;
    setIsTuning(false);
  };

  // Mouse drag handlers (desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    lastMouseYRef.current = e.clientY;
    AudioService.startTuning(freqRef.current);
    setIsMouseDragging(true);
    setIsTuning(true);
    setWaveActive(true);
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!isMouseDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (lastMouseYRef.current === null) return;
      const deltaY = e.clientY - lastMouseYRef.current;
      lastMouseYRef.current = e.clientY;

      const currentRatio = frequencyToPosition(freqRef.current);
      const newRatio = Math.max(0, Math.min(1, currentRatio - deltaY * 0.004));
      const newFreq = positionToFrequency(newRatio);
      freqRef.current = newFreq;
      setFreq(newFreq);
      AudioService.setFrequency(newFreq);
    };

    const onMouseUp = () => {
      lastMouseYRef.current = null;
      setIsMouseDragging(false);
      setIsTuning(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isMouseDragging]);

  const getFrequencyLabel = (f: number) => {
    if (f < 140) return "Sub Bass";
    if (f < 250) return "Bass / Low End";
    if (f < 500) return "Low Midrange";
    if (f < 800) return "Midrange";
    return "Upper Midrange";
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className={`flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto select-none relative transition-colors duration-300 ${
        isTuning ? 'bg-cyan-950/5' : ''
      } ${isMouseDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Header */}
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

      {/* Frequency display */}
      <div className="text-center mt-4 relative z-20">
        <div className="flex items-baseline justify-center font-black">
          <motion.span className="text-7xl md:text-8xl text-white tracking-tighter">
            {freq.toFixed(2)}
          </motion.span>
          <span className="text-2xl text-cyan-500 tracking-tight ml-2 font-black font-sans">
            Hz
          </span>
        </div>
        <p className="text-xs text-zinc-400 block font-mono mt-1 font-semibold uppercase tracking-wider bg-zinc-950/40 py-1 px-3 rounded-full border border-zinc-900/40 inline-flex items-center gap-1.5 mx-auto">
          {isTuning ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              🔊 Tuning Pitch Live...
            </>
          ) : (
            "Drag, scroll, or swipe anywhere to tune"
          )}
        </p>
      </div>

      {/* Decorative frequency grid lines */}
      <div className="absolute inset-0 top-32 bottom-36 pointer-events-none opacity-20">
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

      {/* Tooltip */}
      <div className="flex-1 flex flex-col justify-center items-center my-6 relative z-10 pointer-events-none">
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-cyan-950/70 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/20 text-center max-w-xs shadow-2xl space-y-2 pointer-events-auto"
          >
            <HelpCircle className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
            <h4 className="text-xs font-black tracking-wider text-white uppercase">Drag or Scroll to Tune</h4>
            <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
              Click-drag, scroll, or swipe <span className="text-cyan-400 font-bold">anywhere on the screen</span> to tune the oscillator up or down. Submit once you dial it in!
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

      {/* Submit — always accessible, never disabled */}
      <div className="space-y-3 w-full relative z-20">
        <button
          id="btn-submit-guess"
          onClick={() => {
            AudioService.stopTone();
            onSubmitGuess(freq);
          }}
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
