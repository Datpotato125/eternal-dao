const TIERS = [
  {
    name: 'Disciple',
    price: '$3/month',
    color: 'border-jade-600 bg-jade-900/10',
    badge: 'bg-jade-700 text-jade-100',
    icon: '🎋',
    perks: [
      'Monthly cosmetic aura drop',
      'Disciple title displayed on website',
      'Discord supporter role',
      'Direct feedback channel access',
    ],
  },
  {
    name: 'Elder',
    price: '$10/month',
    color: 'border-blue-500 bg-blue-900/10',
    badge: 'bg-blue-700 text-blue-100',
    icon: '🔮',
    featured: true,
    perks: [
      'All Disciple benefits',
      'Monthly 24-hour Qi Boost Pass',
      'Elder title displayed everywhere',
      'Vote on new features',
      'Early access to new commands',
    ],
  },
  {
    name: 'Ancestor',
    price: '$25/month',
    color: 'border-gold-500 bg-gold-900/10',
    badge: 'bg-gold-700 text-gold-100',
    icon: '👑',
    perks: [
      'All Elder benefits',
      'Custom title of your choosing',
      'Priority feature input',
      'Permanent Ancestor honorific',
      'Your name in the credits',
      'Direct line to the developer',
    ],
  },
];

export default function PatreonPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      <div className="text-center space-y-4">
        <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">Support the Path</h1>
        <p className="text-ink-200 max-w-lg mx-auto leading-relaxed">
          Eternal Dao is free forever. Patreon support keeps the servers running
          and the Qi flowing. Every tier is cosmetic only — the path to the top is open to all.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`border rounded-xl p-6 space-y-5 relative ${tier.color} ${tier.featured ? 'ring-1 ring-blue-500' : ''}`}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-cinzel px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <div className="text-center space-y-2">
              <div className="text-4xl">{tier.icon}</div>
              <h2 className="font-cinzel text-xl text-gold-400">{tier.name}</h2>
              <div className="font-cinzel text-2xl text-ink-100 font-bold">{tier.price}</div>
            </div>
            <ul className="space-y-2">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-ink-200">
                  <span className="text-jade-400 mt-0.5">✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <a
              href="https://patreon.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center font-cinzel text-sm py-2.5 rounded border transition-colors ${
                tier.featured
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600'
                  : 'border-ink-500 text-ink-200 hover:border-gold-500 hover:text-gold-400'
              }`}
            >
              Join on Patreon ↗
            </a>
          </div>
        ))}
      </div>

      <div className="bg-ink-800 border border-ink-600 rounded-xl p-6 text-center space-y-3">
        <h2 className="font-cinzel text-lg text-gold-400">One-Time Purchases</h2>
        <p className="text-ink-200 text-sm">
          Prefer not to subscribe? Individual cosmetics, titles, and Qi boost passes
          are available in the{' '}
          <a href="/shop" className="text-gold-400 hover:text-gold-300 underline">
            Celestial Exchange
          </a>
          .
        </p>
      </div>
    </div>
  );
}
