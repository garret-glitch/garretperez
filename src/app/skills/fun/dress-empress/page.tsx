'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { emitXpGained } from '@/components/XpToast'
import GameLeaderboard from '@/components/GameLeaderboard'

/* ═══════════════════════════════════════════════════════════════════
   EMPRESS DRESS UP — a magical dress-up adventure
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
type Cat = 'skin' | 'eyes' | 'hair' | 'dress' | 'top' | 'bottom' | 'shoes' | 'crown'
  | 'necklace' | 'wings' | 'cape' | 'pet' | 'bg' | 'effect'

const CAT_INFO: { cat: Cat; label: string; icon: string }[] = [
  { cat: 'dress', label: 'Dresses', icon: '👗' },
  { cat: 'top', label: 'Shirts', icon: '👚' },
  { cat: 'bottom', label: 'Pants', icon: '👖' },
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
  c('dr_none', 'dress', 'No Dress · wear a shirt + pants', 'common', [], 0, { shape: 'none' }),
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

/* ── shirts (shown when "No Dress" is chosen) ── */
const TOPS: Item[] = [
  c('t_tee_pink', 'top', 'Pink Tee', 'common', [], 0, { style: 'tee', color: '#ff9ec4', trim: '#fff' }),
  c('t_tee_white', 'top', 'White Tee', 'common', [], 0, { style: 'tee', color: '#ffffff', trim: '#ffd6ec' }),
  c('t_hoodie_blue', 'top', 'Blue Hoodie', 'common', ['sunny'], 0, { style: 'hoodie', color: '#7fb0e8', trim: '#cfe2f8' }),
  c('t_blouse_mint', 'top', 'Mint Blouse', 'uncommon', ['garden'], 130, { style: 'tee', color: '#86d6b0', trim: '#fff' }),
  c('t_heart_tee', 'top', 'Heart Tee', 'uncommon', ['princess', 'rainbow'], 140, { style: 'heart', color: '#ff7ab0', trim: '#fff0f6' }),
  c('t_crop_aqua', 'top', 'Aqua Crop Top', 'uncommon', ['mermaid', 'ocean'], 140, { style: 'crop', color: '#3ec7c7', trim: '#dff8ff' }),
  c('t_blouse_gold', 'top', 'Royal Blouse', 'rare', ['queen'], 240, { style: 'tee', color: '#f0c84a', trim: '#fff6df' }),
  c('t_starry', 'top', 'Starry Top', 'epic', ['night', 'empress'], 28, { style: 'tee', color: '#4a3aa0', trim: '#b9a6ff' }, { gem: true, lvl: 12 }),
]
/* ── pants / skirts (shown when "No Dress" is chosen) ── */
const BOTTOMS: Item[] = [
  c('b_jeans', 'bottom', 'Blue Jeans', 'common', [], 0, { style: 'pants', color: '#6f8fc0', trim: '#5a78a8' }),
  c('b_pink_pants', 'bottom', 'Pink Pants', 'common', [], 0, { style: 'pants', color: '#ff9ec4', trim: '#f07ab0' }),
  c('b_leggings_purple', 'bottom', 'Purple Leggings', 'common', ['night'], 0, { style: 'leggings', color: '#9a7ad0' }),
  c('b_shorts_sun', 'bottom', 'Sunny Shorts', 'common', ['sunny', 'garden'], 0, { style: 'shorts', color: '#ffd45a', trim: '#fff' }),
  c('b_skirt_denim', 'bottom', 'Denim Skirt', 'uncommon', ['sunny'], 130, { style: 'skirt', color: '#6f8fc0', trim: '#fff' }),
  c('b_tutu_pink', 'bottom', 'Pink Tutu', 'rare', ['princess', 'fairy'], 240, { style: 'tutu', color: '#ffb0d6', trim: '#fff0f6' }),
  c('b_skirt_gold', 'bottom', 'Royal Skirt', 'rare', ['queen'], 240, { style: 'skirt', color: '#e0b84a', trim: '#fff6df' }),
  c('b_star_leggings', 'bottom', 'Star Leggings', 'epic', ['night', 'empress'], 28, { style: 'leggings', color: '#3a2f6e' }, { gem: true, lvl: 12 }),
]
/* ── extra hair ── */
const HAIR_X: Item[] = [
  c('hair_straight_blk', 'hair', 'Sleek Black', 'uncommon', ['night'], 140, { style: 'straight', color: '#2a2530', hi: '#4a4458' }),
  c('hair_bob_lav', 'hair', 'Lavender Bob', 'uncommon', ['fairy'], 170, { style: 'bob', color: '#b89ad6', hi: '#d4bdf0' }),
  c('hair_bob_mint', 'hair', 'Mint Bob', 'uncommon', ['garden', 'mermaid'], 170, { style: 'bob', color: '#7fd6c0', hi: '#a8ece0' }),
  c('hair_pony_red', 'hair', 'Fiery Pony', 'uncommon', ['dragon', 'sunny'], 170, { style: 'pony', color: '#d8552e', hi: '#f0784a' }),
  c('hair_braid_pink', 'hair', 'Rose Braids', 'rare', ['princess', 'fairy'], 300, { style: 'braid', color: '#e87aa8', hi: '#ffa8cc' }),
  c('hair_curl_purple', 'hair', 'Violet Curls', 'rare', ['night'], 320, { style: 'curl', color: '#7a5ad0', hi: '#a890f0' }),
  c('hair_space_pink', 'hair', 'Space Buns', 'rare', ['rainbow'], 320, { style: 'space', color: '#f29ac6', hi: '#ffc0de' }),
  c('hair_straight_silver', 'hair', 'Silver Straight', 'epic', ['winter', 'empress'], 30, { style: 'straight', color: '#dfe6f0', hi: '#ffffff' }, { gem: true, lvl: 14 }),
]
/* ── even more hair (new shapes: afro, pixie, side pony, ringlets, heart buns) ── */
const HAIR_Y: Item[] = [
  c('hair_afro_brn', 'hair', 'Curly Afro', 'uncommon', ['sunny'], 170, { style: 'afro', color: '#3a2418', hi: '#5a3a22' }),
  c('hair_pixie_blonde', 'hair', 'Blonde Pixie', 'uncommon', ['sunny'], 150, { style: 'pixie', color: '#e9c069', hi: '#f6dd96' }),
  c('hair_sidepony_brn', 'hair', 'Side Ponytail', 'uncommon', ['sunny'], 160, { style: 'sidepony', color: '#7a4a2a', hi: '#9c6438' }),
  c('hair_twin_blue', 'hair', 'Blue Twintails', 'uncommon', ['ocean', 'winter'], 160, { style: 'twin', color: '#6fb0e0', hi: '#a8d8f8' }),
  c('hair_straight_pink', 'hair', 'Rose Straight', 'uncommon', ['princess'], 160, { style: 'straight', color: '#e87aa8', hi: '#ffa8cc' }),
  c('hair_longcurl_blk', 'hair', 'Long Ringlets', 'uncommon', ['night'], 170, { style: 'longcurl', color: '#2c2733', hi: '#4a4458' }),
  c('hair_pixie_silver', 'hair', 'Silver Pixie', 'rare', ['winter', 'empress'], 300, { style: 'pixie', color: '#dfe6f0', hi: '#ffffff' }),
  c('hair_sidepony_teal', 'hair', 'Teal Side Pony', 'rare', ['mermaid', 'ocean'], 300, { style: 'sidepony', color: '#2fb0b0', hi: '#6fe0e0' }),
  c('hair_longcurl_gold', 'hair', 'Golden Ringlets', 'rare', ['princess', 'queen'], 320, { style: 'longcurl', color: '#caa24a', hi: '#ecc868' }),
  c('hair_bun_gold', 'hair', 'Golden Bun', 'rare', ['queen'], 300, { style: 'bun', color: '#caa24a', hi: '#ecc868' }),
  c('hair_hearts_pink', 'hair', 'Heart Buns', 'rare', ['princess', 'rainbow'], 320, { style: 'hearts', color: '#f29ac6', hi: '#ffc0de' }),
  c('hair_afro_pink', 'hair', 'Cotton Candy Afro', 'rare', ['rainbow'], 320, { style: 'afro', color: '#ff9ec4', hi: '#ffc0de' }),
  c('hair_hearts_red', 'hair', 'Ruby Heart Buns', 'epic', ['dragon'], 30, { style: 'hearts', color: '#c0354a', hi: '#e0586a' }, { gem: true, lvl: 12 }),
  c('hair_wave_white', 'hair', 'Pearl Waves', 'epic', ['winter', 'empress'], 30, { style: 'wave', color: '#eef2f8', hi: '#ffffff' }, { gem: true, lvl: 14 }),
  c('hair_afro_cloud', 'hair', 'Cloud Afro', 'legendary', ['empress'], 70, { style: 'afro', color: '#eef2f8', hi: '#ffffff' }, { gem: true, lvl: 22 }),
]
/* ── extra dresses ── */
const DRESS_X: Item[] = [
  c('dr_sun', 'dress', 'Sunny Sundress', 'common', ['sunny', 'garden'], 0, { shape: 'aline', bodice: '#ffd45a', skirt: '#ffe79a', trim: '#ffffff' }),
  c('dr_lav', 'dress', 'Lavender Gown', 'uncommon', ['fairy', 'night'], 200, { shape: 'puffy', bodice: '#9a7ad0', skirt: '#c0a8f0', trim: '#ffffff', sparkle: true }),
  c('dr_candy', 'dress', 'Candy Pop Dress', 'uncommon', ['rainbow', 'sunny'], 210, { shape: 'puffy', bodice: '#ff9ec4', skirt: '#a8e0ff', trim: '#ffffff', sparkle: true }),
  c('dr_autumn', 'dress', 'Autumn Leaves', 'uncommon', ['garden'], 200, { shape: 'aline', bodice: '#d8702a', skirt: '#f0a050', trim: '#ffe0a8' }),
  c('dr_cherry', 'dress', 'Cherry Blossom', 'rare', ['garden', 'princess'], 440, { shape: 'ball', bodice: '#f08fb6', skirt: '#ffd6e6', trim: '#fff0f6', sparkle: true }),
  c('dr_peacock', 'dress', 'Peacock Gown', 'rare', ['queen', 'ocean'], 460, { shape: 'mermaid', bodice: '#1f8a8a', skirt: '#2fb0c0', trim: '#ffd96a', sparkle: true }),
  c('dr_emerald', 'dress', 'Emerald Queen', 'rare', ['queen', 'garden'], 460, { shape: 'royal', bodice: '#1f8a4a', skirt: '#2fb060', trim: '#f0c860', sparkle: true }),
  c('dr_galaxy', 'dress', 'Galaxy Gown', 'epic', ['night', 'empress'], 42, { shape: 'royal', bodice: '#3a2f6e', skirt: '#5a4ab0', trim: '#b9a6ff', sparkle: true, celest: true }, { gem: true, lvl: 16 }),
  c('dr_starlight', 'dress', 'Starlight Empress', 'legendary', ['empress', 'night'], 95, { shape: 'ball', bodice: '#4a3aa0', skirt: '#7a68d6', trim: '#f4e08a', sparkle: true, celest: true }, { gem: true, lvl: 24 }),
]
/* ── extra crowns ── */
const CROWN_X: Item[] = [
  c('cr_rose', 'crown', 'Rose Gold Tiara', 'uncommon', ['princess'], 170, { style: 'tiara', metal: '#f0b8a8', gem: '#ff9ec4' }),
  c('cr_heart', 'crown', 'Heart Crown', 'uncommon', ['princess', 'rainbow'], 180, { style: 'heart', metal: '#f0c84a', gem: '#ff7ab0' }),
  c('cr_butterfly', 'crown', 'Butterfly Tiara', 'rare', ['fairy', 'garden'], 300, { style: 'flower', metal: '#c08fff', gem: '#ffd36a' }),
  c('cr_moon', 'crown', 'Moon Crown', 'rare', ['night', 'mermaid'], 300, { style: 'moon', metal: '#d6e6ff', gem: '#fff6d0' }),
  c('cr_star', 'crown', 'Star Crown', 'rare', ['night', 'empress'], 320, { style: 'star', metal: '#f0e4b0', gem: '#ffe07a' }),
  c('cr_starlegend', 'crown', 'Celestial Star Crown', 'legendary', ['empress'], 85, { style: 'star', metal: '#b9a6ff', gem: '#f4e08a' }, { gem: true, lvl: 26 }),
]
/* ── extra jewelry ── */
const NECK_X: Item[] = [
  c('nk_choker', 'necklace', 'Velvet Choker', 'uncommon', ['night', 'queen'], 120, { style: 'choker', color: '#b23a55' }),
  c('nk_heart', 'necklace', 'Heart Locket', 'uncommon', ['princess', 'rainbow'], 130, { style: 'heart', color: '#ff7ab0' }),
  c('nk_star', 'necklace', 'Star Pendant', 'rare', ['night', 'empress'], 240, { style: 'star', color: '#ffe07a' }),
  c('nk_ruby', 'necklace', 'Ruby Drop', 'rare', ['dragon', 'queen'], 240, { style: 'gem', color: '#e0354a' }),
  c('nk_sapphire', 'necklace', 'Sapphire Drop', 'rare', ['ocean', 'winter'], 240, { style: 'gem', color: '#3a6ae0' }),
  c('nk_moon', 'necklace', 'Moon Pearl', 'epic', ['mermaid', 'night'], 28, { style: 'pearl', color: '#dfe6ff' }, { gem: true, lvl: 12 }),
]
/* ── extra shoes ── */
const SHOE_X: Item[] = [
  c('sh_flat_purple', 'shoes', 'Purple Flats', 'common', [], 0, { style: 'flat', color: '#b89ad6' }),
  c('sh_sneaker', 'shoes', 'Star Sneakers', 'common', ['sunny', 'rainbow'], 120, { style: 'sneaker', color: '#ff9ec4' }),
  c('sh_boot_pink', 'shoes', 'Pink Boots', 'uncommon', ['winter'], 150, { style: 'boot', color: '#e87aa8' }),
  c('sh_glass_pink', 'shoes', 'Rose Glass Slippers', 'rare', ['princess'], 250, { style: 'glass', color: '#ffc0e0' }),
  c('sh_heel_red', 'shoes', 'Ruby Heels', 'rare', ['dragon', 'queen'], 260, { style: 'heel', color: '#d0354a' }),
  c('sh_heel_silver', 'shoes', 'Starlight Heels', 'epic', ['empress', 'night'], 28, { style: 'heel', color: '#cdd6f0' }, { gem: true, lvl: 16 }),
]
/* ── extra pets ── */
const PET_X: Item[] = [
  c('pet_kitten_gray', 'pet', 'Gray Kitten', 'common', [], 0, { style: 'cat', color: '#b8bcc8' }),
  c('pet_hamster', 'pet', 'Hamster', 'uncommon', ['garden', 'sunny'], 180, { style: 'hamster', color: '#e0b070' }),
  c('pet_penguin', 'pet', 'Penguin', 'uncommon', ['winter', 'ocean'], 190, { style: 'penguin' }),
  c('pet_panda', 'pet', 'Panda', 'rare', ['garden'], 300, { style: 'panda' }),
  c('pet_pony', 'pet', 'Pony', 'rare', ['sunny', 'rainbow'], 300, { style: 'pony', color: '#f0d6a0', mane: '#ff9ec4' }),
  c('pet_dragon_pink', 'pet', 'Pink Dragon', 'legendary', ['fairy', 'empress'], 75, { style: 'dragon', color: '#f0a0c0' }, { gem: true, lvl: 18 }),
]

