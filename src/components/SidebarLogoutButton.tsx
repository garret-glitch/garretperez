'use client'
import { signOut } from 'next-auth/react'

export default function SidebarLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[6.5px] transition-opacity hover:opacity-80"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
      <span>🚪</span><span>Log Out</span>
    </button>
  )
}
