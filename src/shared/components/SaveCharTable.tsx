import RankImage from '@/shared/components/RankImage'
import { charImageUrl } from '@/shared/characterImage'
import { byRank, faceOf, signed, type SaveChar } from '@/shared/saveChars'

/** A character's portrait; the name stays as its alt text and tooltip. */
export function SavePortrait({ name }: { name: string }) {
  const url = charImageUrl(name)
  if (!url) return <span>{name}</span>
  return <img src={url} alt={name} title={name} className="char-art save-portrait" loading="lazy" />
}

/** A rank's banner by name. RankImage draws a plate for ranks with no art. */
export const SaveRank = ({ name }: { name: string }) => <RankImage rankInfo={{ name }} className="save-rank" />

/** A save's characters, highest rank first: portrait, rank, points, streak and
 * record. The admin page and every profile draw the same table. */
export default function SaveCharTable({ chars }: { chars: SaveChar[] }) {
  return (
    <div className="save-table-wrap">
      <table className="save-table">
        <thead>
          <tr>
            <th scope="col" className="save-art">캐릭터</th>
            <th scope="col" className="save-art">계급</th>
            <th scope="col">점수</th>
            <th scope="col">연승</th>
            <th scope="col">전적</th>
          </tr>
        </thead>
        <tbody>
          {[...chars].sort(byRank).map((char) => (
            <tr key={char.id}>
              <td className="save-art"><SavePortrait name={faceOf(char)} /></td>
              <td className="save-art"><SaveRank name={char.rank_name} /></td>
              <td>{char.points}</td>
              <td>{signed(char.streak)}</td>
              <td>{char.wins}승 {char.losses}패</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
