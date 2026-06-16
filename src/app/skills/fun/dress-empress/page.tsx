'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { emitXpGained } from '@/components/XpToast'
import GameLeaderboard from '@/components/GameLeaderboard'

/* ═══════════════════════════════════════════════════════════════════
   DRESS TO EMPRESS — a magical dress-up adventure
   A self-contained client game. Progress saves to localStorage.
   ═══════════════════════════════════════════════════════════════════ */

/* ───────────────── themes (used by challenges + item tags) ─────────── */
type Theme =
  | 'princess' | 'fairy' | 'mermaid' | 'queen' | 'empress'
  | 'winter' | 'garden' | 'ocean' | 'night' | 'dragon' | 'sunny' | 'rainbow'

const THEME_LABEL: Record<Theme, string> = {
  princess: 'Princess', fairy: 'Fairy', mermaid: 'Mermaid', queen: 'Queen',
  empress: 'Empress', winter: 'Winter', garden: 'Garden', ocean: 'Ocean',
  night: 'Night', dragon: 'Dragon', sunny: 'Sunny', rainbow: 'Rainbow',
}

/* ───────────────── rarity ─────────── */
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
const RARITY: Record<Rarity, { label: string; color: string; pts: number }> = {
  common:    { label: 'Common',    color: '#9aa6b2', pts: 1 },
  uncommon:  { label: 'Uncommon',  color: '#5fbf7a', pts: 2 },
  rare:      { label: 'Rare',      color: '#5aa0ee', pts: 3 },
  epic:      { label: 'Epic',      color: '#b06be0', pts: 5 },
  legendary: { label: 'Legendary', color: '#f0a93c', pts: 8 },
}

/* ───────────────── categories ─────────── */
type Cat = 'skin' | 'eyes' | 'hair' | 'dress' | 'shoes' | 'crown'
  | 'necklace' | 'wings' | 'cape' | 'pet' | 'bg' | 'effect'

const CAT_INFO: { cat: Cat; label: string; icon: string }[] = [
  { cat: 'dress', label: 'Dresses', icon: '👗' },
  { cat: 'hair', label: 'Hair', icon: '💇‍♀️' },
  { cat: 'crown', label: 'Crowns', icon: '👑' },
  { cat: 'necklace', label: 'Jewelry', icon: '📿' },
  { cat: 'shoes', label: 'Shoes', icon: '👠' },
  { cat: 'wings', label: 'Wings', icon: '🧚' },
  { cat: 'cape', label: 'Capes', icon: '🧣' },
  { cat: 'pet', label: 'Pets', icon: '🐾' },
  { cat: 'bg', label: 'Scenes', icon: '🏰' },
  { cat: 'effect', label: 'Magic', icon: '✨' },
  { cat: 'skin', label: 'Skin', icon: '🎨' },
  { cat: 'eyes', label: 'Eyes', icon: '👁️' },
]

/* ───────────────── item type ─────────── */
interface Item {
  id: string
  cat: Cat
  name: string
  rarity: Rarity
  themes: Theme[]
  price: number          // 0 = starter (owned by default). coins, unless gem=true
  gem?: boolean          // priced in gems
  lvl?: number           // min empress level to appear in shop
  p: any                 // render params (shape, colors…)
}

const c = (
  id: string, cat: Cat, name: string, rarity: Rarity, themes: Theme[],
  price: number, p: any, opts: { gem?: boolean; lvl?: number } = {},
): Item => ({ id, cat, name, rarity, themes, price, p, ...opts })

/* ════════════════════════ ITEM CATALOG ════════════════════════ */

const SKINS: Item[] = [
  c('skin_light', 'skin', 'Light', 'common', [], 0, { base: '#ffe0c4', shade: '#f3c8a6' }),
  c('skin_warm', 'skin', 'Warm', 'common', [], 0, { base: '#f4c89a', shade: '#e3ad7c' }),
  c('skin_tan', 'skin', 'Tan', 'common', [], 0, { base: '#d99a6c', shade: '#c2814f' }),
  c('skin_brown', 'skin', 'Brown', 'common', [], 0, { base: '#a9714b', shade: '#8c5a38' }),
  c('skin_deep', 'skin', 'Deep', 'common', [], 0, { base: '#7d4d2e', shade: '#653b21' }),
]

const EYES: Item[] = [
  c('eye_blue', 'eyes', 'Blue', 'common', [], 0, { color: '#5aa0e0' }),
  c('eye_green', 'eyes', 'Green', 'common', [], 0, { color: '#5fae6a' }),
  c('eye_brown', 'eyes', 'Brown', 'common', [], 0, { color: '#8a5a32' }),
  c('eye_violet', 'eyes', 'Violet', 'common', [], 0, { color: '#9b6fd6' }),
  c('eye_pink', 'eyes', 'Pink', 'common', [], 0, { color: '#e07ab0' }),
  c('eye_aqua', 'eyes', 'Aqua', 'common', ['mermaid', 'ocean'], 0, { color: '#3ec7c7' }),
]

const HAIR: Item[] = [
  c('hair_wave_brn', 'hair', 'Long Waves', 'common', [], 0, { style: 'wave', color: '#7a4a2a', hi: '#9c6438' }),
  c('hair_wave_blk', 'hair', 'Midnight Waves', 'common', ['night'], 0, { style: 'wave', color: '#2c2733', hi: '#4a4458' }),
  c('hair_pony_blonde', 'hair', 'Golden Pony', 'common', ['princess', 'sunny'], 0, { style: 'pony', color: '#e9c069', hi: '#f6dd96' }),
  c('hair_bun_brn', 'hair', 'Sweet Bun', 'uncommon', ['queen'], 120, { style: 'bun', color: '#5c3a22', hi: '#7c4f30' }),
  c('hair_twin_pink', 'hair', 'Pink Twintails', 'uncommon', ['fairy', 'rainbow'], 160, { style: 'twin', color: '#f29ac6', hi: '#ffc0de' }),
  c('hair_braid_gold', 'hair', 'Royal Braids', 'rare', ['queen', 'princess'], 300, { style: 'braid', color: '#caa24a', hi: '#ecc868' }),
  c('hair_curl_red', 'hair', 'Ruby Curls', 'rare', ['dragon'], 320, { style: 'curl', color: '#b03a2e', hi: '#d4533f' }),
  c('hair_aqua_long', 'hair', 'Ocean Flow', 'epic', ['mermaid', 'ocean'], 30, { style: 'wave', color: '#3aa6c9', hi: '#6fd6ec' }, { gem: true, lvl: 6 }),
  c('hair_snow', 'hair', 'Snow Queen Hair', 'epic', ['winter'], 34, { style: 'braid', color: '#d8e6f2', hi: '#ffffff' }, { gem: true, lvl: 8 }),
  c('hair_celest', 'hair', 'Starlight Hair', 'legendary', ['empress', 'night'], 60, { style: 'wave', color: '#6a5ad0', hi: '#b9a6ff' }, { gem: true, lvl: 20 }),
]

const DRESSES: Item[] = [
  c('dr_start', 'dress', 'Daydream Dress', 'common', [], 0, { shape: 'aline', bodice: '#f08fb6', skirt: '#ffb3d1', trim: '#fff0f6' }),
  c('dr_blue', 'dress', 'Bluebell Dress', 'common', [], 0, { shape: 'puffy', bodice: '#7fb0e8', skirt: '#a7cdf6', trim: '#ffffff' }),
  c('dr_mint', 'dress', 'Mint Twirl', 'common', ['garden'], 0, { shape: 'aline', bodice: '#86d6b0', skirt: '#aee9cd', trim: '#ffffff' }),
  c('dr_ball_pink', 'dress', 'Ballroom Rose', 'uncommon', ['princess'], 180, { shape: 'ball', bodice: '#e86a9e', skirt: '#ffb0d2', trim: '#fff4c2', sparkle: true }),
  c('dr_garden', 'dress', 'Petal Gown', 'uncommon', ['fairy', 'garden'], 200, { shape: 'puffy', bodice: '#bfe06a', skirt: '#e4f2a8', trim: '#ffd6ec', sparkle: true }),
  c('dr_tea', 'dress', 'Tea Party Frock', 'uncommon', ['sunny', 'garden'], 190, { shape: 'aline', bodice: '#f6c95a', skirt: '#ffe39a', trim: '#ffffff' }),
  c('dr_mermaid', 'dress', 'Sea Pearl Gown', 'rare', ['mermaid', 'ocean'], 420, { shape: 'mermaid', bodice: '#3aa6c9', skirt: '#7fe0e0', trim: '#dff8ff', sparkle: true }),
  c('dr_royal', 'dress', 'Royal Velvet', 'rare', ['queen'], 460, { shape: 'royal', bodice: '#7b3aa0', skirt: '#9a55c2', trim: '#f0c860', sparkle: true }),
  c('dr_winter', 'dress', 'Frostlight Gown', 'rare', ['winter'], 440, { shape: 'ball', bodice: '#9fc4e8', skirt: '#d8ecff', trim: '#ffffff', sparkle: true }),
  c('dr_rainbow', 'dress', 'Rainbow Dream', 'epic', ['rainbow', 'fairy'], 40, { shape: 'puffy', bodice: '#ff8fb0', skirt: '#ffd36a', trim: '#8fe0ff', rainbow: true, sparkle: true }, { gem: true, lvl: 10 }),
  c('dr_dragon', 'dress', 'Ember Empress Gown', 'epic', ['dragon'], 44, { shape: 'royal', bodice: '#b3261e', skirt: '#e85a2a', trim: '#ffcf4a', sparkle: true }, { gem: true, lvl: 12 }),
  c('dr_empress', 'dress', 'Moonlight Empress', 'legendary', ['empress', 'night'], 90, { shape: 'royal', bodice: '#4a3aa0', skirt: '#6d5cd6', trim: '#f4e08a', sparkle: true, celest: true }, { gem: true, lvl: 22 }),
  c('dr_swan', 'dress', 'Golden Swan Gown', 'legendary', ['queen', 'empress'], 85, { shape: 'mermaid', bodice: '#f3e6c0', skirt: '#fff6df', trim: '#e8c45c', sparkle: true }, { gem: true, lvl: 18 }),
]

