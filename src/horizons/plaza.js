import * as THREE from 'three';
import { buildHorizon } from './build-horizon.js';
import { addTrees, addHills, addFlowers, addClouds } from './props.js';
import { StaticKit, place, stripeTexture, makeBunting, makeBalloons, makePetals, makeButterflies, dotTexture } from './festive.js';
import { makePanel, text, roundRect } from '../core/ui.js';

/**
 * FDC Plaza: a festive, sunny town square.
 *
 *   - walk in under the welcome arch and along the path
 *   - in the middle, a three-tier fountain with a mosaic basin, rippling water, jets and a
 *     smiling FDC tooth statue on top
 *   - benches and flower planters, lamp posts strung with bunting and fairy lights
 *   - four market stalls, café umbrellas, balloon bunches, a big FDC billboard
 *   - blossom petals and butterflies in the air, chill lo-fi music (with an on/off button)
 *
 * Static pieces are merged into one mesh and repeats are instanced (see festive.js), so it
 * stays light enough for the Quest.
 */
const MINT = '#8fd3bd';
const MINT_D = '#4fae8f';
const PINK = '#f4a9bf';
const PINK_D = '#e07f9d';
const SUN = '#ffd45c';
const CREAM = '#f6efe2';
const WOOD = '#b98a5e';
const IRON = '#3f4a44';
const FESTIVE = [PINK_D, MINT_D, SUN, '#ffffff', '#8cc8ee', '#b9a2ee', '#ff9e7a'];

const PLAZA_R = 11.5;

