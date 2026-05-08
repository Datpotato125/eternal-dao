import { useAuth } from '../store/useAuth';
import { COLORS, REALM_NAMES, REALM_COLORS } from '../constants/theme';

export default function Dashboard() {
  const { character, username } = useAuth();

  if (!character) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 18, color: COLORS.gold, marginBottom: 8 }}>No Character Found</div>
        <div style={{ fontSize: 14 }}>Use /register in Discord to create your character.</div>
      </div>
    );
  }

  const realmName  = REALM_NAMES[character.realm_level]  ?? 'Unknown';
  const realmColor = REALM_COLORS[character.realm_level] ?? COLORS.textMuted;
  const qiPct      = character.qi_max > 0 ? (character.qi_current / character.qi_max) * 100 : 0;

  return (
    <div style={{ padding: '40px 40px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>
          {username ?? 'Cultivator'}
        </div>
        <div style={{ fontSize: 13, color: realmColor, fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>
          {realmName}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <StatCard label="Realm Level" value={`Realm ${character.realm_level}`} sub={realmName} color={realmColor} />
        <StatCard label="Spirit Root"  value={capitalize(character.spirit_root)} color={COLORS.jade} />
      </div>

      {/* Qi bar */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Qi Energy</span>
          <span style={{ fontSize: 13, color: COLORS.gold }}>
            {character.qi_current.toLocaleString()} / {character.qi_max.toLocaleString()}
          </span>
        </div>
        <div style={{ background: COLORS.border, borderRadius: 4, height: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(qiPct, 100)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${COLORS.jade}, ${COLORS.jadeLight})`,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textMuted }}>
          Cultivation Rate: <span style={{ color: COLORS.text }}>{character.cultivation_rate} Qi / hr</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
        Tip: Use /cultivate in Discord to advance your training and accumulate Qi.
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
