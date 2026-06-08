# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Garret's World** — OSRS-themed interactive community blog where users earn XP for doing things on the site (posting, cooking recipes, playing mini-games, daily login).

- **Live site:** garretperez.com
- **Repo:** github.com/garret-glitch/garretperez
- **Hosting:** Vercel (free Hobby plan, auto-deploys on push to `main`)
- **Git email:** garret.p92@gmail.com (must match Vercel account or deploys are blocked)

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + `@tailwindcss/typography` + **Press Start 2P** (Google Font, pixel/OSRS aesthetic)
- **NextAuth.js v5 beta** (`next-auth@beta`) — credentials provider, JWT strategy, username + password auth
- **Prisma v5** ORM + **`@auth/prisma-adapter`**
- **Neon PostgreSQL** (free tier at neon.tech) — DATABASE_URL in `.env.local`
- **bcryptjs** — password hashing
- **`gray-matter`** + **`next-mdx-remote/rsc`** — static MDX blog posts

## Environment variables (required locally)

Create `.env.local` in the project root:
```
DATABASE_URL="postgresql://..."   # from neon.tech
NEXTAUTH_SECRET="..."             # 32-char hex random string
NEXTAUTH_URL="http://localhost:3000"
```

Add the same vars to Vercel project settings for production (`NEXTAUTH_URL=https://garretperez.com`).

## Project structure

```
prisma/
  schema.prisma         # User, UserSkill, Post, Recipe + NextAuth tables
src/
  auth.ts               # NextAuth config (credentials provider, JWT)
  types/
    next-auth.d.ts      # Session type augmentation (adds user.id)
  app/
    layout.tsx          # Root layout — ContactHeader + SiteHeader + 2-col grid (main + SkillsPanel)
    page.tsx            # Home — welcome banner + XP guide + recent posts feed
    (auth)/
      login/page.tsx    # Login form (client component)
      register/page.tsx # Registration form (client component)
    skills/
      [skill]/page.tsx  # Dynamic skill page — posts + PostForm (health, projects, fishing, etc.)
      food/page.tsx     # Cooking skill — recipes + RecipeForm + food posts
      fun/page.tsx      # Fun skill — mini-game hub
      fun/wine-trivia/page.tsx  # Wine Trivia quiz (10 questions, client component)
      fun/matching/page.tsx     # Matching card game (16 cards, client component)
    blog/page.tsx       # Static MDX blog index
    blog/[slug]/page.tsx  # Individual blog post (statically generated)
    projects/page.tsx   # Projects grid
    contact/page.tsx    # Contact page
    api/
      auth/[...nextauth]/route.ts  # NextAuth handlers
      register/route.ts            # Create user + init 9 UserSkill rows
      posts/route.ts               # Create post + award +50 XP to skill
      recipes/route.ts             # Create recipe + award +50 Food XP
      minigame/win/route.ts        # Award +25 Fun XP on game win
      daily-login/route.ts         # Award +10 XP to random skill (once/day)
  components/
    ContactHeader.tsx   # Phone + email bar at very top
    SiteHeader.tsx      # Site name + Blog link + AuthButton (server component)
    AuthButton.tsx      # Login/Logout toggle (client component)
    SessionProvider.tsx # NextAuth SessionProvider wrapper (client component)
    SkillsPanel.tsx     # 3x3 skills grid sidebar + Total Level (server component)
    SkillCell.tsx       # Individual skill icon + level + link (client component)
    XpBar.tsx           # XP progress bar with level display
    OsrsPanel.tsx       # Reusable brown panel wrapper
    PostForm.tsx        # Create post form (client component, calls /api/posts)
    RecipeForm.tsx      # Create recipe form (client component, calls /api/recipes)
    Footer.tsx
    PostCard.tsx        # Blog post preview card (OSRS styled)
    ProjectCard.tsx     # Project card (OSRS styled)
  lib/
    prisma.ts           # Singleton PrismaClient
    xp.ts               # XP/level calculation: xpToLevel(), xpProgress(), constants
    skills.ts           # SKILLS array — slug, dbEnum, icon, label, href for all 9 skills
    posts.ts            # Reads content/posts/, parses MDX frontmatter
    trivia-questions.ts # 20 wine trivia questions (static data)
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

## Common tasks

**Run locally:**
```
npm run dev
```

**Push DB schema changes:**
```
npx prisma db push
```
(Requires DATABASE_URL in `.env` or passed inline)

**Add a blog post:** Create `content/posts/your-slug.mdx`:
```
---
title: Post Title
date: YYYY-MM-DD
description: One-line summary shown in the post list.
---
Your content here.
```

**Add a skill section post:** Users do this via the UI at `/skills/[skill]` when logged in.

**Add a project:** Edit the `projects` array in `src/app/projects/page.tsx`.

**Add a trivia question:** Edit `src/lib/trivia-questions.ts` — follow the existing `TriviaQuestion` shape.

**Deploy:** `git push` — Vercel auto-deploys from `main`. Build script runs `prisma generate && next build`.

**Build check before pushing:**
```
npm run build
```

## OSRS visual conventions

- Background: `#3c2a1e` (dark brown)
- Panel (tan): `.osrs-panel` class — `#c5a882` bg, 3D brown border
- Panel (dark): `.osrs-panel-dark` class — `#2b1c0e` bg
- Buttons: `.osrs-btn` class
- Inputs: `.osrs-input` class
- Skill cells: `.skill-cell` class
- Text colors: orange `#ff981f` for headings, yellow `#ffe066` for body, tan `#c5a882` for muted
- All custom CSS lives in `src/app/globals.css` under `@layer components`
