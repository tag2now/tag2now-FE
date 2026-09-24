import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, Radio, Trophy } from 'lucide-react'
import useAuth from '@/auth/useAuth'
import { requestLogin } from '@/auth/session'
import type { RoomUser } from '@/match/types'
import type { CharInfo, LeaderboardEntry } from '@/shared/types'
import PlayerHistoryPanel from './PlayerHistoryPanel'
import RankImage from './RankImage'
import { indexOfRank } from '@/reservation/reservationLabels'
import CharCell from './CharCell'

interface PlayerProfileCardProps {
  leaderboardEntries?: LeaderboardEntry[]
  roomUsers?: RoomUser[]
}

/** Who you are signed in as, in the sidebar and --- through a portal --- in
 * the header slot that replaces the sidebar on a phone.
 *
 * It used to hold a typed-in display name. The account now comes from the
 * RPCN login, whose username is the leaderboard's np_id, so the record is
 * found by id rather than by guessing from a name two players could share.
 */
export default function PlayerProfileCard({ leaderboardEntries, roomUsers = [] }: PlayerProfileCardProps) {
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderTarget(document.getElementById('headerProfileSlot'))
  }, [])

  // A record open for the last account must not stay open for no account.
  useEffect(() => {
    if (!user) setProfileOpen(false)
  }, [user])

  const entry = user
    ? leaderboardEntries?.find(item => item.np_id === user.username)
    : undefined
  const characters = [entry?.player_info?.main_char_info, entry?.player_info?.sub_char_info]
    .filter((character): character is CharInfo => !!character?.name)
  /** The higher of the two, because a header has room for one banner and the
   * one worth showing is the one they have climbed to. `indexOfRank` answers
   * -1 for a rank this build has not heard of, which loses to any known one
   * rather than winning by accident. */
  const bestRank = characters
    .map((character) => character.rank_info)
    .filter((rank): rank is NonNullable<typeof rank> => !!rank?.name)
    .sort((a, b) => indexOfRank(b.name) - indexOfRank(a.name))[0]
  const online = !!user && roomUsers.some(roomUser => roomUser.np_id === user.username)
  const name = user?.online_name || user?.username

  const signIn = () => requestLogin()

  const headerControl = user ? (
    <div className="profile-copy">
      {/* Shown only below 760px, where the sidebar card is hidden. The label
          is its own span because the narrowest screens drop it for the icon;
          aria-label keeps the button named when they do. */}
      <button
        type="button"
        className="profile-history"
        onClick={() => setProfileOpen(true)}
        disabled={!entry}
        aria-label="내 정보"
      >
        <Trophy size={14} aria-hidden="true" /> <span className="profile-history-label">내 정보</span>
      </button>
      {/* The same byline a post row carries: rank banner, place, name. */}
      <RankImage rankInfo={bestRank} className="author-badge-rank" />
      {entry && <span className="author-badge-place">#{entry.rank}</span>}
      <button
        type="button"
        className="profile-name"
        onClick={logout}
        aria-label={`${name} 로그아웃`}
        title="로그아웃"
      >
        <span>{name}</span>
        <LogOut size={13} aria-hidden="true" className="ml-1.5 shrink-0" />
      </button>
    </div>
  ) : (
    <button type="button" onClick={signIn} className="profile-empty">
      <LogIn size={15} aria-hidden="true" /> 로그인
    </button>
  )

  const card = (
      <section className="sidebar-profile-card" aria-label="내 파이터 정보">
        <div className="sidebar-profile-heading">
          <span>Profile</span>
          {user && (
            <div className="sidebar-profile-actions">
              <small className={`sidebar-profile-presence${online ? ' is-online' : ''}`}>
                <Radio size={12} aria-hidden="true" />
                {online ? '온라인' : '오프라인'}
              </small>
            </div>
          )}
        </div>

        {user ? (
          <>
            <div className="sidebar-profile-identity">
              <div className="sidebar-profile-name">
                <span className="sidebar-profile-rank-position">#{entry?.rank ?? 'UNRANKED'}</span>
                <strong>{name}</strong>
              </div>
            </div>

            {characters.length > 0 && (
              <div className="sidebar-profile-characters" aria-label="캐릭터와 계급">
                {characters.map((character, index) => (
                  <div
                    key={`${character.name}-${index}`}
                    aria-label={`${index === 0 ? '메인' : '서브'} 캐릭터 ${character.name}`}
                  >
                    <CharCell
                      name={character.name}
                      rankInfo={character.rank_info}
                      wins={character.wins}
                      losses={character.losses}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="sidebar-profile-history"
              onClick={() => setProfileOpen(true)}
              disabled={!entry}
            >
              <Trophy size={14} aria-hidden="true" />
              내 정보 보기
            </button>
            <button type="button" className="profile-empty sidebar-profile-empty" onClick={logout}>
              <LogOut size={14} aria-hidden="true" /> 로그아웃
            </button>
          </>
        ) : (
          <button type="button" onClick={signIn} className="profile-empty sidebar-profile-empty">
            <LogIn size={15} aria-hidden="true" /> RPCN 로그인
          </button>
        )}
      </section>
  )

  return (
    <>
      {card}
      {headerTarget && createPortal(headerControl, headerTarget)}
      {profileOpen && entry && createPortal(
        <PlayerHistoryPanel
          npid={entry.np_id}
          leaderboardEntry={entry}
          onClose={() => setProfileOpen(false)}
        />,
        document.body,
      )}
    </>
  )
}
