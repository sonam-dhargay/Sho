import React from 'react';

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
            <h2 className="text-3xl font-cinzel text-amber-500 font-bold leading-none">Rules of Sho ཤོ་ཡི་སྒྲིག་གཞི།</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-8 font-sans text-stone-300 leading-relaxed">
          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 flex flex-col md:flex-row justify-between gap-4">
              <div>
                  <h4 className="font-bold text-amber-400 mb-2">Game Variant རྩེད་མོ་འདམ་ག།: {isNinerMode ? "Niner Mode དགུ་མ།" : "No-Niner Mode དགུ་མ་མིན་པ།"}</h4>
                  <p className="text-sm text-stone-400 italic">{isNinerMode ? "In Niner mode, players are allowed to build a stack of nine coins and charge forward. དགུ་མའི་ནང་དུ་རྩེད་མོ་བ་ཚོས་ཤོ་རྡོག་དགུ་བརྩེགས་ནས་མདུན་དུ་བསྐྱོད་ཆོག" : "In this variant, it is forbidden to build a stack of all nine coins. འདིའི་ནང་དུ་ཤོ་རྡོག་དགུ་བརྩེགས་རྒྱག་མི་ཆོག"}</p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 px-6 py-2 rounded-full font-bold text-white text-xs uppercase">
                  Switch Variant
              </button>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">Objective དམིགས་ཡུལ།</h3>
            <p>Sho is a race game played on a spiral of 64 shells. Each player has 9 coins. The goal is to move all your coins from your hand (start) to the end of the spiral. ཤོ་ནི་འགྲན་བསྡུར་གྱི་རྩེད་མོ་ཞིག་ཡིན་ཞིང་། དུང་དཀར་ ༦༤ ཡི་ཐོག་ཏུ་རྩེ་དགོས། རྩེད་མོ་བ་རེར་ཤོ་རྡོག་ ༩ རེ་ཡོད། དམིགས་ཡུལ་ནི་ཤོ་རྡོག་ཚང་མ་མཇུག་བསྡུ་སར་བསྐྱོད་རྒྱུ་དེ་ཡིན།</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">The 'Sho-mo' ཤོ་མོ།</h3>
            <p className="text-sm mb-2">On the very first roll of the opening round, players can place two coins. This initial stack is called the 'Sho-mo'. འགོ་འཛུགས་སྐབས་ཤོ་ཐེངས་དང་པོ་དེར་ཤོ་རྡོག་གཉིས་འཇོག་ཆོག འདི་ལ་'ཤོ་མོ་'ཟེར།</p>
            <p className="text-sm">Killer Bonus: If an opponent lands on and kills your 'Sho-mo', they can place three coins in its place immediately (taking the extra from their hand). གསོད་པའི་ཁེ་ཕན། གལ་ཏེ་ཕ་རོལ་པོས་ཁྱེད་ཀྱི་'ཤོ་མོ་'བསད་པ་ཡིན་ན། ཁོ་ཚོས་དེའི་ཚབ་ཏུ་ཤོ་རྡོག་གསུམ་འཇོག་ཆོག</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-800/50 p-4 rounded-lg">
                  <h4 className="font-bold text-amber-400 mb-1">Stacking བརྩེགས་པ།</h4>
                  <p className="text-xs">If you land on your own piece, they stack together. Stacks move as a single unit. གལ་ཏེ་རང་གི་ཤོ་རྡོག་གི་ཐོག་ཏུ་བབས་ན་དེ་དག་བརྩེགས་ནས་མཉམ་དུ་འགྲོ་ཐུབ།</p>
              </div>
              <div className="bg-stone-800/50 p-4 rounded-lg border border-red-900/20">
                  <h4 className="font-bold text-red-400 mb-1">Killing བསད་པ།</h4>
                  <p className="text-xs">If you land on an opponent's stack that is equal to or smaller than yours, you 'kill' it. They return to hand, and you get a Bonus Roll! གལ་ཏེ་ཕ་རོལ་པོའི་ཤོ་རྡོག་ཁྱེད་ཀྱི་ལས་ཉུང་བའམ་མཉམ་པ་ཡིན་ན། དེ་བསད་ནས་ལག་པར་སློག་ཆོག ཁྱེད་ལ་ཤོ་ཐེངས་གཅིག་རྒྱག་རྒྱུའི་ཁེ་ཕན།</p>
              </div>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">Finishing རྩེད་མོ་མཇུག་བསྡུ་བ།</h3>
            <p className="text-sm">You must roll a number that takes your piece past the 64th shell. ཤོ་མིག་གིས་ཤོ་རྡོག་དེ་དུང་དཀར་ ༦༤ ལས་བརྒལ་བར་བྱེད་དགོས།</p>
            <p className="text-sm mt-2">The first player to move all 9 coins off the board wins! ཤོ་རྡོག་ ༩ ཚང་མ་བཏོན་ཚར་མཁན་དེ་རྒྱལ་པོ་ཡིན།</p>
          </section>
        </div>

        <div className="p-6 text-center">
          <button onClick={onClose} className="px-8 py-3 bg-amber-700 text-white font-cinzel font-bold rounded-lg uppercase tracking-widest shadow-lg">Close ཁ་རྒྱོབ།</button>
        </div>
      </div>
    </div>
  );
};
