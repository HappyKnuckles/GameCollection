import { SeededRNG } from '../../../utils/random';

/**
 * Procedural pixel-art pictures, so Pixel Collect never runs out of levels.
 *
 * A theme paints "role" labels (sky, hill, body, outline, ...) into the grid
 * and picks a colour per role. Every picture uses exactly the requested
 * number of colours, and the colours are pushed apart until they're easy to
 * tell from each other.
 */

export interface GeneratedPicture {
  name: string;
  grid: number[][];
  colors: string[];
}

interface ThemeResult {
  name: string;
  grid: number[][];
  colors: string[];
}

type Theme = (rng: SeededRNG, rows: number, cols: number, k: number) => ThemeResult;

// ---------- colour helpers ----------

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

const toHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Rough perceptual distance (weighted RGB). */
const distance = (a: Hsl, b: Hsl) => {
  const [r1, g1, b1] = hslToRgb(a.h, a.s, a.l);
  const [r2, g2, b2] = hslToRgb(b.h, b.s, b.l);
  const rm = (r1 + r2) / 2;
  return Math.sqrt(
    (2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2,
  );
};

const MIN_DISTANCE = 110;

/** Nudges later colours until every pair is clearly distinguishable. */
const makeDistinct = (colors: Hsl[], rng: SeededRNG): string[] => {
  const out: Hsl[] = [];
  for (const original of colors) {
    let c = { ...original };
    for (let tries = 0; tries < 40 && out.some(o => distance(o, c) < MIN_DISTANCE); tries++) {
      c =
        tries < 20
          ? { ...c, l: Math.max(15, Math.min(90, c.l + (rng.random() < 0.5 ? -9 : 9))) }
          : { h: rng.randInt(0, 359), s: rng.randInt(55, 85), l: rng.randInt(35, 75) };
    }
    out.push(c);
  }
  return out.map(c => toHex(hslToRgb(c.h, c.s, c.l)));
};

// ---------- grid helpers ----------

const blank = (rows: number, cols: number, v = 0) =>
  Array.from({ length: rows }, () => Array(cols).fill(v));

/** Smoothed random walk, e.g. for a hill silhouette. */
const ridge = (rng: SeededRNG, cols: number, base: number, amplitude: number) => {
  const raw: number[] = [];
  let h = base;
  for (let c = 0; c < cols; c++) {
    h += rng.randInt(-1, 1) * Math.max(1, Math.round(amplitude / 3));
    h = Math.max(base - amplitude, Math.min(base + amplitude, h));
    raw.push(h);
  }
  return raw.map((_, c) => {
    const window = raw.slice(Math.max(0, c - 1), c + 2);
    return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
  });
};

// ---------- themes ----------

const landscape: Theme = (rng, rows, cols, k) => {
  const roles = ['sky', 'ground', 'hill', 'sun', 'farHill', 'upperSky', 'cloud'].slice(0, k);
  const has = (r: string) => roles.includes(r);
  const id = (r: string) => roles.indexOf(r);
  const grid = blank(rows, cols, id('sky'));

  if (has('upperSky')) {
    const band = ridge(rng, cols, Math.max(1, Math.round(rows * 0.18)), 1);
    for (let c = 0; c < cols; c++) for (let r = 0; r < band[c]; r++) grid[r][c] = id('upperSky');
  }
  if (has('sun')) {
    const radius = Math.max(1.5, rows * rng.randInt(10, 16) / 100);
    const cx = rng.randInt(Math.round(cols * 0.2), Math.round(cols * 0.8));
    const cy = rng.randInt(Math.round(rows * 0.18), Math.round(rows * 0.32));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if ((r - cy) ** 2 + (c - cx) ** 2 <= radius * radius) grid[r][c] = id('sun');
  }
  if (has('cloud')) {
    for (let n = 0; n < 2; n++) {
      const cx = rng.randInt(1, cols - 2);
      const cy = rng.randInt(1, Math.max(1, Math.round(rows * 0.25)));
      const w = rng.randInt(2, Math.max(2, Math.round(cols * 0.18)));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (((c - cx) / (w + 0.5)) ** 2 + ((r - cy) / 1.3) ** 2 <= 1) grid[r][c] = id('cloud');
    }
  }
  const groundTop = rows - rng.randInt(2, Math.max(2, Math.round(rows * 0.2)));
  if (has('farHill')) {
    const far = ridge(rng, cols, Math.round(rows * 0.45), Math.max(1, Math.round(rows * 0.1)));
    for (let c = 0; c < cols; c++) for (let r = far[c]; r < rows; r++) grid[r][c] = id('farHill');
  }
  const near = ridge(rng, cols, Math.round(rows * 0.62), Math.max(1, Math.round(rows * 0.1)));
  for (let c = 0; c < cols; c++) for (let r = near[c]; r < rows; r++) grid[r][c] = id('hill');
  for (let c = 0; c < cols; c++) for (let r = groundTop; r < rows; r++) grid[r][c] = id('ground');

  const skyHue = rng.randInt(185, 225);
  const hillHue = rng.randInt(85, 140);
  const ground = rng.pick<Hsl>([
    { h: 40, s: 55, l: 72 }, // sand
    { h: 25, s: 45, l: 38 }, // soil
    { h: 210, s: 65, l: 42 }, // water
  ]);
  const palette: Record<string, Hsl> = {
    sky: { h: skyHue, s: 70, l: 82 },
    ground,
    hill: { h: hillHue, s: 50, l: 40 },
    sun: { h: rng.randInt(38, 52), s: 95, l: 58 },
    farHill: { h: hillHue + 25, s: 35, l: 64 },
    upperSky: { h: skyHue + 10, s: 65, l: 62 },
    cloud: { h: 0, s: 0, l: 98 },
  };
  return {
    name: has('sun') ? 'Sunny Hills' : 'Hills',
    grid,
    colors: makeDistinct(roles.map(r => palette[r]), rng),
  };
};

const creature: Theme = (rng, rows, cols, k) => {
  const roles = ['bg', 'body', 'outline', 'eye', 'spot', 'ground', 'mouth'].slice(0, k);
  const has = (r: string) => roles.includes(r);
  const id = (r: string) => roles.indexOf(r);

  // Random half body, mirrored, smoothed, largest blob kept.
  const half = Math.ceil(cols / 2);
  let body = blank(rows, cols, 0);
  const top = Math.round(rows * 0.12);
  const bottom = rows - Math.round(rows * (has('ground') ? 0.22 : 0.12));
  for (let r = top; r < bottom; r++)
    for (let c = 1; c < half; c++) {
      const dy = (r - (top + bottom) / 2) / ((bottom - top) / 2);
      const dx = (c - half) / (half - 1);
      const inside = dx * dx + dy * dy <= 1.05;
      if (inside && rng.random() < 0.62) body[r][c] = body[r][cols - 1 - c] = 1;
    }
  for (let pass = 0; pass < 2; pass++) {
    body = body.map((row, r) =>
      row.map((_, c) => {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) n += body[r + dr]?.[c + dc] ?? 0;
        return n >= 5 ? 1 : 0;
      }),
    );
  }
  // Keep the biggest connected blob.
  const seen = blank(rows, cols, 0);
  let best: [number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!body[r][c] || seen[r][c]) continue;
      const blob: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = 1;
      while (stack.length) {
        const [y, x] = stack.pop()!;
        blob.push([y, x]);
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (body[ny]?.[nx] && !seen[ny][nx]) {
            seen[ny][nx] = 1;
            stack.push([ny, nx]);
          }
        }
      }
      if (blob.length > best.length) best = blob;
    }
  const grid = blank(rows, cols, id('bg'));
  if (has('ground'))
    for (let r = bottom; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = id('ground');
  const inBody = new Set(best.map(([r, c]) => r * cols + c));
  best.forEach(([r, c]) => (grid[r][c] = id('body')));

  const isBody = (r: number, c: number) => inBody.has(r * cols + c);
  if (has('outline'))
    best.forEach(([r, c]) => {
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => !isBody(r + dr, c + dc));
      if (edge) grid[r][c] = id('outline');
    });

  const interior = best.filter(([r, c]) => grid[r][c] === id('body') && c < cols / 2 - 1);
  const sym = (r: number, c: number, role: string) => {
    grid[r][c] = id(role);
    grid[r][cols - 1 - c] = id(role);
  };
  if (has('eye') && interior.length) {
    const upper = interior.filter(([r]) => r < top + (bottom - top) * 0.5);
    const [r, c] = rng.pick(upper.length ? upper : interior);
    sym(r, c, 'eye');
  }
  if (has('spot')) {
    const free = interior.filter(([r, c]) => grid[r][c] === id('body'));
    for (let n = 0; n < Math.max(1, Math.round(free.length / 6)) && free.length; n++) {
      const [r, c] = rng.pick(free);
      sym(r, c, 'spot');
    }
  }
  if (has('mouth')) {
    const lower = best.filter(
      ([r, c]) => grid[r][c] === id('body') && r > top + (bottom - top) * 0.55 && Math.abs(c - (cols - 1) / 2) <= 1,
    );
    if (lower.length) {
      const [r] = rng.pick(lower);
      for (const [rr, cc] of best)
        if (rr === r && Math.abs(cc - (cols - 1) / 2) <= 1 && grid[rr][cc] === id('body'))
          grid[rr][cc] = id('mouth');
    }
  }

  const hue = rng.randInt(0, 359);
  const bgHue = (hue + rng.randInt(120, 240)) % 360;
  const palette: Record<string, Hsl> = {
    bg: { h: bgHue, s: 45, l: 88 },
    body: { h: hue, s: 65, l: 55 },
    outline: { h: hue, s: 55, l: 22 },
    eye: { h: 0, s: 0, l: 98 },
    spot: { h: hue + 40, s: 80, l: 72 },
    ground: { h: bgHue, s: 35, l: 66 },
    mouth: { h: 350, s: 75, l: 42 },
  };
  return { name: 'Critter', grid, colors: makeDistinct(roles.map(r => palette[r]), rng) };
};

