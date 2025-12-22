export const T = {
  common: {
    back: { en: "Back", bo: "ཕྱིར་ལོག།" },
    close: { en: "Close", bo: "ཁ་རྒྱོབ།" },
    cancel: { en: "Cancel", bo: "རྩིས་མེད་གཏོང་།" },
    ok: { en: "OK", bo: "ལགས་སོ།" },
  },
  lobby: {
    title: { en: "Sho", bo: "ཤོ" },
    subtitle: { en: "Traditional Tibetan Dice Game", bo: "བོད་ཀྱི་སྲོལ་རྒྱུན་གྱི་ཤོ་རྩེད།" },
    verse: { en: "Para Penpa Tashi Zhug. Gyak-khen Trinley Namgyal Re.", bo: "པ་ར་སྤེན་པ་བཀྲ་ཤིས་ཞུགས། རྒྱག་མཁན་འཕྲིན་ལས་རྣམ་རྒྱལ་རེད།" },
    nameLabel: { en: "Your Name", bo: "ཁྱེད་ཀྱི་མིང་།" },
    colorLabel: { en: "Choose Color", bo: "ཚོས་གཞི་དོམ།" },
    modeLocal: { en: "Local", bo: "རང་ཤག་ཏུ་་རྩེ།" },
    modeAI: { en: "Vs AI", bo: "མི་བཟོས་རིག་ནུས་དང་མཉམ་དུ་རྩེ།" },
    tutorial: { en: "Tutorial", bo: "རྩེ་སྟངས་མྱུར་ཁྲིད།" },
    rules: { en: "Rules", bo: "ཤོ་ཡི་སྒྲིག་གཞི།" },
    totalPlayed: { en: "Total Games Played", bo: "འཛམ་གླིང་ཁྱོན་ཡོངས་སུ་རྩེད་གྲངས།" },
  },
  game: {
    inHand: { en: "In", bo: "ལག་ཐོག།" },
    finished: { en: "Out", bo: "གདན་ཐོག" },
    fromHand: { en: "From Hand", bo: "ལག་ཁྱི་བཙུགས།" },
    skipTurn: { en: "Skip Turn", bo: "སྐོར་ཐེངས་འདི་སྐྱུར།" },
    victory: { en: "Victory", bo: "རྒྱལ་ཁ།" },
    newGame: { en: "New Game", bo: "རྩེད་མོ་གསར་དུ་འགོ་ཚུགས།" },
    wonMsg: { en: "won!", bo: "ལ་རྒྱལ་ཁ་ཐོབ་སོང་།" },
    movesAvailable: { en: "Available Moves", bo: "ཤོ་མིག་གྲངས།" },
    flexiblePool: { en: "Flexible Pa Ra Pool", bo: "པ་ར་བབས་པ།" },
    readyToRoll: { en: "Ready to roll...", bo: "ཤོ་རྒྱག་ཆོག་རེད།" },
    waiting: { en: "Waiting...", bo: "སྒུག་བཞུགས།" },
    rollDice: { en: "ROLL DICE", bo: "ཤོ་རྒྱོབ།" },
    rollBonus: { en: "ROLL BONUS!", bo: "པ་ར།" },
    selectMove: { en: "SELECT MOVE", bo: "ག་རེ་གནང་ག།" },
  },
  rules: {
    title: { en: "Rules of Sho", bo: "ཤོ་ཡི་སྒྲིག་གཞི།" },
    variant: { en: "Game Variant", bo: "རྩེད་མོ་འདམ་ག།" },
    ninerMode: { en: "Niner Mode", bo: "དགུ་མ།" },
    noNinerMode: { en: "No-Niner Mode", bo: "དགུ་མ་མིན་པ།" },
    ninerDesc: { en: "In Niner mode, players are allowed to build a stack of nine coins and charge forward.", bo: "དགུ་མའི་ནང་དུ་ཤོ་རྡོག་དགུ་བརྩེགས་ནས་མདུན་དུ་བསྐྱོད་ཆོག" },
    noNinerDesc: { en: "In this variant, it is forbidden to build a stack of all nine coins.", bo: "འདིའི་ནང་དུ་ཤོ་རྡོག་དགུ་བརྩེགས་རྒྱག་མི་ཆོག" },
    objectiveTitle: { en: "Objective", bo: "དམིགས་ཡུལ།" },
    objectiveDesc: { en: "Sho is a race game played on a spiral of 64 shells. Each player has 9 coins. The goal is to move all your coins from your hand (start) to the end of the spiral.", bo: "ཤོ་ནི་འགྲན་བསྡུར་གྱི་རྩེད་མོ་ཞིག་ཡིན་ཞིང་། དུང་དཀར་ ༦༤ ཡི་ཐོག་ཏུ་རྩེ་དགོས། རྩེད་མོ་བ་རེར་ཤོ་རྡོག་ ༩ རེ་ཡོད། དམིགས་ཡུལ་ནི་ཤོ་རྡོག་ཚང་མ་མཇུག་བསྡུ་སར་བསྐྱོད་རྒྱུ་དེ་ཡིན།" },
    shomoTitle: { en: "The 'Sho-mo'", bo: "ཤོ་མོ།" },
    shomoRule1: { en: "On the very first roll of the opening round, players can place two coins. This initial stack is called the 'Sho-mo'.", bo: "འགོ་འཛུགས་སྐབས་ཤོ་ཐེངས་དང་པོ་དེར་ཤོ་རྡོག་གཉིས་འཇོག་ཆོག འདི་ལ་'ཤོ་མོ་'ཟེར།" },
    shomoRule2: { en: "Killer Bonus: If an opponent lands on and kills your 'Sho-mo', they can place three coins in its place immediately (taking the extra from their hand).", bo: "གསོད་པའི་ཁེ་ཕན། གལ་ཏེ་ཕ་རོལ་པོས་ཁྱེད་ཀྱི་'ཤོ་མོ་'བསད་པ་ཡིན་ན། ཁོ་ཚོས་དེའི་ཚབ་ཏུ་ཤོ་རྡོག་གསུམ་འཇོག་ཆོག" },
    paraTitle: { en: "The Pa Ra Rule", bo: "པ་རའི་སྒྲིག་གཞི།" },
    paraDesc: { en: "Rolling a 1 and 1 is called 'Pa Ra':", bo: "ཤོ་མིག་ ༡ དང་ ༡ བབས་ན་'པ་ར་'ཟེར།" },
    paraRule1: { en: "You get to roll again immediately.", bo: "དེ་མ་ཐག་ཤོ་བསྐྱར་དུ་རྒྱག་ཆོག" },
    paraRule2: { en: "The move values of both rolls are added to your available moves.", bo: "ཤོ་རྒྱག་ཐེངས་གཉིས་ཀྱི་མིག་བསྡོམས་ནས་རྡེའུ་གཏོང་ཆོག" },
    instantWinTitle: { en: "Instant Win", bo: "དེ་མ་ཐག་པའི་རྒྱལ་ཁ།" },
    instantWinDesc: { en: "In very rare circumstances, a player may win instantly:", bo: "ཆེས་དཀོན་པའི་གནས་སྟངས་འོག་དེ་མ་ཐག་རྒྱལ་ཁ་ཐོབ་སྲིད།" },
    triplePara: { en: "Triple Pa Ra: If a player rolls a Pa Ra (1,1) three times in a row, they are declared the winner immediately.", bo: "པ་ར་གསུམ་བརྩེགས། གལ་ཏེ་པ་ར་ཐེངས་གསུམ་བསྟུད་མར་བབས་ན་དེ་མ་ཐག་རྒྱལ་ཁ་ཐོབ་སྲིད།" },
    stackedDice: { en: "Stacked Dice: If the dice physically land stacked on top of each other during a roll, the player wins on the spot.", bo: "ཤོ་བརྩེགས་བབས་པ། གལ་ཏེ་ཤོ་གཅིག་གི་སྟེང་དུ་གཅིག་བརྩེགས་ནས་བབས་ན་རྒྱལ་ཁ་ཐོབ་སྲིད།" },
    tacticsTitle: { en: "Tactics", bo: "ཐབས་ཇུས།" },
    stackingTitle: { en: "Stacking", bo: "བརྩེགས་སྟངས།" },
    stackingDesc: { en: "If you land on your own piece, they stack together. Stacks move as a single unit.", bo: "གལ་ཏེ་རང་གི་ལག་ཁྱི་ཐོག་ཏུ་ཤོ་བབས་ན་དེའི་སྟེང་བརྩེགས་ནས་མཉམ་དུ་འགྲོ་ཐུབ།" },
    killingTitle: { en: "Killing", bo: "བསད་སྟངས།" },
    killingDesc: { en: "If you land on an opponent's stack that is equal to or smaller than yours, you 'kill' it. They return to hand, and you get a Bonus Roll!", bo: "གལ་ཏེ་ཁ་གཏད་ཀྱི་ལག་ཁྱི་ཁྱེད་ལས་ཉུང་བའམ་མཉམ་པ་ཡོད་ན། དེ་བསད་ནས་ལག་པར་སློག་ཆོག ཁྱེད་ལ་ཤོ་ཐེངས་གཅིག་རྒྱག་རྒྱུའི་ཁེ་ཕན་ཐོབ།" },
    finishingTitle: { en: "Finishing", bo: "རྩེད་མོ་མཇུག་སྒྲིལ་སྟངས།" },
    finishingRule1: { en: "You must roll a number that takes your piece past the 64th shell.", bo: "ལག་ཁྱི་རྣམས་རྡེའུ་ ༦༤ ལས་བརྒལ་བར་བྱེད་པའི་ཤོ་མིག་ཞིག་བབས་དགོས།" },
    finishingRule2: { en: "The first player to move all 9 coins off the board wins!", bo: "ལག་ཁྱི་་ ༩ ཆར་ཚང་མ་ལ་བརྒལ་མཁན་དེ་ལ་རྒྱལ་ཁ་ཐོབ་པ་ཡིན།" },
  },
  tutorial: {
    steps: [
      {
        title: { en: "Welcome to Sho!", bo: "ཤོ་རྩེད་ལ་རོལ་བར་ཕེབས་ཤོག།" },
        text: { en: "Sho is a traditional Tibetan race game. Your goal is to move all 9 of your coins from your Hand to the End of the spiral.", bo: "ཤོ་ནི་བོད་ཀྱི་སྲོལ་རྒྱུན་གྱི་རྩེད་མོ་ཞིག་རེད། ཁྱེད་ཀྱི་དམིགས་ཡུལ་ནི་ལག་ཁྱི་ ༩ ཆར་ལ་རྒྱབ་པ་བྱེད་རྒྱུ་དེ་རེད།" },
        action: { en: "Next", bo: "མུ་མཐུད" }
      },
      {
        title: { en: "Rolling the Dice", bo: "ཤོ་རྒྱག་སྟངས།" },
        text: { en: "The game is played with two dice. Let's start the game! Click the 'ROLL DICE' button.", bo: "རྩེད་མོ་འདི་ཤོ་གཉིས་ཀྱིས་རྩེ་དགོས། ད་འགོ་འཛུགས་དོ། 'ROLL DICE' ལ་ནོན།" },
      },
      {
        title: { en: "The Opening Move", bo: "འགོ་འཛུགས་སྟངས།" },
        text: { en: "In Sho, the opening move always places 2 coins from your hand onto the board. Click your 'Hand' tile to select it.", bo: "ཤོ་འགོ་འཛུགས་སྐབས་ལག་ཁྱི་གཉིས་ལག་པ་ནས་འཇོག་དགོས། 'Hand' ལ་ནོན་།" },
      },
      {
        title: { en: "Placing Coins", bo: "ལག་ཁྱི་འཇོག་སྟངས།" },
        text: { en: "Valid moves are highlighted on the board. Click the glowing shell to place your stack.", bo: "ལག་ཁྱི་འཇོག་ཆོག་ས་དག་ལ་འོད་སྒོར་ཡོད་རེད། འོད་རྒྱག་སའི་རྡེའུ་ལ་ནོན།" },
      },
      {
        title: { en: "Opponent's Turn", bo: "ཁ་གཏད་ཀྱི་རྒྱག་ཐེངས།" },
        text: { en: "Now it's the opponent's turn. Watch them roll and move.", bo: "ད་ཁ་གཏད་ཀྱི་རྒྱག་ཐེངས་རེད། ཁོ་ཚོས་ག་རེ་བྱེད་ཀྱི་འདུག་ལྟོས་དང་།" },
      },
      {
        title: { en: "Key Mechanics", bo: "གལ་གནད་ཅན་གྱི་སྒྲིག་གཞི།" },
        text: { en: "Stacking: Land on your own coins to build a stack. Killing: Land on an opponent's stack to send them back. Blocking: You cannot land on a larger opponent's stack.", bo: "བརྩེགས་སྟངས། རང་གི་ལག་ཁྱིའི་ཐོག་བབས་ན་བརྩེགས་ཆོག གསོད་སྟངས། ཁ་གཏད་ལག་ཁྱིའི་ཐོག་བབས་ན་བསད་ནས་ལག་པར་སློག་ཆོག བཀག་སྟངས། རང་ལས་མང་བའི་ལག་ཁྱིའི་ཐོག་བཙུགས་མི་ཆོག" },
        action: { en: "Next", bo: "མུ་མཐུད་པ།" }
      },
      {
        title: { en: "The Pa Ra Rule", bo: "པ་རའི་སྒྲིག་གཞི།" },
        text: { en: "If you roll a 1 and 1, it's called 'Pa Ra'. You get a bonus roll immediately!", bo: "གལ་ཏེ་ཤོ་མིག་ ༡ དང་ ༡ བབས་ན་'པ་ར་'ཟེར། ཁྱེད་ལ་ཤོ་ཐེངས་གཅིག་བསྐྱར་དུ་རྒྱག་རྒྱུའི་གོ་སྐབས་ཐོབ།" },
        action: { en: "Finish Tutorial", bo: "མྱུར་ཁྲིད་ mཇུག་བསྡུ་བའོ།" }
      }
    ]
  }
};