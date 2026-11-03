/**
 * Sanity check for the puzzle generators.
 *
 *   npm run verify:puzzles            # default number of runs
 *   npm run verify:puzzles -- 25      # runs per difficulty
 *
 * Every generated puzzle is checked with an independent brute-force solver
 * (not the generator's own solver) for: valid regions/clues, exactly one
 * solution, and that the solution matches the one returned by the generator.
 * It also plays every puzzle using only hints and checks that each hint is
 * correct and that following them solves the board.
 */
import { DIFFICULTIES } from '../src/features/queens/constants/config';
import { generatePuzzle } from '../src/features/queens/utils/generator';
import { SUDOKU_DIFFICULTIES } from '../src/features/sudoku/constants/config';
import { generateSudoku } from '../src/features/sudoku/utils/generator';
import { findHint } from '../src/features/sudoku/utils/hints';
import { applyDeduction, buildUnits, findDeduction } from '../src/features/queens/utils/solver';
import {
  BELT_CAPACITY,
  PIXEL_DIFFICULTIES,
  TRAY_SIZE,
} from '../src/features/pixelcollect/constants/config';
import { generateDeck } from '../src/features/pixelcollect/utils/generator';
import { generatePicture } from '../src/features/pixelcollect/utils/pictureGenerator';
import {
  GameState,
  createGame,
  launch,
  suggestLaunch,
  tick,
} from '../src/features/pixelcollect/utils/engine';

const runs = Number(process.argv[2]) || 10;
let failures = 0;

const fail = (msg: string) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};

// ---------------- Queens ----------------

const isContiguous = (colorGrid: number[][], color: number) => {
  const n = colorGrid.length;
  const cells: [number, number][] = [];
  colorGrid.forEach((row, r) => row.forEach((v, c) => v === color && cells.push([r, c])));
  if (cells.length === 0) return false;
  const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || seen.has(key)) continue;
      if (colorGrid[nr][nc] !== color) continue;
      seen.add(key);
      stack.push([nr, nc]);
    }
  }
  return seen.size === cells.length;
};

/**
 * Returns up to `limit` solutions as column-per-row arrays. Plain
 * backtracking with forward checking: every step branches on the row,
 * column or region with the fewest possible cells, and dead ends (a unit
 * with no possible cell) are cut immediately.
 */
const bruteForceQueens = (colorGrid: number[][], puzzle: number[][], limit = 2) => {
  const n = colorGrid.length;
  const solutions: number[][] = [];
  const usedCol = new Array(n).fill(false);
  const usedColor = new Array(n).fill(false);
  const cols: number[] = new Array(n).fill(-1);

  const canPlace = (r: number, c: number) => {
    if (cols[r] !== -1 || puzzle[r][c] === 1 || usedCol[c] || usedColor[colorGrid[r][c]]) return false;
    if (r > 0 && cols[r - 1] !== -1 && Math.abs(cols[r - 1] - c) <= 1) return false;
    if (r < n - 1 && cols[r + 1] !== -1 && Math.abs(cols[r + 1] - c) <= 1) return false;
    return true;
  };

  const rec = (placed: number) => {
    if (solutions.length >= limit) return;
    if (placed === n) {
      solutions.push([...cols]);
      return;
    }
    const byRow: [number, number][][] = Array.from({ length: n }, () => []);
    const byCol: [number, number][][] = Array.from({ length: n }, () => []);
    const byColor: [number, number][][] = Array.from({ length: n }, () => []);
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (canPlace(r, c)) {
          byRow[r].push([r, c]);
          byCol[c].push([r, c]);
          byColor[colorGrid[r][c]].push([r, c]);
        }

    let best: [number, number][] | null = null;
    for (let i = 0; i < n; i++) {
      const groups: [boolean, [number, number][]][] = [
        [cols[i] === -1, byRow[i]],
        [!usedCol[i], byCol[i]],
        [!usedColor[i], byColor[i]],
      ];
      for (const [open, cells] of groups) {
        if (!open) continue;
        if (cells.length === 0) return; // dead end
        if (!best || cells.length < best.length) best = cells;
      }
    }

    for (const [r, c] of best!) {
      const color = colorGrid[r][c];
      usedCol[c] = usedColor[color] = true;
      cols[r] = c;
      rec(placed + 1);
      cols[r] = -1;
      usedCol[c] = usedColor[color] = false;
    }
  };
  rec(0);
  return solutions;
};

