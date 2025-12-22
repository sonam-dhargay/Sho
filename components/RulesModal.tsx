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
            <h2 className="text-3xl font-cinzel text-amber-500 font-bold leading-none">Rules of Sho ཤོ་འི་སྒྲིག་གཞི།</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-8 font-sans text-stone-300 leading-relaxed">
          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 flex flex-col md:flex-row justify-between gap-4">
              <div>
                  <h4 className="font-bold text-amber-400 mb-2">Game Variant རྩེད་རིགས་འདམ་ག: {isNinerMode ? "Niner Mode དགུ་མ།" : "No-Niner Mode དགུ་མ་མིན་པ།"}</h4>
                  <p className="text-sm text-stone-400 italic">{isNinerMode ? "In Niner mode, players are allowed to build a stack of nine coins and charge forward. དགུ་མའི་ནང་དུ་རྩེད་མོ་བ་ཚོས་ལག་ཁྱི་དགུ་བརྩེགས་ནས་མདུན་དུ་བསྐྱོད་ཆོག" : "In this variant, it is forbidden to build a stack of all nine coins. འདིའི་ནང་དུ་ལག་ཁྱི་དགུ་བརྩེགས་མི་ཆོག"}</p>
              </div>
              <button onClick={onToggleNinerMode} className="bg-amber-700 px-6 py-2 rounded-full font-bold text-white text-xs uppercase">
                  Switch Variant
              </button>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">Objective དམིགས་ཡུལ།</h3>
            <p>Sho is a race game played on a spiral of 64 shells. Each player has 9 coins. The goal is to move all your coins from your hand (start) to the end of the spiral. ཤོ་ནི་འགྲན་བསྡུར་གྱི་རྩེད་མོ་ཞིག་ཡིན་ཞིང་། རྡེའུ་་ ༦༤ གཏོང་གིན་རྩེ་དགོས། ཤོ་པ་རེར་ལག་ཁྱི་ ༩ རེ་ཡོད། དམིགས་ཡུལ་ནི་ལག་ཁྱི་་ཚང་མ་ལ་ཕུད་དགོས།</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">The 'Sho-mo' ཤོ་མོ།</h3>
            <p className="text-sm mb-2">On the very first roll of the opening round, players can place two coins. This initial stack is called the 'Sho-mo'. འགོ་འཛུགས་སྐབས་ཤོ་ཐེངས་དང་པོ་དེར་ལག་ཁྱི་་གཉིས་འཇོག་ཆོག འདི་ལ་'ཤོ་མོ་'ཟེར།</p>
            <p className="text-sm">Killer Bonus: If an opponent lands on and kills your 'Sho-mo', they can place three coins in its place immediately (taking the extra from their hand). གསོད་རིན། གལ་ཏེ་ཁ་གཏད་ཀྱིས་་ཁྱེད་ཀྱི་'ཤོ་མོ་'བསད་པ་ཡིན་ན། ཁོས་དེའི་ཚབ་ཏུ་ལག་ཁྱི་གསུམ་འཇོག་ཆོག</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">The Pa Ra Rule པ་རའི་སྒྲིག་གཞི།</h3>
            <p className="text-sm mb-2">Rolling a 1 and 1 is called 'Pa Ra'. It is the most powerful roll in the game. ཤོ་མིག་ ༡ དང་ ༡ བབས་ན་'པ་ར་'ཟེར།</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>Bonus Roll:</strong> You get to roll again immediately. ཤོ་བསྐྱར་དུ་རྒྱག་ཆོག</li>
              <li><strong>Opening Pa Ra:</strong> If you roll a Pa Ra on your very first turn, you can place 3 coins (lak-khyi) on the board instead of 2. ཤོ་འགོ་འཛུགས་སྐབས་པ་ར་བབས་ན་ལག་ཁྱི་གསུམ་འཇོག་ཆོག</li>
              <li><strong>Move Stacking:</strong> The move values from the Pa Ra (2) and your bonus roll are both added to your pool. ཤོ་མིག་རྣམས་བསྡོམས་ནས་གཏོང་ཆོག</li>
              <li><strong>Infinite Chain:</strong> Rolling multiple Pa Ras in a row keeps giving you bonus rolls! པ་ར་མུ་མཐུད་བབས་ན་ཤོ་རྒྱག་ཐེངས་མང་པོ་ཐོབ།</li>
            </ul>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-800/50 p-4 rounded-lg">
                  <h4 className="font-bold text-amber-400 mb-1">Stacking བརྩེགས་སྟངས།</h4>
                  <p className="text-xs">If you land on your own piece, they stack together. Stacks move as a single unit. In this game, stacking also grants a bonus roll! གལ་ཏེ་རང་གི་ལག་ཁྱིའི་ཐོག་ཏུ་བབས་ན་བརྩེགས་ཆོག་པ་མ་ཟད་ཤོ་ཐེངས་གཅིག་ཁ་སྣོན་ཐོབ།</p>
              </div>
              <div className="bg-stone-800/50 p-4 rounded-lg border border-red-900/20">
                  <h4 className="font-bold text-red-400 mb-1">Killing བསད་སྟངས།</h4>
                  <p className="text-xs">If you land on an opponent's stack that is equal to or smaller than yours, you 'kill' it. They return to hand, and you get a Bonus Roll! གལ་ཏེ་ཁ་གཏད་ཀྱི་ལག་ཁྱི་བསད་པ་ཡིན་ན་ཤོ་ཐེངས་གཅིག་ཁ་སྣོན་ཐོབ།</p>
              </div>
          </section>

          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700">
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">Blocking བཀག་སྟངས།</h3>
            <p className="text-sm">You cannot land on an opponent's stack that is larger than your own. It is 'blocked'. རང་ལས་མང་བའི་ཁ་གཏད་ཀྱི་ལག་ཁྱིའི་ཐོག་ཏུ་བབས་མི་ཆོག། དེ་ལ་བཀག་པ་ཟེར།</p>
          </section>

          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-xl font-cinzel text-amber-400 mb-2">Instant Win དེ་མ་ཐག་པའི་རྒྱལ་ཁ།</h3>
            <p className="text-sm mb-2">In very rare circumstances, a player may win instantly: ཆེས་དཀོན་པའི་གནས་སྟངས་འོག་དེ་མ་ཐག་རྒྱལ་ཁ་ཐོབ་སྲིད།</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>Triple Pa Ra:</strong> Roll a Pa Ra (1,1) three times in a row. པ་ར་གསུམ་བརྩེགས།</li>
              <li><strong>Stacked Dice:</strong> Dice land physically stacked on top of each other. ཤོ་བརྩེགས་བབས་པ།</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-cinzel text-amber-200 mb-2">Finishing རྩེད་མོ་མཇུག་སྒྲིལ་སྟངས།.</h3>
            <p className="text-sm">You must roll a number that takes your piece past the 64th shell. ཁྱེད་རང་གི་ལག་ཁྱི་དེ་དག་རྡེའུ་ ༦༤ བརྒལ་བར་འགྲོ་ཐུབ་པའི་་ཤོ་མིག་ཞིག་བབས་དགོས།</p>
            <p className="text-sm mt-2">The first player to move all 9 coins off the board wins! ལག་ཁྱི་་ ༩ ཆར་ཚང་མ་ལ་བརྒལ་མཁན་དེ་ལ་རྒྱལ་ཁ་ཐོབ་པ་་ཡིན།</p>
          </section>

          <section className="pt-4 border-t border-stone-800">
            <h3 className="text-lg font-cinzel text-amber-200 mb-3 uppercase tracking-wider">Learn More ཁ་སྣོན་ཤེས་བྱ།</h3>
            <div className="flex flex-col gap-2">
              <a 
                href="https://en.wikipedia.org/wiki/Sho_(dice_game)" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 underline text-sm transition-colors"
              >
                Sho (Dice Game) - English Wikipedia
              </a>
              <a 
                href="https://bo.wikipedia.org/wiki/%E0%BD%A4%E0%BD%BC%E0%BC%8B%E0%BD%A2%E0%BE%A9%E0%BD%BA%E0%BD%91%E0%BC%8B" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 underline text-sm transition-colors font-serif"
              >
                ཤོ་རྩེད་ - བོད་ཡིག་གི་ཝེ་ཁེ་རིག་མཛོད། (Tibetan Wikipedia)
              </a>
            </div>
          </section>
        </div>

        <div className="p-6 text-center">
          <button onClick={onClose} className="px-8 py-3 bg-amber-700 text-white font-cinzel font-bold rounded-lg uppercase tracking-widest shadow-lg">Close ཁ་རྒྱོབ།</button>
        </div>
      </div>
    </div>
  );
};