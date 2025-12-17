
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BoardState, PlayerColor, MoveOption, MoveResultType, DiceRoll } from '../types';
import { CENTER_X, CENTER_Y, TOTAL_SHELLS, COINS_PER_PLAYER } from '../constants';
import * as d3 from 'd3';

interface BoardProps {
  boardState: BoardState;
  players: any[];
  validMoves: MoveOption[];
  onSelectMove: (move: MoveOption) => void;
  currentPlayer: PlayerColor;
  turnPhase: string;
  onShellClick?: (index: number) => void;
  selectedSource?: number | null;
  lastMove: MoveOption | null;
  currentRoll?: DiceRoll | null;
  isRolling?: boolean;
  onInvalidMoveAttempt?: (sourceIdx: number, targetIdx: number) => void;
  isNinerMode?: boolean; 
}

// --- Visual Sub-Components ---

const CowrieShell: React.FC<{ angle: number; isTarget: boolean }> = ({ angle, isTarget }) => {
  const rotation = (angle * 180 / Math.PI) + 90;

  return (
    <div 
      className="w-10 h-12 flex items-center justify-center transition-transform duration-300 pointer-events-none"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 100 130" className={`w-full h-full drop-shadow-xl transition-all ${isTarget ? 'filter brightness-125 sepia scale-110' : ''}`}>
        <defs>
          <radialGradient id="shellBody" cx="40%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#fdfbf7" />
            <stop offset="60%" stopColor="#e7e5e4" />
            <stop offset="100%" stopColor="#a8a29e" />
          </radialGradient>
        </defs>
        
        <ellipse cx="50" cy="65" rx="45" ry="60" fill="url(#shellBody)" stroke="#78716c" strokeWidth="1.5" />
        <path d="M50 20 C 40 40, 40 90, 50 110 C 60 90, 60 40, 50 20" fill="#44403c" stroke="#292524" strokeWidth="1"/>
        <g stroke="#e7e5e4" strokeWidth="2" strokeLinecap="round" opacity="0.8">
           <line x1="48" y1="30" x2="42" y2="30" />
           <line x1="47" y1="45" x2="40" y2="45" />
           <line x1="47" y1="60" x2="38" y2="60" />
           <line x1="47" y1="75" x2="40" y2="75" />
           <line x1="48" y1="90" x2="42" y2="90" />
           <line x1="52" y1="30" x2="58" y2="30" />
           <line x1="53" y1="45" x2="60" y2="45" />
           <line x1="53" y1="60" x2="62" y2="60" />
           <line x1="53" y1="75" x2="60" y2="75" />
           <line x1="52" y1="90" x2="58" y2="90" />
        </g>
      </svg>
    </div>
  );
};

const AncientCoin: React.FC<{ color: string; isSelected: boolean; avatar?: string }> = ({ color, isSelected, avatar }) => {
  return (
    <div 
      className={`
        relative w-14 h-14 rounded-full 
        shadow-[4px_6px_10px_rgba(0,0,0,0.8),inset_0px_2px_4px_rgba(255,255,255,0.2)]
        border border-white/20
        flex items-center justify-center
        ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-stone-900 z-50' : ''}
      `}
      style={{
        background: `radial-gradient(circle at 35% 35%, ${color}, #000000)`
      }}
    >
      {avatar ? (
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/20 shadow-inner">
             {avatar.startsWith('data:') || avatar.startsWith('http') ? (
                 <img src={avatar} alt="avatar" className="w-full h-full object-cover opacity-90" />
             ) : (
                 <span className="text-2xl drop-shadow-md select-none" style={{ lineHeight: 1 }}>{avatar}</span>
             )}
        </div>
      ) : (
        <>
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 opacity-60"></div>
            <div className="absolute w-5 h-5 bg-[#1c1917] border border-white/10 shadow-inner transform rotate-45"></div>
        </>
      )}
      <div className="absolute top-2 left-3 w-4 h-3 bg-white opacity-20 rounded-full blur-[1px] pointer-events-none"></div>
    </div>
  );
};

