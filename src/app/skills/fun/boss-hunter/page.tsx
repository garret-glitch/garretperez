'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

/* ═══ CONSTANTS ═══ */
const CW = 960, CH = 600, WW = 2400, WH = 1500
const IFRAME_DUR = 0.45, DODGE_DUR = 0.30, DODGE_CD = 1.4, CHAIN_HIT_RESET = 3.0

/* ═══ MATH ═══ */
interface V2 { x: number; y: number }
const v = (x: number, y: number): V2 => ({ x, y })
const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y)
const norm = (d: V2): V2 => { const m = Math.hypot(d.x, d.y) || 1; return v(d.x / m, d.y / m) }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const rndI = (a: number, b: number) => Math.floor(rnd(a, b + 0.99))

/* ═══ TYPES ═══ */
type WeaponId = 'sword' | 'bow' | 'staff'
type BossId = 0 | 1 | 2
type GearId = 'spider_fang' | 'venom_bow' | 'web_amulet' | 'drake_sword' | 'fire_staff' | 'ember_armor' | 'thunder_blade' | 'storm_bow' | 'feather_boots'

interface WeaponDef {
  id: WeaponId; name: string; icon: string; color: string
  element: 'lightning' | 'fire' | 'arcane'
  dmg: number; range: number; atkCd: number
  desc: string; abilities: AbilityDef[]
}
interface AbilityDef { key: string; name: string; desc: string; cd: number }
interface BossDef {
  id: BossId; name: string; color: string; icon: string
  element: 'poison' | 'fire' | 'lightning'; lore: string
  hp: number; size: number; enrageAt: number
  rewards: GearId[]; arenaType: 'spider' | 'drake' | 'griffin'
}
interface GearDef { id: GearId; name: string; icon: string; desc: string }
interface Projectile {
  id: number; pos: V2; vel: V2; dmg: number; radius: number
  fromBoss: boolean; life: number; color: string
  aoe?: number; poison?: boolean; isWeb?: boolean
  isPowerShot?: boolean; isFireball?: boolean; isLightning?: boolean
  trail?: V2[]
}
interface BossAttack { type: string; telegraphTime: number; elapsed: number; active: boolean; data: AttackData }
interface AttackData {
  targetPos?: V2; angle?: number; coneAngle?: number; coneRange?: number; radius?: number
  projSpeed?: number; dmg?: number; count?: number; duration?: number; elapsed?: number; strikeIndex?: number
}
interface DamageNumber { id: number; pos: V2; val: number; life: number; isPlayer: boolean }
interface Particle { id: number; pos: V2; vel: V2; life: number; maxLife: number; color: string; size: number }
interface SlowTrap { id: number; pos: V2; life: number; fromPlayer: boolean }
interface HazardZone { id: number; pos: V2; radius: number; type: 'poison' | 'fire' | 'lightning' | 'web'; dps: number; life: number; maxLife: number }
interface AttackFlash { angle: number; timer: number; maxTimer: number; type: 'slash' | 'slam' | 'shot' | 'magic' | 'shadow' | 'power_shot'; color: string }
interface SkyArrow { id: number; targetPos: V2; warnTimer: number; hit: boolean; dmg: number }
interface EnvObject { type: 'rock' | 'bone' | 'skull' | 'web' | 'ruin' | 'crystal' | 'nest' | 'claw'; pos: V2; size: number; angle: number; variant: number }
interface GS {
  phase: 'playing' | 'dying' | 'victory' | 'defeat'
  player: PlayerState; boss: BossState
  projectiles: Projectile[]; bossAttack: BossAttack | null; nextAttackTimer: number
  damageNums: DamageNumber[]; particles: Particle[]; slowTraps: SlowTrap[]; zones: HazardZone[]
  attackFlash: AttackFlash | null; screenShake: number; bossDeathAnim: number
  lavaParticles: Particle[]; skyArrows: SkyArrow[]; envObjects: EnvObject[]
  nextProjId: number; nextDmgId: number; nextPartId: number; nextTrapId: number; nextZoneId: number
  gtime: number; bossEnraged: boolean; poisonTimer: number; playerDmgFlash: number
  chainHits: number; chainResetTimer: number
  rageActive: boolean; rageTimer: number
  bullChargeDash: { active: boolean; vel: V2; timer: number }
  whirlwindActive: boolean; whirlwindTimer: number
  camX: number; camY: number
  webProcAnim: { timer: number; pos: V2 } | null
  bossFlightAngle: number; bossFlightSpeed: number
  bossFlightRadius: number; bossFlightCenter: V2
  bossFleeTimer: number
  tailWhipCd: number
  snakeTrail: Array<{x: number; y: number}>
}
interface PlayerState {
  pos: V2; vel: V2; targetPos: V2 | null
  hp: number; maxHp: number; atkTimer: number
  iframeTimer: number; dodgeTimer: number; dodgeCd: number; dodgeVel: V2; dodgeTrail: V2[]
  hitFlash: number; abilityCds: number[]; slowTimer: number; knockbackVel: V2
  featherCharges: number; featherRecharge: number[]
  webTrapPlaced: boolean; dodgeChargeMode: boolean; facing: number
  gearHitCount: number; webProcCd: number
  shadowDashTrail: Array<{ pos: V2; a: number }>
}
interface BossState {
  pos: V2; hp: number; maxHp: number; stunTimer: number; slowTimer: number
  reflectDmg: number; angle: number; legPhase: number; spinePulse: number; lightningPhase: number; hitFlash: number
}

/* ═══ WEAPON DEFINITIONS ═══ */
const WEAPON_DEFS: WeaponDef[] = [
  {
    id: 'sword', name: 'Starter Sword', icon: '⚔️', color: '#E74C3C', element: 'fire',
    dmg: 55, range: 100, atkCd: 0.72,
    desc: 'Aggressive melee fighter. Close the distance and unleash devastating slams, rages, and charges.',
    abilities: [
      { key: 'Q', name: 'Ground Slam', desc: 'Shockwave — 130 dmg AOE, 130px radius', cd: 6 },
      { key: 'W', name: 'Rage', desc: '+60% damage for 8s', cd: 18 },
      { key: 'E', name: 'Bull Charge', desc: 'Rush toward cursor — 150 dmg on boss impact', cd: 9 },
      { key: 'R', name: 'Whirlwind', desc: 'Spin 3s — 65 dmg/s within 100px', cd: 25 },
    ],
  },
  {
    id: 'bow', name: 'Starter Bow', icon: '🏹', color: '#2ECC71', element: 'lightning',
    dmg: 28, range: 480, atkCd: 0.44,
    desc: 'Precision long-range archer. Rain death from afar with power shots, traps, and sky arrows.',
    abilities: [
      { key: 'Q', name: 'Power Shot', desc: 'Massive gold arrow — 3× dmg, stuns boss 0.6s', cd: 5 },
      { key: 'W', name: 'Trap', desc: 'Snap trap at cursor — 110 dmg + 3s slow on trigger', cd: 10 },
      { key: 'E', name: 'Shadow Dash', desc: 'Dash in move direction with full invulnerability', cd: 7 },
      { key: 'R', name: 'Rain of Arrows', desc: '3 massive arrows fall from the sky at cursor', cd: 20 },
    ],
  },
  {
    id: 'staff', name: 'Starter Staff', icon: '🔮', color: '#9B59B6', element: 'arcane',
    dmg: 38, range: 220, atkCd: 0.82,
    desc: 'Arcane spellcaster. Launch homing bolts from mid-range. Blink, shield, and call meteors.',
    abilities: [
      { key: 'Q', name: 'Arcane Bolt', desc: 'Fast projectile — 2.5× dmg toward cursor', cd: 5 },
      { key: 'W', name: 'Mana Shield', desc: '1.5s full invulnerability bubble', cd: 14 },
      { key: 'E', name: 'Blink', desc: 'Instant teleport up to 350px toward cursor', cd: 7 },
      { key: 'R', name: 'Meteor', desc: 'Giant meteor — 200 dmg in 100px AOE at cursor', cd: 22 },
    ],
  },
]

/* ═══ BOSS DEFINITIONS ═══ */
const BOSS_DEFS: BossDef[] = [
  {
    id: 0, name: 'Spider Queen', color: '#8E44AD', icon: '🕷️', element: 'poison',
    lore: 'Ancient arachnid empress of the deep caverns. Her venom melts armor. Her webs trap the bravest hunters.',
    hp: 4200, size: 90, enrageAt: 0.40,
    rewards: ['spider_fang', 'venom_bow', 'web_amulet'], arenaType: 'spider',
  },
  {
    id: 1, name: 'Lava Drake', color: '#E67E22', icon: '🐉', element: 'fire',
    lore: 'Born in the molten core. Ancient and enormous. Her fire melts stone. Her claws split mountains.',
    hp: 6500, size: 115, enrageAt: 0.35,
    rewards: ['drake_sword', 'fire_staff', 'ember_armor'], arenaType: 'drake',
  },
  {
    id: 2, name: 'Storm Griffin', color: '#F1C40F', icon: '🦅', element: 'lightning',
    lore: 'Skyborn predator. Commands the storms. Every wingbeat calls lightning from dark thunderheads.',
    hp: 9500, size: 100, enrageAt: 0.30,
    rewards: ['thunder_blade', 'storm_bow', 'feather_boots'], arenaType: 'griffin',
  },
]

/* ═══ GEAR DEFINITIONS ═══ */
const GEAR_DEFS: Record<GearId, GearDef> = {
  spider_fang:   { id: 'spider_fang',   name: 'Spider Fang Daggers', icon: '🗡️', desc: 'Dual daggers — attack 40% faster, unique dagger animations' },
  venom_bow:     { id: 'venom_bow',     name: 'Venom Bow',           icon: '🏹', desc: 'Purple poison bow — arrows inflict 15 dmg/s for 5s' },
  web_amulet:    { id: 'web_amulet',    name: 'Web Amulet',          icon: '🕸️', desc: '15% chance per hit to web-stun the boss for 2s' },
  drake_sword:   { id: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️', desc: '+35% damage. 15% chance to stun boss on hit' },
  fire_staff:    { id: 'fire_staff',    name: 'Fire Staff',          icon: '🔥', desc: 'Q fires a Fireball — 100px AOE explosion, 80 dmg' },
  ember_armor:   { id: 'ember_armor',   name: 'Ember Armor',         icon: '🛡️', desc: 'Reduces all incoming damage by 25%' },
  thunder_blade: { id: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡', desc: 'Every 3rd hit unleashes a lightning strike (+80 bonus dmg)' },
  storm_bow:     { id: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️', desc: 'Arrows are lightning bolts — AOE on impact (40px, 30 dmg)' },
  feather_boots: { id: 'feather_boots', name: 'Feather Boots',       icon: '🪶', desc: '+40% movement speed. 3 dash charges that recharge over time' },
}
const GEAR_CATEGORY: Record<GearId, 'attack' | 'defense'> = {
  spider_fang: 'attack', venom_bow: 'attack', web_amulet: 'defense',
  drake_sword: 'attack', fire_staff: 'attack', ember_armor: 'defense',
  thunder_blade: 'attack', storm_bow: 'attack', feather_boots: 'defense',
}
// PIECE_2_START

/* ═══ INITIAL STATE ═══ */
function generateEnvObjects(bossId: BossId): EnvObject[] {
  const objs: EnvObject[] = []
  const typesByBoss: Array<EnvObject['type'][]> = [
    ['bone','skull','web','rock','nest','claw'],
    ['rock','crystal','bone','ruin'],
    ['rock','ruin','bone','claw'],
  ]
  const types = typesByBoss[bossId]
  for (let i = 0; i < 50; i++) {
    const seed = i * 137 + bossId * 1013
    const angle = (seed % 628) / 100
    const radius = 320 + (seed % 650)
    const cx = WW / 2 + Math.cos(angle) * radius + (seed % 200 - 100)
    const cy = WH / 2 + Math.sin(angle) * radius + ((seed * 7) % 200 - 100)
    const pos = v(clamp(cx, 120, WW - 120), clamp(cy, 120, WH - 120))
    if (dist(pos, v(WW / 2, 350)) < 220) continue
    if (dist(pos, v(WW / 2, WH - 250)) < 180) continue
    objs.push({ type: types[i % types.length], pos, size: 18 + (seed % 38), angle: (seed % 314) / 100, variant: i % 3 })
  }
  return objs
}

function mkState(wpn: WeaponDef, boss: BossDef, gear: GearId[]): GS {
  void wpn
  const featherMode = gear.includes('feather_boots')
  const sx = WW / 2, sy = WH - 250
  return {
    phase: 'playing',
    player: {
      pos: v(sx, sy), vel: v(0, 0), targetPos: null,
      hp: 160, maxHp: 160, atkTimer: 0,
      iframeTimer: 0, dodgeTimer: 0, dodgeCd: 0, dodgeVel: v(0, 0), dodgeTrail: [],
      hitFlash: 0, abilityCds: [0, 0, 0, 0], slowTimer: 0, knockbackVel: v(0, 0),
      featherCharges: featherMode ? 3 : 1, featherRecharge: featherMode ? [0, 0, 0] : [0],
      webTrapPlaced: false, dodgeChargeMode: featherMode, facing: -Math.PI / 2,
      gearHitCount: 0, webProcCd: 0, shadowDashTrail: [],
    },
    boss: {
      pos: v(WW / 2, 350), hp: boss.hp, maxHp: boss.hp,
      stunTimer: 0, slowTimer: 0, reflectDmg: 0,
      angle: Math.PI / 2, legPhase: 0, spinePulse: 0, lightningPhase: 0, hitFlash: 0,
    },
    projectiles: [], bossAttack: null, nextAttackTimer: 3.5,
    damageNums: [], particles: [], slowTraps: [], zones: [],
    attackFlash: null, screenShake: 0, bossDeathAnim: 0,
    lavaParticles: [], skyArrows: [], envObjects: generateEnvObjects(boss.id),
    nextProjId: 0, nextDmgId: 0, nextPartId: 0, nextTrapId: 0, nextZoneId: 0,
    gtime: 0, bossEnraged: false, poisonTimer: 0, playerDmgFlash: 0,
    chainHits: 0, chainResetTimer: 0,
    rageActive: false, rageTimer: 0,
    bullChargeDash: { active: false, vel: v(0, 0), timer: 0 },
    whirlwindActive: false, whirlwindTimer: 0,
    camX: clamp(sx - CW / 2, 0, WW - CW), camY: clamp(sy - CH / 2, 0, WH - CH),
    webProcAnim: null,
    bossFlightAngle: boss.id === 1 ? Math.PI * 0.75 : boss.id === 2 ? Math.PI * 0.25 : 0,
    bossFlightSpeed: boss.id === 2 ? 0.70 : 0,
    bossFlightRadius: boss.id === 2 ? 240 : 0,
    bossFlightCenter: v(WW / 2, WH / 2 - 80),
    bossFleeTimer: 0,
    tailWhipCd: 0,
    snakeTrail: [],
  }
}

/* ═══ HELPERS ═══ */
let _pid = 0
function spawnParticles(g: GS, pos: V2, count: number, color: string, speed = 120, life = 0.5) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = rnd(speed * 0.4, speed)
    g.particles.push({ id: ++_pid, pos: { ...pos }, vel: v(Math.cos(a) * spd, Math.sin(a) * spd), life, maxLife: life, color, size: rnd(2, 5.5) })
  }
  g.nextPartId = _pid
}

function dealDmgToPlayer(g: GS, dmg: number, wpn: WeaponDef, gear: GearId[], knockDir?: V2) {
  const p = g.player
  if (p.iframeTimer > 0) return
  let fd = dmg
  if (g.rageActive) fd = Math.round(fd * 1.2)
  const isMelee = wpn.id === 'sword' || gear.some(g2 => ['spider_fang','drake_sword','thunder_blade'].includes(g2))
  if (isMelee) fd = Math.round(fd * 0.80)
  if (gear.includes('ember_armor')) fd = Math.round(fd * 0.75)
  p.hp = Math.max(0, p.hp - fd)
  p.hitFlash = 0.40; p.iframeTimer = 0.5
  g.playerDmgFlash = 0.70
  if (knockDir && wpn.id !== 'sword') p.knockbackVel = v(knockDir.x * 160, knockDir.y * 160)
  spawnParticles(g, p.pos, 8, '#FF4444', 110)
  g.screenShake = Math.max(g.screenShake, 0.32)
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-20, 20), y: p.pos.y - 20 }, val: Math.round(fd), life: 1.2, isPlayer: true })
  if (p.hp <= 0) g.phase = 'defeat'
}

function spawnZone(g: GS, pos: V2, type: HazardZone['type'], radius: number, dps: number, life: number) {
  g.zones.push({ id: ++g.nextZoneId, pos: { ...pos }, radius, type, dps, life, maxLife: life })
}

function dealDmgToBoss(g: GS, baseDmg: number, gear: GearId[]) {
  const b = g.boss, p = g.player
  let dmg = baseDmg
  if (gear.includes('drake_sword')) {
    dmg = Math.round(dmg * 1.35)
    if (Math.random() < 0.15) b.stunTimer = Math.max(b.stunTimer, 1.5)
  }
  if (g.rageActive) dmg = Math.round(dmg * 1.6)
  if (gear.includes('thunder_blade')) {
    p.gearHitCount++
    g.chainResetTimer = CHAIN_HIT_RESET
    if (p.gearHitCount % 3 === 0) {
      dmg += 80
      spawnParticles(g, b.pos, 14, '#F1C40F', 260)
      g.screenShake = Math.max(g.screenShake, 0.45)
    }
  }
  if (gear.includes('web_amulet') && p.webProcCd <= 0 && Math.random() < 0.15) {
    b.stunTimer = Math.max(b.stunTimer, 2.0)
    p.webProcCd = 3.0
    g.webProcAnim = { timer: 0.9, pos: { ...b.pos } }
    spawnParticles(g, b.pos, 18, '#8E44AD', 160)
  }
  if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 5.0
  b.hp = Math.max(0, b.hp - dmg)
  b.hitFlash = 0.12
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: b.pos.x + rnd(-30, 30), y: b.pos.y - 50 }, val: Math.round(dmg), life: 1.0, isPlayer: false })
  spawnParticles(g, b.pos, 4, '#FFFFFF', 80)
}

/* ═══ BOSS AI ═══ */
function selectBossAttack(bossId: BossId, enraged: boolean, d2p: number): string {
  if (bossId === 0) {
    const pool = d2p < 150 ? ['leg_sweep', 'venom_spit', 'web_spray', 'toxic_cloud'] : ['venom_spit', 'toxic_cloud', 'web_spray', 'web_shot', 'leg_sweep']
    if (enraged) pool.push('spider_leap', 'venom_burst', 'web_spray')
    return pool[rndI(0, pool.length - 1)]
  }
  if (bossId === 1) {
    const pool = d2p < 150 ? ['stomp', 'tail_swipe', 'fire_breath', 'fire_line'] : ['fire_breath', 'flame_wave', 'fire_line', 'stomp', 'tail_swipe', 'lava_puddle']
    if (enraged) pool.push('ember_barrage', 'fire_line', 'lava_puddle')
    return pool[rndI(0, pool.length - 1)]
  }
  const pool = d2p < 160 ? ['talon_dive', 'wind_buffet', 'lightning_strike', 'lightning_barrage'] : ['lightning_strike', 'chain_lightning', 'lightning_barrage', 'talon_dive', 'wind_buffet', 'static_field']
  if (enraged) pool.push('thunderstorm', 'lightning_barrage', 'chain_lightning')
  return pool[rndI(0, pool.length - 1)]
}

