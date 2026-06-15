'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { emitXpGained } from '@/components/XpToast'
import GameLeaderboard from '@/components/GameLeaderboard'

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
const CW = 800, CH = 570
const SR_W = 148                                            // stock room width
const OFF = { x: 630, y: 102, w: CW - 630, h: 100 }       // manager office (below the HUD band)
const ENT_X = 315, ENT_W = 170                             // entrance strip

const PR = 13, MR = 16                                     // player / manager radius

const PLAYER_SPD = 158, SPRINT_SPD = 278
const STAM_MAX = 100, STAM_DRAIN = 32, STAM_REGEN = 19

const SHELF_MAX = 8, CASE_FILL = 4
const STOCK_R = 56

const BASE_CUST_INT = 3.6
const BASE_MGR_INT = 23
const BASE_CUST_SPD = 55

const XP_THRESHOLD = 400

const SHELF_DEFS = [
  { id: 0, x: 207, y: 148, w: 94, h: 38, label: 'Cabernet',   clr: '#9B2335' },
  { id: 1, x: 354, y: 148, w: 94, h: 38, label: 'Merlot',     clr: '#C0392B' },
  { id: 2, x: 501, y: 148, w: 94, h: 38, label: 'Pinot',      clr: '#6B2737' },
  { id: 3, x: 207, y: 344, w: 94, h: 38, label: 'Chardonnay', clr: '#C8A020' },
  { id: 4, x: 354, y: 344, w: 94, h: 38, label: 'Sauvignon',  clr: '#7DB874' },
  { id: 5, x: 501, y: 344, w: 94, h: 38, label: 'Rosé',       clr: '#E8A0BF' },
]

/* ═══════════════════════ TYPES ═══════════════════════ */
interface V2 { x: number; y: number }
interface Shelf { id: number; x: number; y: number; w: number; h: number; label: string; clr: string; stock: number }
type CustState = 'entering' | 'approaching' | 'asking' | 'walking' | 'taking' | 'leaving'
interface Customer { id: number; pos: V2; state: CustState; target: V2; shelfId: number; spd: number; takeTimer: number; clr: string; sz: number }
type MgrState = 'idle' | 'walking' | 'dialogue' | 'returning'
interface Mgr { pos: V2; state: MgrState; target: V2; homePos: V2; lines: string[]; mood: 'happy'|'angry'; dialogueTimer: number; nextInspection: number }
type PUType = 'energy_drink' | 'forklift' | 'vendor_support' | 'eotm' | 'overtime'
interface PU { id: number; pos: V2; type: PUType; life: number }
interface Efx { sprint: number; forklift: number; vendor: number; vendorShelf: number; multi: number; multiTimer: number }

interface GS {
  phase: 'playing' | 'dialogue' | 'gameover'
  player: { pos: V2; vel: V2; cases: number; maxCases: number; stamina: number; dir: V2; staminaDepleted: boolean }
  shelves: Shelf[]
  custs: Customer[]; nextCid: number; nextCSpawn: number
  mgr: Mgr
  pups: PU[]; nextPid: number; nextPSpawn: number
  score: number; level: number; strikes: number; time: number; emptyCaseTimer: number
  efx: Efx
  activeAsker: number | null   // customer id blocking the player
  wrongFlash: number           // timer for wrong-shelf feedback
  custPerk: { type: PUType; timer: number } | null  // notification for perk earned
  levelUpTimer: number
  stockFlashes: Array<{ shelfId: number; timer: number }>
}

/* ═══════════════════════ HELPERS ═══════════════════════ */
const v = (x: number, y: number): V2 => ({ x, y })
const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
const norm = (d: V2): V2 => { const m = Math.hypot(d.x, d.y) || 1; return v(d.x/m, d.y/m) }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const rnd  = (a: number, b: number) => a + Math.random() * (b - a)
const rndI = (a: number, b: number) => Math.floor(rnd(a, b + 0.99))
const fpos = (): V2 => v(rnd(SR_W + 32, CW - 32), rnd(130, CH - 55))

/* ═══════════════════════ DATA ═══════════════════════ */
const PU_INFO: Record<PUType, { em: string; col: string }> = {
  energy_drink:   { em: '⚡', col: '#00E5FF' },
  forklift:       { em: '🏗', col: '#FFC107' },
  vendor_support: { em: '📦', col: '#8BC34A' },
  eotm:           { em: '⭐', col: '#FF9800' },
  overtime:       { em: '💰', col: '#E91E63' },
}

const HAPPY = [
  ["Great work!", "Everything looks perfect.", "+100 BONUS POINTS!"],
  ["Beautiful shelves!", "You&apos;re a natural.", "+100 BONUS POINTS!"],
  ["Top notch!", "The vendor will love this!", "+100 BONUS POINTS!"],
]
const ANGRY = [
  ["What happened here?!", "Get those shelves stocked!", "I'm watching you."],
  ["This is UNACCEPTABLE.", "Second warning!", "One more strike..."],
  ["You are DONE.", "Vendor complaint filed.", "GET OUT OF MY STORE."],
]

/* ═══════════════════════ INITIAL STATE ═══════════════════════ */
function mkState(): GS {
  const hp = v(OFF.x + OFF.w/2, OFF.y + OFF.h/2)
  return {
    phase: 'playing',
    player: { pos: v(SR_W + 90, CH/2), vel: v(0,0), cases: 0, maxCases: 1, stamina: STAM_MAX, dir: v(1,0), staminaDepleted: false },
    shelves: SHELF_DEFS.map(s => ({ ...s, stock: SHELF_MAX })),
    custs: [], nextCid: 0, nextCSpawn: BASE_CUST_INT,
    mgr: { pos: { ...hp }, state: 'idle', target: { ...hp }, homePos: { ...hp }, lines: [], mood: 'happy', dialogueTimer: 0, nextInspection: BASE_MGR_INT },
    pups: [], nextPid: 0, nextPSpawn: rnd(18, 32),
    score: 0, level: 1, strikes: 0, time: 0, emptyCaseTimer: 0,
    efx: { sprint: 0, forklift: 0, vendor: 0, vendorShelf: -1, multi: 1, multiTimer: 0 },
    activeAsker: null, wrongFlash: 0, custPerk: null,
    levelUpTimer: 0, stockFlashes: [],
  }
}

/* ═══════════════════════ SIMULATION ═══════════════════════ */
function tick(g: GS, dt: number, keys: Set<string>) {
  if (g.phase === 'gameover') return
  // Game always runs — dialogue is just a visual overlay
  tickPlay(g, dt, keys)
  // Tick dialogue timer while overlay is visible
  if (g.phase === 'dialogue') {
    g.mgr.dialogueTimer -= dt
    if (g.mgr.dialogueTimer <= 0) {
      if (g.strikes >= 3) { g.phase = 'gameover'; return }
      g.phase = 'playing'
      g.mgr.state = 'returning'
      g.mgr.target = { ...g.mgr.homePos }
    }
  }
}

