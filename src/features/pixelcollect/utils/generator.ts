import { SeededRNG } from '../../../utils/random';
import { Collector, EMPTY, exposedColors, soloLap } from './engine';

export interface Deck {
  lanes: Collector[][];
  /** Collector ids in an order that is guaranteed to clear the picture. */
  solution: number[];
}

/**
 * Builds the collector deck by playing the picture: repeatedly pick a colour
 * that is visible from the belt and send one collector of it around once.
 * Its count is exactly what it removes on that lap, so launching the
 * collectors in this order, one at a time, always clears the picture.
 *
 * The collectors are then dealt into lanes, keeping their relative order
 * inside each lane, so that order is always playable from the lane fronts.
 * Any dealing preserves that, so lanes are simply kept balanced.
 */
export const generateDeck = (picture: number[][], laneCount: number, seed: number): Deck => {
  const rng = new SeededRNG(seed);
  const work = picture.map(row => [...row]);
  const collectors: Collector[] = [];

  while (work.some(row => row.some(v => v !== EMPTY))) {
    const colors = [...exposedColors(work)];
    const color = rng.pick(colors);
    const removed = soloLap(work, color).length;
    collectors.push({ id: collectors.length, color, count: removed });
  }

  // Deal each collector onto one of the shortest lanes so lanes stay balanced.
  const lanes: Collector[][] = Array.from({ length: laneCount }, () => []);
  for (const c of collectors) {
    const min = Math.min(...lanes.map(l => l.length));
    const shortest = lanes.filter(l => l.length === min);
    rng.pick(shortest).push(c);
  }

  return { lanes, solution: collectors.map(c => c.id) };
};