function startBossAttack(g: GS, bossId: BossId, type: string) {
  const p = g.player, b = g.boss
  const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
  const telegraphs: Record<string, number> = {
    venom_spit: 0.9, web_shot: 0.8, web_spray: 0.85, leg_sweep: 1.0, spider_leap: 1.1, toxic_cloud: 0.75, venom_burst: 1.2,
    fire_breath: 1.2, stomp: 0.85, tail_swipe: 0.8, ember_barrage: 0.7, flame_wave: 1.0, lava_puddle: 0.75, fire_line: 1.5,
    lightning_strike: 0.95, talon_dive: 0.9, wind_buffet: 0.8, thunderstorm: 0.75, static_field: 0.7, chain_lightning: 0.85, lightning_barrage: 0.5,
  }
  const data: AttackData = { targetPos: { ...p.pos }, angle, dmg: 0 }
  if (type === 'venom_spit') { data.dmg = 15; data.count = 3; data.projSpeed = 260 }
  else if (type === 'web_shot') { data.dmg = 12; data.projSpeed = 160 }
  else if (type === 'leg_sweep') { data.dmg = 22; data.coneAngle = Math.PI; data.coneRange = 160; data.angle = angle }
  else if (type === 'spider_leap') { data.dmg = 36; data.radius = 130 }
  else if (type === 'toxic_cloud') { data.dmg = 0; data.count = 3 }
  else if (type === 'venom_burst') { data.dmg = 38; data.radius = 180 }
  else if (type === 'fire_breath') { data.dmg = 18; data.coneAngle = 44 * Math.PI / 180; data.coneRange = 260; data.angle = angle; data.duration = 2.2; data.elapsed = 0 }
  else if (type === 'stomp') { data.dmg = 28; data.radius = 0; data.duration = 1.2 }
  else if (type === 'tail_swipe') { data.dmg = 28; data.coneAngle = 270 * Math.PI / 180; data.coneRange = 170; data.angle = angle + Math.PI }
  else if (type === 'ember_barrage') { data.dmg = 14; data.count = 6; data.projSpeed = 290 }
  else if (type === 'flame_wave') { data.dmg = 20; data.coneAngle = 55 * Math.PI / 180; data.coneRange = 320; data.angle = angle; data.duration = 1.6; data.elapsed = 0 }
  else if (type === 'lava_puddle') { data.dmg = 0; data.count = 3 }
  else if (type === 'lightning_strike') { data.dmg = 32; data.radius = 75 }
  else if (type === 'talon_dive') { data.dmg = 35; data.angle = angle; data.projSpeed = 440 }
  else if (type === 'wind_buffet') { data.dmg = 16; data.coneAngle = 80 * Math.PI / 180; data.coneRange = 230; data.angle = angle }
  else if (type === 'thunderstorm') { data.dmg = 25; data.count = 8; data.strikeIndex = 0 }
  else if (type === 'static_field') { data.dmg = 0; data.count = 2 }
  else if (type === 'chain_lightning') { data.dmg = 22; data.count = 6; data.strikeIndex = 0 }
  else if (type === 'web_spray') { data.dmg = 12; data.count = 7; data.projSpeed = 195; data.angle = angle }
  else if (type === 'fire_line') { data.dmg = 22; data.angle = b.angle + Math.PI / 2 }
  else if (type === 'lightning_barrage') { data.dmg = 30; data.count = 8; data.strikeIndex = 0; data.elapsed = 0 }
  g.bossAttack = { type, telegraphTime: telegraphs[type] ?? 1.0, elapsed: 0, active: false, data }
}

function resolveBossAttack(g: GS, bossId: BossId, wpn: WeaponDef, gear: GearId[]) {
  const atk = g.bossAttack!, p = g.player, b = g.boss
  const type = atk.type, d = atk.data
  const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))

  if (type === 'venom_spit' || type === 'ember_barrage') {
    const count = d.count ?? 3
    const baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.28
      const a = baseAngle + spread
      const color = type === 'venom_spit' ? '#8E44AD' : '#E67E22'
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 250), Math.sin(a) * (d.projSpeed ?? 250)), dmg: d.dmg ?? 22, radius: 9, fromBoss: true, life: 5.0, color })
    }
  } else if (type === 'web_shot') {
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(toPlayer.x * (d.projSpeed ?? 160), toPlayer.y * (d.projSpeed ?? 160)), dmg: d.dmg ?? 16, radius: 11, fromBoss: true, life: 6.0, color: '#8E44AD' })
  } else if (type === 'leg_sweep' || type === 'tail_swipe' || type === 'wind_buffet') {
    const angle = d.angle ?? 0, halfCone = (d.coneAngle ?? Math.PI) / 2, range = d.coneRange ?? 150
    if (dist(p.pos, b.pos) <= range) {
      const pAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let diff = Math.abs(pAngle - angle); while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2)
      if (diff <= halfCone) {
        dealDmgToPlayer(g, d.dmg ?? 22, wpn, gear, type === 'wind_buffet' ? toPlayer : undefined)
        if (type === 'wind_buffet' && wpn.id !== 'sword') p.knockbackVel = v(toPlayer.x * 240, toPlayer.y * 240)
      }
    }
  } else if (type === 'toxic_cloud') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = clamp(b.pos.x + rnd(-300, 300), 100, WW - 100), ty = clamp(b.pos.y + rnd(-250, 250), 100, WH - 100)
      spawnZone(g, v(tx, ty), 'poison', 65, 12, 6.0)
      spawnParticles(g, v(tx, ty), 12, '#8E44AD', 90, 0.9)
    }
  } else if (type === 'venom_burst') {
    const r = d.radius ?? 180
    if (dist(p.pos, b.pos) <= r) { dealDmgToPlayer(g, d.dmg ?? 38, wpn, gear, toPlayer); p.slowTimer = 2.5 }
    spawnParticles(g, b.pos, 35, '#8E44AD', 300); g.screenShake = Math.max(g.screenShake, 0.8)
  } else if (type === 'lava_puddle') {
    for (let i = 0; i < (d.count ?? 3); i++) {
      const tx = clamp(p.pos.x + rnd(-200, 200), 100, WW - 100), ty = clamp(p.pos.y + rnd(-200, 200), 100, WH - 100)
      spawnZone(g, v(tx, ty), 'fire', 75, 16, 5.5)
      spawnParticles(g, v(tx, ty), 16, '#FF4500', 110, 0.65)
    }
    g.screenShake = Math.max(g.screenShake, 0.35)
  } else if (type === 'static_field') {
    for (let i = 0; i < (d.count ?? 2); i++) {
      const off = v(rnd(-90, 90), rnd(-90, 90))
      spawnZone(g, v(p.pos.x + off.x, p.pos.y + off.y), 'lightning', 60, 18, 4.0)
      spawnParticles(g, v(p.pos.x + off.x, p.pos.y + off.y), 14, '#F1C40F', 170)
    }
  } else if (type === 'spider_leap' || type === 'lightning_strike') {
    const target = d.targetPos!, r = d.radius ?? 120
    if (dist(p.pos, target) <= r) dealDmgToPlayer(g, d.dmg ?? 32, wpn, gear, norm(v(p.pos.x - target.x, p.pos.y - target.y)))
    spawnParticles(g, target, 24, bossId === 0 ? '#8E44AD' : '#F1C40F', 220)
    g.screenShake = Math.max(g.screenShake, 0.6)
    if (bossId === 0) b.pos = { x: clamp(target.x, 90, WW - 90), y: clamp(target.y, 90, WH - 90) }
  } else if (type === 'stomp') {
    if (dist(p.pos, b.pos) <= 155) dealDmgToPlayer(g, d.dmg ?? 28, wpn, gear, toPlayer)
    g.screenShake = Math.max(g.screenShake, 0.7); spawnParticles(g, b.pos, 28, '#E67E22', 260)
  } else if (type === 'talon_dive') {
    const target = { ...d.targetPos! }
    b.pos = { x: clamp(target.x, 90, WW - 90), y: clamp(target.y, 90, WH - 90) }
    if (dist(p.pos, b.pos) < 90) dealDmgToPlayer(g, d.dmg ?? 35, wpn, gear, toPlayer)
    spawnParticles(g, b.pos, 18, '#F1C40F', 220); g.screenShake = Math.max(g.screenShake, 0.45)
  } else if (type === 'web_spray') {
    const count = d.count ?? 7, baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * 0.38
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 195), Math.sin(a) * (d.projSpeed ?? 195)), dmg: d.dmg ?? 12, radius: 12, fromBoss: true, life: 5.5, color: '#8E44AD', isWeb: true })
    }
    spawnParticles(g, b.pos, 14, '#8E44AD', 160)
  } else if (type === 'fire_line') {
    const lineAngle = d.angle ?? 0, lineLen = 820
    const lineCount = 18
    for (let i = 0; i < lineCount; i++) {
      const t2 = (i / (lineCount - 1)) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(lineAngle) * lineLen * t2, 80, WW - 80)
      const zy = clamp(b.pos.y + Math.sin(lineAngle) * lineLen * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'fire', 52, d.dmg ?? 22, 3.5)
      if (i % 3 === 0) spawnParticles(g, v(zx, zy), 5, '#FF4500', 110, 0.55)
    }
    g.screenShake = Math.max(g.screenShake, 0.75)
  }
}

