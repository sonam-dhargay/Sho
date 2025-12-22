
export enum PlayerColor {
  Red = 'RED',
  Blue = 'BLUE'
}

export interface Player {
  id: PlayerColor;
  name: string;
  coinsInHand: number; // Coins waiting to enter board (Position 0)
  coinsFinished: number; // Coins that have exited (Position > 64)
  colorHex: string;
}

export interface BoardShell {
  index: number; // 1 to 64
  stackSize: number;
  owner: PlayerColor | null;
  isShoMo?: boolean; // True if this stack is a "Sho-mo" (initial 2-coin placement)
}

export type BoardState = Map<number, BoardShell>;

export enum GamePhase {
  SETUP = 'SETUP',
  ROLLING = 'ROLLING',
  MOVING = 'MOVING',
  GAME_OVER = 'GAME_OVER'
}

export enum MoveResultType {
  INVALID = 'INVALID',
  PLACE = 'PLACE',
  STACK = 'STACK',
  KILL = 'KILL',
  FINISH = 'FINISH'
}

export interface DiceRoll {
  die1: number;
  die2: number;
  isPaRa: boolean;
  total: number;
  // Visual positions on the pad (relative px from center)
  visuals?: {
      d1x: number; d1y: number; d1r: number;
      d2x: number; d2y: number; d2r: number;
  }
}

export interface GameLog {
  id: string;
  message: string;
  type: 'info' | 'action' | 'alert';
}

export interface MoveOption {
  sourceIndex: number; // 0 for hand, 1-64 for board
  targetIndex: number;
  consumedValues: number[]; // Which pending move values are used (e.g., [2], [11], or [2, 11])
  type: MoveResultType;
  id?: number; // Unique ID (timestamp) to prevent duplicate animations
}

export enum GameMode {
  LOCAL = 'LOCAL',
  AI = 'AI',
  ONLINE_HOST = 'ONLINE_HOST',
  ONLINE_GUEST = 'ONLINE_GUEST',
  TUTORIAL = 'TUTORIAL'
}

// Network Packets
export interface NetworkPacket {
  type: 'SYNC' | 'ROLL_REQ' | 'MOVE_REQ' | 'RESET_REQ' | 'SKIP_REQ';
  payload?: any;
}