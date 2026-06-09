'use client'
import { useEffect, useState } from 'react'

interface Entry {
  rank: number
  username: string
  score: number
  isCurrentUser: boolean
}

interface Props {
  game: string
  scoreLabel?: string
  lowerIsBetter?: boolean
  refreshKey?: number
}

export default function GameLeaderboard({ game, scoreLabel = 'pts', lowerIsBetter = false, refreshKey = 0 }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/minigame/leaderboard/${game}`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setEntries([]); setLoading(false) })
  }, [game, refreshKey])

  return (
    <div className="rp-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[9px]" style={{ color: 'var(--gold)' }}>🏆 High Scores</h3>
        {lowerIsBetter && (
          <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>lower is better</span>
        )}
      </div>
      {loading ? (
        <p className="text-[7px]" style={{ color: 'var(--text-3)' }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-[7px]" style={{ color: 'var(--text-3)' }}>No scores yet — be the first!</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(e => (
            <div
              key={e.rank}
              className="flex items-center gap-2 text-[7px]"
              style={{ color: e.isCurrentUser ? 'var(--gold)' : 'var(--text-2)' }}
            >
              <span className="w-5 shrink-0 text-right" style={{ color: 'var(--text-3)' }}>
                #{e.rank}
              </span>
              <span className="flex-1 truncate">
                {e.username}{e.isCurrentUser ? ' ★' : ''}
              </span>
              <span className="shrink-0">{e.score} {scoreLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
