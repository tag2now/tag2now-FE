import { Fragment } from 'react'
import { TIER_STYLES, TIER_HEX } from '@/shared/tierColors'
import type { CSSProperties } from 'react'
import type { Room } from '@/types'
import RankImage from './RankImage'

const IconGamepad = (
  <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/>
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>
  </svg>
)

interface RankMatchTableProps {
  rooms: Room[]
}

export default function RankMatchTable({ rooms }: RankMatchTableProps) {
  const sorted = [...rooms].sort((a, b) => (a.rank_info?.id ?? 0) - (b.rank_info?.id ?? 0)).reverse()
  const tierGroups: [string, Room[]][] = []
  const seen = new Map<string, Room[]>()
  for (const r of sorted) {
    const tier = r.rank_info?.tier ?? '—'
    if (!seen.has(tier)) { seen.set(tier, []); tierGroups.push([tier, seen.get(tier)!]) }
    seen.get(tier)!.push(r)
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full min-w-85">
        <caption className="sr-only">Rank match rooms</caption>
        <thead>
          <tr>
            <th scope="col" className="tbl-th w-4/20">Rank</th>
            <th scope="col" className="tbl-th w-7/20 text-left pl-4">Player 1</th>
            <th scope="col" className="tbl-th w-2/20"></th>
            <th scope="col" className="tbl-th w-7/20 text-left pl-4">Player 2</th>
          </tr>
        </thead>
        <tbody>
          {tierGroups.map(([tier, tierRooms]) => {
            const hex = TIER_HEX[tier]
            const separatorStyle: CSSProperties = hex
              ? { ...TIER_STYLES[tier], borderLeft: `3px solid ${hex}`, background: `${hex}12` }
              : TIER_STYLES[tier]
            const rowAccentStyle: CSSProperties = hex
              ? { borderLeft: `2px solid ${hex}28` }
              : {}
            return (
              <Fragment key={tier}>
                <tr className="tier-separator">
                  <th scope="colgroup" colSpan={4}
                    className="tier-heading py-1.5 px-3 text-left"
                    style={separatorStyle}
                  >
                    <span className="tracking-widest">{tier}</span>
                    <span className="ml-2 text-xs font-normal opacity-50">
                      {tierRooms.length} room{tierRooms.length !== 1 ? 's' : ''}
                    </span>
                  </th>
                </tr>
                {tierRooms.map((r) => {
                  const inGame = r.users?.length === 2
                  return (
                    <tr key={r.room_id} className="tbl-row" style={rowAccentStyle}>
                      <td className="tbl-td">
                        <RankImage rankInfo={r.rank_info} className="min-w-19.75 h-9 w-auto mx-auto" />
                      </td>
                      <td className="player-name text-left pl-4">
                        {r.users?.[0]?.online_name ?? '—'}
                      </td>
                      <td className="tbl-td px-1">
                        {inGame ? (
                          <span
                            className="inline-flex items-center text-tier-green"
                            title="게임 중"
                            aria-label="게임 중"
                          >
                            {IconGamepad}
                          </span>
                        ) : (
                          <span
                            className="inline-block text-xs font-black tracking-[0.1em] text-tier-yellow animate-[blink_1.6s_ease-in-out_infinite]"
                            title="찾는 중"
                            aria-label="찾는 중"
                          >
                            VS
                          </span>
                        )}
                      </td>
                      <td className="player-name text-left pl-4">
                        {r.users?.[1]?.online_name ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