console.log('Queens');
for (const d of Object.values(DIFFICULTIES)) {
  const n = d.size >= 20 ? Math.max(3, Math.floor(runs / 3)) : runs;
  let worst = 0;
  let totalMs = 0;
  let clues = 0;
  for (let i = 0; i < n; i++) {
    const seed = 1000 * i + d.size;
    const t = Date.now();
    const p = generatePuzzle(d.size, d.removalRatio, seed);
    const ms = Date.now() - t;
    worst = Math.max(worst, ms);
    totalMs += ms;
    if (!p) {
      fail(`${d.id} seed=${seed}: generation failed`);
      continue;
    }
    const again = generatePuzzle(d.size, d.removalRatio, seed);
    if (JSON.stringify(again) !== JSON.stringify(p)) fail(`${d.id} seed=${seed}: not deterministic`);

    for (let color = 0; color < d.size; color++)
      if (!isContiguous(p.colorGrid, color)) fail(`${d.id} seed=${seed}: region ${color} broken`);

    clues += p.puzzleGrid.flat().filter(v => v === 1).length;
    const sols = bruteForceQueens(p.colorGrid, p.puzzleGrid);
    if (sols.length !== 1) {
      fail(`${d.id} seed=${seed}: ${sols.length} solutions`);
      continue;
    }
    const expected = p.solutionGrid.map(row => row.indexOf(2));
    if (JSON.stringify(expected) !== JSON.stringify(sols[0]))
      fail(`${d.id} seed=${seed}: solutionGrid does not match`);

    // Play the puzzle with single-step hints only.
    const units = buildUnits(p.colorGrid);
    const board = p.puzzleGrid.map(row => [...row]);
    for (let step = 0; step < 10 * d.size * d.size; step++) {
      const hint = findDeduction(board, p.colorGrid, units);
      if (hint === null || hint === 'contradiction') break;
      for (const [r, c] of hint.cells) {
        const isQueen = p.solutionGrid[r][c] === 2;
        if ((hint.kind === 'place') !== isQueen) fail(`${d.id} seed=${seed}: wrong hint "${hint.reason}"`);
      }
      applyDeduction(board, hint);
    }
    if (board.flat().filter(v => v === 2).length !== d.size)
      fail(`${d.id} seed=${seed}: hints alone don't solve the puzzle`);
  }
  console.log(
    `  ${d.name.padEnd(18)} runs=${n} avgClues=${(clues / n).toFixed(1)} avgMs=${Math.round(totalMs / n)} worstMs=${worst}`,
  );
}

// ---------------- Sudoku ----------------

const countSudokuSolutions = (grid: number[][], limit = 2): number => {
  const g = grid.map(r => [...r]);
  let count = 0;
  const ok = (r: number, c: number, v: number) => {
    for (let i = 0; i < 9; i++) if (g[r][i] === v || g[i][c] === v) return false;
    const br = r - (r % 3);
    const bc = c - (c % 3);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === v) return false;
    return true;
  };
  const rec = (idx: number) => {
    if (count >= limit) return;
    while (idx < 81 && g[Math.floor(idx / 9)][idx % 9] !== 0) idx++;
    if (idx === 81) {
      count++;
      return;
    }
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    for (let v = 1; v <= 9; v++) {
      if (!ok(r, c, v)) continue;
      g[r][c] = v;
      rec(idx + 1);
      g[r][c] = 0;
    }
  };
  rec(0);
  return count;
};

