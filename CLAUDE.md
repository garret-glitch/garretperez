# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Garret's World** — Premium dark RPG-themed personal site / interactive community. Garret Perez's professional profile + community blog where users earn XP for posting, cooking recipes, playing mini-games, and daily logins.

- **Live site:** garretperez.com (redirects to www.garretperez.com)
- **Repo:** github.com/garret-glitch/garretperez
- **Hosting:** Vercel (auto-deploys on push to `main` via GitHub integration)
- **Git email:** garret.p92@gmail.com

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **Press Start 2P** (pixel headings) + **Inter** (body text via `.body-text` class)
- **NextAuth.js v5 beta** (`next-auth@beta`) — credentials provider, JWT strategy, `role` field in token/session
- **Prisma v5** ORM + **`@auth/prisma-adapter`**
- **Neon PostgreSQL** (paid plan at neon.tech — was free tier; upgraded after hitting the data-transfer quota) — DATABASE_URL in `.env.local`
- **bcryptjs** — password hashing
- **`gray-matter`** + **`next-mdx-remote/rsc`** — static MDX blog posts
- **`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** — drag-and-drop (builder canvas + About Me bubble reorder)
- **`react-colorful`** — color picker in builder Styles panel
- **`@tiptap/react` + `@tiptap/starter-kit` + extensions** — rich text editor in Text blocks

## Environment variables (required locally)

Create `.env.local` in the project root:
```
DATABASE_URL="postgresql://..."        # from neon.tech
NEXTAUTH_SECRET="..."                  # 32-char hex random string
AUTH_SECRET="..."                      # same value as NEXTAUTH_SECRET (NextAuth v5 uses this name)
NEXTAUTH_URL="http://localhost:3000"
SETUP_ADMIN_USERNAME="..."             # admin account username (spaces allowed)
SETUP_ADMIN_PASSWORD="..."             # admin account password
```

In **Vercel dashboard → Project → Settings → Environment Variables** add these for production:
- `DATABASE_URL` — same Neon connection string
- `AUTH_SECRET` — same secret value
- `NEXTAUTH_URL` — `https://garretperez.com`
- `SETUP_ADMIN_USERNAME` / `SETUP_ADMIN_PASSWORD` — for one-time admin creation

Vercel auto-deploys from `main` via GitHub integration. Project: `garretperez` under team `garretperez`.

**Admin setup:** Visit `/api/setup` once after deploy to create the admin account from env vars. Returns 409 if already exists. Credentials must NEVER be hardcoded in source.

## Project structure

