'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { emitXpGained } from '@/components/XpToast'
import GameLeaderboard from '@/components/GameLeaderboard'

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
const CW = 960, CH = 600
const IFRAME_DUR = 0.45
const DODGE_DUR = 0.32
const DODGE_CD = 1.2
const CHAIN_HIT_RESET = 3.0

/* ═══════════════════════ TYPES ═══════════════════════ */
interface V2 { x: number; y: number }
const v = (x: number, y: number): V2 => ({ x, y })
const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
const norm = (d: V2): V2 => { const m = Math.hypot(d.x, d.y) || 1; return v(d.x / m, d.y / m) }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const rndI = (a: number, b: number) => Math.floor(rnd(a, b + 0.99))

type ClassType = 'duelist' | 'hunter' | 'berserker'
type BossId = 0 | 1 | 2
type GearId =
  | 'spider_fang' | 'venom_bow' | 'web_cloak'
  | 'drake_sword' | 'fire_staff' | 'ember_armor'
  | 'thunder_blade' | 'storm_bow' | 'feather_cloak'

interface ClassDef {
  id: ClassType
  label: string
  color: string
  element: 'shadow' | 'lightning' | 'fire'
  weaponType: 'blade' | 'bow' | 'hammer'
  hp: number
  dmg: number
  range: number
  atkCd: number
  speed: number
  desc: string
  abilities: AbilityDef[]
}

interface AbilityDef {
  key: string
  name: string
  desc: string
  cd: number
}

interface BossDef {
  id: BossId
  name: string
  color: string
  element: 'poison' | 'fire' | 'lightning'
  lore: string
  hp: number
  size: number
  enrageAt: number
  rewards: GearId[]
  arenaType: 'spider' | 'drake' | 'griffin'
}

interface GearDef {
  id: GearId
  name: string
  icon: string
  desc: string
}

interface Projectile {
  id: number
  pos: V2
  vel: V2
  dmg: number
  radius: number
  fromBoss: boolean
  life: number
  color: string
  aoe?: number
  poison?: boolean
}

interface BossAttack {
  type: string
  telegraphTime: number
  elapsed: number
  active: boolean
  data: AttackData
}

interface AttackData {
  targetPos?: V2
  angle?: number
  coneAngle?: number
  coneRange?: number
  radius?: number
  projSpeed?: number
  dmg?: number
  count?: number
  duration?: number
  elapsed?: number
  strikeIndex?: number
}

interface DamageNumber {
  id: number
  pos: V2
  val: number
  life: number
  isPlayer: boolean
}

interface Particle {
  id: number
  pos: V2
  vel: V2
  life: number
  maxLife: number
  color: string
  size: number
}

interface SlowTrap {
  id: number
  pos: V2
  life: number
  fromPlayer: boolean
}

interface HazardZone {
  id: number
  pos: V2
  radius: number
  type: 'poison' | 'fire' | 'lightning' | 'web'
  dps: number
  life: number
  maxLife: number
}

interface AttackFlash {
  angle: number
  timer: number
  maxTimer: number
  type: 'slash' | 'slam' | 'shot' | 'magic' | 'shadow'
  color: string
}

interface GS {
  phase: 'playing' | 'dying' | 'victory' | 'defeat'
  player: PlayerState
  boss: BossState
  projectiles: Projectile[]
  bossAttack: BossAttack | null
  nextAttackTimer: number
  damageNums: DamageNumber[]
  particles: Particle[]
  slowTraps: SlowTrap[]
  zones: HazardZone[]
  attackFlash: AttackFlash | null
  screenShake: number
  bossDeathAnim: number
  lavaParticles: Particle[]
  nextProjId: number
  nextDmgId: number
  nextPartId: number
  nextTrapId: number
  nextZoneId: number
  gtime: number
  bossEnraged: boolean
  poisonTimer: number
  chainHits: number
  chainResetTimer: number
  rageActive: boolean
  rageTimer: number
  bullChargeDash: { active: boolean; vel: V2; timer: number }
  deathBlossomActive: boolean
  deathBlossomTimer: number
  whirlwindActive: boolean
  whirlwindTimer: number
}

interface PlayerState {
  pos: V2
  vel: V2
  targetPos: V2 | null
  hp: number
  maxHp: number
  atkTimer: number
  iframeTimer: number
  dodgeTimer: number
  dodgeCd: number
  dodgeVel: V2
  dodgeTrail: V2[]
  hitFlash: number
  abilityCds: number[]
  slowTimer: number
  knockbackVel: V2
  featherCharges: number
  featherRecharge: number[]
  webTrapPlaced: boolean
  dodgeChargeMode: boolean
  facing: number
}

interface BossState {
  pos: V2
  hp: number
  maxHp: number
  stunTimer: number
  slowTimer: number
  reflectDmg: number
  angle: number
  legPhase: number
  spinePulse: number
  lightningPhase: number
  hitFlash: number
}

/* ═══════════════════════ DEFINITIONS ═══════════════════════ */
const CLASS_DEFS: ClassDef[] = [
  {
    id: 'duelist', label: 'Duelist', color: '#9B59B6', element: 'shadow' as const, weaponType: 'blade' as const, hp: 120, dmg: 28, range: 105, atkCd: 0.55, speed: 185,
    desc: 'Shadow assassin. Dark blades, teleport blink, death spin.',
    abilities: [
      { key: 'Q', name: 'Dash Strike', desc: 'Dash toward cursor + 80 dmg, iframes during dash', cd: 6 },
      { key: 'W', name: 'Parry', desc: '0.8s window: reflect 60 dmg + stun 1.5s if hit', cd: 12 },
      { key: 'E', name: 'Shadow Step', desc: 'Blink to cursor (max 300px), brief iframes', cd: 8 },
      { key: 'R', name: 'Death Blossom', desc: 'Spin 2s, 40 dmg per 0.25s within 130px', cd: 22 },
    ],
  },
  {
    id: 'hunter', label: 'Hunter', color: '#2ECC71', element: 'lightning' as const, weaponType: 'bow' as const, hp: 100, dmg: 22, range: 280, atkCd: 0.65, speed: 175,
    desc: 'Lightning archer. Electrified arrows, frost traps, backflip.',
    abilities: [
      { key: 'Q', name: 'Power Shot', desc: 'Fire 3x damage projectile at cursor', cd: 5 },
      { key: 'W', name: 'Frost Trap', desc: 'Place trap at cursor: 80 dmg + 3s slow on trigger', cd: 10 },
      { key: 'E', name: 'Backflip', desc: 'Leap away from boss + fire 3 arrows', cd: 7 },
      { key: 'R', name: 'Rain of Arrows', desc: '4 AOE waves at cursor (30 dmg each, 0.4s apart)', cd: 22 },
    ],
  },
  {
    id: 'berserker', label: 'Berserker', color: '#E74C3C', element: 'fire' as const, weaponType: 'hammer' as const, hp: 160, dmg: 42, range: 95, atkCd: 1.1, speed: 165,
    desc: 'Fire juggernaut. Massive hammer, rage mode, bull charge.',
    abilities: [
      { key: 'Q', name: 'Ground Slam', desc: '90 dmg AOE circle (120px) centered on player', cd: 6 },
      { key: 'W', name: 'Rage', desc: '+60% dmg for 8s, take 20% more damage', cd: 18 },
      { key: 'E', name: 'Bull Charge', desc: 'Rush toward cursor, 120 dmg on boss impact', cd: 9 },
      { key: 'R', name: 'Whirlwind', desc: 'Spin 2.5s, 50 dmg/s within 100px', cd: 25 },
    ],
  },
]

const BOSS_DEFS: BossDef[] = [
  {
    id: 0, name: 'Spider Queen', color: '#8E44AD', element: 'poison' as const, lore: 'Ancient arachnid empress. Her venom dissolves armor.', hp: 1000, size: 54, enrageAt: 0.40,
    rewards: ['spider_fang', 'venom_bow', 'web_cloak'], arenaType: 'spider',
  },
  {
    id: 1, name: 'Lava Drake', color: '#E67E22', element: 'fire' as const, lore: 'Born in molten depths. Breathes fire hot enough to melt stone.', hp: 1500, size: 60, enrageAt: 0.35,
    rewards: ['drake_sword', 'fire_staff', 'ember_armor'], arenaType: 'drake',
  },
  {
    id: 2, name: 'Storm Griffin', color: '#F1C40F', element: 'lightning' as const, lore: 'Skyborn predator. Calls down storms that split the heavens.', hp: 2000, size: 56, enrageAt: 0.30,
    rewards: ['thunder_blade', 'storm_bow', 'feather_cloak'], arenaType: 'griffin',
  },
]

const GEAR_DEFS: Record<GearId, GearDef> = {
  spider_fang:   { id: 'spider_fang',   name: 'Spider Fang Daggers', icon: '🗡️',  desc: 'Attack 40% faster' },
  venom_bow:     { id: 'venom_bow',     name: 'Venom Bow',           icon: '🏹',  desc: 'Attacks inflict poison (5 dmg/s for 4s)' },
  web_cloak:     { id: 'web_cloak',     name: 'Web Cloak',           icon: '🕸️',  desc: 'Dodge leaves a slow web trap (3s)' },
  drake_sword:   { id: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️',  desc: '+35% damage' },
  fire_staff:    { id: 'fire_staff',    name: 'Fire Staff',          icon: '🔥',  desc: 'Q becomes Fireball: AOE 100px, 60 dmg' },
  ember_armor:   { id: 'ember_armor',   name: 'Ember Armor',         icon: '🛡️',  desc: '+50 max HP' },
  thunder_blade: { id: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡',  desc: 'Every 4th hit chains (+35 bonus dmg)' },
  storm_bow:     { id: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️',  desc: 'Projectiles deal AOE on impact (40px, 20 dmg)' },
  feather_cloak: { id: 'feather_cloak', name: 'Feather Cloak',       icon: '🪶',  desc: '3 dodge charges (1.8s recharge each)' },
}

/* ═══════════════════════ INITIAL STATE ═══════════════════════ */
function mkState(cls: ClassDef, boss: BossDef, gear: GearId[]): GS {
  const maxHp = cls.hp + (gear.includes('ember_armor') ? 50 : 0)
  const featherMode = gear.includes('feather_cloak')
  return {
    phase: 'playing',
    player: {
      pos: v(CW / 2, CH - 120),
      vel: v(0, 0),
      targetPos: null,
      hp: maxHp,
      maxHp,
      atkTimer: 0,
      iframeTimer: 0,
      dodgeTimer: 0,
      dodgeCd: 0,
      dodgeVel: v(0, 0),
      dodgeTrail: [],
      hitFlash: 0,
      abilityCds: [0, 0, 0, 0],
      slowTimer: 0,
      knockbackVel: v(0, 0),
      featherCharges: featherMode ? 3 : 1,
      featherRecharge: featherMode ? [0, 0, 0] : [0],
      webTrapPlaced: false,
      dodgeChargeMode: featherMode,
      facing: -Math.PI / 2,
    },
    boss: {
      pos: v(CW / 2, 160),
      hp: boss.hp,
      maxHp: boss.hp,
      stunTimer: 0,
      slowTimer: 0,
      reflectDmg: 0,
      angle: Math.PI / 2,
      legPhase: 0,
      spinePulse: 0,
      lightningPhase: 0,
      hitFlash: 0,
    },
    projectiles: [],
    bossAttack: null,
    nextAttackTimer: 1.5,
    damageNums: [],
    particles: [],
    slowTraps: [],
    zones: [],
    attackFlash: null,
    screenShake: 0,
    bossDeathAnim: 0,
    lavaParticles: [],
    nextProjId: 0,
    nextDmgId: 0,
    nextPartId: 0,
    nextTrapId: 0,
    nextZoneId: 0,
    gtime: 0,
    bossEnraged: false,
    poisonTimer: 0,
    chainHits: 0,
    chainResetTimer: 0,
    rageActive: false,
    rageTimer: 0,
    bullChargeDash: { active: false, vel: v(0, 0), timer: 0 },
    deathBlossomActive: false,
    deathBlossomTimer: 0,
    whirlwindActive: false,
    whirlwindTimer: 0,
  }
}

/* ═══════════════════════ HELPERS ═══════════════════════ */
let _partId = 0
function spawnParticles(g: GS, pos: V2, count: number, color: string, speed = 120, life = 0.5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd = rnd(speed * 0.4, speed)
    g.particles.push({
      id: ++_partId,
      pos: { ...pos },
      vel: v(Math.cos(angle) * spd, Math.sin(angle) * spd),
      life, maxLife: life,
      color,
      size: rnd(2, 5),
    })
  }
  g.nextPartId = _partId
}

function dealDmgToPlayer(g: GS, dmg: number, cls: ClassDef, gear: GearId[], knockDir?: V2) {
  if (g.player.iframeTimer > 0) return
  const p = g.player
  // Parry check (ability W for duelist, index 1)
  if (cls.id === 'duelist' && p.abilityCds[1] > CLASS_DEFS[0].abilities[1].cd - 0.8) {
    // parry window: cd was just activated (cd > max-parry_window means within window)
    const cd1Max = CLASS_DEFS[0].abilities[1].cd
    if (p.abilityCds[1] > cd1Max - 0.8) {
      // parry success
      g.boss.stunTimer = 1.5
      dealDmgToBoss(g, 60, gear)
      spawnParticles(g, p.pos, 12, '#F39C12', 180)
      p.iframeTimer = 1.0
      return
    }
  }
  let finalDmg = dmg
  if (g.rageActive) finalDmg = Math.round(finalDmg * 1.2)
  p.hp = Math.max(0, p.hp - finalDmg)
  p.hitFlash = 0.18
  p.iframeTimer = 0.5
  if (knockDir) p.knockbackVel = v(knockDir.x * 160, knockDir.y * 160)
  spawnParticles(g, p.pos, 8, '#FF4444', 100)
  g.screenShake = Math.max(g.screenShake, 0.3)
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-20, 20), y: p.pos.y - 20 }, val: Math.round(finalDmg), life: 1.2, isPlayer: true })
  if (p.hp <= 0) g.phase = 'defeat'
}

