# garretperez.com

Personal website — portfolio, blog, and projects.

Built with Next.js 14, Tailwind CSS, and MDX. Hosted free on Vercel.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Adding a blog post

Create a `.mdx` file in `content/posts/`:

```
---
title: My Post Title
date: 2026-06-08
description: A short description shown in the post list.
---

Your content here...
```

The post will appear automatically at `/blog/your-filename`.

## Adding a project

Edit the `projects` array in `src/app/projects/page.tsx`. To feature it on the homepage, also add it to `featuredProjects` in `src/app/page.tsx`.

## Deploy

Push to `main` — Vercel deploys automatically.
