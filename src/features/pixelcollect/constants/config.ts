/** Parking slots for collectors that finish a lap with count left. */
export const TRAY_SIZE = 5;

/** Collectors that can ride the belt at the same time. */
export const BELT_CAPACITY = 5;

/** Milliseconds per belt step. */
export const TICK_MS = 60;

export interface PixelDifficulty {
  id: string;
  name: string;
  /** Picture is size × size. */
  size: number;
  colors: number;
  /** Deck lanes the collectors are dealt into. */
  lanes: number;
}

/** Every game generates a new picture, so each level is endless. */
export const PIXEL_DIFFICULTIES: PixelDifficulty[] = [
  { id: 'easy', name: 'Easy', size: 10, colors: 3, lanes: 3 },
  { id: 'medium', name: 'Medium', size: 12, colors: 4, lanes: 3 },
  { id: 'hard', name: 'Hard', size: 14, colors: 5, lanes: 4 },
  { id: 'expert', name: 'Expert', size: 16, colors: 6, lanes: 4 },
  { id: 'master', name: 'Master', size: 18, colors: 7, lanes: 5 },
];
