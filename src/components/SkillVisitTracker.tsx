'use client'
import { useEffect } from 'react'
import { emitXpGained } from '@/components/XpToast'

export default function SkillVisitTracker({ skill }: { skill: string }) {
  useEffect(() => {
    fetch('/api/skill-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
    })
      .then(r => r.json())
      .then(d => { if (d.xpAwarded > 0) emitXpGained(d.xpAwarded) })
      .catch(() => {})
  }, [skill])
  return null
}