function tickPlay(g: GS, dt: number, keys: Set<string>) {
  g.time += dt
  const prevLevel = g.level
  g.level = Math.max(g.level, 1 + Math.floor(g.score/160) + Math.floor(g.time/45))
  if (g.level > prevLevel) g.levelUpTimer = 2.5
  const diff = 1 + (g.level - 1) * 0.20

  // Effects countdown
  const e = g.efx
  e.sprint   = Math.max(0, e.sprint   - dt)
  e.forklift = Math.max(0, e.forklift - dt)
  e.vendor   = Math.max(0, e.vendor   - dt)
  e.multiTimer = Math.max(0, e.multiTimer - dt)
  if (e.multiTimer <= 0) e.multi = 1
  g.player.maxCases = e.forklift > 0 ? 3 : 1
  g.wrongFlash = Math.max(0, g.wrongFlash - dt)
  g.levelUpTimer = Math.max(0, g.levelUpTimer - dt)
  g.stockFlashes = g.stockFlashes.filter(f => { f.timer -= dt; return f.timer > 0 })
  if (g.custPerk) { g.custPerk.timer -= dt; if (g.custPerk.timer <= 0) g.custPerk = null }

  // Vendor support auto-stocks the weakest shelf
  if (e.vendor > 0 && e.vendorShelf >= 0) {
    const sh = g.shelves[e.vendorShelf]
    if (sh && sh.stock < SHELF_MAX) sh.stock = Math.min(SHELF_MAX, sh.stock + dt * 2)
    else e.vendorShelf = -1
  }

  // Player input — locked while a customer is asking
  if (g.activeAsker !== null) {
    g.player.vel = v(0, 0)
  } else {
    const up = keys.has('KeyW') || keys.has('ArrowUp')
    const dn = keys.has('KeyS') || keys.has('ArrowDown')
    const lt = keys.has('KeyA') || keys.has('ArrowLeft')
    const rt = keys.has('KeyD') || keys.has('ArrowRight')
    const wantSprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space')
    g.player.vel = v(rt?1:lt?-1:0, dn?1:up?-1:0)
    if (g.player.vel.x !== 0 || g.player.vel.y !== 0) g.player.dir = norm(g.player.vel)

    // Energy Drink = always sprinting (no button needed)
    const autoSprint = e.sprint > 0
    if (autoSprint) {
      // Energy drink active — full speed, stamina regens, clear depleted flag
      g.player.stamina = Math.min(STAM_MAX, g.player.stamina + STAM_REGEN * dt)
      g.player.staminaDepleted = false
    } else if (wantSprint && !g.player.staminaDepleted) {
      // Normal sprint — drain stamina; lock out sprint when it hits 0
      g.player.stamina = Math.max(0, g.player.stamina - STAM_DRAIN * dt)
      if (g.player.stamina <= 0) g.player.staminaDepleted = true
    } else {
      // Regen; unlock sprint once recovered to 30
      g.player.stamina = Math.min(STAM_MAX, g.player.stamina + STAM_REGEN * dt)
      if (g.player.staminaDepleted && g.player.stamina >= 30) g.player.staminaDepleted = false
    }

    const canSprint = autoSprint || (wantSprint && !g.player.staminaDepleted)
    const spd = canSprint ? SPRINT_SPD : PLAYER_SPD
    const mv = norm(g.player.vel)
    g.player.pos.x = clamp(g.player.pos.x + mv.x * spd * dt, PR, CW - PR)
    g.player.pos.y = clamp(g.player.pos.y + mv.y * spd * dt, PR, CH - PR)
  }

  // Empty-case timer — counts up when you have no cases, resets when you pick up or already stocked
  if (g.player.cases === 0) g.emptyCaseTimer += dt
  else g.emptyCaseTimer = 0

  // Stock room pickup (walk into left zone)
  if (g.player.pos.x < SR_W + 10 && g.player.cases < g.player.maxCases) {
    g.player.cases = g.player.maxCases
    g.emptyCaseTimer = 0
  }

  // Auto-stock nearby shelves
  if (g.player.cases > 0) {
    for (const sh of g.shelves) {
      if (g.player.cases <= 0) break
      if (sh.stock >= SHELF_MAX) continue
      if (dist(g.player.pos, v(sh.x + sh.w/2, sh.y + sh.h/2 + 18)) < STOCK_R) {
        sh.stock = Math.min(SHELF_MAX, sh.stock + CASE_FILL)
        g.player.cases--
        g.score += Math.round(12 * e.multi)
        g.stockFlashes.push({ shelfId: sh.id, timer: 0.55 })
      }
    }
  }

  // Passive score from time + shelf health
  const avg = g.shelves.reduce((a, s) => a + s.stock/SHELF_MAX, 0) / g.shelves.length
  g.score += dt * 1.8 * avg * e.multi

  // Customer spawning
  g.nextCSpawn -= dt
  if (g.nextCSpawn <= 0) {
    const interval = BASE_CUST_INT / diff
    g.nextCSpawn = rnd(interval * 0.7, interval * 1.3)
    const cx = rnd(ENT_X, ENT_X + ENT_W)
    g.custs.push({
      id: g.nextCid++, pos: v(cx, CH - 4), state: 'entering',
      target: v(cx, CH - 68 + rnd(0,28)), shelfId: -1,
      spd: BASE_CUST_SPD * (0.88 + diff * 0.28),
      takeTimer: 0, clr: `hsl(${rndI(0,360)},50%,62%)`, sz: rndI(8,11),
    })
  }

  // Customer AI
  const kept: Customer[] = []
  for (const c of g.custs) {
    if (c.state === 'entering') {
      const d = dist(c.pos, c.target)
      if (d < 6) {
        const avail = g.shelves.filter(s => s.stock > 0)
        if (avail.length > 0) {
          const sh = avail[rndI(0, avail.length-1)]
          c.shelfId = sh.id
          // Asking chance scales from 28% → 65% as level rises
          const askChance = Math.min(0.65, 0.28 + (g.level - 1) * 0.07)
          if (Math.random() < askChance && g.activeAsker === null) {
            c.state = 'approaching'
            c.target = { ...g.player.pos }
          } else {
            c.target = v(sh.x + sh.w/2 + rnd(-8,8), sh.y + sh.h + 22)
            c.state = 'walking'
          }
        } else {
          c.target = v(rnd(ENT_X, ENT_X+ENT_W), CH+20)
          c.state = 'leaving'
        }
      } else {
        const dir = norm(v(c.target.x - c.pos.x, c.target.y - c.pos.y))
        c.pos.x += dir.x * c.spd * dt; c.pos.y += dir.y * c.spd * dt
      }
    } else if (c.state === 'approaching') {
      // Always follow the player; only stop and ask when no one else is blocking them
      c.target = { ...g.player.pos }
      const d = dist(c.pos, g.player.pos)
      if (d < 26 && g.activeAsker === null) {
        g.activeAsker = c.id
        c.state = 'asking'
      } else {
        // If someone else is being asked, hover nearby instead of crowding
        const hangBack = g.activeAsker !== null ? 55 : 26
        if (d > hangBack) {
          const dir = norm(v(c.target.x - c.pos.x, c.target.y - c.pos.y))
          c.pos.x += dir.x * c.spd * dt; c.pos.y += dir.y * c.spd * dt
        }
      }
    } else if (c.state === 'asking') {
      // Standing still — waiting for player to click the right shelf
      // (resolved by handleCanvasClick; safety clear if activeAsker was reset externally)
      if (g.activeAsker !== c.id) {
        const sh = g.shelves.find(s => s.id === c.shelfId)
        c.target = sh ? v(sh.x + sh.w/2, sh.y + sh.h + 22) : v(rnd(ENT_X, ENT_X+ENT_W), CH+20)
        c.state = sh ? 'walking' : 'leaving'
      }
    } else if (c.state === 'walking') {
      const d = dist(c.pos, c.target)
      if (d < 8) { c.state = 'taking'; c.takeTimer = rnd(0.5, 1.1) / diff }
      else {
        const dir = norm(v(c.target.x - c.pos.x, c.target.y - c.pos.y))
        c.pos.x += dir.x * c.spd * dt; c.pos.y += dir.y * c.spd * dt
      }
    } else if (c.state === 'taking') {
      c.takeTimer -= dt
      if (c.takeTimer <= 0) {
        const sh = g.shelves.find(s => s.id === c.shelfId)
        if (sh) sh.stock = Math.max(0, sh.stock - rndI(1,2))
        c.state = 'leaving'
        c.target = v(rnd(ENT_X, ENT_X+ENT_W), CH+20)
      }
    } else {
      const d = dist(c.pos, c.target)
      if (d < 5) continue
      const dir = norm(v(c.target.x - c.pos.x, c.target.y - c.pos.y))
      c.pos.x += dir.x * c.spd * dt; c.pos.y += dir.y * c.spd * dt
    }
    kept.push(c)
  }
  g.custs = kept

  // Manager logic
  const m = g.mgr
  m.nextInspection -= dt
  if (m.state === 'idle' && m.nextInspection <= 0) m.state = 'walking'
  if (m.state === 'walking') {
    m.target = { ...g.player.pos }
    const d = dist(m.pos, m.target)
    if (d < 22) {
      // Release any blocked customer so they can continue on their own
      if (g.activeAsker !== null) {
        const stuck = g.custs.find(c => c.id === g.activeAsker)
        if (stuck) {
          const sh = g.shelves.find(s => s.id === stuck.shelfId)
          stuck.state = sh ? 'walking' : 'leaving'
          stuck.target = sh ? v(sh.x + sh.w/2, sh.y + sh.h + 22) : v(rnd(ENT_X, ENT_X+ENT_W), CH+20)
        }
        g.activeAsker = null
      }
      const shopAvg = g.shelves.reduce((a, s) => a + s.stock/SHELF_MAX, 0) / g.shelves.length
      m.state = 'dialogue'
      if (shopAvg >= 0.5) {
        m.mood = 'happy'
        m.lines = HAPPY[rndI(0,2)]
        g.score += Math.round(100 * e.multi)
      } else {
        m.mood = 'angry'
        m.lines = ANGRY[Math.min(g.strikes, 2)]
        g.strikes++
        g.score = Math.max(0, g.score - 50)
      }
      m.dialogueTimer = g.strikes >= 3 ? 5 : 4.2
      g.phase = 'dialogue'
    } else {
      const mspd = 85 + (g.level-1)*8
      const dir = norm(v(m.target.x - m.pos.x, m.target.y - m.pos.y))
      m.pos.x += dir.x * mspd * dt; m.pos.y += dir.y * mspd * dt
    }
  }
  if (m.state === 'returning') {
    const d = dist(m.pos, m.homePos)
    if (d < 10) {
      m.pos = { ...m.homePos }; m.state = 'idle'
      m.nextInspection = rnd(BASE_MGR_INT * 0.75, BASE_MGR_INT * 1.1) / (1 + (g.level-1)*0.15)
    } else {
      const dir = norm(v(m.homePos.x - m.pos.x, m.homePos.y - m.pos.y))
      m.pos.x += dir.x * 92 * dt; m.pos.y += dir.y * 92 * dt
    }
  }

  // Power-up spawning
  g.nextPSpawn -= dt
  if (g.nextPSpawn <= 0) {
    const types: PUType[] = ['energy_drink','forklift','vendor_support','eotm','overtime']
    g.pups.push({ id: g.nextPid++, pos: fpos(), type: types[rndI(0,4)], life: 14 })
    g.nextPSpawn = rnd(20, 40)
  }

  // Power-up age + collection
  g.pups = g.pups.filter(pu => {
    pu.life -= dt
    if (pu.life <= 0) return false
    if (dist(g.player.pos, pu.pos) < 22) { applyPU(g, pu.type); return false }
    return true
  })
}

