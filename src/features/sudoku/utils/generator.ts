import { SudokuDifficulty } from "../constants/config";

export interface SudokuData {
  initialGrid: number[][]; // Clues only (0 for empty)
  solvedGrid: number[][];  // Full solution
  difficulty: SudokuDifficulty;
}

const BLANK = 0;

const isValid = (grid: number[][], row: number, col: number, num: number): boolean => {
  // Check Row & Col
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
    if (grid[x][col] === num) return false;
  }
  // Check 3x3 Box
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
};

// Fills the diagonal 3x3 boxes first (independent of each other) to speed up solving
const fillDiagonal = (grid: number[][]) => {
  for (let i = 0; i < 9; i = i + 3) {
    fillBox(grid, i, i);
  }
};

const fillBox = (grid: number[][], row: number, col: number) => {
  let num: number;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      do {
        num = Math.floor(Math.random() * 9) + 1;
      } while (!isSafeInBox(grid, row, col, num));
      grid[row + i][col + j] = num;
    }
  }
};

const isSafeInBox = (grid: number[][], row: number, col: number, num: number) => {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
};

const solveGrid = (grid: number[][]): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === BLANK) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveGrid(grid)) return true;
            grid[row][col] = BLANK;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Fast solver to check uniqueness. Breaks immediately if > 1 solution found.
const countSolutions = (grid: number[][]): number => {
  let count = 0;

  const solve = (g: number[][]): void => {
    if (count > 1) return; // Optimization: Stop as soon as we know it's not unique

    let row = -1;
    let col = -1;
    let isEmpty = false;

    // Find first empty cell
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (g[i][j] === BLANK) {
          row = i;
          col = j;
          isEmpty = true;
          break;
        }
      }
      if (isEmpty) break;
    }

    // If no empty cells, we found a solution
    if (!isEmpty) {
      count++;
      return;
    }

    for (let num = 1; num <= 9; num++) {
      if (isValid(g, row, col, num)) {
        g[row][col] = num;
        solve(g);
        g[row][col] = BLANK; // Backtrack
      }
    }
  };

  // Create a deep copy for the solver to mutate
  const gridCopy = grid.map(row => [...row]);
  solve(gridCopy);
  return count;
};

export const generateSudoku = (difficulty: SudokuDifficulty): SudokuData | null => {
  // 1. Generate a valid, full board
  // Optimization: Fill diagonal boxes first, then solve. This ensures better randomness and speed.
  const baseGrid = Array.from({ length: 9 }, () => Array(9).fill(BLANK));
  fillDiagonal(baseGrid);
  solveGrid(baseGrid);

  const solvedGrid = baseGrid.map(row => [...row]);

  // 2. Prepare removal logic
  // Create a list of all coordinates (0-80) and shuffle them.
  // This ensures we try to remove EVERY cell exactly once in a random order.
  let attempts = difficulty.removalCount;
  const puzzleGrid = baseGrid.map(row => [...row]);

  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // 3. Remove clues
  // We iterate through our shuffled list. We don't rely on a "while loop with safety break".
  for (const [row, col] of positions) {
    if (attempts <= 0) break; // Reached target difficulty

    const backup = puzzleGrid[row][col];
    puzzleGrid[row][col] = BLANK;

    // Check if the puzzle still has exactly one solution
    const solutions = countSolutions(puzzleGrid);

    if (solutions !== 1) {
      // If removing this number makes it unsolvable or ambiguous, put it back
      puzzleGrid[row][col] = backup;
    } else {
      // Valid removal
      attempts--;
    }
  }

  return {
    initialGrid: puzzleGrid,
    solvedGrid: solvedGrid,
    difficulty,
  };
};