const BoardDie: React.FC<{ value: number; x: number; y: number; rotation: number; isRolling: boolean }> = ({ value, x, y, rotation, isRolling }) => {
    const [animState, setAnimState] = useState<'initial' | 'settled'>('initial');
    const randomSpinOffset = useRef(Math.random() * 360 - 180).current;

    useEffect(() => {
        if (!isRolling) {
            setAnimState('initial');
            const timer = requestAnimationFrame(() => {
                 setAnimState('settled');
            });
            return () => cancelAnimationFrame(timer);
        }
    }, [isRolling, x, y, rotation]);

    const dots: number[][] = [];
    if (value % 2 !== 0) dots.push([1, 1]);
    if (value > 1) { dots.push([0, 0], [2, 2]); }
    if (value > 3) { dots.push([0, 2], [2, 0]); }
    if (value === 6) { dots.push([1, 0], [1, 2]); }
    
    let style: React.CSSProperties = {};
    if (isRolling) {
        style = {
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%)`,
        }; 
    } else {
        const isSettled = animState === 'settled';
        const currentX = isSettled ? x : 0;
        const currentY = isSettled ? y : 0;
        const currentRot = isSettled ? rotation : (rotation + randomSpinOffset);
        const currentScale = isSettled ? 1 : 1.2;

        style = {
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) rotate(${currentRot}deg) scale(${currentScale})`,
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        };
    }

    return (
        <div className={`absolute w-10 h-10 bg-amber-100 rounded-md shadow-lg border border-amber-300 flex overflow-hidden ${isRolling ? 'animate-bounce' : ''}`} style={style}>
             {dots.map(([r, c], i) => {
                 const isAce = value === 1; 
                 const dotColor = isAce ? 'bg-red-600' : 'bg-black';
                 const dotSize = isAce ? 'w-3 h-3' : 'w-2 h-2';
                 return (
                    <div 
                        key={i} 
                        className={`absolute ${dotColor} rounded-full ${dotSize}`}
                        style={{ top: `${r * 33 + 17}%`, left: `${c * 33 + 17}%`, transform: 'translate(-50%, -50%)' }}
                    />
                 );
             })}
        </div>
    );
};