const PU_TYPES: PUType[] = ['energy_drink', 'forklift', 'vendor_support', 'eotm', 'overtime']

function grantCustomerPerk(g: GS) {
  const type = PU_TYPES[rndI(0, PU_TYPES.length - 1)]
  applyPU(g, type)
  g.custPerk = { type, timer: 2.8 }
}

function applyPU(g: GS, type: PUType) {
  const e = g.efx
  if (type === 'energy_drink') {
    // Full speed automatically for 20s — no button needed, stamina fully restored
    e.sprint = 20
    g.player.stamina = STAM_MAX
    g.player.staminaDepleted = false
  }
  if (type === 'forklift') {
    // Carry 3 cases for 30s AND instantly hand the player 3 cases right now
    e.forklift = 30
    g.player.maxCases = 3
    g.player.cases = 3
  }
  if (type === 'vendor_support') {
    // Immediately boost every shelf that's under half, then keep trickle-stocking the lowest
    for (const sh of g.shelves) {
      if (sh.stock < SHELF_MAX * 0.5) sh.stock = Math.min(SHELF_MAX, sh.stock + 3)
    }
    e.vendor = 15
    e.vendorShelf = g.shelves.reduce((a, b) => a.stock < b.stock ? a : b).id
  }
  if (type === 'eotm')     { e.multi = 2; e.multiTimer = 30 }
  if (type === 'overtime') { e.multi = 3; e.multiTimer = 20 }
}

/* ═══════════════════════ RENDERER ═══════════════════════ */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w,y, x+w,y+r)
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w,y+h, x+w-r,y+h)
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x,y+h, x,y+h-r)
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x,y, x+r,y)
  ctx.closePath()
}