function spawnZone(g: GS, pos: V2, type: HazardZone['type'], radius: number, dps: number, life: number) {
  g.zones.push({ id: ++g.nextZoneId, pos: { ...pos }, radius, type, dps, life, maxLife: life })
}

function dealDmgToBoss(g: GS, baseDmg: number, gear: GearId[]) {
  let dmg = baseDmg
  if (gear.includes('drake_sword')) dmg = Math.round(dmg * 1.35)
  if (g.rageActive) dmg = Math.round(dmg * 1.6)
  // Thunder blade chain
  if (gear.includes('thunder_blade')) {
    g.chainHits++
    g.chainResetTimer = CHAIN_HIT_RESET
    if (g.chainHits % 4 === 0) {
      dmg += 35
      spawnParticles(g, g.boss.pos, 10, '#F1C40F', 200)
    }
  }
  g.boss.hp = Math.max(0, g.boss.hp - dmg)
  g.boss.hitFlash = 0.12
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: g.boss.pos.x + rnd(-30, 30), y: g.boss.pos.y - 40 }, val: Math.round(dmg), life: 1.0, isPlayer: false })
  spawnParticles(g, g.boss.pos, 5, '#FFFFFF', 80)
  // Venom bow poison
  if (gear.includes('venom_bow') && g.poisonTimer <= 0) {
    g.poisonTimer = 4.0
  }
}

/* ═══════════════════════ BOSS AI ═══════════════════════ */
function selectBossAttack(bossId: BossId, enraged: boolean, dist2p: number): string {
  if (bossId === 0) {
    const pool = dist2p < 130
      ? ['leg_sweep', 'venom_spit', 'toxic_cloud']
      : ['venom_spit', 'toxic_cloud', 'web_shot', 'leg_sweep']
    if (enraged) pool.push('spider_leap', 'venom_burst')
    return pool[rndI(0, pool.length - 1)]
  }
  if (bossId === 1) {
    const pool = dist2p < 130
      ? ['stomp', 'tail_swipe', 'fire_breath', 'lava_puddle']
      : ['fire_breath', 'flame_wave', 'stomp', 'tail_swipe', 'lava_puddle']
    if (enraged) pool.push('ember_barrage', 'lava_puddle')
    return pool[rndI(0, pool.length - 1)]
  }
  // griffin
  const pool = dist2p < 150
    ? ['talon_dive', 'wind_buffet', 'lightning_strike', 'static_field']
    : ['lightning_strike', 'chain_lightning', 'talon_dive', 'wind_buffet', 'static_field']
  if (enraged) pool.push('thunderstorm', 'chain_lightning')
  return pool[rndI(0, pool.length - 1)]
}

function startBossAttack(g: GS, bossId: BossId, type: string) {
  const p = g.player
  const b = g.boss
  const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
  const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)

  const telegraphs: Record<string, number> = {
    venom_spit: 0.85, web_shot: 0.75, leg_sweep: 0.9, spider_leap: 1.0,
    toxic_cloud: 0.7, venom_burst: 1.1,
    fire_breath: 1.1, stomp: 0.8, tail_swipe: 0.75, ember_barrage: 0.65,
    flame_wave: 0.9, lava_puddle: 0.7,
    lightning_strike: 0.9, talon_dive: 0.85, wind_buffet: 0.75, thunderstorm: 0.7,
    static_field: 0.65, chain_lightning: 0.8,
  }

  const data: AttackData = { targetPos: { ...p.pos }, angle, dmg: 0 }

  if (type === 'venom_spit') { data.dmg = 24; data.count = 3; data.projSpeed = 240 }
  else if (type === 'web_shot') { data.dmg = 16; data.projSpeed = 145 }
  else if (type === 'leg_sweep') { data.dmg = 38; data.coneAngle = Math.PI; data.coneRange = 140; data.angle = angle }
  else if (type === 'spider_leap') { data.dmg = 60; data.radius = 120 }
  else if (type === 'toxic_cloud') { data.dmg = 0; data.count = 3 }
  else if (type === 'venom_burst') { data.dmg = 70; data.radius = 160 }
  else if (type === 'fire_breath') { data.dmg = 32; data.coneAngle = 44 * Math.PI / 180; data.coneRange = 240; data.angle = angle; data.duration = 2.2; data.elapsed = 0 }
  else if (type === 'stomp') { data.dmg = 45; data.radius = 0; data.duration = 1.2 }
  else if (type === 'tail_swipe') { data.dmg = 48; data.coneAngle = 270 * Math.PI / 180; data.coneRange = 150; data.angle = angle + Math.PI }
  else if (type === 'ember_barrage') { data.dmg = 22; data.count = 6; data.projSpeed = 270 }
  else if (type === 'flame_wave') { data.dmg = 35; data.coneAngle = 55 * Math.PI / 180; data.coneRange = 300; data.angle = angle; data.duration = 1.5; data.elapsed = 0 }
  else if (type === 'lava_puddle') { data.dmg = 0; data.count = 3 }
  else if (type === 'lightning_strike') { data.dmg = 55; data.radius = 65 }
  else if (type === 'talon_dive') { data.dmg = 60; data.angle = angle; data.projSpeed = 400 }
  else if (type === 'wind_buffet') { data.dmg = 24; data.coneAngle = 80 * Math.PI / 180; data.coneRange = 210; data.angle = angle }
  else if (type === 'thunderstorm') { data.dmg = 45; data.count = 7; data.strikeIndex = 0 }
  else if (type === 'static_field') { data.dmg = 0; data.count = 2 }
  else if (type === 'chain_lightning') { data.dmg = 38; data.count = 5; data.strikeIndex = 0 }

  g.bossAttack = { type, telegraphTime: telegraphs[type] ?? 1.0, elapsed: 0, active: false, data }
  void toPlayer
}

function resolveBossAttack(g: GS, bossId: BossId, cls: ClassDef, gear: GearId[]) {
  const atk = g.bossAttack!
  const p = g.player
  const b = g.boss
  const type = atk.type
  const d = atk.data
  const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))

  if (type === 'venom_spit' || type === 'ember_barrage') {
    const count = d.count ?? 3
    const baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * (0.28)
      const a = baseAngle + spread
      const color = type === 'venom_spit' ? '#8E44AD' : '#E67E22'
      g.projectiles.push({
        id: ++g.nextProjId, pos: { ...b.pos },
        vel: v(Math.cos(a) * (d.projSpeed ?? 230), Math.sin(a) * (d.projSpeed ?? 230)),
        dmg: d.dmg ?? 22, radius: 8, fromBoss: true, life: 4.0, color,
      })
    }
  } else if (type === 'web_shot') {
    g.projectiles.push({
      id: ++g.nextProjId, pos: { ...b.pos },
      vel: v(toPlayer.x * (d.projSpeed ?? 140), toPlayer.y * (d.projSpeed ?? 140)),
      dmg: d.dmg ?? 14, radius: 10, fromBoss: true, life: 5.0, color: '#8E44AD',
    })
  } else if (type === 'leg_sweep' || type === 'tail_swipe' || type === 'wind_buffet') {
    const angle = d.angle ?? 0
    const halfCone = (d.coneAngle ?? Math.PI) / 2
    const range = d.coneRange ?? 130
    const pDist = dist(p.pos, b.pos)
    if (pDist <= range) {
      const pAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let angleDiff = Math.abs(pAngle - angle)
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2)
      if (angleDiff <= halfCone) {
        const knock = type === 'wind_buffet' ? toPlayer : undefined
        dealDmgToPlayer(g, d.dmg ?? 35, cls, gear, knock)
        if (type === 'wind_buffet') {
          p.knockbackVel = v(toPlayer.x * 220, toPlayer.y * 220)
        }
      }
    }
  } else if (type === 'toxic_cloud') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = rnd(120, CW - 120), ty = rnd(100, CH - 100)
      spawnZone(g, v(tx, ty), 'poison', 60, 18, 6.0)
      spawnParticles(g, v(tx, ty), 10, '#8E44AD', 80, 0.8)
    }
  } else if (type === 'venom_burst') {
    const r = d.radius ?? 160
    if (dist(p.pos, b.pos) <= r) {
      dealDmgToPlayer(g, d.dmg ?? 70, cls, gear, toPlayer)
      p.slowTimer = 2.0
    }
    spawnParticles(g, b.pos, 30, '#8E44AD', 260)
    g.screenShake = Math.max(g.screenShake, 0.7)
  } else if (type === 'lava_puddle') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = rnd(100, CW - 100), ty = rnd(80, CH - 100)
      spawnZone(g, v(tx, ty), 'fire', 70, 25, 5.0)
      spawnParticles(g, v(tx, ty), 14, '#FF4500', 100, 0.6)
    }
    g.screenShake = Math.max(g.screenShake, 0.3)
  } else if (type === 'static_field') {
    for (let i = 0; i < (d.count ?? 2); i++) {
      const offset = v(rnd(-80, 80), rnd(-80, 80))
      spawnZone(g, v(p.pos.x + offset.x, p.pos.y + offset.y), 'lightning', 55, 30, 4.0)
      spawnParticles(g, v(p.pos.x + offset.x, p.pos.y + offset.y), 12, '#F1C40F', 150)
    }
  } else if (type === 'spider_leap' || type === 'lightning_strike') {
    const target = d.targetPos!
    const r = d.radius ?? 110
    if (dist(p.pos, target) <= r) {
      dealDmgToPlayer(g, d.dmg ?? 55, cls, gear, norm(v(p.pos.x - target.x, p.pos.y - target.y)))
    }
    spawnParticles(g, target, 20, bossId === 0 ? '#8E44AD' : '#F1C40F', 200)
    g.screenShake = Math.max(g.screenShake, 0.5)
    if (bossId === 0) b.pos = { ...target }
  } else if (type === 'stomp') {
    // expanding shockwave resolved via distance at time of resolve
    const r = 140
    if (dist(p.pos, b.pos) <= r) {
      dealDmgToPlayer(g, d.dmg ?? 38, cls, gear, toPlayer)
    }
    g.screenShake = Math.max(g.screenShake, 0.6)
    spawnParticles(g, b.pos, 24, '#E67E22', 240)
  } else if (type === 'talon_dive') {
    // boss dashes to player pos
    const target = { ...d.targetPos! }
    b.pos = { x: clamp(target.x, 80, CW - 80), y: clamp(target.y, 80, CH - 80) }
    if (dist(p.pos, b.pos) < 80) {
      dealDmgToPlayer(g, d.dmg ?? 55, cls, gear, toPlayer)
    }
    spawnParticles(g, b.pos, 16, '#F1C40F', 200)
    g.screenShake = Math.max(g.screenShake, 0.4)
  }
  // thunderstorm handled in tick (sequential strikes)
}

