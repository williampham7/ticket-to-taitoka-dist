// Renders desktop/icon.svg to desktop/icon.ico (PNG-in-ICO, several sizes), desktop/icon-preview.png and, on macOS,
// desktop/icon.icns (via sips + iconutil) with Playwright's Chromium.
// Usage: node desktop/make-icon.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const sizes = [16, 24, 32, 48, 64, 128, 256];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const svg = fs.readFileSync(path.join(here, 'icon.svg'), 'utf8');
const pngs = [];
for (const s of sizes) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${s}px;height:${s}px;display:block}</style>${svg}`);
  pngs.push(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } }));
}

const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
fs.writeFileSync(path.join(here, 'icon.ico'), Buffer.concat([head, ...dir, ...pngs]));
fs.writeFileSync(path.join(here, 'icon-preview.png'), pngs[pngs.length - 1]);
console.log('wrote desktop/icon.ico');

if (process.platform === 'darwin') {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:1024px;height:1024px;display:block}</style>${svg}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-'));
  const big = path.join(tmp, 'big.png');
  fs.writeFileSync(big, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } }));
  const set = path.join(tmp, 'icon.iconset');
  fs.mkdirSync(set);
  for (const s of [16, 32, 128, 256, 512]) {
    execFileSync('sips', ['-z', String(s), String(s), big, '--out', path.join(set, `icon_${s}x${s}.png`)], { stdio: 'ignore' });
    execFileSync('sips', ['-z', String(2 * s), String(2 * s), big, '--out', path.join(set, `icon_${s}x${s}@2x.png`)], { stdio: 'ignore' });
  }
  execFileSync('iconutil', ['-c', 'icns', set, '-o', path.join(here, 'icon.icns')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('wrote desktop/icon.icns');
}
await browser.close();
