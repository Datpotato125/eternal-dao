import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuth } from './store/useAuth';
import Layout from './components/Layout';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Combat from './screens/Combat';
import WorldMap from './screens/WorldMap';
import Trading from './screens/Trading';
import Sect from './screens/Sect';
import Realms from './screens/Realms';
import Profile from './screens/Profile';

export default function App() {
  const { session, setSession, fetchCharacter } = useAuth();

  useEffect(() => {
    // Restore session from storage on launch
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchCharacter();
    });

    // Keep session in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchCharacter();
    });

    // Handle OAuth deep-link callback: eternal-dao://auth/callback?code=...
    const unsubscribe = window.electronAPI.onDeepLink((url) => {
      console.log('[deep-link] received:', url);
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const error = parsed.searchParams.get('error');
        const errorDesc = parsed.searchParams.get('error_description');

        if (error) {
          console.error('[deep-link] OAuth error:', error, errorDesc);
          alert(`Login failed: ${error}\n${errorDesc ?? ''}`);
          return;
        }

        if (!code) {
          console.error('[deep-link] No code in URL:', url);
          alert(`Login failed: no authorization code in callback URL.\n\n${url}`);
          return;
        }

        supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchErr }) => {
          if (exchErr) {
            console.error('[deep-link] exchangeCodeForSession error:', exchErr);
            alert(`Login failed during token exchange:\n${exchErr.message}`);
            return;
          }
          if (data.session) {
            setSession(data.session);
            fetchCharacter();
          }
        });
      } catch (e) {
        console.error('[deep-link] Failed to parse URL:', url, e);
        alert(`Login failed: could not parse callback URL.\n\n${url}`);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  if (!session) return <Login />;

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/combat"    element={<Combat />} />
          <Route path="/world"     element={<WorldMap />} />
          <Route path="/trading"   element={<Trading />} />
          <Route path="/sect"      element={<Sect />} />
          <Route path="/realms"    element={<Realms />} />
          <Route path="/profile"   element={<Profile />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
