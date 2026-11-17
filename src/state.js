export const CROPS = {
  turnip: { name: 'Turnip', seedPrice: 20, sellPrice: 45, days: 2, yield: 2, color: 0xf1e6c4, leaf: 0x3f8f43 },
  potato: { name: 'Kentang', seedPrice: 40, sellPrice: 95, days: 3, yield: 2, color: 0xcf9c55, leaf: 0x3c7a3c },
  strawberry: { name: 'Stroberi', seedPrice: 60, sellPrice: 70, days: 4, yield: 3, color: 0xd8382f, leaf: 0x2f7d32 },
};

export const CROP_KEYS = Object.keys(CROPS);

export const ICONS = { turnip: '🥬', potato: '🥔', strawberry: '🍓' };

export function freshState() {
  return {
    day: 1,
    minutes: 6 * 60,
    money: 120,
    seeds: { turnip: 6, potato: 2, strawberry: 0 },
    produce: { turnip: 0, potato: 0, strawberry: 0 },
    selected: 'turnip',
  };
}

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
