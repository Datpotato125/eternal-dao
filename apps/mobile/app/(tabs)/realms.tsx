import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { COLORS, REALM_NAMES, REALM_COLORS } from '@/constants/theme';

const REALMS = [
  { level: 1,  minQi: 0,           desc: 'The body is tempered. The first threads of Qi are gathered.' },
  { level: 2,  minQi: 1_000,       desc: 'Qi coils in the dantian like a sleeping dragon, dense and vast.' },
  { level: 3,  minQi: 5_000,       desc: 'A foundation is laid in the sea of Qi. The immortal path begins.' },
  { level: 4,  minQi: 20_000,      desc: 'A golden core crystallizes. Power flows freely.' },
  { level: 5,  minQi: 100_000,     desc: 'The nascent soul separates. Mortality begins to fall away.' },
  { level: 6,  minQi: 500_000,     desc: 'The soul transforms. Heaven acknowledges your existence.' },
  { level: 7,  minQi: 2_000_000,   desc: 'The laws of the void bend to your will.' },
  { level: 8,  minQi: 10_000_000,  desc: 'Body, soul, and Dao unite into one.' },
  { level: 9,  minQi: 50_000_000,  desc: 'One step from eternal transcendence.' },
  { level: 10, minQi: 200_000_000, desc: 'The tribulation is endured. Immortality is seized.' },
];

export default function RealmsScreen() {
  const { character } = useAuth();
  const currentLevel  = character?.realm_level ?? 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.header}>🌏 The Ten Realms</Text>
      <Text style={styles.sub}>Every cultivator walks this path.</Text>

      {REALMS.map((realm, i) => {
        const isActive = realm.level === currentLevel;
        const isPast   = realm.level < currentLevel;
        const color    = REALM_COLORS[realm.level];

        return (
          <View key={realm.level}>
            <View style={[
              styles.card,
              isActive && { borderColor: color, backgroundColor: color + '15' },
              isPast   && styles.cardPast,
            ]}>
              <View style={styles.row}>
                <View style={styles.levelBadge}>
                  <Text style={[styles.levelNum, { color: isPast ? COLORS.textMuted : color }]}>
                    {realm.level}
                  </Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, isActive && { color }]}>
                      {REALM_NAMES[realm.level]}
                    </Text>
                    {isActive && <Text style={[styles.youBadge, { backgroundColor: color + '30', color }]}>YOU</Text>}
                    {isPast   && <Text style={styles.doneBadge}>✓</Text>}
                  </View>
                  <Text style={styles.desc}>{realm.desc}</Text>
                  <Text style={styles.qi}>
                    {realm.minQi === 0 ? 'Starting realm' : `${realm.minQi.toLocaleString()} Qi required`}
                  </Text>
                </View>
              </View>
            </View>
            {i < REALMS.length - 1 && (
              <Text style={[styles.arrow, isPast && { color: COLORS.jade }]}>↓</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: COLORS.bg },
  container:  { padding: 20, gap: 0, paddingTop: 60 },
  header:     { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 3, marginBottom: 4 },
  sub:        { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  card:       { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14 },
  cardPast:   { opacity: 0.5 },
  row:        { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  levelBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  levelNum:   { fontSize: 16, fontWeight: '900' },
  info:       { flex: 1, gap: 4 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  youBadge:   { fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, letterSpacing: 1 },
  doneBadge:  { fontSize: 12, color: COLORS.jade },
  desc:       { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  qi:         { fontSize: 11, color: COLORS.jade },
  arrow:      { textAlign: 'center', color: COLORS.border, fontSize: 16, marginVertical: 2 },
});
