'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const GAME_PATHS = /^\/skills\/fun\/(wine-trivia|matching|snake|breakout|whack-a-mole|pong)$/

function fire(eventType: string, eventKey: string) {
  fetch('/api/xp/award', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, eventKey }),
  }).catch(() => {})
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
    // Skip initial load (no real navigation happened)
    if (!prev || prev === pathname) return

    if (GAME_PATHS.test(pathname)) {
      // Entering a specific mini-game page = starting a game (max 3/day)
      fire('MINIGAME_PLAY', pathname)
    } else if (!pathname.startsWith('/skills/')) {
      // Main tab clicks: home, quests, resume, blog, admin, etc.
      fire('TAB_CLICK', pathname)
    }
    // Skill page visits (SKILL_OPEN) handled by SkillVisitTracker in each skill page
  }, [pathname, session?.user?.id])

  // 5-minute time-spent XP — fires once per session after being on the site for 5 minutes
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
