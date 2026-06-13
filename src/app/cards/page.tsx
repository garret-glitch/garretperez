import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import CardsPageClient from '@/components/CardsPageClient'

export const metadata = { title: 'Guild Directory — Garret\'s World' }

export default async function CardsPage() {
  const session = await auth()

  let cards: any[] = []

  try {
    const raw = await (prisma as any).businessCard.findMany({
      include: {
        user: {
          select: { id: true, username: true, skills: { select: { xp: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    cards = raw.map((card: any) => {
      const totalXp = card.user.skills.reduce((sum: number, s: any) => sum + s.xp, 0)
      return {
        ...card,
        createdAt: card.createdAt.toISOString(),
        updatedAt: undefined,
        user: { id: card.user.id, username: card.user.username, level: xpToLevel(totalXp) },
      }
    })
  } catch { /* DB not ready */ }

  const myCard = session?.user?.id
    ? cards.find((c: any) => c.user.id === session.user.id) ?? null
    : null

  return (
    <CardsPageClient
      cards={cards}
      myCard={myCard}
      userId={session?.user?.id ?? null}
      isAdmin={session?.user?.role === 'ADMIN'}
    />
  )
}
