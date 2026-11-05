import * as THREE from 'three';

// Molar crown profile (x = radius, y = height), from the neck up to the top.
const PROFILE = [
  [0.3, -0.12], [0.36, -0.04], [0.41, 0.08], [0.42, 0.24],
  [0.39, 0.4], [0.31, 0.52], [0.18, 0.57], [0.0, 0.55],
];

/** Crown shape shared by every tooth (spun around its axis, like a vase on a potter's wheel). */
export function toothCrownGeometry() {
  return new THREE.LatheGeometry(PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 40);
}

/** A whole cartoon tooth: crown plus two roots. About 1.2 m tall at scale 1. */
export function makeTooth({ color = '#fbfaf5' } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0 });
  const crown = new THREE.Mesh(toothCrownGeometry(), mat);
  g.add(crown);
  for (const sx of [-1, 1]) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 16), mat);
    root.rotation.set(Math.PI, 0, sx * 0.18);
    root.position.set(sx * 0.15, -0.4, 0);
    g.add(root);
  }
  g.userData.material = mat;
  return g;
}
