import Link from 'next/link'
import type { PageBlock, CommunityFeedBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'
import { getSkillByEnum } from '@/lib/skills'

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

interface Props { block: PageBlock; isEditing: boolean; liveData: BlockLiveData }

export default function CommunityFeedBlock({ block, isEditing, liveData }: Props) {
  const cfg = block.config as CommunityFeedBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 12
  const posts = (liveData.recentPosts ?? []).slice(0, 2)

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={{ ...style, overflow: 'hidden' }}>
        <h2 className="mb-4 flex items-center gap-2 min-w-0" style={{ fontSize: hPx, color: '#3a1e06' }}>
          <span className="shrink-0">{cfg.icon}</span>
          <span className="truncate">{cfg.heading}</span>
          <span className="ml-auto shrink-0 hidden sm:inline text-[6px]" style={{ color: '#8a6030' }}>All Communities</span>
        </h2>
        {posts.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-[8px] mb-4" style={{ color: '#5a3818' }}>The community feed is empty.</p>
            {!liveData.hasSession && (
              <div className="flex justify-center gap-2">
                <Link href="/register" className="osrs-btn text-[7px]">Join &amp; Post</Link>
                <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const skill = getSkillByEnum(post.skill)
              return (
                <Link key={post.id} href={isEditing ? '#' : (skill?.href ?? '/')} className="block post-card">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold"
                      style={{ background: 'rgba(180,120,40,0.2)', border: '1px solid #a07840', color: '#6a3808' }}>
                      {post.user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[7px] font-bold" style={{ color: '#2a1006' }}>{post.user.username}</span>
                        <span className="text-[6px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(180,120,40,0.2)', color: '#5a3818', border: '1px solid #a07840' }}>
                          {skill?.icon} {skill?.label}
                        </span>
                        <span className="text-[5.5px] ml-auto" style={{ color: '#8a6030' }}>{timeAgo(post.createdAt)}</span>
                      </div>
                      <div className="text-[8px] font-bold mb-1 truncate" style={{ color: '#2a1006' }}>{post.title}</div>
                      <p className="body-text mb-2 line-clamp-2" style={{ fontSize: bPx, color: '#3a2810' }}>{post.body}</p>
                      <div className="flex items-center gap-3">
                        {post.upvotes.length > 0 && <span className="text-[6px]" style={{ color: '#6a3808' }}>▲ {post.upvotes.length}</span>}
                        {post.replies.length > 0 && <span className="text-[6px]" style={{ color: '#8a6030' }}>💬 {post.replies.length}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <div className="scroll-roll" />
    </>
  )
}
