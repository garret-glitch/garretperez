'use client'
import { useState, useRef, useEffect } from 'react'
import { WINE_QUESTIONS } from '@/lib/trivia-questions'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WineTriviaPage() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'finished'>('idle')
  const [questions, setQuestions] = useState(() => shuffle(WINE_QUESTIONS).slice(0, 10))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [xpMsg, setXpMsg] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const hasAwardedXp = useRef(false)
  const hasSubmittedScore = useRef(false)
  const finalScoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'finished' || hasSubmittedScore.current || finalScoreRef.current < 7) return
    hasSubmittedScore.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'wine-trivia', score: finalScoreRef.current }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  function startGame() {
    setQuestions(shuffle(WINE_QUESTIONS).slice(0, 10))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setXpMsg('')
    hasAwardedXp.current = false
    hasSubmittedScore.current = false
    setPhase('playing')
  }

  async function handleAnswer(optionIdx: number) {
    if (selected !== null) return
    setSelected(optionIdx)
    const q = questions[current]
    const isCorrect = optionIdx === q.correct
    const newScore = isCorrect ? score + 1 : score
    if (isCorrect) setScore(newScore)
    finalScoreRef.current = newScore

    setTimeout(async () => {
      if (current + 1 >= questions.length) {
        setPhase('finished')
        if (newScore >= 7 && !hasAwardedXp.current) {
          hasAwardedXp.current = true
          const r = await fetch('/api/minigame/win', { method: 'POST' })
          if (r.ok) setXpMsg('+20 Fun XP earned!')
          else if (r.status === 401) setXpMsg('Login to save your XP!')
        }
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
      }
    }, 1200)
  }

  const leaderboard = <GameLeaderboard game="wine-trivia" scoreLabel="/ 10" refreshKey={refreshKey} />

  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="rp-card rounded-xl text-center">
          <div className="text-4xl mb-3">🍷</div>
          <h1 className="text-[12px] font-bold" style={{ color: 'var(--gold)' }}>Wine Trivia</h1>
          <p className="text-[8px] mt-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            10 questions. Score 7 or more to earn +25 Fun XP!
          </p>
          <button onClick={startGame} className="osrs-btn mt-4">Start Quiz</button>
        </div>
        {leaderboard}
        <Link href="/skills/fun" className="text-[8px] hover:underline" style={{ color: 'var(--text-3)' }}>
          ← Back to Fun
        </Link>
      </div>
    )
  }

  if (phase === 'finished') {
    const won = score >= 7
    return (
      <div className="space-y-4">
        <div className="rp-card rounded-xl text-center">
          <div className="text-4xl mb-3">{won ? '🏆' : '😔'}</div>
          <h2 className="text-[12px] font-bold" style={{ color: won ? 'var(--gold)' : 'var(--text-1)' }}>
            {won ? 'Well done!' : 'Better luck next time!'}
          </h2>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-2)' }}>Score: {score} / 10</p>
          {xpMsg && <p className="text-[9px] mt-2" style={{ color: '#4ade80' }}>{xpMsg}</p>}
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={startGame} className="osrs-btn">Play Again</button>
            <Link href="/skills/fun" className="osrs-btn">← Back</Link>
          </div>
        </div>
        {leaderboard}
        <Link href="/skills/fun" className="text-[8px] hover:underline" style={{ color: 'var(--text-3)' }}>
          ← Back to Fun
        </Link>
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="space-y-4">
      <div className="rp-card rounded-xl">
        <div className="flex justify-between text-[7px] mb-3" style={{ color: 'var(--text-3)' }}>
          <span>Question {current + 1} / 10</span>
          <span style={{ color: 'var(--gold)' }}>Score: {score}</span>
        </div>
        <p className="text-[10px] font-bold mb-4 leading-relaxed" style={{ color: 'var(--text-1)' }}>{q.question}</p>
        <div className="space-y-2">
          {q.options.map((option, i) => {
            let extra = ''
            if (selected !== null) {
              if (i === q.correct) extra = ' !bg-green-700 !text-white !border-green-900'
              else if (i === selected) extra = ' !bg-red-700 !text-white !border-red-900'
            }
            return (
              <button
                key={i}
                className={`osrs-btn w-full text-left${extra}`}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
              >
                {String.fromCharCode(65 + i)}. {option}
              </button>
            )
          })}
        </div>
      </div>
      {leaderboard}
    </div>
  )
}
