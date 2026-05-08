import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import RealmBadge from '@/components/RealmBadge';
import { COLORS } from '@/constants/theme';

interface FightRow {
  id: string;
  created_at: string;
  winner_id: string;
  seed: number;
  attacker: { id: string; player_id: string; realm_level: number; players: { username: string } | null } | null;
  defender: { id: string; player_id: string; realm_level: number; players: { username: string } | null } | null;
}

export default function CombatScreen() {
  const { character, discordId } = useAuth();
  const [fights,     setFights]     = useState<FightRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFights = useCallback(async () => {
    if (!character) return;
    const { data } = await supabase
      .from('combat_log')
      .select(`
        id, created_at, winner_id, seed,
        attacker:attacker_id(id, player_id, realm_level, players!player_id(username)),
        defender:defender_id(id, player_id, realm_level, players!player_id(username))
      `)
      .or(`attacker_id.eq.${character.id},defender_id.eq.${character.id}`)
      .order('created_at', { ascending: false })
      .limit(20);
    setFights((data as unknown as FightRow[]) ?? []);
  }, [character]);

  useEffect(() => { loadFights(); }, [loadFights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFights();
    setRefreshing(false);
  }, [loadFights]);

  if (!character) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No character found</Text>
        <Text style={styles.emptyBody}>Register with /register in Discord first.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      <Text style={styles.header}>⚔️ Combat Log</Text>
      <Text style={styles.sub}>Your last 20 duels</Text>

      {fights.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>No fights yet. Challenge someone with /fight in Discord.</Text>
        </View>
      ) : (
        fights.map((fight) => {
          const myChar   = fight.attacker?.id === character.id ? fight.attacker : fight.defender;
          const opponent = fight.attacker?.id === character.id ? fight.defender : fight.attacker;
          const won      = fight.winner_id === character.id;

          return (
            <View key={fight.id} style={[styles.card, won ? styles.cardWin : styles.cardLoss]}>
              <View style={styles.row}>
                <Text style={[styles.result, won ? styles.resultWin : styles.resultLoss]}>
                  {won ? '⚔️  Victory' : '💔  Defeat'}
                </Text>
                <Text style={styles.date}>
                  {new Date(fight.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.row}>
                <View style={styles.fighter}>
                  <Text style={styles.fighterLabel}>You</Text>
                  {myChar && <RealmBadge level={myChar.realm_level} />}
                </View>
                <Text style={styles.vs}>vs</Text>
                <View style={[styles.fighter, styles.fighterRight]}>
                  <Text style={styles.fighterLabel}>{opponent?.players?.username ?? 'Unknown'}</Text>
                  {opponent && <RealmBadge level={opponent.realm_level} />}
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:      { flex: 1, backgroundColor: COLORS.bg },
  container:   { padding: 20, gap: 12, paddingTop: 60 },
  header:      { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  sub:         { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  centered:    { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.gold, textAlign: 'center' },
  emptyBody:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  empty:       { padding: 32, alignItems: 'center' },
  card:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, gap: 10 },
  cardWin:     { borderColor: COLORS.jade + '60' },
  cardLoss:    { borderColor: COLORS.red + '60' },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  result:      { fontSize: 15, fontWeight: '700' },
  resultWin:   { color: COLORS.jade },
  resultLoss:  { color: COLORS.redLight },
  date:        { fontSize: 12, color: COLORS.textMuted },
  fighter:     { gap: 4 },
  fighterRight:{ alignItems: 'flex-end' },
  fighterLabel:{ fontSize: 13, color: COLORS.text },
  vs:          { fontSize: 13, color: COLORS.textMuted },
});
