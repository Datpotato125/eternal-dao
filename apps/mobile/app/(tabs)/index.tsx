import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import QiBar from '@/components/QiBar';
import RealmBadge from '@/components/RealmBadge';
import { COLORS } from '@/constants/theme';

const OFFLINE_CAP_HOURS = 8;

function calcOfflineQi(rate: number, startedAt: string): number {
  const elapsed = Math.min(Date.now() - new Date(startedAt).getTime(), OFFLINE_CAP_HOURS * 3_600_000);
  return Math.floor(rate * (elapsed / 3_600_000));
}

const ROOT_LABELS: Record<string, string> = {
  mortal: 'Mortal',   wood:  'Wood',  fire: 'Fire',
  water:  'Water',    metal: 'Metal', earth: 'Earth',
  dual:   'Dual',     chaos: 'Chaos ✦',
};

export default function DashboardScreen() {
  const { character, fetchCharacter } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCharacter();
    setRefreshing(false);
  }, [fetchCharacter]);

  const toggleCultivation = async () => {
    if (!character) return;
    setToggling(true);
    const now = Date.now();

    if (character.cultivation_started_at) {
      const gained = calcOfflineQi(character.cultivation_rate, character.cultivation_started_at);
      const newQi  = Math.min(Number(character.qi_current) + gained, Number(character.qi_max));
      await supabase.from('characters').update({
        qi_current: newQi,
        cultivation_started_at: null,
        last_seen: new Date(now).toISOString(),
      }).eq('id', character.id);
    } else {
      await supabase.from('characters').update({
        cultivation_started_at: new Date(now).toISOString(),
        last_seen: new Date(now).toISOString(),
      }).eq('id', character.id);
    }

    await fetchCharacter();
    setToggling(false);
  };

  if (!character) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No character found</Text>
        <Text style={styles.emptyBody}>
          Use /register in a Discord server to create your cultivator, then pull down to refresh.
        </Text>
      </View>
    );
  }

  const isCultivating = !!character.cultivation_started_at;
  const pendingQi     = isCultivating ? calcOfflineQi(character.cultivation_rate, character.cultivation_started_at!) : 0;
  const displayQi     = Math.min(Number(character.qi_current) + pendingQi, Number(character.qi_max));
  const isFull        = displayQi >= Number(character.qi_max);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      <Text style={styles.header}>☯ ETERNAL DAO</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <RealmBadge level={character.realm_level} size="md" />
          <Text style={styles.root}>{ROOT_LABELS[character.spirit_root] ?? character.spirit_root} Root</Text>
        </View>
        <QiBar current={displayQi} max={Number(character.qi_max)} />
        {isFull && (
          <Text style={styles.fullNotice}>⚡ Qi full — use /breakthrough in Discord to ascend</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.cultivateBtn, isCultivating && styles.cultivateBtnActive]}
        onPress={toggleCultivation}
        disabled={toggling}
      >
        {toggling ? (
          <ActivityIndicator color={isCultivating ? COLORS.surface : COLORS.jade} />
        ) : (
          <>
            <Text style={styles.cultivateBtnIcon}>{isCultivating ? '🔴' : '🧘'}</Text>
            <Text style={[styles.cultivateBtnText, isCultivating && styles.cultivateBtnTextActive]}>
              {isCultivating ? 'End Meditation' : 'Begin Meditation'}
            </Text>
            {isCultivating && (
              <Text style={styles.cultivateRate}>+{pendingQi.toLocaleString()} Qi pending</Text>
            )}
          </>
        )}
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stats</Text>
        <View style={styles.statGrid}>
          <Stat label="Rate"          value={`${character.cultivation_rate} Qi/hr`} />
          <Stat label="PvP Record"    value={`${character.pvp_wins ?? 0}W – ${character.pvp_losses ?? 0}L`} />
          <Stat label="Breakthroughs" value={String(character.breakthrough_attempts ?? 0)} />
          <Stat label="Status"        value={isCultivating ? '🟢 Meditating' : '⚫ Idle'} />
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: COLORS.bg },
  container:  { padding: 20, gap: 16, paddingTop: 60 },
  header:     { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 6, textAlign: 'center', marginBottom: 4 },
  centered:   { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gold, textAlign: 'center' },
  emptyBody:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  card:       { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, gap: 12 },
  cardTitle:  { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  root:       { fontSize: 13, color: COLORS.textMuted },
  fullNotice: { fontSize: 12, color: COLORS.gold, textAlign: 'center', borderWidth: 1, borderColor: COLORS.gold + '40', borderRadius: 6, padding: 8 },
  cultivateBtn:           { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.jade, borderRadius: 12, padding: 18, alignItems: 'center', gap: 4 },
  cultivateBtnActive:     { borderColor: COLORS.border },
  cultivateBtnIcon:       { fontSize: 28 },
  cultivateBtnText:       { fontSize: 16, fontWeight: '700', color: COLORS.jade, letterSpacing: 1 },
  cultivateBtnTextActive: { color: COLORS.textMuted },
  cultivateRate:          { fontSize: 12, color: COLORS.jadeLight },
  statGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat:      { width: '46%' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginTop: 2 },
});
