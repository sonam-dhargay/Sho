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
import { GoogleGenAI } from "@google/genai";

// --- Player Generation Helper ---
const generatePlayers = (
    p1Settings: { name: string, color: string, avatar?: string },
    p2Settings: { name: string, color: string, avatar?: string }
): Player[] => {
    return [
        {
            id: PlayerColor.Red,
            name: p1Settings.name || 'Player 1',
            colorHex: p1Settings.color || COLOR_PALETTE[0].hex,
            coinsInHand: COINS_PER_PLAYER,
            coinsFinished: 0,
            avatar: p1Settings.avatar || AVATAR_PRESETS[0]
        },
        {
            id: PlayerColor.Blue,
            name: p2Settings.name || 'Player 2',
            colorHex: p2Settings.color || COLOR_PALETTE[1].hex,
            coinsInHand: COINS_PER_PLAYER,
            coinsFinished: 0,
            avatar: p2Settings.avatar || AVATAR_PRESETS[1]
        }
    ];
};

// --- Procedural Sound Effects Manager ---
const SFX = {
  ctx: null as AudioContext | null,
  musicNodes: [] as AudioNode[],
  musicIntervals: [] as number[],
  masterMusicGain: null as GainNode | null,
  
  getContext: () => {
    if (!SFX.ctx) {
      SFX.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    return SFX.ctx;
  },

  createNoiseBuffer: (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  setMusicVolume: (volume: number) => {
      if (SFX.masterMusicGain) {
          const ctx = SFX.getContext();
          SFX.masterMusicGain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.1);
      }
  },

  startAmbient: (initialVolume: number) => {
    const ctx = SFX.getContext();
    if (SFX.musicNodes.length > 0) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(initialVolume * 0.2, ctx.currentTime + 2);
    masterGain.connect(ctx.destination);
    SFX.masterMusicGain = masterGain;
    SFX.musicNodes.push(masterGain);

    const baseFreqs = [110, 165, 220, 330];
    baseFreqs.forEach(f => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05 + Math.random() * 0.1;
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      lfo.start();
      SFX.musicNodes.push(osc, lfo);
    });

    SFX.musicIntervals.push(window.setInterval(() => {
        const t = ctx.currentTime;
        if (!SFX.masterMusicGain) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        g.connect(SFX.masterMusicGain);
        osc.start(t);
        osc.stop(t + 0.5);
    }, 4000));
  },

  stopAmbient: () => {
    SFX.musicIntervals.forEach(clearInterval);
    SFX.musicIntervals = [];
    SFX.musicNodes.forEach(node => {
        try { (node as any).stop(); } catch(e) {}
        try { (node as any).disconnect(); } catch(e) {}
    });
    SFX.musicNodes = [];
    SFX.masterMusicGain = null;
  },

  playShake: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = SFX.createNoiseBuffer(ctx);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.35);
  },

  playLand: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      osc.frequency.setValueAtTime(120, t); 
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15); 
      thudGain.gain.setValueAtTime(0.8, t);
      thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(thudGain);
      thudGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
  },

  playSelect: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.1); 
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
  },

  playCoinClick: (timeOffset = 0, pitch = 1.0) => {
    const ctx = SFX.getContext();
    const t = ctx.currentTime + timeOffset;
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(2000 * pitch, t);
    const modulator = ctx.createOscillator();
    modulator.type = 'square';
    modulator.frequency.setValueAtTime(320 * pitch, t);
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(800, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + 0.1);
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, t);
    mainGain.gain.linearRampToValueAtTime(0.2, t + 0.01);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    carrier.connect(mainGain);
    mainGain.connect(ctx.destination);
    carrier.start(t);
    carrier.stop(t + 0.3);
    modulator.start(t);
    modulator.stop(t + 0.3);
  },

  playStack: () => { SFX.playCoinClick(0, 1.0); SFX.playCoinClick(0.08, 1.1); },
  playKill: () => { SFX.playCoinClick(0, 0.8); SFX.playCoinClick(0.1, 0.9); SFX.playCoinClick(0.25, 0.85); },
  playFinish: () => { SFX.playCoinClick(0, 1.2); SFX.playCoinClick(0.1, 1.5); SFX.playCoinClick(0.2, 2.0); },
  playBounce: () => { SFX.playCoinClick(0, 0.5); },
  playHandBlocked: () => { SFX.playCoinClick(0, 0.3); SFX.playCoinClick(0.1, 0.2); },
  playPaRa: () => { SFX.playCoinClick(0, 2.0); SFX.playCoinClick(0.1, 2.2); }
};

