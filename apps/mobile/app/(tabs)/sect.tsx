import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import RealmBadge from '@/components/RealmBadge';
import { COLORS } from '@/constants/theme';

const ROLE_ORDER = ['sect_master', 'ancestor', 'elder', 'disciple'];
const ROLE_LABELS: Record<string, string> = {
  sect_master: '⚜️ Sect Master',
  ancestor:    '👑 Ancestor',
  elder:       '🔮 Elder',
  disciple:    '🎋 Disciple',
};

interface SectData {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
}
interface Member {
  role: string;
  character: { id: string; realm_level: number; players: { username: string } | null } | null;
}

export default function SectScreen() {
  const { character } = useAuth();
  const [sect,       setSect]       = useState<SectData | null>(null);
  const [members,    setMembers]    = useState<Member[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSect = useCallback(async () => {
    if (!character) return;

    const { data: membership } = await supabase
      .from('sect_members')
      .select('sect_id')
      .eq('character_id', character.id)
      .maybeSingle();

    if (!membership) { setSect(null); return; }

    const [{ data: sectData }, { data: memberData }] = await Promise.all([
      supabase.from('sects').select('id, name, description, member_count').eq('id', membership.sect_id).maybeSingle(),
      supabase.from('sect_members')
        .select('role, character:character_id(id, realm_level, players!player_id(username))')
        .eq('sect_id', membership.sect_id),
    ]);

    setSect(sectData ?? null);
    const sorted = ((memberData ?? []) as Member[]).sort(
      (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    );
    setMembers(sorted);
  }, [character]);

  useEffect(() => { loadSect(); }, [loadSect]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSect();
    setRefreshing(false);
  }, [loadSect]);

  if (!character) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No character found</Text>
        <Text style={styles.emptyBody}>Register with /register in Discord first.</Text>
      </View>
    );
  }

  if (!sect) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        <Text style={styles.header}>🏯 Sect</Text>
        <View style={styles.noSect}>
          <Text style={styles.noSectIcon}>🏯</Text>
          <Text style={styles.noSectTitle}>No Sect</Text>
          <Text style={styles.noSectBody}>
            You walk the path alone.{'\n\n'}
            Use /sect create in Discord to found a sect,{'\n'}
            or /sect join to join an existing one.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      <Text style={styles.header}>🏯 {sect.name}</Text>
      {sect.description && <Text style={styles.desc}>&ldquo;{sect.description}&rdquo;</Text>}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{sect.member_count}</Text>
          <Text style={styles.statLbl}>Members</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Roster</Text>
      {members.map((m, i) => (
        <View key={i} style={styles.memberRow}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{m.character?.players?.username ?? 'Unknown'}</Text>
            <Text style={styles.memberRole}>{ROLE_LABELS[m.role] ?? m.role}</Text>
          </View>
          {m.character && <RealmBadge level={m.character.realm_level} />}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: COLORS.bg },
  container:    { padding: 20, gap: 14, paddingTop: 60 },
  header:       { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  desc:         { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 22 },
  centered:     { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.gold, textAlign: 'center' },
  emptyBody:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  noSect:       { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  noSectIcon:   { fontSize: 48 },
  noSectTitle:  { fontSize: 20, fontWeight: '700', color: COLORS.textMuted },
  noSectBody:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },
  statsRow:     { flexDirection: 'row', gap: 12 },
  statBox:      { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, alignItems: 'center', flex: 1 },
  statNum:      { fontSize: 24, fontWeight: '900', color: COLORS.gold },
  statLbl:      { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' },
  memberRow:    { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo:   { gap: 2 },
  memberName:   { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  memberRole:   { fontSize: 12, color: COLORS.textMuted },
});
