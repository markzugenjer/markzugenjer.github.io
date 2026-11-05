import { App } from './core/app.js';
import { setupOverlay } from './overlay.js';
import { createLobby } from './scenes/lobby.js';
import { HORIZONS } from './horizons/index.js';
import { GAMES } from './games/index.js';

// Every scene the app can open, by id. Horizons and games register themselves in their index.js.
const scenes = { lobby: createLobby };
for (const item of [...HORIZONS, ...GAMES]) scenes[item.id] = item.create;

const app = new App(document.getElementById('app'), scenes);
setupOverlay(app);

// Open a scene directly for testing, e.g. http://localhost:5173/?scene=garden
const requested = new URLSearchParams(window.location.search).get('scene');
app.goTo(scenes[requested] ? requested : 'lobby');

window.fdcApp = app; // handy in the browser console
