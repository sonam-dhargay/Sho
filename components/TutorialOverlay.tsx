
import React from 'react';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const getStepContent = (s: number) => {
    switch (s) {
      case 1:
        return {
          title: "Welcome to Sho!",
          text: "Sho is a traditional Tibetan race game. Your goal is to move all 9 of your coins from your Hand to the End of the spiral.",
          highlight: "",
          action: "Next"
        };
      case 2:
        return {
          title: "Rolling the Dice",
          text: "The game is played with two dice. Let's start the game! Click the 'ROLL DICE' button.",
          highlight: "controls",
          action: null // Wait for roll
        };
      case 3:
        return {
          title: "The Opening Move",
          text: "You rolled a 5 (2 + 3). In Sho, the opening move always places 2 coins from your hand onto the board. Click your 'Hand' tile to select it.",
          highlight: "hand",
          action: null // Wait for selection
        };
      case 4:
        return {
          title: "Placing Coins",
          text: "Valid moves are highlighted on the board. Click the glowing shell to place your stack.",
          highlight: "board",
          action: null // Wait for move
        };
      case 5:
        return {
          title: "Opponent's Turn",
          text: "Now it's the opponent's turn. Watch them roll and move.",
          highlight: "board",
          action: null // Auto advance after timeout
        };
      case 6:
        return {
          title: "Key Mechanics",
          text: (
             <ul className="text-left list-disc pl-4 space-y-2">
                 <li><strong>Stacking:</strong> Land on your own coins to build a stack. Stacks move as one unit.</li>
                 <li><strong>Killing:</strong> Land on an opponent's stack (equal or smaller size) to send them back to hand.</li>
                 <li><strong>Blocking:</strong> You cannot land on an opponent's stack if it is larger than yours.</li>
             </ul>
          ),
          highlight: "",
          action: "Next"
        };
      case 7:
        return {
          title: "The Pa Ra Rule",
          text: "If you roll a 1 and 1 (Snake Eyes), it's called 'Pa Ra'. You get a bonus roll, and you can split the total flexible pool between two moves!",
          highlight: "",
          action: "Finish Tutorial"
        };
      default:
        return null;
    }
  };

  const content = getStepContent(step);
  if (!content) return null;

  return (
    /* 
       Updated Layout:
       - Removed backdrop-blur and bg-black/40 (sharpen screen).
       - Changed alignment to bottom-left (md:justify-start md:items-end) to move it off the board.
       - Added padding to float it slightly off the edge.
    */
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end items-center md:items-start p-4 md:p-6">
      
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto relative animate-bounce-in md:ml-2">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-cinzel font-bold text-amber-400">{content.title}</h3>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold px-2">Skip</button>
        </div>
        
        <div className="text-stone-200 mb-6 font-sans leading-relaxed">
            {content.text}
        </div>

        <div className="flex justify-end">
            {content.action && (
                <button 
                    onClick={content.action === 'Finish Tutorial' ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
                >
                    {content.action} &rarr;
                </button>
            )}
            {!content.action && (
                <span className="text-stone-400 text-sm italic animate-pulse">
                    Follow instructions to continue...
                </span>
            )}
        </div>

        {/* Pointer Triangle (Hidden on desktop as we are cornered) */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-stone-900 border-r-2 border-b-2 border-amber-500 rotate-45 md:hidden"></div>
      </div>
    </div>
  );
};
