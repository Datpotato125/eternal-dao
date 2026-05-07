# Eternal Dao — Master Build Plan

> **Working Title:** Eternal Dao  
> **Genre:** Cultivation RPG (Xianxia / Wuxia)  
> **Platforms:** Discord Bot · Website (Next.js) · Mobile (React Native/Expo) · Desktop (Electron)  
> **Budget:** $0/month  
> **Status:** Discord bot exists and runs as NSSM Windows service  
> **Last Updated:** 2026-05-06

---

## Table of Contents

1. [Why This Works](#1-why-this-works)
2. [Complete Free Tier Budget](#2-complete-free-tier-budget)
3. [Supabase Schema](#3-supabase-schema)
4. [Build Order & Dependencies](#4-build-order--dependencies)
5. [Phase-by-Phase Plan](#5-phase-by-phase-plan)
6. [Monetization Strategy](#6-monetization-strategy)
7. [Oracle Cloud Migration](#7-oracle-cloud-migration)
8. [Key Technical Challenges](#8-key-technical-challenges)
9. [Launch Strategy](#9-launch-strategy)

---

## 1. Why This Works

### Discord-First Is a Superpower

Most games build a Discord server _after_ they have a player base. Eternal Dao inverts this — the game _lives inside_ Discord, where the cultivation community already hangs out. This means:

- **Zero cold-start friction.** A player types `/cultivate` in a server they're already in. No download, no account, no barrier.
- **Viral by default.** Every `/fight` result, every realm breakthrough, every sect rivalry plays out in public channels. Other members see it and join.
- **Multi-server isolation creates local communities.** Each Discord server has its own isolated world state — its own sects, its own leaderboard, its own politics. This makes every server feel like a home realm while the global leaderboard connects them all.
- **Existing distribution channels.** top.gg, Discord Bot List, and bot-discovery Discord servers are free marketing pipelines.

### Cultivation Genre Fit

Cultivation fiction (xianxia, wuxia) has a dedicated and underserved gaming audience:

- **RoyalRoad** has thousands of cultivation web serials with passionate readership.
- **r/xianxia** has 250K+ subscribers hungry for game recommendations.
- The genre's inherent mechanics — incremental Qi accumulation, realm breakthroughs, sect politics, cultivator combat — map perfectly onto RPG loops without needing to invent new genre conventions.
- Offline Qi accumulation (idle-game feel) creates daily re-engagement: players check back to see how much they've cultivated.

### Free Tier Viability

This project is designed to scale from 0 to ~5,000 monthly active users entirely on free infrastructure. Every service in the stack has a free tier that is genuinely generous at indie scale:

- Oracle Cloud's Always-Free ARM VM (4 OCPU, 24GB RAM) is a real production server — it outperforms most paid VPS options at $5–10/month.
- Supabase's free tier (500MB, 50K MAU) is sufficient for hundreds of servers and thousands of characters.
- Vercel's free hobby tier handles Next.js with ISR at low-to-moderate traffic without issue.
- The first dollar of cost only appears when the project has enough players to justify it — a good problem to have.

---

## 2. Complete Free Tier Budget

| Service | Purpose | Free Tier Limits | When You'll Hit It | Upgrade Path |
|---|---|---|---|---|
| **Supabase** | Database, Auth, Realtime, Edge Functions | 500MB DB, 1GB storage, 50K MAU, 2M Edge Function invocations/month | ~2,000+ active characters across servers | Supabase Pro: $25/month (8GB DB, 100K MAU) |
| **Oracle Cloud** | Discord bot + API server (ARM VM) | Always Free: 4 OCPU, 24GB RAM, 200GB storage | Never — always free, no expiry | Upgrade OCPU/RAM shape if needed (~$5–10/month) |
| **Vercel** | Next.js website hosting | 100GB bandwidth, unlimited deploys, ISR | ~100K+ page views/month | Vercel Pro: $20/month |
| **Expo EAS Build** | React Native builds + OTA updates | 30 builds/month | Active development with frequent releases | EAS Production: $29/month |
| **Groq API** | LLM flavor text, NPC dialogue (LLaMA) | Generous free tier (rate-limited, not metered) | High traffic generating flavor text | Groq paid: per-token pricing, very cheap |
| **Algolia** | Lore wiki search | 10K records, 10K searches/month | ~1,000+ wiki pages + active players | Algolia Standard: $0.50/1K searches |
| **Discord** | OAuth provider, bot platform | Free forever | Never | N/A |
| **GitHub** | Source control, CI/CD Actions | Unlimited public repos, 2K Actions minutes/month | Active CI runs | GitHub Pro: $4/month |
| **Electron** | Desktop app | Free (open source) | Never | N/A |
| **FCM / APNs** | Push notifications (mobile) | Free | Never | N/A |

**Total: $0/month**

### When Free Tiers Break and What To Do

**Supabase DB storage (500MB):** The biggest risk. `combat_log` with full `log_json` is the killer. Mitigation: compress log_json, only store final state + seed (the seed lets you replay it), archive old logs to storage after 30 days. With compression you can support ~50K fights before hitting 500MB.

**Supabase MAU (50K):** Each user who calls any authenticated Supabase endpoint in a month counts. At 50K you have a successful game — upgrade to Pro at $25/month.

**Groq rate limits:** Free tier has per-minute rate limits. Solution: queue flavor text generation, don't block commands on AI responses. Generate flavor text async and follow-up with a Discord edit to the bot response.

**Algolia records (10K):** Only use Algolia for the lore wiki, not for player/character search (use Supabase full-text search for that). 10K lore records is extremely generous.

---

## 3. Supabase Schema

### Full Table Definitions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players: one row per Discord account (global, not per-server)
CREATE TABLE players (
  discord_id    TEXT PRIMARY KEY,           -- Discord user ID (snowflake)
  username      TEXT NOT NULL,
  discriminator TEXT,                        -- Legacy discriminator (0 for new accounts)
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW()
);

-- Characters: one per player per server (isolated world state)
CREATE TABLE characters (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id            TEXT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
  server_id            TEXT NOT NULL,        -- Discord guild ID
  realm_level          INT NOT NULL DEFAULT 1,
  qi_current           BIGINT NOT NULL DEFAULT 0,
  qi_max               BIGINT NOT NULL DEFAULT 1000,
  cultivation_rate     INT NOT NULL DEFAULT 10, -- Qi per hour (base)
  spirit_root          TEXT NOT NULL DEFAULT 'mortal', -- mortal, wood, fire, water, metal, earth, chaos
  breakthrough_attempts INT NOT NULL DEFAULT 0,
  titles               TEXT[] DEFAULT '{}',
  cosmetic_aura        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, server_id)
);
CREATE INDEX idx_characters_server_id ON characters(server_id);
CREATE INDEX idx_characters_realm_level ON characters(realm_level DESC);

-- Realms: static reference data (seeded, not user-generated)
CREATE TABLE realms (
  id          INT PRIMARY KEY,
  name        TEXT NOT NULL,             -- e.g. "Qi Condensation", "Foundation Establishment"
  min_qi      BIGINT NOT NULL,
  max_qi      BIGINT NOT NULL,
  description TEXT,
  lore_text   TEXT
);

-- Sects: player-created factions, isolated per server
CREATE TABLE sects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  leader_id    UUID REFERENCES characters(id) ON DELETE SET NULL,
  description  TEXT,
  banner_url   TEXT,
  cosmetic_banner_id TEXT,               -- Premium cosmetic reference
  member_count INT NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);
CREATE INDEX idx_sects_server_id ON sects(server_id);

-- Sect Members: many-to-many with role
CREATE TABLE sect_members (
  sect_id     UUID REFERENCES sects(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'disciple', -- disciple, elder, ancestor, sect_master
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sect_id, character_id)
);

-- Items: item definitions (static catalog)
CREATE TABLE items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL UNIQUE,
  type                TEXT NOT NULL,      -- consumable, equipment, cosmetic, material
  rarity              TEXT NOT NULL,      -- common, uncommon, rare, epic, legendary
  effect_json         JSONB,              -- { "qi_boost": 500, "duration_seconds": 3600 }
  cosmetic_url        TEXT,
  price_spirit_stones INT,
  is_premium          BOOLEAN DEFAULT FALSE
);

-- Inventory: character item ownership
CREATE TABLE inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES items(id),
  quantity     INT NOT NULL DEFAULT 1,
  acquired_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, item_id)
);

-- Combat Log: every fight result, with full replay capability
CREATE TABLE combat_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id UUID NOT NULL REFERENCES characters(id),
  defender_id UUID NOT NULL REFERENCES characters(id),
  server_id   TEXT NOT NULL,
  seed        BIGINT NOT NULL,           -- RNG seed — deterministic replay from this
  winner_id   UUID REFERENCES characters(id),
  log_json    JSONB,                     -- Compressed round-by-round summary
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_combat_log_server_id ON combat_log(server_id);
CREATE INDEX idx_combat_log_created_at ON combat_log(created_at DESC);

-- Techniques: learnable combat moves
CREATE TABLE techniques (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL UNIQUE,
  realm_required    INT NOT NULL DEFAULT 1,
  qi_cost           INT NOT NULL,
  damage_multiplier FLOAT NOT NULL DEFAULT 1.0,
  description       TEXT
);

-- Events: server-level world events (boss spawns, double-Qi periods, etc.)
CREATE TABLE events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id  TEXT NOT NULL,
  type       TEXT NOT NULL,              -- qi_storm, demon_invasion, breakthrough_festival
  data_json  JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_events_server_id ON events(server_id);
```

### Row-Level Security (RLS) Notes

```sql
-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sect_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_log ENABLE ROW LEVEL SECURITY;

-- Players can read their own row; service role can write all
CREATE POLICY "players_read_own" ON players
  FOR SELECT USING (discord_id = auth.uid()::text);

-- Characters: players read their own; leaderboard queries use service role
CREATE POLICY "characters_read_own" ON characters
  FOR SELECT USING (player_id = auth.uid()::text);

-- Public leaderboard: all characters readable (no auth required for SELECT)
CREATE POLICY "characters_leaderboard" ON characters
  FOR SELECT USING (true);  -- Adjust if you want server-scoped public reads only

-- Bot and API server always use the SERVICE_ROLE_KEY — bypasses RLS entirely
-- Frontend (website/mobile) uses ANON_KEY — subject to RLS policies above
```

> **Important:** The Discord bot and all server-side processes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Client-facing surfaces (website, mobile) use `SUPABASE_ANON_KEY` with RLS enforced. Never expose the service role key in client bundles.

---

## 4. Build Order & Dependencies

```
Phase 0 (Infrastructure)
  └── Phase 1 (Discord Bot + Oracle Migration)
        ├── Phase 2 (Website v1)      [needs: auth, DB, leaderboard data]
        ├── Phase 3 (Mobile v1)       [needs: auth, DB, realtime, push infra]
        └── Phase 4 (Desktop v1)      [needs: auth, DB, combat system, items]
              └── Phase 5 (Polish + Monetization)  [needs: all platforms live]
```

### Hard Dependencies per Phase

| Phase | Must Exist Before Starting |
|---|---|
| Phase 0 | Nothing — this IS the foundation |
| Phase 1 | Supabase project live, schema migrated, Oracle VM provisioned |
| Phase 2 | Discord OAuth app configured, `players` + `characters` tables populated, leaderboard data exists |
| Phase 3 | Website auth flow tested, Supabase Realtime enabled, FCM/APNs credentials obtained |
| Phase 4 | Combat system finalized and seeded RNG locked in, items table seeded |
| Phase 5 | All 4 platforms minimally functional, at least 50 active players |

---

## 5. Phase-by-Phase Plan

---

### Phase 0 — Infrastructure (1 week)

**Goal:** Every environment exists. No code blocked by missing config.

#### Tasks

- [ ] Create Supabase project, note connection strings and API keys
- [ ] Run schema migration (all CREATE TABLE statements from §3)
- [ ] Configure RLS policies
- [ ] Provision Oracle Cloud Always-Free ARM VM (see §7 for exact steps)
- [ ] Set up SSH access, configure firewall rules (ports 22, 80, 443, 3000)
- [ ] Create GitHub repo(s) — recommended: monorepo with `apps/bot`, `apps/web`, `apps/mobile`, `apps/desktop`, `packages/shared`
- [ ] Document all environment variables in a `.env.example` (never commit real values)
- [ ] Register Discord application at discord.com/developers, note Client ID + Secret
- [ ] Create Groq API account, note API key
- [ ] Set up GitHub Actions secrets for CI/CD

#### Environment Variables (document in `.env.example`)

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=

# Groq
GROQ_API_KEY=

# Algolia
ALGOLIA_APP_ID=
ALGOLIA_SEARCH_ONLY_KEY=
ALGOLIA_ADMIN_KEY=

# NextAuth (website)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# JWT (desktop + API)
JWT_SECRET=
```

#### Definition of Done

- `psql $SUPABASE_URL -c "\dt"` shows all 10 tables
- Oracle VM is reachable via SSH
- GitHub repo has initial commit with monorepo structure
- All env vars documented, shared securely (1Password, Bitwarden, or Doppler)

---

### Phase 1 — Discord Bot Complete + Oracle Migration (3–4 weeks)

**Goal:** The full game loop runs on Discord, hosted on Oracle Cloud via PM2.

#### Tasks

**Oracle Migration (Week 1)**
- [ ] Install Node.js 20 LTS on Oracle ARM VM
- [ ] Install PM2 globally (`npm install -g pm2`)
- [ ] Clone bot repo, install dependencies
- [ ] Copy `.env` to VM (use `scp` or secrets manager)
- [ ] `pm2 start src/index.js --name eternal-dao-bot`
- [ ] `pm2 startup` → enable auto-restart on reboot
- [ ] Verify bot comes online in Discord
- [ ] Remove NSSM service from Windows (keep bot running on Oracle)

**Discord Commands (Week 1–2)**

| Command | Description |
|---|---|
| `/cultivate` | Accumulate Qi passively; update `qi_current`, trigger breakthrough check |
| `/fight @target` | Initiate combat; generate seed, run deterministic resolver, log result |
| `/sect create <name>` | Create a new sect for this server |
| `/sect join <name>` | Join an existing sect |
| `/sect info [name]` | View sect details and members |
| `/realm` | View realm progression ladder, your current position |
| `/inventory` | List items in your character's inventory |
| `/leaderboard` | Top 10 by realm level (server-scoped + global option) |
| `/meditate` | Spend Qi on a technique; flavor text via Groq |

**Combat System (Week 2–3)**
- [ ] Implement seeded RNG (see §8 for exact code pattern)
- [ ] Build combat resolver: round-by-round simulation using seed
- [ ] Store `seed` + `winner_id` + compressed `log_json` in `combat_log`
- [ ] Auto-resolve in bot; emit result embed to Discord channel

**Groq Integration (Week 3)**
- [ ] Async flavor text generation (don't block commands)
- [ ] Bot replies immediately, then edits message with AI flavor text when ready
- [ ] Prompts: cultivation flavor, fight narration, breakthrough ceremony text

**Multi-Server Isolation (Week 3–4)**
- [ ] All DB queries filter by `server_id` (guild.id from Discord interaction)
- [ ] Sects, leaderboards, events are per-server
- [ ] Global leaderboard: query `characters` without server filter, JOIN players for usernames

#### Definition of Done

- All 8 commands work in a test server
- `/fight` results are deterministic (same seed = same result, verified)
- PM2 process survives a VM reboot
- Multi-server test: same player has different character state in two different test servers
- `combat_log` table has entries; `log_json` stores round data

---

### Phase 2 — Website v1 (3–4 weeks)

**Goal:** A beautiful web presence that serves as the game's public face and data viewer.

#### Tasks

- [ ] `npx create-next-app@14 apps/web --typescript --tailwind --app`
- [ ] Install and configure NextAuth with Discord OAuth provider
- [ ] Implement Discord OAuth callback: upsert to `players` table on first login
- [ ] **Leaderboard page** (`/leaderboard`) — ISR, `revalidate: 60`
  - Server-scoped (Discord guild selector) + global tab
  - Columns: rank, avatar, username, realm, sect, Qi level
- [ ] **Character Profile** (`/profile/[discord_id]`) — character stats, sect, combat history
- [ ] **Sect Pages** (`/sect/[id]`) — sect info, member roster, recent combat log
- [ ] **Realm Map** (`/realms`) — visual progression ladder (CSS/SVG, no canvas needed)
- [ ] **Lore Wiki** (`/lore`) — static MDX pages, Algolia search
- [ ] **Shop page** (`/shop`) — cosmetic browsing (purchase flow in Phase 5)
- [ ] **Patreon page** (`/patreon`) — tier listing, benefits
- [ ] Apply Cinzel font (Google Fonts), ink-wash CSS aesthetic (dark bg, muted golds, aged parchment tones)

#### Key Implementation Notes

```ts
// app/leaderboard/page.tsx — ISR example
export const revalidate = 60; // Regenerate every 60 seconds

export default async function LeaderboardPage() {
  const { data } = await supabase
    .from('characters')
    .select('*, players(username, avatar_url)')
    .order('realm_level', { ascending: false })
    .order('qi_current', { ascending: false })
    .limit(100);

  return <LeaderboardTable rows={data} />;
}
```

#### Definition of Done

- Website deployed to Vercel, accessible at `eternaldao.vercel.app` (custom domain optional)
- Discord OAuth login works; user sees their character stats
- Leaderboard auto-refreshes without a deploy
- All pages render correctly on mobile viewport

---

### Phase 3 — Mobile v1 (5–6 weeks)

**Goal:** A companion app that keeps players engaged between Discord sessions.

#### Tasks

- [ ] `npx create-expo-app apps/mobile --template`
- [ ] Install: `zustand`, `@tanstack/react-query`, `@supabase/supabase-js`, `expo-notifications`, `react-native-mmkv`
- [ ] Discord OAuth mobile flow (Expo AuthSession + PKCE)
- [ ] Character dashboard screen — realm, Qi, cultivation rate, sect
- [ ] Qi status bar with offline accumulation counter (V2: time-delta on reconnect)
- [ ] Push notification setup (FCM for Android, APNs for iOS)
  - Notify on: fight challenge received, breakthrough available, sect message
- [ ] Combat viewer — read-only log of recent fights, formatted as turn-by-turn narration
- [ ] Sect chat — read + post messages (Supabase Realtime channel per sect)
- [ ] Realm map screen — tap a realm to see lore description
- [ ] EAS Build config (`eas.json`), set up TestFlight + Google Play internal testing

#### Offline Qi Accumulation (V2 — implement in this phase)

```ts
// Called on app foreground / reconnect
async function syncOfflineQi(characterId: string) {
  const { data: char } = await supabase
    .from('characters')
    .select('qi_current, cultivation_rate, last_seen')
    .eq('id', characterId)
    .single();

  const nowMs = Date.now();
  const lastSeenMs = new Date(char.last_seen).getTime();
  const elapsedMs = Math.min(nowMs - lastSeenMs, 8 * 60 * 60 * 1000); // Cap at 8 hours

  const qiGained = Math.floor(char.cultivation_rate * (elapsedMs / 1000 / 3600));

  await supabase
    .from('characters')
    .update({
      qi_current: Math.min(char.qi_current + qiGained, char.qi_max),
      last_seen: new Date(nowMs).toISOString()
    })
    .eq('id', characterId);
}
```

#### Definition of Done

- App installs on iOS (TestFlight) and Android (internal track)
- Character data loads correctly after Discord OAuth login
- Push notification received when another player challenges you to a fight (via Discord bot)
- Sect chat messages appear in real time via Supabase Realtime

---

### Phase 4 — Desktop v1 (8–10 weeks)

**Goal:** The premium experience — manual combat, visualized world, full sect management.

#### Tasks

- [ ] `npx create-electron-app apps/desktop --template=vite` (or Electron Forge with React)
- [ ] Set up React in renderer process, Redux Toolkit for global state
- [ ] Discord OAuth + JWT flow (open external browser for OAuth, redirect back via deep link)
- [ ] **Manual Combat System** — the flagship Desktop feature
  - Player chooses actions each round (technique, defend, flee, item use)
  - Pixi.js canvas renders combat animations (particle effects, Qi surges)
  - Same seeded RNG as auto-resolve — seed stored; seed + player choices = final outcome
  - When challenge accepted on Desktop, fight enters manual mode (15s per turn timer)
- [ ] **World Map** — Pixi.js canvas showing realm zones, server population heatmap
- [ ] **Cultivation Dashboard** — animated Qi gauge, technique tree, spirit root visualization
- [ ] **Sect Management Panel** — recruit, promote, demote, disband, set banner
- [ ] **Trading Post** — list items for spirit stones, browse listings, execute trades
- [ ] Electron Forge packaging → Windows NSIS installer → GitHub Releases

#### Pixi.js Combat Setup

```ts
// renderer/combat/CombatStage.tsx
import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
  width: 800, height: 500,
  backgroundColor: 0x0a0a1a,
  antialias: true
});

// Qi particle emitter — one per fighter
function createQiAura(color: number): PIXI.Graphics {
  const gfx = new PIXI.Graphics();
  gfx.beginFill(color, 0.3);
  gfx.drawCircle(0, 0, 40);
  gfx.endFill();
  return gfx;
}
```

#### Definition of Done

- Desktop app installs on Windows via GitHub Releases NSIS installer
- Manual combat: player can choose actions each round, combat resolves visually
- Same fight seed produces same winner whether resolved via Discord bot or Desktop manual mode (verified with a test suite)
- Trading post: item listed on Desktop appears in website shop view

---

### Phase 5 — Polish + Monetization (2–3 weeks)

**Goal:** Sustainable revenue, balanced gameplay, public launch.

#### Tasks

- [ ] Cosmetic shop on website — browse auras, titles, banners; Stripe or direct Patreon link
- [ ] Patreon webhook → Supabase Edge Function → grant cosmetics on pledge
- [ ] XP boost pass system (time-limited, stored in inventory with `expires_at`)
- [ ] Balance pass: cultivation rates, combat formula, breakthrough rates by realm
- [ ] Beta launch posts (see §9 for full strategy)
- [ ] Analytics: Supabase Edge Function logging key events (cultivate, fight, breakthrough)

---

## 6. Monetization Strategy

### Core Principle: Never Pay-to-Win

The cultivation loop, combat, leaderboard, and all progression are free. Money buys cosmetics and time-savers only.

### Revenue Streams

#### 1. Cosmetic Auras ($3–$10 one-time)
Visible in combat log embeds, character profiles, and Desktop combat animations. Examples: Phoenix Flame Aura, Void Shroud Aura, Heavenly Thunder Aura. Stored as `cosmetic_aura` on the `characters` table. Implementation: Stripe checkout → Supabase webhook → update character.

#### 2. Titles & Honorifics ($2–$5 one-time)
Displayed next to username in leaderboards, sect pages, Discord embeds. Examples: "Void Sovereign", "Dao Heart Cultivator", "Heaven Defying Demon". Stored in `characters.titles[]` array.

#### 3. Custom Sect Banners ($5–$15 one-time per sect)
Premium banner image for a sect's profile page and Discord embeds. Leaders purchase for their sect. Stored as `sects.cosmetic_banner_id`.

#### 4. XP Boost Passes ($5 per pass)
A 24-hour or 72-hour multiplier on cultivation rate (e.g., 2× Qi gain). Time-limited, non-stackable. Not permanent — a player who doesn't buy passes eventually reaches the same realm. Implementation: item in `inventory` with `effect_json: { "cultivation_multiplier": 2, "expires_at": "..." }`. Bot reads this on `/cultivate`.

#### 5. Patreon Tiers (recurring)

| Tier | Price | Benefits |
|---|---|---|
| **Disciple** | $3/month | Monthly cosmetic aura drop, Disciple title, discord role |
| **Elder** | $10/month | All Disciple benefits + monthly XP boost pass + Elder title |
| **Ancestor** | $25/month | All Elder benefits + custom title + priority feature input + Ancestor honorific |

**Implementation:** Patreon sends webhooks on pledge/unpledge. A Supabase Edge Function receives the webhook, maps Patreon email → Discord account (player must link in their profile), grants/revokes cosmetics.

### Revenue Projections (Conservative)

| Stage | Active Players | Monthly Revenue Target |
|---|---|---|
| Early Access | 50–200 | $50–$200/month (Patreon + casual purchases) |
| Growth | 500–2,000 | $300–$1,200/month |
| Established | 5,000+ | $1,500–$5,000/month |

At 5,000 MAU with 5% conversion at $5 average: ~$1,250/month. At this scale, upgrade to Supabase Pro ($25/month) and Vercel Pro ($20/month). Net: ~$1,200+/month.

---

## 7. Oracle Cloud Migration

Step-by-step: move the Discord bot from NSSM Windows service to PM2 on Oracle Cloud Always-Free ARM VM.

### Step 1 — Provision the VM

1. Log in to [cloud.oracle.com](https://cloud.oracle.com)
2. Compute → Instances → Create Instance
3. Shape: **VM.Standard.A1.Flex** (Always Free) — 4 OCPU, 24GB RAM
4. Image: **Ubuntu 22.04 LTS (aarch64)**
5. Add your SSH public key during setup
6. Note the public IP address

### Step 2 — Configure Firewall Rules

In Oracle Console → Networking → Virtual Cloud Networks → Security Lists:

```
Ingress Rules:
  TCP  22    0.0.0.0/0   (SSH)
  TCP  80    0.0.0.0/0   (HTTP, optional)
  TCP  443   0.0.0.0/0   (HTTPS, optional)
  TCP  3000  0.0.0.0/0   (API server, lock down later)
```

Also enable in the OS firewall:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

### Step 3 — Provision the Server

```bash
# SSH in
ssh ubuntu@<YOUR_VM_IP>

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # v20.x.x
npm --version

# Install PM2
npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 4 — Deploy the Bot

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/eternal-dao.git
cd eternal-dao/apps/bot

# Install dependencies
npm install

# Create .env file (copy from your secure store)
nano .env
# Paste all environment variables, save with Ctrl+X

# Test the bot starts correctly
node src/index.js
# Verify it connects to Discord, then Ctrl+C
```

### Step 5 — Start with PM2

```bash
# Start the bot
pm2 start src/index.js --name eternal-dao-bot --watch

# View logs
pm2 logs eternal-dao-bot

# Save process list
pm2 save

# Enable auto-start on reboot
pm2 startup
# Copy and run the command PM2 outputs
```

### Step 6 — Verify & Cutover

```bash
# Check status
pm2 status

# Tail live logs
pm2 logs --lines 50

# Simulate reboot test
sudo reboot
# SSH back in after 30s
pm2 status  # eternal-dao-bot should be "online"
```

### Step 7 — Decommission NSSM on Windows

Once PM2 on Oracle is confirmed stable for 24 hours:

```powershell
# On Windows — stop and remove NSSM service
nssm stop EternalDaoBot
nssm remove EternalDaoBot confirm
```

### Step 8 — Set Up a Deploy Script

```bash
# /home/ubuntu/deploy.sh
#!/bin/bash
cd /home/ubuntu/eternal-dao
git pull origin main
cd apps/bot
npm install --production
pm2 restart eternal-dao-bot
echo "Deploy complete at $(date)"
```

Trigger this from GitHub Actions on push to `main`:

```yaml
# .github/workflows/deploy-bot.yml
name: Deploy Bot
on:
  push:
    branches: [main]
    paths: ['apps/bot/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.ORACLE_VM_IP }}
          username: ubuntu
          key: ${{ secrets.ORACLE_SSH_KEY }}
          script: bash /home/ubuntu/deploy.sh
```

---

## 8. Key Technical Challenges

### Challenge 1: Seeded RNG Combat Determinism

**Problem:** A fight initiated on Discord (auto-resolve) must produce the exact same winner as the same fight replayed on Desktop (manual). Both use the same seed.

**Solution:** Use a seedable pseudo-random number generator (PRNG) — not `Math.random()`.

```ts
// packages/shared/src/rng.ts
// Mulberry32 — fast, seedable, deterministic across platforms
export function mulberry32(seed: number) {
  return function(): number {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Usage in combat resolver
export function resolveCombat(attackerId: string, defenderId: string, seed: number, rounds: number = 10) {
  const rng = mulberry32(seed);
  const log: CombatRound[] = [];

  for (let i = 0; i < rounds; i++) {
    const attackRoll = rng();
    const defendRoll = rng();
    // ... combat logic using only rng() for all randomness
    log.push({ round: i + 1, attackRoll, defendRoll });
  }

  return { winner: ..., log };
}

// Seed generation — use Unix timestamp + both character IDs
export function generateCombatSeed(attackerId: string, defenderId: string): number {
  const ts = Date.now();
  const hash = [...attackerId, ...defenderId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (ts + hash) & 0x7FFFFFFF; // Keep positive 32-bit int
}
```

**Key rule:** The combat resolver must be in `packages/shared` and imported identically by Discord bot, website, mobile, and desktop. No platform-specific combat logic.

---

### Challenge 2: Offline Qi Math

**Formula:**

```
qi_gained = cultivation_rate × (now_ms - last_seen_ms) / 1_000 / 3_600
```

- `cultivation_rate` is in Qi per hour
- Result is floored (no fractional Qi)
- Capped at 8 hours to prevent abuse (max offline gain = `cultivation_rate × 8`)

```ts
// packages/shared/src/cultivation.ts
export function calculateOfflineQi(
  cultivationRate: number,      // qi per hour
  lastSeenMs: number,           // Unix timestamp ms
  nowMs: number = Date.now(),
  capHours: number = 8
): number {
  const elapsedMs = Math.min(nowMs - lastSeenMs, capHours * 60 * 60 * 1000);
  const elapsedHours = elapsedMs / 1000 / 3600;
  return Math.floor(cultivationRate * elapsedHours);
}
```

**When to run:** On Discord `/cultivate` command, on mobile app foreground, on website character page load. Always update `last_seen` after crediting Qi.

---

### Challenge 3: Multi-Server Isolation Pattern

Every table that has per-server state carries a `server_id` column. Every query from the bot must include it.

```ts
// packages/shared/src/db.ts

// CORRECT — always pass server_id
async function getCharacter(playerId: string, serverId: string) {
  return supabase
    .from('characters')
    .select('*')
    .eq('player_id', playerId)
    .eq('server_id', serverId)   // ← CRITICAL
    .single();
}

// Global leaderboard — intentionally omits server_id filter
async function getGlobalLeaderboard(limit = 100) {
  return supabase
    .from('characters')
    .select('*, players(username, avatar_url)')
    .order('realm_level', { ascending: false })
    .limit(limit);
}
```

**Lint rule:** Add an ESLint custom rule or a code comment convention flagging any `from('characters')` query that doesn't have `.eq('server_id', ...)` unless it's explicitly labeled as a global query.

---

### Challenge 4: Discord OAuth Across 4 Platforms

One Discord account = one character everywhere. All platforms authenticate via Discord OAuth 2.0.

| Platform | OAuth Flow |
|---|---|
| **Website** | NextAuth Discord provider. Callback: upsert `players` table. Session carries `discord_id`. |
| **Mobile** | Expo AuthSession (PKCE). Same OAuth app. Store refresh token in MMKV. |
| **Desktop** | `shell.openExternal(discordOAuthUrl)`. Deep link callback (`eternaldao://auth/callback`). Exchange code for JWT. |
| **Discord Bot** | No OAuth needed — `interaction.user.id` IS the discord_id. No login flow. |

**Shared callback logic:** When OAuth code is exchanged, the backend:
1. Calls Discord `/api/users/@me` to get user profile
2. Upserts into `players` (discord_id, username, avatar_url)
3. Issues a JWT containing `discord_id`
4. All subsequent API calls authenticate via this JWT

---

### Challenge 5: Supabase Free Tier Limits

| Limit | Mitigation |
|---|---|
| 500MB DB | Compress `log_json` in combat_log. Only store seed + winner + 10-round summary (not full tick data). Archive logs > 90 days to Supabase Storage (1GB). |
| 50K MAU | MAU = any auth call. Discord bot uses service key (not MAU-counted). Website/mobile logins count. You'll have plenty of runway. |
| 2M Edge Function invocations | Only use Edge Functions for Patreon webhooks + push notification triggers. All bot logic runs on Oracle VM. |
| 10GB bandwidth | Use ISR on website — data served from Vercel CDN edge, not Supabase. Mobile uses Supabase Realtime only for sect chat (low volume). |

---

## 9. Launch Strategy

### Pre-Launch Checklist (before any public posts)

- [ ] Discord bot has been running stably for 1 week in at least 3 test servers
- [ ] All 8 bot commands work without errors
- [ ] Website leaderboard is live and populated with test data
- [ ] `/cultivate` → `/fight` → `/sect` full loop works for a new player in under 5 minutes
- [ ] Bot listed on **top.gg** (requires 75 guild minimum — invite to test servers first)
- [ ] Bot listed on **Discord Bot List** (discordbotlist.com)

### Community Targets

| Community | Platform | Approach |
|---|---|---|
| r/xianxia | Reddit | Post "I built a cultivation RPG bot — join my sect" with GIF of bot in action |
| r/discordbots | Reddit | Post to weekly bot showcase thread |
| RoyalRoad forums | Web | Post in the game section; xianxia readers are exactly the audience |
| Cultivation fiction Discord servers | Discord | Ask for a trial run in their general chat |
| Discord Bot List communities | Discord | Engage in bot-discussion channels |
| Webtoon/Manhwa communities | Discord/Reddit | Many xianxia manhwa readers want a game like this |

### Posting Strategy

**Reddit post template (r/xianxia):**

> **I built a Cultivation RPG Discord bot — Eternal Dao** 🌀
>
> Type `/cultivate` to begin. Fight other cultivators. Join sects. Break through to higher realms. Every server has its own isolated world.
>
> [GIF of bot commands in action]
>
> Invite link: [link] | Early players become founding sect leaders.

**Key hook:** The "founding sect leader" mechanic — the first player to `/sect create` on any server becomes that server's first Sect Master. This creates genuine early-adopter prestige that can't be bought.

### First 50 Players Plan

| Milestone | Target | Action |
|---|---|---|
| 1–5 players | Close friends + personal Discord servers | Direct invites, personal testing |
| 5–20 players | Bot listing sites go live | Submit to top.gg, Discord Bot List |
| 20–50 players | First Reddit post | r/xianxia launch post with demo GIF |
| 50 players | **Mobile + Desktop beta launch** | Announce to existing player base |
| 100 players | Community milestones | "Server 1 has its first Foundation Establishment cultivator!" announcement |

### Founding Sect Mechanic

When a server first uses Eternal Dao, the first player to `/sect create` receives:

- **"Founding Ancestor" title** — permanent, non-purchasable
- A unique **Primordial Aura** cosmetic (seeded from their Discord ID)
- Their sect gets a "Founded in the First Age" badge on its sect page
- A special banner slot in the server's #eternal-dao channel description

This mechanic rewards early adopters with genuine social prestige — not power. It creates organic word-of-mouth ("I'm a founding sect leader, you should join").

### Post-50 Players: Growing Virally

Once 50 real players exist across multiple servers:

1. **"Server War" events** — Discord bot posts a global event: two sects from different servers can wage war. Results posted in both servers. Cross-pollination creates new invites.
2. **Realm breakthrough announcements** — When a player reaches a new realm, bot posts to a server channel. Other members see it and want to compete.
3. **Leaderboard rivalry** — Global leaderboard creates aspirational targets. Players recruit friends to help their server compete.

---

## Appendix: Quick Reference

### Realm Ladder (Reference Data)

| Level | Realm Name | Qi Required |
|---|---|---|
| 1 | Mortal Refinement | 0 |
| 2 | Qi Condensation | 1,000 |
| 3 | Foundation Establishment | 5,000 |
| 4 | Core Formation | 20,000 |
| 5 | Nascent Soul | 100,000 |
| 6 | Soul Transformation | 500,000 |
| 7 | Void Refinement | 2,000,000 |
| 8 | Body Integration | 10,000,000 |
| 9 | Mahayana | 50,000,000 |
| 10 | Tribulation Transcendence | 200,000,000 |

### Spirit Roots (Character Trait at Creation)

| Root | Rarity | Cultivation Bonus |
|---|---|---|
| Mortal | Common | Base rate |
| Single Root (Wood/Fire/Water/Metal/Earth) | Uncommon | +20% cultivation rate |
| Dual Root | Rare | +15% rate, special techniques |
| Chaos Root | Legendary | +10% rate, unique techniques, unique cosmetics |

### Key Links

- Supabase Dashboard: [supabase.com/dashboard](https://supabase.com/dashboard)
- Oracle Cloud Console: [cloud.oracle.com](https://cloud.oracle.com)
- Discord Developer Portal: [discord.com/developers/applications](https://discord.com/developers/applications)
- Groq Console: [console.groq.com](https://console.groq.com)
- Expo EAS Dashboard: [expo.dev](https://expo.dev)
- Vercel Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
- top.gg Bot Submission: [top.gg/bot/submit](https://top.gg/bot/submit)

---

*This document is a living reference. Update it as architecture decisions are made, phases complete, and the game grows.*
