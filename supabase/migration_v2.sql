-- ============================================================
--  ETERNAL DAO — MIGRATION v2
--  Adds missing tables and columns needed by new bot commands.
--  Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
--  New tables:  sects, sect_members, skills, character_skills,
--               titles, character_titles, quests, character_quests
--  New columns: items (is_consumable, buy_price, sell_price,
--                       drop_chance, realm_required, path_required,
--                       effect_value)
--               bosses  (drop_item_id, reward_item_id)
--               characters (hp, exp_to_next)
-- ============================================================

-- ── 1. ADD MISSING COLUMNS: characters ───────────────────────

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS hp          INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS exp_to_next BIGINT  NOT NULL DEFAULT 1000;

-- ── 2. ADD MISSING COLUMNS: items ────────────────────────────

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS is_consumable  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buy_price      BIGINT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sell_price     BIGINT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drop_chance    NUMERIC  NOT NULL DEFAULT 0,     -- 0‒100 %
  ADD COLUMN IF NOT EXISTS realm_required INTEGER  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS path_required  TEXT,                            -- NULL = any path
  ADD COLUMN IF NOT EXISTS effect_value   JSONB    NOT NULL DEFAULT '{}';  -- consumable effects

-- Mark existing consumable items as consumable
UPDATE items SET is_consumable = true WHERE type = 'consumable';

-- ── 3. ADD MISSING COLUMNS: bosses ───────────────────────────

ALTER TABLE bosses
  ADD COLUMN IF NOT EXISTS drop_item_id   UUID REFERENCES items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_item_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- ── 4. NEW TABLE: sects ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  motto        TEXT        NOT NULL DEFAULT 'The Dao awaits.',
  emblem       TEXT,
  founder_id   UUID        REFERENCES characters(id) ON DELETE SET NULL,
  level        INTEGER     NOT NULL DEFAULT 1,
  exp          BIGINT      NOT NULL DEFAULT 0,
  member_count INTEGER     NOT NULL DEFAULT 0,
  wins         INTEGER     NOT NULL DEFAULT 0,
  losses       INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. NEW TABLE: sect_members ────────────────────────────────

CREATE TABLE IF NOT EXISTS sect_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sect_id       UUID        NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
  character_id  UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  rank          TEXT        NOT NULL DEFAULT 'Outer Disciple',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id)   -- each character can only be in one sect
);

-- ── 6. NEW TABLE: skills ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT    NOT NULL UNIQUE,
  description    TEXT    NOT NULL DEFAULT '',
  effect         TEXT    NOT NULL DEFAULT '',
  type           TEXT    NOT NULL DEFAULT 'attack'
                         CHECK (type IN ('attack','defense','utility')),
  qi_cost        INTEGER NOT NULL DEFAULT 0,
  cooldown_turns INTEGER NOT NULL DEFAULT 0,
  realm_required INTEGER NOT NULL DEFAULT 1,
  path_required  TEXT,           -- NULL = any path
  damage_multi   NUMERIC NOT NULL DEFAULT 1.0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. NEW TABLE: character_skills ────────────────────────────

CREATE TABLE IF NOT EXISTS character_skills (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID    NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id      UUID    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level         INTEGER NOT NULL DEFAULT 1,
  equipped      BOOLEAN NOT NULL DEFAULT false,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, skill_id)
);

-- ── 8. NEW TABLE: titles ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS titles (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL DEFAULT '',
  requirement TEXT,             -- human-readable unlock condition
  rarity      TEXT    NOT NULL DEFAULT 'common'
                      CHECK (rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
  bonus_stat  TEXT,             -- e.g. 'strength', 'spirit'
  bonus_value INTEGER NOT NULL DEFAULT 0,
  is_secret   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. NEW TABLE: character_titles ────────────────────────────

CREATE TABLE IF NOT EXISTS character_titles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title_id      UUID        NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, title_id)
);

-- ── 10. NEW TABLE: quests ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS quests (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  type           TEXT    NOT NULL DEFAULT 'main'
                         CHECK (type IN ('main','side','daily','repeatable')),
  realm_required INTEGER NOT NULL DEFAULT 1,
  path_required  TEXT,
  target_type    TEXT    NOT NULL DEFAULT 'any'
                         CHECK (target_type IN ('cultivate','combat','boss','breakthrough','any')),
  target_count   INTEGER NOT NULL DEFAULT 1,
  reward_qi      BIGINT  NOT NULL DEFAULT 0,
  reward_exp     BIGINT  NOT NULL DEFAULT 0,
  reward_gold    BIGINT  NOT NULL DEFAULT 0,
  reward_item_id UUID    REFERENCES items(id) ON DELETE SET NULL,
  reward_skill_id UUID   REFERENCES skills(id) ON DELETE SET NULL,
  reward_title_id UUID   REFERENCES titles(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. NEW TABLE: character_quests ───────────────────────────

CREATE TABLE IF NOT EXISTS character_quests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id      UUID        NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress      INTEGER     NOT NULL DEFAULT 0,
  completed     BOOLEAN     NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, quest_id)
);

-- ── RLS for new tables ────────────────────────────────────────

