import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Player, PlayerColor, BoardState, GamePhase, 
  DiceRoll, MoveResultType, MoveOption, GameLog, BoardShell, GameMode
} from './types';
import { TOTAL_SHELLS, COINS_PER_PLAYER, PLAYERS_CONFIG, COLOR_PALETTE, AVATAR_PRESETS } from './constants';
import { Board } from './components/Board';
import { DiceArea } from './components/DiceArea';
import { RulesModal } from './components/RulesModal';
import { TutorialOverlay } from './components/TutorialOverlay';

const generatePlayers = (
    p1Settings: { name: string, color: string, avatar?: string },
    p2Settings: { name: string, color: string, avatar?: string }
): Player[] => {
    return [
        { id: PlayerColor.Red, name: p1Settings.name || 'Player 1', colorHex: p1Settings.color || COLOR_PALETTE[0].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0, avatar: p1Settings.avatar || AVATAR_PRESETS[0] },
        { id: PlayerColor.Blue, name: p2Settings.name || 'Player 2', colorHex: p2Settings.color || COLOR_PALETTE[1].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0, avatar: p2Settings.avatar || AVATAR_PRESETS[1] }
    ];
};

const SFX = {
  ctx: null as AudioContext | null,
  musicNodes: [] as AudioNode[],
  musicIntervals: [] as number[],
  masterMusicGain: null as GainNode | null,
  getContext: () => { if (!SFX.ctx) { SFX.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return SFX.ctx; },
  createNoiseBuffer: (ctx: AudioContext) => { const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; } return buffer; },
  playShake: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const noise = ctx.createBufferSource(); noise.buffer = SFX.createNoiseBuffer(ctx); const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1000; const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(t); noise.stop(t + 0.35); },
  playLand: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const osc = ctx.createOscillator(); const thudGain = ctx.createGain(); osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.15); thudGain.gain.setValueAtTime(0.8, t); thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.connect(thudGain); thudGain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.2); },
  playCoinClick: (timeOffset = 0, pitch = 1.0) => { const ctx = SFX.getContext(); const t = ctx.currentTime + timeOffset; const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.setValueAtTime(2000 * pitch, t); const modulator = ctx.createOscillator(); modulator.type = 'square'; modulator.frequency.setValueAtTime(320 * pitch, t); const modGain = ctx.createGain(); modGain.gain.setValueAtTime(800, t); modGain.gain.exponentialRampToValueAtTime(1, t + 0.1); modulator.connect(modGain); modGain.connect(carrier.frequency); const mainGain = ctx.createGain(); mainGain.gain.setValueAtTime(0, t); mainGain.gain.linearRampToValueAtTime(0.2, t + 0.01); mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); carrier.connect(mainGain); mainGain.connect(ctx.destination); carrier.start(t); carrier.stop(t + 0.3); modulator.start(t); modulator.stop(t + 0.3); },
  playStack: () => { SFX.playCoinClick(0, 1.0); SFX.playCoinClick(0.08, 1.1); },
  playKill: () => { SFX.playCoinClick(0, 0.8); SFX.playCoinClick(0.1, 0.9); SFX.playCoinClick(0.25, 0.85); },
  playFinish: () => { SFX.playCoinClick(0, 1.2); SFX.playCoinClick(0.1, 1.5); SFX.playCoinClick(0.2, 2.0); },
  playBlocked: () => { 
    const ctx = SFX.getContext(); const t = ctx.currentTime;
    const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator();
    const gain = ctx.createGain(); osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, t); osc2.frequency.setValueAtTime(84, t);
    gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(t); osc2.start(t); osc1.stop(t + 0.4); osc2.stop(t + 0.4);
  },
  playPaRa: () => { SFX.playCoinClick(0, 2.0); SFX.playCoinClick(0.1, 2.2); }
};

const getRandomDicePos = () => { const r = 35 + Math.random() * 45; const theta = Math.random() * Math.PI * 2; return { x: r * Math.cos(theta), y: r * Math.sin(theta), r: Math.random() * 360 }; };