const isValidSolution = (g: number[][]) => {
  const okSet = (vals: number[]) => new Set(vals).size === 9 && vals.every(v => v >= 1 && v <= 9);
  for (let i = 0; i < 9; i++) {
    if (!okSet(g[i])) return false;
    if (!okSet(g.map(r => r[i]))) return false;
    const br = 3 * Math.floor(i / 3);
    const bc = 3 * (i % 3);
    const box: number[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box.push(g[br + r][bc + c]);
    if (!okSet(box)) return false;
  }
  return true;
};

console.log('Sudoku');
for (const d of Object.values(SUDOKU_DIFFICULTIES)) {
  let worst = 0;
  let totalMs = 0;
  let clues = 0;
  let minClues = 81;
  let maxClues = 0;
  for (let i = 0; i < runs; i++) {
    const seed = 7919 * i + 1;
    const t = Date.now();
    const p = generateSudoku(d, seed);
    const ms = Date.now() - t;
    worst = Math.max(worst, ms);
    totalMs += ms;
    const n = p.initialGrid.flat().filter(v => v !== 0).length;
    clues += n;
    minClues = Math.min(minClues, n);
    maxClues = Math.max(maxClues, n);
    if (!isValidSolution(p.solvedGrid)) fail(`${d.id} seed=${seed}: invalid solution grid`);
    p.initialGrid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v !== 0 && v !== p.solvedGrid[r][c]) fail(`${d.id} seed=${seed}: clue mismatch`);
      }),
    );
    const sols = countSudokuSolutions(p.initialGrid);
    if (sols !== 1) fail(`${d.id} seed=${seed}: ${sols} solutions`);

    // Play with hints only: every suggested cell must get its solution value.
    const board = p.initialGrid.map(row => [...row]);
    for (let step = 0; step < 81; step++) {
      const hint = findHint(board, p.initialGrid, p.solvedGrid, items => items[0]);
      if (!hint) break;
      if (hint.kind === 'mistake') {
        fail(`${d.id} seed=${seed}: hint flagged a correct cell`);
        break;
      }
      const [r, c] = hint.cells[0];
      if (hint.value !== p.solvedGrid[r][c]) fail(`${d.id} seed=${seed}: wrong hint "${hint.message}"`);
      board[r][c] = p.solvedGrid[r][c];
    }
    if (board.some((row, r) => row.some((v, c) => v !== p.solvedGrid[r][c])))
      fail(`${d.id} seed=${seed}: hints alone don't solve the puzzle`);
    // A wrong entry must be reported first.
    const wrong = p.initialGrid.map(row => [...row]);
    outer: for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (wrong[r][c] === 0) {
          wrong[r][c] = (p.solvedGrid[r][c] % 9) + 1;
          const hint = findHint(wrong, p.initialGrid, p.solvedGrid, items => items[0]);
          if (hint?.kind !== 'mistake') fail(`${d.id} seed=${seed}: mistake not reported`);
          break outer;
        }
  }
  console.log(
    `  ${d.name.padEnd(18)} runs=${runs} clues avg=${(clues / runs).toFixed(1)} range=${minClues}-${maxClues} avgMs=${Math.round(totalMs / runs)} worstMs=${worst}`,
  );
}

// ---------------- Pixel Collect ----------------

/** Runs the belt until it is empty or the game ends. */
const runBelt = (state: GameState) => {
  let guard = 0;
  while (state.status === 'playing' && state.belt.length > 0 && guard++ < 100000) state = tick(state);
  return state;
};

