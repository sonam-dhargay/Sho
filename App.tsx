
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Player, PlayerColor, BoardState, GamePhase, 
  DiceRoll, MoveResultType, MoveOption, GameLog, BoardShell, GameMode, NetworkPacket
} from './types';
import { TOTAL_SHELLS, COINS_PER_PLAYER, PLAYERS_CONFIG, COLOR_PALETTE, AVATAR_PRESETS } from './constants';
import { Board } from './components/Board';
import { DiceArea } from './components/DiceArea';
import { ShoLogo } from './components/ShoLogo';
import { RulesModal } from './components/RulesModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { GoogleGenAI } from "@google/genai";
import Peer, { DataConnection } from 'peerjs';

// --- Configuration ---
// Enhanced PeerJS config with explicit STUN servers to ensure connectivity
const PEER_CONFIG = {
    debug: 2,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    }
};

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
            id: PlayerColor.Red, // Acts as "Host" or "P1" ID
            name: p1Settings.name || 'Player 1',
            colorHex: p1Settings.color || COLOR_PALETTE[0].hex,
            coinsInHand: COINS_PER_PLAYER,
            coinsFinished: 0,
            avatar: p1Settings.avatar || AVATAR_PRESETS[0]
        },
        {
            id: PlayerColor.Blue, // Acts as "Guest" or "P2" ID
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
  
  getContext: () => {
    if (!SFX.ctx) {
      SFX.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    return SFX.ctx;
  },

  createNoiseBuffer: (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
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
      
      // "Tak-Tak" - Strong Woodblock Sound
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
    const r = Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    return {
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
        r: Math.random() * 360
    };
};

// --- Logic Helpers ---

const calculatePotentialMoves = (
  sourceIdx: number, 
  moveVals: number[], 
  currentBoard: BoardState, 
  player: Player, 
  flexPool: number | null,
  isNinerMode: boolean
): MoveOption[] => {
  const options: MoveOption[] = [];

  const evaluateTarget = (dist: number, consumed: number[]): MoveOption | null => {
    const targetIdx = sourceIdx + dist;
    
    if (targetIdx > TOTAL_SHELLS) {
      return {
        sourceIndex: sourceIdx,
        targetIndex: targetIdx,
        consumedValues: consumed,
        type: MoveResultType.FINISH
      };
    }

    const targetShell = currentBoard.get(targetIdx);
    if (!targetShell) return null;

    // Calculate the size of the stack moving
    let movingStackSize = 0;
    if (sourceIdx === 0) {
        // Universal Rule: If full hand (9 coins), opening move places 2 coins.
        movingStackSize = player.coinsInHand === COINS_PER_PLAYER ? 2 : 1;
    } else {
        movingStackSize = currentBoard.get(sourceIdx)?.stackSize || 0;
    }

    if (targetShell.owner === player.id) {
      // Check No-Niner Rule Constraint
      const resultingSize = targetShell.stackSize + movingStackSize;
      
      // In No-Niner mode, a stack of exactly 9 is forbidden
      if (!isNinerMode && resultingSize === 9) {
          return null;
      }

      return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.STACK };
    }

    if (targetShell.owner && targetShell.owner !== player.id) {
      if (movingStackSize >= targetShell.stackSize) {
         return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.KILL };
      } else {
        return null; 
      }
    }

    return { sourceIndex: sourceIdx, targetIndex: targetIdx, consumedValues: consumed, type: MoveResultType.PLACE };
  };

  if (flexPool !== null) {
    const distToFinish = TOTAL_SHELLS + 1 - sourceIdx;
    for (let i = 1; i <= flexPool; i++) {
      if (sourceIdx + i > TOTAL_SHELLS) {
          if (i === distToFinish) {
               const opt = evaluateTarget(i, [i]);
               if (opt) options.push(opt);
          }
          continue;
      }
      const opt = evaluateTarget(i, [i]);
      if (opt) options.push(opt);
    }
  } else {
    const uniqueSingleVals = Array.from(new Set(moveVals));
    uniqueSingleVals.forEach(val => {
       const opt = evaluateTarget(val, [val]);
       if (opt) options.push(opt);
    });
    if (moveVals.length > 1) {
       const total = moveVals.reduce((a, b) => a + b, 0);
       const opt = evaluateTarget(total, moveVals);
       if (opt && !options.some(o => o.targetIndex === opt.targetIndex)) options.push(opt);
    }
  }
  return options;
};

const getAvailableMoves = (
    pIndex: number, 
    pBoard: BoardState, 
    pPlayers: Player[], 
    pVals: number[], 
    pFlex: number | null,
    isNinerMode: boolean
) => {
  let moves: MoveOption[] = [];
  const player = pPlayers[pIndex];

  if (player.coinsInHand > 0) {
    moves = [...moves, ...calculatePotentialMoves(0, pVals, pBoard, player, pFlex, isNinerMode)];
  }
  pBoard.forEach((shell) => {
    if (shell.owner === player.id && shell.stackSize > 0) {
      moves = [...moves, ...calculatePotentialMoves(shell.index, pVals, pBoard, player, pFlex, isNinerMode)];
    }
  });
  return moves;
};


