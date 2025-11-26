import React from 'react';
import GameMenu from '../../../components/Menu';
import { QueensDifficulty, DIFFICULTIES } from '../../queens/constants/config';

interface MenuProps {
  onSelectDifficulty: (diff: QueensDifficulty) => void;
  selectedDifficulty: QueensDifficulty;
}

const QueensMenu: React.FC<MenuProps> = ({
  onSelectDifficulty,
  selectedDifficulty,
}) => {
  const difficulties = Object.values(DIFFICULTIES);

  return (
    <GameMenu
      title="👑 Queens Game"
      subtitle="A Logic Puzzle"
      difficulties={difficulties as any[]}
      selectedDifficulty={selectedDifficulty as any}
      onSelectDifficulty={onSelectDifficulty as any}
      rules={[
        'Tap to cycle: empty → ❌ → 👑',
        'One 👑 per row.',
        'One 👑 per column.',
        'One 👑 per colored region.',
        'Queens cannot be adjacent.',
      ]}
      maxWidth={350}
    />
  );
};

export default QueensMenu;
