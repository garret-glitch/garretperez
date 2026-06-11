import React from 'react'

export const metadata = { title: 'Lumina — Flow Puzzle' }

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto' }}>
      {children}
    </div>
  )
}
