import { SeededRNG } from '../../../utils/random';
import { EMPTY, MARK, QUEEN, applyDeduction, buildUnits, findDeduction, solveLogically } from './solver';

export interface PuzzleData {
  /** Region index (0..size-1) of every cell. */
  colorGrid: number[][];
  /** Starting board: 0 = empty, 1 = given ❌ (locked). */
  puzzleGrid: number[][];
  /** 2 where the (unique) solution has a queen, 0 elsewhere. */
  solutionGrid: number[][];
  /** Seed the puzzle was generated from; the same seed reproduces it. */
  seed: number;
}

/** One queen per row/column, no two touching. Returns the column of each row's queen. */
const generateQueenColumns = (size: number, rng: SeededRNG): number[] | null => {
  const cols: number[] = [];
  const used = new Array(size).fill(false);

  const place = (row: number): boolean => {
    if (row === size) return true;
    const order = rng.shuffle(Array.from({ length: size }, (_, i) => i));
    for (const col of order) {
      if (used[col]) continue;
      // Only the previous row can touch this one.
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      used[col] = true;
      cols[row] = col;
      if (place(row + 1)) return true;
      used[col] = false;
    }
    return false;
  };

  return place(0) ? cols : null;
};

/** Grows one contiguous region from every queen until the board is covered. */
const growRegions = (size: number, queenCols: number[], rng: SeededRNG): number[][] => {
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const frontier: [number, number][] = [];
  const queued = new Set<number>();
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  const enqueueNeighbours = (r: number, c: number) => {
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (grid[nr][nc] !== -1 || queued.has(nr * size + nc)) continue;
      queued.add(nr * size + nc);
      frontier.push([nr, nc]);
    }
  };

  // Shuffle region ids so a region's colour doesn't reveal its queen's row.
  const regionIds = rng.shuffle(Array.from({ length: size }, (_, i) => i));
  queenCols.forEach((c, r) => {
    grid[r][c] = regionIds[r];
  });
  queenCols.forEach((c, r) => enqueueNeighbours(r, c));

  while (frontier.length > 0) {
    const i = rng.randInt(0, frontier.length - 1);
    const [r, c] = frontier[i];
    frontier[i] = frontier[frontier.length - 1];
    frontier.pop();

    const neighbourColors: number[] = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== -1)
        neighbourColors.push(grid[nr][nc]);
    }
    grid[r][c] = rng.pick(neighbourColors);
    enqueueNeighbours(r, c);
  }
  return grid;
};

/**
 * Runs the logical solver and, whenever it gets stuck, adds a random ❌ clue
 * (never on a solution cell) and continues. Returns the clue grid.
 */
const findClues = (
  colorGrid: number[][],
  solutionGrid: number[][],
  rng: SeededRNG,
): number[][] | null => {
  const size = colorGrid.length;
  const units = buildUnits(colorGrid);
  const clues: number[][] = Array.from({ length: size }, () => Array(size).fill(EMPTY));
  const state = clues.map(row => [...row]);

  for (;;) {
    const d = findDeduction(state, colorGrid, units, true);
    if (d === 'contradiction') return null; // cannot happen with sound deductions
    if (d) {
      applyDeduction(state, d);
      continue;
    }
    const queens = state.flat().filter(v => v === QUEEN).length;
    if (queens === size) return clues;

    const open: [number, number][] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (state[r][c] === EMPTY && solutionGrid[r][c] !== QUEEN) open.push([r, c]);
    if (open.length === 0) return null;
    const [r, c] = rng.pick(open);
    clues[r][c] = MARK;
    state[r][c] = MARK;
  }
};

const countClues = (grid: number[][]) => grid.flat().filter(v => v === MARK).length;

/** Removes every clue that isn't needed for a guess-free solve. */
const minimizeClues = (clues: number[][], colorGrid: number[][], rng: SeededRNG) => {
  const units = buildUnits(colorGrid);
  const cells: [number, number][] = [];
  clues.forEach((row, r) => row.forEach((v, c) => v === MARK && cells.push([r, c])));
  for (const [r, c] of rng.shuffle(cells)) {
    clues[r][c] = EMPTY;
    if (!solveLogically(clues, colorGrid, units).solved) clues[r][c] = MARK;
  }
};

/**
 * `removalRatio` is the share of non-queen cells that may be left without a
 * ❌ clue (1 = no extra clues; 0.9 = at least 10% of the cells are given).
 */
