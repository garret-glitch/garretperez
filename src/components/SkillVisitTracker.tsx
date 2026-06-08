'use client'
import { useEffect } from 'react'

export default function SkillVisitTracker({ skill }: { skill: string }) {
  useEffect(() => {
    fetch('/api/skill-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
    }).catch(() => {})
  }, [skill])
  return null
}
