'use client'
import type { PageBlock, BlockLiveData } from '@/types/builder'
import BlockRenderer from './builder/BlockRenderer'

interface Props extends BlockLiveData {
  blocks: PageBlock[]
}

export default function HomepageBlockRenderer({ blocks, ...liveData }: Props) {
  // Hero blocks are rendered by page.tsx (alongside AccountShield), not here
  const renderBlocks = blocks.filter(b => b.type !== 'hero')
  if (!renderBlocks.length) return null

  return (
    <div
      className="content-grid"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
    >
      {renderBlocks.map(block => (
        <div
          key={block.id}
          style={{
            gridColumn: block.colSpan === 3 ? '1 / -1' : `span ${block.colSpan}`,
            overflow: 'visible',
          }}
        >
          <BlockRenderer block={block} liveData={liveData} isEditing={false} />
        </div>
      ))}
    </div>
  )
}