const SHOES: Item[] = [
  c('sh_flat_pink', 'shoes', 'Pink Flats', 'common', [], 0, { style: 'flat', color: '#f28fb6' }),
  c('sh_flat_white', 'shoes', 'White Flats', 'common', [], 0, { style: 'flat', color: '#ffffff' }),
  c('sh_glass', 'shoes', 'Glass Slippers', 'rare', ['princess', 'winter'], 240, { style: 'glass', color: '#bfe6ff' }),
  c('sh_heel_gold', 'shoes', 'Golden Heels', 'rare', ['queen', 'empress'], 260, { style: 'heel', color: '#e8c45c' }),
  c('sh_leaf', 'shoes', 'Leaf Slippers', 'uncommon', ['fairy', 'garden'], 150, { style: 'flat', color: '#8fd66a' }),
  c('sh_boot', 'shoes', 'Adventure Boots', 'uncommon', ['dragon'], 140, { style: 'boot', color: '#9a6a3a' }),
  c('sh_pearl', 'shoes', 'Pearl Sandals', 'epic', ['mermaid', 'ocean'], 26, { style: 'glass', color: '#cdeef0' }, { gem: true, lvl: 6 }),
]

const CROWNS: Item[] = [
  c('cr_none', 'crown', 'No Crown', 'common', [], 0, { style: 'none' }),
  c('cr_tiara', 'crown', 'Pearl Tiara', 'common', ['princess'], 0, { style: 'tiara', metal: '#f0e4b0', gem: '#ff9ec4' }),
  c('cr_flower', 'crown', 'Flower Crown', 'uncommon', ['fairy', 'garden'], 160, { style: 'flower', metal: '#8fd66a', gem: '#ff9ec4' }),
  c('cr_shell', 'crown', 'Shell Crown', 'rare', ['mermaid', 'ocean'], 280, { style: 'shell', metal: '#ffd9a8', gem: '#7fe0e0' }),
  c('cr_gold', 'crown', 'Queen Crown', 'rare', ['queen'], 320, { style: 'gold', metal: '#f0c84a', gem: '#e0506a' }),
  c('cr_ice', 'crown', 'Frost Crown', 'epic', ['winter'], 30, { style: 'tiara', metal: '#d6ecff', gem: '#bfe6ff' }, { gem: true, lvl: 8 }),
  c('cr_dragon', 'crown', 'Dragon Crown', 'epic', ['dragon'], 36, { style: 'dragon', metal: '#e85a2a', gem: '#ffcf4a' }, { gem: true, lvl: 12 }),
  c('cr_celest', 'crown', 'Crystal Crown', 'legendary', ['empress', 'night'], 80, { style: 'gold', metal: '#b9a6ff', gem: '#f4e08a' }, { gem: true, lvl: 22 }),
]

const NECKS: Item[] = [
  c('nk_none', 'necklace', 'No Jewelry', 'common', [], 0, { style: 'none' }),
  c('nk_pearl', 'necklace', 'Pearl Strand', 'common', ['princess', 'queen'], 0, { style: 'pearl', color: '#fff6e0' }),
  c('nk_gem_pink', 'necklace', 'Rose Gem', 'uncommon', ['princess', 'rainbow'], 120, { style: 'gem', color: '#ff7ab0' }),
  c('nk_shell', 'necklace', 'Sea Shell', 'uncommon', ['mermaid', 'ocean'], 130, { style: 'shell', color: '#7fe0e0' }),
  c('nk_emerald', 'necklace', 'Emerald Drop', 'rare', ['garden', 'queen'], 240, { style: 'gem', color: '#4fd07a' }),
  c('nk_diamond', 'necklace', 'Diamond Drop', 'epic', ['empress', 'queen'], 28, { style: 'gem', color: '#bfe6ff' }, { gem: true, lvl: 14 }),
]

const WINGS: Item[] = [
  c('wg_none', 'wings', 'No Wings', 'common', [], 0, { style: 'none' }),
  c('wg_fairy', 'wings', 'Fairy Wings', 'uncommon', ['fairy', 'garden'], 220, { style: 'fairy', color: '#bfeaff' }),
  c('wg_butterfly', 'wings', 'Butterfly Wings', 'rare', ['fairy', 'rainbow'], 360, { style: 'butterfly', color: '#ff9ec4' }),
  c('wg_feather', 'wings', 'Swan Wings', 'rare', ['queen', 'winter'], 380, { style: 'feather', color: '#ffffff' }),
  c('wg_rainbow', 'wings', 'Rainbow Fairy Wings', 'legendary', ['rainbow', 'fairy'], 70, { style: 'butterfly', color: '#ffd36a', rainbow: true }, { gem: true, lvl: 16 }),
  c('wg_celest', 'wings', 'Celestial Wings', 'legendary', ['empress', 'night'], 88, { style: 'feather', color: '#b9a6ff' }, { gem: true, lvl: 24 }),
]

const CAPES: Item[] = [
  c('cp_none', 'cape', 'No Cape', 'common', [], 0, { style: 'none' }),
  c('cp_royal', 'cape', 'Royal Cape', 'rare', ['queen'], 300, { style: 'royal', color: '#b23a55', trim: '#f0d49a' }),
  c('cp_velvet', 'cape', 'Velvet Cape', 'rare', ['queen', 'night'], 300, { style: 'royal', color: '#5a3aa0', trim: '#f0c860' }),
  c('cp_dragon', 'cape', 'Dragon Queen Cape', 'epic', ['dragon'], 40, { style: 'royal', color: '#7a1f16', trim: '#e85a2a' }, { gem: true, lvl: 12 }),
  c('cp_celest', 'cape', 'Starfall Cape', 'legendary', ['empress', 'night'], 90, { style: 'royal', color: '#3a2f6e', trim: '#b9a6ff', stars: true }, { gem: true, lvl: 26 }),
]

const PETS: Item[] = [
  c('pet_none', 'pet', 'No Pet', 'common', [], 0, { style: 'none' }),
  c('pet_cat', 'pet', 'Kitten', 'common', [], 0, { style: 'cat', color: '#f0c98a' }),
  c('pet_bunny', 'pet', 'Bunny', 'uncommon', ['fairy', 'garden'], 180, { style: 'bunny', color: '#ffffff' }),
  c('pet_puppy', 'pet', 'Puppy', 'uncommon', ['sunny'], 180, { style: 'cat', color: '#caa06a', ears: 'flop' }),
  c('pet_fox', 'pet', 'Fox', 'rare', ['garden', 'sunny'], 280, { style: 'fox', color: '#e8884a' }),
  c('pet_swan', 'pet', 'Swan', 'rare', ['queen', 'ocean'], 300, { style: 'swan', color: '#ffffff' }),
  c('pet_owl', 'pet', 'Owl', 'rare', ['night'], 280, { style: 'owl', color: '#b59a6a' }),
  c('pet_unicorn', 'pet', 'Unicorn', 'epic', ['fairy', 'rainbow'], 40, { style: 'unicorn', color: '#ffffff', mane: '#ff9ec4' }, { gem: true, lvl: 10 }),
  c('pet_dragon', 'pet', 'Baby Dragon', 'legendary', ['dragon', 'empress'], 75, { style: 'dragon', color: '#6fae5a' }, { gem: true, lvl: 18 }),
]

const BGS: Item[] = [
  c('bg_castle', 'bg', 'Castle Hall', 'common', ['princess'], 0, { style: 'castle' }),
  c('bg_ball', 'bg', 'Ballroom', 'uncommon', ['princess', 'queen'], 120, { style: 'ball' }),
  c('bg_garden', 'bg', 'Fairy Garden', 'uncommon', ['fairy', 'garden'], 120, { style: 'garden' }),
  c('bg_ocean', 'bg', 'Mermaid Cove', 'rare', ['mermaid', 'ocean'], 220, { style: 'ocean' }),
  c('bg_winter', 'bg', 'Snow Palace', 'rare', ['winter'], 220, { style: 'winter' }),
  c('bg_night', 'bg', 'Moonlit Sky', 'epic', ['night', 'empress'], 28, { style: 'night' }, { gem: true, lvl: 12 }),
  c('bg_dragon', 'bg', 'Dragon Throne', 'epic', ['dragon'], 30, { style: 'dragon' }, { gem: true, lvl: 14 }),
  c('bg_celest', 'bg', 'Celestial Kingdom', 'legendary', ['empress', 'rainbow'], 80, { style: 'celest' }, { gem: true, lvl: 26 }),
]

const EFFECTS: Item[] = [
  c('fx_none', 'effect', 'No Magic', 'common', [], 0, { style: 'none' }),
  c('fx_sparkle', 'effect', 'Sparkles', 'common', [], 0, { style: 'sparkle' }),
  c('fx_hearts', 'effect', 'Floating Hearts', 'uncommon', ['princess', 'rainbow'], 140, { style: 'hearts' }),
  c('fx_petals', 'effect', 'Flower Petals', 'uncommon', ['fairy', 'garden'], 140, { style: 'petals' }),
  c('fx_snow', 'effect', 'Snowflakes', 'rare', ['winter'], 220, { style: 'snow' }),
  c('fx_bubbles', 'effect', 'Bubbles', 'rare', ['mermaid', 'ocean'], 220, { style: 'bubbles' }),
  c('fx_stars', 'effect', 'Star Glow', 'epic', ['night', 'empress'], 30, { style: 'stars' }, { gem: true, lvl: 16 }),
  c('fx_aura', 'effect', 'Empress Aura', 'legendary', ['empress'], 70, { style: 'aura' }, { gem: true, lvl: 24 }),
]

const ALL: Item[] = [
  ...SKINS, ...EYES, ...HAIR, ...DRESSES, ...SHOES, ...CROWNS,
  ...NECKS, ...WINGS, ...CAPES, ...PETS, ...BGS, ...EFFECTS,
]
const BY_ID: Record<string, Item> = Object.fromEntries(ALL.map(i => [i.id, i]))
const STARTERS = ALL.filter(i => i.price === 0).map(i => i.id)

