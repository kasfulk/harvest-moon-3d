import * as THREE from 'three';

const RADIUS = 0.42;

export class Player {
  constructor(scene, colliders) {
    this.colliders = colliders;
    this.pos = new THREE.Vector3(0, 0, -6.2);
    this.facing = Math.PI;
    this.walkT = 0;
    this.speed = 0;

    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    scene.add(this.group);

    const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.85 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3f6fb5, roughness: 0.9 });
    const overall = new THREE.MeshStandardMaterial({ color: 0x2c4f8a, roughness: 0.9 });
    const hat = new THREE.MeshStandardMaterial({ color: 0xd9b878, roughness: 1 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x513a26, roughness: 1 });

    const add = (geo, material, x, y, z, parent = this.group) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    // legs (own groups so they can swing)
    this.legL = new THREE.Group();
    this.legL.position.set(-0.16, 0.58, 0);
    this.group.add(this.legL);
    add(new THREE.BoxGeometry(0.22, 0.5, 0.24), overall, 0, -0.25, 0, this.legL);
    add(new THREE.BoxGeometry(0.24, 0.14, 0.32), boot, 0, -0.5, 0.03, this.legL);

    this.legR = this.legL.clone();
    this.legR.position.set(0.16, 0.58, 0);
    this.group.add(this.legR);

    // body
    add(new THREE.BoxGeometry(0.6, 0.62, 0.38), shirt, 0, 0.92, 0);
    add(new THREE.BoxGeometry(0.52, 0.3, 0.4), overall, 0, 0.72, 0);

    // arms
    this.armL = new THREE.Group();
    this.armL.position.set(-0.38, 1.14, 0);
    this.group.add(this.armL);
    add(new THREE.BoxGeometry(0.16, 0.5, 0.18), shirt, 0, -0.22, 0, this.armL);

    this.armR = this.armL.clone();
    this.armR.position.set(0.38, 1.14, 0);
    this.group.add(this.armR);

    // head
    add(new THREE.BoxGeometry(0.42, 0.4, 0.4), skin, 0, 1.53, 0);
    add(new THREE.BoxGeometry(0.06, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x241a12 }), -0.1, 1.58, 0.21);
    add(new THREE.BoxGeometry(0.06, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x241a12 }), 0.1, 1.58, 0.21);

    // straw hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12), hat);
    brim.position.y = 1.76;
    brim.castShadow = true;
    this.group.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.19, 12), hat);
    crown.position.y = 1.87;
    crown.castShadow = true;
    this.group.add(crown);

    this.group.rotation.y = this.facing;
  }

  update(dt, moveX, moveZ, running) {
    const len = Math.hypot(moveX, moveZ);
    const targetSpeed = len > 0.02 ? (running ? 8.2 : 5.2) : 0;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 10);

    if (len > 0.02) {
      const nx = moveX / len;
      const nz = moveZ / len;
      this.pos.x += nx * this.speed * dt;
      this.pos.z += nz * this.speed * dt;
      const targetFacing = Math.atan2(nx, nz);
      let diff = targetFacing - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 12);
      this.walkT += dt * this.speed * 1.7;
    } else {
      this.walkT += dt * 2;
    }

    this.resolve();

    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.facing;

    const swing = Math.min(this.speed / 5.2, 1.5) * 0.55;
    const s = Math.sin(this.walkT * 2);
    this.legL.rotation.x = s * swing;
    this.legR.rotation.x = -s * swing;
    this.armL.rotation.x = -s * swing * 0.8;
    this.armR.rotation.x = s * swing * 0.8;
    // idle breathing
    this.group.position.y = this.speed < 0.2 ? Math.sin(this.walkT) * 0.012 : Math.abs(s) * 0.03;
  }

  resolve() {
    const p = this.pos;
    for (const c of this.colliders) {
      if (c.type === 'circle') {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + RADIUS;
        if (d < min && d > 1e-5) {
          p.x = c.x + (dx / d) * min;
          p.z = c.z + (dz / d) * min;
        }
      } else {
        const hw = c.w / 2 + RADIUS;
        const hd = c.d / 2 + RADIUS;
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
          const px = hw - Math.abs(dx);
          const pz = hd - Math.abs(dz);
          if (px < pz) p.x = c.x + Math.sign(dx || 1) * hw;
          else p.z = c.z + Math.sign(dz || 1) * hd;
        }
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -32, 32);
    p.z = THREE.MathUtils.clamp(p.z, -32, 32);
  }

  distanceTo(v) {
    return Math.hypot(this.pos.x - v.x, this.pos.z - v.z);
  }

  teleport(x, z) {
    this.pos.set(x, 0, z);
    this.group.position.set(x, 0, z);
  }
}
