/**
 * Pixel Collect rules engine (pure, no React).
 *
 * The picture sits inside a conveyor belt that runs around it. Tapping a
 * collector (from the front of a deck lane or from the tray) puts it on the
 * belt; the belt carries a limited number of collectors at once. Every tick each collector on the belt looks straight into the
 * picture: if the first pixel in its line has the collector's colour, it
 * removes that pixel and uses one of its count.
 *
 * After one full lap a collector with count left parks in the tray. The
 * tray has a fixed number of slots; if a collector needs to park while the
 * tray is full, the game is lost. Clearing the whole picture wins.
 */

export const EMPTY = -1;

export interface Collector {
  id: number;
  color: number;
  count: number;
}

export interface Rider {
  collector: Collector;
  /** Belt position, 0..perimeter-1. */
  pos: number;
  /** Positions travelled since launch; a lap is complete at `perimeter`. */
  steps: number;
}

export type Status = 'playing' | 'won' | 'lost';

export interface GameState {
  picture: number[][];
  lanes: Collector[][];
  tray: (Collector | null)[];
  belt: Rider[];
  /** Maximum number of collectors on the belt at the same time. */
  beltCapacity: number;
  status: Status;
  /** Why the game was lost, for the UI. */
  lostReason?: string;
}

export type Side = 'bottom' | 'right' | 'top' | 'left';

export interface BeltSpot {
  side: Side;
  /** Column for bottom/top, row for left/right. */
  line: number;
}

/**
 * The belt runs counter-clockwise: along the bottom from left to right, up
 * the right side, along the top from right to left, down the left side.
 */
export const perimeter = (rows: number, cols: number) => 2 * rows + 2 * cols;

export const beltSpot = (pos: number, rows: number, cols: number): BeltSpot => {
  if (pos < cols) return { side: 'bottom', line: pos };
  pos -= cols;
  if (pos < rows) return { side: 'right', line: rows - 1 - pos };
  pos -= rows;
  if (pos < cols) return { side: 'top', line: cols - 1 - pos };
  pos -= cols;
  return { side: 'left', line: pos };
};

/** First non-empty pixel seen from this belt spot, or null. */
export const target = (picture: number[][], spot: BeltSpot): [number, number] | null => {
  const rows = picture.length;
  const cols = picture[0].length;
  switch (spot.side) {
    case 'bottom':
      for (let r = rows - 1; r >= 0; r--) if (picture[r][spot.line] !== EMPTY) return [r, spot.line];
      return null;
    case 'top':
      for (let r = 0; r < rows; r++) if (picture[r][spot.line] !== EMPTY) return [r, spot.line];
      return null;
    case 'right':
      for (let c = cols - 1; c >= 0; c--) if (picture[spot.line][c] !== EMPTY) return [spot.line, c];
      return null;
    case 'left':
      for (let c = 0; c < cols; c++) if (picture[spot.line][c] !== EMPTY) return [spot.line, c];
      return null;
  }
};

/** Pixels that some belt spot can currently see, per colour. */
export const exposedColors = (picture: number[][]): Set<number> => {
  const rows = picture.length;
  const cols = picture[0].length;
  const out = new Set<number>();
  for (let p = 0; p < perimeter(rows, cols); p++) {
    const t = target(picture, beltSpot(p, rows, cols));
    if (t) out.add(picture[t[0]][t[1]]);
  }
  return out;
};

export const isCleared = (picture: number[][]) => picture.every(row => row.every(v => v === EMPTY));

export const createGame = (
  picture: number[][],
  lanes: Collector[][],
  traySize: number,
  beltCapacity: number,
): GameState => ({
  picture: picture.map(row => [...row]),
  lanes: lanes.map(lane => lane.map(c => ({ ...c }))),
  tray: Array(traySize).fill(null),
  belt: [],
  beltCapacity,
  status: 'playing',
});

/** A new collector can enter while the belt has room and the entry spot is free. */
export const canLaunch = (state: GameState) =>
  state.status === 'playing' &&
  state.belt.length < state.beltCapacity &&
  !state.belt.some(r => r.pos === 0);

export type LaunchSource = { from: 'lane'; index: number } | { from: 'tray'; index: number };

export const launch = (state: GameState, source: LaunchSource): GameState => {
  if (!canLaunch(state)) return state;
  let collector: Collector | null | undefined;
  const lanes = state.lanes;
  let tray = state.tray;
  let newLanes = lanes;

  if (source.from === 'lane') {
    collector = lanes[source.index]?.[0];
    if (!collector) return state;
    newLanes = lanes.map((lane, i) => (i === source.index ? lane.slice(1) : lane));
  } else {
    collector = tray[source.index];
    if (!collector) return state;
    tray = tray.map((c, i) => (i === source.index ? null : c));
  }

  return {
    ...state,
    lanes: newLanes,
    tray,
    belt: [...state.belt, { collector: { ...collector }, pos: 0, steps: 0 }],
  };
};

