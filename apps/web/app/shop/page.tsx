const ITEMS = [
  {
    name: 'Phoenix Flame Aura',
    type: 'Cosmetic Aura',
    rarity: 'Epic',
    price: '$5',
    desc: 'Your character radiates a living flame in combat embeds and the website.',
    icon: '🔥',
    color: 'border-orange-600 bg-orange-900/10',
    badge: 'bg-orange-700 text-orange-100',
  },
  {
    name: 'Void Shroud Aura',
    type: 'Cosmetic Aura',
    rarity: 'Legendary',
    price: '$8',
    desc: 'A swirling void surrounds your cultivator — the aura of those who walk between worlds.',
    icon: '🌀',
    color: 'border-purple-600 bg-purple-900/10',
    badge: 'bg-purple-700 text-purple-100',
  },
  {
    name: 'Heavenly Thunder Aura',
    type: 'Cosmetic Aura',
    rarity: 'Rare',
    price: '$5',
    desc: 'The crackling of tribulation lightning marks you as a survivor of heaven\'s wrath.',
    icon: '⚡',
    color: 'border-blue-500 bg-blue-900/10',
    badge: 'bg-blue-700 text-blue-100',
  },
  {
    name: 'Void Sovereign',
    type: 'Title',
    rarity: 'Rare',
    price: '$3',
    desc: 'Displayed beside your name in leaderboards, combat logs, and the website.',
    icon: '👑',
    color: 'border-gold-600 bg-gold-900/10',
    badge: 'bg-gold-700 text-gold-100',
  },
  {
    name: 'Dao Heart Cultivator',
    type: 'Title',
    rarity: 'Uncommon',
    price: '$2',
    desc: 'A title of serenity and resolve. For those who walk a steady path.',
    icon: '☯',
    color: 'border-jade-600 bg-jade-900/10',
    badge: 'bg-jade-700 text-jade-100',
  },
  {
    name: '24-Hour Qi Boost Pass',
    type: 'Consumable',
    rarity: 'Common',
    price: '$5',
    desc: '2× cultivation rate for 24 hours. Non-stackable. Does not affect combat power.',
    icon: '💊',
    color: 'border-ink-500 bg-ink-700/30',
    badge: 'bg-ink-600 text-ink-200',
  },
];

export default function ShopPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">The Celestial Exchange</h1>
        <p className="text-ink-300 mt-2">Cosmetics and time-savers only. Never pay-to-win.</p>
      </div>

      <div className="bg-ink-700/50 border border-gold-600/30 rounded-xl px-6 py-4 text-sm text-ink-200 font-cinzel">
        ⚠️  Purchases are <strong className="text-gold-400">coming in Phase 5</strong>. Browse now, buy soon.
        All gameplay content is free forever — these items are cosmetic only.
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ITEMS.map((item) => (
          <div key={item.name} className={`border rounded-xl p-5 space-y-3 ${item.color}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-3xl">{item.icon}</div>
              <span className={`text-xs font-cinzel px-2 py-0.5 rounded ${item.badge}`}>{item.rarity}</span>
            </div>
            <div>
              <h3 className="font-cinzel text-base text-ink-100 font-semibold">{item.name}</h3>
              <p className="text-xs text-ink-400 mt-0.5 font-cinzel">{item.type}</p>
            </div>
            <p className="text-sm text-ink-200 leading-relaxed">{item.desc}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="font-cinzel text-gold-400 font-bold">{item.price}</span>
              <button
                disabled
                className="text-xs font-cinzel px-3 py-1.5 rounded border border-ink-500 text-ink-400 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
