import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogIn, LogOut, ShieldBan, Trophy, Tv } from 'lucide-react'
import { requestLogin } from '@/auth/session'
import type { AuthUser } from '@/auth/types'
import { pathOf } from '@/config/routes'
import usePopover from '@/shared/hooks/usePopover'
import RankImage from '@/shared/components/RankImage'
import { indexOfRank } from '@/shared/ranks'
import type { CharInfo, LeaderboardEntry } from '@/shared/types'

interface AccountControlProps {
  user: AuthUser | null
  entry?: LeaderboardEntry
  characters: CharInfo[]
  onOpenProfile: () => void
  onOpenStream: () => void
  onLogout: () => void
}

export default function AccountControl({
  user, entry, characters, onOpenProfile, onOpenStream, onLogout,
}: AccountControlProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen, menuAnchorRef] = usePopover()

  useEffect(() => {
    if (!user) setMenuOpen(false)
  }, [user, setMenuOpen])

  // Unlike a picker, a menu starts on its first enabled action.
  useEffect(() => {
    if (menuOpen) menuAnchorRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [menuOpen, menuAnchorRef])

  // The header has room for one rank banner: the higher of the two characters.
  // Unknown ranks keep their existing -1 position below known ones.
  const bestRank = characters
    .map((character) => character.rank_info)
    .filter((rank): rank is NonNullable<typeof rank> => !!rank?.name)
    .sort((a, b) => indexOfRank(b.name) - indexOfRank(a.name))[0]
  const name = user?.online_name || user?.username

  if (!user) {
    return (
      <button type="button" onClick={() => requestLogin()} className="btn-primary profile-login">
        <LogIn size={15} aria-hidden="true" /> 로그인
      </button>
    )
  }

  return (
    <div className="profile-copy">
      <button
        type="button"
        className="profile-history"
        onClick={onOpenProfile}
        disabled={!entry}
        aria-label="내 정보"
      >
        <Trophy size={14} aria-hidden="true" /> <span className="profile-history-label">내 정보</span>
      </button>
      <RankImage rankInfo={bestRank} className="author-badge-rank" />
      {entry && <span className="author-badge-place">#{entry.rank}</span>}
      <div ref={menuAnchorRef} className="profile-menu-anchor">
        <button
          type="button"
          className="profile-name"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`${name} 계정 메뉴`}
        >
          <span>{name}</span>
          <ChevronDown size={13} aria-hidden="true" className="ml-1 shrink-0" />
        </button>
        {menuOpen && (
          <div role="menu" aria-label="계정" className="profile-menu">
            <p className="profile-menu-id">{user.username}</p>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onOpenProfile() }}
              disabled={!entry}
            >
              <Trophy size={14} aria-hidden="true" /> 내 정보 보기
            </button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenStream() }}>
              <Tv size={14} aria-hidden="true" /> 방송 채널
            </button>
            {user.admin && (
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate(pathOf('admin')) }}>
                <ShieldBan size={14} aria-hidden="true" /> 관리자 메뉴
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onLogout() }}>
              <LogOut size={14} aria-hidden="true" /> 로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