ALTER TABLE sects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sect_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_skills   ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_titles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_quests   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_sects"          ON sects;
DROP POLICY IF EXISTS "anon_all_sect_members"   ON sect_members;
DROP POLICY IF EXISTS "anon_all_skills"         ON skills;
DROP POLICY IF EXISTS "anon_all_char_skills"    ON character_skills;
DROP POLICY IF EXISTS "anon_all_titles"         ON titles;
DROP POLICY IF EXISTS "anon_all_char_titles"    ON character_titles;
DROP POLICY IF EXISTS "anon_all_quests"         ON quests;
DROP POLICY IF EXISTS "anon_all_char_quests"    ON character_quests;

CREATE POLICY "anon_all_sects"          ON sects            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_sect_members"   ON sect_members     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_skills"         ON skills           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_char_skills"    ON character_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_titles"         ON titles           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_char_titles"    ON character_titles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_quests"         ON quests           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_char_quests"    ON character_quests FOR ALL USING (true) WITH CHECK (true);

-- ── Ensure all expected columns exist on skills (safe if table already existed) ──

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS description    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS effect         TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type           TEXT    NOT NULL DEFAULT 'attack',
  ADD COLUMN IF NOT EXISTS qi_cost        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_turns INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS realm_required INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS path_required  TEXT,
  ADD COLUMN IF NOT EXISTS damage_multi   NUMERIC NOT NULL DEFAULT 1.0;

-- ── SEED: Skills ──────────────────────────────────────────────

INSERT INTO skills (name, description, effect, type, qi_cost, cooldown_turns, realm_required, path_required, damage_multi)
VALUES
  -- Universal (any path)
  ('Qi Burst',         'Concentrate Qi into a single explosive strike.',       'Deals 1.4× ATK damage',                  'attack',  100, 2, 1, NULL,        1.4),
  ('Iron Skin',        'Harden your body with protective Qi.',                 'Reduces incoming damage by 20% for 2 turns','defense', 80,  3, 1, NULL,        1.0),
  ('Qi Recovery',      'Circulate internal Qi to restore balance.',            'Restore 15% max HP',                      'utility', 50,  4, 1, NULL,        1.0),

  -- Sword Path
  ('Sword Rain',       'Send a volley of Qi blades at the enemy.',             'Deals 1.8× ATK damage, ignores 10% DEF',  'attack',  200, 3, 2, 'Sword',     1.8),
  ('Sword Resonance',  'The sword and soul become one.',                       'Crit chance +15% for 3 turns',            'utility', 150, 5, 3, 'Sword',     1.0),

  -- Body Path
  ('Mountain Stance',  'Root yourself like a mountain.',                       'DEF +30%, ATK −10% for 3 turns',          'defense', 120, 4, 2, 'Body',      1.0),
  ('Iron Fist Surge',  'Unleash raw physical power.',                          'Deals 1.6× ATK, ignores enemy Qi shields', 'attack', 180, 3, 3, 'Body',      1.6),

  -- Alchemy Path
  ('Toxin Spray',      'Coat the air with a poisonous mist.',                  'Deals 0.8× ATK + poison (20 dmg/turn for 3 turns)','attack',160,4, 2, 'Alchemy', 0.8),
  ('Healing Decoction','Concoct a quick restorative brew.',                    'Restore 25% max HP + remove 1 debuff',    'utility', 200, 5, 3, 'Alchemy',   1.0),

  -- Lightning Path
  ('Thunder Clap',     'Call down a bolt of Qi-infused lightning.',            'Deals 2.0× ATK, 20% chance to stun 1 turn','attack', 250, 4, 3, 'Lightning', 2.0),
  ('Storm Step',       'Move at the speed of lightning.',                      'Dodge chance +20% for 2 turns',           'utility', 180, 5, 3, 'Lightning', 1.0),

  -- Void Path
  ('Void Strike',      'Attack from the space between spaces.',                'Deals 1.5× ATK, cannot be blocked',       'attack',  220, 3, 3, 'Void',      1.5),
  ('Phase Shift',      'Briefly phase out of reality.',                        'Evade next attack (1 turn)',               'defense', 300, 6, 4, 'Void',      1.0),

  -- Fire Path
  ('Flame Wave',       'Release a wave of scorching Qi fire.',                 'Deals 1.7× ATK + burn (15 dmg/turn for 2 turns)','attack',200,3, 2, 'Fire',   1.7),
  ('Inferno Core',     'Channel your inner furnace.',                          'ATK +25% for 3 turns',                    'utility', 180, 5, 3, 'Fire',      1.0),

  -- Ice Path
  ('Frost Lance',      'Hurl a spear of condensed ice Qi.',                    'Deals 1.6× ATK, 30% chance to slow (SPD −20%)', 'attack',180,3, 2, 'Ice',    1.6),
  ('Glacial Barrier',  'Encase yourself in a shell of solid ice Qi.',          'DEF +40% for 2 turns, immune to burn/poison','defense',250,5, 3, 'Ice',       1.0),

  -- Illusion Path
  ('Mirror Image',     'Create a perfect copy of yourself.',                   'Next attack against you misses',          'defense', 200, 5, 2, 'Illusion',  1.0),
  ('Mind Shatter',     'Strike the enemy''s spirit directly.',                 'Deals 1.5× ATK to spirit (ignores armor)',  'attack', 230, 4, 3, 'Illusion',  1.5)

