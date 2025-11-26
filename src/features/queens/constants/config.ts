export interface QueensDifficulty {
  id: string; // <--- Added this
  size: number;
  name: string;
  removalRatio: number;
}

export const DIFFICULTIES: { [key: string]: QueensDifficulty } = {
  EASY: { id: 'easy', size: 4, name: 'Easy (4x4)', removalRatio: 1 },
  MEDIUM: { id: 'medium', size: 6, name: 'Medium (6x6)', removalRatio: 1 },
  HARD: { id: 'hard', size: 8, name: 'Hard (8x8)', removalRatio: 0.9 },
  EXPERT: { id: 'expert', size: 10, name: 'Expert (10x10)', removalRatio: 0.93 },
  MASTER: { id: 'master', size: 12, name: 'Master (12x12)', removalRatio: 0.95 },
  HARDCORE: { id: 'hardcore', size: 20, name: 'Hardcore (20x20)', removalRatio: 0.96 },
};

export const COLORS = [
  '#FF1744', '#304FFE', '#00E676', '#FFC400', '#D500F9', '#FF6D00',
  '#00B8D4', '#F50057', '#76FF03', '#6200EA', '#1DE9B6', '#FFAB00',
  '#C51162', '#0091EA', '#880E4F', '#1A237E', '#004D40', '#BF360C',
  '#827717', '#4E342E', '#616161', '#FF8A65', '#4DD0E1', '#BA68C8',
  '#FBC02D', '#33691E', '#E65100', '#263238', '#AD1457', '#01579B',
];