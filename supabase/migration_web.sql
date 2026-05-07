-- ============================================================
-- Eternal Dao — Web Platform Migration
-- Run this in the Supabase SQL editor after schema.sql
-- ============================================================

-- ── 1. Link auth users to players ──────────────────────────
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_auth_id_idx ON players(auth_id)
  WHERE auth_id IS NOT NULL;

-- ── 2. Player Settings ─────────────────────────────────────
-- Stores web-only preferences that can't be changed from the bot

CREATE TABLE IF NOT EXISTS player_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Profile
  bio                 TEXT DEFAULT '' CHECK (char_length(bio) <= 300),
  avatar_frame        TEXT DEFAULT 'default',   -- 'default' | 'bronze' | 'silver' | 'gold_animated'
  display_title       TEXT DEFAULT '',          -- custom title string

  -- Realm / Path preferences
  preferred_path      TEXT DEFAULT '',          -- shadow | flame | storm | stone | void | life | time | cosmos
  auto_cultivate      BOOLEAN DEFAULT FALSE,    -- future: auto-start cultivation timer on login

  -- Notification preferences
  notify_level_up     BOOLEAN DEFAULT TRUE,
  notify_combat       BOOLEAN DEFAULT TRUE,
  notify_quests       BOOLEAN DEFAULT TRUE,
  notify_guild        BOOLEAN DEFAULT TRUE,

  -- Privacy
  show_on_leaderboard BOOLEAN DEFAULT TRUE,
  show_stats_public   BOOLEAN DEFAULT FALSE,
  show_guild_public   BOOLEAN DEFAULT TRUE,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_settings_player_idx ON player_settings(player_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_settings_updated_at ON player_settings;
CREATE TRIGGER player_settings_updated_at
  BEFORE UPDATE ON player_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. Subscriptions ───────────────────────────────────────
-- One row per player; tracks their current Stripe subscription state

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id               UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Tier
  tier                    TEXT NOT NULL DEFAULT 'free'
                            CHECK (tier IN ('free', 'bronze', 'silver', 'gold')),

  -- Stripe identifiers
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,

  -- Billing period
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,

  -- Status mirrors Stripe subscription status
  status                  TEXT DEFAULT 'active'
                            CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),

  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_player_idx       ON subscriptions(player_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_sub_idx   ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX        IF NOT EXISTS subscriptions_customer_idx     ON subscriptions(stripe_customer_id);

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. RLS Policies ────────────────────────────────────────
ALTER TABLE player_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;

-- Anon-all (matches existing bot pattern — open access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'player_settings' AND policyname = 'anon-all'
  ) THEN
    CREATE POLICY "anon-all" ON player_settings FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'anon-all'
  ) THEN
    CREATE POLICY "anon-all" ON subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- Authenticated users can only read/write their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'player_settings' AND policyname = 'auth-own'
  ) THEN
    CREATE POLICY "auth-own" ON player_settings FOR ALL TO authenticated
      USING  (player_id IN (SELECT id FROM players WHERE auth_id = auth.uid()))
      WITH CHECK (player_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'auth-own'
  ) THEN
    CREATE POLICY "auth-own" ON subscriptions FOR ALL TO authenticated
      USING  (player_id IN (SELECT id FROM players WHERE auth_id = auth.uid()))
      WITH CHECK (player_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
  END IF;
END;
$$;

-- ── 5. Helper: auto-provision settings row on player insert ─
CREATE OR REPLACE FUNCTION provision_player_defaults()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO player_settings (player_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO subscriptions (player_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_provision_defaults ON players;
CREATE TRIGGER player_provision_defaults
  AFTER INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION provision_player_defaults();

-- ── 6. Back-fill existing players ──────────────────────────
INSERT INTO player_settings (player_id)
SELECT id FROM players
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (player_id, tier, status)
SELECT id, 'free', 'active' FROM players
ON CONFLICT DO NOTHING;

-- ── Done ──────────────────────────────────────────────────
-- Remember to add these env vars to packages/web/.env.local:
--   STRIPE_SECRET_KEY=sk_test_...
--   STRIPE_WEBHOOK_SECRET=whsec_...
--   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
--   STRIPE_BRONZE_PRICE_ID=price_...
--   STRIPE_SILVER_PRICE_ID=price_...
--   STRIPE_GOLD_PRICE_ID=price_...