/* ═══════════════════════ TICK ═══════════════════════ */
function tick(
  g: GS, dt: number,
  cls: ClassDef, bossId: BossId, gear: GearId[],
  mousePos: V2, keys: Set<string>,
  abilityTarget: V2,
  pendingAbility: number | null,
) {
  if (g.phase !== 'playing' && g.phase !== 'dying') return

  // ── Dying animation tick — boss explodes for 3s before showing victory ──
  if (g.phase === 'dying') {
    g.gtime += dt
    g.bossDeathAnim -= dt
    g.screenShake = Math.max(0, g.screenShake - dt * 1.5)
    // Continuous explosion bursts — faster and bigger as it approaches end
    const intensity = 1 - Math.max(0, g.bossDeathAnim / 3.0)
    if (Math.random() < dt * (18 + intensity * 40)) {
      const ox = rnd(-90, 90), oy = rnd(-90, 90)
      const bossPos = BOSS_DEFS[bossId]
      const colors = ['#F1C40F', '#FFFFFF', bossPos.color, '#FF4500']
      spawnParticles(g, v(g.boss.pos.x + ox, g.boss.pos.y + oy),
        rndI(8, 18), colors[rndI(0, colors.length - 1)], rnd(180, 450), rnd(0.4, 1.5))
    }
    if (Math.random() < dt * 5) g.screenShake = Math.max(g.screenShake, rnd(0.4, 1.1))
    // Decay particles
    g.particles = g.particles.filter(part => {
      part.life -= dt
      part.pos.x += part.vel.x * dt; part.pos.y += part.vel.y * dt
      part.vel.x *= Math.pow(0.15, dt); part.vel.y *= Math.pow(0.15, dt)
      return part.life > 0
    })
    g.damageNums = g.damageNums.filter(d => { d.life -= dt; d.pos.y -= 28 * dt; return d.life > 0 })
    if (g.bossDeathAnim <= 0) g.phase = 'victory'
    return
  }

  const p = g.player
  const b = g.boss
  const bossDef = BOSS_DEFS[bossId]
  const speed = cls.speed * (p.slowTimer > 0 ? 0.45 : 1)
  g.gtime += dt

  // Timers
  p.atkTimer = Math.max(0, p.atkTimer - dt)
  p.iframeTimer = Math.max(0, p.iframeTimer - dt)
  p.dodgeCd = Math.max(0, p.dodgeCd - dt)
  p.hitFlash = Math.max(0, p.hitFlash - dt)
  p.slowTimer = Math.max(0, p.slowTimer - dt)
  b.stunTimer = Math.max(0, b.stunTimer - dt)
  b.slowTimer = Math.max(0, b.slowTimer - dt)
  b.hitFlash = Math.max(0, b.hitFlash - dt)
  b.legPhase += dt * (b.stunTimer > 0 ? 0.5 : (g.bossEnraged ? 3.5 : 2.2))
  b.spinePulse += dt * 2.0
  b.lightningPhase += dt * 4.0
  g.screenShake = Math.max(0, g.screenShake - dt * 3)
  g.nextAttackTimer = Math.max(0, g.nextAttackTimer - dt)
  if (g.rageTimer > 0) { g.rageTimer = Math.max(0, g.rageTimer - dt); if (g.rageTimer <= 0) g.rageActive = false }
  if (g.poisonTimer > 0) { g.poisonTimer = Math.max(0, g.poisonTimer - dt); b.hp = Math.max(0, b.hp - 5 * dt) }
  if (g.chainResetTimer > 0) { g.chainResetTimer = Math.max(0, g.chainResetTimer - dt); if (g.chainResetTimer <= 0) g.chainHits = 0 }
  for (let i = 0; i < p.abilityCds.length; i++) p.abilityCds[i] = Math.max(0, p.abilityCds[i] - dt)

  // Feather cloak recharge
  if (p.dodgeChargeMode) {
    for (let i = 0; i < p.featherRecharge.length; i++) {
      if (p.featherCharges < 3 && p.featherRecharge[i] > 0) {
        p.featherRecharge[i] = Math.max(0, p.featherRecharge[i] - dt)
        if (p.featherRecharge[i] <= 0 && p.featherCharges < 3) {
          p.featherCharges++
          const idx = p.featherRecharge.findIndex((_, j) => j !== i || p.featherRecharge[j] <= 0)
          if (idx >= 0) p.featherRecharge[idx] = 0
        }
      }
    }
  }

  // Dodge roll
  if (p.dodgeTimer > 0) {
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt)
    p.pos.x += p.dodgeVel.x * dt
    p.pos.y += p.dodgeVel.y * dt
    p.pos.x = clamp(p.pos.x, 20, CW - 20)
    p.pos.y = clamp(p.pos.y, 20, CH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, p.dodgeTimer)
    p.dodgeTrail.push({ ...p.pos })
    if (p.dodgeTrail.length > 6) p.dodgeTrail.shift()
    // Web cloak: leave trap on dodge
    if (gear.includes('web_cloak') && !p.webTrapPlaced) {
      p.webTrapPlaced = true
      g.slowTraps.push({ id: ++g.nextTrapId, pos: { ...p.pos }, life: 8.0, fromPlayer: true })
    }
  } else {
    p.dodgeTrail = []
    p.webTrapPlaced = false
  }

  // Bull charge
  if (g.bullChargeDash.active) {
    g.bullChargeDash.timer = Math.max(0, g.bullChargeDash.timer - dt)
    p.pos.x += g.bullChargeDash.vel.x * dt
    p.pos.y += g.bullChargeDash.vel.y * dt
    p.pos.x = clamp(p.pos.x, 20, CW - 20)
    p.pos.y = clamp(p.pos.y, 20, CH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, g.bullChargeDash.timer)
    if (dist(p.pos, b.pos) < bossDef.size + 20) {
      dealDmgToBoss(g, gear.includes('fire_staff') ? 120 : 120, gear)
      g.screenShake = Math.max(g.screenShake, 0.4)
      spawnParticles(g, b.pos, 18, '#E74C3C', 200)
      g.bullChargeDash.active = false
    }
    if (g.bullChargeDash.timer <= 0) g.bullChargeDash.active = false
  }

  // Death blossom
  if (g.deathBlossomActive) {
    g.deathBlossomTimer -= dt
    p.iframeTimer = Math.max(p.iframeTimer, 0.1)
    if (g.deathBlossomTimer <= 0) {
      g.deathBlossomActive = false
    } else {
      const tickInt = 0.25
      // count pulses
      const totalTime = 2.0
      const elapsed = totalTime - g.deathBlossomTimer
      const pulses = Math.floor(elapsed / tickInt)
      const prevPulses = Math.floor((elapsed - dt) / tickInt)
      if (pulses > prevPulses && dist(p.pos, b.pos) < 130) {
        dealDmgToBoss(g, 40, gear)
        spawnParticles(g, b.pos, 6, '#9B59B6', 120)
      }
    }
  }

  // Whirlwind
  if (g.whirlwindActive) {
    g.whirlwindTimer -= dt
    p.iframeTimer = Math.max(p.iframeTimer, 0.1)
    if (g.whirlwindTimer <= 0) {
      g.whirlwindActive = false
    } else {
      if (dist(p.pos, b.pos) < 100) {
        const dmgThisTick = 50 * dt
        b.hp = Math.max(0, b.hp - dmgThisTick)
        spawnParticles(g, b.pos, 2, '#E74C3C', 100)
      }
    }
  }

  // Player movement (not during dodge/bull charge)
  if (!p.dodgeTimer && !g.bullChargeDash.active && !g.deathBlossomActive && !g.whirlwindActive) {
    if (p.targetPos) {
      const d = dist(p.pos, p.targetPos)
      if (d > 4) {
        const dir = norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
        const moveSpd = speed * dt
        p.pos.x = clamp(p.pos.x + dir.x * Math.min(moveSpd, d), 20, CW - 20)
        p.pos.y = clamp(p.pos.y + dir.y * Math.min(moveSpd, d), 20, CH - 20)
      } else {
        p.targetPos = null
      }
    }
  }

  // Knockback decay
  if (Math.hypot(p.knockbackVel.x, p.knockbackVel.y) > 1) {
    p.pos.x = clamp(p.pos.x + p.knockbackVel.x * dt, 20, CW - 20)
    p.pos.y = clamp(p.pos.y + p.knockbackVel.y * dt, 20, CH - 20)
    p.knockbackVel.x *= Math.pow(0.04, dt)
    p.knockbackVel.y *= Math.pow(0.04, dt)
  }

  // Auto-attack
  const dToBoss = dist(p.pos, b.pos)
  const atkRange = cls.range + bossDef.size
  let atkCd = cls.atkCd
  if (gear.includes('spider_fang')) atkCd *= 0.6
  // Update player facing
  if (p.targetPos) p.facing = Math.atan2(p.targetPos.y - p.pos.y, p.targetPos.x - p.pos.x)
  else p.facing = b ? Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x) : p.facing

  if (p.atkTimer <= 0 && dToBoss <= atkRange && !p.dodgeTimer && !g.bullChargeDash.active) {
    p.atkTimer = atkCd
    const dmg = cls.dmg
    // Attack flash visual
    const atkAngle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x)
    const flashType = cls.weaponType === 'bow' ? 'shot' : cls.weaponType === 'hammer' ? 'slam' : cls.element === 'shadow' ? 'shadow' : 'slash'
    const flashColor = gear.includes('fire_staff') ? '#FF4500' : gear.includes('venom_bow') ? '#8E44AD' : cls.color
    g.attackFlash = { angle: atkAngle, timer: 0.22, maxTimer: 0.22, type: flashType, color: flashColor }
    if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 4.0
    if (cls.id === 'hunter') {
      // Fire projectile
      const dir = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
      const aoeOnImpact = gear.includes('storm_bow')
      g.projectiles.push({
        id: ++g.nextProjId, pos: { ...p.pos },
        vel: v(dir.x * 420, dir.y * 420),
        dmg, radius: 6, fromBoss: false, life: 3.0, color: '#27AE60',
        aoe: aoeOnImpact ? 40 : undefined,
      })
    } else {
      dealDmgToBoss(g, dmg, gear)
      spawnParticles(g, b.pos, 4, cls.color, 80)
    }
  }

  // Ability activation
  if (pendingAbility !== null && pendingAbility >= 0 && pendingAbility < 4) {
    const idx = pendingAbility
    const abDef = cls.abilities[idx]
    if (p.abilityCds[idx] <= 0) {
      p.abilityCds[idx] = abDef.cd
      activateAbility(g, idx, cls, gear, abilityTarget, bossId)
    }
  }

  // Boss movement
  const bossSpeed = (g.bossEnraged ? 105 : 75) * (b.slowTimer > 0 ? 0.4 : 1)
  if (b.stunTimer <= 0 && !g.bossAttack) {
    const d2p = dist(b.pos, p.pos)
    if (d2p > bossDef.size + 60) {
      const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      b.pos.x = clamp(b.pos.x + dir.x * bossSpeed * dt, 60, CW - 60)
      b.pos.y = clamp(b.pos.y + dir.y * bossSpeed * dt, 60, CH - 60)
    }
  }
  b.angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)

  // Attack flash decay
  if (g.attackFlash) {
    g.attackFlash.timer = Math.max(0, g.attackFlash.timer - dt)
    if (g.attackFlash.timer <= 0) g.attackFlash = null
  }

  // Hazard zones — deal DPS + decay
  g.zones = g.zones.filter(zone => {
    zone.life -= dt
    if (zone.life <= 0) return false
    if (p.iframeTimer <= 0 && dist(p.pos, zone.pos) < zone.radius + 14) {
      const dmgTick = zone.dps * dt
      p.hp = Math.max(0, p.hp - dmgTick)
      p.hitFlash = Math.max(p.hitFlash, 0.06)
      if (zone.type === 'poison' && Math.random() < dt * 2) {
        g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-14, 14), y: p.pos.y - 18 }, val: Math.round(dmgTick), life: 0.8, isPlayer: true })
      }
      if (p.hp <= 0) g.phase = 'defeat'
    }
    return true
  })

  // Slow traps
  g.slowTraps = g.slowTraps.filter(trap => {
    trap.life -= dt
    if (trap.life <= 0) return false
    if (!trap.fromPlayer && dist(p.pos, trap.pos) < 30) {
      p.slowTimer = 3.0
    }
    if (trap.fromPlayer && dist(b.pos, trap.pos) < bossDef.size + 15) {
      b.slowTimer = 3.0
      spawnParticles(g, trap.pos, 8, '#8E44AD', 100)
      return false
    }
    return true
  })

  // Projectiles
  g.projectiles = g.projectiles.filter(proj => {
    proj.life -= dt
    if (proj.life <= 0) return false
    proj.pos.x += proj.vel.x * dt
    proj.pos.y += proj.vel.y * dt
    if (proj.pos.x < 0 || proj.pos.x > CW || proj.pos.y < 0 || proj.pos.y > CH) return false

    if (proj.fromBoss && p.iframeTimer <= 0) {
      if (dist(proj.pos, p.pos) < proj.radius + 14) {
        const type = g.bossAttack?.type
        if (type === 'web_shot') p.slowTimer = 3.0
        dealDmgToPlayer(g, proj.dmg, cls, gear, norm(v(p.pos.x - proj.pos.x, p.pos.y - proj.pos.y)))
        spawnParticles(g, proj.pos, 8, proj.color, 120)
        return false
      }
    }
    if (!proj.fromBoss && dist(proj.pos, b.pos) < proj.radius + bossDef.size) {
      dealDmgToBoss(g, proj.dmg, gear)
      if (proj.aoe) {
        // Storm bow AOE
        spawnParticles(g, proj.pos, 12, '#F1C40F', 160)
        g.screenShake = Math.max(g.screenShake, 0.2)
        if (dist(b.pos, proj.pos) < proj.aoe) {
          dealDmgToBoss(g, 20, gear)
        }
      }
      spawnParticles(g, proj.pos, 6, '#27AE60', 100)
      return false
    }
    return true
  })

  // Boss attack logic
  if (g.bossAttack) {
    const atk = g.bossAttack
    atk.elapsed += dt

    // Chain lightning / thunderstorm sequential strikes
    if ((atk.type === 'thunderstorm' || atk.type === 'chain_lightning') && atk.active) {
      const d2 = atk.data
      const strikeInterval = 0.4
      const idx = d2.strikeIndex ?? 0
      const elapsed2 = d2.elapsed ?? 0
      d2.elapsed = (d2.elapsed ?? 0) + dt
      const newIdx = Math.floor((d2.elapsed ?? 0) / strikeInterval)
      if (newIdx > idx && newIdx <= (d2.count ?? 6)) {
        d2.strikeIndex = newIdx
        const tx = rnd(100, CW - 100)
        const ty = rnd(100, CH - 100)
        const strikeTarget = v(tx, ty)
        if (dist(p.pos, strikeTarget) < 60) {
          dealDmgToPlayer(g, d2.dmg ?? 40, cls, gear, norm(v(p.pos.x - tx, p.pos.y - ty)))
        }
        spawnParticles(g, strikeTarget, 15, '#F1C40F', 220)
        g.screenShake = Math.max(g.screenShake, 0.3)
      }
      if ((d2.elapsed ?? 0) >= ((d2.count ?? 6) * strikeInterval + 0.2)) {
        g.bossAttack = null
        g.nextAttackTimer = rnd(1.8, 3.2) / (g.bossEnraged ? 1.6 : 1.0)
      }
      void elapsed2
      return
    }

    // Flame wave continuous damage
    if (atk.type === 'flame_wave' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const angle2 = atk.data.angle ?? 0
      const halfCone2 = (atk.data.coneAngle ?? 0.5) / 2
      const pAngle2 = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let diff3 = Math.abs(pAngle2 - angle2); while (diff3 > Math.PI) diff3 = Math.abs(diff3 - Math.PI * 2)
      if (diff3 <= halfCone2 && dist(p.pos, b.pos) < (atk.data.coneRange ?? 300)) {
        dealDmgToPlayer(g, (atk.data.dmg ?? 35) * dt * 2.5, cls, gear)
      }
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 1.5)) {
        g.bossAttack = null
        g.nextAttackTimer = rnd(1.4, 2.8) / (g.bossEnraged ? 1.7 : 1.0)
      }
      return
    }
    // Fire breath continuous damage
    if (atk.type === 'fire_breath' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const angle = atk.data.angle ?? 0
      const halfCone = (atk.data.coneAngle ?? 0.4) / 2
      const pAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let diff2 = Math.abs(pAngle - angle); while (diff2 > Math.PI) diff2 = Math.abs(diff2 - Math.PI * 2)
      const inCone = diff2 <= halfCone && dist(p.pos, b.pos) < (atk.data.coneRange ?? 220)
      if (inCone) dealDmgToPlayer(g, (atk.data.dmg ?? 28) * dt * 1.5, cls, gear)
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 2.0)) {
        g.bossAttack = null
        g.nextAttackTimer = rnd(1.8, 3.2) / (g.bossEnraged ? 1.6 : 1.0)
      }
      return
    }

    if (!atk.active && atk.elapsed >= atk.telegraphTime) {
      atk.active = true
      const extendedTypes = ['thunderstorm', 'chain_lightning', 'fire_breath', 'flame_wave']
      if (!extendedTypes.includes(atk.type)) {
        resolveBossAttack(g, bossId, cls, gear)
        g.bossAttack = null
        g.nextAttackTimer = rnd(1.4, 2.6) / (g.bossEnraged ? 1.7 : 1.0)
      }
    }
  } else if (g.nextAttackTimer <= 0 && b.stunTimer <= 0) {
    const type = selectBossAttack(bossId, g.bossEnraged, dist(p.pos, b.pos))
    startBossAttack(g, bossId, type)
  }

  // Enrage check
  if (!g.bossEnraged && b.hp / b.maxHp <= bossDef.enrageAt) {
    g.bossEnraged = true
    g.screenShake = 0.8
    spawnParticles(g, b.pos, 30, '#FF4444', 300)
  }

  // Boss death — enter dying animation phase
  if (b.hp <= 0 && g.phase === 'playing') {
    g.phase = 'dying'
    g.bossDeathAnim = 3.0
    g.bossAttack = null
    g.screenShake = 1.4
    spawnParticles(g, b.pos, 80, '#F1C40F', 380)
    spawnParticles(g, b.pos, 40, bossDef.color, 300)
    spawnParticles(g, b.pos, 20, '#FFFFFF', 500)
  }

  // Damage numbers decay
  g.damageNums = g.damageNums.filter(d => { d.life -= dt; d.pos.y -= 28 * dt; return d.life > 0 })
  // Particles
  g.particles = g.particles.filter(part => {
    part.life -= dt
    part.pos.x += part.vel.x * dt
    part.pos.y += part.vel.y * dt
    part.vel.x *= Math.pow(0.15, dt)
    part.vel.y *= Math.pow(0.15, dt)
    return part.life > 0
  })
  // Lava particles spawn in drake arena
  if (bossId === 1) {
    if (Math.random() < dt * 8) {
      const lx = rnd(60, CW - 60), ly = rnd(CH - 80, CH - 20)
      g.lavaParticles.push({ id: ++g.nextPartId, pos: v(lx, ly), vel: v(rnd(-20, 20), rnd(-60, -20)), life: rnd(0.4, 0.9), maxLife: 0.9, color: rnd(0, 1) > 0.5 ? '#E67E22' : '#FF4500', size: rnd(2, 4) })
    }
    g.lavaParticles = g.lavaParticles.filter(part => { part.life -= dt; part.pos.x += part.vel.x * dt; part.pos.y += part.vel.y * dt; return part.life > 0 })
  }
}

