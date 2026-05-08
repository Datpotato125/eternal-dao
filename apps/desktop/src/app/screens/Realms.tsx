import { COLORS, REALM_NAMES, REALM_COLORS } from '../constants/theme';

const REALM_QI: Record<number, string> = {
  1:  '0',
  2:  '1,000',
  3:  '5,000',
  4:  '20,000',
  5:  '100,000',
  6:  '500,000',
  7:  '2,000,000',
  8:  '10,000,000',
  9:  '50,000,000',
  10: '200,000,000',
};

export default function Realms() {
  return (
    <div style={{ padding: 40, maxWidth: 640 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3, marginBottom: 8 }}>
        🌌 Realm Ladder
      </div>
      <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 32 }}>
        The path from mortal to transcendence.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(REALM_NAMES).map(([lvl, name]) => {
          const level = Number(lvl);
          const color = REALM_COLORS[level];
          return (
            <div key={lvl} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 8,
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 20, textAlign: 'right' }}>{lvl}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{name}</div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                {REALM_QI[level]} Qi
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
