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
          <div className="flex flex-col">
            <h2 className="text-xl md:text-3xl font-cinzel text-amber-500 font-bold tracking-wide leading-none">Rules of Sho</h2>
            <span className="text-xs md:text-sm font-serif text-amber-700 mt-1">ཤོ་ཡི་སྒྲིག་གཞི།</span>
          </div>
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
                      <h4 className="font-bold text-amber-400 mb-2">Game Variant: {isNinerMode ? "Niner Mode དགུ་མ།" : "No-Niner Mode"}</h4>
                      <p className="text-xs md:text-sm text-stone-400 leading-relaxed italic">
                          {isNinerMode 
                              ? "In Niner mode, players are allowed to build a stack of nine coins and charge forward." 
                              : "In this variant, it is forbidden to build a stack of all nine coins."}
                      </p>
                  </div>
                  <button 
                      onClick={onToggleNinerMode}
                      className={`
                          px-4 md:px-6 py-2 rounded-full font-bold transition-all border whitespace-nowrap self-start md:self-center text-xs md:text-sm flex flex-col items-center leading-tight
                          ${isNinerMode 
                              ? 'bg-amber-700 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                              : 'bg-stone-800 border-stone-600 text-stone-500 hover:border-stone-500'}
                      `}
                  >
                      <span>{isNinerMode ? 'NINER' : 'NO-NINER'}</span>
                      <span className="text-[10px] font-serif normal-case tracking-normal">{isNinerMode ? 'དགུ་མ།' : 'དགུ་མ་མིན་པ།'}</span>
                  </button>
              </div>
          </section>

          {/* Objective */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🏁</span> 
              <div className="flex flex-col">
                <span className="leading-none">Objective</span>
                <span className="text-xs md:text-sm font-serif text-stone-500 tracking-normal">དམིགས་ཡུལ།</span>
              </div>
            </h3>
            <p>
              Sho is a race game played on a spiral of 64 shells. Each player has <strong>9 coins</strong>. 
              The goal is to move all your coins from your hand (start) to the end of the spiral.
            </p>
          </section>

          {/* Special Rules: Sho-mo */}
          <section className="bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-lg md:text-xl font-cinzel text-amber-400 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🐢</span>
              <div className="flex flex-col">
                <span className="leading-none">The 'Sho-mo'</span>
                <span className="text-xs md:text-sm font-serif text-amber-700 tracking-normal">ཤོ་མོ།</span>
              </div>
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
              <span className="text-xl md:text-2xl">🐍</span>
              <div className="flex flex-col">
                <span className="leading-none">The Pa Ra Rule</span>
                <span className="text-xs md:text-sm font-serif text-amber-700 tracking-normal">པ་རའི་སྒྲིག་གཞི།</span>
              </div>
            </h3>
            <p className="mb-2">Rolling a <strong>1 and 1</strong> is called "Pa Ra":</p>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li>You get to <strong>roll again</strong> immediately.</li>
                <li>The move values of both rolls are added to your available moves. You can move one stack by the total or two stacks separately.</li>
            </ul>
          </section>

          {/* Instant Win */}
          <section className="bg-red-950/20 p-4 rounded-lg border border-red-900/30">
            <h3 className="text-lg md:text-xl font-cinzel text-red-400 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">✨</span>
              <div className="flex flex-col">
                <span className="leading-none">Instant Win</span>
                <span className="text-xs md:text-sm font-serif text-red-800 tracking-normal">དེ་མ་ཐག་པའི་་རྒྱལ་ཁ།</span>
              </div>
            </h3>
            <p className="mb-2">In very rare circumstances, a player may win instantly:</p>
            <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                    <strong>Triple Pa Ra:</strong> If a player rolls a <strong>Pa Ra (1,1)</strong> three times in a row, they are declared the winner immediately.
                </li>
                <li>
                    <strong>Stacked Dice:</strong> If the dice physically land <strong>stacked on top of each other</strong> during a roll, the player wins the game on the spot.
                </li>
            </ul>
          </section>

          {/* Tactics */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">⚔️</span>
              <div className="flex flex-col">
                <span className="leading-none">Tactics</span>
                <span className="text-xs md:text-sm font-serif text-stone-500 tracking-normal">ཐབས་ཇུས།</span>
              </div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-800/50 p-3 md:p-4 rounded-lg border border-stone-700">
                <h4 className="font-bold text-amber-400 mb-1">Stacking བརྩེགས་སྟངས།</h4>
                <p className="text-xs md:text-sm">
                  If you land on your own piece, they stack together. Stacks move as a single unit.
                </p>
              </div>
              <div className="bg-stone-800/50 p-3 md:p-4 rounded-lg border border-stone-700">
                <h4 className="font-bold text-red-400 mb-1">Killing བསད་སྟངས།</h4>
                <p className="text-xs md:text-sm">
                  If you land on an opponent's stack that is <strong>equal to or smaller</strong> than yours, you "kill" it. They return to hand, and you get a <strong>Bonus Roll</strong>!
                </p>
              </div>
            </div>
          </section>

          {/* Finishing the Game */}
          <section>
            <h3 className="text-lg md:text-xl font-cinzel text-amber-200 mb-2 flex items-center gap-2">
              <span className="text-xl md:text-2xl">🏆</span>
              <div className="flex flex-col">
                <span className="leading-none">Finishing</span>
                <span className="text-xs md:text-sm font-serif text-stone-500 tracking-normal">རྩེད་མོ་མཇུག་བསྡུ་སྟངས</span>
              </div>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li>You must roll a number that takes your piece <strong>past the 64th shell</strong>.</li>
                <li>The first player to move all 9 coins off the board wins!</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 pt-0 text-center">
          <button 
            onClick={onClose}
            className="px-6 md:px-8 py-2 md:py-3 bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 text-sm md:text-base flex flex-col items-center leading-tight mx-auto"
          >
            <span>Close Rules</span>
            <span className="text-[10px] font-serif tracking-normal">སྒྲིག་གཞི་ཁ་རྒྱོབ།</span>
          </button>
        </div>
      </div>
    </div>
  );
};