export function createPlaza(app) {
  return buildHorizon(app, {
    name: 'FDC Plaza',
    tagline: 'Festive town square · walk in under the arch',
    seed: 7,
    spawn: { x: 0, z: 16, yaw: 0 },
    bounds: 24,
    sky: { top: '#4f9fe0', horizon: '#d9eef6', bottom: '#e6efe0' },
    light: { sky: 0xe3f3ff, ground: 0x87a060, hemi: 1.55, sun: 0xfff0d2, sunIntensity: 2.3, sunDir: [8, 12, 6] },
    ground: '#8fb35e',
    fog: { color: '#d9eef6', near: 40, far: 130 },
    music: true,

    build(ctx) {
      const { group, onUpdate, rand } = ctx;
      const kit = new StaticKit();

      // ------------------------------------------------ ground: patterned paving + entrance path
      const paving = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, 96), new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.9 }));
      paving.rotation.x = -Math.PI / 2;
      paving.position.set(0, 0.012, 0);
      group.add(paving);
      const pathTex = pathTexture();
      const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 9), new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 }));
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0.011, PLAZA_R + 4.1);
      group.add(path);
      // kerb ring and low hedge round the plaza (gap for the path)
      const kerb = new THREE.Mesh(new THREE.RingGeometry(PLAZA_R, PLAZA_R + 0.25, 96), new THREE.MeshStandardMaterial({ color: '#c9bfae', roughness: 0.9 }));
      kerb.rotation.x = -Math.PI / 2;
      kerb.position.y = 0.02;
      group.add(kerb);
      const hedge = new THREE.IcosahedronGeometry(0.5, 1);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.16) continue; // entrance
        const r = PLAZA_R + 0.75;
        kit.add(hedge, i % 2 ? '#5f9a49' : '#6aa652', { x: Math.sin(a) * r, y: 0.38, z: Math.cos(a) * r, sx: 0.9, sy: 0.75, sz: 0.8, ry: a });
      }
      const beds = addFlowers(ctx, { count: 260, minR: PLAZA_R + 1.3, maxR: PLAZA_R + 2.3, colors: ['#f28fb0', '#ffd45c', '#ffffff', '#b48ef0', '#ff9e7a'] });
      // keep the entrance path clear of flowers
      const fm = new THREE.Matrix4();
      const fp = new THREE.Vector3();
      for (let i = 0; i < beds.count; i++) {
        beds.getMatrixAt(i, fm);
        fp.setFromMatrixPosition(fm);
        if (Math.abs(fp.x) < 1.9 && fp.z > 0) { fm.makeScale(0, 0, 0); beds.setMatrixAt(i, fm); }
      }
      beds.instanceMatrix.needsUpdate = true;

      // ------------------------------------------------ fountain
      const stone = '#e8e0d0';
      const stone2 = '#d7cdb9';
      kit.add(new THREE.CylinderGeometry(2.25, 2.35, 0.18, 48), stone2, { y: 0.09 });
      kit.add(new THREE.TorusGeometry(2.12, 0.13, 8, 48), stone, { y: 0.62, rx: Math.PI / 2 });
      kit.add(new THREE.CylinderGeometry(0.42, 0.55, 1.4, 20), stone, { y: 1.0 });
      kit.add(new THREE.CylinderGeometry(1.05, 0.55, 0.3, 32), stone, { y: 1.62 });
      kit.add(new THREE.TorusGeometry(1.02, 0.07, 8, 40), stone2, { y: 1.77, rx: Math.PI / 2 });
      kit.add(new THREE.CylinderGeometry(0.2, 0.28, 0.6, 16), stone, { y: 2.05 });
      kit.add(new THREE.CylinderGeometry(0.55, 0.28, 0.2, 24), stone, { y: 2.4 });
      kit.add(new THREE.TorusGeometry(0.53, 0.05, 8, 32), stone2, { y: 2.5, rx: Math.PI / 2 });
      // mosaic band on the basin wall
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.2, 0.45, 64, 1, true), new THREE.MeshStandardMaterial({ map: mosaicTexture(), roughness: 0.4 }));
      basin.position.y = 0.4;
      group.add(basin);
      // water: rippling, sparkling surface (one small shader)
      const waterMat = waterMaterial();
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.05, 48), waterMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.55;
      const pool2 = new THREE.Mesh(new THREE.CircleGeometry(0.98, 32), waterMat);
      pool2.rotation.x = -Math.PI / 2;
      pool2.position.y = 1.76;
      const pool3 = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), waterMat);
      pool3.rotation.x = -Math.PI / 2;
      pool3.position.y = 2.49;
      group.add(pool, pool2, pool3);
      onUpdate((dt, t) => { waterMat.uniforms.uTime.value = t; });
      // spray: jets from the rim, a curtain off the middle bowl, a crown of drops at the top
      const spray = makeSpray();
      group.add(spray.points);
      onUpdate(spray.update);
      // the smiling FDC tooth on top
      const tooth = makeToothStatue();
      tooth.position.y = 2.55;
      group.add(tooth);
      onUpdate((dt, t) => {
        tooth.rotation.y = t * 0.35;
        tooth.children[0].position.y = 0.42 + Math.sin(t * 1.6) * 0.05;
      });

      // ------------------------------------------------ benches and planters (inner ring)
      const benchAngles = [0.62, 1.57, 2.52, -0.62, -1.57, -2.52];
      for (const a of benchAngles) addBench(kit, place(Math.sin(a) * 4.9, Math.cos(a) * 4.9, a + Math.PI));
      const bloom = [];
      for (const a of [0, 1.1, 2.05, Math.PI, -1.1, -2.05]) {
        if (a === 0) continue; // keep the way in clear
        const x = Math.sin(a) * 4.9;
        const z = Math.cos(a) * 4.9;
        kit.add(new THREE.CylinderGeometry(0.55, 0.48, 0.5, 16), '#d9cdb8', { x, y: 0.25, z });
        kit.add(new THREE.TorusGeometry(0.55, 0.05, 6, 20), PINK_D, { x, y: 0.5, z, rx: Math.PI / 2 });
        kit.add(new THREE.IcosahedronGeometry(0.42, 1), '#5f9a49', { x, y: 0.72, z, sy: 0.7 });
        bloom.push({ x, z });
      }
      // flowers on the planters
      const pf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), bloom.length * 14);
      const m4 = new THREE.Matrix4();
      const c3 = new THREE.Color();
      let fi = 0;
      for (const b of bloom) {
        for (let k = 0; k < 14; k++) {
          const a = rand() * Math.PI * 2;
          const r = rand() * 0.38;
          m4.makeTranslation(b.x + Math.cos(a) * r, 0.86 + rand() * 0.08, b.z + Math.sin(a) * r);
          pf.setMatrixAt(fi, m4);
          pf.setColorAt(fi++, c3.set(['#ff7fa3', '#ffd45c', '#ffffff', '#c58df2'][k % 4]));
        }
      }
      pf.instanceColor.needsUpdate = true;
      group.add(pf);

      // ------------------------------------------------ lamp posts with bunting + fairy lights
      const LAMP_R = 6.9;
      const LAMP_H = 3.4;
      const lampTops = [];
      const bulbGeo = new THREE.SphereGeometry(0.15, 14, 10);
      const lampBulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#fff4c8', toneMapped: false }), 8);
      for (let i = 0; i < 8; i++) {
        const a = (i + 0.5) * (Math.PI / 4);
        const x = Math.sin(a) * LAMP_R;
        const z = Math.cos(a) * LAMP_R;
        kit.add(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 10), IRON, { x, y: 0.17, z });
        kit.add(new THREE.CylinderGeometry(0.05, 0.07, LAMP_H, 10), IRON, { x, y: LAMP_H / 2, z });
        kit.add(new THREE.TorusGeometry(0.12, 0.025, 6, 16), SUN, { x, y: LAMP_H - 0.25, z, rx: Math.PI / 2 });
        kit.add(new THREE.ConeGeometry(0.26, 0.2, 8), IRON, { x, y: LAMP_H + 0.42, z });
        kit.add(new THREE.SphereGeometry(0.05, 8, 6), SUN, { x, y: LAMP_H + 0.56, z });
        for (let k = 0; k < 4; k++) {
          const ka = (k / 4) * Math.PI * 2 + Math.PI / 4;
          kit.add(new THREE.BoxGeometry(0.025, 0.36, 0.025), IRON, { x: x + Math.cos(ka) * 0.17, y: LAMP_H + 0.15, z: z + Math.sin(ka) * 0.17 });
        }
        m4.makeTranslation(x, LAMP_H + 0.15, z);
        lampBulbs.setMatrixAt(i, m4);
        lampTops.push(new THREE.Vector3(x, LAMP_H - 0.2, z));
      }
      group.add(lampBulbs);
      const strands = [];
      for (let i = 0; i < 8; i++) {
        strands.push({ a: lampTops[i], b: lampTops[(i + 1) % 8], sag: 0.45 }); // ring
        if (i < 8) strands.push({ a: lampTops[i], b: lampTops[(i + 3) % 8], sag: 0.7 }); // star across the plaza
      }
      const bunting = makeBunting(strands, { colors: FESTIVE });
      group.add(bunting.group);
      onUpdate(bunting.update);

      // ------------------------------------------------ market stalls
      const stalls = [
        { a: 1.12, title: 'Konsultasi Gigi', sub: 'Gratis · tanya dokter FDC', color: MINT_D, stripe: [MINT, '#ffffff'], items: 'tooth' },
        { a: 2.12, title: 'Sikat Gigi Kit', sub: 'Sikat + pasta untuk si kecil', color: PINK_D, stripe: [PINK, '#ffffff'], items: 'brush' },
        { a: -1.12, title: 'Jus Buah Segar', sub: 'Tanpa gula tambahan', color: '#f0a63c', stripe: [SUN, '#ffffff'], items: 'juice' },
        { a: -2.12, title: 'Foto Senyum', sub: 'Pamerkan senyum sehatmu!', color: '#7b9ee8', stripe: ['#a9c6f2', '#ffffff'], items: 'photo' },
      ];
      for (const st of stalls) addStall(group, kit, st, rand);

      // ------------------------------------------------ café umbrellas
      const umbTex = [stripeTexture(PINK_D, '#ffffff', 12), stripeTexture(MINT_D, '#ffffff', 12)];
      [0.62, -0.62, 2.72, -2.72].forEach((a, i) => {
        const x = Math.sin(a) * 8.7;
        const z = Math.cos(a) * 8.7;
        kit.add(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8), '#ffffff', { x, y: 1.15, z });
        kit.add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), '#ffffff', { x, y: 0.74, z });
        kit.add(new THREE.CylinderGeometry(0.06, 0.2, 0.72, 10), '#ffffff', { x, y: 0.36, z });
        for (let k = 0; k < 3; k++) {
          const ca = (k / 3) * Math.PI * 2 + a;
          addChair(kit, place(x + Math.cos(ca) * 0.85, z + Math.sin(ca) * 0.85, -ca - Math.PI / 2), i % 2 ? MINT_D : PINK_D);
        }
        // a drink and a little vase on the table
        kit.add(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 8), '#ffffff', { x: x + 0.15, y: 0.83, z });
        kit.add(new THREE.SphereGeometry(0.06, 8, 6), ['#ff7fa3', SUN][i % 2], { x: x - 0.12, y: 0.84, z: z + 0.1 });
        const umb = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.55, 12, 1, true), new THREE.MeshStandardMaterial({ map: umbTex[i % 2], side: THREE.DoubleSide, roughness: 0.6 }));
        umb.position.set(x, 2.35, z);
        group.add(umb);
        kit.add(new THREE.SphereGeometry(0.06, 8, 6), '#ffffff', { x, y: 2.64, z });
      });

      // ------------------------------------------------ welcome arch over the path
      const ARCH_Z = PLAZA_R + 0.4;
      for (const sx of [-2.45, 2.45]) {
        kit.add(new THREE.BoxGeometry(0.6, 0.3, 0.6), '#ffffff', { x: sx, y: 0.15, z: ARCH_Z });
        for (let k = 0; k < 7; k++) kit.add(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 14), k % 2 ? '#ffffff' : MINT_D, { x: sx, y: 0.55 + k * 0.5, z: ARCH_Z });
        kit.add(new THREE.SphereGeometry(0.3, 14, 10), SUN, { x: sx, y: 4.2, z: ARCH_Z });
      }
      kit.add(new THREE.BoxGeometry(5.6, 0.18, 0.3), PINK_D, { y: 3.95, z: ARCH_Z });
      const welcome = makePanel(4.4, 0.95, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, H * 0.35);
        c.fillStyle = '#ffffff'; c.fill();
        c.lineWidth = H * 0.07; c.strokeStyle = PINK_D; c.stroke();
        text(c, 'SELAMAT DATANG DI', W / 2, H * 0.38, { size: H * 0.2, weight: 800, color: MINT_D, align: 'center' });
        text(c, 'FDC PLAZA', W / 2, H * 0.76, { size: H * 0.38, weight: 900, color: PINK_D, align: 'center' });
      });
      welcome.mesh.material.side = THREE.DoubleSide;
      welcome.mesh.position.set(0, 3.45, ARCH_Z + 0.17);
      group.add(welcome.mesh);
      const archFlags = makeBunting([{ a: new THREE.Vector3(-2.45, 3.0, ARCH_Z + 0.25), b: new THREE.Vector3(2.45, 3.0, ARCH_Z + 0.25), sag: 0.35 }], { colors: FESTIVE, bulbs: false, gap: 0.33 });
      group.add(archFlags.group);
      onUpdate(archFlags.update);

      // ------------------------------------------------ big FDC billboard across the plaza
      const BILL_Z = -PLAZA_R + 0.6;
      for (const sx of [-2.3, 2.3]) kit.add(new THREE.BoxGeometry(0.18, 4.4, 0.18), '#ffffff', { x: sx, y: 2.2, z: BILL_Z - 0.1 });
      const billboard = makePanel(5.2, 2.1, (c, W, H) => {
        roundRect(c, 10, 10, W - 20, H - 20, H * 0.12);
        const g = c.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, MINT_D); g.addColorStop(1, '#3f9a7d');
        c.fillStyle = g; c.fill();
        c.lineWidth = H * 0.035; c.strokeStyle = '#ffffff'; c.stroke();
        // tooth badge
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(W * 0.17, H * 0.5, H * 0.32, 0, Math.PI * 2); c.fill();
        drawTooth(c, W * 0.17, H * 0.52, H * 0.4);
        text(c, 'fdc', W * 0.36, H * 0.46, { size: H * 0.34, weight: 900, color: '#ffffff' });
        text(c, 'Dental Clinic', W * 0.36, H * 0.62, { size: H * 0.11, weight: 700, color: '#ffffff' });
        text(c, 'Senyum sehat, hidup ceria!', W * 0.36, H * 0.79, { size: H * 0.1, weight: 600, color: '#fff3c0' });
      });
      billboard.mesh.material.side = THREE.DoubleSide;
      billboard.mesh.position.set(0, 3.0, BILL_Z);
      group.add(billboard.mesh);

      // ------------------------------------------------ balloons
      const anchors = [];
      for (const p of lampTops) anchors.push({ x: p.x, y: 1.6, z: p.z, n: 4, len: 0.9 });
      for (const sx of [-2.45, 2.45]) {
        anchors.push({ x: sx, y: 4.4, z: ARCH_Z, n: 7, len: 0.25, size: 0.24 });
        anchors.push({ x: sx * 0.95, y: 1.0, z: ARCH_Z + 0.4, n: 4, len: 0.8 });
      }
      for (const sx of [-2.3, 2.3]) anchors.push({ x: sx, y: 4.3, z: BILL_Z - 0.1, n: 6, len: 0.3, size: 0.22 });
      for (const st of stalls) anchors.push({ x: Math.sin(st.a) * 9.6 + Math.cos(st.a) * 1.0, y: 2.6, z: Math.cos(st.a) * 9.6 - Math.sin(st.a) * 1.0, n: 3, len: 0.5 });
      const balloons = makeBalloons(anchors, { rand });
      group.add(balloons.group);
      onUpdate(balloons.update);

      // ------------------------------------------------ petals and butterflies
      const petals = makePetals({ count: 80, radius: 13, top: 6.5, rand });
      group.add(petals.group);
      onUpdate(petals.update);
      const flies = makeButterflies([...bloom.map((b) => ({ x: b.x, z: b.z, y: 0.9 })), ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        return { x: Math.sin(a) * (PLAZA_R + 1.8), z: Math.cos(a) * (PLAZA_R + 1.8), y: 0.5 };
      })], { rand });
      group.add(flies.group);
      onUpdate(flies.update);

      // ------------------------------------------------ the world around
      group.add(kit.build());
      addTrees(ctx, {
        count: 80, minR: 15, maxR: 50,
        leaves: ['#5f8f3e', '#6fa04a', '#4f7d35', '#f4b6c8', '#f7c6d4', '#79ad52'],
        avoid: (x, z) => Math.abs(x) < 3.5 && z > 8,
      });
      addHills(ctx, { color: '#7fa45c' });
      const clouds = addClouds(ctx);
      onUpdate((dt) => { clouds.rotation.y += dt * 0.004; });
      group.add(makeSun(new THREE.Vector3(8, 12, 6).normalize().multiplyScalar(150)));
    },
  });
}

