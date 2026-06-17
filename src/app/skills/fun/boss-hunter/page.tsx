'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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

/* ═══ SOUND — synthesized Web Audio SFX (no asset files) ═══ */
const Sfx = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false
  const last: Record<string, number> = {}
  const VOL = 0.32
  function ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = muted ? 0 : VOL; master.connect(ctx.destination)
    }
    return ctx
  }
  function resume() { const c = ensure(); if (c && c.state === 'suspended') void c.resume() }
  function setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : VOL }
  function isMuted() { return muted }
  // returns the context if a sound may play (honours mute + per-key throttle)
  function ok(key?: string, ms?: number): AudioContext | null {
    const c = ensure(); if (!c || !master || muted) return null
    if (key && ms) { const now = c.currentTime * 1000; if (last[key] && now - last[key] < ms) return null; last[key] = now }
    return c
  }
  function blip(c: AudioContext, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.25))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(master!); o.start(t); o.stop(t + dur + 0.03)
  }
  function noise(c: AudioContext, dur: number, vol: number, filt: BiquadFilterType, freq: number, q = 1, slideTo?: number, delay = 0) {
    const t = c.currentTime + delay
    const n = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf
    const f = c.createBiquadFilter(); f.type = filt; f.frequency.setValueAtTime(freq, t); f.Q.value = q
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f); f.connect(g); g.connect(master!); src.start(t); src.stop(t + dur)
  }

  /* ═══ MUSIC — procedural chiptune tracks, scheduled on the AudioContext clock ═══ */
  let musicGain: GainNode | null = null
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let curTrack = '', mstep = 0, nextTime = 0
  function mnote(c: AudioContext, freq: number, time: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, time)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(vol, time + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + dur + 0.04)
  }
  function mkick(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, time); o.frequency.exponentialRampToValueAtTime(46, time + 0.11)
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.16)
    o.connect(g); g.connect(dest); o.start(time); o.stop(time + 0.18)
  }
  function mhat(c: AudioContext, time: number, dest: AudioNode, vol: number) {
    const n = Math.max(1, Math.floor(c.sampleRate * 0.04)); const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000
    const g = c.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    src.connect(f); f.connect(g); g.connect(dest); src.start(time); src.stop(time + 0.06)
  }
  const D2=73.42, E2=82.41, F2=87.31, G2=98, A2=110, Bb2=116.54, C3=130.81, D3=146.83, E3=164.81, G3=196, A3=220, Bb3=233.08, B3=246.94, C4=261.63, Cs4=277.18, D4=293.66, E4=329.63, F4=349.23, G4=392, A4=440, B4=493.88, C5=523.25, D5=587.33, E5=659.25, F5=698.46, Fs5=739.99, G5=783.99, A5=880
  type Voice = { steps: (number | null)[]; type: OscillatorType; vol: number; dur: number }
  type Trk = { stepDur: number; len: number; voices: Voice[]; kick: number[]; hat: number[] }
  const TRACKS: Record<string, Trk> = (() => {
    const T: Record<string, Trk> = {}
    // generic battle-band builder: section roots + per-section arp, 8 steps/section
    const band = (bpm: number, roots: number[], arps: number[][], o?: { bt?: OscillatorType; lt?: OscillatorType; lv?: number; heavy?: boolean }): Trk => {
      const len = roots.length * 8
      const bass: (number | null)[] = [], lead: (number | null)[] = [], pad: (number | null)[] = [], kick: number[] = [], hat: number[] = []
      for (let s = 0; s < len; s++) { const sec = Math.floor(s / 8), b = s % 8, ar = arps[sec]
        bass.push(b % 2 === 0 ? roots[sec] : (b === 5 ? roots[sec] : null)); lead.push(ar[b % ar.length]); pad.push(b === 0 ? roots[sec] * 2 : null)
        kick.push(o?.heavy ? ((b % 2 === 0) ? 1 : 0) : ((b === 0 || b === 4) ? 1 : 0)); hat.push(b % 2 === 1 ? 1 : 0) }
      return { stepDur: 60 / bpm / 2, len, voices: [{ steps: bass, type: o?.bt ?? 'sawtooth', vol: 0.26, dur: 0.2 }, { steps: lead, type: o?.lt ?? 'square', vol: o?.lv ?? 0.12, dur: 0.17 }, { steps: pad, type: 'triangle', vol: 0.1, dur: 1.7 }], kick, hat }
    }
    T.battle = band(144, [A2, F2, C3, G2], [[A4, C5, E5, C5], [F4, A4, C5, A4], [C5, E5, G5, E5], [G4, B3, D5, B3]])
    // SPIDER — eerie crawling D-minor
    T.battle_spider = band(126, [D2, Bb2, G2, A2], [[D4, F4, A4, F4], [Bb3, D4, F4, D4], [G3, Bb3, D4, Bb3], [A3, Cs4, E4, Cs4]], { lt: 'triangle', lv: 0.13 })
    // DRAKE — heavy pounding A-minor
    T.battle_drake = band(132, [A2, A2, F2, G2], [[A4, C5, E5, C5], [A4, E5, C5, E5], [F4, A4, C5, A4], [G4, B3, D5, B3]], { bt: 'sawtooth', heavy: true })
    // GRIFFIN — fast electric E-minor
    T.battle_griffin = band(158, [E3, C3, G2, D3], [[E5, G5, B4, G5], [C5, E5, G5, E5], [G4, B4, D5, B4], [D5, Fs5, A4, Fs5]], { lt: 'square', lv: 0.13 })
    // FINAL PHASE — frantic, double-time
    T.battle_final = band(170, [A2, A2, F2, E2], [[A4, C5, E5, A5], [A4, E5, C5, A5], [F4, A4, C5, F5], [E4, G4, B4, E5]], { heavy: true, lv: 0.14 })
    // MENU — slow ominous Am-F drone
    { const secBass = [A2, F2], secArp = [[A4, E5, C5, E5], [F4, C5, A4, C5]]
      const bass: (number | null)[] = [], lead: (number | null)[] = [], pad: (number | null)[] = []
      for (let s = 0; s < 16; s++) { const sec = Math.floor(s / 8), b = s % 8
        bass.push(b === 0 ? secBass[sec] : null); lead.push(b % 2 === 0 ? secArp[sec][(b / 2) % 4] : null); pad.push(b === 0 ? secBass[sec] * 1.5 : null) }
      T.menu = { stepDur: 60 / 76 / 2, len: 16, voices: [{ steps: bass, type: 'triangle', vol: 0.2, dur: 3.2 }, { steps: lead, type: 'sine', vol: 0.1, dur: 0.95 }, { steps: pad, type: 'sawtooth', vol: 0.045, dur: 3.2 }], kick: new Array(16).fill(0), hat: new Array(16).fill(0) } }
    // VICTORY — bright C-major fanfare loop
    { const arp = [C4, E4, G4, C5, E5, G5, E5, C5], bassN = [C3, C3, G2, G2, A3, A3, F2, G2]
      const bass: (number | null)[] = [], lead: (number | null)[] = [], kick: number[] = [], hat: number[] = []
      for (let s = 0; s < 16; s++) { const b = s % 8; lead.push(arp[s % 8]); bass.push(b % 2 === 0 ? bassN[s % 8] : null); kick.push(b % 2 === 0 ? 1 : 0); hat.push(b % 2 === 1 ? 1 : 0) }
      T.victory = { stepDur: 60 / 120 / 2, len: 16, voices: [{ steps: bass, type: 'sawtooth', vol: 0.2, dur: 0.22 }, { steps: lead, type: 'square', vol: 0.14, dur: 0.18 }], kick, hat } }
    // DEFEAT — somber descending minor
    { const mel = [A4, null, G4, null, F4, null, E4, null, D4, null, E4, null, C4, null, null, null], bass = [A2, null, null, null, F2, null, null, null, D3, null, null, null, E3, null, null, null]
      T.defeat = { stepDur: 60 / 64 / 2, len: 16, voices: [{ steps: bass, type: 'triangle', vol: 0.18, dur: 2.4 }, { steps: mel, type: 'sine', vol: 0.1, dur: 1.0 }], kick: new Array(16).fill(0), hat: new Array(16).fill(0) } }
    return T
  })()
  function playStep(tr: Trk, s: number, time: number) {
    if (!musicGain || !ctx) return
    for (const v of tr.voices) { const f = v.steps[s]; if (f) mnote(ctx, f, time, v.dur, v.type, v.vol, musicGain) }
    if (tr.kick[s]) mkick(ctx, time, musicGain, 0.55); if (tr.hat[s]) mhat(ctx, time, musicGain, 0.16)
  }
  function schedule() {
    const c = ctx; if (!c || !musicGain || !curTrack) return
    if (c.state !== 'running') { nextTime = c.currentTime; return }
    const tr = TRACKS[curTrack]; if (!tr) return
    while (nextTime < c.currentTime + 0.12) { playStep(tr, mstep % tr.len, nextTime); nextTime += tr.stepDur; mstep++ }
  }
  function playMusic(name: string) {
    const c = ensure(); if (!c || !master) return
    if (curTrack === name) return
    curTrack = name; mstep = 0; nextTime = c.currentTime
    if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = 0; musicGain.connect(master) }
    const now = c.currentTime
    musicGain.gain.cancelScheduledValues(now); musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now); musicGain.gain.linearRampToValueAtTime(1.25, now + 0.8)
    if (!musicTimer) musicTimer = setInterval(schedule, 25)
  }
  function stopMusic() {
    curTrack = ''
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null }
    if (musicGain && ctx) { const now = ctx.currentTime; musicGain.gain.cancelScheduledValues(now); musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now); musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.5) }
  }

  return {
    resume, setMuted, isMuted, playMusic, stopMusic,
    uiClick() { const c = ok('ui', 30); if (!c) return; blip(c, 660, 0.06, 'square', 0.12, 880) },
    heartbeat() { const c = ok('hb', 680); if (!c) return; blip(c, 72, 0.12, 'sine', 0.3, 54); blip(c, 64, 0.14, 'sine', 0.26, 48, 0.17) },
    swing() { const c = ok('swing', 60); if (!c) return; noise(c, 0.14, 0.5, 'bandpass', 1400, 0.8, 600); blip(c, 220, 0.1, 'triangle', 0.18, 120) },
    shot() { const c = ok('shot', 45); if (!c) return; blip(c, 900, 0.12, 'triangle', 0.22, 260); noise(c, 0.05, 0.3, 'highpass', 2200) },
    cast() { const c = ok('cast', 50); if (!c) return; blip(c, 420, 0.18, 'sine', 0.2, 760); blip(c, 630, 0.18, 'sine', 0.12, 1140) },
    bossHit() { const c = ok('bhit', 35); if (!c) return; blip(c, 180, 0.09, 'square', 0.18, 90); noise(c, 0.05, 0.25, 'lowpass', 900) },
    crit() { const c = ok('crit', 55); if (!c) return; blip(c, 520, 0.14, 'square', 0.24, 1000); blip(c, 880, 0.12, 'sawtooth', 0.16, 1500, 0.02); noise(c, 0.08, 0.3, 'highpass', 3000) },
    hurt() { const c = ok('hurt', 70); if (!c) return; blip(c, 150, 0.22, 'sawtooth', 0.3, 70); noise(c, 0.12, 0.35, 'lowpass', 700, 1, 200) },
    dodge() { const c = ok('dodge', 80); if (!c) return; noise(c, 0.22, 0.4, 'bandpass', 700, 1.2, 2400) },
    warn() { const c = ok('warn', 90); if (!c) return; blip(c, 700, 0.1, 'square', 0.15); blip(c, 700, 0.1, 'square', 0.13, undefined, 0.12) },
    warnBig() { const c = ok('warnB', 90); if (!c) return; blip(c, 340, 0.2, 'sawtooth', 0.22, 300); blip(c, 250, 0.26, 'sawtooth', 0.2, 210, 0.16); noise(c, 0.3, 0.12, 'lowpass', 500, 1, 220, 0.05) },
    roar() { const c = ok('roar', 200); if (!c) return; blip(c, 140, 0.6, 'sawtooth', 0.3, 60); blip(c, 90, 0.7, 'square', 0.18, 48); noise(c, 0.6, 0.25, 'lowpass', 600, 0.7, 180) },
    death() { const c = ok('death', 200); if (!c) return; blip(c, 240, 0.9, 'sawtooth', 0.32, 40); blip(c, 120, 1.0, 'square', 0.22, 30); noise(c, 0.9, 0.3, 'lowpass', 800, 1, 80) },
    tooClose() { const c = ok('tc', 480); if (!c) return; blip(c, 320, 0.06, 'square', 0.1, 200) },
    summon() { const c = ok('summon', 120); if (!c) return; blip(c, 300, 0.3, 'sawtooth', 0.18, 520); blip(c, 200, 0.34, 'square', 0.14, 360, 0.04); noise(c, 0.25, 0.16, 'bandpass', 1200, 1.4, 600) },
    minionDeath() { const c = ok('mdeath', 40); if (!c) return; blip(c, 380, 0.12, 'square', 0.16, 120); noise(c, 0.08, 0.2, 'highpass', 1800) },
    phaseShift() { const c = ok('phase', 200); if (!c) return; blip(c, 160, 0.7, 'sawtooth', 0.32, 70); blip(c, 320, 0.5, 'square', 0.18, 540, 0.05); noise(c, 0.6, 0.28, 'lowpass', 900, 0.8, 200) },
    gust() { const c = ok('gust', 110); if (!c) return; noise(c, 0.32, 0.3, 'bandpass', 900, 0.7, 2600); blip(c, 600, 0.18, 'sine', 0.08, 1200) },
    playerDeath() { const c = ok('pdeath', 500); if (!c) return; blip(c, 220, 1.3, 'sawtooth', 0.34, 28); blip(c, 95, 1.5, 'square', 0.22, 22, 0.06); noise(c, 1.1, 0.3, 'lowpass', 480, 1, 60); blip(c, 70, 0.5, 'sine', 0.32, 48); blip(c, 70, 0.5, 'sine', 0.3, 48, 0.6) },
    fireCast() { const c = ok('fcast', 50); if (!c) return; blip(c, 200, 0.22, 'sawtooth', 0.14, 560); noise(c, 0.22, 0.2, 'bandpass', 1500, 0.7, 3400) },
    firebolt() { const c = ok('fbolt', 45); if (!c) return; blip(c, 520, 0.14, 'sawtooth', 0.18, 200); noise(c, 0.12, 0.2, 'bandpass', 1900, 0.7, 600) },
    fireball() { const c = ok('fball', 70); if (!c) return; blip(c, 300, 0.32, 'sawtooth', 0.24, 90); blip(c, 150, 0.36, 'square', 0.16, 70, 0.04); noise(c, 0.3, 0.3, 'lowpass', 1300, 0.8, 380) },
    explosion() { const c = ok('expl', 55); if (!c) return; blip(c, 120, 0.4, 'sawtooth', 0.3, 38); noise(c, 0.35, 0.34, 'lowpass', 950, 1, 130); blip(c, 70, 0.5, 'sine', 0.22, 30, 0.02) },
    meteorCast() { const c = ok('mcast', 200); if (!c) return; blip(c, 90, 0.7, 'sawtooth', 0.2, 230); noise(c, 0.7, 0.16, 'bandpass', 700, 0.6, 1700) },
    meteorImpact() { const c = ok('mimp', 150); if (!c) return; blip(c, 150, 0.8, 'sawtooth', 0.34, 28); blip(c, 60, 1.0, 'square', 0.26, 22, 0.04); noise(c, 0.8, 0.4, 'lowpass', 820, 1, 80) },
    ability() { const c = ok('abil', 40); if (!c) return; blip(c, 520, 0.2, 'sine', 0.2, 980); blip(c, 780, 0.2, 'triangle', 0.12, 1400) },
    victory() { const c = ok('vic', 300); if (!c) return;[523, 659, 784, 1047].forEach((f, i) => blip(c, f, 0.22, 'triangle', 0.22, undefined, i * 0.12)) },
    loot() { const c = ok('loot', 120); if (!c) return; blip(c, 880, 0.1, 'triangle', 0.18, 1320); blip(c, 1320, 0.12, 'sine', 0.14, undefined, 0.08) },
  }
})()

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
  isPowerShot?: boolean; isFireball?: boolean; isLightning?: boolean; isFeather?: boolean; isVenom?: boolean; isArrow?: boolean; isArcane?: boolean; isFirebolt?: boolean
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
interface AttackFlash { angle: number; timer: number; maxTimer: number; type: 'slash' | 'slam' | 'shot' | 'magic' | 'shadow' | 'power_shot' | 'greatslash'; color: string }
interface SkyArrow { id: number; targetPos: V2; warnTimer: number; hit: boolean; dmg: number; kind?: 'arrow' | 'meteor' }
interface EnvObject { type: 'rock' | 'bone' | 'skull' | 'web' | 'ruin' | 'crystal' | 'nest' | 'claw'; pos: V2; size: number; angle: number; variant: number }
interface Minion { id: number; pos: V2; vel: V2; hp: number; maxHp: number; hitFlash: number; atkCd: number; legPhase: number; spawnAnim: number }
interface GS {
  phase: 'playing' | 'dying' | 'player_dying' | 'victory' | 'defeat'
  player: PlayerState; boss: BossState
  projectiles: Projectile[]; bossAttack: BossAttack | null; nextAttackTimer: number
  damageNums: DamageNumber[]; particles: Particle[]; slowTraps: SlowTrap[]; zones: HazardZone[]
  attackFlash: AttackFlash | null; screenShake: number; bossDeathAnim: number; playerDeathAnim: number
  meleeHit: { timer: number; maxTimer: number; dmg: number; reach: number; arc: number; angle: number; hit: boolean; proc: boolean } | null
  lavaParticles: Particle[]; skyArrows: SkyArrow[]; envObjects: EnvObject[]
  nextProjId: number; nextDmgId: number; nextPartId: number; nextTrapId: number; nextZoneId: number
  gtime: number; bossEnraged: boolean; poisonTimer: number; playerDmgFlash: number; tooCloseFlash: number
  chainHits: number; chainResetTimer: number
  rageActive: boolean; rageTimer: number
  bullChargeDash: { active: boolean; vel: V2; timer: number }
  whirlwindActive: boolean; whirlwindTimer: number
  camX: number; camY: number
  webProcAnim: { timer: number; pos: V2 } | null
  bossFlightAngle: number; bossFlightSpeed: number
  bossFlightRadius: number; bossFlightCenter: V2
  griffinState: { mode: number; timer: number; dive: V2; shotT: number }
  bossFleeTimer: number
  tailWhipCd: number
  snakeTrail: Array<{x: number; y: number}>
  minions: Minion[]; nextMinionId: number
  bossDesperate: boolean; phaseBanner: { text: string; sub: string; timer: number } | null
  sigTimer: number
  mageCircle: number
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
  walkPhase: number; moving: boolean
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
    dmg: 20, range: 540, atkCd: 0.82,
    desc: 'Glass-cannon artillery. Longest range in the game but fragile — weak basics, devastating spells. Survive on positioning and range.',
    abilities: [
      { key: 'Q', name: 'Arcane Bolt', desc: 'Fast arcane missile — 115 dmg toward cursor', cd: 5 },
      { key: 'W', name: 'Mana Shield', desc: '1.5s full invulnerability bubble', cd: 14 },
      { key: 'E', name: 'Arcane Surge', desc: 'Blink toward cursor and erupt — 100 dmg nova on arrival', cd: 8 },
      { key: 'R', name: 'Meteor', desc: 'Giant meteor — 270 dmg in 110px AOE at cursor', cd: 22 },
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
  web_amulet:    { id: 'web_amulet',    name: 'Web Armour',          icon: '🕸️', desc: 'Webbed plating — reduces incoming damage by 35%, plus 15% chance on hit to web-stun the boss 2s' },
  drake_sword:   { id: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️', desc: '+35% damage. 15% chance to stun boss on hit' },
  fire_staff:    { id: 'fire_staff',    name: 'Fire Staff',          icon: '🔥', desc: 'Q fires a Fireball — 110px AOE explosion, 115 dmg' },
  ember_armor:   { id: 'ember_armor',   name: 'Ember Armour',        icon: '🛡️', desc: 'Reduces all incoming damage by 25%' },
  thunder_blade: { id: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡', desc: 'Every 3rd hit unleashes a lightning strike (+80 bonus dmg)' },
  storm_bow:     { id: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️', desc: 'Arrows are lightning bolts — AOE on impact (40px, 30 dmg)' },
  feather_boots: { id: 'feather_boots', name: 'Feather Armour',      icon: '🪶', desc: 'Reduces all incoming damage by 25%' },
}
const GEAR_CATEGORY: Record<GearId, 'attack' | 'defense'> = {
  spider_fang: 'attack', venom_bow: 'attack', web_amulet: 'defense',
  drake_sword: 'attack', fire_staff: 'attack', ember_armor: 'defense',
  thunder_blade: 'attack', storm_bow: 'attack', feather_boots: 'defense',
}

/* ═══ WEAPON SELECT (base weapons + unlocked weapon rewards) ═══ */
interface LoadoutWeapon { id: string; base: WeaponId; gear: GearId | null; unlock: GearId | null; name: string; icon: string; color: string; sub: string }
const LOADOUT_WEAPONS: LoadoutWeapon[] = [
  { id: 'sword',         base: 'sword', gear: null,            unlock: null,            name: 'Starter Sword',       icon: '⚔️', color: '#E74C3C', sub: 'Melee • balanced' },
  { id: 'bow',           base: 'bow',   gear: null,            unlock: null,            name: 'Starter Bow',         icon: '🏹', color: '#2ECC71', sub: 'Ranged • precise' },
  { id: 'staff',         base: 'staff', gear: null,            unlock: null,            name: 'Starter Staff',       icon: '🔮', color: '#9B59B6', sub: 'Ranged • arcane' },
  { id: 'spider_fang',   base: 'sword', gear: 'spider_fang',   unlock: 'spider_fang',   name: 'Spider Fang Daggers', icon: '🗡️', color: '#8E44AD', sub: 'Melee • +40% attack speed' },
  { id: 'venom_bow',     base: 'bow',   gear: 'venom_bow',     unlock: 'venom_bow',     name: 'Venom Bow',           icon: '🏹', color: '#8E44AD', sub: 'Ranged • poison DoT' },
  { id: 'drake_sword',   base: 'sword', gear: 'drake_sword',   unlock: 'drake_sword',   name: 'Drake Greatsword',    icon: '⚔️', color: '#E67E22', sub: 'Melee • +35% dmg, stun' },
  { id: 'fire_staff',    base: 'staff', gear: 'fire_staff',    unlock: 'fire_staff',    name: 'Fire Staff',          icon: '🔥', color: '#E67E22', sub: 'Ranged • fireball Q' },
  { id: 'thunder_blade', base: 'sword', gear: 'thunder_blade', unlock: 'thunder_blade', name: 'Thunder Blade',       icon: '⚡', color: '#F1C40F', sub: 'Melee • lightning every 3rd hit' },
  { id: 'storm_bow',     base: 'bow',   gear: 'storm_bow',     unlock: 'storm_bow',     name: 'Storm Bow',           icon: '🌩️', color: '#F1C40F', sub: 'Ranged • AOE lightning bolts' },
]
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
  void gear
  const featherMode = false   // armours no longer grant dash charges; all dodges share one cooldown
  const sx = WW / 2, sy = WH - 250
  // weapon-path durability: melee tankiest, bow balanced, magic glass cannon
  const baseHp = wpn.id === 'sword' ? 180 : wpn.id === 'staff' ? 110 : 150
  return {
    phase: 'playing',
    player: {
      pos: v(sx, sy), vel: v(0, 0), targetPos: null,
      hp: baseHp, maxHp: baseHp, atkTimer: 0,
      iframeTimer: 0, dodgeTimer: 0, dodgeCd: 0, dodgeVel: v(0, 0), dodgeTrail: [],
      hitFlash: 0, abilityCds: [0, 0, 0, 0], slowTimer: 0, knockbackVel: v(0, 0),
      featherCharges: featherMode ? 3 : 1, featherRecharge: featherMode ? [0, 0, 0] : [0],
      webTrapPlaced: false, dodgeChargeMode: featherMode, facing: -Math.PI / 2,
      gearHitCount: 0, webProcCd: 0, shadowDashTrail: [],
      walkPhase: 0, moving: false,
    },
    boss: {
      pos: v(WW / 2, 350), hp: boss.hp, maxHp: boss.hp,
      stunTimer: 0, slowTimer: 0, reflectDmg: 0,
      angle: Math.PI / 2, legPhase: 0, spinePulse: 0, lightningPhase: 0, hitFlash: 0,
    },
    projectiles: [], bossAttack: null, nextAttackTimer: 3.5,
    damageNums: [], particles: [], slowTraps: [], zones: [],
    attackFlash: null, screenShake: 0, bossDeathAnim: 0, playerDeathAnim: 0, meleeHit: null,
    lavaParticles: [], skyArrows: [], envObjects: generateEnvObjects(boss.id),
    nextProjId: 0, nextDmgId: 0, nextPartId: 0, nextTrapId: 0, nextZoneId: 0,
    gtime: 0, bossEnraged: false, poisonTimer: 0, playerDmgFlash: 0, tooCloseFlash: 0,
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
    minions: [], nextMinionId: 0,
    bossDesperate: false, phaseBanner: null,
    sigTimer: 0,
    mageCircle: 0,
    griffinState: { mode: 0, timer: 3.0, dive: v(1, 0), shotT: 0 },
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
  // weapon-path defense: melee tanky, bow neutral, magic glass cannon (takes extra)
  if (wpn.id === 'sword') fd = Math.round(fd * 0.80)
  else if (wpn.id === 'staff') fd = Math.round(fd * 1.20)
  if (gear.includes('web_amulet')) fd = Math.round(fd * 0.65)
  else if (gear.includes('ember_armor') || gear.includes('feather_boots')) fd = Math.round(fd * 0.75)
  p.hp = Math.max(0, p.hp - fd)
  p.hitFlash = 0.40; p.iframeTimer = 0.5
  g.playerDmgFlash = 0.70
  if (knockDir && wpn.id !== 'sword') p.knockbackVel = v(knockDir.x * 160, knockDir.y * 160)
  spawnParticles(g, p.pos, 8, '#FF4444', 110)
  Sfx.hurt()
  g.screenShake = Math.max(g.screenShake, 0.32)
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-20, 20), y: p.pos.y - 20 }, val: Math.round(fd), life: 1.2, isPlayer: true })
  if (p.hp <= 0) killPlayer(g)
}

