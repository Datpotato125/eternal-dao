import Link from 'next/link';

const FEATURES = [
  {
    icon: '🧘',
    title: 'Cultivate Qi',
    desc: 'Meditate to accumulate Qi and fill your dantian. Return hours later to claim your gains.',
  },
  {
    icon: '⚔️',
    title: 'Challenge Others',
    desc: 'Issue challenges, fight deterministic duels, and climb the realm leaderboard.',
  },
  {
    icon: '⚡',
    title: 'Break Through',
    desc: 'When your Qi is full, attempt a heavenly breakthrough and ascend to the next realm.',
  },
  {
    icon: '🏯',
    title: 'Found a Sect',
    desc: 'Create or join a sect. The first founder in any server earns the Founding Ancestor title.',
  },
];

const REALMS = [
  { level: 1,  name: 'Mortal Refinement',       color: 'text-ink-300' },
  { level: 2,  name: 'Qi Condensation',          color: 'text-jade-400' },
  { level: 3,  name: 'Foundation Establishment', color: 'text-jade-300' },
  { level: 4,  name: 'Core Formation',           color: 'text-blue-400' },
  { level: 5,  name: 'Nascent Soul',             color: 'text-blue-300' },
  { level: 6,  name: 'Soul Transformation',      color: 'text-purple-400' },
  { level: 7,  name: 'Void Refinement',          color: 'text-purple-300' },
  { level: 8,  name: 'Body Integration',         color: 'text-orange-400' },
  { level: 9,  name: 'Mahayana',                 color: 'text-red-400' },
  { level: 10, name: 'Tribulation Transcendence',color: 'text-gold-400' },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center py-16 space-y-6">
        <div className="inline-block px-4 py-1 border border-gold-600 text-gold-500 text-xs font-cinzel tracking-widest rounded mb-4">
          ETERNAL DAO ONLINE
        </div>
        <h1 className="font-cinzel text-5xl md:text-7xl font-black text-gold-400 gold-glow leading-tight">
          Walk the<br />Immortal Path
        </h1>
        <p className="text-ink-200 text-xl max-w-2xl mx-auto leading-relaxed">
          A cultivation RPG that lives inside Discord. Accumulate Qi, break through realms,
          forge sects, and carve your name into the heavens — for free, forever.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1497396609867317278&scope=bot+applications.commands&permissions=2147483648"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold-500 hover:bg-gold-400 text-ink-900 font-cinzel font-bold px-8 py-3 rounded transition-colors text-sm tracking-wide"
          >
            Add to Discord ↗
          </a>
          <Link
            href="/leaderboard"
            className="border border-gold-600 text-gold-500 hover:bg-gold-600/10 font-cinzel px-8 py-3 rounded transition-colors text-sm tracking-wide"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="font-cinzel text-2xl text-gold-500 text-center mb-10 tracking-wider">The Four Pillars</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-ink-700 border border-ink-500 rounded-lg p-6 space-y-3 hover:border-gold-600 transition-colors">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-cinzel text-gold-400 text-base font-semibold">{f.title}</h3>
              <p className="text-ink-200 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Realm Ladder */}
      <section className="bg-ink-800 border border-ink-600 rounded-xl p-8">
        <h2 className="font-cinzel text-2xl text-gold-500 text-center mb-8 tracking-wider">The Ten Realms</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {REALMS.map((r) => (
            <div key={r.level} className="text-center p-3 bg-ink-700/50 rounded border border-ink-600 hover:border-ink-400 transition-colors">
              <div className="font-cinzel text-2xl font-black text-ink-500 mb-1">{r.level}</div>
              <div className={`font-cinzel text-xs font-semibold ${r.color}`}>{r.name}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/realms" className="text-sm text-gold-500 hover:text-gold-400 font-cinzel tracking-wide transition-colors">
            View Full Realm Map →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-10 border border-gold-600/30 rounded-xl bg-gradient-to-b from-ink-700/30 to-transparent">
        <h2 className="font-cinzel text-3xl text-gold-400 mb-4">Begin Your Journey</h2>
        <p className="text-ink-200 mb-8 max-w-md mx-auto">
          The Dao does not wait. Every moment of hesitation is a moment of Qi ungained.
        </p>
        <a
          href="https://discord.com/oauth2/authorize?client_id=1497396609867317278&scope=bot+applications.commands&permissions=2147483648"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gold-500 hover:bg-gold-400 text-ink-900 font-cinzel font-bold px-10 py-4 rounded transition-colors tracking-wide"
        >
          Invite the Bot — It&apos;s Free
        </a>
      </section>
    </div>
  );
}
