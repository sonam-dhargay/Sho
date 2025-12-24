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
    avatar: '🐲'
  },
  {
    id: PlayerColor.Blue,
    name: 'Blue Player',
    colorHex: '#3b82f6', // blue-500
    coinsInHand: COINS_PER_PLAYER,
    coinsFinished: 0,
    avatar: '🐯'
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
  { id: 'gold', name: 'Gold', hex: '#eab308' },      // Yellow-500
  { id: 'amethyst', name: 'Amethyst', hex: '#a855f7' }, // Purple-500
];

export const AVATAR_PRESETS = ["🐲", "🐯", "🦁", "🦅", "☸️"];

// Point to the fetchable virtual asset handled by sw.js
export const SHO_LOGO_URI = "sho_logo.png";
