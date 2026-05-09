import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';
import { COLORS, REALM_COLORS, REALM_NAMES } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const REALM_QI: Record<number, number> = {
  1: 0, 2: 1_000, 3: 5_000, 4: 20_000, 5: 100_000,
  6: 500_000, 7: 2_000_000, 8: 10_000_000, 9: 50_000_000, 10: 200_000_000,
};

const SPIRIT_BONUSES: Record<string, string[]> = {
  mortal: ['No stat bonuses'],
  wood:   ['+20% Max HP'],
  fire:   ['+20% Attack Power'],
  water:  ['+20% Defense'],
  metal:  ['+10% Attack', '+10% Defense'],
  earth:  ['+15% Max HP', '+10% Defense'],
  chaos:  ['+15% HP', '+15% Attack', '+15% Defense'],
};

const SPIRIT_ICONS: Record<string, string> = {
  mortal: '○', wood: '🌿', fire: '🔥',
  water: '💧', metal: '⚙️', earth: '🌍', chaos: '☯',
};

const SPIRIT_BONUS_STATS: Record<string, { hp: number; atk: number; def: number }> = {
  mortal: { hp: 1.00, atk: 1.00, def: 1.00 },
  wood:   { hp: 1.20, atk: 1.00, def: 1.00 },
  fire:   { hp: 1.00, atk: 1.20, def: 1.00 },
  water:  { hp: 1.00, atk: 1.00, def: 1.20 },
  metal:  { hp: 1.00, atk: 1.10, def: 1.10 },
  earth:  { hp: 1.15, atk: 1.00, def: 1.10 },
  chaos:  { hp: 1.15, atk: 1.15, def: 1.15 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatQi(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString();
}

function formatDuration(hours: number): string {
  if (!isFinite(hours) || hours > 9_999) return '∞';
  if (hours < 1 / 60) return '< 1m';
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Calculate the accurate displayed Qi, accounting for unaccounted cultivation
// since the last Edge Function tick (stored in cultivation_started_at).
function calcStartQi(qiCurrent: number, qiMax: number, rate: number, startedAt: string | null): number {
  if (!startedAt) return qiCurrent;
  const elapsedMs    = Date.now() - new Date(startedAt).getTime();
  const elapsedHours = Math.min(elapsedMs / 3_600_000, 8); // same 8h cap as the bot
  return Math.min(qiCurrent + Math.floor(rate * elapsedHours), qiMax);
}

// ─── SVG Qi Orb ──────────────────────────────────────────────────────────────

function QiOrb({ current, max, isCultivating }: { current: number; max: number; isCultivating: boolean }) {
  const R    = 88;
  const CX   = 110;
  const CY   = 110;
  const circ = 2 * Math.PI * R;
  const pct  = max > 0 ? Math.min(1, current / max) : 0;
  const off  = circ * (1 - pct);

  return (
    <svg width={220} height={220} viewBox="0 0 220 220" style={{ overflow: 'visible' }}>
      {/* Outer glow */}
      <circle cx={CX} cy={CY} r={R + 14} fill="none" stroke={COLORS.jade}
        strokeWidth={isCultivating ? 8 : 2}
        opacity={isCultivating ? 0.12 : 0.05} />

      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={COLORS.border} strokeWidth={10} />

      {/* Progress arc */}
      <circle cx={CX} cy={CY} r={R}
        fill="none" stroke={COLORS.jade} strokeWidth={10}
        strokeDasharray={`${circ}`} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />

      {/* Soft glow duplicate when cultivating */}
      {isCultivating && (
        <circle cx={CX} cy={CY} r={R}
          fill="none" stroke={COLORS.jadeLight} strokeWidth={3} opacity={0.35}
          strokeDasharray={`${circ}`} strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dashoffset 0.9s ease', filter: `drop-shadow(0 0 5px ${COLORS.jade})` }}
        />
      )}

      {/* Center: current Qi */}
      <text x={CX} y={CY - 16} textAnchor="middle"
        fill={COLORS.gold} fontSize={26} fontWeight="900" fontFamily="system-ui, sans-serif">
        {formatQi(current)}
      </text>

      {/* Max Qi */}
      <text x={CX} y={CY + 8} textAnchor="middle"
        fill={COLORS.textMuted} fontSize={12} fontFamily="system-ui, sans-serif">
        / {formatQi(max)} Qi
      </text>

      {/* Percentage */}
      <text x={CX} y={CY + 26} textAnchor="middle"
        fill={COLORS.textMuted} fontSize={11} fontFamily="system-ui, sans-serif">
        {(pct * 100).toFixed(1)}%
      </text>

      {/* Status indicator */}
      <text x={CX} y={CY + 48} textAnchor="middle"
        fill={isCultivating ? COLORS.jade : COLORS.border} fontSize={10}
        fontFamily="system-ui, sans-serif" letterSpacing={1}>
        {isCultivating ? '● CULTIVATING' : '○ IDLE'}
      </text>
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 12, color: accent ?? COLORS.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 13, minWidth: 20 }}>{icon}</span>
      <span style={{ fontSize: 12, color: COLORS.textMuted, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value.toLocaleString()}</span>
    </div>
  );
}

// ─── Technique types ──────────────────────────────────────────────────────────

interface Technique {
  id: string;
  name: string;
  realm_required: number;
  qi_cost: number;
  damage_multiplier: number;
  description: string | null;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { character, username } = useAuth();

  const [displayQi,  setDisplayQi]  = useState(() =>
    character ? calcStartQi(character.qi_current, character.qi_max, character.cultivation_rate, character.cultivation_started_at) : 0
  );
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-sync when character data refreshes from DB
  useEffect(() => {
    if (!character) return;
    setDisplayQi(calcStartQi(character.qi_current, character.qi_max, character.cultivation_rate, character.cultivation_started_at));
  }, [character?.qi_current, character?.cultivation_started_at]);

  // Live Qi ticker — runs only when actively cultivating
  useEffect(() => {
    if (!character?.cultivation_started_at) return;
    const qiPerSecond = character.cultivation_rate / 3600;
    tickRef.current = setInterval(() => {
      setDisplayQi(prev => Math.min(character.qi_max, prev + qiPerSecond));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [character?.id, character?.cultivation_started_at, character?.cultivation_rate, character?.qi_max]);

  // Fetch techniques once
  useEffect(() => {
    supabase
      .from('techniques')
      .select('id, name, realm_required, qi_cost, damage_multiplier, description')
      .order('realm_required')
      .then(({ data }) => setTechniques((data as Technique[]) ?? []));
  }, []);

  // ── No character guard ───────────────────────────────────────────────────────

  if (!character) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 18, color: COLORS.gold }}>No Character Found</div>
        <div style={{ marginTop: 8, fontSize: 14 }}>Use /register in Discord to create your character.</div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const isCultivating = !!character.cultivation_started_at;
  const realmColor    = REALM_COLORS[character.realm_level] ?? COLORS.textMuted;
  const realmName     = REALM_NAMES[character.realm_level]  ?? 'Unknown';

  const nextRealm    = character.realm_level + 1;
  const nextRealmQi  = REALM_QI[nextRealm];
  const thisRealmQi  = REALM_QI[character.realm_level] ?? 0;
  const realmProgress = nextRealmQi
    ? Math.min(1, Math.max(0, (displayQi - thisRealmQi) / (nextRealmQi - thisRealmQi)))
    : 1;
  const qiToBreak = nextRealmQi ? Math.max(0, nextRealmQi - displayQi) : 0;
  const canBreakthrough = nextRealmQi != null && displayQi >= nextRealmQi;

  const rate          = character.cultivation_rate;
  const timeToMax     = rate > 0 ? (character.qi_max - displayQi) / rate       : Infinity;
  const timeToBreak   = rate > 0 && qiToBreak > 0 ? qiToBreak / rate           : null;

  // Combat power estimates (same formulas as combatEngine)
  const sb       = SPIRIT_BONUS_STATS[character.spirit_root] ?? SPIRIT_BONUS_STATS.mortal;
  const combatHp  = Math.floor((100 + character.realm_level * 50) * sb.hp);
  const combatAtk = Math.floor((10  + character.realm_level * 8)  * sb.atk);
  const combatDef = Math.floor((5   + character.realm_level * 4)  * sb.def);
  const combatQi  = 20 + character.realm_level * 10;

  const spiritLines = SPIRIT_BONUSES[character.spirit_root] ?? ['No bonuses'];
  const spiritIcon  = SPIRIT_ICONS[character.spirit_root]   ?? '○';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>⚡ Cultivation Dashboard</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5 }}>
          {username ?? 'Cultivator'}
          <span style={{ color: COLORS.border }}> · </span>
          <span style={{ color: realmColor, fontWeight: 700 }}>{realmName}</span>
          <span style={{ color: COLORS.border }}> · </span>
          <span style={{ color: COLORS.textMuted, textTransform: 'capitalize' }}>{character.spirit_root} Root {spiritIcon}</span>
        </div>
      </div>

      {/* ── Top grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 20 }}>

        {/* LEFT: Qi orb + cultivation stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <QiOrb current={displayQi} max={character.qi_max} isCultivating={isCultivating} />

          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: '16px 18px', width: '100%',
          }}>
            <StatRow label="Cultivation Rate"     value={`${rate.toLocaleString()} Qi / hr`} />
            <StatRow label="Time to Full Qi"      value={formatDuration(timeToMax)} accent={timeToMax < 0.5 ? COLORS.jade : undefined} />
            {nextRealmQi != null && (
              <StatRow
                label="Time to Breakthrough"
                value={timeToBreak != null ? formatDuration(timeToBreak) : canBreakthrough ? 'READY!' : '—'}
                accent={canBreakthrough ? COLORS.gold : timeToBreak != null && timeToBreak < 2 ? COLORS.jade : undefined}
              />
            )}
            <StatRow label="PvP Record" value={`${character.pvp_wins}W / ${character.pvp_losses}L`} />

            {isCultivating && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: COLORS.jade, fontWeight: 700 }}>● Active session</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>+{(rate / 3600).toFixed(3)} / s</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Realm progress */}
          <div style={{ background: COLORS.surface, border: `1px solid ${canBreakthrough ? COLORS.gold : COLORS.border}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Realm Progress</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: realmColor }}>{realmName}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Realm {character.realm_level}</div>
              </div>
              {nextRealmQi != null ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: REALM_COLORS[nextRealm] ?? COLORS.textMuted, fontWeight: 700 }}>
                    {REALM_NAMES[nextRealm]}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatQi(qiToBreak)} Qi needed</div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700 }}>MAX REALM ✦</div>
              )}
            </div>

            <div style={{ background: COLORS.border, borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${realmProgress * 100}%`, height: '100%',
                background: canBreakthrough
                  ? `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldLight})`
                  : `linear-gradient(90deg, ${realmColor}, ${COLORS.gold}40)`,
                borderRadius: 4, transition: 'width 0.9s ease',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                {formatQi(displayQi)} / {nextRealmQi != null ? formatQi(nextRealmQi) : '—'}
              </span>
              {canBreakthrough ? (
                <span style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700 }}>
                  ✦ BREAKTHROUGH READY — use /breakthrough in Discord
                </span>
              ) : (
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>{(realmProgress * 100).toFixed(1)}%</span>
              )}
            </div>
          </div>

          {/* Spirit root + Combat power */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Spirit Root</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{spiritIcon}</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, textTransform: 'capitalize' }}>{character.spirit_root}</div>
              </div>
              {spiritLines.map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: COLORS.jade, marginTop: 4 }}>✦ {line}</div>
              ))}
            </div>

            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Combat Power</div>
              <MiniStat icon="❤️" label="Max HP"   value={combatHp}  color={COLORS.red}      />
              <MiniStat icon="⚔️" label="Attack"   value={combatAtk} color={COLORS.gold}     />
              <MiniStat icon="🛡️" label="Defense"  value={combatDef} color={COLORS.jade}     />
              <MiniStat icon="⚡" label="Qi Pool"  value={combatQi}  color={COLORS.textMuted} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Techniques ── */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
          Techniques
        </div>

        {techniques.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.border, textAlign: 'center', padding: '24px 0' }}>
            No techniques found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {techniques.map(tech => {
              const unlocked = character.realm_level >= tech.realm_required;
              return (
                <div key={tech.id} style={{
                  border: `1px solid ${unlocked ? COLORS.border : COLORS.surface}`,
                  background: unlocked ? 'transparent' : `${COLORS.surface}80`,
                  borderRadius: 8, padding: '12px 14px',
                  opacity: unlocked ? 1 : 0.4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? COLORS.text : COLORS.textMuted }}>
                      {tech.name}
                    </div>
                    <div style={{ fontSize: 10, color: unlocked ? COLORS.jade : COLORS.border, flexShrink: 0, marginLeft: 8 }}>
                      {unlocked ? '✓' : `Realm ${tech.realm_required}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: tech.description ? 5 : 0 }}>
                    {tech.qi_cost > 0 ? `${tech.qi_cost} Qi` : 'Free'} · ×{tech.damage_multiplier.toFixed(1)} damage
                  </div>
                  {tech.description && (
                    <div style={{ fontSize: 11, color: COLORS.border, lineHeight: 1.5 }}>{tech.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
