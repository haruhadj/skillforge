import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { AudioService } from '../services/AudioService';

interface PhaseCountdownProps {
  onComplete: () => void;
}

export default function PhaseCountdown({ onComplete }: PhaseCountdownProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    AudioService.playTone(330, 'target', 0.15);

    const t1 = setTimeout(() => {
      setStep(2);
      AudioService.playTone(440, 'target', 0.15);
    }, 1000);

    const t2 = setTimeout(() => {
      setStep(3);
      AudioService.playTone(660, 'target', 0.3);
    }, 2000);

    const t3 = setTimeout(() => {
      onComplete();
    }, 2700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = step === 1 ? 'READY' : step === 2 ? 'SET' : 'GO!';
  const color = step === 3 ? 'text-emerald-400' : step === 2 ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center w-full h-40">
        <AnimatePresence mode="sync">
          <motion.span
            key={step}
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.6, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`absolute text-8xl font-black tracking-tighter select-none ${color}`}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
