import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import RealmBadge from '@/components/RealmBadge';

export const revalidate = 60;

const MEDALS = ['🥇', '🥈', '🥉'];

async function getLeaderboard() {
  const { data: chars, error } = await supabase
    .from('characters')
    .select('id, player_id, realm_level, qi_current, qi_max, players!player_id(username, avatar_url)')
    .order('realm_level', { ascending: false })
    .order('qi_current',  { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!chars || chars.length === 0) return [];

  // Second pass: get sect names for each character via sect_members
  const charIds = chars.map(c => c.id);
  const { data: memberships } = await supabase
    .from('sect_members')
    .select('character_id, sects!sect_id(name)')
    .in('character_id', charIds);

  const sectByChar: Record<string, string> = {};
  for (const m of (memberships ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectName = (m.sects as any)?.name;
    if (sectName) sectByChar[m.character_id] = sectName;
  }

  return chars.map(c => ({ ...c, sectName: sectByChar[c.id] ?? null }));
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const isGlobal = searchParams.scope === 'global';
  const rows = await getLeaderboard();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">Leaderboard</h1>
        <div className="flex gap-2">
          <a
            href="/leaderboard"
            className={`font-cinzel text-sm px-4 py-1.5 rounded border transition-colors ${
              !isGlobal
                ? 'bg-gold-500 text-ink-900 border-gold-500'
                : 'text-ink-200 border-ink-500 hover:border-gold-500'
            }`}
          >
            Server
          </a>
          <a
            href="/leaderboard?scope=global"
            className={`font-cinzel text-sm px-4 py-1.5 rounded border transition-colors ${
              isGlobal
                ? 'bg-gold-500 text-ink-900 border-gold-500'
                : 'text-ink-200 border-ink-500 hover:border-gold-500'
            }`}
          >
            Global
          </a>
        </div>
      </div>

      <p className="text-ink-300 text-sm font-cinzel">
        {isGlobal ? 'All cultivators across every realm.' : 'Top cultivators. Updates every 60 seconds.'}
      </p>

      <div className="bg-ink-800 border border-ink-600 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-600 text-ink-300 text-xs font-cinzel tracking-wider">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Cultivator</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Realm</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Qi</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Sect</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((char, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const player = (char as any).players as { username: string; avatar_url: string | null } | null;
              const pct    = Number(char.qi_max) > 0
                ? Math.floor((Number(char.qi_current) / Number(char.qi_max)) * 100)
                : 0;

              return (
                <tr
                  key={char.id}
                  className="border-b border-ink-700 hover:bg-ink-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-cinzel text-lg w-10">
                    {i < 3 ? MEDALS[i] : <span className="text-ink-400">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/profile/${char.player_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      {player?.avatar_url ? (
                        <Image src={player.avatar_url} alt="" width={32} height={32} className="rounded-full border border-ink-500" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ink-600 border border-ink-500 flex items-center justify-center text-xs font-cinzel text-ink-300">
                          {player?.username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <span className="font-cinzel text-sm text-ink-100">{player?.username ?? 'Unknown'}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <RealmBadge level={char.realm_level} />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-right">
                    <span className="text-jade-400 font-cinzel text-sm">{Number(char.qi_current).toLocaleString()}</span>
                    <span className="text-ink-400 text-xs ml-1">/ {Number(char.qi_max).toLocaleString()}</span>
                    <div className="text-right text-xs text-ink-500 mt-0.5">{pct}%</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-ink-300 font-cinzel">
                    {char.sectName ?? '—'}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-400 font-cinzel text-sm">
                  No cultivators found. Be the first to walk the path.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