/* ═══ TICK ═══ */
function tick(g: GS, dt: number, wpn: WeaponDef, bossId: BossId, gear: GearId[], mousePos: V2, keys: Set<string>, abilityTarget: V2, pendingAbility: number | null) {
  void keys; void mousePos
  if (g.phase !== 'playing' && g.phase !== 'dying') return
  const p = g.player, b = g.boss, bossDef = BOSS_DEFS[bossId]

  if (g.phase === 'dying') {
    g.gtime += dt; g.bossDeathAnim -= dt; g.screenShake = Math.max(0, g.screenShake - dt * 1.5)
    const intensity = 1 - Math.max(0, g.bossDeathAnim / 3.0)
    if (Math.random() < dt * (20 + intensity * 50)) {
      const ox = rnd(-110, 110), oy = rnd(-110, 110)
      const colors = ['#F1C40F', '#FFFFFF', bossDef.color, '#FF4500']
      spawnParticles(g, v(b.pos.x + ox, b.pos.y + oy), rndI(10, 20), colors[rndI(0, colors.length - 1)], rnd(200, 500), rnd(0.4, 1.6))
    }
    if (Math.random() < dt * 5) g.screenShake = Math.max(g.screenShake, rnd(0.5, 1.2))
    g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; pt.vel.x *= Math.pow(0.15, dt); pt.vel.y *= Math.pow(0.15, dt); return pt.life > 0 })
    g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 28 * dt; return d2.life > 0 })
    if (g.bossDeathAnim <= 0) g.phase = 'victory'
    return
  }

  g.gtime += dt

  // Camera smooth follow
  const tcx = clamp(p.pos.x - CW / 2, 0, WW - CW), tcy = clamp(p.pos.y - CH / 2, 0, WH - CH)
  g.camX += (tcx - g.camX) * Math.min(1, dt * 8)
  g.camY += (tcy - g.camY) * Math.min(1, dt * 8)

  // Timers
  p.atkTimer = Math.max(0, p.atkTimer - dt); p.iframeTimer = Math.max(0, p.iframeTimer - dt)
  p.dodgeCd = Math.max(0, p.dodgeCd - dt); p.hitFlash = Math.max(0, p.hitFlash - dt)
  p.slowTimer = Math.max(0, p.slowTimer - dt); p.webProcCd = Math.max(0, p.webProcCd - dt)
  b.stunTimer = Math.max(0, b.stunTimer - dt); b.slowTimer = Math.max(0, b.slowTimer - dt)
  b.hitFlash = Math.max(0, b.hitFlash - dt)
  b.legPhase += dt * (b.stunTimer > 0 ? 0.5 : g.bossEnraged ? 3.8 : 2.4)
  b.spinePulse += dt * 2.2; b.lightningPhase += dt * 4.5
  g.screenShake = Math.max(0, g.screenShake - dt * 3); g.nextAttackTimer = Math.max(0, g.nextAttackTimer - dt)
  g.playerDmgFlash = Math.max(0, g.playerDmgFlash - dt * 2.8)
  if (g.rageTimer > 0) { g.rageTimer = Math.max(0, g.rageTimer - dt); if (g.rageTimer <= 0) g.rageActive = false }
  if (g.poisonTimer > 0) { g.poisonTimer = Math.max(0, g.poisonTimer - dt); b.hp = Math.max(0, b.hp - 15 * dt) }
  if (g.chainResetTimer > 0) { g.chainResetTimer = Math.max(0, g.chainResetTimer - dt); if (g.chainResetTimer <= 0) g.chainHits = 0 }
  if (g.bossFleeTimer > 0) g.bossFleeTimer = Math.max(0, g.bossFleeTimer - dt)
  if (g.webProcAnim) { g.webProcAnim.timer -= dt; if (g.webProcAnim.timer <= 0) g.webProcAnim = null }
  for (let i = 0; i < p.abilityCds.length; i++) p.abilityCds[i] = Math.max(0, p.abilityCds[i] - dt)

  // Shadow dash trail fade
  p.shadowDashTrail = p.shadowDashTrail.filter(t => { t.a -= dt * 3; return t.a > 0 })

  // Sky arrows
  g.skyArrows = g.skyArrows.filter(arrow => {
    if (arrow.hit) return false
    arrow.warnTimer -= dt
    if (arrow.warnTimer <= 0) {
      if (dist(b.pos, arrow.targetPos) < bossDef.size + 60) dealDmgToBoss(g, arrow.dmg, gear)
      spawnParticles(g, arrow.targetPos, 20, '#F1C40F', 260, 0.75); g.screenShake = Math.max(g.screenShake, 0.4)
      arrow.hit = true; return false
    }
    return true
  })

  // Feather boots recharge
  if (p.dodgeChargeMode) {
    for (let i = 0; i < p.featherRecharge.length; i++) {
      if (p.featherCharges < 3 && p.featherRecharge[i] > 0) {
        p.featherRecharge[i] = Math.max(0, p.featherRecharge[i] - dt)
        if (p.featherRecharge[i] <= 0 && p.featherCharges < 3) p.featherCharges++
      }
    }
  }

  // Dodge roll
  if (p.dodgeTimer > 0) {
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt)
    p.pos.x += p.dodgeVel.x * dt; p.pos.y += p.dodgeVel.y * dt
    p.pos.x = clamp(p.pos.x, 20, WW - 20); p.pos.y = clamp(p.pos.y, 20, WH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, p.dodgeTimer)
    p.dodgeTrail.push({ ...p.pos }); if (p.dodgeTrail.length > 6) p.dodgeTrail.shift()
  } else { p.dodgeTrail = []; p.webTrapPlaced = false }

  // Bull charge
  if (g.bullChargeDash.active) {
    g.bullChargeDash.timer = Math.max(0, g.bullChargeDash.timer - dt)
    p.pos.x += g.bullChargeDash.vel.x * dt; p.pos.y += g.bullChargeDash.vel.y * dt
    p.pos.x = clamp(p.pos.x, 20, WW - 20); p.pos.y = clamp(p.pos.y, 20, WH - 20)
    p.iframeTimer = Math.max(p.iframeTimer, g.bullChargeDash.timer)
    if (dist(p.pos, b.pos) < bossDef.size + 22) {
      dealDmgToBoss(g, 150, gear); g.screenShake = Math.max(g.screenShake, 0.45)
      spawnParticles(g, b.pos, 20, '#E74C3C', 220); g.bullChargeDash.active = false
    }
    if (g.bullChargeDash.timer <= 0) g.bullChargeDash.active = false
  }

  // Whirlwind
  if (g.whirlwindActive) {
    g.whirlwindTimer -= dt; p.iframeTimer = Math.max(p.iframeTimer, 0.1)
    if (g.whirlwindTimer <= 0) { g.whirlwindActive = false }
    else if (dist(p.pos, b.pos) < 110) { b.hp = Math.max(0, b.hp - 65 * dt); spawnParticles(g, b.pos, 2, '#E74C3C', 100) }
  }

  // Player movement
  const speedMult = (p.slowTimer > 0 ? 0.45 : 1) * (gear.includes('feather_boots') ? 1.4 : 1)
  const speed = 170 * speedMult
  if (!p.dodgeTimer && !g.bullChargeDash.active && !g.whirlwindActive && p.targetPos) {
    const d2t = dist(p.pos, p.targetPos)
    if (d2t > 4) {
      const dir = norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
      const ms = speed * dt
      p.pos.x = clamp(p.pos.x + dir.x * Math.min(ms, d2t), 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * Math.min(ms, d2t), 20, WH - 20)
    } else { p.targetPos = null }
  }

  // Knockback
  if (Math.hypot(p.knockbackVel.x, p.knockbackVel.y) > 1) {
    p.pos.x = clamp(p.pos.x + p.knockbackVel.x * dt, 20, WW - 20)
    p.pos.y = clamp(p.pos.y + p.knockbackVel.y * dt, 20, WH - 20)
    p.knockbackVel.x *= Math.pow(0.04, dt); p.knockbackVel.y *= Math.pow(0.04, dt)
  }

  // Boss collision push
  const minBd = bossDef.size + 20
  if (dist(p.pos, b.pos) < minBd) {
    const push = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
    p.pos.x = b.pos.x + push.x * minBd; p.pos.y = b.pos.y + push.y * minBd
  }

  // Facing
  if (p.targetPos) p.facing = Math.atan2(p.targetPos.y - p.pos.y, p.targetPos.x - p.pos.x)
  else p.facing = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x)

  // Auto-attack
  const dToBoss = dist(p.pos, b.pos), atkRange = wpn.range + bossDef.size
  let atkCd = wpn.atkCd
  if (gear.includes('spider_fang')) atkCd *= 0.6
  const flashColor = gear.includes('fire_staff') ? '#FF4500' : gear.includes('venom_bow') ? '#8E44AD' : gear.includes('storm_bow') ? '#7DFFB0' : wpn.color
  if (p.atkTimer <= 0 && dToBoss <= atkRange && !p.dodgeTimer && !g.bullChargeDash.active) {
    p.atkTimer = atkCd
    const atkAngle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x)
    const flashType = gear.includes('spider_fang') ? 'slash' : wpn.id !== 'sword' ? 'shot' : 'slam'
    g.attackFlash = { angle: atkAngle, timer: 0.22, maxTimer: 0.22, type: flashType, color: flashColor }
    if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 5.0
    if (wpn.id !== 'sword' && !gear.includes('spider_fang')) {
      const dir = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
      const isStorm = gear.includes('storm_bow')
      const projColor = wpn.id === 'staff' ? '#9B59B6' : gear.includes('venom_bow') ? '#9B59B6' : isStorm ? '#7DFFB0' : '#27AE60'
      const projSpeed = wpn.id === 'staff' ? 380 : 440
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * projSpeed, dir.y * projSpeed), dmg: wpn.dmg, radius: 6, fromBoss: false, life: 4.0, color: projColor, aoe: isStorm ? 40 : undefined, isLightning: isStorm, trail: [] })
    } else {
      dealDmgToBoss(g, wpn.dmg, gear); spawnParticles(g, b.pos, 4, wpn.color, 80)
    }
  }

  // Ability activation
  if (pendingAbility !== null && pendingAbility >= 0 && pendingAbility < 4) {
    const idx = pendingAbility, abDef = wpn.abilities[idx]
    if (p.abilityCds[idx] <= 0) { p.abilityCds[idx] = abDef.cd; activateAbility(g, idx, wpn, gear, abilityTarget, bossId) }
  }

  // Boss movement
  if (g.bossFlightSpeed > 0 && b.stunTimer <= 0) {
    // Griffin: orbit around the player (center tracks player position)
    const orbitMult = (g.bossEnraged ? 1.5 : 1.0) * (b.slowTimer > 0 ? 0.3 : 1.0)
    g.bossFlightAngle += g.bossFlightSpeed * orbitMult * dt
    // Orbit center lerps toward player so boss always circles near the player
    const trackRate = Math.min(1, dt * 2.5)
    g.bossFlightCenter.x += (p.pos.x - g.bossFlightCenter.x) * trackRate
    g.bossFlightCenter.y += (p.pos.y - g.bossFlightCenter.y) * trackRate
    const r = g.bossFlightRadius
    g.bossFlightCenter.x = clamp(g.bossFlightCenter.x, r + 100, WW - r - 100)
    g.bossFlightCenter.y = clamp(g.bossFlightCenter.y, r * 0.62 + 100, WH - r * 0.62 - 100)
    const fc = g.bossFlightCenter
    b.pos.x = clamp(fc.x + Math.cos(g.bossFlightAngle) * r, 100, WW - 100)
    b.pos.y = clamp(fc.y + Math.sin(g.bossFlightAngle) * r * 0.62, 100, WH - 100)
  } else if (bossId === 1 && b.stunTimer <= 0) {
    // Drake: snake locomotion — head slithers toward player with sinusoidal lateral weave
    const snakeSpeed = (g.bossEnraged ? 178 : 135) * (b.slowTimer > 0 ? 0.28 : 1.0)
    const toP = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
    const perp = v(-toP.y, toP.x)
    const wiggle = Math.sin(g.gtime * 1.85) * 0.65
    const mdx = toP.x + perp.x * wiggle, mdy = toP.y + perp.y * wiggle
    const mlen = Math.sqrt(mdx*mdx + mdy*mdy) || 1
    b.pos.x = clamp(b.pos.x + (mdx/mlen) * snakeSpeed * dt, 90, WW - 90)
    b.pos.y = clamp(b.pos.y + (mdy/mlen) * snakeSpeed * dt, 90, WH - 90)
    // Smoothly rotate head angle toward actual movement direction
    const tgtAng = Math.atan2(mdy/mlen, mdx/mlen)
    let dAng = (tgtAng - b.angle) % (Math.PI * 2)
    if (dAng > Math.PI) dAng -= Math.PI * 2
    if (dAng < -Math.PI) dAng += Math.PI * 2
    b.angle += dAng * Math.min(1, dt * 8)
    // Append head position to trail for body-follows-head movement
    const tl = g.snakeTrail
    if (tl.length === 0 || dist(b.pos, tl[tl.length-1]) >= 8) {
      tl.push({x: b.pos.x, y: b.pos.y})
      if (tl.length > 400) tl.shift()
    }
  } else if (bossId === 0) {
    // Spider: stalk player at preferred range — chase when far, back away when too close, strafe in between
    const bossSpeed = (g.bossEnraged ? 155 : 105) * (b.slowTimer > 0 ? 0.4 : 1)
    const d2p = dist(b.pos, p.pos)
    const PREF_MIN = 150, PREF_MAX = 270
    if (b.stunTimer <= 0) {
      if (d2p > PREF_MAX) {
        // Chase at full speed
        const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        b.pos.x = clamp(b.pos.x + dir.x * bossSpeed * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + dir.y * bossSpeed * dt, 90, WH - 90)
      } else if (d2p < PREF_MIN) {
        // Back away smoothly (no teleport)
        const away = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
        b.pos.x = clamp(b.pos.x + away.x * bossSpeed * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + away.y * bossSpeed * dt, 90, WH - 90)
      } else {
        // In preferred range: strafe laterally around player (direction toggles via gtime)
        const toPlayer = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        const strafeSign = Math.sin(g.gtime * 0.75) >= 0 ? 1 : -1
        const strafe = v(-toPlayer.y * strafeSign, toPlayer.x * strafeSign)
        b.pos.x = clamp(b.pos.x + strafe.x * bossSpeed * 0.65 * dt, 90, WW - 90)
        b.pos.y = clamp(b.pos.y + strafe.y * bossSpeed * 0.65 * dt, 90, WH - 90)
      }
    }
  }
  if (bossId !== 1) b.angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
  if (g.attackFlash) { g.attackFlash.timer = Math.max(0, g.attackFlash.timer - dt); if (g.attackFlash.timer <= 0) g.attackFlash = null }

  // Hazard zones
  g.zones = g.zones.filter(zone => {
    zone.life -= dt; if (zone.life <= 0) return false
    if (dist(p.pos, zone.pos) < zone.radius + 14) {
      if (zone.type === 'web') p.slowTimer = Math.max(p.slowTimer, 1.8)
      if (p.iframeTimer <= 0 && zone.dps > 0) {
        const tick2 = zone.dps * dt; p.hp = Math.max(0, p.hp - tick2); p.hitFlash = Math.max(p.hitFlash, 0.06)
        if (zone.type === 'poison' && Math.random() < dt * 2) g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-14, 14), y: p.pos.y - 18 }, val: Math.round(tick2), life: 0.8, isPlayer: true })
        if (p.hp <= 0) g.phase = 'defeat'
      }
    }
    return true
  })

  // Slow traps
  g.slowTraps = g.slowTraps.filter(trap => {
    trap.life -= dt; if (trap.life <= 0) return false
    if (!trap.fromPlayer && dist(p.pos, trap.pos) < 30) p.slowTimer = 3.0
    if (trap.fromPlayer && dist(b.pos, trap.pos) < bossDef.size + 18) { b.slowTimer = 3.0; spawnParticles(g, trap.pos, 10, '#8E44AD', 110); return false }
    return true
  })

  // Projectiles
  g.projectiles = g.projectiles.filter(proj => {
    proj.life -= dt; if (proj.life <= 0) return false
    if (proj.trail) { proj.trail.push({ ...proj.pos }); if (proj.trail.length > 8) proj.trail.shift() }
    proj.pos.x += proj.vel.x * dt; proj.pos.y += proj.vel.y * dt
    if (proj.pos.x < 0 || proj.pos.x > WW || proj.pos.y < 0 || proj.pos.y > WH) return false
    if (proj.fromBoss && p.iframeTimer <= 0 && dist(proj.pos, p.pos) < proj.radius + 14) {
      if (g.bossAttack?.type === 'web_shot' || proj.isWeb) p.slowTimer = Math.max(p.slowTimer, 3.0)
      dealDmgToPlayer(g, proj.dmg, wpn, gear, norm(v(p.pos.x - proj.pos.x, p.pos.y - proj.pos.y)))
      spawnParticles(g, proj.pos, 9, proj.color, 130); return false
    }
    if (!proj.fromBoss && dist(proj.pos, b.pos) < proj.radius + bossDef.size) {
      dealDmgToBoss(g, proj.dmg, gear)
      if (proj.isPowerShot) { b.stunTimer = Math.max(b.stunTimer, 0.7); spawnParticles(g, proj.pos, 22, '#F1C40F', 280); g.screenShake = Math.max(g.screenShake, 0.5) }
      if (proj.aoe && proj.isLightning) { spawnParticles(g, proj.pos, 14, '#7DFFB0', 180); g.screenShake = Math.max(g.screenShake, 0.22); if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 30, gear) }
      if (proj.isFireball && proj.aoe) { spawnParticles(g, proj.pos, 24, '#FF4500', 240); spawnParticles(g, proj.pos, 12, '#F1C40F', 160); g.screenShake = Math.max(g.screenShake, 0.4); if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 50, gear) }
      spawnParticles(g, proj.pos, 6, proj.color, 100); return false
    }
    return true
  })

  // Boss attack logic
  if (g.bossAttack) {
    const atk = g.bossAttack; atk.elapsed += dt
    if ((atk.type === 'thunderstorm' || atk.type === 'chain_lightning' || atk.type === 'lightning_barrage') && atk.active) {
      const d2 = atk.data; d2.elapsed = (d2.elapsed ?? 0) + dt
      const interval = atk.type === 'lightning_barrage' ? 0.18 : 0.4
      const newIdx = Math.floor((d2.elapsed ?? 0) / interval)
      if (newIdx > (d2.strikeIndex ?? 0) && newIdx <= (d2.count ?? 7)) {
        d2.strikeIndex = newIdx
        // lightning_barrage aims tightly at player — must keep moving to dodge
        const spread = atk.type === 'lightning_barrage' ? 55 : 220
        const hitR = atk.type === 'lightning_barrage' ? 70 : 65
        const tx = p.pos.x + rnd(-spread, spread), ty = p.pos.y + rnd(-spread, spread)
        if (dist(p.pos, v(tx, ty)) < hitR) dealDmgToPlayer(g, d2.dmg ?? 25, wpn, gear, norm(v(p.pos.x - tx, p.pos.y - ty)))
        const lColor = atk.type === 'lightning_barrage' ? '#00EEFF' : '#F1C40F'
        spawnParticles(g, v(tx, ty), atk.type === 'lightning_barrage' ? 22 : 18, lColor, 240); g.screenShake = Math.max(g.screenShake, 0.35)
        if (atk.type === 'lightning_barrage') { spawnParticles(g, v(tx, ty), 8, '#FFFFFF', 160); g.screenShake = Math.max(g.screenShake, 0.5) }
      }
      if ((d2.elapsed ?? 0) >= ((d2.count ?? 7) * interval + 0.25)) { g.bossAttack = null; g.nextAttackTimer = rnd(2.2, 3.8) / (g.bossEnraged ? 1.6 : 1.0) }
      return
    }
    if (atk.type === 'flame_wave' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const a2 = atk.data.angle ?? 0, hc = (atk.data.coneAngle ?? 0.5) / 2
      const pa = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df = Math.abs(pa - a2); while (df > Math.PI) df = Math.abs(df - Math.PI * 2)
      if (df <= hc && dist(p.pos, b.pos) < (atk.data.coneRange ?? 320)) dealDmgToPlayer(g, (atk.data.dmg ?? 20) * dt * 2.5, wpn, gear)
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 1.6)) { g.bossAttack = null; g.nextAttackTimer = rnd(2.0, 3.5) / (g.bossEnraged ? 1.7 : 1.0) }
      return
    }
    if (atk.type === 'fire_breath' && atk.active) {
      atk.data.elapsed = (atk.data.elapsed ?? 0) + dt
      const a3 = atk.data.angle ?? 0, hc2 = (atk.data.coneAngle ?? 0.4) / 2
      const pa2 = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
      let df2 = Math.abs(pa2 - a3); while (df2 > Math.PI) df2 = Math.abs(df2 - Math.PI * 2)
      if (df2 <= hc2 && dist(p.pos, b.pos) < (atk.data.coneRange ?? 260)) dealDmgToPlayer(g, (atk.data.dmg ?? 18) * dt * 1.5, wpn, gear)
      if ((atk.data.elapsed ?? 0) >= (atk.data.duration ?? 2.2)) { g.bossAttack = null; g.nextAttackTimer = rnd(2.4, 4.0) / (g.bossEnraged ? 1.6 : 1.0) }
      return
    }
    if (!atk.active && atk.elapsed >= atk.telegraphTime) {
      atk.active = true
      if (!['thunderstorm', 'chain_lightning', 'fire_breath', 'flame_wave'].includes(atk.type)) {
        resolveBossAttack(g, bossId, wpn, gear); g.bossAttack = null; g.nextAttackTimer = rnd(2.0, 3.4) / (g.bossEnraged ? 1.7 : 1.0)
      }
    }
  } else if (g.nextAttackTimer <= 0 && b.stunTimer <= 0) {
    startBossAttack(g, bossId, selectBossAttack(bossId, g.bossEnraged, dist(p.pos, b.pos)))
  }

  // Enrage
  if (!g.bossEnraged && b.hp / b.maxHp <= bossDef.enrageAt) {
    g.bossEnraged = true; g.screenShake = 0.9; spawnParticles(g, b.pos, 35, '#FF4444', 350)
  }

  // Boss death
  if (b.hp <= 0 && g.phase === 'playing') {
    g.phase = 'dying'; g.bossDeathAnim = 3.0; g.bossAttack = null; g.screenShake = 1.5
    spawnParticles(g, b.pos, 90, '#F1C40F', 400); spawnParticles(g, b.pos, 45, bossDef.color, 320); spawnParticles(g, b.pos, 22, '#FFFFFF', 550)
  }

  // Decay
  g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 28 * dt; return d2.life > 0 })
  g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; pt.vel.x *= Math.pow(0.15, dt); pt.vel.y *= Math.pow(0.15, dt); return pt.life > 0 })
  if (bossId === 1) {
    const spawnRate = g.bossEnraged ? 26 : 16
    if (Math.random() < dt * spawnRate) {
      const side = Math.random() > 0.5 ? 1 : -1
      const cols = ['#FF6600','#FF4500','#E67E22','#FFAA00','#FF2200','#FF7700']
      g.lavaParticles.push({ id: ++g.nextPartId, pos: v(b.pos.x + rnd(-bossDef.size*0.9, bossDef.size*0.9), b.pos.y + rnd(-bossDef.size*0.3, bossDef.size*0.55)), vel: v(rnd(-28, 28) + side * rnd(8, 36), rnd(-95, -28)), life: rnd(0.5, 1.5), maxLife: 1.5, color: cols[Math.floor(Math.random()*cols.length)], size: rnd(2.5, 7) })
    }
    g.lavaParticles = g.lavaParticles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt; return pt.life > 0 })
    // Tail whip — player takes damage if they touch the tail tip
    if (g.tailWhipCd > 0) { g.tailWhipCd -= dt } else if (p.iframeTimer <= 0) {
      // Walk the trail backward from head to find the tail tip position
      const tl2 = g.snakeTrail
      const BODY_LEN = bossDef.size * 3.5  // total snake body length in px
      let tailX = b.pos.x, tailY = b.pos.y
      if (tl2.length > 0) {
        let walked = 0, wpx2 = b.pos.x, wpy2 = b.pos.y
        for (let ti2 = tl2.length - 1; ti2 >= 0; ti2--) {
          const dx2 = tl2[ti2].x - wpx2, dy2 = tl2[ti2].y - wpy2
          const d2 = Math.sqrt(dx2*dx2 + dy2*dy2)
          if (walked + d2 >= BODY_LEN) {
            const fr3 = (BODY_LEN - walked) / d2
            tailX = wpx2 + dx2*fr3; tailY = wpy2 + dy2*fr3; break
          }
          walked += d2; wpx2 = tl2[ti2].x; wpy2 = tl2[ti2].y
          if (ti2 === 0) { tailX = tl2[0].x; tailY = tl2[0].y }
        }
      }
      if (dist(p.pos, v(tailX, tailY)) < 50) {
        dealDmgToPlayer(g, 14, wpn, gear, norm(v(p.pos.x - tailX, p.pos.y - tailY)))
        g.tailWhipCd = 1.1
        spawnParticles(g, v(tailX, tailY), 6, '#FF6600', 110)
      }
    }
  }
}

/* ═══ ABILITIES ═══ */
function activateAbility(g: GS, idx: number, wpn: WeaponDef, gear: GearId[], abilityTarget: V2, bossId: BossId) {
  const p = g.player, b = g.boss

  if (idx === 0 && gear.includes('fire_staff')) {
    const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 360, dir.y * 360), dmg: 80, radius: 14, fromBoss: false, life: 4.0, color: '#FF4500', aoe: 100, isFireball: true, trail: [] })
    spawnParticles(g, p.pos, 14, '#FF4500', 170)
    return
  }

  if (wpn.id === 'bow') {
    if (idx === 0) { // Power Shot
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 560, dir.y * 560), dmg: wpn.dmg * 3, radius: 14, fromBoss: false, life: 4.0, color: '#F1C40F', isPowerShot: true, trail: [] })
      spawnParticles(g, p.pos, 18, '#F1C40F', 200)
      g.attackFlash = { angle: Math.atan2((abilityTarget.y - p.pos.y), (abilityTarget.x - p.pos.x)), timer: 0.4, maxTimer: 0.4, type: 'power_shot', color: '#F1C40F' }
    } else if (idx === 1) { // Trap
      g.slowTraps.push({ id: ++g.nextTrapId, pos: { ...abilityTarget }, life: 20.0, fromPlayer: true })
      if (dist(b.pos, abilityTarget) < BOSS_DEFS[bossId].size + 22) { dealDmgToBoss(g, 110, gear); b.slowTimer = 3.0 }
      spawnParticles(g, abilityTarget, 10, '#8E44AD', 90, 0.65)
    } else if (idx === 2) { // Shadow Dash
      const dir = p.targetPos ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y)) : norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      p.dodgeTimer = 0.38; p.dodgeVel = v(dir.x * 540, dir.y * 540); p.iframeTimer = 0.38
      for (let i = 0; i < 6; i++) p.shadowDashTrail.push({ pos: { ...p.pos }, a: 0.7 - i * 0.08 })
      spawnParticles(g, p.pos, 12, wpn.color, 130, 0.4)
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.25, maxTimer: 0.25, type: 'shadow', color: wpn.color }
    } else if (idx === 3) { // Rain of Arrows
      for (let i = 0; i < 3; i++) {
        const perp = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x) + Math.PI / 2
        const tx = clamp(abilityTarget.x + Math.cos(perp) * (i - 1) * 100, 50, WW - 50)
        const ty = clamp(abilityTarget.y + Math.sin(perp) * (i - 1) * 100, 50, WH - 50)
        g.skyArrows.push({ id: ++g.nextProjId, targetPos: v(tx, ty), warnTimer: 1.2 + i * 0.25, hit: false, dmg: Math.round(wpn.dmg * 2.5) })
      }
      spawnParticles(g, p.pos, 10, '#F1C40F', 120, 0.4)
    }
  } else if (wpn.id === 'sword') {
    if (idx === 0) { // Ground Slam
      if (dist(p.pos, b.pos) < 140) { dealDmgToBoss(g, 130, gear); g.screenShake = Math.max(g.screenShake, 0.55) }
      spawnParticles(g, p.pos, 24, '#E74C3C', 220)
    } else if (idx === 1) { // Rage
      g.rageActive = true; g.rageTimer = 8.0; spawnParticles(g, p.pos, 18, '#FF6B35', 170)
    } else if (idx === 2) { // Bull Charge
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.bullChargeDash = { active: true, vel: v(dir.x * 640, dir.y * 640), timer: 0.4 }; p.iframeTimer = 0.4
    } else if (idx === 3) { // Whirlwind
      g.whirlwindActive = true; g.whirlwindTimer = 3.0; spawnParticles(g, p.pos, 18, '#E74C3C', 170)
    }
  } else { // staff
    if (idx === 0) { // Arcane Bolt
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 580, dir.y * 580), dmg: Math.round(wpn.dmg * 2.5), radius: 12, fromBoss: false, life: 4.0, color: '#9B59B6', trail: [] })
      spawnParticles(g, p.pos, 14, '#9B59B6', 180)
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.35, maxTimer: 0.35, type: 'magic', color: '#9B59B6' }
    } else if (idx === 1) { // Mana Shield
      p.iframeTimer = Math.max(p.iframeTimer, 1.5)
      spawnParticles(g, p.pos, 22, '#9B59B6', 150)
      g.screenShake = Math.max(g.screenShake, 0.12)
    } else if (idx === 2) { // Blink
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const blinkDist = Math.min(dist(p.pos, abilityTarget), 350)
      for (let i = 0; i < 5; i++) p.shadowDashTrail.push({ pos: { ...p.pos }, a: 0.65 - i * 0.1 })
      p.pos.x = clamp(p.pos.x + dir.x * blinkDist, 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * blinkDist, 20, WH - 20)
      p.iframeTimer = Math.max(p.iframeTimer, 0.3)
      spawnParticles(g, p.pos, 14, '#9B59B6', 180, 0.5)
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.25, maxTimer: 0.25, type: 'shadow', color: '#9B59B6' }
    } else if (idx === 3) { // Meteor
      g.skyArrows.push({ id: ++g.nextProjId, targetPos: { ...abilityTarget }, warnTimer: 1.0, hit: false, dmg: 200 })
      spawnParticles(g, p.pos, 12, '#9B59B6', 130, 0.5)
    }
  }
}
// PIECE_3_START

