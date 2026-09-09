import { Link } from 'react-router-dom'
import { MessageSquare, ThumbsUp } from 'lucide-react'
import PostTypeBadge from '@/community/component/PostTypeBadge'
import { postPath } from '@/config/routes'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import type { PostSummary } from '@/community/types'

export default function RecentPosts({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return (
    <div className="state-msg">
      <p>게시글 없음</p>
      <p className="state-msg-detail">커뮤니티 탭에서 첫 글을 남겨보세요</p>
    </div>
  )

  return (
    <ul className="overview-list">
      {posts.map((post) => (
        <li key={post.id}>
          {/* The whole row is the link, not just the title: every figure on it
              describes the one post, so a reader aiming at the comment count
              still means "open this". */}
          <Link className="overview-list-row overview-list-link" to={postPath(post.id)}>
            <PostTypeBadge postType={post.post_type} />
            <div className="overview-list-main">
              <span className="overview-list-title">{post.title}</span>
              <span className="overview-list-sub">{post.author} · {formatTimeAgo(post.created_at)}</span>
            </div>
            <span className="overview-list-meta">
              <span><ThumbsUp size={11} aria-hidden="true" />{post.thumbs_up}</span>
              <span><MessageSquare size={11} aria-hidden="true" />{post.comment_count}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