/* ════════════ BIG CONTENT PASS — even more of everything ════════════ */
/* ── more hair ── */
const HAIR_Z: Item[] = [
  c('hair_wave_pink', 'hair', 'Rose Waves', 'common', ['princess'], 0, { style: 'wave', color: '#e87aa8', hi: '#ffa8cc' }),
  c('hair_pony_purple', 'hair', 'Purple Pony', 'uncommon', ['night'], 160, { style: 'pony', color: '#7a5ad0', hi: '#a890f0' }),
  c('hair_bob_blk', 'hair', 'Raven Bob', 'uncommon', ['night'], 150, { style: 'bob', color: '#2c2733', hi: '#4a4458' }),
  c('hair_curl_pink', 'hair', 'Pink Curls', 'uncommon', ['rainbow', 'princess'], 170, { style: 'curl', color: '#f29ac6', hi: '#ffc0de' }),
  c('hair_wave_teal', 'hair', 'Ocean Waves', 'uncommon', ['mermaid', 'ocean'], 170, { style: 'wave', color: '#2fb0b0', hi: '#6fe0e0' }),
  c('hair_braid_silver', 'hair', 'Silver Braid', 'rare', ['winter'], 300, { style: 'braid', color: '#dfe6f0', hi: '#ffffff' }),
  c('hair_space_blue', 'hair', 'Galaxy Buns', 'rare', ['night', 'ocean'], 320, { style: 'space', color: '#5a6ad0', hi: '#8fa0f0' }),
  c('hair_afro_purple', 'hair', 'Violet Afro', 'rare', ['night', 'rainbow'], 320, { style: 'afro', color: '#9b6fd6', hi: '#bf9af0' }),
  c('hair_longcurl_white', 'hair', 'Frost Ringlets', 'epic', ['winter'], 30, { style: 'longcurl', color: '#eef2f8', hi: '#ffffff' }, { gem: true, lvl: 14 }),
  c('hair_hearts_gold', 'hair', 'Golden Heart Buns', 'epic', ['empress', 'queen'], 32, { style: 'hearts', color: '#caa24a', hi: '#ecc868' }, { gem: true, lvl: 16 }),
]
/* ── more dresses ── */
const DRESS_Y: Item[] = [
  c('dr_mint2', 'dress', 'Spring Mint', 'common', ['garden'], 0, { shape: 'puffy', bodice: '#86d6b0', skirt: '#bde6d0', trim: '#ffffff' }),
  c('dr_rose', 'dress', 'Rose Princess', 'uncommon', ['princess'], 200, { shape: 'ball', bodice: '#e8557a', skirt: '#ffb0c8', trim: '#fff0f6', sparkle: true }),
  c('dr_berry', 'dress', 'Berry Gown', 'uncommon', ['night'], 200, { shape: 'aline', bodice: '#7a2a5a', skirt: '#a8487a', trim: '#ffd0e0' }),
  c('dr_coral', 'dress', 'Coral Gown', 'uncommon', ['mermaid', 'ocean'], 210, { shape: 'mermaid', bodice: '#ff8a6a', skirt: '#ffb89a', trim: '#ffffff', sparkle: true }),
  c('dr_gold', 'dress', 'Golden Gala', 'rare', ['queen', 'empress'], 460, { shape: 'ball', bodice: '#e0b84a', skirt: '#f6d878', trim: '#fff6df', sparkle: true }),
  c('dr_ice2', 'dress', 'Icicle Gown', 'rare', ['winter'], 440, { shape: 'mermaid', bodice: '#9fc4e8', skirt: '#cfe6ff', trim: '#ffffff', sparkle: true }),
  c('dr_sunset', 'dress', 'Sunset Gown', 'rare', ['sunny', 'dragon'], 440, { shape: 'royal', bodice: '#e85a3a', skirt: '#ffa05a', trim: '#ffe0a8', sparkle: true }),
  c('dr_aurora', 'dress', 'Aurora Gown', 'epic', ['night', 'empress'], 44, { shape: 'ball', bodice: '#2a6a8a', skirt: '#4fb0c0', trim: '#b9f0e0', sparkle: true, celest: true }, { gem: true, lvl: 18 }),
  c('dr_prism', 'dress', 'Prism Gown', 'legendary', ['rainbow', 'empress'], 90, { shape: 'royal', bodice: '#ff8fb0', skirt: '#ffd36a', trim: '#8fe0ff', rainbow: true, sparkle: true }, { gem: true, lvl: 26 }),
]
/* ── more tops ── */
const TOPS_X: Item[] = [
  c('t_hoodie_pink', 'top', 'Pink Hoodie', 'common', [], 0, { style: 'hoodie', color: '#ff9ec4', trim: '#fff0f6' }),
  c('t_tank_mint', 'top', 'Mint Tank', 'common', ['garden'], 0, { style: 'tee', color: '#86d6b0', trim: '#ffffff' }),
  c('t_blouse_lav', 'top', 'Lavender Blouse', 'uncommon', ['fairy', 'night'], 130, { style: 'tee', color: '#b89ad6', trim: '#ffffff' }),
  c('t_crop_pink', 'top', 'Pink Crop', 'uncommon', ['rainbow'], 140, { style: 'crop', color: '#ff7ab0', trim: '#fff0f6' }),
  c('t_heart_red', 'top', 'Ruby Heart Tee', 'rare', ['dragon'], 240, { style: 'heart', color: '#c0354a', trim: '#ffd0d8' }),
  c('t_galaxy_tee', 'top', 'Galaxy Tee', 'epic', ['night', 'empress'], 28, { style: 'tee', color: '#2a2f6e', trim: '#8f7fe0' }, { gem: true, lvl: 14 }),
]
/* ── more pants & skirts ── */
const BOTTOMS_X: Item[] = [
  c('b_skirt_pink', 'bottom', 'Pink Skirt', 'common', ['princess'], 0, { style: 'skirt', color: '#ffb0d6', trim: '#ffffff' }),
  c('b_leggings_pink', 'bottom', 'Pink Leggings', 'common', [], 0, { style: 'leggings', color: '#ff9ec4' }),
  c('b_pants_mint', 'bottom', 'Mint Pants', 'common', ['garden'], 0, { style: 'pants', color: '#86d6b0', trim: '#5fae8a' }),
  c('b_skirt_mint', 'bottom', 'Mint Skirt', 'uncommon', ['garden'], 130, { style: 'skirt', color: '#86d6b0', trim: '#ffffff' }),
  c('b_tutu_white', 'bottom', 'White Tutu', 'uncommon', ['winter', 'princess'], 140, { style: 'tutu', color: '#eef2f8', trim: '#cfe2f8' }),
  c('b_tutu_rainbow', 'bottom', 'Rainbow Tutu', 'rare', ['rainbow'], 250, { style: 'tutu', color: '#ff9ec4', trim: '#a8e0ff' }),
  c('b_skirt_star', 'bottom', 'Starry Skirt', 'rare', ['night'], 240, { style: 'skirt', color: '#3a2f6e', trim: '#b9a6ff' }),
  c('b_skirt_galaxy', 'bottom', 'Galaxy Skirt', 'epic', ['night', 'empress'], 30, { style: 'tutu', color: '#3a2f6e', trim: '#8f7fe0' }, { gem: true, lvl: 14 }),
]
/* ── more shoes ── */
const SHOE_Y: Item[] = [
  c('sh_flat_mint', 'shoes', 'Mint Flats', 'common', ['garden'], 0, { style: 'flat', color: '#86d6b0' }),
  c('sh_boot_brown', 'shoes', 'Brown Boots', 'common', ['garden'], 0, { style: 'boot', color: '#9a6a3a' }),
  c('sh_sneaker_blue', 'shoes', 'Blue Sneakers', 'common', ['sunny'], 120, { style: 'sneaker', color: '#7fb0e8' }),
  c('sh_glass_blue', 'shoes', 'Aqua Glass Slippers', 'rare', ['mermaid', 'winter'], 250, { style: 'glass', color: '#bfe6ff' }),
  c('sh_heel_purple', 'shoes', 'Violet Heels', 'rare', ['night'], 260, { style: 'heel', color: '#9b6fd6' }),
  c('sh_heel_empress', 'shoes', 'Empress Heels', 'epic', ['empress'], 30, { style: 'heel', color: '#f0d878' }, { gem: true, lvl: 18 }),
]
/* ── more crowns ── */
const CROWN_Y: Item[] = [
  c('cr_pink_tiara', 'crown', 'Pink Tiara', 'common', ['princess'], 0, { style: 'tiara', metal: '#ff9ec4', gem: '#ffffff' }),
  c('cr_daisy', 'crown', 'Daisy Crown', 'uncommon', ['garden', 'fairy'], 160, { style: 'flower', metal: '#ffffff', gem: '#ffd36a' }),
  c('cr_emerald', 'crown', 'Emerald Crown', 'rare', ['garden', 'queen'], 300, { style: 'gold', metal: '#2fb060', gem: '#fff6c4' }),
  c('cr_sapphire', 'crown', 'Sapphire Crown', 'rare', ['ocean', 'winter'], 300, { style: 'gold', metal: '#3a6ae0', gem: '#bfe6ff' }),
  c('cr_phoenix', 'crown', 'Phoenix Crown', 'epic', ['dragon'], 36, { style: 'dragon', metal: '#ff6a2a', gem: '#ffd84a' }, { gem: true, lvl: 14 }),
  c('cr_moon_gold', 'crown', 'Golden Moon', 'epic', ['night', 'empress'], 34, { style: 'moon', metal: '#f0d878', gem: '#fff6d0' }, { gem: true, lvl: 16 }),
]
/* ── more jewelry ── */
const NECK_Y: Item[] = [
  c('nk_bow', 'necklace', 'Ribbon Bow', 'common', ['princess'], 0, { style: 'bow', color: '#ff9ec4' }),
  c('nk_pearl_pink', 'necklace', 'Pink Pearls', 'common', ['princess'], 0, { style: 'pearl', color: '#ffd9ec' }),
  c('nk_flower', 'necklace', 'Flower Charm', 'uncommon', ['garden', 'fairy'], 130, { style: 'flower', color: '#ff7ab0' }),
  c('nk_teardrop', 'necklace', 'Aqua Teardrop', 'uncommon', ['ocean', 'mermaid'], 130, { style: 'gem', color: '#3ec7c7' }),
  c('nk_butterfly', 'necklace', 'Butterfly Charm', 'rare', ['fairy', 'garden'], 240, { style: 'butterfly', color: '#c08fff' }),
  c('nk_amethyst', 'necklace', 'Amethyst Drop', 'rare', ['night'], 240, { style: 'gem', color: '#9b6fd6' }),
  c('nk_emerald_choker', 'necklace', 'Emerald Choker', 'rare', ['queen', 'garden'], 240, { style: 'choker', color: '#2fb060' }),
  c('nk_crown', 'necklace', 'Crown Pendant', 'epic', ['queen', 'empress'], 28, { style: 'star', color: '#f0c84a' }, { gem: true, lvl: 16 }),
]
/* ── more wings ── */
const WINGS_X: Item[] = [
  c('wg_pixie', 'wings', 'Pixie Wings', 'uncommon', ['fairy', 'garden'], 220, { style: 'fairy', color: '#c8f0a8' }),
  c('wg_heart', 'wings', 'Heart Wings', 'rare', ['princess', 'rainbow'], 360, { style: 'heart', color: '#ff8fc0' }),
  c('wg_monarch', 'wings', 'Monarch Wings', 'rare', ['fairy', 'sunny'], 360, { style: 'butterfly', color: '#f0903a' }),
  c('wg_angel', 'wings', 'Angel Wings', 'rare', ['winter', 'empress'], 380, { style: 'feather', color: '#ffffff' }),
  c('wg_crystal', 'wings', 'Crystal Wings', 'epic', ['winter', 'empress'], 34, { style: 'crystal', color: '#bfe6ff' }, { gem: true, lvl: 14 }),
  c('wg_dragon', 'wings', 'Dragon Wings', 'epic', ['dragon'], 40, { style: 'dragon', color: '#7a1f16' }, { gem: true, lvl: 14 }),
  c('wg_phoenix', 'wings', 'Phoenix Wings', 'legendary', ['dragon', 'empress'], 80, { style: 'dragon', color: '#e85a2a' }, { gem: true, lvl: 20 }),
  c('wg_starfall', 'wings', 'Starfall Wings', 'legendary', ['empress', 'night'], 88, { style: 'crystal', color: '#b9a6ff' }, { gem: true, lvl: 24 }),
]
/* ── more capes ── */
const CAPES_X: Item[] = [
  c('cp_pink', 'cape', 'Rose Cape', 'uncommon', ['princess'], 250, { style: 'royal', color: '#e8557a', trim: '#fff0c4' }),
  c('cp_green', 'cape', 'Forest Cape', 'uncommon', ['garden'], 250, { style: 'royal', color: '#2f8a4a', trim: '#ffe0a8' }),
  c('cp_ocean', 'cape', 'Ocean Cape', 'rare', ['mermaid', 'ocean'], 300, { style: 'royal', color: '#2a7a9a', trim: '#bfeef0' }),
  c('cp_winter', 'cape', 'Snow Cape', 'rare', ['winter'], 300, { style: 'fur', color: '#bcd8f0', trim: '#ffffff' }),
  c('cp_gold', 'cape', 'Golden Cape', 'epic', ['queen', 'empress'], 38, { style: 'royal', color: '#e0b84a', trim: '#fff6df' }, { gem: true, lvl: 14 }),
  c('cp_phoenix', 'cape', 'Phoenix Cape', 'epic', ['dragon'], 40, { style: 'royal', color: '#c0301a', trim: '#ff9a3a' }, { gem: true, lvl: 16 }),
  c('cp_galaxy', 'cape', 'Galaxy Cape', 'legendary', ['night', 'empress'], 90, { style: 'royal', color: '#2a2052', trim: '#8f7fe0', stars: true }, { gem: true, lvl: 26 }),
]
/* ── more pets ── */
const PET_Y: Item[] = [
  c('pet_chick', 'pet', 'Chick', 'common', ['sunny'], 0, { style: 'chick', color: '#ffd45a' }),
  c('pet_frog', 'pet', 'Frog Prince', 'uncommon', ['garden'], 180, { style: 'frog', color: '#6fae5a' }),
  c('pet_lamb', 'pet', 'Lamb', 'uncommon', ['winter', 'garden'], 190, { style: 'lamb' }),
  c('pet_deer', 'pet', 'Deer', 'rare', ['garden', 'winter'], 300, { style: 'deer', color: '#c8884a' }),
  c('pet_koala', 'pet', 'Koala', 'rare', ['sunny'], 300, { style: 'koala' }),
  c('pet_fox_white', 'pet', 'Arctic Fox', 'rare', ['winter'], 300, { style: 'fox', color: '#e8eef4' }),
  c('pet_unicorn_blue', 'pet', 'Blue Unicorn', 'epic', ['ocean', 'night'], 42, { style: 'unicorn', color: '#dfe8ff', mane: '#7fb0e8' }, { gem: true, lvl: 12 }),
]
/* ── more magic ── */
const EFFECTS_X: Item[] = [
  c('fx_butterflies', 'effect', 'Butterflies', 'uncommon', ['fairy', 'garden'], 150, { style: 'butterflies' }),
  c('fx_music', 'effect', 'Music Notes', 'uncommon', ['rainbow', 'sunny'], 140, { style: 'music' }),
  c('fx_leaves', 'effect', 'Falling Leaves', 'uncommon', ['garden'], 150, { style: 'leaves' }),
  c('fx_fireflies', 'effect', 'Fireflies', 'rare', ['night', 'garden'], 220, { style: 'fireflies' }),
  c('fx_rainbow', 'effect', 'Rainbows', 'rare', ['rainbow'], 220, { style: 'rainbow' }),
  c('fx_fire', 'effect', 'Ember Glow', 'epic', ['dragon'], 30, { style: 'fire' }, { gem: true, lvl: 12 }),
  c('fx_diamonds', 'effect', 'Diamond Dust', 'epic', ['empress', 'queen'], 32, { style: 'diamonds' }, { gem: true, lvl: 16 }),
]
/* ── more scenes ── */
const BG_X: Item[] = [
  c('bg_meadow', 'bg', 'Sunny Meadow', 'uncommon', ['sunny', 'garden'], 120, { style: 'garden' }),
  c('bg_throne', 'bg', 'Throne Room', 'rare', ['queen'], 220, { style: 'castle' }),
  c('bg_deepsea', 'bg', 'Deep Sea', 'rare', ['mermaid', 'ocean'], 220, { style: 'ocean' }),
]
/* ── one more pass: color variants across every category ── */
const FINAL: Item[] = [
  // dresses
  c('dr_lemon', 'dress', 'Lemon Sundress', 'common', ['sunny'], 0, { shape: 'aline', bodice: '#f6e05a', skirt: '#fff0a0', trim: '#ffffff' }),
  c('dr_lilac', 'dress', 'Lilac Ball', 'uncommon', ['fairy', 'princess'], 200, { shape: 'ball', bodice: '#b89ad6', skirt: '#d8c0f0', trim: '#ffffff', sparkle: true }),
  c('dr_teal', 'dress', 'Teal Mermaid', 'rare', ['mermaid', 'ocean'], 440, { shape: 'mermaid', bodice: '#1f8a8a', skirt: '#3ec7c7', trim: '#dff8ff', sparkle: true }),
  c('dr_crimson', 'dress', 'Crimson Royal', 'rare', ['queen', 'dragon'], 460, { shape: 'royal', bodice: '#a01828', skirt: '#d0303a', trim: '#f0c860', sparkle: true }),
  c('dr_moonbeam', 'dress', 'Moonbeam Gown', 'legendary', ['empress', 'night'], 92, { shape: 'mermaid', bodice: '#3a3a6a', skirt: '#6a6ad0', trim: '#dfe6ff', sparkle: true, celest: true }, { gem: true, lvl: 24 }),
  // hair
  c('hair_pony_white', 'hair', 'Pearl Pony', 'uncommon', ['winter'], 160, { style: 'pony', color: '#eef2f8', hi: '#ffffff' }),
  c('hair_twin_purple', 'hair', 'Violet Twintails', 'uncommon', ['night'], 160, { style: 'twin', color: '#9b6fd6', hi: '#bf9af0' }),
  c('hair_bun_pink', 'hair', 'Rose Bun', 'common', ['princess'], 0, { style: 'bun', color: '#e87aa8', hi: '#ffa8cc' }),
  c('hair_straight_teal', 'hair', 'Teal Straight', 'rare', ['mermaid'], 300, { style: 'straight', color: '#2fb0b0', hi: '#6fe0e0' }),
  // tops & bottoms
  c('t_tee_purple', 'top', 'Purple Tee', 'common', ['night'], 0, { style: 'tee', color: '#9b6fd6', trim: '#ffffff' }),
  c('b_skirt_purple', 'bottom', 'Purple Skirt', 'common', ['night'], 0, { style: 'skirt', color: '#9b6fd6', trim: '#ffffff' }),
  c('b_tutu_teal', 'bottom', 'Teal Tutu', 'uncommon', ['mermaid', 'ocean'], 140, { style: 'tutu', color: '#3ec7c7', trim: '#dff8ff' }),
  c('b_pants_blk', 'bottom', 'Black Pants', 'common', ['night'], 0, { style: 'pants', color: '#3a3540', trim: '#5a5460' }),
  // jewelry
  c('nk_heart_gold', 'necklace', 'Gold Heart', 'rare', ['princess', 'queen'], 240, { style: 'heart', color: '#f0c84a' }),
  c('nk_star_blue', 'necklace', 'Blue Star', 'uncommon', ['ocean', 'night'], 130, { style: 'star', color: '#5aa0e0' }),
  // crowns
  c('cr_heart_pink', 'crown', 'Pink Heart Crown', 'uncommon', ['princess', 'rainbow'], 170, { style: 'heart', metal: '#ff9ec4', gem: '#ffffff' }),
  c('cr_star_frost', 'crown', 'Frost Star Crown', 'rare', ['winter'], 300, { style: 'star', metal: '#bfe6ff', gem: '#ffffff' }),
  // shoes
  c('sh_flat_yellow', 'shoes', 'Sunny Flats', 'common', ['sunny'], 0, { style: 'flat', color: '#ffd45a' }),
  c('sh_boot_white', 'shoes', 'Snow Boots', 'uncommon', ['winter'], 150, { style: 'boot', color: '#eef2f8' }),
  // wings & capes
  c('wg_fairy_pink', 'wings', 'Rose Fairy Wings', 'uncommon', ['princess', 'fairy'], 220, { style: 'fairy', color: '#ffd0e6' }),
  c('cp_purple', 'cape', 'Twilight Cape', 'uncommon', ['night'], 250, { style: 'royal', color: '#5a3aa0', trim: '#cabff0' }),
  // pets
  c('pet_cat_blk', 'pet', 'Black Cat', 'common', ['night'], 0, { style: 'cat', color: '#3a3540' }),
  c('pet_bunny_pink', 'pet', 'Pink Bunny', 'uncommon', ['princess', 'rainbow'], 180, { style: 'bunny', color: '#ffd0e0' }),
  c('pet_owl_white', 'pet', 'Snowy Owl', 'rare', ['winter'], 300, { style: 'owl', color: '#eef2f8' }),
  c('pet_swan_black', 'pet', 'Black Swan', 'rare', ['night', 'queen'], 300, { style: 'swan', color: '#3a3540' }),
]