```
prisma/
  schema.prisma         # UserRole enum (USER | ADMIN | SUPERADMIN); User, UserSkill, Post/PostReply/PostUpvote,
                        #   Recipe, SiteSetting, PageBlock, Project, Quest, UserBadge, SkillVisit, Announcement,
                        #   GameBest + BossRun (leaderboards), XpEvent, Plant/GardenPlantType/GardenYardPlant,
                        #   Wine* (Identification/Favorite/Rating/Comment) + FeaturedWine, FishingSpot/FishingTackle,
                        #   CoolItem, BusinessCard, YoutubeChannel, TravelPin, CmsBlogPost, GameLike + NextAuth tables
public/
  resume.docx           # Garret's resume — served as static file
src/
  auth.ts               # NextAuth config — credentials provider, JWT. SUPERADMIN maps to role 'ADMIN' in the
                        #   session (so all admin gates work) + sets a separate session.user.superAdmin flag
  types/
    next-auth.d.ts      # Session type: user.id + user.role + user.superAdmin
    builder.ts          # All builder types: BlockType, AnyBlockConfig, AboutBubble, BlockStyles,
                        #   PageBlock, BlockLiveData, BuilderState, BuilderAction
  app/
    layout.tsx          # Root layout — SiteHeader + flex(SkillsPanel + main). No ContactHeader/Footer.
    page.tsx            # Home dashboard — hero + AccountShield + HomepageBlockRenderer
                        #   Auto-migrates PageBlock records on first visit if table is empty
    resume/page.tsx     # Resume page — experience, skills bars (no numbers/%), other skills tags, download .docx
    admin/page.tsx      # Admin dashboard (ADMIN role only) — settings, users, posts, announcements tabs
    admin/builder/      # Visual page builder (Canva/Notion-style)
      page.tsx          # Server component — fetches PageBlock[], live data, renders BuilderClient
      layout.tsx        # Full-width layout override (no sidebar padding)
      BuilderClient.tsx # 'use client' — owns useReducer(builderReducer), keyboard shortcuts (Ctrl+Z/Y/S)
      builderReducer.ts # All state mutations + undo/redo history stack (past/future PageBlock[][])
      BuilderToolbar.tsx  # Fixed top bar: Save, Undo, Redo, Add Block, Preview, Migrate
      BuilderCanvas.tsx   # DndContext + SortableContext grid canvas (3-col)
      SortableBlock.tsx   # useSortable wrapper + selection ring + action bar per block
      BlockLibraryDrawer.tsx # Left slide-in panel — 13 block types organised by category
      StylesPanel.tsx     # Right drawer — ColSpan, Dimensions, Padding, Background, Border,
                          #   Typography, Effects; react-colorful color picker
    admin/layout/page.tsx # Redirects to /admin/builder
    quest-board/page.tsx  # Quest board — all active quests
    privacy/page.tsx    # Privacy policy — data collected, retention, age requirement (13+), deletion contact
    (auth)/
      login/page.tsx    # Login form (client component)
      register/page.tsx # Registration form (client component) — links to /privacy
    skills/
      [skill]/page.tsx  # Dynamic skill page — posts + PostForm (health, projects, fishing, etc.)
      food/page.tsx     # Cooking skill — recipes + RecipeForm + food posts
      fun/page.tsx      # Fun skill — mini-game hub (admin can upload custom card images)
      fun/wine-trivia/page.tsx  # Wine Trivia quiz (client component)
      fun/matching/page.tsx     # Matching card game (client component)
      fun/whack-a-mole/page.tsx # Whack-a-Mole (synth audio + animation)
      fun/snake/page.tsx        # Snake
      fun/breakout/page.tsx     # Breakout
      fun/pong/page.tsx         # Pong vs CPU
      fun/ballgame/page.tsx     # Ball Game (keep-it-alive)
      fun/dragball/page.tsx     # Drag Ball (dodge enemies, collect coins)
      fun/wine-stocker/page.tsx # Wine Stocker Rush (canvas; 3 strikes = fired)
      fun/dress-empress/page.tsx# Dress-up sandbox (Castle Dress Up)
      fun/boss-hunter/page.tsx  # Boss Hunter — full canvas action-RPG boss-fight game (see "Boss Hunter" section)
      fun/pirate-carnage/page.tsx # Pirate Carnage — canvas action game + 4-boss gauntlet (see "Pirate Carnage" section)
      fun/sunset-drift/page.tsx   # Sunset Drift — top-down arcade street racer + garage (see "Sunset Drift" section)
    blog/page.tsx       # Static MDX blog index
    blog/[slug]/page.tsx  # Individual blog post (statically generated)
    api/
      auth/[...nextauth]/route.ts   # NextAuth handlers
      setup/route.ts                # One-time admin account creation from env vars (force-dynamic — DB route)
      register/route.ts             # Create user + init 9 UserSkill rows
      posts/route.ts                # Create post + award +50 XP to skill (skipped for super admins)
      recipes/route.ts              # Create recipe + award +50 Food XP (skipped for super admins)
      minigame/win/route.ts         # Award +25 Fun XP on game win (skipped for super admins)
      minigame/score/route.ts       # Upsert per-user best score → GameBest (skips super admins)
      minigame/leaderboard/[game]/route.ts # Top-10 scores for a game
      daily-login/route.ts          # Award +10 XP to random skill (once/day; skipped for super admins)
      admin/
        settings/route.ts           # GET/POST site settings (headshot, etc.) — ADMIN only
        users/route.ts              # List all users — ADMIN only
        posts/route.ts              # List all posts — ADMIN only
        announcements/route.ts      # List announcements — ADMIN only
        announcement/route.ts       # POST/DELETE announcements — ADMIN only
        ban-user/route.ts           # Ban/unban user — ADMIN only
        delete-post/route.ts        # Delete post — ADMIN only
        adjust-xp/route.ts          # Manually adjust user XP — ADMIN only
        builder/
          blocks/route.ts   # GET/POST/PUT/DELETE individual PageBlock records
          save/route.ts     # Bulk-save: deletes removed blocks, upserts all incoming blocks
          migrate/route.ts  # One-time POST: seeds PageBlock rows from legacy SiteSetting blobs
          reset/route.ts    # POST: deletes all home PageBlock rows then re-migrates — ADMIN only
  components/
    SiteHeader.tsx      # Ultra-slim sticky nav — "GP" logo, Quests, Resume links, Admin link (role-based), AuthButton
    AuthButton.tsx      # Login/Logout toggle (client component)
    SessionProvider.tsx # NextAuth SessionProvider wrapper (client component)
    SkillsPanel.tsx     # Guild channel sidebar (renders in root layout on EVERY page) — skill channels w/ post counts
    GameLeaderboard.tsx # Client — top-10 board for a game (fetches /api/minigame/leaderboard/[game])
    GodModeToggle.tsx   # Client — 🛡 God Mode switch (super admins only) + useGodMode() hook
    SkillCell.tsx       # Individual skill icon + level + link (client component)
    XpBar.tsx           # XP progress bar with level display
    OsrsPanel.tsx       # Reusable panel wrapper
    PostForm.tsx        # Create post form (client component, calls /api/posts)
    RecipeForm.tsx      # Create recipe form (client component, calls /api/recipes)
    PostCard.tsx        # Post preview card
    ProjectCard.tsx     # Project card
    HomepageBlockRenderer.tsx  # 'use client' — maps PageBlock[] → BlockRenderer (read-only public view)
    AdminFloatingBar.tsx       # Fixed bottom-right gear button (admin only) — quick links to builder + admin
    builder/
      BlockRenderer.tsx        # switch(block.type) dispatcher → renders correct block component
      blocks/
        AboutBlock.tsx         # Parchment scroll — bubbles[] mini-editor in edit mode (see About Me section)
        ProjectsListBlock.tsx  # Project cards with progress bars
        CommunityFeedBlock.tsx # Community posts feed
        AchievementsBlock.tsx  # Badge emoji showcase
        XpGuideBlock.tsx       # XP earning guide (static)
        HeadingBlock.tsx       # Editable heading (h1–h4); input in edit, heading tag in read
        TextBlock.tsx          # Tiptap rich-text editor in edit, dangerouslySetInnerHTML in read
        TiptapEditor.tsx       # Full Tiptap toolbar (bold/italic/underline/lists/align/link); lazy-loaded ssr:false
        ImageBlock.tsx         # File upload → base64 data URL stored in config.src
        ButtonBlock.tsx        # CTA with label/href/variant editable
        DividerBlock.tsx       # <hr> with configurable style/thickness/color/width
        QuestListBlock.tsx     # Active quests from liveData.quests
        SkillCardBlock.tsx     # Skill channel link card
        ContactCardBlock.tsx   # Phone/email/LinkedIn/resume from liveData
  lib/
    prisma.ts           # Singleton PrismaClient
    godmode.ts          # Super-admin God Mode flag (localStorage + 'sa-godmode-change' event)
    award-xp.ts         # awardXp() chokepoint for client XP events (skips SUPERADMIN); getXpAmount()
    admin-xp.ts         # mirrorXpToAdmin() — mirrors community XP onto the ADMIN account
    xp.ts               # XP/level calculation: xpToLevel(), xpProgress(), constants
    skills.ts           # SKILLS array — slug, dbEnum, icon, label, href for all 9 skills
    badges.ts           # BADGE_META — badge types, icons, labels
    posts.ts            # Reads content/posts/, parses MDX frontmatter
    trivia-questions.ts # Wine trivia questions (static data)
    block-defaults.ts   # BLOCK_META, getDefaultConfig(type), getDefaultStyles(type), applyStylesToElement(styles)
    builder-migration.ts  # migrateExistingSections() — maps old SiteSetting blobs → PageBlock rows
content/
  posts/                # Blog posts as .mdx files — add here to publish
```

