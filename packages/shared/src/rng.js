// Mulberry32 — fast, seedable, deterministic across all platforms.
// Used for all combat resolution. Same seed = same fight everywhere.
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a deterministic combat seed from attacker/defender IDs + timestamp.
export function generateCombatSeed(attackerId, defenderId) {
  const ts = Date.now();
  const hash = [...attackerId, ...defenderId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (ts + hash) & 0x7fffffff; // positive 32-bit int
}
