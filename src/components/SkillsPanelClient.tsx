'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Hammer, Briefcase, Users, Fish, Wine, Leaf, Compass, Gamepad2,
  GripVertical, Home, Scroll,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SidebarFunGame from './SidebarFunGame'

export type ChanKey =
  | 'PROJECTS' | 'BUSINESS' | 'COMMUNITY'
  | 'FISHING' | 'FOOD' | 'GARDENING' | 'TRAVEL' | 'FUN'
  | 'QUESTS' | 'DEMO'

const CHAN: Record<Exclude<ChanKey, 'DEMO'>, { label: string; Icon: LucideIcon; bg: string; href: string }> = {
  PROJECTS:  { label: 'Projects',    Icon: Hammer,    bg: '#382e0e', href: '/skills/projects' },
  BUSINESS:  { label: 'Business',    Icon: Briefcase, bg: '#1c2e10', href: '/skills/business' },
  COMMUNITY: { label: 'Community',   Icon: Users,     bg: '#181e4a', href: '/skills/community' },
  FISHING:   { label: 'Fishing',     Icon: Fish,      bg: '#0e2c48', href: '/skills/fishing' },
  FOOD:      { label: 'Food & Wine', Icon: Wine,      bg: '#4e2006', href: '/skills/food' },
  GARDENING: { label: 'Gardening',   Icon: Leaf,      bg: '#0e3810', href: '/skills/gardening' },
  TRAVEL:    { label: 'Adventure',   Icon: Compass,   bg: '#382808', href: '/skills/travel' },
  FUN:       { label: 'Games',       Icon: Gamepad2,  bg: '#320c4a', href: '/skills/fun' },
  QUESTS:    { label: 'Quests',      Icon: Scroll,    bg: '#2a1a06', href: '/quests' },
}

export const DEFAULT_CHAN_ORDER: ChanKey[] = [
  'PROJECTS', 'BUSINESS', 'COMMUNITY',
  'FISHING', 'FOOD', 'GARDENING', 'TRAVEL', 'FUN', 'QUESTS', 'DEMO',
]

// ── Draggable mini-game row ───────────────────────────────────────────────────
function DemoRow({ isAdmin }: { isAdmin: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: 'DEMO' })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      {isAdmin && (
        <button
          {...listeners}
          {...attributes}
          tabIndex={-1}
          style={{
            flexShrink: 0, width: 22, background: 'none', border: 'none',
            cursor: 'grab', color: '#5a4a30', touchAction: 'none', padding: '10px 0 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          }}
        >
          <GripVertical size={11} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <SidebarFunGame />
      </div>
    </div>
  )
}

// ── Single draggable channel row ──────────────────────────────────────────────
function ChannelRow({
  id, communityLevel, postCount, isAdmin, pathname,
}: {
  id: Exclude<ChanKey, 'DEMO'>
  communityLevel: number
  postCount: number
  isAdmin: boolean
  pathname: string
}) {
  const cfg = CHAN[id]
  const isActive = pathname === cfg.href || pathname.startsWith(cfg.href + '/')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'stretch',
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {isAdmin && (
        <button
          {...listeners}
          {...attributes}
          tabIndex={-1}
          style={{
            flexShrink: 0, width: 22, background: 'none', border: 'none',
            cursor: 'grab', color: '#5a4a30', touchAction: 'none', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <GripVertical size={11} />
        </button>
      )}

      <Link
        href={cfg.href}
        className="guild-channel"
        style={{
          flex: 1,
          paddingLeft: 8,
          paddingRight: 12,
          borderLeftColor: isActive ? '#c89b3c' : 'transparent',
          background: isActive ? 'rgba(200,155,60,0.1)' : undefined,
          color: isActive ? '#f0d898' : undefined,
          minHeight: 48,
        }}
      >
        <span style={{
          flexShrink: 0, width: 34, height: 34,
          background: cfg.bg, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <cfg.Icon size={18} color="#dcc898" strokeWidth={1.6} />
        </span>

        <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cfg.label}
        </span>

        {id !== 'QUESTS' && (
          <span style={{
            flexShrink: 0,
            background: 'rgba(200,155,60,0.13)',
            border: '1px solid rgba(200,155,60,0.32)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 9,
            fontFamily: "'Press Start 2P', monospace",
            color: '#c89b3c',
            letterSpacing: '0.03em',
          }}>
            {communityLevel}
          </span>
        )}

        {isAdmin && postCount > 0 && (
          <span style={{ flexShrink: 0, fontSize: 8, color: '#6a5030', marginLeft: 4 }}>
            {postCount}
          </span>
        )}
      </Link>
    </div>
  )
}

// ── Panel client root ─────────────────────────────────────────────────────────
interface Props {
  initialOrder: ChanKey[]
  communityLevels: Record<string, number>
  postCounts: Record<string, number>
  isAdmin: boolean
}

export default function SkillsPanelClient({
  initialOrder, communityLevels, postCounts, isAdmin,
}: Props) {
  const [order, setOrder] = useState<ChanKey[]>(initialOrder)
  const pathname = usePathname()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = order.indexOf(active.id as ChanKey)
    const to   = order.indexOf(over.id   as ChanKey)
    const next = arrayMove(order, from, to)
    setOrder(next)
    fetch('/api/admin/skills-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next }),
    }).catch(() => {})
  }

  const isHome = pathname === '/'

  return (
    <div>
      {/* Home */}
      <Link
        href="/"
        className="guild-channel"
        style={{
          paddingLeft: 14,
          borderLeftColor: isHome ? '#c89b3c' : 'transparent',
          background: isHome ? 'rgba(200,155,60,0.1)' : undefined,
          color: isHome ? '#f0d898' : undefined,
        }}
      >
        <span style={{ flexShrink: 0, width: 34, height: 34, background: '#241a08', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Home size={18} color="#dcc898" strokeWidth={1.6} />
        </span>
        <span style={{ fontSize: 11 }}>Home</span>
      </Link>

      {/* Section label */}
      <div style={{ padding: '10px 14px 6px', fontSize: 9, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>
        ⚔ Communities
      </div>

      {/* Draggable community channels */}
      <DndContext
        sensors={isAdmin ? sensors : []}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map(key =>
            key === 'DEMO'
              ? <DemoRow key="DEMO" isAdmin={isAdmin} />
              : (
                <ChannelRow
                  key={key}
                  id={key}
                  communityLevel={communityLevels[key] ?? 1}
                  postCount={postCounts[key] ?? 0}
                  isAdmin={isAdmin}
                  pathname={pathname}
                />
              )
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}
