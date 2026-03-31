import { useState, useRef, useEffect } from 'react'
import { charImageUrl } from '@/shared/characterImage'
import { APP_VERSION } from '@/version'
import type { LeaderboardEntry } from '@/types'
import RankImage from './RankImage'
import { getUsername as getSavedUsername, saveUsername, clearUsername } from '@/shared/cookie'
import { setIdentity } from '@/shared/communityApi'

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
    <header className="app-header relative border-b-2 border-accent pt-2 pb-2 px-3 mb-1 flex justify-between items-center">
      <div className="flex items-center sm:items-baseline gap-3">
        <div className="relative">
          <h1 className="font-display text-[clamp(1.05rem,4vw,1.8rem)] font-black m-0 tracking-wide uppercase">
            Tag<span className="header-accent">2</span>Now
          </h1>
          <span className="absolute top-[76%] right-[4%] text-2xs text-txt-dim">v{APP_VERSION}</span>
        </div>
        <div className="inline-flex items-center flex-col sm:flex-row sm:gap-2 text-base font-bold">
          <div className="inline-flex items-center gap-1.5 tracking-[0.2em] uppercase text-accent">
            <span className="w-1.75 h-1.75 rounded-full bg-accent animate-[blink_1.6s_ease-in-out_infinite]" />
            Live
          </div>
          {totalUsers != null && totalUsers > 0 && (
            <span className="tracking-wide text-accent">
              {totalUsers} online
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitUsername().then() }}
            onBlur={commitUsername}
            placeholder="유저명 입력"
            className="input-base px-2 py-0.5 mt-1 text-base w-36 focus:border-accent"
          />
        ) : username ? (
          <div className="flex flex-col sm:flex-row sm:gap-2 items-center">
            <div className="flex gap-2 sm:text-lg">
              <span className="text-accent font-bold">#{entry?.rank || "Unranked"}</span>
              <button
                  onClick={startEditing}
                  aria-label={`${username} 유저명 수정`}
                  className="text-txt-dim hover:text-txt transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
              >
                <span className="truncate max-w-24 sm:max-w-none font-semibold">{username}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M13.49 3.1a2 2 0 0 0-2.83 0L3.17 10.6a1 1 0 0 0-.26.45l-.77 2.9a.5.5 0 0 0 .6.6l2.9-.77a1 1 0 0 0 .45-.26l7.5-7.5a2 2 0 0 0 0-2.83l-.1-.1Z" />
                </svg>
              </button>
            </div>
            {entry && (
                <div className="flex flex-col gap-1 leading-none">
                  {[mainChar, subChar].map(char => char &&
                    <div key={char.name} className="flex items-center">
                      {char.rank_info && (
                        <RankImage rankInfo={char.rank_info} className="h-7 sm:h-8 w-auto" />
                      )}
                      <img src={charImageUrl(char.name)!} alt={char.name} className="h-7 sm:h-11 rounded" />
                      <div className="hidden sm:flex flex-col items-start font-semibold text-lg">
                        <span>W{char.wins}</span>
                        <span>L{char.losses}</span>
                      </div>
                    </div>
                  )}
                </div>
            )}
          </div>
        ) : (
          <button
            onClick={startEditing}
            className="text-txt-dim text-xl font-semibold hover:text-txt transition-colors cursor-pointer bg-transparent border-2 rounded-sm mt-1 px-1"
          >
            유저명 설정
          </button>
        )}
      </div>
    </header>
  )
}
