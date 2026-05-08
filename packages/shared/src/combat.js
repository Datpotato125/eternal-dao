import { mulberry32 } from './rng.js';

// Power multiplier per spirit root
const ROOT_POWER = {
  mortal: 1.00,
  wood:   1.10,
  fire:   1.10,
  water:  1.10,
  metal:  1.10,
  earth:  1.10,
  dual:   1.15,
  chaos:  1.20,
};

// Derive a fighter's combat power from their character row.
// Higher realm = clear advantage; Qi fill % and spirit root add secondary bonuses.
function power(char) {
  const base     = char.realm_level * 100;
  const qiFill   = char.qi_max > 0 ? char.qi_current / char.qi_max : 0;
  const qiBonus  = Math.floor(qiFill * 50);
  const rootMult = ROOT_POWER[char.spirit_root] ?? 1.0;
  return Math.floor((base + qiBonus) * rootMult);
}

/**
 * Resolve a fight deterministically from a seed.
 * Same seed + same characters always produces the same result.
 *
 * @param {object} attacker  - characters row (realm_level, qi_current, qi_max, spirit_root)
 * @param {object} defender  - characters row
 * @param {number} seed      - integer seed stored in combat_log
 * @param {number} maxRounds - max rounds before forcing a winner
 */
export function resolveCombat(attacker, defender, seed, maxRounds = 10) {
  const rng = mulberry32(seed);
  const aPower = power(attacker);
  const dPower = power(defender);
  const majority = Math.floor(maxRounds / 2) + 1; // 6 for 10 rounds

  let aWins = 0;
  let dWins = 0;
  const log = [];

  for (let i = 0; i < maxRounds; i++) {
    const aRoll = rng() * aPower;
    const dRoll = rng() * dPower;
    const roundWinner = aRoll >= dRoll ? 'attacker' : 'defender';

    if (roundWinner === 'attacker') aWins++;
    else dWins++;

    log.push({
      round:          i + 1,
      attacker_roll:  Math.floor(aRoll),
      defender_roll:  Math.floor(dRoll),
      winner:         roundWinner,
    });

    // Stop as soon as one side reaches majority
    if (aWins >= majority || dWins >= majority) break;
  }

  return {
    winner:           aWins > dWins ? 'attacker' : 'defender',
    attacker_rounds:  aWins,
    defender_rounds:  dWins,
    attacker_power:   aPower,
    defender_power:   dPower,
    rounds_played:    log.length,
    log,
  };
}
