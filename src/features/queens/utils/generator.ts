export interface PuzzleData {
  colorGrid: number[][];
  puzzleGrid: number[][];
  seed: number;
}

class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getCurrentSeed(): number {
    return this.seed;
  }
}


const generateValidQueens = (size: number, rng: SeededRNG): [number, number][] | null => {
  const queens: [number, number][] = [];

  const isSafe = (row: number, col: number): boolean => {
    for (const [qRow, qCol] of queens) {
      if (qCol === col) return false;
      if (Math.abs(qRow - row) <= 1 && Math.abs(qCol - col) <= 1) return false;
    }
    return true;
  };

  const solve = (row: number): boolean => {
    if (row === size) return true;

    const columns = Array.from({ length: size }, (_, i) => i);
    rng.shuffle(columns);

    for (const col of columns) {
      if (isSafe(row, col)) {
        queens.push([row, col]);
        if (solve(row + 1)) return true;
        queens.pop();
      }
    }
    return false;
  };

  if (solve(0)) {
    return queens;
  }
  return null;
};

const solvePuzzleLogically = (
  startGrid: number[][],
  colorGrid: number[][],
): { grid: number[][]; queens: number; solvable: boolean } => {
  const size = startGrid.length;
  const grid = startGrid.map(row => [...row]);
  let changed = true;
  let queensPlaced = 0;
  grid.forEach(row =>
    row.forEach(cell => {
      if (cell === 2) queensPlaced++;
    }),
  );

  const placeQueen = (r: number, c: number): boolean => {
    if (grid[r][c] !== 0) return false;
    grid[r][c] = 2;
    queensPlaced++;
    return true;
  };

  const findCombinations = <T>(array: T[], size: number): T[][] => {
    const result: T[][] = [];
    function combinationUtil(start: number, current: T[]) {
      if (current.length === size) {
        result.push([...current]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        current.push(array[i]);
        combinationUtil(i + 1, current);
        current.pop();
      }
    }
    combinationUtil(0, []);
    return result;
  };

  while (changed) {
    changed = false;
    if (queensPlaced === size) break;

    const queens: [number, number][] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) if (grid[r][c] === 2) queens.push([r, c]);

    for (const [qr, qc] of queens) {
      const queenColor = colorGrid[qr][qc];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (grid[i][j] === 0) {
            const isAttacked =
              i === qr ||
              j === qc ||
              (Math.abs(i - qr) <= 1 && Math.abs(j - qc) <= 1) ||
              colorGrid[i][j] === queenColor;
            if (isAttacked) {
              grid[i][j] = 1;
              changed = true;
            }
          }
        }
      }
    }

    for (let i = 0; i < size; i++) {
      const checkConstraintForSingles = (cells: [number, number][]) => {
        if (cells.some(([r, c]) => grid[r][c] === 2)) return;
        const possibleSpots = cells.filter(([r, c]) => grid[r][c] === 0);

        if (possibleSpots.length === 1) {
          if (placeQueen(possibleSpots[0][0], possibleSpots[0][1]))
            changed = true;
          return;
        }

        const validCandidates: [number, number][] = [];
        for (const [r, c] of possibleSpots) {
          let isPossible = true;
          for (const [qr, qc] of queens) {
            if (
              r === qr ||
              c === qc ||
              (Math.abs(r - qr) <= 1 && Math.abs(c - qc) <= 1) ||
              colorGrid[r][c] === colorGrid[qr][qc]
            ) {
              isPossible = false;
              break;
            }
          }
          if (isPossible) {
            validCandidates.push([r, c]);
          }
        }
        if (validCandidates.length === 1) {
          if (placeQueen(validCandidates[0][0], validCandidates[0][1]))
            changed = true;
        }
      };

      if (changed) continue;
      checkConstraintForSingles(Array.from({ length: size }, (_, c) => [i, c]));
      if (changed) continue;
      checkConstraintForSingles(Array.from({ length: size }, (_, r) => [r, i]));

      const colorCells: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (colorGrid[r][c] === i) colorCells.push([r, c]);
      if (colorCells.length > 0) {
        checkConstraintForSingles(colorCells);
      }
    }
    if (changed) continue;

    const colorCandidates: [number, number][][] = Array.from(
      { length: size },
      () => [],
    );
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c] === 0) colorCandidates[colorGrid[r][c]].push([r, c]);

    for (let color = 0; color < size; color++) {
      let hasQueen = false;
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (grid[r][c] === 2 && colorGrid[r][c] === color) hasQueen = true;
      if (hasQueen) continue;
      const candidates = colorCandidates[color];
      if (candidates.length < 2) continue;

      const uniqueRows = new Set(candidates.map(([r]) => r));
      if (uniqueRows.size === 1) {
        const row = uniqueRows.values().next().value;
        for (let c = 0; c < size; c++) {
          if (grid[row!][c] === 0 && colorGrid[row!][c] !== color) {
            grid[row!][c] = 1;
            changed = true;
          }
        }
      }
      const uniqueCols = new Set(candidates.map(([, c]) => c));
      if (uniqueCols.size === 1) {
        const col = uniqueCols.values().next().value;
        for (let r = 0; r < size; r++) {
          if (grid[r][col!] === 0 && colorGrid[r][col!] !== color) {
            grid[r][col!] = 1;
            changed = true;
          }
        }
      }
    }
    if (changed) continue;

    for (let color = 0; color < size; color++) {
      let hasQueenInColor = false;
      const colorCells: [number, number][] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (colorGrid[r][c] === color) {
            colorCells.push([r, c]);
            if (grid[r][c] === 2) {
              hasQueenInColor = true;
            }
          }
        }
      }
      if (hasQueenInColor || colorCells.length === 0) {
        continue;
      }
      const uniqueRows = new Set(colorCells.map(([r]) => r));
      const uniqueCols = new Set(colorCells.map(([, c]) => c));

      if (uniqueRows.size === 1) {
        const row = uniqueRows.values().next().value;
        for (let c = 0; c < size; c++) {
          if (colorGrid[row!][c] !== color && grid[row!][c] === 0) {
            grid[row!][c] = 1;
            changed = true;
          }
        }
      }
      if (uniqueCols.size === 1) {
        const col = uniqueCols.values().next().value;
        for (let r = 0; r < size; r++) {
          if (colorGrid[r][col!] !== color && grid[r][col!] === 0) {
            grid[r][col!] = 1;
            changed = true;
          }
        }
      }
    }
    if (changed) continue;

    const availableColors = Array.from({ length: size }, (_, i) => i).filter(
      color => !queens.some(([qr, qc]) => colorGrid[qr][qc] === color),
    );
    for (let N = 2; N <= 4; N++) {
      if (availableColors.length < N) break;
      const columnIndices = Array.from({ length: size }, (_, i) => i);
      const columnCombinations = findCombinations(columnIndices, N);
      for (const columnCombo of columnCombinations) {
        const confinedColors: number[] = [];
        for (const color of availableColors) {
          const candidates = colorCandidates[color];
          if (
            candidates.length > 0 &&
            candidates.every(([, c]) => columnCombo.includes(c))
          ) {
            confinedColors.push(color);
          }
        }
        if (confinedColors.length === N) {
          for (const col of columnCombo) {
            for (let row = 0; row < size; row++) {
              if (
                grid[row][col] === 0 &&
                !confinedColors.includes(colorGrid[row][col])
              ) {
                grid[row][col] = 1;
                changed = true;
              }
            }
          }
        }
      }
      if (changed) break;
      const rowIndices = Array.from({ length: size }, (_, i) => i);
      const rowCombinations = findCombinations(rowIndices, N);
      for (const rowCombo of rowCombinations) {
        const confinedColors: number[] = [];
        for (const color of availableColors) {
          const candidates = colorCandidates[color];
          if (
            candidates.length > 0 &&
            candidates.every(([r]) => rowCombo.includes(r))
          ) {
            confinedColors.push(color);
          }
        }
        if (confinedColors.length === N) {
          for (const row of rowCombo) {
            for (let col = 0; col < size; col++) {
              if (
                grid[row][col] === 0 &&
                !confinedColors.includes(colorGrid[row][col])
              ) {
                grid[row][col] = 1;
                changed = true;
              }
            }
          }
        }
      }
      if (changed) break;
    }
  }
  return { grid, queens: queensPlaced, solvable: queensPlaced === size };
};