// =================================================================== pieces
function addBench(kit, M) {
  for (let k = 0; k < 4; k++) kit.add(new THREE.BoxGeometry(1.7, 0.05, 0.11), WOOD, { y: 0.46, z: -0.18 + k * 0.12, parent: M });
  for (let k = 0; k < 3; k++) kit.add(new THREE.BoxGeometry(1.7, 0.1, 0.04), WOOD, { y: 0.64 + k * 0.13, z: -0.3, rx: -0.15, parent: M });
  for (const x of [-0.75, 0.75]) {
    kit.add(new THREE.BoxGeometry(0.06, 0.46, 0.5), IRON, { x, y: 0.23, z: -0.05, parent: M });
    kit.add(new THREE.BoxGeometry(0.06, 0.5, 0.06), IRON, { x, y: 0.75, z: -0.32, rx: -0.15, parent: M });
    kit.add(new THREE.BoxGeometry(0.08, 0.05, 0.45), IRON, { x, y: 0.66, z: -0.08, parent: M });
  }
}

function addChair(kit, M, color) {
  kit.add(new THREE.BoxGeometry(0.42, 0.04, 0.42), color, { y: 0.45, parent: M });
  kit.add(new THREE.BoxGeometry(0.42, 0.42, 0.04), color, { y: 0.68, z: -0.2, parent: M });
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) kit.add(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), '#ffffff', { x, y: 0.225, z, parent: M });
}

