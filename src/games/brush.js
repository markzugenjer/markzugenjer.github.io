import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { text, COLORS } from '../core/ui.js';
import { store } from '../core/util.js';
import { toothCrownGeometry } from './tooth.js';
import { makeGameShell } from './game-shell.js';

const DURATION = 40; // seconds per round
const SCRUB_SPEED = 1.6; // how fast holding the trigger cleans a spot
const BEST_KEY = 'fdc.brush.best';

/**
 * Brushing Challenge: clean every yellow plaque spot on a row of giant teeth
 * before the timer runs out. Point at a spot and HOLD the trigger (or hold the mouse button).
 */
export function createBrushGame(app) {
  const group = new THREE.Group();
  group.add(makeSky({ top: '#a9d8ec', horizon: '#eef7fb', bottom: '#e9f1f4' }));
  group.add(new THREE.HemisphereLight(0xffffff, 0x9fb3bd, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1.5, 4, 3);
  group.add(key);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: '#e3ecef', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -0.6; // keep the disc's centre vertex out from under the camera
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 48), new THREE.MeshBasicMaterial({ color: COLORS.green }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  group.add(floor, ring);

  // Giant mouth: pink gum with six teeth
  const mouth = new THREE.Group();
  mouth.position.set(0, 1.0, -1.3);
  group.add(mouth);
  const gum = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.17, 2.35, 8, 24),
    new THREE.MeshStandardMaterial({ color: '#e88f9c', roughness: 0.55 }),
  );
  gum.rotation.z = Math.PI / 2;
  gum.scale.set(1, 1, 1.5);
  mouth.add(gum);

  const crownGeo = toothCrownGeometry();
  const toothMat = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.25 });
  const plaqueGeo = new THREE.SphereGeometry(0.055, 14, 10);
  const spots = [];
  const TOOTH_SCALE = 0.42;
  for (let i = 0; i < 6; i++) {
    const x = -1.0 + i * 0.4;
    const tooth = new THREE.Mesh(crownGeo, toothMat);
    tooth.position.set(x, 0.08, 0);
    tooth.scale.setScalar(TOOTH_SCALE);
    mouth.add(tooth);

    // Three plaque spots on the front of each tooth
    [[-0.55, 0.1], [0.0, 0.2], [0.55, 0.13]].forEach(([angle, h]) => {
      const radius = 0.41 * TOOTH_SCALE + 0.008;
      const spot = new THREE.Mesh(
        plaqueGeo,
        new THREE.MeshStandardMaterial({ color: '#d8bf4a', roughness: 0.95, transparent: true }),
      );
      spot.position.set(x + Math.sin(angle) * radius, 0.08 + h, Math.cos(angle) * radius);
      spot.rotation.y = angle;
      spot.scale.set(1, 1, 0.45);
      spot.userData.dirt = 1;
      mouth.add(spot);
      app.addTarget(spot, { enabled: false, onHold: (hit, p, dt) => scrub(spot, dt) });
      spots.push(spot);
    });
  }

  // Foam bubbles when a spot is cleaned
  const foam = [];
  const foamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true });
  const foamGeo = new THREE.SphereGeometry(0.018, 8, 6);
  for (let i = 0; i < 48; i++) {
    const b = new THREE.Mesh(foamGeo, foamMat.clone());
    b.visible = false;
    b.userData = { life: 0, vel: new THREE.Vector3() };
    group.add(b);
    foam.push(b);
  }
  const _world = new THREE.Vector3();
  function burst(obj, count = 6) {
    obj.getWorldPosition(_world);
    for (let n = 0, i = 0; i < foam.length && n < count; i++) {
      const b = foam[i];
      if (b.visible) continue;
      b.visible = true;
      b.position.copy(_world);
      b.userData.life = 0.6;
      b.userData.vel.set((Math.random() - 0.5) * 0.6, Math.random() * 0.6 + 0.2, Math.random() * 0.4 + 0.1);
      n++;
    }
  }

  // Toothbrushes in the player's hands (VR only)
  const brushes = app.pointers.controllers.map((c) => {
    const b = makeToothbrush();
    c.object.add(b);
    return b;
  });

  let state = 'ready';
  let timeLeft = DURATION;
  let cleaned = 0;
  let shownSecond = -1;
  let foamTimer = 0;

  const shell = makeGameShell(app, group, {
    anchor: new THREE.Vector3(0, 1.95, -1.35),
    hudAnchor: new THREE.Vector3(0, 1.72, -1.35),
    drawHud(c, W, H, s) {
      text(c, `Time ${s.time}s`, H * 0.35, H * 0.62, { size: H * 0.34, weight: 800, color: '#ffffff' });
      text(c, `Clean ${s.cleaned} / ${s.total}`, W - H * 0.35, H * 0.62, { size: H * 0.3, weight: 700, color: COLORS.greenSoft, align: 'right' });
    },
    onStart: start,
  });

  const intro = () => {
    const best = store.get(BEST_KEY, 0);
    shell.showInfo('Brushing Challenge', [
      `Clean all ${spots.length} yellow plaque spots in ${DURATION} seconds.`,
      'Point at a spot and HOLD the trigger (desktop: hold the mouse).',
      best ? `Best score: ${best}` : 'Tip: sweep across a tooth to clean faster.',
    ], 'Start');
  };
  intro();

  function start() {
    state = 'play';
    timeLeft = DURATION;
    cleaned = 0;
    shownSecond = -1;
    for (const s of spots) {
      s.userData.dirt = 1;
      s.visible = true;
      s.userData.enabled = true;
      s.scale.set(1, 1, 0.45);
      s.material.opacity = 1;
    }
    shell.showHud();
    refreshHud(true);
  }

  function finish(allClean) {
    state = 'done';
    for (const s of spots) s.userData.enabled = false;
    const score = cleaned * 10 + (allClean ? Math.ceil(timeLeft) * 5 : 0);
    const best = Math.max(score, store.get(BEST_KEY, 0));
    store.set(BEST_KEY, best);
    app.sfx.play(allClean ? 'win' : 'lose');
    shell.showInfo(allClean ? 'Sparkling clean!' : "Time's up!", [
      `You cleaned ${cleaned} of ${spots.length} spots${allClean ? ` with ${Math.ceil(timeLeft)}s to spare` : ''}.`,
      `Score: ${score}`,
      `Best score: ${best}`,
    ], 'Play again');
  }

  function scrub(spot, dt) {
    if (state !== 'play' || spot.userData.dirt <= 0) return;
    spot.userData.dirt -= dt * SCRUB_SPEED;
    const d = Math.max(0, spot.userData.dirt);
    spot.scale.set(0.5 + 0.5 * d, 0.5 + 0.5 * d, 0.45);
    spot.material.opacity = 0.3 + 0.7 * d;
    foamTimer -= dt;
    if (foamTimer <= 0) { burst(spot, 1); foamTimer = 0.08; }
    if (d <= 0) {
      spot.visible = false;
      spot.userData.enabled = false;
      cleaned++;
      burst(spot, 8);
      app.sfx.play('clean');
      refreshHud(true);
      if (cleaned === spots.length) finish(true);
    }
  }

  function refreshHud(force = false) {
    const sec = Math.ceil(timeLeft);
    if (!force && sec === shownSecond) return;
    shownSecond = sec;
    shell.hud.redraw({ time: sec, cleaned, total: spots.length });
  }

  return {
    group,
    spawn: { x: 0, z: 0, yaw: 0 },
    bounds: 1.2,
    update(dt) {
      if (state === 'play') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; finish(false); } else refreshHud();
      }
      for (const b of foam) {
        if (!b.visible) continue;
        b.userData.life -= dt;
        if (b.userData.life <= 0) { b.visible = false; continue; }
        b.position.addScaledVector(b.userData.vel, dt);
        b.userData.vel.y -= dt * 0.8;
        b.material.opacity = b.userData.life / 0.6;
      }
    },
    dispose() {
      app.pointers.controllers.forEach((c, i) => c.object.remove(brushes[i]));
      for (const b of brushes) b.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    },
  };
}

function makeToothbrush() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.014, 0.17, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.green, roughness: 0.4 }),
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.z = -0.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.045), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
  head.position.z = -0.155;
  const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.02, 0.038), new THREE.MeshStandardMaterial({ color: '#8fd3ea' }));
  bristles.position.set(0, 0.014, -0.155);
  g.add(handle, head, bristles);
  return g;
}
