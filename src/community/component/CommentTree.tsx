import { useState } from 'react'
import { formatTimeAgo } from "@/shared/util/timeFormat";
import AuthorBadge from './AuthorBadge'
import LinkifiedText from './LinkifiedText'
import type { LeaderboardEntry} from "@/shared/types";
import type {CommentOut} from "@/community/types";
import { isAuthorOrAdmin, type AuthUser } from '@/auth/types'
import { CornerDownRight, Send, Trash2 } from 'lucide-react'

interface CommentTreeProps {
  comments: CommentOut[]
  user: AuthUser | null
  onReply: (parentId: number, body: string) => Promise<void>
  onDelete: (comment: CommentOut) => Promise<void>
  depth?: number
  leaderboardEntries?: LeaderboardEntry[]
}

type CommentNodeProps = Omit<CommentTreeProps, 'comments' | 'depth'> & {
  comment: CommentOut
  depth: number
}

function CommentNode({ comment, user, onReply, onDelete, depth, leaderboardEntries }: CommentNodeProps) {
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
    <div className={`comment-node ${visualDepth > 0 ? 'ml-3 sm:ml-5' : ''}`}>
      <div className="flex items-center gap-2 text-sm text-txt-dim mb-1">
        <AuthorBadge name={comment.author} entries={leaderboardEntries} className="inline-flex" />
        <span>{formatTimeAgo(comment.created_at)}</span>
        {!comment.deleted && isAuthorOrAdmin(comment.author, user) && (
          <button
            type="button"
            onClick={() => onDelete(comment)}
            aria-label={`${comment.author}님의 댓글 삭제`}
            className="ml-auto inline-flex items-center gap-0.5 bg-transparent border-0 text-primary-text text-xs font-bold cursor-pointer hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Trash2 size={11} aria-hidden="true" /> 삭제
          </button>
        )}
      </div>
      {comment.deleted
        ? <p className="m-0 text-base text-txt-faint italic">삭제된 댓글입니다.</p>
        : <LinkifiedText text={comment.body} className="m-0 text-base text-txt whitespace-pre-wrap break-words" />}
      {!comment.deleted && <button
        onClick={() => setReplying(!replying)}
        className="mt-1 bg-transparent border-0 text-txt-dim text-xs font-bold uppercase tracking-[0.12em] cursor-pointer hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <CornerDownRight size={12} aria-hidden="true" /> {replying ? '취소' : '답글'}
      </button>}

      {replying && (
        <div className="mt-2 flex gap-2">
          <label htmlFor={`reply-${comment.id}`} className="sr-only">답글 입력</label>
          <input
            id={`reply-${comment.id}`}
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글을 입력하세요..."
            aria-label="답글 입력"
            className="input-base flex-1 px-2 py-1 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
          />
          <button
            onClick={handleSubmitReply}
            disabled={submitting || !replyText.trim()}
            className="btn-primary px-3 py-1"
          >
            {!submitting && <Send size={13} aria-hidden="true" />}{submitting ? '작성 중' : '작성'}
          </button>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <CommentTree comments={comment.replies} user={user} onReply={onReply} onDelete={onDelete} depth={depth + 1} leaderboardEntries={leaderboardEntries} />
      )}
    </div>
  )
}

export default function CommentTree({ comments, depth = 0, ...rest }: CommentTreeProps) {
  return (
    <ul role="list" className="list-none p-0 m-0">
      {comments.map((c) => (
        <li key={c.id}>
          <CommentNode comment={c} depth={depth} {...rest} />
        </li>
      ))}
    </ul>
  )
}
