import { CROPS, CROP_KEYS, ICONS, formatTime } from './state.js';

const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export class UI {
  constructor() {
    this.el = {
      day: document.getElementById('hud-day'),
      time: document.getElementById('hud-time'),
      money: document.getElementById('hud-money'),
      hotbar: document.getElementById('hotbar'),
      produce: document.getElementById('produce'),
      hint: document.getElementById('hint'),
      toast: document.getElementById('toast-wrap'),
      helpModal: document.getElementById('modal-help'),
      shopModal: document.getElementById('modal-shop'),
      shopBody: document.getElementById('shop-body'),
      fade: document.getElementById('fade'),
      knob: document.getElementById('knob'),
      stick: document.getElementById('stick'),
    };
    this.input = { x: 0, z: 0 };
    this.modalOpen = true;
    this.onAction = null;
    this.onSelect = null;
    this.state = null;
    this.shopHandlers = null;
    this._slots = [];
    this._buildHotbar();
    this._bindTouch();
  }

  bind({ onAction, onSelect }) {
    this.onAction = onAction;
    this.onSelect = onSelect;

    document.getElementById('start-btn').addEventListener('click', () => {
      this.el.helpModal.classList.add('hidden');
      this.modalOpen = false;
    });
    document.getElementById('help-btn').addEventListener('click', () => {
      this.el.helpModal.classList.remove('hidden');
      this.modalOpen = true;
    });
    document.getElementById('shop-close').addEventListener('click', () => this.closeShop());

    this.el.shopModal.addEventListener('click', (e) => {
      if (e.target === this.el.shopModal) this.closeShop();
    });

    this.el.shopBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn || !this.shopHandlers) return;
      const { act, type } = btn.dataset;
      if (act === 'buy') {
        const ok = this.shopHandlers.onBuy(type);
        if (!ok) this.toast('Gold tidak cukup.');
      } else if (act === 'sell') {
        const ok = this.shopHandlers.onSell(type);
        if (!ok) this.toast('Belum ada hasil panen.');
      }
      this.renderShop();
    });
  }

  _buildHotbar() {
    this.el.hotbar.innerHTML = '';
    CROP_KEYS.forEach((key, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.type = key;
      slot.innerHTML = `<span class="n">${i + 1}</span><span class="ico">${ICONS[key]}</span><span class="cnt">0</span>`;
      slot.addEventListener('click', () => this.onSelect?.(key));
      this.el.hotbar.appendChild(slot);
      this._slots.push(slot);
    });
  }

  _bindTouch() {
    const stick = this.el.stick;
    const knob = this.el.knob;
    let active = null;
    const R = 40;

    const move = (e) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.x = dx / R;
      this.input.z = -dy / R;
    };

    const end = () => {
      active = null;
      knob.style.transform = 'translate(0px, 0px)';
      this.input.x = 0;
      this.input.z = 0;
    };

    stick.addEventListener('pointerdown', (e) => {
      active = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      move(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === active) move(e);
    });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    document.getElementById('act').addEventListener('click', () => this.onAction?.());
  }

  hintKey() {
    return IS_TOUCH ? 'A' : 'E';
  }

  setHint(text) {
    if (!text) {
      this.el.hint.classList.add('hidden');
      return;
    }
    this.el.hint.classList.remove('hidden');
    this.el.hint.innerHTML = `<span class="key">${this.hintKey()}</span><span>${text}</span>`;
  }

  toast(msg) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    this.el.toast.appendChild(div);
    setTimeout(() => div.remove(), 2600);
    while (this.el.toast.children.length > 4) this.el.toast.firstChild.remove();
  }

  render(state) {
    this.state = state;
    this.el.day.textContent = String(state.day);
    this.el.time.textContent = formatTime(state.minutes);
    this.el.money.textContent = `${Math.floor(state.money)}g`;

    for (const slot of this._slots) {
      const key = slot.dataset.type;
      const count = state.seeds[key] || 0;
      slot.classList.toggle('active', state.selected === key);
      slot.classList.toggle('empty', count <= 0);
      slot.querySelector('.cnt').textContent = String(count);
    }

    const parts = CROP_KEYS.filter((k) => (state.produce[k] || 0) > 0).map(
      (k) => `<span>${ICONS[k]} ${state.produce[k]}</span>`
    );
    this.el.produce.innerHTML = parts.join('');
    if (this.modalOpen && !this.el.shopModal.classList.contains('hidden')) this.renderShop();
  }

  openShop(state, handlers) {
    this.state = state;
    this.shopHandlers = handlers;
    this.el.shopModal.classList.remove('hidden');
    this.modalOpen = true;
    this.renderShop();
  }

  closeShop() {
    this.el.shopModal.classList.add('hidden');
    this.modalOpen = false;
  }

  renderShop() {
    const state = this.state;
    if (!state) return;
    const rows = [];

    for (const key of CROP_KEYS) {
      const c = CROPS[key];
      rows.push(`
        <div class="row">
          <span class="ico">${ICONS[key]}</span>
          <span class="nm">Benih ${c.name}<small>${c.seedPrice}g · panen ${c.days} hari · hasil x${c.yield}</small></span>
          <button data-act="buy" data-type="${key}" ${state.money < c.seedPrice ? 'disabled' : ''}>Beli ${c.seedPrice}g</button>
        </div>`);
    }

    rows.push('<div class="row" style="border-top:none;padding-top:2px;"><span class="nm" style="opacity:.6;font-size:12px;">Jual hasil panen</span></div>');

    for (const key of CROP_KEYS) {
      const c = CROPS[key];
      const have = state.produce[key] || 0;
      rows.push(`
        <div class="row">
          <span class="ico">${ICONS[key]}</span>
          <span class="nm">${c.name}<small>${have} di tas · ${c.sellPrice}g/buah</small></span>
          <button class="sell" data-act="sell" data-type="${key}" ${have <= 0 ? 'disabled' : ''}>Jual ${have}</button>
        </div>`);
    }

    this.el.shopBody.innerHTML = rows.join('');
  }

  fade(on) {
    this.el.fade.classList.toggle('on', on);
  }
}
