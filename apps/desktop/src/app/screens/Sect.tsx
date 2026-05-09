import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';
import { COLORS, REALM_NAMES } from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectRow {
  id: string;
  name: string;
  server_id: string;
  description: string | null;
  member_count: number;
  leader_id: string | null;
  created_at: string;
}

interface SectMember {
  character_id: string;
  username: string;
  realm_level: number;
  spirit_root: string;
  role: 'sect_master' | 'elder' | 'disciple';
  joined_at: string;
}

interface BrowseRow {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  leader_name: string | null;
}

type View = 'loading' | 'in_sect' | 'no_sect' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_ORDER: Record<string, number> = { sect_master: 0, elder: 1, disciple: 2 };

function roleColor(r: string) {
  if (r === 'sect_master') return COLORS.gold;
  if (r === 'elder')       return COLORS.jade;
  return COLORS.textMuted;
}

function roleLabel(r: string) {
  if (r === 'sect_master') return 'Sect Master';
  if (r === 'elder')       return 'Elder';
  return 'Disciple';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: '18px 20px', ...style,
    }}>
      {children}
    </div>
  );
}

function Btn({
  onClick, disabled, children, variant = 'default',
}: {
  onClick: () => void; disabled?: boolean;
  children: React.ReactNode; variant?: 'default' | 'danger' | 'gold';
}) {
  const bg =
    variant === 'danger' ? COLORS.red :
    variant === 'gold'   ? COLORS.gold : 'transparent';
  const fg =
    variant === 'danger' ? '#fff' :
    variant === 'gold'   ? COLORS.bg : COLORS.textMuted;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg, color: fg,
        border: `1px solid ${variant === 'default' ? COLORS.border : bg}`,
        borderRadius: 6, padding: '6px 14px',
        fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function Sect() {
  const { character } = useAuth();

  const [view,    setView]    = useState<View>('loading');
  const [sect,    setSect]    = useState<SectRow | null>(null);
  const [members, setMembers] = useState<SectMember[]>([]);
  const [myRole,  setMyRole]  = useState<SectMember['role']>('disciple');
  const [browse,  setBrowse]  = useState<BrowseRow[]>([]);
  const [busy,    setBusy]    = useState(false);
  const [errMsg,  setErrMsg]  = useState('');

  // Create form
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');

  // Edit description
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescVal, setEditDescVal] = useState('');

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!character) return;
    setView('loading');
    setErrMsg('');

    try {
      const { data: membership } = await supabase
        .from('sect_members')
        .select('sect_id, role')
        .eq('character_id', character.id)
        .maybeSingle();

      if (membership) {
        const [{ data: sectData }, { data: rawMembers }] = await Promise.all([
          supabase.from('sects').select('*').eq('id', membership.sect_id).single(),
          supabase
            .from('sect_members')
            .select(`
              role, joined_at, character_id,
              characters!character_id(realm_level, spirit_root, players!player_id(username))
            `)
            .eq('sect_id', membership.sect_id),
        ]);

        const mems: SectMember[] = ((rawMembers ?? []) as any[]).map(m => ({
          character_id: m.character_id,
          role:         m.role,
          joined_at:    m.joined_at,
          realm_level:  m.characters?.realm_level ?? 1,
          spirit_root:  m.characters?.spirit_root ?? 'mortal',
          username:     m.characters?.players?.username ?? 'Unknown',
        }));
        mems.sort((a, b) => {
          const d = (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2);
          return d !== 0 ? d : new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        });

        setSect(sectData as SectRow);
        setMembers(mems);
        setMyRole(membership.role as SectMember['role']);
        setView('in_sect');

      } else {
        const { data: browseData } = await supabase
          .from('sects')
          .select(`
            id, name, description, member_count,
            characters!leader_id(players!player_id(username))
          `)
          .eq('server_id', character.server_id)
          .order('member_count', { ascending: false });

        setBrowse(((browseData ?? []) as any[]).map(s => ({
          id:           s.id,
          name:         s.name,
          description:  s.description,
          member_count: s.member_count,
          leader_name:  s.characters?.players?.username ?? null,
        })));
        setView('no_sect');
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setView('error');
    }
  }, [character?.id, character?.server_id]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function createSect() {
    if (!character || !cName.trim()) return;
    setBusy(true); setErrMsg('');
    try {
      const { data: newSect, error: e1 } = await supabase
        .from('sects')
        .insert({ server_id: character.server_id, name: cName.trim(),
                  description: cDesc.trim() || null, leader_id: character.id, member_count: 1 })
        .select().single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('sect_members')
        .insert({ sect_id: newSect.id, character_id: character.id, role: 'sect_master' });
      if (e2) throw e2;
      setCName(''); setCDesc('');
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function joinSect(sectId: string, count: number) {
    if (!character) return;
    setBusy(true); setErrMsg('');
    try {
      const { error } = await supabase.from('sect_members')
        .insert({ sect_id: sectId, character_id: character.id, role: 'disciple' });
      if (error) throw error;
      await supabase.from('sects').update({ member_count: count + 1 }).eq('id', sectId);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function leaveSect() {
    if (!character || !sect) return;
    setBusy(true); setErrMsg('');
    try {
      await supabase.from('sect_members').delete()
        .eq('sect_id', sect.id).eq('character_id', character.id);
      await supabase.from('sects')
        .update({ member_count: Math.max(0, sect.member_count - 1) }).eq('id', sect.id);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function disbandSect() {
    if (!sect || !window.confirm(`Disband "${sect.name}"? This cannot be undone.`)) return;
    setBusy(true); setErrMsg('');
    try {
      await supabase.from('sect_members').delete().eq('sect_id', sect.id);
      await supabase.from('sects').delete().eq('id', sect.id);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function saveDesc() {
    if (!sect) return;
    setBusy(true);
    try {
      await supabase.from('sects').update({ description: editDescVal.trim() || null }).eq('id', sect.id);
      setEditingDesc(false);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function setRole(memberId: string, role: 'elder' | 'disciple') {
    if (!sect) return;
    setBusy(true);
    try {
      await supabase.from('sect_members').update({ role })
        .eq('sect_id', sect.id).eq('character_id', memberId);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function kickMember(memberId: string) {
    if (!sect) return;
    setBusy(true);
    try {
      await supabase.from('sect_members').delete()
        .eq('sect_id', sect.id).eq('character_id', memberId);
      await supabase.from('sects')
        .update({ member_count: Math.max(0, sect.member_count - 1) }).eq('id', sect.id);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>🏯 Sect</div>
      </div>

      {errMsg && (
        <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 16 }}>{errMsg}</div>
      )}

      {/* ── Loading ── */}
      {view === 'loading' && (
        <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading…</div>
      )}

      {/* ── In Sect ── */}
      {view === 'in_sect' && sect && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Sect header */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.gold, marginBottom: 6 }}>
                  {sect.name}
                </div>

                {editingDesc ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <textarea
                      value={editDescVal}
                      onChange={e => setEditDescVal(e.target.value)}
                      maxLength={200}
                      rows={2}
                      style={{
                        flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                        color: COLORS.text, borderRadius: 6, padding: '6px 10px', fontSize: 12, resize: 'vertical',
                      }}
                    />
                    <Btn onClick={saveDesc} disabled={busy} variant="gold">Save</Btn>
                    <Btn onClick={() => setEditingDesc(false)} disabled={busy}>Cancel</Btn>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8, minHeight: 20 }}>
                    {sect.description ?? <em style={{ opacity: 0.5 }}>No description.</em>}
                  </div>
                )}

                <div style={{ fontSize: 11, color: COLORS.border }}>
                  {sect.member_count} member{sect.member_count !== 1 ? 's' : ''}
                  {' · '}Founded {fmtDate(sect.created_at)}
                  {' · '}
                  <span style={{ color: roleColor(myRole), fontWeight: 700 }}>{roleLabel(myRole)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                {myRole === 'sect_master' && !editingDesc && (
                  <Btn onClick={() => { setEditDescVal(sect.description ?? ''); setEditingDesc(true); }} disabled={busy}>
                    Edit Desc
                  </Btn>
                )}
                {myRole === 'sect_master'
                  ? <Btn onClick={disbandSect} disabled={busy} variant="danger">Disband</Btn>
                  : <Btn onClick={leaveSect}   disabled={busy} variant="danger">Leave</Btn>
                }
              </div>
            </div>
          </Card>

          {/* Members table */}
          <Card>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
              Members
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(m => {
                const isMe = m.character_id === character?.id;
                const canManage = myRole === 'sect_master' && !isMe && m.role !== 'sect_master';
                return (
                  <div key={m.character_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 7,
                    background: isMe ? `${COLORS.border}40` : 'transparent',
                    border: `1px solid ${isMe ? COLORS.border : 'transparent'}`,
                  }}>
                    {/* Username */}
                    <div style={{ width: 130, fontSize: 13, fontWeight: isMe ? 700 : 400, color: isMe ? COLORS.text : COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isMe ? '▶ ' : ''}{m.username}
                    </div>

                    {/* Realm */}
                    <div style={{ width: 110, fontSize: 11, color: COLORS.textMuted }}>
                      {REALM_NAMES[m.realm_level] ?? `Realm ${m.realm_level}`}
                    </div>

                    {/* Spirit root */}
                    <div style={{ width: 70, fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' }}>
                      {m.spirit_root}
                    </div>

                    {/* Role */}
                    <div style={{ width: 90, fontSize: 11, fontWeight: 700, color: roleColor(m.role) }}>
                      {roleLabel(m.role)}
                    </div>

                    {/* Joined */}
                    <div style={{ flex: 1, fontSize: 11, color: COLORS.border }}>
                      {fmtDate(m.joined_at)}
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {m.role === 'disciple' && (
                          <Btn onClick={() => setRole(m.character_id, 'elder')} disabled={busy}>
                            Promote
                          </Btn>
                        )}
                        {m.role === 'elder' && (
                          <Btn onClick={() => setRole(m.character_id, 'disciple')} disabled={busy}>
                            Demote
                          </Btn>
                        )}
                        <Btn onClick={() => kickMember(m.character_id)} disabled={busy} variant="danger">
                          Kick
                        </Btn>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── No Sect ── */}
      {view === 'no_sect' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Create form */}
          <Card>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
              Found a Sect
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 5 }}>Sect Name</div>
                <input
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  maxLength={40}
                  placeholder="Enter sect name…"
                  style={{
                    width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    color: COLORS.text, borderRadius: 6, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 5 }}>Description (optional)</div>
                <textarea
                  value={cDesc}
                  onChange={e => setCDesc(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Describe your sect…"
                  style={{
                    width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    color: COLORS.text, borderRadius: 6, padding: '8px 12px', fontSize: 13,
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <Btn onClick={createSect} disabled={busy || !cName.trim()} variant="gold">
                  Found Sect
                </Btn>
              </div>
            </div>
          </Card>

          {/* Browse */}
          <Card>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
              Sects on This Server
            </div>

            {browse.length === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.border, textAlign: 'center', padding: '20px 0' }}>
                No sects yet. Be the first to found one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {browse.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{s.name}</div>
                      {s.description && (
                        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{s.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: COLORS.border, marginTop: 3 }}>
                        {s.member_count} member{s.member_count !== 1 ? 's' : ''}
                        {s.leader_name && <> · Led by <span style={{ color: COLORS.textMuted }}>{s.leader_name}</span></>}
                      </div>
                    </div>
                    <Btn onClick={() => joinSect(s.id, s.member_count)} disabled={busy} variant="gold">
                      Join
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