function spawnZone(g: GS, pos: V2, type: HazardZone['type'], radius: number, dps: number, life: number) {
  g.zones.push({ id: ++g.nextZoneId, pos: { ...pos }, radius, type, dps, life, maxLife: life })
}

function explodeFireball(g: GS, pos: V2) {
  spawnZone(g, { ...pos }, 'fire', 66, 13, 2.2)
  spawnParticles(g, pos, 18, '#FF5500', 230); spawnParticles(g, pos, 8, '#FFCC33', 150)
  g.screenShake = Math.max(g.screenShake, 0.35)
}

function killPlayer(g: GS) {
  if (g.phase !== 'playing') return
  g.phase = 'player_dying'
  g.playerDeathAnim = 2.6
  g.bossAttack = null
  g.screenShake = 1.4
  spawnParticles(g, g.player.pos, 46, '#E74C3C', 380, 1.3)
  spawnParticles(g, g.player.pos, 20, '#FFFFFF', 480, 0.9)
  spawnParticles(g, g.player.pos, 14, '#8B0000', 200, 1.6)
  Sfx.playerDeath(); Sfx.roar()
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
      Sfx.crit()
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
  Sfx.bossHit()
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: b.pos.x + rnd(-30, 30), y: b.pos.y - 50 }, val: Math.round(dmg), life: 1.0, isPlayer: false })
  spawnParticles(g, b.pos, 4, '#FFFFFF', 80)
}

const MINION_CAP = 7
function spawnSpiderlings(g: GS, count: number) {
  const b = g.boss
  for (let i = 0; i < count; i++) {
    if (g.minions.length >= MINION_CAP) break
    const a = rnd(0, Math.PI * 2), d = rnd(30, 70)
    g.minions.push({
      id: ++g.nextMinionId,
      pos: v(clamp(b.pos.x + Math.cos(a) * d, 40, WW - 40), clamp(b.pos.y + Math.sin(a) * d, 40, WH - 40)),
      vel: v(0, 0), hp: 55, maxHp: 55, hitFlash: 0, atkCd: rnd(0.3, 0.9), legPhase: rnd(0, 6.28), spawnAnim: 0.45,
    })
    spawnParticles(g, g.minions[g.minions.length - 1].pos, 8, '#8E44AD', 130, 0.5)
  }
  Sfx.summon()
}
function fireFeatherVolley(g: GS, count: number, speed: number, dmg: number, phaseOffset: number) {
  const b = g.boss
  for (let i = 0; i < count; i++) {
    const a = phaseOffset + (i / count) * Math.PI * 2
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * speed, Math.sin(a) * speed), dmg, radius: 8, fromBoss: true, life: 4.0, color: '#cfe9ff', isFeather: true, trail: [] })
  }
  spawnParticles(g, b.pos, 10, '#9fc0ff', 150, 0.4)
  Sfx.gust()
}
function dealDmgToMinion(g: GS, m: Minion, dmg: number) {
  m.hp = Math.max(0, m.hp - dmg); m.hitFlash = 0.12
  Sfx.bossHit()
  g.damageNums.push({ id: ++g.nextDmgId, pos: { x: m.pos.x + rnd(-10, 10), y: m.pos.y - 16 }, val: Math.round(dmg), life: 0.8, isPlayer: false })
  if (m.hp <= 0) { spawnParticles(g, m.pos, 14, '#8E44AD', 180, 0.6); Sfx.minionDeath() }
}

/* ═══ BOSS AI ═══ */
function selectBossAttack(bossId: BossId, enraged: boolean, desperate: boolean, d2p: number): string {
  if (bossId === 0) {
    // ── SPIDER QUEEN — escalating stages ──
    const pool = d2p < 150 ? ['leg_sweep', 'venom_spit', 'web_spray', 'toxic_cloud', 'summon', 'web_wall'] : ['venom_spit', 'toxic_cloud', 'web_spray', 'web_shot', 'leg_sweep', 'summon', 'web_wall', 'spider_charge']
    if (enraged) pool.push('spider_leap', 'venom_burst', 'web_spray', 'summon', 'spider_charge', 'web_burst', 'venom_geyser')   // stage 2 unlocks burst patterns
    if (desperate) pool.push('web_burst', 'venom_geyser', 'spider_leap', 'venom_burst', 'summon')   // stage 3: the lair turns lethal
    return pool[rndI(0, pool.length - 1)]
  }
  if (bossId === 1) {
    // ── LAVA DRAKE — escalating stages ──
    const pool = d2p < 150 ? ['stomp', 'tail_swipe', 'tail_slam', 'fire_breath', 'fire_line'] : ['fire_breath', 'flame_wave', 'fire_line', 'stomp', 'fireball', 'tail_slam', 'lava_puddle']
    if (enraged) pool.push('ember_barrage', 'fireball', 'lava_puddle', 'magma_geyser', 'fire_fan')   // stage 2 unlocks eruptions
    if (desperate) pool.push('magma_geyser', 'fire_fan', 'flame_wave', 'fireball', 'ember_barrage')   // stage 3: relentless fire
    return pool[rndI(0, pool.length - 1)]
  }
  // ── STORM GRIFFIN — escalating stages ──
  const pool = d2p < 160 ? ['talon_dive', 'wind_buffet', 'dive_bomb', 'lightning_strike', 'lightning_barrage'] : ['lightning_strike', 'chain_lightning', 'wind_blade', 'lightning_barrage', 'dive_bomb', 'wind_buffet', 'static_field']
  if (enraged) pool.push('thunderstorm', 'wind_blade', 'chain_lightning', 'gale_ring', 'thunder_cross')   // stage 2 unlocks storm patterns
  if (desperate) pool.push('gale_ring', 'thunder_cross', 'thunderstorm', 'lightning_barrage', 'wind_blade')   // stage 3: the full tempest
  return pool[rndI(0, pool.length - 1)]
}

