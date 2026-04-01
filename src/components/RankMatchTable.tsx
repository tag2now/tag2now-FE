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
  // Within each tier: in-game rooms first, searching rooms last
  for (const [, tierRooms] of tierGroups) {
    tierRooms.sort((a, b) => (b.users?.length === 2 ? 1 : 0) - (a.users?.length === 2 ? 1 : 0))
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full min-w-85">
        <caption className="sr-only">Rank match rooms</caption>
        <colgroup>
          <col className="w-32" />
          <col />
          <col className="w-16" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="tbl-th">랭크</th>
            <th scope="col" className="tbl-th">플레이어 1</th>
            <th scope="col" className="tbl-th"></th>
            <th scope="col" className="tbl-th">플레이어 2</th>
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
                  </th>
                </tr>
                {(() => {
                  const inGameRooms = tierRooms.filter(r => r.users?.length === 2)
                  const searchingRooms = tierRooms.filter(r => r.users?.length !== 2)
                  return (
                    <>
                      {/* In-game rows — one per match */}
                      {inGameRooms.map((r) => (
                        <tr key={r.room_id} className="tbl-row" style={rowAccentStyle}>
                          <td className="tbl-td">
                            <RankImage rankInfo={r.rank_info} className="min-w-19.75 h-9 w-auto mx-auto" />
                          </td>
                          <td className="player-name">{r.users?.[0]?.online_name ?? '—'}</td>
                          <td className="tbl-td px-1">
                            <span className="inline-flex items-center text-tier-green" title="게임 중" aria-label="게임 중">
                              {IconGamepad}
                            </span>
                          </td>
                          <td className="player-name">{r.users?.[1]?.online_name ?? '—'}</td>
                        </tr>
                      ))}
                      {/* Searching row — all searchers in one row */}
                      {searchingRooms.length > 0 && (
                        <tr className="tbl-row" style={rowAccentStyle}>
                          <td colSpan={4} className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span
                                className="shrink-0 px-2 py-0.5 text-xs font-bold tracking-widest text-tier-yellow border rounded-md animate-[border-pulse_1.6s_ease-in-out_infinite]"
                              >
                                찾는 중
                              </span>
                              {searchingRooms.map((r) => (
                                <div key={r.room_id} className="flex items-center gap-1.5">
                                  <RankImage rankInfo={r.rank_info} className="h-7 w-auto" />
                                  <span className="font-bold text-sm text-txt">
                                    {r.users?.[0]?.online_name ?? '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })()}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
