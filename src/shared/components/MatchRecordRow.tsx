import { charImageUrl } from '@/shared/characterImage'
import RankImage from '@/shared/components/RankImage'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import { sideName, type MatchRecord, type RecordChar, type RecordSide } from '@/shared/matchRecords'

const kstDateTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
})

type Outcome = 'win' | 'loss'

interface Props {
  record: MatchRecord
  /** Draws the match from this player's side: theirs on the left, their result first. */
  viewer?: string
  onOpen?: (npid: string) => void
}

/** One finished rank match: both sides' names and characters, and when.
 *
 * Without a viewer the winner is on the left. With one, the viewer is, and
 * their name is not a link, since it opens the player already on screen. */
export default function MatchRecordRow({ record, viewer, onOpen }: Props) {
  const viewerLost = viewer != null && record.loser?.npid === viewer
  const [left, right] = viewerLost ? [record.loser, record.winner] : [record.winner, record.loser]
  const [leftOutcome, rightOutcome]: Outcome[] = viewerLost ? ['loss', 'win'] : ['win', 'loss']

  return (
    <li className={`record-row${viewer ? ' has-result' : ''}`}>
      {viewer && <span className={`record-result is-${leftOutcome}`}>{leftOutcome === 'win' ? '승' : '패'}</span>}
      <SideCell side={left} outcome={leftOutcome} showOutcome={!viewer} onOpen={viewer ? undefined : onOpen} />
      <span className="record-vs" aria-hidden="true">VS</span>
      <SideCell side={right} outcome={rightOutcome} showOutcome={!viewer} onOpen={onOpen} mirrored />
      <time className="record-time" dateTime={record.played_at}>
        <span>{formatTimeAgo(record.played_at)}</span>
        <small>{kstDateTime.format(new Date(record.played_at))}</small>
      </time>
    </li>
  )
}

function SideCell({ side, outcome, showOutcome, onOpen, mirrored = false }: {
  side: RecordSide | null
  outcome: Outcome
  showOutcome: boolean
  onOpen?: (npid: string) => void
  mirrored?: boolean
}) {
  const className = `record-side${mirrored ? ' is-mirrored' : ''}`
  // No room was found for this match, so who was on the other side is unknown.
  if (!side) return <span className={`${className} is-unknown`}>상대 미확인</span>

  const name = sideName(side)
  return (
    <span className={className}>
      <span className="record-side-copy">
        {onOpen
          ? <button type="button" className="record-name" onClick={() => onOpen(side.npid)} aria-label={`${name} 기록 보기`}>{name}</button>
          : <span className="record-name">{name}</span>}
        {showOutcome && <small className={`record-outcome is-${outcome}`}>{outcome === 'win' ? '승' : '패'}</small>}
      </span>
      <Chars chars={side.chars} />
    </span>
  )
}

/** Each character with the rank it went into the match at. */
function Chars({ chars }: { chars: RecordChar[] | null }) {
  // That side's save was not seen, so its characters are unknown.
  if (!chars) return <span className="record-chars is-unknown">캐릭터 미확인</span>
  return (
    <span className="record-chars">
      {chars.map((char, index) => {
        const url = charImageUrl(char.name)
        const label = char.rank ? `${char.name} (${char.rank.name})` : char.name
        return (
          <span key={index} className="record-char" title={label}>
            {url
              ? <img src={url} alt={char.name} className="char-art record-portrait" loading="lazy" />
              : <span className="record-char-name">{char.name}</span>}
            <RankImage rankInfo={char.rank} className="record-rank" />
          </span>
        )
      })}
    </span>
  )
}
