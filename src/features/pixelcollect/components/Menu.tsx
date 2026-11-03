import React from 'react';
import GameMenu, { DifficultyItem } from '../../../components/Menu';
import { PICTURES, PictureDef } from '../constants/pictures';
import { TRAY_SIZE } from '../constants/config';

interface MenuProps {
  onSelectPicture: (picture: PictureDef) => void;
  selectedPicture: PictureDef;
}

const items: DifficultyItem[] = PICTURES.map(p => ({
  id: p.id,
  name: p.name,
  description: `${p.art.length}×${p.art[0].length} · ${Object.keys(p.palette).length} colours`,
}));

const PixelCollectMenu: React.FC<MenuProps> = ({ onSelectPicture, selectedPicture }) => (
  <GameMenu
    title="🎨 Pixel Collect"
    subtitle="Clear the picture with colour collectors"
    difficulties={items}
    selectedDifficulty={items.find(i => i.id === selectedPicture.id) ?? null}
    onSelectDifficulty={item => {
      const picture = PICTURES.find(p => p.id === item.id);
      if (picture) onSelectPicture(picture);
    }}
    rules={[
      'Tap a collector to send it around the picture on the belt.',
      'It removes the first pixel it sees in each row/column — only if that pixel is its colour.',
      'The number is how many pixels it can still collect.',
      `After one lap, collectors with pixels left park in the tray (${TRAY_SIZE} slots). Tap them to send them again.`,
      'If a collector has to park and the tray is full, you lose.',
      'Clear every pixel to win. Double-tap a picture to start.',
    ]}
    maxWidth={350}
  />
);

export default PixelCollectMenu;
