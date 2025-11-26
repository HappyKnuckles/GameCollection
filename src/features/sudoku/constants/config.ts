export interface SudokuDifficulty {
  id: string;
  name: string;
  removalCount: number;
}

export const SUDOKU_DIFFICULTIES: { [key: string]: SudokuDifficulty } = {
  EASY: { id: 'easy', name: 'Easy', removalCount: 40 },
  MEDIUM: { id: 'medium', name: 'Medium', removalCount: 50 },
  HARD: { id: 'hard', name: 'Hard', removalCount: 60 },
  EXPERT: { id: 'expert', name: 'Expert', removalCount: 68 },
  EXTREME: { id: 'extreme', name: 'Extreme', removalCount: 85 },
  EXTREME_PLUS: { id: 'extreme_plus', name: 'Extreme+', removalCount: 98 },
};