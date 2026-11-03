import React from 'react';
import GameMenu, { DifficultyItem } from '../../../components/Menu';
import { BELT_CAPACITY, PIXEL_DIFFICULTIES, PixelDifficulty, TRAY_SIZE } from '../constants/config';

interface MenuProps {
  onSelectDifficulty: (difficulty: PixelDifficulty) => void;
  selectedDifficulty: PixelDifficulty;
}

const items: DifficultyItem[] = PIXEL_DIFFICULTIES.map(d => ({
  id: d.id,
  name: d.name,
  description: `${d.size}×${d.size} · ${d.colors} colours`,
}));

const PixelCollectMenu: React.FC<MenuProps> = ({ onSelectDifficulty, selectedDifficulty }) => (
  <GameMenu
    title="🎨 Pixel Collect"
    subtitle="Clear the picture with colour collectors"
    difficulties={items}
    selectedDifficulty={items.find(i => i.id === selectedDifficulty.id) ?? null}
    onSelectDifficulty={item => {
      const difficulty = PIXEL_DIFFICULTIES.find(d => d.id === item.id);
      if (difficulty) onSelectDifficulty(difficulty);
    }}
    rules={[
      'Tap a collector to send it around the picture on the belt.',
      'It removes the first pixel it sees in each row/column — only if that pixel is its colour.',
      'The number is how many pixels it can still collect.',
      `At most ${BELT_CAPACITY} collectors fit on the belt at once.`,
      `After one lap, collectors with pixels left park in the tray (${TRAY_SIZE} slots). Tap them to send them again.`,
      'If a collector has to park and the tray is full, you lose.',
      'Clear every pixel to win. Every game is a new picture — play as long as you like.',
      'Double-tap a difficulty to start.',
    ]}
    maxWidth={350}
  />
);

export default PixelCollectMenu;
