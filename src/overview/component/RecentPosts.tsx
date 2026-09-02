import { MessageSquare, ThumbsUp } from 'lucide-react'
import PostTypeBadge from '@/community/component/PostTypeBadge'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import type { PostSummary } from '@/community/types'

export default function RecentPosts({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <p className="state-msg">게시글 없음</p>

  return (
    <ul className="overview-list">
      {posts.map((post) => (
        <li key={post.id} className="overview-list-row">
          <PostTypeBadge postType={post.post_type} />
          <div className="overview-list-main">
            <span className="overview-list-title">{post.title}</span>
            <span className="overview-list-sub">{post.author} · {formatTimeAgo(post.created_at)}</span>
          </div>
          <span className="overview-list-meta">
            <span><ThumbsUp size={11} aria-hidden="true" />{post.thumbs_up}</span>
            <span><MessageSquare size={11} aria-hidden="true" />{post.comment_count}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
