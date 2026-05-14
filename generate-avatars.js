/**
 * generate-avatars.js
 * Creates 12 pixel-art avatar PNGs (256x256, circle-masked) from hand-designed 16x16 grids.
 * Run: node generate-avatars.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const OUT_DIR  = path.join(__dirname, 'assets', 'avatars');
const SCALE    = 16;   // 16×16 logical pixels → 256×256 output
const GRID_SZ  = 16;

// ── grid builder ────────────────────────────────────────────────────────────
// ops:
//   [r, c, ch]           single pixel
//   [r, c1, c2, ch]      single row, col range
//   [r1, r2, c1, c2, ch] rect fill
function buildGrid(ops) {
  const g = Array.from({ length: GRID_SZ }, () => Array(GRID_SZ).fill('.'));
  for (const op of ops) {
    if (op.length === 3) {
      const [r, c, ch] = op;
      g[r][c] = ch;
    } else if (op.length === 4) {
      const [r, c1, c2, ch] = op;
      for (let c = c1; c <= c2; c++) g[r][c] = ch;
    } else {
      const [r1, r2, c1, c2, ch] = op;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) g[r][c] = ch;
    }
  }
  return g.map(row => row.join(''));
}

// ── PNG encoder ─────────────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(rgba, w, h) {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(Buffer.from([0]));
    for (let x = 0; x < w; x++) {
      const [r,g,b,a] = rgba[y * w + x];
      rows.push(Buffer.from([r, g, b, a]));
    }
  }
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── renderer ─────────────────────────────────────────────────────────────────
// Renders a 16×16 logical grid → W×W pixel PNG with a circular mask (outside = transparent).
function render(rows, palMap, bgColor) {
  const W = GRID_SZ * SCALE;
  const r = W / 2;
  const out = [];
  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const dx = px - r + 0.5, dy = py - r + 0.5;
      if (Math.sqrt(dx * dx + dy * dy) > r) {
        out.push([0, 0, 0, 0]);   // transparent
        continue;
      }
      const lx = Math.floor(px / SCALE), ly = Math.floor(py / SCALE);
      const ch  = rows[ly][lx];
      out.push(ch === '.' ? [...bgColor, 255] : [...palMap[ch], 255]);
    }
  }
  return makePNG(out, W, W);
}

// ── avatar definitions ───────────────────────────────────────────────────────

const AVATARS = {

  // ── 1. PENGUIN ────────────────────────────────────────────────────────────
  penguin: {
    bg:  [205, 225, 240],
    pal: {
      B: [22,  22,  38 ],
      W: [244, 244, 244],
      O: [238, 142, 22 ],
    },
    grid: buildGrid([
      // Black head oval
      [1,  2,  5, 10, 'B'],   // crown
      [3,  3,  4, 11, 'B'],   // upper head
      [4, 13,  3, 12, 'B'],   // main head
      [14,14,  4, 11, 'B'],   // chin
      // White face — large oval
      [4,  4,  6,  9, 'W'],   // narrow top
      [5, 12,  5, 10, 'W'],   // full oval
      [13,13,  6,  9, 'W'],   // narrow chin
      // Eyes
      [7,  7,  6,  6, 'B'],
      [7,  7,  9,  9, 'B'],
      // Eye highlights
      [6,  6,  6,  6, 'W'],
      [6,  6,  9,  9, 'W'],
      // Beak
      [9, 10,  7,  8, 'O'],
    ]),
  },

  // ── 2. ALIEN ──────────────────────────────────────────────────────────────
  // Already within safe zone — unchanged
  alien: {
    bg:  [195, 232, 195],
    pal: {
      G: [90,  195,  72],
      g: [60,  155,  50],
      B: [14,  12,   28],
      H: [210, 245, 205],
      m: [50,  130,  42],
    },
    grid: buildGrid([
      [1, 1,  5, 10, 'G'],
      [2, 2,  4, 11, 'G'],
      [3, 12, 3, 12, 'G'],
      [4, 6,  3,  5, 'B'],
      [4, 6,  9, 11, 'B'],
      [4, 4,  3,  3, 'H'],
      [4, 4,  9,  9, 'H'],
      [4, 6,  6,  8, 'G'],
      [9, 9,  5, 10, 'm'],
      [10,10,  6,  9, 'm'],
    ]),
  },

  // ── 3. ELEPHANT ───────────────────────────────────────────────────────────
  // Ears moved inward: start at row 3 (col 2 safe from row 3) and cols 2-4 / 11-13
  elephant: {
    bg:  [235, 230, 220],
    pal: {
      E: [162, 162, 168],
      e: [120, 120, 126],
      D: [22,  22,  28 ],
      p: [200, 155, 155],
    },
    grid: buildGrid([
      // Main head
      [3, 12, 5, 10, 'E'],
      // Left ear — starts at row 3, col 2 (safe: dist=124)
      [3,  9,  2,  4, 'E'],
      // Right ear
      [3,  9, 11, 13, 'E'],
      // Pink inner ear
      [4,  8,  2,  3, 'p'],
      [4,  8, 12, 13, 'p'],
      // Eyes
      [5, 5, 6, 6, 'D'],
      [5, 5, 9, 9, 'D'],
      // Trunk
      [9, 12, 7, 8, 'e'],
      [12,13, 7, 7, 'e'],
    ]),
  },

  // ── 4. CAT ────────────────────────────────────────────────────────────────
  // Ears moved to start row 2 so col 3 is safe
  cat: {
    bg:  [245, 235, 215],
    pal: {
      C: [205, 135,  65],
      c: [165, 100,  40],
      D: [22,  22,   28],
      G: [95,  165,  75],
      P: [210, 130, 130],
      W: [250, 245, 235],
    },
    grid: buildGrid([
      // Main face
      [3, 12, 3, 12, 'C'],
      // Ears start at row 2 (col 3 safe at row 2: dist=124)
      [2,  4,  3,  5, 'C'],
      [2,  4, 10, 12, 'C'],
      [3,  4,  4,  4, 'c'],
      [3,  4, 11, 11, 'c'],
      // Gap between ears at row 2
      [2,  2,  6,  9, '.'],
      // Forehead stripes
      [3,  3,  6,  6, 'c'],
      [3,  3,  9,  9, 'c'],
      [4,  4,  5,  7, 'c'],
      [4,  4,  8, 10, 'c'],
      // Almond eyes
      [5,  5,  6,  6, 'G'],
      [5,  5,  9,  9, 'G'],
      [6,  6,  5,  7, 'G'],
      [6,  6,  8, 10, 'G'],
      [6,  6,  6,  6, 'D'],
      [6,  6,  9,  9, 'D'],
      [7,  7,  6,  6, 'G'],
      [7,  7,  9,  9, 'G'],
      // White muzzle
      [8, 10,  5, 10, 'W'],
      [8,  8,  7,  8, 'P'],
      [9,  9,  7,  8, 'P'],
      // Whisker dots
      [9,  9,  3,  4, 'c'],
      [9,  9, 11, 12, 'c'],
    ]),
  },

  // ── 5. FOX ────────────────────────────────────────────────────────────────
  // Ears: row 0 removed; tips at row 1 cols 5-6 / 9-10 (safe); widen from row 2
  fox: {
    bg:  [245, 235, 220],
    pal: {
      F: [210,  98,  38],
      f: [165,  65,  22],
      W: [245, 240, 225],
      D: [22,   22,  28],
      A: [235, 175,  95],
      B: [28,   20,  20],
    },
    grid: buildGrid([
      // Main head
      [3, 12, 3, 12, 'F'],
      // Ear tips at row 1 (cols 5-6 / 9-10 are safe in row 1)
      [1,  3,  5,  6, 'F'],
      [1,  3,  9, 10, 'F'],
      // Ears widen from row 2
      [2,  4,  4,  6, 'F'],
      [2,  4,  9, 11, 'F'],
      // Dark ear tips
      [1,  2,  5,  5, 'B'],
      [1,  2, 10, 10, 'B'],
      // Gap between ears at row 1-2
      [1,  2,  7,  8, '.'],
      // Dark eye mask
      [5,  7,  4,  6, 'f'],
      [5,  7,  9, 11, 'f'],
      // Amber eyes
      [5,  6,  5,  5, 'A'],
      [5,  6, 10, 10, 'A'],
      [6,  6,  5,  5, 'D'],
      [6,  6, 10, 10, 'D'],
      // White muzzle
      [8, 11,  5, 10, 'W'],
      [8,  9,  7,  8, 'f'],
      // Cheek tufts
      [7,  8,  3,  4, 'W'],
      [7,  8, 11, 12, 'W'],
    ]),
  },

  // ── 6. BEAR ───────────────────────────────────────────────────────────────
  // Ear bumps at row 1 cols 4-5 / 10-11 (barely in circle but visible)
  bear: {
    bg:  [235, 220, 205],
    pal: {
      R: [148,  90,  48],
      r: [108,  62,  28],
      D: [22,   22,  28],
      C: [200, 155, 110],
    },
    grid: buildGrid([
      // Main face from row 2
      [2, 12, 3, 12, 'R'],
      // Ear bumps peek above face at row 1 (cols 4-5 / 10-11)
      [1,  2,  4,  5, 'R'],
      [1,  2, 10, 11, 'R'],
      [1,  2,  5,  5, 'r'],   // inner ear
      [1,  2, 10, 10, 'r'],
      // Eyes
      [5,  5,  5,  5, 'D'],
      [5,  5, 10, 10, 'D'],
      [4,  4,  5,  5, 'C'],
      [4,  4, 10, 10, 'C'],
      // Muzzle
      [7, 10,  5, 10, 'C'],
      [7,  8,  6,  9, 'r'],
      [8,  8,  7,  8, 'D'],
      [9,  9,  7,  7, 'r'],
      [9,  9,  8,  8, 'r'],
      [10,10,  6,  6, 'r'],
      [10,10,  9,  9, 'r'],
    ]),
  },

  // ── 7. LION ───────────────────────────────────────────────────────────────
  // Row 0 spikes removed; mane row 1 restricted to cols 5-10; mane from row 2 at cols 3-12
  lion: {
    bg:  [248, 235, 195],
    pal: {
      L: [218, 170,  68],
      l: [175, 118,  30],
      D: [22,   22,  28],
      A: [175, 130,  55],
      P: [195, 115,  95],
      W: [245, 230, 185],
    },
    grid: buildGrid([
      // Mane: row 1 centre-only, full from row 2
      [1,  1,  5, 10, 'l'],
      [2, 12,  3, 12, 'l'],
      // Face
      [2, 11,  4, 11, 'L'],
      [3, 10,  5, 10, 'W'],
      // Ears inside mane at row 2 (col 4 safe)
      [2,  2,  4,  5, 'L'],
      [2,  2, 10, 11, 'L'],
      // Eyes
      [5,  6,  5,  6, 'A'],
      [5,  6,  9, 10, 'A'],
      [6,  6,  5,  5, 'D'],
      [6,  6, 10, 10, 'D'],
      // Nose + mouth
      [8,  9,  7,  8, 'P'],
      [10,10,  6,  6, 'l'],
      [10,10,  9,  9, 'l'],
      [11,11,  7,  8, 'l'],
    ]),
  },

  // ── 8. ROBOT ──────────────────────────────────────────────────────────────
  // Head cols 3-12 (col 2/13 are clipped at row 2); antenna at row 1 centre
  robot: {
    bg:  [52,  62,  72],
    pal: {
      S: [178, 188, 198],
      s: [130, 140, 150],
      B: [22,   28,  38],
      T: [68,  200, 245],
      R: [225,  55,  55],
      Y: [245, 215,  55],
    },
    grid: buildGrid([
      // Square head cols 3-12
      [2, 12,  3, 12, 'S'],
      // Border shading
      [2,  2,  3, 12, 's'],
      [12,12,  3, 12, 's'],
      [2, 12,  3,  3, 's'],
      [2, 12, 12, 12, 's'],
      // Antenna stem + tip at row 1 (safe centre)
      [1,  1,  8,  8, 's'],
      [1,  1,  7,  7, 'R'],
      // LED eyes
      [5,  6,  5,  6, 'T'],
      [5,  6,  9, 10, 'T'],
      // Eye sockets
      [4,  7,  4,  7, 's'],
      [4,  7,  8, 11, 's'],
      [5,  6,  5,  6, 'T'],
      [5,  6,  9, 10, 'T'],
      // Mouth grill
      [9,  9,  4, 11, 's'],
      [9,  9,  4,  4, 'Y'],
      [9,  9,  6,  6, 'Y'],
      [9,  9,  8,  8, 'Y'],
      [9,  9, 10, 10, 'Y'],
      [10,10,  4, 11, 's'],
      // Rivets
      [3,  3,  4,  4, 's'],
      [3,  3, 11, 11, 's'],
      [11,11,  4,  4, 's'],
      [11,11, 11, 11, 's'],
    ]),
  },

  // ── 9. RABBIT ─────────────────────────────────────────────────────────────
  // Ears start at row 1 cols 5-6 / 9-10 (both safe in row 1)
  rabbit: {
    bg:  [240, 235, 248],
    pal: {
      W: [245, 243, 248],
      P: [218, 140, 160],
      D: [22,   22,  40],
      B: [160, 150, 165],
    },
    grid: buildGrid([
      // Tall ears from row 1 (cols 5-6 and 9-10 are safe)
      [1,  6,  5,  6, 'W'],
      [1,  6,  9, 10, 'W'],
      [1,  5,  5,  5, 'P'],   // pink inner ear
      [1,  5, 10, 10, 'P'],
      // Round head
      [5, 12,  3, 12, 'W'],
      [6, 11,  2, 13, 'W'],
      // Eyes
      [7,  7,  5,  5, 'D'],
      [7,  7, 10, 10, 'D'],
      [6,  6,  5,  5, 'W'],
      [6,  6, 10, 10, 'W'],
      // Nose
      [9,  9,  7,  8, 'P'],
      [10,10,  7,  8, 'P'],
      // Mouth
      [10,10,  6,  6, 'B'],
      [10,10,  9,  9, 'B'],
      [11,11,  7,  8, 'B'],
    ]),
  },

  // ── 10. KOALA ─────────────────────────────────────────────────────────────
  // Big ears moved to rows 2-6, cols 3-5 / 10-12 (all safe from row 2)
  koala: {
    bg:  [235, 238, 240],
    pal: {
      K: [155, 158, 162],
      k: [110, 112, 116],
      L: [195, 198, 202],
      D: [22,   22,  28],
      W: [225, 228, 232],
    },
    grid: buildGrid([
      // Large ears (rows 2-6, cols 3-5 / 10-12 — all safe)
      [2,  6,  3,  5, 'K'],
      [2,  6, 10, 12, 'K'],
      // Inner ear detail
      [2,  5,  3,  4, 'L'],
      [2,  5, 11, 12, 'L'],
      [3,  5,  3,  4, 'k'],
      [3,  5, 11, 12, 'k'],
      // Main head (overlaps ear base from row 4)
      [4, 13,  4, 11, 'K'],
      [5, 12,  3, 12, 'K'],
      // Eyes
      [7,  7,  5,  5, 'D'],
      [7,  7, 10, 10, 'D'],
      [6,  6,  5,  5, 'W'],
      [6,  6, 10, 10, 'W'],
      // Big nose
      [9, 10,  5, 10, 'k'],
      [9, 10,  6,  9, 'D'],
      // Mouth
      [11,11,  7,  8, 'k'],
    ]),
  },

  // ── 11. PANDA ─────────────────────────────────────────────────────────────
  // Black ears moved to row 2 (col 3 safe at row 2)
  panda: {
    bg:  [242, 242, 242],
    pal: {
      W: [248, 248, 248],
      B: [24,   24,  30],
      D: [14,   14,  20],
      H: [255, 255, 255],
      P: [180, 120, 125],
    },
    grid: buildGrid([
      // White face
      [2, 13,  3, 12, 'W'],
      // Black ears start at row 2 (safe)
      [2,  4,  3,  5, 'B'],
      [2,  4, 10, 12, 'B'],
      // Black eye patches
      [4,  8,  3,  6, 'B'],
      [4,  8,  9, 12, 'B'],
      // White pupils within patches
      [5,  7,  4,  5, 'H'],
      [5,  7,  9, 10, 'H'],
      [6,  6,  4,  4, 'D'],
      [6,  6, 10, 10, 'D'],
      // Nose + mouth
      [9,  9,  7,  8, 'P'],
      [10,10,  7,  8, 'B'],
      [11,11,  6,  6, 'B'],
      [11,11,  9,  9, 'B'],
      [12,12,  7,  8, 'B'],
    ]),
  },

  // ── 12. FROG ──────────────────────────────────────────────────────────────
  // Bulging eyes moved to rows 2-5, cols 4-6 / 9-11 (safe from row 2)
  frog: {
    bg:  [205, 238, 205],
    pal: {
      G: [68,  195,  72],
      g: [40,  148,  48],
      D: [14,   14,  22],
      H: [200, 245, 200],
      Y: [230, 245, 100],
    },
    grid: buildGrid([
      // Main head
      [4, 13,  3, 12, 'G'],
      [3, 13,  4, 11, 'G'],
      // Bulging eyes at rows 2-5, cols 4-6 / 9-11 (safe)
      [2,  5,  4,  6, 'G'],
      [2,  5,  9, 11, 'G'],
      // Dark outline rings
      [2,  5,  4,  4, 'g'],
      [2,  5, 11, 11, 'g'],
      [2,  2,  4,  6, 'g'],
      [2,  2,  9, 11, 'g'],
      [5,  5,  4,  6, 'g'],
      [5,  5,  9, 11, 'g'],
      // Pupils
      [3,  4,  5,  5, 'D'],
      [3,  4, 10, 10, 'D'],
      // Highlights
      [2,  2,  4,  4, 'H'],
      [2,  2,  9,  9, 'H'],
      // Yellow belly
      [8, 12,  4, 11, 'Y'],
      // Wide smile
      [8,  8,  3,  3, 'g'],
      [8,  8, 12, 12, 'g'],
      [9,  9,  3,  3, 'g'],
      [9,  9, 12, 12, 'g'],
      [10,10,  4,  4, 'g'],
      [10,10, 11, 11, 'g'],
      [11,11,  5, 10, 'g'],
      // Nostrils
      [5,  5,  6,  6, 'g'],
      [5,  5,  9,  9, 'g'],
    ]),
  },
};

// ── generate ─────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

let generated = 0;
for (const [name, avatar] of Object.entries(AVATARS)) {
  const png = render(avatar.grid, avatar.pal, avatar.bg);
  const out = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓  ${name}.png  (${png.length} bytes)`);
  generated++;
}

console.log(`\nDone — ${generated} avatars written to ${OUT_DIR}`);