const ALL: Item[] = [
  ...SKINS, ...EYES, ...HAIR, ...HAIR_X, ...HAIR_Y, ...HAIR_Z,
  ...DRESSES, ...DRESS_X, ...DRESS_Y, ...TOPS, ...TOPS_X, ...BOTTOMS, ...BOTTOMS_X,
  ...SHOES, ...SHOE_X, ...SHOE_Y, ...CROWNS, ...CROWN_X, ...CROWN_Y,
  ...NECKS, ...NECK_X, ...NECK_Y, ...WINGS, ...WINGS_X, ...CAPES, ...CAPES_X,
  ...PETS, ...PET_X, ...PET_Y, ...BGS, ...BG_X, ...EFFECTS, ...EFFECTS_X,
  ...FINAL,
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

/* ════════════════════════ CASTLE DECORATING ════════════════════════ */
type DecorSlot = 'wallpaper' | 'floor' | 'furniture' | 'rug' | 'window' | 'wallart' | 'plant' | 'light'
interface Decor { id: string; slot: DecorSlot; name: string; rarity: Rarity; price: number; gem?: boolean; lvl?: number; p: any }
const d = (id: string, slot: DecorSlot, name: string, rarity: Rarity, price: number, p: any, opts: { gem?: boolean; lvl?: number } = {}): Decor => ({ id, slot, name, rarity, price, p, ...opts })

const DECOR: Decor[] = [
  // wallpaper
  d('wp_pink', 'wallpaper', 'Pink Walls', 'common', 0, { color: '#f3d0e6' }),
  d('wp_lavender', 'wallpaper', 'Lavender Walls', 'common', 0, { color: '#e0d0f0' }),
  d('wp_mint', 'wallpaper', 'Mint Walls', 'common', 60, { color: '#cfeede' }),
  d('wp_blue', 'wallpaper', 'Sky Walls', 'common', 60, { color: '#cfe2f8' }),
  d('wp_dots', 'wallpaper', 'Polka Dots', 'uncommon', 120, { color: '#ffd6ec', pattern: 'dots' }),
  d('wp_stripes', 'wallpaper', 'Candy Stripes', 'uncommon', 120, { color: '#ffc0d6', pattern: 'stripes' }),
  d('wp_hearts', 'wallpaper', 'Heart Walls', 'rare', 200, { color: '#ffb0d6', pattern: 'hearts' }),
  d('wp_gold', 'wallpaper', 'Royal Gold', 'rare', 240, { color: '#e8d8a0' }),
  d('wp_stars', 'wallpaper', 'Starry Walls', 'epic', 20, { color: '#3a3a6a', pattern: 'stars' }, { gem: true, lvl: 10 }),
  // floor
  d('fl_wood', 'floor', 'Wood Floor', 'common', 0, { color: '#caa06a', pattern: 'wood' }),
  d('fl_pink', 'floor', 'Pink Tiles', 'common', 0, { color: '#f0b8d0', pattern: 'tile' }),
  d('fl_marble', 'floor', 'Marble Floor', 'uncommon', 120, { color: '#e8e8f0', pattern: 'tile' }),
  d('fl_grass', 'floor', 'Garden Grass', 'uncommon', 120, { color: '#8fce7a' }),
  d('fl_checker', 'floor', 'Checker Floor', 'rare', 200, { color: '#d0a0c0', pattern: 'checker' }),
  d('fl_gold', 'floor', 'Golden Floor', 'rare', 240, { color: '#e8c860', pattern: 'tile' }),
  d('fl_galaxy', 'floor', 'Galaxy Floor', 'epic', 20, { color: '#2a2452', pattern: 'checker' }, { gem: true, lvl: 10 }),
  // furniture
  d('fr_none', 'furniture', 'Empty', 'common', 0, { style: 'none' }),
  d('fr_bed_pink', 'furniture', 'Pink Bed', 'common', 0, { style: 'bed', color: '#f29ac6', color2: '#e0709a' }),
  d('fr_bed_blue', 'furniture', 'Blue Bed', 'common', 80, { style: 'bed', color: '#8fb0e8', color2: '#6f90c8' }),
  d('fr_canopy', 'furniture', 'Canopy Bed', 'rare', 260, { style: 'canopy', color: '#e87aa8', color2: '#fff0c4' }),
  d('fr_sofa', 'furniture', 'Cozy Sofa', 'uncommon', 160, { style: 'sofa', color: '#c08fd0', color2: '#a06ab0' }),
  d('fr_table', 'furniture', 'Tea Table', 'uncommon', 160, { style: 'table', color: '#caa06a', color2: '#8a6a4a' }),
  d('fr_vanity', 'furniture', 'Vanity Mirror', 'rare', 280, { style: 'vanity', color: '#f0b8d0', color2: '#e8c45c' }),
  d('fr_petbed', 'furniture', 'Pet Bed', 'uncommon', 150, { style: 'petbed', color: '#ffd0a8', color2: '#ffb088' }),
  d('fr_throne_gold', 'furniture', 'Golden Throne', 'rare', 300, { style: 'throne', color: '#e0b84a', color2: '#fff6c4' }),
  d('fr_throne_red', 'furniture', 'Royal Throne', 'rare', 300, { style: 'throne', color: '#a0283a', color2: '#f0c860' }),
  d('fr_cauldron', 'furniture', 'Magic Cauldron', 'epic', 24, { style: 'cauldron', color: '#5a4a6a', color2: '#7a6a8a' }, { gem: true, lvl: 12 }),
  // rug
  d('rug_none', 'rug', 'No Rug', 'common', 0, { style: 'none' }),
  d('rug_pink', 'rug', 'Pink Rug', 'common', 0, { style: 'round', color: '#ff9ec4' }),
  d('rug_star', 'rug', 'Star Rug', 'uncommon', 120, { style: 'star', color: '#8f7fe0' }),
  d('rug_heart', 'rug', 'Heart Rug', 'uncommon', 120, { style: 'heart', color: '#ff7ab0' }),
  d('rug_royal', 'rug', 'Royal Rug', 'rare', 220, { style: 'royal', color: '#a0283a', trim: '#f0c860' }),
  // window
  d('win_none', 'window', 'No Window', 'common', 0, { style: 'none' }),
  d('win_day', 'window', 'Sunny Window', 'common', 0, { style: 'day' }),
  d('win_arch', 'window', 'Arch Window', 'uncommon', 120, { style: 'arch' }),
  d('win_night', 'window', 'Starry Window', 'rare', 200, { style: 'night' }),
  // wall art
  d('art_none', 'wallart', 'No Art', 'common', 0, { style: 'none' }),
  d('art_portrait', 'wallart', 'Portrait', 'common', 0, { style: 'portrait', color: '#caa24a' }),
  d('art_landscape', 'wallart', 'Landscape', 'uncommon', 120, { style: 'landscape', color: '#caa24a' }),
  d('art_mirror', 'wallart', 'Wall Mirror', 'uncommon', 140, { style: 'mirror', color: '#e8c45c' }),
  d('art_clock', 'wallart', 'Royal Clock', 'rare', 200, { style: 'clock', color: '#c89b3c' }),
  // plant
  d('plant_none', 'plant', 'No Plant', 'common', 0, { style: 'none' }),
  d('plant_rose', 'plant', 'Rose Bush', 'common', 0, { style: 'rose' }),
  d('plant_tulips', 'plant', 'Tulips', 'uncommon', 100, { style: 'tulips' }),
  d('plant_fern', 'plant', 'Fern', 'uncommon', 100, { style: 'fern' }),
  d('plant_tree', 'plant', 'Little Tree', 'rare', 200, { style: 'tree' }),
  // light
  d('light_none', 'light', 'No Light', 'common', 0, { style: 'none' }),
  d('light_gold', 'light', 'Gold Chandelier', 'common', 0, { style: 'gold', color: '#f0c84a' }),
  d('light_pink', 'light', 'Rose Chandelier', 'uncommon', 120, { style: 'gold', color: '#ff9ec4' }),
  d('light_crystal', 'light', 'Crystal Chandelier', 'rare', 240, { style: 'gold', color: '#bfe6ff' }),
]
const DECOR_BY_ID: Record<string, Decor> = Object.fromEntries(DECOR.map(x => [x.id, x]))
const DECOR_STARTERS = DECOR.filter(x => x.price === 0).map(x => x.id)
const DECOR_SLOTS: { slot: DecorSlot; label: string; icon: string }[] = [
  { slot: 'wallpaper', label: 'Walls', icon: '🧱' },
  { slot: 'floor', label: 'Floor', icon: '🟫' },
  { slot: 'furniture', label: 'Furniture', icon: '🛏️' },
  { slot: 'rug', label: 'Rugs', icon: '🟪' },
  { slot: 'window', label: 'Windows', icon: '🪟' },
  { slot: 'wallart', label: 'Wall Art', icon: '🖼️' },
  { slot: 'plant', label: 'Plants', icon: '🪴' },
  { slot: 'light', label: 'Lights', icon: '💡' },
]
const ROOMS: { id: string; name: string; icon: string; lvl: number }[] = [
  { id: 'bedroom', name: 'Bedroom', icon: '🛏️', lvl: 1 },
  { id: 'tearoom', name: 'Tea Room', icon: '🫖', lvl: 3 },
  { id: 'throne', name: 'Throne Room', icon: '👑', lvl: 5 },
  { id: 'garden', name: 'Garden', icon: '🌸', lvl: 5 },
  { id: 'petroom', name: 'Pet Room', icon: '🐾', lvl: 8 },
  { id: 'ballroom', name: 'Ballroom', icon: '💃', lvl: 10 },
  { id: 'magic', name: 'Magic Room', icon: '✨', lvl: 12 },
]
type Room = Record<DecorSlot, string>
function defaultRoom(): Room {
  return { wallpaper: 'wp_pink', floor: 'fl_wood', furniture: 'fr_bed_pink', rug: 'rug_pink', window: 'win_day', wallart: 'art_portrait', plant: 'plant_rose', light: 'light_gold' }
}
interface Castle { owned: string[]; rooms: Record<string, Room> }
function freshCastle(): Castle { return { owned: [...DECOR_STARTERS], rooms: { bedroom: defaultRoom() } } }

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
  castle: Castle
}
const DEFAULT_EQUIP: Equip = {
  skin: 'skin_light', eyes: 'eye_blue', hair: 'hair_wave_brn', dress: 'dr_start',
  top: 't_tee_pink', bottom: 'b_jeans',
  shoes: 'sh_flat_pink', crown: 'cr_tiara', necklace: 'nk_pearl', wings: 'wg_none',
  cape: 'cp_none', pet: 'pet_cat', bg: 'bg_castle', effect: 'fx_sparkle',
}
function freshSave(): Save {
  return {
    name: 'Princess', coins: 250, gems: 3, xp: 0, owned: [...STARTERS],
    equip: { ...DEFAULT_EQUIP }, dailyDay: 0, lastClaim: '', best: {}, castle: freshCastle(),
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
      castle: s.castle && s.castle.owned
        ? { owned: Array.from(new Set([...DECOR_STARTERS, ...s.castle.owned])), rooms: s.castle.rooms || { bedroom: defaultRoom() } }
        : freshCastle(),
    }
  } catch { return freshSave() }
}

