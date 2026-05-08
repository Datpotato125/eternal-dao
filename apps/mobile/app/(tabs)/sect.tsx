import { View, Text, ScrollView, StyleSheet, RefreshControl, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
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
interface Message {
  id: string;
  character_id: string;
  username: string;
  content: string;
  created_at: string;
}

export default function SectScreen() {
  const { character, username } = useAuth();
  const [sect,        setSect]        = useState<SectData | null>(null);
  const [members,     setMembers]     = useState<Member[]>([]);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [draft,       setDraft]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tab,         setTab]         = useState<'roster' | 'chat'>('roster');
  const flatRef = useRef<FlatList>(null);

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

  const loadMessages = useCallback(async (sectId: string) => {
    const { data } = await supabase
      .from('sect_messages')
      .select('id, character_id, username, content, created_at')
      .eq('sect_id', sectId)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages((data as Message[]) ?? []);
  }, []);

  useEffect(() => { loadSect(); }, [loadSect]);

  // Load messages and subscribe to Realtime when sect loads
  useEffect(() => {
    if (!sect) return;

    loadMessages(sect.id);

    const channel = supabase
      .channel(`sect_chat:${sect.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sect_messages', filter: `sect_id=eq.${sect.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          // scroll to bottom on new message
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sect?.id]);

  // Auto-scroll when switching to chat tab
  useEffect(() => {
    if (tab === 'chat') {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSect();
    if (sect) await loadMessages(sect.id);
    setRefreshing(false);
  }, [loadSect, sect]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !sect || !character || sending) return;
    setSending(true);
    setDraft('');
    const { error } = await supabase.from('sect_messages').insert({
      sect_id:      sect.id,
      character_id: character.id,
      username:     username ?? 'Unknown',
      content:      text,
    });
    if (error) {
      console.error('send message error:', error.message);
      setDraft(text); // restore draft on failure
    }
    setSending(false);
  };

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.header}>🏯 {sect.name}</Text>
          {sect.description && <Text style={styles.desc} numberOfLines={1}>&ldquo;{sect.description}&rdquo;</Text>}
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'roster' && styles.tabBtnActive]}
            onPress={() => setTab('roster')}
          >
            <Text style={[styles.tabLabel, tab === 'roster' && styles.tabLabelActive]}>Roster</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'chat' && styles.tabBtnActive]}
            onPress={() => setTab('chat')}
          >
            <Text style={[styles.tabLabel, tab === 'chat' && styles.tabLabelActive]}>Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Roster */}
        {tab === 'roster' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.rosterContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          >
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{sect.member_count}</Text>
                <Text style={styles.statLbl}>Members</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Members</Text>
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
        )}

        {/* Chat */}
        {tab === 'chat' && (
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.chatContent}
              ListEmptyComponent={
                <Text style={styles.chatEmpty}>No messages yet. Say something!</Text>
              }
              renderItem={({ item }) => {
                const isMe = item.character_id === character.id;
                return (
                  <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                    {!isMe && <Text style={styles.msgAuthor}>{item.username}</Text>}
                    <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {item.content}
                      </Text>
                    </View>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message your sect…"
                placeholderTextColor={COLORS.textMuted}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                editable={!sending}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!draft.trim() || sending}
              >
                <Text style={styles.sendBtnText}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: COLORS.bg },
  scroll:         { flex: 1, backgroundColor: COLORS.bg },
  container:      { padding: 20, gap: 14, paddingTop: 60 },
  topBar:         { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8, gap: 2 },
  header:         { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  desc:           { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  centered:       { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.gold, textAlign: 'center' },
  emptyBody:      { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  noSect:         { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  noSectIcon:     { fontSize: 48 },
  noSectTitle:    { fontSize: 20, fontWeight: '700', color: COLORS.textMuted },
  noSectBody:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },

  tabs:           { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  tabBtn:         { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:   { backgroundColor: COLORS.surface },
  tabLabel:       { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabLabelActive: { color: COLORS.gold },

  rosterContent:  { padding: 20, gap: 12 },
  statsRow:       { flexDirection: 'row', gap: 12 },
  statBox:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, alignItems: 'center', flex: 1 },
  statNum:        { fontSize: 24, fontWeight: '900', color: COLORS.gold },
  statLbl:        { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  sectionTitle:   { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' },
  memberRow:      { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo:     { gap: 2 },
  memberName:     { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  memberRole:     { fontSize: 12, color: COLORS.textMuted },

  chatContainer:  { flex: 1 },
  chatContent:    { padding: 16, gap: 12, flexGrow: 1, justifyContent: 'flex-end' },
  chatEmpty:      { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 40 },
  msgRow:         { gap: 2, maxWidth: '80%', alignSelf: 'flex-start' },
  msgRowMe:       { alignSelf: 'flex-end' },
  msgAuthor:      { fontSize: 11, color: COLORS.textMuted, marginLeft: 4, marginBottom: 2 },
  bubble:         { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe:       { backgroundColor: COLORS.jade + '25', borderColor: COLORS.jade + '50', borderBottomLeftRadius: 14, borderBottomRightRadius: 4 },
  bubbleText:     { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextMe:   { color: COLORS.text },
  msgTime:        { fontSize: 10, color: COLORS.textMuted, marginLeft: 4 },
  msgTimeMe:      { textAlign: 'right', marginRight: 4 },

  inputRow:       { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: Platform.OS === 'ios' ? 4 : 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  input:          { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 14 },
  sendBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.jade, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ opacity: 0.4 },
  sendBtnText:    { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
});
