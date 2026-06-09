'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Homepage', href: '/admin/homepage', icon: '🏠' },
  { label: 'Projects', href: '/admin/projects', icon: '⚒️' },
  { label: 'Quests', href: '/admin/quests', icon: '⚔️' },
  { label: 'Blog', href: '/admin/blog', icon: '📝' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Community', href: '/admin/community', icon: '💬' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'RPG System', href: '/admin/rpg', icon: '🎮' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div
      className="shrink-0 w-36 border-r flex flex-col"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[7px] font-bold" style={{ color: 'var(--gold)' }}>
          ⚙️ Admin
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[6.5px] transition-colors"
              style={{
                color: active ? 'var(--gold)' : 'var(--text-2)',
                borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
                background: active ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