/** Advances the belt by one spot: every rider fires once, then moves. */
export const tick = (state: GameState): GameState => {
  if (state.status !== 'playing' || state.belt.length === 0) return state;

  const rows = state.picture.length;
  const cols = state.picture[0].length;
  const lap = perimeter(rows, cols);
  // Copy-on-write: rows that don't change keep their identity, so the
  // board only re-renders rows that actually lost a pixel.
  const picture = [...state.picture];
  const tray = [...state.tray];
  const belt: Rider[] = [];

  for (const rider of state.belt) {
    const collector = { ...rider.collector };
    const hit = target(picture, beltSpot(rider.pos, rows, cols));
    if (hit && picture[hit[0]][hit[1]] === collector.color) {
      if (picture[hit[0]] === state.picture[hit[0]]) picture[hit[0]] = [...picture[hit[0]]];
      picture[hit[0]][hit[1]] = EMPTY;
      collector.count--;
    }
    if (collector.count === 0) continue; // used up: leaves the belt

    const steps = rider.steps + 1;
    if (steps < lap) {
      belt.push({ collector, pos: (rider.pos + 1) % lap, steps });
      continue;
    }

    // Lap complete: park in the tray.
    const slot = tray.indexOf(null);
    if (slot === -1) {
      return {
        ...state,
        picture,
        tray,
        belt: [...belt, { collector, pos: rider.pos, steps: rider.steps }],
        status: 'lost',
        lostReason: 'The tray is full.',
      };
    }
    tray[slot] = collector;
  }

  const next: GameState = { ...state, picture, tray, belt };
  return withStatus(next);
};

/** Win when the picture is empty; lose when nothing can make progress. */
export const withStatus = (state: GameState): GameState => {
  if (state.status !== 'playing') return state;
  if (isCleared(state.picture)) return { ...state, status: 'won', belt: [] };
  if (state.belt.length > 0) return state;

  const laneFronts = state.lanes.filter(l => l.length > 0);
  const trayCollectors = state.tray.filter((c): c is Collector => c !== null);
  if (laneFronts.length > 0) return state;

  const exposed = exposedColors(state.picture);
  if (trayCollectors.length === 0 || !trayCollectors.some(c => exposed.has(c.color))) {
    return { ...state, status: 'lost', lostReason: 'No collector can reach the remaining pixels.' };
  }
  return state;
};

/**
 * Simulates one lap of a single collector on an otherwise empty belt and
 * removes what it hits from `picture` (mutated). `limit` caps the count.
 */
export const soloLap = (
  picture: number[][],
  color: number,
  limit = Infinity,
): [number, number][] => {
  const rows = picture.length;
  const cols = picture[0].length;
  const removed: [number, number][] = [];
  for (let p = 0; p < perimeter(rows, cols) && removed.length < limit; p++) {
    const hit = target(picture, beltSpot(p, rows, cols));
    if (hit && picture[hit[0]][hit[1]] === color) {
      picture[hit[0]][hit[1]] = EMPTY;
      removed.push(hit);
    }
  }
  return removed;
};

export type Pick = LaunchSource & { collector: Collector; collects: number };

const availablePicks = (state: GameState): Pick[] => {
  const options: Pick[] = [];
  state.lanes.forEach((lane, index) => {
    if (lane[0]) options.push({ from: 'lane', index, collector: lane[0], collects: 0 });
  });
  state.tray.forEach((c, index) => {
    if (c) options.push({ from: 'tray', index, collector: c, collects: 0 });
  });
  // Rank by what each would collect alone right now, preferring ones that
  // use up their whole count (and so don't need a tray slot).
  for (const o of options) {
    const copy = state.picture.map(row => [...row]);
    o.collects = soloLap(copy, o.collector.color, o.collector.count).length;
  }
  const score = (o: Pick) => (o.collects === o.collector.count ? 1000 : 0) + o.collects;
  return options.sort((a, b) => score(b) - score(a));
};

/** Runs the belt until it is empty or the game ends. */
export const settle = (state: GameState): GameState => {
  let s = state;
  while (s.status === 'playing' && s.belt.length > 0) s = tick(s);
  return s;
};

const stateKey = (s: GameState) =>
  s.picture.map(row => row.join(',')).join(';') +
  '|' +
  s.lanes.map(l => l.length).join(',') +
  '|' +
  s.tray
    .filter((c): c is Collector => c !== null)
    .map(c => `${c.id}:${c.count}`)
    .sort()
    .join(',');

/**
 * Hint: the collector to send next. Lets whatever is on the belt finish,
 * then searches (one collector at a time, best-looking first) for a
 * sequence that still clears the picture. Falls back to the best-looking
 * collector if the search budget runs out.
 */
export const suggestLaunch = (state: GameState, budget = 4000): Collector | null => {
  const start = settle(state);
  if (start.status !== 'playing') return null;
  const first = availablePicks(start).find(p => p.collects > 0) ?? null;

  let nodes = 0;
  const seen = new Set<string>();
  const search = (s: GameState): Collector | null | 'win' => {
    if (s.status === 'won') return 'win';
    if (s.status === 'lost' || nodes > budget) return null;
    for (const pick of availablePicks(s)) {
      if (pick.collects === 0) continue;
      nodes++;
      const next = settle(launch(s, pick));
      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      if (search(next)) return pick.collector;
      if (nodes > budget) return null;
    }
    return null;
  };

  const result = search(start);
  return result && result !== 'win' ? result : first?.collector ?? null;
};
