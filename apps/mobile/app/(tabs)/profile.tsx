import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/store/useAuth';
import RealmBadge from '@/components/RealmBadge';
import { COLORS } from '@/constants/theme';

const ROOT_LABELS: Record<string, { label: string; color: string }> = {
  mortal: { label: 'Mortal Root',   color: COLORS.textMuted },
  wood:   { label: 'Wood Root',     color: '#4a8c62' },
  fire:   { label: 'Fire Root',     color: '#c05030' },
  water:  { label: 'Water Root',    color: '#3060c0' },
  metal:  { label: 'Metal Root',    color: '#c0c0c0' },
  earth:  { label: 'Earth Root',    color: '#8c6030' },
  dual:   { label: 'Dual Root',     color: '#6040a0' },
  chaos:  { label: 'Chaos Root ✦', color: COLORS.gold },
};

export default function ProfileScreen() {
  const { username, avatarUrl, character, discordId, signOut } = useAuth();

  const root = character ? (ROOT_LABELS[character.spirit_root] ?? { label: character.spirit_root, color: COLORS.textMuted }) : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.header}>👤 Profile</Text>

      {/* Avatar + Name */}
      <View style={styles.profileCard}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{username?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{username ?? 'Unknown'}</Text>
          <Text style={styles.discordId}>Discord ID: {discordId}</Text>
        </View>
      </View>

      {character ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Character</Text>
            <View style={styles.statGrid}>
              <StatItem label="Realm"  value={<RealmBadge level={character.realm_level} size="md" />} />
              <StatItem label="Spirit Root" value={
                <Text style={{ color: root?.color ?? COLORS.text, fontWeight: '700' }}>{root?.label}</Text>
              } />
              <StatItem label="PvP Wins"   value={<Text style={{ color: COLORS.jade,  fontWeight: '700', fontSize: 15 }}>{character.pvp_wins ?? 0}</Text>} />
              <StatItem label="PvP Losses" value={<Text style={{ color: COLORS.redLight, fontWeight: '700', fontSize: 15 }}>{character.pvp_losses ?? 0}</Text>} />
              <StatItem label="Breakthroughs" value={<Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>{character.breakthrough_attempts ?? 0}</Text>} />
              <StatItem label="Cultivation" value={<Text style={{ color: COLORS.jade, fontWeight: '700', fontSize: 15 }}>{character.cultivation_rate} Qi/hr</Text>} />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noChar}>
          <Text style={styles.noCharText}>
            No character found.{'\n'}Use /register in a Discord server to begin.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValue}>{value}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:           { flex: 1, backgroundColor: COLORS.bg },
  container:        { padding: 20, gap: 16, paddingTop: 60, paddingBottom: 40 },
  header:           { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  profileCard:      { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar:           { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.gold },
  avatarPlaceholder:{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.gold },
  avatarInitial:    { fontSize: 24, fontWeight: '900', color: COLORS.gold },
  profileInfo:      { gap: 4 },
  username:         { fontSize: 20, fontWeight: '700', color: COLORS.text },
  discordId:        { fontSize: 11, color: COLORS.textMuted },
  card:             { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, gap: 14 },
  cardTitle:        { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  statGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat:             { width: '46%', gap: 4 },
  statLabel:        { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue:        {},
  noChar:           { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 24, alignItems: 'center' },
  noCharText:       { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  signOutBtn:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  signOutText:      { color: COLORS.textMuted, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});
