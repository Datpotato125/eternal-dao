// Realm progression ladder — matches the build plan exactly
export const REALMS = [
  { id: 1,  name: 'Mortal Refinement',    min_qi: 0,           max_qi: 999        },
  { id: 2,  name: 'Qi Condensation',      min_qi: 1_000,       max_qi: 4_999      },
  { id: 3,  name: 'Foundation Establishment', min_qi: 5_000,   max_qi: 19_999     },
  { id: 4,  name: 'Core Formation',       min_qi: 20_000,      max_qi: 99_999     },
  { id: 5,  name: 'Nascent Soul',         min_qi: 100_000,     max_qi: 499_999    },
  { id: 6,  name: 'Soul Transformation',  min_qi: 500_000,     max_qi: 1_999_999  },
  { id: 7,  name: 'Void Refinement',      min_qi: 2_000_000,   max_qi: 9_999_999  },
  { id: 8,  name: 'Body Integration',     min_qi: 10_000_000,  max_qi: 49_999_999 },
  { id: 9,  name: 'Mahayana',             min_qi: 50_000_000,  max_qi: 199_999_999},
  { id: 10, name: 'Tribulation Transcendence', min_qi: 200_000_000, max_qi: null  },
];

// Spirit roots — determined at character creation
export const SPIRIT_ROOTS = [
  { id: 'mortal',  label: 'Mortal',       rarity: 'common',    cultivation_bonus: 1.0  },
  { id: 'wood',    label: 'Wood Root',    rarity: 'uncommon',  cultivation_bonus: 1.2  },
  { id: 'fire',    label: 'Fire Root',    rarity: 'uncommon',  cultivation_bonus: 1.2  },
  { id: 'water',   label: 'Water Root',   rarity: 'uncommon',  cultivation_bonus: 1.2  },
  { id: 'metal',   label: 'Metal Root',   rarity: 'uncommon',  cultivation_bonus: 1.2  },
  { id: 'earth',   label: 'Earth Root',   rarity: 'uncommon',  cultivation_bonus: 1.2  },
  { id: 'dual',    label: 'Dual Root',    rarity: 'rare',      cultivation_bonus: 1.15 },
  { id: 'chaos',   label: 'Chaos Root',   rarity: 'legendary', cultivation_bonus: 1.1  },
];

export const BASE_CULTIVATION_RATE = 100; // Qi per hour at realm 1
export const OFFLINE_CAP_HOURS = 8;

export const getRealm = (id) => REALMS.find(r => r.id === id) ?? REALMS[0];
export const getRealmByQi = (qi) => [...REALMS].reverse().find(r => qi >= r.min_qi) ?? REALMS[0];
