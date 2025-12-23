import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Player, PlayerColor, BoardState, GamePhase, 
  DiceRoll, MoveResultType, MoveOption, GameLog, BoardShell, GameMode
} from './types';
import { TOTAL_SHELLS, COINS_PER_PLAYER, PLAYERS_CONFIG, COLOR_PALETTE } from './constants';
import { Board } from './components/Board';
import { DiceArea } from './components/DiceArea';
import { RulesModal } from './components/RulesModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ShoLogo } from './components/ShoLogo';

const generatePlayers = (
    p1Settings: { name: string, color: string },
    p2Settings: { name: string, color: string }
): Player[] => {
    return [
        { id: PlayerColor.Red, name: p1Settings.name || 'Player 1', colorHex: p1Settings.color || COLOR_PALETTE[0].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 },
        { id: PlayerColor.Blue, name: p2Settings.name || 'Player 2', colorHex: p2Settings.color || COLOR_PALETTE[1].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 }
    ];
};

const SFX = {
  ctx: null as AudioContext | null,
  getContext: () => { if (!SFX.ctx) { SFX.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return SFX.ctx; },
  createNoiseBuffer: (ctx: AudioContext) => { const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; } return buffer; },
  playShake: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const noise = ctx.createBufferSource(); noise.buffer = SFX.createNoiseBuffer(ctx); const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1000; const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(t); noise.stop(t + 0.35); },
  playLand: () => { const ctx = SFX.getContext(); const t = ctx.currentTime; const osc = ctx.createOscillator(); const thudGain = ctx.createGain(); osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.15); thudGain.gain.setValueAtTime(0.8, t); thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.connect(thudGain); thudGain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.2); },
  playCoinClick: (timeOffset = 0, pitch = 1.0) => { const ctx = SFX.getContext(); const t = ctx.currentTime + timeOffset; const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.setValueAtTime(2000 * pitch, t); const modulator = ctx.createOscillator(); modulator.type = 'square'; modulator.frequency.setValueAtTime(320 * pitch, t); const modGain = ctx.createGain(); modGain.gain.setValueAtTime(800, t); modGain.gain.exponentialRampToValueAtTime(1, t + 0.1); modulator.connect(modGain); modulator.connect(carrier.frequency); const mainGain = ctx.createGain(); mainGain.gain.setValueAtTime(0, t); mainGain.gain.linearRampToValueAtTime(0.2, t + 0.01); mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); carrier.connect(mainGain); mainGain.connect(ctx.destination); carrier.start(t); carrier.stop(t + 0.3); modulator.start(t); modulator.stop(t + 0.3); },
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

const calculatePotentialMoves = (sourceIdx: number, moveVals: number[], currentBoard: BoardState, player: Player, isNinerMode: boolean, isOpeningPaRa: boolean): MoveOption[] => {
  const options: MoveOption[] = [];
  const evaluateTarget = (dist: number, consumed: number[]): MoveOption | null => {
    const targetIdx = sourceIdx + dist;
    if (targetIdx > TOTAL_SHELLS) { return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.FINISH }; }
    const targetShell = currentBoard.get(targetIdx); if (!targetShell) return null;
    
    let movingStackSize = 0;
    if (sourceIdx === 0) {
        if (player.coinsInHand === COINS_PER_PLAYER) {
            movingStackSize = isOpeningPaRa ? 3 : 2;
        } else {
            movingStackSize = 1;
        }
    } else {
        movingStackSize = currentBoard.get(sourceIdx)?.stackSize || 0;
    }

    if (targetShell.owner === player.id) { const rs = targetShell.stackSize + movingStackSize; if (!isNinerMode && rs === 9) return null; return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.STACK }; }
    if (targetShell.owner && targetShell.owner !== player.id) { if (movingStackSize >= targetShell.stackSize) return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.KILL }; return null; }
    return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.PLACE };
  };
  Array.from(new Set(moveVals)).forEach(val => { const opt = evaluateTarget(val, [val]); if (opt) options.push(opt); });
  if (moveVals.length > 1) { const total = moveVals.reduce((a, b) => a + b, 0); const opt = evaluateTarget(total, moveVals); if (opt && !options.some(o => o.targetIndex === opt.targetIndex)) options.push(opt); }
  return options;
};

