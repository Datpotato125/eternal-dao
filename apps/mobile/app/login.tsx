import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { COLORS } from '@/constants/theme';

export default function LoginScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(tabs)" />;

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'eternal-dao', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      // On Android, openAuthSessionAsync captures the full URL with the code.
      // auth/callback.tsx handles the case where Expo Router gets it instead.
      if (result.type === 'success' && result.url) {
        const url  = new URL(result.url);
        const code = url.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      }
    } catch (e) {
      console.error('Discord login error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.symbol}>☯</Text>
        <Text style={styles.title}>ETERNAL DAO</Text>
        <Text style={styles.subtitle}>The Immortal Path Awaits</Text>
      </View>

      <View style={styles.realmPreview}>
        {['Mortal Refinement', 'Qi Condensation', 'Foundation Establishment', '···'].map((r, i) => (
          <Text key={i} style={[styles.realmItem, i === 3 && styles.realmFade]}>{r}</Text>
        ))}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.tagline}>
          Cultivate Qi. Break through realms.{'\n'}Forge your sect. Defy mortality.
        </Text>

        <TouchableOpacity
          style={[styles.discordBtn, loading && styles.btnDisabled]}
          onPress={handleDiscordLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.discordBtnText}>Login with Discord</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>Free forever. No download. Runs in Discord.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 60 },
  hero:         { alignItems: 'center', gap: 12 },
  symbol:       { fontSize: 56, marginBottom: 4 },
  title:        { fontSize: 32, fontWeight: '900', color: COLORS.gold, letterSpacing: 8 },
  subtitle:     { fontSize: 14, color: COLORS.textMuted, letterSpacing: 3 },
  realmPreview: { gap: 6, alignItems: 'center' },
  realmItem:    { fontSize: 14, color: COLORS.textMuted, letterSpacing: 1 },
  realmFade:    { color: COLORS.border },
  bottom:       { gap: 16, alignItems: 'center' },
  tagline:      { textAlign: 'center', color: COLORS.text, fontSize: 15, lineHeight: 24 },
  discordBtn:   { backgroundColor: '#5865F2', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 8, width: '100%', alignItems: 'center' },
  btnDisabled:  { opacity: 0.6 },
  discordBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  note:         { color: COLORS.textMuted, fontSize: 12 },
});