function render(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  ctx.clearRect(0, 0, CW, CH)

  // ── Main floor ──────────────────────────────────────────────
  ctx.fillStyle = '#EDE4C8'
  ctx.fillRect(SR_W, 0, CW - SR_W, CH)
  ctx.strokeStyle = 'rgba(175,150,95,0.22)'
  ctx.lineWidth = 0.5
  const TILE = 42
  for (let x = SR_W; x <= CW; x += TILE) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke() }
  for (let y = 0;    y <= CH;  y += TILE) { ctx.beginPath(); ctx.moveTo(SR_W,y); ctx.lineTo(CW,y); ctx.stroke() }

  // ── Stock room ──────────────────────────────────────────────
  const srg = ctx.createLinearGradient(0,0,SR_W,0)
  srg.addColorStop(0,'#181826'); srg.addColorStop(1,'#20202C')
  ctx.fillStyle = srg; ctx.fillRect(0,0,SR_W,CH)
  // Door frame
  ctx.fillStyle = '#383850'; ctx.fillRect(SR_W-4, CH/2-34, 8, 68)
  ctx.fillStyle = 'rgba(237,228,200,0.09)'; ctx.fillRect(SR_W-1, CH/2-30, 2, 60)
  // Cases pile
  const [cpx, cpy] = [SR_W/2, CH/2]
  ctx.fillStyle = '#58380A'; ctx.fillRect(cpx-38, cpy-54, 76, 22)
  ctx.fillStyle = '#6A4810'; ctx.fillRect(cpx-38, cpy-32, 76, 22)
  ctx.fillStyle = '#7A5518'; ctx.fillRect(cpx-30, cpy-64, 60, 12)
  ctx.fillStyle = 'rgba(255,195,70,0.14)'
  ctx.fillRect(cpx-38, cpy-54, 76, 3); ctx.fillRect(cpx-38, cpy-32, 76, 3)
  // Labels
  ctx.font = '16px "Press Start 2P", monospace'; ctx.fillStyle = '#C89B3C'; ctx.textAlign = 'center'
  ctx.fillText('STOCK', SR_W/2, 23); ctx.fillText('ROOM', SR_W/2, 41)
  // Stock room blink — pulses after 5s with no cases
  if (g.emptyCaseTimer >= 5 && g.player.pos.x >= SR_W) {
    const blink = 0.5 + 0.5 * Math.sin(t * 6)
    ctx.fillStyle = `rgba(80,220,120,${blink * 0.22})`
    ctx.fillRect(0, 0, SR_W, CH)
    ctx.strokeStyle = `rgba(80,220,120,${blink * 0.9})`
    ctx.lineWidth = 3
    ctx.strokeRect(1, 1, SR_W - 2, CH - 2)
  }

  // Prompt when player needs cases
  if (g.player.cases < g.player.maxCases && g.player.pos.x >= SR_W) {
    ctx.font = '14px "Press Start 2P", monospace'
    ctx.fillStyle = g.player.pos.x < SR_W + 65 ? '#4CAF50' : '#C89B3C'
    ctx.fillText('← GET', SR_W/2, cpy-88); ctx.fillText('CASES', SR_W/2, cpy-72)
  }

  // ── Manager office ──────────────────────────────────────────
  ctx.fillStyle = '#16162A'; ctx.fillRect(OFF.x, OFF.y, OFF.w, OFF.h)
  ctx.strokeStyle = '#2C2C44'; ctx.lineWidth = 2; ctx.strokeRect(OFF.x, OFF.y, OFF.w, OFF.h)
  ctx.fillStyle = '#291E0C'; ctx.fillRect(OFF.x+16, OFF.y+42, OFF.w-32, 36)
  ctx.fillStyle = '#38280E'; ctx.fillRect(OFF.x+16, OFF.y+42, OFF.w-32, 4)
  ctx.font = '13px "Press Start 2P", monospace'; ctx.fillStyle = '#7878A0'; ctx.textAlign = 'center'
  ctx.fillText('MANAGER', OFF.x+OFF.w/2, OFF.y+20); ctx.fillText('OFFICE', OFF.x+OFF.w/2, OFF.y+34)
  // Door gap
  ctx.fillStyle = '#EDE4C8'; ctx.fillRect(OFF.x+OFF.w/2-18, OFF.y+OFF.h, 36, 4)

  // ── Shelves ─────────────────────────────────────────────────
  for (const sh of g.shelves) {
    const pct = sh.stock / SHELF_MAX

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(sh.x+4, sh.y+sh.h, sh.w, 7)

    // Wood body
    const wg = ctx.createLinearGradient(sh.x, sh.y, sh.x, sh.y+sh.h)
    wg.addColorStop(0, '#8C6230'); wg.addColorStop(1, '#50380A')
    ctx.fillStyle = wg; ctx.fillRect(sh.x, sh.y, sh.w, sh.h)

    // Inner shelf surface
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(sh.x+2, sh.y+2, sh.w-4, sh.h-8)

    // Front lip
    ctx.fillStyle = '#A07830'; ctx.fillRect(sh.x, sh.y+sh.h-6, sh.w, 6)

    // Bottles
    const n = Math.floor(sh.stock)
    if (n > 0) {
      const bw = 7, bh = 22, gap = 2
      const totalW = n*(bw+gap) - gap
      const sx = sh.x + (sh.w - totalW)/2
      for (let i = 0; i < n; i++) {
        const bx = sx + i*(bw+gap), by = sh.y+2
        // Body
        ctx.fillStyle = sh.clr; ctx.fillRect(bx, by+5, bw, bh-5)
        // Neck
        ctx.fillRect(bx+2, by, bw-4, 6)
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx+1, by+8, bw-2, 8)
        // Foil
        ctx.fillStyle = 'rgba(255,205,50,0.65)'; ctx.fillRect(bx+2, by, bw-4, 2)
      }
    }

    // Empty shelf flash
    if (sh.stock === 0) {
      const flash = 0.5 + 0.5 * Math.sin(t*5.5)
      ctx.fillStyle = `rgba(255,50,50,${flash*0.22})`; ctx.fillRect(sh.x, sh.y, sh.w, sh.h)
      ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = `rgba(255,80,80,${0.7+flash*0.3})`
      ctx.textAlign = 'center'; ctx.fillText('EMPTY', sh.x+sh.w/2, sh.y+sh.h/2+4)
    }

    // Stock health bar
    const barY = sh.y + sh.h + 7
    ctx.fillStyle = '#18140A'; ctx.fillRect(sh.x, barY, sh.w, 5)
    ctx.fillStyle = pct>0.6?'#4CAF50':pct>0.3?'#FFC107':'#F44336'
    ctx.fillRect(sh.x, barY, sh.w*pct, 5)

    // Shelf label — black on beige floor for maximum contrast
    ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 4
    ctx.font = '16px "Press Start 2P", monospace'; ctx.fillStyle = '#000000'; ctx.textAlign = 'center'
    ctx.fillText(sh.label, sh.x+sh.w/2, sh.y - 12)
    ctx.shadowBlur = 0

    // Proximity highlight when player can stock
    if (g.activeAsker === null && g.player.cases > 0 && sh.stock < SHELF_MAX) {
      const d2 = dist(g.player.pos, v(sh.x+sh.w/2, sh.y+sh.h/2+18))
      if (d2 < STOCK_R * 1.7) {
        ctx.strokeStyle = d2 < STOCK_R ? 'rgba(0,255,100,0.75)' : 'rgba(255,210,0,0.3)'
        ctx.lineWidth = 2; ctx.setLineDash([3,3])
        ctx.strokeRect(sh.x-3, sh.y-3, sh.w+6, sh.h+12)
        ctx.setLineDash([])
      }
    }

    // Stock flash — brief green overlay when player just restocked this shelf
    const sf = g.stockFlashes.find(f => f.shelfId === sh.id)
    if (sf) {
      ctx.fillStyle = `rgba(80,220,120,${(sf.timer / 0.55) * 0.52})`
      ctx.fillRect(sh.x, sh.y, sh.w, sh.h)
    }

    // Asking mode: all shelves pulse as clickable targets
    if (g.activeAsker !== null) {
      const asker = g.custs.find(c => c.id === g.activeAsker)
      const isTarget = asker?.shelfId === sh.id
      const pulse = 0.55 + 0.45 * Math.sin(t * 5 + sh.id * 1.2)
      if (isTarget) {
        // Correct shelf glows gold — but only visually if player already moused over it
        // (we don't give it away; they must read the label)
        ctx.shadowColor = '#C89B3C'; ctx.shadowBlur = 18
      }
      ctx.strokeStyle = isTarget
        ? `rgba(200,155,60,${pulse})` : `rgba(100,180,255,${pulse * 0.7})`
      ctx.lineWidth = isTarget ? 3 : 2
      ctx.strokeRect(sh.x-4, sh.y-4, sh.w+8, sh.h+10)
      ctx.shadowBlur = 0
      // "CLICK" label above shelf label
      ctx.font = '15px "Press Start 2P", monospace'
      ctx.fillStyle = isTarget ? `rgba(200,155,60,${pulse})` : `rgba(100,180,255,${pulse * 0.7})`
      ctx.textAlign = 'center'
      ctx.fillText('CLICK', sh.x+sh.w/2, sh.y - 29)
    }
  }

  // ── Entrance strip ──────────────────────────────────────────
  ctx.fillStyle = '#9A8E6C'; ctx.fillRect(ENT_X, CH-12, ENT_W, 12)
  ctx.font = '13px "Press Start 2P", monospace'; ctx.fillStyle = '#D8C888'; ctx.textAlign = 'center'
  ctx.fillText('ENTRANCE', ENT_X+ENT_W/2, CH-1)

  // ── Power-ups ───────────────────────────────────────────────
  for (const pu of g.pups) {
    const info = PU_INFO[pu.type]
    const pulse = 0.85 + 0.15 * Math.sin(t*4.5 + pu.id)
    const alpha = Math.min(1, pu.life * 0.5) * pulse
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = info.col; ctx.shadowBlur = 14
    ctx.fillStyle = info.col + '30'
    rrect(ctx, pu.pos.x-14, pu.pos.y-14, 28, 28, 7); ctx.fill()
    ctx.strokeStyle = info.col + 'AA'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.shadowBlur = 0
    ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(info.em, pu.pos.x, pu.pos.y)
    ctx.restore()
  }
  ctx.textBaseline = 'alphabetic'

  // ── Customers ───────────────────────────────────────────────
  for (const c of g.custs) {
    ctx.save()
    // Highlight asking customer
    if (c.state === 'asking') {
      ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 18
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4
    }
    ctx.fillStyle = c.clr
    ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, c.sz, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#F5C99A'
    ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y - c.sz*0.42, c.sz*0.52, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0
    if (c.state === 'taking') {
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🍷', c.pos.x, c.pos.y - c.sz - 5)
    }
    // Speech bubble while approaching or asking
    if (c.state === 'approaching' || c.state === 'asking') {
      const sh = g.shelves.find(s => s.id === c.shelfId)
      const wine = sh?.label ?? '?'
      const wineClr = sh?.clr ?? '#9B2335'
      const bw = 162, bh = 60, bx = c.pos.x - bw/2, by = c.pos.y - c.sz - 72
      ctx.fillStyle = 'rgba(255,255,255,0.97)'
      rrect(ctx, bx, by, bw, bh, 7); ctx.fill()
      ctx.strokeStyle = wineClr; ctx.lineWidth = 2; ctx.stroke()
      // Tail
      ctx.beginPath()
      ctx.moveTo(c.pos.x - 6, by + bh)
      ctx.lineTo(c.pos.x, c.pos.y - c.sz - 4)
      ctx.lineTo(c.pos.x + 6, by + bh)
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.fill()
      ctx.strokeStyle = wineClr; ctx.lineWidth = 1; ctx.stroke()
      // Text
      ctx.font = '15px "Press Start 2P", monospace'
      ctx.fillStyle = '#1A1A2A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Where is', c.pos.x, by + 21)
      ctx.fillStyle = wineClr
      ctx.fillText(wine + '?', c.pos.x, by + 43)
      ctx.textBaseline = 'alphabetic'
    }
    ctx.restore()
  }
  ctx.textBaseline = 'alphabetic'

  // ── Manager ─────────────────────────────────────────────────
  const m = g.mgr
  ctx.save()
  ctx.shadowColor = m.mood === 'angry' ? '#FF444466' : '#F1C40F66'
  ctx.shadowBlur = m.state === 'dialogue' ? 20 : 7
  // Suit
  ctx.fillStyle = m.state === 'dialogue' && m.mood === 'angry' ? '#660000' : '#1C2E40'
  ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, MR, 0, Math.PI*2); ctx.fill()
  // Face
  ctx.fillStyle = '#F5C99A'
  ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y - MR*0.3, MR*0.58, 0, Math.PI*2); ctx.fill()
  // Tie
  ctx.fillStyle = '#F1C40F'; ctx.fillRect(m.pos.x-2, m.pos.y+2, 4, 10)
  // Emoji face
  ctx.shadowBlur = 0; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const moji = m.state === 'dialogue' ? (m.mood==='angry'?'😤':'😊') : (m.nextInspection < 8 ? '😐' : '🙂')
  ctx.fillText(moji, m.pos.x, m.pos.y - MR*0.3)
  ctx.textBaseline = 'alphabetic'
  // Label
  ctx.font = '15px "Press Start 2P", monospace'; ctx.fillStyle = '#F1C40F'; ctx.textAlign = 'center'
  ctx.fillText('MGR', m.pos.x, m.pos.y + MR + 15)
  // Inspection warning when approaching — visible from farther away
  if (m.state === 'walking') {
    const d2p = dist(m.pos, g.player.pos)
    if (d2p < 200) {
      const a = Math.min(1, (200 - d2p) / 180)
      const sz = d2p < 80 ? 20 : 15
      ctx.font = `${sz}px "Press Start 2P", monospace`
      ctx.fillStyle = `rgba(255,60,60,${a})`
      ctx.fillText(d2p < 80 ? '!!' : '!', m.pos.x, m.pos.y - MR - 6)
    }
  }
  ctx.restore()

  // ── Player ──────────────────────────────────────────────────
  const p = g.player
  ctx.save()
  ctx.shadowColor = '#C89B3C44'; ctx.shadowBlur = 10
  // Body
  ctx.fillStyle = '#3A2A6A'
  ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, PR, 0, Math.PI*2); ctx.fill()
  // Apron
  ctx.fillStyle = '#C89B3C'
  ctx.beginPath()
  ctx.arc(p.pos.x, p.pos.y, PR*0.72, -0.45, Math.PI+0.45); ctx.fill()
  // Face
  ctx.fillStyle = '#F5C99A'; ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(p.pos.x + p.dir.x*5, p.pos.y + p.dir.y*5, PR*0.42, 0, Math.PI*2); ctx.fill()
  // Cases carried (stacked boxes on side)
  for (let i = 0; i < p.cases; i++) {
    ctx.fillStyle = '#7A5010'
    ctx.fillRect(p.pos.x+10, p.pos.y-7-i*10, 13, 9)
    ctx.fillStyle = 'rgba(255,195,70,0.22)'
    ctx.fillRect(p.pos.x+10, p.pos.y-7-i*10, 13, 2)
  }
  ctx.restore()

  // ── HUD ─────────────────────────────────────────────────────
  renderHUD(ctx, g, t)

  // ── Dialogue overlay ─────────────────────────────────────────
  if (g.phase === 'dialogue') renderDialogue(ctx, g)

  // ── Customer asking banner ────────────────────────────────────
  if (g.activeAsker !== null) {
    const asker = g.custs.find(c => c.id === g.activeAsker)
    if (asker) {
      const sh = g.shelves.find(s => s.id === asker.shelfId)
      const wine = sh?.label ?? '?'
      const wineClr = sh?.clr ?? '#88CCFF'

      // Banner at the bottom
      ctx.fillStyle = 'rgba(8,8,20,0.92)'
      rrect(ctx, CW/2 - 260, CH - 74, 520, 64, 10); ctx.fill()
      ctx.strokeStyle = wineClr; ctx.lineWidth = 2; ctx.stroke()

      ctx.font = '16px "Press Start 2P", monospace'
      ctx.fillStyle = wineClr; ctx.textAlign = 'center'
      ctx.fillText(`"Where is the ${wine}?"`, CW/2, CH - 48)
      ctx.font = '14px "Press Start 2P", monospace'
      ctx.fillStyle = '#C89B3C'
      ctx.fillText('CLICK THE CORRECT SHELF', CW/2, CH - 25)

      // Wrong flash feedback
      if (g.wrongFlash > 0) {
        ctx.fillStyle = `rgba(255,50,50,${Math.min(0.4, g.wrongFlash * 0.32)})`
        ctx.fillRect(0, 0, CW, CH)
        ctx.font = '22px "Press Start 2P", monospace'
        ctx.fillStyle = '#FF5555'; ctx.textAlign = 'center'
        ctx.fillText("That's not it!", CW/2, CH/2 - 10)
      }
    }
  }

  // ── Level-up popup ────────────────────────────────────────────
  if (g.levelUpTimer > 0) {
    const fade = Math.min(1, g.levelUpTimer * 1.4)
    const rise = Math.max(0, 2.5 - g.levelUpTimer) * 22
    const lbw = 300, lbh = 62, lbx = CW/2 - 150, lby = CH/2 - 46 - rise
    ctx.save()
    ctx.globalAlpha = fade
    ctx.shadowColor = '#C89B3C'; ctx.shadowBlur = 30
    ctx.fillStyle = 'rgba(10,8,3,0.94)'
    rrect(ctx, lbx, lby, lbw, lbh, 12); ctx.fill()
    ctx.strokeStyle = '#C89B3C'; ctx.lineWidth = 2.5; ctx.stroke()
    ctx.shadowBlur = 0
    ctx.font = '20px "Press Start 2P", monospace'
    ctx.fillStyle = '#C89B3C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`⭐ LEVEL ${g.level}! ⭐`, CW/2, lby + 25)
    ctx.font = '14px "Press Start 2P", monospace'
    ctx.fillStyle = '#A09880'
    ctx.fillText('Getting harder...', CW/2, lby + 50)
    ctx.textBaseline = 'alphabetic'
    ctx.restore()
  }

  // ── Customer perk notification ────────────────────────────────
  if (g.custPerk) {
    const { type, timer } = g.custPerk
    const info = PU_INFO[type]
    const fade = Math.min(1, timer * 1.5)
    const rise = (2.8 - timer) * 18   // floats upward as it fades

    const PERK_LABELS: Record<PUType, string> = {
      energy_drink:   'Energy Drink!',
      forklift:       'Forklift License!',
      vendor_support: 'Vendor Support!',
      eotm:           'Employee of Month!',
      overtime:       'Overtime Pay!',
    }

    ctx.save()
    ctx.globalAlpha = fade

    const bw = 360, bh = 70
    const bx = CW/2 - bw/2, by = CH/2 - 88 - rise

    ctx.shadowColor = info.col; ctx.shadowBlur = 24
    ctx.fillStyle = 'rgba(10,10,20,0.92)'
    rrect(ctx, bx, by, bw, bh, 12); ctx.fill()
    ctx.strokeStyle = info.col; ctx.lineWidth = 2.5; ctx.stroke()
    ctx.shadowBlur = 0

    // Icon
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(info.em, bx + 40, by + bh/2)

    // Text
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.font = '13px "Press Start 2P", monospace'
    ctx.fillStyle = '#A09880'
    ctx.fillText('CUSTOMER PERK!', bx + 66, by + 28)
    ctx.font = '15px "Press Start 2P", monospace'
    ctx.fillStyle = info.col
    ctx.fillText(PERK_LABELS[type], bx + 66, by + 54)

    ctx.restore()
    ctx.textBaseline = 'alphabetic'
  }
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  ctx.textBaseline = 'alphabetic'

  const avg  = g.shelves.reduce((a, s) => a + s.stock / SHELF_MAX, 0) / g.shelves.length
  const hclr = avg > 0.6 ? '#4CAF50' : avg > 0.3 ? '#FFC107' : '#F44336'
  const alert = g.strikes >= 2
  const ap    = alert ? 0.7 + 0.3 * Math.sin(t * 7) : 1

  // ── Left panel: Score + Cases + Stamina ─────────────────────
  ctx.fillStyle = '#06060f'   // opaque so the stockroom label can't bleed through
  rrect(ctx, 6, 6, 204, 90, 8); ctx.fill()
  ctx.strokeStyle = 'rgba(200,155,60,0.40)'; ctx.lineWidth = 1.5; ctx.stroke()
  // Gold accent bar on left edge
  ctx.fillStyle = '#C89B3C'; ctx.fillRect(6, 20, 3, 22)

  ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#524020'; ctx.textAlign = 'left'
  ctx.fillText('SCORE', 14, 19)

  const scoreStr = String(Math.floor(g.score))
  ctx.font = '20px "Press Start 2P", monospace'; ctx.fillStyle = '#C89B3C'
  ctx.fillText(scoreStr, 14, 43)
  if (g.efx.multi > 1) {
    const sw = ctx.measureText(scoreStr).width
    ctx.font = '11px "Press Start 2P", monospace'; ctx.fillStyle = '#FF9800'
    ctx.fillText(`×${g.efx.multi}`, 14 + sw + 5, 36)
  }

  // Sub row
  ctx.font = '10px "Press Start 2P", monospace'
  ctx.fillStyle = '#3A6AA0'; ctx.fillText(`LVL ${g.level}`, 14, 54)
  ctx.fillStyle = '#443C2A'; ctx.fillText(`${Math.floor(g.time)}s`, 72, 54)
  ctx.fillStyle = g.player.cases > 0 ? '#A07828' : '#3A3020'
  ctx.fillText(`CASES ${g.player.cases}/${g.player.maxCases}`, 112, 54)

  // Stamina bar
  const sp   = g.player.stamina / STAM_MAX
  const sclr = sp > 0.5 ? '#4CAF50' : sp > 0.2 ? '#FFC107' : '#F44336'
  ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = '#382E20'; ctx.textAlign = 'left'
  ctx.fillText('STAM', 14, 70)
  ctx.fillStyle = '#090912'; ctx.fillRect(60, 61, 142, 11)
  ctx.fillStyle = sclr;       ctx.fillRect(60, 61, 142 * sp, 11)
  // Tick separators
  ctx.strokeStyle = 'rgba(5,5,15,0.75)'; ctx.lineWidth = 1.5
  for (let i = 1; i < 5; i++) {
    const tx = 60 + i * 28.4
    ctx.beginPath(); ctx.moveTo(tx, 61); ctx.lineTo(tx, 72); ctx.stroke()
  }
  if (g.player.staminaDepleted) {
    const fl = 0.5 + 0.5 * Math.sin(t * 8)
    ctx.font = '11px "Press Start 2P", monospace'; ctx.fillStyle = `rgba(255,80,80,${fl})`
    ctx.textAlign = 'right'; ctx.fillText('DEPLETED', 207, 82)
  }

  // ── Center panel: Store Health ──────────────────────────────
  const CPX = 216, CPW = 370
  ctx.fillStyle = '#06060f'
  rrect(ctx, CPX, 6, CPW, 54, 8); ctx.fill()
  ctx.strokeStyle = hclr + '50'; ctx.lineWidth = 1.5; ctx.stroke()

  ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#524020'; ctx.textAlign = 'center'
  ctx.fillText('STORE HEALTH', CPX + CPW / 2, 19)

  // Segmented bar
  const SEGS = 10
  const bx = CPX + 12, bwS = CPW - 24 - 54, byS = 23
  ctx.fillStyle = '#090912'; ctx.fillRect(bx, byS, bwS, 20)
  for (let i = 0; i < SEGS; i++) {
    if (avg < i / SEGS) break
    const fill = Math.min(1, (avg - i / SEGS) * SEGS)
    const sx = bx + i * (bwS / SEGS) + 1, swS = (bwS / SEGS - 2) * fill
    ctx.fillStyle = hclr; ctx.fillRect(sx, byS + 1, swS, 18)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, byS, bwS, 20)

  ctx.font = '18px "Press Start 2P", monospace'; ctx.fillStyle = hclr; ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(avg * 100)}%`, CPX + CPW - 8, 50)

  // ── Right panel: Strikes + Inspection ──────────────────────
  const RPX = CPX + CPW + 8
  const RPW = CW - RPX - 6
  ctx.fillStyle = alert ? '#180303' : '#06060f'   // opaque so the office label can't bleed through
  rrect(ctx, RPX, 6, RPW, 90, 8); ctx.fill()
  ctx.strokeStyle = alert ? `rgba(255,60,60,${ap})` : 'rgba(200,155,60,0.40)'
  ctx.lineWidth = 1.5; ctx.stroke()
  // Accent bar on right edge
  ctx.fillStyle = alert ? `rgba(220,60,60,${ap})` : '#C89B3C'
  ctx.fillRect(RPX + RPW - 3, 20, 3, 22)

  ctx.font = '12px "Press Start 2P", monospace'
  ctx.fillStyle = alert ? `rgba(255,100,100,${ap})` : '#524020'; ctx.textAlign = 'center'
  ctx.fillText('STRIKES', RPX + RPW / 2, 19)

  ctx.font = '24px serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = i < g.strikes ? 1 : 0.11
    ctx.fillText('☕', RPX + 28 + i * ((RPW - 36) / 2.2), 46)
  }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'

  // Inspection countdown bar (only when manager is idle)
  if (g.mgr.state === 'idle') {
    const ipct = Math.min(1, g.mgr.nextInspection / BASE_MGR_INT)
    const iclr = ipct > 0.5 ? '#2A6A2A' : ipct > 0.2 ? '#7A6010' : '#7A1010'
    const ibx = RPX + 10, ibw = RPW - 20
    ctx.fillStyle = '#090912'; ctx.fillRect(ibx, 69, ibw, 7)
    ctx.fillStyle = iclr;     ctx.fillRect(ibx, 69, ibw * ipct, 7)
    ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#302818'; ctx.textAlign = 'center'
    ctx.fillText('INSPECTION', RPX + RPW / 2, 84)
  }

  // ── Manager incoming warning ──────────────────────────────────
  if (g.mgr.state === 'walking') {
    const pulse = 0.65 + 0.35 * Math.sin(t * 7)
    ctx.fillStyle = `rgba(24,4,4,${pulse * 0.92})`
    rrect(ctx, CPX, 66, CPW, 22, 5); ctx.fill()
    ctx.strokeStyle = `rgba(255,70,70,${pulse})`; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.font = '12px "Press Start 2P", monospace'
    ctx.fillStyle = '#FFCCCC'; ctx.textAlign = 'center'
    ctx.fillText('⚠  MANAGER INCOMING!', CPX + CPW / 2, 81)
  }

  // ── Active effects (left side, below main panel) ──────────────
  type EE = { icon: string; t: number; col: string; label: string }
  const efxList: EE[] = []
  if (g.efx.sprint > 0)   efxList.push({ icon: '⚡', t: g.efx.sprint,   col: '#00E5FF', label: 'Energy' })
  if (g.efx.forklift > 0) efxList.push({ icon: '🏗', t: g.efx.forklift, col: '#FFC107', label: 'Forklift' })
  if (g.efx.vendor > 0)   efxList.push({ icon: '📦', t: g.efx.vendor,   col: '#8BC34A', label: 'Vendor' })
  if (g.efx.multi > 1)    efxList.push({ icon: `×${g.efx.multi}`, t: g.efx.multiTimer, col: '#FF9800', label: 'Multi' })

  let ey = 102
  for (const ef of efxList) {
    ctx.fillStyle = ef.col + '18'
    rrect(ctx, 6, ey, 130, 24, 5); ctx.fill()
    ctx.strokeStyle = ef.col + '60'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = ef.col; ctx.fillRect(6, ey + 2, 3, 20)   // accent bar

    const isMulti = ef.icon.length > 2
    if (!isMulti) {
      ctx.font = '16px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(ef.icon, 13, ey + 12)
      ctx.textBaseline = 'alphabetic'
      ctx.font = '11px "Press Start 2P", monospace'; ctx.fillStyle = ef.col; ctx.textAlign = 'left'
      ctx.fillText(ef.label, 30, ey + 13)
      ctx.fillStyle = '#806848'
      ctx.fillText(`${Math.ceil(ef.t)}s`, 98, ey + 13)
    } else {
      ctx.font = '11px "Press Start 2P", monospace'; ctx.fillStyle = ef.col
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(ef.icon, 12, ey + 12)
      ctx.textBaseline = 'alphabetic'
      ctx.font = '10px "Press Start 2P", monospace'
      ctx.fillStyle = ef.col; ctx.fillText('MULTI', 44, ey + 10)
      ctx.fillStyle = '#806848'; ctx.fillText(`${Math.ceil(ef.t)}s`, 44, ey + 21)
    }
    ey += 28
  }
  ctx.textBaseline = 'alphabetic'
}

function renderDialogue(ctx: CanvasRenderingContext2D, g: GS) {
  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0, 0, CW, CH)

  const bw = 580, bh = 210, bx = (CW - bw) / 2, by = (CH - bh) / 2
  const isAngry = g.mgr.mood === 'angry'
  const acl = isAngry ? '#FF4444' : '#C89B3C'

  // Panel
  ctx.fillStyle = '#090915'
  rrect(ctx, bx, by, bw, bh, 14); ctx.fill()
  ctx.strokeStyle = acl + 'CC'; ctx.lineWidth = 2.5; ctx.stroke()

  // Subtle top accent gradient
  const tg = ctx.createLinearGradient(bx, by, bx + bw, by)
  tg.addColorStop(0, acl + '00'); tg.addColorStop(0.5, acl + '22'); tg.addColorStop(1, acl + '00')
  ctx.fillStyle = tg; ctx.fillRect(bx + 14, by, bw - 28, 2)

  // Portrait area (left)
  const px = bx + 72, py = by + bh / 2
  ctx.save()
  ctx.shadowColor = acl; ctx.shadowBlur = 24

  // Portrait background circle
  const pgr = ctx.createRadialGradient(px, py, 4, px, py, 38)
  pgr.addColorStop(0, isAngry ? '#3A0808' : '#0E2034')
  pgr.addColorStop(1, isAngry ? '#1A0404' : '#081020')
  ctx.fillStyle = pgr
  ctx.beginPath(); ctx.arc(px, py, 38, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = acl + '88'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(px, py, 38, 0, Math.PI * 2); ctx.stroke()

  // Face + tie
  ctx.shadowBlur = 0
  ctx.fillStyle = '#F5C99A'
  ctx.beginPath(); ctx.arc(px, py - 10, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#F1C40F'; ctx.fillRect(px - 3, py + 8, 6, 14)
  ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(isAngry ? '😤' : '😊', px, py - 10)
  ctx.restore()
  ctx.textBaseline = 'alphabetic'

  // "MANAGER" label under portrait
  ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = acl + 'AA'; ctx.textAlign = 'center'
  ctx.fillText('MANAGER', px, py + 60)

  // Divider line
  ctx.strokeStyle = acl + '30'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(bx + 132, by + 14); ctx.lineTo(bx + 132, by + bh - 14); ctx.stroke()

  // Status header
  ctx.font = '14px "Press Start 2P", monospace'; ctx.textAlign = 'left'
  ctx.fillStyle = acl
  ctx.fillText(
    isAngry ? `✗  STRIKE  ${g.strikes} / 3` : '✓  INSPECTION PASSED',
    bx + 148, by + 34
  )

  // Dialogue lines
  g.mgr.lines.forEach((line, i) => {
    const raw = line.replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    ctx.font = (i === 0 ? '16' : '13') + 'px "Press Start 2P", monospace'
    ctx.fillStyle = i === 0 ? '#E8E6E0' : '#807060'
    ctx.textAlign = 'left'
    ctx.fillText(raw, bx + 148, by + 70 + i * 36)
  })

  // ── Movement hint (arrows in a uniform sans font so ←→ match ↑↓) ──
  {
    const arrowFont = 'bold 13px system-ui, -apple-system, "Segoe UI", sans-serif'
    const wordFont  = '11px "Press Start 2P", monospace'
    const arrows = '↑ ↓ ← →  '
    const words  = 'keep moving!'
    ctx.textAlign = 'left'; ctx.fillStyle = '#3A6890'
    ctx.font = arrowFont; const aW = ctx.measureText(arrows).width
    ctx.font = wordFont;  const wW = ctx.measureText(words).width
    const sx = bx + bw / 2 - (aW + wW) / 2, hy = by + bh - 36
    ctx.font = arrowFont; ctx.fillText(arrows, sx, hy)
    ctx.font = wordFont;  ctx.fillText(words, sx + aW, hy)
    ctx.textAlign = 'center'
  }

  // ── Auto-continue timer bar ──
  const maxTimer = g.strikes >= 3 ? 5 : 4.2
  const pct = Math.max(0, g.mgr.dialogueTimer / maxTimer)
  const tbarX = bx + 148, tbarW = bw - 164
  ctx.fillStyle = '#0a0a18'; ctx.fillRect(tbarX, by + bh - 24, tbarW, 7)
  ctx.fillStyle = acl + 'CC'; ctx.fillRect(tbarX, by + bh - 24, tbarW * pct, 7)
  ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#303028'; ctx.textAlign = 'right'
  ctx.fillText('AUTO-CONTINUES', bx + bw - 8, by + bh - 10)

  // FIRED banner
  if (g.strikes >= 3 && isAngry) {
    ctx.save()
    ctx.font = '19px "Press Start 2P", monospace'
    ctx.fillStyle = '#FF2222'; ctx.textAlign = 'center'
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 24
    ctx.fillText('VENDOR COMPLAINT FILED!', CW / 2, by - 16)
    ctx.restore()
  }
}

/* ═══════════════════════ COMPONENT ═══════════════════════ */
const DPAD = ['', 'KeyW', '', 'KeyA', 'KeyS', 'KeyD', '', '', ''] as const
const DPAD_ICON: Record<string, string> = { KeyW: '▲', KeyA: '◀', KeyS: '▼', KeyD: '▶' }

export default function WineStockerRush() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const gsRef       = useRef<GS | null>(null)
  const keysRef     = useRef<Set<string>>(new Set())
  const touchRef    = useRef<Set<string>>(new Set())
  const lastTRef    = useRef(0)
  const rafRef      = useRef(0)
  const goFiredRef  = useRef(false)   // guard against repeated setState in RAF
  const xpRef       = useRef(false)

  const wrapRef     = useRef<HTMLDivElement | null>(null)   // outer / fullscreen target
  const stageRef    = useRef<HTMLDivElement | null>(null)   // canvas + overlays box
  const [uiScale, setUiScale] = useState(1)
  const [isFs, setIsFs] = useState(false)
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null)

  const [screen, setScreen]   = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [xpMsg, setXpMsg]     = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [finalTime, setFinalTime]   = useState(0)
  const [finalLevel, setFinalLevel] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const submitScore = useCallback(async (score: number) => {
    try {
      await fetch('/api/minigame/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'wine-stocker', score }),
      })
      setRefreshKey(k => k + 1)
    } catch {}
  }, [])

  const awardXP = useCallback(async () => {
    if (xpRef.current) return
    xpRef.current = true
    try {
      const r = await fetch('/api/minigame/win', { method: 'POST' })
      if (r.ok) {
        const d = await r.json()
        const xp = d.xpAwarded ?? 25
        emitXpGained(xp)
        setXpMsg(`+${xp} Fun XP earned!`)
      } else if (r.status === 401) {
        setXpMsg('Login to save XP next time!')
      }
    } catch {}
  }, [])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const g = gsRef.current
    if (!g || g.activeAsker === null) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      if (e.changedTouches.length === 0) return
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else {
      clientX = e.clientX; clientY = e.clientY
    }
    const cx = (clientX - rect.left) * (CW / rect.width)
    const cy = (clientY - rect.top) * (CH / rect.height)

    const asker = g.custs.find(c => c.id === g.activeAsker)
    if (!asker) { g.activeAsker = null; return }

    for (const sh of g.shelves) {
      if (cx >= sh.x - 6 && cx <= sh.x + sh.w + 6 && cy >= sh.y - 14 && cy <= sh.y + sh.h + 14) {
        if (sh.id === asker.shelfId) {
          // Correct! Award a perk and send customer to shelf
          g.activeAsker = null
          asker.state = 'walking'
          asker.target = v(sh.x + sh.w/2, sh.y + sh.h + 22)
          grantCustomerPerk(g)
        } else {
          // Wrong shelf
          g.wrongFlash = 1.6
        }
        break
      }
    }
  }, [])

  const startGame = useCallback(() => {
    gsRef.current = mkState()
    xpRef.current = false
    goFiredRef.current = false
    keysRef.current.clear()
    touchRef.current.clear()
    setXpMsg('')
    setScreen('playing')
    // Go fullscreen for the duration of the shift (must run in the click gesture).
    const el = wrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null
    if (el && !document.fullscreenElement) {
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
      try { Promise.resolve(req?.()).catch(() => {}) } catch {}
    }
  }, [])

  // Keep the canvas + HTML overlays sized/scaled together. The game is drawn
  // at CW×CH but displayed at the container width; in fullscreen we letterbox
  // it to the largest CW:CH box that fits the screen. uiScale keeps the
  // overlay text matched to the canvas at all times.
  useEffect(() => {
    const measure = () => {
      const fs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      setIsFs(fs)
      if (fs && wrapRef.current) {
        const W = wrapRef.current.clientWidth
        const H = wrapRef.current.clientHeight
        const s = Math.min(W / CW, H / CH)
        setStageSize({ w: Math.round(CW * s), h: Math.round(CH * s) })
        setUiScale(s)
      } else {
        setStageSize(null)
        const el = stageRef.current
        if (el) setUiScale(el.clientWidth / CW)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    document.addEventListener('fullscreenchange', measure)
    document.addEventListener('webkitfullscreenchange', measure)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      document.removeEventListener('fullscreenchange', measure)
      document.removeEventListener('webkitfullscreenchange', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Leave fullscreen when the shift ends so the leaderboard is visible again.
  useEffect(() => {
    const d = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element }
    if (screen === 'gameover' && (d.fullscreenElement || d.webkitFullscreenElement)) {
      try { Promise.resolve(d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()).catch(() => {}) } catch {}
    }
  }, [screen])

  // RAF game loop
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault()
      keysRef.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    function loop(ts: number) {
      const dt = Math.min((ts - lastTRef.current) / 1000, 0.05)
      lastTRef.current = ts

      const g = gsRef.current
      if (g) {
        const allKeys = new Set([...Array.from(keysRef.current), ...Array.from(touchRef.current)])
        tick(g, dt, allKeys)

        if (g.phase === 'gameover' && !goFiredRef.current) {
          goFiredRef.current = true
          setFinalScore(Math.floor(g.score))
          setFinalTime(Math.floor(g.time))
          setFinalLevel(g.level)
          setScreen('gameover')
          submitScore(Math.floor(g.score))
          if (g.score >= XP_THRESHOLD) awardXP()
        }

        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) render(ctx, g, ts / 1000)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [awardXP, submitScore])

  const touchKey = (key: string, down: boolean) => {
    if (down) touchRef.current.add(key)
    else touchRef.current.delete(key)
  }

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        style={isFs
          ? { width: '100vw', height: '100vh', background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }
          : { width: '100%', maxWidth: 1280, margin: '0 auto' }}
      >
       <div
         ref={stageRef}
         style={{
           position: 'relative',
           ...(isFs && stageSize
             ? { width: stageSize.w, height: stageSize.h }
             : { width: '100%' }),
         }}
       >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onClick={handleCanvasClick}
          onTouchEnd={handleCanvasClick}
          style={{
            display: 'block', width: '100%', height: isFs ? '100%' : 'auto',
            border: isFs ? 'none' : '2px solid var(--border)',
            borderRadius: isFs ? 0 : 8,
            background: '#0d0d14',
            cursor: 'default',
          }}
        />

        {/* ── Menu overlay (scaled to match the canvas) ── */}
        {screen === 'menu' && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            width: CW, height: CH, transformOrigin: 'top left', transform: `scale(${uiScale})`,
            boxSizing: 'border-box',
            background: 'rgba(5,5,14,0.97)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px 30px', gap: 14,
          }}>

            {/* ── Title ── */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 5 }}>🍷</div>
              <h1 style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 13, lineHeight: 1.6,
                color: 'var(--gold)', textShadow: '0 0 22px rgba(200,155,60,0.5)', margin: 0,
              }}>Wine Rush</h1>
              <p className="body-text" style={{ color: 'var(--text-3)', fontSize: 10, margin: '3px 0 0' }}>
                Stock the shelves. Don&apos;t get fired.
              </p>
            </div>

            {/* ── Two-column: Controls + How To Play ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>

              {/* Controls */}
              <div style={{ background: 'rgba(200,155,60,0.05)', border: '1px solid rgba(200,155,60,0.2)', borderRadius: 8, padding: '11px 14px' }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 9, marginBottom: 10, letterSpacing: 1 }}>⌨ CONTROLS</div>

                {/* Arrow keys row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {['↑','↓','←','→'].map(k => (
                      <span key={k} style={{
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                        fontSize: 16, fontWeight: 800,
                        color: '#e8c772', background: 'rgba(200,155,60,0.13)',
                        border: '1px solid rgba(200,155,60,0.45)',
                        borderBottom: '3px solid rgba(200,155,60,0.55)',
                        borderRadius: 5, lineHeight: 1,
                        width: 26, height: 26, boxSizing: 'border-box',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{k}</span>
                    ))}
                  </div>
                  <span className="body-text" style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>Move</span>
                </div>

                {/* Spacebar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontFamily: '"Press Start 2P", monospace', fontSize: 9,
                    color: '#c89b3c', background: 'rgba(200,155,60,0.13)',
                    border: '1px solid rgba(200,155,60,0.45)',
                    borderBottom: '3px solid rgba(200,155,60,0.55)',
                    padding: '5px 22px', borderRadius: 5, lineHeight: 1,
                    letterSpacing: '0.15em', display: 'inline-block',
                  }}>SPACE</span>
                  <span className="body-text" style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>Run</span>
                </div>

                {/* Stockroom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: '"Press Start 2P", monospace', fontSize: 8,
                    color: '#88CCFF', background: 'rgba(100,180,255,0.1)',
                    border: '1px solid rgba(100,180,255,0.3)',
                    borderBottom: '3px solid rgba(100,180,255,0.4)',
                    padding: '5px 8px', borderRadius: 5, lineHeight: 1, whiteSpace: 'nowrap',
                  }}>← LEFT</span>
                  <span className="body-text" style={{ color: '#d8d4cc', fontSize: 11 }}>Enter stockroom for cases</span>
                </div>
              </div>

              {/* How to play */}
              <div style={{ background: 'rgba(100,180,255,0.04)', border: '1px solid rgba(100,180,255,0.16)', borderRadius: 8, padding: '11px 14px' }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#88CCFF', fontSize: 9, marginBottom: 10, letterSpacing: 1 }}>ℹ HOW TO PLAY</div>
                {([
                  ['📦', 'Go left → grab wine cases'],
                  ['🏃', 'Run to shelves → auto-stocks'],
                  ['❓', 'Answer customers → earn perks'],
                  ['👔', 'Keep shelves full or get a strike'],
                  ['☕', '3 strikes = fired!'],
                ] as [string, string][]).map(([icon, text]) => (
                  <div key={icon} style={{ display: 'flex', gap: 7, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
                    <span className="body-text" style={{ color: 'var(--text-2)', fontSize: 10, lineHeight: 1.45 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Power-ups strip ── */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              {([
                { em: '⚡', name: 'Energy Drink',    col: '#00E5FF' },
                { em: '🏗', name: 'Forklift',        col: '#FFC107' },
                { em: '📦', name: 'Vendor Support',  col: '#8BC34A' },
                { em: '⭐', name: 'Emp. of Month',   col: '#FF9800' },
                { em: '💰', name: 'Overtime Pay',    col: '#E91E63' },
              ]).map(p => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${p.col}12`, border: `1px solid ${p.col}35`,
                  padding: '4px 9px', borderRadius: 20,
                }}>
                  <span style={{ fontSize: 13 }}>{p.em}</span>
                  <span style={{ fontFamily: '"Press Start 2P", monospace', color: p.col, fontSize: 7, whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              ))}
            </div>

            {/* ── Start ── */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <button onClick={startGame} className="osrs-btn" style={{ padding: '11px 48px' }}>
                ▶ Start Shift
              </button>
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: 'rgba(200,155,60,0.45)', fontSize: 8, marginTop: 7, letterSpacing: 1 }}>
                Reach {XP_THRESHOLD} pts → +25 Fun XP
              </div>
            </div>

          </div>
          </div>
        )}

        {/* ── Game Over overlay (scaled to match the canvas) ── */}
        {screen === 'gameover' && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            width: CW, height: CH, transformOrigin: 'top left', transform: `scale(${uiScale})`,
            boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            background: 'rgba(10,10,20,0.95)',
          }}>
            <div style={{ fontSize: 46 }}>📋</div>
            <h2 style={{ fontFamily: '"Press Start 2P", monospace', color: '#FF4444', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
              VENDOR COMPLAINT FILED
            </h2>
            <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 14 }}>You&apos;ve been let go.</p>
            <div style={{ fontFamily: '"Press Start 2P", monospace', textAlign: 'center', lineHeight: 2.5 }}>
              <div style={{ color: 'var(--gold)', fontSize: 12 }}>Score: {finalScore}</div>
              <div style={{ color: 'var(--text-2)', fontSize: 8 }}>Level {finalLevel} · {finalTime}s survived</div>
            </div>
            {xpMsg
              ? <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#4CAF50', fontSize: 9 }}>{xpMsg}</div>
              : finalScore < XP_THRESHOLD && (
                  <div style={{ fontFamily: '"Press Start 2P", monospace', color: 'var(--text-3)', fontSize: 7, textAlign: 'center' }}>
                    Reach score {XP_THRESHOLD} to earn Fun XP!
                  </div>
                )
            }
            <button onClick={startGame} className="osrs-btn" style={{ marginTop: 4, padding: '10px 28px' }}>
              Try Again
            </button>
          </div>
          </div>
        )}

        {/* ── On-screen controls (scale with the game so they read in fullscreen) ── */}
        {screen === 'playing' && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14,
            transformOrigin: 'bottom left', transform: `scale(${Math.max(1, uiScale)})`,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, opacity: 0.93,
          }}>
            {/* Movement d-pad */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gridTemplateRows: 'repeat(3, 48px)',
              gap: 3,
            }}>
              {DPAD.map((k, i) => k ? (
                <button key={i}
                  style={{ background: 'rgba(200,155,60,0.42)', border: '2px solid rgba(200,155,60,0.85)', borderRadius: 8,
                    color: '#fff', fontSize: 22, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' }}
                  onPointerDown={e => { e.preventDefault(); touchKey(k, true) }}
                  onPointerUp={() => touchKey(k, false)}
                  onPointerLeave={() => touchKey(k, false)}
                >
                  {DPAD_ICON[k]}
                </button>
              ) : <div key={i} />)}
            </div>
            {/* Sprint = SPACE bar, directly under the arrows */}
            <button
              style={{
                width: 150, height: 52, padding: 0,
                background: 'rgba(200,155,60,0.45)', border: '2px solid rgba(200,155,60,0.9)',
                borderRadius: 12, color: '#fff',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none',
              }}
              onPointerDown={e => { e.preventDefault(); touchKey('ShiftLeft', true) }}
              onPointerUp={() => touchKey('ShiftLeft', false)}
              onPointerLeave={() => touchKey('ShiftLeft', false)}
            >
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>⚡ SPRINT</span>
              <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: 1 }}>hold SPACE</span>
            </button>
          </div>
        )}
       </div>
      </div>

      {(screen === 'menu' || screen === 'gameover') && (
        <GameLeaderboard game="wine-stocker" scoreLabel="pts" refreshKey={refreshKey} />
      )}

      <Link href="/skills/fun" className="text-[8px] hover:underline" style={{ color: 'var(--text-3)' }}>
        ← Back to Fun
      </Link>
    </div>
  )
}
