import { useEffect, useRef } from 'react';

interface WaveformProps {
  frequency: number;
  amplitude: number; // 0 to 1
  theme: 'target' | 'guess' | 'idle';
  isActive: boolean;
}

export default function Waveform({ frequency, amplitude, theme, isActive }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Render loop
    const render = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Clean canvas with semi-transparent black for motion-blur trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, w, h);

      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Smoothly animate phase
      // Fast wave speed for guess tuning, premium look
      const speed = isActive ? 0.12 : 0.04;
      phaseRef.current += speed;

      // Base properties depending on frequency
      // Frequency goes from 80Hz to 1200Hz
      // We map this to a wave density (wavelength)
      const normalizedFreq = (frequency - 80) / (1200 - 80); // 0 to 1
      const wavesCount = 4 + (1 - normalizedFreq) * 8; // More waves if lower frequency (longer wavelength)
      const wavelength = h / wavesCount;

      // Target vs Guess colors
      let strokeColor1 = 'rgba(168, 85, 247, 0.4)'; // Purple
      let strokeColor2 = 'rgba(236, 72, 153, 0.25)'; // Pink
      let glowColor = 'rgba(168, 85, 247, 0.6)';

      if (theme === 'guess') {
        strokeColor1 = 'rgba(6, 182, 212, 0.4)'; // Cyan
        strokeColor2 = 'rgba(16, 185, 129, 0.25)'; // Green / Emerald
        glowColor = 'rgba(6, 182, 212, 0.6)';
      } else if (theme === 'idle') {
        strokeColor1 = 'rgba(113, 113, 122, 0.15)'; // Slate-500 dimmed
        strokeColor2 = 'rgba(63, 63, 70, 0.1)'; // Zinc-700 dimmed
        glowColor = 'rgba(113, 113, 122, 0.05)';
      }

      // Smooth amplitude scaling so it doesn't snap
      const currentAmplitude = amplitude * (w * 0.24); // max amplitude is 24% of width
      const centerLine = w / 2;

      // Draw Wave 1
      ctx.shadowBlur = isActive ? 12 : 3;
      ctx.shadowColor = glowColor;

      ctx.beginPath();
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.strokeStyle = strokeColor1;

      for (let y = 0; y <= h; y += 2) {
        // Compute standard sine displacement
        // vertical wave means x coordinate varies with y
        const theta = (y / wavelength) * Math.PI * 2 + phaseRef.current;
        const xOffset = Math.sin(theta) * currentAmplitude;
        
        // Add a secondary harmonic for premium complexity
        const outerHarmonic = Math.sin(theta * 1.5 - phaseRef.current * 0.5) * (currentAmplitude * 0.3);

        const x = centerLine + xOffset + outerHarmonic;
        if (y === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw Wave 2 (mirror or phase-shifted harmonized line)
      ctx.beginPath();
      ctx.lineWidth = isActive ? 1.5 : 0.8;
      ctx.strokeStyle = strokeColor2;

      for (let y = 0; y <= h; y += 3) {
        // Phase shift of PI gives standard balanced double-helix waves
        const theta = (y / wavelength) * Math.PI * 2 - phaseRef.current + Math.PI;
        const xOffset = Math.sin(theta) * currentAmplitude;
        const x = centerLine + xOffset;
        
        if (y === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Reset shadows
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frequency, amplitude, theme, isActive]);

  return (
    <canvas
      id="bg-waveform"
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-80"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
