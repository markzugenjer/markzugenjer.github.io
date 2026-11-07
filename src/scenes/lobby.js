import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { makePanel, makeButton, text, card, COLORS } from '../core/ui.js';
import { makeTooth } from '../games/tooth.js';
import { HORIZONS } from '../horizons/index.js';
// The two prototype games (brushing challenge, Cavity Defender) are still registered in
// ../games/index.js but hidden from the lobby; the Games column links to the full games instead.

/** The FDC lobby: pick a horizon to explore or a game to play. Buttons come from the two registries. */
// Built site: https://markzugenjer.github.io/fdc-vr-simulation/ next to this app.
// Local dev: the clinic's own server (npm run dev in fdc-vr-simulation) on port 5174.
const CLINIC_URL = import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:5174/?from=lobby`
  : '/fdc-vr-simulation/?from=lobby';

const DENTIST_URL = import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:5175/?from=lobby`
  : '/fdc-vr-dentist/?from=lobby';

const BUS_URL = import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:5177/?from=lobby`
  : '/fdc-vr-bus-simulator/?from=lobby';

const PLAQUE_URL = import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:5176/?from=lobby`
  : '/fdc-vr-plaque-attack/?from=lobby';

export function createLobby(app) {
  const group = new THREE.Group();
  group.add(makeSky({ top: '#bfe3d7', horizon: '#f1f6ee', bottom: '#f3f6ef' }));
  group.add(new THREE.HemisphereLight(0xffffff, 0xb8c7a4, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 2);
  group.add(sun);

  // Floor: a round platform with a green ring marking where to stand.
  // Disc centres sit a little in front of the spawn point: a disc's centre vertex directly
  // under the camera can confuse near-plane clipping on some GPUs.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#dfe9d6', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.2, -0.4);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.2, 64), new THREE.MeshStandardMaterial({ color: '#f4f6ef', roughness: 0.8 }));
  platform.position.set(0, -0.1, -0.4);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 64), new THREE.MeshBasicMaterial({ color: COLORS.green }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.04, 8, 96), new THREE.MeshStandardMaterial({ color: COLORS.green }));
  edge.rotation.x = Math.PI / 2;
  edge.position.z = -0.4;
  group.add(ground, platform, ring, edge);

  // Menu board
  const board = new THREE.Group();
  board.position.set(0, 0, -2.5);
  group.add(board);

  const title = makePanel(2.5, 0.56, (c, W, H) => {
    card(c, W, H, { r: 0.22 });
    text(c, 'fdc', H * 0.3, H * 0.66, { size: H * 0.52, weight: 800, color: COLORS.green });
    text(c, 'VR Lobby', H * 1.42, H * 0.47, { size: H * 0.24, weight: 700 });
    text(c, 'Explore a horizon, play a game or visit the clinic', H * 1.42, H * 0.76, { size: H * 0.14, color: COLORS.muted });
  });
  title.mesh.position.set(0, 2.25, 0);
  board.add(title.mesh);

  const column = (label, items, x) => {
    const header = makePanel(1.1, 0.12, (c, W, H) => {
      text(c, label.toUpperCase(), 8, H * 0.75, { size: H * 0.62, weight: 800, color: COLORS.muted });
    });
    header.mesh.position.set(x, 1.83, 0);
    board.add(header.mesh);
    items.forEach((item, i) => {
      const b = makeButton(app, { label: item.name, sub: item.desc, w: 1.1, h: 0.27, onSelect: () => app.goTo(item.id) });
      b.position.set(x, 1.6 - i * 0.32, 0);
      board.add(b);
    });
  };
  column('Horizons', HORIZONS, -0.62);
  column('Games', [], 0.62);

  // The FDC Solo clinic simulation is its own page on the same site (the fdc-vr-simulation project).
  const clinic = makeButton(app, {
    label: 'Klinik FDC Solo',
    sub: 'The real clinic in 3D, free walk or as a patient',
    w: 1.1, h: 0.3, tone: 'dark',
    onSelect: () => app.openPage(CLINIC_URL),
  });
  clinic.position.set(-0.62, 0.98, 0);
  board.add(clinic);
  // The games are their own projects: fdc-vr-plaque-attack, fdc-vr-dentist and fdc-vr-bus-simulator
  const plaque = makeButton(app, {
    label: 'FDC Plaque Attack',
    sub: 'Fight plaque germs inside a giant mouth',
    w: 1.1, h: 0.3, tone: 'dark',
    onSelect: () => app.openPage(PLAQUE_URL),
  });
  plaque.position.set(0.62, 1.6, 0);
  board.add(plaque);
  const dentist = makeButton(app, {
    label: 'FDC Dentist',
    sub: 'Be the dentist: treat cartoon patients',
    w: 1.1, h: 0.3, tone: 'dark',
    onSelect: () => app.openPage(DENTIST_URL),
  });
  dentist.position.set(0.62, 1.26, 0);
  board.add(dentist);
  const smileBus = makeButton(app, {
    label: 'FDC Smile Bus',
    sub: 'Drive the Smile Bus through a festive town',
    w: 1.1, h: 0.3, tone: 'dark',
    onSelect: () => app.openPage(BUS_URL),
  });
  smileBus.position.set(0.62, 0.92, 0);
  board.add(smileBus);

  // Help card, tilted up like a lectern
  const help = makePanel(2.3, 0.46, (c, W, H) => {
    card(c, W, H, { r: 0.18, fill: 'rgba(31,42,23,0.88)' });
    const s = H * 0.105;
    const col1 = W * 0.04;
    const col2 = W * 0.53;
    text(c, 'Quest controls', col1, H * 0.22, { size: s * 1.05, weight: 800, color: '#ffffff' });
    text(c, 'Left stick: walk · Right stick: turn', col1, H * 0.44, { size: s, color: 'rgba(255,255,255,0.86)' });
    text(c, 'Trigger: select · B / Y: back to lobby', col1, H * 0.64, { size: s, color: 'rgba(255,255,255,0.86)' });
    text(c, 'Cast to a TV', col2, H * 0.22, { size: s * 1.05, weight: 800, color: COLORS.greenSoft });
    text(c, 'Meta button → Camera → Cast', col2, H * 0.44, { size: s, color: 'rgba(255,255,255,0.86)' });
    text(c, 'Pick your TV or Chromecast', col2, H * 0.64, { size: s, color: 'rgba(255,255,255,0.86)' });
  });
  help.mesh.position.set(0, 0.6, -2.0);
  help.mesh.rotation.x = -0.45;
  group.add(help.mesh);

  // Floating tooth for decoration
  const tooth = makeTooth();
  tooth.scale.setScalar(0.8);
  tooth.position.set(-2.4, 1.6, -2.1);
  group.add(tooth);

  // Soft floating bubbles
  const bubbles = [];
  const bubbleMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.1 });
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.1, 16, 12), bubbleMat);
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    b.userData.base = new THREE.Vector3(Math.cos(a) * r, 0.6 + Math.random() * 2.6, Math.sin(a) * r);
    b.userData.p = Math.random() * 10;
    group.add(b);
    bubbles.push(b);
  }

  return {
    group,
    spawn: { x: 0, z: 0, yaw: 0 },
    bounds: 3.6,
    update(dt, t) {
      tooth.rotation.y += dt * 0.5;
      tooth.position.y = 1.6 + Math.sin(t * 1.2) * 0.06;
      for (const b of bubbles) {
        b.position.copy(b.userData.base);
        b.position.y += Math.sin(t * 0.6 + b.userData.p) * 0.25;
      }
    },
  };
}
