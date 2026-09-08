import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import { createComment, deleteComment, fetchComments, isCommentAuthor, type ApiComment } from '@/reservation/reservationApi'

const MAX_BODY = 500

type Props = {
  reservationId: number
  username: string | null
  onError: (error: unknown, fallback: string) => void
}

/** The comment thread on one reservation.
 *
 * It owns its own fetching rather than riding the tab's 10s poll: comments are
 * written in bursts while the listing changes slowly, and reloading the whole
 * reservation list to pick up one new line would be the wrong trade.
 */
export default function CommentList({ reservationId, username, onError }: Props) {
  const [comments, setComments] = useState<ApiComment[]>([])
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setComments(await fetchComments(reservationId))
    } catch (error) {
      onError(error, '댓글을 불러오지 못했습니다.')
    }
  }, [reservationId, onError])

  useEffect(() => {
    setDraft('')
    refresh().then()
  }, [refresh])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !username) return
    setSubmitting(true)
    try {
      await createComment(reservationId, username, body)
      setDraft('')
      await refresh()
    } catch (error) {
      onError(error, '댓글을 등록하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (commentId: number) => {
    try {
      await deleteComment(reservationId, commentId)
      await refresh()
    } catch (error) {
      onError(error, '댓글을 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="mt-4 border-t border-border pt-4" aria-label="예약 댓글">
      <h3 className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-txt-dim">
        <MessageSquare size={13} aria-hidden="true" />
        댓글 {comments.length}
      </h3>

      <ul className="mt-2 space-y-1.5">
        {comments.map((comment) => (
          <li key={comment.id} className="border border-border bg-bg-row px-3 py-1.5 text-sm">
            {/* Delete rides the byline rather than taking a line of its own:
                these are one- and two-line notes, and a third row per card
                turned the thread into mostly chrome. */}
            <div className="flex items-baseline justify-between gap-2">
              <strong className="truncate text-txt">{comment.author}</strong>
              <span className="flex shrink-0 items-baseline gap-2 text-[11px]">
                <span className="text-txt-faint">{formatTimeAgo(comment.created_at)}</span>
                {isCommentAuthor(comment.id) && (
                  <button
                    type="button"
                    aria-label={`${comment.author}님의 댓글 삭제`}
                    // Red rather than the --color-error orange the reservation's
                    // own delete button uses: at 11px on the byline it has to
                    // read as destructive at a glance, and primary-text is the
                    // brand red tuned to clear 4.5:1 as text.
                    className="flex items-center gap-0.5 font-bold text-primary-text transition-colors hover:text-primary hover:underline"
                    onClick={() => remove(comment.id)}
                  >
                    <Trash2 size={11} aria-hidden="true" /> 삭제
                  </button>
                )}
              </span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-txt-dim">{comment.body}</p>
          </li>
        ))}
      </ul>

      {comments.length === 0 && <p className="mt-3 text-xs text-txt-faint">아직 댓글이 없습니다.</p>}

      <form className="mt-3 flex items-start gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="reservation-comment-body">댓글 내용</label>
        <textarea
          id="reservation-comment-body"
          className="input-base flex-1 resize-y py-1"
          rows={1}
          // textarea.input-base carries a 140px min-height for the long
          // form fields elsewhere; an element selector outranks the utility
          // class, so the override has to be inline. These are one-liners.
          style={{ minHeight: '2.25rem' }}
          maxLength={MAX_BODY}
          placeholder={username ? '예: 21시에 갈게요' : '먼저 유저명을 설정해 주세요'}
          value={draft}
          disabled={!username || submitting}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="btn-primary shrink-0 self-stretch px-3"
          disabled={!username || submitting || draft.trim().length === 0}
        >
          <Send size={14} aria-hidden="true" />
          <span className="sr-only">댓글 등록</span>
        </button>
      </form>
    </section>
  )
}
