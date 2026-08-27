import { useState, useRef, useEffect } from 'react'
import { charImageUrl } from '@/shared/characterImage'
import { APP_VERSION } from '@/config/version'
import RankImage from './RankImage'
import { getUsername as getSavedUsername, saveUsername, clearUsername } from '@/shared/util/cookie'
import { setIdentity } from '@/community/communityApi'
import {LeaderboardEntry} from "@/shared/types";
import { Check, Pencil, Radio, UserRound, X } from 'lucide-react'

interface HeaderProps {
  totalUsers?: number
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Header({ totalUsers, leaderboardEntries }: HeaderProps) {
  const [username, setUsername] = useState(() => getSavedUsername() ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
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
        setUsername(prev)
        throw e
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

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><SwordsMark /></div>
        <div>
          <h1 aria-label="Tag 2 Now">TAG<span>2</span>NOW</h1>
          <p>Tekken Tag Tournament 2 live hub <b>v{APP_VERSION}</b></p>
        </div>
      </div>

      <div className="header-live" aria-label={`${totalUsers ?? 0}명 온라인`}>
        <Radio size={15} aria-hidden="true" />
        <span>Live</span>
        {totalUsers != null && totalUsers > 0 && <strong aria-label="total users">{totalUsers}</strong>}
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
            <div className="profile-avatar">{mainChar ? <img src={charImageUrl(mainChar.name)!} alt="" /> : <UserRound size={17} />}</div>
            <div className="profile-copy">
              <small>#{entry?.rank || "UNRANKED"}</small>
              <button
                  onClick={startEditing}
                  aria-label={`${username} 유저명 수정`}
                  className="profile-name"
              >
                <span>{username}</span><Pencil size={12} aria-hidden="true" />
              </button>
            </div>
            {entry && <div className="profile-rank">{[mainChar, subChar].map(char => char?.rank_info && <RankImage key={char.name} rankInfo={char.rank_info} className="h-7 w-auto" />)}</div>}
          </div>
        ) : (
          <button onClick={startEditing} className="profile-empty"><UserRound size={15} /> 유저명 설정</button>
        )}
      </div>
    </header>
  )
}

function SwordsMark() {
  return <span>2</span>
}
