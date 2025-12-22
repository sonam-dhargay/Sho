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
    <div className="flex flex-col items-center justify-center p-1.5 md:p-3 bg-stone-800/80 rounded-xl border border-stone-700 shadow-xl w-full">
        
        {extraRolls > 0 && (
            <div className="w-full bg-blue-900/40 border border-blue-600/50 rounded-lg p-1 md:p-2 text-center mb-1.5 animate-pulse">
                <div className="text-blue-300 text-[6px] md:text-[8px] uppercase font-bold tracking-widest">Bonus Rolls ཤོ་ཐེངས་ཁ་སྣོན།</div>
                <div className="text-sm md:text-xl font-cinzel text-white">+{extraRolls}</div>
            </div>
        )}

        {flexiblePool !== null && (
            <div className="w-full bg-amber-900/40 border border-amber-600/50 rounded-lg p-1.5 md:p-3 text-center mb-1.5 md:mb-3 animate-pulse">
                <div className="text-amber-400 text-[7px] md:text-[10px] uppercase font-bold">Flexible Pa Ra Pool པ་ར་བཞུགས།</div>
                <div className="text-xl md:text-3xl font-cinzel text-white">{flexiblePool}</div>
            </div>
        )}

        {pendingValues.length > 0 && flexiblePool === null && (
            <div className="w-full mb-1.5 md:mb-3">
                <div className="text-[7px] md:text-[10px] text-stone-400 uppercase tracking-widest text-center mb-1 flex flex-col items-center">
                  <span>Available Moves ཤོ་མིག་གྲངས།</span>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-center">
                    {pendingValues.map((val, idx) => (
                        <span key={idx} className={`px-2 md:px-3 py-0.5 md:py-1.5 rounded-lg font-bold text-xs md:text-lg shadow-lg border ${val === 2 ? 'bg-amber-600 border-amber-400/30' : 'bg-indigo-600 border-indigo-400/30'} text-white`}>{val}</span>
                    ))}
                </div>
            </div>
        )}

        {!waitingForPaRa && flexiblePool === null && pendingValues.length === 0 && (
             <div className="flex flex-col items-center text-stone-500 text-[8px] md:text-xs italic mb-1 md:mb-2">
                 <span>{canRoll ? "Ready to roll... ཤོ་རྒྱག་ཆོག་རེད་།" : "Waiting... སྒུག་བཞུགས།"}</span>
             </div>
        )}

        {waitingForPaRa && (
            <div className="mb-1 text-center">
                <div className="text-[7px] md:text-[10px] text-amber-500 uppercase font-bold animate-pulse">
                    Pa Ra Chain: {paRaCount} པ་ར་བརྩེགས།
                </div>
            </div>
        )}

        <button
            onClick={onRoll}
            disabled={!canRoll && !waitingForPaRa}
            className={`
                w-full p-2 md:p-3.5 rounded-lg font-cinzel font-bold transition-all flex flex-col items-center justify-center leading-tight
                ${(canRoll || waitingForPaRa) ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20 text-xs md:text-lg' : 'bg-stone-700 text-stone-500 cursor-not-allowed text-[9px] md:text-sm'}
                ${waitingForPaRa ? 'animate-bounce border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''}
            `}
        >
            {waitingForPaRa 
                ? (<><span>ROLL BONUS! པ་ར།</span></>) 
                : canRoll 
                    ? (<><span>ROLL DICE ཤོ་རྒྱོབ།</span></>) 
                    : (<><span>SELECT MOVE ག་རེ་གནང་ག།</span></>)
            }
        </button>
    </div>
  );
};