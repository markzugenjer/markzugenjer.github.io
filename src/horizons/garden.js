import * as THREE from 'three';
import { buildHorizon } from './build-horizon.js';
import { addTrees, addHills } from './props.js';

/** Sunset Garden: a calm pond with stepping stones, lanterns and fireflies at dusk. */
export function createGarden(app) {
  return buildHorizon(app, {
    name: 'Sunset Garden',
    tagline: 'Quiet pond, lanterns and fireflies at dusk',
    seed: 21,
    spawn: { x: 0, z: 7, yaw: 0 },
    bounds: 20,
    sky: { top: '#2e2f5e', horizon: '#f29a6a', bottom: '#f6c890' },
    light: { sky: 0xffc9a0, ground: 0x3d4a35, hemi: 1.0, sun: 0xffa060, sunIntensity: 1.8, sunDir: [0, 4, -20] },
    ground: '#55704a',
    fog: { color: '#e8a07a', near: 18, far: 90 },

    build(ctx) {
      const { group, rand, onUpdate } = ctx;

      // Setting sun on the horizon
      const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(10, 48), new THREE.MeshBasicMaterial({ color: '#ffd39a', fog: false }));
      sunDisc.position.set(0, 12, -160);
      group.add(sunDisc);

      // Pond with a stone rim and lily pads
      const pond = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 48),
        new THREE.MeshStandardMaterial({ color: '#2f5f6f', roughness: 0.08, metalness: 0.25 }),
      );
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(0, 0.03, -1);
      group.add(pond);

      const rockMat = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 1, flatShading: true });
      const rockGeo = new THREE.IcosahedronGeometry(0.35, 0);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(Math.cos(a) * 4.45, 0.08, -1 + Math.sin(a) * 4.45);
        rock.scale.set(0.8 + rand() * 0.6, 0.45 + rand() * 0.3, 0.8 + rand() * 0.6);
        rock.rotation.y = rand() * 3;
        group.add(rock);
      }

      const padMat = new THREE.MeshStandardMaterial({ color: '#4f8a43', roughness: 0.7, side: THREE.DoubleSide });
      const flowerMat = new THREE.MeshStandardMaterial({ color: '#f4a6c4', emissive: '#f4a6c4', emissiveIntensity: 0.2 });
      for (let i = 0; i < 12; i++) {
        const a = rand() * Math.PI * 2;
        const r = 1 + rand() * 2.6;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.28 + rand() * 0.12, 16, 0.3, Math.PI * 2 - 0.6), padMat);
        pad.rotation.set(-Math.PI / 2, 0, rand() * 6);
        pad.position.set(Math.cos(a) * r, 0.05, -1 + Math.sin(a) * r);
        group.add(pad);
        if (i % 3 === 0) {
          const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), flowerMat);
          flower.position.set(pad.position.x, 0.1, pad.position.z);
          group.add(flower);
        }
      }

      // Stepping stones from the spawn point to the pond
      const stoneMat = new THREE.MeshStandardMaterial({ color: '#a29d92', roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 14), stoneMat);
        s.position.set(i % 2 ? 0.18 : -0.18, 0.04, 6.2 - i * 0.55);
        group.add(s);
      }

      // Lanterns glowing around the pond and along the path
      const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2c22', roughness: 0.9 });
      const glowMat = new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 1.6 });
      const placeLantern = (x, z) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), woodMat);
        post.position.set(x, 0.5, z);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), glowMat);
        lamp.position.set(x, 1.15, z);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.14, 4), woodMat);
        cap.position.set(x, 1.37, z);
        cap.rotation.y = Math.PI / 4;
        group.add(post, lamp, cap);
      };
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        placeLantern(Math.cos(a) * 5.7, -1 + Math.sin(a) * 5.7);
      }
      for (const z of [5.6, 4.3]) { placeLantern(-0.9, z); placeLantern(0.9, z); }

      // Fireflies drifting over the pond
      const N = 90;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const seeds = [];
      for (let i = 0; i < N; i++) {
        const a = rand() * Math.PI * 2;
        const r = 0.8 + rand() * 6.5;
        seeds.push({ x: Math.cos(a) * r, y: 0.4 + rand() * 1.8, z: -1 + Math.sin(a) * r, p: rand() * 10 });
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const flies = new THREE.Points(geo, new THREE.PointsMaterial({
        color: '#ffe48a', size: 0.08, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      flies.frustumCulled = false;
      group.add(flies);
      onUpdate((dt, t) => {
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          pos[i * 3] = s.x + Math.sin(t * 0.4 + s.p) * 0.4;
          pos[i * 3 + 1] = s.y + Math.sin(t * 0.9 + s.p * 2) * 0.15;
          pos[i * 3 + 2] = s.z + Math.cos(t * 0.35 + s.p) * 0.4;
        }
        geo.attributes.position.needsUpdate = true;
      });

      addTrees(ctx, {
        count: 55, minR: 9, maxR: 42,
        leaves: ['#3f5c34', '#4a6b3a', '#e6a3b5', '#d98fa8'],
        avoid: (x, z) => Math.abs(x) < 2 && z > 0,
      });
      addHills(ctx, { color: '#4a5e46', count: 14 });
    },
  });
}
