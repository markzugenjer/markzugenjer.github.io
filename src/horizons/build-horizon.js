import * as THREE from 'three';
import { makeSky } from '../core/sky.js';
import { makePanel, makeButton, text, card, COLORS } from '../core/ui.js';
import { rng, store } from '../core/util.js';
import { ChillMusic } from '../core/music.js';

/**
 * Turns a small config object into a full walkable environment.
 * Every horizon gets: sky, lighting, ground, fog, a name sign and a "Back to lobby" button.
 * The config's `build(ctx)` adds the unique props; `ctx.onUpdate(fn)` adds animation.
 *
 * See src/horizons/plaza.js for a complete example, and README.md ("Add a new horizon").
 */
export function buildHorizon(app, cfg) {
  const group = new THREE.Group();
  const rand = rng(cfg.seed ?? 1);
  const spawn = cfg.spawn ?? { x: 0, z: 0, yaw: 0 };

  group.add(makeSky(cfg.sky));

  const L = cfg.light;
  group.add(new THREE.HemisphereLight(L.sky, L.ground, L.hemi));
  const sun = new THREE.DirectionalLight(L.sun, L.sunIntensity);
  sun.position.set(...L.sunDir);
  group.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(150, 64),
    new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -0.5; // keep the disc's centre vertex from sitting exactly under a player at the origin
  group.add(ground);

  const updaters = [];
  const disposers = [];
  const ctx = { group, rand, app, onUpdate: (fn) => updaters.push(fn), onDispose: (fn) => disposers.push(fn) };
  cfg.build(ctx);

  // Name sign and lobby button, a few steps in front of the spawn point.
  const ui = new THREE.Group();
  ui.position.set(spawn.x, 0, spawn.z);
  ui.rotation.y = spawn.yaw || 0;
  group.add(ui);

  const sign = makePanel(1.5, 0.36, (c, W, H) => {
    card(c, W, H, { r: 0.3 });
    text(c, cfg.name, H * 0.34, H * 0.5, { size: H * 0.3, weight: 700 });
    text(c, cfg.tagline, H * 0.34, H * 0.8, { size: H * 0.16, color: COLORS.muted, maxWidth: W - H * 0.6 });
  });
  sign.mesh.position.set(0.25, 1.95, -2.4);
  ui.add(sign.mesh);

  const back = makeButton(app, { label: 'Back to lobby', w: 0.6, h: 0.17, tone: 'dark', onSelect: () => app.goTo('lobby') });
  back.position.set(-0.85, 1.2, -1.3);
  back.rotation.y = 0.45;
  ui.add(back);

  // Background music (cfg.music: true): starts once sound is unlocked, with an on/off button
  // under "Back to lobby". The choice is remembered on the headset.
  let music = null;
  if (cfg.music) {
    music = new ChillMusic(app, cfg.music === true ? {} : cfg.music);
    music.on = store.get('fdc.horizon.music', true);
    const label = () => (music.on ? 'Music: on' : 'Music: off');
    const toggle = makeButton(app, {
      label: label(), w: 0.6, h: 0.13, tone: 'light',
      onSelect: () => { music.setOn(!music.on); store.set('fdc.horizon.music', music.on); toggle.userData.setLabel(label()); },
    });
    toggle.position.set(-0.85, 1.0, -1.3);
    toggle.rotation.y = 0.45;
    ui.add(toggle);
    updaters.push(() => music.update());
    disposers.push(() => music.stop());
  }

  return {
    group,
    spawn,
    bounds: cfg.bounds ?? 25,
    fog: cfg.fog ? new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far) : null,
    update(dt, t) { for (const fn of updaters) fn(dt, t); },
    dispose() { for (const fn of disposers) fn(); },
  };
}