/* ════════════════════════ CHALLENGES ════════════════════════ */
interface Challenge {
  id: string; name: string; emoji: string; theme: Theme; bg: string
  desc: string; hint: string; coins: number; gems: number; xp: number
  minLvl: number
}
const CHALLENGES: Challenge[] = [
  { id: 'royal_ball', name: 'Royal Ball', emoji: '💃', theme: 'princess', bg: 'bg_ball', desc: 'Dress for a fancy royal dance!', hint: 'Ball gowns, crowns & sparkly shoes', coins: 150, gems: 1, xp: 30, minLvl: 1 },
  { id: 'fairy_garden', name: 'Fairy Garden Party', emoji: '🧚', theme: 'fairy', bg: 'bg_garden', desc: 'A magical party among the flowers.', hint: 'Wings, flower crowns & a cute pet', coins: 170, gems: 1, xp: 32, minLvl: 1 },
  { id: 'tea_party', name: 'Sunny Tea Party', emoji: '🫖', theme: 'sunny', bg: 'bg_garden', desc: 'A cozy afternoon tea in the sunshine.', hint: 'Soft pastels and pretty hair', coins: 150, gems: 1, xp: 28, minLvl: 1 },
  { id: 'winter_princess', name: 'Winter Princess', emoji: '❄️', theme: 'winter', bg: 'bg_winter', desc: 'Sparkle in the snow palace.', hint: 'Frost gowns, ice crowns & snow magic', coins: 200, gems: 1, xp: 36, minLvl: 4 },
  { id: 'mermaid_fest', name: 'Mermaid Festival', emoji: '🧜‍♀️', theme: 'mermaid', bg: 'bg_ocean', desc: 'Shine under the sea!', hint: 'Sea gowns, shell crowns & bubbles', coins: 220, gems: 2, xp: 40, minLvl: 6 },
  { id: 'flower_fest', name: 'Flower Festival', emoji: '🌸', theme: 'garden', bg: 'bg_garden', desc: 'Celebrate spring blooms.', hint: 'Petal gowns & flower magic', coins: 200, gems: 1, xp: 34, minLvl: 4 },
  { id: 'coronation', name: 'Castle Coronation', emoji: '👑', theme: 'queen', bg: 'bg_ball', desc: 'Become the queen of the castle!', hint: 'Royal velvet, capes & gold crowns', coins: 260, gems: 2, xp: 44, minLvl: 8 },
  { id: 'rainbow_parade', name: 'Rainbow Parade', emoji: '🌈', theme: 'rainbow', bg: 'bg_garden', desc: 'The most colorful day of the year!', hint: 'Rainbow dresses & happy magic', coins: 240, gems: 2, xp: 42, minLvl: 10 },
  { id: 'moonlight', name: 'Moonlight Dance', emoji: '🌙', theme: 'night', bg: 'bg_night', desc: 'Dance beneath the stars.', hint: 'Starlight gowns & star glow', coins: 280, gems: 2, xp: 48, minLvl: 12 },
  { id: 'dragon_banquet', name: 'Dragon Banquet', emoji: '🐉', theme: 'dragon', bg: 'bg_dragon', desc: 'A daring feast in the dragon hall.', hint: 'Ember gowns, dragon crown & a baby dragon', coins: 300, gems: 2, xp: 50, minLvl: 12 },
  { id: 'empress_cer', name: 'Empress Ceremony', emoji: '✨', theme: 'empress', bg: 'bg_celest', desc: 'The grandest event in the kingdom!', hint: 'Legendary empress gowns & celestial magic', coins: 400, gems: 3, xp: 70, minLvl: 18 },
]

/* ════════════════════════ JUDGES (cute, positive) ════════════════════════ */
const JUDGES = ['Queen Rose 🌹', 'Fairy Luna 🌙', 'Mermaid Pearl 🐚', 'Princess Ember 🔥', 'Duchess Violet 💜']
const PRAISE: Record<number, string[]> = {
  5: ['Empress Perfect! You matched the theme beautifully! 👑', 'Absolutely stunning — a true Empress! ✨', 'Flawless! The whole kingdom is cheering! 🌟'],
  4: ['Royal Style! So elegant and lovely! 💖', 'Gorgeous look — almost perfect! 👑', 'Beautiful! You have wonderful taste! ✨'],
  3: ['Beautiful! You look amazing! 💕', 'So pretty! A lovely outfit! 🌸', 'Lovely look — well done! 💫'],
  2: ['Cute look! Try adding a little more sparkle! ✨', 'Adorable! A matching crown would shine! 👑', 'Sweet style! Keep it up! 💛'],
  1: ['Nice try! Add more theme pieces next time! 🌷', 'Cute start! Try matching the theme color! 🎨', 'Good effort! Sparkle items help a lot! ✨'],
}

/* ════════════════════════ ECONOMY / LEVELS ════════════════════════ */
function levelFromXp(xp: number): number {
  return Math.min(30, Math.floor(Math.sqrt(xp / 30)) + 1)
}
function xpForLevel(lvl: number): number {
  return Math.pow(lvl - 1, 2) * 30
}

/* ════════════════════════ SAVE STATE ════════════════════════ */
type Equip = Record<Cat, string>
interface Save {
  name: string
  coins: number
  gems: number
  xp: number
  owned: string[]
  equip: Equip
  dailyDay: number
  lastClaim: string
  best: Record<string, number> // challenge id -> best stars
}
const DEFAULT_EQUIP: Equip = {
  skin: 'skin_light', eyes: 'eye_blue', hair: 'hair_wave_brn', dress: 'dr_start',
  shoes: 'sh_flat_pink', crown: 'cr_tiara', necklace: 'nk_pearl', wings: 'wg_none',
  cape: 'cp_none', pet: 'pet_cat', bg: 'bg_castle', effect: 'fx_sparkle',
}
function freshSave(): Save {
  return {
    name: 'Princess', coins: 250, gems: 3, xp: 0, owned: [...STARTERS],
    equip: { ...DEFAULT_EQUIP }, dailyDay: 0, lastClaim: '', best: {},
  }
}
const SAVE_KEY = 'dress-empress-save-v1'
function loadSave(): Save {
  if (typeof window === 'undefined') return freshSave()
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return freshSave()
    const s = JSON.parse(raw) as Save
    const f = freshSave()
    return {
      ...f, ...s,
      equip: { ...f.equip, ...(s.equip || {}) },
      owned: Array.from(new Set([...STARTERS, ...(s.owned || [])])),
      best: s.best || {},
    }
  } catch { return freshSave() }
}

/* ════════════════════════ SCORING ════════════════════════ */
function scoreOutfit(equip: Equip, ch: Challenge) {
  let pts = 0
  const filled: Cat[] = ['dress', 'hair', 'shoes', 'crown', 'necklace', 'wings', 'cape', 'pet', 'bg']
  let matches = 0
  for (const cat of filled) {
    const it = BY_ID[equip[cat]]
    if (!it || it.p?.style === 'none') continue
    pts += RARITY[it.rarity].pts
    if (it.themes.includes(ch.theme)) { pts += 6; matches++ }
    if (it.p?.sparkle || it.p?.rainbow || it.p?.celest) pts += 1
  }
  // bonuses
  const dress = BY_ID[equip.dress]
  if (dress?.themes.includes(ch.theme)) pts += 6      // dress is most important
  if (BY_ID[equip.bg]?.p?.style && BGS.find(b => b.id === equip.bg)?.themes.includes(ch.theme)) pts += 4
  const effect = BY_ID[equip.effect]
  if (effect && effect.p?.style !== 'none' && effect.themes.includes(ch.theme)) pts += 4

  // stars from points (kid-friendly thresholds)
  let stars = 1
  if (pts >= 18) stars = 2
  if (pts >= 30) stars = 3
  if (pts >= 44) stars = 4
  if (pts >= 58) stars = 5
  return { pts, stars, matches }
}

/* ════════════════════════ AVATAR (SVG) ════════════════════════ */
function Avatar({ equip, size = 300 }: { equip: Equip; size?: number }) {
  const skin = BY_ID[equip.skin]?.p || SKINS[0].p
  const eye = BY_ID[equip.eyes]?.p || EYES[0].p
  const hair = BY_ID[equip.hair]?.p
  const dress = BY_ID[equip.dress]?.p
  const shoes = BY_ID[equip.shoes]?.p
  const crown = BY_ID[equip.crown]?.p
  const neck = BY_ID[equip.necklace]?.p
  const wings = BY_ID[equip.wings]?.p
  const cape = BY_ID[equip.cape]?.p
  const pet = BY_ID[equip.pet]?.p
  const bg = BY_ID[equip.bg]?.p
  const fx = BY_ID[equip.effect]?.p

  return (
    <svg viewBox="0 0 300 420" width={size} height={size * 420 / 300} style={{ display: 'block', borderRadius: 18 }}>
      <defs>
        <radialGradient id="rainbowG" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff9ec4" /><stop offset="35%" stopColor="#ffd36a" />
          <stop offset="70%" stopColor="#8fe0a0" /><stop offset="100%" stopColor="#8fbfff" />
        </radialGradient>
      </defs>

      {renderBg(bg)}
      {renderWings(wings)}
      {renderCape(cape)}
      {renderPet(pet)}

      {/* legs + shoes */}
      <g>
        <rect x="135" y="350" width="12" height="40" rx="6" fill={skin.base} />
        <rect x="153" y="350" width="12" height="40" rx="6" fill={skin.base} />
        {renderShoes(shoes)}
      </g>

      {renderDress(dress)}

      {/* arms — shoulders → hands resting at the sides */}
      <g>
        <path d="M126 184 Q108 238 116 298" stroke={skin.base} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M174 184 Q192 238 184 298" stroke={skin.base} strokeWidth="13" fill="none" strokeLinecap="round" />
        <circle cx="116" cy="300" r="8" fill={skin.base} />
        <circle cx="184" cy="300" r="8" fill={skin.base} />
        {dress && <>
          {/* puff sleeves at the shoulders */}
          <circle cx="127" cy="186" r="14" fill={dress.bodice} />
          <circle cx="173" cy="186" r="14" fill={dress.bodice} />
          <path d="M122 180 q5 -7 11 0" stroke={dress.trim} strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M167 180 q5 -7 11 0" stroke={dress.trim} strokeWidth="2" fill="none" opacity="0.7" />
        </>}
      </g>

      {/* neck */}
      <rect x="142" y="150" width="16" height="22" fill={skin.shade} />
      {renderNeck(neck)}

      {renderHairBack(hair)}

      {/* head */}
      <ellipse cx="150" cy="118" rx="40" ry="44" fill={skin.base} />
      <ellipse cx="108" cy="120" rx="7" ry="9" fill={skin.shade} />
      <ellipse cx="192" cy="120" rx="7" ry="9" fill={skin.shade} />
      {/* face */}
      <ellipse cx="133" cy="120" rx="8" ry="10" fill="#fff" />
      <ellipse cx="167" cy="120" rx="8" ry="10" fill="#fff" />
      <circle cx="134" cy="122" r="5.2" fill={eye.color} />
      <circle cx="166" cy="122" r="5.2" fill={eye.color} />
      <circle cx="134" cy="122" r="2.4" fill="#1c1626" />
      <circle cx="166" cy="122" r="2.4" fill="#1c1626" />
      <circle cx="136" cy="120" r="1.5" fill="#fff" />
      <circle cx="168" cy="120" r="1.5" fill="#fff" />
      {/* lashes */}
      <path d="M125 113 q8 -5 16 0" stroke="#3a2b3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M159 113 q8 -5 16 0" stroke="#3a2b3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="120" cy="134" rx="7" ry="4.5" fill="#ff9ec4" opacity="0.55" />
      <ellipse cx="180" cy="134" rx="7" ry="4.5" fill="#ff9ec4" opacity="0.55" />
      {/* smile */}
      <path d="M141 138 q9 9 18 0" stroke="#c0506a" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {renderHairFront(hair)}
      {renderCrown(crown)}

      {/* effects on top */}
      {renderEffects(fx)}
    </svg>
  )
}

