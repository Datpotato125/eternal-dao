import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { COLORS } from '@/constants/theme';

// Signal to openAuthSessionAsync in login.tsx that the redirect landed here.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const params  = useLocalSearchParams<{ code?: string; error?: string }>();
  const { session, setSession, fetchCharacter } = useAuth();
  const router  = useRouter();

  // Redirect to tabs as soon as session is available (set by either this
  // component or by login.tsx's concurrent exchange via openAuthSessionAsync)
  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  // Exchange code if Expo Router received it in the deep-link params
  useEffect(() => {
    const { code, error } = params;
    if (!code || error || session) return;

    supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
      if (data.session && !exchangeError) {
        setSession(data.session);
        fetchCharacter();
      }
    });
  }, []);

  // Safety net: if no session after 6 s, something went wrong → back to login
  useEffect(() => {
    const t = setTimeout(() => {
      if (!useAuth.getState().session) router.replace('/login');
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={COLORS.gold} size="large" />
    </View>
  );
}