/* ════════════════════════ SCORING ════════════════════════ */
function scoreOutfit(equip: Equip, ch: Challenge) {
  let pts = 0
  const dress = BY_ID[equip.dress]
  const hasDress = !!dress && dress.p?.shape !== 'none'
  const outfitCats: Cat[] = hasDress ? ['dress'] : ['top', 'bottom']
  const filled: Cat[] = [...outfitCats, 'hair', 'shoes', 'crown', 'necklace', 'wings', 'cape', 'pet', 'bg']
  let matches = 0
  for (const cat of filled) {
    const it = BY_ID[equip[cat]]
    if (!it || it.p?.style === 'none') continue
    pts += RARITY[it.rarity].pts
    if (it.themes.includes(ch.theme)) { pts += 6; matches++ }
    if (it.p?.sparkle || it.p?.rainbow || it.p?.celest) pts += 1
  }
  // bonuses — the main outfit matters most
  if (hasDress && dress?.themes.includes(ch.theme)) pts += 6
  if (!hasDress) {
    if (BY_ID[equip.top]?.themes.includes(ch.theme)) pts += 3
    if (BY_ID[equip.bottom]?.themes.includes(ch.theme)) pts += 3
  }
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
  const dressItem = BY_ID[equip.dress]
  const dress = dressItem?.p
  const hasDress = !!dress && dress.shape !== 'none'
  const top = BY_ID[equip.top]?.p || TOPS[0].p
  const bottom = BY_ID[equip.bottom]?.p || BOTTOMS[0].p
  const sleeveCol = hasDress ? dress.bodice : top.color
  const sleeveTrim = hasDress ? dress.trim : top.trim
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
        <rect x="135" y="250" width="13" height="140" rx="6.5" fill={skin.base} />
        <rect x="152" y="250" width="13" height="140" rx="6.5" fill={skin.base} />
        {renderShoes(shoes)}
      </g>

      {/* torso skin + base underclothes — the character is never bare */}
      <path d="M128 168 Q150 160 172 168 L168 256 Q150 266 132 256 Z" fill={skin.base} />
      {renderBase()}

      {/* outfit: a full dress, OR a shirt + pants */}
      {hasDress
        ? renderDress(dress)
        : <>{renderBottom(bottom)}{renderTop(top)}</>}

      {/* arms — shoulders → hands resting at the sides */}
      <g>
        <path d="M126 184 Q108 238 116 298" stroke={skin.base} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M174 184 Q192 238 184 298" stroke={skin.base} strokeWidth="13" fill="none" strokeLinecap="round" />
        <circle cx="116" cy="300" r="8" fill={skin.base} />
        <circle cx="184" cy="300" r="8" fill={skin.base} />
        {/* puff sleeves match the outfit */}
        <circle cx="127" cy="186" r="14" fill={sleeveCol} />
        <circle cx="173" cy="186" r="14" fill={sleeveCol} />
        <path d="M122 180 q5 -7 11 0" stroke={sleeveTrim} strokeWidth="2" fill="none" opacity="0.7" />
        <path d="M167 180 q5 -7 11 0" stroke={sleeveTrim} strokeWidth="2" fill="none" opacity="0.7" />
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
  if (p.style === 'sneaker') return <g>
    <ellipse cx="139" cy="392" rx="12" ry="6.5" fill={col} /><ellipse cx="161" cy="392" rx="12" ry="6.5" fill={col} />
    <rect x="128" y="393" width="22" height="3" rx="1.5" fill="#fff" /><rect x="150" y="393" width="22" height="3" rx="1.5" fill="#fff" />
    <circle cx="139" cy="389" r="2" fill="#fff" /><circle cx="161" cy="389" r="2" fill="#fff" />
  </g>
  return <g fill={col}><ellipse cx="139" cy="392" rx="11" ry="6" /><ellipse cx="161" cy="392" rx="11" ry="6" /></g>
}

