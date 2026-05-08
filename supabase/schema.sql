-- ============================================================
--  ETERNAL DAO — CANONICAL SCHEMA (Build Plan v1)
--  Applied via Supabase MCP migrations. This file is the
--  source-of-truth reference — do not run it raw without
--  first dropping existing tables.
--
--  Tables: players, characters, realms, sects, sect_members,
--          items, inventory, combat_log, techniques, events
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PLAYERS ────────────────────────────────────────────────
CREATE TABLE players (
  discord_id    TEXT        PRIMARY KEY,
  username      TEXT        NOT NULL,
  discriminator TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CHARACTERS ─────────────────────────────────────────────
CREATE TABLE characters (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id             TEXT        NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
  server_id             TEXT        NOT NULL,
  realm_level           INT         NOT NULL DEFAULT 1,
  qi_current            BIGINT      NOT NULL DEFAULT 0,
  qi_max                BIGINT      NOT NULL DEFAULT 1000,
  cultivation_rate      INT         NOT NULL DEFAULT 10,
  spirit_root           TEXT        NOT NULL DEFAULT 'mortal',
  breakthrough_attempts INT         NOT NULL DEFAULT 0,
  titles                TEXT[]      DEFAULT '{}',
  cosmetic_aura         TEXT,
  pvp_wins               INT         NOT NULL DEFAULT 0,
  pvp_losses             INT         NOT NULL DEFAULT 0,
  cultivation_started_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  last_seen             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, server_id)
);
CREATE INDEX idx_characters_server_id   ON characters(server_id);
CREATE INDEX idx_characters_realm_level ON characters(realm_level DESC);

-- ── 3. REALMS ─────────────────────────────────────────────────
CREATE TABLE realms (
  id          INT     PRIMARY KEY,
  name        TEXT    NOT NULL,
  min_qi      BIGINT  NOT NULL,
  max_qi      BIGINT,
  description TEXT,
  lore_text   TEXT
);

-- ── 4. SECTS ──────────────────────────────────────────────────
CREATE TABLE sects (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id          TEXT        NOT NULL,
  name               TEXT        NOT NULL,
  leader_id          UUID        REFERENCES characters(id) ON DELETE SET NULL,
  description        TEXT,
  banner_url         TEXT,
  cosmetic_banner_id TEXT,
  member_count       INT         NOT NULL DEFAULT 1,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);
CREATE INDEX idx_sects_server_id ON sects(server_id);

-- ── 5. SECT MEMBERS ───────────────────────────────────────────
CREATE TABLE sect_members (
  sect_id      UUID REFERENCES sects(id)      ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'disciple',
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sect_id, character_id)
);

-- ── 6. ITEMS ──────────────────────────────────────────────────
CREATE TABLE items (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT    NOT NULL UNIQUE,
  type                TEXT    NOT NULL,
  rarity              TEXT    NOT NULL,
  effect_json         JSONB,
  cosmetic_url        TEXT,
  price_spirit_stones INT,
  is_premium          BOOLEAN DEFAULT FALSE
);

-- ── 7. INVENTORY ──────────────────────────────────────────────
CREATE TABLE inventory (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      UUID        NOT NULL REFERENCES items(id),
  quantity     INT         NOT NULL DEFAULT 1,
  acquired_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, item_id)
);

-- ── 8. COMBAT LOG ─────────────────────────────────────────────
CREATE TABLE combat_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id UUID        NOT NULL REFERENCES characters(id),
  defender_id UUID        NOT NULL REFERENCES characters(id),
  server_id   TEXT        NOT NULL,
  seed        BIGINT      NOT NULL,
  winner_id   UUID        REFERENCES characters(id),
  log_json    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_combat_log_server_id  ON combat_log(server_id);
CREATE INDEX idx_combat_log_created_at ON combat_log(created_at DESC);

-- ── 9. TECHNIQUES ─────────────────────────────────────────────
CREATE TABLE techniques (
  id                UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT  NOT NULL UNIQUE,
  realm_required    INT   NOT NULL DEFAULT 1,
  qi_cost           INT   NOT NULL,
  damage_multiplier FLOAT NOT NULL DEFAULT 1.0,
  description       TEXT
);

-- ── 10. EVENTS ────────────────────────────────────────────────
CREATE TABLE events (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id  TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  data_json  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_events_server_id ON events(server_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sect_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE realms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE techniques   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;

-- Bootstrap policies (Phase 0) — replaced with user-scoped policies in Phase 2
CREATE POLICY "bootstrap_players"      ON players      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bootstrap_characters"   ON characters   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bootstrap_sects"        ON sects        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bootstrap_sect_members" ON sect_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bootstrap_inventory"    ON inventory    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bootstrap_combat_log"   ON combat_log   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_realms"          ON realms       FOR SELECT USING (true);
CREATE POLICY "public_items"           ON items        FOR SELECT USING (true);
CREATE POLICY "public_techniques"      ON techniques   FOR SELECT USING (true);
CREATE POLICY "public_events"          ON events       FOR SELECT USING (true);

-- ── SEED DATA — Realm Ladder ──────────────────────────────────
INSERT INTO realms (id, name, min_qi, max_qi) VALUES
  (1,  'Mortal Refinement',         0,           999),
  (2,  'Qi Condensation',           1000,        4999),
  (3,  'Foundation Establishment',  5000,        19999),
  (4,  'Core Formation',            20000,       99999),
  (5,  'Nascent Soul',              100000,      499999),
  (6,  'Soul Transformation',       500000,      1999999),
  (7,  'Void Refinement',           2000000,     9999999),
  (8,  'Body Integration',          10000000,    49999999),
  (9,  'Mahayana',                  50000000,    199999999),
  (10, 'Tribulation Transcendence', 200000000,   NULL);
