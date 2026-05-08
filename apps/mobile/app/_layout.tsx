import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';

WebBrowser.maybeCompleteAuthSession();
SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const { setSession, fetchCharacter } = useAuth();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchCharacter();
      })
      .catch((err) => {
        console.error('getSession error:', err);
        setSession(null);
      })
      .finally(() => SplashScreen.hideAsync());

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchCharacter();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login"  options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}