const getRandomDicePos = () => {
    const r = 40 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    return { x: r * Math.cos(theta), y: r * Math.sin(theta), r: Math.random() * 360 };
};

const calculatePotentialMoves = (
  sourceIdx: number, moveVals: number[], currentBoard: BoardState, player: Player, isNinerMode: boolean
): MoveOption[] => {
  const options: MoveOption[] = [];
  const evaluateTarget = (dist: number, consumed: number[]): MoveOption | null => {
    const targetIdx = sourceIdx + dist;
    if (targetIdx > TOTAL_SHELLS) { return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.FINISH }; }
    const targetShell = currentBoard.get(targetIdx);
    if (!targetShell) return null;
    let movingStackSize = sourceIdx === 0 ? (player.coinsInHand === COINS_PER_PLAYER ? 2 : 1) : (currentBoard.get(sourceIdx)?.stackSize || 0);
    if (targetShell.owner === player.id) {
      const resultingSize = targetShell.stackSize + movingStackSize;
      if (!isNinerMode && resultingSize === 9) return null;
      return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.STACK };
    }
    if (targetShell.owner && targetShell.owner !== player.id) {
      if (movingStackSize >= targetShell.stackSize) { return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.KILL }; }
      return null; 
    }
    return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.PLACE };
  };

  const uniqueSingleVals = Array.from(new Set(moveVals));
  uniqueSingleVals.forEach(val => { const opt = evaluateTarget(val, [val]); if (opt) options.push(opt); });
  if (moveVals.length > 1) { const total = moveVals.reduce((a, b) => a + b, 0); const opt = evaluateTarget(total, moveVals); if (opt && !options.some(o => o.targetIndex === opt.targetIndex)) options.push(opt); }
  return options;
};

const getAvailableMoves = (pIndex: number, pBoard: BoardState, pPlayers: Player[], pVals: number[], isNinerMode: boolean) => {
  let moves: MoveOption[] = [];
  const player = pPlayers[pIndex];
  if (!player) return moves;
  if (player.coinsInHand > 0) { moves = [...moves, ...calculatePotentialMoves(0, pVals, pBoard, player, isNinerMode)]; }
  pBoard.forEach((shell) => { if (shell.owner === player.id && shell.stackSize > 0) { moves = [...moves, ...calculatePotentialMoves(shell.index, pVals, pBoard, player, isNinerMode)]; } });
  return moves;
};

