import { useState } from 'react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import YouTubeVideo from './YouTubeVideo'
import CreatePostForm from './CreatePostForm'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import { thumbPost, createComment, deletePost, updatePost, type PostInput } from '@/community/communityApi'
import PostTypeBadge from './PostTypeBadge'
import CommentTree from './CommentTree'
import type { LeaderboardEntry } from "@/shared/types";
import type { PostDetail } from '@/community/types'
import AuthorBadge from './AuthorBadge'
import { ArrowLeft, FilePenLine, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'

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
  const [editing, setEditing] = useState(false)
  const { confirm, ...confirmDialog } = useConfirm()

  const handleUpdate = async (input: PostInput) => {
    await ensureIdentity()
    await updatePost(post.id, input)
    setEditing(false)
    onRefresh()
  }

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
    const agreed = await confirm({
      title: '게시글을 삭제할까요?',
      body: '삭제한 글과 댓글은 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
    })
    if (!agreed) return
    // Rejections reach the global unhandledrejection handler, which toasts the
    // reason. Swallowing them here left a failed delete looking like nothing
    // had happened at all.
    await ensureIdentity()
    await deletePost(post.id)
    onDeleted()
  }

  if (editing) return <CreatePostForm initialPost={post} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />

  return (
    <article className="post-detail">
      {confirmDialog.request && <ConfirmDialog {...confirmDialog} request={confirmDialog.request} />}
      <button
        onClick={onBack}
        className="mb-4 inline-flex min-h-8 items-center gap-1.5 bg-transparent border-0 text-primary-text text-xs font-bold cursor-pointer hover:text-txt"
      >
        <ArrowLeft size={14} aria-hidden="true" /> 목록
      </button>

      {/* One line: what the post is and what it says on the left, who wrote it
          and when on the right.
          It used to stack three rows - tags+time, author, title - so the
          heading of the page was its third line, the two images sat at the
          same left edge in the same size with nothing saying which belonged
          to the post and which to the person, and the timestamp was grouped
          with the tags, where it describes nothing.
          The title wraps rather than truncating: this is the post's own page
          and its heading is not something to put an ellipsis on. */}
      <header className="post-detail-header">
        <div className="post-detail-head-main">
          <PostTypeBadge postType={post.post_type} characters={post.characters ?? []} size="md" />
          <h2>{post.title}</h2>
        </div>
        <div className="post-detail-head-side">
          <div className="post-detail-byline">
            <AuthorBadge name={post.author} entries={leaderboardEntries} className="author-badge-lg inline-flex" />
            <span className="post-detail-time">{formatTimeAgo(post.created_at)}</span>
          </div>
          {username && post.author === username && (
            <div className="post-detail-owner-actions">
              <button onClick={() => setEditing(true)} className="btn-ghost inline-flex items-center gap-1">
                <FilePenLine size={13} aria-hidden="true" /> 수정
              </button>
              <button onClick={handleDelete} className="btn-danger uppercase tracking-[0.12em]">
                <Trash2 size={13} aria-hidden="true" /> 삭제
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="post-detail-body"><p>{post.body}</p></div>
      {post.youtube_video_id && <YouTubeVideo videoId={post.youtube_video_id} />}

      <div className="flex gap-2 mb-4 pb-4 border-b border-border-light">
        <button
          onClick={() => handleThumb('up')}
          disabled={thumbing}
          aria-label={`추천 ${post.thumbs_up}`}
          className="btn-ghost flex items-center gap-1 disabled:opacity-50"
        >
          <ThumbsUp size={14} aria-hidden="true" /> {post.thumbs_up}
        </button>
        <button
          onClick={() => handleThumb('down')}
          disabled={thumbing}
          aria-label={`비추천 ${post.thumbs_down}`}
          className="flex items-center gap-1 bg-transparent border border-border-light text-txt-dim px-3 py-1 rounded cursor-pointer text-sm font-bold hover:border-error hover:text-error disabled:opacity-50"
        >
          <ThumbsDown size={14} aria-hidden="true" /> {post.thumbs_down}
        </button>
      </div>

      <h3 className="comment-heading">
        댓글 ({post.comments.length})
      </h3>

      {post.comments.length > 0 && (
        <CommentTree comments={post.comments} onReply={handleReply} leaderboardEntries={leaderboardEntries} />
      )}

      <div className="comment-composer">
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
          {!submitting && <Send size={14} aria-hidden="true" />}{submitting ? '작성 중' : '작성'}
        </button>
      </div>
    </article>
  )
}
