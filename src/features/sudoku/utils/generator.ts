import { SudokuDifficulty } from '../constants/config';
import { SeededRNG, randomSeed } from '../../../utils/random';

export interface SudokuData {
  initialGrid: number[][]; // Clues only (0 for empty)
  solvedGrid: number[][]; // Full solution
  difficulty: SudokuDifficulty;
  seed: number;
}

const BLANK = 0;
const ALL = 0x3fe; // bits 1..9

const boxOf = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

const bitsToDigits = (mask: number): number[] => {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d);
  return out;
};

const popcount = (mask: number) => {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
};

/** Bitmask state of the digits used in every row, column and box. */
class Board {
  rows = new Array(9).fill(0);
  cols = new Array(9).fill(0);
  boxes = new Array(9).fill(0);

  constructor(public grid: number[][]) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (grid[r][c] !== BLANK) this.set(r, c, grid[r][c]);
  }

  candidates(r: number, c: number) {
    return ALL & ~(this.rows[r] | this.cols[c] | this.boxes[boxOf(r, c)]);
  }

  set(r: number, c: number, d: number) {
    const bit = 1 << d;
    this.grid[r][c] = d;
    this.rows[r] |= bit;
    this.cols[c] |= bit;
    this.boxes[boxOf(r, c)] |= bit;
  }

  clear(r: number, c: number) {
    const bit = ~(1 << this.grid[r][c]);
    this.rows[r] &= bit;
    this.cols[c] &= bit;
    this.boxes[boxOf(r, c)] &= bit;
    this.grid[r][c] = BLANK;
  }

  /** Empty cell with the fewest candidates, or null if the grid is full. */
  mostConstrained(): { r: number; c: number; mask: number } | null {
    let best: { r: number; c: number; mask: number } | null = null;
    let bestCount = 10;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c] !== BLANK) continue;
        const mask = this.candidates(r, c);
        const n = popcount(mask);
        if (n < bestCount) {
          best = { r, c, mask };
          bestCount = n;
          if (n <= 1) return best;
        }
      }
    }
    return best;
  }
}

/** Builds a random, completely filled valid grid. */
const generateSolvedGrid = (rng: SeededRNG): number[][] => {
  const board = new Board(Array.from({ length: 9 }, () => Array(9).fill(BLANK)));
  const fill = (): boolean => {
    const cell = board.mostConstrained();
    if (!cell) return true;
    for (const d of rng.shuffle(bitsToDigits(cell.mask))) {
      board.set(cell.r, cell.c, d);
      if (fill()) return true;
      board.clear(cell.r, cell.c);
    }
    return false;
  };
  fill();
  return board.grid;
};

/** Counts solutions, stopping as soon as `limit` is reached. */
export const countSolutions = (grid: number[][], limit = 2): number => {
  const board = new Board(grid.map(row => [...row]));
  let count = 0;
  const solve = () => {
    const cell = board.mostConstrained();
    if (!cell) {
      count++;
      return;
    }
    for (const d of bitsToDigits(cell.mask)) {
      board.set(cell.r, cell.c, d);
      solve();
      board.clear(cell.r, cell.c);
      if (count >= limit) return;
    }
  };
  solve();
  return count;
};

/** One pass of removing clues in random order while the solution stays unique. */
const carvePuzzle = (solved: number[][], target: number, rng: SeededRNG) => {
  const puzzle = solved.map(row => [...row]);
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
  rng.shuffle(positions);

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= target) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = BLANK;
    if (countSolutions(puzzle) === 1) removed++;
    else puzzle[r][c] = backup;
  }
  return { puzzle, removed };
};

/**
 * Removal passes to try before settling for the best one. A random puzzle
 * usually becomes "minimal" (no clue can be removed) at ~55-58 removals, so
 * the hardest levels need several tries to reach their target.
 */
const carveAttempts = (target: number) => (target > 58 ? 40 : 12);

export const generateSudoku = (difficulty: SudokuDifficulty, seed: number = randomSeed()): SudokuData => {
  const rng = new SeededRNG(seed);
  const target = Math.min(difficulty.removalCount, 81 - 17); // 17 = fewest clues possible

  let best: { puzzle: number[][]; solved: number[][]; removed: number } | null = null;
  for (let attempt = 0; attempt < carveAttempts(target); attempt++) {
    const solved = generateSolvedGrid(rng);
    const { puzzle, removed } = carvePuzzle(solved, target, rng);
    if (!best || removed > best.removed) best = { puzzle, solved, removed };
    if (removed >= target) break;
  }

  return {
    initialGrid: best!.puzzle,
    solvedGrid: best!.solved,
    difficulty,
    seed,
  };
};