const App: React.FC = () => {
  // --- Game State ---
  const [players, setPlayers] = useState<Player[]>(PLAYERS_CONFIG);
  const [board, setBoard] = useState<BoardState>(new Map());
  const [turnIndex, setTurnIndex] = useState(0); 
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [pendingMoveValues, setPendingMoveValues] = useState<number[]>([]);
  const [waitingForPaRa, setWaitingForPaRa] = useState(false);
  const [flexiblePool, setFlexiblePool] = useState<number | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<MoveOption | null>(null);
  const [totalMoves, setTotalMoves] = useState(0);
  
  // Instant Win States
  const [paRaStreak, setPaRaStreak] = useState(0);
  const [paRaAccumulator, setPaRaAccumulator] = useState(0);
  
  // Game Variants
  const [isNinerMode, setIsNinerMode] = useState(true);

  // --- Modes & Networking ---
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number>(0); 
  const [tutorialStep, setTutorialStep] = useState(0);

  // --- Customization ---
  const [playerName, setPlayerName] = useState('Player');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_PRESETS[0]);

  const [gameId, setGameId] = useState<string>('');
  const [joinId, setJoinId] = useState<string>('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [hasOpponentJoined, setHasOpponentJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // --- Responsive Board Scaling ---
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(0.8);

  // --- AI & UI State ---
  const [aiThinking, setAiThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // --- Global Counter State ---
  const [globalPlayCount, setGlobalPlayCount] = useState<number>(0);

  // Refs for logic access
  const gameStateRef = useRef({
    board, players, turnIndex, phase, pendingMoveValues, flexiblePool, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, paRaStreak, paRaAccumulator, gameMode, tutorialStep
  });

  useEffect(() => {
    gameStateRef.current = {
      board, players, turnIndex, phase, pendingMoveValues, flexiblePool, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, paRaStreak, paRaAccumulator, gameMode, tutorialStep
    };
  }, [board, players, turnIndex, phase, pendingMoveValues, flexiblePool, waitingForPaRa, lastMove, totalMoves, isRolling, isNinerMode, paRaStreak, paRaAccumulator, gameMode, tutorialStep]);

  const currentPlayer = players[turnIndex] || { id: PlayerColor.Red, name: 'Red', coinsInHand: 0, coinsFinished: 0 };

  const addLog = useCallback((msg: string, type: GameLog['type'] = 'info') => {
    setLogs(prev => [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...prev].slice(50));
  }, []);

  const speak = (text: string) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.1;
      u.pitch = 0.9;
      window.speechSynthesis.speak(u);
  };

  // --- Counter Effect ---
  useEffect(() => {
    // Base count to simulate historical games before this app launch
    const baseCount = 18742; 
    // Add dynamic growth based on time (simulating ~4 games/hour globally)
    const growth = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 15));
    // Add local plays persisted in browser
    const local = parseInt(localStorage.getItem('sho_plays_local') || '0', 10);
    
    setGlobalPlayCount(baseCount + growth + local);
  }, []);

  const trackGameStart = () => {
    const newLocal = parseInt(localStorage.getItem('sho_plays_local') || '0', 10) + 1;
    localStorage.setItem('sho_plays_local', newLocal.toString());
    setGlobalPlayCount(prev => prev + 1);
  };

  const initializeGame = useCallback((p2Config?: { name: string, color: string, avatar?: string }, isTutorial = false) => {
    if (!isTutorial) trackGameStart();

    const newBoard = new Map<number, BoardShell>();
    for (let i = 1; i <= TOTAL_SHELLS; i++) {
      newBoard.set(i, { index: i, stackSize: 0, owner: null, isShoMo: false });
    }
    setBoard(newBoard);
    
    // Determine Player 2 settings based on mode or provided config
    const mySettings = { name: playerName || 'Host', color: selectedColor, avatar: selectedAvatar };
    let opponentSettings = p2Config || { name: 'Player 2', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: AVATAR_PRESETS[1] };
    
    // Handle Online Color Collision
    if (p2Config && p2Config.color === mySettings.color) {
         const alternativeColor = COLOR_PALETTE.find(c => c.hex !== mySettings.color)?.hex || '#3b82f6';
         opponentSettings = { ...p2Config, color: alternativeColor };
         addLog(`Color conflict resolved. Opponent set to ${COLOR_PALETTE.find(c => c.hex === alternativeColor)?.name || 'Blue'}.`, 'info');
    }

    // For AI Mode override
    if ((gameMode === GameMode.AI || isTutorial) && !p2Config) {
       opponentSettings = { name: 'Opponent', color: COLOR_PALETTE.find(c => c.hex !== selectedColor)?.hex || '#3b82f6', avatar: '🤖' };
    }

    const initialPlayers = generatePlayers(mySettings, opponentSettings);
    setPlayers(initialPlayers);
    
    setTurnIndex(0); 
    setPhase(GamePhase.ROLLING);
    setLastRoll(null);
    setIsRolling(false);
    setPendingMoveValues([]);
    setWaitingForPaRa(false);
    setFlexiblePool(null);
    setLastMove(null);
    setTotalMoves(0);
    setAiThinking(false);
    setPaRaStreak(0);
    setPaRaAccumulator(0);
    setTutorialStep(isTutorial ? 1 : 0);
    
    addLog(isTutorial ? 'Tutorial Started.' : `Game Started. ${initialPlayers[0].name} vs ${initialPlayers[1].name}.`, 'info');
  }, [addLog, playerName, selectedColor, selectedAvatar, gameMode]);

  // --- SCALING EFFECT ---
  useEffect(() => {
    const handleResize = () => {
        if (boardContainerRef.current) {
            const { width, height } = boardContainerRef.current.getBoundingClientRect();
            // The board is 800x800. We find the max scale that fits in the container with a small margin.
            const margin = 20;
            const availableW = width - margin;
            const availableH = height - margin;
            const scale = Math.min(availableW / 800, availableH / 800, 1);
            setBoardScale(scale > 0.3 ? scale : 0.3); // Minimum scale to avoid disappearing
        }
    };

    window.addEventListener('resize', handleResize);
    // Initial calls to ensure layout has settled
    handleResize();
    const t = setTimeout(handleResize, 100);

    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(t);
    };
  }, [gameMode, phase]); // Re-calculate when view changes

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSelectedAvatar(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };


  // --- ACTION HANDLERS ---

  const performRoll = async () => {
    const s = gameStateRef.current;
    if (s.phase !== GamePhase.ROLLING && !s.waitingForPaRa) return "Not time to roll.";

    setIsRolling(true);
    SFX.playShake();

    await new Promise(resolve => setTimeout(resolve, 800));

    const currentPlayerName = s.players[s.turnIndex].name;
    
    // 1. Generate Dice
    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;
    let isStacked = Math.random() < 0.002;

    // --- TUTORIAL RIGGING ---
    if (s.gameMode === GameMode.TUTORIAL) {
        if (s.tutorialStep === 2) {
            // Force a 5 (2+3) for the opening move
            d1 = 2; d2 = 3; isStacked = false;
        } else if (s.turnIndex === 1) {
             // Force a 6 (3+3) for opponent
             d1 = 3; d2 = 3; isStacked = false;
        }
    }
    
    // 3. Determine if PaRa
    const isPaRa = (d1 === 1 && d2 === 1);
    
    // 4. Calculate Visuals
    const pos1 = getRandomDicePos();
    let pos2 = getRandomDicePos();
    
    // Ensure standard dice don't overlap unless intended
    if (!isStacked) {
        const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        while (dist(pos1, pos2) < 50) {
            pos2 = getRandomDicePos();
        }
    } else {
        // Stacked visual: same coordinates, slightly messy rotation
        pos2 = { ...pos1, r: pos1.r + (Math.random() * 20 - 10) };
    }

    const visuals = {
        d1x: pos1.x, d1y: pos1.y, d1r: pos1.r,
        d2x: pos2.x, d2y: pos2.y, d2r: pos2.r
    };

    // Calculate preliminary total for display (logic might override this)
    const total = d1 + d2;

    const newRoll: DiceRoll = { die1: d1, die2: d2, isPaRa, total, visuals };
    
    setLastRoll(newRoll);
    setIsRolling(false);
    SFX.playLand();

    // --- INSTANT WIN CHECK 1: STACKED DICE ---
    if (isStacked) {
        addLog(`${currentPlayerName} rolled STACKED DICE! INSTANT WIN!`, 'alert');
        SFX.playFinish();
        // Force win state by completing all coins
        const winningPlayers = [...s.players];
        winningPlayers[s.turnIndex].coinsFinished = COINS_PER_PLAYER;
        setPlayers(winningPlayers);
        setPhase(GamePhase.GAME_OVER);
        return;
    }

    // --- INSTANT WIN CHECK 2: TRIPLE PA RA ---
    if (isPaRa) {
         SFX.playPaRa();
         const newStreak = s.paRaStreak + 1;
         setPaRaStreak(newStreak);
         setPaRaAccumulator(prev => prev + 2); // Accumulate 2 points for the Pa Ra itself
         
         if (newStreak >= 3) {
             addLog(`${currentPlayerName} rolled TRIPLE PA RA! INSTANT WIN!`, 'alert');
             SFX.playFinish();
             const winningPlayers = [...s.players];
             winningPlayers[s.turnIndex].coinsFinished = COINS_PER_PLAYER;
             setPlayers(winningPlayers);
             setPhase(GamePhase.GAME_OVER);
             return;
         }

         setWaitingForPaRa(true);
         addLog(`${currentPlayerName} rolled PA RA (1,1)! (${newStreak}/3) Roll again.`, 'alert');
         // Do NOT set phase to moving; allow another roll.
    } else {
        // Not a Pa Ra roll
        if (s.waitingForPaRa) {
            // We were in a Pa Ra chain, now it's finished.
            // Calculate total flexible pool: (Previous PaRa Accumulator) + (Current Dice)
            const combinedTotal = s.paRaAccumulator + d1 + d2;
            
            setFlexiblePool(combinedTotal);
            addLog(`Pa Ra Chain Finished. Total: ${combinedTotal}. Flexible split!`, 'alert');
            
            // Reset chain states
            setWaitingForPaRa(false);
            setPaRaStreak(0);
            setPaRaAccumulator(0);
            setPhase(GamePhase.MOVING);
        } else {
            // Standard normal roll
            addLog(`${currentPlayerName} rolled ${total} (${d1}, ${d2}).`, 'info');
            setPendingMoveValues([total]);
            setPhase(GamePhase.MOVING);
        }
    }
    
    // Tutorial Step Advance
    if (s.gameMode === GameMode.TUTORIAL && s.tutorialStep === 2) {
        setTutorialStep(3);
    }
  };

  const handleSkipTurn = useCallback(() => {
    const s = gameStateRef.current;
    const currentPlayerName = s.players[s.turnIndex].name;
    
    addLog(`${currentPlayerName} skipped turn (No moves).`, 'alert');
    SFX.playHandBlocked();

    // Reset turn state
    setPendingMoveValues([]);
    setFlexiblePool(null);
    setLastRoll(null);
    setPaRaStreak(0);
    setPaRaAccumulator(0);
    setPhase(GamePhase.ROLLING);
    setTurnIndex((prev) => (prev + 1) % s.players.length);
  }, [addLog]);

  const handleInvalidMoveAttempt = (sourceIdx: number, targetIdx: number) => {
      const s = gameStateRef.current;
      if (s.phase !== GamePhase.MOVING) return;
      
      const dist = targetIdx - sourceIdx;
      if (dist <= 0) return;

      // Check if the attempted distance roughly corresponds to available dice/pool
      let isDistanceValid = false;
      if (s.flexiblePool !== null) {
          if (dist <= s.flexiblePool) isDistanceValid = true;
      } else {
          // Check singles
          if (s.pendingMoveValues.includes(dist)) isDistanceValid = true;
          // Check total
          const sum = s.pendingMoveValues.reduce((a,b)=>a+b, 0);
          if (sum === dist) isDistanceValid = true;
      }

      if (!isDistanceValid) return; // Not a distance issue we want to feedback on (just invalid drop)

      const targetShell = s.board.get(targetIdx);
      if (!targetShell) return;

      const player = s.players[s.turnIndex];
      // Calculate stack size being moved
      let movingStackSize = 0;
      if (sourceIdx === 0) {
          movingStackSize = player.coinsInHand === COINS_PER_PLAYER ? 2 : 1;
      } else {
          movingStackSize = s.board.get(sourceIdx)?.stackSize || 0;
      }

      // Logic: Why is it invalid?
      if (targetShell.owner && targetShell.owner !== player.id) {
          if (targetShell.stackSize > movingStackSize) {
              SFX.playBounce();
              const msg = `Blocked! Enemy stack of ${targetShell.stackSize} is too big.`;
              addLog(msg, 'alert');
              speak("Blocked by larger stack.");
          }
      } else if (targetShell.owner === player.id) {
          if (!s.isNinerMode && targetShell.stackSize + movingStackSize === 9) {
              SFX.playBounce();
              const msg = "Forbidden! Cannot form stack of 9 in No-Niner mode.";
              addLog(msg, 'alert');
              speak("Forbidden stack.");
          }
      }
  };

  const performMove = (sourceIdx: number, targetIdx: number) => {
    const s = gameStateRef.current;
    
    const validMoves = getAvailableMoves(s.turnIndex, s.board, s.players, s.pendingMoveValues, s.flexiblePool, s.isNinerMode);
    const move = validMoves.find(m => m.sourceIndex === sourceIdx && m.targetIndex === targetIdx);
    
    if (!move) {
        addLog("Invalid move attempted", 'alert');
        return "Invalid move.";
    }

    if (move.type === MoveResultType.KILL) SFX.playKill();
    else if (move.type === MoveResultType.STACK) SFX.playStack();
    else if (move.type === MoveResultType.FINISH) SFX.playFinish();
    else SFX.playCoinClick();

    const newBoard = new Map<number, BoardShell>(s.board);
    const player = s.players[s.turnIndex];
    let bonusTurn = false;
    let turnContinues = false;

    let movingStackSize = 0;
    const newPlayers = [...s.players];

    if (move.sourceIndex === 0) {
      // Universal Rule: Check if opening move (full hand)
      const isOpeningMove = newPlayers[s.turnIndex].coinsInHand === COINS_PER_PLAYER;
      if (isOpeningMove) {
        movingStackSize = 2;
        newPlayers[s.turnIndex].coinsInHand -= 2;
        addLog(`${player.name} Opening Move: Placed 2 coins (Sho-mo)!`, "action");
      } else {
        movingStackSize = 1;
        newPlayers[s.turnIndex].coinsInHand -= 1;
      }
      setPlayers(newPlayers);
    } else {
      const sourceShell = newBoard.get(move.sourceIndex)!;
      movingStackSize = sourceShell.stackSize;
      // Moving a stack clears its properties from source
      newBoard.set(move.sourceIndex, { ...sourceShell, stackSize: 0, owner: null, isShoMo: false });
    }

    const targetShell = newBoard.get(move.targetIndex)!;
    
    let isShoMoKill = false;

    if (move.type === MoveResultType.FINISH) {
      newPlayers[turnIndex].coinsFinished += movingStackSize;
      setPlayers(newPlayers);
      addLog(`${player.name} finished ${movingStackSize}!`, 'action');
    } else {
      if (move.type === MoveResultType.KILL) {
        const enemyId = targetShell.owner;
        const enemyStack = targetShell.stackSize;
        const enemyIdx = players.findIndex(p => p.id === enemyId);
        
        // Sho-mo Kill Rule
        if (targetShell.isShoMo) {
            isShoMoKill = true;
            if (movingStackSize < 3) {
                 const needed = 3 - movingStackSize;
                 // Take extras from hand if available
                 if (newPlayers[s.turnIndex].coinsInHand >= needed) {
                     newPlayers[s.turnIndex].coinsInHand -= needed;
                     movingStackSize = 3;
                     addLog(`${player.name} killed Sho-mo! Bonus: Stack increased to 3.`, 'action');
                 }
            }
        }

        if (enemyIdx !== -1) {
          const playersToUpdate = [...newPlayers];
          playersToUpdate[enemyIdx].coinsInHand += enemyStack;
          setPlayers(playersToUpdate);
          if (!isShoMoKill) addLog(`${player.name} KILLED ${enemyStack} coins!`, 'alert');
        }
        
        newBoard.set(move.targetIndex, { 
            ...targetShell, 
            stackSize: movingStackSize, 
            owner: player.id,
            isShoMo: false // Killed sho-mo is gone
        });
        bonusTurn = true;
      } else if (move.type === MoveResultType.STACK) {
        newBoard.set(move.targetIndex, { 
            ...targetShell, 
            stackSize: targetShell.stackSize + movingStackSize, 
            owner: player.id,
            isShoMo: false // Stacking invalidates Sho-mo status (it's now a modified stack)
        });
        addLog(`${player.name} stacked.`, 'action');
        bonusTurn = true;
      } else {
        // Just moving to an empty spot
        // Check if this move created a Sho-mo (Opening move of 2 coins)
        const isShoMoCreation = (move.sourceIndex === 0 && movingStackSize === 2 && !isShoMoKill);
        
        newBoard.set(move.targetIndex, { 
            ...targetShell, 
            stackSize: movingStackSize, 
            owner: player.id,
            isShoMo: isShoMoCreation 
        });
        addLog(`${player.name} moved to ${move.targetIndex}.`, 'info');
      }
    }

    setBoard(newBoard);
    setSelectedSourceIndex(null);
    setLastMove({ ...move, id: Date.now() });
    setTotalMoves(prev => prev + 1);

    let nextPendingMoves: number[] = [];
    let nextFlexiblePool: number | null = null;

    if (s.flexiblePool !== null) {
        const dist = move.consumedValues[0];
        const remainder = s.flexiblePool - dist;
        nextFlexiblePool = null;
        if (remainder > 0) {
            nextPendingMoves = [remainder];
            turnContinues = true;
            bonusTurn = false;
        }
    } else {
        const remainingValues = [...s.pendingMoveValues];
        let refundAmount = 0;
        if (move.type === MoveResultType.FINISH) {
            const distToFinish = TOTAL_SHELLS + 1 - move.sourceIndex;
            const valueUsed = move.consumedValues.reduce((a, b) => a + b, 0);
            if (valueUsed > distToFinish) {
                 refundAmount = valueUsed - distToFinish;
            }
        }
        for (const val of move.consumedValues) {
            const idx = remainingValues.indexOf(val);
            if (idx > -1) remainingValues.splice(idx, 1);
        }
        if (refundAmount > 0) {
             remainingValues.push(refundAmount);
        }
        if (remainingValues.length > 0) {
            nextPendingMoves = remainingValues;
            turnContinues = true;
        }
    }

    if (turnContinues) {
        const movesForRemainder = getAvailableMoves(s.turnIndex, newBoard, newPlayers, nextPendingMoves, nextFlexiblePool, s.isNinerMode);
        if (movesForRemainder.length > 0) {
            setPendingMoveValues(nextPendingMoves);
            setFlexiblePool(nextFlexiblePool);
            setPhase(GamePhase.MOVING);
            if (bonusTurn && s.flexiblePool === null && nextPendingMoves.length === 0) {
                 addLog("Bonus roll pending after moves.", 'alert');
                 setPhase(GamePhase.ROLLING);
            }
        } else {
            addLog(`No valid moves for remainder. Turn ends.`, 'info');
            turnContinues = false; 
            nextPendingMoves = [];
        }
    }

    if (newPlayers[s.turnIndex].coinsFinished >= COINS_PER_PLAYER) {
        setPhase(GamePhase.GAME_OVER);
        setPendingMoveValues([]);
        setFlexiblePool(null);
        setWaitingForPaRa(false);
        setPaRaStreak(0);
        setPaRaAccumulator(0);
        return "Game Over.";
    }

    if (!turnContinues) {
        if (bonusTurn) {
            addLog("Bonus turn! Roll again.", 'action');
            setPhase(GamePhase.ROLLING); 
            setPendingMoveValues([]);
            setFlexiblePool(null);
            // Ensure Pa Ra states are reset if bonus turn is just a kill bonus, not a Pa Ra chain
            setPaRaStreak(0);
            setPaRaAccumulator(0);
        } else {
            setPendingMoveValues([]);
            setLastRoll(null);
            setWaitingForPaRa(false);
            setFlexiblePool(null);
            setPaRaStreak(0);
            setPaRaAccumulator(0);
            setPhase(GamePhase.ROLLING);
            setTurnIndex((prev) => (prev + 1) % players.length);
        }
    }

    // --- TUTORIAL LOGIC ---
    if (s.gameMode === GameMode.TUTORIAL) {
        if (s.tutorialStep === 4) {
             // Move completed
             setTutorialStep(5);
        }
    }

    return "Move executed.";
  };

  // --- AI / TUTORIAL OPPONENT LOGIC ---
  useEffect(() => {
    // Shared Logic for AI and Tutorial Opponent
    const isAI = gameMode === GameMode.AI;
    const isTutorial = gameMode === GameMode.TUTORIAL;

    if ((isAI || isTutorial) && turnIndex === 1 && !aiThinking) {
        const runAITurn = async () => {
            setAiThinking(true);
            const aiPlayerName = players[1].name;
            try {
                if (phase === GamePhase.ROLLING) {
                    await new Promise(r => setTimeout(r, 1000));
                    if (!waitingForPaRa) speak(`${aiPlayerName} is rolling.`);
                    performRoll();
                } else if (phase === GamePhase.MOVING) {
                    await new Promise(r => setTimeout(r, 1500));
                    // Pass isNinerMode to AI logic
                    const validMoves = getAvailableMoves(1, board, players, pendingMoveValues, flexiblePool, gameStateRef.current.isNinerMode);
                    if (validMoves.length === 0) { setAiThinking(false); return; }

                    let chosenMove = validMoves[0];

                    // Simple "Smart" Logic fallback (or Tutorial Rigging)
                    if (isTutorial) {
                        // In tutorial, we might want a specific move, but random valid move is fine for demo
                        chosenMove = validMoves[0];
                    } else if (process.env.API_KEY) {
                         // Gemini AI Logic
                        try {
                            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                            
                            // 1. Serialize Game State for AI
                            const myId = players[1].id;
                            const oppId = players[0].id;
                            const myStacks = [];
                            const oppStacks = [];
                            
                            for (const [pos, shell] of board.entries()) {
                                if (shell.owner === myId) myStacks.push({ pos, size: shell.stackSize });
                                if (shell.owner === oppId) oppStacks.push({ pos, size: shell.stackSize });
                            }

                            const gameState = {
                                myColor: players[1].name,
                                myHand: players[1].coinsInHand,
                                myFinished: players[1].coinsFinished,
                                myStacksOnBoard: myStacks,
                                opponentHand: players[0].coinsInHand,
                                opponentFinished: players[0].coinsFinished,
                                opponentStacksOnBoard: oppStacks,
                                isNinerMode: gameStateRef.current.isNinerMode
                            };

                            const simplifiedMoves = validMoves.map((m, i) => ({
                                id: i,
                                type: m.type,
                                source: m.sourceIndex,
                                target: m.targetIndex,
                                // Add context about the move
                                isKill: m.type === MoveResultType.KILL,
                                isStack: m.type === MoveResultType.STACK,
                                isFinish: m.type === MoveResultType.FINISH
                            }));

                            const prompt = `
                                Play the Tibetan game "Sho". You are the opponent (Player 2).
                                
                                **Objective:** Move all coins from Hand to Finish (>64).
                                
                                **Rules:**
                                - **Kill:** Land on opponent stack <= your stack size. (High Value)
                                - **Stack:** Land on own stack to merge. (Safety)
                                - **Block:** Opponent cannot land on your stack if theirs is smaller.
                                
                                **Current State:**
                                ${JSON.stringify(gameState)}
                                
                                **Valid Moves:**
                                ${JSON.stringify(simplifiedMoves)}
                                
                                **Strategy Instructions:**
                                1. Prioritize **KILLING** opponent stacks. This sets them back significantly.
                                2. Prioritize **FINISHING** coins if safe.
                                3. **STACK** coins to protect them from being killed and to create blocks.
                                4. If no special moves, advance coins that are furthest back or in danger.
                                
                                Analyze the moves and pick the BEST index.
                                Return ONLY a JSON object: { "index": number, "reason": "short explanation" }
                            `;

                            const response = await ai.models.generateContent({ 
                                model: 'gemini-2.5-flash', 
                                contents: { parts: [{ text: prompt }] },
                                config: { responseMimeType: "application/json" }
                            });
                            
                            const responseText = response.text; 
                            if (responseText) {
                                const aiDecision = JSON.parse(responseText);
                                if (validMoves[aiDecision.index]) { 
                                    chosenMove = validMoves[aiDecision.index]; 
                                    console.log("AI Reason:", aiDecision.reason);
                                }
                            }
                        } catch (err) {
                            console.warn("AI fallback error", err);
                            // Fallback logic
                            chosenMove = validMoves.find(m => m.type === MoveResultType.KILL) || 
                                         validMoves.find(m => m.type === MoveResultType.FINISH) || 
                                         validMoves.find(m => m.type === MoveResultType.STACK) || 
                                         validMoves[0];
                        }
                    }

                    performMove(chosenMove.sourceIndex, chosenMove.targetIndex);
                    
                    if (isTutorial && tutorialStep === 5) {
                         setTimeout(() => setTutorialStep(6), 1000);
                    }
                }
            } catch (e) { console.error("AI Error:", e); } finally { setAiThinking(false); }
        };
        runAITurn();
    }
  }, [turnIndex, phase, gameMode, waitingForPaRa, pendingMoveValues, flexiblePool, players, board, aiThinking, performRoll, performMove, addLog, tutorialStep]);

  // Monitor for Forfeited Turns (No valid moves available)
  useEffect(() => {
    // Only the game authority runs this check
    if (gameMode === GameMode.ONLINE_GUEST) return;

    if (phase === GamePhase.MOVING && !isRolling && !waitingForPaRa) {
        // Calculate moves for current player
        const moves = getAvailableMoves(turnIndex, board, players, pendingMoveValues, flexiblePool, isNinerMode);
        
        if (moves.length === 0) {
            // Check if current player is AI or Tutorial Opponent
            const isAIPlayer = gameMode === GameMode.AI && turnIndex === 1;
            const isTutorialOpponent = gameMode === GameMode.TUTORIAL && turnIndex === 1;
            
            // Auto skip only for AI/Tutorial. Humans must click the skip button.
            if (isAIPlayer || isTutorialOpponent) {
                const timer = setTimeout(() => {
                    const currentPlayerName = players[turnIndex].name;
                    addLog(`${currentPlayerName} has no moves. Turn forfeited.`, 'alert');
                    speak("No moves available. Turn forfeited.");
                    SFX.playHandBlocked();
                    handleSkipTurn();
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }
  }, [phase, isRolling, waitingForPaRa, pendingMoveValues, flexiblePool, turnIndex, board, players, isNinerMode, gameMode, players.length, addLog, handleSkipTurn]);

  // --- TWO-PLAYER (ONLINE) SETUP ---
  const setupHost = async () => {
      setJoinError(null);
      setHasOpponentJoined(false);
      setGameId(''); 
      
      // Explicitly pass undefined as ID to let PeerJS generate one.
      // Pass the config as the second argument.
      const peer = new Peer(undefined, PEER_CONFIG);
      
      peer.on('open', (id) => { 
          setGameId(id); 
          addLog(`ID Generated: ${id}. Waiting...`, 'action'); 
      });

      peer.on('error', (err) => {
          console.error("PeerJS Host Error:", err);
          setJoinError(`Connection Failed: ${err.type}`);
          // If in waiting screen, show alert
          if (gameMode === GameMode.ONLINE_HOST && !hasOpponentJoined) {
              addLog(`Error: ${err.type}`, 'alert');
          }
      });

      peer.on('connection', (conn) => {
          connRef.current = conn;
          conn.on('data', (data: any) => {
              if (data.type === 'JOIN_REQ') { 
                const opponent = data.payload;
                setPeerConnected(true); 
                setHasOpponentJoined(true);
                addLog(`${opponent.name} joined!`, 'alert'); 
                // Initialize game with Host's choice and Guest's choice
                initializeGame({ name: opponent.name, color: opponent.color, avatar: opponent.avatar }); 
                return; 
              }
              if (data.type === 'ROLL_REQ') performRoll();
              if (data.type === 'MOVE_REQ') performMove(data.payload.source, data.payload.target);
              if (data.type === 'SKIP_REQ') handleSkipTurn();
          });
          conn.on('close', () => { 
            setPeerConnected(false); 
            // Don't kill the game mode on close, just show status
            addLog("Opponent disconnected.", 'alert'); 
          });
      });
      peerRef.current = peer;
      setMyPlayerIndex(0);
      setGameMode(GameMode.ONLINE_HOST);
  };

  const joinGame = async () => {
      if (!joinId) return;
      setIsJoining(true); setJoinError(null);
      
      const peer = new Peer(undefined, PEER_CONFIG);
      
      peer.on('error', (err) => {
          console.error("PeerJS Join Error:", err);
          setJoinError(`Join Failed: ${err.type}`);
          setIsJoining(false);
      });

      peer.on('open', (id) => {
          const conn = peer.connect(joinId);
          connRef.current = conn;
          
          // Connection timeout failsafe
          setTimeout(() => { 
              if (!conn.open) { 
                  if (isJoining) { // Only if still trying to join
                      setJoinError("Connection timed out. Check ID."); 
                      setIsJoining(false); 
                  }
              } 
          }, 10000);

          conn.on('open', () => {
            conn.send({ 
                type: 'JOIN_REQ', 
                payload: { name: playerName || 'Guest', color: selectedColor, avatar: selectedAvatar } 
            });
            setPeerConnected(true); 
            setGameMode(GameMode.ONLINE_GUEST); 
            setMyPlayerIndex(1); 
            setIsJoining(false);
          });
          
          conn.on('data', (data: any) => {
              if (data.type === 'SYNC') {
                  const p = data.payload;
                  setBoard(deserializeBoard(p.board)); setPlayers(p.players); setTurnIndex(p.turnIndex); setPhase(p.phase);
                  setLastRoll(p.lastRoll); setIsRolling(p.isRolling); setPendingMoveValues(p.pendingMoveValues);
                  setWaitingForPaRa(p.waitingForPaRa); setFlexiblePool(p.flexiblePool); setLastMove(p.lastMove); setTotalMoves(p.totalMoves);
                  // Sync Game Settings
                  if (p.isNinerMode !== undefined) setIsNinerMode(p.isNinerMode);
              }
          });

          conn.on('close', () => { 
            setPeerConnected(false); 
            addLog("Connection lost.", 'alert'); 
          });
      });
      peerRef.current = peer;
  };

  const broadcastState = useCallback(() => {
    if (connRef.current?.open && gameMode === GameMode.ONLINE_HOST) {
        connRef.current.send({
            type: 'SYNC',
            payload: {
                board: serializeBoard(board), players: players, turnIndex: turnIndex, phase: phase,
                lastRoll: lastRoll, isRolling: isRolling, pendingMoveValues: pendingMoveValues,
                waitingForPaRa: waitingForPaRa, flexiblePool: flexiblePool, lastMove: lastMove, totalMoves: totalMoves,
                isNinerMode: isNinerMode
            }
        });
    }
  }, [gameMode, board, players, turnIndex, phase, lastRoll, isRolling, pendingMoveValues, waitingForPaRa, flexiblePool, lastMove, totalMoves, isNinerMode]);

  useEffect(() => { if (gameMode === GameMode.ONLINE_HOST) broadcastState(); }, [broadcastState]);

  // Initial Sync when guest connects
  useEffect(() => { if (gameMode === GameMode.ONLINE_HOST && peerConnected) broadcastState(); }, [gameMode, peerConnected, broadcastState]);

  const cancelJoin = () => { setIsJoining(false); setJoinError(null); peerRef.current?.destroy(); };
  const requestRoll = () => { if (gameMode === GameMode.ONLINE_GUEST) connRef.current?.send({ type: 'ROLL_REQ' }); else performRoll(); };
  const requestMove = (s: number, t: number) => { if (gameMode === GameMode.ONLINE_GUEST) connRef.current?.send({ type: 'MOVE_REQ', payload: { source: s, target: t } }); else performMove(s, t); };
  const requestSkip = () => { if (gameMode === GameMode.ONLINE_GUEST) connRef.current?.send({ type: 'SKIP_REQ' }); else handleSkipTurn(); };

  const canInteract = () => {
      if (gameMode === GameMode.AI || gameMode === GameMode.TUTORIAL) return turnIndex === 0 && !isRolling;
      if (gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST) return turnIndex === myPlayerIndex && !isRolling && peerConnected;
      return !isRolling;
  };

  const currentValidMoves = useCallback(() => {
      if (phase !== GamePhase.MOVING || players.length === 0) return [];
      return getAvailableMoves(turnIndex, board, players, pendingMoveValues, flexiblePool, isNinerMode);
  }, [phase, players, turnIndex, board, pendingMoveValues, flexiblePool, isNinerMode])();

  const visualizedMoves = selectedSourceIndex !== null ? currentValidMoves.filter(m => m.sourceIndex === selectedSourceIndex) : [];
  const winner = players.find(p => p.coinsFinished >= COINS_PER_PLAYER);

  // Determine which screen to show
  const showLobby = !gameMode;
  const showWaitingForOpponent = gameMode === GameMode.ONLINE_HOST && !hasOpponentJoined;
  const showGame = gameMode === GameMode.LOCAL || gameMode === GameMode.AI || gameMode === GameMode.TUTORIAL || gameMode === GameMode.ONLINE_GUEST || (gameMode === GameMode.ONLINE_HOST && hasOpponentJoined);

  const showSkipButton = canInteract() && phase === GamePhase.MOVING && !isRolling && !waitingForPaRa && currentValidMoves.length === 0;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col md:flex-row overflow-hidden font-sans fixed inset-0">
        {gameMode === GameMode.TUTORIAL && (
            <TutorialOverlay 
                step={tutorialStep} 
                onNext={() => setTutorialStep(prev => prev + 1)} 
                onClose={() => setGameMode(null)}
            />
        )}
        <RulesModal 
            isOpen={showRules} 
            onClose={() => setShowRules(false)}
            isNinerMode={isNinerMode}
            onToggleNinerMode={() => setIsNinerMode(prev => !prev)}
        />
        
        {showLobby && (
          <div className="fixed inset-0 z-50 bg-stone-950 text-amber-500 font-serif overflow-y-auto">
             <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-8">
               <div className="flex flex-col items-center mb-6 md:mb-8">
                  <ShoLogo className="w-32 h-24 md:w-56 md:h-40 drop-shadow-2xl mb-4" />
                  <h1 className="text-4xl md:text-6xl text-amber-500 font-bold flex gap-4 tracking-widest text-center">SHO</h1>
                  <p className="text-stone-400 mt-2 tracking-widest uppercase text-center font-sans text-xs md:text-sm">Traditional Tibetan Dice Game</p>
               </div>

              {/* Customization Panel */}
              <div className="mb-8 w-full max-w-md bg-stone-900/50 p-6 rounded-xl border border-stone-800">
                  <div className="mb-4">
                      <label className="text-stone-400 text-xs uppercase tracking-widest block mb-2">Your Name</label>
                      <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 focus:border-amber-500 focus:outline-none transition-colors"
                        maxLength={15}
                        placeholder="Enter name"
                      />
                  </div>
                  <div className="mb-4">
                      <label className="text-stone-400 text-xs uppercase tracking-widest block mb-2">Choose Color</label>
                      <div className="grid grid-cols-5 gap-2">
                          {COLOR_PALETTE.map((c) => (
                              <button 
                                key={c.hex} 
                                onClick={() => setSelectedColor(c.hex)}
                                className={`
                                    w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110
                                    ${selectedColor === c.hex ? 'border-white scale-110 shadow-[0_0_10px_white]' : 'border-transparent opacity-70 hover:opacity-100'}
                                `}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                          ))}
                      </div>
                  </div>
                  
                  {/* Avatar Selection */}
                  <div>
                       <label className="text-stone-400 text-xs uppercase tracking-widest block mb-2">Select Avatar</label>
                       <div className="flex flex-wrap gap-2 mb-2">
                           {AVATAR_PRESETS.map((av) => (
                               <button 
                                   key={av} 
                                   onClick={() => setSelectedAvatar(av)}
                                   className={`w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 text-xl hover:bg-stone-800 transition-colors ${selectedAvatar === av ? 'border-amber-500 bg-stone-800' : ''}`}
                                >
                                   {av}
                               </button>
                           ))}
                           <label className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-700 hover:bg-stone-800 cursor-pointer text-stone-400 hover:text-white transition-colors">
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                📷
                           </label>
                       </div>
                       {selectedAvatar.startsWith('data:') && (
                           <div className="mt-2 text-center">
                               <p className="text-xs text-stone-500 mb-1">Custom Avatar Selected:</p>
                               <img src={selectedAvatar} alt="Custom Avatar" className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-amber-500" />
                           </div>
                       )}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-4">
                  <div className="bg-stone-900 border border-stone-800 p-6 md:p-8 rounded-xl hover:border-amber-600 cursor-pointer group text-center transition-all" onClick={() => { initializeGame(); setGameMode(GameMode.LOCAL); }}>
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏔️</div><h3 className="text-xl md:text-2xl font-bold text-stone-200">Local</h3>
                      <p className="text-xs text-stone-500 mt-2">Pass & Play</p>
                  </div>
                  <div className="bg-stone-900 border border-stone-800 p-6 md:p-8 rounded-xl hover:border-amber-600 cursor-pointer group text-center transition-all" onClick={() => { initializeGame(); setGameMode(GameMode.AI); }}>
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🤖</div><h3 className="text-xl md:text-2xl font-bold text-stone-200">Vs AI</h3>
                      <p className="text-xs text-stone-500 mt-2">Vs Gemini AI</p>
                  </div>
                  <div className="bg-stone-900 border border-stone-800 p-6 md:p-8 rounded-xl hover:border-amber-600 text-center transition-all relative">
                      <div className="text-4xl mb-4">🌍</div><h3 className="text-xl md:text-2xl font-bold mb-2 text-stone-200">Online</h3>
                      <p className="text-xs text-stone-500 mb-4 h-8">One player Hosts, shares the ID, and the other Joins.</p>
                      <button onClick={setupHost} className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2 rounded mb-2 font-bold transition-colors text-sm">HOST</button>
                      <div className="flex gap-2">
                          <input type="text" placeholder="Game ID" className="w-full bg-black border border-stone-700 p-2 rounded text-stone-300 focus:border-amber-500 outline-none text-sm" value={joinId} onChange={e => setJoinId(e.target.value)} />
                          <button onClick={joinGame} className="bg-stone-700 hover:bg-stone-600 text-white px-3 rounded font-bold text-sm">{isJoining ? '...' : 'JOIN'}</button>
                      </div>
                      {joinError && <div className="text-red-500 text-xs mt-2 bg-red-900/20 p-1 rounded">{joinError} <button onClick={cancelJoin} className="ml-2 font-bold">✕</button></div>}
                  </div>
              </div>
              
              <div className="w-full max-w-4xl flex justify-center gap-8 mb-8">
                  <button onClick={() => { initializeGame(undefined, true); setGameMode(GameMode.TUTORIAL); }} className="text-stone-500 hover:text-amber-500 transition-colors border-b border-stone-700 hover:border-amber-500 pb-1">Learn to Play</button>
                  <button onClick={() => setShowRules(true)} className="text-stone-500 hover:text-amber-500 transition-colors border-b border-stone-700 hover:border-amber-500 pb-1">Rules & Options</button>
              </div>

              <div className="text-stone-600 font-mono text-xs flex items-center gap-2 mb-8">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-amber-600 font-bold text-sm">{globalPlayCount.toLocaleString()}</span> Games Played
              </div>
            </div>
          </div>
        )}

        {showWaitingForOpponent && (
            <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center text-amber-500 p-4 text-center">
                <h2 className="text-2xl md:text-3xl mb-4">Game ID</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="font-mono text-white bg-stone-800 p-3 rounded text-xl select-all">{gameId || 'Generating...'}</span>
                    <button onClick={() => navigator.clipboard.writeText(gameId)} className="bg-stone-700 hover:bg-stone-600 p-3 rounded text-white" title="Copy ID">📋</button>
                </div>
                
                <div className="mt-8 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg max-w-md w-full">
                    <h3 className="font-bold text-amber-500 mb-2">Instructions</h3>
                    <ol className="text-left text-stone-400 text-sm list-decimal pl-5 space-y-2">
                        <li>Copy the <strong>Game ID</strong> above.</li>
                        <li>Send it to your friend (via chat, message, etc.).</li>
                        <li>Wait for them to enter it in the "Join" box on their device.</li>
                    </ol>
                </div>

                <div className="mt-8 flex gap-4 items-center">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-stone-400 text-sm">Waiting for connection...</span>
                </div>
                
                {joinError && (
                    <div className="mt-6 p-4 bg-red-900/30 border border-red-500 text-red-200 rounded max-w-sm">
                        <p className="font-bold mb-1">Connection Error</p>
                        <p className="text-xs mb-3 font-mono">{joinError}</p>
                        <div className="flex justify-center gap-2">
                            <button onClick={() => setGameMode(null)} className="text-xs bg-stone-800 hover:bg-stone-700 px-3 py-1 rounded">Back</button>
                            <button onClick={() => setupHost()} className="text-xs bg-amber-700 hover:bg-amber-600 px-3 py-1 rounded font-bold">Retry</button>
                        </div>
                    </div>
                )}
                
                {!joinError && (
                    <button onClick={() => setGameMode(null)} className="mt-8 text-stone-500 underline hover:text-stone-300">Cancel</button>
                )}
            </div>
        )}

        {showGame && (
            <>
                {/* Disconnected Overlay */}
                {gameMode !== GameMode.LOCAL && gameMode !== GameMode.AI && gameMode !== GameMode.TUTORIAL && !peerConnected && (
                    <div className="absolute inset-0 z-[60] bg-black/70 flex items-center justify-center backdrop-blur-sm">
                         <div className="bg-stone-900 border border-red-500/50 p-6 rounded-xl text-center shadow-2xl m-4">
                             <div className="text-red-500 text-4xl mb-2">⚠️</div>
                             <h3 className="text-xl font-bold text-white mb-2">Connection Lost</h3>
                             <p className="text-stone-400 mb-4">Waiting for reconnection...</p>
                             <button onClick={() => setGameMode(null)} className="text-sm text-stone-500 hover:text-stone-300 underline">Exit Game</button>
                         </div>
                    </div>
                )}

                {/* Sidebar - Controls */}
                <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-stone-800 bg-stone-950 z-20 shadow-2xl h-[60dvh] md:h-full md:max-h-full order-1 overflow-hidden">
                    
                    {/* Controls Wrapper - Use flex-1 to take available space, allow scroll */}
                    <div className="flex-1 p-2 md:p-4 flex flex-col gap-2 md:gap-3 overflow-y-auto no-scrollbar">
                        <header className="flex justify-between items-center border-b border-stone-800 pb-1 md:pb-4 flex-shrink-0">
                            <div onClick={() => setGameMode(null)} className="cursor-pointer flex items-center gap-2 group">
                                <ShoLogo className="w-6 h-6 md:w-12 md:h-10 group-hover:scale-110 transition-transform" /><h1 className="text-lg md:text-2xl text-amber-500 font-bold tracking-widest font-serif">SHO</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {gameMode === GameMode.AI && <div className="text-[10px] md:text-xs bg-stone-800 px-2 md:px-3 py-1 rounded text-stone-400 font-mono">{aiThinking ? "AI..." : "VS AI"}</div>}
                                {gameMode === GameMode.TUTORIAL && <div className="text-[10px] md:text-xs bg-amber-800 px-2 md:px-3 py-1 rounded text-white font-mono">TUTORIAL</div>}
                                <button onClick={() => setShowRules(true)} className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-stone-600 text-stone-400 hover:text-amber-500 hover:border-amber-500 flex items-center justify-center font-serif font-bold transition-colors text-xs md:text-base">?</button>
                            </div>
                        </header>

                        <div className="grid grid-cols-2 gap-2 md:gap-3 flex-shrink-0">
                            {players.map((p, i) => (
                                <div key={p.id} className={`p-1.5 md:p-3 rounded-lg border transition-all ${turnIndex === i ? 'bg-stone-800 border-white/20 shadow-lg' : 'border-stone-800 opacity-60'}`} style={{ borderColor: turnIndex === i ? p.colorHex : 'transparent' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {p.avatar && (
                                            p.avatar.startsWith('data:') ? (
                                                <img src={p.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-white/20" />
                                            ) : (
                                                <span className="text-lg">{p.avatar}</span>
                                            )
                                        )}
                                        <h3 className="font-bold font-serif truncate text-xs md:text-base" style={{ color: p.colorHex }}>
                                            {p.name}
                                            {(gameMode === GameMode.ONLINE_HOST || gameMode === GameMode.ONLINE_GUEST) && i === myPlayerIndex && (
                                                <span className="text-stone-500 text-xs ml-2">(You)</span>
                                            )}
                                        </h3>
                                    </div>
                                    <div className="flex justify-between text-[10px] md:text-xs text-stone-400 mt-0.5 md:mt-2"><span>In: {p.coinsInHand}</span><span>Out: {p.coinsFinished}</span></div>
                                </div>
                            ))}
                        </div>

                        <div className="flex-shrink-0">
                            {phase === GamePhase.GAME_OVER ? (
                                <div className="text-center p-4 md:p-8 bg-stone-800/50 rounded-xl border border-amber-500/50"><h2 className="text-2xl md:text-4xl text-amber-400 mb-2">Victory!</h2><p className="text-white mb-4 md:mb-6">{winner?.name} won!</p><button onClick={() => initializeGame()} className="bg-amber-600 text-white px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-base">New Game</button></div>
                            ) : (
                                <>
                                    <div className={!canInteract() ? "opacity-50 pointer-events-none grayscale" : ""}><DiceArea currentRoll={lastRoll} onRoll={requestRoll} canRoll={phase === GamePhase.ROLLING && !isRolling} pendingValues={pendingMoveValues} waitingForPaRa={waitingForPaRa} flexiblePool={flexiblePool} /></div>
                                    
                                    {showSkipButton ? (
                                        <button 
                                            onClick={requestSkip}
                                            className="mt-1 md:mt-2 w-full bg-amber-800/50 hover:bg-amber-700 text-amber-200 border border-amber-600/50 px-4 py-2 md:py-3 rounded-xl font-cinzel font-bold flex items-center justify-center gap-2 animate-pulse text-sm md:text-base"
                                        >
                                            <span>⏭️</span> SKIP TURN
                                        </button>
                                    ) : (
                                        <div onClick={() => { 
                                            if (canInteract() && phase === GamePhase.MOVING && currentPlayer.coinsInHand > 0) {
                                                SFX.playSelect();
                                                setSelectedSourceIndex(0); 
                                                if (gameMode === GameMode.TUTORIAL && tutorialStep === 3) setTutorialStep(4);
                                            }
                                        }} className={`mt-1 md:mt-2 mb-2 p-2 md:p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer flex-shrink-0 ${phase === GamePhase.MOVING && currentPlayer.coinsInHand > 0 && canInteract() ? (selectedSourceIndex === 0 ? 'border-green-500 bg-stone-800' : 'border-stone-700 hover:border-stone-500') : 'border-stone-800 opacity-50'}`}>
                                            <div className="flex items-center gap-3"><div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-stone-600 flex items-center justify-center font-bold text-stone-500 text-sm md:text-base">0</div><div className="flex flex-col"><span className="font-bold text-stone-200 text-sm md:text-base">Hand</span><span className="text-[10px] md:text-xs text-stone-500">{currentPlayer.coinsInHand} coins</span></div></div>
                                            {selectedSourceIndex === 0 && <span className="text-green-500 text-xs md:text-sm font-bold">SELECTED</span>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Logs - Fixed small height on mobile */}
                    <div className="flex-none h-12 md:h-48 md:flex-none px-2 pb-2 md:px-6 md:pb-6 flex flex-col overflow-hidden bg-stone-950 border-t border-stone-800 md:border-t-0">
                         <div className="flex-grow bg-black/40 rounded-lg border border-stone-800/50 p-1.5 md:p-3 overflow-y-auto font-mono text-[10px] md:text-xs">
                             {logs.map((log) => <div key={log.id} className={`mb-1 ${log.type === 'alert' ? 'text-amber-400' : 'text-stone-500'}`}>{log.message}</div>)}
                         </div>
                    </div>
                </div>

                {/* Game Board Area */}
                <div className="flex-grow relative bg-[#1c1917] overflow-hidden flex items-center justify-center order-2 pt-4 md:pt-0" ref={boardContainerRef}>
                    <div 
                        style={{ 
                            transform: `scale(${boardScale})`, 
                            transformOrigin: 'center',
                            width: 800, // Explicit width for the transform to work on
                            height: 800
                        }} 
                        className="transition-transform duration-300"
                    >
                        <Board 
                            boardState={board} 
                            players={players} 
                            validMoves={visualizedMoves} 
                            onSelectMove={(move) => requestMove(move.sourceIndex, move.targetIndex)} 
                            currentPlayer={currentPlayer.id} 
                            turnPhase={phase} 
                            onShellClick={(idx) => { if (canInteract() && phase === GamePhase.MOVING && board.get(idx)?.owner === currentPlayer.id) { SFX.playSelect(); setSelectedSourceIndex(idx); } else setSelectedSourceIndex(null); }} 
                            selectedSource={selectedSourceIndex} 
                            lastMove={lastMove} 
                            currentRoll={lastRoll} 
                            isRolling={isRolling} 
                            onInvalidMoveAttempt={handleInvalidMoveAttempt}
                        />
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default App;
