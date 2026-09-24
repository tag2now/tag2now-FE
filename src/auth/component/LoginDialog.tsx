import { useState } from 'react'
import { LogIn } from 'lucide-react'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { AppError } from '@/shared/util/AppError'
import { login } from '@/auth/authApi'
import { dismissLoginRequest } from '@/auth/session'
import { useLoginRequest } from '@/auth/useAuth'

function errorText(error: unknown): string {
  if (error instanceof AppError && error.explained) return error.message
  return '로그인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}

function LoginForm({ reason }: { reason: string | null }) {
  const dialogRef = useModalDialog<HTMLFormElement>(dismissLoginRequest)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !username.trim() || !password) return
    setSubmitting(true)
    setError(null)
    try {
      // A successful login closes the dialog from the store, which unmounts
      // this form --- so nothing is set after it.
      await login(username.trim(), password)
    } catch (caught) {
      setError(errorText(caught))
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        aria-describedby="login-dialog-body"
        className="confirm-dialog"
      >
        <div className="confirm-dialog-head">
          <span className="confirm-dialog-icon" aria-hidden="true"><LogIn size={18} /></span>
          <h2 id="login-dialog-title">RPCN 로그인</h2>
        </div>
        <p id="login-dialog-body" className="confirm-dialog-body">
          {reason && <>{reason}<br /></>}
          RPCS3에서 쓰는 RPCN 계정으로 로그인합니다.
        </p>

        <div className="mt-4">
          <label className="field-label" htmlFor="login-username">아이디</label>
          <input
            id="login-username"
            className="input-base w-full"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <label className="field-label" htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            type="password"
            className="input-base w-full"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-error">{error}</p>}

        <div className="confirm-dialog-actions">
          <button type="button" className="btn-ghost" onClick={dismissLoginRequest}>취소</button>
          <button type="submit" className="btn-primary" disabled={submitting || !username.trim() || !password}>
            {submitting ? '로그인 중' : '로그인'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Renders the login dialog whenever something has asked for it.
 *
 * Mounted once in App, so any feature can open it with `requestLogin` (or the
 * `requireUser` guard) without owning a dialog of its own. */
export default function LoginDialog() {
  const request = useLoginRequest()
  return request ? <LoginForm reason={request.reason} /> : null
}
