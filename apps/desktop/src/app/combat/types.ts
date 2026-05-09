export type Action = 'strike' | 'qi_strike' | 'defend' | 'qi_burst';
export type CombatWinner = 'player' | 'enemy' | 'draw';

export interface Fighter {
  id: string;
  name: string;
  realm_level: number;
  spirit_root: string;
  maxHp: number;
  maxQi: number;
  currentHp: number;
  currentQi: number;
}

export interface RoundResult {
  round: number;
  playerAction: Action;
  enemyAction: Action;
  playerDamage: number;  // damage taken by player this round
  enemyDamage: number;   // damage taken by enemy this round
  playerHpAfter: number;
  enemyHpAfter: number;
  playerQiAfter: number;
  enemyQiAfter: number;
  events: string[];
}

export const ACTION_LABELS: Record<Action, string> = {
  strike:    'Strike',
  qi_strike: 'Qi Strike',
  defend:    'Defend',
  qi_burst:  'Qi Burst',
};

export const ACTION_QI_COST: Record<Action, number> = {
  strike:    0,
  qi_strike: 20,
  defend:    0,
  qi_burst:  40,
};
