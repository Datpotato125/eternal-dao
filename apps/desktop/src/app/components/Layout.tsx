import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import { COLORS } from '../constants/theme';

const NAV = [
  { path: '/dashboard', label: '⚡ Dashboard' },
  { path: '/combat',    label: '⚔️  Combat'   },
  { path: '/world',     label: '🌌 World Map' },
  { path: '/trading',   label: '🏪 Trading'   },
  { path: '/sect',      label: '🏯 Sect'      },
  { path: '/realms',    label: '📜 Realms'    },
  { path: '/profile',   label: '👤 Profile'   },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { username, signOut } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, color: COLORS.text }}>
      {/* Sidebar */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>☯ ETERNAL DAO</div>
          {username && (
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {NAV.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 20px',
                color: isActive ? COLORS.gold : COLORS.textMuted,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? `${COLORS.border}80` : 'transparent',
                borderLeft: `2px solid ${isActive ? COLORS.gold : 'transparent'}`,
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${COLORS.border}` }}>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              background: 'none',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
