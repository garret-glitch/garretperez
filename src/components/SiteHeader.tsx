import { auth } from '@/auth'
import AuthButton from './AuthButton'
import Link from 'next/link'

export default async function SiteHeader() {
  const session = await auth()
  return (
    <header className="osrs-panel-dark px-4 py-2 flex items-center justify-between border-b-2 border-[#424242]">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-[#d0d0d0] text-[12px] font-bold hover:text-white">
          ⚔ Garret&apos;s World
        </Link>
        <Link href="/blog" className="text-[8px] text-[#b0b0b0] hover:text-[#e0e0e0]">
          Blog
        </Link>
        <Link href="/quest-board" className="text-[8px] text-[#b0b0b0] hover:text-[#e0e0e0]">
          Quests
        </Link>
        <Link href="/contact" className="text-[8px] text-[#b0b0b0] hover:text-[#e0e0e0]">
          Contact
        </Link>
        {session?.user?.name === 'garret' && (
          <Link href="/admin" className="text-[8px] text-[#ffe066] hover:text-[#fff]">
            Admin
          </Link>
        )}
      </div>
      <AuthButton session={session} />
    </header>
  )
}
