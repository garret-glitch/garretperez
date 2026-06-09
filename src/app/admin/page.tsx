'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AnalyticsData {
  totalUsers: number
  totalPosts: number
  totalRecipes: number
  totalXp: number
  recentUsers: { id: string; username: string; createdAt: string }[]
  topPosters: { username: string; postCount: number }[]
  postsBySkill: { skill: string; count: number }[]
  topXpUsers: { username: string; totalXp: number }[]
}

const QUICK_LINKS = [
  { label: 'Homepage', href: '/admin/homepage', icon: '🏠' },
  { label: 'Projects', href: '/admin/projects', icon: '⚒️' },
  { label: 'Quests', href: '/admin/quests', icon: '⚔️' },
  { label: 'Blog', href: '/admin/blog', icon: '📝' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Community', href: '/admin/community', icon: '💬' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'RPG System', href: '/admin/rpg', icon: '🎮' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
  { label: 'Live Site', href: '/', icon: '🌐' },
]

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false) })
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>
          ⚙️ Admin Dashboard
        </h1>
        <p className="text-[7px] mt-0.5" style={{ color: 'var(--text-2)' }}>
          v2.0 — Full CMS
        </p>
        {error && (
          <div className="mt-2 bg-[#3a1a1a] border border-[#8a4a4a] rounded px-2 py-1 text-[7px] text-[#e09090]">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Members', value: data.totalUsers },
              { label: 'Total Posts', value: data.totalPosts },
              { label: 'Total Recipes', value: data.totalRecipes },
              { label: 'Total XP Earned', value: data.totalXp.toLocaleString() },
            ].map(stat => (
              <div
                key={stat.label}
                className="osrs-panel-dark rounded-xl text-center py-3 px-2"
              >
                <div className="text-[13px] font-bold" style={{ color: 'var(--gold)' }}>
                  {stat.value}
                </div>
                <div className="text-[6px] mt-1" style={{ color: 'var(--text-2)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="osrs-panel-dark rounded-xl">
            <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>
              Quick Links
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {QUICK_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded border transition-colors text-center"
                  style={{
                    borderColor: 'var(--border-lit)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-1)',
                  }}
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="text-[6px]" style={{ color: 'var(--text-2)' }}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Top XP Users + Recent Members */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Top XP */}
            <div className="osrs-panel-dark rounded-xl">
              <h2 className="text-[9px] font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                Top XP Users
              </h2>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>Username</th>
                    <th className="text-right text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topXpUsers ?? []).slice(0, 5).map((u, i) => (
                    <tr key={u.username} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-1 text-[7px]" style={{ color: 'var(--text-1)' }}>
                        <span style={{ color: 'var(--text-3)' }} className="text-[6px] mr-1">
                          #{i + 1}
                        </span>
                        {u.username}
                      </td>
                      <td className="py-1 text-right text-[7px]" style={{ color: 'var(--gold)' }}>
                        {u.totalXp.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Members */}
            <div className="osrs-panel-dark rounded-xl">
              <h2 className="text-[9px] font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                Recent Members
              </h2>
              <div className="space-y-1">
                {(data.recentUsers ?? []).slice(0, 5).map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-1 border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[7px]" style={{ color: 'var(--text-1)' }}>
                      {u.username}
                    </span>
                    <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
