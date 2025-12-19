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
      text: "Sho is a traditional Tibetan race game. Your goal is to move all 9 of your coins from your Hand to the End of the spiral. ཤོ་ནི་བོད་ཀྱི་སྲོལ་རྒྱུན་གྱི་རྩེད་མོ་ཞིག་རེད། ཁྱེད་ཀྱི་དམིགས་ཡུལ་ནི་ལག་ཁྱི་ ༩ ཆར་ལ་རྒྱབ་པ་བྱེད་རྒྱུ་དེ་རེད།",
      action: "Next མུ་མཐུད"
    },
    {
      title: "Rolling the Dice ཤོ་རྒྱག་སྟངས།",
      text: "The game is played with two dice. Let's start the game! Click the 'ROLL DICE' button. རྩེད་མོ་འདི་ཤོ་གཉིས་ཀྱིས་རྩེ་དགོས། ད་འགོ་འཛུགས་དོ། 'ROLL DICE' ལ་ནོན།",
    },
    {
      title: "The Opening Move འགོ་འཛུགས་སྟངས།",
      text: "In Sho, the opening move always places 2 coins from your hand onto the board. Click your 'From Hand' button to select it. ཤོ་འགོ་འཛུགས་སྐབས་ལག་ཁྱི་གཉིས་ལག་པ་ནས་འཇོག་དགོས། 'From Hand' ལ་ནོན་།",
    },
    {
      title: "Placing Coins ལག་ཁྱི་འཇོག་སྟངས།",
      text: "Valid moves are highlighted on the board. Click the glowing shell to place your stack. ལག་ཁྱི་འཇོག་ཆོག་ས་དག་ལ་འོད་སྒོར་ཡོད་རེད། འོད་རྒྱག་སའི་རྡེའུ་ལ་ནོན།",
    },
    {
      title: "Opponent's Turn ཁ་གཏད་ཀྱི་རྒྱག་ཐེངས།",
      text: "Now it's the opponent's turn. Watch them roll and move. ད་ཁ་གཏད་ཀྱི་རྒྱག་ཐེངས་རེད། ཁོ་ཚོས་ག་རེ་བྱེད་ཀྱི་འདུག་ལྟོས་དང་།",
      action: "Next མུ་མཐུད"
    },
    {
      title: "Key Mechanics གལ་གནད་ཅན་གྱི་སྒྲིག་གཞི།",
      text: "Stacking: Land on your own coins to build a stack. Killing: Land on an opponent's stack to send them back. Blocking: You cannot land on a larger opponent's stack. བརྩེགས་སྟངས། རང་གི་ལག་ཁྱིའི་ཐོག་བབས་ན་བརྩེགས་ཆོག གསོད་སྟངས། ཁ་གཏད་ལག་ཁྱིའི་ཐོག་བབས་ན་བསད་ནས་ལག་པར་སློག་ཆོག བཀག་སྟངས། རང་ལས་མང་བའི་ལག་ཁྱིའི་་ཐོག་བཙུགས་་མི་ཆོག",
      action: "Next མུ་མཐུད་པ།"
    },
    {
      title: "The Pa Ra Rule པ་རའི་སྒྲིག་གཞི།",
      text: "If you roll a 1 and 1, it's called 'Pa Ra'. You get a bonus roll immediately! གལ་ཏེ་ཤོ་མིག་ ༡ དང་ ༡ བབས་ན་'པ་ར་'ཟེར། ཁྱེད་ལ་ཤོ་ཐེངས་གཅིག་བསྐྱར་དུ་རྒྱག་རྒྱུའི་གོ་སྐབས་ཐོབ།",
      action: "Finish མྱུར་ཁྲིད་མཇུག་བསྡུ་བའོ།"
    }
  ];

  const current = steps[step - 1];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end items-end p-4 md:p-10">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-5 max-w-[320px] md:max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative animate-bounce-in backdrop-blur-md">
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-cinzel font-bold text-amber-400 leading-tight">{current.title}</h3>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold uppercase text-[10px]">Skip</button>
        </div>
        <p className="text-stone-300 mb-5 text-xs md:text-sm leading-relaxed">{current.text}</p>
        <div className="flex justify-end">
            {current.action ? (
                <button 
                    onClick={step === steps.length ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-5 rounded-lg uppercase tracking-widest text-[10px] shadow-lg shadow-amber-900/40 transition-colors"
                >
                    {current.action}
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting for action...</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};