## The 9 Skills

| Slug | DB Enum | Icon | Route |
|---|---|---|---|
| health | HEALTH | ❤️ | /skills/health |
| projects | PROJECTS | ⚒️ | /skills/projects |
| fishing | FISHING | 🎣 | /skills/fishing |
| business | BUSINESS | 💼 | /skills/business |
| food | FOOD | 🍳 | /skills/food |
| community | COMMUNITY | 👥 | /skills/community |
| gardening | GARDENING | 🌱 | /skills/gardening |
| fun | FUN | 🎮 | /skills/fun |
| travel | TRAVEL | 🗺️ | /skills/travel |

## XP system

| Action | XP | Skill |
|---|---|---|
| Create a post | +50 | that skill |
| Add a recipe | +50 | Food |
| Win Wine Trivia (≥7/10) | +25 | Fun |
| Complete Matching Game | +25 | Fun |
| Daily login | +10 | random skill |
| Minigame win (Boss Hunter, Pirate Carnage, etc.) | +25 | Fun (via `/api/minigame/win`) |

Level formula (in `src/lib/xp.ts`): `Math.min(99, Math.floor(Math.pow(xp / 100, 1/1.5)) + 1)`

**Super admins earn no XP** — every XP-award path (the `awardXp()` helper and the direct-increment routes: posts, recipes, minigame/win, daily-login, replies, upvote, skill-visit, wine-favorite, wine-identify, plants) checks `superAdmin` and skips the award while still performing the underlying action. Their game scores are also kept off the leaderboards (`/api/minigame/score` + boss-hunter run route skip super admins).

**Game leaderboards:** mini-games POST a score to `/api/minigame/score` (upserts per-user best into `GameBest`, keyed `userId+game`; `matching` is lower-is-better). `<GameLeaderboard game="..." />` renders the top 10. Boss Hunter uses a separate `BossRun` table (fastest-kill per boss).

## Auth & roles

- `UserRole` enum: `USER` (default), `ADMIN`, `SUPERADMIN`.
- Admin-gated API routes check `session.user.role !== 'ADMIN'` and return 403.
- Role flows: DB → `authorize()` return → JWT `token.role` → `session.user.role`.
- **SUPERADMIN is a tier above ADMIN, implemented without touching the ~50 existing `=== 'ADMIN'` gates:** in `auth.ts` the JWT callback maps a DB role of `SUPERADMIN` to **`session.user.role = 'ADMIN'`** AND sets **`session.user.superAdmin = true`**. So super admins pass every admin check, and the new powers key off the `superAdmin` flag (server) or `useGodMode()` (client). See the "Super Admin & God Mode" section.
- Use `(prisma as any).modelName` for models added after initial Prisma client generation (PostUpvote, UserBadge, SkillVisit, Announcement, SiteSetting, PageBlock, GameBest, BossRun, Plant, Wine*, etc.).

## Super Admin & God Mode

A `SUPERADMIN` is the owner/tester tier with three powers:

1. **Earns no XP anywhere** (see XP system above) and is excluded from leaderboards.
2. **Everything unlocked** — Boss Hunter / Pirate Carnage gate unlocks on `role === 'ADMIN'`, and super admins map to `ADMIN`, so they start fully unlocked automatically (no extra code).
3. **God Mode** — an in-game invincibility toggle, shown only to super admins.

