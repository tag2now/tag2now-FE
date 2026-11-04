import { charImageUrl } from '@/shared/characterImage'
import RankImage from '@/shared/components/RankImage'
import { indexOfRank } from '@/shared/ranks'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import { playerName, type MatchRecord, type RecordChar, type RecordPlayer } from '@/shared/matchRecords'

const kstDateTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
})

type Outcome = 'win' | 'loss'

const OUTCOME_LABEL: Record<Outcome, string> = { win: 'WIN', loss: 'LOSE' }

interface Props {
  record: MatchRecord
  /** The player whose profile this is: their name is not a link, since it opens the player already on screen. */
  viewer?: string
  onOpen?: (npid: string) => void
}

const opposite = (outcome: Outcome): Outcome => (outcome === 'win' ? 'loss' : 'win')

/** One finished rank match, 1P on the left and 2P on the right, facing each
 * other across a VS, with when it was played above. */
export default function MatchRecordRow({ record, viewer, onOpen }: Props) {
  const { p1, p2 } = record
  // With no room there is no 2P to name, but the result says how it went for them.
  const [leftOutcome, rightOutcome]: Outcome[] = [p1.result, opposite(p1.result)]
  const linkFor = (player: RecordPlayer | null) => (player?.npid === viewer ? undefined : onOpen)
  const playedAt = new Date(record.played_at)

  return (
    <li className="record-row">
      <div className="record-head">
        <time dateTime={record.played_at}>{kstDateTime.format(playedAt)} · {formatTimeAgo(record.played_at)}</time>
        <span>랭크 매치</span>
      </div>
      <div className="record-body">
        <PlayerHalf player={p1} outcome={leftOutcome} onOpen={linkFor(p1)} />
        {/* The result reads as one phrase in the middle: WIN VS LOSE. */}
        <span className="record-vs">
          <small className={`record-outcome is-${leftOutcome}`}>{OUTCOME_LABEL[leftOutcome]}</small>
          <span aria-hidden="true">VS</span>
          <small className={`record-outcome is-${rightOutcome}`}>{OUTCOME_LABEL[rightOutcome]}</small>
        </span>
        <PlayerHalf player={p2} outcome={rightOutcome} onOpen={linkFor(p2)} mirrored />
      </div>
    </li>
  )
}

function PlayerHalf({ player, outcome, onOpen, mirrored = false }: {
  player: RecordPlayer | null
  outcome: Outcome
  onOpen?: (npid: string) => void
  mirrored?: boolean
}) {
  const className = `record-player is-${outcome}${mirrored ? ' is-mirrored' : ''}`
  // No room was found for this match, so who was on the other side is unknown.
  if (!player) return <span className={`${className} is-unknown`}>상대 미확인</span>

  const name = playerName(player)
  return (
    <span className={className}>
      {onOpen
        ? <button type="button" className="record-name" onClick={() => onOpen(player.npid)} aria-label={`${name} 기록 보기`}>{name}</button>
        : <span className="record-name">{name}</span>}
      <Chars chars={player.chars} mirrored={mirrored} />
    </span>
  )
}

const rankOf = (char: RecordChar) => (char.rank ? indexOfRank(char.rank.name) : -1)

/** The higher rank sits by the VS, where it meets the opponent's: a match pairs
 * players by their best character. Equal ranks, and none at all, keep their order. */
function towardVs(chars: RecordChar[], mirrored: boolean): RecordChar[] {
  const direction = mirrored ? -1 : 1
  return [...chars].sort((a, b) => direction * (rankOf(a) - rankOf(b)))
}

/** Each character with the rank it went into the match at. */
function Chars({ chars, mirrored }: { chars: RecordChar[] | null; mirrored: boolean }) {
  // That player's save was not seen, so their characters are unknown.
  if (!chars) return <span className="record-chars is-unknown">캐릭터 미확인</span>
  return (
    <span className="record-chars">
      {towardVs(chars, mirrored).map((char, index) => {
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