/* ───────── render helpers ───────── */
function renderBg(p: any) {
  const style = p?.style || 'castle'
  const grads: Record<string, [string, string]> = {
    castle: ['#f6e2f0', '#d9c0e6'], ball: ['#fdeec2', '#f3c98a'], garden: ['#dff6cf', '#bfe6a8'],
    ocean: ['#bfeef0', '#7fc8d8'], winter: ['#e6f2ff', '#bcd8f0'], night: ['#2a2452', '#15123a'],
    dragon: ['#3a1410', '#1d0a08'], celest: ['#3a2f6e', '#1f1746'],
  }
  const [a, b] = grads[style] || grads.castle
  const dark = style === 'night' || style === 'dragon' || style === 'celest'
  return (
    <g>
      <defs>
        <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} /><stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="420" fill="url(#bgG)" />
      {/* floor */}
      <rect x="0" y="350" width="300" height="70" fill={dark ? '#0d0a26' : '#ffffff'} opacity="0.25" />
      {style === 'castle' && <>
        <rect x="20" y="120" width="40" height="230" rx="20" fill="#ffffff" opacity="0.35" />
        <rect x="240" y="120" width="40" height="230" rx="20" fill="#ffffff" opacity="0.35" />
        <path d="M30 120 l20 -30 l20 30 z" fill="#e0a0d0" opacity="0.5" />
        <path d="M250 120 l20 -30 l20 30 z" fill="#e0a0d0" opacity="0.5" />
      </>}
      {style === 'ball' && [...Array(5)].map((_, i) => (
        <circle key={i} cx={30 + i * 60} cy={60} r="8" fill="#fff6c4" opacity="0.7" />
      ))}
      {style === 'garden' && <>
        {[...Array(7)].map((_, i) => <circle key={i} cx={20 + i * 42} cy={345} r="9" fill={['#ff9ec4', '#ffd36a', '#c08fff'][i % 3]} opacity="0.7" />)}
        <circle cx="250" cy="55" r="26" fill="#ffe07a" opacity="0.8" />
      </>}
      {style === 'ocean' && [...Array(8)].map((_, i) => (
        <circle key={i} cx={(i * 53) % 300} cy={40 + (i * 37) % 280} r={4 + (i % 3) * 3} fill="#ffffff" opacity="0.4" />
      ))}
      {style === 'winter' && [...Array(14)].map((_, i) => (
        <circle key={i} cx={(i * 41) % 300} cy={(i * 71) % 340} r="3" fill="#ffffff" opacity="0.8" />
      ))}
      {(style === 'night' || style === 'celest') && [...Array(22)].map((_, i) => (
        <circle key={i} cx={(i * 53) % 300} cy={(i * 37) % 330} r={i % 4 === 0 ? 2.4 : 1.3} fill="#fff" opacity="0.9" />
      ))}
      {style === 'night' && <circle cx="245" cy="55" r="24" fill="#fff6d0" opacity="0.9" />}
      {style === 'dragon' && [...Array(6)].map((_, i) => (
        <circle key={i} cx={(i * 60) % 300} cy={330 - (i % 3) * 20} r={5 + (i % 2) * 4} fill="#ff6a2a" opacity="0.5" />
      ))}
    </g>
  )
}

function renderShoes(p: any) {
  if (!p) return null
  const col = p.color
  if (p.style === 'boot') return <g fill={col}>
    <rect x="130" y="372" width="18" height="22" rx="5" /><rect x="152" y="372" width="18" height="22" rx="5" />
  </g>
  if (p.style === 'heel') return <g fill={col}>
    <path d="M130 388 h18 l-2 6 h-14 z" /><path d="M152 388 h18 l-2 6 h-14 z" />
    <rect x="142" y="392" width="3" height="8" /><rect x="164" y="392" width="3" height="8" />
  </g>
  if (p.style === 'glass') return <g fill={col} opacity="0.85" stroke="#ffffff" strokeWidth="1">
    <ellipse cx="139" cy="392" rx="11" ry="6" /><ellipse cx="161" cy="392" rx="11" ry="6" />
  </g>
  return <g fill={col}><ellipse cx="139" cy="392" rx="11" ry="6" /><ellipse cx="161" cy="392" rx="11" ry="6" /></g>
}

function renderDress(p: any) {
  if (!p) return null
  const { bodice, skirt, trim, shape, sparkle, rainbow, celest } = p
  const sk = rainbow ? 'url(#rainbowG)' : skirt
  let skirtPath = ''
  if (shape === 'ball') skirtPath = 'M118 240 Q60 360 50 388 Q150 410 250 388 Q240 360 182 240 Z'
  else if (shape === 'puffy') skirtPath = 'M120 240 Q70 320 72 360 Q150 388 228 360 Q230 320 180 240 Z'
  else if (shape === 'mermaid') skirtPath = 'M122 240 Q118 330 110 350 Q150 384 190 350 Q182 330 178 240 Z'
  else if (shape === 'royal') skirtPath = 'M118 240 Q66 350 56 392 Q150 410 244 392 Q234 350 182 240 Z'
  else skirtPath = 'M120 240 Q80 340 86 364 Q150 386 214 364 Q220 340 180 240 Z' // aline
  return (
    <g>
      {/* bodice */}
      <path d="M126 168 Q150 158 174 168 L182 244 Q150 256 118 244 Z" fill={bodice} />
      {/* skirt */}
      <path d={skirtPath} fill={sk} />
      <path d={skirtPath} fill="none" stroke={trim} strokeWidth="3" opacity="0.8" />
      {/* waist trim */}
      <rect x="118" y="238" width="64" height="8" rx="4" fill={trim} />
      {/* collar */}
      <path d="M134 168 Q150 180 166 168" stroke={trim} strokeWidth="3" fill="none" />
      {celest && [...Array(6)].map((_, i) => (
        <circle key={i} cx={90 + i * 24} cy={330 + (i % 2) * 18} r="2.2" fill="#fff" opacity="0.9" />
      ))}
      {sparkle && [...Array(7)].map((_, i) => (
        <g key={i} transform={`translate(${80 + (i * 31) % 150},${300 + (i * 47) % 70})`}>
          <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fff" opacity="0.85" />
        </g>
      ))}
    </g>
  )
}

function renderHairBack(p: any) {
  if (!p) return null
  const { style, color } = p
  if (style === 'pony') return <path d="M188 110 Q230 150 210 250 Q230 200 198 130 Z" fill={color} />
  if (style === 'bun') return <circle cx="150" cy="74" r="20" fill={color} />
  if (style === 'twin') return <g fill={color}>
    <path d="M112 110 Q80 170 96 250 Q108 190 122 140 Z" /><path d="M188 110 Q220 170 204 250 Q192 190 178 140 Z" />
  </g>
  if (style === 'braid') return <path d="M150 150 Q132 240 150 320 Q168 240 150 150 Z" fill={color} />
  if (style === 'curl') return <g fill={color}>
    <circle cx="112" cy="160" r="16" /><circle cx="188" cy="160" r="16" /><circle cx="106" cy="200" r="14" /><circle cx="194" cy="200" r="14" />
  </g>
  // wave (default): big flowing hair behind shoulders
  return <path d="M104 110 Q78 200 100 280 Q120 210 122 150 L178 150 Q180 210 200 280 Q222 200 196 110 Z" fill={color} />
}

function renderHairFront(p: any) {
  if (!p) return null
  const { style, color, hi } = p
  return (
    <g>
      {/* full hair cap over the scalp — covers the whole crown so no skin shows */}
      <path d="M104 122 Q96 70 150 62 Q204 70 196 122 Q150 96 104 122 Z" fill={color} />
      {/* soft rounded bangs across the forehead */}
      <path d="M108 120 Q128 102 150 110 Q172 102 192 120 Q172 92 150 96 Q128 92 108 120 Z" fill={color} />
      {/* highlight sweep */}
      <path d="M118 90 Q142 72 162 86 Q142 80 124 96 Z" fill={hi} opacity="0.55" />
      {/* side fringe framing the face */}
      <path d="M106 114 Q100 146 110 164 Q120 134 120 110 Z" fill={color} />
      <path d="M194 114 Q200 146 190 164 Q180 134 180 110 Z" fill={color} />
      {style === 'bun' && <circle cx="150" cy="70" r="13" fill={hi} opacity="0.5" />}
    </g>
  )
}

