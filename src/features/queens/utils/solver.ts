/**
 * Logical (no-guessing) solver for the Queens puzzle.
 *
 * Rules: exactly one queen per row, per column and per colour region, and
 * no two queens may touch (not even diagonally).
 *
 * The solver is built from single deduction steps so the same code can be
 * used to (a) check that a generated puzzle is solvable without guessing
 * and (b) give the player a hint for the next logical move.
 *
 * Every deduction is sound, so if the solver reaches a full board without a
 * contradiction the solution is unique.
 */

export const EMPTY = 0;
export const MARK = 1;
export const QUEEN = 2;

export type Cell = [number, number];

export interface Deduction {
  kind: 'place' | 'eliminate';
  cells: Cell[];
  reason: string;
}

type StepResult = Deduction | 'contradiction' | null;

interface Unit {
  kind: 'row' | 'column' | 'region';
  index: number;
  cells: Cell[];
}

const MAX_CONFINEMENT = 4;

const pos = ([r, c]: Cell) => `(${r + 1}, ${c + 1})`;

export const attacks = (
  colorGrid: number[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean =>
  r1 === r2 ||
  c1 === c2 ||
  (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) ||
  colorGrid[r1][c1] === colorGrid[r2][c2];

export const buildUnits = (colorGrid: number[][]) => {
  const size = colorGrid.length;
  const rows: Unit[] = [];
  const cols: Unit[] = [];
  const regions: Unit[] = [];
  for (let i = 0; i < size; i++) {
    rows.push({ kind: 'row', index: i, cells: [] });
    cols.push({ kind: 'column', index: i, cells: [] });
    regions.push({ kind: 'region', index: i, cells: [] });
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rows[r].cells.push([r, c]);
      cols[c].cells.push([r, c]);
      regions[colorGrid[r][c]].cells.push([r, c]);
    }
  }
  // peers[r][c]: every other cell a queen on (r, c) would attack.
  const stamp = new Int32Array(size * size).fill(-1);
  const peers: Cell[][][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const id = r * size + c;
      stamp[id] = id;
      const out: Cell[] = [];
      const add = (cell: Cell) => {
        const key = cell[0] * size + cell[1];
        if (stamp[key] === id) return;
        stamp[key] = id;
        out.push(cell);
      };
      rows[r].cells.forEach(add);
      cols[c].cells.forEach(add);
      regions[colorGrid[r][c]].cells.forEach(add);
      for (let nr = Math.max(0, r - 1); nr <= Math.min(size - 1, r + 1); nr++)
        for (let nc = Math.max(0, c - 1); nc <= Math.min(size - 1, c + 1); nc++)
          add(rows[nr].cells[nc]);
      return out;
    }),
  );
  return { rows, cols, regions, all: [...rows, ...cols, ...regions], peers };
};

type Units = ReturnType<typeof buildUnits>;

const unitName = (u: Unit) =>
  u.kind === 'region' ? 'this colour region' : `${u.kind} ${u.index + 1}`;

/**
 * All groups of exactly `n` items whose key sets together cover exactly `n`
 * keys. Groups are built incrementally and pruned as soon as they cover
 * more than `n` keys, which keeps this cheap on large boards.
 */
const confinedGroups = <T extends { keys: Set<number> }>(items: T[], n: number): T[][] => {
  const out: T[][] = [];
  const cur: T[] = [];
  const rec = (start: number, covered: Set<number>) => {
    if (cur.length === n) {
      if (covered.size === n) out.push([...cur]);
      return;
    }
    for (let i = start; i <= items.length - (n - cur.length); i++) {
      const next = new Set(covered);
      items[i].keys.forEach(k => next.add(k));
      if (next.size > n) continue;
      cur.push(items[i]);
      rec(i + 1, next);
      cur.pop();
    }
  };
  rec(0, new Set());
  return out;
};