const getAvailableMoves = (pIndex: number, pBoard: BoardState, pPlayers: Player[], pVals: number[], isNinerMode: boolean, isOpeningPaRa: boolean) => {
  let moves: MoveOption[] = []; const player = pPlayers[pIndex]; if (!player) return moves;
  if (player.coinsInHand > 0) { moves = [...moves, ...calculatePotentialMoves(0, pVals, pBoard, player, isNinerMode, isOpeningPaRa)]; }
  pBoard.forEach((shell) => { if (shell.owner === player.id && shell.stackSize > 0) moves = [...moves, ...calculatePotentialMoves(shell.index, pVals, pBoard, player, isNinerMode, isOpeningPaRa)]; });
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
  const [paRaCount, setPaRaCount] = useState(0); 
  const [extraRolls, setExtraRolls] = useState(0); 
  const [isOpeningPaRa, setIsOpeningPaRa] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<MoveOption | null>(null);
  const [isNinerMode, setIsNinerMode] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [showRules, setShowRules] = useState(false);
  const [boardScale, setBoardScale] = useState(0.8);
  const [globalPlayCount, setGlobalPlayCount] = useState<number>(18742);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);
  const [handShake, setHandShake] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const gameStateRef = useRef({ board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa });
  useEffect(() => { 
    gameStateRef.current = { board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa }; 
  }, [board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa]);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  useEffect(() => { 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); setGlobalPlayCount(prev => prev + growth); 
    const interval = setInterval(() => { if (Math.random() > 0.4) { setGlobalPlayCount(prev => prev + 1); setIsCounterPulsing(true); setTimeout(() => setIsCounterPulsing(false), 2000); } }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeGame = useCallback((p2Config?: { name: string, color: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>(); for (let i = 1; i <= TOTAL_SHELLS; i++) newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    setBoard(newBoard);
    const initialPlayers = generatePlayers({ name: playerName, color: selectedColor }, p2Config || { name: 'Opponent', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6' });
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setPaRaCount(0); setExtraRolls(0); setIsOpeningPaRa(false); setLastMove(null); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null);
    addLog("New game started! ཤོ་འགོ་ཚུགས་སོང་།", 'info');
  }, [playerName, selectedColor, addLog]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); setBoardScale(Math.max(Math.min((width - 20) / 800, (height - 20) / 800, 1), 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, [gameMode]);

  const handleSkipTurn = useCallback(() => {
    const s = gameStateRef.current;
    setPendingMoveValues([]);
    setIsOpeningPaRa(false);
    if (s.extraRolls > 0) {
        setExtraRolls(prev => prev - 1);
        setPhase(GamePhase.ROLLING);
        addLog(`${players[turnIndex].name} used an extra roll!`, 'info');
    } else {
        setPhase(GamePhase.ROLLING);
        setTurnIndex((prev) => (prev + 1) % players.length);
        addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
    }
  }, [players, turnIndex, addLog]);

  const performRoll = async () => {
    const s = gameStateRef.current; if (s.phase !== GamePhase.ROLLING) return;
    setIsRolling(true); SFX.playShake(); await new Promise(resolve => setTimeout(resolve, 800)); 
    let d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 2; d2 = 6; }
    
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
    
    if (isPaRa) { 
        SFX.playPaRa(); 
        const newCount = s.paRaCount + 1;
        if (newCount === 3) {
            addLog(`TRIPLE PA RA! ${players[turnIndex].name} wins instantly! པ་ར་གསུམ་བརྩེགས་ཀྱི་རྒྱལ་ཁ།`, 'alert');
            setPhase(GamePhase.GAME_OVER);
            return;
        }
        setPaRaCount(newCount); 
        addLog(`PA RA (1,1)! Stacked bonuses: ${newCount}. Roll again. པ་ར་བབས་སོང་།`, 'alert'); 
    } 
    else { 
        const isOpening = players[s.turnIndex].coinsInHand === COINS_PER_PLAYER;
        if (s.paRaCount > 0 && isOpening) {
            setIsOpeningPaRa(true);
            addLog(`OPENING PA RA! You can place 3 coins! པ་ར་བབས་སོང་། ལག་ཁྱི་གསུམ་འཇོག་ཆོག`, 'alert');
        }
        const movePool = [...Array(s.paRaCount).fill(2), total];
        setPendingMoveValues(movePool); 
        setPaRaCount(0); 
        setPhase(GamePhase.MOVING); 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  };

  const performMove = (sourceIdx: number, targetIdx: number) => {
    const s = gameStateRef.current;
    const currentMovesList = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
    const move = currentMovesList.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    if (!move) return;

    const nb: BoardState = new Map(s.board); 
    const player = s.players[s.turnIndex]; 
    let localExtraRollInc = 0; 
    let movingStackSize = 0; 
    let newPlayers = [...s.players];

    if (move.sourceIndex === 0) { 
        const isOpening = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER; 
        movingStackSize = isOpening ? (s.isOpeningPaRa ? 3 : 2) : 1; 
        newPlayers[s.turnIndex].coinsInHand -= movingStackSize; 
        if (s.isOpeningPaRa) setIsOpeningPaRa(false);
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
            localExtraRollInc = 1; 
            addLog(`${player.name} killed a stack and earned an extra roll! གསོད་རིན་ཤོ་ཐེངས་གཅིག་ཐོབ་སོང་།`, 'alert');
        } else if (move.type === MoveResultType.STACK) { 
            SFX.playStack();
            nb.set(move.targetIndex, { ...target, stackSize: target.stackSize + movingStackSize, owner: player.id, isShoMo: false }); 
            localExtraRollInc = 1; 
            addLog(`${player.name} stacked and earned a bonus turn! བརྩེགས་རིན་ཤོ་ཐེངས་གཅིག་ཐོབ་སོང་།`, 'action');
        } else {
            SFX.playCoinClick();
            nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: (move.sourceIndex === 0 && movingStackSize >= 2) });
        }
    }

    setPlayers(newPlayers); setBoard(nb); setSelectedSourceIndex(null); 
    setLastMove({ ...move, id: Date.now() });

    let nextMoves = [...s.pendingMoveValues]; 
    move.consumedValues.forEach(val => { const idx = nextMoves.indexOf(val); if (idx > -1) nextMoves.splice(idx, 1); });

    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { setPhase(GamePhase.GAME_OVER); return; }

    const movesLeft = getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode, s.isOpeningPaRa);
    
    if (localExtraRollInc > 0) setExtraRolls(prev => prev + localExtraRollInc);

    if (nextMoves.length === 0 || movesLeft.length === 0) {
        setPendingMoveValues([]); 
        setIsOpeningPaRa(false);
        const totalExtraRolls = s.extraRolls + localExtraRollInc;
        if (totalExtraRolls > 0) {
            setExtraRolls(prev => prev - 1);
            setPhase(GamePhase.ROLLING);
            addLog(`${player.name} starts their bonus roll!`, 'info');
        } else {
            setPhase(GamePhase.ROLLING); 
            setTurnIndex((prev) => (prev + 1) % players.length);
        }
    } else {
        setPendingMoveValues(nextMoves);
    }
  };

  // AI Strategic Loop
  useEffect(() => {
    if (gameMode === GameMode.AI && turnIndex === 1 && phase !== GamePhase.GAME_OVER && !isRolling) {
      const timer = setTimeout(() => {
        const s = gameStateRef.current;
        if (s.phase === GamePhase.ROLLING) {
          performRoll();
        } else if (s.phase === GamePhase.MOVING) {
          const aiMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
          if (aiMoves.length > 0) {
            const humPlayer = s.players[0];
            const aiPlayer = s.players[1];
            let humLeadIndex = 0;
            let humMaxStackSize = 0;
            const humStacks: BoardShell[] = [];
            
            s.board.forEach(shell => {
              if (shell.owner === humPlayer.id) {
                humStacks.push(shell);
                if (shell.index > humLeadIndex) humLeadIndex = shell.index;
                if (shell.stackSize > humMaxStackSize) humMaxStackSize = shell.stackSize;
              }
            });

            const scoredMoves = aiMoves.map(m => {
              let score = 0; 
              const targetShell = s.board.get(m.targetIndex);
              const endgameWeight = aiPlayer.coinsFinished > 5 ? 3.0 : 1.0;
              score += m.targetIndex * 15 * endgameWeight;
              let aiSize = 0;
              if (m.sourceIndex === 0) {
                  aiSize = aiPlayer.coinsInHand === COINS_PER_PLAYER ? (s.isOpeningPaRa ? 3 : 2) : 1;
                  score += 400;
              } else {
                  aiSize = s.board.get(m.sourceIndex)?.stackSize || 1;
              }
              if (m.type === MoveResultType.FINISH) score += 6000;
              if (m.type === MoveResultType.KILL) {
                  const victimSize = targetShell?.stackSize || 0;
                  const isShoMoKill = targetShell?.isShoMo;
                  score += 4000 + (victimSize * 300);
                  if (isShoMoKill) score += 1500;
                  if (m.targetIndex === humLeadIndex) score += 2000;
              }
              if (m.type === MoveResultType.STACK) {
                const totalSize = (targetShell?.stackSize || 0) + aiSize;
                if (totalSize >= 4 && totalSize <= 6) score += 2500;
                else if (totalSize >= 3) score += 1800;
                else score += 700;
                score += 1000; 
              }
              if (m.targetIndex > humLeadIndex && m.targetIndex <= humLeadIndex + 12) {
                  if (aiSize > humMaxStackSize) {
                      const distanceToLead = m.targetIndex - humLeadIndex;
                      const blockQuality = distanceToLead >= 2 && distanceToLead <= 7 ? 3500 : 1500;
                      score += blockQuality;
                  } else if (aiSize === humMaxStackSize) {
                      score += 800;
                  }
              }
              humStacks.forEach((shell: BoardShell) => {
                if (shell.stackSize > aiSize) {
                    const dist = m.targetIndex - shell.index;
                    if (dist >= 2 && dist <= 12) {
                        const prob = DICE_PROBS[dist] || 0;
                        score -= prob * (15000 * endgameWeight); 
                    }
                }
                if (aiSize >= shell.stackSize) {
                     const dist = shell.index - m.targetIndex;
                     if (dist >= 2 && dist <= 12) {
                         const prob = DICE_PROBS[dist] || 0;
                         score += prob * 4000;
                     }
                }
              });
              if (m.type === MoveResultType.PLACE || m.type === MoveResultType.STACK) {
                  if (m.targetIndex > 50) score += 500;
              }
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
  }, [turnIndex, phase, gameMode, isRolling, paRaCount, extraRolls, board, pendingMoveValues, isNinerMode, players, handleSkipTurn, isOpeningPaRa]);

  const currentValidMovesList = phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode, isOpeningPaRa) : [];
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const shouldHighlightHand = phase === GamePhase.MOVING && (gameMode !== GameMode.AI || turnIndex === 0) && players[turnIndex].coinsInHand > 0;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row">
        {phase === GamePhase.SETUP && gameMode !== null && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-amber-500 font-cinzel">Initializing...</div>}
        {gameMode === GameMode.TUTORIAL && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes handBlockedShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-4px); }
            40%, 80% { transform: translateX(4px); }
          }
          .animate-hand-blocked {
            animation: handBlockedShake 0.4s ease-in-out;
            border-color: #ef4444 !important;
            background-color: rgba(127, 29, 29, 0.4) !important;
          }
        `}} />
        {!gameMode && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 overflow-y-auto flex flex-col items-center justify-between p-6 py-12 md:py-24">
               {/* Title Section */}
               <div className="flex flex-col items-center flex-shrink-0 w-full max-w-sm md:max-w-md">
                   <ShoLogo className="w-48 md:w-64 mb-6" />
                   <h1 className="flex items-center gap-6 mb-4 font-cinzel">
                      <span className="text-7xl md:text-9xl text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">ཤོ</span>
                      <span className="text-5xl md:text-7xl text-amber-500 tracking-widest drop-shadow-lg">Sho</span>
                   </h1>
                   <div className="h-px w-32 bg-amber-900/40 mb-4" />
                   <p className="text-stone-400 tracking-[0.3em] uppercase text-[12px] md:text-sm text-center font-bold">Traditional Tibetan Dice Game</p>
                   <p className="text-amber-600/60 text-lg md:text-xl font-serif mt-2">བོད་ཀྱི་སྲོལ་རྒྱུན་ཤོ་རྩེད།</p>
               </div>
               <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-8 md:gap-14">
                  <div className="w-full bg-stone-900/30 p-8 rounded-[3rem] border border-stone-800/50 backdrop-blur-2xl shadow-2xl">
                      <div className="mb-10">
                        <label className="text-stone-500 text-[10px] uppercase block mb-3 tracking-widest flex justify-between font-bold px-1">
                          <span>Identity ཁྱེད་ཀྱི་མིང་།</span>
                        </label>
                        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border-b-2 border-stone-800 focus:border-amber-600 p-4 text-stone-100 outline-none transition-all text-center text-2xl font-cinzel tracking-wider" placeholder="NAME" maxLength={15} />
                      </div>
                      <div>
                        <label className="text-stone-500 text-[10px] uppercase block mb-5 tracking-widest flex justify-between font-bold px-1">
                          <span>Banner ཚོས་གཞི་དོམ།</span>
                        </label>
                        <div className="flex justify-between px-2 gap-4">
                          {COLOR_PALETTE.map((c) => ( 
                            <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-12 h-12 rounded-2xl transition-all rotate-45 ${selectedColor === c.hex ? 'border-2 border-white scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} /> 
                          ))}
                        </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 w-full px-2">
                      <button className="bg-stone-900/40 border-2 border-stone-800/80 p-8 rounded-[2rem] hover:border-amber-600/50 cursor-pointer text-center group transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.LOCAL); initializeGame(); }}>
                          <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">🏔️</span>
                          <h3 className="text-xl font-bold uppercase font-cinzel tracking-widest text-amber-100">Local</h3>
                          <span className="text-[10px] text-stone-500 font-serif">རང་ཤག་ཏུ་རྩེ།</span>
                      </button>
                      <button className="bg-stone-900/40 border-2 border-stone-800/80 p-8 rounded-[2rem] hover:border-amber-600/50 cursor-pointer text-center group transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.AI); initializeGame(); }}>
                          <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">🤖</span>
                          <h3 className="text-xl font-bold uppercase font-cinzel tracking-widest text-amber-100">AI</h3>
                          <span className="text-[10px] text-stone-500 font-serif">མི་བཟོས་རིག་ནུས།</span>
                      </button>
                  </div>
               </div>
               <div className="w-full flex flex-col items-center gap-10 mt-10">
                  <div className="flex gap-16">
                      <button onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame(undefined, true); }} className="text-stone-500 hover:text-amber-500 flex flex-col items-center transition-colors group">
                          <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel group-hover:tracking-[0.2em] transition-all">Tutorial</span>
                          <span className="text-[10px] font-serif mt-1 opacity-60">རྩེ་སྟངས་མྱུར་ཁྲིད།</span>
                      </button>
                      <button onClick={() => setShowRules(true)} className="text-stone-500 hover:text-amber-500 flex flex-col items-center transition-colors group">
                          <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel group-hover:tracking-[0.2em] transition-all">Rules</span>
                          <span className="text-[10px] font-serif mt-1 opacity-60">ཤོ་ཡི་སྒྲིག་གཞི།</span>
                      </button>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-stone-600 text-[10px] uppercase tracking-[0.4em] font-bold">Games Commenced</span>
                      <span className={`text-amber-700/80 font-bold text-4xl tabular-nums transition-all duration-700 mt-2 ${isCounterPulsing ? 'scale-110 text-amber-500 brightness-125' : ''}`}>
                        {globalPlayCount.toLocaleString()}
                      </span>
                  </div>
               </div>
          </div>
        )}
        {gameMode && (
            <>
                <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[38dvh] md:h-full order-1 overflow-hidden flex-shrink-0 mobile-landscape-sidebar">
                    <div className="p-2 md:p-4 flex flex-col gap-1 md:gap-3 flex-shrink-0 bg-stone-950 mobile-landscape-compact-stats">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-1 md:pb-4">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setGameMode(null)}>
                                <h1 className="text-amber-500 text-base md:text-2xl font-cinzel">ཤོ Sho</h1>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowRules(true)} className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 hover:text-amber-500 flex items-center justify-center text-[10px] md:text-xs">?</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-1 md:gap-2 mt-1">
                            {players.map((p, i) => (
                                <div key={p.id} className={`p-1 md:p-2 rounded-lg border transition-all ${turnIndex === i ? 'bg-stone-800 border-white/20 shadow-md' : 'border-stone-800 opacity-60'}`} style={{ borderColor: turnIndex === i ? p.colorHex : 'transparent' }}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full" style={{ backgroundColor: p.colorHex }}></div>
                                        <h3 className="font-bold truncate text-[7px] md:text-[10px] font-serif" style={{ color: p.colorHex }}>{p.name}</h3>
                                    </div>
                                    <div className="flex justify-between text-[6px] md:text-[9px] text-stone-400">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-stone-200">{p.coinsInHand} <span className="uppercase opacity-50 text-[5px] md:text-[7px]">In ལག་ཐོག།</span></span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-amber-500">{p.coinsFinished} <span className="uppercase opacity-50 text-[5px] md:text-[7px]">Out གདན་ཐོག</span></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="px-2 md:px-4 pb-1 flex flex-col gap-1 flex-shrink-0 bg-stone-950">
                        {phase === GamePhase.GAME_OVER ? ( 
                            <div className="text-center p-2 md:p-4 bg-stone-800 rounded-xl border border-amber-500 animate-pulse">
                                <h2 className="text-base md:text-xl text-amber-400 font-cinzel">Victory རྒྱལ་ཁ།</h2>
                                <button onClick={() => initializeGame()} className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold uppercase text-[8px] md:text-[10px] mt-1">New Game</button>
                            </div> 
                        ) : ( 
                            <div className="flex flex-col gap-1">
                                <DiceArea currentRoll={lastRoll} onRoll={performRoll} canRoll={(phase === GamePhase.ROLLING) && !isRolling && (gameMode !== GameMode.AI || turnIndex === 0)} pendingValues={pendingMoveValues} waitingForPaRa={paRaCount > 0} paRaCount={paRaCount} extraRolls={extraRolls} flexiblePool={null} />
                                <div className="flex gap-1">
                                    <div onClick={() => { 
                                      if (phase === GamePhase.MOVING && (gameMode !== GameMode.AI || turnIndex === 0)) { 
                                        if (players[turnIndex].coinsInHand > 0) {
                                          setSelectedSourceIndex(0); 
                                        } else {
                                          SFX.playBlocked();
                                          setHandShake(true);
                                          setTimeout(() => setHandShake(false), 400);
                                          addLog("There are no more coins (lak-khyi) in hand. ལག་ཁྱི་ཚར་སོང་།", 'alert');
                                        }
                                      } 
                                    }} className={`flex-1 p-2 md:p-6 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${handShake ? 'animate-hand-blocked' : selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/40 shadow-inner scale-95' : shouldHighlightHand ? 'border-amber-500/80 bg-amber-900/10 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-stone-800 bg-stone-900/50'}`}>
                                        <span className={`font-bold tracking-widest uppercase font-cinzel text-[10px] md:text-lg ${shouldHighlightHand ? 'text-amber-400' : handShake ? 'text-red-400' : ''}`}>From Hand</span>
                                        <span className="text-[7px] md:text-xs text-stone-500 font-serif">ལག་ཁྱི་བཙུགས། ({players[turnIndex].coinsInHand})</span>
                                    </div>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && paRaCount === 0 && (gameMode !== GameMode.AI || turnIndex === 0) && ( 
                                        <button onClick={handleSkipTurn} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-1 rounded-xl font-bold flex flex-col items-center justify-center font-cinzel">
                                            <span className="text-[8px] md:text-[10px]">Skip Turn</span>
                                            <span className="text-[7px] md:text-[9px] font-serif">སྐོར་ཐེངས་འདི་སྐྱུར།</span>
                                        </button> 
                                    )}
                                </div>
                            </div> 
                        )}
                    </div>
                    <div className="h-8 md:flex-grow bg-black/40 mx-2 md:mx-4 mb-1 rounded-lg p-1 md:p-3 overflow-y-auto no-scrollbar font-mono text-[6px] md:text-[9px] text-stone-500 border border-stone-800 mobile-landscape-hide-logs">
                        {logs.slice(0, 1).map(log => <div key={log.id} className={log.type === 'alert' ? 'text-amber-400' : ''}>{log.message}</div>)}
                    </div>
                </div>
                <div className="flex-grow relative bg-[#1a1715] flex items-center justify-center overflow-hidden order-2 h-[62dvh] md:h-full mobile-landscape-board" ref={boardContainerRef}>
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