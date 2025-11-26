import React from 'react';

import { SudokuDifficulty, SUDOKU_DIFFICULTIES } from '../constants/config';
import GameMenu from '../../../components/Menu';

interface MenuProps {
  onSelectDifficulty: (diff: SudokuDifficulty) => void;
  selectedDifficulty: SudokuDifficulty;
}

const SudokuMenu: React.FC<MenuProps> = ({
  onSelectDifficulty,
  selectedDifficulty,
}) => {
  const difficulties = Object.values(SUDOKU_DIFFICULTIES);

  return (
    <GameMenu
      title="Sudoku"
      subtitle="The Classic Logic Puzzle"
      difficulties={difficulties as any[]}
      selectedDifficulty={selectedDifficulty as any}
      onSelectDifficulty={onSelectDifficulty as any}
      rules={[
        'Fill every row with numbers 1-9.',
        'Fill every column with numbers 1-9.',
        'Fill every 3x3 box with numbers 1-9.',
        'Do not repeat numbers in any group.',
      ]}
      maxWidth={350}
    />
  );
};

export default SudokuMenu;
