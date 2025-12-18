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

// --- Helpers for Serialization ---
const serializeBoard = (board: BoardState): any[] => {
  return Array.from(board.entries());
};

const deserializeBoard = (data: any[]): BoardState => {
  return new Map(data);
};

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

// --- Procedural Sound Effects & Ambient Music Manager ---
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

    const playPulse = () => {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.5);
    };

    const pentatonic = [440, 493.88, 587.33, 659.25, 783.99];
    const playMelody = () => {
        const t = ctx.currentTime;
        const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 4);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(t);
        osc.stop(t + 4);
    };

    SFX.musicIntervals.push(window.setInterval(playPulse, 4000));
    SFX.musicIntervals.push(window.setInterval(() => {
        if (Math.random() > 0.4) playMelody();
    }, 6000));
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

  playStack: () => {
    SFX.playCoinClick(0, 1.0);
    SFX.playCoinClick(0.08, 1.1); 
  },

  playKill: () => {
     const ctx = SFX.getContext();
     const t = ctx.currentTime;
     const osc = ctx.createOscillator();
     osc.type = 'triangle';
     osc.frequency.setValueAtTime(80, t);
     osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
     const gain = ctx.createGain();
     gain.gain.setValueAtTime(0.5, t);
     gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
     osc.connect(gain);
     gain.connect(ctx.destination);
     osc.start(t);
     osc.stop(t + 0.4);
     SFX.playCoinClick(0, 0.8);
     SFX.playCoinClick(0.1, 0.9);
     SFX.playCoinClick(0.25, 0.85);
  },

  playFinish: () => {
      SFX.playCoinClick(0, 1.2);
      SFX.playCoinClick(0.1, 1.5);
      SFX.playCoinClick(0.2, 2.0);
  },

  playBounce: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
  },

  playHandBlocked: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      [0, 0.12].forEach(offset => {
          const osc = ctx.createOscillator();
          osc.type = 'square'; 
          osc.frequency.setValueAtTime(450, t + offset); 
          osc.frequency.exponentialRampToValueAtTime(100, t + offset + 0.08); 
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.5, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.1);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, t + offset);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.12);
      });
  },

  playPaRa: () => {
      const ctx = SFX.getContext();
      const t = ctx.currentTime;
      [880, 1108, 1318].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.1, t + 0.05 + (i * 0.05)); 
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5); 
          const vib = ctx.createOscillator();
          vib.frequency.value = 4 + (i * 1.5);
          const vibGain = ctx.createGain();
          vibGain.gain.value = 5;
          vib.connect(vibGain);
          vibGain.connect(osc.frequency);
          vib.start(t);
          vib.stop(t + 1.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 1.5);
      });
      const sweepOsc = ctx.createOscillator();
      sweepOsc.type = 'triangle';
      sweepOsc.frequency.setValueAtTime(2000, t);
      sweepOsc.frequency.linearRampToValueAtTime(4000, t + 0.5);
      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(0.05, t);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepOsc.start(t);
      sweepOsc.stop(t + 0.5);
  }
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
                alert("Could not access camera.");
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
                <h3 className="text-amber-500 font-cinzel text-xl mb-4">Capture Profile Photo</h3>
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-amber-600 shadow-2xl mb-6 bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <canvas ref={canvasRef} width={300} height={300} className="hidden" />
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-stone-800 text-stone-400 font-bold">Cancel</button>
                    <button onClick={capture} className="px-6 py-2 rounded-lg bg-amber-600 text-white font-bold shadow-lg shadow-amber-900/40">Snap!</button>
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

  const currentPlayer: Player = players[turnIndex] || { 
    id: PlayerColor.Red, 
    name: 'Red', 
    coinsInHand: 0, 
    coinsFinished: 0, 
    colorHex: COLOR_PALETTE[0].hex 
  };

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => { setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50)); }, []);

  const speak = (text: string) => { 
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text); 
        u.rate = 1.1; 
        u.pitch = 0.9; 
        window.speechSynthesis.speak(u); 
    }
  };

  useEffect(() => { 
    const baseCount = 18742; 
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15)); 
    const local = parseInt(localStorage.getItem('sho_plays_local') || '0', 10); 
    setGlobalPlayCount(baseCount + growth + local); 
    
    // Live Counter Simulation
    const interval = setInterval(() => {
        if (Math.random() > 0.4) {
            const increment = Math.random() > 0.8 ? 2 : 1;
            setGlobalPlayCount(prev => prev + increment);
            setIsCounterPulsing(true);
            setTimeout(() => setIsCounterPulsing(false), 2000);
        }
    }, 55000 + Math.random() * 45000);
    
    return () => clearInterval(interval);
  }, []);

  const trackGameStart = () => { 
    const newLocal = parseInt(localStorage.getItem('sho_plays_local') || '0', 10) + 1; 
    localStorage.setItem('sho_plays_local', newLocal.toString()); 
    setGlobalPlayCount(prev => prev + 1); 
    setIsCounterPulsing(true);
    setTimeout(() => setIsCounterPulsing(false), 1000);
  };

  const toggleMusic = () => { const newState = !isMusicEnabled; setIsMusicEnabled(newState); if (newState) { SFX.startAmbient(musicVolume / 100); } else { SFX.stopAmbient(); } };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => { const vol = parseInt(e.target.value); setMusicVolume(vol); SFX.setMusicVolume(vol / 100); };

  const initializeGame = useCallback((p2Config?: { name: string, color: string, avatar?: string }, isTutorial = false) => {
    if (!isTutorial) trackGameStart();
    const newBoard = new Map<number, BoardShell>();
    for (let i = 1; i <= TOTAL_SHELLS; i++) { newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false }); }
    setBoard(newBoard);
    const mySettings = { name: playerName || 'Host', color: selectedColor, avatar: selectedAvatar };
    let opponentSettings = p2Config || { name: 'Player 2', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: AVATAR_PRESETS[1] };
    if (p2Config && p2Config.color === mySettings.color) { const alternativeColor = COLOR_PALETTE.find(c => c.hex !== mySettings.color)?.hex || '#3b82f6'; opponentSettings = { ...p2Config, color: alternativeColor }; addLog(`Color conflict resolved.`, 'info'); }
    if ((gameMode === GameMode.AI || isTutorial) && !p2Config) { opponentSettings = { name: 'Opponent', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: '🤖' }; }
    const initialPlayers = generatePlayers(mySettings, opponentSettings);
    setPlayers(initialPlayers); setTurnIndex(0); setPhase(GamePhase.ROLLING); setLastRoll(null); setIsRolling(false); setPendingMoveValues([]); setWaitingForPaRa(false); setLastMove(null); setTotalMoves(0); setAiThinking(false); setTutorialStep(isTutorial ? 1 : 0); setSelectedSourceIndex(null); addLog(isTutorial ? 'Tutorial Started.' : `Game Started.`, 'info');
  }, [addLog, playerName, selectedColor, selectedAvatar, gameMode]);

  useEffect(() => {
    const handleResize = () => { if (boardContainerRef.current) { const { width, height } = boardContainerRef.current.getBoundingClientRect(); const margin = 20; const availableW = width - margin; const availableH = height - margin; const scale = Math.min(availableW / 800, availableH / 800, 1); setBoardScale(scale > 0.3 ? scale : 0.3); } };
    window.addEventListener('resize', handleResize); handleResize(); const t = setTimeout(handleResize, 100); return () => { window.removeEventListener('resize', handleResize); clearTimeout(t); };
  }, [gameMode, phase]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onloadend = () => setSelectedAvatar(reader.result as string); 
          reader.readAsDataURL(file); 
      } 
  };

  const performRoll = async () => {
    const s = gameStateRef.current; if (s.phase !== GamePhase.ROLLING && !s.waitingForPaRa) return;
    setIsRolling(true); 
    SFX.playShake(); 
    
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    
    const currentPlayerName = s.players[s.turnIndex]?.name || "Player";
    let d1 = Math.floor(Math.random() * 6) + 1; let d2 = Math.floor(Math.random() * 6) + 1;
    if (s.gameMode === GameMode.TUTORIAL) { if (s.tutorialStep === 2) { d1 = 2; d2 = 3; } else if (s.turnIndex === 1) { d1 = 3; d2 = 3; } }
    const isPaRa = (d1 === 1 && d2 === 1);
    
    const pos1 = getRandomDicePos(); 
    let pos2 = getRandomDicePos();
    let attempts = 0;
    while (attempts < 15 && Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)) < 65) {
        pos2 = getRandomDicePos();
        attempts++;
    }
    
    const visuals = { d1x: pos1.x, d1y: pos1.y, d1r: pos1.r, d2x: pos2.x, d2y: pos2.y, d2r: pos2.r };
    const total = d1 + d2; const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals };
    
    setLastRoll(newRoll); 
    setIsRolling(false); 
    SFX.playLand();
    
    if (isPaRa) { 
        SFX.playPaRa(); 
        setWaitingForPaRa(true); 
        addLog(`PA RA (1,1)! Roll again for bonus moves.`, 'alert'); 
    } 
    else { 
        if (s.waitingForPaRa) { 
            const newMoveValues = [2, total];
            setPendingMoveValues(newMoveValues);
            addLog(`Pa Ra Bonus complete: moves of 2 and ${total} granted.`, 'alert'); 
            setWaitingForPaRa(false); 
            setPhase(GamePhase.MOVING); 
        } else { 
            addLog(`${currentPlayerName} rolled ${total}.`, 'info'); 
            setPendingMoveValues([total]); 
            setPhase(GamePhase.MOVING); 
        } 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) setTutorialStep(3);
  };

  const handleSkipTurn = useCallback(() => { const s = gameStateRef.current; addLog(`Turn skipped.`, 'alert'); SFX.playHandBlocked(); setPendingMoveValues([]); setLastRoll(null); setPhase(GamePhase.ROLLING); setSelectedSourceIndex(null); setTurnIndex((prev) => (prev + 1) % s.players.length); }, [addLog]);

  const handleInvalidMoveAttempt = (sourceIdx: number, targetIdx: number) => {
      const s = gameStateRef.current;
      if (s.phase !== GamePhase.MOVING) return;
      const targetShell = s.board.get(targetIdx);
      const player = s.players[s.turnIndex];
      if (!player) return;
      let movingStackSize = sourceIdx === 0 ? (player.coinsInHand === COINS_PER_PLAYER ? 2 : 1) : (s.board.get(sourceIdx)?.stackSize || 0);

      if (targetShell?.owner && targetShell.owner !== player.id) {
          if (targetShell.stackSize > movingStackSize) {
              SFX.playBounce();
              addLog(`Blocked! Enemy stack is too big.`, 'alert');
              speak("Too large.");
          }
      } else if (targetShell?.owner === player.id) {
          if (!s.isNinerMode && targetShell.stackSize + movingStackSize === 9) {
              SFX.playBounce();
              addLog("Forbidden! 9 stack limit.", 'alert');
              speak("Forbidden.");
          }
      }
  };

  const performMove = (sourceIdx: number, targetIdx: number) => {
    const s = gameStateRef.current;
    const validMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.isNinerMode);
    const move = validMoves.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    if (!move) return;
    if (move.type === MoveResultType.KILL) SFX.playKill(); else if (move.type === MoveResultType.STACK) SFX.playStack(); else if (move.type === MoveResultType.FINISH) SFX.playFinish(); else SFX.playCoinClick();
    const nb: BoardState = new Map(s.board); const player = s.players[s.turnIndex]; let bonusTurn = false; let turnContinues = false; let movingStackSize = 0; const newPlayers = [...s.players];
    
    if (move.sourceIndex === 0) { 
        const isOpeningMove = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER; 
        if (isOpeningMove) { movingStackSize = 2; newPlayers[s.turnIndex].coinsInHand -= 2; addLog(`Opening Move!`, "action"); } 
        else { movingStackSize = 1; newPlayers[s.turnIndex].coinsInHand -= 1; } 
        setPlayers(newPlayers); 
    } 
    else { 
        const sourceShell = nb.get(move.sourceIndex) as BoardShell; 
        movingStackSize = sourceShell.stackSize; 
        nb.set(move.sourceIndex, { ...sourceShell, stackSize: 0, owner: null, isShoMo: false }); 
    }

    const targetShell = nb.get(move.targetIndex) as BoardShell; 
    let isShoMoKill = false;
    if (move.type === MoveResultType.FINISH) { 
        newPlayers[turnIndex].coinsFinished += movingStackSize; 
        setPlayers(newPlayers); 
        addLog(`Coin finished!`, 'action'); 
    } 
    else {
      if (move.type === MoveResultType.KILL) {
        const enemyId = targetShell.owner; const enemyStack = targetShell.stackSize; const enemyIdx = players.findIndex(p => p.id === enemyId);
        if (targetShell.isShoMo) { isShoMoKill = true; if (movingStackSize < 3) { const needed = 3 - movingStackSize; if (newPlayers[s.turnIndex].coinsInHand >= needed) { newPlayers[s.turnIndex].coinsInHand -= needed; movingStackSize = 3; addLog(`Killed Sho-mo bonus!`, 'action'); } } }
        if (enemyIdx !== -1) { 
            newPlayers[enemyIdx].coinsInHand += enemyStack; 
            setPlayers(newPlayers); 
            if (!isShoMoKill) addLog(`Killed ${enemyStack} coins!`, 'alert'); 
        }
        nb.set(move.targetIndex, { ...targetShell, stackSize: movingStackSize, owner: player.id, isShoMo: false }); bonusTurn = true;
      } else if (move.type === MoveResultType.STACK) { 
          nb.set(move.targetIndex, { ...targetShell, stackSize: targetShell.stackSize + movingStackSize, owner: player.id, isShoMo: false }); 
          addLog(`Stacked.`, 'action'); bonusTurn = true; 
      } 
      else { 
          const isShoMoCreation = (move.sourceIndex === 0 && movingStackSize === 2 && !isShoMoKill); 
          nb.set(move.targetIndex, { ...targetShell, stackSize: movingStackSize, owner: player.id, isShoMo: isShoMoCreation }); 
      }
    }
    setBoard(nb); setSelectedSourceIndex(null); setLastMove({ ...move, id: Date.now() }); setTotalMoves(prev => prev + 1);
    
    let nextPendingMoves: number[] = [...s.pendingMoveValues];
    let refundAmount = 0;
    if (move.type === MoveResultType.FINISH) { 
        const distToFinish = TOTAL_SHELLS + 1 - move.sourceIndex; 
        const valueUsed = move.consumedValues.reduce((a, b) => a + b, 0); 
        if (valueUsed > distToFinish) refundAmount = valueUsed - distToFinish; 
    }
    for (const val of move.consumedValues) { const idx = nextPendingMoves.indexOf(val); if (idx > -1) nextPendingMoves.splice(idx, 1); }
    if (refundAmount > 0) nextPendingMoves.push(refundAmount); 
    
    if (nextPendingMoves.length > 0) { 
        const movesForRemainder = getAvailableMoves(s.turnIndex, nb, newPlayers, nextPendingMoves, s.isNinerMode); 
        if (movesForRemainder.length > 0) { 
            setPendingMoveValues(nextPendingMoves); 
            setPhase(GamePhase.MOVING); 
            turnContinues = true;
        } else { 
            addLog(`Remainder lost.`, 'info'); 
            turnContinues = false; 
        } 
    }

    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) { setPhase(GamePhase.GAME_OVER); return; }
    if (!turnContinues) { 
        if (bonusTurn) { 
            addLog("Bonus roll!", 'action'); 
            setPhase(GamePhase.ROLLING); 
            setPendingMoveValues([]); 
        } else { 
            setPendingMoveValues([]); 
            setLastRoll(null); 
            setWaitingForPaRa(false); 
            setPhase(GamePhase.ROLLING); 
            setTurnIndex((prev) => (prev + 1) % players.length); 
        } 
    }
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 4) setTutorialStep(5);
  };

  useEffect(() => {
    const isAI = gameMode === GameMode.AI; const isTutorial = gameMode === GameMode.TUTORIAL;
    if ((isAI || isTutorial) && turnIndex === 1 && !aiThinking) {
        const runAITurn = async () => {
            setAiThinking(true);
            try {
                if (phase === GamePhase.ROLLING) { await new Promise(r => setTimeout(r, 1000)); performRoll(); }
                else if (phase === GamePhase.MOVING) {
                    await new Promise(r => setTimeout(r, 1500));
                    const validMoves = getAvailableMoves(1, board, players, pendingMoveValues, gameStateRef.current.isNinerMode);
                    if (validMoves.length === 0) { setAiThinking(false); return; }
                    let chosenMove = validMoves[0];
                    if (isTutorial) chosenMove = validMoves[0]; else if (process.env.API_KEY) {
                        try {
                            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const myId = players[1].id; const oppId = players[0].id; const myStacks = []; const oppStacks = [];
                            for (const [pos, shell] of board.entries()) { if (shell.owner === myId) myStacks.push({ pos, size: shell.stackSize }); if (shell.owner === oppId) oppStacks.push({ pos, size: shell.stackSize }); }
                            const prompt = `Play Sho. You are Player 2 (Sapphire/Blue). Objective: Finish 9 coins. Board State: - My Stacks: ${JSON.stringify(myStacks)} - Enemy Stacks: ${JSON.stringify(oppStacks)} - Coins in Hand: ${players[1].coinsInHand} Valid Moves: ${JSON.stringify(validMoves.map((m, i) => ({index: i, type: m.type, source: m.sourceIndex, target: m.targetIndex})))} Return JSON {index: number, reason: string}`;
                            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json" } });
                            const aiDecision = JSON.parse(response.text); if (validMoves[aiDecision.index]) { chosenMove = validMoves[aiDecision.index]; }
                        } catch (err) { 
                             let bestScore = -Infinity; validMoves.forEach(m => { let score = 0; if (m.type === MoveResultType.FINISH) score += 2000; if (m.type === MoveResultType.KILL) score += 500; score += m.targetIndex; if (score > bestScore) { bestScore = score; chosenMove = m; } });
                        }
                    } else {
                        let bestScore = -Infinity; validMoves.forEach(m => { let score = 0; if (m.type === MoveResultType.FINISH) score += 2000; if (m.type === MoveResultType.KILL) score += 500; score += m.targetIndex; if (score > bestScore) { bestScore = score; chosenMove = m; } });
                    }
                    performMove(chosenMove.sourceIndex, chosenMove.targetIndex); if (isTutorial && tutorialStep === 5) setTimeout(() => setTutorialStep(6), 1000);
                }
            } catch (e) { } finally { setAiThinking(false); }
        };
        runAITurn();
    }
  }, [turnIndex, phase, gameMode, waitingForPaRa, pendingMoveValues, players, board, aiThinking, performRoll, performMove, tutorialStep]);

  useEffect(() => { const s = gameStateRef.current; if (phase === GamePhase.MOVING && !isRolling && !waitingForPaRa) { const moves = getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode); if (moves.length === 0) { const isAIPlayer = gameMode === GameMode.AI && turnIndex === 1; const isTutorialOpponent = gameMode === GameMode.TUTORIAL && turnIndex === 1; if (isAIPlayer || isTutorialOpponent) { setTimeout(() => handleSkipTurn(), 2000); } } } }, [phase, isRolling, waitingForPaRa, pendingMoveValues, turnIndex, board, players, isNinerMode, gameMode, handleSkipTurn]);

  const requestRoll = () => { performRoll(); };
  const requestMove = (s: number, t: number) => { performMove(s, t); };
  const requestSkip = () => { handleSkipTurn(); };

  const canInteract = () => { 
    if (gameMode === GameMode.AI || gameMode === GameMode.TUTORIAL) return turnIndex === 0 && !isRolling; 
    return !isRolling; 
  };

  const currentValidMovesList = useCallback(() => { 
    if (phase !== GamePhase.MOVING || players.length === 0) return []; 
    return getAvailableMoves(turnIndex, board, players, pendingMoveValues, isNinerMode); 
  }, [phase, players, turnIndex, board, pendingMoveValues, isNinerMode])();

  const visualizedMoves = selectedSourceIndex !== null ? currentValidMovesList.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const winner = players.find(p => p.coinsFinished >= COINS_PER_PLAYER);
  const showLobby = !gameMode;
  const showGame = gameMode === GameMode.LOCAL || gameMode === GameMode.AI || gameMode === GameMode.TUTORIAL;
  const showSkipButton = canInteract() && phase === GamePhase.MOVING && !isRolling && !waitingForPaRa && currentValidMovesList.length === 0;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row overflow-hidden font-sans fixed inset-0">
        {(gameMode === GameMode.TUTORIAL || tutorialStep > 0) && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => { setGameMode(null); setTutorialStep(0); }} />}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} isNinerMode={isNinerMode} onToggleNinerMode={() => setIsNinerMode(prev => !prev)} />
        {showCamera && <CameraModal onCapture={(data) => setSelectedAvatar(data)} onClose={() => setShowCamera(false)} />}

        {showLobby && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 font-serif overflow-y-auto">
             <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-8">
               <div className="flex flex-col items-center mb-6 md:mb-8">
                  <h1 className="text-amber-500 font-bold tracking-widest text-center flex items-center justify-center gap-3 md:gap-5">
                    <span className="font-serif opacity-70 text-5xl md:text-7xl leading-none">ཤོ</span> 
                    <span className="text-3xl md:text-5xl leading-none font-serif">Sho</span>
                  </h1>
                  <p className="text-amber-400/80 mt-3 text-lg md:text-xl font-serif text-center leading-relaxed">པ་ར་སྤེན་པ་བཀྲ་ཤིས་ཞུགས། རྒྱག་མཁན་འཕྲིན་ལས་རྣམ་རྒྱལ་རེད།</p>
                  <p className="text-stone-400 mt-1 tracking-widest uppercase text-center font-sans text-xs md:text-sm">Traditional Tibetan Dice Game</p>
               </div>
              <div className="mb-8 w-full max-w-md bg-stone-900/50 p-6 rounded-xl border border-stone-800">
                  <div className="mb-4">
                      <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest">Your Name</label>
                      <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 focus:border-amber-500 outline-none" maxLength={15} />
                  </div>
                  <div className="mb-4">
                      <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest">Choose Color</label>
                      <div className="grid grid-cols-5 gap-2">
                          {COLOR_PALETTE.map((c) => (
                              <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${selectedColor === c.hex ? 'border-white scale-110 shadow-[0_0_10px_white]' : 'border-transparent opacity-70'}`} style={{ backgroundColor: c.hex }} title={c.name} />
                          ))}
                      </div>
                  </div>
                  <div className="mb-4">
                       <label className="text-stone-400 text-[10px] uppercase block mb-2 tracking-widest">Select Avatar</label>
                       <div className="flex flex-wrap gap-2 mb-2">
                           {AVATAR_PRESETS.map((av) => (
                               <button key={av} onClick={() => setSelectedAvatar(av)} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 text-xl hover:bg-stone-800 ${selectedAvatar === av ? 'border-amber-500 bg-stone-800' : ''}`}>{av}</button>
                           ))}
                           {selectedAvatar.startsWith('data:') && (
                               <button onClick={() => {}} className="w-8 h-8 flex items-center justify-center rounded-lg border border-amber-500 bg-stone-800 overflow-hidden">
                                   <img src={selectedAvatar} className="w-full h-full object-cover" />
                               </button>
                           )}
                           <button onClick={() => setShowCamera(true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-400" title="Take Photo">📸</button>
                           <label className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 hover:bg-stone-800 cursor-pointer text-stone-400" title="Upload Photo">
                               <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                               📁
                           </label>
                       </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
                  <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hover:border-amber-600 cursor-pointer group text-center transition-all flex flex-col items-center justify-center" onClick={() => { setGameMode(GameMode.LOCAL); initializeGame(); }}><div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🏔️</div><h3 className="text-lg font-bold text-stone-200 uppercase tracking-widest">Local</h3></div>
                  <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hover:border-amber-600 cursor-pointer group text-center transition-all flex flex-col items-center justify-center" onClick={() => { setGameMode(GameMode.AI); initializeGame(); }}><div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🤖</div><h3 className="text-lg font-bold text-stone-200 uppercase tracking-widest">Vs AI</h3></div>
              </div>

              {/* Bottom Menu: Tutorial and Rules as Links */}
              <div className="flex items-center justify-center gap-6 mt-4 md:mt-6">
                  <button 
                      onClick={() => { setGameMode(GameMode.TUTORIAL); initializeGame(undefined, true); }}
                      className="text-stone-500 hover:text-amber-500 transition-colors flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold font-sans group"
                  >
                      <span className="text-base group-hover:scale-110 transition-transform">🎓</span> <span className="hover:underline underline-offset-4">Tutorial</span>
                  </button>
                  <div className="w-1 h-1 rounded-full bg-stone-700"></div>
                  <button 
                      onClick={() => setShowRules(true)}
                      className="text-stone-500 hover:text-amber-500 transition-colors flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold font-sans group"
                  >
                      <span className="text-base group-hover:scale-110 transition-transform">📜</span> <span className="hover:underline underline-offset-4">Rules of Sho</span>
                  </button>
              </div>

              <div className="mt-8 text-stone-500 text-[10px] uppercase tracking-[0.3em] font-sans flex flex-col items-center gap-1 opacity-60">
                  <span>Total Games Played Worldwide</span>
                  <span className={`text-amber-600 font-bold text-xl tabular-nums drop-shadow-[0_0_10px_rgba(180,83,9,0.3)] transition-all duration-1000 ${isCounterPulsing ? 'scale-125 text-amber-400 brightness-150' : ''}`}>{globalPlayCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {showGame && (
            <>
                <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[55dvh] md:h-full order-1 overflow-hidden">
                    <div className="p-1.5 md:p-4 flex flex-col gap-1.5 md:gap-3 flex-shrink-0">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-1 md:pb-4">
                            <div onClick={() => { setGameMode(null); setTutorialStep(0); }} className="cursor-pointer flex items-center gap-2 group">
                              <h1 className="text-amber-500 font-bold tracking-widest font-serif flex items-center gap-2">
                                <span className="opacity-70 text-2xl md:text-3xl leading-none">ཤོ</span> 
                                <span className="text-base md:text-xl leading-none">Sho</span>
                              </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={toggleMusic} className={`w-6 h-6 md:w-8 md:h-8 rounded-full border border-stone-600 flex items-center justify-center transition-all ${isMusicEnabled ? 'text-amber-500 border-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.5)]' : 'text-stone-600'}`}>{isMusicEnabled ? '🎵' : '🔇'}</button>
                                <button onClick={() => setShowRules(true)} className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 hover:text-amber-500 flex items-center justify-center font-serif font-bold transition-colors">?</button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 gap-1.5 md:gap-3 pt-2">
                            {players.map((p, i) => (
                                <div key={p.id} className={`relative p-1 md:p-3 rounded-lg border transition-all ${turnIndex === i ? 'bg-stone-800 border-white/20 shadow-lg scale-102' : 'border-stone-800 opacity-60'}`} style={{ borderColor: turnIndex === i ? p.colorHex : 'transparent' }}>
                                    {/* Turn Indicator Arrow */}
                                    {turnIndex === i && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white animate-bounce pointer-events-none z-30">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 4px ${p.colorHex})` }}>
                                                <path d="M12 21l-12-18h24z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                                        <div className="w-5 h-5 md:w-8 md:h-8 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-black/40">
                                            {p.avatar && (p.avatar.startsWith('data:') ? <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-sm md:text-xl">{p.avatar}</span>)}
                                        </div>
                                        <h3 className="font-bold font-serif truncate text-[10px] md:text-base flex-1" style={{ color: p.colorHex }}>{p.name}</h3>
                                    </div>
                                    <div className="flex justify-between text-[9px] md:text-xs text-stone-400">
                                        <div className="flex items-center gap-1"><span className="text-[7px] uppercase opacity-50">In</span><span className="font-bold text-stone-200">{p.coinsInHand}</span></div>
                                        <div className="flex items-center gap-1"><span className="text-[7px] uppercase opacity-50">Out</span><span className="font-bold text-amber-500">{p.coinsFinished}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col p-1.5 md:p-4 gap-1.5 md:gap-3 overflow-hidden">
                        {phase === GamePhase.GAME_OVER ? (
                            <div className="text-center p-3 md:p-8 bg-stone-800/50 rounded-xl border border-amber-500/50 flex-grow flex flex-col justify-center">
                                <h2 className="text-xl md:text-4xl text-amber-400 mb-1 font-cinzel">Victory!</h2>
                                <p className="text-white mb-2 md:mb-4 text-xs md:text-base">{winner?.name} won!</p>
                                <button onClick={() => initializeGame()} className="bg-amber-600 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-sm md:text-base uppercase tracking-widest font-cinzel">New Game</button>
                            </div>
                        ) : (
                            <div className="flex flex-col flex-grow">
                                <div className={!canInteract() ? "opacity-50 pointer-events-none grayscale" : ""}>
                                    <DiceArea currentRoll={lastRoll} onRoll={requestRoll} canRoll={(phase === GamePhase.ROLLING || waitingForPaRa) && !isRolling} pendingValues={pendingMoveValues} waitingForPaRa={waitingForPaRa} flexiblePool={null} />
                                </div>
                                {showSkipButton ? (
                                    <button onClick={requestSkip} className="mt-1 md:mt-2 w-full bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 px-4 py-2 rounded-xl font-cinzel font-bold animate-pulse text-sm md:text-base flex-shrink-0 uppercase tracking-widest">⏭️ Skip Turn</button>
                                ) : (
                                    <div className="mt-1.5 md:mt-2 space-y-1 md:space-y-2 flex-shrink-0">
                                        <div onClick={() => { 
                                            if (canInteract() && phase === GamePhase.MOVING) {
                                                if (currentPlayer.coinsInHand > 0) {
                                                    const handMoves = calculatePotentialMoves(0, pendingMoveValues, board, currentPlayer, isNinerMode);
                                                    if (handMoves.length > 0) { 
                                                        SFX.playSelect(); 
                                                        setSelectedSourceIndex(0); 
                                                        if (gameMode === GameMode.TUTORIAL && tutorialStep === 3) setTutorialStep(4); 
                                                    } else { speak("No valid moves from hand."); SFX.playBounce(); }
                                                }
                                            }
                                        }} className={`p-1.5 md:p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${phase === GamePhase.MOVING && canInteract() ? (selectedSourceIndex === 0 ? 'border-amber-500 bg-amber-900/20' : 'border-stone-700 bg-stone-900/50') : 'border-stone-800 opacity-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-stone-600 flex items-center justify-center font-bold text-stone-500 text-xs md:text-base">0</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-stone-200 text-xs md:text-base uppercase tracking-widest font-cinzel">From Hand</span>
                                                    <span className="text-[8px] md:text-[10px] text-stone-500">{currentPlayer.coinsInHand} coins</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2 flex-grow bg-black/40 rounded-lg border border-stone-800/50 p-1 md:p-3 overflow-y-auto font-mono text-[9px] md:text-[10px] no-scrollbar">
                                    {logs.map((log) => <div key={log.id} className={`mb-1 ${log.type === 'alert' ? 'text-amber-400 font-bold' : 'text-stone-500'}`}>{log.message}</div>)}
                                </div>
                                <div className="mt-2 flex items-center justify-center gap-2 border-t border-stone-800/50 pt-2 opacity-60">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400">Total Games Played:</span>
                                    <span className={`text-[10px] md:text-xs font-bold text-amber-500 tabular-nums transition-transform duration-500 ${isCounterPulsing ? 'scale-110' : ''}`}>{globalPlayCount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-grow relative bg-[#1c1917] overflow-hidden flex items-center justify-center order-2 pt-2 md:pt-0" ref={boardContainerRef}>
                    <div style={{ transform: `scale(${boardScale})`, transformOrigin: 'center', width: 800, height: 800 }} className="transition-transform duration-300">
                        <Board 
                            boardState={board} players={players} validMoves={visualizedMoves} onSelectMove={(move) => requestMove(move.sourceIndex, move.targetIndex)} currentPlayer={currentPlayer.id} turnPhase={phase} onShellClick={(idx) => { if (canInteract() && phase === GamePhase.MOVING && board.get(idx)?.owner === currentPlayer.id) { SFX.playSelect(); setSelectedSourceIndex(idx); } else setSelectedSourceIndex(null); }} selectedSource={selectedSourceIndex} lastMove={lastMove} currentRoll={lastRoll} isRolling={isRolling} onInvalidMoveAttempt={handleInvalidMoveAttempt} isNinerMode={isNinerMode}
                        />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;