'use client'
import { useState, useRef } from 'react'
import { WINE_QUESTIONS } from '@/lib/trivia-questions'
import Link from 'next/link'

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
  const hasAwardedXp = useRef(false)

  function startGame() {
    setQuestions(shuffle(WINE_QUESTIONS).slice(0, 10))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setXpMsg('')
    hasAwardedXp.current = false
    setPhase('playing')
  }

  async function handleAnswer(optionIdx: number) {
    if (selected !== null) return
    setSelected(optionIdx)
    const q = questions[current]
    const isCorrect = optionIdx === q.correct
    const newScore = isCorrect ? score + 1 : score
    if (isCorrect) setScore(newScore)

    setTimeout(async () => {
      if (current + 1 >= questions.length) {
        setPhase('finished')
        if (newScore >= 7 && !hasAwardedXp.current) {
          hasAwardedXp.current = true
          const r = await fetch('/api/minigame/win', { method: 'POST' })
          if (r.ok) setXpMsg('+25 Fun XP earned!')
          else if (r.status === 401) setXpMsg('Login to save your XP!')
        }
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
      }
    }, 1200)
  }

  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="osrs-panel text-center">
          <div className="text-4xl mb-3">🍷</div>
          <h1 className="text-[12px] text-[#3c2a1e] font-bold">Wine Trivia</h1>
          <p className="text-[8px] text-[#5c3d1e] mt-2 leading-relaxed">
            10 questions. Score 7 or more to earn +25 Fun XP!
          </p>
          <button onClick={startGame} className="osrs-btn mt-4">Start Quiz</button>
        </div>
        <Link href="/skills/fun" className="text-[8px] text-[#ff981f] hover:underline">
          ← Back to Fun
        </Link>
      </div>
    )
  }

  if (phase === 'finished') {
    const won = score >= 7
    return (
      <div className="space-y-4">
        <div className="osrs-panel text-center">
          <div className="text-4xl mb-3">{won ? '🏆' : '😔'}</div>
          <h2 className="text-[12px] text-[#3c2a1e] font-bold">
            {won ? 'Well done!' : 'Better luck next time!'}
          </h2>
          <p className="text-[10px] text-[#5c3d1e] mt-2">Score: {score} / 10</p>
          {xpMsg && <p className="text-[9px] text-[#007700] mt-2">{xpMsg}</p>}
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={startGame} className="osrs-btn">Play Again</button>
            <Link href="/skills/fun" className="osrs-btn">← Back</Link>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <div className="flex justify-between text-[7px] text-[#5c3d1e] mb-3">
          <span>Question {current + 1} / 10</span>
          <span>Score: {score}</span>
        </div>
        <p className="text-[10px] text-[#3c2a1e] font-bold mb-4 leading-relaxed">{q.question}</p>
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
    </div>
  )
}
