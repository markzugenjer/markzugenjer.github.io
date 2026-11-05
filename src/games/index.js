import { createBrushGame } from './brush.js';
import { createCavityGame } from './cavity.js';

/**
 * Every game listed here gets its own button in the lobby automatically.
 * To add one: copy brush.js as a starting point, then add a line below.
 */
export const GAMES = [
  { id: 'brush', name: 'Brushing Challenge', desc: 'Clean the plaque before time runs out', create: createBrushGame },
  { id: 'cavity', name: 'Cavity Defender', desc: 'Zap the germs attacking the tooth', create: createCavityGame },
];
