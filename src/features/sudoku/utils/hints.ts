export type Cell = [number, number];

export interface SudokuHint {
  kind: 'mistake' | 'single' | 'reveal';
  message: string;
  cells: Cell[];
  /** The number that belongs in the cell (for 'single' and 'reveal'). */
  value?: number;
}

const boxCells = (box: number): Cell[] => {
  const br = Math.floor(box / 3) * 3;
  const bc = (box % 3) * 3;
  const out: Cell[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push([br + r, bc + c]);
  return out;
};

const units: { name: string; cells: Cell[] }[] = [];
for (let i = 0; i < 9; i++) {
  units.push({ name: `row ${i + 1}`, cells: Array.from({ length: 9 }, (_, c) => [i, c] as Cell) });
  units.push({ name: `column ${i + 1}`, cells: Array.from({ length: 9 }, (_, r) => [r, i] as Cell) });
  units.push({ name: `box ${i + 1}`, cells: boxCells(i) });
}

/** Numbers that don't already appear in the cell's row, column or box. */
export const candidates = (grid: number[][], r: number, c: number): number[] => {
  const used = new Set<number>();
  for (let k = 0; k < 9; k++) {
    used.add(grid[r][k]);
    used.add(grid[k][c]);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) used.add(grid[br + i][bc + j]);
  const out: number[] = [];
  for (let n = 1; n <= 9; n++) if (!used.has(n)) out.push(n);
  return out;
};

/** Duplicate digits in any row, column or box. */
export const findConflicts = (grid: number[][]): string[] => {
  const errors: string[] = [];
  for (const unit of units) {
    const seen = new Set<number>();
    for (const [r, c] of unit.cells) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (seen.has(v)) {
        const name = unit.name.charAt(0).toUpperCase() + unit.name.slice(1);
        errors.push(`Duplicate ${v} in ${name}.`);
        break;
      }
      seen.add(v);
    }
  }
  return errors;
};

/**
 * Hint for the player's current board:
 *   1. a wrong entry, if there is one,
 *   2. a cell with only one possible number (naked single),
 *   3. a number with only one possible cell in a row/column/box (hidden single),
 *   4. otherwise reveal a cell from the solution.
 */
export const findHint = (
  grid: number[][],
  initialGrid: number[][],
  solvedGrid: number[][],
  pickRandom: <T>(items: T[]) => T,
): SudokuHint | null => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (initialGrid[r][c] === 0 && grid[r][c] !== 0 && grid[r][c] !== solvedGrid[r][c]) {
        return { kind: 'mistake', message: `Cell (${r + 1},${c + 1}) is not correct.`, cells: [[r, c]] };
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const cand = candidates(grid, r, c);
      if (cand.length === 1) {
        return {
          kind: 'single',
          message: `Cell (${r + 1},${c + 1}) can only be ${cand[0]}.`,
          cells: [[r, c]],
          value: cand[0],
        };
      }
    }
  }

  for (const unit of units) {
    for (let n = 1; n <= 9; n++) {
      if (unit.cells.some(([r, c]) => grid[r][c] === n)) continue;
      const spots = unit.cells.filter(
        ([r, c]) => grid[r][c] === 0 && candidates(grid, r, c).includes(n),
      );
      if (spots.length === 1) {
        const [r, c] = spots[0];
        return {
          kind: 'single',
          message: `In ${unit.name}, ${n} can only go in cell (${r + 1},${c + 1}).`,
          cells: [[r, c]],
          value: n,
        };
      }
    }
  }

  const empty: Cell[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return null;
  const cell = pickRandom(empty);
  const value = solvedGrid[cell[0]][cell[1]];
  return {
    kind: 'reveal',
    message: `Filled cell (${cell[0] + 1},${cell[1] + 1}) with ${value}.`,
    cells: [cell],
    value,
  };
};