/* ═══ RENDERERS ═══ */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}

function renderArena(ctx: CanvasRenderingContext2D, arenaType: 'spider'|'drake'|'griffin', t: number, g: GS) {
  ctx.save()
  if (arenaType === 'spider') {
    const bg = ctx.createLinearGradient(0, 0, WW, WH)
    bg.addColorStop(0, '#060210'); bg.addColorStop(1, '#0d0420')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, WW, WH)
    ctx.strokeStyle = 'rgba(130,80,190,0.07)'; ctx.lineWidth = 1
    const cx = WW/2, cy = WH/2
    for (let r2 = 80; r2 < 1200; r2 += 80) { ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.stroke() }
    for (let a = 0; a < Math.PI*2; a += 0.25) {
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a)*1300, cy + Math.sin(a)*1300); ctx.stroke()
    }
    const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,600)
    grd.addColorStop(0,'rgba(80,20,140,0.12)'); grd.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = grd; ctx.fillRect(0,0,WW,WH)
  } else if (arenaType === 'drake') {
    const bg = ctx.createLinearGradient(0,0,0,WH)
    bg.addColorStop(0,'#1a0600'); bg.addColorStop(0.5,'#2a0e00'); bg.addColorStop(1,'#1a0600')
    ctx.fillStyle = bg; ctx.fillRect(0,0,WW,WH)
    ctx.strokeStyle = `rgba(255,90,0,${0.08 + 0.04*Math.sin(t*0.8)})`; ctx.lineWidth = 4
    const cracks: number[][] = [[300,WH,450,WH*0.5,380,WH*0.2],[WW-280,WH,WW-420,WH*0.55,WW-350,WH*0.3],[WW*0.4,WH,WW*0.45,WH*0.6],[WW*0.7,WH,WW*0.65,WH*0.65]]
    cracks.forEach(pts => {
      if (pts.length < 4) return
      ctx.beginPath(); ctx.moveTo(pts[0],pts[1])
      for (let i=2;i<pts.length;i+=2) ctx.lineTo(pts[i],pts[i+1]); ctx.stroke()
    })
    const glow2 = ctx.createRadialGradient(WW/2,WH,0,WW/2,WH,600)
    glow2.addColorStop(0,'rgba(255,80,0,0.15)'); glow2.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = glow2; ctx.fillRect(0,0,WW,WH)
    g.lavaParticles.forEach(pt => {
      const a2 = pt.life/pt.maxLife; ctx.save(); ctx.globalAlpha = a2 * 0.90
      ctx.shadowColor = pt.color; ctx.shadowBlur = 9
      ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.size * (0.65 + a2 * 0.35), 0, Math.PI*2); ctx.fill(); ctx.restore()
    })
  } else {
    const bg = ctx.createLinearGradient(0,0,0,WH)
    bg.addColorStop(0,'#05090f'); bg.addColorStop(1,'#0e1528')
    ctx.fillStyle = bg; ctx.fillRect(0,0,WW,WH)
    ctx.strokeStyle = 'rgba(160,190,255,0.05)'; ctx.lineWidth = 14
    for (let i=0;i<8;i++) {
      ctx.beginPath(); ctx.moveTo(-120,60+i*130)
      ctx.bezierCurveTo(WW*0.3,40+i*130,WW*0.65,85+i*130,WW+120,60+i*130); ctx.stroke()
    }
    const glow3 = ctx.createRadialGradient(WW/2,WH/2,0,WW/2,WH/2,700)
    glow3.addColorStop(0,'rgba(80,120,255,0.06)'); glow3.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle = glow3; ctx.fillRect(0,0,WW,WH)
  }
  void t
  ctx.restore()
}

function renderEnvObjects(ctx: CanvasRenderingContext2D, g: GS, arenaType: 'spider'|'drake'|'griffin', t: number) {
  for (const obj of g.envObjects) {
    ctx.save(); ctx.translate(obj.pos.x, obj.pos.y); ctx.rotate(obj.angle)
    if (obj.type === 'rock') {
      ctx.fillStyle = arenaType==='drake' ? '#3a2010' : arenaType==='griffin' ? '#4a5060' : '#2a1a3a'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6
      ctx.beginPath()
      const sides = 5+obj.variant
      for (let i=0;i<sides;i++) { const a=i/sides*Math.PI*2, r2=obj.size*(0.7+0.3*Math.sin(a*2.3+obj.variant)); if(i===0) ctx.moveTo(Math.cos(a)*r2,Math.sin(a)*r2); else ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2) }
      ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke()
    } else if (obj.type === 'bone') {
      ctx.strokeStyle = 'rgba(200,190,165,0.55)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(-obj.size*0.5,0); ctx.lineTo(obj.size*0.5,0); ctx.stroke()
      ctx.fillStyle = 'rgba(200,190,165,0.5)'
      ctx.beginPath(); ctx.arc(-obj.size*0.5,0,5,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(obj.size*0.5,0,5,0,Math.PI*2); ctx.fill()
    } else if (obj.type === 'skull') {
      ctx.fillStyle = 'rgba(185,175,155,0.5)'; ctx.beginPath(); ctx.arc(0,0,obj.size*0.5,0,Math.PI*2); ctx.fill()
      ctx.fillStyle = '#060210'
      ctx.beginPath(); ctx.arc(-obj.size*0.14,-obj.size*0.04,obj.size*0.1,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(obj.size*0.14,-obj.size*0.04,obj.size*0.1,0,Math.PI*2); ctx.fill()
    } else if (obj.type === 'web') {
      const alpha = 0.18 + 0.08*Math.sin(t*1.8+obj.variant*1.4)
      ctx.strokeStyle = `rgba(170,150,210,${alpha})`; ctx.lineWidth = 0.8
      for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*obj.size,Math.sin(a)*obj.size); ctx.stroke() }
      for (let ring=1;ring<=4;ring++) { const r2=ring/4*obj.size; ctx.beginPath(); for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; if(i===0) ctx.moveTo(Math.cos(a)*r2,Math.sin(a)*r2); else ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2) } ctx.closePath(); ctx.stroke() }
    } else if (obj.type === 'crystal') {
      const glow = ctx.createRadialGradient(0,0,0,0,0,obj.size)
      glow.addColorStop(0,'rgba(255,130,30,0.5)'); glow.addColorStop(1,'rgba(255,80,0,0.05)')
      ctx.fillStyle = glow; ctx.strokeStyle = 'rgba(255,150,60,0.7)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0,-obj.size); ctx.lineTo(obj.size*0.4,-obj.size*0.2); ctx.lineTo(obj.size*0.25,obj.size*0.6); ctx.lineTo(-obj.size*0.25,obj.size*0.6); ctx.lineTo(-obj.size*0.4,-obj.size*0.2); ctx.closePath()
      ctx.fill(); ctx.stroke()
    } else if (obj.type === 'ruin') {
      ctx.fillStyle = arenaType==='griffin'?'rgba(60,75,100,0.55)':'rgba(50,40,28,0.55)'
      ctx.fillRect(-obj.size*0.35,-obj.size,obj.size*0.7,obj.size); ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;ctx.strokeRect(-obj.size*0.35,-obj.size,obj.size*0.7,obj.size)
    } else if (obj.type === 'nest') {
      ctx.strokeStyle = 'rgba(130,95,55,0.4)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0,0,obj.size,0,Math.PI*2); ctx.stroke()
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(130,95,55,0.25)'; ctx.beginPath(); ctx.arc(0,0,obj.size*0.6,0,Math.PI*2); ctx.stroke()
    } else if (obj.type === 'claw') {
      ctx.strokeStyle = 'rgba(170,155,75,0.5)'; ctx.lineWidth = 3
      for (let i=0;i<3;i++) { const a=Math.PI+(i-1)*0.38; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*obj.size,Math.sin(a)*obj.size); ctx.stroke() }
    }
    ctx.restore()
  }
  void t
}

