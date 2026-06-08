import { auth } from '@/auth'
import AuthButton from './AuthButton'
import Link from 'next/link'

export default async function SiteHeader() {
  const session = await auth()
  return (
    <header className="osrs-panel-dark px-4 py-2 flex items-center justify-between border-b border-[#5c3d1e]">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-[#ff981f] text-[12px] font-bold hover:text-[#ffcc44]">
          ⚔ Garret&apos;s World
        </Link>
        <Link href="/blog" className="text-[8px] text-[#ffe066] hover:text-[#ffcc44]">
          Blog
        </Link>
        <Link href="/contact" className="text-[8px] text-[#ffe066] hover:text-[#ffcc44]">
          Contact
        </Link>
      </div>
      <AuthButton session={session} />
    </header>
  )
}
