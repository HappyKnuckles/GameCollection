/**
 * Small, fast, deterministic PRNG (mulberry32).
 * The same seed always produces the same sequence, so a puzzle can be
 * regenerated from its seed.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    // Fold any number (including large timestamps / fractions) into 32 bits.
    let h = Math.floor(Math.abs(seed)) % 4294967296;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    this.state = (h ^ (h >>> 16)) >>> 0;
  }

  /** Float in [0, 1). */
  random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] (inclusive). */
  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  pick<T>(array: readonly T[]): T {
    return array[this.randInt(0, array.length - 1)];
  }

  /** In-place Fisher–Yates shuffle. */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

export const randomSeed = (): number => Math.floor(Math.random() * 4294967296);
