import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS, REALM_NAMES } from '../constants/theme';

const REDIRECT_URI = 'eternal-dao://auth/callback';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: REDIRECT_URI, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data.url) {
        await window.electronAPI.openExternal(data.url);
        // Reset after 3 min — if deep-link never arrives the button stays frozen otherwise
        setTimeout(() => setLoading(false), 3 * 60 * 1000);
      }
    } catch (e) {
      console.error('Discord login error:', e);
      alert(`Failed to start Discord login:\n${(e as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100vh',
      background: COLORS.bg,
      padding: '60px 40px',
    }}>
      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 64 }}>☯</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.gold, letterSpacing: 8 }}>ETERNAL DAO</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, letterSpacing: 3 }}>The Immortal Path Awaits</div>
      </div>

      {/* Realm preview */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {[1, 2, 3, 4].map((lvl) => (
          <div key={lvl} style={{ fontSize: 13, color: lvl < 4 ? COLORS.textMuted : COLORS.border, letterSpacing: 1 }}>
            {lvl < 4 ? REALM_NAMES[lvl] : '···'}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', color: COLORS.text, fontSize: 15, lineHeight: 1.7 }}>
          Cultivate Qi. Break through realms.{'\n'}Forge your sect. Defy mortality.
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            background: '#5865F2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            letterSpacing: 1,
          }}
        >
          {loading ? 'Opening browser…' : 'Login with Discord'}
        </button>

        <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.7 }}>
          Your browser will open for Discord auth.{'\n'}
          After approving, you'll be returned here automatically.
        </div>
      </div>
    </div>
  );
}
