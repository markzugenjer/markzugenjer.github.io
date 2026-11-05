import * as THREE from 'three';

/** Reusable low-poly props for horizons. Everything uses few polygons so the Quest stays at 72+ fps. */

const UP = new THREE.Vector3(0, 1, 0);

export function addTrees({ group, rand }, {
  count = 60, minR = 12, maxR = 45, trunk = '#7a5a3a',
  leaves = ['#5f8f3e', '#6fa04a', '#4f7d35'], scale = [0.8, 1.6], avoid = null,
} = {}) {
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6).translate(0, 0.7, 0);
  const leafGeo = new THREE.IcosahedronGeometry(1.1, 0).translate(0, 2.2, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: trunk, roughness: 1, flatShading: true }), count);
  const crowns = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let i = 0;
  for (let guard = 0; i < count && guard < count * 30; guard++) {
    const a = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (avoid && avoid(x, z)) continue;
    const k = scale[0] + rand() * (scale[1] - scale[0]);
    q.setFromAxisAngle(UP, rand() * Math.PI * 2);
    m.compose(p.set(x, 0, z), q, s.set(k, k, k));
    trunks.setMatrixAt(i, m);
    crowns.setMatrixAt(i, m);
    crowns.setColorAt(i, c.set(leaves[Math.floor(rand() * leaves.length)]));
    i++;
  }
  trunks.count = crowns.count = i;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.frustumCulled = crowns.frustumCulled = false;
  group.add(trunks, crowns);
}

export function addHills({ group, rand }, { count = 12, minR = 85, maxR = 120, color = '#7f9f5c' } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const geo = new THREE.ConeGeometry(1, 1, 7);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.4;
    const r = minR + rand() * (maxR - minR);
    const hill = new THREE.Mesh(geo, mat);
    const w = 18 + rand() * 22;
    const h = 8 + rand() * 14;
    hill.scale.set(w, h, w * (0.7 + rand() * 0.6));
    hill.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
    hill.rotation.y = rand() * Math.PI;
    group.add(hill);
  }
}

export function addFlowers({ group, rand }, { count = 150, minR = 7.9, maxR = 8.8, center = [0, 0], colors = ['#f28fb0', '#ffd45c', '#ffffff', '#b48ef0'] } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), count);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    m.makeTranslation(center[0] + Math.cos(a) * r, 0.12 + rand() * 0.1, center[1] + Math.sin(a) * r);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(colors[Math.floor(rand() * colors.length)]));
  }
  mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

export function addClouds({ group, rand }, { count = 9 } = {}) {
  const clouds = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.35 });
  const geo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < count; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < puffs; j++) {
      const puff = new THREE.Mesh(geo, mat);
      const k = 3 + rand() * 3;
      puff.scale.set(k * 1.4, k * 0.7, k);
      puff.position.set(j * 3.5 - puffs * 1.6, rand() * 1.5, rand() * 2);
      cloud.add(puff);
    }
    const a = rand() * Math.PI * 2;
    const r = 60 + rand() * 50;
    cloud.position.set(Math.cos(a) * r, 32 + rand() * 18, Math.sin(a) * r);
    cloud.lookAt(0, cloud.position.y, 0);
    clouds.add(cloud);
  }
  group.add(clouds);
  return clouds;
}

export function makeLamp({ pole = '#3a4232', light = '#fff3c4', height = 2.8 } = {}) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, height, 8), new THREE.MeshStandardMaterial({ color: pole, roughness: 0.6 }));
  post.position.y = height / 2;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 10), new THREE.MeshStandardMaterial({ color: light, emissive: light, emissiveIntensity: 1.2 }));
  bulb.position.y = height + 0.12;
  g.add(post, bulb);
  return g;
}

export function makeBench({ wood = '#a0764d', metal = '#3a4232' } = {}) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: wood, roughness: 0.8 });
  const metalMat = new THREE.MeshStandardMaterial({ color: metal, roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.45), woodMat);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.06), woodMat);
  back.position.set(0, 0.72, -0.2);
  g.add(seat, back);
  for (const x of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.42), metalMat);
    leg.position.set(x, 0.225, 0);
    g.add(leg);
  }
  return g;
}
