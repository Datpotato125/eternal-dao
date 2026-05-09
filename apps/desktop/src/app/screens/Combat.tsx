import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';
import { COLORS, REALM_COLORS, REALM_NAMES } from '../constants/theme';
import CombatStage, { type CombatStageRef } from '../combat/CombatStage';
import { buildFighter, chooseEnemyAction, generateSeed, mulberry32, resolveRound } from '../combat/combatEngine';
import { ACTION_LABELS, ACTION_QI_COST, type Action, type CombatWinner, type Fighter, type RoundResult } from '../combat/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpponentRow {
  id: string;
  realm_level: number;
  spirit_root: string;
  pvp_wins: number;
  pvp_losses: number;
  players: { username: string } | null;
}

interface ActiveCombat {
  seed: number;
  player: Fighter;
  enemy: Fighter;
  rounds: RoundResult[];
  currentRound: number;
}

type Phase = 'select' | 'fighting' | 'finished';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ background: COLORS.border, borderRadius: 3, height: 7, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function FighterStats({ fighter, label }: { fighter: Fighter; label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fighter.name}
        <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 400, marginLeft: 6 }}>
          {REALM_NAMES[fighter.realm_level] ?? `Realm ${fighter.realm_level}`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: COLORS.red, minWidth: 14 }}>❤</span>
        <Bar value={fighter.currentHp} max={fighter.maxHp} color={COLORS.red} />
        <span style={{ fontSize: 10, color: COLORS.textMuted, minWidth: 60, textAlign: 'right' }}>
          {fighter.currentHp}/{fighter.maxHp}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: COLORS.jade, minWidth: 14 }}>⚡</span>
        <Bar value={fighter.currentQi} max={fighter.maxQi} color={COLORS.jade} />
        <span style={{ fontSize: 10, color: COLORS.textMuted, minWidth: 60, textAlign: 'right' }}>
          {fighter.currentQi}/{fighter.maxQi}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Combat() {
  const { character, username } = useAuth();

  const [phase,    setPhase]    = useState<Phase>('select');
  const [opponents, setOpponents] = useState<OpponentRow[]>([]);
  const [selected,  setSelected]  = useState<OpponentRow | null>(null);
  const [combat,    setCombat]    = useState<ActiveCombat | null>(null);
  const [winner,    setWinner]    = useState<CombatWinner | null>(null);
  const [timer,     setTimer]     = useState(15);
  const [waiting,   setWaiting]   = useState(false);

  const stageRef        = useRef<CombatStageRef>(null);
  const handleActionRef = useRef<((a: Action) => void) | null>(null);
  const rngRef          = useRef<(() => number) | null>(null);

  // Load opponents from same server
  useEffect(() => {
    if (!character) return;
    supabase
      .from('characters')
      .select('id, realm_level, spirit_root, pvp_wins, pvp_losses, players!player_id(username)')
      .eq('server_id', character.server_id)
      .neq('id', character.id)
      .order('realm_level', { ascending: false })
      .limit(20)
      .then(({ data }) => setOpponents((data as unknown as OpponentRow[]) ?? []));
  }, [character]);

  // ── Start a fight ──────────────────────────────────────────────────────────

  const startFight = (opponent: OpponentRow) => {
    if (!character) return;
    const seed = generateSeed();
    rngRef.current = mulberry32(seed);

    const player = buildFighter(character.id, username ?? 'You', character.realm_level, character.spirit_root);
    const enemy  = buildFighter(opponent.id, opponent.players?.username ?? 'Opponent', opponent.realm_level, opponent.spirit_root);

    setCombat({ seed, player, enemy, rounds: [], currentRound: 1 });
    setSelected(opponent);
    setWinner(null);
    setTimer(15);
    setWaiting(false);
    setPhase('fighting');
  };

  // Practice: fight a copy of your own character
  const startPractice = () => {
    if (!character) return;
    const seed = generateSeed();
    rngRef.current = mulberry32(seed);

    const player = buildFighter(character.id, username ?? 'You', character.realm_level, character.spirit_root);
    const dummy  = buildFighter('practice', 'Shadow Self', character.realm_level, character.spirit_root);

    setCombat({ seed, player, enemy: dummy, rounds: [], currentRound: 1 });
    setSelected(null);
    setWinner(null);
    setTimer(15);
    setWaiting(false);
    setPhase('fighting');
  };

  // ── Handle action ──────────────────────────────────────────────────────────

  const handleAction = useCallback(async (action: Action) => {
    if (waiting || !combat || !rngRef.current) return;

    setWaiting(true);
    const { player, enemy, rounds, currentRound, seed } = combat;

    const result = resolveRound(player, enemy, action, rngRef.current);
    result.round = currentRound;

    // Animate attacks sequentially
    if (stageRef.current) {
      if (result.enemyDamage > 0) await stageRef.current.animateAttack('player', result.enemyDamage);
      if (result.playerDamage > 0) await stageRef.current.animateAttack('enemy', result.playerDamage);
    }

    const newPlayer = { ...player, currentHp: result.playerHpAfter, currentQi: result.playerQiAfter };
    const newEnemy  = { ...enemy,  currentHp: result.enemyHpAfter,  currentQi: result.enemyQiAfter  };
    const newRounds = [...rounds, result];

    const roundOver = newPlayer.currentHp <= 0 || newEnemy.currentHp <= 0 || currentRound >= 10;

    if (roundOver) {
      let w: CombatWinner;
      if (newPlayer.currentHp <= 0 && newEnemy.currentHp <= 0) w = 'draw';
      else if (newEnemy.currentHp  <= 0) w = 'player';
      else if (newPlayer.currentHp <= 0) w = 'enemy';
      else w = newPlayer.currentHp > newEnemy.currentHp ? 'player' : newPlayer.currentHp < newEnemy.currentHp ? 'enemy' : 'draw';

      setCombat(s => s ? { ...s, player: newPlayer, enemy: newEnemy, rounds: newRounds } : s);
      setWinner(w);
      setPhase('finished');
      await saveCombat(seed, w, newPlayer.id, newEnemy.id, newRounds);
    } else {
      setCombat(s => s ? { ...s, player: newPlayer, enemy: newEnemy, rounds: newRounds, currentRound: currentRound + 1 } : s);
      setTimer(15);
    }

    setWaiting(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, combat]);

  // Keep ref in sync so timer always calls latest version
  useEffect(() => { handleActionRef.current = handleAction; }, [handleAction]);

  // ── Timer countdown ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'fighting' || waiting || winner) return;
    if (timer <= 0) { handleActionRef.current?.('strike'); return; }
    const t = setTimeout(() => setTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, phase, waiting, winner]);

  // ── Save to combat_log ─────────────────────────────────────────────────────

  const saveCombat = async (seed: number, w: CombatWinner, playerId: string, enemyId: string, rounds: RoundResult[]) => {
    if (!character || !selected) return; // don't save practice fights
    const winnerId = w === 'player' ? playerId : w === 'enemy' ? enemyId : null;
    await supabase.from('combat_log').insert({
      attacker_id: playerId,
      defender_id: enemyId,
      server_id:   character.server_id,
      seed,
      winner_id:   winnerId,
      log_json:    rounds,
    });
    // Update PvP stats
    if (w !== 'draw') {
      await Promise.all([
        supabase.from('characters').update({ pvp_wins:   character.pvp_wins   + 1 }).eq('id', playerId).then(),
        supabase.from('characters').update({ pvp_losses: character.pvp_losses + 1 }).eq('id', enemyId).then(),
      ].slice(0, w === 'player' ? 2 : 0).concat(
        w === 'enemy' ? [
          supabase.from('characters').update({ pvp_losses: character.pvp_losses + 1 }).eq('id', playerId).then(),
          supabase.from('characters').update({ pvp_wins: 0 }).eq('id', enemyId).then(), // updated by enemy's own fetch
        ] : []
      ));
    }
  };

  // ── No character guard ─────────────────────────────────────────────────────

  if (!character) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
        <div style={{ fontSize: 18, color: COLORS.gold }}>No Character Found</div>
        <div style={{ marginTop: 8, fontSize: 14 }}>Use /register in Discord to create your character.</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE: SELECT
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div style={{ padding: 40, maxWidth: 720 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3, marginBottom: 8 }}>⚔️ Combat</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 32 }}>
          Choose your opponent. The RNG seed is set when you begin — your choices determine the outcome.
        </div>

        {/* Practice mode */}
        <div
          onClick={startPractice}
          style={{
            background: COLORS.surface, border: `1px dashed ${COLORS.border}`,
            borderRadius: 10, padding: '14px 18px', marginBottom: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ fontSize: 24 }}>🪞</div>
          <div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 700 }}>Practice (Shadow Self)</div>
            <div style={{ fontSize: 12, color: COLORS.border, marginTop: 2 }}>Fight a copy of your own character. Result not saved.</div>
          </div>
        </div>

        {/* Opponent list */}
        {opponents.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.border, textAlign: 'center', padding: '40px 0' }}>
            No other cultivators found in your server yet.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
              Cultivators in your realm
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opponents.map(opp => (
                <div
                  key={opp.id}
                  onClick={() => startFight(opp)}
                  style={{
                    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = COLORS.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = COLORS.border)}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{opp.players?.username ?? 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: REALM_COLORS[opp.realm_level] ?? COLORS.textMuted, marginTop: 2 }}>
                      {REALM_NAMES[opp.realm_level] ?? `Realm ${opp.realm_level}`} · {opp.spirit_root}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: COLORS.jade }}>{opp.pvp_wins}W</div>
                    <div style={{ fontSize: 11, color: COLORS.red }}>{opp.pvp_losses}L</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE: FIGHTING / FINISHED
  // ─────────────────────────────────────────────────────────────────────────────

  if (!combat) return null;
  const { player, enemy, rounds, currentRound } = combat;

  const isFinished = phase === 'finished';
  const timerPct   = (timer / 15) * 100;
  const timerColor = timer <= 5 ? COLORS.red : COLORS.jade;

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => { setPhase('select'); setCombat(null); }}
          style={{ background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
        >
          ← Back
        </button>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>
          {isFinished ? 'Combat Ended' : `Round ${currentRound} / 10`}
          {!isFinished && selected && <span style={{ color: COLORS.border, marginLeft: 8 }}>seed: {combat.seed}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>

        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Pixi canvas */}
          <CombatStage ref={stageRef} playerName={player.name} enemyName={enemy.name} />

          {/* Stat bars */}
          <div style={{
            display: 'flex', gap: 24,
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: '0 0 10px 10px', padding: '14px 20px',
            marginTop: -1, borderTop: 'none',
          }}>
            <FighterStats fighter={player} label="You" />
            <div style={{ width: 1, background: COLORS.border }} />
            <FighterStats fighter={enemy}  label="Enemy" />
          </div>

          {/* Timer bar */}
          {!isFinished && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>Choose action</span>
                <span style={{ fontSize: 12, color: timerColor, fontWeight: 700 }}>⏱ {timer}s</span>
              </div>
              <div style={{ background: COLORS.border, borderRadius: 3, height: 4 }}>
                <div style={{ width: `${timerPct}%`, height: '100%', background: timerColor, borderRadius: 3, transition: 'width 1s linear, background 0.3s' }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isFinished ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              {(['strike', 'qi_strike', 'defend', 'qi_burst'] as Action[]).map(action => {
                const cost = ACTION_QI_COST[action];
                const insufficient = cost > 0 && player.currentQi < cost;
                const disabled = waiting || insufficient;
                return (
                  <button
                    key={action}
                    onClick={() => !disabled && handleActionRef.current?.(action)}
                    disabled={disabled}
                    style={{
                      background: disabled ? COLORS.surface : COLORS.border,
                      border: `1px solid ${disabled ? COLORS.border : COLORS.gold}`,
                      borderRadius: 8, padding: '12px 8px', cursor: disabled ? 'not-allowed' : 'pointer',
                      color: disabled ? COLORS.textMuted : COLORS.gold,
                      fontSize: 13, fontWeight: 700, textAlign: 'center',
                      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    <div>{ACTION_LABELS[action]}</div>
                    {cost > 0 && <div style={{ fontSize: 10, color: insufficient ? COLORS.red : COLORS.jade, marginTop: 3 }}>{cost} Qi</div>}
                  </button>
                );
              })}
            </div>
          ) : (
            // Result panel
            <div style={{
              background: COLORS.surface, border: `2px solid ${winner === 'player' ? COLORS.jade : winner === 'enemy' ? COLORS.red : COLORS.gold}`,
              borderRadius: 10, padding: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                {winner === 'player' ? '🏆' : winner === 'enemy' ? '💀' : '🤝'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: winner === 'player' ? COLORS.jade : winner === 'enemy' ? COLORS.red : COLORS.gold, letterSpacing: 2 }}>
                {winner === 'player' ? 'Victory!' : winner === 'enemy' ? 'Defeated' : 'Draw'}
              </div>
              {!selected && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>Practice fight — result not saved.</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                <button
                  onClick={selected ? () => startFight(selected) : startPractice}
                  style={{ background: COLORS.border, border: `1px solid ${COLORS.gold}`, color: COLORS.gold, borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                >
                  Rematch
                </button>
                <button
                  onClick={() => { setPhase('select'); setCombat(null); }}
                  style={{ background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}
                >
                  Back to Select
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: round log */}
        <div style={{
          width: 220, flexShrink: 0,
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 0,
          maxHeight: 520, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Round Log
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rounds.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.border, textAlign: 'center', marginTop: 20 }}>No rounds yet</div>
            ) : (
              [...rounds].reverse().map(r => (
                <div key={r.round} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8 }}>
                  <div style={{ fontSize: 10, color: COLORS.gold, fontWeight: 700, marginBottom: 4 }}>Round {r.round}</div>
                  <div style={{ fontSize: 11, color: COLORS.text }}>
                    You: <span style={{ color: COLORS.jade }}>{ACTION_LABELS[r.playerAction]}</span>
                    {r.enemyDamage > 0 && <span style={{ color: COLORS.jade }}> →{r.enemyDamage}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.text }}>
                    Enemy: <span style={{ color: COLORS.red }}>{ACTION_LABELS[r.enemyAction]}</span>
                    {r.playerDamage > 0 && <span style={{ color: COLORS.red }}> →{r.playerDamage}</span>}
                  </div>
                  {r.events.map((e, i) => (
                    <div key={i} style={{ fontSize: 10, color: COLORS.gold, marginTop: 2 }}>{e}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