function activateAbility(g: GS, idx: number, cls: ClassDef, gear: GearId[], abilityTarget: V2, _bossId: BossId) {
  const p = g.player
  const b = g.boss

  // Fire staff override for Q
  if (idx === 0 && gear.includes('fire_staff')) {
    const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
    g.projectiles.push({
      id: ++g.nextProjId, pos: { ...p.pos },
      vel: v(dir.x * 380, dir.y * 380),
      dmg: 60, radius: 10, fromBoss: false, life: 3.0, color: '#FF4500', aoe: 100,
    })
    spawnParticles(g, p.pos, 10, '#FF4500', 150)
    return
  }

  if (cls.id === 'duelist') {
    if (idx === 0) { // Dash Strike
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      p.dodgeTimer = 0.28
      p.dodgeVel = v(dir.x * 520, dir.y * 520)
      p.iframeTimer = 0.28
      if (dist(p.pos, b.pos) < 160) {
        dealDmgToBoss(g, 80, gear)
        spawnParticles(g, b.pos, 14, '#9B59B6', 180)
      }
    } else if (idx === 1) { // Parry — cd timer acts as the window indicator
      // iframes for 0.8s parry window handled in dealDmgToPlayer
      p.iframeTimer = 0.1
    } else if (idx === 2) { // Shadow Step
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const blink = Math.min(300, dist(p.pos, abilityTarget))
      p.pos.x = clamp(p.pos.x + dir.x * blink, 20, CW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * blink, 20, CH - 20)
      p.iframeTimer = 0.3
      spawnParticles(g, p.pos, 10, '#9B59B6', 140)
    } else if (idx === 3) { // Death Blossom
      g.deathBlossomActive = true
      g.deathBlossomTimer = 2.0
      spawnParticles(g, p.pos, 16, '#9B59B6', 160)
    }
  } else if (cls.id === 'hunter') {
    if (idx === 0) { // Power Shot
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.projectiles.push({
        id: ++g.nextProjId, pos: { ...p.pos },
        vel: v(dir.x * 500, dir.y * 500),
        dmg: cls.dmg * 3, radius: 8, fromBoss: false, life: 3.0, color: '#F1C40F',
      })
      spawnParticles(g, p.pos, 8, '#27AE60', 120)
    } else if (idx === 1) { // Frost Trap
      g.slowTraps.push({ id: ++g.nextTrapId, pos: { ...abilityTarget }, life: 20.0, fromPlayer: true })
      // deal 80 dmg if boss is already on it
      if (dist(b.pos, abilityTarget) < BOSS_DEFS[_bossId].size + 20) {
        dealDmgToBoss(g, 80, gear)
        b.slowTimer = 3.0
      }
    } else if (idx === 2) { // Backflip
      const awayDir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      p.dodgeTimer = 0.35
      p.dodgeVel = v(awayDir.x * 480, awayDir.y * 480)
      p.iframeTimer = 0.35
      for (let i = 0; i < 3; i++) {
        const spread = (i - 1) * 0.25
        const a = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x) + spread
        g.projectiles.push({
          id: ++g.nextProjId, pos: { ...p.pos },
          vel: v(Math.cos(a) * 420, Math.sin(a) * 420),
          dmg: cls.dmg, radius: 6, fromBoss: false, life: 3.0, color: '#27AE60',
        })
      }
    } else if (idx === 3) { // Rain of Arrows
      for (let wave = 0; wave < 4; wave++) {
        setTimeout(() => {
          if (g.phase !== 'playing') return
          // AOE at target
          if (dist(b.pos, abilityTarget) < 80) {
            dealDmgToBoss(g, 30, gear)
            spawnParticles(g, abilityTarget, 12, '#27AE60', 180)
          }
          g.screenShake = Math.max(g.screenShake, 0.2)
        }, wave * 400)
      }
    }
  } else if (cls.id === 'berserker') {
    if (idx === 0) { // Ground Slam
      if (dist(p.pos, b.pos) < 120) {
        dealDmgToBoss(g, 90, gear)
        g.screenShake = Math.max(g.screenShake, 0.5)
      }
      spawnParticles(g, p.pos, 20, '#E74C3C', 200)
    } else if (idx === 1) { // Rage
      g.rageActive = true
      g.rageTimer = 8.0
      spawnParticles(g, p.pos, 16, '#FF6B35', 160)
    } else if (idx === 2) { // Bull Charge
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.bullChargeDash.active = true
      g.bullChargeDash.vel = v(dir.x * 600, dir.y * 600)
      g.bullChargeDash.timer = 0.4
      p.iframeTimer = 0.4
    } else if (idx === 3) { // Whirlwind
      g.whirlwindActive = true
      g.whirlwindTimer = 2.5
      spawnParticles(g, p.pos, 16, '#E74C3C', 160)
    }
  }
}

/* ═══════════════════════ RENDERER ═══════════════════════ */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function renderArena(ctx: CanvasRenderingContext2D, arenaType: 'spider' | 'drake' | 'griffin', t: number, g: GS) {
  ctx.save()
  if (arenaType === 'spider') {
    // Dark background
    ctx.fillStyle = '#0a0612'
    ctx.fillRect(0, 0, CW, CH)
    // Web lines from corners
    ctx.strokeStyle = 'rgba(140,90,200,0.12)'
    ctx.lineWidth = 1
    const corners = [v(0, 0), v(CW, 0), v(0, CH), v(CW, CH)]
    corners.forEach(corner => {
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        ctx.beginPath()
        ctx.moveTo(corner.x, corner.y)
        ctx.lineTo(corner.x + Math.cos(a) * 700, corner.y + Math.sin(a) * 700)
        ctx.stroke()
      }
    })
    // Moonlight effect
    const moon = ctx.createRadialGradient(CW / 2, -50, 20, CW / 2, -50, 500)
    moon.addColorStop(0, 'rgba(200,180,255,0.06)')
    moon.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = moon
    ctx.fillRect(0, 0, CW, CH)
  } else if (arenaType === 'drake') {
    const bg = ctx.createLinearGradient(0, 0, 0, CH)
    bg.addColorStop(0, '#1a0800')
    bg.addColorStop(1, '#2a0f00')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, CW, CH)
    // Lava cracks
    ctx.strokeStyle = 'rgba(255,100,0,0.18)'
    ctx.lineWidth = 3
    const cracks = [
      [v(100, CH), v(200, CH * 0.6), v(150, CH * 0.3)],
      [v(CW - 120, CH), v(CW - 200, CH * 0.5), v(CW - 160, CH * 0.25)],
      [v(CW * 0.35, CH), v(CW * 0.4, CH * 0.7)],
      [v(CW * 0.7, CH), v(CW * 0.65, CH * 0.65)],
    ]
    cracks.forEach(pts => {
      if (pts.length < 2) return
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      pts.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y))
      ctx.stroke()
    })
    // Lava glow at bottom
    const glow = ctx.createLinearGradient(0, CH * 0.75, 0, CH)
    glow.addColorStop(0, 'rgba(255,80,0,0)')
    glow.addColorStop(1, 'rgba(255,80,0,0.12)')
    ctx.fillStyle = glow; ctx.fillRect(0, CH * 0.75, CW, CH * 0.25)
    // Lava particles
    g.lavaParticles.forEach(part => {
      const a = part.life / part.maxLife
      ctx.globalAlpha = a * 0.8
      ctx.fillStyle = part.color
      ctx.beginPath(); ctx.arc(part.pos.x, part.pos.y, part.size, 0, Math.PI * 2); ctx.fill()
    })
    ctx.globalAlpha = 1
  } else {
    // Griffin: dark blue-grey
    const bg = ctx.createLinearGradient(0, 0, 0, CH)
    bg.addColorStop(0, '#0a0f1a')
    bg.addColorStop(1, '#141a2a')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH)
    // Cloud streaks
    ctx.strokeStyle = 'rgba(180,200,240,0.06)'
    ctx.lineWidth = 12
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(-80, 60 + i * 90)
      ctx.bezierCurveTo(CW * 0.3, 40 + i * 90, CW * 0.6, 80 + i * 90, CW + 80, 55 + i * 90)
      ctx.stroke()
    }
    // Cliff edge at bottom
    ctx.fillStyle = 'rgba(100,120,160,0.1)'
    ctx.fillRect(0, CH - 40, CW, 40)
    ctx.strokeStyle = 'rgba(150,170,200,0.2)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, CH - 40); ctx.lineTo(CW, CH - 40); ctx.stroke()
  }
  void t
  ctx.restore()
}

