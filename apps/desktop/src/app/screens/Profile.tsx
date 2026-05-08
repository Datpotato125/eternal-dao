import { useAuth } from '../store/useAuth';
import { COLORS, REALM_NAMES } from '../constants/theme';

export default function Profile() {
  const { session, character, username } = useAuth();

  if (!character || !session) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontSize: 18, color: COLORS.gold }}>No Profile Found</div>
      </div>
    );
  }

  const discordId  = session.user.user_metadata?.provider_id ?? session.user.id;
  const avatarUrl  = session.user.user_metadata?.avatar_url as string | undefined;
  const realmName  = REALM_NAMES[character.realm_level] ?? 'Unknown';

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3, marginBottom: 32 }}>
        👤 Profile
      </div>

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid ${COLORS.gold}` }}
          />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: COLORS.surface, border: `2px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: COLORS.textMuted }}>
            ☯
          </div>
        )}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>{username}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>Discord ID: {discordId}</div>
        </div>
      </div>

      {/* Character details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Row label="Realm"         value={`${realmName} (Lv. ${character.realm_level})`} />
        <Row label="Spirit Root"   value={capitalize(character.spirit_root)} />
        <Row label="Cultivation Rate" value={`${character.cultivation_rate} Qi / hr`} />
        <Row label="Qi"            value={`${character.qi_current.toLocaleString()} / ${character.qi_max.toLocaleString()}`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <span style={{ fontSize: 13, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
