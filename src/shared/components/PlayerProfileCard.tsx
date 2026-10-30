import { Radio, Trophy } from 'lucide-react'
import CharCell from '@/shared/components/CharCell'
import type { CharInfo } from '@/shared/types'

interface PlayerProfileCardProps {
  name: string
  rank?: number
  characters: CharInfo[]
  online: boolean
  onOpenHistory?: () => void
}

/** Display a player profile without authentication, navigation or dialogs. */
export default function PlayerProfileCard({ name, rank, characters, online, onOpenHistory }: PlayerProfileCardProps) {
  return (
    <section className="sidebar-profile-card" aria-label="내 파이터 정보">
      <div className="sidebar-profile-heading">
        <span>Profile</span>
        <div className="sidebar-profile-actions">
          <small className={`sidebar-profile-presence${online ? ' is-online' : ''}`}>
            <Radio size={12} aria-hidden="true" />
            {online ? '온라인' : '오프라인'}
          </small>
        </div>
      </div>

      <div className="sidebar-profile-identity">
        <div className="sidebar-profile-name">
          <span className="sidebar-profile-rank-position">#{rank ?? 'UNRANKED'}</span>
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
        onClick={onOpenHistory}
        disabled={!onOpenHistory}
      >
        <Trophy size={14} aria-hidden="true" />
        내 정보 보기
      </button>
    </section>
  )
}