console.log('Pixel Collect');
for (const def of PIXEL_DIFFICULTIES) {
  let hintWins = 0;
  let randomEnds = 0;
  let collectorTotal = 0;
  let pictureMs = 0;
  const themes = new Map<string, number>();
  for (let i = 0; i < runs; i++) {
    const seed = 31 * i + 7;
    const t = Date.now();
    const picture = generatePicture(def.size, def.size, def.colors, seed);
    pictureMs += Date.now() - t;
    themes.set(picture.name, (themes.get(picture.name) ?? 0) + 1);
    const again = generatePicture(def.size, def.size, def.colors, seed);
    if (JSON.stringify(again) !== JSON.stringify(picture)) fail(`${def.id} seed=${seed}: picture not deterministic`);
    if (picture.colors.length !== def.colors)
      fail(`${def.id} seed=${seed}: ${picture.colors.length} colours instead of ${def.colors}`);
    if (new Set(picture.colors).size !== picture.colors.length) fail(`${def.id} seed=${seed}: duplicate colours`);
    const grid = picture.grid;
    const pixels = grid.flat().length;
    const deck = generateDeck(grid, def.lanes, seed);
    collectorTotal += deck.lanes.flat().length;
    const all = deck.lanes.flat();
    const total = all.reduce((sum, c) => sum + c.count, 0);
    if (total !== pixels) fail(`${def.id} seed=${seed}: counts ${total} != pixels ${pixels}`);

    // 1. The stored solution, one collector at a time, must clear the picture.
    let state = createGame(grid, deck.lanes, TRAY_SIZE, BELT_CAPACITY);
    for (const id of deck.solution) {
      const lane = state.lanes.findIndex(l => l[0]?.id === id);
      if (lane === -1) {
        fail(`${def.id} seed=${seed}: solution collector ${id} not at a lane front`);
        break;
      }
      state = runBelt(launch(state, { from: 'lane', index: lane }));
      if (state.tray.some(Boolean)) fail(`${def.id} seed=${seed}: solution needed the tray`);
    }
    if (state.status !== 'won') fail(`${def.id} seed=${seed}: solution ended as ${state.status}`);

    // 2. Following hints only (one collector at a time).
    state = createGame(grid, deck.lanes, TRAY_SIZE, BELT_CAPACITY);
    for (let step = 0; step < 500 && state.status === 'playing'; step++) {
      const pick = suggestLaunch(state);
      if (!pick) break;
      const lane = state.lanes.findIndex(l => l[0]?.id === pick.id);
      const slot = state.tray.findIndex(c => c?.id === pick.id);
      state = runBelt(launch(state, lane !== -1 ? { from: 'lane', index: lane } : { from: 'tray', index: slot }));
    }
    if (state.status === 'won') hintWins++;
    else fail(`${def.id} seed=${seed}: following hints did not win`);

    // 3. Random play with several collectors on the belt must never break.
    const rng = (() => {
      let x = seed;
      return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    })();
    state = createGame(grid, deck.lanes, TRAY_SIZE, BELT_CAPACITY);
    for (let step = 0; step < 20000 && state.status === 'playing'; step++) {
      if (rng() < 0.3) {
        const sources = [
          ...state.lanes.map((l, index) => (l.length ? { from: 'lane' as const, index } : null)),
          ...state.tray.map((c, index) => (c ? { from: 'tray' as const, index } : null)),
        ].filter(Boolean) as { from: 'lane' | 'tray'; index: number }[];
        if (sources.length) state = launch(state, sources[Math.floor(rng() * sources.length)]);
      }
      state = tick(state);
      if (state.belt.length > BELT_CAPACITY) {
        fail(`${def.id} seed=${seed}: ${state.belt.length} collectors on the belt`);
        break;
      }
      const left = state.picture.flat().filter(v => v !== -1).length;
      const ammo = [...state.lanes.flat(), ...state.tray.filter(Boolean), ...state.belt.map(r => r.collector)]
        .reduce((sum, c) => sum + (c ? c.count : 0), 0);
      if (state.status === 'playing' && ammo !== left) {
        fail(`${def.id} seed=${seed}: ammo ${ammo} != pixels left ${left}`);
        break;
      }
    }
    if (state.status !== 'playing') randomEnds++;
  }
  console.log(
    `  ${def.name.padEnd(18)} runs=${runs} avgCollectors=${(collectorTotal / runs).toFixed(1)} pictureMs=${Math.round(pictureMs / runs)} hintWins=${hintWins}/${runs} randomGamesEnded=${randomEnds}/${runs} themes=${[...themes].map(([k, v]) => `${k}:${v}`).join(',')}`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
