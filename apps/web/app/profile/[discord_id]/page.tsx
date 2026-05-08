import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RealmBadge from '@/components/RealmBadge';
import QiBar from '@/components/QiBar';

const ROOT_LABELS: Record<string, string> = {
  mortal: '⬜ Mortal',
  wood:   '🟩 Wood',
  fire:   '🟥 Fire',
  water:  '🟦 Water',
  metal:  '⬜ Metal',
  earth:  '🟫 Earth',
  dual:   '🟪 Dual',
  chaos:  '🟧 Chaos',
};

export default async function ProfilePage({ params }: { params: { discord_id: string } }) {
  const { discord_id } = params;

  const { data: player } = await supabase
    .from('players')
    .select('discord_id, username, avatar_url')
    .eq('discord_id', discord_id)
    .maybeSingle();

  if (!player) notFound();

  const { data: chars } = await supabase
    .from('characters')
    .select('id, realm_level, qi_current, qi_max, spirit_root, pvp_wins, pvp_losses, breakthrough_attempts, created_at, sects(name)')
    .eq('player_id', discord_id);

  const { data: combatLog } = await supabase
    .from('combat_log')
    .select('id, seed, winner_id, created_at, attacker:attacker_id(player_id), defender:defender_id(player_id)')
    .or(`attacker_id.in.(${(chars ?? []).map(c => `"${c.id}"`).join(',')}),defender_id.in.(${(chars ?? []).map(c => `"${c.id}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-5">
        {player.avatar_url ? (
          <Image src={player.avatar_url} alt="" width={72} height={72} className="rounded-full border-2 border-gold-500" />
        ) : (
          <div className="w-18 h-18 rounded-full bg-ink-600 border-2 border-gold-500 flex items-center justify-center text-2xl font-cinzel text-gold-400">
            {player.username[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-cinzel text-3xl text-gold-400">{player.username}</h1>
          <p className="text-ink-300 text-sm mt-1 font-cinzel">
            {(chars ?? []).length} character{(chars ?? []).length !== 1 ? 's' : ''} across realms
          </p>
        </div>
      </div>

      {/* Characters */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  {(chars as any[] ?? []).map((char) => {
        const sect = char.sects as { name: string } | null;
        return (
          <div key={char.id} className="bg-ink-800 border border-ink-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <RealmBadge level={char.realm_level} />
              {sect && (
                <span className="text-xs font-cinzel text-ink-300 border border-ink-500 px-2 py-0.5 rounded">
                  🏯 {sect.name}
                </span>
              )}
            </div>
            <QiBar current={Number(char.qi_current)} max={Number(char.qi_max)} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Spirit Root" value={ROOT_LABELS[char.spirit_root] ?? char.spirit_root} />
              <Stat label="PvP Record"  value={`${char.pvp_wins ?? 0}W / ${char.pvp_losses ?? 0}L`} />
              <Stat label="Breakthroughs" value={String(char.breakthrough_attempts ?? 0)} />
              <Stat label="Joined" value={new Date(char.created_at).toLocaleDateString()} />
            </div>
          </div>
        );
      })}

      {(chars ?? []).length === 0 && (
        <div className="bg-ink-800 border border-ink-600 rounded-xl p-8 text-center text-ink-400 font-cinzel">
          This cultivator has not yet begun their journey.
        </div>
      )}

      {/* Combat History */}
      {combatLog && combatLog.length > 0 && (
        <div className="bg-ink-800 border border-ink-600 rounded-xl p-6 space-y-4">
          <h2 className="font-cinzel text-lg text-gold-400">Recent Combat</h2>
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(combatLog as any[]).map((fight) => {
              const attacker = fight.attacker as { player_id: string } | null;
              const defender = fight.defender as { player_id: string } | null;
              const myChar   = (chars ?? []).find(c => c.id === attacker?.player_id || c.id === defender?.player_id);
              const won      = myChar ? fight.winner_id === myChar.id : false;
              return (
                <div key={fight.id} className="flex items-center justify-between text-sm border-b border-ink-700 pb-2 last:border-0 last:pb-0">
                  <span className={`font-cinzel font-semibold ${won ? 'text-jade-400' : 'text-red-400'}`}>
                    {won ? '⚔️ Victory' : '💔 Defeat'}
                  </span>
                  <span className="text-ink-400 text-xs">
                    {new Date(fight.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-400 font-cinzel tracking-wide">{label}</div>
      <div className="text-ink-100 font-semibold mt-0.5">{value}</div>
    </div>
  );
}
