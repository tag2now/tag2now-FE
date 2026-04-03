import { useState } from 'react'
import { relativeTime } from '@/shared/util/timeFormat'
import { thumbPost, createComment, deletePost } from '@/community/communityApi'
import PostTypeBadge from './PostTypeBadge'
import CommentTree from './CommentTree'
import type { LeaderboardEntry } from "@/shared/types";
import type { PostDetail } from '@/community/types'
import AuthorBadge from './AuthorBadge'

interface PostDetailProps {
  post: PostDetail
  username: string | null
  onBack: () => void
  onRefresh: () => void
  ensureIdentity: () => Promise<string>
  onDeleted: () => void
  leaderboardEntries?: LeaderboardEntry[]
}

export default function PostDetail({ post, username, onBack, onRefresh, ensureIdentity, onDeleted, leaderboardEntries }: PostDetailProps) {
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [thumbing, setThumbing] = useState(false)

  const handleThumb = async (direction: 'up' | 'down') => {
    if (thumbing) return
    setThumbing(true)
    await ensureIdentity()
    await thumbPost(post.id, direction)
    onRefresh()
    setThumbing(false)
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    await ensureIdentity()
    await createComment(post.id, commentText.trim())
    setCommentText('')
    onRefresh()
    setSubmitting(false)
  }

  const handleReply = async (parentId: number, body: string) => {
    await ensureIdentity()
    await createComment(post.id, body, parentId)
    onRefresh()
  }

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return
    try {
      await ensureIdentity()
      await deletePost(post.id)
      onDeleted()
    } catch (_) {}
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 bg-transparent border-0 text-primary text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:text-white"
      >
        &larr; 목록
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <PostTypeBadge postType={post.post_type} size="md" />
          <span className="text-sm text-txt-dim">{relativeTime(post.created_at)}</span>
          {username && post.author === username && (
            <button
              onClick={handleDelete}
              className="btn-danger ml-auto uppercase tracking-[0.12em]"
            >
              삭제
            </button>
          )}
        </div>
        <AuthorBadge name={post.author} entries={leaderboardEntries} className="text-sm mb-2" />
        <h2 className="m-0 mb-2 text-md font-bold text-txt wrap-break-word">{post.title}</h2>
        <p className="m-0 text-base text-txt whitespace-pre-wrap wrap-break-word">{post.body}</p>
      </div>

      <div className="flex gap-2 mb-4 pb-4 border-b border-border-light">
        <button
          onClick={() => handleThumb('up')}
          disabled={thumbing}
          aria-label={`추천 ${post.thumbs_up}`}
          className="btn-ghost flex items-center gap-1 disabled:opacity-50"
        >
          <span aria-hidden="true">&#9650;</span> {post.thumbs_up}
        </button>
        <button
          onClick={() => handleThumb('down')}
          disabled={thumbing}
          aria-label={`비추천 ${post.thumbs_down}`}
          className="flex items-center gap-1 bg-transparent border border-border-light text-txt-dim px-3 py-1 rounded cursor-pointer text-sm font-bold hover:border-error hover:text-error disabled:opacity-50"
        >
          <span aria-hidden="true">&#9660;</span> {post.thumbs_down}
        </button>
      </div>

      <h3 className="m-0 mb-3 text-sm font-bold uppercase tracking-[0.12em] text-txt-dim">
        댓글 ({post.comments.length})
      </h3>

      {post.comments.length > 0 && (
        <CommentTree comments={post.comments} onReply={handleReply} leaderboardEntries={leaderboardEntries} />
      )}

      <div className="mt-4 flex gap-2">
        <label htmlFor="comment-input" className="sr-only">댓글 입력</label>
        <input
          id="comment-input"
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          aria-label="댓글 입력"
          className="input-base flex-1 px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
        />
        <button
          onClick={handleComment}
          disabled={submitting || !commentText.trim()}
          className="btn-primary"
        >
          {submitting ? '...' : '작성'}
        </button>
      </div>
    </div>
  )
}
