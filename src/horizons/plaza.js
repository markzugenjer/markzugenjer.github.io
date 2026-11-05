import * as THREE from 'three';
import { buildHorizon } from './build-horizon.js';
import { addTrees, addHills, addFlowers, addClouds, makeLamp, makeBench } from './props.js';
import { makePanel, text, roundRect, COLORS } from '../core/ui.js';

/** FDC Plaza: a sunny outdoor plaza with a fountain, benches and a big FDC sign. */
export function createPlaza(app) {
  return buildHorizon(app, {
    name: 'FDC Plaza',
    tagline: 'Sunny outdoor plaza · walk around the fountain',
    seed: 7,
    spawn: { x: 0, z: 6, yaw: 0 },
    bounds: 22,
    sky: { top: '#5fa8df', horizon: '#d3ebf3', bottom: '#e6efe0' },
    light: { sky: 0xdff1ff, ground: 0x7f9a5a, hemi: 1.5, sun: 0xfff1d6, sunIntensity: 2.2, sunDir: [8, 12, 6] },
    ground: '#8fae5c',
    fog: { color: '#d3ebf3', near: 35, far: 125 },

    build(ctx) {
      const { group, onUpdate } = ctx;
      const stone = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

      // Paved circle with a border ring
      const paving = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64), stone('#ddd6c6'));
      paving.rotation.x = -Math.PI / 2;
      paving.position.y = 0.01;
      const inner = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.3, 64), stone('#bcb3a0'));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.015;
      const border = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.9, 64), stone('#8d8676'));
      border.rotation.x = -Math.PI / 2;
      border.position.y = 0.015;
      group.add(paving, inner, border);

      // Fountain in the centre
      const fountain = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.5, 40), stone('#d6cfbf'));
      base.position.y = 0.25;
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(1.85, 1.85, 0.05, 40),
        new THREE.MeshStandardMaterial({ color: '#4fa3c9', roughness: 0.15, metalness: 0.1 }),
      );
      water.position.y = 0.49;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.5, 16), stone('#cfc7b6'));
      pillar.position.y = 1.0;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 0.25, 32), stone('#d6cfbf'));
      bowl.position.y = 1.8;
      const bowlWater = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.03, 32), water.material);
      bowlWater.position.y = 1.93;
      fountain.add(base, water, pillar, bowl, bowlWater);
      group.add(fountain);

      // Water spray: 160 droplets on arcs
      const N = 160;
      const spray = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      spray.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const drops = new THREE.Points(spray, new THREE.PointsMaterial({ color: '#d8f2ff', size: 0.07, transparent: true, opacity: 0.85 }));
      drops.frustumCulled = false;
      group.add(drops);
      const phase = Array.from({ length: N }, (_, i) => i / N);
      const angle = Array.from({ length: N }, (_, i) => (i * 2.399) % (Math.PI * 2));
      onUpdate((dt, t) => {
        for (let i = 0; i < N; i++) {
          const k = (t * 0.7 + phase[i]) % 1;
          const r = 0.15 + k * 0.75;
          pos[i * 3] = Math.cos(angle[i]) * r;
          pos[i * 3 + 1] = 2.0 + 1.3 * k - 1.25 * k * k * 1.6;
          pos[i * 3 + 2] = Math.sin(angle[i]) * r;
        }
        spray.attributes.position.needsUpdate = true;
      });

      // Benches around the plaza, facing the fountain
      for (const a of [0.9, 1.7, 2.5, 3.8, 4.6, 5.4]) {
        const b = makeBench();
        b.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2);
        b.rotation.y = a + Math.PI;
        group.add(b);
      }

      // Lamp posts on the border
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const lamp = makeLamp();
        lamp.position.set(Math.sin(a) * 8.2, 0, Math.cos(a) * 8.2);
        group.add(lamp);
      }

      // Big FDC sign
      const sign = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: '#4d6326', roughness: 0.6 });
      for (const x of [-1.2, 1.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), postMat);
        post.position.set(x, 1.3, 0);
        sign.add(post);
      }
      const board = makePanel(2.8, 1.1, (c, W, H) => {
        roundRect(c, 6, 6, W - 12, H - 12, H * 0.14);
        c.fillStyle = COLORS.green;
        c.fill();
        text(c, 'fdc', W * 0.08, H * 0.62, { size: H * 0.5, weight: 800, color: '#ffffff' });
        text(c, 'Dental Clinic', W * 0.42, H * 0.47, { size: H * 0.15, weight: 700, color: '#ffffff' });
        text(c, 'VR Plaza', W * 0.42, H * 0.68, { size: H * 0.13, color: 'rgba(255,255,255,0.85)' });
      });
      board.mesh.material.side = THREE.DoubleSide;
      board.mesh.position.y = 2.2;
      sign.add(board.mesh);
      sign.position.set(5.6, 0, -2.5);
      sign.lookAt(0, 0, 4);
      group.add(sign);

      addFlowers(ctx, { count: 170 });
      addTrees(ctx, { count: 70, minR: 12, maxR: 48 });
      addHills(ctx, { color: '#7f9f5c' });
      const clouds = addClouds(ctx);
      onUpdate((dt) => { clouds.rotation.y += dt * 0.004; });
    },
  });
}