function renderBoss(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId, t: number) {
  const b = g.boss
  const bossDef = BOSS_DEFS[bossId]
  ctx.save()
  const shake = g.screenShake > 0.05 ? rnd(-g.screenShake * 4, g.screenShake * 4) : 0
  ctx.translate(b.pos.x + shake, b.pos.y + shake)
  // Hit flash overlay — white tint when boss takes damage
  const bossHitWhite = b.hitFlash > 0 && Math.sin(b.hitFlash * 80) > 0

  if (bossId === 0) {
    // Spider Queen
    const enrTint = g.bossEnraged ? `rgba(255,0,0,${0.3 + 0.2 * Math.sin(t * 8)})` : null
    ctx.shadowColor = g.bossEnraged ? '#FF0044' : '#8E44AD'
    ctx.shadowBlur = g.bossEnraged ? 30 : 18

    // 8 legs
    const legCount = 8
    for (let i = 0; i < legCount; i++) {
      const side = i < 4 ? -1 : 1
      const legIdx = i % 4
      const baseAngle = (side === -1 ? Math.PI : 0) + (legIdx - 1.5) * 0.5
      const wave = Math.sin(b.legPhase + i * 0.8) * 0.3
      ctx.strokeStyle = g.bossEnraged ? '#8B2252' : '#4A1A6A'
      ctx.lineWidth = 3
      ctx.beginPath()
      const midR = bossDef.size * 0.8
      const endR = bossDef.size * 1.7
      const mid = v(Math.cos(baseAngle + wave) * midR, Math.sin(baseAngle + wave) * midR)
      const end = v(Math.cos(baseAngle + wave * 1.5) * endR, Math.sin(baseAngle + wave * 1.5 + 0.4) * endR)
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y)
      ctx.stroke()
    }

    // Body gradient
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, bossDef.size)
    gr.addColorStop(0, bossHitWhite ? '#FFF' : (g.bossEnraged ? '#8B2252' : '#5D1E8A'))
    gr.addColorStop(1, bossHitWhite ? '#DDD' : (g.bossEnraged ? '#3A0820' : '#1A0830'))
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.arc(0, 0, bossDef.size, 0, Math.PI * 2); ctx.fill()

    if (enrTint && !bossHitWhite) { ctx.fillStyle = enrTint; ctx.beginPath(); ctx.arc(0, 0, bossDef.size, 0, Math.PI * 2); ctx.fill() }
    // Poison glow ring
    const pglow = 0.4 + 0.3 * Math.sin(t * 3)
    ctx.strokeStyle = `rgba(142,68,173,${pglow * 0.5})`; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, bossDef.size + 8, 0, Math.PI * 2); ctx.stroke()

    // 8 red eyes (more menacing)
    const eyePositions = [v(-14, -8), v(-4, -14), v(8, -12), v(16, -4), v(-16, 2), v(-6, 6), v(6, 8), v(14, 4)]
    eyePositions.forEach((ep, ei) => {
      const epulse = 0.7 + 0.3 * Math.sin(t * 6 + ei * 0.7)
      ctx.fillStyle = bossHitWhite ? '#FFF' : (g.bossEnraged ? '#FF0000' : '#CC0000')
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 10 * epulse
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 3.5 * epulse, 0, Math.PI * 2); ctx.fill()
    })

  } else if (bossId === 1) {
    // Lava Drake
    ctx.shadowColor = '#FF6600'; ctx.shadowBlur = g.bossEnraged ? 40 : 22
    const facing = b.angle

    // Body (elongated ellipse)
    ctx.save()
    ctx.rotate(facing)
    const bodyG = ctx.createLinearGradient(-bossDef.size, 0, bossDef.size, 0)
    bodyG.addColorStop(0, bossHitWhite ? '#FFF' : (g.bossEnraged ? '#FF4500' : '#CC4400'))
    bodyG.addColorStop(0.5, bossHitWhite ? '#FFF' : (g.bossEnraged ? '#FF7700' : '#E05500'))
    bodyG.addColorStop(1, bossHitWhite ? '#EEE' : (g.bossEnraged ? '#FF2200' : '#AA3300'))
    ctx.fillStyle = bodyG
    ctx.beginPath(); ctx.ellipse(0, 0, bossDef.size * 1.25, bossDef.size * 0.72, 0, 0, Math.PI * 2); ctx.fill()

    // Spines along back
    for (let i = 0; i < 5; i++) {
      const sx = -bossDef.size * 0.8 + i * bossDef.size * 0.4
      const sh = 10 + Math.sin(b.spinePulse + i * 0.9) * 4
      ctx.fillStyle = g.bossEnraged ? '#FF9900' : '#CC6600'
      ctx.beginPath(); ctx.moveTo(sx - 5, -bossDef.size * 0.65); ctx.lineTo(sx, -bossDef.size * 0.65 - sh); ctx.lineTo(sx + 5, -bossDef.size * 0.65); ctx.closePath(); ctx.fill()
    }

    // Head
    ctx.fillStyle = g.bossEnraged ? '#FF5500' : '#DD4400'
    ctx.beginPath(); ctx.arc(bossDef.size, 0, bossDef.size * 0.5, 0, Math.PI * 2); ctx.fill()
    // Eyes
    ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(bossDef.size + 6, -8, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(bossDef.size + 6, 8, 5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // Enrage lava burst effect
    if (g.bossEnraged) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6)
      ctx.fillStyle = `rgba(255,80,0,${pulse * 0.18})`
      ctx.beginPath(); ctx.arc(0, 0, bossDef.size * 1.4, 0, Math.PI * 2); ctx.fill()
    }

  } else {
    // Storm Griffin
    ctx.shadowColor = g.bossEnraged ? '#00CCFF' : '#8888FF'
    ctx.shadowBlur = g.bossEnraged ? 36 : 20

    ctx.save(); ctx.rotate(b.angle)

    // Wing arcs
    const wingSpan = bossDef.size * 1.8
    ctx.strokeStyle = g.bossEnraged ? '#66DDFF' : '#AAAAFF'
    ctx.lineWidth = 4; ctx.fillStyle = g.bossEnraged ? 'rgba(100,200,255,0.25)' : 'rgba(150,150,255,0.18)'
    // Left wing
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-wingSpan * 0.6, -bossDef.size * 0.8, -wingSpan, bossDef.size * 0.2)
    ctx.quadraticCurveTo(-wingSpan * 0.5, bossDef.size * 0.5, 0, bossDef.size * 0.3)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    // Right wing
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(wingSpan * 0.6, -bossDef.size * 0.8, wingSpan, bossDef.size * 0.2)
    ctx.quadraticCurveTo(wingSpan * 0.5, bossDef.size * 0.5, 0, bossDef.size * 0.3)
    ctx.closePath(); ctx.fill(); ctx.stroke()

    // Body
    const bodyGr = ctx.createRadialGradient(0, 0, 0, 0, 0, bossDef.size)
    bodyGr.addColorStop(0, bossHitWhite ? '#FFF' : (g.bossEnraged ? '#FFE566' : '#F1C40F'))
    bodyGr.addColorStop(1, bossHitWhite ? '#EEE' : (g.bossEnraged ? '#CC8800' : '#B8860B'))
    ctx.fillStyle = bodyGr
    ctx.beginPath(); ctx.arc(0, 0, bossDef.size, 0, Math.PI * 2); ctx.fill()

    // Beak/head
    ctx.fillStyle = g.bossEnraged ? '#FFEE44' : '#DAA520'
    ctx.beginPath(); ctx.arc(bossDef.size, 0, bossDef.size * 0.42, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#884400'
    ctx.beginPath(); ctx.moveTo(bossDef.size + bossDef.size * 0.4, -6); ctx.lineTo(bossDef.size + bossDef.size * 0.7, 0); ctx.lineTo(bossDef.size + bossDef.size * 0.4, 6); ctx.closePath(); ctx.fill()

    // Tail fan
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.6 + i * (Math.PI * 0.8 / 4)
      ctx.strokeStyle = g.bossEnraged ? 'rgba(100,200,255,0.7)' : 'rgba(200,200,100,0.6)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-bossDef.size * 0.7, 0); ctx.lineTo(-bossDef.size * 0.7 + Math.cos(a) * 40, Math.sin(a) * 40); ctx.stroke()
    }

    ctx.restore()

    // Lightning sparks when enraged
    if (g.bossEnraged) {
      const sparkCount = 3
      for (let i = 0; i < sparkCount; i++) {
        const sa = (t * 4 + i * Math.PI * 2 / sparkCount) % (Math.PI * 2)
        const sr = bossDef.size + 10
        ctx.fillStyle = `rgba(100,220,255,${0.6 + 0.4 * Math.sin(t * 8 + i)})`
        ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  }

  ctx.restore()
}

