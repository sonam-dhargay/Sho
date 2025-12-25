import React from 'react';
import { T } from '../translations';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const current = T.tutorial.steps[step - 1];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end items-end p-4 md:p-10">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-5 max-w-[320px] md:max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative animate-bounce-in backdrop-blur-md">
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-cinzel font-bold text-amber-400 leading-tight">
              {current.title.en}<br/>
              <span className="text-sm font-serif">{current.title.bo}</span>
            </h3>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold uppercase text-[10px]">
              {T.common.back.en} {T.common.back.bo}
            </button>
        </div>
        <div className="text-stone-300 mb-5 text-xs md:text-sm leading-relaxed">
          <p>{current.text.en}</p>
          <p className="mt-2 text-stone-500 font-serif">{current.text.bo}</p>
        </div>
        <div className="flex justify-end">
            {current.action ? (
                <button 
                    onClick={step === T.tutorial.steps.length ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-5 rounded-lg uppercase tracking-widest text-[10px] shadow-lg shadow-amber-900/40 transition-colors flex flex-col items-center"
                >
                    <span>{current.action.en}</span>
                    <span className="text-[9px] font-serif opacity-80">{current.action.bo}</span>
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      Waiting སྒུག་བཞིན་པ།...
                    </span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
