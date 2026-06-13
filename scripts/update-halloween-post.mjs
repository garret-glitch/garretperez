import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* already set */ }

const prisma = new PrismaClient()

async function main() {
  const post = await prisma.post.findFirst({
    where: { skill: 'COMMUNITY', title: { contains: 'Halloween' } },
  })
  if (!post) throw new Error('Halloween post not found.')

  await prisma.post.update({
    where: { id: post.id },
    data: {
      body: `Get ready, adventurers — the most haunted night of the year is coming to Garret's World!\n\nThis October we're hosting our 3rd community Halloween event in Pearland. Dress up, post your costume.\n\nStay tuned — more details, prizes, and surprises are coming as we get closer. This is just the beginning. See you on the other side! 🕸️`,
    },
  })

  console.log('Post updated:', post.id)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
