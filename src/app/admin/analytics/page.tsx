'use client'
import { useEffect, useState } from 'react'

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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="osrs-panel-dark rounded-xl text-[7px] py-8 text-center" style={{ color: 'var(--text-2)' }}>
        Loading...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="osrs-panel-dark rounded-xl text-[7px] py-8 text-center" style={{ color: '#e09090' }}>
        {error || 'No data.'}
      </div>
    )
  }

  const maxSkillCount = Math.max(...(data.postsBySkill ?? []).map(s => s.count), 1)

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>📈 Analytics</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>Site-wide statistics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Members', value: data.totalUsers },
          { label: 'Posts', value: data.totalPosts },
          { label: 'Recipes', value: data.totalRecipes },
          { label: 'Total XP', value: data.totalXp.toLocaleString() },
        ].map(stat => (
          <div key={stat.label} className="osrs-panel-dark rounded-xl text-center py-3 px-2">
            <div className="text-[13px] font-bold" style={{ color: 'var(--gold)' }}>
              {stat.value}
            </div>
            <div className="text-[6px] mt-1" style={{ color: 'var(--text-2)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top XP Users */}
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>Top Members by XP</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>#</th>
                <th className="text-left text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>Username</th>
                <th className="text-right text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>XP</th>
              </tr>
            </thead>
            <tbody>
              {(data.topXpUsers ?? []).map((u, i) => (
                <tr key={u.username} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1 text-[6px]" style={{ color: 'var(--text-3)' }}>#{i + 1}</td>
                  <td className="py-1 text-[7px]" style={{ color: 'var(--text-1)' }}>{u.username}</td>
                  <td className="py-1 text-right text-[7px]" style={{ color: 'var(--gold)' }}>
                    {u.totalXp.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Posters */}
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>Top Posters</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>#</th>
                <th className="text-left text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>Username</th>
                <th className="text-right text-[6px] pb-1" style={{ color: 'var(--text-3)' }}>Posts</th>
              </tr>
            </thead>
            <tbody>
              {(data.topPosters ?? []).map((u, i) => (
                <tr key={u.username} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1 text-[6px]" style={{ color: 'var(--text-3)' }}>#{i + 1}</td>
                  <td className="py-1 text-[7px]" style={{ color: 'var(--text-1)' }}>{u.username}</td>
                  <td className="py-1 text-right text-[7px]" style={{ color: 'var(--gold)' }}>
                    {u.postCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Posts by Skill */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>Posts by Skill</h2>
        <div className="space-y-2">
          {(data.postsBySkill ?? [])
            .sort((a, b) => b.count - a.count)
            .map(s => (
              <div key={s.skill} className="flex items-center gap-2">
                <span className="text-[6px] w-20 shrink-0" style={{ color: 'var(--text-2)' }}>
                  {s.skill}
                </span>
                <div
                  className="flex-1 rounded-sm overflow-hidden"
                  style={{ height: '8px', background: 'var(--bg-page)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(s.count / maxSkillCount) * 100}%`,
                      background: 'linear-gradient(90deg, var(--gold), #e8b84c)',
                    }}
                  />
                </div>
                <span className="text-[6px] w-6 text-right shrink-0" style={{ color: 'var(--text-3)' }}>
                  {s.count}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Signups */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>Recent Signups</h2>
        <div className="space-y-1">
          {(data.recentUsers ?? []).map(u => (
            <div
              key={u.id}
              className="flex items-center justify-between py-1 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[7px]" style={{ color: 'var(--text-1)' }}>{u.username}</span>
              <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
