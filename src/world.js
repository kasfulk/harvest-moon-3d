import * as THREE from 'three';

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...opts });

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function tree(parent, x, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI * 2;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.9, 7), mat(0x7a5230));
  trunk.position.y = 0.95;
  trunk.castShadow = true;
  g.add(trunk);

  const greens = [0x2f7a3a, 0x3d9450, 0x2b6b34];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9 - i * 0.42, 1.7, 8), mat(greens[i]));
    cone.position.y = 2.15 + i * 0.95;
    cone.castShadow = true;
    g.add(cone);
  }
  parent.add(g);
  return g;
}

function rock(parent, x, z, s = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * s, 0), mat(0x8e9384));
  m.position.set(x, 0.3 * s, z);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.scale.y = 0.7;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}

export function createWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];

  // ---- ground ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 56), mat(0x79bd5c));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // dirt path from house to farm
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9), mat(0xb99a6b));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.015, -4.2);
  path.receiveShadow = true;
  root.add(path);

  // ---- house ----
  const house = new THREE.Group();
  house.position.set(0, 0, -13);
  root.add(house);

  box(7, 3.2, 5, mat(0xf0e2c8), 0, 1.6, 0, house);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2.6, 4), mat(0xb4472f));
  roof.position.y = 4.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);
  box(1.3, 2.1, 0.16, mat(0x835233), 0, 1.05, 2.52, house); // door
  box(1.5, 0.16, 0.5, mat(0x8b6b4a), 0, 0.08, 2.7, house); // step
  box(1.1, 1.1, 0.1, mat(0x9fd6ff, { emissive: 0x2a4a5a, emissiveIntensity: 0.4 }), -2.2, 2.0, 2.52, house);
  box(1.1, 1.1, 0.1, mat(0x9fd6ff, { emissive: 0x2a4a5a, emissiveIntensity: 0.4 }), 2.2, 2.0, 2.52, house);
  box(0.8, 1.6, 0.8, mat(0x9a8f80), 2.2, 5.4, -0.8, house); // chimney

  colliders.push({ type: 'box', x: 0, z: -13, w: 7.2, d: 5.2 });

  // ---- barn ----
  const barn = new THREE.Group();
  barn.position.set(14, 0, -11);
  barn.rotation.y = -0.15;
  root.add(barn);
  box(6, 3.6, 5, mat(0xb85c42), 0, 1.8, 0, barn);
  const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), mat(0x6d523a));
  barnRoof.position.y = 4.7;
  barnRoof.rotation.y = Math.PI / 4;
  barnRoof.castShadow = true;
  barn.add(barnRoof);
  box(2.2, 2.6, 0.14, mat(0x7d5133), 0, 1.3, 2.53, barn);
  colliders.push({ type: 'box', x: 14, z: -11, w: 6.2, d: 5.2 });

  // ---- shop stand ----
  const shopPos = new THREE.Vector3(10.5, 0, 5);
  const shop = new THREE.Group();
  shop.position.copy(shopPos);
  shop.rotation.y = -Math.PI / 2.4;
  root.add(shop);

  box(2.8, 1.05, 1.1, mat(0xb98a55), 0, 0.52, 0, shop); // counter
  box(2.9, 0.12, 1.2, mat(0x8a6440), 0, 1.12, 0, shop); // top
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat(0x6b4a30));
  pole.position.set(-1.3, 1.3, 0.4);
  shop.add(pole);
  box(1.5, 0.75, 0.08, mat(0xf3e6c8), 0.2, 2.05, 0.4, shop); // sign
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 8), mat(0xd9534f));
  umbrella.position.set(0, 3.1, 0);
  umbrella.castShadow = true;
  shop.add(umbrella);
  const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mat(0x6b4a30));
  umbrellaPole.position.set(0, 1.9, 0);
  shop.add(umbrellaPole);
  colliders.push({ type: 'box', x: shopPos.x, z: shopPos.z, w: 1.4, d: 3.0 });

  // ---- pond ----
  const pond = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40), mat(0x3f9fd6, { roughness: 0.25, metalness: 0.1 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-15, 0.03, 9);
  pond.receiveShadow = true;
  root.add(pond);
  const rim = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.9, 40), mat(0x8b8f72));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(-15, 0.02, 9);
  root.add(rim);
  colliders.push({ type: 'circle', x: -15, z: 9, r: 4.5 });

  // ---- trees ----
  const treeSpots = [
    [-24, -2, 1.2], [-20, 12, 1.0], [-26, -15, 1.35], [-12, -21, 1.1],
    [8, -22, 1.25], [21, -3, 1.05], [24, 10, 1.3], [18, 18, 1.0],
    [-6, 21, 1.15], [-22, -8, 0.95], [27, -16, 1.2], [11, 23, 1.1],
    [-27, 20, 1.25], [3, -19, 0.9], [16, 4, 0.85], [-9, 14, 0.9],
  ];
  for (const [x, z, s] of treeSpots) {
    tree(root, x, z, s);
    colliders.push({ type: 'circle', x, z, r: 0.6 * s });
  }

  // ---- rocks ----
  const rockSpots = [[-8, 5, 1], [-10, 2, 0.75], [7, 12, 0.9], [20, 0, 1.1], [-19, 4, 0.8]];
  for (const [x, z, s] of rockSpots) {
    rock(root, x, z, s);
    colliders.push({ type: 'circle', x, z, r: 0.65 * s });
  }

  // ---- flowers ----
  const flowerColors = [0xffd166, 0xff8fab, 0xffffff, 0xc084fc];
  const flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
  const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 4);
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 24;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // keep flowers out of the field and the pond
    if (Math.abs(x) < 9 && z > -1 && z < 12) continue;
    if (Math.hypot(x + 15, z - 9) < 5) continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const stem = new THREE.Mesh(stemGeo, mat(0x4c8f3f));
    stem.position.y = 0.14;
    g.add(stem);
    const head = new THREE.Mesh(flowerGeo, mat(flowerColors[i % flowerColors.length], { emissive: 0x000000 }));
    head.position.y = 0.3;
    g.add(head);
    root.add(g);
  }

  // ---- decorative hills on the horizon ----
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const h = new THREE.Mesh(new THREE.SphereGeometry(9 + Math.random() * 5, 12, 8), mat(0x4f8f47));
    h.position.set(Math.cos(a) * 52, -3.5, Math.sin(a) * 52);
    h.scale.y = 0.42;
    root.add(h);
  }

  // ---- clouds ----
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.2, 8, 6), mat(0xffffff, { roughness: 1 }));
      puff.position.set(j * 1.9 - n, Math.random() * 0.7, Math.random() * 1.4 - 0.7);
      puff.scale.y = 0.62;
      c.add(puff);
    }
    c.position.set(-40 + Math.random() * 80, 20 + Math.random() * 6, -45 + Math.random() * 90);
    root.add(c);
    clouds.push(c);
  }

  return {
    root,
    colliders,
    clouds,
    shopPos,
    bedPos: new THREE.Vector3(0, 0, -9.4),
  };
}
