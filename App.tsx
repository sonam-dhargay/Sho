import React, { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { GoogleGenAI } from "@google/genai";
import { 
  Player, PlayerColor, BoardState, GamePhase, 
  DiceRoll, MoveResultType, MoveOption, GameLog, BoardShell, GameMode, NetworkPacket
} from './types';
import { TOTAL_SHELLS, COINS_PER_PLAYER, PLAYERS_CONFIG, COLOR_PALETTE } from './constants';
import { Board } from './components/Board';
import { DiceArea } from './components/DiceArea';
import { RulesModal } from './components/RulesModal';
import { TutorialOverlay } from './components/TutorialOverlay';

const generatePlayers = (
    p1Settings: { name: string, color: string },
    p2Settings: { name: string, color: string }
): Player[] => {
    return [
        { id: PlayerColor.Red, name: p1Settings.name || 'Player 1', colorHex: p1Settings.color || COLOR_PALETTE[0].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 },
        { id: PlayerColor.Blue, name: p2Settings.name || 'Player 2', colorHex: p2Settings.color || COLOR_PALETTE[1].hex, coinsInHand: COINS_PER_PLAYER, coinsFinished: 0 }
    ];
};

// Internal helper for move validation logic
const getMoveResultType = (myId: PlayerColor, target: BoardShell | undefined, moverStackSize: number, isNinerMode: boolean): MoveResultType => {
  if (!target) return MoveResultType.INVALID;
  if (!target.owner) return MoveResultType.PLACE;
  if (target.owner === myId) {
    if (!isNinerMode && target.stackSize + moverStackSize > 9) return MoveResultType.INVALID;
    return MoveResultType.STACK;
  } else {
    if (target.stackSize > moverStackSize) return MoveResultType.INVALID;
    return MoveResultType.KILL;
  }
};

// Main function to calculate all valid moves based on Sho rules
const getAvailableMoves = (
  playerIndex: number,
  board: BoardState,
  players: Player[],
  pendingValues: number[],
  isNinerMode: boolean,
  isOpeningPaRa: boolean
): MoveOption[] => {
  if (pendingValues.length === 0) return [];

  const moves: MoveOption[] = [];
  const player = players[playerIndex];
  const myId = player.id;

  const getSubsets = (arr: number[]) => {
    let results = [[] as number[]];
    for (const value of arr) {
      const copy = [...results];
      for (const prefix of copy) {
        results.push([...prefix, value]);
      }
    }
    return results.filter(s => s.length > 0);
  };

  const subsets = getSubsets(pendingValues);
  const possibleMoveValues = new Map<number, number[]>();
  for (const s of subsets) {
    const sum = s.reduce((a, b) => a + b, 0);
    if (!possibleMoveValues.has(sum)) {
      possibleMoveValues.set(sum, s);
    }
  }

  // 1. From Hand
  if (player.coinsInHand > 0) {
    const isOpening = player.coinsInHand === COINS_PER_PLAYER;
    const movingSize = isOpening ? (isOpeningPaRa ? 3 : 2) : 1;
    
    for (const [dist, consumed] of possibleMoveValues.entries()) {
      if (dist >= 1 && dist <= TOTAL_SHELLS) {
        const target = board.get(dist);
        const resultType = getMoveResultType(myId, target, movingSize, isNinerMode);
        if (resultType !== MoveResultType.INVALID) {
          moves.push({ sourceIndex: 0, targetIndex: dist, consumedValues: consumed, type: resultType });
        }
      }
    }
  }

  // 2. From Board
  for (const [idx, shell] of board.entries()) {
    if (shell.owner === myId && shell.stackSize > 0) {
      for (const [dist, consumed] of possibleMoveValues.entries()) {
        const targetIdx = idx + dist;
        if (targetIdx <= TOTAL_SHELLS) {
          const target = board.get(targetIdx);
          const resultType = getMoveResultType(myId, target, shell.stackSize, isNinerMode);
          if (resultType !== MoveResultType.INVALID) {
            moves.push({ sourceIndex: idx, targetIndex: targetIdx, consumedValues: consumed, type: resultType });
          }
        } else {
          moves.push({ sourceIndex: idx, targetIndex: TOTAL_SHELLS + 1, consumedValues: consumed, type: MoveResultType.FINISH });
        }
      }
    }
  }

  return moves;
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
  playHandBlocked: () => {
    const ctx = SFX.getContext(); const t = ctx.currentTime;
    // Heavy impact "Clonk" sound
    const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
    osc1.type = 'square'; osc1.frequency.setValueAtTime(150, t);
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    gain1.gain.setValueAtTime(0.4, t); gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(400, t);
    osc1.connect(filter); filter.connect(gain1); gain1.connect(ctx.destination);
    osc1.start(t); osc1.stop(t + 0.3);
    
    // Low rumble dissonance
    const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
    osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(110, t);
    osc2.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    gain2.gain.setValueAtTime(0.3, t); gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.start(t); osc2.stop(t + 0.3);
  },
  playPaRa: () => { SFX.playCoinClick(0, 2.0); SFX.playCoinClick(0.1, 2.2); }
};

const getRandomDicePos = () => { const r = 35 + Math.random() * 45; const theta = Math.random() * Math.PI * 2; return { x: r * Math.cos(theta), y: r * Math.sin(theta), r: Math.random() * 360 }; };

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(PLAYERS_CONFIG);
  const [board, setBoard] = useState<BoardState>(new Map());
  const [turnIndex, setTurnIndex] = useState(0); 
  const [phase, setPhase] = useState<GamePhase>(GamePhase.ROLLING);
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
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isOpponentSpeaking, setIsOpponentSpeaking] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Online Multiplayer State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [isPeerConnecting, setIsPeerConnecting] = useState(false);
  const [onlineLobbyStatus, setOnlineLobbyStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTED'>('IDLE');
  
  // Audio Streaming State
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mediaCall, setMediaCall] = useState<MediaConnection | null>(null);

  // Fix GamePhase type inference in useRef
  const gameStateRef = useRef({ board, players, turnIndex, phase: phase as GamePhase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa });
  useEffect(() => { 
    gameStateRef.current = { board, players, turnIndex, phase: phase as GamePhase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa }; 
  }, [board, players, turnIndex, phase, pendingMoveValues, paRaCount, extraRolls, isRolling, isNinerMode, gameMode, tutorialStep, isOpeningPaRa]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  // Gemini "Sho Bshad" Transcription Logic
  const transcribeInvocation = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Listen to this short Tibetan invocation for a dice game (Sho). Transcribe the Tibetan chant. If you recognize traditional phrases like 'Para Penpa Tashi Zhug' or similar sho bshad, provide the Tibetan text. Return only the transcription." },
              { inlineData: { mimeType: audioBlob.type, data: base64Audio } }
            ]
          }
        ]
      });
      const text = response.text?.trim();
      if (text) {
        addLog(`Invocation: ${text}`, 'info');
        if (connection && connection.open) {
          connection.send({ type: 'SYNC', payload: { type: 'CHANT', text } });
        }
      }
    } catch (e) {
      console.warn("Transcription failed:", e);
    }
  };

  const startRecording = async () => {
    if (!isMicEnabled) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        transcribeInvocation(blob);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  // Sync state over P2P
  const broadcastPacket = useCallback((packet: NetworkPacket) => {
    if (connection && connection.open) {
      connection.send(packet);
    }
  }, [connection]);

  useEffect(() => { 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); setGlobalPlayCount(prev => prev + growth); 
    const interval = setInterval(() => { if (Math.random() > 0.4) { setGlobalPlayCount(prev => prev + 1); setIsCounterPulsing(true); setTimeout(() => setIsCounterPulsing(false), 2000); } }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeGame = useCallback((p1Config: { name: string, color: string }, p2Config: { name: string, color: string }, isTutorial = false) => {
    const newBoard = new Map<number, BoardShell>(); for (let i = 1; i <= TOTAL_SHELLS; i++) newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    setBoard(newBoard);
    const initialPlayers = generatePlayers(p1Config, p2Config);
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setPaRaCount(0); setExtraRolls(0); setIsOpeningPaRa(false); setLastMove(null); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null);
    addLog("New game started! ཤོ་འགོ་ཚུགས་སོང་།", 'info');
  }, [addLog]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); setBoardScale(Math.max(Math.min((width - 20) / 800, (height - 20) / 800, 1), 0.3)); } };
    window.addEventListener('resize', handleResize); handleResize(); return () => window.removeEventListener('resize', handleResize);
  }, [gameMode]);

  const handleSkipTurn = useCallback((isRemote = false) => {
    const s = gameStateRef.current;
    setPendingMoveValues([]);
    setIsOpeningPaRa(false);
    
    if (!isRemote && (gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST)) {
      broadcastPacket({ type: 'SKIP_REQ' });
    }

    if (s.extraRolls > 0) {
        setExtraRolls(prev => prev - 1);
        setPhase(GamePhase.ROLLING);
        addLog(`${players[turnIndex].name} used an extra roll!`, 'info');
    } else {
        setPhase(GamePhase.ROLLING);
        setTurnIndex((prev) => (prev + 1) % players.length);
        addLog(`${players[turnIndex].name} skipped their turn.`, 'info');
    }
  }, [players, turnIndex, addLog, gameMode, broadcastPacket]);

  const performRoll = async (forcedRoll?: DiceRoll) => {
    const s = gameStateRef.current; if (s.phase !== GamePhase.ROLLING) return;
    setIsRolling(true); SFX.playShake(); 
    
    // Start recording for sho bshad if it's our turn
    const isMe = (gameMode === GameMode.ONLINE_HOST && turnIndex === 0) || (gameMode === GameMode.ONLINE_GUEST && turnIndex === 1) || (gameMode !== GameMode.ONLINE_HOST && gameMode !== GameMode.ONLINE_GUEST && turnIndex === 0);
    if (isMe && !forcedRoll) startRecording();

    await new Promise(resolve => setTimeout(resolve, 800)); 
    
    let d1, d2;
    if (forcedRoll) {
        d1 = forcedRoll.die1;
        d2 = forcedRoll.die2;
    } else {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
    }

    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) { d1 = 2; d2 = 6; }
    
    const pos1 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d1x, y: forcedRoll.visuals.d1y, r: forcedRoll.visuals.d1r } : getRandomDicePos();
    let pos2 = forcedRoll?.visuals ? { x: forcedRoll.visuals.d2x, y: forcedRoll.visuals.d2y, r: forcedRoll.visuals.d2r } : getRandomDicePos();
    
    if (!forcedRoll) {
        let attempts = 0;
        while (Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2) < 45 && attempts < 15) {
            pos2 = getRandomDicePos();
            attempts++;
        }
    }

    const isPaRa = (d1 === 1 && d2 === 1), total = d1 + d2;
    const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals: { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r } };
    
    if (!forcedRoll && (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'ROLL_REQ', payload: newRoll });
    }

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

  const performMove = (sourceIdx: number, targetIdx: number, isRemote = false) => {
    const s = gameStateRef.current;
    const currentMovesList = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode, s.isOpeningPaRa);
    const move = currentMovesList.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    if (!move) return;

    if (!isRemote && (s.gameMode === GameMode.ONLINE_HOST || s.gameMode === GameMode.ONLINE_GUEST)) {
        broadcastPacket({ type: 'MOVE_REQ', payload: { sourceIdx, targetIdx } });
    }

    // Advance tutorial step 4 -> 5 after successful move
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 4) {
      setTutorialStep(5);
    }

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
            addLog(`${player.name} used an extra roll!`, 'info');
        } else {
            setPhase(GamePhase.ROLLING); 
            setTurnIndex((prev) => (prev + 1) % players.length);
        }
    } else {
        setPendingMoveValues(nextMoves);
    }
  };

  // P2P Media Stream Management
  const setupMediaCall = async (targetId: string, peerInstance: Peer) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const call = peerInstance.call(targetId, stream);
      handleCall(call);
    } catch (err) {
      console.warn("Could not access microphone for P2P audio:", err);
    }
  };

  const handleCall = (call: MediaConnection) => {
    setMediaCall(call);
    call.on('stream', (remoteStream) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
      }
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play();
      
      // Analyze remote voice activity
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(remoteStream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      const checkActivity = () => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setIsOpponentSpeaking(average > 30);
        requestAnimationFrame(checkActivity);
      };
      checkActivity();
    });
  };

  // PeerJS Online Setup Logic
  const startOnlineHost = () => {
    setOnlineLobbyStatus('WAITING');
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newPeer = new Peer(roomCode, {
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
    
    newPeer.on('open', (id) => setMyPeerId(id));
    newPeer.on('connection', (conn) => {
      setConnection(conn);
      setupPeerEvents(conn, true);
    });
    newPeer.on('call', (incomingCall) => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            localStreamRef.current = stream;
            incomingCall.answer(stream);
            handleCall(incomingCall);
        });
    });
    newPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') startOnlineHost();
      else { addLog("Network Error: " + err.type, 'alert'); setOnlineLobbyStatus('IDLE'); }
    });
    setPeer(newPeer);
  };

  const joinOnlineGame = (roomId: string) => {
    if (!roomId) return;
    setIsPeerConnecting(true);
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      const conn = newPeer.connect(roomId.toUpperCase().trim(), { reliable: true });
      conn.on('open', () => {
        setConnection(conn);
        setIsPeerConnecting(false);
        setupPeerEvents(conn, false);
        setupMediaCall(roomId.toUpperCase().trim(), newPeer);
      });
      conn.on('error', () => {
        addLog("Failed to join room. ནོར་འཛོལ།", 'alert');
        setIsPeerConnecting(false);
        newPeer.destroy();
      });
    });
    newPeer.on('call', (incomingCall) => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            localStreamRef.current = stream;
            incomingCall.answer(stream);
            handleCall(incomingCall);
        });
    });
    newPeer.on('error', () => setIsPeerConnecting(false));
    setPeer(newPeer);
  };

  const setupPeerEvents = (conn: DataConnection, isHost: boolean) => {
    if (!isHost) {
      conn.send({ type: 'SYNC', payload: { playerName, color: selectedColor } });
    }

    conn.on('data', (data: any) => {
      const packet = data as NetworkPacket;
      switch (packet.type) {
        case 'SYNC':
          if (packet.payload?.type === 'CHANT') {
            addLog(`Opponent Chanted: ${packet.payload.text}`, 'info');
            return;
          }
          if (isHost) {
            let guestColor = packet.payload.color;
            if (guestColor === selectedColor) {
               guestColor = COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6';
            }
            const guestInfo = { name: packet.payload.playerName, color: guestColor };
            const hostInfo = { name: playerName, color: selectedColor };
            setGameMode(GameMode.ONLINE_HOST);
            setOnlineLobbyStatus('CONNECTED');
            initializeGame(hostInfo, guestInfo);
            conn.send({ type: 'SYNC', payload: { hostInfo, guestInfo, isNinerMode } });
          } else {
            const { hostInfo, guestInfo, isNinerMode: serverNiner } = packet.payload;
            setIsNinerMode(serverNiner);
            setGameMode(GameMode.ONLINE_GUEST);
            setOnlineLobbyStatus('CONNECTED');
            initializeGame(hostInfo, guestInfo);
          }
          break;
        case 'ROLL_REQ': performRoll(packet.payload); break;
        case 'MOVE_REQ': performMove(packet.payload.sourceIdx, packet.payload.targetIdx, true); break;
        case 'SKIP_REQ': handleSkipTurn(true); break;
      }
    });

    conn.on('close', () => {
      addLog("Connection closed. མཐུད་ལམ་ཆད་སོང་།", 'alert');
      setOnlineLobbyStatus('IDLE');
      setGameMode(null);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    });
  };

  useEffect(() => { 
    return () => { 
        if (peer) peer.destroy(); 
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    }; 
  }, [peer]);

  // AI Strategic Loop (handles AI mode and Tutorial opponent)
  useEffect(() => {
    const s = gameStateRef.current;
    // Guide moves automatically in Tutorial once step 5 is reached
    const isTutorialOpponentTurn = s.gameMode === GameMode.TUTORIAL && s.turnIndex === 1 && s.tutorialStep >= 5;
    
    if ((s.gameMode === GameMode.AI || isTutorialOpponentTurn) && s.turnIndex === 1 && s.phase !== GamePhase.GAME_OVER && !s.isRolling) {
      const timer = setTimeout(() => {
        const currentS = gameStateRef.current;
        if (currentS.phase === GamePhase.ROLLING) performRoll();
        else if (currentS.phase === GamePhase.MOVING) {
          const aiMoves = getAvailableMoves(currentS.turnIndex, currentS.board, currentS.players, currentS.pendingMoveValues, currentS.isNinerMode, currentS.isOpeningPaRa);
          if (aiMoves.length > 0) {
            const scores = aiMoves.map(m => {
                let score = m.targetIndex * 10;
                if (m.type === MoveResultType.FINISH) score += 5000;
                if (m.type === MoveResultType.KILL) score += 3000;
                if (m.type === MoveResultType.STACK) score += 500;
                return { move: m, score };
            }).sort((a, b) => b.score - a.score);
            performMove(scores[0].move.sourceIndex, scores[0].move.targetIndex);
          } else handleSkipTurn();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, phase, gameMode, isRolling, paRaCount, extraRolls, board, pendingMoveValues, isNinerMode, players, handleSkipTurn, isOpeningPaRa]);

  const currentValidMovesList = phase === GamePhase.MOVING ? getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode, isOpeningPaRa) : [];
  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const shouldHighlightHand = phase === GamePhase.MOVING && (gameMode !== GameMode.AI || turnIndex === 0) && players[turnIndex].coinsInHand > 0;

  const isLocalTurn = (() => {
    if (gameMode === GameMode.ONLINE_HOST) return turnIndex === 0;
    if (gameMode === GameMode.ONLINE_GUEST) return turnIndex === 1;
    if (gameMode === GameMode.AI || gameMode === GameMode.TUTORIAL) return turnIndex === 0;
    return true;
  })();

  const toggleMic = async () => {
    if (!isMicEnabled) {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsMicEnabled(true);
        } catch (e) {
            addLog("Microphone access denied. ཤོ་བཤད་བེད་སྤྱོད་མི་ཐུབ།", 'alert');
        }
    } else {
        setIsMicEnabled(false);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col md:flex-row fixed inset-0 font-sans mobile-landscape-row overflow-hidden">
        {phase === GamePhase.SETUP && gameMode !== null && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-amber-500 font-cinzel">Initializing...</div>}
        {gameMode === GameMode.TUTORIAL && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes handBlockedShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
          .animate-hand-blocked { animation: handBlockedShake 0.4s ease-in-out; border-color: #ef4444 !important; background-color: rgba(127, 29, 29, 0.4) !important; }
          @keyframes turnIndicator { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; } 50% { transform: translateY(-8px) scale(1.4); opacity: 1; } }
          .animate-turn-indicator { animation: turnIndicator 1.5s ease-in-out infinite; }
          @keyframes activePulse { 0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); } 50% { box-shadow: 0 0 20px 2px rgba(245, 158, 11, 0.3); } }
          .animate-active-pulse { animation: activePulse 2s ease-in-out infinite; }
          @keyframes voiceActive { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 1; } }
          .voice-indicator { animation: voiceActive 0.6s ease-in-out infinite; }
        `}} />
        
        {!gameMode && (
          <div className="fixed inset-0 z-50 bg-[#0c0a09] text-amber-500 overflow-y-auto flex flex-col items-center justify-between p-6 py-12 md:py-24">
               <div className="flex flex-col items-center flex-shrink-0 w-full max-w-sm md:max-w-md">
                   <h1 className="flex items-center gap-6 mb-4 font-cinzel">
                      <span className="text-7xl md:text-9xl text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">ཤོ</span>
                      <span className="text-5xl md:text-7xl text-amber-500 tracking-widest drop-shadow-lg">Sho</span>
                   </h1>
                   <div className="h-px w-32 bg-amber-900/40 mb-4" />
                   <p className="text-stone-400 tracking-[0.3em] uppercase text-[12px] md:text-sm text-center font-bold">Traditional Tibetan Dice Game</p>
                   <p className="text-amber-600/60 text-lg md:text-xl font-serif mt-2">བོད་ཀྱི་སྲོལ་རྒྱུན་ཤོ་རྩེད།</p>
               </div>
               
               <div className="flex-grow flex flex-col items-center justify-center w-full max-w-md gap-4 md:gap-10">
                  <div className="w-full bg-stone-900/30 p-6 md:p-8 rounded-[3rem] border border-stone-800/50 backdrop-blur-2xl shadow-2xl">
                      <div className="mb-6">
                        <label className="text-stone-500 text-[10px] uppercase block mb-3 tracking-widest font-bold px-1">Identity ཁྱེད་ཀྱི་མིང་།</label>
                        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border-b-2 border-stone-800 focus:border-amber-600 p-3 md:p-4 text-stone-100 outline-none text-center text-xl md:text-2xl font-cinzel tracking-wider" maxLength={15} />
                      </div>
                      <div>
                        <label className="text-stone-500 text-[10px] uppercase block mb-4 tracking-widest font-bold px-1">Banner ཚོས་གཞི་དོམ།</label>
                        <div className="flex justify-between px-2 gap-2">
                          {COLOR_PALETTE.map((c) => ( 
                            <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-8 h-8 md:w-10 md:h-10 rounded-xl transition-all rotate-45 ${selectedColor === c.hex ? 'border-2 border-white scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} /> 
                          ))}
                        </div>
                      </div>
                  </div>

                  {onlineLobbyStatus === 'IDLE' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 w-full px-2">
                        <button className="bg-stone-900/40 border-2 border-stone-800/80 p-6 rounded-[2rem] hover:border-amber-600/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.LOCAL); initializeGame({name: playerName, color: selectedColor}, {name: 'Opponent', color: COLOR_PALETTE[1].hex}); }}>
                            <span className="text-2xl">🏔️</span>
                            <h3 className="text-sm md:text-xl font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">Local</h3>
                            <span className="text-[8px] md:text-[10px] text-stone-500 font-serif leading-none">རང་ཤག་ཏུ་་རྩེ།</span>
                        </button>
                        <button className="bg-stone-900/40 border-2 border-stone-800/80 p-6 rounded-[2rem] hover:border-amber-600/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => { setGameMode(GameMode.AI); initializeGame({name: playerName, color: selectedColor}, {name: 'Sho Bot', color: '#999'}); }}>
                            <span className="text-2xl">🤖</span>
                            <h3 className="text-sm md:text-xl font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">AI</h3>
                            <span className="text-[8px] md:text-[10px] text-stone-500 font-serif leading-none">མི་བཟོས་རིག་ནུས་དང་མཉམ་དུ་རྩེ།</span>
                        </button>
                        <button className="col-span-2 md:col-span-1 bg-amber-900/20 border-2 border-amber-800/40 p-6 rounded-[2rem] hover:border-amber-500/80 transition-all active:scale-95 flex flex-col items-center justify-center gap-2" onClick={() => setOnlineLobbyStatus('WAITING')}>
                            <span className="text-2xl">🌐</span>
                            <h3 className="text-sm md:text-xl font-bold uppercase font-cinzel tracking-widest text-amber-100 leading-none">Online</h3>
                            <span className="text-[8px] md:text-[10px] text-stone-500 font-serif leading-none">དྲ་ཐོག་རྩེ།</span>
                        </button>
                    </div>
                  ) : (
                    <div className="w-full bg-stone-900/50 border-2 border-amber-700/50 p-8 rounded-[3rem] animate-in fade-in zoom-in duration-300">
                        {onlineLobbyStatus === 'WAITING' && (
                          <div className="flex flex-col items-center gap-6">
                             <div className="text-center">
                                <h3 className="text-xl font-cinzel mb-2">Host Online Room དྲ་ཐོག་ཁང་མིག་བཟོས།</h3>
                                <p className="text-stone-400 text-xs font-serif">Share this code with your opponent. གཤམ་གྱི་ཨང་གྲངས་དེ་ཁ་གཏད་ལ་གཏོང་།</p>
                             </div>
                             <div className="flex flex-col gap-4 w-full">
                                <button className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors shadow-lg" onClick={() => { if(!myPeerId) startOnlineHost(); else navigator.clipboard.writeText(myPeerId); }}>
                                    {myPeerId ? `ROOM CODE: ${myPeerId} 📋` : 'Generate Room Code ཁང་མིག་ཨང་གྲངས་སྐྲུན།'}
                                </button>
                                <div className="h-px w-full bg-stone-800" />
                                <div className="flex flex-col gap-2">
                                  <input type="text" placeholder="ENTER ROOM CODE ཁང་མིག་ཨང་གྲངས་བྲིས།" value={targetPeerId} onChange={(e) => setTargetPeerId(e.target.value.toUpperCase())} className="bg-black/40 border border-stone-800 p-4 rounded-xl text-center font-cinzel text-lg outline-none focus:border-amber-600" />
                                  <button className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${targetPeerId.length >= 4 ? 'bg-amber-600 text-white shadow-lg' : 'bg-stone-800 text-stone-500'}`} disabled={targetPeerId.length < 4 || isPeerConnecting} onClick={() => joinOnlineGame(targetPeerId)}>
                                      {isPeerConnecting ? 'Connecting... མཐུད་ཀྱིན་ཡོད།' : 'Join Room ཁང་པའི་ནང་མཉམ་དུ་འཛོམས།'}
                                  </button>
                                </div>
                             </div>
                             <button className="text-stone-500 hover:text-white uppercase text-[10px] tracking-widest font-bold" onClick={() => { if(peer) peer.destroy(); setOnlineLobbyStatus('IDLE'); }}>Cancel རྩིས་མེད་གཏོང་།</button>
                          </div>
                        )}
                    </div>
                  )}
               </div>

               <div className="w-full flex flex-col items-center gap-10 mt-10">
                  <div className="flex flex-col items-center gap-4">
                      {deferredPrompt && (
                        <button onClick={handleInstallClick} className="bg-amber-100 text-stone-900 px-6 py-2 rounded-full font-bold uppercase text-[11px] tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-bounce mb-2">
                            Install App རྩེད་མོ་འཇོག་པ།
                        </button>
                      )}
                      <div className="flex gap-16">
                          <button onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame({name: playerName, color: selectedColor}, {name: 'Guide', color: '#999'}, true); }} className="text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors">
                              <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel">Tutorial</span>
                              <span className="text-[10px] font-serif mt-1 opacity-60">རྩེ་སྟངས་མྱུར་ཁྲིད།</span>
                          </button>
                          <button onClick={() => setShowRules(true)} className="text-stone-500 hover:text-amber-500 flex flex-col items-center group transition-colors">
                              <span className="font-bold uppercase text-[11px] tracking-widest font-cinzel">Rules</span>
                              <span className="text-[10px] font-serif mt-1 opacity-60">ཤོའི་་སྒྲིག་གཞི།</span>
                          </button>
                      </div>
                  </div>
                  <div className="flex flex-col items-center">
                      <span className="text-stone-600 text-[10px] uppercase tracking-[0.4em] font-bold">Games Commenced</span>
                      <span className="text-stone-600 text-[9px] font-serif uppercase tracking-widest mt-0.5">འཛམ་གླིང་ཁྱོན་ཡོངས་སུ་རྩེད་གྲངས།</span>
                      <span className={`text-amber-700/80 font-bold text-4xl tabular-nums transition-all duration-700 mt-2 ${isCounterPulsing ? 'scale-110 text-amber-500 brightness-125' : ''}`}>
                        {globalPlayCount.toLocaleString()}
                      </span>
                  </div>
               </div>
          </div>
        )}

        {gameMode && (
            <>
                <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[45dvh] md:h-full order-1 overflow-hidden flex-shrink-0 mobile-landscape-sidebar">
                    <div className="p-1.5 md:p-4 flex flex-col gap-0 md:gap-3 flex-shrink-0 bg-stone-950 mobile-landscape-compact-stats">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-1 md:pb-4">
                            <div className="flex items-center gap-1 cursor-pointer" onClick={() => { if (peer) peer.destroy(); setGameMode(null); setOnlineLobbyStatus('IDLE'); }}>
                                <h1 className="text-amber-500 text-sm md:text-2xl font-cinzel">ཤོ Sho</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={toggleMic} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isMicEnabled ? 'bg-amber-600 border-amber-400 text-white' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                                    {isMicEnabled ? '🎙️' : '🔇'}
                                </button>
                                {(gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST) && (
                                    <div className="flex items-center gap-1.5 bg-green-950/40 border border-green-700/50 px-2 py-0.5 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[8px] uppercase font-bold text-green-400">Online དྲ་ཐོག</span>
                                    </div>
                                )}
                                <button onClick={() => setShowRules(true)} className="w-5 h-5 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 flex items-center justify-center text-[10px] md:text-xs">?</button>
                            </div>
                        </header>
                        
                        <div className="grid grid-cols-2 gap-1 md:gap-2 mt-4 md:mt-8 relative px-1">
                            {players.map((p, i) => {
                                const isActive = turnIndex === i;
                                const isMe = (gameMode === GameMode.ONLINE_HOST && i === 0) || (gameMode === GameMode.ONLINE_GUEST && i === 1) || (gameMode !== GameMode.ONLINE_HOST && gameMode !== GameMode.ONLINE_GUEST && i === 0);
                                const isSpeaking = isMe ? isMicEnabled : isOpponentSpeaking;
                                return (
                                    <div key={p.id} className={`relative p-1.5 md:p-3 rounded-xl border transition-all duration-300 ${isActive ? 'bg-stone-800 border-amber-500/50 scale-[1.05] z-10 animate-active-pulse shadow-xl' : 'border-stone-800 opacity-50'}`}>
                                        {isActive && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-turn-indicator z-20">
                                                 <div className="w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,1)] border border-white/20" />
                                                 <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 mt-[-2px]" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 mb-1.5 relative">
                                            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: p.colorHex }}></div>
                                            <h3 className={`font-bold truncate text-[9px] md:text-[11px] font-serif ${isActive ? 'brightness-125' : ''}`} style={{ color: p.colorHex }}>{p.name}</h3>
                                            {isSpeaking && (
                                                <div className="absolute -right-1 -top-1 w-2 h-2 bg-amber-500 rounded-full voice-indicator" />
                                            )}
                                        </div>
                                        <div className="flex justify-between text-[11px] md:text-[14px] text-stone-100 font-bold font-cinzel">
                                            <div className="flex flex-col"><span className="text-[7px] text-stone-500">Hand ལག་པ།</span><span>{p.coinsInHand}</span></div>
                                            <div className="flex flex-col items-end"><span className="text-[7px] text-stone-500">Done ཕུད་གྲངས།</span><span className="text-amber-500">{p.coinsFinished}</span></div>
                                        </div>
                                        {isActive && (
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-600 px-1.5 py-0.5 rounded-md shadow-lg border border-amber-400/30 whitespace-nowrap">
                                                <span className="text-[7px] md:text-[9px] text-white font-bold uppercase tracking-[0.1em]">{isMe ? "YOUR TURN ཁྱེད་ཀྱི་རེ་མོས" : "WAITING... སྒུག་བཞིན་ཡོད།"}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="px-2 md:px-4 pb-1 flex flex-col gap-1 flex-shrink-0 bg-stone-950">
                        {phase === GamePhase.GAME_OVER ? ( 
                            <div className="text-center p-2 md:p-4 bg-stone-800 rounded-xl border border-amber-500 animate-pulse">
                                <h2 className="text-base md:text-xl text-amber-400 font-cinzel">Victory རྒྱལ་ཁ།</h2>
                                <button onClick={() => { if(peer) peer.destroy(); setGameMode(null); setOnlineLobbyStatus('IDLE'); }} className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold uppercase text-[8px] md:text-[10px] mt-1">Exit Game ཕྱིར་དོན།</button>
                            </div> 
                        ) : ( 
                            <div className="flex flex-col gap-1">
                                <DiceArea currentRoll={lastRoll} onRoll={() => performRoll()} canRoll={(phase === GamePhase.ROLLING) && !isRolling && isLocalTurn} pendingValues={pendingMoveValues} waitingForPaRa={paRaCount > 0} paRaCount={paRaCount} extraRolls={extraRolls} flexiblePool={null} />
                                <div className="flex gap-1">
                                    <div onClick={() => { 
                                        if (phase === GamePhase.MOVING && isLocalTurn) { 
                                          if (players[turnIndex].coinsInHand > 0) {
                                            setSelectedSourceIndex(0);
                                            // Advance Step 3 to 4 in Tutorial
                                            if (gameMode === GameMode.TUTORIAL && tutorialStep === 3) {
                                              setTutorialStep(4);
                                            }
                                          } else { 
                                            SFX.playBlocked(); 
                                            setHandShake(true); 
                                            setTimeout(() => setHandShake(false), 400); 
                                          } 
                                        } 
                                      }} className={`flex-1 p-2 md:p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${handShake ? 'animate-hand-blocked' : selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/40 shadow-inner scale-95' : (shouldHighlightHand && isLocalTurn) ? 'border-amber-500/80 bg-amber-900/10 animate-pulse' : 'border-stone-800 bg-stone-900/50'} ${!isLocalTurn ? 'opacity-30 grayscale' : ''}`}>
                                        <span className={`font-bold uppercase font-cinzel text-[11px] md:text-lg ${(shouldHighlightHand && isLocalTurn) ? 'text-amber-400' : ''}`}>From Hand</span>
                                        <span className="text-[11px] md:text-[16px] text-stone-200 font-serif mt-1 font-bold">({players[turnIndex].coinsInHand}) ལག་ཁྱི་བཙུགས།</span>
                                    </div>
                                    {currentValidMovesList.length === 0 && phase === GamePhase.MOVING && !isRolling && paRaCount === 0 && isLocalTurn && ( 
                                        <button onClick={() => handleSkipTurn()} className="flex-1 bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 p-1 rounded-xl font-bold flex flex-col items-center justify-center font-cinzel">
                                            <span className="text-[9px] md:text-[11px]">Skip</span>
                                            <span className="text-[11px] md:text-[14px] font-serif">སྐྱུར།</span>
                                        </button> 
                                    )}
                                </div>
                                {!isLocalTurn && (
                                    <div className="text-center py-2 animate-pulse"><span className="text-amber-600 text-[10px] uppercase font-bold">Opponent's Move... ཁ་གཏད་ཀྱི་རེ་མོས།</span></div>
                                )}
                            </div> 
                        )}
                    </div>
                    
                    <div className="flex-grow flex flex-col gap-1 p-2 bg-stone-900 overflow-y-auto no-scrollbar mobile-landscape-hide-logs">
                        {logs.map((log) => (
                            <div key={log.id} className={`text-[9px] md:text-[10px] p-2 rounded border border-stone-800/50 transition-all ${log.type === 'alert' ? 'bg-red-950/30 text-red-400 border-red-900/30' : log.type === 'action' ? 'bg-amber-950/30 text-amber-300 border-amber-900/30' : 'bg-stone-800/30 text-stone-400'}`}>
                                <span className="font-serif leading-tight">{log.message}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-2 md:p-6 bg-stone-950 flex-shrink-0 text-center opacity-40 mt-auto">
                         <span className="font-serif text-[10px] md:text-xs text-stone-500 tracking-widest">བོད་ཀྱི་སྲོལ་རྒྱུན་ཤོ་རྩེད། Traditional Sho</span>
                    </div>
                </div>
                
                <div className="flex-grow relative bg-[#1a1715] flex items-center justify-center overflow-hidden order-2 h-[55dvh] md:h-full mobile-landscape-board" ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(m) => { if (isLocalTurn) performMove(m.sourceIndex, m.targetIndex); }} 
                            currentPlayer={players[turnIndex].id} turnPhase={phase} onShellClick={(i) => { if (isLocalTurn) { board.get(i)?.owner === players[turnIndex].id ? setSelectedSourceIndex(i) : setSelectedSourceIndex(null) } }} 
                            selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} isNinerMode={isNinerMode} 
                            onInvalidMoveAttempt={(src, target) => {
                                const shell = board.get(target);
                                const myId = players[turnIndex].id;
                                if (src === 0 && shell && shell.owner && shell.owner !== myId && shell.stackSize >= 2) {
                                    SFX.playHandBlocked();
                                } else {
                                    SFX.playBlocked();
                                }
                            }} 
                        />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;