# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Garret's World** — Premium dark RPG-themed personal site / interactive community. Garret Perez's professional profile + community blog where users earn XP for posting, cooking recipes, playing mini-games, and daily logins.

- **Live site:** garretperez.com
- **Repo:** github.com/garret-glitch/garretperez
- **Hosting:** Netlify (auto-deploys on push to `main` via GitHub integration)
- **Git email:** garret.p92@gmail.com

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **Press Start 2P** (pixel headings) + **Inter** (body text via `.body-text` class)
- **NextAuth.js v5 beta** (`next-auth@beta`) — credentials provider, JWT strategy, `role` field in token/session
- **Prisma v5** ORM + **`@auth/prisma-adapter`**
- **Neon PostgreSQL** (free tier at neon.tech) — DATABASE_URL in `.env.local`
- **bcryptjs** — password hashing
- **`gray-matter`** + **`next-mdx-remote/rsc`** — static MDX blog posts

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

In **Netlify site settings → Environment variables** add these for production:
- `DATABASE_URL` — same Neon connection string
- `AUTH_SECRET` — same secret value
- `NEXTAUTH_URL` — `https://garretperez.com`
- `SETUP_ADMIN_USERNAME` / `SETUP_ADMIN_PASSWORD` — for one-time admin creation

Netlify auto-deploys from `main`. Config is in `netlify.toml` (uses `@netlify/plugin-nextjs`).

**Admin setup:** Visit `/api/setup` once after deploy to create the admin account from env vars. Returns 409 if already exists. Credentials must NEVER be hardcoded in source.

## Project structure

