export interface SudokuDifficulty {
  id: string;
  name: string;
  /**
   * How many of the 81 cells to empty. A puzzle with a unique solution has
   * at least 17 clues, and random puzzles typically can't go below ~22-25,
   * so the generator treats the highest levels as "as few clues as it can
   * find".
   */
  removalCount: number;
}

export const SUDOKU_DIFFICULTIES: { [key: string]: SudokuDifficulty } = {
  EASY: { id: 'easy', name: 'Easy', removalCount: 40 }, // 41 clues
  MEDIUM: { id: 'medium', name: 'Medium', removalCount: 47 }, // 34 clues
  HARD: { id: 'hard', name: 'Hard', removalCount: 52 }, // 29 clues
  EXPERT: { id: 'expert', name: 'Expert', removalCount: 55 }, // 26 clues
  EXTREME: { id: 'extreme', name: 'Extreme', removalCount: 58 }, // 23 clues
  EXTREME_PLUS: { id: 'extreme_plus', name: 'Extreme+', removalCount: 64 }, // as few as possible
};
