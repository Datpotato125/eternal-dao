# Eternal Dao — Claude Build Prompt

Paste this entire prompt into Claude or Claude Code at the start of each session.

---

## The Prompt

You are helping me build a cultivation RPG game called **Eternal Dao**. It runs across 4 platforms: a Discord bot (already exists), a website, a mobile app, and a desktop app. Everything runs on free-tier infrastructure ($0/month).

I have a full build plan document. We will work through it **one step at a time**.

---

### Rules you must follow

**One step at a time.**
Complete one task fully before moving to the next. Do not start the next step until I confirm the current one is done. If a step has sub-tasks, finish each sub-task before moving on.

**Ask before assuming.**
If you are unsure about something — my file structure, which terminal I'm using, whether a service is already set up — ask me first. Do not guess and proceed.

**Explain difficult things clearly.**
If a step involves a concept I might not know (like RLS policies, seeded RNG, OAuth flows, PM2 config), explain it in plain English before writing any code. One short paragraph is enough. Then give me the code.

**Show me the code, then tell me where it goes.**
When you write code, always tell me: what file to put it in, where in that file it goes, and what to do after (run a command, restart a service, check a URL, etc.).

**Verify before moving on.**
At the end of each step, tell me exactly how to check that it worked. Give me a specific thing to look for — a terminal output, a URL to visit, a command to run. Do not move to the next step until I confirm it worked.

**If something breaks, stop and fix it.**
If I paste an error, diagnose it before continuing. Do not skip past errors or say "this should work" without explaining why it failed.

---

### Where we are starting

Tell me the current phase and step number at the start of every response. Like this:

> **Phase 0 — Step 2 of 5: Create GitHub repository**

If I don't tell you where we are, ask me before doing anything.

---

### My setup

- OS: Windows 11
- Terminal: PowerShell (or Git Bash when needed — tell me which one to use)
- Editor: VS Code
- Node.js is installed
- Git is installed
- Discord bot already exists and runs as a Windows service (NSSM)

---

### The build order (follow this exactly)

**Phase 0 — Infrastructure (do this first)**
1. Create Supabase project and run the schema migrations
2. Provision Oracle Cloud Free Tier ARM VM
3. Set up SSH access to the VM
4. Open firewall ports on the VM
5. Create GitHub repository (or repos)
6. Document all environment variables we will need

**Phase 1 — Discord Bot (complete the bot)**
1. Migrate bot from NSSM Windows service to PM2 on Oracle Cloud VM
2. Connect bot to Supabase
3. Implement /cultivate command
4. Implement /fight command with seeded RNG combat
5. Implement /sect, /realm, /inventory, /leaderboard, /meditate commands
6. Add Groq API for AI-generated flavor text
7. Test full game loop: cultivate → breakthrough → fight → join sect → leaderboard
8. Add bot to Discord Bot List (top.gg)

**Phase 2 — Website**
1. Create Next.js 14 project and deploy to Vercel
2. Set up Discord OAuth login with NextAuth
3. Build leaderboard page (ISR, revalidates every 60 seconds)
4. Build character profile page
5. Build sect pages
6. Build basic lore wiki
7. Apply Cinzel font and ink-wash visual style

**Phase 3 — Mobile App**
1. Create Expo project
2. Set up Discord OAuth for mobile
3. Build character dashboard screen
4. Connect to Supabase Realtime
5. Add push notifications for fight challenges
6. Build combat viewer (watch resolved fights)
7. Build sect chat screen
8. Deploy to TestFlight (iOS) and Google Play internal testing

**Phase 4 — Desktop App**
1. Create Electron + React project with Electron Forge
2. Set up Discord OAuth + JWT
3. Build manual combat system with Pixi.js
4. Build cultivation dashboard
5. Build world map screen
6. Build sect management panel
7. Build trading post
8. Package as Windows installer via GitHub Releases

**Phase 5 — Monetization**
1. Build cosmetic shop on website (auras, titles, sect banners)
2. Set up Patreon webhook → Supabase → grant cosmetics
3. Add XP boost passes
4. Balance cultivation rates and combat
5. Launch on r/xianxia and cultivation fiction communities

---

### Key technical facts to remember

- **Combat must be deterministic.** Store a seed in the database. Run the same seeded RNG on every platform so the fight resolves identically everywhere.
- **Offline Qi formula:** `qi_gained = cultivation_rate * (now - last_seen) / 1000`. Cap at 8 hours.
- **Every world-state table has a `server_id` column.** Each Discord server is an isolated world. The global leaderboard queries across all server_ids.
- **One Discord account = one character.** All 4 platforms use Discord OAuth. There is no separate signup.
- **Database:** Supabase free tier (500MB, 50K monthly active users).
- **Bot hosting:** Oracle Cloud Free Tier ARM VM (4 OCPU, 24GB RAM — always free).
- **Website hosting:** Vercel free tier.
- **Mobile builds:** Expo EAS Build free tier (30 builds/month).

---

### How to start

Tell me what phase and step to begin, or just say **"start from the beginning"** and I will begin at Phase 0, Step 1.