```
prisma/
  schema.prisma         # User, UserSkill, Post, Recipe, SiteSetting + NextAuth tables
public/
  resume.docx           # Garret's resume — served as static file
src/
  auth.ts               # NextAuth config — credentials provider, JWT, role in token
  types/
    next-auth.d.ts      # Session type: user.id + user.role
  app/
    layout.tsx          # Root layout — SiteHeader + flex(SkillsPanel + main). No ContactHeader/Footer.
    page.tsx            # Home dashboard — hero, About Me, Projects, Quest Log, Achievements, Activity, Feed
    resume/page.tsx     # Resume page — experience, skills bars, download .docx
    admin/page.tsx      # Admin dashboard (ADMIN role only) — settings, users, posts, announcements tabs
    quest-board/page.tsx  # Quest board — all active quests
    (auth)/
      login/page.tsx    # Login form (client component)
      register/page.tsx # Registration form (client component)
    skills/
      [skill]/page.tsx  # Dynamic skill page — posts + PostForm (health, projects, fishing, etc.)
      food/page.tsx     # Cooking skill — recipes + RecipeForm + food posts
      fun/page.tsx      # Fun skill — mini-game hub
      fun/wine-trivia/page.tsx  # Wine Trivia quiz (client component)
      fun/matching/page.tsx     # Matching card game (client component)
    blog/page.tsx       # Static MDX blog index
    blog/[slug]/page.tsx  # Individual blog post (statically generated)
    api/
      auth/[...nextauth]/route.ts   # NextAuth handlers
      setup/route.ts                # One-time admin account creation from env vars
      register/route.ts             # Create user + init 9 UserSkill rows
      posts/route.ts                # Create post + award +50 XP to skill
      recipes/route.ts              # Create recipe + award +50 Food XP
      minigame/win/route.ts         # Award +25 Fun XP on game win
      daily-login/route.ts          # Award +10 XP to random skill (once/day)
      admin/
        settings/route.ts           # GET/POST site settings (headshot, etc.) — ADMIN only
        users/route.ts              # List all users — ADMIN only
        posts/route.ts              # List all posts — ADMIN only
        announcements/route.ts      # List announcements — ADMIN only
        announcement/route.ts       # POST/DELETE announcements — ADMIN only
        ban-user/route.ts           # Ban/unban user — ADMIN only
        delete-post/route.ts        # Delete post — ADMIN only
        adjust-xp/route.ts          # Manually adjust user XP — ADMIN only
  components/
    SiteHeader.tsx      # Ultra-slim sticky nav — "GP" logo, Quests, Resume links, Admin link (role-based), AuthButton
    AuthButton.tsx      # Login/Logout toggle (client component)
    SessionProvider.tsx # NextAuth SessionProvider wrapper (client component)
    SkillsPanel.tsx     # Guild channel sidebar — Garret profile block, skill channels with post counts, user level
    SkillCell.tsx       # Individual skill icon + level + link (client component)
    XpBar.tsx           # XP progress bar with level display
    OsrsPanel.tsx       # Reusable panel wrapper
    PostForm.tsx        # Create post form (client component, calls /api/posts)
    RecipeForm.tsx      # Create recipe form (client component, calls /api/recipes)
    PostCard.tsx        # Post preview card
    ProjectCard.tsx     # Project card
  lib/
    prisma.ts           # Singleton PrismaClient
    xp.ts               # XP/level calculation: xpToLevel(), xpProgress(), constants
    skills.ts           # SKILLS array — slug, dbEnum, icon, label, href for all 9 skills
    badges.ts           # BADGE_META — badge types, icons, labels
    posts.ts            # Reads content/posts/, parses MDX frontmatter
    trivia-questions.ts # Wine trivia questions (static data)
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

Level formula (in `src/lib/xp.ts`): `Math.min(99, Math.floor(Math.pow(xp / 100, 1/1.5)) + 1)`

## Auth & roles

- All users have `role: USER` by default. Admin has `role: ADMIN`.
- Admin-gated API routes check `session.user.role !== 'ADMIN'` and return 403.
- Role flows: DB → `authorize()` return → JWT `token.role` → `session.user.role`.
- Use `(prisma as any).modelName` for models added after initial Prisma client generation (PostUpvote, UserBadge, SkillVisit, Announcement, SiteSetting).

## Homepage hero layout

The hero (`src/app/page.tsx`) has three columns:
1. **Left** — Profile photo (112×112, base64 from DB `SiteSetting` key `'headshot'`, falls back to `'GP'`)
2. **Center** — Name, Level badge, title, location, Members/Posts stat chips, XP bar, current quest
3. **Right** — Contact label, phone, email, LinkedIn, Resume button

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

Two fonts: **Press Start 2P** for all headings/labels (default), **Inter** for body text (apply `.body-text` class).

## Common tasks

**Run locally:**
```
npm run dev
```

**Push DB schema changes:**
```
npx prisma db push
```

**Add a blog post:** Create `content/posts/your-slug.mdx`:
```
---
title: Post Title
date: YYYY-MM-DD
description: One-line summary shown in the post list.
---
Your content here.
```

**Add a project:** Edit the `PROJECTS` array in `src/app/page.tsx`.

**Add a quest:** Edit the `QUESTS` array in `src/app/page.tsx`.

**Add a trivia question:** Edit `src/lib/trivia-questions.ts` — follow the existing `TriviaQuestion` shape.

**Update profile photo:** Log in as admin → `/admin` → Settings tab → upload photo (max 2 MB, stored as base64 in `SiteSetting` DB table).

**Deploy:** `git push` — Netlify auto-deploys from `main`. Build script: `prisma generate && next build`. Config in `netlify.toml`.

**Build check before pushing:**
```
npm run build
```

## Known gotchas

- **Windows EPERM on `prisma generate`**: Dev server locks `query_engine-windows.dll.node`. Stop the dev server before running `npm run build` locally. Netlify builds are unaffected.
- **`(prisma as any)` casts**: Required for models added after the initial Prisma client snapshot (PostUpvote, UserBadge, SkillVisit, Announcement, SiteSetting). Run `npx prisma generate` after any schema change.
- **Admin credentials**: NEVER hardcode in source. Use `SETUP_ADMIN_USERNAME` / `SETUP_ADMIN_PASSWORD` env vars and visit `/api/setup` once to create the account.
