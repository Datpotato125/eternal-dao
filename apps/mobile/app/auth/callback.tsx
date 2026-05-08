import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { COLORS } from '@/constants/theme';

export default function AuthCallback() {
  const params  = useLocalSearchParams<{ code?: string; error?: string }>();
  const { session, setSession, fetchCharacter } = useAuth();
  const router  = useRouter();

  useEffect(() => {
    // Already authenticated (e.g. openAuthSessionAsync exchanged the code first)
    if (session) {
      router.replace('/(tabs)');
      return;
    }

    const { code, error } = params;

    if (error || !code) {
      // No code in URL — wait briefly in case onAuthStateChange fires from
      // a concurrent exchange in login.tsx, then fall back to login
      const timeout = setTimeout(() => router.replace('/login'), 3000);
      return () => clearTimeout(timeout);
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
      if (data.session && !exchangeError) {
        setSession(data.session);
        fetchCharacter();
        router.replace('/(tabs)');
      } else {
        console.error('Auth exchange failed:', exchangeError?.message);
        router.replace('/login');
      }
    });
  }, [session]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORS.gold} size="large" />
    </View>
  );
}
