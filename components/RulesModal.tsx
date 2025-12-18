
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-stone-900 border border-amber-700/50 rounded-xl w-[95%] md:max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-stone-900/95 border-b border-amber-900/50 p-4 md:p-6 flex justify-between items-center z-10">
          <h2 className="text-xl md:text-3xl font-cinzel text-amber-500 font-bold tracking-wide">Rules of Sho</h2>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl font-bold transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-800"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 md:space-y-8 font-sans text-stone-300 leading-relaxed text-sm md:text-base">
          
          {/* Settings Section */}
          <section className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                      <h4 className="font-bold text-amber-400 mb-2">Game Variant: {isNinerMode ? "Niner Mode" : "No-Niner Mode"}</h4>
                      <p className="text-xs md:text-sm text-stone-400 leading-relaxed italic">
                          {isNinerMode 
                              ? "In Niner mode, players are allowed to build a stack of nine coins and charge forward." 
                              : "In this variant, it is forbidden to build a stack of all nine coins."}
                      </p>
                  </div>
                  <button 
                      onClick={onToggleNinerMode}
                      className={`
                          px-4 md:px-6 py-2 rounded-full font-bold transition-all border whitespace-nowrap self-start md:self-center text-xs md:text-sm
                          ${isNinerMode 
                              ? 'bg-amber-700 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                              : 'bg-stone-800 border-stone-600 text-stone-500 hover:border-stone-500'}
                      `}
                  >
                      {isNinerMode ? 'NINER' : 'NO-NINER'}
                  </button>
              </div>
          </section>

          {/* Objective */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🏁</span> Objective
            </h3>
            <p>
              Sho is a race game played on a spiral of 64 shells. Each player has <strong>9 coins</strong>. 
              The goal is to move all your coins from your hand (start) to the end of the spiral.
            </p>
          </section>

          {/* Special Rules: Sho-mo */}
          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-lg md:text-xl font-cinzel text-amber-400 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🐢</span> The 'Sho-mo' (Opening Move)
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                    On the very first roll of the opening round, players can place <strong>two coins</strong>. 
                    This initial stack is called the <strong>'Sho-mo'</strong>.
                </li>
                <li>
                    <strong>Killer Bonus:</strong> If an opponent lands on and kills your 'Sho-mo', they can place <strong>three coins</strong> in its place immediately (taking the extra from their hand).
                </li>
            </ul>
          </section>

          {/* Special Rules: Pa Ra */}
          <section className="bg-amber-950/30 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-lg md:text-xl font-cinzel text-amber-400 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🐍</span> The Pa Ra Rule (Snake Eyes)
            </h3>
            <p className="mb-2">Rolling a <strong>1 and 1</strong> is called "Pa Ra":</p>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li>You get to <strong>roll again</strong> immediately.</li>
                <li>The move values of both rolls are added to your available moves. You can move one stack by the total or two stacks separately.</li>
            </ul>
          </section>

          {/* Stacking, Killing, Blocking */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">⚔️</span> Tactics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-800/50 p-3 md:p-4 rounded-lg border border-stone-700">
                <h4 className="font-bold text-amber-400 mb-1">Stacking</h4>
                <p className="text-xs md:text-sm">
                  If you land on your own piece, they stack together. Stacks move as a single unit.
                </p>
              </div>
              <div className="bg-stone-800/50 p-3 md:p-4 rounded-lg border border-stone-700">
                <h4 className="font-bold text-red-400 mb-1">Killing</h4>
                <p className="text-xs md:text-sm">
                  If you land on an opponent's stack that is <strong>equal to or smaller</strong> than yours, you "kill" it. They return to hand, and you get a <strong>Bonus Roll</strong>!
                </p>
              </div>
              <div className="bg-stone-800/50 p-3 md:p-4 rounded-lg border border-stone-700 md:col-span-2">
                <h4 className="font-bold text-stone-300 mb-1">Blocking (The Larger Stack)</h4>
                <p className="text-xs md:text-sm">
                  You <strong>cannot</strong> land on or kill an opponent's stack if it is <strong>larger</strong> than the one you are moving. Your move is blocked.
                </p>
              </div>
            </div>
          </section>

          {/* Finishing the Game */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🏆</span> Finishing the Game
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li>You must roll a number that takes your piece <strong>past the 64th shell</strong>.</li>
                <li>The first player to move all 9 coins off the board wins!</li>
            </ul>
          </section>

          {/* External Links */}
          <section className="border-t border-stone-800 pt-6">
            <h3 className="text-sm md:text-base font-cinzel text-stone-400 mb-4 uppercase tracking-widest">Learn More</h3>
            <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://en.wikipedia.org/wiki/Sho_(board_game)" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-stone-800/30 hover:bg-stone-800 p-3 rounded-lg border border-stone-700 transition-all text-xs md:text-sm group"
                >
                    <span className="text-xl">🇬🇧</span>
                    <div>
                        <div className="text-stone-100 font-bold group-hover:text-amber-500 transition-colors">Sho on Wikipedia</div>
                        <div className="text-stone-500 text-[10px]">English Documentation</div>
                    </div>
                </a>
                <a 
                  href="https://bo.wikipedia.org/wiki/ཤོ།" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-stone-800/30 hover:bg-stone-800 p-3 rounded-lg border border-stone-700 transition-all text-xs md:text-sm group"
                >
                    <span className="text-xl">🏔️</span>
                    <div>
                        <div className="text-stone-100 font-bold group-hover:text-amber-500 transition-colors">ཤོ། བོད་ཡིག་གི་ཝེ་ཁེ་རིག་མཛོད།</div>
                        <div className="text-stone-500 text-[10px]">Tibetan Documentation</div>
                    </div>
                </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 pt-0 text-center">
          <button 
            onClick={onClose}
            className="px-6 md:px-8 py-2 md:py-3 bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 text-sm md:text-base"
          >
            Close Rules
          </button>
        </div>
      </div>
    </div>
  );
};
