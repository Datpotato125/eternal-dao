import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

export default function QiBar({ current, max }: { current: number; max: number }) {
  const pct    = Math.min(current / max, 1);
  const isFull = current >= max;

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }, isFull && styles.fillFull]} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{current.toLocaleString()} Qi</Text>
        <Text style={[styles.label, isFull && styles.labelFull]}>
          {isFull ? '⚡ Full' : `${max.toLocaleString()} max`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { gap: 4 },
  track:     { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', backgroundColor: COLORS.jade, borderRadius: 4 },
  fillFull:  { backgroundColor: COLORS.gold },
  labels:    { flexDirection: 'row', justifyContent: 'space-between' },
  label:     { fontSize: 12, color: COLORS.textMuted },
  labelFull: { color: COLORS.gold, fontWeight: '700' },
});
