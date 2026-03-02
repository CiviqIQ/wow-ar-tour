import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../src/data/stops.json', import.meta.url), 'utf-8'));

const BASE = 'https://tour.whatoncewas.org';
const OUT_DIR = path.resolve('dist-qr');

const safe = (s) => s.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');

await fs.mkdir(OUT_DIR, { recursive: true });

const rows = [];

for (const stop of data.stops) {
  const url = `${BASE}/tour/stop/${stop.id}/`;
  const filename = `${stop.id}.png`;
  const filePath = path.join(OUT_DIR, filename);

  const png = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 10,
    color: { dark: '#000000', light: '#ffffff' },
  });

  await fs.writeFile(filePath, png);

  rows.push({
    id: stop.id,
    name: stop.name,
    qr_url: url,
    ar_url: stop.arUrl || '',
    map_url: stop.mapUrl || '',
    qr_png: `dist-qr/${filename}`,
  });
}

const csvEscape = (v) => {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
};

const headers = ['id','name','qr_url','ar_url','map_url','qr_png'];
const csv = [headers.join(',')]
  .concat(rows.map(r => headers.map(h => csvEscape(r[h])).join(',')))
  .join('\n');

await fs.writeFile(path.join(OUT_DIR, 'qr-map.csv'), csv);

// Simple print sheet HTML
const cards = rows.map(r => {
  return `
  <div class="card">
    <img src="./${path.basename(r.qr_png)}" alt="QR: ${r.name}" />
    <div class="meta">
      <div class="name">${r.name}</div>
      <div class="small">${r.qr_url}</div>
    </div>
  </div>`;
}).join('\n');

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>WOW AR Tour — QR Sheet</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { font-family: Arial, sans-serif; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; display: grid; grid-template-columns: 110px 1fr; gap: 12px; align-items: center; }
    img { width: 110px; height: 110px; }
    .name { font-weight: 700; margin-bottom: 4px; }
    .small { font-size: 11px; color: #444; word-break: break-all; }
  </style>
</head>
<body>
  <h1>WOW AR Tour — QR Codes (tour.whatoncewas.org)</h1>
  <div class="grid">${cards}</div>
</body>
</html>`;

await fs.writeFile(path.join(OUT_DIR, 'qr-sheet.html'), html);

console.log(`Generated ${rows.length} QR codes in: ${OUT_DIR}`);
