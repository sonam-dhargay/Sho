import React from 'react';
import { T } from '../translations';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNinerMode: boolean;
  onToggleNinerMode: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, isNinerMode, onToggleNinerMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-stone-900 border border-amber-700/50 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-stone-900 border-b border-amber-900/50 p-6 flex justify-between items-center z-10">
          <div className="flex flex-col">
            <h2 className="text-3xl font-cinzel text-amber-500 font-bold leading-none">{T.rules.title.en}</h2>
            <span className="text-sm font-serif text-amber-700 mt-1">{T.rules.title.bo}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-8 font-sans text-stone-300 leading-relaxed">
          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 flex flex-col md:flex-row justify-between gap-4">
              <div>
                  <h4 className="font-bold text-amber-400 mb-2">{T.rules.variant.en} {T.rules.variant.bo}: {isNinerMode ? T.rules.ninerMode.en : T.rules.noNinerMode.en}</h4>
                  <p className="text-sm text-stone-400 italic">{isNinerMode ? T.rules.ninerDesc.en : T.rules.noNinerDesc.en}</p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 px-6 py-2 rounded-full font-bold text-white text-xs flex flex-col items-center">
                  <span>{isNinerMode ? 'SWITCH' : 'SWITCH'}</span>
                  <span className="font-serif">{isNinerMode ? T.rules.noNinerMode.bo : T.rules.ninerMode.bo}</span>
              </button>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2 flex flex-col">
              <span>{T.rules.objectiveTitle.en}</span>
              <span className="text-sm font-serif text-stone-500">{T.rules.objectiveTitle.bo}</span>
            </h3>
            <p>{T.rules.objectiveDesc.en}</p>
            <p className="font-serif text-stone-500 mt-2">{T.rules.objectiveDesc.bo}</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2 flex flex-col">
              <span>{T.rules.shomoTitle.en}</span>
              <span className="text-sm font-serif text-amber-700">{T.rules.shomoTitle.bo}</span>
            </h3>
            <p className="text-sm mb-2">{T.rules.shomoRule1.en}</p>
            <p className="text-sm font-serif text-amber-900 mb-4">{T.rules.shomoRule1.bo}</p>
            <p className="text-sm">{T.rules.shomoRule2.en}</p>
            <p className="text-sm font-serif text-amber-900">{T.rules.shomoRule2.bo}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-800/50 p-4 rounded-lg">
                  <h4 className="font-bold text-amber-400 mb-1 flex flex-col">
                    <span>{T.rules.stackingTitle.en}</span>
                    <span className="font-serif text-xs opacity-50">{T.rules.stackingTitle.bo}</span>
                  </h4>
                  <p className="text-xs">{T.rules.stackingDesc.en}</p>
              </div>
              <div className="bg-stone-800/50 p-4 rounded-lg border border-red-900/20">
                  <h4 className="font-bold text-red-400 mb-1 flex flex-col">
                    <span>{T.rules.killingTitle.en}</span>
                    <span className="font-serif text-xs opacity-50">{T.rules.killingTitle.bo}</span>
                  </h4>
                  <p className="text-xs">{T.rules.killingDesc.en}</p>
              </div>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2 flex flex-col">
              <span>{T.rules.finishingTitle.en}</span>
              <span className="text-sm font-serif text-stone-500">{T.rules.finishingTitle.bo}</span>
            </h3>
            <p className="text-sm">{T.rules.finishingRule1.en}</p>
            <p className="font-serif text-stone-500 text-sm mb-2">{T.rules.finishingRule1.bo}</p>
            <p className="text-sm">{T.rules.finishingRule2.en}</p>
            <p className="font-serif text-stone-500 text-sm">{T.rules.finishingRule2.bo}</p>
          </section>
        </div>

        <div className="p-6 text-center">
          <button onClick={onClose} className="px-8 py-3 bg-amber-700 text-white font-cinzel font-bold rounded-lg flex flex-col items-center mx-auto leading-tight">
            <span>{T.common.close.en}</span><span className="text-[10px] font-serif">{T.common.close.bo}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
