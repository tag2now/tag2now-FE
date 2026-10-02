import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Loader2, Search, ShieldBan } from 'lucide-react'
import useAuth from '@/auth/useAuth'
import { requestLogin } from '@/auth/session'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import { banAccount, lookupAccount } from '@/admin/adminApi'
import { errorText, formatInstant, warnEmpty } from '@/admin/adminText'
import SaveAdmin from '@/admin/SaveAdmin'
import type { AccountStatus } from '@/admin/types'

/** RPCN usernames are unique regardless of case, as the backend compares them. */
const isSameAccount = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** The page frame every state shares, so a refusal reads as this page and not a blank one. */
function AdminPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><ShieldBan size={15} aria-hidden="true" /></span>
          <div><h2>계정 관리</h2><p>RPCN 계정을 조회하고 밴합니다</p></div>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Admins only. The backend is the authority --- this gate only spares a
 * non-admin a form that could never succeed. */
export default function Admin() {
  const { user } = useAuth()

  if (!user) {
    return (
      <AdminPanel>
        <p className="admin-notice">관리자 계정으로 로그인해야 합니다.</p>
        <button type="button" className="btn-primary" onClick={() => requestLogin('관리자 계정으로 로그인하세요.')}>
          로그인
        </button>
      </AdminPanel>
    )
  }
  if (!user.admin) {
    return <AdminPanel><p className="admin-notice">관리자 권한이 없습니다.</p></AdminPanel>
  }
  return <AdminConsole self={user.username} />
}

/** One password for the whole page: both sections send it with every request.
 *
 * It is held in this component's state only --- never in storage --- and goes
 * when the page does. Every request carries it because RPCN re-checks it on
 * every action. */
function AdminConsole({ self }: { self: string }) {
  const [password, setPassword] = useState('')
  const passwordField = useRef<HTMLInputElement>(null)
  const missingPassword = () => warnEmpty(passwordField.current, '내 비밀번호 (확인용)를 먼저 입력하세요.')

  return (
    <div className="admin-page">
      <div className="panel admin-auth">
        <label className="admin-field">
          <span className="field-label">내 비밀번호 (확인용)</span>
          <input
            ref={passwordField}
            type="password"
            className="input-base"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className="admin-hint">조회와 수정마다 RPCN이 다시 확인합니다. 이 페이지를 떠나면 지워집니다.</p>
      </div>
      <AdminPanel>
        <AccountModeration self={self} password={password} onMissingPassword={missingPassword} />
      </AdminPanel>
      <SaveAdmin password={password} onMissingPassword={missingPassword} />
    </div>
  )
}

/** Look an account up, then ban it. */
function AccountModeration({ self, password, onMissingPassword }: {
  self: string
  password: string
  onMissingPassword: () => void
}) {
  const [username, setUsername] = useState('')
  const usernameField = useRef<HTMLInputElement>(null)
  const [account, setAccount] = useState<AccountStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, request: confirmRequest, onConfirm, onCancel } = useConfirm()

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  const lookup = (event: React.FormEvent) => {
    event.preventDefault()
    const target = username.trim()
    if (busy) return
    if (!target) return warnEmpty(usernameField.current, '대상 RPCN 아이디를 입력하세요.')
    if (!password) return onMissingPassword()
    setAccount(null)
    run(async () => setAccount(await lookupAccount(target, password)))
  }

  // Bans the account that was looked up, not whatever the field says now.
  const ban = async (target: AccountStatus) => {
    if (!password) return onMissingPassword()
    const agreed = await confirm({
      title: `${target.online_name}(${target.username}) 계정을 밴할까요?`,
      body: 'RPCS3 접속이 바로 끊기고 다시 로그인할 수 없습니다. 이 사이트에는 로그인이 만료될 때까지 남아 있을 수 있습니다. 밴 해제 기능은 없습니다.',
      confirmLabel: '밴',
    })
    if (!agreed) return
    run(async () => {
      const result = await banAccount(target.username, password)
      setAccount({ ...target, banned: true, online: target.online && !result.kicked })
      toast.success(result.kicked ? `${result.username} 계정을 밴하고 접속을 끊었습니다.` : `${result.username} 계정을 밴했습니다.`)
    })
  }

  return (
    <>
      <form className="admin-lookup" onSubmit={lookup} aria-busy={busy}>
        <label className="admin-field">
          <span className="field-label">대상 RPCN 아이디</span>
          <input
            ref={usernameField}
            className="input-base"
            placeholder="대소문자까지 정확히"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Search size={14} aria-hidden="true" />}
          조회
        </button>
      </form>

      {error && <p role="alert" className="admin-error">{error}</p>}
      {account && <AccountCard account={account} isSelf={isSameAccount(account.username, self)} busy={busy} onBan={() => ban(account)} />}

      {confirmRequest && createPortal(
        <ConfirmDialog request={confirmRequest} onConfirm={onConfirm} onCancel={onCancel} />,
        document.body,
      )}
    </>
  )
}

function AccountCard({ account, isSelf, busy, onBan }: {
  account: AccountStatus
  isSelf: boolean
  busy: boolean
  onBan: () => void
}) {
  return (
    <section className="admin-account" aria-label="조회한 계정">
      <h3>{account.online_name} <small>{account.username}</small></h3>
      <dl>
        <dt>상태</dt><dd className={account.banned ? 'is-banned' : undefined}>{account.banned ? '밴됨' : '정상'}</dd>
        <dt>RPCS3 접속</dt><dd>{account.online ? '접속 중' : '오프라인'}</dd>
        <dt>권한</dt><dd>{account.admin ? '관리자' : '일반'}</dd>
        <dt>가입</dt><dd>{formatInstant(account.created_at)}</dd>
        <dt>마지막 로그인</dt><dd>{formatInstant(account.last_login_at)}</dd>
      </dl>
      <button type="button" className="btn-danger" onClick={onBan} disabled={busy || account.banned || isSelf}>
        <ShieldBan size={14} aria-hidden="true" /> 밴
      </button>
      {isSelf && <p className="admin-hint">자기 계정은 밴할 수 없습니다.</p>}
    </section>
  )
}