const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const Board: React.FC<BoardProps> = ({ 
  boardState, players, validMoves, onSelectMove, currentPlayer, turnPhase, onShellClick, selectedSource, lastMove, currentRoll, isRolling, onInvalidMoveAttempt, isNinerMode
}) => {
  const [dragState, setDragState] = useState<{ isDragging: boolean; sourceIndex: number | null; x: number; y: number; }>({ isDragging: false, sourceIndex: null, x: 0, y: 0 });
  const [finishingParticles, setFinishingParticles] = useState<{id: number, x: number, y: number, color: string, avatar?: string}[]>([]);
  const [stackingAnim, setStackingAnim] = useState<{ id: number, startX: number, startY: number, endX: number, endY: number, color: string, avatar?: string } | null>(null);
  const [shakeShellId, setShakeShellId] = useState<number | null>(null);
  const [blockedFeedback, setBlockedFeedback] = useState<{ shellId: number, message: string, id: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const lastAnimatedMoveId = useRef<number | null>(null);

  const getPlayerColor = (id: PlayerColor | null): string => {
      if (!id) return '#666';
      const p = players.find(p => p.id === id);
      return p ? p.colorHex : '#666';
  };
  
  const getPlayerAvatar = (id: PlayerColor | null): string | undefined => {
      if (!id) return undefined;
      const p = players.find(p => p.id === id);
      return p ? p.avatar : undefined;
  };

  // --- Organic Spiral Layout ---
  // Using weights and jitter to create a hand-placed, uneven feel
  const shells = useMemo(() => {
    const weights = Array.from({ length: TOTAL_SHELLS }, (_, i) => {
        const idx = i + 1;
        const shell = boardState.get(idx);
        const prevShell = i > 0 ? boardState.get(i) : null;
        const nextShell = i < TOTAL_SHELLS - 1 ? boardState.get(i + 2) : null;
        
        let w = 1.0;
        // Occupied shells push neighbors for a loose feel
        if (shell && shell.stackSize > 0) {
            w += 3.5; 
        }
        // Neighbors expansion
        if ((prevShell && prevShell.stackSize > 0) || (nextShell && nextShell.stackSize > 0)) {
            w += 1.2;
        }
        return w;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumulativeWeight = 0;

    return Array.from({ length: TOTAL_SHELLS }, (_, i) => {
      const idx = i + 1;
      const weight = weights[i];
      const t = (cumulativeWeight + weight / 2) / totalWeight;
      cumulativeWeight += weight;

      // Spiral geometry
      const baseAngle = t * Math.PI * 4.6 + 2.5; 
      const baseRadius = 110 + (t * 270); 
      
      // Intentional jitter for the "loose and uneven" natural look
      const jitterAngle = (pseudoRandom(idx * 13.5) - 0.5) * 0.12; 
      const jitterRadius = (pseudoRandom(idx * 7.2) - 0.5) * 16; 
      
      const angle = baseAngle + jitterAngle;
      const radius = baseRadius + jitterRadius;
      
      const x = CENTER_X + radius * Math.cos(angle);
      const y = CENTER_Y + radius * Math.sin(angle);

      // Tangent calculation
      const nextT = Math.min(1, t + 0.01);
      const nextAngle = nextT * Math.PI * 4.6 + 2.5;
      const nextRadius = 110 + (nextT * 270);
      const nextX = CENTER_X + nextRadius * Math.cos(nextAngle);
      const nextY = CENTER_Y + nextRadius * Math.sin(nextAngle);
      
      const tangentAngle = Math.atan2(nextY - y, nextX - x);

      return { 
          id: idx, 
          x, 
          y, 
          angle: tangentAngle, 
          data: boardState.get(idx) 
      };
    });
  }, [boardState]);

  const endBtnPos = useMemo(() => {
     if (shells.length === 0) return { x: 700, y: 700 };
     const last = shells[shells.length - 1];
     const dist = 95;
     const x = last.x + Math.cos(last.angle) * dist;
     const y = last.y + Math.sin(last.angle) * dist;
     return { x, y };
  }, [shells]);

  useEffect(() => {
    if (lastMove && lastMove.type !== MoveResultType.FINISH) {
        if (!lastMove.id) return;
        if (lastMove.id === lastAnimatedMoveId.current) return;
        lastAnimatedMoveId.current = lastMove.id;
        let startX = 0, startY = 0, endX = 0, endY = 0;
        if (lastMove.sourceIndex === 0) {
            startX = 100; startY = 750;
        } else {
            const sourceShell = shells.find(s => s.id === lastMove.sourceIndex);
            if (sourceShell) { startX = sourceShell.x; startY = sourceShell.y; }
        }
        const targetShell = shells.find(s => s.id === lastMove.targetIndex);
        if (targetShell) { endX = targetShell.x; endY = targetShell.y; }
        if ((startX || startY) && (endX || endY)) {
             const movedShell = boardState.get(lastMove.targetIndex);
             const moverId = movedShell?.owner || currentPlayer; 
             const moverColor = getPlayerColor(moverId);
             const moverAvatar = getPlayerAvatar(moverId);
             setStackingAnim({ id: Date.now(), startX, startY, endX, endY, color: moverColor, avatar: moverAvatar });
             const timer = setTimeout(() => { setStackingAnim(null); }, 600); 
             return () => clearTimeout(timer);
        }
    }
  }, [lastMove, shells, boardState, currentPlayer, players]);

  useEffect(() => {
    if (lastMove && lastMove.type === MoveResultType.FINISH) {
        if (!lastMove.id) return;
        if (lastMove.id === lastAnimatedMoveId.current) return;
        lastAnimatedMoveId.current = lastMove.id;
        const sourceShell = shells.find(s => s.id === lastMove.sourceIndex);
        if (sourceShell) {
            const pColor = getPlayerColor(currentPlayer);
            const pAvatar = getPlayerAvatar(currentPlayer);
            const particles = Array.from({ length: 5 }).map((_, i) => ({ id: Date.now() + i, x: sourceShell.x, y: sourceShell.y, color: pColor, avatar: pAvatar }));
            setFinishingParticles(particles);
            const timer = setTimeout(() => { setFinishingParticles([]); }, 2000);
            return () => clearTimeout(timer);
        }
    }
  }, [lastMove, shells, currentPlayer, players]);

  const triggerBlockedFeedback = (targetId: number, sourceIdx: number) => {
    const targetShell = boardState.get(targetId);
    if (!targetShell?.owner) return; 

    let msg = "";
    const currentPlayerObj = players.find(p => p.id === currentPlayer);
    let moverSize = sourceIdx === 0 
        ? (currentPlayerObj?.coinsInHand === COINS_PER_PLAYER ? 2 : 1) 
        : (boardState.get(sourceIdx)?.stackSize || 1);

    if (targetShell.owner !== currentPlayer) {
        if (targetShell.stackSize > moverSize) {
            msg = "TOO BIG";
        }
    } else {
        if (!isNinerMode && targetShell.stackSize + moverSize === 9) {
            msg = "FORBIDDEN";
        }
    }

    if (msg) {
        setShakeShellId(targetId);
        setBlockedFeedback({ shellId: targetId, message: msg, id: Date.now() });
        setTimeout(() => setShakeShellId(null), 400);
        setTimeout(() => setBlockedFeedback(null), 1200);
        onInvalidMoveAttempt?.(sourceIdx, targetId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, index: number) => {
      if (turnPhase !== 'MOVING') return;
      const isTarget = validMoves.some(m => m.targetIndex === index);
      if (isTarget) return;
      const shell = boardState.get(index);
      if (!shell || shell.owner !== currentPlayer) return;
      e.preventDefault(); 
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }
      setDragState({ isDragging: true, sourceIndex: index, x: clientX, y: clientY });
      if (onShellClick) onShellClick(index);
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
          if (!dragState.isDragging) return;
          let clientX, clientY;
          if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
          else { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
          setDragState(prev => ({ ...prev, x: clientX, y: clientY }));
      };
      const handleMouseUp = (e: MouseEvent | TouchEvent) => {
          if (!dragState.isDragging) return;
          let clientX, clientY;
          if ('changedTouches' in e) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; } 
          else { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
          const draggedEl = document.getElementById('dragged-ghost');
          if (draggedEl) draggedEl.style.display = 'none';
          const elementUnder = document.elementFromPoint(clientX, clientY);
          if (draggedEl) draggedEl.style.display = 'block';
          const shellDiv = elementUnder?.closest('[data-shell-id]');
          if (shellDiv) {
              const targetId = parseInt(shellDiv.getAttribute('data-shell-id') || '0');
              const move = validMoves.find(m => m.sourceIndex === dragState.sourceIndex && m.targetIndex === targetId);
              if (move) { onSelectMove(move); } 
              else if (dragState.sourceIndex !== null && targetId !== dragState.sourceIndex) {
                  triggerBlockedFeedback(targetId, dragState.sourceIndex);
              }
          }
          setDragState({ isDragging: false, sourceIndex: null, x: 0, y: 0 });
      };
      if (dragState.isDragging) {
          window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
          window.addEventListener('touchmove', handleMouseMove, { passive: false }); window.addEventListener('touchend', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('touchmove', handleMouseMove); window.removeEventListener('touchend', handleMouseUp);
      };
  }, [dragState, validMoves, onSelectMove]);

  const hasFinishMove = validMoves.some(m => m.type === MoveResultType.FINISH);

  return (
    <div className="relative mx-auto select-none" style={{ width: 800, height: 800 }} ref={boardRef}>
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes shake {
                0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
                20% { transform: translate(-54%, -50%) rotate(-5deg); }
                40% { transform: translate(-46%, -50%) rotate(5deg); }
                60% { transform: translate(-54%, -50%) rotate(-5deg); }
                80% { transform: translate(-46%, -50%) rotate(5deg); }
            }
            @keyframes blockedFadeUp {
                0% { opacity: 0; transform: translateY(0); }
                20% { opacity: 1; transform: translateY(-10px); }
                80% { opacity: 1; transform: translateY(-20px); }
                100% { opacity: 0; transform: translateY(-30px); }
            }
            .animate-shake-target { animation: shake 0.4s ease-in-out; }
            .animate-blocked-label { animation: blockedFadeUp 1.2s ease-out forwards; }
        `}} />

        {/* Center Pad */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-[16rem] h-[16rem] bg-[#3f2e26] rounded-full blur-md opacity-80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative w-56 h-56 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] border-4 border-[#271c19] overflow-hidden flex items-center justify-center bg-[#291d1a]">
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] mix-blend-overlay"></div>
                <div className="flex flex-col items-center opacity-40 mix-blend-screen pointer-events-none">
                    <span className="font-serif text-[#8b5e3c] text-5xl mb-1">ཤོ</span>
                    <span className="font-cinzel text-[#8b5e3c] text-6xl font-bold tracking-widest drop-shadow-lg">SHO</span>
                </div>
                {(isRolling || currentRoll) && (
                    <div className="absolute inset-0 z-20">
                         {isRolling ? (
                             <>
                                <div className="absolute left-1/2 top-1/2 -ml-[25px] -mt-[25px]">
                                    <BoardDie value={1} x={0} y={0} rotation={0} isRolling={true} />
                                </div>
                                <div className="absolute left-1/2 top-1/2 ml-[25px] mt-[25px]">
                                    <BoardDie value={6} x={0} y={0} rotation={0} isRolling={true} />
                                </div>
                             </>
                         ) : (
                             currentRoll && currentRoll.visuals && (
                                <>
                                    <BoardDie value={currentRoll.die1} x={currentRoll.visuals.d1x} y={currentRoll.visuals.d1y} rotation={currentRoll.visuals.d1r} isRolling={false} />
                                    <BoardDie value={currentRoll.die2} x={currentRoll.visuals.d2x} y={currentRoll.visuals.d2y} rotation={currentRoll.visuals.d2r} isRolling={false} />
                                </>
                             )
                         )}
                    </div>
                )}
            </div>
        </div>

        {/* Spiral Path */}
        <svg width="100%" height="100%" className="absolute inset-0 z-0 pointer-events-none">
             <path 
                d={d3.line().curve(d3.curveCatmullRom.alpha(0.6))(shells.map(s => [s.x, s.y])) || ""} 
                fill="none" 
                stroke="#44403c" 
                strokeWidth="12" 
                strokeLinecap="round" 
                className="opacity-20 blur-sm transition-all duration-500" 
             />
        </svg>

        {shells.map((shell) => {
            const moveTarget = validMoves.find(m => m.targetIndex === shell.id);
            const isTarget = !!moveTarget;
            const stackSize = shell.data?.stackSize || 0;
            const owner = shell.data?.owner;
            const shellColor = owner ? getPlayerColor(owner) : '#666';
            const shellAvatar = owner ? getPlayerAvatar(owner) : undefined;
            const isBeingDragged = dragState.isDragging && dragState.sourceIndex === shell.id;
            const isSource = selectedSource === shell.id;
            const isOwner = owner === currentPlayer;
            const isShaking = shakeShellId === shell.id;
            const hasBlockedMsg = blockedFeedback?.shellId === shell.id;

            return (
                <div 
                    key={shell.id} data-shell-id={shell.id}
                    className={`absolute -ml-5 -mt-6 flex items-center justify-center z-20 transition-all duration-500 ease-in-out ${isTarget ? 'z-40' : ''}`}
                    style={{ left: shell.x, top: shell.y }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!dragState.isDragging) {
                            if (isTarget && moveTarget) { 
                                onSelectMove(moveTarget); 
                            } else if (selectedSource !== undefined && selectedSource !== null && selectedSource !== shell.id) {
                                if (isOwner) {
                                    if (onShellClick) onShellClick(shell.id);
                                } else {
                                    triggerBlockedFeedback(shell.id, selectedSource);
                                }
                            } else if (onShellClick) {
                                onShellClick(shell.id);
                            }
                        }
                    }}
                >
                    <CowrieShell angle={shell.angle} isTarget={isTarget} />

                    {isTarget && <div className="absolute w-14 h-14 rounded-full border-2 border-green-500 animate-ping opacity-75 pointer-events-none"></div>}
                    {isSource && !dragState.isDragging && <div className="absolute w-16 h-16 rounded-full border-2 border-amber-400 opacity-50 pointer-events-none"></div>}
                    
                    {isShaking && <div className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-4 border-red-500/60 opacity-80 pointer-events-none animate-shake-target"></div>}

                    {hasBlockedMsg && (
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap z-[70] pointer-events-none">
                            <span className="bg-red-600 text-white font-cinzel font-bold px-3 py-1 rounded-full text-xs shadow-xl animate-blocked-label">
                                {blockedFeedback?.message}
                            </span>
                        </div>
                    )}

                    {stackSize > 0 && owner && !isBeingDragged && (
                        <div className={`absolute z-30 ${isOwner && turnPhase === 'MOVING' ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ top: '-10px' }} onMouseDown={(e) => handleMouseDown(e, shell.id)} onTouchStart={(e) => handleMouseDown(e, shell.id)}>
                           {Array.from({ length: Math.min(stackSize, 9) }).map((_, i) => (
                               <div 
                                key={i} className="absolute left-1/2 -translate-x-1/2 transition-all duration-500"
                                // Staggered offset logic
                                style={{ 
                                    top: `${-(i * 5)}px`, 
                                    left: `${Math.sin(i * 0.8) * 4}px`, 
                                    zIndex: i, 
                                    transform: `translate(-50%, 0) rotate(${Math.sin(i * 1.5 + shell.id) * 12}deg)` 
                                }}
                               >
                                   <AncientCoin color={shellColor} isSelected={false} avatar={shellAvatar} />
                               </div>
                           ))}
                           {stackSize > 1 && (
                               <div 
                                className="absolute left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-600 shadow-md backdrop-blur-sm whitespace-nowrap pointer-events-none"
                                style={{ top: `${-30 - (Math.min(stackSize, 9) * 5)}px`, zIndex: 100 }}
                               >
                                   {stackSize}
                               </div>
                           )}
                        </div>
                    )}
                </div>
            );
        })}

        {/* Animations */}
        {stackingAnim && (
             <div 
                key={stackingAnim.id} className="absolute z-[60] pointer-events-none animate-coin-arc"
                style={{ '--start-x': `${stackingAnim.startX}px`, '--start-y': `${stackingAnim.startY}px`, '--end-x': `${stackingAnim.endX}px`, '--end-y': `${stackingAnim.endY}px`, } as React.CSSProperties}
            >
                 <style dangerouslySetInnerHTML={{__html: `
                    @keyframes coinArc {
                        0% { transform: translate(var(--start-x), var(--start-y)) scale(1); opacity: 0.8; }
                        50% { transform: translate(calc(var(--start-x) + (var(--end-x) - var(--start-x))/2), calc(var(--start-y) + (var(--end-y) - var(--start-y))/2 - 60px)) scale(1.3); opacity: 1; }
                        100% { transform: translate(var(--end-x), var(--end-y)) scale(1); opacity: 1; }
                    }
                    .animate-coin-arc { animation: coinArc 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; transform-origin: center center; margin-left: -20px; margin-top: -24px; }
                `}} />
                <AncientCoin color={stackingAnim.color} isSelected={true} avatar={stackingAnim.avatar} />
            </div>
        )}

        {finishingParticles.map((p, i) => (
            <div key={p.id} className="absolute z-50 pointer-events-none animate-finish-float" style={{ left: p.x, top: p.y, animationDelay: `${i * 100}ms` }}>
                 <style dangerouslySetInnerHTML={{__html: `
                    @keyframes finishFloat {
                        0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
                        50% { transform: translate(-50%, -150px) scale(1.5) rotate(180deg); opacity: 0.8; filter: brightness(1.5); }
                        100% { transform: translate(-50%, -300px) scale(0.5) rotate(360deg); opacity: 0; }
                    }
                    .animate-finish-float { animation: finishFloat 1.5s ease-out forwards; }
                `}} />
                <div className="drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                    <AncientCoin color={p.color} isSelected={true} avatar={p.avatar} />
                </div>
            </div>
        ))}

        {dragState.isDragging && dragState.sourceIndex !== null && (
             <div id="dragged-ghost" className="fixed z-[100] pointer-events-none" style={{ left: dragState.x, top: dragState.y, transform: 'translate(-50%, -50%) scale(1.1)' }}>
                {(() => {
                    const shell = boardState.get(dragState.sourceIndex!);
                    if (!shell) return null;
                    const color = getPlayerColor(shell.owner);
                    const avatar = getPlayerAvatar(shell.owner);
                    return (
                        <div className="relative">
                            {Array.from({ length: Math.min(shell.stackSize, 9) }).map((_, i) => (
                                <div key={i} className="absolute left-1/2 -translate-x-1/2" style={{ top: `${-(i * 4)}px`, zIndex: i, transform: `translate(-50%, 0) rotate(${Math.sin(i * 132 + shell.index) * 20}deg)` }}>
                                    <AncientCoin color={color} isSelected={true} avatar={avatar} />
                                </div>
                            ))}
                        </div>
                    );
                })()}
             </div>
        )}
        
        <div 
            className={`absolute transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2 ${hasFinishMove ? 'opacity-100 cursor-pointer scale-110 z-50' : 'opacity-40 pointer-events-none z-10'}`}
            style={{ left: endBtnPos.x, top: endBtnPos.y }}
            onClick={() => {
                if (hasFinishMove) {
                    const finishMove = validMoves.find(m => m.type === MoveResultType.FINISH);
                    if (finishMove) onSelectMove(finishMove);
                }
            }}
        >
             <div className={`w-24 h-24 border-4 rounded-full flex items-center justify-center border-dashed transition-colors ${hasFinishMove ? 'border-amber-500 bg-amber-900/20 animate-pulse' : 'border-stone-700'}`}>
                <span className={`font-cinzel font-bold uppercase ${hasFinishMove ? 'text-amber-500' : 'text-stone-600'}`}>END</span>
             </div>
        </div>
    </div>
  );
};
