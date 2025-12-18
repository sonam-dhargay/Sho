import React from 'react';
import { T } from '../translations';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const stepData = T.tutorial.steps[step - 1];
  if (!stepData) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end p-6">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full shadow-2xl pointer-events-auto relative animate-bounce-in">
        <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
                <h3 className="text-xl font-cinzel font-bold text-amber-400 leading-none">{stepData.title.en}</h3>
                <span className="text-sm font-serif text-amber-600 mt-1">{stepData.title.bo}</span>
            </div>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold">Skip</button>
        </div>
        <div className="text-stone-200 mb-6 font-sans text-sm leading-relaxed">
            <p className="mb-2">{stepData.text.en}</p>
            <p className="font-serif text-stone-400">{stepData.text.bo}</p>
        </div>
        <div className="flex justify-end">
            {stepData.action ? (
                <button 
                    onClick={stepData.action.en === 'Finish Tutorial' ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg flex flex-col items-center leading-tight"
                >
                    <span>{stepData.action.en}</span>
                    <span className="text-[10px] font-serif">{stepData.action.bo}</span>
                </button>
            ) : (
                <span className="text-stone-400 text-sm italic animate-pulse">Waiting for action...</span>
            )}
        </div>
      </div>
    </div>
  );
};
