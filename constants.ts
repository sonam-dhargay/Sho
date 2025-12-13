
import { PlayerColor } from './types';

export const TOTAL_SHELLS = 64;
export const COINS_PER_PLAYER = 9;

export const PLAYERS_CONFIG = [
  {
    id: PlayerColor.Red,
    name: 'Red Player',
    colorHex: '#ef4444', // red-500
    coinsInHand: COINS_PER_PLAYER,
    coinsFinished: 0,
  },
  {
    id: PlayerColor.Blue,
    name: 'Blue Player',
    colorHex: '#3b82f6', // blue-500
    coinsInHand: COINS_PER_PLAYER,
    coinsFinished: 0,
  }
];

// Visual constants for the spiral board
export const BOARD_SIZE = 800;
export const CENTER_X = BOARD_SIZE / 2;
export const CENTER_Y = BOARD_SIZE / 2;

export const COLOR_PALETTE = [
  { id: 'ruby', name: 'Ruby', hex: '#ef4444' },      // Red-500
  { id: 'sapphire', name: 'Sapphire', hex: '#3b82f6' }, // Blue-500
  { id: 'emerald', name: 'Emerald', hex: '#22c55e' },   // Green-500
  { id: 'amethyst', name: 'Amethyst', hex: '#a855f7' }, // Purple-500
  { id: 'amber', name: 'Amber', hex: '#f97316' },     // Orange-500
  { id: 'turquoise', name: 'Turquoise', hex: '#06b6d4' }, // Cyan-500
  { id: 'rose', name: 'Rose', hex: '#e11d48' },      // Rose-600
  { id: 'gold', name: 'Gold', hex: '#eab308' },      // Yellow-500
  { id: 'slate', name: 'Slate', hex: '#64748b' },    // Slate-500
];
