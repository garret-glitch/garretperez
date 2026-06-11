import { prisma } from '@/lib/prisma'
import { getDefaultStyles } from '@/lib/block-defaults'
import type { BlockType, AnyBlockConfig, BlockStyles } from '@/types/builder'

interface OldSectionConfig {
  id: string; heading: string; icon: string
  headingPx: number; bodyPx: number
  padding: string; minHeight: number; visible: boolean
}

const OLD_TO_NEW: Record<string, { type: BlockType; colSpan: 1 | 2 | 3; order: number }> = {
  about:    { type: 'about',          colSpan: 2, order: 0 },
  projects: { type: 'projects-list',  colSpan: 1, order: 1 },
  feed:     { type: 'community-feed', colSpan: 1, order: 2 },
  xp:       { type: 'xp-guide',       colSpan: 1, order: 3 },
}

const PADDING_TO_PX: Record<string, number> = {
  compact: 10, normal: 20, spacious: 32, tall: 20,
}

export async function migrateExistingSections(): Promise<number> {
  const settings = await (prisma as any).siteSetting.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value

  let sections: OldSectionConfig[] = []
  let order: string[] = ['about', 'projects', 'feed', 'xp']
  const bio1 = map.bio_1 ?? ''
  const bio2 = map.bio_2 ?? ''
  const bio3 = map.bio_3 ?? ''

  try { if (map.layout_sections) sections = JSON.parse(map.layout_sections) } catch { /* skip */ }
  try { if (map.layout_order) order = JSON.parse(map.layout_order) } catch { /* skip */ }

  const secMap: Record<string, OldSectionConfig> = {}
  for (const s of sections) secMap[s.id] = s

  const creates = order
    .filter(id => OLD_TO_NEW[id])
    .map((id, idx) => {
      const old = secMap[id]
      const meta = OLD_TO_NEW[id]
      const padPx = old ? PADDING_TO_PX[old.padding] ?? 20 : 20

      const styles: BlockStyles = {
        ...getDefaultStyles(meta.type),
        headingPx: old?.headingPx,
        bodyPx: old?.bodyPx,
        paddingTop: padPx,
        paddingBottom: padPx,
        minHeight: old?.minHeight || undefined,
      }

      let config: AnyBlockConfig
      if (meta.type === 'about') {
        config = {
          headingText: old?.heading ?? 'About Me',
          headingIcon: old?.icon ?? '📜',
          bubbles: [
            { id: 'b0', content: bio1 || 'Sales professional based in Houston, TX.' },
            { id: 'b1', content: bio2 || 'Builder, gardener, fisherman, and father.' },
            { id: 'b2', content: bio3 || 'This site is my personal hub.' },
          ],
        }
      } else if (meta.type === 'projects-list') {
        config = { heading: old?.heading ?? 'My Projects', icon: old?.icon ?? '⚒️', maxItems: 3, showViewAll: true }
      } else if (meta.type === 'community-feed') {
        config = { heading: old?.heading ?? 'Community Feed', icon: old?.icon ?? '💬', maxItems: 8 }
      } else {
        config = { heading: old?.heading ?? 'How to Earn XP', icon: old?.icon ?? '⚡' }
      }

      return {
        pageSlug: 'home',
        type: meta.type,
        order: idx,
        colSpan: meta.colSpan,
        colStart: 1,
        visible: old ? old.visible : true,
        config: JSON.stringify(config),
        styles: JSON.stringify(styles),
      }
    })

  if (!creates.length) return 0

  await (prisma as any).pageBlock.createMany({ data: creates })
  return creates.length
}
