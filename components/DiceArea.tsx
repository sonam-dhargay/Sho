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
    <div className="flex flex-col items-center justify-center p-4 bg-stone-800 rounded-xl border border-stone-600 shadow-xl w-full">
        
        {flexiblePool !== null && (
            <div className="w-full bg-amber-900/40 border border-amber-600/50 rounded-lg p-3 text-center mb-4 animate-pulse">
                <div className="text-amber-400 text-[10px] uppercase font-bold">Flexible Pa Ra Pool པ་ར་བཞུགས།</div>
                <div className="text-4xl font-cinzel text-white">{flexiblePool}</div>
            </div>
        )}

        {pendingValues.length > 0 && flexiblePool === null && (
            <div className="w-full mb-4">
                <div className="text-[10px] text-stone-400 uppercase tracking-widest text-center mb-2 flex flex-col items-center">
                  <span>Available Moves ཤོ་མིག་གྲངས།</span>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                    {pendingValues.map((val, idx) => (
                        <span key={idx} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xl shadow-lg border border-indigo-400/30">{val}</span>
                    ))}
                </div>
            </div>
        )}

        {!waitingForPaRa && flexiblePool === null && pendingValues.length === 0 && (
             <div className="flex flex-col items-center text-stone-500 text-sm italic mb-4">
                 <span>{canRoll ? "Ready to roll... ཤོ་རྒྱག་ཆོག་རེད་།" : "Waiting... སྒུག་བཞུགས།"}</span>
             </div>
        )}

        <button
            onClick={onRoll}
            disabled={!canRoll && !waitingForPaRa}
            className={`
                w-full p-4 rounded-lg font-cinzel font-bold text-xl transition-all flex flex-col items-center leading-tight
                ${(canRoll || waitingForPaRa) ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}
                ${waitingForPaRa ? 'animate-bounce border-2 border-amber-400' : ''}
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
