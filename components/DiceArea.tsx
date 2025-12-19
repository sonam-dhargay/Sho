import React from 'react';
import { DiceRoll } from '../types';

interface DiceAreaProps {
  currentRoll: DiceRoll | null;
  onRoll: () => void;
  canRoll: boolean;
  pendingValues: number[];
  waitingForPaRa: boolean;
  flexiblePool: number | null;
}

export const DiceArea: React.FC<DiceAreaProps> = ({ 
  currentRoll, 
  onRoll, 
  canRoll, 
  pendingValues, 
  waitingForPaRa, 
  flexiblePool 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-1.5 md:p-3 bg-stone-800/80 rounded-xl border border-stone-700 shadow-xl w-full">
        
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
                        <span key={idx} className="bg-indigo-600 text-white px-2 md:px-3 py-0.5 md:py-1.5 rounded-lg font-bold text-xs md:text-lg shadow-lg border border-indigo-400/30">{val}</span>
                    ))}
                </div>
            </div>
        )}

        {!waitingForPaRa && flexiblePool === null && pendingValues.length === 0 && (
             <div className="flex flex-col items-center text-stone-500 text-[8px] md:text-xs italic mb-1 md:mb-2">
                 <span>{canRoll ? "Ready to roll... ཤོ་རྒྱག་ཆོག་རེད་།" : "Waiting... སྒུག་བཞུགས།"}</span>
             </div>
        )}

        <button
            onClick={onRoll}
            disabled={!canRoll && !waitingForPaRa}
            className={`
                w-full p-2 md:p-3.5 rounded-lg font-cinzel font-bold text-xs md:text-lg transition-all flex flex-col items-center leading-tight
                ${(canRoll || waitingForPaRa) ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}
                ${waitingForPaRa ? 'animate-bounce border border-amber-400' : ''}
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