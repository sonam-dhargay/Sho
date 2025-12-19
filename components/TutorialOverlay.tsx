import React from 'react';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const steps = [
    {
      title: "Welcome to Sho! ཤོ་རྩེད་ལ་རོལ་བར་ཕེབས་ཤོག།",
      text: "Sho is a traditional Tibetan race game. Your goal is to move all 9 of your coins from your Hand to the End of the spiral. ཤོ་ནི་བོད་ཀྱི་སྲོལ་རྒྱུན་གྱི་རྩེད་མོ་ཞིག་རེད། ཁྱེད་ཀྱི་དམིགས་ཡུལ་ལག་ཁྱི་ ༩ ཆར་ལ་རྒྱབ་པ་བྱེད་རྒྱུ་དེ་ཡིན།",
      action: "Next མུ་མཐུད་པ།"
    },
    {
      title: "Rolling the Dice ཤོ་རྒྱག་སྟངས།",
      text: "The game is played with two dice. Let's start! Click the 'ROLL DICE' button. རྩེད་མོ་འདི་ཤོ་གཉིས་ཀྱིས་རྩེ་དགོས། ད་འགོ་འཛུགས་དོ། 'ROLL DICE' ལ་ནོན་དང་།",
    },
    {
      title: "The Opening Move འགོ་འཛུགས་ཀྱི་གོམ་པ།",
      text: "The opening move always places 2 coins from your hand onto the board. Click your 'Hand' tile. ཤོ་ཡི་འགོ་འཛུགས་སྐབས་ཤོ་རྡོག་གཉིས་ལག་པ་ནས་འཇོག་དགོས། 'Hand' ལ་ནོན་དང་།",
    },
    {
      title: "Placing Coins ཤོ་རྡོག་འཇོག་པ།",
      text: "Valid moves are highlighted on the board. Click the glowing shell to place your stack. འགྲོ་ཆོག་ས་དག་ལ་འོད་རྒྱག་གི་རེད། འོད་རྒྱག་སའི་དུང་དཀར་ལ་ནོན་དང་།",
    },
    {
      title: "Pa Ra Rule པ་རའི་སྒྲིག་ལམ།",
      text: "If you roll a 1 and 1, it's called 'Pa Ra'. You get a bonus roll immediately! གལ་ཏེ་ཤོ་མིག་ ༡ དང་ ༡ བབས་ན་'པ་ར་'ཟེར། ཁྱེད་ལ་ཤོ་ཐེངས་གཅིག་བསྐྱར་དུ་རྒྱག་རྒྱུ་ཐོབ།",
      action: "Finish Tutorial སྦྱོང་བརྡར་མཇུག་བསྡུ་བ།"
    }
  ];

  const current = steps[step - 1];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end p-6">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full shadow-2xl pointer-events-auto relative animate-bounce-in">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-cinzel font-bold text-amber-400 leading-tight">{current.title}</h3>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold uppercase text-xs">Skip</button>
        </div>
        <p className="text-stone-200 mb-6 text-sm leading-relaxed">{current.text}</p>
        <div className="flex justify-end">
            {current.action ? (
                <button 
                    onClick={current.action.includes('Finish') ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg uppercase tracking-widest text-xs"
                >
                    {current.action}
                </button>
            ) : (
                <span className="text-stone-400 text-xs italic animate-pulse">Waiting for action...</span>
            )}
        </div>
      </div>
    </div>
  );
};
