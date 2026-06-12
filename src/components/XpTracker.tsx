'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { emitXpGained } from '@/components/XpToast'

const GAME_PATHS = /^\/skills\/fun\/(wine-trivia|matching|snake|breakout|whack-a-mole|pong)$/

// Session-level cache: prevents duplicate API calls for keys already fired this session.
// Server enforces the per-day uniqueness; this just avoids network spam.
type Cache = Set<string>

async function fire(eventType: string, eventKey: string, cache: Cache) {
  const ck = `${eventType}:${eventKey}`
  if (cache.has(ck)) return
  cache.add(ck)
  try {
    const r = await fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, eventKey }),
    })
    const d = await r.json()
    if (d.awarded && d.amount > 0) emitXpGained(d.amount)
  } catch {
    cache.delete(ck) // allow retry on network error
  }
}

// Derive a stable XP key from the clicked element.
// Returns null for elements that should be ignored (empty keys, external links, etc.)
function resolveClick(target: Element): { eventType: string; key: string } | null {
  // Closest anchor with an internal href
  const a = target.closest('a[href]') as HTMLAnchorElement | null
  if (a) {
    try {
      const url = new URL(a.href, window.location.origin)
      if (url.origin !== window.location.origin) return null // skip external
      return { eventType: 'TAB_CLICK', key: url.pathname }
    } catch {
      return null
    }
  }

  // Closest non-submit button with readable text
  const btn = target.closest('button') as HTMLButtonElement | null
  if (btn && btn.type !== 'submit' && !btn.disabled) {
    const raw = (btn.getAttribute('aria-label') ?? btn.textContent ?? '').trim().slice(0, 60)
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    if (!slug) return null
    return { eventType: 'TAB_CLICK', key: `btn:${slug}` }
  }

  return null
}

export default function XpTracker() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const prevPath = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cache    = useRef<Cache>(new Set())

  // Navigation-based XP — fires on every page transition
  useEffect(() => {
    if (!session?.user?.id) return
    const prev = prevPath.current
    prevPath.current = pathname
    if (!prev || prev === pathname) return

    if (GAME_PATHS.test(pathname)) {
      fire('MINIGAME_PLAY', pathname, cache.current)
    } else if (!pathname.startsWith('/skills/')) {
      fire('TAB_CLICK', pathname, cache.current)
    }
    // Skill page visits handled by SkillVisitTracker
  }, [pathname, session?.user?.id])

  // Global click listener — awards XP for every link and button click
  useEffect(() => {
    if (!session?.user?.id) return

    function handleClick(e: MouseEvent) {
      const result = resolveClick(e.target as Element)
      if (result) fire(result.eventType, result.key, cache.current)
    }

    document.addEventListener('click', handleClick, { capture: true, passive: true })
    return () => document.removeEventListener('click', handleClick, true)
  }, [session?.user?.id])

  // 5-minute time-spent XP
  useEffect(() => {
    if (!session?.user?.id) return
    timerRef.current = setTimeout(() => {
      fire('TIME_SPENT', 'session', cache.current)
    }, 5 * 60 * 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [session?.user?.id])

  return null
}