const mandala: Theme = (rng, rows, cols, k) => {
  const petals = rng.randInt(3, 6);
  const amp = rng.randInt(12, 30) / 100;
  const phase = rng.random() * Math.PI;
  // Wide enough rings that the pattern reads as shapes, not noise.
  const ringW = Math.max(2.2, Math.min(rows, cols) / rng.randInt(4, 6));
  const cy = (rows - 1) / 2;
  const cx = (cols - 1) / 2;
  const grid = blank(rows, cols, 0);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const dy = r - cy;
      const dx = c - cx;
      const theta = Math.atan2(dy, Math.abs(dx)); // mirrored left/right
      const radius = Math.sqrt(dx * dx + dy * dy) * (1 + amp * Math.cos(petals * theta + phase));
      grid[r][c] = Math.floor(radius / ringW) % k;
    }
  const base = rng.randInt(0, 359);
  const step = 360 / k;
  const colors = Array.from({ length: k }, (_, i) => ({
    h: base + i * step + rng.randInt(-10, 10),
    s: rng.randInt(55, 85),
    l: i % 2 ? rng.randInt(35, 50) : rng.randInt(62, 80),
  }));
  return { name: 'Bloom', grid, colors: makeDistinct(colors, rng) };
};

const mosaic: Theme = (rng, rows, cols, k) => {
  const seeds = Array.from({ length: k + rng.randInt(k, 2 * k) }, (_, i) => ({
    r: rng.randInt(0, rows - 1),
    c: rng.randInt(0, Math.ceil(cols / 2) - 1),
    color: i < k ? i : rng.randInt(0, k - 1),
  }));
  const manhattan = rng.random() < 0.5;
  const grid = blank(rows, cols, 0);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < Math.ceil(cols / 2); c++) {
      let best = seeds[0];
      let bestD = Infinity;
      for (const s of seeds) {
        const d = manhattan ? Math.abs(s.r - r) + Math.abs(s.c - c) : (s.r - r) ** 2 + (s.c - c) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      grid[r][c] = grid[r][cols - 1 - c] = best.color;
    }
  const base = rng.randInt(0, 359);
  const colors = Array.from({ length: k }, (_, i) => ({
    h: base + (i * 360) / k,
    s: rng.randInt(50, 80),
    l: rng.randInt(40, 75),
  }));
  return { name: 'Mosaic', grid, colors: makeDistinct(colors, rng) };
};

const THEMES: [Theme, number][] = [
  [landscape, 3],
  [creature, 3],
  [mandala, 2],
  [mosaic, 1],
];

/** Drops colours that ended up unused and renumbers the rest. */
const compact = ({ name, grid, colors }: ThemeResult): ThemeResult => {
  const used = [...new Set(grid.flat())].sort((a, b) => a - b);
  const remap = new Map(used.map((old, i) => [old, i]));
  return {
    name,
    grid: grid.map(row => row.map(v => remap.get(v)!)),
    colors: used.map(i => colors[i]),
  };
};

export const generatePicture = (
  rows: number,
  cols: number,
  colorCount: number,
  seed: number,
): GeneratedPicture => {
  const rng = new SeededRNG(seed);
  const totalWeight = THEMES.reduce((sum, [, w]) => sum + w, 0);

  let fallback: ThemeResult | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    let roll = rng.random() * totalWeight;
    const theme = THEMES.find(([, w]) => (roll -= w) < 0)?.[0] ?? landscape;
    const result = compact(theme(rng, rows, cols, colorCount));
    if (result.colors.length === colorCount) return result;
    if (!fallback || result.colors.length > fallback.colors.length) fallback = result;
  }
  return fallback!;
};