function startBossAttack(g: GS, bossId: BossId, type: string) {
  const p = g.player, b = g.boss
  const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
  const telegraphs: Record<string, number> = {
    venom_spit: 0.95, web_shot: 0.95, web_spray: 0.95, leg_sweep: 1.0, spider_leap: 1.15, toxic_cloud: 0.95, venom_burst: 1.2, summon: 1.05, web_wall: 1.15, spider_charge: 1.0, web_burst: 1.0, venom_geyser: 1.2,
    fire_breath: 1.2, stomp: 0.95, tail_swipe: 0.95, ember_barrage: 0.95, flame_wave: 1.05, lava_puddle: 0.95, fire_line: 1.5,
    fireball: 1.05, tail_slam: 1.0, magma_geyser: 1.2, fire_fan: 1.0, gale_ring: 1.05, thunder_cross: 1.35,
    lightning_strike: 1.05, talon_dive: 1.0, wind_buffet: 0.95, thunderstorm: 1.0, static_field: 0.95, chain_lightning: 1.0, lightning_barrage: 0.95,
    wind_blade: 1.0, dive_bomb: 1.05,
  }
  const data: AttackData = { targetPos: { ...p.pos }, angle, dmg: 0 }
  if (type === 'venom_spit') { data.dmg = 15; data.count = 3; data.projSpeed = 260 }
  else if (type === 'web_shot') { data.dmg = 12; data.projSpeed = 160 }
  else if (type === 'leg_sweep') { data.dmg = 22; data.coneAngle = Math.PI; data.coneRange = 160; data.angle = angle }
  else if (type === 'spider_leap') { data.dmg = 36; data.radius = 130 }
  else if (type === 'toxic_cloud') { data.dmg = 0; data.count = 3 }
  else if (type === 'venom_burst') { data.dmg = 38; data.radius = 180 }
  else if (type === 'summon') { data.count = g.bossDesperate ? 4 : 3 }
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
  else if (type === 'fireball') { data.dmg = 22; data.count = g.bossEnraged ? 3 : 2; data.projSpeed = 235; data.angle = angle }
  else if (type === 'tail_slam') { data.dmg = 34; data.radius = 200; data.targetPos = { ...b.pos } }
  else if (type === 'wind_blade') { data.dmg = 16; data.count = g.bossEnraged ? 6 : 5; data.projSpeed = 330; data.angle = angle }
  else if (type === 'dive_bomb') { data.dmg = 36; data.radius = 130 }
  else if (type === 'web_wall') { data.dmg = 0; data.angle = b.angle + Math.PI / 2 }
  else if (type === 'spider_charge') { data.dmg = 30; data.angle = angle }
  else if (type === 'magma_geyser') { data.dmg = 26; data.radius = 122; data.targetPos = { ...p.pos } }
  else if (type === 'fire_fan') { data.dmg = 22; data.count = g.bossEnraged ? 7 : 5; data.projSpeed = 215; data.angle = angle }
  else if (type === 'gale_ring') { data.dmg = 16; data.count = g.bossEnraged ? 14 : 11; data.projSpeed = 250 }
  else if (type === 'thunder_cross') { data.dmg = 24; data.angle = angle }
  else if (type === 'web_burst') { data.dmg = 12; data.count = g.bossEnraged ? 14 : 11; data.projSpeed = 205 }
  else if (type === 'venom_geyser') { data.dmg = 0; data.radius = 120; data.targetPos = { ...p.pos } }
  g.bossAttack = { type, telegraphTime: telegraphs[type] ?? 1.0, elapsed: 0, active: false, data }
  // ── telegraph: audio warning + charge-up burst (readability/fairness) ──
  const BIG_ATTACKS = ['spider_leap', 'venom_burst', 'fire_line', 'flame_wave', 'fire_breath', 'lava_puddle', 'lightning_barrage', 'thunderstorm', 'meteor', 'talon_dive', 'fireball', 'tail_slam', 'dive_bomb', 'spider_charge', 'magma_geyser', 'thunder_cross', 'gale_ring', 'venom_geyser', 'web_burst']
  if (BIG_ATTACKS.includes(type)) Sfx.warnBig(); else Sfx.warn()
  const chargeCol = bossId === 0 ? '#B370E0' : bossId === 1 ? '#FF7A1A' : '#5fe6ff'
  spawnParticles(g, b.pos, BIG_ATTACKS.includes(type) ? 16 : 9, chargeCol, 70, (telegraphs[type] ?? 1.0) * 0.7)
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
  } else if (type === 'fireball') {
    // Drake: slow aimed fireballs that explode into a lingering fire pool on impact
    const count = d.count ?? 2, baseA = d.angle ?? Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const a = baseA + (i - (count - 1) / 2) * 0.16
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 235), Math.sin(a) * (d.projSpeed ?? 235)), dmg: d.dmg ?? 22, radius: 14, fromBoss: true, life: 3.2, color: '#FF6600', isFireball: true, aoe: 70, trail: [] })
    }
    spawnParticles(g, b.pos, 12, '#FF7700', 150)
  } else if (type === 'wind_blade') {
    // Griffin: a fan of fast crescent wind blades — sidestep the gaps
    const count = d.count ?? 5, baseA = d.angle ?? Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) {
      const a = baseA + (i - (count - 1) / 2) * 0.20
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 330), Math.sin(a) * (d.projSpeed ?? 330)), dmg: d.dmg ?? 16, radius: 9, fromBoss: true, life: 4.0, color: '#bfe4ff', isFeather: true, trail: [] })
    }
    Sfx.gust()
  } else if (type === 'tail_slam') {
    // Drake: heavy radial slam around her body — knockback + scattered embers
    const r = d.radius ?? 200
    if (dist(p.pos, b.pos) <= r) { dealDmgToPlayer(g, d.dmg ?? 34, wpn, gear, toPlayer); p.knockbackVel = v(toPlayer.x * 300, toPlayer.y * 300) }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * r * 0.7, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * r * 0.7, 80, WH - 80)), 'fire', 50, 12, 2.5) }
    spawnParticles(g, b.pos, 30, '#FF6600', 320); g.screenShake = Math.max(g.screenShake, 0.8)
  } else if (type === 'dive_bomb') {
    // Griffin: a targeted crashing strike — walk out of the marked zone
    const target = d.targetPos!, r = d.radius ?? 130
    if (dist(p.pos, target) <= r) dealDmgToPlayer(g, d.dmg ?? 36, wpn, gear, norm(v(p.pos.x - target.x, p.pos.y - target.y)))
    spawnParticles(g, target, 26, '#5fe6ff', 280); g.screenShake = Math.max(g.screenShake, 0.55)
  } else if (type === 'magma_geyser') {
    // Drake: a ring of lava geysers erupts around the player — sprint to the centre or out of the band
    const target = d.targetPos!, r = d.radius ?? 122
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, zx = clamp(target.x + Math.cos(a) * r, 80, WW - 80), zy = clamp(target.y + Math.sin(a) * r, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'fire', 50, 16, 2.6); spawnParticles(g, v(zx, zy), 9, '#FF6600', 220, 0.8) }
    g.screenShake = Math.max(g.screenShake, 0.6); Sfx.explosion()
  } else if (type === 'fire_fan') {
    // Drake: a wide sweeping fan of slow exploding fireballs
    const count = d.count ?? 5, baseA = d.angle ?? Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x)
    for (let i = 0; i < count; i++) { const a = baseA + (i - (count - 1) / 2) * 0.27
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * (d.projSpeed ?? 215), Math.sin(a) * (d.projSpeed ?? 215)), dmg: d.dmg ?? 22, radius: 13, fromBoss: true, life: 3.4, color: '#FF6600', isFireball: true, aoe: 60, trail: [] }) }
    spawnParticles(g, b.pos, 14, '#FF7700', 170); Sfx.fireball()
  } else if (type === 'gale_ring') {
    // Griffin: a full-circle burst of wind blades — thread the gaps
    fireFeatherVolley(g, d.count ?? 11, d.projSpeed ?? 250, d.dmg ?? 16, g.gtime)
    fireFeatherVolley(g, Math.round((d.count ?? 11) / 2), (d.projSpeed ?? 250) * 0.7, d.dmg ?? 16, g.gtime + 0.3)   // inner slower ring
    g.screenShake = Math.max(g.screenShake, 0.45)
  } else if (type === 'thunder_cross') {
    // Griffin: a crackling cross of lightning carves the arena
    const a0 = d.angle ?? 0
    for (const la of [a0, a0 + Math.PI / 2]) for (let i = 0; i < 14; i++) { const t2 = (i / 13) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(la) * 760 * t2, 80, WW - 80), zy = clamp(b.pos.y + Math.sin(la) * 760 * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'lightning', 52, 18, 3.0); if (i % 3 === 0) spawnParticles(g, v(zx, zy), 4, '#00EEFF', 150, 0.5) }
    g.screenShake = Math.max(g.screenShake, 0.7); Sfx.explosion()
  } else if (type === 'web_burst') {
    // Spider: a full-circle spray of sticky web bolts — thread the gaps or get rooted
    const count = d.count ?? 11, sp = d.projSpeed ?? 205, off = g.gtime
    for (let i = 0; i < count; i++) { const a = off + i / count * Math.PI * 2
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(Math.cos(a) * sp, Math.sin(a) * sp), dmg: d.dmg ?? 12, radius: 11, fromBoss: true, life: 5.0, color: '#8E44AD', isWeb: true }) }
    spawnParticles(g, b.pos, 16, '#8E44AD', 170); g.screenShake = Math.max(g.screenShake, 0.4); Sfx.summon()
  } else if (type === 'venom_geyser') {
    // Spider: a ring of venom geysers erupts around the player — flee to the centre or out of the band
    const target = d.targetPos!, r = d.radius ?? 120
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, zx = clamp(target.x + Math.cos(a) * r, 80, WW - 80), zy = clamp(target.y + Math.sin(a) * r, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'poison', 50, 13, 3.0); spawnParticles(g, v(zx, zy), 9, '#8E44AD', 200, 0.8) }
    g.screenShake = Math.max(g.screenShake, 0.55)
  } else if (type === 'web_wall') {
    // Spider: weaves a wall of sticky web across the arena — slows and chips on contact
    const lineAngle = d.angle ?? 0, lineLen = 760, lineCount = 16
    for (let i = 0; i < lineCount; i++) {
      const t2 = (i / (lineCount - 1)) * 2 - 1
      const zx = clamp(b.pos.x + Math.cos(lineAngle) * lineLen * t2, 80, WW - 80)
      const zy = clamp(b.pos.y + Math.sin(lineAngle) * lineLen * t2, 80, WH - 80)
      spawnZone(g, v(zx, zy), 'web', 50, 8, 4.5)
      if (i % 3 === 0) spawnParticles(g, v(zx, zy), 4, '#8E44AD', 90, 0.6)
    }
  } else if (type === 'spider_charge') {
    // Spider: a fast lunge along a lane — sidestep out of the path
    const a = d.angle ?? 0, dirL = v(Math.cos(a), Math.sin(a)), lunge = 300, sz = BOSS_DEFS[bossId].size
    const rel = v(p.pos.x - b.pos.x, p.pos.y - b.pos.y)
    const along = rel.x * dirL.x + rel.y * dirL.y
    const perpSigned = -rel.x * dirL.y + rel.y * dirL.x
    if (along > -30 && along < lunge + sz && Math.abs(perpSigned) < sz + 26) {
      const sgn = perpSigned >= 0 ? 1 : -1
      const pushDir = norm(v(-dirL.y * sgn, dirL.x * sgn))
      dealDmgToPlayer(g, d.dmg ?? 30, wpn, gear, pushDir)
      if (wpn.id !== 'sword') p.knockbackVel = v(pushDir.x * 280, pushDir.y * 280)
    }
    b.pos.x = clamp(b.pos.x + dirL.x * lunge, 90, WW - 90); b.pos.y = clamp(b.pos.y + dirL.y * lunge, 90, WH - 90)
    spawnParticles(g, b.pos, 18, '#8E44AD', 240); g.screenShake = Math.max(g.screenShake, 0.5)
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
  } else if (type === 'summon') {
    spawnSpiderlings(g, d.count ?? 3)
    g.screenShake = Math.max(g.screenShake, 0.3)
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
  if (g.phase !== 'playing' && g.phase !== 'dying' && g.phase !== 'player_dying') return
  const p = g.player, b = g.boss, bossDef = BOSS_DEFS[bossId]

  if (g.phase === 'player_dying') {
    g.gtime += dt; g.playerDeathAnim -= dt; g.screenShake = Math.max(0, g.screenShake - dt * 0.8)
    // rising soul embers drifting up from the fallen hunter
    if (Math.random() < dt * 24) {
      const ox = rnd(-22, 22)
      spawnParticles(g, v(p.pos.x + ox, p.pos.y + rnd(-10, 10)), 1, ['#E74C3C', '#8B0000', '#FFFFFF', '#C0392B'][rndI(0, 3)], rnd(20, 90), rnd(0.8, 1.8))
    }
    g.particles = g.particles.filter(pt => { pt.life -= dt; pt.pos.x += pt.vel.x * dt; pt.pos.y += pt.vel.y * dt - 16 * dt; pt.vel.x *= Math.pow(0.2, dt); pt.vel.y *= Math.pow(0.2, dt); return pt.life > 0 })
    g.damageNums = g.damageNums.filter(d2 => { d2.life -= dt; d2.pos.y -= 28 * dt; return d2.life > 0 })
    if (g.playerDeathAnim <= 0) g.phase = 'defeat'
    return
  }

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
  g.screenShake = Math.max(0, g.screenShake - dt * 3); g.nextAttackTimer = Math.max(0, g.nextAttackTimer - dt * (g.bossDesperate ? 1.55 : 1))
  g.playerDmgFlash = Math.max(0, g.playerDmgFlash - dt * 2.8)
  g.tooCloseFlash = Math.max(0, g.tooCloseFlash - dt * 2.0)
  g.mageCircle = Math.max(0, g.mageCircle - dt)
  if (p.hp > 0 && p.hp / p.maxHp < 0.25) Sfx.heartbeat()   // critical-HP heartbeat (throttled)
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
      g.minions.forEach(m => { if (m.hp > 0 && dist(m.pos, arrow.targetPos) < 80) dealDmgToMinion(g, m, arrow.dmg) })
      if (arrow.kind === 'meteor') {
        // huge fiery impact — shockwave, scattered lava, burning crater
        spawnParticles(g, arrow.targetPos, 34, '#FF4500', 360, 0.9); spawnParticles(g, arrow.targetPos, 16, '#FFD24A', 230)
        spawnParticles(g, arrow.targetPos, 10, '#5a4a44', 90, 1.5)   // smoke
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; spawnParticles(g, v(arrow.targetPos.x + Math.cos(a) * 50, arrow.targetPos.y + Math.sin(a) * 50), 2, '#FF6A1A', 240, 0.7) }
        spawnZone(g, arrow.targetPos, 'fire', 78, 16, 2.8)
        g.screenShake = Math.max(g.screenShake, 1.0); Sfx.meteorImpact()
      } else {
        spawnParticles(g, arrow.targetPos, 20, '#F1C40F', 260, 0.75); g.screenShake = Math.max(g.screenShake, 0.4)
      }
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
    else { if (dist(p.pos, b.pos) < 110) { b.hp = Math.max(0, b.hp - 65 * dt); spawnParticles(g, b.pos, 2, '#E74C3C', 100) }
      g.minions.forEach(m => { if (m.hp > 0 && dist(p.pos, m.pos) < 110) { m.hp = Math.max(0, m.hp - 90 * dt); if (m.hp <= 0) { spawnParticles(g, m.pos, 12, '#8E44AD', 170); Sfx.minionDeath() } } }) }
  }

  // Player movement
  const speedMult = (p.slowTimer > 0 ? 0.45 : 1) * (wpn.id === 'staff' ? 1.15 : 1)   // mages get a small kiting bonus
  const speed = 170 * speedMult
  p.moving = false
  if (!p.dodgeTimer && !g.bullChargeDash.active && !g.whirlwindActive && p.targetPos) {
    const d2t = dist(p.pos, p.targetPos)
    if (d2t > 4) {
      const dir = norm(v(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y))
      const ms = speed * dt
      p.pos.x = clamp(p.pos.x + dir.x * Math.min(ms, d2t), 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * Math.min(ms, d2t), 20, WH - 20)
      p.moving = true; p.walkPhase += dt * 14
    } else { p.targetPos = null }
  }
  if (p.dodgeTimer > 0 || g.bullChargeDash.active) { p.moving = true; p.walkPhase += dt * 20 }

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

  // Auto-attack — weapon rules: ranged needs spacing, melee reach varies by weapon
  const dToBoss = dist(p.pos, b.pos)
  const wid = getWeaponId(wpn, gear)
  const isRangedAtk = wpn.id !== 'sword' && !gear.includes('spider_fang')
  // melee reach per weapon: dagger short, sword balanced, greatsword long+wide, thunder mid
  const meleeReach = wid === 'dagger' ? 70 : wid === 'greatsword' ? 160 : wid === 'thunder_sword' ? 108 : 100
  const meleeArc = wid === 'greatsword' ? 2.0 : wid === 'dagger' ? 1.2 : 1.6   // swing cone half-width *2
  const weaponReach = isRangedAtk ? wpn.range : meleeReach
  // target the nearest threat: boss by default, or a closer spiderling if one is swarming
  let tgtMinion: Minion | null = null, tgtDist = dToBoss
  for (const m of g.minions) { if (m.hp <= 0) continue; const dm = dist(p.pos, m.pos); if (dm < tgtDist) { tgtDist = dm; tgtMinion = m } }
  const tgtPos = tgtMinion ? tgtMinion.pos : b.pos
  const tgtSize = tgtMinion ? 16 : bossDef.size
  const atkRange = weaponReach + tgtSize
  // ranged weapons cannot fire at point-blank — must keep a gap beyond the boss body (not vs small minions)
  const minRange = (isRangedAtk && !tgtMinion) ? bossDef.size + 72 : 0
  let atkCd = wpn.atkCd
  if (gear.includes('spider_fang')) atkCd *= 0.6
  const flashColor = gear.includes('fire_staff') ? '#FF4500' : gear.includes('venom_bow') ? '#8E44AD' : gear.includes('storm_bow') ? '#7DFFB0' : wpn.color
  if (p.atkTimer <= 0 && !p.dodgeTimer && !g.bullChargeDash.active) {
    if (isRangedAtk && !tgtMinion && dToBoss < minRange && dToBoss <= atkRange) {
      // too close to fire — flash a warning and nudge a soft "miss" click
      g.tooCloseFlash = 0.55; Sfx.tooClose(); p.atkTimer = 0.18
    } else if (tgtDist <= atkRange && tgtDist >= minRange) {
      p.atkTimer = atkCd
      const atkAngle = Math.atan2(tgtPos.y - p.pos.y, tgtPos.x - p.pos.x)
      const flashType = wid === 'greatsword' ? 'greatslash' : (wid === 'dagger' || wid === 'sword' || wid === 'thunder_sword') ? 'slash' : isRangedAtk ? 'shot' : 'slam'
      const flashDur = wid === 'greatsword' ? 0.34 : wid === 'sword' ? 0.28 : wid === 'thunder_sword' ? 0.24 : 0.22
      g.attackFlash = { angle: atkAngle, timer: flashDur, maxTimer: flashDur, type: flashType, color: flashColor }
      if (gear.includes('venom_bow') && g.poisonTimer <= 0) g.poisonTimer = 5.0
      if (isRangedAtk) {
        const dir = v(Math.cos(atkAngle), Math.sin(atkAngle))
        const isStorm = gear.includes('storm_bow')
        const isVenom = gear.includes('venom_bow')
        const isFireStaff = gear.includes('fire_staff')
        const isFirebolt = isFireStaff
        const isArcane = wpn.id === 'staff' && !isFireStaff
        const projColor = isFireStaff ? '#FF6A1A' : wpn.id === 'staff' ? '#9B59B6' : isVenom ? '#9B59B6' : isStorm ? '#7DFFB0' : '#27AE60'
        const isArrow = wpn.id === 'bow' && !isStorm && !isVenom
        const projSpeed = wpn.id === 'staff' ? 420 : 440
        g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * projSpeed, dir.y * projSpeed), dmg: wpn.dmg, radius: isFirebolt ? 7 : isArcane ? 8 : 6, fromBoss: false, life: 4.0, color: projColor, aoe: isStorm ? 40 : undefined, isLightning: isStorm, isVenom, isArrow, isArcane, isFirebolt, trail: [] })
        if (wpn.id === 'staff') g.mageCircle = Math.max(g.mageCircle, 0.4)
        if (isFireStaff) Sfx.firebolt(); else if (wpn.id === 'staff') Sfx.cast(); else Sfx.shot()
      } else {
        // melee: damage is deferred — it only lands when the blade sweeps through the target (see meleeHit)
        g.meleeHit = { timer: flashDur, maxTimer: flashDur, dmg: wpn.dmg, reach: meleeReach, arc: meleeArc, angle: atkAngle, hit: false, proc: gear.includes('thunder_blade') && (p.gearHitCount % 3) === 2 }
        Sfx.swing()
      }
    }
  }

  // Melee contact — damage lands only when the swinging blade actually touches the target
  if (g.meleeHit) {
    const mh = g.meleeHit
    mh.timer = Math.max(0, mh.timer - dt)
    const sp = 1 - mh.timer / mh.maxTimer
    if (!mh.hit && sp >= 0.28 && sp <= 0.74) {
      const reaches = (pos: V2, size: number) => {
        if (dist(p.pos, pos) > mh.reach + size) return false
        let da = Math.abs(Math.atan2(pos.y - p.pos.y, pos.x - p.pos.x) - mh.angle)
        while (da > Math.PI) da = Math.abs(da - Math.PI * 2)
        return da <= mh.arc / 2
      }
      let landed = false
      if (reaches(b.pos, bossDef.size)) {
        dealDmgToBoss(g, mh.dmg, gear)
        spawnParticles(g, v(p.pos.x + Math.cos(mh.angle) * mh.reach * 0.6, p.pos.y + Math.sin(mh.angle) * mh.reach * 0.6), 6, '#FFFFFF', 110)
        landed = true
      }
      for (const m of g.minions) { if (m.hp > 0 && reaches(m.pos, 16)) { dealDmgToMinion(g, m, mh.dmg); landed = true } }
      if (landed) mh.hit = true
    }
    if (mh.timer <= 0) g.meleeHit = null
  }

  // Ability activation
  if (pendingAbility !== null && pendingAbility >= 0 && pendingAbility < 4) {
    const idx = pendingAbility, abDef = wpn.abilities[idx]
    if (p.abilityCds[idx] <= 0) { p.abilityCds[idx] = abDef.cd; activateAbility(g, idx, wpn, gear, abilityTarget, bossId) }
  }

  // Boss movement
  if (g.bossFlightSpeed > 0 && b.stunTimer <= 0) {
    // ── STORM GRIFFIN — aerial predator: orbit, telegraphed swoop dives, and a hovering lightning barrage ──
    const gs = g.griffinState
    // orbit centre drifts slowly toward the player (loose, so it keeps its distance)
    const trackRate = Math.min(1, dt * 1.1)
    g.bossFlightCenter.x += (p.pos.x - g.bossFlightCenter.x) * trackRate
    g.bossFlightCenter.y += (p.pos.y - g.bossFlightCenter.y) * trackRate
    g.bossFlightCenter.x = clamp(g.bossFlightCenter.x, 150, WW - 150)
    g.bossFlightCenter.y = clamp(g.bossFlightCenter.y, 130, WH - 130)
    gs.timer -= dt
    if (gs.mode === 2) {
      // SWOOP DIVE — a committed dash along the PRE-LOCKED line (just step off it)
      const spd = g.bossEnraged ? 520 : 440
      b.pos.x = clamp(b.pos.x + gs.dive.x * spd * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + gs.dive.y * spd * dt, 80, WH - 80)
      if (dist(b.pos, p.pos) < bossDef.size + 14 && p.iframeTimer <= 0) { dealDmgToPlayer(g, g.bossEnraged ? 20 : 15, wpn, gear, gs.dive); spawnParticles(g, p.pos, 12, '#5fe6ff', 240) }
      if (gs.timer <= 0) { gs.mode = 0; gs.timer = rnd(3.4, 5.0) / (g.bossDesperate ? 1.4 : g.bossEnraged ? 1.2 : 1.0); g.bossFlightAngle = Math.atan2(b.pos.y - g.bossFlightCenter.y, b.pos.x - g.bossFlightCenter.x) }
    } else if (gs.mode === 1) {
      // WIND-UP — the dive line is LOCKED on entry; griffin just rises/pulls back so you can read & sidestep it
      const away = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y))
      b.pos.x = clamp(b.pos.x + away.x * 60 * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + away.y * 60 * dt - 32 * dt, 80, WH - 80)
      if (gs.timer <= 0) { gs.mode = 2; gs.timer = g.bossEnraged ? 0.72 : 0.85; Sfx.gust(); g.screenShake = Math.max(g.screenShake, 0.22) }
    } else if (gs.mode === 3) {
      // HOVER & BARRAGE — nearly stationary, rains aimed lightning bolts at the player
      const toC = v(g.bossFlightCenter.x - b.pos.x, g.bossFlightCenter.y - b.pos.y)
      b.pos.x = clamp(b.pos.x + toC.x * 0.5 * dt, 80, WW - 80)
      b.pos.y = clamp(b.pos.y + toC.y * 0.5 * dt + Math.sin(g.gtime * 2.4) * 10 * dt, 80, WH - 80)
      gs.shotT -= dt
      if (gs.shotT <= 0) {
        gs.shotT = g.bossEnraged ? 0.5 : 0.62
        const dir = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        g.projectiles.push({ id: ++g.nextProjId, pos: { ...b.pos }, vel: v(dir.x * 330, dir.y * 330), dmg: g.bossEnraged ? 15 : 11, radius: 8, fromBoss: true, life: 4.0, color: '#00EEFF', isLightning: true, trail: [] })
        spawnParticles(g, b.pos, 6, '#7DFFB0', 150); Sfx.shot()
      }
      if (gs.timer <= 0) { gs.mode = 0; gs.timer = rnd(3.4, 5.0) / (g.bossDesperate ? 1.4 : g.bossEnraged ? 1.2 : 1.0); g.bossFlightAngle = Math.atan2(b.pos.y - g.bossFlightCenter.y, b.pos.x - g.bossFlightCenter.x) }
    } else {
      // DYNAMIC ORBIT — gentle breathing radius, mild speed variation, occasional direction flips + vertical bob
      const dir = Math.sin(g.gtime * 0.4) >= 0 ? 1 : -1
      const breathe = 1 + 0.28 * Math.sin(g.gtime * 0.8)
      const spd = g.bossFlightSpeed * (g.bossEnraged ? 1.2 : 0.9) * (b.slowTimer > 0 ? 0.3 : 1.0) * (1 + 0.25 * Math.sin(g.gtime * 1.1))
      g.bossFlightAngle += spd * dir * dt
      const r = g.bossFlightRadius * breathe, fc = g.bossFlightCenter
      b.pos.x = clamp(fc.x + Math.cos(g.bossFlightAngle) * r, 80, WW - 80)
      b.pos.y = clamp(fc.y + Math.sin(g.bossFlightAngle) * r * 0.6 + Math.sin(g.gtime * 2.4) * 14, 80, WH - 80)
      if (gs.timer <= 0) {
        if (Math.random() < 0.5) {   // ── hover & barrage ──
          gs.mode = 3; gs.timer = g.bossEnraged ? 3.4 : 2.8; gs.shotT = 0.45
          spawnParticles(g, b.pos, 16, '#00EEFF', 200); Sfx.warn()
        } else {                      // ── swoop dive: lock the line NOW ──
          gs.mode = 1; gs.timer = g.bossEnraged ? 0.85 : 1.05
          gs.dive = norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y))
        }
      }
    }
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
  if (g.phaseBanner) { g.phaseBanner.timer -= dt; if (g.phaseBanner.timer <= 0) g.phaseBanner = null }

  // ── Spiderling minions: swarm the player, separate from each other, contact-damage ──
  if (g.minions.length) {
    const mspeed = (g.bossDesperate ? 152 : g.bossEnraged ? 132 : 110)
    g.minions = g.minions.filter(m => {
      if (m.hp <= 0) return false
      if (m.spawnAnim > 0) m.spawnAnim = Math.max(0, m.spawnAnim - dt)
      m.hitFlash = Math.max(0, m.hitFlash - dt); m.atkCd = Math.max(0, m.atkCd - dt); m.legPhase += dt * 9
      const toP = norm(v(p.pos.x - m.pos.x, p.pos.y - m.pos.y))
      let sx = 0, sy = 0
      for (const o of g.minions) { if (o === m) continue; const dd = dist(m.pos, o.pos); if (dd < 28 && dd > 0.01) { sx += (m.pos.x - o.pos.x) / dd; sy += (m.pos.y - o.pos.y) / dd } }
      const mvx = toP.x + sx * 0.5, mvy = toP.y + sy * 0.5, ml = Math.hypot(mvx, mvy) || 1
      if (m.spawnAnim <= 0) {
        m.pos.x = clamp(m.pos.x + (mvx / ml) * mspeed * dt, 20, WW - 20)
        m.pos.y = clamp(m.pos.y + (mvy / ml) * mspeed * dt, 20, WH - 20)
      }
      if (dist(m.pos, p.pos) < 26 && m.atkCd <= 0 && p.iframeTimer <= 0) {
        dealDmgToPlayer(g, g.bossEnraged ? 12 : 9, wpn, gear, toP); m.atkCd = 1.1; spawnParticles(g, m.pos, 5, '#8E44AD', 120)
      }
      return true
    })
  }

  // Hazard zones
  g.zones = g.zones.filter(zone => {
    zone.life -= dt; if (zone.life <= 0) return false
    if (dist(p.pos, zone.pos) < zone.radius + 14) {
      if (zone.type === 'web') p.slowTimer = Math.max(p.slowTimer, 1.8)
      if (p.iframeTimer <= 0 && zone.dps > 0) {
        const tick2 = zone.dps * dt; p.hp = Math.max(0, p.hp - tick2); p.hitFlash = Math.max(p.hitFlash, 0.06)
        if (zone.type === 'poison' && Math.random() < dt * 2) g.damageNums.push({ id: ++g.nextDmgId, pos: { x: p.pos.x + rnd(-14, 14), y: p.pos.y - 18 }, val: Math.round(tick2), life: 0.8, isPlayer: true })
        if (p.hp <= 0) killPlayer(g)
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
    proj.life -= dt
    if (proj.life <= 0) { if (proj.fromBoss && proj.isFireball) explodeFireball(g, proj.pos); return false }
    if (proj.trail) { proj.trail.push({ ...proj.pos }); if (proj.trail.length > 8) proj.trail.shift() }
    proj.pos.x += proj.vel.x * dt; proj.pos.y += proj.vel.y * dt
    if (proj.pos.x < 0 || proj.pos.x > WW || proj.pos.y < 0 || proj.pos.y > WH) { if (proj.fromBoss && proj.isFireball) explodeFireball(g, proj.pos); return false }
    if (proj.fromBoss && p.iframeTimer <= 0 && dist(proj.pos, p.pos) < proj.radius + 14) {
      if (g.bossAttack?.type === 'web_shot' || proj.isWeb) p.slowTimer = Math.max(p.slowTimer, 3.0)
      dealDmgToPlayer(g, proj.dmg, wpn, gear, norm(v(p.pos.x - proj.pos.x, p.pos.y - proj.pos.y)))
      if (proj.isFireball) explodeFireball(g, proj.pos)
      spawnParticles(g, proj.pos, 9, proj.color, 130); return false
    }
    if (!proj.fromBoss && g.minions.length) {
      const mHit = g.minions.find(m => m.hp > 0 && dist(proj.pos, m.pos) < proj.radius + 16)
      if (mHit) {
        dealDmgToMinion(g, mHit, proj.dmg)
        if ((proj.aoe && proj.isLightning) || (proj.isFireball && proj.aoe)) g.minions.forEach(m2 => { if (m2 !== mHit && m2.hp > 0 && dist(m2.pos, proj.pos) < (proj.aoe ?? 0)) dealDmgToMinion(g, m2, 30) })
        spawnParticles(g, proj.pos, 6, proj.color, 110); return false
      }
    }
    if (!proj.fromBoss && dist(proj.pos, b.pos) < proj.radius + bossDef.size) {
      dealDmgToBoss(g, proj.dmg, gear)
      if (proj.isPowerShot) { b.stunTimer = Math.max(b.stunTimer, 0.7); spawnParticles(g, proj.pos, 22, proj.color, 280); g.screenShake = Math.max(g.screenShake, 0.5) }
      if (proj.aoe && proj.isLightning) { spawnParticles(g, proj.pos, 14, '#7DFFB0', 180); g.screenShake = Math.max(g.screenShake, 0.22); if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 30, gear) }
      if (proj.isFireball && proj.aoe) {
        // big explosion + smoke + burning ground
        spawnParticles(g, proj.pos, 26, '#FF4500', 300); spawnParticles(g, proj.pos, 14, '#FFD24A', 190); spawnParticles(g, proj.pos, 7, '#FFF7C0', 120, 0.4)
        spawnParticles(g, proj.pos, 8, '#5a4a44', 70, 1.3)   // smoke
        spawnZone(g, proj.pos, 'fire', 58, 14, 2.4)          // burning ground
        g.screenShake = Math.max(g.screenShake, 0.55); Sfx.explosion()
        if (dist(b.pos, proj.pos) < proj.aoe) dealDmgToBoss(g, 50, gear)
      } else if (proj.isFirebolt) {
        // small firebolt burst + ember scatter
        spawnParticles(g, proj.pos, 10, '#FF6A1A', 180); spawnParticles(g, proj.pos, 5, '#FFD24A', 120); spawnParticles(g, proj.pos, 3, '#FFF7C0', 90, 0.3)
        g.screenShake = Math.max(g.screenShake, 0.16)
      } else {
        spawnParticles(g, proj.pos, 6, proj.color, 100)
      }
      return false
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
  } else if (g.nextAttackTimer <= 0 && b.stunTimer <= 0 && !(bossId === 2 && g.griffinState.mode === 3)) {
    startBossAttack(g, bossId, selectBossAttack(bossId, g.bossEnraged, g.bossDesperate, dist(p.pos, b.pos)))
  }

  const hpFrac = b.hp / b.maxHp
  // ── PHASE 2 — Enrage ──
  if (!g.bossEnraged && hpFrac <= bossDef.enrageAt) {
    g.bossEnraged = true; g.screenShake = 0.95; spawnParticles(g, b.pos, 40, '#FF4444', 360)
    Sfx.roar()
    const p2Sub = bossId === 0 ? 'Venom floods the lair' : bossId === 1 ? 'The molten core ignites' : 'The storm answers her call'
    g.phaseBanner = { text: 'PHASE 2 — ENRAGED', sub: p2Sub, timer: 2.6 }
  }
  // ── PHASE 3 — Desperate (final stand at low HP) ──
  if (!g.bossDesperate && hpFrac <= bossDef.enrageAt * 0.45) {
    g.bossDesperate = true; g.bossEnraged = true
    g.bossAttack = null            // cancel any wind-up
    g.nextAttackTimer = 0.6        // attack again quickly
    g.screenShake = 1.4
    spawnParticles(g, b.pos, 60, '#FFFFFF', 480); spawnParticles(g, b.pos, 40, bossDef.color, 420)
    Sfx.phaseShift()
    // shockwave nova — punishes anyone hugging the boss at the transition
    const novaR = bossDef.size + 150
    if (dist(p.pos, b.pos) < novaR && p.iframeTimer <= 0) dealDmgToPlayer(g, 26, wpn, gear, norm(v(p.pos.x - b.pos.x, p.pos.y - b.pos.y)))
    const p3Sub = bossId === 0 ? 'She calls her brood!' : bossId === 1 ? 'The arena turns to magma!' : 'A storm of blades takes wing!'
    g.phaseBanner = { text: 'PHASE 3 — DESPERATE', sub: p3Sub, timer: 3.0 }
    // ── signature phase-3 openers ──
    if (bossId === 0) {
      spawnSpiderlings(g, 4)               // Spider: flood the arena with brood
    } else if (bossId === 1) {
      // Drake: eruption — a ring of lava erupts around her, then a molten wake follows (see below)
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, rr = bossDef.size + 92
        spawnZone(g, v(clamp(b.pos.x + Math.cos(a) * rr, 80, WW - 80), clamp(b.pos.y + Math.sin(a) * rr, 80, WH - 80)), 'fire', 60, 14, 4.5)
        spawnParticles(g, v(b.pos.x + Math.cos(a) * rr, b.pos.y + Math.sin(a) * rr), 8, '#FF6600', 130, 0.6)
      }
      g.sigTimer = 0.36
    } else {
      // Griffin: takes wing and looses a feather storm; flies faster and more erratically
      fireFeatherVolley(g, 14, 240, 18, g.gtime)
      g.bossFlightSpeed *= 1.32
      g.sigTimer = 1.2
    }
  }

  // ── Phase-3 signature mechanics (ongoing): drake molten wake / griffin feather storm ──
  if (g.bossDesperate && b.stunTimer <= 0 && g.phase === 'playing') {
    g.sigTimer -= dt
    if (g.sigTimer <= 0) {
      if (bossId === 1) {
        // Drake leaves a trail of fire under her body as she slithers — area denial that evolves
        spawnZone(g, { x: b.pos.x, y: b.pos.y }, 'fire', 56, 14, 3.0)
        spawnParticles(g, b.pos, 4, '#FF7700', 90, 0.5)
        g.sigTimer = 0.36
      } else if (bossId === 2) {
        // Griffin rains radial feather volleys — keep moving to thread the gaps
        fireFeatherVolley(g, g.bossEnraged ? 12 : 10, 250, 16, g.gtime * 1.3)
        g.sigTimer = 1.5
      } else {
        g.sigTimer = 1.0
      }
    }
  }

  // Boss death
  if (b.hp <= 0 && g.phase === 'playing') {
    g.phase = 'dying'; g.bossDeathAnim = 3.0; g.bossAttack = null; g.screenShake = 1.5; g.minions = []
    spawnParticles(g, b.pos, 90, '#F1C40F', 400); spawnParticles(g, b.pos, 45, bossDef.color, 320); spawnParticles(g, b.pos, 22, '#FFFFFF', 550)
    Sfx.death()
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
  if (wpn.id === 'sword') Sfx.swing(); else if (wpn.id === 'bow') Sfx.shot()
  if (wpn.id === 'staff') g.mageCircle = Math.max(g.mageCircle, 0.6)

  if (idx === 0 && gear.includes('fire_staff')) {
    const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
    g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 360, dir.y * 360), dmg: 115, radius: 15, fromBoss: false, life: 4.0, color: '#FF4500', aoe: 110, isFireball: true, trail: [] })
    spawnParticles(g, p.pos, 18, '#FF6A1A', 200); spawnParticles(g, p.pos, 8, '#FFF7C0', 130, 0.35)
    Sfx.fireCast(); Sfx.fireball()
    return
  }

  if (wpn.id === 'bow') {
    if (idx === 0) { // Power Shot
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const ps = gear.includes('storm_bow') ? '#5fe0ff' : gear.includes('venom_bow') ? '#9B59B6' : '#F1C40F'
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 560, dir.y * 560), dmg: wpn.dmg * 3, radius: 14, fromBoss: false, life: 4.0, color: ps, isPowerShot: true, trail: [] })
      spawnParticles(g, p.pos, 18, ps, 200)
      g.attackFlash = { angle: Math.atan2((abilityTarget.y - p.pos.y), (abilityTarget.x - p.pos.x)), timer: 0.4, maxTimer: 0.4, type: 'power_shot', color: ps }
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
      g.minions.forEach(m => { if (m.hp > 0 && dist(p.pos, m.pos) < 140) dealDmgToMinion(g, m, 130) })
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
      g.projectiles.push({ id: ++g.nextProjId, pos: { ...p.pos }, vel: v(dir.x * 600, dir.y * 600), dmg: 115, radius: 13, fromBoss: false, life: 4.0, color: '#9B59B6', isArcane: true, trail: [] })
      spawnParticles(g, p.pos, 14, '#9B59B6', 180); Sfx.ability()
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.35, maxTimer: 0.35, type: 'magic', color: '#9B59B6' }
    } else if (idx === 1) { // Mana Shield
      p.iframeTimer = Math.max(p.iframeTimer, 1.5)
      spawnParticles(g, p.pos, 22, '#9B59B6', 150); Sfx.ability()
      g.screenShake = Math.max(g.screenShake, 0.12)
    } else if (idx === 2) { // Arcane Surge — blink toward cursor and erupt in a nova on arrival
      const dir = norm(v(abilityTarget.x - p.pos.x, abilityTarget.y - p.pos.y))
      const blinkDist = Math.min(dist(p.pos, abilityTarget), 300)
      for (let i = 0; i < 6; i++) p.shadowDashTrail.push({ pos: { ...p.pos }, a: 0.7 - i * 0.1 })
      p.pos.x = clamp(p.pos.x + dir.x * blinkDist, 20, WW - 20)
      p.pos.y = clamp(p.pos.y + dir.y * blinkDist, 20, WH - 20)
      p.iframeTimer = Math.max(p.iframeTimer, 0.4)
      const fire = gear.includes('fire_staff'), col = fire ? '#FF6A1A' : '#9B59B6'
      const novaR = 130, novaDmg = 100
      if (dist(b.pos, p.pos) < novaR + BOSS_DEFS[bossId].size) dealDmgToBoss(g, novaDmg, gear)
      g.minions.forEach(m => { if (m.hp > 0 && dist(m.pos, p.pos) < novaR) { dealDmgToMinion(g, m, novaDmg); const kd = norm(v(m.pos.x - p.pos.x, m.pos.y - p.pos.y)); m.pos.x += kd.x * 42; m.pos.y += kd.y * 42 } })
      spawnParticles(g, p.pos, 30, col, 340); spawnParticles(g, p.pos, 14, '#FFFFFF', 210)
      if (fire) { spawnParticles(g, p.pos, 10, '#FFD24A', 170); spawnZone(g, p.pos, 'fire', 72, 12, 1.8); Sfx.fireCast(); Sfx.explosion() } else { Sfx.ability() }
      g.screenShake = Math.max(g.screenShake, 0.5); g.mageCircle = Math.max(g.mageCircle, 0.5)
      g.attackFlash = { angle: Math.atan2(dir.y, dir.x), timer: 0.3, maxTimer: 0.3, type: 'shadow', color: col }
    } else if (idx === 3) { // Meteor
      g.skyArrows.push({ id: ++g.nextProjId, targetPos: { ...abilityTarget }, warnTimer: 1.2, hit: false, dmg: 270, kind: 'meteor' })
      spawnParticles(g, p.pos, 12, gear.includes('fire_staff') ? '#FF6A1A' : '#9B59B6', 130, 0.5); Sfx.meteorCast()
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
    // ── STORM GRIFFIN ── majestic feathered raptor-lion, storm-charged wings
    const sz = bossDef.size
    const enr = g.bossEnraged
    const flap = Math.sin(t * 3.0)               // wing-flap cycle (-1..1)
    const charge = 0.5 + 0.5 * Math.sin(t * 5.0) // storm-charge pulse (0..1)

    // ── palette ──
    const cDark   = hitW ? '#FFFFFF' : (enr ? '#27324d' : '#2b3043')
    const cMid    = hitW ? '#FFFFFF' : (enr ? '#52688f' : '#535b73')
    const cLight  = hitW ? '#FFFFFF' : (enr ? '#d4ecff' : '#c6cee0')
    const cEdge   = enr ? '#62e6ff' : '#a4c2ff'
    const cGlow   = enr ? '#00d6ff' : '#7099ff'
    const cViolet = enr ? '#b388ff' : '#9d86e0'
    const cGold   = hitW ? '#FFF' : '#dcad3c'
    const cGoldDk = hitW ? '#DDD' : '#7d5811'

    // ── lighting/feather helpers ──
    const feather = (cx: number, cy: number, ang: number, len: number, wid: number, base: string, tip: string, lit: boolean) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang)
      const gr = ctx.createLinearGradient(0, 0, len, 0)
      gr.addColorStop(0, base); gr.addColorStop(0.62, tip); gr.addColorStop(1, lit ? cEdge : tip)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(len * 0.45, -wid, len, -wid * 0.16)
      ctx.quadraticCurveTo(len * 1.06, 0, len, wid * 0.16)
      ctx.quadraticCurveTo(len * 0.45, wid, 0, 0)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = lit ? cEdge : 'rgba(18,22,38,0.5)'; ctx.lineWidth = Math.max(1, wid * 0.12)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.95, 0); ctx.stroke()
      ctx.restore()
    }
    const bolt = (x1: number, y1: number, x2: number, y2: number, segs: number, jit: number, col: string, w: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x1, y1)
      const nx = -(y2 - y1), ny = (x2 - x1), nl = Math.hypot(nx, ny) || 1
      for (let s = 1; s < segs; s++) {
        const f = s / segs, mx = x1 + (x2 - x1) * f, my = y1 + (y2 - y1) * f
        const off = (Math.sin(t * 22 + s * 2.3 + x1 * 0.05) + Math.cos(s * 3.7 + y1 * 0.05)) * jit
        ctx.lineTo(mx + nx / nl * off, my + ny / nl * off)
      }
      ctx.lineTo(x2, y2); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineCap = 'butt'
    }

    // ── storm backlight (unrotated) ──
    {
      const ar = sz * (2.0 + charge * 0.22)
      const bg = ctx.createRadialGradient(0, 0, sz * 0.3, 0, 0, ar)
      bg.addColorStop(0, enr ? `rgba(0,200,255,${0.20 + charge * 0.12})` : `rgba(95,135,235,${0.12 + charge * 0.06})`)
      bg.addColorStop(1, 'rgba(40,30,80,0)')
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, ar, 0, Math.PI * 2); ctx.fill()
    }

    ctx.shadowColor = enr ? '#00ccff' : '#7a9cff'; ctx.shadowBlur = enr ? 32 : 16
    ctx.save(); ctx.rotate(b.angle)   // head faces +x (toward player)

    // ── wings (behind body) ──
    const drawWing = (side: number) => {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const lenScale = 0.90 + Math.max(0, flap) * 0.14
      const flapAng = side * flap * 0.20
      const N = 11
      // back layer — darker, longer, for depth
      for (let i = 0; i < N; i++) {
        const frac = i / (N - 1)
        feather(shX, shY, side * (Math.PI / 2 - 0.66 + frac * 1.62) + flapAng, sz * (1.45 + frac * 1.45) * lenScale, sz * (0.40 - frac * 0.16), cDark, cMid, false)
      }
      // front layer — lighter, glowing outer primaries
      for (let i = 0; i < N; i++) {
        const frac = i / (N - 1)
        feather(shX + side * sz * 0.02, shY, side * (Math.PI / 2 - 0.60 + frac * 1.54) + flapAng, sz * (1.18 + frac * 1.30) * lenScale, sz * (0.30 - frac * 0.11), cMid, cLight, i >= N - 4)
      }
      // shoulder coverts
      for (let i = 0; i < 6; i++) {
        const frac = i / 5
        feather(shX, shY, side * (Math.PI / 2 - 0.5 + frac * 1.3) + flapAng * 0.5, sz * (0.55 + frac * 0.3), sz * 0.20, cDark, cMid, false)
      }
    }
    drawWing(-1); drawWing(1)
    ctx.shadowBlur = 0

    // ── tail feathers (bird rectrices, fanned back) ──
    {
      const sway = Math.sin(t * 2.0) * 0.12
      const baseX = -sz * 0.66, tN = 7
      // back row — darker, longer (depth)
      for (let i = 0; i < tN; i++) {
        const fr = i / (tN - 1) - 0.5
        feather(baseX, fr * sz * 0.08, Math.PI + fr * 1.0 + sway, sz * (1.12 - Math.abs(fr) * 0.40), sz * 0.17, cDark, cMid, false)
      }
      // front row — lighter, glowing center plumes
      for (let i = 0; i < tN; i++) {
        const fr = i / (tN - 1) - 0.5
        feather(baseX + sz * 0.04, fr * sz * 0.06, Math.PI + fr * 0.9 + sway, sz * (0.95 - Math.abs(fr) * 0.34), sz * 0.13, cMid, cLight, Math.abs(fr) < 0.2)
      }
      // electric tip glow on the central plume
      const ta = Math.PI + sway, tl = sz * 0.95
      ctx.fillStyle = cEdge; ctx.shadowColor = cGlow; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(baseX + sz * 0.04 + Math.cos(ta) * tl, Math.sin(ta) * tl, sz * 0.07 + charge * sz * 0.02, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // ── body (eagle breast → lion rear) — slim torso ──
    const bodyG = ctx.createLinearGradient(sz * 0.5, -sz * 0.34, -sz * 0.6, sz * 0.34)
    bodyG.addColorStop(0, cLight); bodyG.addColorStop(0.55, cMid); bodyG.addColorStop(1, cDark)
    ctx.fillStyle = bodyG; ctx.beginPath(); ctx.ellipse(-sz * 0.02, 0, sz * 0.84, sz * 0.46, 0, 0, Math.PI * 2); ctx.fill()
    if (!hitW) {
      // breast feather scallops
      ctx.strokeStyle = enr ? 'rgba(185,238,255,0.4)' : 'rgba(195,210,240,0.32)'; ctx.lineWidth = 1.6
      for (let r = 0; r < 4; r++) for (let cI = -2; cI <= 2; cI++) {
        const bxp = sz * (0.18 + r * 0.16), byp = cI * sz * 0.12 + (r % 2) * sz * 0.06
        if (Math.hypot(bxp, byp) > sz * 0.66) continue
        ctx.beginPath(); ctx.arc(bxp, byp, sz * 0.09, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke()
      }
      // lion fur lines (rear)
      ctx.strokeStyle = 'rgba(18,22,38,0.35)'; ctx.lineWidth = 1.4
      for (let i = 0; i < 5; i++) { const fy = -sz * 0.24 + i * sz * 0.12; ctx.beginPath(); ctx.moveTo(-sz * 0.18, fy); ctx.lineTo(-sz * 0.62, fy + Math.sign(fy || 1) * sz * 0.05); ctx.stroke() }
    }
    // storm-charge core glow on chest
    {
      const cg = ctx.createRadialGradient(sz * 0.22, 0, 0, sz * 0.22, 0, sz * 0.52)
      cg.addColorStop(0, enr ? `rgba(120,240,255,${0.5 + charge * 0.3})` : `rgba(155,195,255,${0.32 + charge * 0.2})`)
      cg.addColorStop(1, 'rgba(60,90,180,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sz * 0.22, 0, sz * 0.52, 0, Math.PI * 2); ctx.fill()
    }

    // ── neck ruff + head (front-facing fierce raptor) ──
    const hx = sz * 0.72
    // neck ruff feathers fanning around base of skull
    if (!hitW) for (let i = 0; i < 9; i++) {
      const fr = (i / 8 - 0.5)
      feather(sz * 0.40, fr * sz * 0.72, fr * 1.1, sz * (0.40 - Math.abs(fr) * 0.12), sz * 0.13, cDark, cLight, false)
    }
    // crest feathers (swept back over crown)
    for (let i = 0; i < 7; i++) {
      const fr = (i / 6 - 0.5)
      feather(hx - sz * 0.18, fr * sz * 0.22, Math.PI + fr * 0.9 + flap * 0.05, sz * (0.52 - Math.abs(fr) * 0.18), sz * 0.11, cMid, cEdge, Math.abs(fr) < 0.2)
    }
    // skull — triangular raptor face (wide crown -> apex at the beak)
    const headG = ctx.createRadialGradient(hx + sz * 0.06, -sz * 0.06, 0, hx, 0, sz * 0.42)
    headG.addColorStop(0, cLight); headG.addColorStop(1, cMid)
    ctx.fillStyle = headG
    ctx.beginPath()
    ctx.moveTo(hx + sz * 0.40, 0)                                   // apex toward beak (front)
    ctx.quadraticCurveTo(hx + sz * 0.06, -sz * 0.30, hx - sz * 0.30, -sz * 0.40)  // top edge to crown corner
    ctx.quadraticCurveTo(hx - sz * 0.42, 0, hx - sz * 0.30, sz * 0.40)            // wide back of skull
    ctx.quadraticCurveTo(hx + sz * 0.06, sz * 0.30, hx + sz * 0.40, 0)            // bottom edge to apex
    ctx.closePath(); ctx.fill()
    // fierce brow ridges (a frowning ">  <")
    ctx.fillStyle = cDark
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx - sz * 0.02, side * sz * 0.02)
      ctx.quadraticCurveTo(hx + sz * 0.18, side * sz * 0.04, hx + sz * 0.26, side * sz * 0.24)
      ctx.quadraticCurveTo(hx + sz * 0.12, side * sz * 0.13, hx - sz * 0.02, side * sz * 0.16)
      ctx.closePath(); ctx.fill()
    }
    // ── hooked beak (centered, pointing +x) ──
    ctx.fillStyle = cGold
    ctx.beginPath()
    ctx.moveTo(hx + sz * 0.14, -sz * 0.12)
    ctx.quadraticCurveTo(hx + sz * 0.56, -sz * 0.05, hx + sz * 0.6, sz * 0.0)
    ctx.quadraticCurveTo(hx + sz * 0.5, sz * 0.12, hx + sz * 0.42, sz * 0.04)   // hook underside
    ctx.quadraticCurveTo(hx + sz * 0.56, sz * 0.05, hx + sz * 0.14, sz * 0.12)
    ctx.closePath(); ctx.fill()
    // beak ridge shading + dark hook tip
    ctx.fillStyle = cGoldDk
    ctx.beginPath(); ctx.moveTo(hx + sz * 0.42, -sz * 0.02); ctx.quadraticCurveTo(hx + sz * 0.62, sz * 0.0, hx + sz * 0.42, sz * 0.05); ctx.quadraticCurveTo(hx + sz * 0.5, sz * 0.02, hx + sz * 0.42, -sz * 0.02); ctx.closePath(); ctx.fill()
    // mouth line + cere nostrils
    ctx.strokeStyle = 'rgba(20,15,5,0.55)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(hx + sz * 0.16, 0); ctx.lineTo(hx + sz * 0.5, 0); ctx.stroke()
    ctx.fillStyle = 'rgba(20,15,5,0.7)'
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sz * 0.2, side * sz * 0.05, sz * 0.025, sz * 0.018, 0, 0, Math.PI * 2); ctx.fill() }
    // ── glowing eyes ──
    const eg = 0.6 + 0.4 * Math.sin(t * 4.5)
    for (const side of [-1, 1]) {
      const ex = hx + sz * 0.04, ey = side * sz * 0.13
      ctx.fillStyle = cDark; ctx.beginPath(); ctx.ellipse(ex, ey, sz * 0.1, sz * 0.085, 0, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = cGlow; ctx.shadowBlur = 22 * eg
      ctx.fillStyle = enr ? '#7af6ff' : '#bfe4ff'
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.06, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#05060a'
      ctx.beginPath(); ctx.ellipse(ex + sz * 0.012, ey, sz * 0.022, sz * 0.04, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex - sz * 0.02, ey - sz * 0.02, sz * 0.016, 0, Math.PI * 2); ctx.fill()
    }

    // ── storm lighting overlays ──
    // wingtip positions (back primary of each wing)
    const tipOf = (side: number) => {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const ang = side * (Math.PI / 2 - 0.66 + 1.62) + side * flap * 0.20
      const len = sz * (1.45 + 1.45) * (0.90 + Math.max(0, flap) * 0.14)
      return { x: shX + Math.cos(ang) * len, y: shY + Math.sin(ang) * len }
    }
    const wl = tipOf(-1), wr = tipOf(1)
    // rim light along leading edge of each wing
    ctx.shadowColor = cGlow; ctx.shadowBlur = enr ? 16 : 9
    ctx.strokeStyle = enr ? 'rgba(130,246,255,0.9)' : 'rgba(175,205,255,0.7)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const shX = -sz * 0.05, shY = side * sz * 0.28
      const a = side * (Math.PI / 2 - 0.66) + side * flap * 0.20
      const l = sz * 1.45 * (0.90 + Math.max(0, flap) * 0.14)
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(shX + Math.cos(a) * l, shY + Math.sin(a) * l); ctx.stroke()
    }
    ctx.shadowBlur = 0; ctx.lineCap = 'butt'
    // crackle from wingtips toward the head
    const arcA = enr ? 0.85 : 0.4
    bolt(wl.x, wl.y, hx + sz * 0.2, 0, 6, sz * 0.1, `rgba(150,225,255,${arcA})`, enr ? 2.4 : 1.5)
    bolt(wr.x, wr.y, hx + sz * 0.2, 0, 6, sz * 0.1, `rgba(150,225,255,${arcA})`, enr ? 2.4 : 1.5)
    if (enr) {
      bolt(wl.x, wl.y, wr.x, wr.y, 9, sz * 0.18, 'rgba(120,240,255,0.7)', 2.0)   // arc across the back
      bolt(wl.x, wl.y, wl.x - sz * 0.3, wl.y + sz * 0.4, 5, sz * 0.12, `rgba(${cViolet === '#b388ff' ? '179,136,255' : '157,134,224'},0.7)`, 1.6)
      bolt(wr.x, wr.y, wr.x + sz * 0.3, wr.y + sz * 0.4, 5, sz * 0.12, 'rgba(179,136,255,0.7)', 1.6)
    }
    ctx.restore()   // end rotated frame

    // ── orbiting storm sparks + halo (unrotated) ──
    const sparkN = enr ? 7 : 4
    ctx.shadowColor = cGlow; ctx.shadowBlur = 12
    for (let i = 0; i < sparkN; i++) {
      const sa = t * (enr ? 3.2 : 2.0) + i * (Math.PI * 2 / sparkN)
      const sr = sz * 1.15 + Math.sin(t * 4 + i) * sz * 0.1
      ctx.fillStyle = enr ? `rgba(120,240,255,${0.5 + 0.4 * Math.sin(t * 6 + i)})` : `rgba(155,185,255,${0.45 + 0.35 * Math.sin(t * 6 + i)})`
      ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, enr ? 4.5 : 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.shadowBlur = 0
    if (enr) for (let i = 0; i < 6; i++) {
      const a = t * 4 + i * (Math.PI / 3)
      bolt(Math.cos(a) * sz * 1.05, Math.sin(a) * sz * 1.05, Math.cos(a + 0.4) * sz * 1.5, Math.sin(a + 0.4) * sz * 1.5, 4, sz * 0.08, 'rgba(100,230,255,0.6)', 1.6)
    }
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

  // ── mage casting circle (a glowing rune ring under the caster) ──
  if (g.mageCircle > 0) {
    const fire = gear.includes('fire_staff')
    const a = Math.min(1, g.mageCircle * 2.2)
    const col = fire ? '255,120,30' : '170,110,230'
    ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.globalAlpha = a
    ctx.rotate(t * 1.2)
    ctx.strokeStyle = `rgba(${col},0.9)`; ctx.lineWidth = 2; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 14
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2); ctx.stroke()
    // rune ticks around the ring
    for (let i = 0; i < 8; i++) { const ra = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 24, Math.sin(ra) * 11); ctx.lineTo(Math.cos(ra) * 30, Math.sin(ra) * 14); ctx.stroke() }
    ctx.rotate(-t * 2.4)
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke()
    ctx.restore()
  }

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
      ctx.shadowColor = af.color; ctx.shadowBlur = 24
      ctx.strokeStyle = af.color; ctx.lineWidth = 5+alpha*4
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(60+prog*50),0); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 12
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+(35+prog*30),0); ctx.stroke()
    } else if (af.type==='shadow') {
      const r2 = 52+prog*22, arc = 1.3
      ctx.strokeStyle = af.color; ctx.lineWidth = 3+(1-prog)*3; ctx.shadowColor = af.color; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(0,0,r2,-arc/2,arc/2); ctx.stroke()
    } else if (af.type === 'slam') {
      const rr = 24+prog*70; ctx.strokeStyle=af.color; ctx.lineWidth=5-prog*3; ctx.shadowColor=af.color; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(28,0,rr*0.5,0,Math.PI*2); ctx.stroke()
      ctx.globalAlpha=alpha*0.35; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(28,0,rr,0,Math.PI*2); ctx.stroke()
    } else if (af.type === 'shot' && wid !== 'storm_bow' && wid !== 'venom_bow' && wid !== 'bow') {
      const len = 32+prog*45; ctx.strokeStyle=af.color; ctx.lineWidth=3; ctx.shadowColor=af.color; ctx.shadowBlur=10
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(18+len,0); ctx.stroke()
    }
    ctx.restore()
  }

  ctx.save(); ctx.translate(p.pos.x, p.pos.y)
  // the character's whole look is driven by armour (4 looks: basic + 3)
  const armour = gear.includes('ember_armor')?'ember':gear.includes('web_amulet')?'web':gear.includes('feather_boots')?'feather':'basic'
  const armGlow = armour==='ember'?'#FF6A1A':armour==='web'?'#9B59B6':armour==='feather'?'#9fc0ff':'#caa84a'
  // ground shadow under the character
  ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 13, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  if (p.hitFlash>0) { ctx.shadowColor='#FF0000'; ctx.shadowBlur=24 } else { ctx.shadowColor=armGlow; ctx.shadowBlur=14 }

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

  ctx.save(); ctx.rotate(facing)
  // ── CHARACTER — appearance driven entirely by armour (basic / ember / web / feather) ──
  {
    const L = armour==='ember'   ? { rl:'#cf5740', rm:'#a93226', rd:'#5a1a10', cl:'#7a1d12', pl:'#c0392b', plt:'#e8714e', tr:'#FF8A1A', gl:'#FF6A1A' }
            : armour==='web'     ? { rl:'#5D2E86', rm:'#4A235A', rd:'#2c1240', cl:'#3b1560', pl:'#5D2E86', plt:'#7D3C98', tr:'#C39BD3', gl:'#9B59B6' }
            : armour==='feather' ? { rl:'#f2f6fb', rm:'#cfd8e6', rd:'#9aa6bc', cl:'#c2ccdd', pl:'#e8eef6', plt:'#ffffff', tr:'#aaccff', gl:'#9fc0ff' }
            :                      { rl:'#C9A876', rm:'#9C7B4F', rd:'#6B5436', cl:'#4a3826', pl:'', plt:'', tr:'#caa84a', gl:'#caa84a' }
    const W = (c: string) => hw ? '#FFF' : c
    const wp = p.walkPhase
    const stride = p.moving ? Math.sin(wp)*5 : 0
    const bob = p.moving ? Math.abs(Math.sin(wp*0.5))*1.4 : Math.sin(t*2)*0.5
    ctx.translate(0, -bob)
    const sway = Math.sin(wp)*3
    // cloak
    ctx.fillStyle = W(L.cl)
    ctx.beginPath(); ctx.moveTo(-3,-9); ctx.quadraticCurveTo(-16,-13+sway,-24,-12+sway); ctx.lineTo(-21,sway*0.4); ctx.lineTo(-24,12-sway); ctx.quadraticCurveTo(-16,13-sway,-3,9); ctx.closePath(); ctx.fill()
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(-3,-7); ctx.lineTo(-18,sway*0.3); ctx.lineTo(-3,7); ctx.closePath(); ctx.fill()
    if (armour==='web'){ ctx.strokeStyle='rgba(200,160,255,0.4)'; ctx.lineWidth=0.8; for(let i=1;i<=3;i++){ctx.beginPath(); ctx.moveTo(-3,-9*i/3); ctx.lineTo(-22,-10*i/3+sway); ctx.stroke()} ctx.beginPath(); ctx.moveTo(-10,-6); ctx.lineTo(-10,6); ctx.moveTo(-16,-7); ctx.lineTo(-16,7); ctx.stroke() }
    // boots
    for (const side of [-1,1]) { const lx=-2+(side===-1?stride:-stride); ctx.fillStyle=W(armour==='feather'?'#aab4c6':'#33231a'); ctx.beginPath(); ctx.ellipse(lx, side*6.5, 4, 2.6, 0,0,Math.PI*2); ctx.fill() }
    // torso / robe
    const bg = ctx.createRadialGradient(-3,-3,0,0,0,16)
    bg.addColorStop(0,W(L.rl)); bg.addColorStop(0.55,W(L.rm)); bg.addColorStop(1,W(L.rd))
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,0,13.5,14.5,0,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-9,4.5); ctx.lineTo(9,4.5); ctx.stroke()
    ctx.strokeStyle=W(L.tr); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-9,4.5); ctx.lineTo(9,4.5); ctx.stroke()
    // arms — staves gripped with both hands
    ctx.strokeStyle=W(L.rm); ctx.lineWidth=4; ctx.lineCap='round'
    if (wpn.id==='staff') {
      ctx.beginPath(); ctx.moveTo(2,-7); ctx.lineTo(25,-3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(2,7); ctx.lineTo(13,3); ctx.stroke()
      ctx.fillStyle=W('#E8B98C'); ctx.beginPath(); ctx.arc(25,-1.5,2.7,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(13,1.5,2.7,0,Math.PI*2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.moveTo(3,-8); ctx.lineTo(11,-5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(3,8); ctx.lineTo(9,6); ctx.stroke()
    }
    ctx.lineCap='butt'
    // head
    ctx.fillStyle=W('#E8B98C'); ctx.beginPath(); ctx.arc(5,0,6.5,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=W('#3a2718'); ctx.beginPath(); ctx.arc(3.5,0,6.5,Math.PI*0.45,Math.PI*1.55); ctx.fill()
    // ── armour-specific pieces ──
    if (armour==='basic') {
      ctx.strokeStyle=W('#6B5436'); ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-7,-7); ctx.lineTo(7,8); ctx.stroke()
      ctx.fillStyle=W('#caa84a'); ctx.beginPath(); ctx.arc(0,-8.5,2,0,Math.PI*2); ctx.arc(0,8.5,2,0,Math.PI*2); ctx.fill()
    } else if (armour==='ember') {
      ctx.shadowColor=L.gl; ctx.shadowBlur=7; ctx.fillStyle=W(L.pl)
      for (const side of [-1,1]){ ctx.beginPath(); ctx.ellipse(2, side*9.8, 5.4, 4.2, side*0.35, 0, Math.PI*2); ctx.fill() }
      ctx.shadowBlur=0
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.6,8.6,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=L.tr; ctx.lineWidth=1.6; ctx.shadowColor=L.gl; ctx.shadowBlur=6; ctx.beginPath(); ctx.moveTo(-1,-8); ctx.lineTo(-1,6); ctx.moveTo(-6,-2); ctx.lineTo(4,-2); ctx.stroke(); ctx.shadowBlur=0
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7.2,Math.PI*0.48,Math.PI*1.52); ctx.fill()
      const ff=0.6+0.4*Math.sin(t*9); ctx.fillStyle=`rgba(255,${130+Math.round(ff*80)},20,1)`; ctx.shadowColor=L.gl; ctx.shadowBlur=10
      ctx.beginPath(); ctx.moveTo(3,-1); ctx.lineTo(0,-10-ff*2); ctx.lineTo(2,-3); ctx.lineTo(4,-10-ff*2); ctx.lineTo(5,-1); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
    } else if (armour==='web') {
      ctx.fillStyle=W(L.pl)
      for (const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(-2,side*6); ctx.lineTo(4,side*13); ctx.lineTo(8,side*7); ctx.lineTo(2,side*5); ctx.closePath(); ctx.fill() }
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.2,8.2,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=L.tr; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(-1,-1,7,0,Math.PI*2); ctx.moveTo(-8,-1); ctx.lineTo(6,-1); ctx.moveTo(-1,-8); ctx.lineTo(-1,6); ctx.moveTo(-6,-6); ctx.lineTo(4,4); ctx.moveTo(4,-6); ctx.lineTo(-6,4); ctx.stroke()
      ctx.fillStyle=W(L.pl); ctx.beginPath(); ctx.arc(4.5,0,7.2,Math.PI*0.48,Math.PI*1.52); ctx.fill()
      ctx.strokeStyle=W(L.plt); ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(5,-4); ctx.lineTo(11,-8); ctx.moveTo(5,4); ctx.lineTo(11,8); ctx.stroke(); ctx.lineCap='butt'
      ctx.fillStyle='#FF2A3A'; ctx.shadowColor='#FF0000'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(7,-2,1.3,0,Math.PI*2); ctx.arc(7,2,1.3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
    } else if (armour==='feather') {
      ctx.shadowColor=L.gl; ctx.shadowBlur=5
      for (const side of [-1,1]){ for(let k=0;k<3;k++){ ctx.fillStyle=W(k===0?L.plt:L.pl); ctx.beginPath(); ctx.ellipse(k*2, side*(9+k), 4.4-k*0.7, 2.5, side*0.4, 0, Math.PI*2); ctx.fill() } }
      ctx.shadowBlur=0
      ctx.fillStyle=W(L.plt); ctx.beginPath(); ctx.ellipse(-1,-1,7.2,8.2,0,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle=L.tr; ctx.lineWidth=1.3; ctx.shadowColor=L.gl; ctx.shadowBlur=5; ctx.beginPath(); ctx.moveTo(-1,-8); ctx.lineTo(-1,6); ctx.stroke(); ctx.shadowBlur=0
      ctx.strokeStyle=W(L.plt); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(4.5,0,7,Math.PI*0.55,Math.PI*1.45); ctx.stroke()
      ctx.fillStyle=W('#f2f6fb'); for (const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(6,side*5); ctx.lineTo(13,side*4); ctx.lineTo(8,side*8.5); ctx.closePath(); ctx.fill() }
      ctx.strokeStyle=`rgba(159,192,255,${0.4+0.3*Math.sin(t*3)})`; ctx.lineWidth=1.4; ctx.shadowColor=L.gl; ctx.shadowBlur=8; ctx.beginPath(); ctx.ellipse(5,0,9,5,0,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0
    }
  }

  if (wid === 'dagger') {
    // ── SPIDER FANG DAGGERS — animated dual-blade flurry ──
    // draw one curved fang dagger pivoting at (px,py), rotated by ang, blade length len
    const drawFang = (px: number, py: number, ang: number, len: number, col: string, glow: number) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang)
      ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = glow
      // curved fang blade (slight inward hook)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(5, -2.8)
      ctx.quadraticCurveTo(len * 0.6, -3.2, len, -0.6)
      ctx.quadraticCurveTo(len + 2, 0, len, 0.8)
      ctx.quadraticCurveTo(len * 0.55, 3.2, 5, 2.8)
      ctx.closePath(); ctx.fill()
      // bright edge line
      ctx.strokeStyle = 'rgba(225,185,255,0.85)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(6, -1.1); ctx.quadraticCurveTo(len * 0.6, -1.4, len - 1, 0); ctx.stroke()
      // crossguard + hilt
      ctx.fillStyle = '#2c113f'; ctx.fillRect(1, -4, 4, 8)
      ctx.fillStyle = '#7a4fae'; ctx.fillRect(-6, -1.7, 7, 3.4)
      ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      // fast crossing X-slash: blades snap from a wide guard to crossed + thrust, then back
      const p = 1 - slash.timer / slash.maxTimer
      const tri = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5          // 0→1→0
      const open = 1.08, cross = -0.30
      // one symmetric pose at a given sweep value e (0 wide .. 1 crossed)
      const pose = (e: number, alpha: number, glow: number) => {
        const ang = open + (cross - open) * e
        const reach = 24 + e * 22
        const pyA = -7 + e * 6, pyB = 7 - e * 6
        ctx.globalAlpha = alpha
        drawFang(4, pyA, ang, reach, hw ? '#FFF' : '#9B59B6', glow)   // upper fang
        drawFang(4, pyB, -ang, reach, hw ? '#FFF' : '#8E44AD', glow)  // lower fang (mirror)
      }
      // motion-blur ghosts trailing the strike
      for (let i = 3; i >= 1; i--) pose(Math.max(0, tri - i * 0.18), 0.10 * (4 - i), 4)
      // crossing swoosh arcs
      if (tri > 0.15) {
        ctx.globalAlpha = tri * 0.7; ctx.strokeStyle = 'rgba(190,140,255,0.9)'; ctx.lineWidth = 2.5
        ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.arc(4, 0, 40, -open, -cross); ctx.stroke()
        ctx.beginPath(); ctx.arc(4, 0, 40, cross, open); ctx.stroke()
      }
      // main blades
      pose(tri, 1, 12)
      // bright crossing spark at the apex of the strike
      if (tri > 0.55) {
        const sp = (tri - 0.55) / 0.45
        ctx.globalAlpha = sp; ctx.fillStyle = '#EBD2FF'; ctx.shadowColor = '#C39BD3'; ctx.shadowBlur = 22
        ctx.beginPath(); ctx.arc(40, 0, 3.5 + sp * 4, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = `rgba(235,210,255,${sp})`; ctx.lineWidth = 2
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40 + Math.cos(a) * (8 + sp * 8), Math.sin(a) * (8 + sp * 8)); ctx.stroke() }
      }
      ctx.globalAlpha = 1
    } else {
      // idle ready-guard with a subtle breathing bob
      const bob = Math.sin(t * 4) * 1.2
      drawFang(6, -8 + bob, 0.34, 26, hw ? '#FFF' : '#9B59B6', 10)
      drawFang(6, 8 - bob, -0.34, 26, hw ? '#FFF' : '#8E44AD', 10)
    }
  } else if (wid === 'sword') {
    // ── STARTER SWORD — steel blade with a sweeping crescent slash ──
    const drawBlade = (rot: number, len: number, alpha: number, glow: number) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = '#E74C3C'; ctx.shadowBlur = glow
      const grad = ctx.createLinearGradient(10, 0, len, 0)
      grad.addColorStop(0, hw ? '#FFF' : '#AEB8C4'); grad.addColorStop(0.5, hw ? '#FFF' : '#D8E0EA'); grad.addColorStop(1, hw ? '#FFF' : '#F2F6FB')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(9, -3.6); ctx.lineTo(len - 8, -2.6); ctx.lineTo(len, 0); ctx.lineTo(len - 8, 2.6); ctx.lineTo(9, 3.6); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -1.3); ctx.lineTo(len - 5, 0); ctx.stroke()
      // crossguard
      ctx.fillStyle = hw ? '#FFF' : '#7a1d12'; ctx.fillRect(5, -8, 5, 16)
      ctx.fillStyle = hw ? '#FFF' : '#E74C3C'; ctx.fillRect(5, -8, 2.5, 16)
      // grip + pommel
      ctx.strokeStyle = '#3a1510'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(5, 0); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#C0392B'; ctx.beginPath(); ctx.arc(-2, 0, 3.4, 0, Math.PI * 2); ctx.fill()
      ctx.lineCap = 'butt'; ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      const p = 1 - slash.timer / slash.maxTimer
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2   // ease, fast through the middle
      const startR = -1.15, endR = 1.2, rot = startR + (endR - startR) * e
      const len = 54, r0 = 16, r1 = len + 8
      // crescent slash trail from start angle to current
      ctx.save()
      ctx.globalAlpha = (1 - Math.abs(e - 0.5) * 1.2) * 0.65
      ctx.fillStyle = 'rgba(255,120,90,0.5)'; ctx.shadowColor = '#E74C3C'; ctx.shadowBlur = 18
      ctx.beginPath(); ctx.arc(0, 0, r1, startR, rot); ctx.arc(0, 0, r0, rot, startR, true); ctx.closePath(); ctx.fill()
      // bright leading edge of the crescent
      ctx.globalAlpha = 1 - Math.abs(e - 0.5); ctx.strokeStyle = 'rgba(255,238,205,0.95)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, r1, rot - 0.28, rot); ctx.stroke()
      ctx.restore()
      // motion-blur ghost blades
      for (let i = 3; i >= 1; i--) drawBlade(startR + (endR - startR) * Math.max(0, e - i * 0.12), len, 0.10 * (4 - i), 5)
      // main blade
      drawBlade(rot, len, 1, 14)
      // contact spark as the edge passes mid-swing
      if (e > 0.42 && e < 0.72) {
        const spv = 1 - Math.abs(e - 0.57) / 0.15
        ctx.globalAlpha = Math.max(0, spv); ctx.fillStyle = '#FFE3B0'; ctx.shadowColor = '#FFAA66'; ctx.shadowBlur = 20
        ctx.beginPath(); ctx.arc(Math.cos(rot) * len * 0.82, Math.sin(rot) * len * 0.82, 4 + spv * 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      drawBlade(0.5 + Math.sin(t * 3.5) * 0.05, 52, 1, 12)   // idle ready stance
    }
  } else if (wid === 'greatsword') {
    // ── MASSIVE Drake Greatsword — heavy wind-up into an explosive overhead cleave ──
    const drawBig = (rot: number, alpha: number, glow: number) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = '#E67E22'; ctx.shadowBlur = glow
      ctx.strokeStyle = hw ? '#FFF' : '#3A2410'; ctx.lineWidth = 7; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(18, 0); ctx.stroke()
      ctx.fillStyle = hw ? '#FFF' : '#8A6510'; ctx.beginPath(); ctx.arc(-4, 0, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = hw ? '#FFF' : '#8A6510'; ctx.fillRect(16, -20, 8, 40)
      ctx.fillStyle = hw ? '#FFF' : '#C8881E'; ctx.fillRect(16, -20, 4, 40)
      const bladeGrad = ctx.createLinearGradient(24, 0, 118, 0)
      bladeGrad.addColorStop(0, hw ? '#FFF' : '#C0651A'); bladeGrad.addColorStop(0.5, hw ? '#FFF' : '#E67E22'); bladeGrad.addColorStop(1, hw ? '#FFF' : '#F6B24A')
      ctx.fillStyle = bladeGrad
      ctx.beginPath(); ctx.moveTo(24, -17); ctx.lineTo(104, -12); ctx.lineTo(122, 0); ctx.lineTo(104, 12); ctx.lineTo(24, 17); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = hw ? '#EEE' : 'rgba(120,50,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(106, 0); ctx.stroke()
      ctx.strokeStyle = hw ? '#FFF' : 'rgba(255,210,120,0.85)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(24, -17); ctx.lineTo(104, -12); ctx.lineTo(122, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(24, 17); ctx.lineTo(104, 12); ctx.lineTo(122, 0); ctx.stroke()
      ctx.lineCap = 'butt'; ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'greatslash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    const half = 1.3, backR = -half - 0.55   // raised/wound-up angle
    if (slash) {
      const p = 1 - slash.timer / slash.maxTimer
      let rot: number, cleave: number
      if (p < 0.34) { rot = -half + (backR - -half) * (p / 0.34); cleave = 0 }   // slow heavy wind-up overhead
      else { const e = (p - 0.34) / 0.66; cleave = 1 - Math.pow(1 - e, 2.4); rot = backR + cleave * (2 * half + 0.55) }   // explosive cleave across
      // huge crescent slash trail during the cleave
      if (cleave > 0.02) {
        const r0 = 22, r1 = 128
        ctx.save()
        ctx.globalAlpha = Math.min(1, cleave * 1.4) * 0.5
        const tg = ctx.createRadialGradient(0, 0, r0, 0, 0, r1)
        tg.addColorStop(0, 'rgba(255,140,40,0)'); tg.addColorStop(1, 'rgba(255,160,60,0.7)')
        ctx.fillStyle = tg; ctx.shadowColor = '#FF7A1A'; ctx.shadowBlur = 26
        ctx.beginPath(); ctx.arc(0, 0, r1, backR, rot); ctx.arc(0, 0, r0, rot, backR, true); ctx.closePath(); ctx.fill()
        ctx.globalAlpha = Math.min(1, cleave * 1.6); ctx.strokeStyle = 'rgba(255,240,200,0.95)'; ctx.lineWidth = 5
        ctx.beginPath(); ctx.arc(0, 0, r1, rot - 0.34, rot); ctx.stroke()
        ctx.restore()
      }
      // motion-blur ghost blades trailing the cleave
      for (let i = 3; i >= 1; i--) { const grot = rot - i * 0.26 * cleave; if (grot > backR - 0.05) drawBig(grot, 0.10 * (4 - i), 8) }
      drawBig(rot, 1, 26)
      // impact flash at the blade tip as the cleave bottoms out
      if (cleave > 0.72) {
        const sv = (cleave - 0.72) / 0.28
        ctx.globalAlpha = sv; ctx.fillStyle = '#FFE3B0'; ctx.shadowColor = '#FF9A33'; ctx.shadowBlur = 26
        ctx.beginPath(); ctx.arc(Math.cos(rot) * 120, Math.sin(rot) * 120, 6 + sv * 8, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      drawBig(-0.18 + Math.sin(t * 2.0) * 0.05, 1, 16)   // idle: shouldered, slow heavy bob
    }
  } else if (wid === 'thunder_sword') {
    // ── THUNDER BLADE — crackling electric slash; charges + discharges a bolt on the 3rd hit ──
    const lp = 0.5 + 0.5 * Math.sin(t * 10)
    const drawTBlade = (rot: number, alpha: number, glow: number, charged: boolean) => {
      ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha
      ctx.shadowColor = charged ? '#FFFFFF' : '#F1C40F'; ctx.shadowBlur = glow
      const len = 50
      const grad = ctx.createLinearGradient(8, 0, len, 0)
      grad.addColorStop(0, hw ? '#FFF' : '#C8A81E'); grad.addColorStop(0.6, hw ? '#FFF' : (charged ? '#FFF7C0' : '#F1C40F')); grad.addColorStop(1, hw ? '#FFF' : '#FFF7C0')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(len - 6, -2.2); ctx.lineTo(len, 0); ctx.lineTo(len - 6, 2.2); ctx.lineTo(8, 3); ctx.closePath(); ctx.fill()
      // crossguard + grip
      ctx.fillStyle = hw ? '#FFF' : '#5A4410'; ctx.fillRect(4, -7, 4, 14)
      ctx.strokeStyle = '#2a2008'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.lineCap = 'butt'
      // crackling arcs hugging the blade
      ctx.strokeStyle = charged ? 'rgba(255,255,255,0.9)' : `rgba(255,240,150,${0.5 + lp * 0.4})`
      ctx.lineWidth = charged ? 2 : 1.3; ctx.shadowColor = charged ? '#FFFFFF' : '#FFEE66'; ctx.shadowBlur = charged ? 14 : 8
      for (let s = 0; s < 2; s++) {
        ctx.beginPath(); ctx.moveTo(10, 0)
        for (let k = 1; k <= 4; k++) { const f = k / 4; ctx.lineTo(10 + (len - 12) * f, Math.sin(t * 30 + k * 2.1 + s * 3) * (3 + (charged ? 2 : 0))) }
        ctx.stroke()
      }
      ctx.restore()
    }
    const slash = g.attackFlash && g.attackFlash.type === 'slash' && g.attackFlash.timer > 0 ? g.attackFlash : null
    if (slash) {
      const procNow = !!(g.meleeHit && g.meleeHit.proc)
      const p = 1 - slash.timer / slash.maxTimer
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      const startR = -1.1, endR = 1.15, rot = startR + (endR - startR) * e
      const r0 = 14, r1 = 58
      // electric crescent trail
      ctx.save(); ctx.globalAlpha = (1 - Math.abs(e - 0.5) * 1.2) * 0.7
      ctx.fillStyle = procNow ? 'rgba(255,255,255,0.55)' : 'rgba(255,235,120,0.5)'; ctx.shadowColor = procNow ? '#FFFFFF' : '#F1C40F'; ctx.shadowBlur = 18
      ctx.beginPath(); ctx.arc(0, 0, r1, startR, rot); ctx.arc(0, 0, r0, rot, startR, true); ctx.closePath(); ctx.fill()
      ctx.restore()
      // jagged lightning along the leading edge
      ctx.save(); ctx.globalAlpha = 1 - Math.abs(e - 0.5)
      ctx.strokeStyle = procNow ? '#FFFFFF' : '#FFF080'; ctx.lineWidth = procNow ? 3 : 2; ctx.shadowColor = procNow ? '#FFFFFF' : '#FFEE66'; ctx.shadowBlur = procNow ? 20 : 12
      ctx.beginPath()
      for (let k = 0; k <= 5; k++) { const a = startR + (rot - startR) * (k / 5); const rr = r1 + (k % 2 === 0 ? 4 : -4) + Math.sin(t * 40 + k) * (procNow ? 5 : 3); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
      ctx.stroke(); ctx.restore()
      // motion-blur ghost blades
      for (let i = 3; i >= 1; i--) drawTBlade(startR + (endR - startR) * Math.max(0, e - i * 0.11), 0.10 * (4 - i), 5, false)
      drawTBlade(rot, 1, procNow ? 22 : 14, procNow)
      // proc swing: a big forked bolt discharges down the blade mid-swing
      if (procNow && e > 0.38 && e < 0.82) {
        const sv = 1 - Math.abs(e - 0.6) / 0.22
        ctx.save(); ctx.globalAlpha = Math.max(0, sv); ctx.rotate(rot)
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 24
        ctx.beginPath(); ctx.moveTo(6, 0)
        for (let k = 1; k <= 5; k++) ctx.lineTo(6 + 44 * (k / 5), Math.sin(t * 60 + k * 2) * 6)
        ctx.stroke()
        ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 28; ctx.beginPath(); ctx.arc(52, 0, 4 + sv * 5, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
    } else {
      const willProc = (g.player.gearHitCount % 3) === 2
      drawTBlade(0.45 + Math.sin(t * 3.5) * 0.05, 1, willProc ? 18 : 12, willProc)
      if (willProc) {   // charged orb at the tip, ready to discharge
        ctx.save(); ctx.rotate(0.45 + Math.sin(t * 3.5) * 0.05); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 12)
        ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 18
        ctx.beginPath(); ctx.arc(52, 0, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      }
    }
  } else if (wid === 'fire_staff') {
    // ── FIRE STAFF — gathers fire at the tip while charging, flares on cast ──
    const fp = 0.6 + 0.4 * Math.sin(t * 8)
    const draw = clamp(1 - p.atkTimer / 0.82, 0, 1)            // 0 just-cast -> 1 charged
    const release = clamp((p.atkTimer - 0.66) / 0.16, 0, 1)    // 1 right after a cast
    // ── ornate charred shaft ──
    ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 8
    ctx.strokeStyle = hw ? '#FFF' : '#4A1E00'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(43, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#EEE' : '#7A3A10'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(42, -1); ctx.stroke()
    // glowing ember crack running up the wood
    ctx.strokeStyle = `rgba(255,${90 + Math.round(fp * 80)},0,${0.5 + 0.4 * fp})`; ctx.lineWidth = 1; ctx.shadowColor = '#FF6A1A'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(16, -1.5); ctx.lineTo(22, 0.5); ctx.lineTo(30, -1); ctx.stroke(); ctx.shadowBlur = 8
    // leather grip wrap near the base
    ctx.strokeStyle = hw ? '#FFF' : '#2a1606'; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(16, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#DDD' : '#160a03'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const gx = 3 + i * 3; ctx.beginPath(); ctx.moveTo(gx, -3); ctx.lineTo(gx + 2, 3); ctx.stroke() }
    // brass bands
    ctx.strokeStyle = hw ? '#FFF' : '#C8881E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, -3.2); ctx.lineTo(22, 3.2); ctx.moveTo(40, -3.5); ctx.lineTo(40, 3.5); ctx.stroke()
    // pommel counterweight
    ctx.fillStyle = hw ? '#FFF' : '#8a4a10'; ctx.beginPath(); ctx.arc(-5, 0, 3.6, 0, Math.PI * 2); ctx.fill()
    // brass claw head cradling the orb
    ctx.strokeStyle = hw ? '#FFF' : '#9a5a14'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(43, -2); ctx.quadraticCurveTo(50, -10, 58, -4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(43, 2); ctx.quadraticCurveTo(50, 10, 58, 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(49, 0); ctx.stroke(); ctx.lineCap = 'butt'
    // gathering fire orb — grows with charge, flares on release
    const orbR = 3 + draw * 5 + release * 4
    ctx.shadowColor = '#FF6A1A'; ctx.shadowBlur = 18 + draw * 14
    const og = ctx.createRadialGradient(52, 0, 0, 52, 0, orbR + 5)
    og.addColorStop(0, '#FFF3B0'); og.addColorStop(0.4, release > 0 ? '#FFD24A' : '#FF8A1A'); og.addColorStop(1, 'rgba(255,60,0,0)')
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(52, 0, (orbR + 5) * fp, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(52, 0, orbR * 0.42, 0, Math.PI * 2); ctx.fill()
    // swirling flame wisps (more when charged)
    const wisps = 3 + Math.round(draw * 3)
    ctx.strokeStyle = `rgba(255,${120 + Math.round(fp * 80)},20,${0.45 + draw * 0.4})`; ctx.lineWidth = 1.6
    for (let i = 0; i < wisps; i++) { const a = t * 5 + i * (Math.PI * 2 / wisps), rr = orbR + 4 + Math.sin(t * 7 + i) * 2; ctx.beginPath(); ctx.moveTo(52 + Math.cos(a) * rr, Math.sin(a) * rr); ctx.lineTo(52 + Math.cos(a + 0.5) * (rr + 3), Math.sin(a + 0.5) * (rr + 3)); ctx.stroke() }
    // release flare
    if (release > 0) { ctx.save(); ctx.globalAlpha = release; ctx.fillStyle = '#FFE08A'; ctx.shadowColor = '#FF6A1A'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(56, 0, 6 + (1 - release) * 10, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  } else if (wid === 'staff') {
    // ── STARTER STAFF — gathers arcane energy at the tip, soft flare on cast (calmer than fire) ──
    const ap = 0.6 + 0.4 * Math.sin(t * 7)
    const draw = clamp(1 - p.atkTimer / 0.82, 0, 1)
    const release = clamp((p.atkTimer - 0.66) / 0.16, 0, 1)
    // ── ornate arcane shaft ──
    ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 8
    ctx.strokeStyle = hw ? '#FFF' : '#3A1D49'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(44, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#EEE' : '#5E2E73'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(43, -1); ctx.stroke()
    // leather grip wrap near the base
    ctx.strokeStyle = hw ? '#FFF' : '#241030'; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(16, 0); ctx.stroke()
    ctx.strokeStyle = hw ? '#DDD' : '#160a20'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const gx = 3 + i * 3; ctx.beginPath(); ctx.moveTo(gx, -3); ctx.lineTo(gx + 2, 3); ctx.stroke() }
    // silver bands
    ctx.strokeStyle = hw ? '#FFF' : '#B0A8C0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(23, -3.2); ctx.lineTo(23, 3.2); ctx.moveTo(41, -3.5); ctx.lineTo(41, 3.5); ctx.stroke()
    // pommel gem
    ctx.fillStyle = hw ? '#FFF' : '#6C3483'; ctx.beginPath(); ctx.arc(-5, 0, 3.3, 0, Math.PI * 2); ctx.fill()
    // silver prongs cradling the orb
    ctx.strokeStyle = hw ? '#FFF' : '#9E86B8'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(44, -2); ctx.quadraticCurveTo(51, -9, 58, -3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(44, 2); ctx.quadraticCurveTo(51, 9, 58, 3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(45, 0); ctx.lineTo(50, 0); ctx.stroke(); ctx.lineCap = 'butt'
    // arcane orb at the tip — grows with charge
    const orbR = 3.5 + draw * 4 + release * 3
    ctx.shadowColor = '#CE9EE8'; ctx.shadowBlur = 12 + draw * 10
    const og = ctx.createRadialGradient(53, 0, 0, 53, 0, orbR + 4)
    og.addColorStop(0, '#F4ECFF'); og.addColorStop(0.45, '#9B59B6'); og.addColorStop(1, 'rgba(123,46,160,0)')
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(53, 0, (orbR + 4) * (0.85 + ap * 0.15), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(53, 0, orbR * 0.4, 0, Math.PI * 2); ctx.fill()
    // a couple of orbiting sparkles (fewer than the fire staff)
    const sp = 2 + Math.round(draw * 2)
    ctx.fillStyle = `rgba(220,170,255,${0.5 + draw * 0.4})`
    for (let i = 0; i < sp; i++) { const a = t * 4 + i * (Math.PI * 2 / sp), rr = orbR + 3 + Math.sin(t * 6 + i) * 1.5; ctx.beginPath(); ctx.arc(53 + Math.cos(a) * rr, Math.sin(a) * rr, 1.4, 0, Math.PI * 2); ctx.fill() }
    // modest release flare
    if (release > 0) { ctx.save(); ctx.globalAlpha = release; ctx.fillStyle = '#E8D0FF'; ctx.shadowColor = '#CE9EE8'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(56, 0, 4 + (1 - release) * 7, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  } else if (wid === 'venom_bow') {
    // ── VENOM BOW — organic thorned bow that drips toxin; nocks, draws and looses a venom arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 6)
    const bx = 16, limb = 19
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)
    const drawD = 3 + draw * 16, charge = draw, nockX = bx - drawD
    const col = hw ? '#FFF' : '#8E44AD'
    // thorned limbs (recurve, with barbs)
    ctx.shadowColor = '#7D3C98'; ctx.shadowBlur = 10 + hum * 6; ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 6, -limb * 0.5, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 6, limb * 0.5, bx, limb); ctx.stroke()
    // barbs along the limbs
    ctx.lineWidth = 1.6; ctx.strokeStyle = hw ? '#FFF' : '#6A2C84'
    for (const sd of [-1, 1]) for (let k = 1; k <= 3; k++) { const yy = sd * limb * (k / 3.4); const xx = bx + 5 - 5 * (k / 3.4); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 5, yy + sd * 4); ctx.stroke() }
    // grip
    ctx.lineCap = 'round'; ctx.strokeStyle = hw ? '#FFF' : '#3a1d49'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(8, 5); ctx.stroke(); ctx.lineCap = 'butt'
    // sickly green-purple string
    ctx.strokeStyle = `rgba(170,210,90,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.6; ctx.shadowColor = '#9ACD00'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // venom dripping from the limbs (idle + drawn)
    for (const sd of [-1, 1]) { const dy = sd * limb + Math.sin(t * 3 + sd) * 2 + 4 + charge * 3; ctx.fillStyle = `rgba(140,200,20,${0.4 + 0.3 * Math.sin(t * 4 + sd)})`; ctx.beginPath(); ctx.ellipse(bx - 1, dy, 1.8, 3, 0, 0, Math.PI * 2); ctx.fill() }
    // nocked venom arrow, drawn back
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#7D3C98'; ctx.lineWidth = 2.3; ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 10
      const aLen = 26; ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + aLen, 0); ctx.stroke()
      ctx.fillStyle = '#9ACD00'; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.moveTo(nockX + aLen + 4, 0); ctx.lineTo(nockX + aLen - 4, -4); ctx.lineTo(nockX + aLen - 1, 0); ctx.lineTo(nockX + aLen - 4, 4); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // toxic glob gathering at the nock
    if (charge > 0.45) {
      ctx.save(); ctx.globalAlpha = (charge - 0.45) / 0.55; ctx.fillStyle = '#B6E61A'; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(nockX, 0, 2 + charge * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    // release: venom splash burst + arrow streak
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#B6E61A'; ctx.lineWidth = 2.6; ctx.shadowColor = '#7FBA00'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 28 + (1 - release) * 46, 0); ctx.stroke()
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.2; ctx.fillStyle = `rgba(150,205,0,${release})`; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 11, Math.sin(a) * 11, 2, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
  } else if (wid === 'storm_bow') {
    // ── STORM BOW — recurve storm bow that nocks, draws, and releases a lightning arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 9)
    const bx = 16, limb = 20
    // draw cycle from the attack cooldown: 0 just-fired (relaxed) -> 1 fully drawn (ready)
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)   // 1 right after a shot -> 0
    const drawD = 3 + draw * 16, charge = draw, nockX = bx - drawD
    const col = hw ? '#FFF' : '#5fe0ff'
    // recurve limbs
    ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 12 + hum * 8; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, -limb * 0.55, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, limb * 0.55, bx, limb); ctx.stroke()
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.quadraticCurveTo(bx - 5, -limb - 4, bx - 8, -limb - 1); ctx.moveTo(bx, limb); ctx.quadraticCurveTo(bx - 5, limb + 4, bx - 8, limb + 1); ctx.stroke()
    // grip
    ctx.strokeStyle = hw ? '#FFF' : '#14323f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(8, 5); ctx.stroke(); ctx.lineCap = 'butt'
    // lightning crackle across the limbs while charged
    if (charge > 0.35) {
      ctx.strokeStyle = `rgba(170,240,255,${charge * 0.75})`; ctx.lineWidth = 1.3; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.moveTo(bx, -limb); for (let k = 1; k <= 5; k++) ctx.lineTo(bx - 4 + Math.sin(t * 40 + k * 2) * 4 * charge, -limb + 2 * limb * (k / 5)); ctx.stroke()
    }
    // electric string (V when drawn)
    ctx.strokeStyle = `rgba(220,250,255,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.6; ctx.shadowColor = '#CFF6FF'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // nocked lightning arrow, drawn back with the string
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#EAFBFF'; ctx.lineWidth = 2.3; ctx.shadowColor = '#5fe0ff'; ctx.shadowBlur = 12
      const aLen = 26
      ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + aLen * 0.35, -3); ctx.lineTo(nockX + aLen * 0.62, 2.5); ctx.lineTo(nockX + aLen, 0); ctx.stroke()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(nockX + aLen, 0); ctx.lineTo(nockX + aLen - 6, -4); ctx.lineTo(nockX + aLen - 6, 4); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    // charge orb gathering at the nock
    if (charge > 0.45) {
      ctx.save(); ctx.globalAlpha = (charge - 0.45) / 0.55; ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(nockX, 0, 2 + charge * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    // release: forward streak + spark burst
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowColor = '#5fe0ff'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 32 + (1 - release) * 50, 0); ctx.stroke()
      for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.3; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + Math.cos(a) * 12, Math.sin(a) * 12); ctx.stroke() }
      ctx.restore()
    }
  } else if (wid === 'bow') {
    // ── STARTER BOW — simple wooden recurve that nocks, draws and looses an arrow ──
    const hum = 0.5 + 0.5 * Math.sin(t * 5)
    const bx = 15, limb = 18
    const draw = clamp(1 - p.atkTimer / 0.44, 0, 1)
    const release = clamp((p.atkTimer - 0.30) / 0.14, 0, 1)
    const drawD = 3 + draw * 15, charge = draw, nockX = bx - drawD
    // wooden limbs
    ctx.shadowColor = '#27AE60'; ctx.shadowBlur = 8; ctx.strokeStyle = hw ? '#FFF' : '#8B5A2B'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, -limb * 0.55, bx, -limb); ctx.moveTo(9, 0); ctx.quadraticCurveTo(bx + 5, limb * 0.55, bx, limb); ctx.stroke()
    // green limb-tip wraps
    ctx.strokeStyle = hw ? '#FFF' : '#2ECC71'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(bx - 3, -limb + 4); ctx.moveTo(bx, limb); ctx.lineTo(bx - 3, limb - 4); ctx.stroke()
    // grip
    ctx.strokeStyle = hw ? '#FFF' : '#5a3a1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(8, 4); ctx.stroke(); ctx.lineCap = 'butt'
    // string
    ctx.strokeStyle = `rgba(210,255,225,${0.7 + hum * 0.3})`; ctx.lineWidth = 1.4; ctx.shadowColor = '#A9DFBF'; ctx.shadowBlur = 5
    ctx.beginPath(); ctx.moveTo(bx, -limb); ctx.lineTo(nockX, 0); ctx.lineTo(bx, limb); ctx.stroke()
    // nocked wooden arrow, drawn back
    if (charge > 0.25 && release < 0.4) {
      ctx.save(); ctx.globalAlpha = Math.min(1, charge * 1.3)
      ctx.strokeStyle = '#caa472'; ctx.lineWidth = 2; ctx.shadowColor = '#27AE60'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.moveTo(nockX, 0); ctx.lineTo(nockX + 26, 0); ctx.stroke()
      ctx.fillStyle = '#E8F8F0'; ctx.shadowColor = '#A9DFBF'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(nockX + 30, 0); ctx.lineTo(nockX + 24, -3.5); ctx.lineTo(nockX + 24, 3.5); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    // release: string twang + arrow streak
    if (release > 0) {
      ctx.save(); ctx.globalAlpha = release; ctx.strokeStyle = '#D5FFE6'; ctx.lineWidth = 2; ctx.shadowColor = '#2ECC71'; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 26 + (1 - release) * 40, 0); ctx.stroke(); ctx.restore()
    }
  } else {
    ctx.strokeStyle='#5A5040'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(38,0); ctx.stroke()
    ctx.fillStyle=hw?'#FFF':'#8A8070'; ctx.beginPath(); ctx.moveTo(36,-4); ctx.lineTo(44,0); ctx.lineTo(36,4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle='rgba(180,160,130,0.4)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(16,-9); ctx.lineTo(16,9); ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

function renderTelegraph(ctx: CanvasRenderingContext2D, g: GS, bossId: BossId, t: number) {
  const atk = g.bossAttack; if (!atk || atk.active) return
  const progress = atk.elapsed/atk.telegraphTime, pulse = 0.4+0.6*progress, b = g.boss
  const bossDef = BOSS_DEFS[bossId]
  const BIG = ['spider_leap','venom_burst','fire_line','flame_wave','fire_breath','lava_puddle','lightning_barrage','thunderstorm','talon_dive','fireball','tail_slam','dive_bomb','spider_charge','magma_geyser','thunder_cross','gale_ring','venom_geyser','web_burst'].includes(atk.type)
  const dCol = bossId===0 ? '180,112,224' : bossId===1 ? '255,122,26' : '95,230,255'
  ctx.save()
  // ── boss charge-up aura (every telegraph): pulsing ring that fills as the attack nears ──
  {
    const cr = bossDef.size + 14 + Math.sin(t*16)*3
    ctx.save()
    ctx.strokeStyle = `rgba(${dCol},${0.25+0.5*progress})`; ctx.lineWidth = 2.5 + progress*3
    ctx.shadowColor = `rgba(${dCol},0.9)`; ctx.shadowBlur = (BIG?22:12)*pulse
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, cr, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress); ctx.stroke()
    // gathering energy sparks spiralling into the boss
    ctx.shadowBlur = 0
    const sparks = BIG ? 5 : 3
    for (let i=0;i<sparks;i++) {
      const sa = t*6 + i*(Math.PI*2/sparks), sd = cr + 30 - progress*38
      ctx.fillStyle = `rgba(${dCol},${0.5+0.4*Math.sin(t*9+i)})`
      ctx.beginPath(); ctx.arc(b.pos.x+Math.cos(sa)*sd, b.pos.y+Math.sin(sa)*sd, BIG?3.2:2.2, 0, Math.PI*2); ctx.fill()
    }
    // floating warning mark above the boss for dangerous attacks
    if (BIG) {
      ctx.globalAlpha = 0.45+0.55*Math.abs(Math.sin(t*9))
      ctx.fillStyle = `rgba(${dCol},1)`; ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=12
      ctx.font = 'bold 30px "Press Start 2P", monospace'; ctx.textAlign='center'
      ctx.fillText('!', b.pos.x, b.pos.y - bossDef.size - 22)
    }
    ctx.restore()
  }
  if (atk.type==='venom_spit'||atk.type==='ember_barrage'||atk.type==='fireball'||atk.type==='wind_blade'||atk.type==='fire_fan') {
    const count=atk.data.count??3, baseA=atk.data.angle??0
    const spread=atk.type==='fireball'?0.16:atk.type==='wind_blade'?0.20:atk.type==='fire_fan'?0.27:0.28
    for (let i=0;i<count;i++) { const a=baseA+(i-(count-1)/2)*spread; ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=atk.type==='fireball'?3:2; ctx.setLineDash([6,4]); ctx.shadowColor=`rgba(${dCol},0.7)`; ctx.shadowBlur=8*pulse; ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*520,b.pos.y+Math.sin(a)*520); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur=0 }
  } else if (atk.type==='web_shot'||atk.type==='talon_dive') {
    const a=atk.data.angle??0; ctx.strokeStyle=`rgba(255,100,200,${pulse})`; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.lineTo(b.pos.x+Math.cos(a)*600,b.pos.y+Math.sin(a)*600); ctx.stroke(); ctx.setLineDash([])
  } else if (atk.type==='leg_sweep'||atk.type==='tail_swipe'||atk.type==='wind_buffet'||atk.type==='fire_breath') {
    const angle=atk.data.angle??0, half=(atk.data.coneAngle??Math.PI)/2, range=atk.data.coneRange??150
    // base cone outline + a sweep that fills toward the edge as it nears firing
    ctx.fillStyle=`rgba(${dCol},${pulse*0.16})`; ctx.strokeStyle=`rgba(${dCol},${pulse*0.8})`; ctx.lineWidth=2
    ctx.shadowColor=`rgba(${dCol},0.8)`; ctx.shadowBlur=10*pulse
    ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.arc(b.pos.x,b.pos.y,range,angle-half,angle+half); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.shadowBlur=0
    ctx.fillStyle=`rgba(${dCol},${0.30+0.4*progress})`
    ctx.beginPath(); ctx.moveTo(b.pos.x,b.pos.y); ctx.arc(b.pos.x,b.pos.y,range*progress,angle-half,angle+half); ctx.closePath(); ctx.fill()
    // directional chevrons down the cone centre
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=3
    for (let k=1;k<=3;k++){ const cd=range*(k/3.6); const cx=b.pos.x+Math.cos(angle)*cd, cy=b.pos.y+Math.sin(angle)*cd
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(angle+2.5)*12,cy+Math.sin(angle+2.5)*12); ctx.lineTo(cx,cy); ctx.lineTo(cx+Math.cos(angle-2.5)*12,cy+Math.sin(angle-2.5)*12); ctx.stroke() }
  } else if (atk.type==='spider_leap'||atk.type==='lightning_strike'||atk.type==='stomp'||atk.type==='tail_slam'||atk.type==='dive_bomb') {
    const target=atk.data.targetPos!, r=atk.data.radius??(atk.type==='stomp'?155:120)
    // filling ground indicator — the fill reaches the edge exactly when the attack lands
    ctx.fillStyle=`rgba(${dCol},${0.12+0.10*pulse})`; ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=`rgba(${dCol},${0.32})`; ctx.beginPath(); ctx.arc(target.x,target.y,r*progress,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=`rgba(${dCol},${0.5+0.5*pulse})`; ctx.lineWidth=2.5+progress*2.5; ctx.shadowColor=`rgba(${dCol},0.9)`; ctx.shadowBlur=12*pulse
    ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0
  } else if (atk.type==='venom_burst') {
    const r=atk.data.radius??180
    ctx.fillStyle=`rgba(90,20,130,${0.10+pulse*0.14})`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=`rgba(142,68,173,0.28)`; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r*progress,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=`rgba(142,68,173,${pulse})`; ctx.lineWidth=3+progress*3; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,r,0,Math.PI*2); ctx.stroke()
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
  } else if (atk.type==='web_wall') {
    const lineA=atk.data.angle??0, len=760
    ctx.save(); ctx.shadowColor='#8E44AD'; ctx.shadowBlur=16*pulse
    ctx.strokeStyle=`rgba(${dCol},${pulse*0.85})`; ctx.lineWidth=8+progress*10; ctx.setLineDash([14,8])
    ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(lineA)*len,b.pos.y-Math.sin(lineA)*len); ctx.lineTo(b.pos.x+Math.cos(lineA)*len,b.pos.y+Math.sin(lineA)*len); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()
  } else if (atk.type==='spider_charge') {
    const a=atk.data.angle??0, len=360, halfW=70
    const ex=b.pos.x+Math.cos(a)*len, ey=b.pos.y+Math.sin(a)*len
    const px2=-Math.sin(a)*halfW, py2=Math.cos(a)*halfW
    ctx.save(); ctx.shadowColor=`rgba(${dCol},0.8)`; ctx.shadowBlur=12*pulse
    ctx.fillStyle=`rgba(${dCol},${0.12+pulse*0.18})`
    ctx.beginPath(); ctx.moveTo(b.pos.x+px2,b.pos.y+py2); ctx.lineTo(ex+px2,ey+py2); ctx.lineTo(ex-px2,ey-py2); ctx.lineTo(b.pos.x-px2,b.pos.y-py2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=3
    for (let k=1;k<=3;k++){ const cd=len*(k/3.6); const cx=b.pos.x+Math.cos(a)*cd, cy=b.pos.y+Math.sin(a)*cd; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a+2.5)*14,cy+Math.sin(a+2.5)*14); ctx.lineTo(cx,cy); ctx.lineTo(cx+Math.cos(a-2.5)*14,cy+Math.sin(a-2.5)*14); ctx.stroke() }
    ctx.restore()
  } else if (atk.type==='magma_geyser'||atk.type==='venom_geyser') {
    // ring of eruptions — danger band, safe centre
    const target=atk.data.targetPos!, r=atk.data.radius??122
    ctx.save(); ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=14*pulse
    ctx.strokeStyle=`rgba(${dCol},${0.5+0.5*pulse})`; ctx.lineWidth=4+progress*4
    ctx.beginPath(); ctx.arc(target.x,target.y,r,0,Math.PI*2); ctx.stroke()
    ctx.fillStyle=`rgba(${dCol},${0.10+0.12*pulse})`; ctx.beginPath(); ctx.arc(target.x,target.y,r+22,0,Math.PI*2); ctx.arc(target.x,target.y,r-22,0,Math.PI*2,true); ctx.fill()
    for (let i=0;i<11;i++){ const a=i/11*Math.PI*2; ctx.fillStyle=`rgba(${dCol},${pulse})`; ctx.beginPath(); ctx.arc(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,3+progress*3,0,Math.PI*2); ctx.fill() }
    ctx.restore()
  } else if (atk.type==='thunder_cross') {
    // two perpendicular lightning lines through the boss
    const a0=atk.data.angle??0, len=780
    ctx.save(); ctx.shadowColor='#00EEFF'; ctx.shadowBlur=18*pulse
    ctx.strokeStyle=`rgba(120,235,255,${pulse*0.9})`; ctx.lineWidth=6+progress*8; ctx.setLineDash([16,8])
    for (const la of [a0, a0+Math.PI/2]) { ctx.beginPath(); ctx.moveTo(b.pos.x-Math.cos(la)*len,b.pos.y-Math.sin(la)*len); ctx.lineTo(b.pos.x+Math.cos(la)*len,b.pos.y+Math.sin(la)*len); ctx.stroke() }
    ctx.setLineDash([]); ctx.restore()
  } else if (atk.type==='gale_ring'||atk.type==='web_burst') {
    // expanding ring warning around the boss (radial burst incoming)
    ctx.save(); ctx.shadowColor=`rgba(${dCol},1)`; ctx.shadowBlur=12*pulse
    ctx.strokeStyle=`rgba(${dCol},${pulse})`; ctx.lineWidth=2.5+progress*2
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,40+progress*120,0,Math.PI*2); ctx.stroke()
    ctx.strokeStyle=`rgba(${dCol},${pulse*0.5})`; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,40+progress*60,0,Math.PI*2); ctx.stroke()
    ctx.restore()
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
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.moveTo(-20,-5); ctx.lineTo(10,-5); ctx.lineTo(10,-10); ctx.lineTo(24,0); ctx.lineTo(10,10); ctx.lineTo(10,5); ctx.lineTo(-20,5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1; ctx.stroke(); ctx.restore()
    } else if (proj.isFireball) {
      // large rotating-flame fireball with white-hot core
      const fr = 0.72 + 0.28 * Math.sin(proj.life * 26)
      ctx.shadowColor = '#FF3000'; ctx.shadowBlur = 28
      const fg = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 9)
      fg.addColorStop(0, '#FFF7C0'); fg.addColorStop(0.5, '#FF7A1A'); fg.addColorStop(1, 'rgba(200,20,0,0)')
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 9) * fr, 0, Math.PI * 2); ctx.fill()
      ctx.save(); ctx.translate(proj.pos.x, proj.pos.y); ctx.rotate(proj.life * 6)
      ctx.fillStyle = 'rgba(255,140,20,0.85)'
      for (let s = 0; s < 5; s++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(proj.radius * 0.75, 0, proj.radius * 0.7, proj.radius * 0.34, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.45, 0, Math.PI * 2); ctx.fill()
    } else if (proj.isFirebolt) {
      // glowing firebolt — flame halo, white-hot core, flickering licks
      const fr = 0.65 + 0.35 * Math.sin(proj.life * 32)
      ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 16
      const fg = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 5)
      fg.addColorStop(0, '#FFF3B0'); fg.addColorStop(0.42, '#FF8A1A'); fg.addColorStop(1, 'rgba(255,40,0,0)')
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 5) * fr, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,150,30,0.85)'
      for (let s = 0; s < 3; s++) { const a = proj.life * 10 + s * 2.1; ctx.beginPath(); ctx.arc(proj.pos.x + Math.cos(a) * proj.radius * 0.7, proj.pos.y + Math.sin(a) * proj.radius * 0.7, 1.7, 0, Math.PI * 2); ctx.fill() }
    } else if (proj.isLightning) {
      const a2=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a2)
      // glowing core
      ctx.fillStyle='rgba(180,245,255,0.9)'; ctx.shadowColor='#00CCFF'; ctx.shadowBlur=18
      ctx.beginPath(); ctx.arc(0,0,3.5,0,Math.PI*2); ctx.fill()
      // white-hot jagged bolt body
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=2.4; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-5,-4); ctx.lineTo(2,2); ctx.lineTo(9,-3); ctx.lineTo(16,0); ctx.stroke()
      // cyan crackle strand
      ctx.strokeStyle='rgba(120,225,255,0.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-4,3); ctx.lineTo(4,-3); ctx.lineTo(16,0); ctx.stroke()
      // arrowhead
      ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(10,-4); ctx.lineTo(10,4); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (proj.isVenom) {
      const av=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(av)
      ctx.shadowColor='#8E44AD'; ctx.shadowBlur=12
      // purple shaft
      ctx.strokeStyle='#7D3C98'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(8,0); ctx.stroke()
      // fletching
      ctx.strokeStyle='#C39BD3'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-16,-3); ctx.moveTo(-12,0); ctx.lineTo(-16,3); ctx.stroke()
      // barbed venom head (toxic green)
      ctx.fillStyle='#9ACD00'; ctx.shadowColor='#7FBA00'; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(7,-5); ctx.lineTo(10,0); ctx.lineTo(7,5); ctx.closePath(); ctx.fill()
      // dripping venom glob
      ctx.fillStyle=`rgba(127,186,0,${0.6+0.4*Math.sin(proj.life*18)})`
      ctx.beginPath(); ctx.arc(11,4+Math.sin(proj.life*14)*1.5,2,0,Math.PI*2); ctx.fill()
      ctx.restore()
    } else if (proj.isArcane) {
      // glowing arcane missile — pulsing orb, white core, orbiting sparks
      const pul = 0.7 + 0.3 * Math.sin(proj.life * 22)
      ctx.shadowColor = '#9B59B6'; ctx.shadowBlur = 18
      const ag = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, proj.radius + 4)
      ag.addColorStop(0, '#F4ECFF'); ag.addColorStop(0.45, '#C39BD3'); ag.addColorStop(1, 'rgba(123,46,160,0)')
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, (proj.radius + 4) * pul, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 0.42, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(220,170,255,0.9)'
      for (let s = 0; s < 3; s++) { const a = proj.life * 7 + s * (Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(proj.pos.x + Math.cos(a) * (proj.radius + 3), proj.pos.y + Math.sin(a) * (proj.radius + 3), 1.6, 0, Math.PI * 2); ctx.fill() }
    } else if (proj.isArrow) {
      const aa=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(aa)
      ctx.shadowColor='#27AE60'; ctx.shadowBlur=8
      // wooden shaft
      ctx.strokeStyle='#caa472'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(9,0); ctx.stroke()
      // green fletching
      ctx.strokeStyle='#2ECC71'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(-17,-3); ctx.moveTo(-13,0); ctx.lineTo(-17,3); ctx.moveTo(-10,0); ctx.lineTo(-14,-2.5); ctx.moveTo(-10,0); ctx.lineTo(-14,2.5); ctx.stroke()
      // steel arrowhead
      ctx.fillStyle='#E8F8F0'; ctx.shadowColor='#A9DFBF'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(7,-3.5); ctx.lineTo(9,0); ctx.lineTo(7,3.5); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else if (proj.isFeather) {
      const a4=Math.atan2(proj.vel.y,proj.vel.x)
      ctx.save(); ctx.translate(proj.pos.x,proj.pos.y); ctx.rotate(a4)
      ctx.fillStyle=proj.color
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-6,-4.5); ctx.lineTo(-3,0); ctx.lineTo(-6,4.5); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-6,0); ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle=proj.color; ctx.beginPath(); ctx.arc(proj.pos.x,proj.pos.y,proj.radius,0,Math.PI*2); ctx.fill()
    }
    ctx.restore()
  })
}