const padClues = (
  clues: number[][],
  solutionGrid: number[][],
  removalRatio: number,
  rng: SeededRNG,
) => {
  const size = clues.length;
  const removable = size * size - size;
  const minClues = removable - Math.floor(removable * removalRatio);
  const free: [number, number][] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (clues[r][c] === EMPTY && solutionGrid[r][c] !== QUEEN) free.push([r, c]);
  rng.shuffle(free);
  let count = countClues(clues);
  while (count < minClues && free.length > 0) {
    const [r, c] = free.pop()!;
    clues[r][c] = MARK;
    count++;
  }
};

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const isRegionContiguous = (grid: number[][], color: number, start: [number, number]) => {
  const size = grid.length;
  let total = 0;
  grid.forEach(row => row.forEach(v => v === color && total++));
  const seen = new Set([start[0] * size + start[1]]);
  const stack = [start];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || grid[nr][nc] !== color) continue;
      const key = nr * size + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      stack.push([nr, nc]);
    }
  }
  return seen.size === total;
};

/** Cells the logical solver can't decide on an empty board (none = clue-free puzzle). */
const unresolvedCells = (colorGrid: number[][]): [number, number][] => {
  const size = colorGrid.length;
  const empty = Array.from({ length: size }, () => Array(size).fill(EMPTY));
  const { grid } = solveLogically(empty, colorGrid);
  const out: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => v === EMPTY && out.push([r, c])));
  return out;
};

/**
 * Hill-climbs the region map towards one that is solvable without clues:
 * repeatedly hands a cell (mostly one the solver is still unsure about) to
 * a neighbouring region and keeps the change if the solver gets at least as
 * far as before. Queens never move and regions stay contiguous, so the
 * intended solution stays valid.
 */
const improveRegions = (
  colorGrid: number[][],
  queenCols: number[],
  iterations: number,
  rng: SeededRNG,
): number[][] => {
  const size = colorGrid.length;
  let grid = colorGrid.map(row => [...row]);
  let unresolved = unresolvedCells(grid);

  for (let i = 0; i < iterations && unresolved.length > 0; i++) {
    const [r, c] =
      rng.random() < 0.7
        ? rng.pick(unresolved)
        : [rng.randInt(0, size - 1), rng.randInt(0, size - 1)];
    if (queenCols[r] === c) continue;

    const own = grid[r][c];
    const neighbourColors = DIRS.map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size)
      .map(([nr, nc]) => grid[nr][nc])
      .filter(color => color !== own);
    if (neighbourColors.length === 0) continue;

    const candidate = grid.map(row => [...row]);
    candidate[r][c] = rng.pick(neighbourColors);
    const queenRow = queenCols.findIndex((qc, qr) => grid[qr][qc] === own);
    if (!isRegionContiguous(candidate, own, [queenRow, queenCols[queenRow]])) continue;

    const candidateUnresolved = unresolvedCells(candidate);
    if (candidateUnresolved.length <= unresolved.length) {
      grid = candidate;
      unresolved = candidateUnresolved;
    }
  }
  return grid;
};

/** Hill-climbing budget: cheap on small boards, bounded on big ones. */
const improveIterations = (size: number) =>
  size <= 6 ? 150 : size <= 12 ? 250 : 60;

/**
 * Generates a Queens puzzle with a unique solution that can be solved
 * without guessing. Deterministic for a given seed.
 */
export const generatePuzzle = (
  size: number,
  removalRatio: number,
  seed: number,
): PuzzleData | null => {
  const rng = new SeededRNG(seed);

  const queenCols = generateQueenColumns(size, rng);
  if (!queenCols) return null; // no valid placement exists for this size (e.g. 2x2, 3x3)

  const solutionGrid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (queenCols[r] === c ? QUEEN : EMPTY)),
  );
  const colorGrid = improveRegions(
    growRegions(size, queenCols, rng),
    queenCols,
    improveIterations(size),
    rng,
  );

  // Whatever is still ambiguous gets resolved with ❌ clues.
  const clues = findClues(colorGrid, solutionGrid, rng);
  if (!clues) return null;
  minimizeClues(clues, colorGrid, rng);
  padClues(clues, solutionGrid, removalRatio, rng);

  return { colorGrid, puzzleGrid: clues, solutionGrid, seed };
};
