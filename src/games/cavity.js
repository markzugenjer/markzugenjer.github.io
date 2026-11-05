import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { text, COLORS } from '../core/ui.js';
import { store } from '../core/util.js';
import { makeTooth } from './tooth.js';
import { makeGameShell } from './game-shell.js';

const MAX_HEALTH = 5;
const WAVE_SECONDS = 20;
const BEST_KEY = 'fdc.cavity.best';
const GERM_COLORS = ['#7cc24a', '#9b5de5', '#4cc9a7', '#e0b73a'];

/** Lumpy germ body. The bumps depend only on direction, so the mesh stays closed. */
function germGeometry() {
  const g = new THREE.IcosahedronGeometry(0.26, 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const bump = 1 + 0.14 * Math.sin(n.x * 9) * Math.sin(n.y * 8 + 1) * Math.sin(n.z * 7 + 2);
    v.multiplyScalar(bump);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Cavity Defender: germs fly at a giant tooth. Point and pull the trigger to zap them
 * before they reach it. Each wave is faster. Five hits and the tooth gets a cavity.
 */
export function createCavityGame(app) {
  const group = new THREE.Group();
  group.add(makeSky({ top: '#14162e', horizon: '#4b3a78', bottom: '#1d1f36' }));
  group.add(new THREE.HemisphereLight(0xb7bdff, 0x1a1a2a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 5, 4);
  group.add(key);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = Math.random() * 0.9 + 0.08;
    const r = Math.sqrt(1 - y * y) * 150;
    starPos.set([Math.cos(a) * r, y * 150, Math.sin(a) * r], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false }));
  stars.frustumCulled = false;
  group.add(stars);

  // Floor with target rings
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#25283f', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -3; // centred on the tooth, not under the camera
  group.add(floor);
  for (const r of [2, 4, 7, 11, 16]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.04, 96), new THREE.MeshBasicMaterial({ color: '#3d4270' }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.005, -3);
    group.add(ring);
  }

  // The tooth you defend
  const TOOTH_POS = new THREE.Vector3(0, 1.45, -3.2);
  const tooth = makeTooth();
  tooth.scale.setScalar(1.25);
  tooth.position.copy(TOOTH_POS);
  group.add(tooth);
  const toothMat = tooth.userData.material;
  const healthy = new THREE.Color('#fbfaf5');
  const decayed = new THREE.Color('#d9c48a');
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 64), new THREE.MeshBasicMaterial({ color: COLORS.greenSoft, transparent: true, opacity: 0.6 }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(TOOTH_POS.x, 0.01, TOOTH_POS.z);
  group.add(glow);

  // Laser beam shown briefly on each zap
  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: '#c8ff7a', transparent: true }));
  laser.frustumCulled = false;
  laser.visible = false;
  group.add(laser);
  let laserLife = 0;

  const GEO = germGeometry();
  const eyeGeo = new THREE.SphereGeometry(0.07, 12, 8);
  const pupilGeo = new THREE.SphereGeometry(0.035, 10, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#111111' });
  const germs = [];

  let state = 'ready';
  let health = MAX_HEALTH;
  let score = 0;
  let wave = 1;
  let elapsed = 0;
  let spawnTimer = 0;
  let flash = 0;

  const shell = makeGameShell(app, group, {
    anchor: new THREE.Vector3(0, 1.8, -1.6),
    hudAnchor: new THREE.Vector3(TOOTH_POS.x, 2.55, TOOTH_POS.z),
    hudSize: [1.8, 0.3],
    drawHud(c, W, H, s) {
      text(c, `Wave ${s.wave}`, H * 0.4, H * 0.64, { size: H * 0.32, weight: 800, color: '#ffffff' });
      text(c, `Score ${s.score}`, W * 0.44, H * 0.64, { size: H * 0.3, weight: 700, color: COLORS.greenSoft, align: 'center' });
      for (let i = 0; i < MAX_HEALTH; i++) {
        c.beginPath();
        c.arc(W - H * 0.45 - (MAX_HEALTH - 1 - i) * H * 0.34, H * 0.52, H * 0.11, 0, Math.PI * 2);
        c.fillStyle = i < s.health ? '#ffffff' : 'rgba(255,255,255,0.2)';
        c.fill();
      }
    },
    onStart: start,
  });

  const intro = () => {
    const best = store.get(BEST_KEY, 0);
    shell.showInfo('Cavity Defender', [
      'Germs are flying at the tooth. Zap them before they land!',
      'Point and pull the trigger (desktop: click a germ).',
      best ? `Best score: ${best}` : `The tooth can take ${MAX_HEALTH} hits. Waves get faster.`,
    ], 'Start');
  };
  intro();

  function start() {
    for (const g of [...germs]) removeGerm(g);
    state = 'play';
    health = MAX_HEALTH;
    score = 0;
    wave = 1;
    elapsed = 0;
    spawnTimer = 1;
    toothMat.color.copy(healthy);
    shell.showHud();
    refreshHud();
  }

  function gameOver() {
    state = 'over';
    for (const g of [...germs]) removeGerm(g);
    const best = Math.max(score, store.get(BEST_KEY, 0));
    store.set(BEST_KEY, best);
    app.sfx.play('lose');
    shell.showInfo('The tooth got a cavity!', [
      `You reached wave ${wave}.`,
      `Score: ${score}`,
      `Best score: ${best}`,
    ], 'Play again');
  }

  function refreshHud() {
    shell.hud.redraw({ wave, score, health });
  }

  function spawnGerm() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(GEO, new THREE.MeshStandardMaterial({
      color: GERM_COLORS[Math.floor(Math.random() * GERM_COLORS.length)], roughness: 0.6, flatShading: true,
    }));
    g.add(body);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx * 0.09, 0.07, 0.22);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(sx * 0.09, 0.07, 0.28);
      g.add(eye, pupil);
    }
    const a = (Math.random() - 0.5) * 2.2;
    const R = 13;
    g.position.set(TOOTH_POS.x + Math.sin(a) * R, 0.7 + Math.random() * 2.2, TOOTH_POS.z - Math.cos(a) * R);
    g.userData = { body, phase: Math.random() * 10, dying: 0 };
    app.addTarget(body, { onSelect: (hit, p) => zap(g, hit, p) });
    group.add(g);
    germs.push(g);
  }

  function removeGerm(g) {
    app.removeTarget(g.userData.body);
    g.userData.body.material.dispose();
    group.remove(g);
    germs.splice(germs.indexOf(g), 1);
  }

  const _origin = new THREE.Vector3();
  function zap(g, hit, p) {
    if (state !== 'play' || g.userData.dying) return;
    g.userData.dying = 0.2;
    g.userData.body.userData.enabled = false;
    score += 10 * wave;
    refreshHud();
    app.sfx.play('zap');
    app.pointers.originOf(p, _origin);
    laserGeo.attributes.position.setXYZ(0, _origin.x, _origin.y, _origin.z);
    laserGeo.attributes.position.setXYZ(1, hit.point.x, hit.point.y, hit.point.z);
    laserGeo.attributes.position.needsUpdate = true;
    laser.visible = true;
    laserLife = 0.1;
  }

  const _dir = new THREE.Vector3();
  const _cam = new THREE.Vector3();

  return {
    group,
    spawn: { x: 0, z: 0, yaw: 0 },
    bounds: 1.5,
    update(dt, t) {
      tooth.rotation.y += dt * 0.4;
      tooth.position.y = TOOTH_POS.y + Math.sin(t * 1.5) * 0.04;
      glow.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;

      if (laserLife > 0) { laserLife -= dt; laser.material.opacity = laserLife / 0.1; if (laserLife <= 0) laser.visible = false; }
      if (flash > 0) { flash -= dt; toothMat.emissive.setRGB(flash * 2.5, 0, 0); } else toothMat.emissive.setRGB(0, 0, 0);

      if (state === 'play') {
        elapsed += dt;
        const newWave = 1 + Math.floor(elapsed / WAVE_SECONDS);
        if (newWave !== wave) { wave = newWave; refreshHud(); }
        spawnTimer -= dt;
        const maxAlive = Math.min(16, 5 + wave * 2);
        if (spawnTimer <= 0 && germs.length < maxAlive) {
          spawnGerm();
          spawnTimer = Math.max(0.45, 1.7 - wave * 0.15);
        }
      }

      app.camera.getWorldPosition(_cam);
      const speed = 0.9 + wave * 0.22;
      for (const g of [...germs]) {
        const u = g.userData;
        if (u.dying) {
          u.dying -= dt;
          g.scale.setScalar(1 + (0.2 - u.dying) * 4);
          u.body.material.transparent = true;
          u.body.material.opacity = Math.max(0, u.dying / 0.2);
          if (u.dying <= 0) removeGerm(g);
          continue;
        }
        _dir.copy(TOOTH_POS).sub(g.position);
        const dist = _dir.length();
        if (dist < 0.75) {
          removeGerm(g);
          if (state === 'play') {
            health--;
            flash = 0.3;
            toothMat.color.copy(healthy).lerp(decayed, 1 - health / MAX_HEALTH);
            app.sfx.play('hit');
            refreshHud();
            if (health <= 0) gameOver();
          }
          continue;
        }
        _dir.multiplyScalar(1 / dist);
        g.position.addScaledVector(_dir, speed * dt);
        g.position.y += Math.sin(t * 3 + u.phase) * 0.3 * dt;
        g.position.x += Math.cos(t * 2.3 + u.phase) * 0.25 * dt;
        g.lookAt(_cam);
      }
    },
  };
}
