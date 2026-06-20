import React from 'react';
import { CardState } from '../types';
import * as Frac from '../utils/fraction';

interface CardTileProps {
  card: CardState;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  shakeTrigger: boolean;
}

export const CardTile: React.FC<CardTileProps> = ({
  card,
  isSelected,
  isDisabled,
  onClick,
  shakeTrigger
}) => {
  const isFractional = card.value.d > 1;
  const decimalVal = Frac.toFloat(card.value);

  return (
    <button
      id={`tile-${card.id}`}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative h-44 w-full md:w-40 flex flex-col items-center justify-between p-4 rounded-2xl
        transition-all duration-300 transform select-none cursor-pointer
        ${
          isSelected
            ? 'bg-gradient-to-br from-indigo-900 to-indigo-950 border-2 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.5)] scale-105 z-10'
            : 'bg-slate-800 border-2 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/90 hover:scale-102 shadow-lg active:scale-98'
        }
        ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${shakeTrigger ? 'animate-[shake_0.5s_ease-in-out]' : ''}
      `}
    >
      {/* Expression header */}
      <div className="text-[10px] font-mono text-slate-400 max-w-full truncate px-1 py-0.5 bg-slate-900/60 rounded border border-slate-700/50 w-full text-center">
        {card.expression}
      </div>

      {/* Main value display */}
      <div className="flex-1 flex items-center justify-center my-2">
        {isFractional ? (
          <div className="flex flex-col items-center justify-center font-serif leading-none">
            <span className="text-3xl font-bold text-indigo-100 border-b-2 border-slate-400 pb-1 px-1">
              {card.value.n}
            </span>
            <span className="text-3xl font-bold text-indigo-100 pt-1 px-1">
              {card.value.d}
            </span>
          </div>
        ) : (
          <span className="text-5xl font-black text-white tracking-tight font-sans">
            {card.value.n}
          </span>
        )}
      </div>

      {/* Approximate value indicator */}
      <div className="h-4 flex items-center">
        {isFractional && (
          <span className="text-xs font-mono text-indigo-300">
            ≈ {decimalVal.toFixed(2)}
          </span>
        )}
      </div>

      {/* Active Selection Glow Dot */}
      {isSelected && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
      )}
    </button>
  );
};
