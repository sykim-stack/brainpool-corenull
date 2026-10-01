/**
 * Generate 5 distinct alley/walking-scene background JPGs for the plaza + yard covers.
 * Referenced by app/plaza/page.tsx:136 -> /alley/alley-01~05.{jpg|jpeg}
 * Stylized in the CoreNull palette (brown #2C1810 / green #4A5240 / sage #7A8C6E /
 * cream #FEFCF8 / warm #FFD8A8).
 *
 * Uses jimp v1.x pixel-buffer manipulation (drawing primitives were removed in v1).
 */
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const W = 640, H = 360;
const SKY_H = 210;                       // 58% sky
const OUT = path.join('G:/brainpool-corenull/public/alley');
fs.mkdirSync(OUT, { recursive: true });

const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

function setPx(d, i, r, g, b, a = 255) {
  d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = (a > 255 ? 255 : a < 0 ? 0 : a);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRgb(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}
// fill axis-aligned rectangle [x0,y0) -> [x1,y1) with solid color
function rect(d, x0, y0, x1, y1, c) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) setPx(d, (y * W + x) * 4, c[0], c[1], c[2]);
}
function vGrad(d, y0, y1, top, bot) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const c = lerpRgb(top, bot, t);
    for (let x = 0; x < W; x++) setPx(d, (y * W + x) * 4, c[0], c[1], c[2]);
  }
}
function ellipse(d, cx, cy, rx, ry, c, a = 255) {
  const x0 = Math.max(0, cx - rx * 1.05), x1 = Math.min(W, cx + rx * 1.05);
  const y0 = Math.max(0, cy - ry * 1.05), y1 = Math.min(H, cy + ry * 1.05);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) setPx(d, (y * W + x) * 4, c[0], c[1], c[2], a);
  }
}
// soft glow disc (alpha falloff) for lamp glow
function glow(d, cx, cy, r, c) {
  const rr = r * 1.7;
  const x0 = Math.max(0, cx - rr), x1 = Math.min(W, cx + rr);
  const y0 = Math.max(0, cy - rr), y1 = Math.min(H, cy + rr);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const dd = Math.hypot(x - cx, y - cy);
    if (dd <= rr) {
      const a = Math.round(Math.max(0, 255 * Math.pow(1 - dd / rr, 2)));
      if (a > 0) setPx(d, (y * W + x) * 4, c[0], c[1], c[2], a);
    }
  }
}
function line(d, x0, y0, x1, y1, c, thick = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    rect(d, x, y, x + thick, y + thick, c);
  }
}
function newImg() { return new Jimp({ width: W, height: H }); }