const generateSmallPuzzle = (
  size: number,
  rng: SeededRNG,
): PuzzleData | null => {

  let attempts = 0;
  const MAX_TOTAL_ATTEMPTS = 500;

  while (attempts < MAX_TOTAL_ATTEMPTS) {
    attempts++;

    const solutionQueens = generateValidQueens(size, rng);
    if (!solutionQueens) continue;

    const queensCoord: { [key: number]: number } = {};
    for (const [r, c] of solutionQueens) {
      queensCoord[r] = c;
    }

    const colorGrid: number[][] = Array.from({ length: size }, () =>
      Array(size).fill(-1),
    );

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (queensCoord[i] === j) {
          colorGrid[i][j] = i;
        }
      }
    }

    const isElemInGrid = (val: number, grid: number[][]) =>
      grid.some(row => row.includes(val));

    const getValidColoredCells = () => {
      const cells: [number, number, number][] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (colorGrid[r][c] !== -1) {
            cells.push([r, c, colorGrid[r][c]]);
          }
        }
      }
      return cells;
    };

    let safetyLoop = 0;
    let mapGenerationFailed = false;
    while (isElemInGrid(-1, colorGrid)) {
      safetyLoop++;
      if (safetyLoop > 5000) {
        mapGenerationFailed = true;
        break;
      }

      const coloredCells = getValidColoredCells();
      if (coloredCells.length === 0) break;

      const [r, c, color] = coloredCells[rng.randInt(0, coloredCells.length - 1)];
      const neighborhood: [number, number][] = [];
      if (r > 0) neighborhood.push([r - 1, c]);
      if (r < size - 1) neighborhood.push([r + 1, c]);
      if (c > 0) neighborhood.push([r, c - 1]);
      if (c < size - 1) neighborhood.push([r, c + 1]);

      const uncoloredNeighborhood = neighborhood.filter(
        ([nr, nc]) => colorGrid[nr][nc] === -1,
      );

      if (uncoloredNeighborhood.length > 0) {
        const [chosenR, chosenC] = uncoloredNeighborhood[rng.randInt(0, uncoloredNeighborhood.length - 1)];
        colorGrid[chosenR][chosenC] = color;
      }
    }

    if (mapGenerationFailed) continue;

    const testGrid = Array.from({ length: size }, () => Array(size).fill(0));
    const result = solvePuzzleLogically(testGrid, colorGrid);

    if (result.solvable) {
      const puzzleGrid = Array.from({ length: size }, () => Array(size).fill(0));
      return {
        colorGrid,
        puzzleGrid,
        seed: rng.getCurrentSeed(),
      };
    }

  }

  return null; 
};