**God Mode plumbing:**
- `src/lib/godmode.ts` — `isGodModeOn()` / `setGodMode()` backed by `localStorage` (key `sa-godmode`), broadcasts a `sa-godmode-change` event so live games react.
- `src/components/GodModeToggle.tsx` — the 🛡 toggle button (renders `null` unless `session.user.superAdmin`) **and** the `useGodMode()` hook returning `{ superAdmin, on }` (`on` is only true for super admins with the flag set).
- Each losable game imports `useGodMode()`, mirrors `on` into a ref read inside its loop, and renders `<GodModeToggle />`. Games covered: **Snake, Breakout, Pong, Ball Game, Drag Ball, Wine Stocker, Boss Hunter, Pirate Carnage.** Each gates its own death/lose path (e.g., skip the `lives--`, `if (g.god) return` in `hurtPlayer`/`dealDmgToPlayer`, never accrue strikes). Games with no lose state (Whack-a-Mole, Matching, Wine Trivia, Dress-Empress) have nothing to toggle.

**Promote/demote:** Admin → Users → "Super Admin" button (`PUT /api/admin/user` accepts role `SUPERADMIN`). The user must log out/in for the new session flag to take effect. Super-admin accounts can't be deleted from the users panel.

## Homepage rendering pipeline

The homepage no longer uses hardcoded sections. Content is stored as `PageBlock` DB records and rendered via `HomepageBlockRenderer`:

```
page.tsx (server) → prisma.pageBlock.findMany({pageSlug:'home'}) → HomepageBlockRenderer → BlockRenderer
```

- On first visit after deploy, if the `PageBlock` table is empty, `page.tsx` auto-calls `migrateExistingSections()` to seed from legacy `SiteSetting` blobs.
- The hero panel and `AccountShield` at the top of `page.tsx` are **not** part of the block system and stay hardcoded.
- To reset the homepage back to defaults: POST `/api/admin/builder/reset` (admin only).

## Visual page builder (`/admin/builder`)

The builder is a full-screen Canva/Notion-style editor accessible from the admin sidebar ("Builder") or the floating ⚙ gear button on the homepage (admin only).

### Block types (13 total)

| Type | Description | Default ColSpan |
|---|---|---|
| `about` | Bio with editable bubble array | 2 |
| `projects-list` | Project cards | 1 |
| `community-feed` | Recent posts | 1 |
| `achievements` | Badge showcase | 1 |
| `xp-guide` | How to earn XP | 1 |
| `heading` | H1–H4 heading | 2 |
| `text` | Tiptap rich text | 2 |
| `image` | Image with upload | 1 |
| `button` | CTA button | 1 |
| `divider` | Horizontal rule | 2 |
| `quest-list` | Active quests | 1 |
| `skill-card` | Skill channel link | 1 |
| `contact-card` | Phone/email/LinkedIn | 1 |

### Builder keyboard shortcuts
- `Ctrl+Z` — undo
- `Ctrl+Y` — redo
- `Ctrl+S` — save

### Block toolbar (per-block, shown when selected)
- `⠿ type` — drag handle (drag to reorder)
- `⧉` — duplicate
- `👁/🚫` — toggle visibility
- `💬+` — insert community-feed block below
- `💬✕` — delete block (only shown when block type is community-feed)
- `🖼+` — insert image block below
- `🖼✕` — delete block (only shown when block type is image)
- `🗑` — delete block

### About Me block — bubble editor
The About Me block stores content as an array of bubbles (not hardcoded bio1/bio2/bio3):

```typescript
// AboutBlockConfig
{
  headingText: string
  headingIcon: string
  bubbles: Array<{ id: string; content: string }>
}
```

In edit mode each bubble has: drag handle (dnd-kit, independent DndContext), textarea, ↑↓ move buttons, duplicate, delete. "+ Add Bubble" appends a new bubble and auto-focuses it. Cannot delete the last remaining bubble. Old `bio1/bio2/bio3` DB records are auto-normalised to `bubbles[]` at read time.

### Two render paths sharing one BlockRenderer
```
PUBLIC:  page.tsx → HomepageBlockRenderer → BlockRenderer (isEditing=false)
BUILDER: /admin/builder → BuilderClient → BuilderCanvas → SortableBlock → BlockRenderer (isEditing=true)
```

## Homepage hero layout

The hero (`src/app/page.tsx`) has two side-by-side **separate cards** with a 20px gap between them (flex row, `gap: 20`). They do not share a border or background — each has its own `.hero-panel` / AccountShield styling.

1. **Hero panel** (`.hero-panel`) — Profile photo + Name, Level badge, title, location, Members/Posts chips, XP bar + inline CTA ("Interacting with the website I gain XP — you can gain XP too!")
2. **AccountShield** (`src/components/AccountShield.tsx`) — Two states:
   - **Logged in:** avatar initials, username, Level + XP stats, XP progress bar, theme picker (✏ button), Sign Out
   - **Logged out:** "Your Character Awaits" banner + Create Account / Log In buttons only (no pitch text or perk bullets)

Contact info (phone, email, LinkedIn, Resume) is rendered inside the hero panel on the right side at desktop, as stacked rows at mobile.

**CSS:** `.hero-row` class was removed; the flex wrapper in `page.tsx` is now an unstyled div with `gap: 20`. `.shield-separator` class was removed. `.hero-panel` CSS in `globals.css` provides the card border/shadow.

## Visual conventions (current theme)

Premium dark RPG palette — all CSS custom properties in `src/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--bg-page` | `#0d0d14` | Page background |
| `--bg-card` | `#13131c` | Card/panel background |
| `--bg-elevated` | `#1a1a28` | Raised surfaces |
| `--gold` | `#c89b3c` | Headings, accents, buttons |
| `--text-1` | `#e8e6e0` | Primary text |
| `--text-2` | `#a09880` | Secondary text |
| `--text-3` | `#605848` | Muted/label text |
| `--border` | `#2a2820` | Default border |
| `--border-dim` | `#1e1c18` | Subtle border |
| `--border-lit` | `#c89b3c` | Highlighted border |