function renderBoss(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId, t: number) {
  const b = g.boss, bossDef = BOSS_DEFS[bossId]
  ctx.save(); ctx.translate(b.pos.x, b.pos.y)
  const hitW = b.hitFlash > 0 && Math.sin(b.hitFlash*80)>0

  if (bossId === 0) {
    // ── SPIDER QUEEN ── enlarged, web-dripping horror
    ctx.shadowColor = g.bossEnraged ? '#FF0055' : '#8E44AD'; ctx.shadowBlur = g.bossEnraged ? 55 : 32
    const sz = bossDef.size
    // 8 animated legs with 2 segments each
    for (let i=0;i<8;i++) {
      const side = i<4?-1:1, li=i%4
      const baseA = (side===-1?Math.PI:0)+(li-1.5)*0.44
      const wave = Math.sin(b.legPhase+i*0.85)*0.4
      const knee = v(Math.cos(baseA+wave)*sz*1.0, Math.sin(baseA+wave)*sz*1.0)
      const tip  = v(Math.cos(baseA+wave*1.7)*sz*2.5, Math.sin(baseA+wave*1.7+0.5)*sz*2.5)
      // outer glow
      ctx.strokeStyle = g.bossEnraged?'rgba(220,0,100,0.25)':'rgba(100,30,160,0.2)'; ctx.lineWidth=10+li
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(knee.x,knee.y,tip.x,tip.y); ctx.stroke()
      // main leg
      ctx.strokeStyle = g.bossEnraged?'#7A1848':'#3D1560'; ctx.lineWidth=4.5-li*0.3
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(knee.x,knee.y,tip.x,tip.y); ctx.stroke()
      // claw tip
      ctx.fillStyle = g.bossEnraged?'#FF0066':'#6A20A0'
      ctx.beginPath(); ctx.arc(tip.x,tip.y,4,0,Math.PI*2); ctx.fill()
    }
    // abdomen
    const abdGr = ctx.createRadialGradient(-sz*0.3,-sz*0.2,0,0,sz*0.15,sz*1.15)
    abdGr.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#5C0025':'#2A0850'))
    abdGr.addColorStop(0.5,hitW?'#EEE':(g.bossEnraged?'#7A1848':'#4A1275'))
    abdGr.addColorStop(1,hitW?'#CCC':(g.bossEnraged?'#3A0020':'#1A0535'))
    ctx.fillStyle=abdGr; ctx.beginPath(); ctx.ellipse(0,sz*0.2,sz*0.95,sz*1.05,0,0,Math.PI*2); ctx.fill()
    // skull pattern on abdomen
    if (!hitW) {
      ctx.strokeStyle=g.bossEnraged?'rgba(255,0,60,0.35)':'rgba(160,60,220,0.3)'; ctx.lineWidth=1.5
      for (let i=0;i<3;i++) { const oa=i*Math.PI*2/3+t*0.4; ctx.beginPath(); ctx.arc(Math.cos(oa)*sz*0.35,sz*0.2+Math.sin(oa)*sz*0.35,sz*0.12,0,Math.PI*2); ctx.stroke() }
    }
    // cephalothorax
    const headGr = ctx.createRadialGradient(-5,-sz*0.5,0,0,-sz*0.45,sz*0.58)
    headGr.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#7A1848':'#5D1E8A')); headGr.addColorStop(1,hitW?'#EEE':'#1A0535')
    ctx.fillStyle=headGr; ctx.beginPath(); ctx.ellipse(0,-sz*0.5,sz*0.55,sz*0.48,0,0,Math.PI*2); ctx.fill()
    // chelicerae (fangs)
    ctx.strokeStyle=g.bossEnraged?'#FF3366':'#7A20B0'; ctx.lineWidth=3
    ctx.beginPath(); ctx.moveTo(-8,-sz*0.75); ctx.quadraticCurveTo(-18,-sz*0.95,-10,-sz*1.1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo( 8,-sz*0.75); ctx.quadraticCurveTo( 18,-sz*0.95, 10,-sz*1.1); ctx.stroke()
    // venom drip
    if (!hitW) {
      ctx.fillStyle=`rgba(${g.bossEnraged?'255,0,80':'120,30,200'},${0.5+0.3*Math.sin(t*3.5)})`
      for (let i=0;i<3;i++) { const dx=(i-1)*sz*0.28; ctx.beginPath(); ctx.ellipse(dx,sz*0.62+Math.sin(t*2.2+i)*7,4,11+Math.sin(t*4+i)*5,0,0,Math.PI*2); ctx.fill() }
    }
    // 8 red eyes
    const eyePts=[v(-18,-sz*0.56),v(-7,-sz*0.63),v(7,-sz*0.63),v(18,-sz*0.56),v(-20,-sz*0.45),v(-8,-sz*0.43),v(8,-sz*0.43),v(20,-sz*0.45)]
    eyePts.forEach((ep,ei) => {
      const ep2=0.6+0.4*Math.sin(t*6+ei*0.8)
      ctx.shadowColor='#FF0000'; ctx.shadowBlur=14*ep2
      ctx.fillStyle=hitW?'#FFF':(g.bossEnraged?'#FF0000':'#CC0000')
      ctx.beginPath(); ctx.arc(ep.x,ep.y,3.8*ep2,0,Math.PI*2); ctx.fill()
    })
    if (g.bossEnraged) { ctx.fillStyle=`rgba(200,0,80,${0.14+0.08*Math.sin(t*7)})`; ctx.beginPath(); ctx.arc(0,0,sz*1.3,0,Math.PI*2); ctx.fill() }
    if (g.webProcAnim && dist(g.webProcAnim.pos,b.pos)<50) { ctx.strokeStyle=`rgba(200,160,255,${g.webProcAnim.timer})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,sz+15,0,Math.PI*2); ctx.stroke() }

  } else if (bossId === 1) {
    // ── LAVA DRAKE ── trail-following serpentine snake
    const sz = bossDef.size
    const pulse = Math.sin(t * 4.2)
    const enr = g.bossEnraged

    // ── Sample body segment positions from snake trail (b.pos-relative world coords, no rotation) ──
    const N2 = 8
    const SEG_SPACING = sz * 0.50   // arc-length between segment anchors
    const bw2 = [ sz*0.76, sz*0.64, sz*0.53, sz*0.43, sz*0.34, sz*0.24, sz*0.15, sz*0.07 ]
    const px2: number[] = [0]   // segment 0 = head = origin in b.pos-relative context
    const py2: number[] = [0]
    {
      const tl = g.snakeTrail
      let remain = SEG_SPACING, spx = b.pos.x, spy = b.pos.y, ti = tl.length - 1
      while (px2.length < N2) {
        if (ti < 0) {
          // Trail too short — extrapolate linearly behind last segment
          const li = px2.length - 1
          const bkx = li > 0 ? px2[li]-px2[li-1] : -Math.cos(b.angle)*SEG_SPACING
          const bky = li > 0 ? py2[li]-py2[li-1] : -Math.sin(b.angle)*SEG_SPACING
          const bklen = Math.sqrt(bkx*bkx+bky*bky) || SEG_SPACING
          px2.push(px2[li] + bkx/bklen*SEG_SPACING)
          py2.push(py2[li] + bky/bklen*SEG_SPACING)
          continue
        }
        const tp = tl[ti]
        const dx = tp.x - spx, dy = tp.y - spy
        const d = Math.sqrt(dx*dx+dy*dy)
        if (d < remain) {
          remain -= d; spx = tp.x; spy = tp.y; ti--
        } else {
          const frac2 = remain/d
          spx += dx*frac2; spy += dy*frac2
          px2.push(spx - b.pos.x); py2.push(spy - b.pos.y)
          remain = SEG_SPACING
        }
      }
    }
    // Segment start/end using midpoint quadratic technique
    const sS = (i: number) => i === 0 ? {x: px2[0], y: py2[0]} : {x: (px2[i-1]+px2[i])/2, y: (py2[i-1]+py2[i])/2}
    const sE = (i: number) => i >= N2-2 ? {x: px2[N2-1], y: py2[N2-1]} : {x: (px2[i]+px2[i+1])/2, y: (py2[i]+py2[i+1])/2}

    // Pass 1: outer glow
    if (!hitW) {
      ctx.shadowColor = enr ? '#FF1100' : '#FF5500'; ctx.shadowBlur = enr ? 32 : 20
      for (let i = 0; i < N2-1; i++) {
        const s2 = sS(i), e2 = sE(i)
        ctx.strokeStyle = enr ? 'rgba(255,28,0,0.14)' : 'rgba(210,72,0,0.11)'
        ctx.lineWidth = bw2[i]+22; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
      }
      ctx.shadowBlur = 0
    }
    // Pass 2: dark outline
    for (let i = 0; i < N2-1; i++) {
      const s2 = sS(i), e2 = sE(i)
      ctx.strokeStyle = hitW ? '#FFF' : (enr ? '#900D00' : '#570900')
      ctx.lineWidth = bw2[i]+8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
    }
    // Pass 3: main body color — bright orange-red at head, darker toward tail
    for (let i = 0; i < N2-1; i++) {
      const s2 = sS(i), e2 = sE(i)
      const frac = i / Math.max(1, N2-2)
      const rv = Math.round(hitW ? 255 : enr ? 228-frac*54 : 182-frac*52)
      const gv = Math.round(hitW ? 255 : enr ? 50-frac*20 : 28-frac*14)
      ctx.strokeStyle = hitW ? '#FFF' : `rgb(${rv},${gv},0)`
      ctx.lineWidth = bw2[i]; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
    }
    // Pass 4: bright inner highlight stripe
    if (!hitW) {
      for (let i = 0; i < N2-1; i++) {
        const s2 = sS(i), e2 = sE(i)
        const al = Math.max(0, 0.62 - (i / Math.max(1,N2-2)) * 0.52)
        ctx.strokeStyle = enr ? `rgba(255,152,18,${al})` : `rgba(255,172,28,${al})`
        ctx.lineWidth = bw2[i]*0.40; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(s2.x,s2.y); ctx.quadraticCurveTo(px2[i],py2[i],e2.x,e2.y); ctx.stroke()
      }
    }
    // ── TAIL TIP — permanent glowing yellow orb (also flares when ready to whip) ──
    {
      const tipX2 = px2[N2-1], tipY2 = py2[N2-1]
      const tipPulse = 0.5 + 0.5*Math.sin(t * 5.5)
      const flare = g.tailWhipCd <= 0.3 ? 1.0 : 0.5
      ctx.shadowColor = '#FFEE00'; ctx.shadowBlur = (20 + tipPulse*16) * flare
      ctx.fillStyle = `rgb(255,${Math.round(210+45*tipPulse)},${Math.round(20*tipPulse)})`
      ctx.beginPath(); ctx.arc(tipX2, tipY2, bw2[N2-1]*2.4 + tipPulse*5, 0, Math.PI*2); ctx.fill()
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 10 * flare
      ctx.fillStyle = `rgba(255,255,${Math.round(160+95*tipPulse)},${0.75+tipPulse*0.25})`
      ctx.beginPath(); ctx.arc(tipX2, tipY2, bw2[N2-1]*1.1 + tipPulse*2, 0, Math.PI*2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // ── SEGMENT BANDS — visible dark rings marking body divisions ──
    if (!hitW) {
      for (let i = 1; i < N2-1; i++) {
        const dxa = px2[Math.min(i+1,N2-1)]-px2[Math.max(i-1,0)]
        const dya = py2[Math.min(i+1,N2-1)]-py2[Math.max(i-1,0)]
        const pa = Math.atan2(dya, dxa)
        const r = bw2[i]*0.76
        ctx.strokeStyle = enr ? `rgba(55,3,0,0.65)` : `rgba(38,4,0,0.58)`
        ctx.lineWidth = bw2[i]*0.18
        ctx.beginPath(); ctx.arc(px2[i], py2[i], r, pa+Math.PI*0.22, pa+Math.PI*0.78); ctx.stroke()
        ctx.beginPath(); ctx.arc(px2[i], py2[i], r, pa-Math.PI*0.78, pa-Math.PI*0.22); ctx.stroke()
      }
    }

    // ── LEGS — 4 pairs, thin dark sticks with 3-claw tips ──
    ctx.lineCap = 'round'
    for (const li of [2, 4]) {
      if (li >= N2-1) continue
      const dxl = px2[Math.min(li+1,N2-1)]-px2[Math.max(li-1,0)]
      const dyl = py2[Math.min(li+1,N2-1)]-py2[Math.max(li-1,0)]
      const bAng = Math.atan2(dyl, dxl)
      for (const sd of [-1, 1]) {
        const pAng = bAng + Math.PI/2*sd
        const anim = Math.sin(t*2.6+li*1.3+sd*0.7)*0.18
        const baseX = px2[li]+Math.cos(pAng)*bw2[li]*0.44
        const baseY = py2[li]+Math.sin(pAng)*bw2[li]*0.44
        const kAng = pAng + anim
        const kx = baseX+Math.cos(kAng)*sz*0.40, ky = baseY+Math.sin(kAng)*sz*0.40
        const fAng = kAng + 0.44
        const fx = kx+Math.cos(fAng)*sz*0.30, fy = ky+Math.sin(fAng)*sz*0.30
        ctx.strokeStyle = hitW?'#FFF':(enr?'#5A0C00':'#2C0800'); ctx.lineWidth = sz*0.10
        ctx.beginPath(); ctx.moveTo(baseX,baseY); ctx.lineTo(kx,ky); ctx.stroke()
        ctx.strokeStyle = hitW?'#EEE':(enr?'#7A1600':'#481000'); ctx.lineWidth = sz*0.07
        ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(fx,fy); ctx.stroke()
        ctx.lineCap = 'butt'; ctx.lineWidth = 1.6
        ctx.strokeStyle = hitW?'#FFF':(enr?'#FF5500':'#CC3300')
        for (let c = 0; c < 3; c++) {
          ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+Math.cos(fAng-0.36+c*0.34)*sz*0.16, fy+Math.sin(fAng-0.36+c*0.34)*sz*0.16); ctx.stroke()
        }
        ctx.lineCap = 'round'
      }
    }
    ctx.lineCap = 'butt'

    // ── HEAD — polygon dragon head (wedge skull + jaw + teeth + horns) ──
    ctx.save(); ctx.rotate(b.angle)
    const hx = 0   // head center = b.pos in rotated frame
    const hGrad = ctx.createLinearGradient(hx-sz*0.50, 0, hx+sz*0.60, 0)
    hGrad.addColorStop(0,    hitW?'#CCC':(enr?'#7A0E00':'#4A0E00'))
    hGrad.addColorStop(0.42, hitW?'#FFF':(enr?'#DD2200':'#AA2000'))
    hGrad.addColorStop(0.80, hitW?'#FFF':(enr?'#FF3800':'#CC2A00'))
    hGrad.addColorStop(1,    hitW?'#EEE':(enr?'#CC2200':'#A01800'))
    // Upper skull + snout wedge (wide back → pointed snout)
    ctx.fillStyle = hGrad
    ctx.beginPath()
    ctx.moveTo(hx-sz*0.50, -sz*0.36)
    ctx.quadraticCurveTo(hx-sz*0.06, -sz*0.45, hx+sz*0.22, -sz*0.13)
    ctx.lineTo(hx+sz*0.62,  sz*0.02)
    ctx.lineTo(hx+sz*0.60,  sz*0.10)
    ctx.lineTo(hx+sz*0.26,  sz*0.22)
    ctx.lineTo(hx-sz*0.06,  sz*0.28)
    ctx.lineTo(hx-sz*0.50,  sz*0.26)
    ctx.closePath(); ctx.fill()
    // Lower jaw
    ctx.fillStyle = hitW?'#CCC':(enr?'#AA1800':'#7A1200')
    ctx.beginPath()
    ctx.moveTo(hx-sz*0.12,  sz*0.26)
    ctx.lineTo(hx+sz*0.30,  sz*0.22)
    ctx.lineTo(hx+sz*0.50,  sz*0.40)
    ctx.lineTo(hx+sz*0.14,  sz*0.54)
    ctx.lineTo(hx-sz*0.14,  sz*0.50)
    ctx.closePath(); ctx.fill()
    // Upper teeth
    ctx.fillStyle = hitW?'#FFF':'#E8DFC2'
    for (let i = 0; i < 5; i++) {
      const tx = hx+sz*0.54-i*sz*0.13, ty = sz*0.10+i*sz*0.022
      ctx.beginPath(); ctx.moveTo(tx-sz*0.05,ty); ctx.lineTo(tx,ty+sz*(0.11-i*0.014)); ctx.lineTo(tx+sz*0.05,ty); ctx.closePath(); ctx.fill()
    }
    // Lower teeth
    ctx.fillStyle = hitW?'#EEE':'#D4CAB2'
    for (let i = 0; i < 4; i++) {
      const tx = hx+sz*0.44-i*sz*0.11, ty = sz*0.34-i*sz*0.016
      ctx.beginPath(); ctx.moveTo(tx-sz*0.04,ty); ctx.lineTo(tx,ty-sz*(0.09-i*0.012)); ctx.lineTo(tx+sz*0.04,ty); ctx.closePath(); ctx.fill()
    }
    // Skull armor plates
    if (!hitW) {
      ctx.fillStyle = enr?'rgba(80,6,0,0.52)':'rgba(52,4,0,0.48)'
      for (let i = 0; i < 4; i++) {
        const hpx=hx-sz*0.38+i*sz*0.20, hpy=-sz*0.28+i*sz*0.05
        ctx.beginPath(); ctx.moveTo(hpx,hpy); ctx.lineTo(hpx+sz*0.14,hpy+sz*0.04); ctx.lineTo(hpx+sz*0.10,hpy+sz*0.15); ctx.lineTo(hpx-sz*0.04,hpy+sz*0.11); ctx.closePath(); ctx.fill()
      }
    }
    // Brow ridge
    ctx.fillStyle = hitW?'#BBB':'#5A3808'
    ctx.beginPath(); ctx.moveTo(hx-sz*0.18,-sz*0.20); ctx.lineTo(hx+sz*0.14,-sz*0.15); ctx.lineTo(hx+sz*0.10,-sz*0.06); ctx.lineTo(hx-sz*0.22,-sz*0.10); ctx.closePath(); ctx.fill()
    // Swept-back horns
    ctx.fillStyle = hitW?'#FFF':'#8A6510'
    ctx.beginPath(); ctx.moveTo(hx-sz*0.30,-sz*0.30); ctx.quadraticCurveTo(hx-sz*0.54,-sz*0.82,hx-sz*0.68,-sz*0.92); ctx.quadraticCurveTo(hx-sz*0.50,-sz*0.76,hx-sz*0.22,-sz*0.22); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(hx-sz*0.15,-sz*0.24); ctx.quadraticCurveTo(hx-sz*0.36,-sz*0.72,hx-sz*0.46,-sz*0.80); ctx.quadraticCurveTo(hx-sz*0.30,-sz*0.62,hx-sz*0.10,-sz*0.17); ctx.closePath(); ctx.fill()
    // Glowing nostril
    if (!hitW) {
      ctx.fillStyle=`rgba(255,${110+Math.floor(pulse*70)},0,${0.55+pulse*0.25})`
      ctx.shadowColor='#FF5500'; ctx.shadowBlur=12
      ctx.beginPath(); ctx.ellipse(hx+sz*0.54,sz*0.00,5,3.5,0.20,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur=0
    }
    // Single glowing green eye
    const ep=0.68+0.32*Math.sin(t*5.2)
    ctx.shadowColor=enr?'#FF0000':'#00FF88'; ctx.shadowBlur=26*ep
    ctx.fillStyle=enr?`rgb(255,${Math.floor(80+90*ep)},0)`:'#22FF88'
    ctx.beginPath(); ctx.arc(hx+sz*0.06,-sz*0.24,9,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#000'; ctx.shadowBlur=0
    ctx.beginPath(); ctx.ellipse(hx+sz*0.07,-sz*0.24,2.5,5.5,0.14,0,Math.PI*2); ctx.fill()
    ctx.restore()  // end head rotation


    // ── ENRAGE AURA ──
    if (enr) {
      const ar=bossDef.size*1.65+pulse*12
      const aura=ctx.createRadialGradient(0,0,ar*0.62,0,0,ar)
      aura.addColorStop(0,`rgba(255,70,0,${0.24+pulse*0.14})`); aura.addColorStop(1,'rgba(200,0,0,0)')
      ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,ar,0,Math.PI*2); ctx.fill()
      ctx.shadowColor='#FF4400'; ctx.shadowBlur=14
      for (let i=0;i<8;i++) {
        const ea=t*4.0+i*Math.PI*0.25, er=bossDef.size*1.42+Math.sin(t*4.5+i)*16
        ctx.fillStyle=`rgba(255,${90+Math.floor(Math.sin(t*5.5+i)*75)},0,${0.72+0.28*Math.sin(t*6+i)})`
        ctx.beginPath(); ctx.arc(Math.cos(ea)*er,Math.sin(ea)*er,5.0,0,Math.PI*2); ctx.fill()
      }
      ctx.shadowBlur=0
    }

  } else {
    // ── STORM GRIFFIN ── Kree'arra-style: muscular, gorilla body with huge wings
    ctx.shadowColor=g.bossEnraged?'#00CCFF':'#8888FF'; ctx.shadowBlur=g.bossEnraged?55:30
    ctx.save(); ctx.rotate(b.angle)
    const sz=bossDef.size
    const wf=Math.sin(t*3.2)*0.28  // wing flap
    const wspan=sz*2.8

    // Huge outstretched wings (behind body)
    ctx.fillStyle=g.bossEnraged?'rgba(60,180,255,0.32)':'rgba(120,120,220,0.26)'
    ctx.strokeStyle=g.bossEnraged?'rgba(80,220,255,0.75)':'rgba(160,160,255,0.55)'; ctx.lineWidth=2.2
    // Left wing
    ctx.beginPath(); ctx.moveTo(-sz*0.3,-sz*0.1); ctx.quadraticCurveTo(-wspan*0.45,-(sz*(1.4+wf)),-wspan,sz*(0.2+wf*0.6)); ctx.quadraticCurveTo(-wspan*0.5,sz*0.5,-sz*0.3,sz*0.2); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.strokeStyle=g.bossEnraged?'rgba(120,240,255,0.4)':'rgba(180,180,255,0.3)'; ctx.lineWidth=1.2
    for (let i=1;i<=4;i++){const tt=i/5;ctx.beginPath();ctx.moveTo(-sz*0.3,-sz*0.1);ctx.quadraticCurveTo(-wspan*0.4*tt,-(sz*(1.1+wf)*tt),-wspan*tt,sz*(0.15+wf*0.5)*tt);ctx.stroke()}
    // Right wing
    ctx.fillStyle=g.bossEnraged?'rgba(60,180,255,0.32)':'rgba(120,120,220,0.26)'
    ctx.strokeStyle=g.bossEnraged?'rgba(80,220,255,0.75)':'rgba(160,160,255,0.55)'; ctx.lineWidth=2.2
    ctx.beginPath(); ctx.moveTo(-sz*0.3,sz*0.1); ctx.quadraticCurveTo(-wspan*0.45,sz*(1.4+wf),-wspan,-(sz*(0.2+wf*0.6))); ctx.quadraticCurveTo(-wspan*0.5,-sz*0.5,-sz*0.3,-sz*0.2); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.strokeStyle=g.bossEnraged?'rgba(120,240,255,0.4)':'rgba(180,180,255,0.3)'; ctx.lineWidth=1.2
    for (let i=1;i<=4;i++){const tt=i/5;ctx.beginPath();ctx.moveTo(-sz*0.3,sz*0.1);ctx.quadraticCurveTo(-wspan*0.4*tt,sz*(1.1+wf)*tt,-wspan*tt,-(sz*(0.15+wf*0.5)*tt));ctx.stroke()}

    // Muscular gorilla-like torso (dark stone-grey)
    const torsoG=ctx.createRadialGradient(-sz*0.1,-sz*0.1,0,0,0,sz*0.95)
    torsoG.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#A0A860':'#7A7850'))
    torsoG.addColorStop(0.5,hitW?'#EEE':(g.bossEnraged?'#707040':'#585530'))
    torsoG.addColorStop(1,hitW?'#DDD':(g.bossEnraged?'#404020':'#303018'))
    ctx.fillStyle=torsoG; ctx.beginPath(); ctx.ellipse(-sz*0.05,sz*0.05,sz*0.92,sz*0.88,0,0,Math.PI*2); ctx.fill()
    // chest muscle highlights
    if (!hitW) {
      ctx.strokeStyle=g.bossEnraged?'rgba(200,220,80,0.35)':'rgba(160,160,80,0.25)'; ctx.lineWidth=2.5
      ctx.beginPath(); ctx.arc(-sz*0.28,-sz*0.1,sz*0.36,Math.PI*0.1,Math.PI*0.9); ctx.stroke()
      ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.1,sz*0.36,Math.PI*0.1,Math.PI*0.9); ctx.stroke()
    }
    // Arms / huge taloned claws (the distinctive Kree'arra wing-arm blades)
    ctx.strokeStyle=hitW?'#FFF':(g.bossEnraged?'#8080C0':'#606090'); ctx.lineWidth=sz*0.28; ctx.lineCap='round'
    ctx.beginPath(); ctx.moveTo(-sz*0.5,sz*0.3); ctx.lineTo(-sz*0.2,sz*0.85); ctx.stroke() // left arm
    ctx.beginPath(); ctx.moveTo(sz*0.2,sz*0.3); ctx.lineTo(-sz*0.05,sz*0.85); ctx.stroke()  // right arm
    ctx.lineCap='butt'
    // big swept-back blade talons
    ctx.fillStyle=hitW?'#FFF':(g.bossEnraged?'#CCDD66':'#AAAA44')
    const bladeAngles=[[-sz*0.2,sz*0.85,-0.9],[sz*0.0,sz*0.88,-0.65],[-sz*0.45,sz*0.82,-1.2]]
    bladeAngles.forEach(([bx,by,ba])=>{ctx.save();ctx.translate(bx as number,by as number);ctx.rotate(ba as number);ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(sz*0.65,-12);ctx.lineTo(sz*0.7,0);ctx.lineTo(sz*0.65,12);ctx.lineTo(0,4);ctx.closePath();ctx.fill();ctx.restore()})
    // Bird head
    const headG=ctx.createRadialGradient(sz*0.2,-sz*0.05,0,sz*0.2,-sz*0.05,sz*0.52)
    headG.addColorStop(0,hitW?'#FFF':(g.bossEnraged?'#B8C060':'#8A8840'))
    headG.addColorStop(1,hitW?'#DDD':(g.bossEnraged?'#505028':'#383818'))
    ctx.fillStyle=headG; ctx.beginPath(); ctx.ellipse(sz*0.22,-sz*0.05,sz*0.52,sz*0.46,0.2,0,Math.PI*2); ctx.fill()
    // beak
    ctx.fillStyle=hitW?'#FFF':(g.bossEnraged?'#CCAA00':'#886600')
    ctx.beginPath(); ctx.moveTo(sz*0.7,-sz*0.08); ctx.lineTo(sz*1.05,-sz*0.04); ctx.lineTo(sz*0.7,sz*0.06); ctx.closePath(); ctx.fill()
    // Glowing eyes
    ctx.fillStyle=g.bossEnraged?'#00EEFF':'#BBDDFF'; ctx.shadowColor=g.bossEnraged?'#00CCFF':'#AAAAFF'; ctx.shadowBlur=16
    ctx.beginPath(); ctx.arc(sz*0.5,-sz*0.14,6.5,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(sz*0.5,sz*0.1,6.5,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#000'; ctx.shadowBlur=0; ctx.beginPath(); ctx.arc(sz*0.52,-sz*0.14,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.52,sz*0.1,3,0,Math.PI*2); ctx.fill()
    // tail feathers
    ctx.strokeStyle=hitW?'#FFF':(g.bossEnraged?'rgba(80,200,255,0.7)':'rgba(180,180,100,0.6)'); ctx.lineWidth=4
    for (let i=0;i<5;i++){const fa=Math.PI*0.7+i*(Math.PI*0.6/4)+Math.sin(t*1.8+i*0.6)*0.08;ctx.beginPath();ctx.moveTo(-sz*0.6,0);ctx.lineTo(-sz*0.6+Math.cos(fa)*sz*0.8,Math.sin(fa)*sz*0.8);ctx.stroke()}
    ctx.restore()
    // lightning aura
    if (g.bossEnraged) {
      for (let i=0;i<5;i++){const sa=(t*3.5+i*Math.PI*0.4)%(Math.PI*2),sr=sz+16;ctx.fillStyle=`rgba(80,220,255,${0.5+0.4*Math.sin(t*7+i)})`;ctx.shadowColor='#00CCFF';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(Math.cos(sa)*sr,Math.sin(sa)*sr,4.5,0,Math.PI*2);ctx.fill()}
      ctx.shadowBlur=0
    }
    // Storm lightning arcs orbiting body
    ctx.strokeStyle=`rgba(150,220,255,${0.3+0.25*Math.sin(t*8)})`; ctx.lineWidth=1.5
    for (let i=0;i<3;i++){const sa=t*4+i*(Math.PI*2/3);ctx.beginPath();ctx.moveTo(Math.cos(sa)*sz,Math.sin(sa)*sz);ctx.lineTo(Math.cos(sa+0.5)*sz*1.2,Math.sin(sa+0.5)*sz*1.2);ctx.lineTo(Math.cos(sa+0.9)*sz*0.9,Math.sin(sa+0.9)*sz*0.9);ctx.stroke()}
  }
  ctx.restore()
}

function getWeaponId(wpn: WeaponDef, gear: GearId[]): string {
  if (gear.includes('spider_fang')) return 'dagger'
  if (gear.includes('fire_staff')) return 'fire_staff'
  if (gear.includes('drake_sword')) return 'greatsword'
  if (gear.includes('thunder_blade')) return 'thunder_sword'
  if (gear.includes('storm_bow')) return 'storm_bow'
  if (gear.includes('venom_bow')) return 'venom_bow'
  return wpn.id
}

function renderPlayer(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, gear: GearId[], t: number) {
  const p = g.player
  const facing = g.bullChargeDash.active ? Math.atan2(g.bullChargeDash.vel.y, g.bullChargeDash.vel.x) : p.facing
  const wid = getWeaponId(wpn, gear)

  p.shadowDashTrail.forEach(tr => {
    ctx.save(); ctx.globalAlpha = tr.a * 0.55
    ctx.fillStyle = wpn.color; ctx.shadowColor = wpn.color; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(tr.pos.x, tr.pos.y, 13, 0, Math.PI*2); ctx.fill()
    ctx.restore()
  })

  if (p.dodgeTrail.length > 1) {
    p.dodgeTrail.forEach((tp, i) => {
      ctx.save(); ctx.globalAlpha = (i / p.dodgeTrail.length)*0.3
      ctx.fillStyle = wpn.color; ctx.beginPath(); ctx.arc(tp.x,tp.y,13,0,Math.PI*2); ctx.fill(); ctx.restore()
    })
  }

  if (g.attackFlash && g.attackFlash.timer > 0) {
    const af = g.attackFlash, prog = 1 - af.timer/af.maxTimer, alpha = 1-prog
    ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(af.angle); ctx.globalAlpha = alpha*0.9
    if (af.type === 'power_shot') {
      ctx.shadowColor = '#F1C40F'; ctx.shadowBlur = 24
      ctx.strokeStyle = '#F1C40F'; ctx.lineWidth = 5+alpha*4
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(60+prog*50),0); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,150,0.5)'; ctx.lineWidth = 12
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(35+prog*30),0); ctx.stroke()
    } else if (af.type==='slash' || af.type==='shadow') {
      const r2 = 52+prog*22, arc = af.type==='shadow'?1.3:1.0
      ctx.strokeStyle = af.color; ctx.lineWidth = 3+(1-prog)*3; ctx.shadowColor = af.color; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(0,0,r2,-arc/2,arc/2); ctx.stroke()
    } else if (af.type === 'slam') {
      const rr = 24+prog*70; ctx.strokeStyle=af.color; ctx.lineWidth=5-prog*3; ctx.shadowColor=af.color; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(28,0,rr*0.5,0,Math.PI*2); ctx.stroke()
      ctx.globalAlpha=alpha*0.35; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(28,0,rr,0,Math.PI*2); ctx.stroke()
    } else if (af.type === 'shot') {
      const len = 32+prog*45; ctx.strokeStyle=af.color; ctx.lineWidth=3; ctx.shadowColor=af.color; ctx.shadowBlur=10
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+len,0); ctx.stroke()
    }
    ctx.restore()
  }

  ctx.save(); ctx.translate(p.pos.x, p.pos.y)
  if (p.hitFlash>0) { ctx.shadowColor='#FF0000'; ctx.shadowBlur=24 } else { ctx.shadowColor=wpn.color; ctx.shadowBlur=14 }

  if (g.whirlwindActive) {
    const sa = t*11; ctx.save(); ctx.rotate(sa)
    ctx.strokeStyle='#E74C3C'; ctx.lineWidth=2.5; ctx.globalAlpha=0.6; ctx.setLineDash([10,6])
    ctx.beginPath(); ctx.arc(0,0,110,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    for (let i=0;i<3;i++) { const ba=sa+i*(Math.PI*2/3); ctx.globalAlpha=0.5; ctx.strokeStyle='#E74C3C'; ctx.lineWidth=3; ctx.shadowColor='#E74C3C'; ctx.shadowBlur=8; ctx.beginPath(); ctx.moveTo(Math.cos(ba)*16,Math.sin(ba)*16); ctx.lineTo(Math.cos(ba)*38,Math.sin(ba)*38); ctx.stroke() }
    ctx.restore()
  }

  if (g.rageActive) {
    const rp = 0.5+0.5*Math.sin(t*8)
    for (let i=0;i<6;i++) { const fa=(t*3+i*Math.PI/3)%(Math.PI*2), fr=24+Math.sin(t*5+i)*5; ctx.fillStyle=i%2===0?`rgba(255,80,0,${rp*0.5})`:`rgba(255,200,0,${rp*0.3})`; ctx.beginPath(); ctx.arc(Math.cos(fa)*fr,Math.sin(fa)*fr,4+rp*3,0,Math.PI*2); ctx.fill() }
    ctx.fillStyle=`rgba(231,76,60,${(0.5+0.5*Math.sin(t*8))*0.18})`; ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2); ctx.fill()
  }

  const hw = p.hitFlash>0&&Math.sin(p.hitFlash*80)>0
  const bodyGr = ctx.createRadialGradient(-3,-3,0,0,0,16)
  if (wpn.element==='lightning') {
    bodyGr.addColorStop(0,hw?'#FFF':'#A9DFBF'); bodyGr.addColorStop(0.5,hw?'#FFF':'#27AE60'); bodyGr.addColorStop(1,hw?'#FFF':'#1A6E3C')
    ctx.fillStyle = bodyGr; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill()
    if (Math.sin(t*12)>0.65) { ctx.strokeStyle='#7DFFB0'; ctx.lineWidth=1.5; ctx.globalAlpha=0.75; ctx.beginPath(); ctx.moveTo(-6,-10); ctx.lineTo(0,-2); ctx.lineTo(4,-8); ctx.stroke(); ctx.globalAlpha=1 }
  } else if (wpn.element==='arcane') {
    bodyGr.addColorStop(0,hw?'#FFF':'#D7BDE2'); bodyGr.addColorStop(0.5,hw?'#FFF':'#9B59B6'); bodyGr.addColorStop(1,hw?'#FFF':'#4A235A')
    ctx.fillStyle = bodyGr; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill()
    if (Math.sin(t*9)>0.6) { ctx.strokeStyle='#CE9EE8'; ctx.lineWidth=1.5; ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1 }
  } else {
    bodyGr.addColorStop(0,hw?'#FFF':'#F1948A'); bodyGr.addColorStop(0.5,hw?'#FFF':'#E74C3C'); bodyGr.addColorStop(1,hw?'#FFF':'#7B241C')
    ctx.fillStyle = bodyGr; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill()
  }

  ctx.save(); ctx.rotate(facing)
  if (wid === 'dagger') {
    ctx.shadowColor='#8E44AD'; ctx.shadowBlur=10
    ctx.save(); ctx.rotate(0.4); ctx.fillStyle=hw?'#FFF':'#9B59B6'; ctx.beginPath(); ctx.moveTo(14,-3); ctx.lineTo(30,0); ctx.lineTo(14,3); ctx.closePath(); ctx.fill(); ctx.restore()
    ctx.save(); ctx.rotate(-0.4); ctx.fillStyle=hw?'#FFF':'#8E44AD'; ctx.beginPath(); ctx.moveTo(14,-3); ctx.lineTo(30,0); ctx.lineTo(14,3); ctx.closePath(); ctx.fill(); ctx.restore()
  } else if (wid === 'greatsword') {
    ctx.shadowColor='#E67E22'; ctx.shadowBlur=14
    ctx.strokeStyle='#5D3A1A'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(52,0); ctx.stroke()
    ctx.fillStyle=hw?'#FFF':'#E67E22'; ctx.beginPath(); ctx.moveTo(50,-7); ctx.lineTo(62,0); ctx.lineTo(50,7); ctx.closePath(); ctx.fill()
    ctx.fillStyle=hw?'#FFF':'#F39C12'; ctx.fillRect(20,-2,26,4)
    ctx.strokeStyle='rgba(255,180,80,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(14,-12); ctx.lineTo(14,12); ctx.stroke()
  } else if (wid === 'thunder_sword') {
    const lp = 0.5+0.5*Math.sin(t*10)
    ctx.shadowColor='#F1C40F'; ctx.shadowBlur=16+lp*10
    ctx.strokeStyle='#3A2A10'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(44,0); ctx.stroke()
    ctx.fillStyle=hw?'#FFF':`rgba(241,196,15,${0.8+lp*0.2})`; ctx.beginPath(); ctx.moveTo(42,-5); ctx.lineTo(54,0); ctx.lineTo(42,5); ctx.closePath(); ctx.fill()
  } else if (wid === 'fire_staff') {
    ctx.shadowColor='#FF4500'; ctx.shadowBlur=16
    ctx.strokeStyle=hw?'#FFF':'#7B2D00'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(50,0); ctx.stroke()
    const fp=0.5+0.5*Math.sin(t*8); ctx.fillStyle=`rgba(255,${80+Math.round(fp*40)},0,${0.8+fp*0.2})`
    ctx.beginPath(); ctx.arc(54,0,6+fp*2,0,Math.PI*2); ctx.fill()
  } else if (wid === 'staff') {
    ctx.shadowColor='#9B59B6'; ctx.shadowBlur=16
    ctx.strokeStyle=hw?'#FFF':'#4A235A'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(50,0); ctx.stroke()
    const ap=0.5+0.5*Math.sin(t*7); ctx.fillStyle=hw?'#FFF':`rgba(155,89,182,${0.85+ap*0.15})`
    ctx.shadowColor='#CE9EE8'; ctx.shadowBlur=12+ap*8
    ctx.beginPath(); ctx.arc(54,0,7+ap*2.5,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=hw?'#FFF':`rgba(220,170,255,${ap*0.6})`
    ctx.beginPath(); ctx.arc(54,0,4,0,Math.PI*2); ctx.fill()
  } else if (wid === 'venom_bow') {
    ctx.strokeStyle=hw?'#FFF':'#9B59B6'; ctx.shadowColor='#8E44AD'; ctx.shadowBlur=12; ctx.lineWidth=2.8
    ctx.beginPath(); ctx.arc(22,0,16,-Math.PI*0.65,Math.PI*0.65); ctx.stroke()
    ctx.strokeStyle='rgba(200,150,255,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(22+16*Math.cos(-Math.PI*0.65),16*Math.sin(-Math.PI*0.65)); ctx.lineTo(22+16*Math.cos(Math.PI*0.65),16*Math.sin(Math.PI*0.65)); ctx.stroke()
    ctx.strokeStyle='#C39BD3'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(34,0); ctx.stroke()
  } else if (wid === 'storm_bow') {
    const ep=0.5+0.5*Math.sin(t*9)
    ctx.strokeStyle=hw?'#FFF':`rgba(100,220,255,${0.8+ep*0.2})`; ctx.shadowColor='#00CCFF'; ctx.shadowBlur=14+ep*8; ctx.lineWidth=2.5
    ctx.beginPath(); ctx.arc(22,0,16,-Math.PI*0.65,Math.PI*0.65); ctx.stroke()
    ctx.strokeStyle='rgba(150,240,255,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(22+16*Math.cos(-Math.PI*0.65),16*Math.sin(-Math.PI*0.65)); ctx.lineTo(22+16*Math.cos(Math.PI*0.65),16*Math.sin(Math.PI*0.65)); ctx.stroke()
    ctx.strokeStyle='#7DFFB0'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(34,0); ctx.stroke()
  } else if (wid === 'bow') {
    ctx.strokeStyle=hw?'#FFF':'#2ECC71'; ctx.shadowColor='#2ECC71'; ctx.shadowBlur=8; ctx.lineWidth=2.5
    ctx.beginPath(); ctx.arc(20,0,14,-Math.PI*0.6,Math.PI*0.6); ctx.stroke()
    ctx.strokeStyle='rgba(200,255,220,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(20+14*Math.cos(-Math.PI*0.6),14*Math.sin(-Math.PI*0.6)); ctx.lineTo(20+14*Math.cos(Math.PI*0.6),14*Math.sin(Math.PI*0.6)); ctx.stroke()
    ctx.strokeStyle='#A9DFBF'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(30,0); ctx.stroke()
  } else {
    ctx.strokeStyle='#5A5040'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(38,0); ctx.stroke()
    ctx.fillStyle=hw?'#FFF':'#8A8070'; ctx.beginPath(); ctx.moveTo(36,-4); ctx.lineTo(44,0); ctx.lineTo(36,4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle='rgba(180,160,130,0.4)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(16,-9); ctx.lineTo(16,9); ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

function renderTelegraph(ctx: CanvasRenderingContext2D, g: GS, _bossId: BossId, t: number) {
  const atk = g.bossAttack; if (!atk || atk.active) return
  const progress = atk.elapsed/atk.telegraphTime, pulse = 0.4+0.6*progress, b = g.boss
  ctx.save()
  if (atk.type==='venom_spit'||atk.type==='ember_barrage') {
    const count=atk.data.count??3, baseA=atk.data.angle??0
    for (let i=0;i<count;i++) { const a=baseA+(i-(count-1)/2)*0.28; ctx.strokeStyle=`rgba(255,80,80,${pulse})`; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*500,b.pos.y+Math.sin(a)*500); ctx.stroke(); ctx.setLineDash([]) }
  } else if (atk.type==='web_shot'||atk.type==='talon_dive') {
    const a=atk.data.angle??0; ctx.strokeStyle=`rgba(255,100,200,${pulse})`; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*600,b.pos.y+Math.sin(a)*600); ctx.stroke(); ctx.setLineDash([])
  } else if (atk.type==='leg_sweep'||atk.type==='tail_swipe'||atk.type==='wind_buffet'||atk.type==='fire_breath') {
    const angle=atk.data.angle??0, half=(atk.data.coneAngle??Math.PI)/2, range=atk.data.coneRange??150
    ctx.fillStyle=`rgba(255,60,60,${pulse*0.2})`; ctx.strokeStyle=`rgba(255,100,60,${pulse*0.7})`; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.arc(b.pos.x,b.pos.y,range,angle-half,angle+half); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (atk.type==='spider_leap'||atk.type==='lightning_strike'||atk.type==='stomp') {
    const target=atk.data.targetPos!, r=atk.data.radius??(atk.type==='stomp'?155:120)
    ctx.strokeStyle=`rgba(255,60,60,${pulse})`; ctx.lineWidth=2+progress*2
    ctx.beginPath(); ctx.arc(target.x,target.y,r*(0.5+0.5*progress),0,Math.PI*2); ctx.stroke()
  } else if (atk.type==='venom_burst') {
    ctx.strokeStyle=`rgba(142,68,173,${pulse})`; ctx.lineWidth=3+progress*3; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,(atk.data.radius??180)*(0.4+0.6*progress),0,Math.PI*2); ctx.stroke()
    ctx.fillStyle=`rgba(90,20,130,${pulse*0.16})`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,atk.data.radius??180,0,Math.PI*2); ctx.fill()
  } else if (atk.type==='web_spray') {
    const count=atk.data.count??7, baseA=Math.atan2((atk.data.targetPos?.y??b.pos.y)-b.pos.y,(atk.data.targetPos?.x??b.pos.x)-b.pos.x)
    for (let i=0;i<count;i++) { const a=baseA+(i-(count-1)/2)*0.38; ctx.strokeStyle=`rgba(180,80,255,${pulse*0.75})`; ctx.lineWidth=1.8; ctx.setLineDash([5,5]); ctx.shadowColor='#8E44AD'; ctx.shadowBlur=8*pulse; ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*520,b.pos.y+Math.sin(a)*520); ctx.stroke(); ctx.setLineDash([]) }
  } else if (atk.type==='fire_line') {
    const lineA=atk.data.angle??0, len=850
    ctx.save()
    ctx.shadowColor='#FF6600'; ctx.shadowBlur=30*pulse
    ctx.strokeStyle=`rgba(255,${100+Math.round(progress*80)},0,${pulse*0.85})`; ctx.lineWidth=10+progress*14
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke()
    ctx.globalAlpha=0.18*pulse; ctx.strokeStyle='#FFAA00'; ctx.lineWidth=32+progress*20
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke()
    ctx.restore()
  } else if (atk.type==='lightning_barrage') {
    ctx.strokeStyle=`rgba(0,220,255,${pulse*0.9})`; ctx.lineWidth=2+progress*2; ctx.shadowColor='#00EEFF'; ctx.shadowBlur=16*pulse
    ctx.setLineDash([8,4]); ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,80*(0.5+0.5*progress),0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle=`rgba(0,200,255,${pulse*0.12})`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,80,0,Math.PI*2); ctx.fill()
  }
  void t
  ctx.restore()
}

function renderHazards(ctx: CanvasRenderingContext2D, g: GS) {
  const ZONE_COLORS: Record<string,[string,string]> = { poison:['#8E44AD','#5D1E7A'], fire:['#FF6600','#AA2200'], lightning:['#F1C40F','#8B6914'], web:['#6C3483','#3B1560'] }
  g.zones.forEach(zone => {
    const [bright,dark] = ZONE_COLORS[zone.type]??['#FFF','#888']
    const lp=zone.life/zone.maxLife, pulse=0.55+0.45*Math.sin(g.gtime*4+zone.id*1.3)
    ctx.save(); ctx.globalAlpha=Math.min(lp*2,0.85)*(0.7+0.3*pulse)
    const gr=ctx.createRadialGradient(zone.pos.x,zone.pos.y,0,zone.pos.x,zone.pos.y,zone.radius)
    gr.addColorStop(0,dark+'CC'); gr.addColorStop(0.6,bright+'44'); gr.addColorStop(1,bright+'00')
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(zone.pos.x,zone.pos.y,zone.radius,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=bright; ctx.lineWidth=1.5+pulse; ctx.globalAlpha=0.55*pulse*lp
    ctx.beginPath(); ctx.arc(zone.pos.x,zone.pos.y,zone.radius*(0.85+0.15*pulse),0,Math.PI*2); ctx.stroke()
    ctx.restore()
  })
}

function renderSlowTraps(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  g.slowTraps.forEach(trap => {
    const pulse = 0.5+0.5*Math.sin(t*5+trap.id)
    ctx.save(); ctx.globalAlpha=Math.min(1,trap.life*0.5)*(0.7+0.3*pulse)
    const col = trap.fromPlayer ? '#8E44AD' : '#27AE60'
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.shadowColor=col; ctx.shadowBlur=8
    ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(trap.pos.x,trap.pos.y,20,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    if (trap.fromPlayer) {
      ctx.globalAlpha*=0.7
      for (let i=0;i<6;i++) { const a=i/6*Math.PI*2+pulse*0.5; ctx.beginPath(); ctx.moveTo(trap.pos.x+Math.cos(a)*14,trap.pos.y+Math.sin(a)*14); ctx.lineTo(trap.pos.x+Math.cos(a)*22,trap.pos.y+Math.sin(a)*22); ctx.stroke() }
    }
    ctx.restore()
  })
}

function renderProjectiles(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.projectiles.forEach(proj => {
    ctx.save()
    if (proj.trail && proj.trail.length > 1) {
      for (let i=1;i<proj.trail.length;i++) {
        const a=(i/proj.trail.length)*0.5
        ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle=proj.color; ctx.lineWidth=(proj.isPowerShot?8:proj.isFireball?7:3)*(i/proj.trail.length)
        ctx.shadowColor=proj.color; ctx.shadowBlur=6
        ctx.beginPath(); ctx.moveTo(proj.trail[i-1].x,proj.trail[i-1].y); ctx.lineTo(proj.trail[i].x,proj.trail[i].y); ctx.stroke(); ctx.restore()
      }
    }
    ctx.shadowColor=proj.color; ctx.shadowBlur=proj.isPowerShot?28:proj.isFireball?24:proj.isLightning?20:12
    if (proj.isPowerShot) {
      const a = Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a)
      ctx.fillStyle='#F1C40F'; ctx.beginPath(); ctx.moveTo(-20,-5); ctx.lineTo(10,-5); ctx.lineTo(10,-10); ctx.lineTo(24,0); ctx.lineTo(10,10); ctx.lineTo(10,5); ctx.lineTo(-20,5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='#FFEE88'; ctx.lineWidth=1; ctx.stroke(); ctx.restore()
    } else if (proj.isFireball) {
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.arc(proj.pos.x,proj.pos.y,proj.radius,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,200,50,0.7)'; ctx.beginPath(); ctx.arc(proj.pos.x,proj.pos.y,proj.radius*0.5,0,Math.PI*2); ctx.fill()
    } else if (proj.isLightning) {
      const a2=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a2)
      ctx.strokeStyle='#7DFFB0'; ctx.lineWidth=3
      ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(0,-5); ctx.lineTo(5,0); ctx.lineTo(12,-4); ctx.lineTo(18,0); ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.arc(proj.pos.x,proj.pos.y,proj.radius,0,Math.PI*2); ctx.fill()
    }
    ctx.restore()
  })
}

function renderSkyArrows(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  g.skyArrows.forEach(arrow => {
    if (arrow.hit) return
    const prog = 1 - arrow.warnTimer / 1.8, pulse = 0.4+0.6*prog
    ctx.save()
    ctx.strokeStyle=`rgba(241,196,15,${pulse*0.9})`; ctx.lineWidth=3+prog*2
    ctx.shadowColor='#F1C40F'; ctx.shadowBlur=14
    ctx.beginPath(); ctx.arc(arrow.targetPos.x, arrow.targetPos.y, 45*(0.4+0.6*prog), 0, Math.PI*2); ctx.stroke()
    ctx.fillStyle=`rgba(241,196,15,${pulse*0.12})`; ctx.beginPath(); ctx.arc(arrow.targetPos.x,arrow.targetPos.y,45,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=`rgba(241,196,15,${pulse})`; ctx.lineWidth=3
    const iy = arrow.targetPos.y - 80 + prog*50
    ctx.beginPath(); ctx.moveTo(arrow.targetPos.x,iy); ctx.lineTo(arrow.targetPos.x,arrow.targetPos.y-50); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(arrow.targetPos.x-10,iy+15); ctx.lineTo(arrow.targetPos.x,iy); ctx.lineTo(arrow.targetPos.x+10,iy+15); ctx.stroke()
    ctx.restore()
    void t
  })
}

function renderParticles(ctx: CanvasRenderingContext2D, g: GS) {
  g.particles.forEach(pt => {
    const a=pt.life/pt.maxLife; ctx.save(); ctx.globalAlpha=a
    ctx.fillStyle=pt.color; ctx.shadowColor=pt.color; ctx.shadowBlur=4
    ctx.beginPath(); ctx.arc(pt.pos.x,pt.pos.y,pt.size*a,0,Math.PI*2); ctx.fill(); ctx.restore()
  })
}

function renderDamageNumbers(ctx: CanvasRenderingContext2D, g: GS) {
  g.damageNums.forEach(dn => {
    ctx.save(); ctx.globalAlpha=Math.min(1,dn.life*1.5)
    ctx.font=`${dn.isPlayer?16:14}px "Press Start 2P",monospace`
    ctx.fillStyle=dn.isPlayer?'#FF2222':'#FFFFFF'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.shadowColor=dn.isPlayer?'#FF0000':'#C89B3C'; ctx.shadowBlur=dn.isPlayer?14:7
    ctx.fillText(`-${dn.val}`,dn.pos.x,dn.pos.y); ctx.restore()
  })
  ctx.textBaseline='alphabetic'
}

function renderBossDeath(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId) {
  const b=g.boss, bossDef=BOSS_DEFS[bossId], totalDur=3.0, prog=Math.max(0,Math.min(1,1-g.bossDeathAnim/totalDur))
  const alpha = prog<0.5?1:Math.max(0,1-((prog-0.5)*2)**2)
  for (let ring=0;ring<6;ring++) {
    const rp=Math.max(0,Math.min(1,(prog-ring*0.15)/0.7)); if(rp<=0) continue
    const rr=rp*(280+ring*55), ra=(1-rp)*0.65
    ctx.save(); ctx.globalAlpha=ra; ctx.strokeStyle=ring%2===0?'#F1C40F':bossDef.color; ctx.lineWidth=5-ring*0.5; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=20
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,Math.max(0,rr),0,Math.PI*2); ctx.stroke(); ctx.restore()
  }
  if (prog<0.3) { ctx.save(); ctx.globalAlpha=(1-prog/0.3)*0.75; ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,WW,WH); ctx.restore() }
  if (alpha>0.02) {
    ctx.save(); ctx.translate(b.pos.x,b.pos.y); ctx.rotate(prog*Math.PI*12); const sc=Math.max(0.05,1-prog*0.93); ctx.scale(sc,sc); ctx.globalAlpha=alpha
    ctx.shadowColor=bossDef.color; ctx.shadowBlur=44+prog*30; ctx.fillStyle=prog<0.25&&Math.floor(g.gtime*28)%2===0?'#FFFFFF':bossDef.color
    ctx.beginPath(); ctx.arc(0,0,bossDef.size,0,Math.PI*2); ctx.fill()
    for (let i=0;i<8;i++) { const ca=i/8*Math.PI*2+prog*Math.PI*3, cd=prog*(110+i*22), ca2=(1-prog)*0.6; if(ca2<0.02) continue; ctx.save(); ctx.translate(Math.cos(ca)*cd,Math.sin(ca)*cd); ctx.globalAlpha=ca2; ctx.fillStyle=i%2===0?bossDef.color:'#F1C40F'; ctx.beginPath(); ctx.arc(0,0,Math.max(1,bossDef.size*0.22*(1-prog*0.7)),0,Math.PI*2); ctx.fill(); ctx.restore() }
    ctx.restore()
  }
  if (prog>0.5) {
    const ta=Math.min(1,(prog-0.5)*3); ctx.save(); ctx.globalAlpha=ta; ctx.font='22px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.shadowColor='#F1C40F'; ctx.shadowBlur=28; ctx.fillStyle='#F1C40F'; ctx.fillText('BOSS SLAIN',CW/2,CH/2-22)
    ctx.font='11px "Press Start 2P",monospace'; ctx.fillStyle=bossDef.color; ctx.shadowColor=bossDef.color; ctx.fillText(bossDef.name.toUpperCase()+' DEFEATED',CW/2,CH/2+18)
    ctx.restore()
  }
}

function renderHUD(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, bossDef: BossDef, gear: GearId[], t: number) {
  void gear
  const p=g.player, b=g.boss
  const barW=540,barH=22,barX=(CW-barW)/2,barY=14
  ctx.fillStyle='rgba(4,4,14,0.92)'; rrect(ctx,barX-12,barY-9,barW+24,barH+24,8); ctx.fill()
  ctx.strokeStyle='rgba(200,155,60,0.38)'; ctx.lineWidth=1.5; ctx.stroke()
  ctx.font='10px "Press Start 2P",monospace'; ctx.fillStyle='#C89B3C'; ctx.textAlign='center'; ctx.fillText(bossDef.name.toUpperCase(),CW/2,barY+2)
  ctx.fillStyle='#1a0808'; ctx.fillRect(barX,barY+7,barW,barH-7)
  const enX=barX+barW*bossDef.enrageAt; ctx.strokeStyle='#FF4444'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(enX,barY+4); ctx.lineTo(enX,barY+barH+2); ctx.stroke()
  const hpRat=b.hp/b.maxHp, hpCol=g.bossEnraged?'#FF1111':hpRat>0.6?'#E74C3C':hpRat>0.3?'#E67E22':'#FF4444'
  ctx.fillStyle=hpCol; ctx.fillRect(barX,barY+7,barW*hpRat,barH-7)
  if (g.bossEnraged) { const p2=0.5+0.5*Math.sin(t*6); ctx.fillStyle=`rgba(255,0,0,${p2*0.22})`; ctx.fillRect(barX,barY+7,barW*hpRat,barH-7); ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#FF4444'; ctx.textAlign='right'; ctx.fillText('ENRAGED',barX+barW-2,barY+barH+2) }
  if (b.stunTimer>0) { ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#F1C40F'; ctx.textAlign='left'; ctx.fillText('STUNNED',barX+2,barY+barH+2) }
  ctx.font='7px "Press Start 2P",monospace'; ctx.fillStyle='rgba(200,155,60,0.5)'; ctx.textAlign='center'
  ctx.fillText(`${Math.ceil(b.hp).toLocaleString()} / ${b.maxHp.toLocaleString()}`,CW/2,barY+barH+14)

  const pBW=200,pBH=14,pBX=14,pBY=CH-90
  ctx.fillStyle='rgba(4,4,14,0.92)'; rrect(ctx,pBX-6,pBY-20,pBW+12,pBH+36,8); ctx.fill()
  ctx.strokeStyle=`${wpn.color}66`; ctx.lineWidth=1.5; ctx.stroke()
  ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle=wpn.color; ctx.textAlign='left'; ctx.fillText(wpn.icon+' '+wpn.name.toUpperCase(),pBX,pBY-8)
  ctx.fillStyle='#1a0808'; ctx.fillRect(pBX,pBY,pBW,pBH)
  const ph=p.hp/p.maxHp; ctx.fillStyle=ph>0.5?'#27AE60':ph>0.25?'#F39C12':'#E74C3C'; ctx.fillRect(pBX,pBY,pBW*ph,pBH)
  ctx.font='8px "Press Start 2P",monospace'; ctx.fillStyle='#A09880'; ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`,pBX,pBY+pBH+12)

  const dCX=pBX+pBW+46, dBW=68, dBH=28, dBY=pBY-1
  const canD=p.dodgeChargeMode?p.featherCharges>0:p.dodgeCd<=0
  ctx.save()
  ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center'
  ctx.fillStyle=canD?'#C89B3C':'#3a3020'
  if (canD) { ctx.shadowColor='#C89B3C'; ctx.shadowBlur=8 }
  ctx.fillText('DODGE',dCX,dBY-3)
  ctx.shadowBlur=0
  if (canD) { ctx.shadowColor='#C89B3C'; ctx.shadowBlur=16 }
  ctx.fillStyle=canD?'#1e1608':'#090910'
  rrect(ctx,dCX-dBW/2,dBY,dBW,dBH,5); ctx.fill()
  ctx.strokeStyle=canD?'#C89B3C':'#2a2010'; ctx.lineWidth=canD?2:1; ctx.stroke()
  ctx.shadowBlur=0
  ctx.font='8px "Press Start 2P",monospace'
  ctx.fillStyle=canD?'#F1C40F':'#3a3020'
  ctx.fillText('SPACE',dCX,dBY+dBH/2+3)
  ctx.restore()
  if (!p.dodgeChargeMode && p.dodgeCd>0) {
    ctx.font='7px "Press Start 2P",monospace'; ctx.fillStyle='#E74C3C'; ctx.textAlign='center'
    ctx.fillText(p.dodgeCd.toFixed(1)+'s',dCX,dBY+dBH+11)
  }
  if (p.dodgeChargeMode) { for (let i=0;i<3;i++) { ctx.fillStyle=i<p.featherCharges?'#C89B3C':'rgba(200,155,60,0.18)'; ctx.beginPath(); ctx.arc(dCX-14+i*14,dBY+dBH+9,5,0,Math.PI*2); ctx.fill() } }

  const slW=52,slH=52,slY=CH-88, tsW=4*slW+3*6, slX=CW/2-tsW/2
  const kkeys=['Q','W','E','R']
  wpn.abilities.forEach((ab,i) => {
    const sx=slX+i*(slW+6), cdPct=p.abilityCds[i]/ab.cd, ready=cdPct<=0
    ctx.fillStyle='rgba(4,4,14,0.93)'; rrect(ctx,sx,slY,slW,slH,7); ctx.fill()
    ctx.strokeStyle=ready?`${wpn.color}CC`:'rgba(70,55,35,0.6)'; ctx.lineWidth=1.5; ctx.stroke()
    if (!ready) { ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.save(); ctx.beginPath(); rrect(ctx,sx,slY,slW,slH*cdPct,7); ctx.fill(); ctx.restore() }
    if (ready) { ctx.shadowColor=wpn.color; ctx.shadowBlur=9 } else ctx.shadowBlur=0
    ctx.font='13px "Press Start 2P",monospace'; ctx.fillStyle=ready?wpn.color:'#504030'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(kkeys[i],sx+slW/2,slY+18); ctx.shadowBlur=0
    ctx.font='6px "Press Start 2P",monospace'; ctx.fillStyle=ready?'#A09880':'#504030'; ctx.textBaseline='alphabetic'; ctx.fillText(ab.name,sx+slW/2,slY+slH-6)
    if (!ready) { ctx.font='10px "Press Start 2P",monospace'; ctx.fillStyle='#C89B3C'; ctx.textBaseline='middle'; ctx.fillText(Math.ceil(p.abilityCds[i]).toString(),sx+slW/2,slY+slH/2+4); ctx.textBaseline='alphabetic' }
  })
  ctx.textBaseline='alphabetic'; ctx.textAlign='left'

  let stX=14; const stY=CH-102
  if (g.rageActive) { ctx.font='9px "Press Start 2P",monospace'; ctx.fillStyle='#E74C3C'; ctx.fillText(`RAGE ${Math.ceil(g.rageTimer)}s`,stX,stY); stX+=88 }
  if (p.slowTimer>0) { ctx.fillStyle='#8BC8FF'; ctx.fillText(`SLOWED ${Math.ceil(p.slowTimer)}s`,stX,stY); stX+=98 }
  if (g.poisonTimer>0) { ctx.fillStyle='#7FBA00'; ctx.fillText(`POISON ${Math.ceil(g.poisonTimer)}s`,stX,stY) }
  void stX

  const mmX=CW-88,mmY=CH-72,mmW=78,mmH=60
  ctx.fillStyle='rgba(4,4,14,0.78)'; ctx.strokeStyle='rgba(200,155,60,0.25)'; ctx.lineWidth=1
  ctx.fillRect(mmX,mmY,mmW,mmH); ctx.strokeRect(mmX,mmY,mmW,mmH)
  const mx=(p.pos.x/WW)*mmW, my=(p.pos.y/WH)*mmH
  ctx.fillStyle=wpn.color; ctx.beginPath(); ctx.arc(mmX+mx,mmY+my,3,0,Math.PI*2); ctx.fill()
  const bx2=(g.boss.pos.x/WW)*mmW, by2=(g.boss.pos.y/WH)*mmH
  ctx.fillStyle='#E74C3C'; ctx.beginPath(); ctx.arc(mmX+bx2,mmY+by2,4,0,Math.PI*2); ctx.fill()
}

function render(ctx: CanvasRenderingContext2D, g: GS, wpn: WeaponDef, bossId: BossId, gear: GearId[], t: number) {
  ctx.save()
  if (g.screenShake>0.05) ctx.translate(rnd(-g.screenShake*8,g.screenShake*8),rnd(-g.screenShake*8,g.screenShake*8))
  const bossDef=BOSS_DEFS[bossId]
  ctx.save(); ctx.translate(-g.camX,-g.camY)
  renderArena(ctx,bossDef.arenaType,t,g)
  renderEnvObjects(ctx,g,bossDef.arenaType,t)
  if (g.phase==='dying') {
    renderParticles(ctx,g); renderBossDeath(ctx,g,bossId)
    renderPlayer(ctx,g,wpn,gear,t); renderDamageNumbers(ctx,g)
  } else {
    renderHazards(ctx,g); renderSlowTraps(ctx,g,t); renderTelegraph(ctx,g,bossId,t)
    renderSkyArrows(ctx,g,t); renderParticles(ctx,g); renderProjectiles(ctx,g,t)
    renderBoss(ctx,g,bossId,t); renderPlayer(ctx,g,wpn,gear,t); renderDamageNumbers(ctx,g)
  }
  ctx.restore()
  if (g.phase!=='dying') renderHUD(ctx,g,wpn,bossDef,gear,t)
  if (g.playerDmgFlash > 0) {
    const a = g.playerDmgFlash * 0.55
    const vgn = ctx.createRadialGradient(CW/2, CH/2, CH*0.08, CW/2, CH/2, CH*0.85)
    vgn.addColorStop(0, 'rgba(220,0,0,0)')
    vgn.addColorStop(1, `rgba(220,0,0,${a})`)
    ctx.fillStyle = vgn; ctx.fillRect(0, 0, CW, CH)
  }
  ctx.restore()
}
/* ═══ REACT COMPONENT ═══ */
export default function BossHunter() {
  const [screen, setScreen] = useState<'menu'|'hunt_select'|'playing'|'victory'|'defeat'>('menu')
  const [selWeapon, setSelWeapon] = useState<WeaponId>('bow')
  const [selBoss, setSelBoss] = useState<BossId>(0)
  const [unlockedGear, setUnlockedGear] = useState<GearId[]>([])
  const [equippedAttack, setEquippedAttack] = useState<GearId | null>(null)
  const [equippedDefense, setEquippedDefense] = useState<GearId | null>(null)
  const [victoryBoss, setVictoryBoss] = useState(0)
  const [lastUnlockedGear, setLastUnlockedGear] = useState<GearId | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playWrapRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const gsRef = useRef<GS|null>(null)
  const rafRef = useRef<number>(0)
  const mouseWorldRef = useRef<V2>({x:CW/2,y:CH/2})
  const lastTRef = useRef<number>(0)
  const pendingAbilityRef = useRef<number|null>(null)
  const pendingDodgeRef = useRef(false)

  const getWpn = useCallback((wid: WeaponId) => WEAPON_DEFS.find(w => w.id === wid)!, [])

  const startGame = useCallback((weaponId: WeaponId, bossId: BossId, gear: GearId[]) => {
    const wpn = getWpn(weaponId)
    const bossDef = BOSS_DEFS[bossId]
    gsRef.current = mkState(wpn, bossDef, gear)
    setScreen('playing')
  }, [getWpn])

  const toggleFullscreen = useCallback(() => {
    const el = playWrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    const fsEl = document.fullscreenElement || doc.webkitFullscreenElement
    if (!fsEl) {
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    }
  }, [])

  useEffect(() => {
    if (screen !== 'playing') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [screen])

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element }
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  const activeGear = useCallback((): GearId[] => [equippedAttack, equippedDefense].filter(Boolean) as GearId[], [equippedAttack, equippedDefense])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gearForBoss = useCallback((_bossId: BossId): GearId[] => activeGear(), [activeGear])

  useEffect(() => {
    if (screen !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const wpn = getWpn(selWeapon)

    const triggerDodge = () => {
      const g = gsRef.current; if (!g) return
      const p = g.player
      if (p.dodgeChargeMode ? p.featherCharges <= 0 : p.dodgeCd > 0) return
      if (p.dodgeTimer > 0) return
      const b = g.boss
      const dir = p.targetPos
        ? norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
        : norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
      p.dodgeTimer = DODGE_DUR; p.iframeTimer = IFRAME_DUR
      p.dodgeVel = v(dir.x * 480, dir.y * 480)
      if (p.dodgeChargeMode) {
        p.featherCharges = Math.max(0, p.featherCharges - 1)
        const slot = p.featherRecharge.findIndex(t => t <= 0)
        if (slot >= 0) p.featherRecharge[slot] = 5.0
      } else {
        p.dodgeCd = DODGE_CD
      }
    }

    const handleKey = (e: KeyboardEvent, dn: boolean) => {
      if (!dn) return
      if (e.repeat) return
      const g = gsRef.current; if (!g || g.phase !== 'playing') return
      if (e.code === 'Space') { e.preventDefault(); triggerDodge() }
      if (e.code === 'KeyQ') pendingAbilityRef.current = 0
      if (e.code === 'KeyW') pendingAbilityRef.current = 1
      if (e.code === 'KeyE') pendingAbilityRef.current = 2
      if (e.code === 'KeyR') pendingAbilityRef.current = 3
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const sx = (e.clientX - rect.left) * (CW / rect.width)
      const sy = (e.clientY - rect.top) * (CH / rect.height)
      const g = gsRef.current
      mouseWorldRef.current = g ? { x: sx + g.camX, y: sy + g.camY } : { x: sx, y: sy }
    }

    const handleClick = (e: MouseEvent) => {
      const g = gsRef.current; if (!g || g.phase !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const sx = (e.clientX - rect.left) * (CW / rect.width)
      const sy = (e.clientY - rect.top) * (CH / rect.height)
      g.player.targetPos = { x: sx + g.camX, y: sy + g.camY }
    }

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true)
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    lastTRef.current = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTRef.current) / 1000, 0.05)
      lastTRef.current = now
      const g = gsRef.current
      if (!g) { rafRef.current = requestAnimationFrame(loop); return }

      const pending = pendingAbilityRef.current
      pendingAbilityRef.current = null
      pendingDodgeRef.current = false

      tick(g, dt, wpn, selBoss, gearForBoss(selBoss), mouseWorldRef.current, new Set(), mouseWorldRef.current, pending)

      if (g.phase === 'victory') {
        setVictoryBoss(selBoss)
        const newGear = BOSS_DEFS[selBoss].rewards.filter(r => !unlockedGear.includes(r)) as GearId[]
        const toUnlock = newGear.length > 0 ? newGear[Math.floor(Math.random() * newGear.length)] : null
        if (toUnlock) setUnlockedGear(prev => [...prev, toUnlock])
        setLastUnlockedGear(toUnlock)
        setScreen('victory')
        return
      }
      if (g.phase === 'defeat') { setScreen('defeat'); return }

      render(ctx, g, wpn, selBoss, gearForBoss(selBoss), g.gtime)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [screen, selWeapon, selBoss, unlockedGear, equippedAttack, equippedDefense, getWpn, gearForBoss])

  // ─── MENU ───
  if (screen === 'menu') return (
    <div style={{background:'radial-gradient(ellipse at 50% 30%, #1a0830 0%, #080814 55%, #020208 100%)',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',position:'relative',overflow:'hidden'}}>
      <style>{`
        @keyframes bh-pulse{0%,100%{text-shadow:0 0 20px #C89B3C,0 0 40px #C89B3C55}50%{text-shadow:0 0 50px #C89B3C,0 0 100px #C89B3Caa,0 0 160px #C89B3C44}}
        @keyframes bh-float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
        @keyframes bh-flicker{0%,100%{opacity:1}91%{opacity:1}93%{opacity:0.2}95%{opacity:1}97%{opacity:0.4}99%{opacity:1}}
        @keyframes bh-star{0%,100%{opacity:0.1}50%{opacity:0.9}}
        @keyframes bh-btn{0%,100%{box-shadow:0 0 20px #C89B3C55,0 4px 20px rgba(0,0,0,0.6)}50%{box-shadow:0 0 48px #C89B3Ccc,0 4px 32px rgba(0,0,0,0.9)}}
        .bh-title-1{animation:bh-pulse 2.5s ease-in-out infinite}
        .bh-title-2{animation:bh-pulse 2.5s 0.4s ease-in-out infinite}
        .bh-begin{animation:bh-btn 2s ease-in-out infinite}
      `}</style>

      {Array.from({length:70},(_,i)=>(
        <div key={i} style={{position:'absolute',pointerEvents:'none',left:`${(i*37+i*i*3)%100}%`,top:`${(i*53+i*i*7)%100}%`,width:i%9===0?2:1,height:i%9===0?2:1,background:i%11===0?'#C89B3C':'#ffffff',borderRadius:'50%',animation:`bh-star ${1.4+(i%5)*0.6}s ${(i*0.17)%3}s ease-in-out infinite`}}/>
      ))}

      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(to bottom,transparent 49%,rgba(200,155,60,0.03) 50%,transparent 51%)',backgroundSize:'100% 4px',zIndex:0}}/>

      <div style={{position:'absolute',top:0,left:0,right:0,textAlign:'center',padding:'7px',fontSize:7,color:'#8B0000',borderBottom:'1px solid #8B000033',letterSpacing:2,animation:'bh-flicker 5s 1s infinite',zIndex:2}}>
        ⚠ WARNING — DANGEROUS BOSSES AHEAD — ENTER AT YOUR OWN RISK ⚠
      </div>

      <div style={{textAlign:'center',padding:'48px 24px 40px',position:'relative',zIndex:1,maxWidth:760,width:'100%'}}>

        <div style={{fontSize:8,color:'#6B3A9E',letterSpacing:4,marginBottom:20}}>◆ GARRET&apos;S WORLD PRESENTS ◆</div>

        <div className="bh-title-1" style={{fontSize:'48px',color:'#C89B3C',letterSpacing:4,lineHeight:1.1,marginBottom:6}}>BOSS</div>
        <div className="bh-title-2" style={{fontSize:'48px',color:'#C89B3C',letterSpacing:4,lineHeight:1.1,marginBottom:40}}>HUNTER</div>

        <div style={{display:'flex',gap:48,justifyContent:'center',marginBottom:44,alignItems:'flex-end'}}>
          {BOSS_DEFS.map((b,i)=>(
            <div key={i} style={{animation:`bh-float ${2.4+i*0.7}s ${i*0.5}s ease-in-out infinite`,textAlign:'center'}}>
              <div style={{fontSize:56,marginBottom:10,filter:`drop-shadow(0 0 20px ${b.color}) drop-shadow(0 0 40px ${b.color}66)`}}>{b.icon}</div>
              <div style={{fontSize:7,color:b.color,marginBottom:3,letterSpacing:1}}>{b.name}</div>
              <div style={{fontSize:6,color:'#3a3020'}}>{i===0?'SPIDER LAIR':i===1?'LAVA CAVERN':'STORM PEAK'}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',marginBottom:40,padding:'12px 20px',borderTop:'1px solid #1e1c18',borderBottom:'1px solid #1e1c18'}}>
          {([['🖱️','Click to move'],['SPACE','Dodge roll'],['Q W E R','Abilities'],['💀','Collect gear']] as [string,string][]).map(([k,v],i)=>(
            <div key={i} style={{fontSize:7,color:'#605848'}}><span style={{color:'#8a7a60'}}>{k}</span>&nbsp;{v}</div>
          ))}
        </div>

        {unlockedGear.length > 0 && (
          <div style={{fontSize:7,color:'#3a3020',marginBottom:24}}>
            GEAR COLLECTED: <span style={{color:'#C89B3C'}}>{unlockedGear.length}</span>
            {(equippedAttack||equippedDefense)&&<span style={{color:'#605848'}}> &bull; LOADOUT: {[equippedAttack,equippedDefense].filter(Boolean).map(g=>GEAR_DEFS[g!].icon).join(' ')}</span>}
          </div>
        )}

        <button className="bh-begin" onClick={()=>setScreen('hunt_select')} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'2px solid #C89B3C44',color:'#0d0d14',padding:'16px 56px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'"Press Start 2P",monospace',letterSpacing:3}}>
          ▶&nbsp;BEGIN HUNT
        </button>
      </div>
    </div>
  )

  // ─── PREPARE YOUR HUNT (carousel cards) ───
  if (screen === 'hunt_select') {
    const weaponIds: WeaponId[] = ['sword','bow','staff']
    const weaponIdx = weaponIds.indexOf(selWeapon)
    const selW = WEAPON_DEFS[weaponIdx]
    const selB = BOSS_DEFS[selBoss]

    const prevBoss = () => setSelBoss(((selBoss - 1 + 3) % 3) as BossId)
    const nextBoss = () => setSelBoss(((selBoss + 1) % 3) as BossId)
    const prevWeapon = () => setSelWeapon(weaponIds[(weaponIdx - 1 + 3) % 3])
    const nextWeapon = () => setSelWeapon(weaponIds[(weaponIdx + 1) % 3])

    const setGearItem = (gid: GearId | null) => {
      if (!gid) { setEquippedAttack(null); setEquippedDefense(null); return }
      if (GEAR_CATEGORY[gid] === 'attack') { setEquippedAttack(gid); setEquippedDefense(null) }
      else { setEquippedDefense(gid); setEquippedAttack(null) }
    }
    const currentGear = equippedAttack ?? equippedDefense ?? null
    const gearOptions: Array<GearId | null> = [null, ...unlockedGear]
    const gearIdx = Math.max(0, gearOptions.indexOf(currentGear))
    const prevGear = () => setGearItem(gearOptions[(gearIdx - 1 + gearOptions.length) % gearOptions.length])
    const nextGear = () => setGearItem(gearOptions[(gearIdx + 1) % gearOptions.length])

    const arenaNames = ['Spider Lair','Lava Cavern','Storm Peak']

    const navBtn = (onClick: ()=>void, label: string) => (
      <button onClick={onClick} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',width:36,height:36,borderRadius:'50%',fontSize:16,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,lineHeight:1}}>
        {label}
      </button>
    )

    const dots = (total: number, active: number, color: string) => (
      <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:10}}>
        {Array.from({length:total},(_,i)=>(
          <div key={i} style={{width:i===active?12:6,height:6,borderRadius:3,background:i===active?color:'#2a2820',transition:'all 0.2s'}}/>
        ))}
      </div>
    )

    return (
      <div style={{background:'#080814',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',padding:'24px 0'}}>
        <style>{`
          @keyframes bh-card-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          .bh-card-anim{animation:bh-card-in 0.18s ease}
        `}</style>
        <div style={{maxWidth:500,width:'100%',padding:'0 20px',textAlign:'center'}}>

          <div style={{fontSize:13,color:'#C89B3C',marginBottom:4}}>PREPARE YOUR HUNT</div>
          <div style={{fontSize:7,color:'#605848',marginBottom:24}}>Choose your quarry, arm yourself, and descend</div>

          {/* ── TARGET ── */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ TARGET</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {navBtn(prevBoss,'‹')}
              <div key={selBoss} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${selB.color}44`,borderRadius:12,overflow:'hidden'}}>
                <div style={{background:`radial-gradient(ellipse at 50% 80%, ${selB.color}30 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                  <div style={{fontSize:72,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 24px ${selB.color})`}}>{selB.icon}</div>
                  <div style={{fontSize:10,color:selB.color,marginBottom:4,letterSpacing:1}}>{selB.name.toUpperCase()}</div>
                  <div style={{fontSize:7,color:'#605848',marginBottom:10}}>{arenaNames[selBoss]} &bull; <span style={{color:selB.color}}>{selB.element}</span></div>
                  <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8,marginBottom:10,fontFamily:'"Press Start 2P",monospace'}}>{selB.lore.slice(0,72)}&hellip;</div>
                  <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                    <div style={{fontSize:7,color:'#605848'}}>HP <span style={{color:'#E74C3C'}}>{selB.hp.toLocaleString()}</span></div>
                    <div style={{fontSize:7,color:'#605848'}}>GEAR <span style={{color:'#C89B3C'}}>{selB.rewards.filter(r=>unlockedGear.includes(r)).length}/{selB.rewards.length}</span></div>
                  </div>
                </div>
                {dots(3, selBoss, selB.color)}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextBoss,'›')}
            </div>
          </div>

          {/* ── WEAPON ── */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ WEAPON</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {navBtn(prevWeapon,'‹')}
              <div key={selWeapon} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${selW.color}44`,borderRadius:12,overflow:'hidden'}}>
                <div style={{background:`radial-gradient(ellipse at 50% 80%, ${selW.color}28 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                  <div style={{fontSize:64,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 20px ${selW.color})`}}>{selW.icon}</div>
                  <div style={{fontSize:10,color:selW.color,marginBottom:4,letterSpacing:1}}>{selW.name.toUpperCase()}</div>
                  <div style={{fontSize:7,color:'#605848',marginBottom:10}}>{selW.element.toUpperCase()} &bull; DMG <span style={{color:'#C89B3C'}}>{selW.dmg}</span> &bull; RANGE <span style={{color:'#C89B3C'}}>{selW.range}</span></div>
                  <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8,marginBottom:10}}>{selW.desc.slice(0,64)}&hellip;</div>
                  <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                    {selW.abilities.map((ab,i)=>(
                      <div key={i} style={{fontSize:6,color:'#605848'}}><span style={{color:selW.color}}>[{['Q','W','E','R'][i]}]</span> {ab.name}</div>
                    ))}
                  </div>
                </div>
                {dots(3, weaponIdx, selW.color)}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextWeapon,'›')}
            </div>
          </div>

          {/* ── GEAR ── */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ GEAR</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {navBtn(prevGear,'‹')}
              <div key={currentGear??'none'} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${currentGear?'#C89B3C44':'#1e1c18'}`,borderRadius:12,overflow:'hidden'}}>
                {currentGear ? (() => {
                  const g = GEAR_DEFS[currentGear]
                  const cat = GEAR_CATEGORY[currentGear]
                  const gc = cat==='attack'?'#E74C3C':'#3498DB'
                  return (
                    <div style={{background:`radial-gradient(ellipse at 50% 80%, ${gc}22 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                      <div style={{fontSize:56,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 16px ${gc})`}}>{g.icon}</div>
                      <div style={{fontSize:9,color:'#E8E6E0',marginBottom:4}}>{g.name}</div>
                      <div style={{fontSize:6,color:gc,marginBottom:8,letterSpacing:1}}>{cat.toUpperCase()} GEAR</div>
                      <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8}}>{g.desc}</div>
                    </div>
                  )
                })() : (
                  <div style={{padding:'24px 16px',textAlign:'center'}}>
                    <div style={{fontSize:40,marginBottom:8,opacity:0.2}}>⬡</div>
                    <div style={{fontSize:8,color:'#3a3020',marginBottom:4}}>NO GEAR</div>
                    {unlockedGear.length===0
                      ? <div style={{fontSize:6,color:'#2a2820'}}>defeat a boss to unlock</div>
                      : <div style={{fontSize:6,color:'#2a2820'}}>navigate to equip</div>
                    }
                  </div>
                )}
                {dots(gearOptions.length, gearIdx, '#C89B3C')}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextGear,'›')}
            </div>
          </div>

          <div style={{borderTop:'1px solid #1e1c18',marginBottom:20}}/>

          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button onClick={()=>setScreen('menu')} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 24px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>BACK</button>
            <button onClick={()=>startGame(selWeapon,selBoss,gearForBoss(selBoss))} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'none',color:'#0d0d14',padding:'10px 32px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit',letterSpacing:1}}>
              ▶ START HUNT
            </button>
          </div>

        </div>
      </div>
    )
  }


  // ─── PLAYING ───
  if (screen === 'playing') return (
    <div ref={playWrapRef} style={{position:'fixed',inset:0,zIndex:9999,background:'#000',fontFamily:'"Press Start 2P",monospace'}}>
      <style>{`
        .bh-canvas{display:block;cursor:crosshair;max-width:100%;max-height:100%;object-fit:contain;}
      `}</style>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:0}}>
        <canvas ref={canvasRef} width={CW} height={CH} className="bh-canvas" />
      </div>
      <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6,zIndex:1}}>
        <button onClick={toggleFullscreen} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>{isFullscreen ? '⊠ WINDOW' : '⛶ FULLSCREEN'}</button>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setScreen('menu') }} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>✕ QUIT</button>
      </div>
    </div>
  )

  // ─── VICTORY ───
  if (screen === 'victory') {
    const boss = BOSS_DEFS[victoryBoss]
    const collectedCount = boss.rewards.filter(r => unlockedGear.includes(r)).length
    const allCollected = collectedCount === boss.rewards.length
    const remaining = boss.rewards.length - collectedCount
    return (
      <div style={{background:'#080814',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace'}}>
        <div className="bh-screen-wrap" style={{textAlign:'center',maxWidth:560,padding:'0 24px'}}>
          <div style={{fontSize:9,color:'#605848',marginBottom:12}}>HUNT COMPLETE</div>
          <div style={{fontSize:22,color:'#C89B3C',textShadow:'0 0 24px #C89B3C88',marginBottom:8}}>VICTORY!</div>
          <div style={{fontSize:10,color:boss.color,marginBottom:24}}>{boss.name} Defeated</div>
          <div style={{background:'#0d0d1a',border:'1px solid #2a2820',borderRadius:10,padding:20,marginBottom:16,textAlign:'left'}}>
            {lastUnlockedGear ? (() => {
              const gid = lastUnlockedGear
              const cat = GEAR_CATEGORY[gid]
              return <>
                <div style={{fontSize:8,color:'#C89B3C',marginBottom:4}}>GEAR UNLOCKED ({collectedCount} / {boss.rewards.length}):</div>
                <div style={{fontSize:7,color:'#605848',marginBottom:12}}>Equip in the loadout panel before your next hunt</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <span style={{fontSize:16}}>{GEAR_DEFS[gid].icon}</span>
                  <div>
                    <div style={{fontSize:8,color:'#E8E6E0',marginBottom:2}}>{GEAR_DEFS[gid].name} <span style={{fontSize:7,color:cat==='attack'?'#E74C3C':'#3498DB'}}>[{cat.toUpperCase()}]</span></div>
                    <div style={{fontSize:7,color:'#A09880'}}>{GEAR_DEFS[gid].desc}</div>
                  </div>
                </div>
              </>
            })() : (
              <>
                <div style={{fontSize:8,color:'#27AE60',marginBottom:4}}>ALL GEAR COLLECTED ({boss.rewards.length} / {boss.rewards.length}):</div>
                <div style={{fontSize:7,color:'#605848',marginBottom:12}}>You have everything this boss drops</div>
                {boss.rewards.map(gid => (
                  <div key={gid} style={{fontSize:7,color:'#27AE60',marginBottom:4}}>✓ {GEAR_DEFS[gid].icon} {GEAR_DEFS[gid].name}</div>
                ))}
              </>
            )}
          </div>
          {!allCollected && (
            <div style={{fontSize:7,color:'#A09880',marginBottom:16}}>
              {remaining} more {remaining === 1 ? 'reward' : 'rewards'} hidden — defeat {boss.name} again to claim {remaining === 1 ? 'it' : 'them'}
            </div>
          )}
          {victoryBoss < BOSS_DEFS.length - 1 && allCollected && (
            <div style={{fontSize:8,color:'#27AE60',marginBottom:20}}>
              Next hunt unlocked: {BOSS_DEFS[victoryBoss+1].name}!
            </div>
          )}
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={() => startGame(selWeapon, selBoss, gearForBoss(selBoss))} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>REMATCH</button>
            {victoryBoss < BOSS_DEFS.length - 1 && (
              <button onClick={() => setScreen('hunt_select')} style={{background:'linear-gradient(135deg,#27AE60,#1a6e3c)',border:'none',color:'#fff',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>
                NEXT HUNT
              </button>
            )}
            <button onClick={() => setScreen('menu')} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'none',color:'#0d0d14',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>MAIN MENU</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── DEFEAT ───
  return (
    <div style={{background:'#080814',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace'}}>
      <div className="bh-screen-wrap" style={{textAlign:'center',maxWidth:480,padding:'0 24px'}}>
        <div style={{fontSize:22,color:'#E74C3C',textShadow:'0 0 24px #E74C3C88',marginBottom:8}}>DEFEATED</div>
        <div style={{fontSize:9,color:'#605848',marginBottom:24}}>{BOSS_DEFS[selBoss].name} was too powerful...</div>
        <div style={{fontSize:8,color:'#A09880',marginBottom:28,lineHeight:'2'}}>
          Tip: Use gear from previous hunts to gain an edge.<br/>
          Watch the boss telegraph &mdash; the glowing circles warn of incoming attacks.
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={() => startGame(selWeapon, selBoss, gearForBoss(selBoss))} style={{background:'linear-gradient(135deg,#E74C3C,#922B21)',border:'none',color:'#fff',padding:'10px 24px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>TRY AGAIN</button>
          <button onClick={() => setScreen('menu')} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 20px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>MENU</button>
        </div>
      </div>
    </div>
  )
}

