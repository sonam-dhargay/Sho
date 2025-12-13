
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
    <div className="flex flex-col items-center justify-center p-2 md:p-6 bg-stone-800 rounded-xl border border-stone-600 shadow-xl transition-all duration-300">
        
        {/* Status / Values */}
        <div className="space-y-1 md:space-y-4 w-full flex flex-col items-center">
            
            {/* Flexible Pool Display */}
            {flexiblePool !== null && (
                <div className="w-full bg-amber-900/40 border border-amber-600/50 rounded-lg p-1.5 md:p-3 text-center mb-1 md:mb-2 animate-pulse">
                    <div className="text-amber-400 text-[9px] md:text-xs uppercase tracking-widest font-bold mb-0.5 md:mb-1">Flexible Pa Ra Pool</div>
                    <div className="text-2xl md:text-4xl font-cinzel text-white drop-shadow-md">{flexiblePool}</div>
                    <div className="text-stone-400 text-[9px] mt-0.5 md:mt-1">Split this amount between two moves</div>
                </div>
            )}

            {/* Standard Pending Values */}
            {flexiblePool === null && pendingValues.length > 0 && (
                <div className="w-full">
                    <div className="text-[9px] md:text-xs text-stone-400 uppercase tracking-widest text-center mb-1 md:mb-2">Available Moves</div>
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

            {/* Empty State / Prompt */}