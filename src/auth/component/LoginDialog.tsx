import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef<AbortController | null>(null)

  // Closing the dialog (cancel, Escape, a login in another tab) abandons the
  // request, so a cancelled login cannot sign the user in behind their back.
  useEffect(() => () => inFlight.current?.abort(), [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !username.trim() || !password) return
    const controller = new AbortController()
    inFlight.current = controller
    setSubmitting(true)
    setError(null)
    try {
      // A successful login closes the dialog from the store, which unmounts
      // this form --- so nothing is set after it.
      const user = await login(username.trim(), password, controller.signal)
      toast.success(`${user.online_name || user.username}님, 로그인했습니다.`)
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(errorText(caught))
      setPassword('')
      setSubmitting(false)
      passwordRef.current?.focus()
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
        aria-busy={submitting}
        className="confirm-dialog login-dialog"
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
            readOnly={submitting}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <label className="field-label" htmlFor="login-password">비밀번호</label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input-base w-full pr-10"
              autoComplete="current-password"
              maxLength={128}
              readOnly={submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="login-reveal"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-error">{error}</p>}

        <p className="login-help">
          온라인 닉네임이 아니라 RPCN 로그인 아이디를 입력하세요.
          RPCS3의 RPCN 메뉴에서 계정 생성이 가능합니다.
        </p>

        <div className="confirm-dialog-actions">
          <button type="button" className="btn-ghost" onClick={dismissLoginRequest}>취소</button>
          <button type="submit" className="btn-primary" disabled={submitting || !username.trim() || !password}>
            {submitting && <Loader2 size={14} aria-hidden="true" className="animate-spin" />}
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
