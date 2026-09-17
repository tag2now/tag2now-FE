import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Check, Radio, Trophy, UserRound, X } from 'lucide-react'
import { setIdentity } from '@/community/communityApi'
import type { RoomUser } from '@/match/types'
import type { CharInfo, LeaderboardEntry } from '@/shared/types'
import { AppError } from '@/shared/util/AppError'
import {
  clearUsername,
  getUsername as getSavedUsername,
  isTransportableUsername,
  saveUsername,
  UNTRANSPORTABLE_USERNAME_MSG,
} from '@/shared/util/cookie'
import PlayerHistoryPanel from './PlayerHistoryPanel'
import RankImage from './RankImage'
import { indexOfRank } from '@/reservation/reservationLabels'
import CharCell from './CharCell'

interface PlayerProfileCardProps {
  leaderboardEntries?: LeaderboardEntry[]
  roomUsers?: RoomUser[]
}

function errorText(error: unknown): string {
  if (error instanceof AppError && error.explained) return error.message
  return '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}

export default function PlayerProfileCard({ leaderboardEntries, roomUsers = [] }: PlayerProfileCardProps) {
  const [username, setUsername] = useState(() => getSavedUsername() ?? '')
  const [editingSurface, setEditingSurface] = useState<'sidebar' | 'header' | null>(null)
  const [draft, setDraft] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingSurface) inputRef.current?.focus()
  }, [editingSurface])

  useEffect(() => {
    setHeaderTarget(document.getElementById('headerProfileSlot'))
  }, [])

  const entry = username
    ? leaderboardEntries?.find(item => item.online_name === username)
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
  const online = !!username && roomUsers.some(user =>
    (entry?.np_id && user.np_id === entry.np_id) || user.online_name === username,
  )

  function startEditing(surface: 'sidebar' | 'header') {
    setDraft(username)
    setEditingSurface(surface)
  }

  async function commitUsername() {
    const trimmed = draft.trim()
    if (!isTransportableUsername(trimmed)) {
      toast.error(UNTRANSPORTABLE_USERNAME_MSG)
      return
    }

    const previous = username
    const previousSurface = editingSurface
    setUsername(trimmed)
    setEditingSurface(null)
    if (!trimmed) {
      clearUsername()
      return
    }

    try {
      await setIdentity(trimmed)
      saveUsername(trimmed)
    } catch (error) {
      setUsername(previous)
      setEditingSurface(previousSurface ?? 'sidebar')
      toast.error(errorText(error))
    }
  }

  function editor(className = 'profile-editor') {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') void commitUsername()
            if (event.key === 'Escape') setEditingSurface(null)
          }}
          maxLength={50}
          placeholder="유저명 입력"
          aria-label="유저명 입력"
          className="input-base"
        />
        <button type="button" onClick={() => void commitUsername()} aria-label="저장"><Check size={15} /></button>
        <button type="button" onClick={() => setEditingSurface(null)} aria-label="취소"><X size={15} /></button>
      </div>
    )
  }

  const headerControl = editingSurface === 'header' ? editor() : username ? (
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
      {/* The name renames; the trophy beside it opens the record. They used to
          do the same thing, with a pencil alongside doing the only other
          thing --- three controls for two actions, and the one you would
          reach for first was the duplicate. */}
      {/* The same byline a post row carries: rank banner, place, name. Signed
          in, the header said only the name --- so the one place you are always
          looking told you less about yourself than a comment you left. */}
      <RankImage rankInfo={bestRank} className="author-badge-rank" />
      {entry && <span className="author-badge-place">#{entry.rank}</span>}
      <button
        type="button"
        className="profile-name"
        onClick={() => startEditing('header')}
        aria-label={`${username} 헤더에서 유저명 수정`}
      >
        <span>{username}</span>
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => startEditing('header')} className="profile-empty">
      <UserRound size={15} aria-hidden="true" /> 유저명 설정
    </button>
  )

  const card = (
      <section className={`sidebar-profile-card${editingSurface === 'sidebar' ? ' is-editing' : ''}`} aria-label="내 파이터 정보">
        <div className="sidebar-profile-heading">
          <span>Profile</span>
          {editingSurface !== 'sidebar' && username && (
            <div className="sidebar-profile-actions">
              <small className={`sidebar-profile-presence${online ? ' is-online' : ''}`}>
                <Radio size={12} aria-hidden="true" />
                {online ? '온라인' : '오프라인'}
              </small>
            </div>
          )}
        </div>

        {editingSurface === 'sidebar' ? (
          editor('profile-editor sidebar-profile-editor')
        ) : username ? (
          <>
            <div className="sidebar-profile-identity">
              <button
                type="button"
                className="sidebar-profile-name"
                onClick={() => startEditing('sidebar')}
                aria-label={`${username} 유저명 수정`}
              >
                <span className="sidebar-profile-rank-position">#{entry?.rank ?? 'UNRANKED'}</span>
                <strong>{username}</strong>
              </button>
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
          </>
        ) : (
          <button type="button" onClick={() => startEditing('sidebar')} className="profile-empty sidebar-profile-empty">
            <UserRound size={15} aria-hidden="true" /> 유저명 설정
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
