import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Music, HelpCircle } from 'lucide-react';
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
    
    // Bottom of the screen/track represents 0% (MIN_FREQ), top represents 100% (MAX_FREQ)
    const rawRatio = (rect.bottom - clientY) / rect.height;
    const ratio = Math.max(0, Math.min(1, rawRatio));
    
    const newFreq = positionToFrequency(ratio);
    setFreq(newFreq);
    AudioService.setFrequency(newFreq);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setWaveActive(true);
    updateFrequencyFromEvent(e.clientY);
    
    // Calculate initial frequency on click first
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
      setWaveActive(false);
      AudioService.stopTone();
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
    if (e.touches.length === 0) return;
    setIsDragging(true);
    setWaveActive(true);
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
    setWaveActive(false);
    AudioService.stopTone();
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

  const handleTestToneClick = () => {
    AudioService.playTone(freq, 'guess', 1.5, () => {
      setWaveActive(false);
    });
    setWaveActive(true);
  };

  return (
    <div className="flex flex-col justify-between h-full w-full px-6 py-8 z-10 max-w-md mx-auto select-none">
      {/* Header Info */}
      <div className="flex justify-between items-center w-full mt-6">
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
      <div className="text-center mt-4">
        <div className="flex items-baseline justify-center font-black">
          <motion.span
            className="text-7xl md:text-8xl text-white tracking-tighter"
            key={freq} // Smooth update tracking
          >
            {freq.toFixed(2)}
          </motion.span>
          <span className="text-2xl text-cyan-500 tracking-tight ml-2 font-black font-sans">
            Hz
          </span>
        </div>
        <p className="text-xs text-zinc-500 block font-mono mt-1 font-semibold uppercase">
          {isDragging ? "🔊 Tuning Pitch Live..." : "Drag slider to hear and match"}
        </p>
      </div>

      {/* Heavy Tactile Vertical Slider Section */}
      <div className="flex-1 flex justify-center items-center my-6 relative overflow-visible">
        {/* Helper guide pitch ranges */}
        <div className="absolute left-6 h-64 flex flex-col justify-between text-right text-[9px] font-mono font-bold text-zinc-600 pointer-events-none uppercase">
          <span>{MAX_FREQ.toFixed(0)} Hz</span>
          <span>800 Hz</span>
          <span>500 Hz</span>
          <span>250 Hz</span>
          <span>{MIN_FREQ.toFixed(0)} Hz</span>
        </div>

        {/* The slider container track */}
        <div
          ref={sliderTrackRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-64 w-6 bg-zinc-950/60 rounded-full border border-zinc-900/80 cursor-grab active:cursor-grabbing relative relative flex justify-center shadow-2xl relative select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Internal tube shadow background channel */}
          <div className="absolute top-2 bottom-2 w-3 bg-zinc-900 shadow-inner rounded-full" />

          {/* Glowing active range filling */}
          <div
            className="absolute bottom-2 w-3 bg-gradient-to-t from-cyan-600 via-cyan-500 to-emerald-400 rounded-b-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            style={{
              height: `calc(${sliderRatio * 100}% - 8px)`,
              minHeight: '4px',
            }}
          />

          {/* Tactical floating thumb ball hook */}
          <div
            className="absolute h-9 w-9 bg-white rounded-full border-[4px] border-cyan-500 shadow-lg shadow-cyan-500/30 flex items-center justify-center cursor-pointer pointer-events-none transition-shadow"
            style={{
              bottom: `calc(${sliderRatio * 100}% - 14px)`,
            }}
          >
            {/* Minimal center indicator dot */}
            <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-ping" />
          </div>
        </div>

        {/* Small tips box on the right */}
        <div className="absolute right-6 h-64 flex flex-col justify-center gap-4 text-left pointer-events-none hidden xs:flex">
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/60 w-24">
            <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-cyan-400" /> Advice
            </h4>
            <p className="text-[9px] text-zinc-500 leading-normal mt-1 font-medium">
              Touch the slider to generate the oscillator pitch. Compare notes!
            </p>
          </div>
        </div>
      </div>

      {/* Buttons / Options panel */}
      <div className="space-y-3 w-full">
        {/* Tap testing tone auxiliary button */}
        <button
          onClick={handleTestToneClick}
          disabled={isDragging}
          className="w-full py-3 px-4 rounded-xl font-bold bg-zinc-900/40 hover:bg-zinc-900 hover:text-white border border-zinc-900 text-zinc-400 text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <Music className="w-3.5 h-3.5 text-cyan-500" /> Play Selected Tone (1.5s)
        </button>

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
