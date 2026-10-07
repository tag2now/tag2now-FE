import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { postMessage } from '@/chat/chatApi'
import { receive } from '@/chat/chatStream'
import showFailure from '@/chat/showFailure'
import { MAX_BODY_LENGTH } from '@/chat/types'

/** The composer, shown only to a signed-in reader.
 *
 * The field stays enabled while a message is in flight; only the button
 * waits. Disabling the field would drop its focus, and on a phone that closes
 * the keyboard after every line. A refused message — too fast, say — keeps
 * its text so it can be sent again.
 */
export default function MessageInput() {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      receive(await postMessage(body))
      setDraft('')
    } catch (error) {
      showFailure(error, '메시지를 보내지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="chat-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="chat-message">메시지</label>
      <input
        id="chat-message"
        className="input-base"
        maxLength={MAX_BODY_LENGTH}
        autoComplete="off"
        enterKeyHint="send"
        placeholder="메시지 입력"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className="btn-primary" disabled={sending || draft.trim() === ''}>
        <Send size={14} aria-hidden="true" />
        <span className="sr-only">보내기</span>
      </button>
    </form>
  )
}