function addStall(group, kit, st, rand) {
  const R = 9.6;
  const x = Math.sin(st.a) * R;
  const z = Math.cos(st.a) * R;
  const ry = st.a + Math.PI; // facing the fountain
  const M = place(x, z, ry);
  // counter and back
  kit.add(new THREE.BoxGeometry(2.2, 0.95, 0.8), '#ffffff', { y: 0.475, z: 0.25, parent: M });
  kit.add(new THREE.BoxGeometry(2.24, 0.12, 0.86), st.color, { y: 1.0, z: 0.25, parent: M });
  kit.add(new THREE.BoxGeometry(2.0, 0.5, 0.02), st.color, { y: 0.45, z: 0.66, parent: M });
  kit.add(new THREE.BoxGeometry(2.2, 2.4, 0.1), CREAM, { y: 1.2, z: -0.65, parent: M });
  for (const sx of [-1.05, 1.05]) for (const sz of [-0.6, 0.6]) kit.add(new THREE.BoxGeometry(0.08, 2.5, 0.08), st.color, { x: sx, y: 1.25, z: sz, parent: M });
  kit.add(new THREE.BoxGeometry(2.3, 0.08, 1.4), '#ffffff', { y: 2.52, z: 0, parent: M });
  // goods on the counter
  const top = 1.08;
  if (st.items === 'tooth') {
    kit.add(new THREE.SphereGeometry(0.2, 14, 10), '#ffffff', { x: -0.5, y: top + 0.24, z: 0.3, sy: 0.85, parent: M });
    for (const s of [-1, 1]) kit.add(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), '#ffffff', { x: -0.5 + s * 0.08, y: top + 0.08, z: 0.3, parent: M });
    kit.add(new THREE.BoxGeometry(0.5, 0.03, 0.35), '#cfe7dd', { x: 0.45, y: top + 0.02, z: 0.3, parent: M });
    for (let k = 0; k < 3; k++) kit.add(new THREE.BoxGeometry(0.18, 0.24, 0.02), ['#ffffff', '#fde8ee', '#dcf3ea'][k], { x: 0.25 + k * 0.2, y: top + 0.14, z: 0.4, rx: -0.3, parent: M });
  } else if (st.items === 'brush') {
    for (let k = 0; k < 4; k++) {
      const bx = -0.75 + k * 0.5;
      kit.add(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 10), [MINT, PINK, SUN, '#a9c6f2'][k], { x: bx, y: top + 0.1, z: 0.3, parent: M });
      for (let j = 0; j < 3; j++) kit.add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), [PINK_D, MINT_D, '#7b9ee8'][j], { x: bx + (j - 1) * 0.035, y: top + 0.3, z: 0.3, rz: (j - 1) * 0.15, parent: M });
    }
  } else if (st.items === 'juice') {
    for (let k = 0; k < 5; k++) {
      kit.add(new THREE.CylinderGeometry(0.06, 0.05, 0.18, 10), ['#ffb347', '#ff7f7f', '#9be07a', '#ffd45c', '#f49ac1'][k], { x: -0.8 + k * 0.32, y: top + 0.09, z: 0.35, parent: M });
      kit.add(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), '#ffffff', { x: -0.78 + k * 0.32, y: top + 0.22, z: 0.35, rz: 0.2, parent: M });
    }
    for (let k = 0; k < 7; k++) kit.add(new THREE.SphereGeometry(0.07, 8, 6), ['#ff9f2e', '#9be07a', '#ffd45c', '#e8434f'][k % 4], { x: -0.6 + rand() * 1.2, y: top + 0.07, z: 0.05 + rand() * 0.12, parent: M });
  } else if (st.items === 'photo') {
    kit.add(new THREE.BoxGeometry(0.9, 0.7, 0.05), SUN, { x: 0, y: 1.75, z: -0.58, parent: M });
    kit.add(new THREE.BoxGeometry(0.78, 0.58, 0.06), '#ffffff', { x: 0, y: 1.75, z: -0.57, parent: M });
    kit.add(new THREE.BoxGeometry(0.25, 0.16, 0.12), '#333a40', { x: 0.55, y: top + 0.1, z: 0.3, parent: M });
    kit.add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), '#7b9ee8', { x: 0.55, y: top + 0.1, z: 0.38, rx: Math.PI / 2, parent: M });
    for (let k = 0; k < 4; k++) kit.add(new THREE.BoxGeometry(0.16, 0.2, 0.01), '#ffffff', { x: -0.7 + k * 0.22, y: top + 0.02, z: 0.3, rx: -Math.PI / 2, ry: (k - 1.5) * 0.2, parent: M });
  }
  // striped awning + scalloped valance (textured)
  const stripe = stripeTexture(st.stripe[0], st.stripe[1], 10);
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.0), new THREE.MeshStandardMaterial({ map: stripe, side: THREE.DoubleSide, roughness: 0.7 }));
  aw.position.set(0, 2.35, 0.95);
  aw.rotation.x = -Math.PI / 2 + 0.45;
  const val = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.28), new THREE.MeshStandardMaterial({ map: stripeTexture(st.stripe[0], st.stripe[1], 10, { scallop: true }), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5, roughness: 0.7 }));
  val.position.set(0, 2.03, 1.4);
  const sign = makePanel(2.0, 0.55, (c, W, H) => {
    roundRect(c, 6, 6, W - 12, H - 12, H * 0.3);
    c.fillStyle = '#ffffff'; c.fill();
    c.lineWidth = H * 0.07; c.strokeStyle = st.color; c.stroke();
    text(c, st.title, W / 2, H * 0.5, { size: H * 0.34, weight: 900, color: st.color, align: 'center', maxWidth: W * 0.9 });
    text(c, st.sub, W / 2, H * 0.8, { size: H * 0.16, weight: 600, color: '#5d6650', align: 'center', maxWidth: W * 0.9 });
  });
  sign.mesh.position.set(0, 2.9, 0.15);
  const holder = new THREE.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = ry;
  holder.add(aw, val, sign.mesh);
  group.add(holder);
}

