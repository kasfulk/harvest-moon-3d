import * as THREE from 'three';
import { createWorld } from './world.js';
import { Farm } from './farm.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { CROPS, freshState } from './state.js';

const SAVE_KEY = 'lembah-senja:v1';
const DAY_START = 6 * 60;
const MINUTES_PER_SECOND = 5; // 1 detik nyata = 5 menit game

// ---------- renderer ----------
const container = document.getElementById('app');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  container.innerHTML =
    '<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;font-size:15px;line-height:1.6">' +
    'Browser ini tidak bisa membuat konteks WebGL 3D.<br>Coba Chrome/Safari/Firefox terbaru dan pastikan akselerasi hardware aktif.</div>';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// ---------- scene ----------
const scene = new THREE.Scene();
const DAY_SKY = new THREE.Color(0x9fd6ff);
const NIGHT_SKY = new THREE.Color(0x121a33);
scene.background = DAY_SKY.clone();
scene.fog = new THREE.Fog(DAY_SKY.clone(), 55, 105);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 250);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x4f7a41, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff3d6, 2.4);
sun.position.set(18, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -26;
sun.shadow.camera.right = 26;
sun.shadow.camera.top = 26;
sun.shadow.camera.bottom = -26;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

// soft fill so shadowed faces (barn, tree trunks) keep some detail
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
fill.position.set(-16, 10, 12);
scene.add(fill);

// ---------- world ----------
const world = createWorld(scene);
const farm = new Farm(scene);
const player = new Player(scene, world.colliders);
const ui = new UI();

// ---------- state ----------
let state = freshState();

function loadGame() {
  let resumed = false;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.state) {
      state = {
        ...freshState(),
        ...data.state,
        seeds: { ...freshState().seeds, ...(data.state.seeds || {}) },
        produce: { ...freshState().produce, ...(data.state.produce || {}) },
      };
    }
    if (data.plots) farm.load(data.plots);
    if (data.player) player.teleport(data.player.x, data.player.z);
    resumed = true;
  } catch (err) {
    console.warn('Save rusak, mulai baru.', err);
  }
  return resumed;
}

function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        state,
        plots: farm.serialize(),
        player: { x: player.pos.x, z: player.pos.z },
      })
    );
  } catch (err) {
    console.warn('Gagal menyimpan.', err);
  }
}

// ---------- input ----------
const keys = new Set();
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  keys.add(k);

  if (k === 'escape') {
    if (!ui.el.shopModal.classList.contains('hidden')) ui.closeShop();
    return;
  }
  if (ui.modalOpen) return;

  if (k === 'e' || k === ' ') {
    e.preventDefault();
    doAction();
  } else if (k === '1' || k === '2' || k === '3') {
    selectSeed(Object.keys(CROPS)[Number(k) - 1]);
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function selectSeed(type) {
  if (!type) return;
  state.selected = type;
  ui.render(state);
  saveGame();
}

// camera orbit
let camYaw = 0;
let camPitch = 0.72;
let camDist = 16;
let dragging = false;
let lastPointer = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointer = { x: e.clientX, y: e.clientY };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  camYaw -= dx * 0.006;
  camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.18, 1.15);
  lastPointer = { x: e.clientX, y: e.clientY };
});
const endDrag = () => (dragging = false);
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);
renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.012, 7, 24);
  },
  { passive: true }
);

// ---------- gameplay ----------
function doAction() {
  if (ui.modalOpen) return;

  if (player.distanceTo(world.shopPos) < 3.4) {
    ui.openShop(state, {
      onBuy(type) {
        const c = CROPS[type];
        if (!c || state.money < c.seedPrice) return false;
        state.money -= c.seedPrice;
        state.seeds[type] = (state.seeds[type] || 0) + 1;
        ui.toast(`Beli benih ${c.name}.`);
        ui.render(state);
        saveGame();
        return true;
      },
      onSell(type) {
        const c = CROPS[type];
        const have = state.produce[type] || 0;
        if (!c || have <= 0) return false;
        state.money += have * c.sellPrice;
        state.produce[type] = 0;
        ui.toast(`Jual ${have} ${c.name}: +${have * c.sellPrice}g`);
        ui.render(state);
        saveGame();
        return true;
      },
    });
    return;
  }

  if (player.distanceTo(world.bedPos) < 3) {
    sleep();
    return;
  }

  const plot = farm.nearest(player.pos, 2.45);
  if (plot) {
    const res = farm.interact(plot, state);
    ui.toast(res.msg);
    if (res.changed) {
      ui.render(state);
      saveGame();
    }
    return;
  }

  ui.toast('Tidak ada yang bisa dikerjakan di sini.');
}