const DICE_PROBS: Record<number, number> = { 2: 1/36, 3: 2/36, 4: 3/36, 5: 4/36, 6: 5/36, 7: 6/36, 8: 5/36, 9: 4/36, 10: 3/36, 11: 2/36, 12: 1/36 };

const calculatePotentialMoves = (sourceIdx: number, moveVals: number[], currentBoard: BoardState, player: Player, isNinerMode: boolean): MoveOption[] => {
  const options: MoveOption[] = [];
  const evaluateTarget = (dist: number, consumed: number[]): MoveOption | null => {
    const targetIdx = sourceIdx + dist;
    if (targetIdx > TOTAL_SHELLS) { return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.FINISH }; }
    const targetShell = currentBoard.get(targetIdx); if (!targetShell) return null;
    let movingStackSize = sourceIdx === 0 ? (player.coinsInHand === COINS_PER_PLAYER ? 2 : 1) : (currentBoard.get(sourceIdx)?.stackSize || 0);
    if (targetShell.owner === player.id) { const rs = targetShell.stackSize + movingStackSize; if (!isNinerMode && rs === 9) return null; return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.STACK }; }
    if (targetShell.owner && targetShell.owner !== player.id) { if (movingStackSize >= targetShell.stackSize) return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.KILL }; return null; }
    return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.PLACE };
  };
  Array.from(new Set(moveVals)).forEach(val => { const opt = evaluateTarget(val, [val]); if (opt) options.push(opt); });
  if (moveVals.length > 1) { const total = moveVals.reduce((a, b) => a + b, 0); const opt = evaluateTarget(total, moveVals); if (opt && !options.some(o => o.targetIndex === opt.targetIndex)) options.push(opt); }
  return options;
};

