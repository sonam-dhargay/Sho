
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

const CowrieShell: React.FC<{ angle: number; isTarget: boolean; hasCoin: boolean }> = ({ angle, isTarget, hasCoin }) => {
  const rotation = (angle * 180 / Math.PI) + 90;

  return (
    <div 
      className={`transition-transform duration-300 pointer-events-none flex items-center justify-center ${hasCoin ? 'w-16 h-20' : 'w-14 h-18'}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg viewBox="0 0 100 130" className={`w-full h-full drop-shadow-xl transition-all ${isTarget ? 'filter brightness-125 sepia scale-110' : ''}`}>
        <defs>
          <radialGradient id="shellBody" cx="40%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#fdfbf7" />
            <stop offset="60%" stopColor="#efedea" />
            <stop offset="100%" stopColor="#d6d3d1" />
          </radialGradient>
        </defs>
        
        {/* Slightly larger hit-box/visual footprint for the shell */}
        <ellipse cx="50" cy="65" rx="48" ry="63" fill="rgba(0,0,0,0.2)" />
        <ellipse cx="50" cy="65" rx="45" ry="60" fill="url(#shellBody)" stroke="#a8a29e" strokeWidth="2" />
        
        {/* The identifying "mouth" of the cowrie */}
        <path d="M50 15 C 38 40, 38 90, 50 115 C 62 90, 62 40, 50 15" fill="#44403c" stroke="#292524" strokeWidth="1"/>
        
        {/* Stylized teeth/ridges */}
        <g stroke="#e7e5e4" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
           <line x1="47" y1="35" x2="38" y2="35" />
           <line x1="46" y1="50" x2="35" y2="50" />
           <line x1="46" y1="65" x2="33" y2="65" />
           <line x1="46" y1="80" x2="35" y2="80" />
           <line x1="47" y1="95" x2="38" y2="95" />
           
           <line x1="53" y1="35" x2="62" y2="35" />
           <line x1="54" y1="50" x2="65" y2="50" />
           <line x1="54" y1="65" x2="67" y2="65" />
           <line x1="54" y1="80" x2="65" y2="80" />
           <line x1="53" y1="95" x2="62" y2="95" />
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
        shadow-[4px_8px_12px_rgba(0,0,0,0.8),inset_0px_2px_4px_rgba(255,255,255,0.25)]
        border-2 border-white/20
        flex items-center justify-center
        ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-stone-900 z-50' : ''}
      `}
      style={{
        background: `radial-gradient(circle at 35% 35%, ${color}, #000000)`
      }}
    >
      {avatar ? (
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/30 shadow-inner">
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
      <div className="absolute top-2 left-3 w-4 h-3 bg-white opacity-25 rounded-full blur-[1px] pointer-events-none"></div>
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
        style = {}; 
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

  // --- Dynamic Hyper-Elastic Spiral Layout ---
  // To prevent overlap, we give occupied shells massive weight to "stretch" the path
  const shells = useMemo(() => {
    const weights = Array.from({ length: TOTAL_SHELLS }, (_, i) => {
        const idx = i + 1;
        const shell = boardState.get(idx);
        const prevShell = i > 0 ? boardState.get(i) : null;
        const nextShell = i < TOTAL_SHELLS - 1 ? boardState.get(i + 2) : null;
        
        let w = 1.0;
        // Occupied shells get extreme weight to push others away
        if (shell && shell.stackSize > 0) {
            w += 15.0; 
        }
        // Neighbors also expand to ensure clear dividing space
        if ((prevShell && prevShell.stackSize > 0) || (nextShell && nextShell.stackSize > 0)) {
            w += 5.0;
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

      // Expanded spiral dimensions for clarity
      const baseAngle = t * Math.PI * 5.2 + 2.8; 
      const baseRadius = 135 + (t * 265); 
      
      const jitterAngle = (pseudoRandom(idx * 13.5) - 0.5) * 0.05; 
      const jitterRadius = (pseudoRandom(idx * 7.2) - 0.5) * 8; 
      
      const angle = baseAngle + jitterAngle;
      const radius = baseRadius + jitterRadius;
      
      const x = CENTER_X + radius * Math.cos(angle);
      const y = CENTER_Y + radius * Math.sin(angle);

      // Stable tangent orientation
      const nextT = Math.min(1, t + 0.005);
      const nextAngle = nextT * Math.PI * 5.2 + 2.8;
      const nextRadius = 135 + (nextT * 265);
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
     const dist = 110;
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
        if (targetShell.stackSize > moverSize) msg = "TOO BIG";
    } else {
        if (!isNinerMode && targetShell.stackSize + moverSize === 9) msg = "FORBIDDEN";
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
              if (move) onSelectMove(move);
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
            <div className="w-[18rem] h-[18rem] bg-[#3f2e26] rounded-full blur-xl opacity-60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative w-64 h-64 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.9)] border-4 border-[#271c19] overflow-hidden flex items-center justify-center bg-[#291d1a]">
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] mix-blend-overlay"></div>
                <div className="flex flex-col items-center opacity-40 mix-blend-screen">
                    <span className="font-serif text-[#8b5e3c] text-6xl mb-1">ཤོ</span>
                    <span className="font-cinzel text-[#8b5e3c] text-7xl font-bold tracking-widest drop-shadow-lg">SHO</span>
                </div>
                {(isRolling || currentRoll) && (
                    <div className="absolute inset-0">
                         {isRolling ? (
                             <>
                                <div className="absolute left-1/2 top-1/2 -ml-[15px] -mt-[15px]">
                                    <BoardDie value={1} x={0} y={0} rotation={0} isRolling={true} />
                                </div>
                                <div className="absolute left-1/2 top-1/2 ml-[15px] mt-[15px]">
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
                d={d3.line().curve(d3.curveCatmullRom.alpha(0.5))(shells.map(s => [s.x, s.y])) || ""} 
                fill="none" 
                stroke="#44403c" 
                strokeWidth="14" 
                strokeLinecap="round" 
                className="opacity-25 blur-sm transition-all duration-500" 
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
                    className={`absolute -ml-8 -mt-10 flex items-center justify-center z-20 transition-all duration-500 ease-in-out ${isTarget ? 'z-40' : ''}`}
                    style={{ left: shell.x, top: shell.y, width: '64px', height: '80px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!dragState.isDragging) {
                            if (isTarget && moveTarget) onSelectMove(moveTarget);
                            else if (selectedSource !== undefined && selectedSource !== null && selectedSource !== shell.id) {
                                if (isOwner) onShellClick?.(shell.id);
                                else triggerBlockedFeedback(shell.id, selectedSource);
                            } else onShellClick?.(shell.id);
                        }
                    }}
                >
                    <CowrieShell angle={shell.angle} isTarget={isTarget} hasCoin={stackSize > 0} />

                    {isTarget && <div className="absolute w-16 h-16 rounded-full border-4 border-green-500 animate-ping opacity-60 pointer-events-none"></div>}
                    {isSource && !dragState.isDragging && <div className="absolute w-20 h-20 rounded-full border-2 border-amber-400 opacity-40 pointer-events-none"></div>}
                    {isShaking && <div className="absolute left-1/2 top-1/2 w-20 h-20 rounded-full border-4 border-red-500/60 opacity-80 animate-shake-target pointer-events-none"></div>}
                    
                    {hasBlockedMsg && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-[70] pointer-events-none">
                            <span className="bg-red-600 text-white font-cinzel font-bold px-3 py-1 rounded-full text-xs shadow-2xl animate-blocked-label">
                                {blockedFeedback?.message}
                            </span>
                        </div>
                    )}

                    {stackSize > 0 && owner && !isBeingDragged && (
                        <div 
                          className={`absolute z-30 transition-all duration-500 ${isOwner && turnPhase === 'MOVING' ? 'cursor-grab active:cursor-grabbing' : ''}`} 
                          style={{ top: '0px' }} 
                          onMouseDown={(e) => handleMouseDown(e, shell.id)} 
                          onTouchStart={(e) => handleMouseDown(e, shell.id)}
                        >
                           {Array.from({ length: Math.min(stackSize, 9) }).map((_, i) => (
                               <div 
                                 key={i} 
                                 className="absolute left-1/2 -translate-x-1/2 transition-transform duration-500" 
                                 style={{ 
                                   // Vertical staggered lean + horizontal offset to keep shell visible
                                   top: `${-(i * 6) + 5}px`, 
                                   left: `${Math.sin(i * 0.7) * 5}px`,
                                   zIndex: i, 
                                   transform: `translate(-50%, 0) rotate(${Math.sin(i * 1.8 + shell.id) * 15}deg)` 
                                 }}
                               >
                                   <AncientCoin color={shellColor} isSelected={false} avatar={shellAvatar} />
                               </div>
                           ))}
                           {stackSize > 1 && (
                               <div 
                                className="absolute left-1/2 -translate-x-1/2 bg-black/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-600 shadow-xl backdrop-blur-sm whitespace-nowrap pointer-events-none"
                                style={{ top: `${-35 - (Math.min(stackSize, 9) * 6)}px`, zIndex: 100 }}
                               >
                                   {stackSize}
                               </div>
                           )}
                        </div>
                    )}
                </div>
            );
        })}

        {/* Animations and Overlays */}
        {stackingAnim && (
             <div 
                key={stackingAnim.id} className="absolute z-[60] pointer-events-none animate-coin-arc"
                style={{ '--start-x': `${stackingAnim.startX}px`, '--start-y': `${stackingAnim.startY}px`, '--end-x': `${stackingAnim.endX}px`, '--end-y': `${stackingAnim.endY}px`, } as React.CSSProperties}
            >
                 <style dangerouslySetInnerHTML={{__html: `
                    @keyframes coinArc {
                        0% { transform: translate(var(--start-x), var(--start-y)) scale(1); opacity: 0.8; }
                        50% { transform: translate(calc(var(--start-x) + (var(--end-x) - var(--start-x))/2), calc(var(--start-y) + (var(--end-y) - var(--start-y))/2 - 80px)) scale(1.4); opacity: 1; }
                        100% { transform: translate(var(--end-x), var(--end-y)) scale(1); opacity: 1; }
                    }
                    .animate-coin-arc { animation: coinArc 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; transform-origin: center center; margin-left: -20px; margin-top: -24px; }
                `}} />
                <AncientCoin color={stackingAnim.color} isSelected={true} avatar={stackingAnim.avatar} />
            </div>
        )}

        <div 
            className={`absolute transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2 ${validMoves.some(m => m.type === MoveResultType.FINISH) ? 'opacity-100 cursor-pointer scale-110' : 'opacity-60 pointer-events-none'}`}
            style={{ left: endBtnPos.x, top: endBtnPos.y }}
        >
             <div className="w-28 h-28 border-4 rounded-full flex items-center justify-center border-dashed border-stone-700 bg-stone-900/40">
                <span className="font-cinzel font-bold text-stone-500 uppercase tracking-widest">FINISH</span>
             </div>
        </div>
    </div>
  );
};