Key CSS classes (all in `globals.css`):
- `.hero-panel` — gold top-border gradient panel for the homepage hero
- `.rp-card` — standard dark card
- `.osrs-panel` / `.osrs-panel-dark` — legacy panel wrappers
- `.osrs-btn` — gold gradient button
- `.osrs-input` — dark styled input
- `.skill-cell` — sidebar skill channel row
- `.xp-bar` / `.xp-bar-fill` — XP progress bar
- `.prog-bar` / `.prog-bar-fill` — generic progress bar
- `.quest-card` — quest list item
- `.badge-tile` — achievement badge
- `.post-card` — community post card
- `.body-text` — Inter font override (use on all body/paragraph text, NOT headings)
- `.guild-channel` — sidebar channel row with left-border hover
- `.scroll-roll` / `.scroll-parchment` — parchment scroll wrapper used by the About Me block
- `.content-grid` — homepage block grid; 1-col mobile (`minmax(0,1fr)`), 3-col desktop. Grid items must have `min-width:0` to prevent content stretching the track.
- `.mobile-block-{type}` — per-block wrapper class used to set mobile ordering (CSS `order` property)

Two fonts: **Press Start 2P** for all headings/labels (default), **Inter** for body text (apply `.body-text` class).

## Boss Hunter mini-game (`/skills/fun/boss-hunter`)

A self-contained **canvas action-RPG** in a single client component (`src/app/skills/fun/boss-hunter/page.tsx`, ~5,700 lines). No assets — all visuals are hand-drawn on a 2D canvas and all audio is synthesized via Web Audio. It is intentionally one big file; keep new work inside it.

**Architecture (all module-scope, outside the React component):**
- `tick(g, dt, ...)` — pure-ish game-state update (movement, AI, attacks, collisions, phases). Mutates the `GS` game-state object.
- `render(ctx, g, ...)` — draws a frame; delegates to `renderArena`, `renderBoss`, `renderMinions`, `renderPlayer`, `renderTelegraph`, `renderHazards`, `renderProjectiles`, `renderSkyArrows`, `renderHUD`, etc.
- `GS` interface — the entire game state (player, boss, projectiles, zones, minions, phase flags, timers). `mkState(wpn, boss, gear)` builds a fresh one.
- The React component runs the `requestAnimationFrame` loop, owns screen state (`menu | hunt_select | playing | victory | defeat`), input handlers, and the cinematic menu canvas.

**Combat model:**
- 3 weapon paths (the prep screen has a **Weapon slot** + an **Armour slot**):
  - **Melee** (sword base): contact-based damage — a swing only hurts what's inside its reach + arc mid-swing (`g.meleeHit`). Per-weapon reach/arc. Highest durability. Loadouts: Starter Sword, Spider Fang Daggers, Drake Greatsword, Thunder Blade — each with its own animated swing.
  - **Bow** (bow base): balanced; can't fire at point-blank (`minRange`). Loadouts: Starter Bow, Venom Bow, Storm Bow — each with a draw/release animation + unique arrow render.
  - **Magic** (staff base): glass cannon — longest range (540), lowest HP/defense (`+20%` dmg taken), small move-speed bonus, weak basics but strong abilities. Loadouts: Starter Staff, Fire Staff (firebolt basic, fireball/meteor abilities, magic-circle cast).
- **Armour** drives the *entire character look* (4 looks: basic / ember / web / feather), independent of weapon. `LOADOUT_WEAPONS` maps weapon-select entries to a `(baseWeapon, gear)` pair; `selArmour` is the equipped armour gear.
- Player HP/defense vary by weapon path (`baseHp` in `mkState`, multipliers in `dealDmgToPlayer`).
- Admins (`session.user.role === 'ADMIN'`) start with all weapons/armour unlocked.

