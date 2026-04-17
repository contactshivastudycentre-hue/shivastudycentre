/**
 * Deterministic seeded shuffle utilities.
 *
 * Used for per-student question randomization in tests:
 * - Same student (same attempt id) sees the same order on refresh
 * - Different students see different orders
 * - No DB storage required — order is derived from the seed
 */

/** mulberry32 PRNG — fast, deterministic, seed-based. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert any string into a 32-bit integer seed. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns a new shuffled copy of `arr` using a deterministic Fisher-Yates
 * algorithm seeded by `seed`. Same seed + same input always produces the same output.
 */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  const rand = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
