'use client'
import { useState } from 'react'

export default function WineFavoriteButton({ label }: { label: string }) {
  const [saved, setSaved] = useState(false)
  return (
    <button
      onClick={() => setSaved(s => !s)}
      title={saved ? 'Remove from favorites' : 'Save to favorites'}
      aria-label={`${saved ? 'Remove' : 'Save'} ${label}`}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 22, lineHeight: 1, padding: '4px 6px',
        color: saved ? '#c84060' : 'rgba(200,155,60,0.3)',
        transition: 'color 0.15s, transform 0.15s',
        flexShrink: 0,
      }}
      onMouseOver={e => { if (!saved) e.currentTarget.style.color = 'rgba(200,60,80,0.6)' }}
      onMouseOut={e => { if (!saved) e.currentTarget.style.color = 'rgba(200,155,60,0.3)' }}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