const getAvailableMoves = (pIndex: number, pBoard: BoardState, pPlayers: Player[], pVals: number[], isNinerMode: boolean) => {
  let moves: MoveOption[] = []; const player = pPlayers[pIndex]; if (!player) return moves;
  if (player.coinsInHand > 0) { moves = [...moves, ...calculatePotentialMoves(0, pVals, pBoard, player, isNinerMode)]; }
  pBoard.forEach((shell) => { if (shell.owner === player.id && shell.stackSize > 0) moves = [...moves, ...calculatePotentialMoves(shell.index, pVals, pBoard, player, isNinerMode)]; });
  return moves;
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(PLAYERS_CONFIG);
  const [board, setBoard] = useState<BoardState>(new Map());
  const [turnIndex, setTurnIndex] = useState(0); 
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [pendingMoveValues, setPendingMoveValues] = useState<number[]>([]);
  const [waitingForPaRa, setWaitingForPaRa] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<MoveOption | null>(null);
  const [isNinerMode, setIsNinerMode] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [showRules, setShowRules] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [boardScale, setBoardScale] = useState(0.8);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const gameStateRef = useRef({ board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, isRolling, isNinerMode, gameMode, tutorialStep });
  useEffect(() => { gameStateRef.current = { board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, isRolling, isNinerMode, gameMode, tutorialStep }; }, [board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, isRolling, isNinerMode, gameMode, tutorialStep]);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  const initializeGame = useCallback((p2Config?: { name: string, color: string, avatar?: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>(); for (let i = 1; i <= TOTAL_SHELLS; i++) newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    setBoard(newBoard);
    const initialPlayers = generatePlayers({ name: playerName, color: selectedColor, avatar: selectedAvatar }, p2Config || { name: 'Opponent', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: AVATAR_PRESETS[1] });
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setWaitingForPaRa(false); setLastMove(null); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null);
    addLog("New game started! ཤོ་འགོ་ཚུགས་སོང་།", 'info');
  }, [playerName, selectedColor, selectedAvatar, addLog]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); setBoardScale(Math.max(Math.min((width - 20) / 800, (height - 20) / 800, 1), 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, [gameMode]);

  const handleSkipTurn = useCallback(() => {
    setPendingMoveValues([]);
    setPhase(GamePhase.ROLLING);
    setTurnIndex((prev) => (prev + 1) % players.length);
    addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
  }, [players, turnIndex, addLog]);

  const performRoll = async () => {
    const s = gameStateRef.current; if (s.phase !== GamePhase.ROLLING && !s.waitingForPaRa) return;
    setIsRolling(true); SFX.playShake(); await new Promise(resolve => setTimeout(resolve, 800)); 
    let d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 2; d2 = 6; }
    
    // Position dice to avoid stacking on each other
    const pos1 = getRandomDicePos();
    let pos2 = getRandomDicePos();
    let attempts = 0;
    while (Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2) < 45 && attempts < 15) {
        pos2 = getRandomDicePos();
        attempts++;
    }

    const isPaRa = (d1 === 1 && d2 === 1), total = d1 + d2;
    const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals: { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r } };
    setLastRoll(newRoll); setIsRolling(false); SFX.playLand();
    if (isPaRa) { SFX.playPaRa(); setWaitingForPaRa(true); addLog(`PA RA (1,1)! Roll again. པ་ར་བབས་སོང་།`, 'alert'); } 
    else { if (s.waitingForPaRa) { setPendingMoveValues([2, total]); setWaitingForPaRa(false); } else { setPendingMoveValues([total]); } setPhase(GamePhase.MOVING); }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  };

  const performMove = (sourceIdx: number, targetIdx: number) => {
    const s = gameStateRef.current;
    const currentMovesList = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode);
    const move = currentMovesList.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    if (!move) return;

    const nb: BoardState = new Map(s.board); 
    const player = s.players[s.turnIndex]; 
    let bonusTurn = false; 
    let movingStackSize = 0; 
    let newPlayers = [...s.players];

    if (move.sourceIndex === 0) { 
        const isOpening = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER; 
        movingStackSize = isOpening ? 2 : 1; 
        newPlayers[s.turnIndex].coinsInHand -= movingStackSize; 
    } else { 
        const source = nb.get(move.sourceIndex)!; 
        movingStackSize = source.stackSize; 
        nb.set(move.sourceIndex, { ...source, stackSize: 0, owner: null, isShoMo: false }); 
    }

    if (move.type === MoveResultType.FINISH) { 
        SFX.playFinish();
        newPlayers[s.turnIndex].coinsFinished += movingStackSize; 
        addLog(`${player.name} finished ${movingStackSize} coin(s)!`, 'action');
    } else {
        const target = nb.get(move.targetIndex)!;
        if (move.type === MoveResultType.KILL) { 
            SFX.playKill();
            const eIdx = players.findIndex(p => p.id === target.owner); 
            if (eIdx !== -1) newPlayers[eIdx].coinsInHand += target.stackSize; 
            nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: false }); 
            bonusTurn = true; 
            addLog(`${player.name} killed a stack and got a bonus!`, 'alert');
        } else if (move.type === MoveResultType.STACK) { 
            SFX.playStack();
            nb.set(move.targetIndex, { ...target, stackSize: target.stackSize + movingStackSize, owner: player.id, isShoMo: false }); 
            // Fixed: Stacking should NOT grant a bonus turn/roll in traditional Sho
            bonusTurn = false; 
            addLog(`${player.name} stacked their pieces!`, 'action');
        } else {
            SFX.playCoinClick();
            nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: (move.sourceIndex === 0 && movingStackSize === 2) });
        }
    }

    setPlayers(newPlayers); setBoard(nb); setSelectedSourceIndex(null); 
    setLastMove({ ...move, id: Date.now() });

    let nextMoves = [...s.pendingMoveValues]; 
    move.consumedValues.forEach(val => { const idx = nextMoves.indexOf(val); if (idx > -1) nextMoves.splice(idx, 1); });

    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { setPhase(GamePhase.GAME_OVER); return; }

    const movesLeft = getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode);
    if (nextMoves.length === 0 || movesLeft.length === 0) {
        setPendingMoveValues([]); 
        setPhase(GamePhase.ROLLING); 
        if (!bonusTurn) setTurnIndex((prev) => (prev + 1) % players.length);
    } else {
        setPendingMoveValues(nextMoves);
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 4) setTutorialStep(5);
  };

  // AI Strategic Loop
  useEffect(() => {
    if (gameMode === GameMode.AI && turnIndex === 1 && phase !== GamePhase.GAME_OVER && !isRolling) {
      const timer = setTimeout(() => {
        const s = gameStateRef.current;
        if (s.phase === GamePhase.ROLLING || s.waitingForPaRa) {
          performRoll();
        } else if (s.phase === GamePhase.MOVING) {
          const aiMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode);
          if (aiMoves.length > 0) {
            const scoredMoves = aiMoves.map(m => {
              let score = m.targetIndex; 
              const aiPlayer = s.players[1]; const humPlayer = s.players[0];
              const aiSize = m.sourceIndex === 0 ? (aiPlayer.coinsInHand === COINS_PER_PLAYER ? 2 : 1) : (s.board.get(m.sourceIndex)?.stackSize || 1);
              if (m.type === MoveResultType.KILL) score += 2000 + (s.board.get(m.targetIndex)?.stackSize || 0) * 100;
              if (m.type === MoveResultType.FINISH) score += 1800;
              if (m.type === MoveResultType.STACK) {
                const targetSize = (s.board.get(m.targetIndex)?.stackSize || 0) + aiSize;
                if (targetSize >= 3 && targetSize <= 5) score += 800; else score += 300;
              }
              // Risk/Blocking
              Array.from(s.board.values()).forEach((shell: BoardShell) => {
                if (shell.owner === humPlayer.id) {
                    const dist = m.targetIndex - shell.index;
                    if (dist >= 2 && dist <= 12) {
                        const prob = DICE_PROBS[dist] || 0;
                        if (shell.stackSize > aiSize) score -= prob * 4000;
                    }
                    if (dist > 0 && dist <= 3 && aiSize > shell.stackSize) score += 500;
                }
              });
              return { move: m, score };
            }).sort((a, b) => b.score - a.score);
            performMove(scoredMoves[0].move.sourceIndex, scoredMoves[0].move.targetIndex);
          } else {
            handleSkipTurn();
          }
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, phase, gameMode, isRolling, waitingForPaRa, board, pendingMoveValues, isNinerMode, players, handleSkipTurn]);

  const currentValidMovesList = phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode) : [];
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row">
        {gameMode === GameMode.TUTORIAL && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        
        {!gameMode && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 overflow-y-auto flex flex-col items-center justify-center p-4">
               <h1 className="text-6xl md:text-8xl font-cinzel mb-2 opacity-80">ཤོ Sho</h1>
               <p className="text-stone-400 uppercase tracking-widest text-xs mb-12">Tibetan Traditional Dice Game</p>
               <div className="bg-stone-900/50 p-8 rounded-2xl border border-stone-800 w-full max-w-md mb-8">
                  <div className="mb-4"><label className="text-[10px] uppercase block mb-2 opacity-50">Name</label><input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 outline-none focus:border-amber-500" /></div>
                  <div className="mb-4"><label className="text-[10px] uppercase block mb-2 opacity-50">Color</label><div className="flex gap-2">{COLOR_PALETTE.map(c => <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-8 h-8 rounded-full border-2 ${selectedColor === c.hex ? 'border-white' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c.hex }} />)}</div></div>
                  <div><label className="text-[10px] uppercase block mb-2 opacity-50">Avatar</label><div className="flex gap-2">{AVATAR_PRESETS.map(av => <button key={av} onClick={() => setSelectedAvatar(av)} className={`w-10 h-10 flex items-center justify-center rounded-lg border ${selectedAvatar === av ? 'border-amber-500 bg-stone-800' : 'border-stone-700 opacity-50'}`}>{av}</button>)}</div></div>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                   <button onClick={() => { setGameMode(GameMode.LOCAL); initializeGame(); }} className="bg-stone-800 border border-stone-700 p-6 rounded-xl hover:border-amber-500 transition-colors flex flex-col items-center"><span className="text-3xl mb-2">🏔️</span><span className="font-bold uppercase font-cinzel">Local</span></button>
                   <button onClick={() => { setGameMode(GameMode.AI); initializeGame(); }} className="bg-stone-800 border border-stone-700 p-6 rounded-xl hover:border-amber-500 transition-colors flex flex-col items-center"><span className="text-3xl mb-2">🤖</span><span className="font-bold uppercase font-cinzel">Vs AI</span></button>
               </div>
               <button onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame(undefined, true); }} className="mt-8 text-stone-500 hover:text-amber-500 uppercase text-xs tracking-widest font-bold">Tutorial</button>
          </div>
        )}

        {gameMode && (
            <>
                <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 h-[40dvh] md:h-full order-1 overflow-hidden flex-shrink-0 mobile-landscape-sidebar">
                    <div className="p-4 flex flex-col gap-4 flex-shrink-0">
                        <header className="flex justify-between items-center"><h1 onClick={() => setGameMode(null)} className="cursor-pointer text-amber-500 text-2xl font-cinzel">ཤོ Sho</h1><button onClick={() => setShowRules(true)} className="w-8 h-8 rounded-full border border-stone-700 text-stone-500 hover:text-amber-500 transition-colors text-sm">?</button></header>
                        <div className="grid grid-cols-2 gap-3">{players.map((p, i) => ( <div key={p.id} className={`p-3 rounded-xl border transition-all ${turnIndex === i ? 'bg-stone-800 border-white/20' : 'border-stone-800 opacity-40'}`} style={{ borderColor: turnIndex === i ? p.colorHex : 'transparent' }}><div className="flex items-center gap-2 mb-2"><span className="text-xl">{p.avatar}</span><h3 className="font-bold text-xs truncate" style={{ color: p.colorHex }}>{p.name}</h3></div><div className="flex justify-between text-[10px] text-stone-400"><span>IN: <strong>{p.coinsInHand}</strong></span><span>OUT: <strong className="text-amber-500">{p.coinsFinished}</strong></span></div></div> ))}</div>
                    </div>
                    <div className="px-4 pb-4 flex flex-col gap-4 flex-shrink-0">
                        {phase === GamePhase.GAME_OVER ? (
                             <div className="text-center p-6 bg-stone-800 rounded-2xl border border-amber-500 animate-pulse"><h2 className="text-xl text-amber-400 font-cinzel mb-4">Victory!</h2><button onClick={() => setGameMode(null)} className="bg-amber-600 text-white px-8 py-2 rounded-full font-bold uppercase text-xs">Menu</button></div>
                        ) : (
                            <>
                                <DiceArea currentRoll={lastRoll} onRoll={performRoll} canRoll={(phase === GamePhase.ROLLING || waitingForPaRa) && !isRolling && (gameMode !== GameMode.AI || turnIndex === 0)} pendingValues={pendingMoveValues} waitingForPaRa={waitingForPaRa} flexiblePool={null} />
                                <div className="flex gap-2">
                                    <button onClick={() => { if (phase === GamePhase.MOVING && (gameMode !== GameMode.AI || turnIndex === 0) && players[turnIndex].coinsInHand > 0) setSelectedSourceIndex(0); }} className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center ${selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/20' : 'border-stone-800 bg-stone-900/50'}`}><span className="text-xs font-bold uppercase tracking-widest text-stone-500">From Hand</span><span className="text-xl font-bold">{players[turnIndex].coinsInHand}</span></button>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && (gameMode !== GameMode.AI || turnIndex === 0) && ( <button onClick={handleSkipTurn} className="bg-amber-900/20 hover:bg-amber-800/40 text-amber-500 border border-amber-600/30 p-4 rounded-xl font-bold text-xs uppercase tracking-widest">Skip</button> )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex-grow bg-black/40 mx-4 mb-4 rounded-xl p-3 overflow-y-auto no-scrollbar font-mono text-[10px] text-stone-600 border border-stone-800 mobile-landscape-hide-logs">{logs.map(log => <div key={log.id} className={log.type === 'alert' ? 'text-amber-500/80' : ''}>&gt; {log.message}</div>)}</div>
                </div>
                <div className="flex-grow relative bg-[#1c1917] flex items-center justify-center overflow-hidden order-2 h-[60dvh] md:h-full mobile-landscape-board" ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => performMove(m.sourceIndex, m.targetIndex)} currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null)} selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} onInvalidMoveAttempt={() => SFX.playBlocked()} />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;