function makeToothStatue() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, metalness: 0.05, emissive: '#eaf6ff', emissiveIntensity: 0.15 });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), white);
  crown.scale.set(1.1, 0.95, 0.9);
  body.add(crown);
  for (const s of [-1, 1]) {
    const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 6, 12), white);
    root.position.set(s * 0.15, -0.32, 0);
    root.rotation.z = s * 0.15;
    body.add(root);
  }
  const dark = new THREE.MeshBasicMaterial({ color: '#2e3b36' });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), dark);
    eye.position.set(s * 0.11, 0.05, 0.29);
    eye.scale.set(1, 1.3, 0.5);
    body.add(eye);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb0c4' }));
    cheek.position.set(s * 0.19, -0.03, 0.26);
    cheek.scale.z = 0.3;
    body.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: '#e07f9d' }));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.04, 0.3);
  body.add(smile);
  // a gold sparkle ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffe17a', toneMapped: false }));
  ring.rotation.x = Math.PI / 2 - 0.3;
  body.add(ring);
  body.position.y = 0.42;
  return g;
}

function makeSpray() {
  const JETS = 10;
  const PER = 18;
  const CURTAIN = 110;
  const CROWN = 90;
  const N = JETS * PER + CURTAIN + CROWN;
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#e8f8ff', map: dotTexture(), size: 0.08, transparent: true, opacity: 0.9, depthWrite: false }));
  points.frustumCulled = false;
  const update = (dt, t) => {
    let i = 0;
    // jets from the basin rim arcing into the pool
    for (let j = 0; j < JETS; j++) {
      const a = (j / JETS) * Math.PI * 2;
      for (let k = 0; k < PER; k++) {
        const u = (t * 0.9 + k / PER) % 1;
        const r = 2.0 - u * 1.1;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = 0.7 + u * 1.6 - u * u * 1.75;
        pos[i * 3 + 2] = Math.sin(a) * r;
        i++;
      }
    }
    // a curtain falling off the middle bowl
    for (let k = 0; k < CURTAIN; k++) {
      const a = (k * 2.399) % (Math.PI * 2);
      const u = (t * 0.8 + (k * 0.618) % 1) % 1;
      const r = 1.08 + u * 0.18;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 1.74 - u * u * 1.15;
      pos[i * 3 + 2] = Math.sin(a) * r;
      i++;
    }
    // a crown of drops round the tooth
    for (let k = 0; k < CROWN; k++) {
      const a = (k * 2.399) % (Math.PI * 2);
      const u = (t * 0.7 + k / CROWN) % 1;
      const r = 0.2 + u * 0.4;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 2.6 + u * 0.9 - u * u * 1.25;
      pos[i * 3 + 2] = Math.sin(a) * r;
      i++;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float ripple = sin(r * 34.0 - uTime * 3.0) * 0.5 + 0.5;
        float caustic = sin(vUv.x * 26.0 + uTime * 1.1) * sin(vUv.y * 23.0 - uTime * 1.4);
        vec3 deep = vec3(0.16, 0.58, 0.78);
        vec3 light = vec3(0.55, 0.88, 0.95);
        vec3 c = mix(deep, light, clamp(ripple * 0.22 + caustic * 0.18 + r * 0.35, 0.0, 1.0));
        float spark = pow(max(0.0, sin(vUv.x * 95.0 + uTime * 2.0) * sin(vUv.y * 83.0 - uTime * 1.7)), 14.0);
        c += vec3(spark * 0.9);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

function makeSun(at) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.25, 'rgba(255,248,210,1)');
  g.addColorStop(0.45, 'rgba(255,236,170,0.45)');
  g.addColorStop(1, 'rgba(255,236,170,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, toneMapped: false }));
  s.position.copy(at);
  s.scale.setScalar(30);
  return s;
}

function drawTooth(c, x, y, size) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#4fae8f';
  c.beginPath();
  const s = size / 2;
  c.moveTo(-s * 0.8, -s * 0.5);
  c.bezierCurveTo(-s * 0.9, -s * 1.05, -s * 0.2, -s * 1.0, 0, -s * 0.75);
  c.bezierCurveTo(s * 0.2, -s * 1.0, s * 0.9, -s * 1.05, s * 0.8, -s * 0.5);
  c.bezierCurveTo(s * 0.75, 0, s * 0.55, s * 0.2, s * 0.45, s * 0.9);
  c.bezierCurveTo(s * 0.35, s * 1.05, s * 0.15, s * 0.9, s * 0.1, s * 0.45);
  c.bezierCurveTo(0, s * 0.3, -s * 0.05, s * 0.3, -s * 0.1, s * 0.45);
  c.bezierCurveTo(-s * 0.15, s * 0.9, -s * 0.35, s * 1.05, -s * 0.45, s * 0.9);
  c.bezierCurveTo(-s * 0.55, s * 0.2, -s * 0.75, 0, -s * 0.8, -s * 0.5);
  c.fill();
  c.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * s * 0.28, -s * 0.35, s * 0.09, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#ffffff'; c.lineWidth = s * 0.08; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -s * 0.2, s * 0.25, 0.3, Math.PI - 0.3); c.stroke();
  c.restore();
}

// =================================================================== textures
function pavingTexture() {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const k = S / (PLAZA_R * 2); // px per metre
  c.fillStyle = '#e9e1d2';
  c.fillRect(0, 0, S, S);
  c.translate(S / 2, S / 2);
  // rings of tiles
  const rings = [
    [2.3, 2.9, ['#cdbfa6', '#d8cbb2']],
    [2.9, 3.2, [PINK, '#ffffff']],
    [3.2, 4.2, ['#efe8db', '#e4dbc9']],
    [5.6, 5.9, [MINT, '#ffffff']],
    [5.9, 7.6, ['#ece4d5', '#e2d8c6']],
    [7.6, 7.85, [SUN, '#ffffff']],
    [7.85, PLAZA_R, ['#ebe3d4', '#e0d6c4']],
  ];
  for (const [r0, r1, cols] of rings) {
    const n = Math.round((Math.PI * 2 * r1) / 0.55);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      c.beginPath();
      c.arc(0, 0, r1 * k, a0, a1);
      c.arc(0, 0, r0 * k, a1, a0, true);
      c.closePath();
      c.fillStyle = cols[i % cols.length];
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(150,135,110,0.35)';
      c.stroke();
    }
  }
  // a big star (compass) between the rings 4.2 and 5.6
  c.fillStyle = '#f1e9da';
  c.beginPath(); c.arc(0, 0, 5.6 * k, 0, Math.PI * 2); c.arc(0, 0, 4.2 * k, 0, Math.PI * 2, true); c.fill();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r0 = 4.2 * k;
    const r1 = 5.6 * k;
    c.beginPath();
    c.moveTo(Math.cos(a - 0.1) * r0, Math.sin(a - 0.1) * r0);
    c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    c.lineTo(Math.cos(a + 0.1) * r0, Math.sin(a + 0.1) * r0);
    c.closePath();
    c.fillStyle = i % 2 ? PINK : MINT;
    c.fill();
  }
  // subtle speckle for texture
  for (let i = 0; i < 9000; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * PLAZA_R * k;
    c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.08)';
    c.fillRect(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function pathTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 768;
  const c = cv.getContext('2d');
  c.fillStyle = '#e9e1d2';
  c.fillRect(0, 0, 256, 768);
  const h = 768 / 24;
  for (let row = 0; row < 24; row++) {
    const off = row % 2 ? 42 : 0;
    for (let x = -off; x < 256; x += 84) {
      c.fillStyle = (row + Math.floor(x / 84)) % 5 === 0 ? '#f4c3d1' : (row * 3 + x) % 7 === 0 ? '#bfe6d7' : '#e2d8c6';
      c.fillRect(x + 2, row * h + 2, 80, h - 4);
    }
  }
  c.fillStyle = MINT_D;
  c.fillRect(0, 0, 10, 768);
  c.fillRect(246, 0, 10, 768);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function mosaicTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 64;
  const c = cv.getContext('2d');
  const cols = ['#4fa3c9', '#8cc8ee', '#ffffff', MINT, PINK, '#3d86b0', SUN];
  for (let y = 0; y < 64; y += 16) {
    for (let x = 0; x < 1024; x += 16) {
      c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      c.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(0, 0, 1024, 4);
  c.fillRect(0, 60, 1024, 4);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = 3;
  return t;
}
