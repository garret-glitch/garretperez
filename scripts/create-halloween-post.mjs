// One-time script: create the Halloween community event post
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Manually load .env.local without dotenv
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* already set */ }

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
  if (!admin) throw new Error('No admin user found. Visit /api/setup first.')

  const existing = await prisma.post.findFirst({
    where: { userId: admin.id, skill: 'COMMUNITY', title: { contains: 'Halloween' } },
  })
  if (existing) { console.log('Post already exists:', existing.id); return }

  const post = await prisma.post.create({
    data: {
      userId: admin.id,
      skill: 'COMMUNITY',
      title: '🎃 Halloween Community Event — October 2026',
      body: `Get ready, adventurers — the most haunted night of the year is coming to Garret's World!\n\nThis October we're hosting our first ever community Halloween event. Dress up, post your costume, share your spooky recipes, or just log in on October 31st to claim your XP bonus. Here's how to join in:\n\n👻 Post your Halloween costume or decorations in any skill channel for bonus community XP\n🍬 Drop your best spooky recipe in the Food skill for extra XP\n🕹️ Beat any mini-game on Halloween night for a special double-XP reward\n⚡ Daily login on Oct 31st grants a bonus +50 XP to a random skill\n\nStay tuned — more details, prizes, and surprises are coming as we get closer. This is just the beginning. See you on the other side! 🕸️`,
      imageUrl: '/community/halloween.png',
    },
  })

  console.log('Created post:', post.id)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