const generateLargePuzzle = (
  size: number,
  removalRatio: number,
  rng: SeededRNG,
): PuzzleData | null => {

  const solutionQueens = generateValidQueens(size, rng);
  if (!solutionQueens) return null;

  let colorGrid: number[][] = [];
  const createColorGrid = () => {
    const grid = Array(size)
      .fill(null)
      .map(() => Array(size).fill(-1));

    const frontier: [number, number][] = [];
    solutionQueens.forEach(([r, c], index) => {
      const color = index;
      grid[r][c] = color;
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === -1) {
          frontier.push([nr, nc]);
        }
      }
    });

    while (frontier.length > 0) {
      const pickIndex = rng.randInt(0, frontier.length - 1);
      const [r, c] = frontier[pickIndex];
      frontier.splice(pickIndex, 1);

      if (grid[r][c] !== -1) continue;

      const neighborColors: number[] = [];
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== -1) {
          neighborColors.push(grid[nr][nc]);
        }
      }

      if (neighborColors.length > 0) {
        const chosenColor = neighborColors[rng.randInt(0, neighborColors.length - 1)];
        grid[r][c] = chosenColor;

        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === -1) {
            if (!frontier.some(([fr, fc]) => fr === nr && fc === nc)) {
              frontier.push([nr, nc]);
            }
          }
        }
      }
    }
    colorGrid = grid;
  };

  createColorGrid();

  const puzzleGrid = Array(size)
    .fill(null)
    .map(() => Array(size).fill(1));
  const solutionSet = new Set(solutionQueens.map(([r, c]) => `${r},${c}`));
  const removableClues: [number, number][] = [];

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (solutionSet.has(`${r},${c}`)) {
        puzzleGrid[r][c] = 0;
      } else {
        removableClues.push([r, c]);
      }
    }
  rng.shuffle(removableClues);

  const cluesToRemoveCount = Math.floor(removableClues.length * removalRatio);
  let removedCount = 0;

  for (const [r, c] of removableClues) {
    if (removedCount >= cluesToRemoveCount) break;
    puzzleGrid[r][c] = 0;
    const result = solvePuzzleLogically(puzzleGrid, colorGrid);
    if (!result.solvable) {
      puzzleGrid[r][c] = 1;
    } else {
      removedCount++;
    }
  }

  return { colorGrid, puzzleGrid, seed: rng.getCurrentSeed() };
};

export const generatePuzzle = (
  size: number,
  removalRatio: number,
  initialSeed: number,
): PuzzleData | null => {
  const rng = new SeededRNG(initialSeed + Math.random() * 10000);

  if (size < 10) {
    return generateSmallPuzzle(size, rng);
  } else {
    return generateLargePuzzle(size, removalRatio, rng);
  }
};