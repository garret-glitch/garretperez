'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'
import { emitXpGained } from '@/components/XpToast'

const PAIRS = ['🍷', '🍺', '🍸', '🍹', '🥂', '🍾', '🫗', '🧀']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Card {
  id: number
  value: string
  isFlipped: boolean
  isMatched: boolean
}

function createDeck(): Card[] {
  return shuffle([...PAIRS, ...PAIRS]).map((value, id) => ({
    id,
    value,
    isFlipped: false,
    isMatched: false,
  }))
}

export default function MatchingGamePage() {
  const [cards, setCards] = useState<Card[]>(createDeck)
  const [firstFlip, setFirstFlip] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [locked, setLocked] = useState(false)
  const [won, setWon] = useState(false)
  const [xpMsg, setXpMsg] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const hasAwardedXp = useRef(false)
  const hasSubmittedScore = useRef(false)
  const finalMovesRef = useRef(0)

  useEffect(() => {
    if (!won || hasSubmittedScore.current) return
    hasSubmittedScore.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'matching', score: finalMovesRef.current }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [won])

  function resetGame() {
    setCards(createDeck())
    setFirstFlip(null)
    setMoves(0)
    setMatches(0)
    setLocked(false)
    setWon(false)
    setXpMsg('')
    hasAwardedXp.current = false
    hasSubmittedScore.current = false
  }

  async function handleClick(cardId: number) {
    if (locked) return
    const card = cards.find(c => c.id === cardId)
    if (!card || card.isFlipped || card.isMatched) return

    const flipped = cards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c)
    setCards(flipped)

    if (firstFlip === null) {
      setFirstFlip(cardId)
      return
    }

    setMoves(m => m + 1)
    setLocked(true)

    const firstCard = cards.find(c => c.id === firstFlip)!

    if (firstCard.value === card.value) {
      const newMatches = matches + 1
      setMatches(newMatches)
      setCards(prev =>
        prev.map(c => c.id === cardId || c.id === firstFlip ? { ...c, isMatched: true } : c)
      )
      setFirstFlip(null)
      setLocked(false)

      if (newMatches === PAIRS.length) {
        finalMovesRef.current = moves + 1
        setWon(true)
        if (!hasAwardedXp.current) {
          hasAwardedXp.current = true
          const r = await fetch('/api/minigame/win', { method: 'POST' })
          if (r.ok) {
            const d = await r.json()
            const xp = d.xpAwarded ?? 25
            emitXpGained(xp)
            setXpMsg(`+${xp} Fun XP earned!`)
          } else if (r.status === 401) setXpMsg('Login to save your XP!')
        }
      }
    } else {
      setTimeout(() => {
        setCards(prev =>
          prev.map(c => c.id === cardId || c.id === firstFlip ? { ...c, isFlipped: false } : c)
        )
        setFirstFlip(null)
        setLocked(false)
      }, 800)
    }
  }

  const leaderboard = <GameLeaderboard game="matching" scoreLabel="moves" lowerIsBetter refreshKey={refreshKey} />

  if (won) {
    return (
      <div className="space-y-4">
        <div className="rp-card rounded-xl text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="text-[12px] font-bold" style={{ color: 'var(--gold)' }}>You win!</h2>
          <p className="text-[9px] mt-2" style={{ color: 'var(--text-2)' }}>Completed in {moves} moves</p>
          {xpMsg && <p className="text-[9px] mt-2" style={{ color: '#4ade80' }}>{xpMsg}</p>}
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={resetGame} className="osrs-btn">Play Again</button>
            <Link href="/skills/fun" className="osrs-btn">← Back</Link>
          </div>
        </div>
        {leaderboard}
        <Link href="/skills/fun" className="text-[8px] text-[#a0bcd0] hover:underline">
          ← Back to Fun
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rp-card rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[10px] font-bold" style={{ color: 'var(--text-1)' }}>🃏 Matching Game</h1>
          <span className="text-[7px]" style={{ color: 'var(--text-3)' }}>
            Moves: {moves} | {matches}/{PAIRS.length} matched
          </span>
        </div>
        <p className="text-[7px] mb-3" style={{ color: 'var(--text-2)' }}>Match all pairs to earn +25 Fun XP!</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleClick(card.id)}
              className={`
                h-20 sm:h-14 text-3xl sm:text-2xl border-2 transition-all rounded
                ${card.isMatched
                  ? 'border-green-700 bg-green-900 opacity-50 cursor-default'
                  : card.isFlipped
                    ? 'border-[#a0a0a0] bg-[#5a5a5a] cursor-default'
                    : 'border-[#3d3d3d] bg-[#282828] hover:bg-[#383838] cursor-pointer'
                }
              `}
            >
              {card.isFlipped || card.isMatched ? card.value : '?'}
            </button>
          ))}
        </div>

        <button onClick={resetGame} className="osrs-btn mt-3">Reset</button>
      </div>
      {leaderboard}
      <Link href="/skills/fun" className="text-[8px] hover:underline" style={{ color: 'var(--text-3)' }}>
        ← Back to Fun
      </Link>
    </div>
  )
}