/**
 * Finds the next logical step for the given board, or `null` if the
 * techniques below can't make progress. Returns 'contradiction' if the
 * board is already impossible.
 *
 * With `batch` the step may cover several independent findings at once
 * (used by the generator for speed); without it each step is one easily
 * explained move (used for hints).
 */
export const findDeduction = (
  grid: number[][],
  colorGrid: number[][],
  units: Units = buildUnits(colorGrid),
  batch = false,
): StepResult => {
  const size = grid.length;

  const queens: Cell[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (grid[r][c] === QUEEN) queens.push([r, c]);

  // 0. Placed queens must not attack each other.
  for (let i = 0; i < queens.length; i++)
    for (let j = i + 1; j < queens.length; j++)
      if (attacks(colorGrid, ...queens[i], ...queens[j])) return 'contradiction';

  // 1. Cells attacked by a placed queen can't hold a queen.
  const attackedAll: Cell[] = [];
  for (const q of queens) {
    const attacked = units.peers[q[0]][q[1]].filter(([r, c]) => grid[r][c] === EMPTY);
    if (attacked.length === 0) continue;
    if (!batch) {
      return {
        kind: 'eliminate',
        cells: attacked,
        reason: `The queen at ${pos(q)} rules out these cells (same row, column, region, or touching).`,
      };
    }
    attackedAll.push(...attacked);
  }
  if (attackedAll.length > 0) {
    return { kind: 'eliminate', cells: attackedAll, reason: 'Cells attacked by placed queens.' };
  }

  // Candidate cells of every unit that still needs a queen.
  const openInfo = units.all
    .filter(u => !u.cells.some(([r, c]) => grid[r][c] === QUEEN))
    .map(u => ({ u, cand: u.cells.filter(([r, c]) => grid[r][c] === EMPTY) }));
  const open = new Set(openInfo.map(i => i.u));
  const candidatesOf = new Map(openInfo.map(i => [i.u, i.cand]));

  // 2. A unit with exactly one candidate left.
  const singles = new Map<string, Cell>();
  for (const { u, cand } of openInfo) {
    if (cand.length === 0) return 'contradiction';
    if (cand.length !== 1) continue;
    if (!batch) {
      return {
        kind: 'place',
        cells: cand,
        reason: `This is the only cell left for a queen in ${unitName(u)}.`,
      };
    }
    singles.set(`${cand[0][0]},${cand[0][1]}`, cand[0]);
  }
  if (singles.size > 0) {
    return { kind: 'place', cells: [...singles.values()], reason: 'Only cell left in a unit.' };
  }

  // 3. Confinement: N units of one kind whose candidates fit into exactly N
  //    units of another kind claim those N lines/regions for themselves.
  const confinement = (
    sources: Unit[],
    keyOf: (cell: Cell) => number,
    targetCells: (key: number) => Cell[],
    describe: (src: Unit[], keys: number[]) => string,
  ): Deduction | null => {
    const info = sources
      .filter(u => open.has(u))
      .map(u => {
        const cand = candidatesOf.get(u)!;
        return { u, cand, keys: new Set(cand.map(keyOf)) };
      });

    for (let n = 1; n <= Math.min(MAX_CONFINEMENT, info.length - 1); n++) {
      const eligible = info.filter(i => i.keys.size <= n);
      if (eligible.length < n) continue;
      for (const combo of confinedGroups(eligible, n)) {
        const keys = new Set<number>();
        combo.forEach(i => i.keys.forEach(k => keys.add(k)));

        const inCombo = new Set<string>();
        combo.forEach(i => i.cand.forEach(([r, c]) => inCombo.add(`${r},${c}`)));
        const toEliminate: Cell[] = [];
        keys.forEach(k =>
          targetCells(k).forEach(([r, c]) => {
            if (grid[r][c] === EMPTY && !inCombo.has(`${r},${c}`))
              toEliminate.push([r, c]);
          }),
        );
        if (toEliminate.length > 0) {
          return {
            kind: 'eliminate',
            cells: toEliminate,
            reason: describe(
              combo.map(i => i.u),
              [...keys].sort((a, b) => a - b),
            ),
          };
        }
      }
    }
    return null;
  };

  const list = (keys: number[]) => keys.map(k => k + 1).join(', ');
  const regionCells = (k: number) => units.regions[k].cells;

  const steps: (() => Deduction | null)[] = [
    // Regions confined to rows / columns.
    () =>
      confinement(units.regions, ([r]) => r, k => units.rows[k].cells, (src, keys) =>
        src.length === 1
          ? `A region can only place its queen in row ${list(keys)}, so the rest of that row is ruled out.`
          : `${src.length} regions only fit into rows ${list(keys)}, so other cells in those rows are ruled out.`,
      ),
    () =>
      confinement(units.regions, ([, c]) => c, k => units.cols[k].cells, (src, keys) =>
        src.length === 1
          ? `A region can only place its queen in column ${list(keys)}, so the rest of that column is ruled out.`
          : `${src.length} regions only fit into columns ${list(keys)}, so other cells in those columns are ruled out.`,
      ),
    // Rows / columns confined to regions.
    () =>
      confinement(units.rows, ([r, c]) => colorGrid[r][c], regionCells, src =>
        src.length === 1
          ? `Row ${src[0].index + 1} only has cells of one region left, so that region's queen must be in this row.`
          : `Rows ${list(src.map(u => u.index))} only have cells of ${src.length} regions left, so those regions' queens must be in these rows.`,
      ),
    () =>
      confinement(units.cols, ([r, c]) => colorGrid[r][c], regionCells, src =>
        src.length === 1
          ? `Column ${src[0].index + 1} only has cells of one region left, so that region's queen must be in this column.`
          : `Columns ${list(src.map(u => u.index))} only have cells of ${src.length} regions left, so those regions' queens must be in these columns.`,
      ),
  ];
  for (const step of steps) {
    const d = step();
    if (d) return d;
  }

  // 4. Look-ahead: a queen on this cell would attack every remaining
  //    candidate of some other row, column or region.
  const blocked = new Map<string, Cell>();
  for (const { u, cand } of openInfo) {
    // A blocking cell must at least attack the unit's first candidate.
    for (const [r, c] of units.peers[cand[0][0]][cand[0][1]]) {
      if (grid[r][c] !== EMPTY) continue;
      const inUnit =
        (u.kind === 'row' && u.index === r) ||
        (u.kind === 'column' && u.index === c) ||
        (u.kind === 'region' && u.index === colorGrid[r][c]);
      if (inUnit) continue;
      if (!cand.every(([ur, uc]) => attacks(colorGrid, r, c, ur, uc))) continue;
      if (!batch) {
        return {
          kind: 'eliminate',
          cells: [[r, c]],
          reason: `A queen here would leave no space for a queen in ${unitName(u)}.`,
        };
      }
      blocked.set(`${r},${c}`, [r, c]);
    }
  }
  if (blocked.size > 0) {
    return {
      kind: 'eliminate',
      cells: [...blocked.values()],
      reason: 'A queen on these cells would block a whole unit.',
    };
  }

  return null;
};

export const applyDeduction = (grid: number[][], d: Deduction) => {
  for (const [r, c] of d.cells) grid[r][c] = d.kind === 'place' ? QUEEN : MARK;
};

export interface SolveResult {
  grid: number[][];
  solved: boolean;
  contradiction: boolean;
}

/** Applies deductions until solved, stuck, or a contradiction is found. */
export const solveLogically = (
  startGrid: number[][],
  colorGrid: number[][],
  units: Units = buildUnits(colorGrid),
): SolveResult => {
  const size = startGrid.length;
  const grid = startGrid.map(row => [...row]);
  for (;;) {
    const d = findDeduction(grid, colorGrid, units, true);
    if (d === 'contradiction') return { grid, solved: false, contradiction: true };
    if (d === null) break;
    applyDeduction(grid, d);
  }
  const queens = grid.flat().filter(v => v === QUEEN).length;
  return { grid, solved: queens === size, contradiction: false };
};