/* tiny geometry helpers for jewelry/crowns */
function starD(cx: number, cy: number, r: number) {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5
    const rr = i % 2 ? r * 0.45 : r
    d += (i ? 'L' : 'M') + (cx + Math.cos(ang) * rr).toFixed(1) + ' ' + (cy + Math.sin(ang) * rr).toFixed(1) + ' '
  }
  return d + 'Z'
}
function heartD(cx: number, cy: number, r: number) {
  return `M${cx} ${cy + r * 0.85} C${cx - r * 1.3} ${cy - r * 0.2} ${cx - r * 0.5} ${cy - r} ${cx} ${cy - r * 0.35} C${cx + r * 0.5} ${cy - r} ${cx + r * 1.3} ${cy - r * 0.2} ${cx} ${cy + r * 0.85} Z`
}

/* base underclothes — always drawn so the character is never bare */
function renderBase() {
  return (
    <g>
      <path d="M130 170 Q150 162 170 170 L166 232 Q150 240 134 232 Z" fill="#fff3f8" />
      <path d="M133 236 Q150 246 167 236 L165 262 Q150 270 135 262 Z" fill="#fff3f8" />
    </g>
  )
}

/* shirt / top — shown when no dress is worn */
function renderTop(p: any) {
  if (!p) return null
  const { color, trim, style } = p
  const crop = style === 'crop'
  const hemY = crop ? 220 : 256
  return (
    <g>
      <path d={`M126 168 Q150 158 174 168 L${crop ? 168 : 170} ${hemY} Q150 ${hemY + 8} ${crop ? 132 : 130} ${hemY} Z`} fill={color} />
      <path d="M134 168 Q150 178 166 168" stroke={trim} strokeWidth="2.5" fill="none" />
      {style === 'hoodie' && <path d="M132 172 Q150 196 168 172" stroke={trim} strokeWidth="3" fill="none" />}
      {style === 'heart' && <path d={heartD(150, 200, 7)} fill={trim} />}
    </g>
  )
}

/* pants / skirt — shown when no dress is worn */
function renderBottom(p: any) {
  if (!p) return null
  const { color, trim, style } = p
  if (style === 'skirt' || style === 'tutu') {
    const path = style === 'tutu'
      ? 'M122 252 Q72 300 80 322 Q150 342 220 322 Q228 300 178 252 Z'
      : 'M126 252 Q98 308 104 328 Q150 346 196 328 Q202 308 174 252 Z'
    return <g><path d={path} fill={color} />{trim && <path d={path} fill="none" stroke={trim} strokeWidth="2.5" opacity="0.8" />}</g>
  }
  if (style === 'shorts') {
    return <g fill={color}>
      <path d="M131 250 L170 250 L168 286 Q159 292 152 286 L150 268 L148 286 Q141 292 132 286 Z" />
      {trim && <rect x="131" y="250" width="39" height="5" rx="2" fill={trim} />}
    </g>
  }
  // pants / leggings — cover both legs to the ankle
  const w = style === 'leggings' ? 14 : 17
  return <g fill={color}>
    <rect x="130" y="248" width="40" height="26" rx="9" />
    <rect x={141 - w / 2} y="262" width={w} height="126" rx={w / 2} />
    <rect x={159 - w / 2} y="262" width={w} height="126" rx={w / 2} />
    {trim && <rect x="130" y="248" width="40" height="5" rx="2" fill={trim} />}
  </g>
}

