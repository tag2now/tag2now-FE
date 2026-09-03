import { useState, useRef, useEffect } from 'react'
import { charImageUrl } from '@/shared/characterImage'
import { LATEST_PATCH_VERSION } from '@/config/patchNotes'
import RankImage from './RankImage'
import PlayerHistoryPanel from './PlayerHistoryPanel'
import { getUsername as getSavedUsername, saveUsername, clearUsername } from '@/shared/util/cookie'
import { setIdentity } from '@/community/communityApi'
import { AppError } from '@/shared/util/AppError'
import {CharInfo, LeaderboardEntry} from "@/shared/types";
import { Check, Pencil, Radio, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * The API's own { detail } is Korean and written for users, so it is shown as
 * it is — "유저명은 50자를 넘을 수 없습니다." beats any generic line. Anything
 * else is a transport failure whose message is not user-facing text.
 */
function errorText(e: unknown): string {
  if (e instanceof AppError && e.explained) return e.message
  return '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}

interface HeaderProps {
  totalUsers?: number
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Header({ totalUsers, leaderboardEntries }: HeaderProps) {
  const [username, setUsername] = useState(() => getSavedUsername() ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEditing() {
    setDraft(username)
    setEditing(true)
  }

  async function commitUsername() {
    const trimmed = draft.trim()
    const prev = username
    setUsername(trimmed)
    setEditing(false)
    if (trimmed) {
      try {
        await setIdentity(trimmed)
        saveUsername(trimmed)
      } catch (e) {
        // Reopen rather than rethrowing. The rethrow reached the global
        // unhandledrejection handler, which toasts `e.message` verbatim — so a
        // dropped connection showed "Failed to fetch" and a 5xx without a body
        // showed "request failed: 500", both in English in an all-Korean UI.
        // Worse, the editor had already closed, so the typed name was gone and
        // the only way forward was to type it again from memory.
        setUsername(prev)
        setEditing(true)
        toast.error(errorText(e))
      }
    } else {
      clearUsername()
    }
  }

  const entry = username
    ? leaderboardEntries?.find(e => e.online_name === username)
    : undefined

  const mainChar = entry?.player_info?.main_char_info
  const subChar = entry?.player_info?.sub_char_info
  const chars = [mainChar, subChar].filter((c): c is CharInfo => !!c?.name)

  return (
    <>
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><SwordsMark /></div>
        <div>
          <h1 aria-label="Tag 2 Now">TAG<span>2</span>NOW</h1>
          <p>Tekken Tag Tournament 2 live hub <b>v{LATEST_PATCH_VERSION}</b></p>
        </div>
      </div>

      <div className="header-live" aria-label={`${totalUsers ?? 0}명 온라인`}>
        <Radio size={15} aria-hidden="true" />
        <span>Live</span>
        {totalUsers != null && totalUsers > 0 && <strong>{totalUsers}</strong>}
      </div>

      <div className="profile-control">
        {editing ? (
          <div className="profile-editor">
            <input ref={inputRef} type="text" value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitUsername().then(); if (e.key === 'Escape') setEditing(false) }}
              maxLength={50} placeholder="유저명 입력" aria-label="유저명 입력" className="input-base" />
            <button onClick={() => commitUsername()} aria-label="저장"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} aria-label="취소"><X size={15} /></button>
          </div>
        ) : username ? (
          <div className="profile-summary">
            <div className="profile-copy">
              <small>#{entry?.rank || "UNRANKED"}</small>
              <button
                  onClick={() => setProfileOpen(true)}
                  disabled={!entry}
                  aria-label={`${username} 내 전적 보기`}
                  className="profile-name"
              >
                <span>{username}</span>
              </button>
              <button
                  onClick={startEditing}
                  aria-label={`${username} 유저명 수정`}
                  className="profile-edit"
              >
                <Pencil size={14} aria-hidden="true" />
              </button>
            </div>
            {chars.length > 0 && (
              <div className="profile-chars">
                {chars.map(char => <ProfileChar key={char.name} char={char} />)}
              </div>
            )}
          </div>
        ) : (
          <button onClick={startEditing} className="profile-empty"><UserRound size={15} /> 유저명 설정</button>
        )}
      </div>
    </header>
    {/* Mounted outside <header>: the header is position:sticky, which makes it
        the containing block for any fixed descendant --- the modal backdrop was
        being clipped to the header's own 92px instead of filling the viewport. */}
    {profileOpen && entry && (
      <PlayerHistoryPanel
        npid={entry.np_id}
        leaderboardEntry={entry}
        onClose={() => setProfileOpen(false)}
      />
    )}
    </>
  )
}

function ProfileChar({ char }: { char: CharInfo }) {
  const url = charImageUrl(char.name)
  const total = (char.wins ?? 0) + (char.losses ?? 0)
  return (
    <div className="profile-char" title={char.name}>
      <RankImage rankInfo={char.rank_info} className="profile-char-rank" />
      <div className="profile-avatar">
        {url ? <img src={url} alt={char.name} /> : <UserRound size={17} />}
      </div>
      {total > 0 && (
        <span className="profile-record">
          <b>{char.wins ?? 0}<em>W</em></b>
          <i>{char.losses ?? 0}<em>L</em></i>
        </span>
      )}
    </div>
  )
}

function SwordsMark() {
  return <span>2</span>
}