// --- Camera Feature Components ---
const CameraModal: React.FC<{ onCapture: (data: string) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const initCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300, facingMode: 'user' } });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (err) {
                console.error("Camera error:", err);
                onClose();
            }
        };
        initCamera();
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, []);

    const capture = () => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, 300, 300);
                onCapture(canvasRef.current.toDataURL('image/jpeg'));
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
            <div className="bg-stone-900 p-6 rounded-2xl border border-stone-800 flex flex-col items-center">
                <h3 className="text-amber-500 font-cinzel text-xl mb-4">Capture Profile Photo པར་རྒྱོབ།</h3>
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-amber-600 shadow-2xl mb-6 bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <canvas ref={canvasRef} width={300} height={300} className="hidden" />
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-stone-800 text-stone-400 font-bold uppercase tracking-widest text-xs">Cancel རྩིས་མེད་གཏོང་།</button>
                    <button onClick={capture} className="px-6 py-2 rounded-lg bg-amber-600 text-white font-bold shadow-lg shadow-amber-900/40 uppercase tracking-widest text-xs">Snap! པར་རྒྱོབ།</button>
                </div>
            </div>
        </div>
    );
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
  const [totalMoves, setTotalMoves] = useState(0);
  const [isNinerMode, setIsNinerMode] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [showCamera, setShowCamera] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(0.8);
  const [aiThinking, setAiThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [globalPlayCount, setGlobalPlayCount] = useState<number>(0);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);

  const gameStateRef = useRef({ board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, gameMode, tutorialStep });

  useEffect(() => { gameStateRef.current = { board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, gameMode, tutorialStep }; }, [board, players, turnIndex, phase, pendingMoveValues, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, gameMode, tutorialStep]);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  useEffect(() => { 
    const baseCount = 18742; 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); 
    setGlobalPlayCount(baseCount + growth); 
    const interval = setInterval(() => { if (Math.random() > 0.4) { setGlobalPlayCount(prev => prev + 1); setIsCounterPulsing(true); setTimeout(() => setIsCounterPulsing(false), 2000); } }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeGame = useCallback((p2Config?: { name: string, color: string, avatar?: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>();
    for (let i = 1; i <= TOTAL_SHELLS; i++) { newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false }); }
    setBoard(newBoard);
    const mySettings = { name: playerName || 'Player 1', color: selectedColor, avatar: selectedAvatar };
    let opponentSettings = p2Config || { name: 'Opponent', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: AVATAR_PRESETS[1] };
    const initialPlayers = generatePlayers(mySettings, opponentSettings);
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setWaitingForPaRa(false); setLastMove(null); setTotalMoves(0); setAiThinking(false); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null);
  }, [playerName, selectedColor, selectedAvatar]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); const scale = Math.min((width - 20) / 800, (height - 20) / 800, 1); setBoardScale(Math.max(scale, 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [gameMode, phase]);

  const performRoll = async () => {
    const s = gameStateRef.current; if (s.phase !== GamePhase.ROLLING && !s.waitingForPaRa) return;
    setIsRolling(true); SFX.playShake(); await new Promise(resolve => setTimeout(resolve, 1200)); 
    let d1 = Math.floor(Math.random() * 6) + 1; let d2 = Math.floor(Math.random() * 6) + 1;
    if (s.gameMode === GameMode.TUTORIAL) { if (s.tutorialStep === 2) { d1 = 2; d2 = 6; } }
    const isPaRa = (d1 === 1 && d2 === 1);
    const pos1 = getRandomDicePos(); const pos2 = getRandomDicePos();
    const visuals = { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r };
    const total = d1 + d2; const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals };
    setLastRoll(newRoll); setIsRolling(false); SFX.playLand();
    if (isPaRa) { SFX.playPaRa(); setWaitingForPaRa(true); addLog(`PA RA (1,1)! Roll again.`, 'alert'); } 
    else { 
        if (s.waitingForPaRa) { setPendingMoveValues([2, total]); setWaitingForPaRa(false); setPhase(GamePhase.MOVING); } 
        else { setPendingMoveValues([total]); setPhase(GamePhase.MOVING); } 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  };

  const handleSkipTurn = useCallback(() => { setPendingMoveValues([]); setLastRoll(null); setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length); }, [players.length]);

  const performMove = (sourceIdx: number, targetIdx: number) => {
    const s = gameStateRef.current;
    const validMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode);
    const move = validMoves.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    if (!move) return;
    if (move.type === MoveResultType.KILL) SFX.playKill(); else if (move.type === MoveResultType.STACK) SFX.playStack(); else if (move.type === MoveResultType.FINISH) SFX.playFinish(); else SFX.playCoinClick();
    const nb: BoardState = new Map(s.board); const player = s.players[s.turnIndex]; let bonusTurn = false; let turnContinues = false; let movingStackSize = 0; const newPlayers = [...s.players];
    if (move.sourceIndex === 0) { const isOpening = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER; if (isOpening) { movingStackSize = 2; newPlayers[s.turnIndex].coinsInHand -= 2; } else { movingStackSize = 1; newPlayers[s.turnIndex].coinsInHand -= 1; } } 
    else { const source = nb.get(move.sourceIndex)!; movingStackSize = source.stackSize; nb.set(move.sourceIndex, { ...source, stackSize: 0, owner: null, isShoMo: false }); }
    const target = nb.get(move.targetIndex)!; 
    if (move.type === MoveResultType.FINISH) { newPlayers[turnIndex].coinsFinished += movingStackSize; } 
    else {
      if (move.type === MoveResultType.KILL) { const enemyIdx = players.findIndex(p => p.id === target.owner); if (enemyIdx !== -1) newPlayers[enemyIdx].coinsInHand += target.stackSize; nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: false }); bonusTurn = true; } 
      else if (move.type === MoveResultType.STACK) { nb.set(move.targetIndex, { ...target, stackSize: target.stackSize + movingStackSize, owner: player.id, isShoMo: false }); bonusTurn = true; } 
      else { nb.set(move.targetIndex, { ...target, stackSize: movingStackSize, owner: player.id, isShoMo: (move.sourceIndex === 0 && movingStackSize === 2) }); }
    }
    setPlayers(newPlayers); setBoard(nb); setSelectedSourceIndex(null); setLastMove({ ...move, id: Date.now() });
    let nextMoves = [...s.pendingMoveValues]; for (const val of move.consumedValues) { const idx = nextMoves.indexOf(val); if (idx > -1) nextMoves.splice(idx, 1); }
    if (nextMoves.length > 0 && getAvailableMoves(s.turnIndex, nb, newPlayers, nextMoves, s.isNinerMode).length > 0) { setPendingMoveValues(nextMoves); turnContinues = true; }
    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { setPhase(GamePhase.GAME_OVER); return; }
    if (!turnContinues) { if (bonusTurn) { setPhase(GamePhase.ROLLING); setPendingMoveValues([]); } else { setPendingMoveValues([]); setPhase(GamePhase.ROLLING); setTurnIndex((prev) => (prev + 1) % players.length); } }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 4) setTutorialStep(5);
  };

  const currentValidMovesList = useCallback(() => (phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode) : []), [phase, turnIndex, board, pendingMoveValues, isNinerMode])();
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const winner = players.find(p => p.coinsFinished >= COINS_PER_PLAYER);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row fixed inset-0 font-sans">
        {gameMode === GameMode.TUTORIAL && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        {showCamera && <CameraModal onCapture={(data) => setSelectedAvatar(data)} onClose={() => setShowCamera(false)} />}

        {!gameMode && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 overflow-y-auto flex flex-col items-center justify-start md:justify-center p-4 pt-12 md:pt-4">
               <h1 className="flex items-center gap-4 mb-4 font-cinzel">
                  <span className="text-7xl opacity-70 font-serif">ཤོ</span> 
                  <span className="text-5xl">Sho</span>
               </h1>
               <p className="text-amber-400/60 mb-2 text-[10px] text-center font-serif tracking-widest italic uppercase">པ་ར་སྤེན་པ་བཀྲ་ཤིས་ཞུགས། རྒྱག་མཁན་འཕྲིན་ལས་རྣམ་རྒྱལ་རེད།</p>
               <p className="text-stone-400 tracking-widest uppercase text-xs mb-8">Traditional Tibetan Dice Game <span className="font-serif">བོད་ཀྱི་ཤོ་རྩེད་སྲོལ་རྒྱུན་མ།</span></p>
              
               <div className="mb-8 w-full max-w-md bg-stone-900/50 p-6 rounded-xl border border-stone-800">
                  <div className="mb-4">
                      <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest flex justify-between">
                        <span>Your Name</span><span className="opacity-50 font-serif">ཁྱེད་ཀྱི་མིང་།</span>
                      </label>
                      <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 outline-none focus:border-amber-500" maxLength={15} />
                  </div>
                  <div className="mb-4">
                      <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest flex justify-between">
                        <span>Choose Color</span><span className="opacity-50 font-serif">ཚོས་གཞི་དོམ།</span>
                      </label>
                      <div className="flex gap-2">
                          {COLOR_PALETTE.map((c) => (
                              <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-8 h-8 rounded-full border-2 ${selectedColor === c.hex ? 'border-white shadow-[0_0_8px_white]' : 'border-transparent opacity-70'}`} style={{ backgroundColor: c.hex }} />
                          ))}
                      </div>
                  </div>
                  <div className="mb-4">
                       <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest flex justify-between">
                        <span>Select Avatar</span><span className="opacity-50 font-serif">གཟུགས་བརྙན་དོམ།</span>
                       </label>
                       <div className="flex gap-2">
                           {AVATAR_PRESETS.map((av) => (
                               <button key={av} onClick={() => setSelectedAvatar(av)} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 ${selectedAvatar === av ? 'border-amber-500 bg-stone-800' : ''}`}>{av}</button>
                           ))}
                           <button onClick={() => setShowCamera(true)} className="w-8 h-8 rounded-lg border border-stone-700 hover:bg-stone-800 flex items-center justify-center">📸</button>
                       </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-6 px-2">
                  <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hover:border-amber-600 cursor-pointer text-center group transition-colors" onClick={() => { setGameMode(GameMode.LOCAL); initializeGame(); }}>
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🏔️</div>
                    <h3 className="text-lg font-bold uppercase font-cinzel">Local</h3>
                    <span className="text-[10px] opacity-50 font-serif">ས་གནས་སུ་རྩེ།</span>
                  </div>
                  <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hover:border-amber-600 cursor-pointer text-center group transition-colors" onClick={() => { setGameMode(GameMode.AI); initializeGame(); }}>
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🤖</div>
                    <h3 className="text-lg font-bold uppercase font-cinzel">Vs AI</h3>
                    <span className="text-[10px] opacity-50 font-serif">མི་བཟོས་རིག་ནུས་དང་མཉམ་དུ་རྩེ།</span>
                  </div>
              </div>

              <div className="flex gap-8 mb-8">
                  <button onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame(undefined, true); }} className="text-stone-500 hover:text-amber-500 flex flex-col items-center">
                      <span className="font-bold uppercase text-xs tracking-widest font-cinzel">Tutorial</span>
                      <span className="text-[10px] font-serif">རྩེ་སྟངས་མྱུར་ཁྲིད།</span>
                  </button>
                  <button onClick={() => setShowRules(true)} className="text-stone-500 hover:text-amber-500 flex flex-col items-center">
                      <span className="font-bold uppercase text-xs tracking-widest font-cinzel">Rules</span>
                      <span className="text-[10px] font-serif">ཤོ་ཡི་སྒྲིག་གཞི།</span>
                  </button>
              </div>

              <div className="text-stone-500 text-[10px] uppercase tracking-widest text-center">
                  Total Games Played <span className="font-serif">འཛམ་གླིང་ཁྱོན་ཡོངས་སུ་རྩེད་གྲངས།</span><br/>
                  <span className={`text-amber-600 font-bold text-xl tabular-nums transition-all duration-700 inline-block ${isCounterPulsing ? 'scale-125 text-amber-400 brightness-125' : ''}`}>{globalPlayCount.toLocaleString()}</span>
              </div>
          </div>
        )}

        {gameMode && (
            <>
                {/* Sidebar - Always visible controls on mobile */}
                <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[48dvh] md:h-full order-1 overflow-hidden flex-shrink-0">
                    {/* Header & Stats - Fixed */}
                    <div className="p-3 md:p-4 flex flex-col gap-2 md:gap-3 flex-shrink-0 bg-stone-950">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-2 md:pb-4">
                            <h1 onClick={() => setGameMode(null)} className="cursor-pointer text-amber-500 text-xl md:text-2xl font-cinzel">ཤོ Sho</h1>
                            <div className="flex gap-2">
                                <button onClick={() => setIsMusicEnabled(!isMusicEnabled)} className={`w-7 h-7 md:w-8 md:h-8 rounded-full border border-stone-600 flex items-center justify-center ${isMusicEnabled ? 'text-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'text-stone-600'}`}>{isMusicEnabled ? '🎵' : '🔇'}</button>
                                <button onClick={() => setShowRules(true)} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 hover:text-amber-500 flex items-center justify-center">?</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            {players.map((p, i) => (
                                <div key={p.id} className={`p-2 md:p-3 rounded-lg border transition-all ${turnIndex === i ? 'bg-stone-800 border-white/20 shadow-md' : 'border-stone-800 opacity-60'}`} style={{ borderColor: turnIndex === i ? p.colorHex : 'transparent' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-black/40 flex items-center justify-center">
                                            {p.avatar?.startsWith('data:') ? <img src={p.avatar} className="w-full h-full object-cover" /> : <span className="text-sm md:text-xl">{p.avatar}</span>}
                                        </div>
                                        <h3 className="font-bold truncate text-[10px] md:text-xs font-serif" style={{ color: p.colorHex }}>{p.name}</h3>
                                    </div>
                                    <div className="flex justify-between text-[8px] md:text-[10px] text-stone-400">
                                        <div className="flex flex-col">
                                          <span className="uppercase opacity-50 text-[7px] md:text-[8px]">In <span className="font-serif">ལག་ཐོག།</span></span>
                                          <span className="font-bold text-stone-200">{p.coinsInHand}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="uppercase opacity-50 text-[7px] md:text-[8px]">Out <span className="font-serif">གདན་ཐོག</span></span>
                                          <span className="font-bold text-amber-500">{p.coinsFinished}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interactive Game Controls - Fixed and prioritized */}
                    <div className="px-3 md:px-4 pb-2 flex flex-col gap-2 flex-shrink-0 bg-stone-950">
                        {phase === GamePhase.GAME_OVER ? (
                            <div className="text-center p-3 md:p-4 bg-stone-800 rounded-xl border border-amber-500 animate-pulse">
                                <h2 className="text-lg md:text-xl text-amber-400 font-cinzel">Victory རྒྱལ་ཁ།</h2>
                                <button onClick={() => initializeGame()} className="bg-amber-600 text-white px-4 py-1 rounded-full font-bold uppercase text-[9px] md:text-[10px] mt-1">New Game</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <DiceArea 
                                  currentRoll={lastRoll} 
                                  onRoll={performRoll} 
                                  canRoll={(phase === GamePhase.ROLLING || waitingForPaRa) && !isRolling} 
                                  pendingValues={pendingMoveValues} 
                                  waitingForPaRa={waitingForPaRa} 
                                  flexiblePool={null} 
                                />
                                
                                <div className="flex gap-2">
                                    <div 
                                        onClick={() => { 
                                          if (phase === GamePhase.MOVING && players[turnIndex].coinsInHand > 0) {
                                            setSelectedSourceIndex(0);
                                            if (gameMode === GameMode.TUTORIAL && tutorialStep === 3) setTutorialStep(4);
                                          } 
                                        }} 
                                        className={`flex-1 p-2 md:p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/20 shadow-inner' : 'border-stone-800 bg-stone-900/50'}`}
                                    >
                                        <span className="font-bold tracking-widest uppercase font-cinzel text-[9px] md:text-sm">From Hand</span>
                                        <span className="text-[8px] md:text-[9px] text-stone-500 font-serif">ལག་ཁྱི་བཙུགས། ({players[turnIndex].coinsInHand})</span>
                                    </div>
                                    
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && !waitingForPaRa && (
                                        <button onClick={handleSkipTurn} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-2 rounded-xl font-bold flex flex-col items-center justify-center font-cinzel">
                                            <span className="text-[9px] md:text-[10px]">Skip Turn</span>
                                            <span className="text-[8px] md:text-[9px] font-serif">རྒྱག་ཐེངས་འདི་སྐྱུར།</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Logs - Takes remaining sidebar space */}
                    <div className="flex-grow bg-black/40 mx-3 md:mx-4 mb-2 rounded-lg p-2 md:p-3 overflow-y-auto no-scrollbar font-mono text-[8px] md:text-[9px] text-stone-500 border border-stone-800">
                        {logs.map(log => <div key={log.id} className={log.type === 'alert' ? 'text-amber-400' : ''}>{log.message}</div>)}
                    </div>
                </div>

                {/* Main Game Board - Takes remaining screen height */}
                <div className="flex-grow relative bg-[#1c1917] flex items-center justify-center overflow-hidden order-2 h-[52dvh] md:h-full" ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => performMove(m.sourceIndex, m.targetIndex)} currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null)} selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} onInvalidMoveAttempt={() => SFX.playHandBlocked()}
                        />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;