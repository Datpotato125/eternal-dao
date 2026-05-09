import type { Action, Fighter, RoundResult } from './types';

// Mulberry32 — fast seedable PRNG, deterministic across platforms.
// Same algorithm used by the Discord bot's auto-resolver.
export function mulberry32(seed: number): () => number {
  let s = seed;
  return (): number => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7FFFFFFF)) & 0x7FFFFFFF;
}

const SPIRIT_BONUS: Record<string, { hp: number; atk: number; def: number }> = {
  mortal: { hp: 1.00, atk: 1.00, def: 1.00 },
  wood:   { hp: 1.20, atk: 1.00, def: 1.00 },
  fire:   { hp: 1.00, atk: 1.20, def: 1.00 },
  water:  { hp: 1.00, atk: 1.00, def: 1.20 },
  metal:  { hp: 1.00, atk: 1.10, def: 1.10 },
  earth:  { hp: 1.15, atk: 1.00, def: 1.10 },
  chaos:  { hp: 1.15, atk: 1.15, def: 1.15 },
};

export function buildFighter(id: string, name: string, realm_level: number, spirit_root: string): Fighter {
  const b = SPIRIT_BONUS[spirit_root] ?? SPIRIT_BONUS.mortal;
  const maxHp = Math.floor((100 + realm_level * 50) * b.hp);
  const maxQi = 20 + realm_level * 10;
  return { id, name, realm_level, spirit_root, maxHp, maxQi, currentHp: maxHp, currentQi: maxQi };
}

function baseAtk(f: Fighter): number {
  const b = SPIRIT_BONUS[f.spirit_root] ?? SPIRIT_BONUS.mortal;
  return Math.floor((10 + f.realm_level * 8) * b.atk);
}

function baseDef(f: Fighter): number {
  const b = SPIRIT_BONUS[f.spirit_root] ?? SPIRIT_BONUS.mortal;
  return Math.floor((5 + f.realm_level * 4) * b.def);
}

export function chooseEnemyAction(enemy: Fighter, rng: () => number): Action {
  const hpRatio = enemy.currentHp / enemy.maxHp;
  const roll = rng();
  if (enemy.currentQi >= 40 && roll < 0.20) return 'qi_burst';
  if (enemy.currentQi >= 20 && roll < 0.48) return 'qi_strike';
  if (hpRatio < 0.35  && roll < 0.65) return 'defend';
  return 'strike';
}

export function resolveRound(
  player: Fighter,
  enemy: Fighter,
  playerAction: Action,
  rng: () => number,
): RoundResult {
  const enemyAction = chooseEnemyAction(enemy, rng);
  const events: string[] = [];

  const critRoll  = rng();
  const dodgeRoll = rng();

  let pDmg = 0; // damage dealt to player
  let eDmg = 0; // damage dealt to enemy
  let pQi  = 0; // qi delta for player
  let eQi  = 0; // qi delta for enemy

  const pAtk = baseAtk(player);
  const eAtk = baseAtk(enemy);
  const pDef = baseDef(player);
  const eDef = baseDef(enemy);

  // --- Player action ---
  switch (playerAction) {
    case 'strike': {
      const isCrit = critRoll < 0.15;
      eDmg = Math.floor(pAtk * (0.8 + 0.4 * rng()) * (isCrit ? 1.5 : 1));
      if (isCrit) events.push('Critical strike!');
      break;
    }
    case 'qi_strike':
      if (player.currentQi >= 20) {
        eDmg = Math.floor(pAtk * (1.2 + 0.6 * rng()));
        pQi -= 20;
        events.push('Qi surges!');
      } else {
        eDmg = Math.floor(pAtk * (0.8 + 0.4 * rng()));
        events.push('Qi depleted — basic strike!');
      }
      break;
    case 'defend':
      pQi += 10;
      events.push('Gathering Qi…');
      break;
    case 'qi_burst':
      if (player.currentQi >= 40) {
        eDmg = Math.floor(pAtk * (1.8 + 0.4 * rng()));
        pQi -= 40;
        events.push('Qi Burst unleashed!');
      } else {
        eDmg = Math.floor(pAtk * (0.8 + 0.4 * rng()));
        events.push('Qi depleted — basic strike!');
      }
      break;
  }

  // --- Enemy action ---
  switch (enemyAction) {
    case 'strike':
      pDmg = Math.floor(eAtk * (0.8 + 0.4 * rng()));
      break;
    case 'qi_strike':
      if (enemy.currentQi >= 20) {
        pDmg = Math.floor(eAtk * (1.2 + 0.6 * rng()));
        eQi -= 20;
      } else {
        pDmg = Math.floor(eAtk * (0.8 + 0.4 * rng()));
      }
      break;
    case 'defend':
      eQi += 10;
      break;
    case 'qi_burst':
      if (enemy.currentQi >= 40) {
        pDmg = Math.floor(eAtk * (1.8 + 0.4 * rng()));
        eQi -= 40;
      } else {
        pDmg = Math.floor(eAtk * (0.8 + 0.4 * rng()));
      }
      break;
  }

  // Defend halves incoming damage
  if (playerAction === 'defend') pDmg = Math.floor(pDmg * 0.5);
  if (enemyAction  === 'defend') eDmg = Math.floor(eDmg * 0.5);

  // Defense stat: each point = 0.5% reduction, max 50%
  pDmg = Math.floor(pDmg * (1 - Math.min(0.5, pDef * 0.005)));
  eDmg = Math.floor(eDmg * (1 - Math.min(0.5, eDef * 0.005)));

  // 5% dodge chance
  if (dodgeRoll < 0.05) { pDmg = 0; events.push('Dodged!'); }

  return {
    round: 0, // set by caller
    playerAction,
    enemyAction,
    playerDamage:  pDmg,
    enemyDamage:   eDmg,
    playerHpAfter: Math.max(0, player.currentHp - pDmg),
    enemyHpAfter:  Math.max(0, enemy.currentHp  - eDmg),
    playerQiAfter: Math.max(0, Math.min(player.maxQi, player.currentQi + pQi)),
    enemyQiAfter:  Math.max(0, Math.min(enemy.maxQi,  enemy.currentQi  + eQi)),
    events,
  };
}
