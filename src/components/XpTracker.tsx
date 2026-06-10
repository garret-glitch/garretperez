'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { emitXpGained } from '@/components/XpToast'

const GAME_PATHS = /^\/skills\/fun\/(wine-trivia|matching|snake|breakout|whack-a-mole|pong)$/

async function fire(eventType: string, eventKey: string) {
  try {
    const r = await fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, eventKey }),
    })
    const d = await r.json()
    if (d.awarded && d.amount > 0) emitXpGained(d.amount)
  } catch {}
}

export default function XpTracker() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const prevPath = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Navigation-based XP — fires on every page transition
  useEffect(() => {
    if (!session?.user?.id) return
    const prev = prevPath.current
    prevPath.current = pathname
    if (!prev || prev === pathname) return

    if (GAME_PATHS.test(pathname)) {
      fire('MINIGAME_PLAY', pathname)
    } else if (!pathname.startsWith('/skills/')) {
      fire('TAB_CLICK', pathname)
    }
    // Skill page visits handled by SkillVisitTracker
  }, [pathname, session?.user?.id])

  // 5-minute time-spent XP
  useEffect(() => {
    if (!session?.user?.id) return
    timerRef.current = setTimeout(() => {
      fire('TIME_SPENT', 'session')
    }, 5 * 60 * 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [session?.user?.id])

  return null
}