/** Build one scene. `idx` (0..4) selects the palette/variant. */
function drawScene(img, idx) {
  const d = img.bitmap.data;
  // unified DAY palette (consistent across all 5 scenes - no muddy multi-tone)
  const SKY_TOP  = [170, 204, 236];   // light day sky (top)
  const SKY_BOT  = [205, 227, 250];   // near horizon
  const GROUND   = [146, 119, 84];    // earth path base
  const GRASS    = [107, 150, 82];    // green grass strips
  const WOOD     = idx % 2 === 0 ? [58, 44, 32] : [120, 110, 100]; // wall texture
  const LAMP     = [255, 228, 150];
  const LAMP_POLE = [44, 24, 16];

  const skyTop = SKY_TOP, skyBot = SKY_BOT, gr = GROUND, ga = GRASS, wd = WOOD;
  const lamp = true;                    // day lamps (subtle)
  const rain = false;                   // day-only (no rain)
  const night = false;                  // day-only (no stars)

  // sky gradient
  vGrad(d, 0, SKY_H, skyTop, skyBot);
  // ground
  rect(d, 0, SKY_H, W, H, gr);

  // central walking path (trapezoid narrowing toward horizon)
  const pathHalfWide = 230, pathHalfNarrow = 50;
  for (let y = SKY_H + 6; y < H - 4; y++) {
    const t = (y - SKY_H) / (H - SKY_H);
    const hw = Math.round(lerp(pathHalfWide, pathHalfNarrow, t));
    const cx = W / 2;
    const cPath = [210, 175, 145];
    rect(d, cx - hw, y, cx + hw, y + 1, cPath);
  }
  // ground sides (grass) outside path
  const sideTop = SKY_H + 24;
  for (let y = sideTop; y < H - 4; y++) {
    const t = (y - SKY_H) / (H - SKY_H);
    const hw = Math.round(lerp(pathHalfWide, pathHalfNarrow, t)) + 12;
    const cx = W / 2;
    rect(d, 0, y, cx - hw, y + 1, ga);        // left grass strip
    rect(d, cx + hw, y, W, y + 1, ga);        // right grass strip
  }

  // alley walls (tall) on both sides
  const wallTop = SKY_H + 10;
  rect(d, 0, wallTop, 24, H, wd);            // left wall
  rect(d, W - 24, wallTop, W, H, wd);        // right wall

  // trees (trunks + canopies) — 4 along the path
  const trees = [[150, H - 70, 1], [260, H - 78, 0], [380, H - 70, 2], [500, H - 78, 1]];
  for (const [tx, ty, variant] of trees) {
    rect(d, tx, ty, tx + 8, ty + 42, [70, 44, 28]);
    const csize = [36, 40, 32][variant];
    const cc = [94, 139, 93];
    ellipse(d, tx + 19, ty - 12, csize, csize + 6, cc);
    ellipse(d, tx + 19, ty + 12, csize - 4, csize + 2, cc);
  }

  // lamp posts (dusk / night)
  if (lamp) {
    const posts = [[120, H - 90], [480, H - 90]];
    for (const [px, py] of posts) {
      rect(d, px, py, px + 6, py + 46, LAMP_POLE);
      ellipse(d, px + 3, py + 18, 14, 18, LAMP);
      glow(d, px + 3, py + 18, 34, LAMP);
      // subtle amber spill (narrow wedge - not a bright cream stain)
      rect(d, px - 6, H - 4, px + 12, H - 1, [230, 170, 90]);
    }
  }

  // stars (night)
  if (night) {
    for (let k = 0; k < 36; k++) {
      const sx = Math.random() * W, sy = Math.random() * (SKY_H - 30) + 20;
      const r = 0.6 + Math.random() * 1.4;
      const a = Math.random() > 0.6 ? 255 : 170;
      ellipse(d, sx, sy, r, r, STAR, a);
    }
  }

  // rain (rainy) — diagonal lines across the lower half
  if (rain) {
    const rainC = [200, 215, 225, 170];
    for (let k = 0; k < 160; k++) {
      const rx = Math.random() * W, ry = SKY_H + 10 + Math.random() * (H - SKY_H - 14);
      const rl = 6 + Math.random() * 12;
      line(d, rx, ry, rx - 3, ry + rl, rainC, 1);
    }
  }
}

const NAMES = ['alley-01', 'alley-02', 'alley-03', 'alley-04', 'alley-05'];
const EXTS  = ['jpg', 'jpg', 'jpg', 'jpg', 'jpg'];

(async () => {
  // deterministic-ish per scene (seed via Math.random once at module load is fine; we re-seed below)
  for (let i = 0; i < 5; i++) {
    // re-seed the global RNG so star/rain distribution is stable per run
    let rng = (i + 1) * 9301 + 497; // linear congruential-ish
    Math.random = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return (rng / 0x7fffffff) % 1; };

    const img = newImg();
    drawScene(img, i);
    const ext = EXTS[i];
    const p = path.join(OUT, `${NAMES[i]}.${ext}`);
    try {
      img.write(p);                       // format inferred from .jpg / .jpeg extension
      console.log('wrote', p);
    } catch (e) {
      console.error('ERR writing', p, e.message);
    }
  }
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
