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
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
            if (data.session) {
              setSession(data.session);
              fetchCharacter();
            }
          });
        }
      } catch {
        console.error('Failed to parse deep-link URL:', url);
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
