const LORE_SECTIONS = [
  {
    title: 'The World',
    icon: '🌏',
    content: `Eternal Dao unfolds across countless Discord realms — each server a world unto itself, with its own history, its own sects, its own mortal-to-immortal hierarchy. Yet above them all hangs a single sky: the Global Leaderboard, where the greatest cultivators across every world compete for primacy.

The Dao is not a path but a principle. It exists in all things, nameless and formless. To cultivate is to align oneself with it — to become a vessel for heaven and earth's primordial Qi.`,
  },
  {
    title: 'Spirit Roots',
    icon: '🌱',
    content: `At the moment of awakening, a cultivator's spirit root determines the quality of their cultivation. Spirit roots are heaven-given and cannot be changed.`,
    table: [
      { root: 'Mortal',        rarity: 'Common (50%)',     bonus: 'Base cultivation rate',       color: 'text-ink-300' },
      { root: 'Single (×5)',   rarity: 'Uncommon (8% ea)', bonus: '+20% Qi per hour',            color: 'text-jade-400' },
      { root: 'Dual Root',     rarity: 'Rare (8%)',        bonus: '+15% Qi per hour',            color: 'text-blue-400' },
      { root: 'Chaos Root',    rarity: 'Legendary (2%)',   bonus: '+10% Qi, special techniques', color: 'text-gold-400' },
    ],
  },
  {
    title: 'Cultivation',
    icon: '🧘',
    content: `Use \`/cultivate\` to begin a meditation session. Your Qi accumulates at your cultivation rate while you are away. Use \`/cultivate\` again to end the session and claim what you have gathered.

Qi accumulation is capped at 8 hours per session — the Dao does not reward complacency beyond this limit. Your spirit root determines your base cultivation rate bonus.`,
  },
  {
    title: 'Breakthroughs',
    icon: '⚡',
    content: `When your Qi reaches its maximum, you may attempt a breakthrough to the next realm with \`/breakthrough\`.

The chance of success is 75%. Failure costs 25% of your maximum Qi — a painful setback that demands perseverance. Success resets your Qi to zero at the new realm's baseline, and a public announcement shakes the heavens of your server.

Higher realms demand exponentially more Qi. Those who persevere through tribulation ascend; those who do not return to cultivation.`,
  },
  {
    title: 'Combat',
    icon: '⚔️',
    content: `Challenge another cultivator with \`/fight @cultivator\`. Combat is resolved instantly using a seeded deterministic algorithm — the same seed always produces the same outcome, making every fight verifiably fair and replayable.

A fighter's power is determined by their realm level, their current Qi fill percentage, and their spirit root multiplier. Ten rounds are fought; majority wins. The victor gains 15% of their max Qi. The loser loses 10% of theirs.`,
  },
  {
    title: 'Sects',
    icon: '🏯',
    content: `Sects are the political backbone of each server's cultivation world. Create a sect with \`/sect create\`, recruit members, and carve a legacy.

The first player to create a sect on any server receives the permanent **Founding Ancestor** title — a mark of distinction that cannot be purchased or earned any other way. It is a record of being present at the beginning.

Sect Masters can promote members to Elder, demote, or expel. Sects appear on the website's leaderboard and sect pages.`,
  },
];

export default function LorePage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">The Lore of Eternal Dao</h1>
        <p className="text-ink-300 mt-2">The Dao that can be named is not the eternal Dao.</p>
      </div>

      {LORE_SECTIONS.map((section) => (
        <div key={section.title} className="bg-ink-800 border border-ink-600 rounded-xl p-6 space-y-4">
          <h2 className="font-cinzel text-xl text-gold-400 flex items-center gap-3">
            <span>{section.icon}</span>
            <span>{section.title}</span>
          </h2>
          <div className="text-ink-200 leading-relaxed whitespace-pre-line text-base">
            {section.content}
          </div>
          {section.table && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-600 text-ink-400 font-cinzel text-xs tracking-wider">
                    <th className="text-left py-2 pr-4">Root</th>
                    <th className="text-left py-2 pr-4">Rarity</th>
                    <th className="text-left py-2">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {section.table.map((row) => (
                    <tr key={row.root} className="border-b border-ink-700 last:border-0">
                      <td className={`py-2 pr-4 font-cinzel font-semibold ${row.color}`}>{row.root}</td>
                      <td className="py-2 pr-4 text-ink-300">{row.rarity}</td>
                      <td className="py-2 text-ink-200">{row.bonus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