**Bosses & stages (4):** `BossId` 0 = Spider Queen, 1 = Lava Drake, 2 = Storm Griffin, 3 = **Frost Wyrm** (the final/legendary boss). Each has ~10 attacks and **three escalating stages** — normal → enraged (`bossEnraged`, at `enrageAt`) → desperate (`bossDesperate`, at `enrageAt * 0.45`). `selectBossAttack(bossId, enraged, desperate, d2p)` picks from phase-aware pools. Each boss has a phase-3 signature (spider summons spiderlings/`minions[]`, drake leaves a molten wake, griffin feather-storm, wyrm frenzy). The Griffin uses a flight state machine (`griffinState.mode`): dynamic orbit → telegraphed swoop dive (line locked on wind-up entry so it's dodgeable) → hovering lightning barrage. The Drake breathes fire from a **snout muzzle** (`muzzle`/`chargeAt` ≈ `b.angle * size*0.58`) so projectiles + breath cones emit from the mouth, not the body centre. The Griffin renders heavy storm lightning (the `bolt()` helper): wing-primary crackle, chest-core arcs, a wingtip-to-wingtip back arc, orbiting bolts, and periodic sky strikes.

**Frost Wyrm (boss 3) — the dual-weapon, stance-gated fight:** alternates a **grounded (melee-only)** stance and an **airborne (ranged-only)** stance, tracked by `g.dmgGate` (`'both' | 'melee' | 'ranged'`). `dealDmgToBoss(g, dmg, gear, src: 'melee'|'ranged')` early-returns via `bossImmune()` (shows "TOO HIGH!"/"IMMUNE") when the active weapon's `src` doesn't match the gate. The stance only flips once you've damaged it enough in the current stance (`g.wyrmStagger >= g.wyrmStaggerMax`, gated behind `g.wyrmPhaseTimer`); the gate **holds through the desperate phase** (it just swaps faster — magic never hurts the grounded Wyrm). So only the Wyrm hunt asks for **two weapons** on the prep screen (`selMelee` + `selRanged`, TAB/F swaps via `activeSlotRef`; fixed dual HP). Movement: it **roams** wide arcs around a drifting centre when airborne and keeps a loose distance / circles when grounded (you chase it), rather than charging straight in. `frost_bite` is a `CHANNELED` **smooth dash** (glides along a locked lane, `data.traveled`) — it never teleports. Visuals are a slender **segmented glowing ice-spine** (diamond vertebra plates, `segAt`/`segH`/`segL`), a straight slim neck that flares into the chest (front plates re-laid over the neck root to blend), four animated trotting legs, angry solid-triangle eyes (no eyeballs), a closed mouth (no teeth), and a tail whose base matches the body's rear taper so it flows in seamlessly. Ice hazard zones render as frozen-ground patches (fracture cracks + rim crystals) via the `'ice'` branch in `renderHazards`.

**Telegraphs & fairness:** every boss attack has a wind-up (`telegraphs` map in `startBossAttack`, min ~0.95s so all attacks are dodgeable) rendered by `renderTelegraph` (ground rings, cones, lines, charge aura, a floating `!` for `BIG_ATTACKS`) plus a warning sound.

**Player feedback:** taking damage is layered and loud — a punchy full-screen flash + red vignette (`g.playerDmgFlash`), a brief hitstop on every hit, a flashing player HP bar (`g.hpBarFlash`), bigger red `-N ▼` damage numbers, and **status-effect auras** in `renderPlayer` (a themed glow + rising motes while standing in a damaging hazard zone; a cyan frost envelope + chill ring + orbiting crystals while `slowTimer > 0`).

**Death & defeat:** a cinematic player-death sequence (`player_dying` phase — slow-mo hitstop, death shockwave, slammed "YOU DIED" + "SLAIN BY THE <BOSS>") plays, then the **animated defeat screen** (`defeatCanvasRef` — a fallen memorial blade with an ember pool, drifting boss-element-coloured ash, a rising soul wisp, blood vignette) with staggered text + a "You lasted Xs" stat.

**Audio — the `Sfx` module (synthesized, no files):** an IIFE near the top of the file. `Sfx.x()` methods for SFX (swing/shot/cast/hit/crit/hurt/dodge/warn/roar/explosion/meteor/etc.), throttled and routed through a master gain. It also contains a **procedural music engine**: `TRACKS` (menu, per-boss battle themes, `battle_final`, victory, defeat) scheduled on the audio clock; `Sfx.playMusic(name)` / `Sfx.stopMusic()`. The in-game **SOUND ON/OFF** button toggles the master gain (covers music + SFX). Audio unlocks on first user interaction (browser autoplay policy).

**Adding to the game:** a new boss attack = add to a pool in `selectBossAttack`, a telegraph time + `data` in `startBossAttack`, a resolve branch in `resolveBossAttack`, and a `renderTelegraph` branch. A new weapon look = a `LOADOUT_WEAPONS` entry + a `wid` branch in `renderPlayer`. A new sound = a method on the `Sfx` return object. Always `npm run build` before pushing — the file is large and easy to typo.

## Pirate Carnage mini-game (`/skills/fun/pirate-carnage`)

A second self-contained **canvas action game** (Twisted Metal × Vampire Survivors on the ocean) in one client component. No assets; hand-drawn canvas + synthesized Web Audio (`Sfx` IIFE with a reverb send, SFX, and a procedural music engine — `TRACKS`: menu/battle/boss/final/victory/defeat). Solo or local 2-player co-op.

- **Module-scope `tick(g, dt, keys, edges)` + `render(ctx, g)`**, with a `GS` interface built by `mkState(builds)`. The React component owns the RAF loop and `screen` state (`menu | playing | victory | defeat`).
- **Ships:** 4 builds (Inferno/Tempest/Ironclad/Cutlass). Shared `drawShip()` (with `shadeHex()`) draws a galleon; enemy `variant` tweaks it (warship = 3 cannons, cult = eye-rune sail); suicide enemy is a powder barrel. Player auto-fires; **Space/`.` = torpedo** (the only secondary — the old "E" ultimate was removed; 8 starting torpedoes).
- **Boss gauntlet (in order):** Kraken → Leviathan → Flying Dutchman → **Poseidon** (final; has an enrage phase < 40% HP). The Siren/mermaid boss was removed. Each boss = a `tick<Boss>` + `draw<Boss>` + entries in `bossVulnerable` / `bossPointMult` / the `tickBoss` & `render` dispatchers / `handleBossDying` chain / `startBossDeath`. A guaranteed repair + 2 loot drops spawn between bosses.
- **God Mode / invincibility:** `g.god` is set from the component each frame; `hurtPlayer()` early-returns when true. Leaderboard score is submitted on win/sink via `/api/minigame/score`.
- **Touch devices:** an on-screen joystick + BOOST + 🚀 buttons (`TouchControls`) appear during play; auto-pauses on tab blur; HTML pause menu (Resume / Quit).
- Bosses, ship art, and SFX are verified by rendering to a PNG with `@napi-rs/canvas` (install `--no-save`, render in a temp script, inspect, then port the identical code in — `next build` cannot show canvas output).

## Sunset Drift mini-game (`/skills/fun/sunset-drift`)

A self-contained **top-down arcade street racer** (sunset coastal-highway theme) in one client component
(`src/app/skills/fun/sunset-drift/page.tsx`). No assets — hand-drawn 2D canvas + synthesized Web Audio.
Built on the same architecture as Boss Hunter / Pirate Carnage; keep new work inside the file. It is
**standalone** — no XP/leaderboard/God Mode wiring; progress is saved to **localStorage** (`sd-save` for
coins/career-stage/owned-parts/per-car garages/unlocked cars; `sd-sound` for mute).

**Architecture (module scope):** `Sfx` IIFE (synth SFX + procedural music `TRACKS`: menu/race/turbo/victory/
defeat, plus a **persistent engine drone** via `engineStart/engineSet/engineStop` whose pitch tracks rpm, and
a looping **tyre-screech** via `screechSet/screechStop`). `GS` interface; `mkState(trackIdx, car, garage,
rivalIdxs)`; module-scope `tick(g, dt, keys, edges)` + `render(ctx, g)`. The React component owns the RAF loop
and `screen` state (`menu | garage | select | taunt | playing | finish`), keyboard/touch input, pause-on-blur,
and persistence.

**Driving model:** arcade physics — velocity vector decomposed into forward/lateral relative to `heading`;
lateral velocity is damped by grip (much less while handbraking → drift). Drifting + near-misses + big air fill
the **nitrous** meter; nitrous adds forward force + raised top speed + camera shake/zoom/speed-blur + roar. Cars
have per-vehicle stat personalities (`CARS`), tuned further by performance parts (`statFor()`).

**Tracks (`TRACK_DEFS`):** closed-loop centerline point arrays + width, built by `buildTrack()` (precomputes
cumulative `along` distances). `progress()` projects a point onto the main path **and** the optional shortcut
(taking the sand shortcut yields faster `along` progress). Features: traffic cars, ramp **jumps** (`def.jumps`
segment indices → `z`/`vz` launch), a **shortcut** branch, static obstacles, checkpoints via `along`/lap-wrap
detection. Camera is **rotating** (player points up): `render` translates to player, rotates by `-PI/2 - heading`.

**Rivals (`RIVALS`):** 4 bosses (MIRAGE drift / BRUNO blocker / VOLT nitro / APEX tech), each with a catchphrase,
signature color/custom car, AI profile (`aiInput()` — look-ahead racing line, curvature-based braking/drifting,
rubber-banding, personality quirks like the blocker swerving at the player), and a pre-race taunt screen.

**Garage:** `GaragePanel` — buy/equip cosmetics (paint/finish/rims/kit/spoiler/hood/underglow/vinyl/tint/
headlights, all visible top-down via `drawCar()`) and performance parts (engine/tires/turbo/weight) with coins;
live preview canvas. Career ladder (`CAREER`) = events (track + rivals + guaranteed unlock); winning advances
the stage and grants the unlock. Every finish awards coins (place-scaled) so a race never feels empty.

**Verify before pushing:** `npm run build`; the car/track art can be sanity-rendered to PNG with `@napi-rs/canvas`
(`drawCar`/`drawRoad` are pure) since `next build` can't show canvas output. Watch for `react/no-unescaped-entities`
(use `&apos;`/`&ldquo;` etc. in JSX text — rival catchphrases use the `ʼ` modifier-letter apostrophe in data strings).

## Common tasks

**Run locally:**
```
npm run dev
```

**Push DB schema changes:**
```
npx prisma db push
```

**Edit homepage content:** Log in as admin → click the ⚙ gear button (bottom-right) → Edit Page. Or go directly to `/admin/builder`.

**Reset homepage to defaults:** POST `/api/admin/builder/reset` (admin only) — deletes all home `PageBlock` rows and re-migrates from `SiteSetting` data.

**Add a blog post:** Create `content/posts/your-slug.mdx`:
```
---
title: Post Title
date: YYYY-MM-DD
description: One-line summary shown in the post list.
---
Your content here.
```

**Add a project:** Use the Projects block in the builder, or directly edit the `project` DB table via admin.

**Add a quest:** Use the Quest List block in the builder, or go to `/admin/quests`.

**Add a trivia question:** Edit `src/lib/trivia-questions.ts` — follow the existing `TriviaQuestion` shape.

**Update profile photo:** Log in as admin → `/admin` → Settings tab → upload photo (max 2 MB, stored as base64 in `SiteSetting` DB table).

**Add a new block type:**
1. Add the type string to `BlockType` in `src/types/builder.ts`
2. Add a config interface and include it in `AnyBlockConfig`
3. Add metadata to `BLOCK_META` and defaults to `getDefaultConfig`/`getDefaultStyles` in `src/lib/block-defaults.ts`
4. Create `src/components/builder/blocks/YourBlock.tsx`
5. Add a `case` to `src/components/builder/BlockRenderer.tsx`

**Deploy:** `git push` — Vercel auto-deploys from `main` via GitHub. Build command: `prisma generate && next build` (set in Vercel project settings).

**Build check before pushing:**
```
npm run build
```

**Smoke-test runtime for layout / dynamically-rendered changes:** `next build` only *compiles* — it does NOT execute the homepage, the `SkillsPanel` sidebar, or other `force-dynamic` pages, so a runtime crash in them passes the build and then 500s in production. Because `SkillsPanel` renders in the root layout, a crash there takes down **every** page. For changes to the layout, sidebar, homepage data-loading, or anything dynamically rendered, run a real production server and curl pages before pushing:
```
npm run build && npm start    # then: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ (and /privacy, /skills/fun)
```

**Make a super admin:** Admin → Users → "Super Admin" on the account, then log out/in. (Or set `role = 'SUPERADMIN'` in the DB.)

## DNS setup (garretperez.com)

Domain uses **Netlify DNS** (nameservers: dns1-4.p03.nsone.net) but the site is hosted on **Vercel**. DNS records in the Netlify dashboard:
- `garretperez.com` → A → `76.76.21.21` (Vercel IP)
- `www.garretperez.com` → A → `76.76.21.21` (Vercel IP)

Vercel is configured with both `garretperez.com` and `www.garretperez.com` as aliases (www is primary — garretperez.com redirects there). To manage DNS, log into app.netlify.com → Domains → garretperez.com → DNS settings.

## Known gotchas

- **Windows EPERM on `prisma generate`**: Dev server locks `query_engine-windows.dll.node`. Stop the dev server before running `npm run build` locally. Vercel builds are unaffected.
- **`(prisma as any)` casts**: Required for models added after the initial Prisma client snapshot (PostUpvote, UserBadge, SkillVisit, Announcement, SiteSetting, PageBlock). Run `npx prisma generate` after any schema change.
- **Admin credentials**: NEVER hardcode in source. Use `SETUP_ADMIN_USERNAME` / `SETUP_ADMIN_PASSWORD` env vars and visit `/api/setup` once to create the account.
- **netlify.toml exists** in the repo but is unused — the site deploys to Vercel, not Netlify. Do not add Netlify-specific build config.
- **Unescaped entities in JSX**: Apostrophes inside JSX text (e.g. `I'm`) must be escaped as `&apos;` or the ESLint `react/no-unescaped-entities` rule will fail the build. Always use `&apos;` for `'` and `&quot;` for `"` in JSX text nodes.
- **Tiptap SSR**: TiptapEditor must be loaded with `dynamic(() => import(...), { ssr: false })` — it is browser-only.
- **Nested DndContext**: The About Me bubble editor uses its own `DndContext` (independent of the builder canvas DndContext). This is intentional and supported by @dnd-kit.
- **AboutBlockConfig legacy format**: Old DB records may have `bio1/bio2/bio3` fields instead of `bubbles[]`. The `normalizeCfg()` function in `AboutBlock.tsx` handles this at read time — never strip the optional legacy fields from the type.
- **`@tiptap/extension-text-style`** exports `TextStyle` as a named export, not default. Import as `import { TextStyle } from '@tiptap/extension-text-style'`.
- **Mobile overflow — CSS grid**: Plain `1fr` track uses `minmax(auto, 1fr)` which lets content stretch columns. Always use `minmax(0, 1fr)` for mobile grid tracks, and add `min-width: 0` to grid items. Without this, parchment blocks (About, Projects, XP Guide, etc.) overflow the viewport.
- **Mobile overflow — inline styles**: `overflow: visible` on a grid item is not overrideable by a plain CSS rule — requires `!important` in the media query. The mobile CSS uses `overflow: hidden !important` on `.content-grid > div` to hard-constrain blocks regardless of inline styles.
- **iOS Safari overflow**: Requires BOTH `html { overflow-x: hidden }` AND `body { overflow-x: hidden }` — just `body` alone is insufficient.
- **Tiny font sizes**: Labels using inline `style={{ fontSize: X }}` cannot be targeted by mobile CSS bump rules. Convert to Tailwind `text-[Xpx]` classes so the `@media (max-width: 767px)` overrides apply.
- **Neon data-transfer quota = whole site looks wiped (but data is safe)**: if every feature suddenly shows empty (no users/posts, levels "reset", fishing/garden/wine all blank), the first suspect is the Neon **data-transfer quota**, not a code bug or data loss. Queries fail with `ERROR: ...exceeded the data transfer quota`; most pages catch DB errors and fall back to empty, so the entire site appears blank. A transfer quota blocks reads — it does **not** delete rows. Fix = upgrade the Neon plan (on the *same* project the connection points to, or via Vercel→Storage if Neon was added through the Vercel integration). Verify with a read-only `prisma.*.count()` script that loads `.env.local` manually.
- **`next build` passing ≠ production works** for dynamic pages — see "Smoke-test runtime" under Common tasks. A failed attempt to wrap `SkillsPanel`/homepage queries in `unstable_cache` compiled fine but 500'd every page at runtime; it was reverted. Re-attempt such caching only with a local `npm start` smoke test first.
- **DB-touching API routes must be dynamic**: a parameterless `GET` route handler that queries the DB (e.g. `/api/setup`) gets *executed at build time* and fails the build. Add `export const dynamic = 'force-dynamic'` to any route that reads/writes the DB without already depending on request data.
