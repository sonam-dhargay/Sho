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
    <div className="flex flex-col items-center justify-center p-1 md:p-6 bg-stone-800 rounded-xl border border-stone-600 shadow-xl transition-all duration-300">
        
        {/* Status / Values */}
        <div className="space-y-1 md:space-y-4 w-full flex flex-col items-center">
            
            {/* Flexible Pool Display */}
            {flexiblePool !== null && (
                <div className="w-full bg-amber-900/40 border border-amber-600/50 rounded-lg p-1.5 md:p-3 text-center mb-1 md:mb-2 animate-pulse">
                    <div className="text-amber-400 text-[9px] md:text-xs uppercase tracking-widest font-bold mb-0.5 md:mb-1">Flexible Pa Ra Pool</div>
                    <div className="text-2xl md:text-4xl font-cinzel text-white drop-shadow-md">{flexiblePool}</div>
                    <div className="text-stone-400 text-[9px] mt-0.5 md:mt-1 font-serif">པ་ར་བཞུགས།</div>
                </div>
            )}

            {/* Standard Pending Values */}
            {pendingValues.length > 0 && flexiblePool === null && (
                <div className="w-full">
                    <div className="text-[9px] md:text-xs text-stone-400 uppercase tracking-widest text-center mb-1 md:mb-2 flex flex-col items-center gap-0.5">
                      <span>Available Moves</span>
                      <span className="opacity-50 font-serif">ག་རེ་གནང་ག</span>
                    </div>
                    <div className="flex gap-1.5 md:gap-2 flex-wrap justify-center">
                        {pendingValues.map((val, idx) => (
                            <span key={idx} className="bg-indigo-600 text-white px-2.5 py-1 md:px-4 md:py-2 rounded-lg font-bold text-base md:text-xl shadow-lg border border-indigo-400/30">
                                {val}
                            </span>
                        ))}
                        {pendingValues.length > 1 && (
                            <span className="bg-indigo-900/50 text-indigo-200 px-1.5 py-0.5 md:px-3 md:py-2 rounded-lg font-bold text-[10px] md:text-sm border border-indigo-700 flex items-center">
                            Sum: {pendingValues.reduce((a,b)=>a+b, 0)}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State / Prompt - Hidden on Mobile */}
            {!waitingForPaRa && flexiblePool === null && pendingValues.length === 0 && (
                 <div className="hidden md:flex flex-col items-center text-stone-500 text-[10px] md:text-sm italic py-0.5 md:py-2 gap-1">
                     <span>{canRoll ? "Ready to roll..." : "Waiting..." }</span>
                     <span className="font-serif opacity-40">{canRoll ? "ཤོ་རྒྱག་རན་སོང་།" : "སྒུག་བཞུགས།"}</span>
                 </div>
            )}

            {/* Action Button */}
            <button
                onClick={onRoll}
                disabled={!canRoll && !waitingForPaRa}
                className={`
                    w-full px-4 py-2 md:px-6 md:py-4 rounded-lg font-cinzel font-bold text-base md:text-xl transition-all transform tracking-wider flex flex-col items-center leading-tight
                    ${(canRoll || waitingForPaRa)
                        ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg hover:scale-[1.02] active:scale-95 border border-amber-500/20' 
                        : 'bg-stone-700 text-stone-500 cursor-not-allowed border border-stone-600'}
                    ${waitingForPaRa ? 'animate-bounce border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : ''}
                `}
            >
                {waitingForPaRa 
                    ? (
                      <>
                        <span>ROLL BONUS!</span>
                        <span className="text-xs font-serif tracking-normal">པ་ར།</span>
                      </>
                    ) 
                    : canRoll 
                        ? (
                          <>
                            <span>ROLL DICE</span>
                            <span className="text-xs font-serif tracking-normal">ཤོ་རྒྱོབ།</span>
                          </>
                        ) 
                        : (
                          <>
                            <span>SELECT MOVE</span>
                            <span className="text-xs font-serif tracking-normal">ག་རེ་སྤོ་ག་དོམ།</span>
                          </>
                        )
                }
            </button>
        </div>
    </div>
  );
};