import { createPlaza } from './plaza.js';
import { createGarden } from './garden.js';

/**
 * Every horizon listed here gets its own button in the lobby automatically.
 * To add one: copy plaza.js, change the config, then add a line below.
 */
export const HORIZONS = [
  { id: 'plaza', name: 'FDC Plaza', desc: 'Sunny plaza with a fountain', create: createPlaza },
  { id: 'garden', name: 'Sunset Garden', desc: 'Pond, lanterns and fireflies', create: createGarden },
];