function renderCrown(p: any) {
  if (!p || p.style === 'none') return null
  const { style, metal, gem } = p
  if (style === 'tiara') return <g>
    <path d="M120 86 Q150 70 180 86 L176 92 Q150 80 124 92 Z" fill={metal} />
    <circle cx="150" cy="78" r="4" fill={gem} /><circle cx="132" cy="86" r="2.6" fill={gem} /><circle cx="168" cy="86" r="2.6" fill={gem} />
  </g>
  if (style === 'flower') return <g>
    {[126, 142, 158, 174].map((x, i) => <g key={i}>
      {[...Array(5)].map((_, j) => <circle key={j} cx={x + Math.cos(j / 5 * 6.28) * 5} cy={84 + Math.sin(j / 5 * 6.28) * 5} r="3" fill={i % 2 ? '#ff9ec4' : metal} />)}
      <circle cx={x} cy="84" r="2.4" fill={gem} />
    </g>)}
  </g>
  if (style === 'shell') return <g>
    <path d="M126 88 Q150 64 174 88 Z" fill={metal} />
    {[134, 142, 150, 158, 166].map((x, i) => <path key={i} d={`M${x} 88 L${x} 74`} stroke={metal} strokeWidth="3" />)}
    <circle cx="150" cy="74" r="4" fill={gem} />
  </g>
  if (style === 'dragon') return <g>
    <path d="M118 88 L128 66 L138 84 L150 60 L162 84 L172 66 L182 88 Z" fill={metal} stroke="#7a1f16" strokeWidth="1.5" />
    <circle cx="150" cy="76" r="4" fill={gem} />
  </g>
  // gold (queen)
  return <g>
    <path d="M120 90 L122 64 L138 82 L150 60 L162 82 L178 64 L180 90 Z" fill={metal} stroke="#b8860b" strokeWidth="1" />
    <circle cx="150" cy="72" r="4.5" fill={gem} /><circle cx="128" cy="76" r="3" fill={gem} /><circle cx="172" cy="76" r="3" fill={gem} />
  </g>
}

function renderNeck(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.color
  if (p.style === 'pearl') return <g>
    {[...Array(7)].map((_, i) => <circle key={i} cx={132 + i * 6} cy={172 + Math.sin(i / 6 * 3.14) * 6} r="2.4" fill={col} stroke="#e8d8b8" strokeWidth="0.5" />)}
  </g>
  if (p.style === 'shell') return <g>
    <path d="M134 174 Q150 188 166 174" stroke="#e8c89a" strokeWidth="1.5" fill="none" />
    <path d="M144 180 q6 8 12 0 q-6 -4 -12 0 z" fill={col} />
  </g>
  // gem
  return <g>
    <path d="M134 174 Q150 184 166 174" stroke="#d8c89a" strokeWidth="1.5" fill="none" />
    <path d="M150 182 l5 6 l-5 6 l-5 -6 z" fill={col} stroke="#fff" strokeWidth="0.6" />
  </g>
}

function renderWings(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.rainbow ? 'url(#rainbowG)' : p.color
  if (p.style === 'fairy') return <g opacity="0.78">
    <path d="M120 230 Q40 180 70 280 Q100 280 120 250 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M180 230 Q260 180 230 280 Q200 280 180 250 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
  </g>
  if (p.style === 'butterfly') return <g opacity="0.82">
    <path d="M122 235 Q36 170 56 250 Q60 300 122 270 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M178 235 Q264 170 244 250 Q240 300 178 270 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <circle cx="74" cy="225" r="7" fill="#fff" opacity="0.6" /><circle cx="226" cy="225" r="7" fill="#fff" opacity="0.6" />
  </g>
  // feather
  return <g opacity="0.9">
    <path d="M124 230 Q46 200 66 300 Q96 280 124 256 Z" fill={col} stroke="#dfe8f0" strokeWidth="1" />
    <path d="M176 230 Q254 200 234 300 Q204 280 176 256 Z" fill={col} stroke="#dfe8f0" strokeWidth="1" />
  </g>
}

function renderCape(p: any) {
  if (!p || p.style === 'none') return null
  const { color, trim, stars } = p
  return <g>
    <path d="M120 175 Q60 300 78 400 L150 400 L222 400 Q240 300 180 175 Q150 188 120 175 Z" fill={color} />
    <path d="M120 175 Q60 300 78 400" stroke={trim} strokeWidth="4" fill="none" />
    <path d="M180 175 Q240 300 222 400" stroke={trim} strokeWidth="4" fill="none" />
    {stars && [...Array(8)].map((_, i) => (
      <circle key={i} cx={95 + (i * 23) % 110} cy={250 + (i * 41) % 130} r="2" fill="#fff" opacity="0.9" />
    ))}
  </g>
}

function renderPet(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.color
  return (
    <g transform="translate(232 320)">
      <ellipse cx="0" cy="40" rx="26" ry="8" fill="#000" opacity="0.12" />
      {p.style === 'cat' && <g>
        <ellipse cx="0" cy="22" rx="18" ry="16" fill={col} />
        <circle cx="0" cy="2" r="14" fill={col} />
        {p.ears === 'flop'
          ? <><ellipse cx="-12" cy="2" rx="5" ry="9" fill={col} /><ellipse cx="12" cy="2" rx="5" ry="9" fill={col} /></>
          : <><path d="M-12 -8 l-3 -10 l9 4 z" fill={col} /><path d="M12 -8 l3 -10 l-9 4 z" fill={col} /></>}
        <circle cx="-5" cy="0" r="2" fill="#2a2230" /><circle cx="5" cy="0" r="2" fill="#2a2230" />
        <path d="M-3 5 q3 3 6 0" stroke="#2a2230" strokeWidth="1.2" fill="none" />
      </g>}
      {p.style === 'bunny' && <g>
        <ellipse cx="0" cy="24" rx="15" ry="15" fill={col} stroke="#eee" strokeWidth="1" />
        <circle cx="0" cy="4" r="12" fill={col} stroke="#eee" strokeWidth="1" />
        <ellipse cx="-6" cy="-14" rx="4" ry="12" fill={col} stroke="#eee" strokeWidth="1" />
        <ellipse cx="6" cy="-14" rx="4" ry="12" fill={col} stroke="#eee" strokeWidth="1" />
        <circle cx="-4" cy="2" r="1.8" fill="#2a2230" /><circle cx="4" cy="2" r="1.8" fill="#2a2230" />
        <circle cx="0" cy="7" r="2" fill="#ff9ec4" />
      </g>}
      {p.style === 'fox' && <g>
        <ellipse cx="0" cy="22" rx="16" ry="14" fill={col} />
        <circle cx="0" cy="4" r="12" fill={col} />
        <path d="M-10 -4 l-3 -12 l8 6 z" fill={col} /><path d="M10 -4 l3 -12 l-8 6 z" fill={col} />
        <path d="M0 4 l-9 8 l9 4 l9 -4 z" fill="#fff" opacity="0.85" />
        <circle cx="-4" cy="2" r="1.8" fill="#2a2230" /><circle cx="4" cy="2" r="1.8" fill="#2a2230" />
      </g>}
      {p.style === 'swan' && <g>
        <ellipse cx="2" cy="26" rx="20" ry="12" fill={col} />
        <path d="M-6 24 Q-22 4 -8 -8 Q-2 -2 -4 16 Z" fill={col} />
        <circle cx="-8" cy="-8" r="5" fill={col} />
        <path d="M-12 -8 l-6 1 l5 3 z" fill="#f0a020" />
        <circle cx="-9" cy="-10" r="1.3" fill="#2a2230" />
      </g>}
      {p.style === 'owl' && <g>
        <ellipse cx="0" cy="18" rx="16" ry="18" fill={col} />
        <circle cx="-6" cy="10" r="6" fill="#fff" /><circle cx="6" cy="10" r="6" fill="#fff" />
        <circle cx="-6" cy="10" r="2.6" fill="#2a2230" /><circle cx="6" cy="10" r="2.6" fill="#2a2230" />
        <path d="M0 14 l-3 4 l6 0 z" fill="#f0a020" />
        <path d="M-14 2 l4 -10 l4 8 z" fill={col} /><path d="M14 2 l-4 -10 l-4 8 z" fill={col} />
      </g>}
      {p.style === 'unicorn' && <g>
        <ellipse cx="0" cy="24" rx="17" ry="14" fill={col} stroke="#eee" strokeWidth="1" />
        <circle cx="0" cy="4" r="12" fill={col} stroke="#eee" strokeWidth="1" />
        <path d="M0 -8 l-3 -14 l6 0 z" fill="#ffd36a" stroke="#e8b020" strokeWidth="0.6" />
        <path d="M8 -6 Q20 -2 14 16 Q8 4 6 -2 Z" fill={p.mane} />
        <circle cx="-4" cy="2" r="1.8" fill="#2a2230" /><circle cx="4" cy="2" r="1.8" fill="#2a2230" />
        <circle cx="0" cy="7" r="1.6" fill="#ff9ec4" />
      </g>}
      {p.style === 'dragon' && <g>
        <ellipse cx="0" cy="24" rx="18" ry="15" fill={col} />
        <circle cx="0" cy="4" r="13" fill={col} />
        <path d="M-14 20 Q-30 14 -24 30 Q-16 26 -12 24 Z" fill="#8fd07a" />
        <path d="M14 20 Q30 14 24 30 Q16 26 12 24 Z" fill="#8fd07a" />
        <path d="M-8 -8 l-2 -8 l6 5 z" fill="#cfe8b0" /><path d="M8 -8 l2 -8 l-6 5 z" fill="#cfe8b0" />
        <circle cx="-5" cy="2" r="2" fill="#2a2230" /><circle cx="5" cy="2" r="2" fill="#2a2230" />
        <ellipse cx="0" cy="9" rx="5" ry="3" fill="#cfe8b0" />
      </g>}
    </g>
  )
}

function renderEffects(p: any) {
  if (!p || p.style === 'none') return null
  const st = p.style
  const n = 12
  const items = [...Array(n)].map((_, i) => {
    const x = (i * 53) % 290 + 8
    const y = (i * 71) % 380 + 12
    const d = (i % 5) * 0.4
    const key = i
    if (st === 'hearts') return <text key={key} x={x} y={y} fontSize="14" className="de-float" style={{ animationDelay: `${d}s` }}>💖</text>
    if (st === 'petals') return <text key={key} x={x} y={y} fontSize="13" className="de-float" style={{ animationDelay: `${d}s` }}>🌸</text>
    if (st === 'snow') return <text key={key} x={x} y={y} fontSize="12" className="de-fall" style={{ animationDelay: `${d}s` }}>❄️</text>
    if (st === 'bubbles') return <circle key={key} cx={x} cy={y} r={3 + (i % 4)} fill="#bfeef0" opacity="0.6" className="de-float" style={{ animationDelay: `${d}s` }} />
    if (st === 'stars') return <text key={key} x={x} y={y} fontSize="13" className="de-twinkle" style={{ animationDelay: `${d}s` }}>⭐</text>
    if (st === 'aura') return <text key={key} x={x} y={y} fontSize="14" className="de-twinkle" style={{ animationDelay: `${d}s` }}>✨</text>
    return <g key={key} transform={`translate(${x},${y})`} className="de-twinkle" style={{ animationDelay: `${d}s` }}>
      <path d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" fill="#fff" />
    </g>
  })
  return <g pointerEvents="none">{items}{st === 'aura' && <ellipse cx="150" cy="260" rx="120" ry="150" fill="#fff" opacity="0.06" className="de-pulse" />}</g>
}

