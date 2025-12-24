import React from 'react';
import { DiceRoll } from '../types';

interface DiceAreaProps {
  currentRoll: DiceRoll | null;
  onRoll: () => void;
  canRoll: boolean;
  pendingValues: number[];
  waitingForPaRa: boolean;
  paRaCount?: number;
  extraRolls?: number;
  flexiblePool: number | null;
}

export const DiceArea: React.FC<DiceAreaProps> = ({ 
  currentRoll, 
  onRoll, 
  canRoll, 
  pendingValues, 
  waitingForPaRa, 
  paRaCount = 0,
  extraRolls = 0,
  flexiblePool 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-1 md:p-3 bg-stone-800/80 rounded-xl border border-stone-700 shadow-xl w-full">
        
        {extraRolls > 0 && (
            <div className="w-full bg-blue-900/40 border border-blue-600/50 rounded-lg py-0.5 md:p-2 text-center mb-1 animate-pulse">
                <div className="text-blue-300 text-[5px] md:text-[8px] uppercase font-bold tracking-widest">Bonus Rolls</div>
                <div className="text-xs md:text-xl font-cinzel text-white leading-none">+{extraRolls}</div>
            </div>
        )}

        {flexiblePool !== null && (
            <div className="w-full bg-amber-900/40 border border-amber-600/50 rounded-lg p-1 md:p-3 text-center mb-1 animate-pulse">
                <div className="text-amber-400 text-[6px] md:text-[10px] uppercase font-bold">Flexible Pool</div>
                <div className="text-lg md:text-3xl font-cinzel text-white">{flexiblePool}</div>
            </div>
        )}

        {pendingValues.length > 0 && flexiblePool === null && (
            <div className="w-full mb-1">
                <div className="flex gap-1 justify-center flex-wrap">
                    {pendingValues.map((val, idx) => (
                        <span key={idx} className={`px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-lg font-bold text-[10px] md:text-lg shadow-lg border ${val === 2 ? 'bg-amber-600 border-amber-400/30' : 'bg-indigo-600 border-indigo-400/30'} text-white`}>{val}</span>
                    ))}
                </div>
            </div>
        )}

        {waitingForPaRa && (
            <div className="mb-0.5 text-center">
                <div className="text-[6px] md:text-[10px] text-amber-500 uppercase font-bold animate-pulse">
                    Pa Ra Chain: {paRaCount}
                </div>
            </div>
        )}

        <button
            onClick={onRoll}
            disabled={!canRoll && !waitingForPaRa}
            className={`
                w-full py-1.5 md:py-3.5 rounded-lg font-cinzel font-bold transition-all flex flex-col items-center justify-center leading-none
                ${(canRoll || waitingForPaRa) ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg text-[10px] md:text-lg' : 'bg-stone-700 text-stone-500 cursor-not-allowed text-[8px] md:text-sm'}
                ${waitingForPaRa ? 'animate-bounce border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''}
            `}
        >
            <div className="flex items-center gap-2">
              <span>{waitingForPaRa ? "ROLL BONUS!" : canRoll ? "ROLL DICE" : "WAITING"}</span>
              <span className="text-amber-400 text-lg md:text-2xl font-serif">ཤོ་རྒྱོབ།</span>
            </div>
        </button>
    </div>
  );
};
