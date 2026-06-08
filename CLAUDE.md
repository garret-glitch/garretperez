# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Garret Perez — portfolio, blog, and projects.

- **Live site:** garretperez.com
- **Repo:** github.com/garret-glitch/garretperez
- **Hosting:** Vercel (free Hobby plan, auto-deploys on push to `main`)
- **Git email:** garret.p92@gmail.com (must match Vercel account or deploys are blocked)

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + `@tailwindcss/typography` for blog prose
- **`gray-matter`** — parses YAML frontmatter from `.mdx` files
- **`next-mdx-remote/rsc`** — renders MDX content in server components

## Project structure

```
src/
  app/
    layout.tsx          # Root layout — Navbar + Footer wrapping all pages
    page.tsx            # Home page (hero, featured projects, latest posts)
    projects/page.tsx   # Projects grid
    blog/page.tsx       # Blog index
    blog/[slug]/page.tsx  # Individual blog post (statically generated)
    contact/page.tsx    # Contact page
  components/
    Navbar.tsx
    Footer.tsx
    PostCard.tsx        # Blog post preview card
    ProjectCard.tsx     # Project card with tags and links
  lib/
    posts.ts            # Reads content/posts/, parses frontmatter, returns sorted list
content/
  posts/                # Blog posts as .mdx files — add new files here to publish
```

## Common tasks

**Run locally:**
```
npm run dev
```

**Add a blog post:** Create a new `.mdx` file in `content/posts/` with this frontmatter:
```
---
title: Post Title
date: YYYY-MM-DD
description: One-line summary shown in the post list.
---
```

**Add a project:** Edit the `projects` array in `src/app/projects/page.tsx` (and the `featuredProjects` array in `src/app/page.tsx` for the homepage).

**Deploy:** Just `git push` — Vercel auto-deploys from `main`.

**Build check before pushing:**
```
npm run build
```
