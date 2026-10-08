import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react'
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
  const [remember, setRemember] = useState(true)
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
      const user = await login(username.trim(), password, controller.signal, remember)
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
        aria-describedby={reason ? 'login-dialog-body' : undefined}
        aria-busy={submitting}
        className="login-dialog"
      >
        <div className="login-brand" aria-hidden="true">
          <img src="/favicon.svg" alt="" width={48} height={48} />
          <p>TAG<span>2</span>NOW</p>
        </div>
        <h2 id="login-dialog-title" className="sr-only">RPCN 로그인</h2>

        {reason && <p id="login-dialog-body" className="mb-4 border-l-2 border-primary bg-primary/8 px-3 py-2 text-xs leading-normal text-txt-dim break-keep">{reason}</p>}

        <div className="login-field">
          <label className="sr-only" htmlFor="login-username">아이디</label>
          <input
            id="login-username"
            className="input-base w-full"
            placeholder="RPCN 아이디를 입력하세요"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            readOnly={submitting}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="login-field mt-3">
          <label className="sr-only" htmlFor="login-password">비밀번호</label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input-base w-full"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              maxLength={128}
              readOnly={submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="absolute top-0 right-0 grid h-full w-12 cursor-pointer place-items-center border-none bg-transparent text-txt-faint hover:text-txt aria-pressed:text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-sm leading-normal font-bold text-error">{error}</p>}

        <div className="mt-5 flex items-start justify-between gap-3 md:items-center">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm leading-normal text-txt-dim">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={remember}
              disabled={submitting}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span className="grid size-5 place-items-center rounded-full border border-txt-faint text-transparent transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-bg-deep peer-disabled:opacity-55 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" aria-hidden="true"><Check size={14} /></span>
            자동 로그인
          </label>
          <span className="login-credential-note">온라인 닉네임이 아닌 RPCN 아이디를 입력하세요.</span>
        </div>

        <div className="login-dialog-actions mt-8">
          <button type="submit" className="btn-primary" disabled={submitting || !username.trim() || !password}>
            {submitting && <Loader2 size={14} aria-hidden="true" className="animate-spin" />}
            {submitting ? '로그인 중' : '로그인'}
          </button>
        </div>
        <button type="button" className="mx-auto mt-3 block cursor-pointer border-none bg-transparent px-2 py-0.5 text-xs leading-normal text-txt-faint hover:text-txt hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={dismissLoginRequest}>취소</button>
        <p className="login-help">RPCN 계정은 RPCS3의 RPCN 메뉴에서 생성할 수 있어요.</p>

        {/* Last in the DOM so the dialog opens focused on the id field; it is
            positioned in the corner, and stays usable to abandon a slow login. */}
        <button type="button" className="absolute top-3 right-3 z-1 grid size-8 cursor-pointer place-items-center rounded-control border-none bg-transparent p-0 text-txt-faint transition-colors duration-150 hover:bg-surface-tint/7 hover:text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={dismissLoginRequest} aria-label="로그인 창 닫기">
          <X size={18} aria-hidden="true" />
        </button>
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
