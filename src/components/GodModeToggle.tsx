'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { isGodModeOn, setGodMode, GODMODE_EVENT } from '@/lib/godmode'

/** Live God Mode state for a game loop. `on` is true only for super admins with the flag set. */
export function useGodMode() {
  const { data: session } = useSession()
  const superAdmin = !!(session?.user as { superAdmin?: boolean } | undefined)?.superAdmin
  const [flag, setFlag] = useState(false)
  useEffect(() => {
    const read = () => setFlag(isGodModeOn())
    read()
    window.addEventListener(GODMODE_EVENT, read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener(GODMODE_EVENT, read); window.removeEventListener('storage', read) }
  }, [])
  return { superAdmin, on: superAdmin && flag }
}

/** A small God Mode switch — renders nothing unless the viewer is a super admin. */
export default function GodModeToggle({ style }: { style?: React.CSSProperties }) {
  const { data: session } = useSession()
  const superAdmin = !!(session?.user as { superAdmin?: boolean } | undefined)?.superAdmin
  const [on, setOn] = useState(false)
  useEffect(() => {
    const read = () => setOn(isGodModeOn())
    read()
    window.addEventListener(GODMODE_EVENT, read)
    return () => window.removeEventListener(GODMODE_EVENT, read)
  }, [])
  if (!superAdmin) return null
  return (
    <button
      type="button"
      onClick={() => setGodMode(!on)}
      title="Super admin: become invincible in this game"
      style={{
        fontFamily: '"Press Start 2P", monospace', fontSize: 8, cursor: 'pointer',
        padding: '6px 10px', borderRadius: 6,
        border: `1px solid ${on ? '#caa8ff' : '#2a2820'}`,
        background: on ? 'linear-gradient(135deg,#7b2f9a,#3a1a4a)' : 'rgba(13,13,20,0.85)',
        color: on ? '#fff' : '#caa8ff',
        boxShadow: on ? '0 0 12px rgba(160,90,220,0.6)' : 'none',
        ...style,
      }}
    >
      {on ? '🛡 GOD MODE: ON' : '🛡 GOD MODE: OFF'}
    </button>
  )
}
