const REALM_COLORS: Record<number, string> = {
  1:  'bg-ink-600 text-ink-200',
  2:  'bg-jade-600 text-jade-200',
  3:  'bg-jade-500 text-white',
  4:  'bg-blue-800 text-blue-200',
  5:  'bg-blue-600 text-white',
  6:  'bg-purple-800 text-purple-200',
  7:  'bg-purple-600 text-white',
  8:  'bg-orange-800 text-orange-200',
  9:  'bg-red-700 text-red-100',
  10: 'bg-gradient-to-r from-gold-700 to-gold-500 text-ink-900',
};

const REALM_NAMES: Record<number, string> = {
  1:  'Mortal Refinement',
  2:  'Qi Condensation',
  3:  'Foundation Establishment',
  4:  'Core Formation',
  5:  'Nascent Soul',
  6:  'Soul Transformation',
  7:  'Void Refinement',
  8:  'Body Integration',
  9:  'Mahayana',
  10: 'Tribulation Transcendence',
};

export default function RealmBadge({ level }: { level: number }) {
  const color = REALM_COLORS[level] ?? 'bg-ink-600 text-ink-200';
  const name  = REALM_NAMES[level] ?? `Realm ${level}`;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-cinzel font-semibold ${color}`}>
      {name}
    </span>
  );
}
