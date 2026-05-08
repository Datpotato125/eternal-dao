import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RealmBadge from '@/components/RealmBadge';

const ROLE_ORDER = ['sect_master', 'ancestor', 'elder', 'disciple'];
const ROLE_LABELS: Record<string, string> = {
  sect_master: '⚜️ Sect Master',
  ancestor:    '👑 Ancestor',
  elder:       '🔮 Elder',
  disciple:    '🎋 Disciple',
};

export default async function SectPage({ params }: { params: { id: string } }) {
  const { data: sect } = await supabase
    .from('sects')
    .select('id, name, description, member_count, created_at, server_id, leader:leader_id(id, player_id, realm_level)')
    .eq('id', params.id)
    .maybeSingle();

  if (!sect) notFound();

  const { data: members } = await supabase
    .from('sect_members')
    .select('role, joined_at, character:character_id(id, player_id, realm_level, qi_current, qi_max, players(username, avatar_url))')
    .eq('sect_id', params.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = (members as any[] ?? []).sort((a, b) => {
    return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  });

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="bg-ink-800 border border-gold-600/40 rounded-xl p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">{sect.name}</h1>
            {sect.description && (
              <p className="text-ink-200 mt-3 leading-relaxed italic">&ldquo;{sect.description}&rdquo;</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-cinzel text-2xl text-gold-500">{sect.member_count}</div>
            <div className="text-xs text-ink-400 font-cinzel">Members</div>
          </div>
        </div>
        <div className="text-xs text-ink-400 font-cinzel">
          Founded {new Date(sect.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Members */}
      <div className="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-600">
          <h2 className="font-cinzel text-lg text-gold-400">Sect Roster</h2>
        </div>
        <div className="divide-y divide-ink-700">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {sorted.map((m: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const char   = m.character as any;
            const player = char?.players as { username: string; avatar_url: string | null } | null;
            return (
              <div key={char?.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-ink-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  {player?.avatar_url ? (
                    <Image src={player.avatar_url} alt="" width={36} height={36} className="rounded-full border border-ink-500" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-ink-600 border border-ink-500 flex items-center justify-center text-sm font-cinzel text-ink-300">
                      {player?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <a href={`/profile/${char?.player_id}`} className="font-cinzel text-sm text-ink-100 hover:text-gold-400 transition-colors">
                      {player?.username ?? 'Unknown'}
                    </a>
                    <div className="text-xs text-ink-400 mt-0.5">{ROLE_LABELS[m.role] ?? m.role}</div>
                  </div>
                </div>
                <RealmBadge level={char?.realm_level ?? 1} />
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="px-6 py-8 text-center text-ink-400 font-cinzel text-sm">
              This sect stands empty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
