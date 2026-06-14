'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TackleBoxToggle({ hidden, settingKey }: { hidden: boolean; settingKey: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    await fetch('/api/admin/fishing-tackle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: settingKey, hidden: !hidden }),
    })
    router.refresh()
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        padding: '4px 12px',
        background: hidden ? 'rgba(200,155,60,0.12)' : 'rgba(0,0,0,0.35)',
        border: `1px solid ${hidden ? 'rgba(200,155,60,0.4)' : 'rgba(200,155,60,0.2)'}`,
        color: hidden ? '#c89b3c' : '#7a6030',
        fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600,
        cursor: busy ? 'wait' : 'pointer',
        borderRadius: 6,
        opacity: busy ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {busy ? '…' : hidden ? '👁 Show' : '🚫 Hide'}
    </button>
  )
}
