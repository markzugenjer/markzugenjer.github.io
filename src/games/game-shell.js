import * as THREE from 'three';
import { makePanel, makeButton, text, card, COLORS } from '../core/ui.js';

/**
 * Shared start / result screen and in-game HUD for every game.
 *
 *   const shell = makeGameShell(app, group, { anchor, hudAnchor, hudSize, drawHud, onStart });
 *   shell.showInfo('Title', ['line 1', 'line 2'], 'Start');   // before and after a round
 *   shell.showHud();                                          // while playing
 *   shell.hud.redraw(state);                                  // refresh the HUD
 */
export function makeGameShell(app, group, {
  anchor = new THREE.Vector3(0, 1.85, -1.4),
  hudAnchor = new THREE.Vector3(0, 1.75, -1.4),
  hudSize = [1.3, 0.3],
  drawHud,
  onStart,
}) {
  let content = { heading: '', lines: [] };

  const info = makePanel(1.5, 0.6, (c, W, H) => {
    card(c, W, H, { r: 0.12 });
    text(c, content.heading, W * 0.06, H * 0.25, { size: H * 0.13, weight: 800 });
    content.lines.forEach((line, i) => {
      text(c, line, W * 0.06, H * 0.45 + i * H * 0.14, { size: H * 0.078, color: COLORS.muted, maxWidth: W * 0.88 });
    });
  });
  info.mesh.position.copy(anchor);
  group.add(info.mesh);

  const primary = makeButton(app, { label: 'Start', w: 0.6, h: 0.18, onSelect: () => onStart() });
  primary.position.set(anchor.x - 0.36, anchor.y - 0.44, anchor.z + 0.02);
  const lobby = makeButton(app, { label: 'Lobby', w: 0.6, h: 0.18, tone: 'light', onSelect: () => app.goTo('lobby') });
  lobby.position.set(anchor.x + 0.36, anchor.y - 0.44, anchor.z + 0.02);
  group.add(primary, lobby);

  const hud = makePanel(hudSize[0], hudSize[1], (c, W, H, state) => {
    card(c, W, H, { r: 0.3, fill: 'rgba(31,42,23,0.84)' });
    if (state) drawHud(c, W, H, state);
  });
  hud.mesh.position.copy(hudAnchor);
  group.add(hud.mesh);

  const quit = makeButton(app, { label: 'Quit to lobby', w: 0.5, h: 0.15, tone: 'dark', onSelect: () => app.goTo('lobby') });
  quit.position.set(0.95, 1.05, -1.05);
  quit.rotation.y = -0.55;
  group.add(quit);

  return {
    hud,
    showInfo(heading, lines, primaryLabel = 'Start') {
      content = { heading, lines };
      info.redraw();
      primary.userData.setLabel(primaryLabel);
      info.mesh.visible = primary.visible = lobby.visible = true;
      hud.mesh.visible = quit.visible = false;
    },
    showHud() {
      info.mesh.visible = primary.visible = lobby.visible = false;
      hud.mesh.visible = quit.visible = true;
    },
  };
}
