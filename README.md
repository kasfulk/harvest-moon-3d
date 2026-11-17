# Lembah Senja — Harvest Moon 3D (Web)

Farming game 3D kecil di browser: cangkul, tanam, siram, panen, jual, tidur. Three.js, tanpa build step.

## Jalan lokal

```bash
python3 -m http.server 5173
# buka http://localhost:5173
```

## Deploy ke Vercel

1. Import repo ini di Vercel.
2. Framework Preset: **Other**. Build Command: kosong. Output Directory: `.` (root).
3. Deploy. Tidak ada environment variable.

Atau via CLI: `vercel --prod`.

## Kontrol

- `WASD` / panah — jalan, `Shift` — lari
- `E` / `Space` — aksi kontekstual (cangkul → tanam → siram → panen, buka toko, tidur)
- `1` `2` `3` — pilih benih
- Drag — putar kamera, wheel — zoom
- Mobile: joystick kiri + tombol A

## Mekanik

- Tiap petak: rumput → cangkul → tanam → siram. Satu siraman = satu hari pertumbuhan.
- Tidur di depan pintu rumah untuk ganti hari (tanaman hanya tumbuh kalau disiram).
- Toko di sebelah timur ladang: beli benih, jual panen.
- Progres tersimpan otomatis di localStorage.

Tanaman: Turnip (2 hari), Kentang (3 hari), Stroberi (4 hari).