let sleeping = false;
function sleep() {
  if (sleeping) return;
  sleeping = true;
  ui.fade(true);
  setTimeout(() => {
    const grown = farm.endOfDay();
    state.day += 1;
    state.minutes = DAY_START;
    saveGame();
    ui.render(state);
    ui.toast(`Hari ${state.day} dimulai. ${grown} tanaman tumbuh.`);
    ui.fade(false);
    sleeping = false;
  }, 600);
}

// ---------- day / night ----------
function applySky() {
  const hours = state.minutes / 60;
  // dawn 04:30-07:30, dusk 17:00-19:30
  const dayT =
    THREE.MathUtils.smoothstep(hours, 4.5, 7.5) * (1 - THREE.MathUtils.smoothstep(hours, 17, 19.5));
  const bg = NIGHT_SKY.clone().lerp(DAY_SKY, dayT);
  scene.background.copy(bg);
  scene.fog.color.copy(bg);

  hemi.intensity = 0.5 + dayT * 0.55;
  sun.intensity = 0.35 + dayT * 2.25;

  const warm = new THREE.Color(0xffb36b);
  sun.color.copy(new THREE.Color(0xfff3d6).lerp(warm, 1 - dayT));
  sun.position.set(Math.cos(hours * 0.4) * 26 + 10, 18 + dayT * 16, 16);

  // clouds drift
  for (const c of world.clouds) {
    c.position.x += 0.004;
    if (c.position.x > 55) c.position.x = -55;
  }
}

// ---------- camera ----------
const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();

function updateCamera(dt, snap = false) {
  // look slightly ahead of the player so the field in front stays in frame
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  camTarget.set(player.pos.x + fx * 2.2, 1.1, player.pos.z + fz * 2.2);
  const cp = Math.cos(camPitch);
  camDesired.set(
    camTarget.x + Math.sin(camYaw) * cp * camDist,
    camTarget.y + Math.sin(camPitch) * camDist,
    camTarget.z + Math.cos(camYaw) * cp * camDist
  );
  if (camDesired.y < 1.6) camDesired.y = 1.6;

  if (snap) camera.position.copy(camDesired);
  else camera.position.lerp(camDesired, 1 - Math.exp(-7 * dt));

  camera.lookAt(camTarget);
}

// ---------- hint ----------
function updateHint() {
  if (ui.modalOpen) {
    ui.setHint(null);
    return;
  }
  if (player.distanceTo(world.shopPos) < 3.4) return ui.setHint('Buka toko desa');

  if (player.distanceTo(world.bedPos) < 3) return ui.setHint('Tidur — lanjut ke hari berikutnya');

  const plot = farm.nearest(player.pos, 2.45);
  if (!plot) return ui.setHint(null);

  if (!plot.tilled) return ui.setHint('Cangkul tanah');
  if (!plot.crop) {
    const c = CROPS[state.selected];
    return ui.setHint(c ? `Tanam ${c.name} (${state.seeds[state.selected] || 0} benih)` : 'Pilih benih');
  }
  const def = CROPS[plot.crop.type];
  if (plot.crop.growth >= def.days) return ui.setHint(`Panen ${def.name}`);
  if (!plot.watered) return ui.setHint('Siram tanaman');
  return ui.setHint(`${def.name} tumbuh ${plot.crop.growth}/${def.days} hari`);
}

// ---------- loop ----------
const clock = new THREE.Clock();
let uiTimer = 0;
let hintTimer = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  let mx = 0;
  let mz = 0;
  if (!ui.modalOpen && !sleeping) {
    if (keys.has('w') || keys.has('arrowup')) mz += 1;
    if (keys.has('s') || keys.has('arrowdown')) mz -= 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;

    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = -fz;
    const rz = fx;

    const wx = fx * mz + rx * mx + (IS_TOUCH ? ui.input.x : 0);
    const wz = fz * mz + rz * mx + (IS_TOUCH ? ui.input.z : 0);
    player.update(dt, wx, wz, keys.has('shift'));
  } else {
    player.update(dt, 0, 0, false);
  }

  if (!ui.modalOpen && !sleeping) {
    state.minutes += dt * MINUTES_PER_SECOND;
    if (state.minutes >= 24 * 60) sleep();
    uiTimer += dt;
    if (uiTimer > 0.4) {
      uiTimer = 0;
      ui.render(state);
    }
  }

  farm.update(dt, t);
  applySky();
  updateCamera(dt);

  hintTimer += dt;
  if (hintTimer > 0.15) {
    hintTimer = 0;
    updateHint();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------- boot ----------
const resumed = loadGame();
ui.bind({
  onAction: doAction,
  onSelect: selectSeed,
});
if (resumed) {
  ui.el.helpModal.classList.add('hidden');
  ui.modalOpen = false;
  ui.toast('Lanjut dari save terakhir.');
}
ui.render(state);
updateCamera(0, true);
applySky();
requestAnimationFrame(tick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// debug/test hook
window.__game = { state, farm, player, ui, world, saveGame, doAction };

// autosave tiap 15 detik
setInterval(saveGame, 15000);
