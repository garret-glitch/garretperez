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
- **Neon PostgreSQL** (free tier at neon.tech) — DATABASE_URL in `.env.local`
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
  schema.prisma         # User, UserSkill, Post, Recipe, SiteSetting, PageBlock + NextAuth tables
public/
  resume.docx           # Garret's resume — served as static file
src/
  auth.ts               # NextAuth config — credentials provider, JWT, role in token
  types/
    next-auth.d.ts      # Session type: user.id + user.role
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
        builder/
          blocks/route.ts   # GET/POST/PUT/DELETE individual PageBlock records
          save/route.ts     # Bulk-save: deletes removed blocks, upserts all incoming blocks
          migrate/route.ts  # One-time POST: seeds PageBlock rows from legacy SiteSetting blobs
          reset/route.ts    # POST: deletes all home PageBlock rows then re-migrates — ADMIN only
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

Level formula (in `src/lib/xp.ts`): `Math.min(99, Math.floor(Math.pow(xp / 100, 1/1.5)) + 1)`

## Auth & roles

- All users have `role: USER` by default. Admin has `role: ADMIN`.
- Admin-gated API routes check `session.user.role !== 'ADMIN'` and return 403.
- Role flows: DB → `authorize()` return → JWT `token.role` → `session.user.role`.
- Use `(prisma as any).modelName` for models added after initial Prisma client generation (PostUpvote, UserBadge, SkillVisit, Announcement, SiteSetting, PageBlock).

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
