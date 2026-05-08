import { View, Text, StyleSheet } from 'react-native';
import { REALM_NAMES, REALM_COLORS, COLORS } from '@/constants/theme';

export default function RealmBadge({ level, size = 'sm' }: { level: number; size?: 'sm' | 'md' }) {
  const name  = REALM_NAMES[level] ?? `Realm ${level}`;
  const color = REALM_COLORS[level] ?? COLORS.textMuted;

  return (
    <View style={[styles.badge, { borderColor: color + '60', backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }, size === 'md' && styles.textMd]}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  text:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  textMd: { fontSize: 13 },
});
