import * as THREE from 'three';
import { CROPS, ICONS } from './state.js';

const SOIL_TOP = 0.13;

export class Farm {
  constructor(scene, cols = 6, rows = 4) {
    this.root = new THREE.Group();
    scene.add(this.root);

    this.cols = cols;
    this.rows = rows;
    this.plotSize = 1.8;
    this.spacing = 2.35;
    this.plots = [];

    const startX = -((cols - 1) * this.spacing) / 2;
    const startZ = 0.9;
    const geo = new THREE.BoxGeometry(this.plotSize, 0.14, this.plotSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const material = new THREE.MeshStandardMaterial({ color: 0xc4b483, roughness: 1 });
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(startX + c * this.spacing, 0.07, startZ + r * this.spacing);
        mesh.receiveShadow = true;
        this.root.add(mesh);

        // rim so the plot reads as a distinct patch against the grass
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(this.plotSize + 0.16, 0.07, this.plotSize + 0.16),
          new THREE.MeshStandardMaterial({ color: 0x6d8a48, roughness: 1 })
        );
        rim.position.set(mesh.position.x, 0.035, mesh.position.z);
        rim.receiveShadow = true;
        this.root.add(rim);


        this.plots.push({
          index: this.plots.length,
          mesh,
          material,
          tilled: false,
          watered: false,
          crop: null,
          pos: mesh.position.clone(),
        });
      }
    }
  }

  nearest(pos, maxDist = 2.5) {
    let best = null;
    let bestD = maxDist;
    for (const p of this.plots) {
      const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  paint(p) {
    if (!p.tilled) p.material.color.setHex(0xc4b483);
    else if (p.watered) p.material.color.setHex(0x4a2c17);
    else p.material.color.setHex(0x8a5a33);
  }

  // Returns { msg, changed }
  interact(p, state) {
    if (!p.tilled) {
      p.tilled = true;
      this.paint(p);
      return { msg: 'Tanah dicangkul. Tekan E lagi untuk menanam.', changed: true };
    }

    if (!p.crop) {
      const type = state.selected;
      if (!type || !CROPS[type]) return { msg: 'Pilih benih dulu (1/2/3).', changed: false };
      if ((state.seeds[type] || 0) <= 0) return { msg: `Benih ${CROPS[type].name} habis. Beli di toko.`, changed: false };
      state.seeds[type] -= 1;
      p.crop = { type, growth: 0, group: null };
      this.renderCrop(p);
      return { msg: `${CROPS[type].name} ditanam. Siram dengan E.`, changed: true };
    }

    const crop = p.crop;
    const def = CROPS[crop.type];

    if (crop.growth >= def.days) {
      const amount = def.yield;
      state.produce[crop.type] = (state.produce[crop.type] || 0) + amount;
      if (crop.group) p.crop.group.removeFromParent();
      p.crop = null;
      p.watered = false;
      p.tilled = true;
      this.paint(p);
      return { msg: `Panen ${ICONS[crop.type]} ${def.name} x${amount}!`, changed: true };
    }

    if (!p.watered) {
      p.watered = true;
      this.paint(p);
      const left = def.days - crop.growth;
      return { msg: `Disiram. Butuh ${left} hari lagi untuk panen.`, changed: true };
    }

    const left = def.days - crop.growth;
    return { msg: `${def.name} sedang tumbuh (${crop.growth}/${def.days} hari). Tidur untuk lanjut hari.`, changed: false };
  }

  renderCrop(p) {
    if (!p.crop) return;
    if (p.crop.group) p.crop.group.removeFromParent();
    const def = CROPS[p.crop.type];
    const stage = p.crop.growth >= def.days ? 2 : p.crop.growth > 0 ? 1 : 0;
    const g = this.buildCropMesh(p.crop.type, stage);
    g.position.set(p.pos.x, SOIL_TOP, p.pos.z);
    g.rotation.y = Math.random() * Math.PI * 2;
    this.root.add(g);
    p.crop.group = g;
  }

  buildCropMesh(type, stage) {
    const def = CROPS[type];
    const g = new THREE.Group();
    const leafMat = new THREE.MeshStandardMaterial({ color: def.leaf, roughness: 0.9 });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.34, 6), leafMat);
    stem.position.y = 0.17;
    stem.castShadow = true;
    g.add(stem);

    const leafCount = stage === 0 ? 2 : 4;
    for (let i = 0; i < leafCount; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 5), leafMat);
      const a = (i / leafCount) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.13, 0.3, Math.sin(a) * 0.13);
      leaf.rotation.set(Math.cos(a) * 0.9, 0, Math.sin(a) * -0.9);
      leaf.castShadow = true;
      g.add(leaf);
    }

    if (stage === 2) {
      const fruitMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.55 });
      for (let i = 0; i < 3; i++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), fruitMat);
        const a = (i / 3) * Math.PI * 2;
        fruit.position.set(Math.cos(a) * 0.14, type === 'turnip' ? 0.1 : 0.24, Math.sin(a) * 0.14);
        fruit.castShadow = true;
        g.add(fruit);
      }
    }

    const s = [0.8, 1.1, 1.45][stage];
    g.scale.setScalar(s);
    return g;
  }

  update(dt, time) {
    for (const p of this.plots) {
      if (p.crop?.group) {
        p.crop.group.rotation.z = Math.sin(time * 1.6 + p.index) * 0.035;
      }
    }
  }

  endOfDay() {
    let grown = 0;
    for (const p of this.plots) {
      if (!p.crop) continue;
      if (p.watered) {
        p.crop.growth += 1;
        grown += 1;
      }
      p.watered = false;
      this.paint(p);
      this.renderCrop(p);
    }
    return grown;
  }

  serialize() {
    return this.plots.map((p) => ({
      tilled: p.tilled,
      watered: p.watered,
      crop: p.crop ? { type: p.crop.type, growth: p.crop.growth } : null,
    }));
  }

  load(data) {
    if (!Array.isArray(data)) return;
    data.forEach((d, i) => {
      const p = this.plots[i];
      if (!p) return;
      p.tilled = !!d.tilled;
      p.watered = !!d.watered;
      if (d.crop && CROPS[d.crop.type]) {
        p.crop = { type: d.crop.type, growth: d.crop.growth | 0, group: null };
        this.renderCrop(p);
      }
      this.paint(p);
    });
  }
}