function renderDress(p: any) {
  if (!p || p.shape === 'none') return null
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
  if (style === 'bob') return <path d="M104 110 Q96 168 122 182 Q120 152 122 130 L178 130 Q180 152 178 182 Q204 168 196 110 Z" fill={color} />
  if (style === 'straight') return <path d="M104 108 L99 300 Q112 304 120 300 L120 150 L180 150 L180 300 Q188 304 201 300 L196 108 Z" fill={color} />
  if (style === 'space') return <g fill={color}>
    <circle cx="118" cy="76" r="14" /><circle cx="182" cy="76" r="14" />
    <path d="M108 110 Q100 150 116 168 Q120 140 122 120 L178 120 Q180 140 184 168 Q200 150 192 110 Z" />
  </g>
  if (style === 'afro') return <g fill={color}>
    <circle cx="150" cy="104" r="56" /><circle cx="104" cy="120" r="20" /><circle cx="196" cy="120" r="20" />
    <circle cx="118" cy="68" r="20" /><circle cx="182" cy="68" r="20" /><circle cx="150" cy="58" r="20" />
  </g>
  if (style === 'pixie') return <path d="M108 108 Q104 140 118 148 Q120 130 122 116 L178 116 Q180 130 182 148 Q196 140 192 108 Z" fill={color} />
  if (style === 'sidepony') return <g fill={color}>
    <path d="M104 110 Q92 168 108 208 Q120 168 122 140 L178 140 Q182 158 186 174 Q210 150 200 110 Z" />
    <path d="M186 152 Q226 184 220 244 Q234 296 204 326 Q216 258 190 192 Z" />
  </g>
  if (style === 'longcurl') return <g fill={color}>
    <path d="M104 110 Q80 210 104 288 Q120 220 122 150 L178 150 Q180 220 196 288 Q220 210 196 110 Z" />
    <circle cx="102" cy="296" r="12" /><circle cx="198" cy="296" r="12" />
    <circle cx="113" cy="308" r="9" /><circle cx="187" cy="308" r="9" />
  </g>
  if (style === 'hearts') return <g fill={color}>
    <path d={heartD(120, 78, 15)} /><path d={heartD(180, 78, 15)} />
    <path d="M108 110 Q100 150 116 168 Q120 140 122 120 L178 120 Q180 140 184 168 Q200 150 192 110 Z" />
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
      {/* bangs / fringe across the forehead so the face is framed (no big forehead) */}
      <path d="M104 88 C103 104 105 113 111 113 C117 113 120 104 126 106 C132 108 135 114 141 113 C146 112 148 105 150 105 C152 105 154 112 159 113 C165 114 168 107 174 106 C180 104 183 113 189 113 C195 113 197 104 196 88 C170 78 130 78 104 88 Z" fill={color} />
      {/* highlight sweep on the bangs */}
      <path d="M120 86 Q142 74 160 84 Q142 80 126 92 Z" fill={hi} opacity="0.5" />
      {/* side fringe framing the face */}
      <path d="M106 112 Q100 146 110 164 Q120 134 121 108 Z" fill={color} />
      <path d="M194 112 Q200 146 190 164 Q180 134 179 108 Z" fill={color} />
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
  if (style === 'heart') return <g>
    <path d="M120 90 Q150 76 180 90 L176 94 Q150 84 124 94 Z" fill={metal} />
    <path d={heartD(150, 80, 8)} fill={gem} stroke="#fff" strokeWidth="0.6" />
  </g>
  if (style === 'star') return <g>
    <path d="M120 90 Q150 76 180 90 L176 94 Q150 84 124 94 Z" fill={metal} />
    <path d={starD(150, 78, 8)} fill={gem} stroke={metal} strokeWidth="0.8" />
    <path d={starD(131, 86, 4.5)} fill={gem} /><path d={starD(169, 86, 4.5)} fill={gem} />
  </g>
  if (style === 'moon') return <g>
    <path d="M120 90 Q150 76 180 90 L176 94 Q150 84 124 94 Z" fill={metal} />
    <path d="M150 70 a9 9 0 1 0 6 16 a7 7 0 1 1 -6 -16 z" fill={gem} />
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
  if (p.style === 'choker') return <g>
    <path d="M134 170 Q150 178 166 170" stroke={col} strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="150" cy="176" r="2.6" fill="#fff" />
  </g>
  if (p.style === 'heart') return <g>
    <path d="M134 172 Q150 182 166 172" stroke="#d8c89a" strokeWidth="1.5" fill="none" />
    <path d={heartD(150, 184, 5)} fill={col} stroke="#fff" strokeWidth="0.5" />
  </g>
  if (p.style === 'star') return <g>
    <path d="M134 172 Q150 182 166 172" stroke="#d8c89a" strokeWidth="1.5" fill="none" />
    <path d={starD(150, 186, 5)} fill={col} />
  </g>
  if (p.style === 'bow') return <g fill={col}>
    <path d="M150 176 l-11 -5 l0 11 z" /><path d="M150 176 l11 -5 l0 11 z" /><circle cx="150" cy="176" r="3" />
  </g>
  if (p.style === 'flower') return <g>
    <path d="M134 172 Q150 182 166 172" stroke="#d8c89a" strokeWidth="1.5" fill="none" />
    {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={150 + Math.cos(i / 5 * 6.283) * 4} cy={185 + Math.sin(i / 5 * 6.283) * 4} r="3" fill={col} />)}
    <circle cx="150" cy="185" r="2" fill="#fff6c4" />
  </g>
  if (p.style === 'butterfly') return <g>
    <path d="M134 172 Q150 182 166 172" stroke="#d8c89a" strokeWidth="1.5" fill="none" />
    <path d="M150 185 q-7 -6 -8 2 q0 5 8 4 z" fill={col} /><path d="M150 185 q7 -6 8 2 q0 5 -8 4 z" fill={col} />
    <circle cx="150" cy="186" r="1.4" fill="#2a2230" />
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
  // all wings root at the upper back (~y198), just below the shoulders
  if (p.style === 'fairy') return <g opacity="0.8">
    <path d="M138 198 Q60 150 58 200 Q70 240 138 222 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M138 210 Q70 232 80 292 Q112 280 138 240 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M162 198 Q240 150 242 200 Q230 240 162 222 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M162 210 Q230 232 220 292 Q188 280 162 240 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
  </g>
  if (p.style === 'butterfly') return <g opacity="0.82">
    <path d="M140 200 Q40 150 50 215 Q54 278 140 248 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M160 200 Q260 150 250 215 Q246 278 160 248 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <circle cx="78" cy="200" r="8" fill="#fff" opacity="0.6" /><circle cx="222" cy="200" r="8" fill="#fff" opacity="0.6" />
    <circle cx="74" cy="236" r="6" fill="#fff" opacity="0.5" /><circle cx="226" cy="236" r="6" fill="#fff" opacity="0.5" />
  </g>
  if (p.style === 'dragon') return <g opacity="0.92">
    <path d="M140 198 Q72 168 50 208 Q66 208 60 230 Q80 226 78 248 Q98 242 100 262 Q120 252 140 240 Z" fill={col} stroke="#5a1f16" strokeWidth="1.5" />
    <path d="M160 198 Q228 168 250 208 Q234 208 240 230 Q220 226 222 248 Q202 242 200 262 Q180 252 160 240 Z" fill={col} stroke="#5a1f16" strokeWidth="1.5" />
  </g>
  if (p.style === 'crystal') return <g opacity="0.72">
    <path d="M140 200 L68 162 L60 214 L98 252 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d="M160 200 L232 162 L240 214 L202 252 Z" fill={col} stroke="#fff" strokeWidth="1.5" />
  </g>
  if (p.style === 'heart') return <g opacity="0.85">
    <path d={heartD(80, 202, 26)} fill={col} stroke="#fff" strokeWidth="1.5" />
    <path d={heartD(220, 202, 26)} fill={col} stroke="#fff" strokeWidth="1.5" />
  </g>
  // feather (angel)
  return <g opacity="0.9">
    <path d="M140 198 Q56 174 66 268 Q98 250 140 224 Z" fill={col} stroke="#dfe8f0" strokeWidth="1" />
    <path d="M160 198 Q244 174 234 268 Q202 250 160 224 Z" fill={col} stroke="#dfe8f0" strokeWidth="1" />
  </g>
}