/* ════════════════════════ UI BITS ════════════════════════ */
function Coin() { return <span style={{ color: '#f0c84a' }}>🪙</span> }
function Gem() { return <span>💎</span> }
function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return <span style={{ fontSize: size, letterSpacing: 2 }}>
    {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ opacity: i <= n ? 1 : 0.25 }}>⭐</span>)}
  </span>
}

const btn: React.CSSProperties = {
  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
  borderRadius: 999, padding: '12px 20px', fontSize: 13, color: '#5a2a4a',
  background: 'linear-gradient(135deg,#ffd6ec,#ffb0d6)', boxShadow: '0 4px 0 #e68fbf, 0 6px 14px rgba(200,80,150,0.3)',
}
const btnGold: React.CSSProperties = {
  ...btn, color: '#6a4a10', background: 'linear-gradient(135deg,#ffe89a,#f6c84a)', boxShadow: '0 4px 0 #d6a830, 0 6px 14px rgba(200,150,40,0.3)',
}

/* ════════════════════════ MAIN COMPONENT ════════════════════════ */
type Screen = 'loading' | 'home' | 'dressing' | 'result' | 'challenges' | 'shop' | 'daily' | 'minigame'

export default function DressEmpress() {
  const [save, setSave] = useState<Save | null>(null)
  const [screen, setScreen] = useState<Screen>('loading')
  const [activeCh, setActiveCh] = useState<Challenge | null>(null)
  const [cat, setCat] = useState<Cat>('dress')
  const [result, setResult] = useState<{ stars: number; pts: number; ch: Challenge; coins: number; gems: number; xp: number; judge: string; praise: string; leveledTo: number | null } | null>(null)
  const [toast, setToast] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // load
  useEffect(() => { setSave(loadSave()); setScreen('home') }, [])
  // persist
  useEffect(() => { if (save) localStorage.setItem(SAVE_KEY, JSON.stringify(save)) }, [save])

  const showToast = useCallback((m: string) => {
    setToast(m); window.setTimeout(() => setToast(''), 2200)
  }, [])

  const level = save ? levelFromXp(save.xp) : 1
  const equip = save?.equip || DEFAULT_EQUIP

  // daily reward availability
  const today = new Date().toISOString().slice(0, 10)
  const canClaim = save ? save.lastClaim !== today : false

  const equipItem = useCallback((it: Item) => {
    setSave(s => s ? { ...s, equip: { ...s.equip, [it.cat]: it.id } } : s)
  }, [])

  const buyItem = useCallback((it: Item) => {
    setSave(s => {
      if (!s) return s
      if (s.owned.includes(it.id)) return s
      const cost = it.price
      if (it.gem) { if (s.gems < cost) { showToast('Not enough gems 💎'); return s } }
      else if (s.coins < cost) { showToast('Not enough coins 🪙'); return s }
      showToast(`Unlocked ${it.name}! 🎉`)
      return {
        ...s,
        coins: it.gem ? s.coins : s.coins - cost,
        gems: it.gem ? s.gems - cost : s.gems,
        owned: [...s.owned, it.id],
        equip: { ...s.equip, [it.cat]: it.id },
      }
    })
  }, [showToast])

  const claimDaily = useCallback(() => {
    setSave(s => {
      if (!s || s.lastClaim === today) return s
      const day = (s.dailyDay % 7) + 1
      const rewards: Record<number, Partial<Save> & { msg: string }> = {
        1: { coins: s.coins + 100, msg: '+100 coins 🪙' },
        2: { coins: s.coins + 150, msg: '+150 coins 🪙' },
        3: { gems: s.gems + 2, msg: '+2 gems 💎' },
        4: { coins: s.coins + 200, msg: '+200 coins 🪙' },
        5: { gems: s.gems + 3, msg: '+3 gems 💎' },
        6: { coins: s.coins + 300, msg: '+300 coins 🪙' },
        7: { gems: s.gems + 5, coins: s.coins + 200, msg: '+5 gems & 200 coins! 🎉' },
      }
      const r = rewards[day]
      showToast(`Day ${day}: ${r.msg}`)
      return { ...s, ...r, dailyDay: day, lastClaim: today } as Save
    })
  }, [today, showToast])

  // submit outfit for a challenge
  const submitOutfit = useCallback(() => {
    if (!save || !activeCh) return
    const { stars, pts } = scoreOutfit(save.equip, activeCh)
    const factor = stars / 5
    const gainCoins = Math.round(activeCh.coins * (0.4 + 0.6 * factor))
    const gainGems = stars >= 4 ? activeCh.gems : stars >= 3 ? Math.max(1, activeCh.gems - 1) : 0
    const gainXp = Math.round(activeCh.xp * (0.5 + 0.5 * factor))
    const prevLevel = levelFromXp(save.xp)
    const newXp = save.xp + gainXp
    const newLevel = levelFromXp(newXp)
    const judge = JUDGES[Math.floor((pts + stars) % JUDGES.length)]
    const praise = PRAISE[stars][Math.floor((pts) % PRAISE[stars].length)]

    setSave(s => s ? {
      ...s, xp: newXp, coins: s.coins + gainCoins, gems: s.gems + gainGems,
      best: { ...s.best, [activeCh.id]: Math.max(s.best[activeCh.id] || 0, stars) },
    } : s)

    setResult({
      stars, pts, ch: activeCh, coins: gainCoins, gems: gainGems, xp: gainXp,
      judge, praise, leveledTo: newLevel > prevLevel ? newLevel : null,
    })
    setScreen('result')

    // site XP (logged-in only) once per session on a 3+ star win; leaderboard = empress level
    if (stars >= 3) {
      fetch('/api/minigame/win', { method: 'POST' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.xpAwarded) emitXpGained(d.xpAwarded) })
        .catch(() => {})
      fetch('/api/minigame/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'dress-empress', score: newLevel }),
      }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
    }
  }, [save, activeCh])

  if (!save || screen === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>Loading the kingdom… ✨</div>
  }

  /* ───────── shared header (stats) ───────── */
  const nextLvlXp = xpForLevel(level + 1)
  const curLvlXp = xpForLevel(level)
  const xpPct = level >= 30 ? 100 : Math.max(0, Math.min(100, (save.xp - curLvlXp) / (nextLvlXp - curLvlXp) * 100))

  const StatBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={pill}>👑 Lv {level}</div>
      <div style={pill}><Coin /> {save.coins}</div>
      <div style={pill}><Gem /> {save.gems}</div>
      <div style={{ ...pill, minWidth: 120, padding: '6px 10px' }}>
        <div style={{ fontSize: 8, color: '#a06a90', marginBottom: 2 }}>XP to next</div>
        <div style={{ height: 6, background: '#ffd9ec', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg,#ff9ec4,#c08fff)' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="de-root" style={{ maxWidth: 980, margin: '0 auto' }}>
      <style>{DE_CSS}</style>

      {/* top nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Link href="/skills/fun" style={{ ...pill, textDecoration: 'none', color: '#a04a7a' }}>← Games</Link>
        <h1 style={{ fontSize: 16, color: '#b23a7a', textShadow: '0 2px 0 #fff', margin: 0 }}>👑 Dress to Empress</h1>
        <div style={{ ...pill, color: '#a04a7a' }}>{save.name}</div>
      </div>

      {StatBar}

      {/* toast */}
      {toast && <div className="de-toast">{toast}</div>}

      <div style={{ marginTop: 14 }}>
        {screen === 'home' && (
          <HomeScreen
            equip={equip} level={level} canClaim={canClaim}
            onPlay={() => setScreen('challenges')}
            onCloset={() => { setActiveCh(null); setScreen('dressing') }}
            onShop={() => setScreen('shop')}
            onDaily={() => setScreen('daily')}
            onMini={() => setScreen('minigame')}
            refreshKey={refreshKey}
            name={save.name}
            onRename={(nm: string) => setSave(s => s ? { ...s, name: nm } : s)}
          />
        )}

        {screen === 'challenges' && (
          <ChallengesScreen
            level={level} best={save.best}
            onBack={() => setScreen('home')}
            onPick={(ch: Challenge) => { setActiveCh(ch); setSave(s => s ? { ...s, equip: { ...s.equip, bg: ch.bg } } : s); setScreen('dressing') }}
          />
        )}

        {screen === 'dressing' && (
          <DressingScreen
            save={save} cat={cat} setCat={setCat}
            activeCh={activeCh} level={level}
            onEquip={equipItem}
            onBuy={buyItem}
            onBack={() => setScreen(activeCh ? 'challenges' : 'home')}
            onSubmit={submitOutfit}
            showToast={showToast}
          />
        )}

        {screen === 'result' && result && (
          <ResultScreen
            result={result} equip={equip}
            onAgain={() => { setScreen('dressing') }}
            onHome={() => { setActiveCh(null); setScreen('home') }}
          />
        )}

        {screen === 'shop' && (
          <ShopScreen
            save={save} level={level} onBuy={buyItem} onEquip={equipItem}
            onBack={() => setScreen('home')}
          />
        )}

        {screen === 'daily' && (
          <DailyScreen save={save} canClaim={canClaim} onClaim={claimDaily} onBack={() => setScreen('home')} />
        )}

        {screen === 'minigame' && (
          <GemGame
            onBack={() => setScreen('home')}
            onReward={(coins: number, gems: number) => setSave(s => s ? { ...s, coins: s.coins + coins, gems: s.gems + gems } : s)}
            showToast={showToast}
          />
        )}
      </div>

      {/* leaderboard */}
      <div style={{ marginTop: 18, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
        <GameLeaderboard game="dress-empress" scoreLabel="Lv" refreshKey={refreshKey} />
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  background: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 700,
  color: '#a04a7a', boxShadow: '0 2px 8px rgba(180,80,140,0.15)', border: '2px solid #ffd6ec',
}

/* ───────── HOME ───────── */
function HomeScreen({ equip, level, canClaim, onPlay, onCloset, onShop, onDaily, onMini, name, onRename }: any) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState(name)
  return (
    <div className="de-card" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      <div className="de-bounce" style={{ position: 'relative' }}>
        <Avatar equip={equip} size={280} />
        <div style={{ position: 'absolute', top: 8, left: 8, ...pill, fontSize: 10 }}>👑 Empress Lv {level}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
        <div style={{ textAlign: 'center' }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <input value={tmp} maxLength={14} onChange={e => setTmp(e.target.value)}
                style={{ borderRadius: 999, border: '2px solid #ffb0d6', padding: '8px 12px', fontSize: 13, width: 130 }} />
              <button style={{ ...btnGold, padding: '8px 12px' }} onClick={() => { onRename(tmp.trim() || 'Princess'); setEditing(false) }}>Save</button>
            </div>
          ) : (
            <h2 style={{ fontSize: 18, color: '#b23a7a', margin: 0 }}>
              {name} <button onClick={() => { setTmp(name); setEditing(true) }} style={{ ...pill, fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>✏️</button>
            </h2>
          )}
        </div>
        <button style={{ ...btnGold, fontSize: 16, padding: '16px 22px' }} onClick={onPlay}>✨ Play Fashion Challenge</button>
        <button style={btn} onClick={onCloset}>👗 My Closet</button>
        <button style={btn} onClick={onShop}>🛍️ Shop</button>
        <button style={btn} onClick={onMini}>💎 Gem Catch Mini-Game</button>
        <button style={{ ...btn, position: 'relative' }} onClick={onDaily}>
          🎁 Daily Reward {canClaim && <span className="de-badge">!</span>}
        </button>
      </div>
    </div>
  )
}

/* ───────── CHALLENGES ───────── */
function ChallengesScreen({ level, best, onBack, onPick }: any) {
  return (
    <div className="de-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button style={pill as any} onClick={onBack}>← Home</button>
        <h2 style={{ fontSize: 16, color: '#b23a7a', margin: 0 }}>✨ Fashion Challenges</h2>
        <span style={{ width: 60 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
        {CHALLENGES.map(ch => {
          const locked = level < ch.minLvl
          const b = best[ch.id] || 0
          return (
            <button key={ch.id} disabled={locked} onClick={() => onPick(ch)}
              className="de-chip" style={{
                textAlign: 'left', opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer',
                background: locked ? '#f0e0ec' : 'linear-gradient(135deg,#fff,#ffeaf5)',
              }}>
              <div style={{ fontSize: 28 }}>{ch.emoji}</div>
              <div style={{ fontWeight: 800, color: '#b23a7a', fontSize: 13 }}>{ch.name}</div>
              <div style={{ fontSize: 10, color: '#a06a90', margin: '4px 0' }}>{ch.desc}</div>
              <div style={{ fontSize: 9, color: '#c08fb0' }}>💡 {ch.hint}</div>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                {locked ? <span style={{ color: '#b07a9a' }}>🔒 Unlocks at Lv {ch.minLvl}</span>
                  : b > 0 ? <Stars n={b} size={13} /> : <span style={{ color: '#5fbf7a', fontWeight: 700 }}>New!</span>}
              </div>
              <div style={{ fontSize: 10, color: '#a06a90', marginTop: 4 }}>🪙{ch.coins} 💎{ch.gems} ✨{ch.xp}xp</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── DRESSING ROOM ───────── */
function DressingScreen({ save, cat, setCat, activeCh, level, onEquip, onBuy, onBack, onSubmit, showToast }: any) {
  const items = ALL.filter(i => i.cat === cat)
  const live = activeCh ? scoreOutfit(save.equip, activeCh) : null
  return (
    <div className="de-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <button style={pill as any} onClick={onBack}>← Back</button>
        <h2 style={{ fontSize: 15, color: '#b23a7a', margin: 0, textAlign: 'center' }}>
          {activeCh ? <>{activeCh.emoji} {activeCh.name}</> : '👗 My Closet'}
        </h2>
        {activeCh
          ? <button style={btnGold} onClick={onSubmit}>Submit Outfit ✨</button>
          : <span style={{ width: 60 }} />}
      </div>

      {activeCh && (
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#a06a90' }}>
          💡 {activeCh.hint} · Theme: <b style={{ color: '#b23a7a' }}>{THEME_LABEL[activeCh.theme as Theme]}</b>
          {live && <span> · Looking <b style={{ color: '#b23a7a' }}>{['', 'cute', 'cute', 'beautiful', 'royal', 'Empress!'][live.stars]}</b></span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* preview */}
        <div className="de-bounce" style={{ flexShrink: 0 }}>
          <Avatar equip={save.equip} size={260} />
        </div>

        {/* wardrobe */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 480 }}>
          {/* category tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {CAT_INFO.map(ci => (
              <button key={ci.cat} onClick={() => setCat(ci.cat)}
                style={{
                  ...pill, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                  background: cat === ci.cat ? 'linear-gradient(135deg,#ffd6ec,#ffb0d6)' : '#fff',
                  border: cat === ci.cat ? '2px solid #ff8fc0' : '2px solid #ffe0ef',
                }}>
                {ci.icon} {ci.label}
              </button>
            ))}
          </div>

          {/* item grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {items.map((it: Item) => {
              const owned = save.owned.includes(it.id)
              const equipped = save.equip[it.cat] === it.id
              const tooHigh = (it.lvl || 0) > level && !owned
              return (
                <button key={it.id}
                  onClick={() => owned ? onEquip(it) : (tooHigh ? showToast(`Unlocks at Lv ${it.lvl}`) : onBuy(it))}
                  style={{
                    border: equipped ? '3px solid #ff8fc0' : `2px solid ${RARITY[it.rarity].color}55`,
                    borderRadius: 14, padding: 6, cursor: 'pointer', background: equipped ? '#fff0f7' : '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative',
                    opacity: tooHigh ? 0.6 : 1,
                  }}>
                  <ItemThumb item={it} />
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: '#7a4a6a', textAlign: 'center', lineHeight: 1.1 }}>{it.name}</div>
                  <div style={{ fontSize: 7.5, color: RARITY[it.rarity].color, fontWeight: 700 }}>{RARITY[it.rarity].label}</div>
                  {!owned && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: tooHigh ? '#b07a9a' : '#a06a30' }}>
                      {tooHigh ? `🔒 Lv${it.lvl}` : <>{it.gem ? '💎' : '🪙'}{it.price}</>}
                    </div>
                  )}
                  {equipped && <div style={{ position: 'absolute', top: -6, right: -6, fontSize: 14 }}>✅</div>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* small thumbnail = mini avatar showing just this item over a neutral base */
function ItemThumb({ item }: { item: Item }) {
  // For wearable cats, render a focused mini-preview; for others use an emoji-ish swatch
  if (item.cat === 'skin') return <div style={{ width: 44, height: 44, borderRadius: 999, background: item.p.base, border: '2px solid #fff' }} />
  if (item.cat === 'eyes') return <div style={{ width: 44, height: 44, borderRadius: 999, background: '#fff', display: 'grid', placeItems: 'center' }}>
    <div style={{ display: 'flex', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 999, background: item.p.color }} /><div style={{ width: 10, height: 10, borderRadius: 999, background: item.p.color }} /></div>
  </div>
  const mini: Equip = { ...DEFAULT_EQUIP, [item.cat]: item.id, bg: 'bg_castle', effect: 'fx_none' }
  // neutralize distractions for clarity
  if (item.cat !== 'dress') mini.dress = 'dr_start'
  if (item.cat !== 'pet') mini.pet = 'pet_none'
  if (item.cat !== 'wings') mini.wings = 'wg_none'
  if (item.cat !== 'cape') mini.cape = 'cp_none'
  return <div style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: 10 }}>
    <div style={{ transform: 'scale(0.52)', transformOrigin: 'top center', marginTop: -2 }}>
      <Avatar equip={mini} size={108} />
    </div>
  </div>
}

/* ───────── RESULT ───────── */
function ResultScreen({ result, equip, onAgain, onHome }: any) {
  return (
    <div className="de-card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {result.stars >= 4 && <Confetti />}
      <div className="de-bounce" style={{ display: 'inline-block' }}>
        <Avatar equip={equip} size={240} />
      </div>
      <div style={{ marginTop: 8 }}><Stars n={result.stars} size={34} /></div>
      <h2 style={{ fontSize: 18, color: '#b23a7a', margin: '8px 0' }}>
        {result.stars === 5 ? 'EMPRESS PERFECT!' : result.stars === 4 ? 'Royal Style!' : result.stars === 3 ? 'Beautiful!' : result.stars === 2 ? 'Cute Look!' : 'Nice Try!'}
      </h2>
      <p style={{ fontSize: 12, color: '#a06a90', margin: '0 0 4px' }}>{result.judge} says:</p>
      <p style={{ fontSize: 14, color: '#7a4a6a', fontWeight: 700, maxWidth: 360, margin: '0 auto 12px' }}>&quot;{result.praise}&quot;</p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={pill}>🪙 +{result.coins}</div>
        {result.gems > 0 && <div style={pill}>💎 +{result.gems}</div>}
        <div style={pill}>✨ +{result.xp} XP</div>
      </div>
      {result.leveledTo && (
        <div className="de-pop" style={{ ...pill, display: 'inline-block', background: 'linear-gradient(135deg,#ffe89a,#f6c84a)', color: '#6a4a10', fontSize: 14, marginBottom: 12 }}>
          🎉 Level Up! You are now Empress Lv {result.leveledTo}!
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={btnGold} onClick={onAgain}>Try Again 👗</button>
        <button style={btn} onClick={onHome}>🏰 Home</button>
      </div>
    </div>
  )
}

/* ───────── SHOP ───────── */
function ShopScreen({ save, level, onBuy, onEquip, onBack }: any) {
  const [cat, setCat] = useState<Cat>('dress')
  const items = ALL.filter(i => i.cat === cat && i.price > 0)
  return (
    <div className="de-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button style={pill as any} onClick={onBack}>← Home</button>
        <h2 style={{ fontSize: 16, color: '#b23a7a', margin: 0 }}>🛍️ Magical Shop</h2>
        <span style={{ width: 50 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, justifyContent: 'center' }}>
        {CAT_INFO.filter(ci => !['skin', 'eyes'].includes(ci.cat)).map(ci => (
          <button key={ci.cat} onClick={() => setCat(ci.cat)} style={{
            ...pill, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
            background: cat === ci.cat ? 'linear-gradient(135deg,#ffd6ec,#ffb0d6)' : '#fff',
          }}>{ci.icon}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
        {items.map((it: Item) => {
          const owned = save.owned.includes(it.id)
          const tooHigh = (it.lvl || 0) > level
          return (
            <div key={it.id} className="de-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <ItemThumb item={it} />
              <div style={{ fontSize: 11, fontWeight: 800, color: '#7a4a6a', textAlign: 'center' }}>{it.name}</div>
              <div style={{ fontSize: 9, color: RARITY[it.rarity].color, fontWeight: 700 }}>{RARITY[it.rarity].label}</div>
              <div style={{ fontSize: 8, color: '#c08fb0' }}>{it.themes.map(t => THEME_LABEL[t]).join(' · ') || 'Any look'}</div>
              {owned
                ? <button style={{ ...btn, padding: '6px 14px', fontSize: 11 }} onClick={() => onEquip(it)}>Wear</button>
                : tooHigh
                  ? <div style={{ ...pill, fontSize: 10, color: '#b07a9a' }}>🔒 Lv {it.lvl}</div>
                  : <button style={{ ...btnGold, padding: '6px 14px', fontSize: 11 }} onClick={() => onBuy(it)}>{it.gem ? '💎' : '🪙'} {it.price}</button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── DAILY ───────── */
function DailyScreen({ save, canClaim, onClaim, onBack }: any) {
  const rewards = ['🪙 100', '🪙 150', '💎 2', '🪙 200', '💎 3', '🪙 300', '💎 5 🎉']
  const nextDay = (save.dailyDay % 7) + 1
  return (
    <div className="de-card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button style={pill as any} onClick={onBack}>← Home</button>
        <h2 style={{ fontSize: 16, color: '#b23a7a', margin: 0 }}>🎁 Daily Rewards</h2>
        <span style={{ width: 50 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 16 }}>
        {rewards.map((r, i) => {
          const day = i + 1
          const claimed = save.dailyDay >= day && !(day === nextDay && canClaim)
          const isNext = day === nextDay && canClaim
          return (
            <div key={i} style={{
              borderRadius: 12, padding: '10px 4px', fontSize: 12,
              background: isNext ? 'linear-gradient(135deg,#ffe89a,#f6c84a)' : claimed ? '#e8ffe8' : '#fff0f7',
              border: isNext ? '3px solid #f0a93c' : '2px solid #ffd6ec',
              boxShadow: isNext ? '0 0 14px rgba(240,169,60,0.5)' : 'none',
            }} className={isNext ? 'de-pulse' : ''}>
              <div style={{ fontSize: 8, color: '#a06a90' }}>Day {day}</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{r}</div>
              {claimed && <div style={{ fontSize: 9, color: '#4faf6a' }}>✅</div>}
            </div>
          )
        })}
      </div>
      {canClaim
        ? <button style={{ ...btnGold, fontSize: 16 }} onClick={onClaim}>Claim Day {nextDay}! 🎉</button>
        : <p style={{ color: '#a06a90', fontSize: 13 }}>Come back tomorrow for your next reward! 💖</p>}
    </div>
  )
}

/* ───────── GEM CATCH MINI-GAME ───────── */
function GemGame({ onBack, onReward, showToast }: any) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [time, setTime] = useState(20)
  const [score, setScore] = useState(0)
  const [gems, setGems] = useState<{ id: number; x: number; y: number; type: number }[]>([])
  const idRef = useRef(0)
  const got = useRef({ coins: 0, gems: 0 })

  useEffect(() => {
    if (phase !== 'play') return
    const spawn = window.setInterval(() => {
      setGems(g => [...g, { id: idRef.current++, x: 8 + Math.floor(Math.random() * 78), y: 8 + Math.floor(Math.random() * 76), type: Math.floor(Math.random() * 5) }].slice(-7))
    }, 620)
    const clock = window.setInterval(() => setTime(t => {
      if (t <= 1) { window.clearInterval(clock); window.clearInterval(spawn); setPhase('done') ; return 0 }
      return t - 1
    }), 1000)
    return () => { window.clearInterval(spawn); window.clearInterval(clock) }
  }, [phase])

  useEffect(() => {
    if (phase !== 'done') return
    const coins = score * 10
    const bonusGems = Math.floor(score / 15)
    got.current = { coins, gems: bonusGems }
    onReward(coins, bonusGems)
    showToast(`+${coins} coins${bonusGems ? ` & ${bonusGems} 💎` : ''}!`)
  }, [phase]) // eslint-disable-line

  const GEMS = ['💎', '💖', '⭐', '🌸', '🔮']

  const tap = (id: number) => {
    setGems(g => g.filter(x => x.id !== id))
    setScore(s => s + 1)
  }

  return (
    <div className="de-card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button style={pill as any} onClick={onBack}>← Home</button>
        <h2 style={{ fontSize: 15, color: '#b23a7a', margin: 0 }}>💎 Gem Catch</h2>
        <div style={pill}>⏱️ {time}s · {score}</div>
      </div>

      {phase === 'ready' && (
        <div style={{ padding: 30 }}>
          <p style={{ fontSize: 14, color: '#7a4a6a' }}>Tap as many gems as you can in 20 seconds! ✨<br />Earn coins for your closet.</p>
          <button style={{ ...btnGold, fontSize: 16, marginTop: 12 }} onClick={() => { setScore(0); setTime(20); setGems([]); setPhase('play') }}>Start! 💎</button>
        </div>
      )}

      {phase === 'play' && (
        <div style={{ position: 'relative', height: 360, background: 'linear-gradient(135deg,#fff0f7,#e6f0ff)', borderRadius: 16, overflow: 'hidden', border: '3px solid #ffd6ec' }}>
          {gems.map(g => (
            <button key={g.id} onClick={() => tap(g.id)} className="de-pop"
              style={{ position: 'absolute', left: `${g.x}%`, top: `${g.y}%`, fontSize: 34, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
              {GEMS[g.type]}
            </button>
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div style={{ padding: 24 }}>
          <div className="de-pop" style={{ fontSize: 40 }}>🎉</div>
          <h3 style={{ color: '#b23a7a', fontSize: 18 }}>You caught {score} gems!</h3>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <div style={pill}>🪙 +{got.current.coins}</div>
            {got.current.gems > 0 && <div style={pill}>💎 +{got.current.gems}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            <button style={btnGold} onClick={() => { setScore(0); setTime(20); setGems([]); setPhase('play') }}>Play Again</button>
            <button style={btn} onClick={onBack}>🏰 Home</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── CONFETTI ───────── */
function Confetti() {
  const bits = useMemo(() => [...Array(40)].map((_, i) => ({
    left: (i * 53) % 100, delay: (i % 10) * 0.15, color: ['#ff9ec4', '#ffd36a', '#8fe0a0', '#8fbfff', '#c08fff'][i % 5], dur: 1.8 + (i % 5) * 0.3,
  })), [])
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {bits.map((b, i) => (
      <div key={i} className="de-confetti" style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
    ))}
  </div>
}

/* ════════════════════════ STYLES ════════════════════════ */
const DE_CSS = `
.de-root{ font-family: 'Inter', system-ui, sans-serif; padding: 6px; }
.de-root *{ box-sizing: border-box; }
.de-card{ background: linear-gradient(160deg,#fff7fb,#ffeef6); border: 3px solid #ffd6ec; border-radius: 22px; padding: 16px; box-shadow: 0 10px 30px rgba(200,100,160,0.18); }
.de-chip{ background: linear-gradient(135deg,#fff,#ffeaf5); border: 2px solid #ffd6ec; border-radius: 16px; padding: 10px; }
.de-toast{ position: fixed; left: 50%; transform: translateX(-50%); bottom: 28px; background: #fff; color: #b23a7a; font-weight: 800; padding: 12px 22px; border-radius: 999px; border: 3px solid #ffb0d6; box-shadow: 0 8px 24px rgba(200,100,160,0.3); z-index: 50; font-size: 14px; animation: de-pop .3s ease; }
.de-badge{ position: absolute; top: -6px; right: -4px; background: #ff4d8d; color: #fff; border-radius: 999px; width: 20px; height: 20px; display: grid; place-items: center; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.de-bounce{ animation: de-bounce 3.2s ease-in-out infinite; }
@keyframes de-bounce{ 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-8px) } }
.de-float{ animation: de-float 3s ease-in-out infinite; }
@keyframes de-float{ 0%,100%{ transform: translateY(0); opacity:.8 } 50%{ transform: translateY(-12px); opacity:1 } }
.de-fall{ animation: de-fall 4s linear infinite; }
@keyframes de-fall{ 0%{ transform: translateY(-10px) } 100%{ transform: translateY(30px) } }
.de-twinkle{ animation: de-twinkle 1.8s ease-in-out infinite; transform-origin: center; }
@keyframes de-twinkle{ 0%,100%{ opacity:.3; transform: scale(.7) } 50%{ opacity:1; transform: scale(1.1) } }
.de-pulse{ animation: de-pulse 1.6s ease-in-out infinite; }
@keyframes de-pulse{ 0%,100%{ opacity:.5 } 50%{ opacity:1 } }
.de-pop{ animation: de-pop .35s cubic-bezier(.2,1.4,.5,1); }
@keyframes de-pop{ 0%{ transform: scale(.4); opacity:0 } 100%{ transform: scale(1); opacity:1 } }
.de-confetti{ position:absolute; top:-12px; width:9px; height:14px; border-radius:2px; animation: de-conf linear forwards; }
@keyframes de-conf{ 0%{ transform: translateY(0) rotate(0) } 100%{ transform: translateY(520px) rotate(540deg) } }
@media (max-width: 640px){ .de-card{ padding: 12px; border-radius: 18px; } }
`
