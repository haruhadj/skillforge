import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Eraser, Undo2, Eye, Check, RefreshCw } from 'lucide-react';
import { LearningModeProps, StudyItem } from './types';

type Point = { x: number; y: number };
const RES = 320; // internal canvas resolution (square)

/**
 * Writing practice with self-check. The player draws the prompted glyph on a
 * touch/mouse canvas, taps "Reveal" to compare against the model character, then
 * self-grades. No handwriting recognition — fully offline.
 */
export default function WritingCanvas({ items, onFinish, onBack }: LearningModeProps) {
  const deck = useMemo(
    () => [...items].sort(() => Math.random() - 0.5).slice(0, 12),
    [items],
  );

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);

  const card: StudyItem | undefined = deck[idx];

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, RES, RES);
    // guide grid
    ctx.strokeStyle = 'rgba(99,102,241,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(RES / 2, 0); ctx.lineTo(RES / 2, RES);
    ctx.moveTo(0, RES / 2); ctx.lineTo(RES, RES / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // strokes
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length < 1) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
      ctx.stroke();
    }
  }, []);

  useEffect(() => { redraw(); }, [redraw, idx]);

  const toCanvasPoint = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * RES,
      y: ((e.clientY - rect.top) / rect.height) * RES,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([toCanvasPoint(e)]);
    redraw();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    strokesRef.current[strokesRef.current.length - 1].push(toCanvasPoint(e));
    redraw();
  };
  const onPointerUp = () => { drawingRef.current = false; };

  const clear = () => { strokesRef.current = []; redraw(); };
  const undo = () => { strokesRef.current.pop(); redraw(); };

  const grade = (gain: number) => {
    const newXp = xp + gain;
    setXp(newXp);
    if (idx + 1 >= deck.length) {
      setDone(true);
      onFinish(newXp + 4);
      return;
    }
    strokesRef.current = [];
    setRevealed(false);
    setIdx(idx + 1);
  };

  if (!card && !done) {
    return (
      <div className="text-center py-16 text-slate-400">
        No characters available to practise.
        <button onClick={onBack} className="block mx-auto mt-4 text-indigo-400 font-bold cursor-pointer">Go back</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-12 space-y-5 max-w-sm mx-auto">
        <div className="text-6xl">🖌️</div>
        <h3 className="text-2xl font-black text-slate-100">Writing Session Done!</h3>
        <p className="text-slate-400 text-sm">You earned <strong className="text-indigo-400">+{xp + 4} XP</strong> practising your strokes.</p>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => { setIdx(0); setXp(0); setRevealed(false); strokesRef.current = []; setDone(false); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Practise Again
          </button>
          <button onClick={onBack} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition-colors cursor-pointer">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="font-mono text-xs text-slate-400">{idx + 1} / {deck.length}</span>
      </div>

      {/* Prompt */}
      <div className="text-center rounded-2xl border border-slate-800 bg-slate-900/60 py-4 px-5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Draw this character</p>
        <p className="text-2xl font-bold text-slate-100 mt-1">{card!.romaji}</p>
        {card!.meaning && <p className="text-sm text-emerald-400 font-semibold">{card!.meaning}</p>}
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-square rounded-3xl border-2 border-slate-800 bg-slate-950 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={RES}
          height={RES}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
        />
        {revealed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[180px] leading-none font-bold text-indigo-400/25 select-none">{card!.jp}</span>
          </div>
        )}
      </div>

      {/* Tools */}
      <div className="grid grid-cols-3 gap-2.5">
        <button onClick={undo} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-sm">
          <Undo2 size={15} /> Undo
        </button>
        <button onClick={clear} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-sm">
          <Eraser size={15} /> Clear
        </button>
        <button onClick={() => setRevealed((r) => !r)} className="bg-indigo-600/20 border border-indigo-600/40 text-indigo-300 hover:bg-indigo-600/30 font-semibold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-sm">
          <Eye size={15} /> {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>

      {/* Self-grade (after reveal) */}
      {revealed ? (
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => grade(0)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition-colors cursor-pointer text-sm">
            Retry
          </button>
          <button onClick={() => grade(4)} className="bg-amber-600/80 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer text-sm">
            Almost
          </button>
          <button onClick={() => grade(8)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-1.5">
            <Check size={15} /> Got it
          </button>
        </div>
      ) : (
        <p className="text-center text-[11px] text-slate-500 font-mono">Draw your best attempt, then tap Reveal to self-check.</p>
      )}
    </div>
  );
}