function renderPlayer(ctx: CanvasRenderingContext2D, g: GS, cls: ClassDef, t: number) {
  const p = g.player
  const isBull = g.bullChargeDash.active
  const isBlossoming = g.deathBlossomActive
  const isWhirling = g.whirlwindActive
  const facing = isBull ? Math.atan2(g.bullChargeDash.vel.y, g.bullChargeDash.vel.x) : p.facing

  // Dodge trail — elemental colored ghost images
  if (p.dodgeTrail.length > 1) {
    p.dodgeTrail.forEach((tp, i) => {
      const a = (i / p.dodgeTrail.length) * 0.35
      ctx.save(); ctx.globalAlpha = a
      ctx.shadowColor = cls.color; ctx.shadowBlur = 8
      ctx.fillStyle = cls.element === 'shadow' ? '#7D3C98' : cls.color
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 13, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    })
  }

  // Attack flash visual (drawn at world position, before player ctx.save/translate)
  if (g.attackFlash && g.attackFlash.timer > 0) {
    const af = g.attackFlash
    const prog = 1 - af.timer / af.maxTimer
    const alpha = 1 - prog
    ctx.save()
    ctx.translate(p.pos.x, p.pos.y)
    ctx.rotate(af.angle)
    ctx.globalAlpha = alpha * 0.9
    if (af.type === 'slash' || af.type === 'shadow') {
      // Slash arc
      const r = 48 + prog * 20
      const arcSpread = af.type === 'shadow' ? 1.2 : 0.9
      ctx.strokeStyle = af.color; ctx.lineWidth = 3 + (1 - prog) * 3
      ctx.shadowColor = af.color; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(0, 0, r, -arcSpread / 2, arcSpread / 2); ctx.stroke()
      if (af.type === 'shadow') {
        ctx.strokeStyle = 'rgba(150,50,255,0.4)'; ctx.lineWidth = 8
        ctx.beginPath(); ctx.arc(0, 0, r + 10, -arcSpread / 2 - 0.2, arcSpread / 2 + 0.2); ctx.stroke()
      }
    } else if (af.type === 'slam') {
      // Hammer shockwave — concentric rings
      const ringR = 20 + prog * 60
      ctx.strokeStyle = af.color; ctx.lineWidth = 5 - prog * 3; ctx.shadowColor = af.color; ctx.shadowBlur = 14
      ctx.globalAlpha = alpha * 0.8
      ctx.beginPath(); ctx.arc(25, 0, ringR * 0.5, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = alpha * 0.4
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(25, 0, ringR, 0, Math.PI * 2); ctx.stroke()
    } else if (af.type === 'shot') {
      // Arrow streak
      const len = 30 + prog * 40
      ctx.strokeStyle = af.color; ctx.lineWidth = 3; ctx.shadowColor = af.color; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16 + len, 0); ctx.stroke()
      ctx.globalAlpha = alpha * 0.5
      ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16 + len * 0.5, 0); ctx.stroke()
    } else if (af.type === 'magic') {
      // Spell burst rings
      const mr = 20 + prog * 50
      ctx.strokeStyle = af.color; ctx.lineWidth = 2; ctx.shadowColor = af.color; ctx.shadowBlur = 16
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.arc(30, 0, mr, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  ctx.save()
  ctx.translate(p.pos.x, p.pos.y)

  // Hit flash
  if (p.hitFlash > 0) {
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 22
  } else {
    ctx.shadowColor = cls.color; ctx.shadowBlur = cls.element === 'shadow' ? 18 : 12
  }

  // Spin radius for blossom / whirlwind
  if (isBlossoming || isWhirling) {
    const spinAngle = t * (isBlossoming ? 13 : 11)
    const spinColor = isBlossoming ? '#9B59B6' : '#E74C3C'
    ctx.save(); ctx.rotate(spinAngle)
    ctx.strokeStyle = spinColor; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.65
    ctx.beginPath(); ctx.arc(0, 0, isBlossoming ? 130 : 100, 0, Math.PI * 2)
    ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()
    // Extra glowing blade streak
    for (let i = 0; i < (isBlossoming ? 4 : 3); i++) {
      const ba = spinAngle + i * (Math.PI * 2 / (isBlossoming ? 4 : 3))
      const br = isBlossoming ? 42 : 34
      ctx.save(); ctx.globalAlpha = 0.55
      ctx.strokeStyle = spinColor; ctx.lineWidth = 3; ctx.shadowColor = spinColor; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(Math.cos(ba) * 14, Math.sin(ba) * 14)
      ctx.lineTo(Math.cos(ba) * br, Math.sin(ba) * br); ctx.stroke()
      ctx.restore()
    }
  }

  // Rage aura
  if (g.rageActive) {
    const rp = 0.5 + 0.5 * Math.sin(t * 8)
    // Flame corona
    for (let i = 0; i < 6; i++) {
      const fa = (t * 3 + i * Math.PI / 3) % (Math.PI * 2)
      const fr = 22 + Math.sin(t * 5 + i) * 5
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,80,0,${rp * 0.5})` : `rgba(255,200,0,${rp * 0.3})`
      ctx.beginPath(); ctx.arc(Math.cos(fa) * fr, Math.sin(fa) * fr, 4 + rp * 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = `rgba(231,76,60,${rp * 0.2})`
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill()
  }

  // Elemental aura
  if (cls.element === 'shadow') {
    const sp = 0.5 + 0.5 * Math.sin(t * 5)
    ctx.fillStyle = `rgba(120,40,200,${sp * 0.15})`
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill()
  } else if (cls.element === 'lightning') {
    const lp = 0.5 + 0.5 * Math.sin(t * 9)
    ctx.fillStyle = `rgba(50,200,255,${lp * 0.12})`
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill()
  }

  // Body — class skin
  const hitWhite = p.hitFlash > 0 && Math.sin(p.hitFlash * 80) > 0
  if (cls.element === 'shadow') {
    // Dark purple armor — angular shape
    const gr = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16)
    gr.addColorStop(0, hitWhite ? '#FFF' : '#C39BD3')
    gr.addColorStop(0.5, hitWhite ? '#FFF' : '#7D3C98')
    gr.addColorStop(1, hitWhite ? '#FFF' : '#2C0A3A')
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill()
    // Dark cloak silhouette
    ctx.fillStyle = hitWhite ? '#FFF' : 'rgba(40,0,80,0.7)'
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 17, 0, 0, Math.PI * 2); ctx.fill()
  } else if (cls.element === 'lightning') {
    // Bright green-yellow energy
    const gr = ctx.createRadialGradient(-3, -3, 0, 0, 0, 16)
    gr.addColorStop(0, hitWhite ? '#FFF' : '#A9DFBF')
    gr.addColorStop(0.5, hitWhite ? '#FFF' : '#27AE60')
    gr.addColorStop(1, hitWhite ? '#FFF' : '#1A6E3C')
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill()
    // Electric spark
    if (Math.sin(t * 12) > 0.6) {
      ctx.strokeStyle = '#7DFFB0'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(0, -2); ctx.lineTo(4, -8); ctx.stroke()
      ctx.globalAlpha = 1
    }
  } else {
    // Fire berserker — red/orange
    const gr = ctx.createRadialGradient(-3, -3, 0, 0, 0, 17)
    gr.addColorStop(0, hitWhite ? '#FFF' : '#F1948A')
    gr.addColorStop(0.5, hitWhite ? '#FFF' : '#E74C3C')
    gr.addColorStop(1, hitWhite ? '#FFF' : '#7B241C')
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill()
  }

  // Weapon
  ctx.save()
  ctx.rotate(facing)
  if (cls.weaponType === 'blade') {
    // Shadow blade — thin dark sword
    ctx.strokeStyle = hitWhite ? '#FFF' : '#C39BD3'
    ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 10
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(32, 0); ctx.stroke()
    ctx.lineWidth = 1; ctx.globalAlpha = 0.6
    ctx.strokeStyle = '#EEE'
    ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(30, -1); ctx.stroke()
    ctx.globalAlpha = 1
    // Cross-guard
    ctx.strokeStyle = '#7D3C98'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(14, 5); ctx.stroke()
  } else if (cls.weaponType === 'bow') {
    // Bow arc
    ctx.strokeStyle = hitWhite ? '#FFF' : '#2ECC71'
    ctx.shadowColor = '#2ECC71'; ctx.shadowBlur = 8; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(20, 0, 14, -Math.PI * 0.6, Math.PI * 0.6); ctx.stroke()
    // String
    ctx.strokeStyle = 'rgba(200,255,220,0.6)'; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20 + 14 * Math.cos(-Math.PI * 0.6), 14 * Math.sin(-Math.PI * 0.6))
    ctx.lineTo(20 + 14 * Math.cos(Math.PI * 0.6), 14 * Math.sin(Math.PI * 0.6))
    ctx.stroke()
    // Arrow nocked
    ctx.strokeStyle = '#A9DFBF'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(30, 0); ctx.stroke()
  } else {
    // Hammer — thick head
    ctx.fillStyle = hitWhite ? '#FFF' : '#922B21'
    ctx.shadowColor = '#E74C3C'; ctx.shadowBlur = 10
    // Handle
    ctx.strokeStyle = '#6E2B1A'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(30, 0); ctx.stroke()
    // Head
    ctx.fillStyle = hitWhite ? '#FFF' : '#CB4335'
    ctx.beginPath(); ctx.rect(28, -8, 14, 16); ctx.fill()
    ctx.fillStyle = hitWhite ? '#FFF' : '#F1948A'
    ctx.beginPath(); ctx.rect(28, -8, 3, 16); ctx.fill()
  }
  ctx.restore()

  ctx.restore()
}

function renderTelegraph(ctx: CanvasRenderingContext2D, g: GS, _bossId: BossId, t: number) {
  const atk = g.bossAttack
  if (!atk || atk.active) return
  const progress = atk.elapsed / atk.telegraphTime
  const pulse = 0.4 + 0.6 * progress
  const b = g.boss

  ctx.save()
  if (atk.type === 'venom_spit' || atk.type === 'ember_barrage') {
    const count = atk.data.count ?? 3
    const targetAngle = atk.data.angle ?? 0
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.28
      const a = targetAngle + spread
      ctx.strokeStyle = `rgba(255,80,80,${pulse})`; ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y)
      ctx.lineTo(b.pos.x + Math.cos(a) * 400, b.pos.y + Math.sin(a) * 400)
      ctx.stroke(); ctx.setLineDash([])
    }
  } else if (atk.type === 'web_shot' || atk.type === 'talon_dive') {
    const a = atk.data.angle ?? 0
    ctx.strokeStyle = `rgba(255,100,200,${pulse})`; ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y)
    ctx.lineTo(b.pos.x + Math.cos(a) * 500, b.pos.y + Math.sin(a) * 500)
    ctx.stroke(); ctx.setLineDash([])
  } else if (atk.type === 'leg_sweep' || atk.type === 'tail_swipe' || atk.type === 'wind_buffet' || atk.type === 'fire_breath') {
    const angle = atk.data.angle ?? 0
    const half = (atk.data.coneAngle ?? Math.PI) / 2
    const range = atk.data.coneRange ?? 130
    ctx.fillStyle = `rgba(255,60,60,${pulse * 0.22})`
    ctx.strokeStyle = `rgba(255,100,60,${pulse * 0.7})`; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y)
    ctx.arc(b.pos.x, b.pos.y, range, angle - half, angle + half)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (atk.type === 'spider_leap' || atk.type === 'lightning_strike' || atk.type === 'stomp') {
    const target = atk.data.targetPos!
    const r = atk.data.radius ?? (atk.type === 'stomp' ? 140 : 110)
    ctx.strokeStyle = `rgba(255,60,60,${pulse})`; ctx.lineWidth = 2 + progress * 2
    ctx.beginPath(); ctx.arc(target.x, target.y, r * (0.5 + 0.5 * progress), 0, Math.PI * 2)
    ctx.stroke()
    if (atk.type === 'stomp') {
      ctx.strokeStyle = `rgba(255,120,0,${pulse * 0.6})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 145, 0, Math.PI * 2); ctx.stroke()
    }
  } else if (atk.type === 'toxic_cloud' || atk.type === 'lava_puddle' || atk.type === 'static_field') {
    // Show spreading warning circles at several random positions (seeded by type hash for consistency)
    const clr = atk.type === 'toxic_cloud' ? 'rgba(142,68,173,' : atk.type === 'lava_puddle' ? 'rgba(255,80,0,' : 'rgba(241,196,15,'
    const cnt = atk.data.count ?? 3
    for (let i = 0; i < cnt; i++) {
      const seed = atk.type.charCodeAt(0) * 31 + i * 7919
      const wx = 120 + (seed % 720); const wy = 100 + ((seed * 37) % 400)
      ctx.strokeStyle = clr + `${pulse * 0.8})`; ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath(); ctx.arc(wx, wy, 60 * progress, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
    }
  } else if (atk.type === 'venom_burst') {
    ctx.strokeStyle = `rgba(142,68,173,${pulse})`; ctx.lineWidth = 3 + progress * 3
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, (atk.data.radius ?? 160) * (0.4 + 0.6 * progress), 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = `rgba(90,20,130,${pulse * 0.18})`
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, (atk.data.radius ?? 160), 0, Math.PI * 2); ctx.fill()
  } else if (atk.type === 'chain_lightning') {
    // Flashing lines between random points
    ctx.strokeStyle = `rgba(241,196,15,${pulse * 0.9})`; ctx.lineWidth = 2
    ctx.setLineDash([3, 6])
    for (let i = 0; i < 4; i++) {
      const seed2 = i * 1013
      const x1 = 100 + (seed2 % 760), y1 = 80 + ((seed2 * 17) % 440)
      const x2 = 100 + ((seed2 * 53) % 760), y2 = 80 + ((seed2 * 71) % 440)
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }
    ctx.setLineDash([])
  }
  ctx.restore()
  void t
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GS, cls: ClassDef, bossDef: BossDef, t: number) {
  const p = g.player
  const b = g.boss

  // Boss HP bar at top
  const barW = 520, barH = 22, barX = (CW - barW) / 2, barY = 14
  ctx.fillStyle = 'rgba(5,5,14,0.9)'
  rrect(ctx, barX - 10, barY - 8, barW + 20, barH + 22, 8); ctx.fill()
  ctx.strokeStyle = 'rgba(200,155,60,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()

  // Boss name
  ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = '#C89B3C'; ctx.textAlign = 'center'
  ctx.fillText(bossDef.name.toUpperCase(), CW / 2, barY + 2)

  // HP bar bg
  ctx.fillStyle = '#1a0808'; ctx.fillRect(barX, barY + 6, barW, barH - 6)

  // Enrage marker
  const enrageX = barX + barW * bossDef.enrageAt
  ctx.strokeStyle = '#FF4444'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(enrageX, barY + 4); ctx.lineTo(enrageX, barY + barH + 2); ctx.stroke()

  // HP fill
  const hpPct = b.hp / b.maxHp
  const hpColor = g.bossEnraged ? '#FF2222' : hpPct > 0.6 ? '#E74C3C' : hpPct > 0.3 ? '#E67E22' : '#FF4444'
  ctx.fillStyle = hpColor; ctx.fillRect(barX, barY + 6, barW * hpPct, barH - 6)
  if (g.bossEnraged) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6)
    ctx.fillStyle = `rgba(255,0,0,${pulse * 0.25})`; ctx.fillRect(barX, barY + 6, barW * hpPct, barH - 6)
    ctx.font = '9px "Press Start 2P", monospace'; ctx.fillStyle = '#FF4444'; ctx.textAlign = 'right'
    ctx.fillText('🔥 ENRAGED', barX + barW - 2, barY + barH + 1)
  }

  // Stun indicator
  if (b.stunTimer > 0) {
    ctx.font = '9px "Press Start 2P", monospace'; ctx.fillStyle = '#F1C40F'; ctx.textAlign = 'left'
    ctx.fillText('STUNNED', barX + 2, barY + barH + 1)
  }

  // ── Player HP bar (bottom) ──
  const pBarW = 200, pBarH = 14, pBarX = 14, pBarY = CH - 90
  ctx.fillStyle = 'rgba(5,5,14,0.9)'
  rrect(ctx, pBarX - 6, pBarY - 20, pBarW + 12, pBarH + 36, 8); ctx.fill()
  ctx.strokeStyle = `${cls.color}66`; ctx.lineWidth = 1.5; ctx.stroke()

  ctx.font = '9px "Press Start 2P", monospace'; ctx.fillStyle = cls.color; ctx.textAlign = 'left'
  ctx.fillText(cls.label.toUpperCase(), pBarX, pBarY - 8)
  ctx.fillStyle = '#1a0808'; ctx.fillRect(pBarX, pBarY, pBarW, pBarH)
  const phpPct = p.hp / p.maxHp
  ctx.fillStyle = phpPct > 0.5 ? '#27AE60' : phpPct > 0.25 ? '#F39C12' : '#E74C3C'
  ctx.fillRect(pBarX, pBarY, pBarW * phpPct, pBarH)
  ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#A09880'
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, pBarX, pBarY + pBarH + 12)

  // Dodge cooldown dot
  const dodgeX = pBarX + pBarW + 16, dodgeY = pBarY + 7
  const canDodge = p.dodgeChargeMode ? p.featherCharges > 0 : p.dodgeCd <= 0
  ctx.fillStyle = canDodge ? '#C89B3C' : 'rgba(200,155,60,0.2)'
  ctx.shadowColor = canDodge ? '#C89B3C' : 'transparent'; ctx.shadowBlur = canDodge ? 8 : 0
  ctx.beginPath(); ctx.arc(dodgeX, dodgeY, 7, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  ctx.font = '7px "Press Start 2P", monospace'; ctx.fillStyle = '#524020'; ctx.textAlign = 'center'
  ctx.fillText('SPACE', dodgeX, dodgeY + 18)

  // Feather cloak charge indicators
  if (p.dodgeChargeMode) {
    for (let i = 0; i < 3; i++) {
      const chX = dodgeX - 14 + i * 14
      ctx.fillStyle = i < p.featherCharges ? '#C89B3C' : 'rgba(200,155,60,0.2)'
      ctx.beginPath(); ctx.arc(chX, dodgeY + 26, 4, 0, Math.PI * 2); ctx.fill()
    }
  }

  // ── Ability slots (bottom) ──
  const slotW = 52, slotH = 52, slotY = CH - 88
  const totalSlotsW = 4 * slotW + 3 * 6
  const slotStartX = CW / 2 - totalSlotsW / 2
  const keys = ['Q', 'W', 'E', 'R']

  cls.abilities.forEach((ab, i) => {
    const sx = slotStartX + i * (slotW + 6)
    const cdPct = p.abilityCds[i] / ab.cd
    const ready = cdPct <= 0

    ctx.fillStyle = 'rgba(5,5,14,0.92)'
    rrect(ctx, sx, slotY, slotW, slotH, 7); ctx.fill()
    ctx.strokeStyle = ready ? `${cls.color}CC` : 'rgba(80,60,40,0.6)'; ctx.lineWidth = 1.5; ctx.stroke()

    if (!ready) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.save(); ctx.beginPath()
      rrect(ctx, sx, slotY, slotW, slotH * cdPct, 7); ctx.fill()
      ctx.restore()
    }
    if (ready) { ctx.shadowColor = cls.color; ctx.shadowBlur = 8 } else ctx.shadowBlur = 0
    ctx.font = '13px "Press Start 2P", monospace'; ctx.fillStyle = ready ? cls.color : '#504030'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(keys[i], sx + slotW / 2, slotY + 18)
    ctx.shadowBlur = 0
    ctx.font = '6px "Press Start 2P", monospace'; ctx.fillStyle = ready ? '#A09880' : '#504030'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(ab.name, sx + slotW / 2, slotY + slotH - 6)

    if (!ready) {
      ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = '#C89B3C'; ctx.textBaseline = 'middle'
      ctx.fillText(Math.ceil(p.abilityCds[i]).toString(), sx + slotW / 2, slotY + slotH / 2 + 4)
      ctx.textBaseline = 'alphabetic'
    }
  })
  ctx.textBaseline = 'alphabetic'

  // Status icons
  let statusX = 14
  const statusY = CH - 100
  if (g.rageActive) {
    ctx.font = '9px "Press Start 2P", monospace'; ctx.fillStyle = '#E74C3C'
    ctx.textAlign = 'left'
    ctx.fillText(`RAGE ${Math.ceil(g.rageTimer)}s`, statusX, statusY)
    statusX += 80
  }
  if (p.slowTimer > 0) {
    ctx.fillStyle = '#8BC8FF'; ctx.fillText(`SLOWED ${Math.ceil(p.slowTimer)}s`, statusX, statusY)
    statusX += 90
  }
  if (g.poisonTimer > 0) {
    ctx.fillStyle = '#7FBA00'; ctx.fillText(`POISON ${Math.ceil(g.poisonTimer)}s`, statusX, statusY)
  }
  ctx.textAlign = 'left'
}

