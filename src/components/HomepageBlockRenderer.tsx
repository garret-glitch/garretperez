'use client'
import type { PageBlock, BlockLiveData } from '@/types/builder'
import BlockRenderer from './builder/BlockRenderer'

interface Props extends BlockLiveData {
  blocks: PageBlock[]
}

export default function HomepageBlockRenderer({ blocks, ...liveData }: Props) {
  if (!blocks.length) return null

  return (
    <div
      className="content-grid"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
    >
      {blocks.map(block => (
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
