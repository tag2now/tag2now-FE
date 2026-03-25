import { useState } from 'react'
import { relativeTime } from '@/shared/timeFormat'
import type { CommentOut, LeaderboardEntry } from '@/types'
import AuthorBadge from './AuthorBadge'

interface CommentTreeProps {
  comments: CommentOut[]
  onReply: (parentId: number, body: string) => Promise<void>
  depth?: number
  leaderboardEntries?: LeaderboardEntry[]
}

interface CommentNodeProps {
  comment: CommentOut
  onReply: (parentId: number, body: string) => Promise<void>
  depth: number
  leaderboardEntries?: LeaderboardEntry[]
}

function CommentNode({ comment, onReply, depth, leaderboardEntries }: CommentNodeProps) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      await onReply(comment.id, replyText.trim())
      setReplyText('')
      setReplying(false)
    } finally {
      setSubmitting(false)
    }
  }

  const visualDepth = Math.min(depth, 3)

  return (
    <div className={`${visualDepth > 0 ? 'ml-3 sm:ml-5' : ''} border-l border-border-light pl-3 py-2`}>
      <div className="flex items-center gap-2 text-sm text-txt-dim mb-1">
        <AuthorBadge name={comment.author} entries={leaderboardEntries} />
        <span>{relativeTime(comment.created_at)}</span>
      </div>
      <p className="m-0 text-base text-txt whitespace-pre-wrap break-words">{comment.body}</p>
      <button
        onClick={() => setReplying(!replying)}
        className="mt-1 bg-transparent border-0 text-txt-dim text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-primary"
      >
        {replying ? '취소' : '답글'}
      </button>

      {replying && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글을 입력하세요..."
            className="flex-1 bg-bg-row border border-border-light rounded px-2 py-1 text-sm text-txt font-sans outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
          />
          <button
            onClick={handleSubmitReply}
            disabled={submitting || !replyText.trim()}
            className="px-3 py-1 bg-primary text-white text-sm font-bold border-0 rounded cursor-pointer disabled:opacity-50"
          >
            {submitting ? '...' : '작성'}
          </button>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <CommentTree comments={comment.replies} onReply={onReply} depth={depth + 1} leaderboardEntries={leaderboardEntries} />
      )}
    </div>
  )
}

export default function CommentTree({ comments, onReply, depth = 0, leaderboardEntries }: CommentTreeProps) {
  return (
    <div>
      {comments.map((c) => (
        <CommentNode key={c.id} comment={c} onReply={onReply} depth={depth} leaderboardEntries={leaderboardEntries} />
      ))}
    </div>
  )
}