function renderHazards(ctx: CanvasRenderingContext2D, g: GS) {
  const ZONE_COLORS: Record<string, [string, string]> = {
    poison: ['#8E44AD', '#5D1E7A'],
    fire: ['#FF6600', '#AA2200'],
    lightning: ['#F1C40F', '#8B6914'],
    web: ['#6C3483', '#3B1560'],
  }
  g.zones.forEach(zone => {
    const [bright, dark] = ZONE_COLORS[zone.type] ?? ['#FFF', '#888']
    const lifePct = zone.life / zone.maxLife
    const pulse = 0.55 + 0.45 * Math.sin(g.gtime * 4 + zone.id * 1.3)
    ctx.save()
    ctx.globalAlpha = Math.min(lifePct * 2, 0.85) * (0.7 + 0.3 * pulse)
    // Ground glow
    const grad = ctx.createRadialGradient(zone.pos.x, zone.pos.y, 0, zone.pos.x, zone.pos.y, zone.radius)
    grad.addColorStop(0, dark + 'CC')
    grad.addColorStop(0.6, bright + '44')
    grad.addColorStop(1, bright + '00')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(zone.pos.x, zone.pos.y, zone.radius, 0, Math.PI * 2); ctx.fill()
    // Pulsing ring
    ctx.strokeStyle = bright; ctx.lineWidth = 1.5 + pulse
    ctx.globalAlpha = 0.6 * pulse * lifePct
    ctx.beginPath(); ctx.arc(zone.pos.x, zone.pos.y, zone.radius * (0.85 + 0.15 * pulse), 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  })
}

function renderProjectiles(ctx: CanvasRenderingContext2D, g: GS) {
  g.projectiles.forEach(proj => {
    ctx.save()
    ctx.shadowColor = proj.color; ctx.shadowBlur = 10
    ctx.fillStyle = proj.color
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  })
}

function renderSlowTraps(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  g.slowTraps.forEach(trap => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + trap.id)
    ctx.save()
    ctx.globalAlpha = Math.min(1, trap.life * 0.5) * (0.7 + 0.3 * pulse)
    ctx.strokeStyle = trap.fromPlayer ? '#8E44AD' : '#27AE60'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.arc(trap.pos.x, trap.pos.y, 18, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 0.3 * pulse
    ctx.fillStyle = trap.fromPlayer ? '#8E44AD' : '#27AE60'
    ctx.beginPath(); ctx.arc(trap.pos.x, trap.pos.y, 18, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  })
}

function renderParticles(ctx: CanvasRenderingContext2D, g: GS) {
  g.particles.forEach(part => {
    const a = part.life / part.maxLife
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = part.color
    ctx.beginPath(); ctx.arc(part.pos.x, part.pos.y, part.size * a, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  })
}

function renderDamageNumbers(ctx: CanvasRenderingContext2D, g: GS) {
  g.damageNums.forEach(dn => {
    ctx.save()
    ctx.globalAlpha = Math.min(1, dn.life * 1.5)
    ctx.font = `${dn.isPlayer ? 12 : 14}px "Press Start 2P", monospace`
    ctx.fillStyle = dn.isPlayer ? '#FF4444' : '#FFFFFF'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = dn.isPlayer ? '#FF0000' : '#C89B3C'; ctx.shadowBlur = 6
    ctx.fillText(`-${dn.val}`, dn.pos.x, dn.pos.y)
    ctx.restore()
  })
  ctx.textBaseline = 'alphabetic'
}

function renderBossDeath(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId) {
  const b = g.boss
  const bossDef = BOSS_DEFS[bossId]
  const totalDur = 3.0
  const prog = Math.max(0, Math.min(1, 1 - g.bossDeathAnim / totalDur))
  // Boss stays solid for the first half then fades fast
  const alpha = prog < 0.5 ? 1 : Math.max(0, 1 - ((prog - 0.5) * 2) ** 2)

  // Expanding shockwave rings — staggered outward
  for (let ring = 0; ring < 5; ring++) {
    const ringDelay = ring * 0.18
    const ringProg = Math.max(0, Math.min(1, (prog - ringDelay) / 0.7))
    if (ringProg <= 0) continue
    const ringR = ringProg * (260 + ring * 50)
    const ringAlpha = (1 - ringProg) * 0.65
    ctx.save()
    ctx.globalAlpha = ringAlpha
    ctx.strokeStyle = ring % 2 === 0 ? '#F1C40F' : bossDef.color
    ctx.lineWidth = 5 - ring * 0.6
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, Math.max(0, ringR), 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }

  // White flash at moment of death (first 0.3s)
  if (prog < 0.3) {
    const flashAlpha = (1 - prog / 0.3) * 0.7
    ctx.save()
    ctx.globalAlpha = flashAlpha
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CW, CH)
    ctx.restore()
  }

  // Boss body — spinning + shrinking + fragmenting
  if (alpha > 0.02) {
    ctx.save()
    ctx.translate(b.pos.x, b.pos.y)
    const spinSpeed = prog * Math.PI * 10
    ctx.rotate(spinSpeed)
    const scale = Math.max(0.05, 1 - prog * 0.92)
    ctx.scale(scale, scale)
    ctx.globalAlpha = alpha
    // Flash white in early phase
    const isWhite = prog < 0.25 && Math.floor(g.gtime * 28) % 2 === 0
    ctx.shadowColor = isWhite ? '#FFFFFF' : bossDef.color
    ctx.shadowBlur = 40 + prog * 30
    ctx.fillStyle = isWhite ? '#FFFFFF' : bossDef.color
    ctx.beginPath(); ctx.arc(0, 0, bossDef.size, 0, Math.PI * 2); ctx.fill()
    // Inner bright core
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bossDef.size * 0.5)
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)')
    coreGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = coreGrad
    ctx.beginPath(); ctx.arc(0, 0, bossDef.size * 0.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // Debris chunks — 8 fragments flying outward
    for (let i = 0; i < 8; i++) {
      const chunkAngle = (i / 8) * Math.PI * 2 + spinSpeed * 0.3
      const chunkDist = prog * (100 + i * 20)
      const chunkAlpha = alpha * (1 - prog * 0.6)
      if (chunkAlpha < 0.02) continue
      ctx.save()
      ctx.translate(b.pos.x + Math.cos(chunkAngle) * chunkDist, b.pos.y + Math.sin(chunkAngle) * chunkDist)
      ctx.rotate(chunkAngle + spinSpeed)
      ctx.globalAlpha = chunkAlpha
      ctx.fillStyle = i % 2 === 0 ? bossDef.color : '#F1C40F'
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10
      const sz = (bossDef.size * 0.22) * (1 - prog * 0.7)
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1, sz), 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  // "BOSS SLAIN" text — fades in after 1.5s
  if (prog > 0.5) {
    const textAlpha = Math.min(1, (prog - 0.5) * 3)
    ctx.save()
    ctx.globalAlpha = textAlpha
    ctx.font = '22px "Press Start 2P", monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = '#F1C40F'; ctx.shadowBlur = 24
    ctx.fillStyle = '#F1C40F'
    ctx.fillText('BOSS SLAIN', CW / 2, CH / 2 - 20)
    ctx.font = '11px "Press Start 2P", monospace'
    ctx.fillStyle = bossDef.color
    ctx.shadowColor = bossDef.color
    ctx.fillText(bossDef.name.toUpperCase() + ' DEFEATED', CW / 2, CH / 2 + 16)
    ctx.restore()
  }
}

function render(ctx: CanvasRenderingContext2D, g: GS, cls: ClassDef, bossId: BossId, t: number) {
  ctx.save()
  if (g.screenShake > 0.05) {
    ctx.translate(rnd(-g.screenShake * 6, g.screenShake * 6), rnd(-g.screenShake * 6, g.screenShake * 6))
  }

  const bossDef = BOSS_DEFS[bossId]
  renderArena(ctx, bossDef.arenaType, t, g)

  if (g.phase === 'dying') {
    // During death animation: just show arena + particles + death sequence
    renderParticles(ctx, g)
    renderBossDeath(ctx, g, bossId)
    renderPlayer(ctx, g, cls, t)
  } else {
    renderHazards(ctx, g)
    renderSlowTraps(ctx, g, t)
    renderTelegraph(ctx, g, bossId, t)
    renderParticles(ctx, g)
    renderProjectiles(ctx, g)
    renderBoss(ctx, g, bossId, t)
    renderPlayer(ctx, g, cls, t)
    renderDamageNumbers(ctx, g)
    renderHUD(ctx, g, cls, bossDef, t)
  }

  ctx.restore()
}

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function BossHunter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GS | null>(null)
  const rafRef = useRef(0)
  const lastTRef = useRef(0)
  const mouseRef = useRef<V2>(v(CW / 2, CH / 2))
  const pendingAbilityRef = useRef<number | null>(null)
  const xpRef = useRef(false)
  const scoreSubmittedRef = useRef(false)

  const [screen, setScreen] = useState<'menu' | 'hunt_select' | 'playing' | 'victory' | 'defeat'>('menu')
  const [selectedClass, setSelectedClass] = useState<ClassType>('duelist')
  const [currentBossId, setCurrentBossId] = useState<BossId>(0)
  const [beatenBosses, setBeatenBosses] = useState<boolean[]>([false, false, false])
  const [collectedGear, setCollectedGear] = useState<GearId[]>([])
  const [rewardChoices, setRewardChoices] = useState<GearId[]>([])
  const [xpMsg, setXpMsg] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [score, setScore] = useState(0)

  const submitScore = useCallback(async (s: number) => {
    if (scoreSubmittedRef.current) return
    scoreSubmittedRef.current = true
    try {
      await fetch('/api/minigame/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'boss-hunter', score: s }),
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

  const startFight = useCallback((bossId: BossId) => {
    const clsDef = CLASS_DEFS.find(c => c.id === selectedClass)!
    const gear = collectedGear
    gsRef.current = mkState(clsDef, BOSS_DEFS[bossId], gear)
    setCurrentBossId(bossId)
    scoreSubmittedRef.current = false
    setScreen('playing')
  }, [selectedClass, collectedGear])

  const pickGear = useCallback((gearId: GearId) => {
    setCollectedGear(prev => [...prev, gearId])
    // Check if all bosses beaten
    setBeatenBosses(prev => {
      const next = [...prev]
      next[currentBossId] = true
      const allBeaten = next.every(b => b)
      if (allBeaten) {
        setScreen('hunt_select')
      } else {
        setScreen('hunt_select')
      }
      return next
    })
  }, [currentBossId])

  // Game loop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'].includes(e.code)) {
        e.preventDefault()
        if (gsRef.current?.phase === 'playing') {
          if (e.code === 'Space') {
            const g = gsRef.current
            const p = g.player
            if (p.dodgeChargeMode) {
              if (p.featherCharges > 0) {
                p.featherCharges--
                const emptyIdx = p.featherRecharge.findIndex(r => r <= 0)
                if (emptyIdx >= 0) p.featherRecharge[emptyIdx] = 1.8
                const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : v(1, 0)
                p.dodgeTimer = DODGE_DUR
                p.dodgeVel = v(dir.x * 460, dir.y * 460)
                p.webTrapPlaced = false
              }
            } else if (p.dodgeCd <= 0) {
              const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : v(1, 0)
              p.dodgeTimer = DODGE_DUR
              p.dodgeVel = v(dir.x * 460, dir.y * 460)
              p.dodgeCd = DODGE_CD
              p.iframeTimer = IFRAME_DUR
              p.webTrapPlaced = false
            }
          } else {
            const abilityMap: Record<string, number> = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3 }
            pendingAbilityRef.current = abilityMap[e.code] ?? null
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function loop(ts: number) {
      const dt = Math.min((ts - lastTRef.current) / 1000, 0.05)
      lastTRef.current = ts
      const g = gsRef.current
      if (g && screen === 'playing') {
        const clsDef = CLASS_DEFS.find(c => c.id === selectedClass)!
        tick(
          g, dt,
          clsDef, currentBossId, collectedGear,
          mouseRef.current,
          new Set<string>(),
          mouseRef.current,
          pendingAbilityRef.current,
        )
        pendingAbilityRef.current = null

        // Only transition to victory AFTER the death animation completes
        if (g.phase === 'victory') {
          const bossScore = (currentBossId + 1) * 1000 + Math.round(g.boss.maxHp / 10)
          setScore(bossScore)
          submitScore(bossScore)
          awardXP()
          setRewardChoices(BOSS_DEFS[currentBossId].rewards)
          setScreen('victory')
          gsRef.current = null
        }
        if (g.phase === 'defeat') {
          const defeatScore = Math.round((1 - g.boss.hp / g.boss.maxHp) * 500)
          setScore(defeatScore)
          submitScore(defeatScore)
          setScreen('defeat')
          gsRef.current = null
        }

        const canvas = canvasRef.current
        if (canvas && (g.phase === 'playing' || g.phase === 'dying')) {
          const ctx = canvas.getContext('2d')
          if (ctx) render(ctx, g, clsDef, currentBossId, ts / 1000)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen, selectedClass, currentBossId, collectedGear, submitScore, awardXP])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (CW / rect.width)
    const cy = (e.clientY - rect.top) * (CH / rect.height)
    if (gsRef.current?.phase === 'playing') {
      gsRef.current.player.targetPos = v(cx, cy)
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    handleCanvasClick(e)
  }, [handleCanvasClick])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = v(
      (e.clientX - rect.left) * (CW / rect.width),
      (e.clientY - rect.top) * (CH / rect.height),
    )
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const touch = e.touches[0]
    if (!canvas || !touch) return
    const rect = canvas.getBoundingClientRect()
    const gx = (touch.clientX - rect.left) * (CW / rect.width)
    const gy = (touch.clientY - rect.top) * (CH / rect.height)
    mouseRef.current = v(gx, gy)
    const g = gsRef.current
    if (g?.phase === 'playing') g.player.targetPos = v(gx, gy)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const touch = e.touches[0]
    if (!canvas || !touch) return
    const rect = canvas.getBoundingClientRect()
    const gx = (touch.clientX - rect.left) * (CW / rect.width)
    const gy = (touch.clientY - rect.top) * (CH / rect.height)
    mouseRef.current = v(gx, gy)
    const g = gsRef.current
    if (g?.phase === 'playing') g.player.targetPos = v(gx, gy)
  }, [])

  const triggerDodge = useCallback(() => {
    const g = gsRef.current
    if (!g || g.phase !== 'playing') return
    const p = g.player
    if (p.dodgeChargeMode) {
      if (p.featherCharges > 0) {
        p.featherCharges--
        const emptyIdx = p.featherRecharge.findIndex((r: number) => r <= 0)
        if (emptyIdx >= 0) p.featherRecharge[emptyIdx] = 1.8
        const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : v(1, 0)
        p.dodgeTimer = DODGE_DUR
        p.dodgeVel = v(dir.x * 460, dir.y * 460)
        p.webTrapPlaced = false
      }
    } else if (p.dodgeCd <= 0) {
      const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : v(1, 0)
      p.dodgeTimer = DODGE_DUR
      p.dodgeVel = v(dir.x * 460, dir.y * 460)
      p.dodgeCd = DODGE_CD
      p.iframeTimer = IFRAME_DUR
      p.webTrapPlaced = false
    }
  }, [])

  const triggerAbility = useCallback((idx: number) => {
    if (gsRef.current?.phase === 'playing') pendingAbilityRef.current = idx
  }, [])

  const cardStyle = (active: boolean, color: string): React.CSSProperties => ({
    background: active ? `${color}22` : 'rgba(20,15,30,0.8)',
    border: `2px solid ${active ? color : 'rgba(80,60,40,0.4)'}`,
    borderRadius: 12,
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1,
  })

  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'rgba(5,5,14,0.97)', borderRadius: 8,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '24px 32px', gap: 16, overflowY: 'auto',
  }

  const h1Style: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace', fontSize: 20, color: '#C89B3C',
    textShadow: '0 0 28px rgba(200,155,60,0.5)', margin: 0, textAlign: 'center',
  }

  return (
    <div className="space-y-4">
      <div style={{ position: 'relative', width: '100%', maxWidth: 1100, margin: '0 auto' }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{
            display: 'block', width: '100%', height: 'auto',
            border: '2px solid var(--border)', borderRadius: 8,
            background: '#0d0d14', cursor: 'crosshair',
            touchAction: 'none',
          }}
        />

        {/* ── MENU ── */}
        {screen === 'menu' && (
          <div style={overlayStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>⚔️</div>
              <h1 style={h1Style}>BOSS HUNTER</h1>
              <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 13, margin: '6px 0 0', textAlign: 'center' }}>
                Hunt three legendary bosses. Choose your class.
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: 700 }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 8, marginBottom: 12, letterSpacing: 1, textAlign: 'center' }}>
                SELECT CLASS
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {CLASS_DEFS.map(c => (
                  <div key={c.id} style={cardStyle(selectedClass === c.id, c.color)} onClick={() => setSelectedClass(c.id)}>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', color: c.color, fontSize: 10, marginBottom: 6 }}>{c.label}</div>
                    <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 11, margin: '0 0 10px' }}>{c.desc}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {c.abilities.map(ab => (
                        <div key={ab.key} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '4px 6px' }}>
                          <span style={{ fontFamily: '"Press Start 2P", monospace', color: c.color, fontSize: 7 }}>{ab.key}: </span>
                          <span className="body-text" style={{ color: 'var(--text-3)', fontSize: 9 }}>{ab.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: 'HP', val: c.hp, color: '#27AE60' },
                        { label: 'DMG', val: c.dmg, color: '#E74C3C' },
                        { label: 'RNG', val: c.range, color: '#3498DB' },
                      ].map(stat => (
                        <span key={stat.label} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: stat.color }}>
                          {stat.label}: {stat.val}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 700, background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.2)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 7, marginBottom: 8 }}>CONTROLS</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  ['LEFT CLICK', 'Move to position'],
                  ['RIGHT CLICK', 'Move (alternate)'],
                  ['QWER', 'Class abilities'],
                  ['SPACE', 'Dodge roll (iframes)'],
                  ['AUTO', 'Attack when in range'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 6, background: 'rgba(200,155,60,0.15)', border: '1px solid rgba(200,155,60,0.4)', padding: '3px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{key}</span>
                    <span className="body-text" style={{ color: 'var(--text-2)', fontSize: 10 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setScreen('hunt_select')}
              className="osrs-btn"
              style={{ padding: '12px 52px', fontSize: 11 }}
            >
              ENTER THE HUNT
            </button>
            <div style={{ fontFamily: '"Press Start 2P", monospace', color: 'rgba(200,155,60,0.45)', fontSize: 6, textAlign: 'center' }}>
              Defeat any boss → +25 Fun XP
            </div>
          </div>
        )}

        {/* ── HUNT SELECT ── */}
        {screen === 'hunt_select' && (
          <div style={overlayStyle}>
            <h1 style={{ ...h1Style, fontSize: 14 }}>SELECT YOUR QUARRY</h1>
            {collectedGear.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontFamily: '"Press Start 2P", monospace', color: '#A09880', fontSize: 7 }}>GEAR:</span>
                {collectedGear.map(g => (
                  <span key={g} style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 7, background: 'rgba(200,155,60,0.12)', border: '1px solid rgba(200,155,60,0.3)', padding: '3px 7px', borderRadius: 12 }}>
                    {GEAR_DEFS[g].icon} {GEAR_DEFS[g].name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 800 }}>
              {BOSS_DEFS.map((boss, idx) => {
                const locked = idx > 0 && !beatenBosses[idx - 1]
                const beaten = beatenBosses[idx]
                return (
                  <div
                    key={boss.id}
                    onClick={() => !locked && startFight(boss.id as BossId)}
                    style={{
                      ...cardStyle(!locked && !beaten, boss.color),
                      opacity: locked ? 0.4 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      flex: 1,
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 6, filter: locked ? 'grayscale(1)' : 'none' }}>
                      {boss.arenaType === 'spider' ? '🕷️' : boss.arenaType === 'drake' ? '🐉' : '🦅'}
                    </div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', color: locked ? '#504030' : boss.color, fontSize: 9, marginBottom: 4 }}>
                      {boss.name}
                    </div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, marginBottom: 6,
                      background: `${boss.color}22`, border: `1px solid ${boss.color}55`,
                      borderRadius: 12, padding: '2px 8px', display: 'inline-block', color: boss.color }}>
                      {boss.element.toUpperCase()}
                    </div>
                    <p className="body-text" style={{ color: 'var(--text-3)', fontSize: 9, margin: '0 0 8px', lineHeight: 1.5 }}>
                      {locked ? '???' : boss.lore}
                    </p>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#A09880', fontSize: 6, marginBottom: 2 }}>
                      HP: {boss.hp.toLocaleString()}  ·  ENRAGES @ {Math.round(boss.enrageAt * 100)}%
                    </div>
                    {locked && (
                      <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#504030', fontSize: 7, marginTop: 6 }}>🔒 DEFEAT PREVIOUS BOSS</div>
                    )}
                    {beaten && (
                      <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#27AE60', fontSize: 7, marginTop: 6 }}>✓ DEFEATED — REMATCH?</div>
                    )}
                    {!locked && !beaten && (
                      <div style={{ fontFamily: '"Press Start 2P", monospace', color: boss.color, fontSize: 7, marginTop: 6,
                        background: `${boss.color}18`, padding: '4px 10px', borderRadius: 4 }}>▶ CHALLENGE</div>
                    )}
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(200,155,60,0.15)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#504030', fontSize: 5, marginBottom: 2 }}>POSSIBLE REWARDS:</div>
                      {boss.rewards.map(r => (
                        <span key={r} style={{ fontFamily: '"Press Start 2P", monospace', color: beaten ? '#C89B3C' : '#504030', fontSize: 6 }}>
                          {GEAR_DEFS[r].icon} {GEAR_DEFS[r].name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={() => setScreen('menu')} style={{ background: 'none', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 6, color: 'var(--text-3)', fontFamily: '"Press Start 2P", monospace', fontSize: 8, padding: '8px 20px', cursor: 'pointer' }}>
              ← CLASS SELECT
            </button>
          </div>
        )}

        {/* ── VICTORY ── */}
        {screen === 'victory' && (
          <>
          <style>{`@keyframes bossVictoryFade{from{opacity:0;transform:scale(0.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          <div style={{ ...overlayStyle, animation: 'bossVictoryFade 1.6s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, lineHeight: 1, filter: 'drop-shadow(0 0 16px #F1C40F)' }}>⚔️</div>
              <h1 style={{ ...h1Style, color: '#F1C40F', fontSize: 18, margin: '8px 0 4px' }}>BOSS SLAIN!</h1>
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: BOSS_DEFS[currentBossId].color, fontSize: 8 }}>
                ☠ {BOSS_DEFS[currentBossId].name.toUpperCase()} DEFEATED
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {xpMsg && (
                <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#27AE60', fontSize: 9,
                  background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.4)',
                  borderRadius: 6, padding: '6px 14px' }}>{xpMsg}</div>
              )}
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 10 }}>
                Score: {score.toLocaleString()} pts
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 720 }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 8, marginBottom: 14, textAlign: 'center', letterSpacing: 2 }}>
                ✦ CHOOSE YOUR REWARD ✦
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                {rewardChoices.map(gId => {
                  const gd = GEAR_DEFS[gId]
                  const alreadyHave = collectedGear.includes(gId)
                  return (
                    <div
                      key={gId}
                      onClick={() => !alreadyHave && pickGear(gId)}
                      style={{
                        ...cardStyle(!alreadyHave, '#C89B3C'),
                        textAlign: 'center', flex: 1,
                        opacity: alreadyHave ? 0.45 : 1,
                        cursor: alreadyHave ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        boxShadow: alreadyHave ? 'none' : '0 0 24px rgba(200,155,60,0.2)',
                        padding: '20px 16px',
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8, filter: alreadyHave ? 'grayscale(1)' : 'none' }}>{gd.icon}</div>
                      <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 8, marginBottom: 10, lineHeight: 1.5 }}>{gd.name}</div>
                      <div style={{ width: '100%', height: 1, background: 'rgba(200,155,60,0.25)', marginBottom: 10 }} />
                      <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 11, margin: 0, lineHeight: 1.6 }}>{gd.desc}</p>
                      {alreadyHave ? (
                        <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#504030', fontSize: 7, marginTop: 10 }}>ALREADY OWNED</div>
                      ) : (
                        <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 7, marginTop: 12,
                          background: 'rgba(200,155,60,0.15)', padding: '5px 8px', borderRadius: 4 }}>
                          TAP TO EQUIP
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </>
        )}

        {/* ── DEFEAT ── */}
        {screen === 'defeat' && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 40 }}>💀</div>
            <h1 style={{ ...h1Style, color: '#E74C3C' }}>DEFEATED</h1>
            <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 13, margin: 0, textAlign: 'center' }}>
              The {BOSS_DEFS[currentBossId].name} has bested you.
            </p>
            <div style={{ fontFamily: '"Press Start 2P", monospace', color: '#C89B3C', fontSize: 11 }}>
              Score: {score.toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => startFight(currentBossId)}
                className="osrs-btn"
                style={{ padding: '11px 32px' }}
              >
                TRY AGAIN
              </button>
              <button
                onClick={() => setScreen('hunt_select')}
                style={{ background: 'none', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 6, color: 'var(--text-2)', fontFamily: '"Press Start 2P", monospace', fontSize: 8, padding: '11px 20px', cursor: 'pointer' }}
              >
                HUNT SELECT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE CONTROLS ── */}
      {screen === 'playing' && (() => {
        const clsDef = CLASS_DEFS.find(c => c.id === selectedClass)!
        const btnBase: React.CSSProperties = {
          flex: 1, borderRadius: 8, cursor: 'pointer',
          fontFamily: '"Press Start 2P", monospace', fontSize: 7,
          padding: '10px 4px', lineHeight: 1.5,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }
        return (
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {clsDef.abilities.map((ab, i) => (
                <button
                  key={ab.key}
                  onPointerDown={e => { e.preventDefault(); triggerAbility(i) }}
                  style={{
                    ...btnBase,
                    background: `${clsDef.color}22`,
                    border: `2px solid ${clsDef.color}66`,
                    color: clsDef.color,
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 3 }}>{['Q','W','E','R'][i]}</div>
                  <div style={{ fontSize: 5, color: 'var(--text-2)', fontFamily: 'Inter, sans-serif', lineHeight: 1.2 }}>{ab.name}</div>
                </button>
              ))}
              <button
                onPointerDown={e => { e.preventDefault(); triggerDodge() }}
                style={{
                  ...btnBase,
                  flex: 'none', minWidth: 56,
                  background: 'rgba(60,60,80,0.4)',
                  border: '2px solid rgba(140,130,160,0.35)',
                  color: '#b0a8c0',
                }}
              >
                <div style={{ fontSize: 14, marginBottom: 3 }}>💨</div>
                <div>DODGE</div>
              </button>
            </div>
            <p className="body-text" style={{ color: 'var(--text-3)', fontSize: 9, textAlign: 'center', margin: '5px 0 0' }}>
              Tap canvas to move · Buttons trigger abilities &amp; dodge
            </p>
          </div>
        )
      })()}

      {(screen === 'menu' || screen === 'hunt_select' || screen === 'defeat') && (
        <GameLeaderboard game="boss-hunter" scoreLabel="pts" refreshKey={refreshKey} />
      )}

      <Link href="/skills/fun" className="text-[8px] hover:underline" style={{ color: 'var(--text-3)' }}>
        ← Back to Fun
      </Link>
    </div>
  )
}
