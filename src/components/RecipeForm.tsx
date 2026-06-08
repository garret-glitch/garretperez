'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RecipeForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) return
    setStatus('submitting')

    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        ingredients: ingredients.split('\n').filter(l => l.trim()),
        instructions: instructions.trim(),
      }),
    })

    if (res.ok) {
      setTitle('')
      setDescription('')
      setIngredients('')
      setInstructions('')
      setStatus('success')
      setMsg('+50 Cooking XP earned!')
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    } else if (res.status === 401) {
      setStatus('error')
      setMsg('You must be logged in to add recipes.')
    } else {
      setStatus('error')
      setMsg('Something went wrong. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="osrs-panel space-y-3">
      <h3 className="text-[9px] text-[#3c2a1e] font-bold">🍳 Add Recipe (+50 Cooking XP)</h3>
      <input
        className="osrs-input"
        placeholder="Recipe name"
        value={title}
        onChange={e => setTitle(e.target.value)}
        disabled={status === 'submitting'}
        maxLength={120}
      />
      <input
        className="osrs-input"
        placeholder="Short description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        disabled={status === 'submitting'}
        maxLength={200}
      />
      <div>
        <label className="text-[7px] text-[#3c2a1e] mb-1 block">Ingredients (one per line)</label>
        <textarea
          className="osrs-input h-20 resize-none"
          placeholder={'2 cups flour\n1 tsp salt\n...'}
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          disabled={status === 'submitting'}
        />
      </div>
      <div>
        <label className="text-[7px] text-[#3c2a1e] mb-1 block">Instructions</label>
        <textarea
          className="osrs-input h-24 resize-none"
          placeholder="Step-by-step instructions..."
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          disabled={status === 'submitting'}
        />
      </div>
      <button
        type="submit"
        className="osrs-btn"
        disabled={status === 'submitting' || !title.trim() || !ingredients.trim() || !instructions.trim()}
      >
        {status === 'submitting' ? 'Adding...' : 'Add Recipe'}
      </button>
      {msg && (
        <p className={`text-[8px] ${status === 'error' ? 'text-red-700' : 'text-[#007700]'}`}>
          {msg}
        </p>
      )}
    </form>
  )
}
