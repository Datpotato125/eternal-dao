import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { COLORS } from '@/constants/theme';

export default function AuthCallback() {
  const params  = useLocalSearchParams<{ code?: string; error?: string }>();
  const { setSession, fetchCharacter } = useAuth();
  const router  = useRouter();

  useEffect(() => {
    const { code, error } = params;

    if (error || !code) {
      router.replace('/login');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
      if (data.session && !exchangeError) {
        setSession(data.session);
        fetchCharacter();
        router.replace('/(tabs)');
      } else {
        console.error('Session exchange failed:', exchangeError);
        router.replace('/login');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORS.gold} size="large" />
    </View>
  );
}