function renderSkyArrows(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.skyArrows.forEach(arrow => {
    if (arrow.hit) return
    const isMet = arrow.kind === 'meteor'
    const prog = clamp(1 - arrow.warnTimer / (isMet ? 1.2 : 1.8), 0, 1), pulse = 0.4 + 0.6 * prog
    const tx = arrow.targetPos.x, ty = arrow.targetPos.y
    ctx.save()
    if (isMet) {
      const R = 62
      // fiery danger circle that fills as impact nears
      ctx.fillStyle = `rgba(255,80,0,${0.08 + pulse * 0.12})`; ctx.beginPath(); ctx.arc(tx, ty, R, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,120,0,0.28)'; ctx.beginPath(); ctx.arc(tx, ty, R * prog, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(255,140,30,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2.5 + prog * 2.5; ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 14 * pulse
      ctx.beginPath(); ctx.arc(tx, ty, R, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255,160,40,${pulse * 0.5})`; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(tx - R * 0.7, ty); ctx.lineTo(tx + R * 0.7, ty); ctx.moveTo(tx, ty - R * 0.7); ctx.lineTo(tx, ty + R * 0.7); ctx.stroke()
      // accelerating fall
      const my = ty - (1 - prog) * (1 - prog) * 540, mr = 13 + prog * 11
      ctx.strokeStyle = 'rgba(255,120,20,0.5)'; ctx.lineWidth = mr * 0.9; ctx.lineCap = 'round'; ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.moveTo(tx, my - 64); ctx.lineTo(tx, my); ctx.stroke(); ctx.lineCap = 'butt'
      const mg = ctx.createRadialGradient(tx, my, 0, tx, my, mr + 6)
      mg.addColorStop(0, '#FFF7C0'); mg.addColorStop(0.5, '#FF7A1A'); mg.addColorStop(1, 'rgba(150,20,0,0)')
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(tx, my, mr + 6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#3a1408'; ctx.beginPath(); ctx.arc(tx, my, mr * 0.7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,190,60,0.85)'; ctx.beginPath(); ctx.arc(tx - mr * 0.25, my - mr * 0.25, mr * 0.28, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.strokeStyle = `rgba(241,196,15,${pulse * 0.9})`; ctx.lineWidth = 3 + prog * 2
      ctx.shadowColor = '#F1C40F'; ctx.shadowBlur = 14
      ctx.beginPath(); ctx.arc(tx, ty, 45 * (0.4 + 0.6 * prog), 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = `rgba(241,196,15,${pulse * 0.12})`; ctx.beginPath(); ctx.arc(tx, ty, 45, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(241,196,15,${pulse})`; ctx.lineWidth = 3
      const iy = ty - 80 + prog * 50
      ctx.beginPath(); ctx.moveTo(tx, iy); ctx.lineTo(tx, ty - 50); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(tx - 10, iy + 15); ctx.lineTo(tx, iy); ctx.lineTo(tx + 10, iy + 15); ctx.stroke()
    }
    ctx.restore()
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

function renderMinions(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  void t
  g.minions.forEach(m => {
    const hw = m.hitFlash > 0 && Math.sin(m.hitFlash * 80) > 0
    const sc = m.spawnAnim > 0 ? clamp(1 - m.spawnAnim / 0.45, 0.1, 1) : 1
    ctx.save(); ctx.translate(m.pos.x, m.pos.y); ctx.scale(sc, sc)
    ctx.shadowColor = '#8E44AD'; ctx.shadowBlur = 8
    // 8 scuttling legs
    ctx.strokeStyle = hw ? '#FFF' : '#5B2C7A'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, li = i % 4
      const baseA = (side === -1 ? Math.PI : 0) + (li - 1.5) * 0.5
      const wave = Math.sin(m.legPhase + i * 0.7) * 0.35
      const kx = Math.cos(baseA + wave) * 9, ky = Math.sin(baseA + wave) * 9
      const tx = Math.cos(baseA + wave * 1.6) * 15, ty = Math.sin(baseA + wave * 1.6) * 15
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(kx, ky, tx, ty); ctx.stroke()
    }
    ctx.lineCap = 'butt'
    ctx.fillStyle = hw ? '#FFF' : '#3D1560'; ctx.beginPath(); ctx.ellipse(2, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = hw ? '#FFF' : '#5D1E8A'; ctx.beginPath(); ctx.arc(-6, 0, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FF3355'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(-8, -2, 1.6, 0, Math.PI * 2); ctx.arc(-8, 2, 1.6, 0, Math.PI * 2); ctx.fill()
    if (m.hp < m.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-10, -16, 20, 3); ctx.fillStyle = '#C0392B'; ctx.fillRect(-10, -16, 20 * (m.hp / m.maxHp), 3) }
    ctx.restore()
  })
}

function renderPlayerDeath(ctx: CanvasRenderingContext2D, g: GS, t: number) {
  const p = g.player, total = 2.6, prog = clamp(1 - g.playerDeathAnim / total, 0, 1)
  const x = p.pos.x, y = p.pos.y
  // dark pool spreading beneath the fallen hunter
  ctx.save(); ctx.globalAlpha = Math.min(0.7, prog * 1.2)
  const pool = ctx.createRadialGradient(x, y + 8, 2, x, y + 8, 32 + prog * 44)
  pool.addColorStop(0, 'rgba(95,0,0,0.9)'); pool.addColorStop(1, 'rgba(40,0,0,0)')
  ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(x, y + 8, 32 + prog * 44, 14 + prog * 20, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // body — collapsing, fading, reddening, sinking
  const sink = prog * 9, r = Math.max(1, 16 * (1 - prog * 0.5))
  ctx.save(); ctx.globalAlpha = 1 - prog * 0.78
  ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16
  const bg = ctx.createRadialGradient(x - 3, y - 3 + sink, 0, x, y + sink, r)
  bg.addColorStop(0, '#F1948A'); bg.addColorStop(0.6, '#C0392B'); bg.addColorStop(1, '#5b0a0a')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y + sink, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = (1 - prog) * 0.8; ctx.strokeStyle = '#2a0000'; ctx.lineWidth = 1.5
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + prog; ctx.beginPath(); ctx.moveTo(x, y + sink); ctx.lineTo(x + Math.cos(a) * r, y + sink + Math.sin(a) * r); ctx.stroke() }
  ctx.restore()
  // soul wisp drifting up
  ctx.save(); ctx.globalAlpha = Math.max(0, 0.65 - prog * 0.65)
  ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(x + Math.sin(t * 3) * 6, y - prog * 64, 4 * (1 - prog), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
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
  } else if (g.phase==='player_dying') {
    renderHazards(ctx,g); renderProjectiles(ctx,g,t)
    renderBoss(ctx,g,bossId,t); renderMinions(ctx,g,t)
    renderParticles(ctx,g); renderPlayerDeath(ctx,g,t)
  } else {
    renderHazards(ctx,g); renderSlowTraps(ctx,g,t); renderTelegraph(ctx,g,bossId,t)
    renderSkyArrows(ctx,g,t); renderParticles(ctx,g); renderProjectiles(ctx,g,t)
    if (bossId===2 && g.griffinState.mode===1) {
      // griffin swoop-dive telegraph (where it will dive)
      const b2=g.boss, gd=g.griffinState.dive, pl=0.5+0.5*Math.sin(t*18)
      ctx.save(); ctx.strokeStyle=`rgba(120,235,255,${0.5+0.4*pl})`; ctx.lineWidth=3+pl*2; ctx.setLineDash([16,9]); ctx.shadowColor='#00EEFF'; ctx.shadowBlur=14
      ctx.beginPath(); ctx.moveTo(b2.pos.x,b2.pos.y); ctx.lineTo(b2.pos.x+gd.x*620,b2.pos.y+gd.y*620); ctx.stroke(); ctx.setLineDash([])
      const ex=b2.pos.x+gd.x*620, ey=b2.pos.y+gd.y*620, aa=Math.atan2(gd.y,gd.x)
      ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex-Math.cos(aa-0.4)*22,ey-Math.sin(aa-0.4)*22); ctx.moveTo(ex,ey); ctx.lineTo(ex-Math.cos(aa+0.4)*22,ey-Math.sin(aa+0.4)*22); ctx.stroke()
      ctx.restore()
    }
    renderBoss(ctx,g,bossId,t); renderMinions(ctx,g,t); renderPlayer(ctx,g,wpn,gear,t); renderDamageNumbers(ctx,g)
    if (g.tooCloseFlash > 0) {
      const p = g.player, a = Math.min(1, g.tooCloseFlash * 1.6)
      ctx.save(); ctx.globalAlpha = a
      ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 2; ctx.setLineDash([5,4])
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 24, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#FF7777'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8
      ctx.font = 'bold 9px "Press Start 2P", monospace'; ctx.textAlign = 'center'
      ctx.fillText('TOO CLOSE', p.pos.x, p.pos.y - 34)
      ctx.restore()
    }
  }
  ctx.restore()
  if (g.phase==='playing') renderHUD(ctx,g,wpn,bossDef,gear,t)
  // ── cinematic death sequence overlay ──
  if (g.phase==='player_dying') {
    const total = 2.6, prog = clamp(1 - g.playerDeathAnim / total, 0, 1)
    if (prog < 0.14) { ctx.fillStyle = `rgba(170,18,18,${(0.14-prog)/0.14*0.6})`; ctx.fillRect(0,0,CW,CH) }   // impact flash
    const vg = ctx.createRadialGradient(CW/2, CH/2, CH*0.10, CW/2, CH/2, CH*0.98)
    vg.addColorStop(0, `rgba(24,0,0,${0.10+prog*0.45})`); vg.addColorStop(1, `rgba(0,0,0,${0.35+prog*0.6})`)
    ctx.fillStyle = vg; ctx.fillRect(0,0,CW,CH)
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, prog*0.65)})`; ctx.fillRect(0, CH*0.5-56, CW, 112)
    const tShow = clamp((prog-0.30)/0.32, 0, 1)
    if (tShow > 0) {
      ctx.save(); ctx.textAlign='center'; ctx.globalAlpha = tShow
      ctx.translate(CW/2, CH/2); ctx.scale(1.14 - tShow*0.14, 1.14 - tShow*0.14)
      ctx.fillStyle = '#8a0e0e'; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 28
      ctx.font = 'bold 30px "Press Start 2P", monospace'; ctx.fillText('YOU DIED', 0, 8)
      ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(180,30,30,${tShow})`; ctx.lineWidth = 2
      const ul = tShow*210; ctx.beginPath(); ctx.moveTo(-ul, 30); ctx.lineTo(ul, 30); ctx.stroke()
      ctx.restore(); ctx.textAlign='left'
    }
    if (prog > 0.82) { ctx.fillStyle = `rgba(0,0,0,${(prog-0.82)/0.18})`; ctx.fillRect(0,0,CW,CH) }   // fade to black handoff
  }
  if (g.playerDmgFlash > 0) {
    const a = g.playerDmgFlash * 0.55
    const vgn = ctx.createRadialGradient(CW/2, CH/2, CH*0.08, CW/2, CH/2, CH*0.85)
    vgn.addColorStop(0, 'rgba(220,0,0,0)')
    vgn.addColorStop(1, `rgba(220,0,0,${a})`)
    ctx.fillStyle = vgn; ctx.fillRect(0, 0, CW, CH)
  }
  if (g.phaseBanner) {
    const pb = g.phaseBanner, a = Math.min(1, pb.timer / 0.5)
    const isP3 = pb.text.includes('3')
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'
    ctx.fillStyle = isP3 ? 'rgba(40,4,10,0.6)' : 'rgba(34,12,4,0.55)'
    ctx.fillRect(0, CH * 0.28, CW, 66)
    ctx.fillStyle = isP3 ? '#FF5566' : '#FF9A3C'; ctx.shadowColor = isP3 ? '#FF0033' : '#FF6600'; ctx.shadowBlur = 16
    ctx.font = 'bold 20px "Press Start 2P", monospace'
    ctx.fillText(pb.text, CW / 2, CH * 0.28 + 30)
    ctx.shadowBlur = 0; ctx.fillStyle = '#E8E6E0'; ctx.font = '9px "Press Start 2P", monospace'
    ctx.fillText(pb.sub, CW / 2, CH * 0.28 + 52)
    ctx.restore(); ctx.textAlign = 'left'
  }
  ctx.restore()
}
/* ═══ FASTEST-KILL LEADERBOARD ═══ */
function fmtKillTime(ms: number): string {
  const t = ms / 1000
  if (t < 60) return t.toFixed(1) + 's'
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

interface BossRunRow { rank: number; username: string; timeMs: number; isCurrentUser: boolean }
function BossLeaderboard({ boss, refreshKey = 0, highlightRank }: { boss: number; refreshKey?: number; highlightRank?: number | null }) {
  const [rows, setRows] = useState<BossRunRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/boss-hunter/leaderboard/${boss}`)
      .then(r => r.json())
      .then(d => { if (alive) { setRows(Array.isArray(d) ? d : []); setLoading(false) } })
      .catch(() => { if (alive) { setRows([]); setLoading(false) } })
    return () => { alive = false }
  }, [boss, refreshKey])
  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #C89B3C40', borderRadius: 8, padding: '12px 14px', fontFamily: '"Press Start 2P",monospace' }}>
      <div style={{ fontSize: 8, color: '#C89B3C', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>🏆 FASTEST KILLS</div>
      {loading ? (
        <div style={{ fontSize: 7, color: '#a09880', textAlign: 'center' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 7, color: '#a09880', textAlign: 'center', lineHeight: 1.9 }}>No kills yet —<br />be the first!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(r => {
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`
            const hot = r.isCurrentUser && highlightRank === r.rank
            return (
              <div key={r.rank} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 7.5,
                color: r.isCurrentUser ? '#C89B3C' : '#d8d2c4',
                background: hot ? 'rgba(200,155,60,0.16)' : 'transparent',
                borderRadius: 4, padding: hot ? '2px 4px' : 0,
              }}>
                <span style={{ width: 20, textAlign: 'center' }}>{medal}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}{r.isCurrentUser ? ' ★' : ''}</span>
                <span style={{ color: r.rank <= 3 ? '#fff' : '#a8e0b0' }}>{fmtKillTime(r.timeMs)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══ REACT COMPONENT ═══ */
export default function BossHunter() {
  const [screen, setScreen] = useState<'menu'|'hunt_select'|'playing'|'victory'|'defeat'>('menu')
  const [selWeapon, setSelWeapon] = useState<string>('bow')   // loadout weapon id (base or unlocked reward)
  const [selBoss, setSelBoss] = useState<BossId>(0)
  const [unlockedGear, setUnlockedGear] = useState<GearId[]>([])
  const [selArmour, setSelArmour] = useState<GearId | null>(null)

  // Admins start with every weapon and armour unlocked
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN'
  useEffect(() => {
    if (isAdmin) setUnlockedGear(Object.keys(GEAR_DEFS) as GearId[])
  }, [isAdmin])
  const [victoryBoss, setVictoryBoss] = useState(0)
  const [victoryTimeMs, setVictoryTimeMs] = useState(0)
  const [victoryRank, setVictoryRank] = useState<number | null>(null)
  const submittedRunRef = useRef(false)
  const [lastUnlockedGear, setLastUnlockedGear] = useState<GearId | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const menuCanvasRef = useRef<HTMLCanvasElement>(null)
  const playWrapRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [muted, setMuted] = useState(false)
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
    submittedRunRef.current = false
    Sfx.resume(); Sfx.roar()
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

  const fitCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    // Measure the true visible viewport, independent of the overlay element.
    const de = document.documentElement
    const vw = Math.min(window.innerWidth || Infinity, de.clientWidth || Infinity)
    const vh = Math.min(window.innerHeight || Infinity, de.clientHeight || Infinity)
    if (!isFinite(vw) || !isFinite(vh)) return
    const s = Math.min(vw / CW, vh / CH)
    c.style.width = Math.floor(CW * s) + 'px'
    c.style.height = Math.floor(CH * s) + 'px'
  }, [])

  useEffect(() => {
    if (screen !== 'playing' && screen !== 'hunt_select') return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    fitCanvas()
    const raf = requestAnimationFrame(fitCanvas)
    window.addEventListener('resize', fitCanvas)
    document.addEventListener('fullscreenchange', fitCanvas)
    document.addEventListener('webkitfullscreenchange', fitCanvas)
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fitCanvas)
      document.removeEventListener('fullscreenchange', fitCanvas)
      document.removeEventListener('webkitfullscreenchange', fitCanvas)
    }
  }, [screen, fitCanvas])

  // ── cinematic menu backdrop: a looming, animated game boss in a glowing cavern ──
  useEffect(() => {
    if (screen !== 'menu') return
    const canvas = menuCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const bossId = Math.floor(Math.random() * 3) as BossId
    const g = mkState(WEAPON_DEFS[0], BOSS_DEFS[bossId], [])
    g.bossEnraged = true
    if (bossId === 1) g.boss.angle = -Math.PI / 2
    const T = bossId === 0 ? { g0: 'rgba(120,45,170,0.5)', g1: 'rgba(45,12,75,0.5)', rune: '#b370e0', emb: '155,89,182' }
          : bossId === 1 ? { g0: 'rgba(185,55,0,0.55)', g1: 'rgba(85,18,0,0.5)', rune: '#ff8a1a', emb: '255,95,26' }
          :                { g0: 'rgba(40,135,215,0.46)', g1: 'rgba(18,40,95,0.5)', rune: '#5fe6ff', emb: '122,160,255' }
    const embers = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, sp: 0.03 + Math.random() * 0.06, fl: Math.random() * 6.28 }))
    let raf = 0, lastT = performance.now()
    const fit = () => { canvas.width = canvas.clientWidth || window.innerWidth; canvas.height = canvas.clientHeight || window.innerHeight }
    fit(); window.addEventListener('resize', fit)
    const loop = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now
      g.gtime += dt; g.boss.legPhase += dt * 3.0; g.boss.spinePulse += dt * 2.2; g.boss.lightningPhase += dt * 4.5
      const t = g.gtime, w = canvas.width, h = canvas.height, cx = w * 0.5, cy = h * 0.42
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, w, h)
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.9)
      gr.addColorStop(0, T.g0); gr.addColorStop(0.5, T.g1); gr.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h)
      // rising embers (behind boss)
      ctx.shadowColor = `rgb(${T.emb})`; ctx.shadowBlur = 6
      embers.forEach(e => { e.y -= e.sp * dt; if (e.y < -0.02) { e.y = 1.02; e.x = Math.random() }
        ctx.fillStyle = `rgba(${T.emb},${0.35 + 0.4 * Math.sin(t * 4 + e.fl)})`
        ctx.beginPath(); ctx.arc(e.x * w, e.y * h, e.s, 0, Math.PI * 2); ctx.fill() })
      ctx.shadowBlur = 0
      // boss (loom)
      g.boss.pos.x = cx; g.boss.pos.y = cy - h * 0.04
      if (bossId === 1) { const segs = []; for (let i = 0; i < 30; i++) { const tt = i / 29; segs.push({ x: g.boss.pos.x + Math.sin((1 - tt) * 3) * 46 * (1 - tt), y: g.boss.pos.y + (1 - tt) * 190 }) } g.snakeTrail = segs }
      const sc = Math.min(w / 960, h / 600) * 1.85
      ctx.save(); ctx.translate(g.boss.pos.x, g.boss.pos.y); ctx.scale(sc, sc); ctx.translate(-g.boss.pos.x, -g.boss.pos.y)
      try { renderBoss(ctx, g, bossId, t) } catch { /* keep the menu alive */ }
      ctx.restore()
      // magic rune circle on the ground (foreground)
      const R = Math.min(w, h) * 0.2, rx = cx, ry = h * 0.78
      ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.4); ctx.globalAlpha = 0.85
      ctx.strokeStyle = T.rune; ctx.shadowColor = T.rune; ctx.shadowBlur = 22
      ctx.rotate(t * 0.25); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke()
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke()
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke() }
      ctx.rotate(-t * 0.5)
      for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = off + i * Math.PI * 2 / 3 - Math.PI / 2, px = Math.cos(a) * R * 0.62, py = Math.sin(a) * R * 0.62; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) } ctx.closePath(); ctx.stroke() }
      ctx.restore()
      // vignette
      const vg = ctx.createRadialGradient(cx, h * 0.5, h * 0.18, cx, h * 0.5, Math.max(w, h) * 0.72)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.88)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit) }
  }, [screen])

  // ── unlock audio on first interaction (browser autoplay policy) ──
  useEffect(() => {
    const unlock = () => Sfx.resume()
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  // ── background music keyed to the current screen / boss ──
  useEffect(() => {
    const track = screen === 'playing' ? `battle_${(['spider','drake','griffin'] as const)[selBoss]}`
      : screen === 'victory' ? 'victory' : screen === 'defeat' ? 'defeat' : 'menu'
    Sfx.playMusic(track)
  }, [screen, selBoss])
  useEffect(() => () => { Sfx.stopMusic() }, [])

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

  const beginHunt = useCallback(() => {
    Sfx.resume(); Sfx.uiClick()
    const lw = LOADOUT_WEAPONS.find(w => w.id === selWeapon) ?? LOADOUT_WEAPONS[1]
    startGame(lw.base, selBoss, [lw.gear, selArmour].filter(Boolean) as GearId[])
  }, [selWeapon, selBoss, selArmour, startGame])

  useEffect(() => {
    if (screen !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const lw = LOADOUT_WEAPONS.find(w => w.id === selWeapon) ?? LOADOUT_WEAPONS[1]
    const wpn = getWpn(lw.base)
    const gear: GearId[] = [lw.gear, selArmour].filter(Boolean) as GearId[]

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
      Sfx.dodge()
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
      Sfx.resume()
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
      Sfx.resume()
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

      tick(g, dt, wpn, selBoss, gear, mouseWorldRef.current, new Set(), mouseWorldRef.current, pending)

      if (g.bossDesperate && g.phase === 'playing') Sfx.playMusic('battle_final')   // frantic phase-3 theme

      if (g.phase === 'victory') {
        const killMs = Math.round(g.gtime * 1000)
        setVictoryBoss(selBoss)
        setVictoryTimeMs(killMs)
        setVictoryRank(null)
        const newGear = BOSS_DEFS[selBoss].rewards.filter(r => !unlockedGear.includes(r)) as GearId[]
        const toUnlock = newGear.length > 0 ? newGear[Math.floor(Math.random() * newGear.length)] : null
        if (toUnlock) setUnlockedGear(prev => [...prev, toUnlock])
        setLastUnlockedGear(toUnlock)
        Sfx.victory(); if (toUnlock) Sfx.loot()
        setScreen('victory')
        // record fastest-kill run (logged-in players); a player may rank more than once
        if (!submittedRunRef.current) {
          submittedRunRef.current = true
          fetch('/api/boss-hunter/run', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boss: selBoss, timeMs: killMs }),
          }).then(r => r.ok ? r.json() : null).then(d => { if (d?.rank) setVictoryRank(d.rank) }).catch(() => {})
        }
        return
      }
      if (g.phase === 'defeat') { setScreen('defeat'); return }

      render(ctx, g, wpn, selBoss, gear, g.gtime)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [screen, selWeapon, selBoss, selArmour, unlockedGear, getWpn])

  // ─── MENU ───
  if (screen === 'menu') return (
    <div style={{background:'#05030a',minHeight:'100vh',display:'flex',flexDirection:'column',fontFamily:'"Press Start 2P",monospace',position:'relative',overflow:'hidden'}}>
      <style>{`
        @keyframes bh-pulse{0%,100%{text-shadow:0 0 20px #C89B3C,0 0 40px #C89B3C55}50%{text-shadow:0 0 50px #C89B3C,0 0 100px #C89B3Caa,0 0 160px #C89B3C44}}
        @keyframes bh-flicker{0%,100%{opacity:1}91%{opacity:1}93%{opacity:0.2}95%{opacity:1}97%{opacity:0.4}99%{opacity:1}}
        @keyframes bh-btn{0%,100%{box-shadow:0 0 20px #C89B3C55,0 4px 20px rgba(0,0,0,0.6)}50%{box-shadow:0 0 48px #C89B3Ccc,0 4px 32px rgba(0,0,0,0.9)}}
        .bh-title-1{animation:bh-pulse 2.5s ease-in-out infinite}
        .bh-title-2{animation:bh-pulse 2.5s 0.4s ease-in-out infinite}
        .bh-begin{animation:bh-btn 2s ease-in-out infinite}
      `}</style>

      <canvas ref={menuCanvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0,display:'block'}}/>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(to bottom,transparent 49%,rgba(200,155,60,0.03) 50%,transparent 51%)',backgroundSize:'100% 4px',zIndex:1}}/>

      <div style={{position:'relative',zIndex:2,textAlign:'center',padding:'7px',fontSize:7,color:'#c0392b',letterSpacing:2,animation:'bh-flicker 5s 1s infinite'}}>
        ⚠ WARNING — DANGEROUS BOSSES AHEAD — ENTER AT YOUR OWN RISK ⚠
      </div>

      <div style={{position:'relative',zIndex:2,textAlign:'center',paddingTop:'clamp(16px,3vh,34px)'}}>
        <div style={{fontSize:8,color:'#a07ad0',letterSpacing:4,marginBottom:14,textShadow:'0 0 10px #00000088'}}>◆ GARRET&apos;S WORLD PRESENTS ◆</div>
        <div className="bh-title-1" style={{fontSize:'clamp(40px,9vw,72px)',color:'#C89B3C',letterSpacing:6,lineHeight:1.04}}>BOSS</div>
        <div className="bh-title-2" style={{fontSize:'clamp(40px,9vw,72px)',color:'#C89B3C',letterSpacing:6,lineHeight:1.04}}>HUNTER</div>
      </div>

      <div style={{flex:1}}/>

      <div style={{position:'relative',zIndex:2,textAlign:'center',paddingBottom:'clamp(20px,4vh,40px)'}}>
        <button className="bh-begin" onClick={()=>{Sfx.resume(); Sfx.uiClick(); setScreen('hunt_select')}} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'2px solid #C89B3C44',color:'#0d0d14',padding:'16px 56px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'"Press Start 2P",monospace',letterSpacing:3}}>
          ▶&nbsp;BEGIN HUNT
        </button>
        <div style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap',marginTop:22}}>
          {([['🖱️','Move'],['SPACE','Dodge'],['Q W E R','Abilities'],['💀','Loot']] as [string,string][]).map(([k,v],i)=>(
            <div key={i} style={{fontSize:7,color:'#8a7a78',textShadow:'0 0 8px #000'}}><span style={{color:'#caa84a'}}>{k}</span>&nbsp;{v}</div>
          ))}
        </div>
        {unlockedGear.length > 0 && (
          <div style={{fontSize:7,color:'#6a5a58',marginTop:16,textShadow:'0 0 8px #000'}}>
            GEAR COLLECTED: <span style={{color:'#C89B3C'}}>{unlockedGear.length}</span>
            <span style={{color:'#8a7a78'}}> &bull; LOADOUT: {(LOADOUT_WEAPONS.find(w=>w.id===selWeapon)??LOADOUT_WEAPONS[1]).icon}{selArmour?' '+GEAR_DEFS[selArmour].icon:''}</span>
          </div>
        )}
      </div>
    </div>
  )

  // ─── PREPARE YOUR HUNT (carousel cards) ───
  if (screen === 'hunt_select') {
    const availWeapons = LOADOUT_WEAPONS.filter(w => !w.unlock || unlockedGear.includes(w.unlock))
    let selWIdx = availWeapons.findIndex(w => w.id === selWeapon); if (selWIdx < 0) selWIdx = 0
    const selLW = availWeapons[selWIdx]
    const selWBase = WEAPON_DEFS.find(w => w.id === selLW.base)!
    const selB = BOSS_DEFS[selBoss]

    const prevBoss = () => setSelBoss(((selBoss - 1 + 3) % 3) as BossId)
    const nextBoss = () => setSelBoss(((selBoss + 1) % 3) as BossId)
    const prevWeapon = () => setSelWeapon(availWeapons[(selWIdx - 1 + availWeapons.length) % availWeapons.length].id)
    const nextWeapon = () => setSelWeapon(availWeapons[(selWIdx + 1) % availWeapons.length].id)

    const armourOptions: Array<GearId | null> = [null, ...unlockedGear.filter(g => GEAR_CATEGORY[g] === 'defense')]
    const armourIdx = Math.max(0, armourOptions.indexOf(selArmour))
    const curArmour = selArmour
    const prevArmour = () => setSelArmour(armourOptions[(armourIdx - 1 + armourOptions.length) % armourOptions.length])
    const nextArmour = () => setSelArmour(armourOptions[(armourIdx + 1) % armourOptions.length])

    const arenaNames = ['Spider Lair','Lava Cavern','Storm Peak']

    const navBtn = (onClick: ()=>void, label: string) => (
      <button onClick={onClick} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',width:30,height:30,borderRadius:'50%',fontSize:15,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,lineHeight:1}}>
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
      <div style={{position:'fixed',inset:0,zIndex:9999,background:'#080814',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',padding:'24px',overflowY:'auto'}}>
        <style>{`
          @keyframes bh-card-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          .bh-card-anim{animation:bh-card-in 0.18s ease}
        `}</style>
        <div style={{maxWidth:1100,width:'100%',padding:'0 12px',textAlign:'center'}}>

          <div style={{fontSize:13,color:'#C89B3C',marginBottom:4}}>PREPARE YOUR HUNT</div>
          <div style={{fontSize:7,color:'#605848',marginBottom:20}}>Choose your quarry, arm yourself, and descend</div>

          <div style={{display:'flex',gap:14,alignItems:'stretch',justifyContent:'center',flexWrap:'wrap'}}>

          {/* ── TARGET ── */}
          <div style={{flex:'1 1 0',minWidth:240}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ TARGET</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {navBtn(prevBoss,'‹')}
              <div key={selBoss} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${selB.color}44`,borderRadius:12,overflow:'hidden'}}>
                <div style={{background:`radial-gradient(ellipse at 50% 80%, ${selB.color}30 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                  <div style={{fontSize:72,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 24px ${selB.color})`}}>{selB.icon}</div>
                  <div style={{fontSize:10,color:selB.color,marginBottom:4,letterSpacing:1}}>{selB.name.toUpperCase()}</div>
                  <div style={{fontSize:7,color:'#605848',marginBottom:10}}>{arenaNames[selBoss]} &bull; <span style={{color:selB.color}}>{selB.element}</span></div>
                  <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8,marginBottom:10,fontFamily:'"Press Start 2P",monospace'}}>{selB.lore.slice(0,72)}&hellip;</div>
                  <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                    <div style={{fontSize:7,color:'#605848'}}>HP <span style={{color:'#E74C3C'}}>{selB.hp.toLocaleString()}</span></div>
                    <div style={{fontSize:7,color:'#605848'}}>LOOT <span style={{color:'#C89B3C'}}>{selB.rewards.filter(r=>unlockedGear.includes(r)).length}/{selB.rewards.length}</span></div>
                  </div>
                </div>
                {dots(3, selBoss, selB.color)}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextBoss,'›')}
            </div>
          </div>

          {/* ── WEAPON ── */}
          <div style={{flex:'1 1 0',minWidth:240}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ WEAPON</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {navBtn(prevWeapon,'‹')}
              <div key={selLW.id} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${selLW.color}44`,borderRadius:12,overflow:'hidden'}}>
                <div style={{background:`radial-gradient(ellipse at 50% 80%, ${selLW.color}28 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                  <div style={{fontSize:64,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 20px ${selLW.color})`}}>{selLW.icon}</div>
                  <div style={{fontSize:10,color:selLW.color,marginBottom:4,letterSpacing:1}}>{selLW.name.toUpperCase()}</div>
                  <div style={{fontSize:7,color:'#605848',marginBottom:10}}>{selWBase.element.toUpperCase()} &bull; DMG <span style={{color:'#C89B3C'}}>{selWBase.dmg}</span> &bull; RANGE <span style={{color:'#C89B3C'}}>{selWBase.range}</span></div>
                  <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8,marginBottom:10}}>{selLW.sub}{selLW.gear?'':' (starter)'}</div>
                  <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                    {selWBase.abilities.map((ab,i)=>(
                      <div key={i} style={{fontSize:6,color:'#605848'}}><span style={{color:selLW.color}}>[{['Q','W','E','R'][i]}]</span> {ab.name}</div>
                    ))}
                  </div>
                </div>
                {dots(availWeapons.length, selWIdx, selLW.color)}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextWeapon,'›')}
            </div>
          </div>

          {/* ── ARMOUR ── */}
          <div style={{flex:'1 1 0',minWidth:240}}>
            <div style={{fontSize:7,color:'#605848',letterSpacing:2,marginBottom:8,textAlign:'left'}}>◆ ARMOUR</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {navBtn(prevArmour,'‹')}
              <div key={curArmour??'none'} className="bh-card-anim" style={{flex:1,background:'#0d0d14',border:`1px solid ${curArmour?'#3498DB44':'#1e1c18'}`,borderRadius:12,overflow:'hidden'}}>
                {curArmour ? (() => {
                  const g = GEAR_DEFS[curArmour]
                  const gc = '#3498DB'
                  return (
                    <div style={{background:`radial-gradient(ellipse at 50% 80%, ${gc}22 0%, transparent 70%)`,padding:'20px 16px 12px',textAlign:'center'}}>
                      <div style={{fontSize:56,lineHeight:1,marginBottom:8,filter:`drop-shadow(0 0 16px ${gc})`}}>{g.icon}</div>
                      <div style={{fontSize:9,color:'#E8E6E0',marginBottom:4}}>{g.name}</div>
                      <div style={{fontSize:6,color:gc,marginBottom:8,letterSpacing:1}}>ARMOUR</div>
                      <div style={{fontSize:7,color:'#3a3020',lineHeight:1.8}}>{g.desc}</div>
                    </div>
                  )
                })() : (
                  <div style={{padding:'24px 16px',textAlign:'center'}}>
                    <div style={{fontSize:40,marginBottom:8,opacity:0.2}}>🛡️</div>
                    <div style={{fontSize:8,color:'#3a3020',marginBottom:4}}>NO ARMOUR</div>
                    {armourOptions.length<=1
                      ? <div style={{fontSize:6,color:'#2a2820'}}>defeat a boss to unlock</div>
                      : <div style={{fontSize:6,color:'#2a2820'}}>navigate to equip</div>
                    }
                  </div>
                )}
                {dots(armourOptions.length, armourIdx, '#3498DB')}
                <div style={{height:12}}/>
              </div>
              {navBtn(nextArmour,'›')}
            </div>
          </div>

          </div>

          <div style={{borderTop:'1px solid #1e1c18',margin:'20px 0'}}/>

          {/* fastest-kill board for the selected boss */}
          <div style={{maxWidth:360,margin:'0 auto 18px'}}>
            <BossLeaderboard boss={selBoss} />
          </div>

          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button onClick={()=>setScreen('menu')} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 24px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>BACK</button>
            <button onClick={beginHunt} style={{background:'linear-gradient(135deg,#C89B3C,#8B6914)',border:'none',color:'#0d0d14',padding:'10px 32px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit',letterSpacing:1}}>
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
        .bh-canvas{display:block;cursor:crosshair;width:auto;height:auto;max-width:100%;max-height:100%;min-width:0;min-height:0;object-fit:contain;}
      `}</style>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:0}}>
        <canvas ref={canvasRef} width={CW} height={CH} className="bh-canvas" />
      </div>
      <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6,zIndex:1}}>
        <button onClick={() => { const nm = !muted; setMuted(nm); Sfx.setMuted(nm); Sfx.resume() }} style={{background:'rgba(4,4,14,0.85)',border:'1px solid #2a2820',color:'#605848',padding:'4px 10px',borderRadius:4,fontSize:7,cursor:'pointer',fontFamily:'inherit'}}>{muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}</button>
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
      <div style={{background:'#080814',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',overflowY:'auto',padding:'24px 0'}}>
        <div className="bh-screen-wrap" style={{textAlign:'center',maxWidth:560,padding:'0 24px'}}>
          <div style={{fontSize:9,color:'#605848',marginBottom:12}}>HUNT COMPLETE</div>
          <div style={{fontSize:22,color:'#C89B3C',textShadow:'0 0 24px #C89B3C88',marginBottom:8}}>VICTORY!</div>
          <div style={{fontSize:10,color:boss.color,marginBottom:10}}>{boss.name} Defeated</div>
          <div style={{fontSize:11,color:'#a8e0b0',marginBottom:victoryRank!=null?4:20}}>⏱ Kill Time: {fmtKillTime(victoryTimeMs)}</div>
          {victoryRank != null && (
            <div style={{fontSize:9,color:'#C89B3C',marginBottom:18,textShadow:'0 0 14px #C89B3C66'}}>
              {victoryRank <= 10 ? `🏆 You ranked #${victoryRank}!` : `Your rank: #${victoryRank}`}
            </div>
          )}
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
                    <div style={{fontSize:8,color:'#E8E6E0',marginBottom:2}}>{GEAR_DEFS[gid].name} <span style={{fontSize:7,color:cat==='attack'?'#E74C3C':'#3498DB'}}>[{cat==='attack'?'WEAPON':'ARMOUR'}]</span></div>
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
          <div style={{marginBottom:16}}>
            <BossLeaderboard boss={victoryBoss} highlightRank={victoryRank} refreshKey={victoryRank ?? 0} />
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={beginHunt} style={{background:'#1a1a28',border:'1px solid #2a2820',color:'#A09880',padding:'10px 20px',borderRadius:6,fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>REMATCH</button>
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
    <div style={{background:'radial-gradient(ellipse at 50% 42%, #2a0606 0%, #0a0204 55%, #050203 100%)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',overflow:'hidden'}}>
      <style>{`
        @keyframes bh-die-in{0%{opacity:0;transform:translateY(14px) scale(0.94)}100%{opacity:1;transform:none}}
        @keyframes bh-skull-pulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 18px #c0151588)}50%{transform:scale(1.06);filter:drop-shadow(0 0 34px #e74c3ccc)}}
        @keyframes bh-died-glow{0%,100%{text-shadow:0 0 18px #c01515aa,0 0 40px #6e0a0a66}50%{text-shadow:0 0 30px #ff2a2a,0 0 64px #c01515aa}}
        .bh-die{animation:bh-die-in 0.6s cubic-bezier(.2,.8,.2,1) both}
      `}</style>
      <div className="bh-die" style={{textAlign:'center',maxWidth:480,padding:'0 24px'}}>
        <div style={{fontSize:64,marginBottom:10,animation:'bh-skull-pulse 2.4s ease-in-out infinite'}}>💀</div>
        <div style={{fontSize:30,color:'#a01212',letterSpacing:4,marginBottom:10,animation:'bh-died-glow 2.6s ease-in-out infinite'}}>YOU DIED</div>
        <div style={{fontSize:9,color:'#7a5a5a',marginBottom:26}}>Slain by the {BOSS_DEFS[selBoss].name}</div>
        <div style={{fontSize:8,color:'#9a8a86',marginBottom:30,lineHeight:'2'}}>
          Read the telegraphs &mdash; every attack can be dodged.<br/>
          Keep your distance with ranged weapons; close in with melee.
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={beginHunt} style={{background:'linear-gradient(135deg,#E74C3C,#922B21)',border:'none',color:'#fff',padding:'12px 28px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit',letterSpacing:1,boxShadow:'0 0 20px #e74c3c44'}}>↻ TRY AGAIN</button>
          <button onClick={() => setScreen('menu')} style={{background:'#160a0a',border:'1px solid #3a1a1a',color:'#A09880',padding:'12px 22px',borderRadius:6,fontSize:9,cursor:'pointer',fontFamily:'inherit'}}>MENU</button>
        </div>
      </div>
    </div>
  )
}

