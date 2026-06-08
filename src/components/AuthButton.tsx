'use client'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import type { Session } from 'next-auth'

export default function AuthButton({ session }: { session: Session | null }) {
  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[8px] text-[#d0d0d0]">⚔ {session.user.name}</span>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="osrs-btn">
          Logout
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <Link href="/login" className="osrs-btn">Login</Link>
      <Link href="/register" className="osrs-btn">Join</Link>
    </div>
  )
}
