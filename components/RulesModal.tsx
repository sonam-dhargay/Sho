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
            <h2 className="text-3xl font-cinzel text-amber-500 font-bold leading-none">
              {T.rules.title.en} {T.rules.title.bo}
            </h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-8 font-sans text-stone-300 leading-relaxed">
          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 flex flex-col md:flex-row justify-between gap-4">
              <div>
                  <h4 className="font-bold text-amber-400 mb-2">
                    {T.rules.variant.en} {T.rules.variant.bo}: {isNinerMode ? T.rules.ninerMode.en : T.rules.noNinerMode.en} ({isNinerMode ? T.rules.ninerMode.bo : T.rules.noNinerMode.bo})
                  </h4>
                  <p className="text-sm text-stone-400 italic">
                    {isNinerMode ? T.rules.ninerDesc.en : T.rules.noNinerDesc.en}
                  </p>
                  <p className="text-sm text-stone-500 italic mt-1">
                    {isNinerMode ? T.rules.ninerDesc.bo : T.rules.noNinerDesc.bo}
                  </p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 px-6 py-2 rounded-full font-bold text-white text-xs uppercase shadow-md hover:bg-amber-600 transition-colors whitespace-nowrap h-fit self-center">
                  Switch བརྗེ་བོ།
              </button>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">{T.rules.objectiveTitle.en} {T.rules.objectiveTitle.bo}</h3>
            <p>{T.rules.objectiveDesc.en}</p>
            <p className="text-stone-400 mt-1">{T.rules.objectiveDesc.bo}</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">{T.rules.shomoTitle.en} {T.rules.shomoTitle.bo}</h3>
            <p className="text-sm mb-2">{T.rules.shomoRule1.en}</p>
            <p className="text-xs text-stone-400 mb-3">{T.rules.shomoRule1.bo}</p>
            <p className="text-sm">{T.rules.shomoRule2.en}</p>
            <p className="text-xs text-stone-400">{T.rules.shomoRule2.bo}</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">{T.rules.paraTitle.en} {T.rules.paraTitle.bo}</h3>
            <p className="text-sm mb-2">{T.rules.paraDesc.en} {T.rules.paraDesc.bo}</p>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>
                <strong>Bonus Roll:</strong> {T.rules.paraRule1.en}
                <div className="text-xs text-stone-500 ml-5">{T.rules.paraRule1.bo}</div>
              </li>
              <li>
                <strong>Move Stacking:</strong> {T.rules.paraRule2.en}
                <div className="text-xs text-stone-500 ml-5">{T.rules.paraRule2.bo}</div>
              </li>
            </ul>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-800/50 p-4 rounded-lg border border-stone-700">
                  <h4 className="font-bold text-amber-400 mb-1">{T.rules.stackingTitle.en} {T.rules.stackingTitle.bo}</h4>
                  <p className="text-xs">{T.rules.stackingDesc.en}</p>
                  <p className="text-[10px] text-stone-500 mt-1">{T.rules.stackingDesc.bo}</p>
              </div>
              <div className="bg-stone-800/50 p-4 rounded-lg border border-red-900/20">
                  <h4 className="font-bold text-red-400 mb-1">{T.rules.killingTitle.en} {T.rules.killingTitle.bo}</h4>
                  <p className="text-xs">{T.rules.killingDesc.en}</p>
                  <p className="text-[10px] text-stone-500 mt-1">{T.rules.killingDesc.bo}</p>
              </div>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">{T.rules.instantWinTitle.en} {T.rules.instantWinTitle.bo}</h3>
            <p className="text-sm mb-2">{T.rules.instantWinDesc.en} {T.rules.instantWinDesc.bo}</p>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>
                {T.rules.triplePara.en}
                <div className="text-xs text-stone-500 ml-5">{T.rules.triplePara.bo}</div>
              </li>
              <li>
                {T.rules.stackedDice.en}
                <div className="text-xs text-stone-500 ml-5">{T.rules.stackedDice.bo}</div>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">{T.rules.finishingTitle.en} {T.rules.finishingTitle.bo}</h3>
            <p className="text-sm">{T.rules.finishingRule1.en}</p>
            <p className="text-xs text-stone-500 mt-1 mb-3">{T.rules.finishingRule1.bo}</p>
            <p className="text-sm">{T.rules.finishingRule2.en}</p>
            <p className="text-xs text-stone-500 mt-1">{T.rules.finishingRule2.bo}</p>
          </section>
        </div>

        <div className="p-6 text-center">
          <button onClick={onClose} className="px-8 py-3 bg-amber-700 text-white font-cinzel font-bold rounded-lg uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all">
            {T.common.close.en} {T.common.close.bo}
          </button>
        </div>
      </div>
    </div>
  );
};