function renderCape(p: any) {
  if (!p || p.style === 'none') return null
  const { color, trim, stars, style } = p
  return <g>
    <path d="M120 175 Q60 300 78 400 L150 400 L222 400 Q240 300 180 175 Q150 188 120 175 Z" fill={color} />
    <path d="M120 175 Q60 300 78 400" stroke={trim} strokeWidth="4" fill="none" />
    <path d="M180 175 Q240 300 222 400" stroke={trim} strokeWidth="4" fill="none" />
    {stars && [...Array(8)].map((_, i) => (
      <circle key={i} cx={95 + (i * 23) % 110} cy={250 + (i * 41) % 130} r="2" fill="#fff" opacity="0.9" />
    ))}
    {style === 'fur' && [...Array(7)].map((_, i) => (
      <circle key={i} cx={118 + i * 11} cy={178} r="7" fill="#ffffff" />
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
      {p.style === 'panda' && <g>
        <ellipse cx="0" cy="24" rx="18" ry="15" fill="#fff" />
        <circle cx="0" cy="4" r="13" fill="#fff" />
        <circle cx="-11" cy="-6" r="5" fill="#2a2230" /><circle cx="11" cy="-6" r="5" fill="#2a2230" />
        <ellipse cx="-5" cy="2" rx="4" ry="5" fill="#2a2230" /><ellipse cx="5" cy="2" rx="4" ry="5" fill="#2a2230" />
        <circle cx="-5" cy="3" r="1.6" fill="#fff" /><circle cx="5" cy="3" r="1.6" fill="#fff" />
        <circle cx="0" cy="8" r="2" fill="#2a2230" />
        <ellipse cx="-14" cy="20" rx="5" ry="6" fill="#2a2230" /><ellipse cx="14" cy="20" rx="5" ry="6" fill="#2a2230" />
      </g>}
      {p.style === 'pony' && <g>
        <ellipse cx="0" cy="22" rx="18" ry="13" fill={col} />
        <circle cx="-2" cy="2" r="11" fill={col} />
        <path d="M6 -4 Q20 0 14 16 Q8 4 6 -2 Z" fill={p.mane || '#ff9ec4'} />
        <path d="M-8 -8 l-2 -8 l5 5 z" fill={col} />
        <circle cx="-6" cy="2" r="1.8" fill="#2a2230" /><circle cx="2" cy="2" r="1.8" fill="#2a2230" />
        <ellipse cx="-4" cy="8" rx="5" ry="3" fill="#f0b0c0" />
      </g>}
      {p.style === 'penguin' && <g>
        <ellipse cx="0" cy="20" rx="15" ry="18" fill="#2a2a38" />
        <ellipse cx="0" cy="24" rx="9" ry="13" fill="#fff" />
        <circle cx="0" cy="2" r="11" fill="#2a2a38" />
        <circle cx="-4" cy="0" r="3" fill="#fff" /><circle cx="4" cy="0" r="3" fill="#fff" />
        <circle cx="-4" cy="0" r="1.4" fill="#2a2230" /><circle cx="4" cy="0" r="1.4" fill="#2a2230" />
        <path d="M0 4 l-3 4 l6 0 z" fill="#f0a020" />
        <path d="M-14 22 l-6 6 l6 0 z" fill="#f0a020" /><path d="M14 22 l6 6 l-6 0 z" fill="#f0a020" />
      </g>}
      {p.style === 'hamster' && <g>
        <ellipse cx="0" cy="22" rx="16" ry="14" fill={col} />
        <circle cx="0" cy="6" r="12" fill={col} />
        <circle cx="-9" cy="-3" r="4" fill={col} /><circle cx="9" cy="-3" r="4" fill={col} />
        <ellipse cx="0" cy="22" rx="9" ry="8" fill="#fff" opacity="0.7" />
        <circle cx="-5" cy="4" r="1.8" fill="#2a2230" /><circle cx="5" cy="4" r="1.8" fill="#2a2230" />
        <circle cx="0" cy="9" r="1.6" fill="#f0a0b0" />
        <ellipse cx="-7" cy="9" rx="3" ry="2" fill="#ffc0d0" /><ellipse cx="7" cy="9" rx="3" ry="2" fill="#ffc0d0" />
      </g>}
      {p.style === 'deer' && <g>
        <ellipse cx="0" cy="22" rx="16" ry="13" fill={col} />
        <circle cx="0" cy="4" r="11" fill={col} />
        <path d="M-7 -8 l-3 -12 M-7 -8 l3 -7" stroke="#8a5a32" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M7 -8 l3 -12 M7 -8 l-3 -7" stroke="#8a5a32" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="-10" cy="-1" rx="4" ry="6" fill={col} /><ellipse cx="10" cy="-1" rx="4" ry="6" fill={col} />
        <circle cx="-4" cy="2" r="1.8" fill="#2a2230" /><circle cx="4" cy="2" r="1.8" fill="#2a2230" />
        <circle cx="0" cy="7" r="2" fill="#2a2230" />
        <circle cx="-8" cy="24" r="2" fill="#fff" /><circle cx="6" cy="27" r="2" fill="#fff" />
      </g>}
      {p.style === 'frog' && <g>
        <ellipse cx="0" cy="20" rx="17" ry="14" fill={col} />
        <circle cx="-8" cy="2" r="6" fill={col} /><circle cx="8" cy="2" r="6" fill={col} />
        <circle cx="-8" cy="2" r="3" fill="#fff" /><circle cx="8" cy="2" r="3" fill="#fff" />
        <circle cx="-8" cy="2" r="1.4" fill="#2a2230" /><circle cx="8" cy="2" r="1.4" fill="#2a2230" />
        <path d="M-7 18 q7 6 14 0" stroke="#2a6a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>}
      {p.style === 'chick' && <g>
        <ellipse cx="0" cy="20" rx="14" ry="14" fill={col} />
        <circle cx="0" cy="6" r="11" fill={col} />
        <circle cx="-4" cy="4" r="1.8" fill="#2a2230" /><circle cx="4" cy="4" r="1.8" fill="#2a2230" />
        <path d="M0 8 l-3 3 l6 0 z" fill="#f0a020" />
        <path d="M0 -6 l-2 -5 l4 0 z" fill="#f0a020" />
        <ellipse cx="-13" cy="20" rx="4" ry="6" fill={col} /><ellipse cx="13" cy="20" rx="4" ry="6" fill={col} />
      </g>}
      {p.style === 'koala' && <g>
        <ellipse cx="0" cy="22" rx="15" ry="13" fill="#9aa6b2" />
        <circle cx="0" cy="4" r="12" fill="#9aa6b2" />
        <circle cx="-12" cy="0" r="7" fill="#b8c2cc" /><circle cx="12" cy="0" r="7" fill="#b8c2cc" />
        <circle cx="-4" cy="2" r="1.8" fill="#2a2230" /><circle cx="4" cy="2" r="1.8" fill="#2a2230" />
        <ellipse cx="0" cy="8" rx="4" ry="5" fill="#2a2230" />
      </g>}
      {p.style === 'lamb' && <g>
        <ellipse cx="0" cy="22" rx="17" ry="14" fill="#fff" />
        <circle cx="-12" cy="16" r="6" fill="#fff" /><circle cx="12" cy="16" r="6" fill="#fff" />
        <circle cx="-10" cy="28" r="5" fill="#fff" /><circle cx="10" cy="28" r="5" fill="#fff" />
        <circle cx="0" cy="4" r="10" fill="#3a3038" />
        <circle cx="0" cy="-3" r="6" fill="#fff" />
        <circle cx="-4" cy="4" r="1.6" fill="#fff" /><circle cx="4" cy="4" r="1.6" fill="#fff" />
        <ellipse cx="-10" cy="3" rx="3" ry="4" fill="#3a3038" /><ellipse cx="10" cy="3" rx="3" ry="4" fill="#3a3038" />
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
    if (st === 'butterflies') return <text key={key} x={x} y={y} fontSize="14" className="de-float" style={{ animationDelay: `${d}s` }}>🦋</text>
    if (st === 'music') return <text key={key} x={x} y={y} fontSize="14" className="de-float" style={{ animationDelay: `${d}s` }}>🎵</text>
    if (st === 'rainbow') return <text key={key} x={x} y={y} fontSize="15" className="de-float" style={{ animationDelay: `${d}s` }}>🌈</text>
    if (st === 'fire') return <text key={key} x={x} y={y} fontSize="14" className="de-twinkle" style={{ animationDelay: `${d}s` }}>🔥</text>
    if (st === 'leaves') return <text key={key} x={x} y={y} fontSize="13" className="de-fall" style={{ animationDelay: `${d}s` }}>🍃</text>
    if (st === 'diamonds') return <text key={key} x={x} y={y} fontSize="13" className="de-twinkle" style={{ animationDelay: `${d}s` }}>💎</text>
    if (st === 'fireflies') return <circle key={key} cx={x} cy={y} r={2.5} fill="#fff0a0" className="de-twinkle" style={{ animationDelay: `${d}s` }} />
    return <g key={key} transform={`translate(${x},${y})`} className="de-twinkle" style={{ animationDelay: `${d}s` }}>
      <path d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" fill="#fff" />
    </g>
  })
  return <g pointerEvents="none">{items}{st === 'aura' && <ellipse cx="150" cy="260" rx="120" ry="150" fill="#fff" opacity="0.06" className="de-pulse" />}</g>
}

/* ════════════════════════ CASTLE ROOM RENDER ════════════════════════ */
function renderWallpaper(p: any) {
  const col = p?.color || '#f0d6e8'
  return <g>
    <rect x="0" y="0" width="400" height="210" fill={col} />
    {p?.pattern === 'stripes' && [...Array(10)].map((_, i) => <rect key={i} x={i * 40} y="0" width="20" height="210" fill="#fff" opacity="0.15" />)}
    {p?.pattern === 'dots' && [...Array(24)].map((_, i) => <circle key={i} cx={(i * 43) % 392 + 14} cy={(i * 37) % 190 + 16} r="4" fill="#fff" opacity="0.22" />)}
    {p?.pattern === 'hearts' && [...Array(12)].map((_, i) => <text key={i} x={(i * 71) % 380 + 8} y={(i * 53) % 180 + 34} fontSize="16" opacity="0.2">💗</text>)}
    {p?.pattern === 'stars' && [...Array(18)].map((_, i) => <text key={i} x={(i * 53) % 384 + 6} y={(i * 47) % 184 + 22} fontSize="12" opacity="0.3">⭐</text>)}
  </g>
}
function renderFloor(p: any) {
  const col = p?.color || '#caa06a'
  return <g>
    <rect x="0" y="210" width="400" height="90" fill={col} />
    <rect x="0" y="207" width="400" height="4" fill="#000" opacity="0.12" />
    {p?.pattern === 'wood' && [...Array(9)].map((_, i) => <line key={i} x1={i * 45} y1="211" x2={i * 45} y2="300" stroke="#000" strokeOpacity="0.08" strokeWidth="2" />)}
    {p?.pattern === 'tile' && [...Array(9)].map((_, i) => <line key={i} x1={i * 45} y1="211" x2={i * 45} y2="300" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />)}
    {p?.pattern === 'checker' && [...Array(18)].map((_, i) => <rect key={i} x={(i % 9) * 45} y={211 + Math.floor(i / 9) * 45} width="45" height="45" fill={(i + Math.floor(i / 9)) % 2 ? '#fff' : '#000'} opacity="0.08" />)}
  </g>
}
function renderLight(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.color || '#f0c84a'
  return <g>
    <line x1="200" y1="0" x2="200" y2="30" stroke="#3a2f2a" strokeWidth="3" />
    <ellipse cx="200" cy="40" rx="36" ry="9" fill={col} />
    <circle cx="172" cy="44" r="6" fill={col} /><circle cx="200" cy="48" r="6" fill={col} /><circle cx="228" cy="44" r="6" fill={col} />
    {[172, 200, 228].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 54 : 50} r="3" fill="#fff6c4" />)}
  </g>
}
function renderWindow(p: any) {
  if (!p || p.style === 'none') return null
  const sky = p.style === 'night' ? '#2a2452' : '#bfe6ff'
  const arch = p.style === 'arch'
  return <g>
    <rect x="36" y="48" width="86" height="104" rx={arch ? 40 : 6} fill="#9a7a5a" />
    <rect x="42" y="54" width="74" height="92" rx={arch ? 34 : 4} fill={sky} />
    {p.style === 'night'
      ? <>{<circle cx="98" cy="74" r="9" fill="#fff6d0" />}{[...Array(6)].map((_, i) => <circle key={i} cx={50 + i * 12} cy={66 + (i % 3) * 13} r="1.5" fill="#fff" />)}</>
      : <circle cx="58" cy="74" r="11" fill="#ffe07a" />}
    <line x1="79" y1="54" x2="79" y2="146" stroke="#9a7a5a" strokeWidth="3" /><line x1="42" y1="100" x2="116" y2="100" stroke="#9a7a5a" strokeWidth="3" />
  </g>
}
function renderWallart(p: any) {
  if (!p || p.style === 'none') return null
  if (p.style === 'mirror') return <g><ellipse cx="320" cy="96" rx="32" ry="44" fill="#cfe2f0" stroke={p.color} strokeWidth="5" /><path d="M302 74 q18 -10 36 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" /></g>
  if (p.style === 'clock') return <g><circle cx="320" cy="92" r="30" fill="#fff" stroke={p.color} strokeWidth="4" /><line x1="320" y1="92" x2="320" y2="73" stroke="#3a2f2a" strokeWidth="2.5" /><line x1="320" y1="92" x2="335" y2="92" stroke="#3a2f2a" strokeWidth="2.5" /><circle cx="320" cy="92" r="2.5" fill="#3a2f2a" /></g>
  const inner = p.style === 'landscape' ? '#bfe6c8' : '#f0d0e0'
  return <g>
    <rect x="288" y="58" width="66" height="72" rx="4" fill={p.color} />
    <rect x="294" y="64" width="54" height="60" fill={inner} />
    {p.style === 'landscape'
      ? <><circle cx="312" cy="82" r="8" fill="#ffe07a" /><path d="M294 112 l16 -16 l14 12 l24 -18 v22 h-54 z" fill="#7fae5a" /></>
      : <circle cx="321" cy="92" r="15" fill="#ff9ec4" />}
  </g>
}
function renderRug(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.color || '#e87aa8'
  if (p.style === 'star') return <g opacity="0.92"><ellipse cx="210" cy="256" rx="82" ry="24" fill={col} /><path d={starD(210, 256, 17)} fill="#fff" opacity="0.7" /></g>
  if (p.style === 'heart') return <g opacity="0.92"><ellipse cx="210" cy="256" rx="82" ry="24" fill={col} /><path d={heartD(210, 254, 15)} fill="#fff" opacity="0.7" /></g>
  if (p.style === 'royal') return <g opacity="0.95"><ellipse cx="210" cy="256" rx="92" ry="26" fill={col} /><ellipse cx="210" cy="256" rx="92" ry="26" fill="none" stroke={p.trim || '#f0c860'} strokeWidth="3" /><ellipse cx="210" cy="256" rx="42" ry="11" fill={p.trim || '#f0c860'} opacity="0.5" /></g>
  return <g opacity="0.92"><ellipse cx="210" cy="256" rx="82" ry="24" fill={col} /><ellipse cx="210" cy="256" rx="50" ry="14" fill="#fff" opacity="0.3" /></g>
}
function renderFurniture(p: any) {
  if (!p || p.style === 'none') return null
  const col = p.color || '#f29ac6', col2 = p.color2 || '#e0709a'
  const style = p.style
  if (style === 'bed' || style === 'canopy') return <g>
    {style === 'canopy' && <><rect x="138" y="118" width="8" height="98" fill={col2} /><rect x="268" y="118" width="8" height="98" fill={col2} /><rect x="138" y="118" width="138" height="14" rx="4" fill={col2} /><path d="M138 132 Q207 158 276 132 L276 150 Q207 172 138 150 Z" fill={col} opacity="0.5" /></>}
    <rect x="138" y="158" width="26" height="58" rx="5" fill={col2} />
    <rect x="140" y="190" width="135" height="26" rx="5" fill={col} />
    <rect x="146" y="176" width="128" height="18" rx="7" fill="#fff" />
    <rect x="150" y="168" width="32" height="18" rx="5" fill="#ffe6f2" />
  </g>
  if (style === 'throne') return <g>
    <rect x="172" y="118" width="68" height="98" rx="8" fill={col} />
    <rect x="178" y="148" width="56" height="54" fill={col2} opacity="0.4" />
    <rect x="158" y="190" width="96" height="26" rx="6" fill={col} />
    <rect x="158" y="190" width="9" height="28" fill={col2} /><rect x="245" y="190" width="9" height="28" fill={col2} />
    <circle cx="206" cy="126" r="8" fill={col2} />
  </g>
  if (style === 'sofa') return <g>
    <rect x="140" y="180" width="140" height="36" rx="10" fill={col} />
    <rect x="140" y="158" width="140" height="28" rx="10" fill={col} />
    <rect x="134" y="168" width="18" height="48" rx="8" fill={col2} /><rect x="268" y="168" width="18" height="48" rx="8" fill={col2} />
    <circle cx="182" cy="186" r="9" fill="#fff" opacity="0.4" /><circle cx="238" cy="186" r="9" fill="#fff" opacity="0.4" />
  </g>
  if (style === 'table') return <g>
    <ellipse cx="210" cy="184" rx="62" ry="16" fill={col} />
    <rect x="204" y="184" width="12" height="32" fill={col2} /><ellipse cx="210" cy="214" rx="28" ry="6" fill={col2} />
    <rect x="184" y="174" width="11" height="11" rx="2" fill="#fff" /><rect x="226" y="174" width="11" height="11" rx="2" fill="#ffd6ec" />
    <circle cx="210" cy="176" r="7" fill="#ff9ec4" />
  </g>
  if (style === 'vanity') return <g>
    <rect x="170" y="186" width="80" height="30" rx="4" fill={col} />
    <ellipse cx="210" cy="150" rx="30" ry="38" fill="#cfe2f0" stroke={col2} strokeWidth="5" />
    <rect x="178" y="200" width="64" height="16" fill={col2} opacity="0.4" />
  </g>
  if (style === 'petbed') return <g>
    <ellipse cx="210" cy="208" rx="48" ry="14" fill={col} />
    <ellipse cx="210" cy="202" rx="34" ry="9" fill={col2} />
    <path d="M196 198 a6 6 0 0 1 12 0 a6 6 0 0 1 8 2 q-2 8 -15 8 q-11 0 -11 -7 z" fill="#fff" opacity="0.55" />
  </g>
  // cauldron (magic)
  return <g>
    <ellipse cx="210" cy="214" rx="34" ry="8" fill="#2a2230" />
    <path d="M178 188 q32 30 64 0 q-4 28 -32 28 q-28 0 -32 -28 z" fill={col} />
    <ellipse cx="210" cy="188" rx="34" ry="9" fill={col2} />
    <ellipse cx="210" cy="186" rx="26" ry="6" fill="#8fe0a0" opacity="0.85" />
    {[...Array(3)].map((_, i) => <circle key={i} cx={200 + i * 10} cy={176 - i * 5} r="3" fill="#8fe0a0" opacity="0.6" />)}
  </g>
}
function renderPlant(p: any) {
  if (!p || p.style === 'none') return null
  return <g transform="translate(360 214)">
    <path d="M-11 0 L11 0 L8 -22 L-8 -22 Z" fill="#caa06a" /><rect x="-11" y="-25" width="22" height="6" rx="2" fill="#b08858" />
    {p.style === 'tree' && <><rect x="-3" y="-52" width="6" height="30" fill="#8a5a32" /><circle cx="0" cy="-56" r="19" fill="#6fae5a" /><circle cx="-10" cy="-48" r="11" fill="#7fbe6a" /><circle cx="10" cy="-48" r="11" fill="#7fbe6a" /></>}
    {p.style === 'fern' && [...Array(5)].map((_, i) => <path key={i} d={`M0 -22 Q${-22 + i * 11} -52 ${-18 + i * 9} -56`} stroke="#5fae6a" strokeWidth="3" fill="none" />)}
    {p.style === 'rose' && <><path d="M0 -22 L0 -46" stroke="#5fae6a" strokeWidth="3" /><circle cx="0" cy="-50" r="9" fill="#e8557a" /><circle cx="-12" cy="-42" r="7" fill="#ff9ec4" /><circle cx="12" cy="-42" r="7" fill="#ff9ec4" /></>}
    {p.style === 'tulips' && [0, 1, 2].map(i => <g key={i}><path d={`M${-12 + i * 12} -22 L${-12 + i * 12} -44`} stroke="#5fae6a" strokeWidth="2.5" /><ellipse cx={-12 + i * 12} cy={-48} rx="5" ry="8" fill={['#ff9ec4', '#ffd36a', '#ff7ab0'][i]} /></g>)}
  </g>
}
function RoomScene({ room, size = 460 }: { room: Room; size?: number }) {
  const g = (s: DecorSlot) => DECOR_BY_ID[room[s]]?.p
  return (
    <svg viewBox="0 0 400 300" width={size} style={{ maxWidth: '100%', height: 'auto', borderRadius: 14, display: 'block' }}>
      {renderWallpaper(g('wallpaper'))}
      {renderFloor(g('floor'))}
      {renderWindow(g('window'))}
      {renderWallart(g('wallart'))}
      {renderLight(g('light'))}
      {renderRug(g('rug'))}
      {renderFurniture(g('furniture'))}
      {renderPlant(g('plant'))}
    </svg>
  )
}
function DecorThumb({ item }: { item: Decor }) {
  return (
    <svg viewBox="0 0 400 300" width="62" height="46" style={{ borderRadius: 6, display: 'block' }}>
      {renderWallpaper(item.slot === 'wallpaper' ? item.p : { color: '#efe6f0' })}
      {renderFloor(item.slot === 'floor' ? item.p : { color: '#e0d2c4' })}
      {item.slot === 'window' && renderWindow(item.p)}
      {item.slot === 'wallart' && renderWallart(item.p)}
      {item.slot === 'light' && renderLight(item.p)}
      {item.slot === 'rug' && renderRug(item.p)}
      {item.slot === 'furniture' && renderFurniture(item.p)}
      {item.slot === 'plant' && renderPlant(item.p)}
    </svg>
  )
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
type Screen = 'loading' | 'home' | 'dressing' | 'result' | 'challenges' | 'shop' | 'daily' | 'minigame' | 'castle'

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

  // place an already-owned decor item into a room slot
  const placeDecor = useCallback((roomId: string, slot: DecorSlot, decorId: string) => {
    setSave(s => s ? {
      ...s,
      castle: {
        ...s.castle,
        rooms: { ...s.castle.rooms, [roomId]: { ...defaultRoom(), ...(s.castle.rooms[roomId] || {}), [slot]: decorId } },
      },
    } : s)
  }, [])

  // buy a decor item, place it, and earn decorating XP
  const buyDecor = useCallback((dec: Decor, roomId: string, slot: DecorSlot) => {
    setSave(s => {
      if (!s) return s
      if (s.castle.owned.includes(dec.id)) return s
      if (dec.gem) { if (s.gems < dec.price) { showToast('Not enough gems 💎'); return s } }
      else if (s.coins < dec.price) { showToast('Not enough coins 🪙'); return s }
      showToast(`Unlocked ${dec.name}! +8 XP ✨`)
      const room = { ...defaultRoom(), ...(s.castle.rooms[roomId] || {}), [slot]: dec.id }
      return {
        ...s,
        coins: dec.gem ? s.coins : s.coins - dec.price,
        gems: dec.gem ? s.gems - dec.price : s.gems,
        xp: s.xp + 8,
        castle: { owned: [...s.castle.owned, dec.id], rooms: { ...s.castle.rooms, [roomId]: room } },
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
        <h1 style={{ fontSize: 16, color: '#b23a7a', textShadow: '0 2px 0 #fff', margin: 0 }}>👑 Empress Dress Up</h1>
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
            onCastle={() => setScreen('castle')}
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

        {screen === 'castle' && (
          <CastleScreen
            save={save} level={level}
            onBuy={buyDecor} onPlace={placeDecor}
            onBack={() => setScreen('home')}
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
function HomeScreen({ equip, level, canClaim, onPlay, onCloset, onShop, onDaily, onMini, onCastle, name, onRename }: any) {
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
        <button style={btn} onClick={onCastle}>🏰 My Castle</button>
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
  if (item.cat === 'top' || item.cat === 'bottom') mini.dress = 'dr_none'   // reveal the shirt/pants
  else if (item.cat !== 'dress') mini.dress = 'dr_start'
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

/* ───────── CASTLE DECORATING ───────── */
function CastleScreen({ save, level, onBuy, onPlace, onBack, showToast }: any) {
  const [roomId, setRoomId] = useState('bedroom')
  const [slot, setSlot] = useState<DecorSlot>('furniture')
  const room: Room = { ...defaultRoom(), ...(save.castle.rooms[roomId] || {}) }
  const items = DECOR.filter((x: Decor) => x.slot === slot)
  const roomMeta = ROOMS.find(r => r.id === roomId)!
  return (
    <div className="de-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button style={pill as any} onClick={onBack}>← Home</button>
        <h2 style={{ fontSize: 15, color: '#b23a7a', margin: 0 }}>🏰 {roomMeta.icon} {roomMeta.name}</h2>
        <span style={{ width: 50 }} />
      </div>

      {/* room tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
        {ROOMS.map(r => {
          const locked = level < r.lvl
          return (
            <button key={r.id} disabled={locked} onClick={() => setRoomId(r.id)}
              style={{
                ...pill, padding: '6px 10px', fontSize: 11, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1,
                background: roomId === r.id ? 'linear-gradient(135deg,#ffd6ec,#ffb0d6)' : '#fff',
                border: roomId === r.id ? '2px solid #ff8fc0' : '2px solid #ffe0ef',
              }}>
              {r.icon} {r.name}{locked ? ` 🔒${r.lvl}` : ''}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* room preview */}
        <div style={{ flexShrink: 0 }}>
          <RoomScene room={room} size={460} />
          <p style={{ textAlign: 'center', fontSize: 10, color: '#a06a90', marginTop: 6 }}>Decorate to earn XP! Tap an item to place it. ✨</p>
        </div>

        {/* decor drawer */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 480 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {DECOR_SLOTS.map(si => (
              <button key={si.slot} onClick={() => setSlot(si.slot)}
                style={{
                  ...pill, padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                  background: slot === si.slot ? 'linear-gradient(135deg,#ffd6ec,#ffb0d6)' : '#fff',
                  border: slot === si.slot ? '2px solid #ff8fc0' : '2px solid #ffe0ef',
                }}>
                {si.icon} {si.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {items.map((it: Decor) => {
              const owned = save.castle.owned.includes(it.id)
              const placed = room[slot] === it.id
              const tooHigh = (it.lvl || 0) > level && !owned
              return (
                <button key={it.id}
                  onClick={() => owned ? onPlace(roomId, slot, it.id) : (tooHigh ? showToast(`Unlocks at Lv ${it.lvl}`) : onBuy(it, roomId, slot))}
                  style={{
                    border: placed ? '3px solid #ff8fc0' : `2px solid ${RARITY[it.rarity].color}55`,
                    borderRadius: 12, padding: 6, cursor: 'pointer', background: placed ? '#fff0f7' : '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', opacity: tooHigh ? 0.6 : 1,
                  }}>
                  <DecorThumb item={it} />
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: '#7a4a6a', textAlign: 'center', lineHeight: 1.1 }}>{it.name}</div>
                  {!owned && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: tooHigh ? '#b07a9a' : '#a06a30' }}>
                      {tooHigh ? `🔒 Lv${it.lvl}` : <>{it.gem ? '💎' : '🪙'}{it.price}</>}
                    </div>
                  )}
                  {placed && <div style={{ position: 'absolute', top: -6, right: -6, fontSize: 14 }}>✅</div>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
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
