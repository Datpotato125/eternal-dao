import { supabase } from '@/lib/supabase';

const REALMS = [
  { level: 1,  name: 'Mortal Refinement',        minQi: 0,           maxQi: 999,
    lore: 'The foundation of all cultivation. The body is tempered; the first threads of Qi are gathered.',
    color: 'border-ink-500 bg-ink-700/30', badge: 'bg-ink-600 text-ink-200' },
  { level: 2,  name: 'Qi Condensation',           minQi: 1_000,       maxQi: 4_999,
    lore: 'Qi is no longer scattered — it coils in the dantian like a sleeping dragon, dense and vast.',
    color: 'border-jade-700 bg-jade-900/20', badge: 'bg-jade-700 text-jade-100' },
  { level: 3,  name: 'Foundation Establishment',  minQi: 5_000,       maxQi: 19_999,
    lore: 'A foundation is laid in the sea of Qi. The cultivator steps onto the immortal path in earnest.',
    color: 'border-jade-600 bg-jade-900/30', badge: 'bg-jade-600 text-white' },
  { level: 4,  name: 'Core Formation',            minQi: 20_000,      maxQi: 99_999,
    lore: 'A golden core crystallizes within. Power flows freely; the cultivator is no longer bound by mortality.',
    color: 'border-blue-700 bg-blue-900/20', badge: 'bg-blue-800 text-blue-200' },
  { level: 5,  name: 'Nascent Soul',              minQi: 100_000,     maxQi: 499_999,
    lore: 'The soul separates from the body. A nascent spirit flies free of mortal constraints.',
    color: 'border-blue-500 bg-blue-900/30', badge: 'bg-blue-600 text-white' },
  { level: 6,  name: 'Soul Transformation',       minQi: 500_000,     maxQi: 1_999_999,
    lore: 'The nascent soul transforms into a true immortal form. Heaven\'s will acknowledges the cultivator.',
    color: 'border-purple-700 bg-purple-900/20', badge: 'bg-purple-800 text-purple-200' },
  { level: 7,  name: 'Void Refinement',           minQi: 2_000_000,   maxQi: 9_999_999,
    lore: 'The cultivator refines the laws of the void, manipulating reality at its seams.',
    color: 'border-purple-500 bg-purple-900/30', badge: 'bg-purple-600 text-white' },
  { level: 8,  name: 'Body Integration',          minQi: 10_000_000,  maxQi: 49_999_999,
    lore: 'Body, soul, and Dao unite. The cultivator becomes a living manifestation of the heavenly laws.',
    color: 'border-orange-700 bg-orange-900/20', badge: 'bg-orange-800 text-orange-200' },
  { level: 9,  name: 'Mahayana',                  minQi: 50_000_000,  maxQi: 199_999_999,
    lore: 'The final mortal realm. One step separates this cultivator from eternal transcendence.',
    color: 'border-red-700 bg-red-900/20', badge: 'bg-red-700 text-red-100' },
  { level: 10, name: 'Tribulation Transcendence', minQi: 200_000_000, maxQi: Infinity,
    lore: 'The heavenly tribulation is endured. The cultivator defies mortality and ascends to immortality.',
    color: 'border-gold-500 bg-gold-900/10', badge: 'bg-gradient-to-r from-gold-700 to-gold-500 text-ink-900' },
];

async function getRealmCounts() {
  const { data } = await supabase
    .from('characters')
    .select('realm_level');
  if (!data) return {} as Record<number, number>;
  return data.reduce((acc: Record<number, number>, c: { realm_level: number }) => {
    acc[c.realm_level] = (acc[c.realm_level] ?? 0) + 1;
    return acc;
  }, {});
}

export const revalidate = 300;

export default async function RealmsPage() {
  const counts = await getRealmCounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cinzel text-3xl text-gold-400 gold-glow">The Ten Realms</h1>
        <p className="text-ink-300 mt-2">Every cultivator walks this path. Most never leave Mortal Refinement.</p>
      </div>

      <div className="space-y-4">
        {REALMS.map((realm, i) => {
          const count = counts[realm.level] ?? 0;
          const isLast = i === REALMS.length - 1;
          return (
            <div key={realm.level}>
              <div className={`border rounded-xl p-5 ${realm.color} transition-all hover:opacity-90`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-cinzel text-3xl font-black text-ink-400 w-8 shrink-0 text-center">
                      {realm.level}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="font-cinzel text-lg text-ink-100 font-semibold">{realm.name}</h2>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-cinzel font-semibold ${realm.badge}`}>
                          Lv.{realm.level}
                        </span>
                      </div>
                      <p className="text-ink-300 text-sm mt-1.5 leading-relaxed italic">&ldquo;{realm.lore}&rdquo;</p>
                      <div className="mt-2 text-xs text-ink-400 font-cinzel">
                        Qi Required:{' '}
                        <span className="text-jade-400">
                          {realm.minQi.toLocaleString()}
                          {realm.maxQi !== Infinity ? ` – ${realm.maxQi.toLocaleString()}` : '+'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-cinzel text-xl text-gold-500">{count}</div>
                    <div className="text-xs text-ink-400">cultivators</div>
                  </div>
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center my-1 text-ink-600">↓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