ON CONFLICT (name) DO NOTHING;

-- ── SEED: Titles ──────────────────────────────────────────────

INSERT INTO titles (name, description, requirement, rarity, bonus_stat, bonus_value, is_secret)
VALUES
  ('First Blood',       'Earned your first PvP victory.',           'Win 1 PvP duel',                      'common',    'strength', 1,  false),
  ('Seasoned Fighter',  'A hundred battles have forged your will.', 'Win 100 PvP duels',                   'uncommon',  'strength', 5,  false),
  ('Unbreakable',       'You have never tasted defeat.',            'Win 10 PvP duels without a loss',     'rare',      'endurance',8,  false),
  ('Boss Slayer',       'You have ended the life of a world boss.', 'Defeat any world boss',               'uncommon',  'strength', 3,  false),
  ('Dragon Bane',       'The celestial dragon feared your name.',   'Defeat Celestial Dragon Wuji',        'legendary', 'spirit',  20,  false),
  ('God Killer',        'Even the Ancient God Warlord fell to you.','Defeat Ancient God Warlord',          'mythic',    'strength',30,  true ),
  ('Devoted Cultivator','Your dedication to the Dao is unmatched.', 'Cultivate 1000 times total',         'rare',      'spirit',   5,  false),
  ('Immortal Seeker',   'You have reached the highest realm.',      'Reach Realm 10: True Immortal',      'legendary', 'spirit',  25,  false),
  ('Sect Master',       'You founded and lead a great sect.',       'Create a sect',                      'uncommon',  'spirit',   5,  false),
  ('Eternal Alchemist', 'The Dao of Pills is yours to command.',    'Reach Realm 5 as an Alchemy path cultivator', 'epic', 'spirit', 12, false)

ON CONFLICT (name) DO NOTHING;

-- ── SEED: Update items with shop prices and consumable effects ─

-- Consumable items already in seed — add shop prices + effects
UPDATE items SET
  is_consumable = true,
  buy_price     = 200,
  sell_price    = 80,
  realm_required = 1,
  effect_value  = '{"qi": 50}'
WHERE name = 'Iron Cultivation Stone';

UPDATE items SET
  is_consumable = true,
  buy_price     = 800,
  sell_price    = 300,
  realm_required = 2,
  effect_value  = '{"qi": 200, "spirit": 1}'
WHERE name = 'Spirit Grass Bundle';

UPDATE items SET
  is_consumable = true,
  buy_price     = 15000,
  sell_price    = 5000,
  realm_required = 4,
  effect_value  = '{"qi": 100000}'
WHERE name = 'Heaven-Shattering Pill';

-- Non-consumable equipment — set buy prices
UPDATE items SET buy_price = 5000,  sell_price = 1500, realm_required = 3 WHERE name = 'Phoenix Feather Robe';
UPDATE items SET buy_price = 12000, sell_price = 4000, realm_required = 4 WHERE name = 'Celestial Sword Qi';
UPDATE items SET buy_price = 50000, sell_price = 20000, realm_required = 6 WHERE name = 'Dao Heart Jade';

-- ── SEED: Starter consumable items ────────────────────────────
-- Add items that can be purchased in the early-game shop

INSERT INTO items (name, description, rarity, type, is_consumable, buy_price, sell_price, realm_required, effect_value)
VALUES
  ('Minor Qi Pill',       'A basic pill that restores a modest amount of Qi.',          'common',   'consumable', true,   150,  50, 1, '{"qi": 100}'),
  ('Qi Replenishment Pill','Restores a significant amount of Qi energy.',               'uncommon', 'consumable', true,   500, 180, 2, '{"qi": 500}'),
  ('Greater Qi Pill',     'An advanced pill for high-realm cultivators.',               'rare',     'consumable', true,  2000, 700, 4, '{"qi": 3000}'),
  ('Minor HP Tonic',      'A herbal tonic that restores a small amount of vitality.',   'common',   'consumable', true,   200,  70, 1, '{"hp": 20}'),
  ('Vitality Elixir',     'Restores HP and provides a brief boost to endurance.',       'uncommon', 'consumable', true,   700, 250, 2, '{"hp": 60, "endurance": 1}'),
  ('Foundation Pill',     'Slowly builds the body''s internal strength.',              'uncommon', 'consumable', true,  1200, 400, 2, '{"strength": 1, "endurance": 1}'),
  ('Spirit Clarity Pill', 'Clears the mind and sharpens spiritual perception.',        'rare',     'consumable', true,  3000,1000, 3, '{"spirit": 2, "exp": 500}'),
  ('Combat Stimulant',    'A dangerous brew that sharpens reflexes before battle.',    'uncommon', 'consumable', true,   900, 300, 2, '{"agility": 1, "crit_chance": 2}')

ON CONFLICT (name) DO NOTHING;

-- ============================================================
--  Done.  Run this file in the Supabase SQL editor.
-- ============================================================
