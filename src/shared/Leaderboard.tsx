import { useMemo, useState } from 'react'
import LoadingBar from "@/shared/components/LoadingBar";
import RankList from "@/shared/components/RankList";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import LeaderboardControls from "@/shared/components/LeaderboardControls";
import {panelStatus} from "@/shared/util/panelStatus";
import {filterEntries, tiersPresent, totals, COLLAPSED_VISIBLE, type SortKey} from "@/shared/util/leaderboardFilter";
import { getUsername } from '@/shared/util/cookie'
import {LeaderboardData} from "@/shared/types";
import { RefreshCw, Trophy } from 'lucide-react'
import { TableSkeleton } from '@/shared/components/Skeleton'

interface LeaderboardProps {
  data: LeaderboardData | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
}

export default function Leaderboard({ data, loading, refreshing, error, onRefresh }: LeaderboardProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [character, setCharacter] = useState('')
  const [tier, setTier] = useState('')
  const [sort, setSort] = useState<SortKey>('rank')
  // Collapsed by default. Expanded, 344 rows made the page ~27,000px tall — a
  // scrollbar thumb a few pixels high, and nobody reads to 344th place from the
  // top. The control to see everything is right there in the toolbar, and any
  // search or character filter shows its full result regardless.
  const [collapsed, setCollapsed] = useState(true)

  const entries = data?.entries ?? []
  const visible = useMemo(
    () => filterEntries(entries, { search, character, tier, sort, collapsed }),
    [entries, search, character, tier, sort, collapsed],
  )
  const tiers = useMemo(() => tiersPresent(entries), [entries])
  // Finding yourself on a 344-row board meant scrolling or typing your own name
  // from memory. The row is marked instead, so it is visible the moment it is.
  const me = getUsername()

  const s = panelStatus(loading, error, {
    loadingMsg: '랭킹을 불러오는 중',
    onRetry: onRefresh,
    skeleton: <TableSkeleton rows={10} columns={5} label="랭킹을 불러오는 중" />,
  })
  if (s) return s
  if (!data) return null

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Trophy size={15} aria-hidden="true" /></span>
          <div><h3>전체 랭킹</h3><p>등록 플레이어 {data.total_records}명</p><span className="sr-only">Total records: {data.total_records}</span></div>
        </div>
        {onRefresh && (
          <button className="refresh-btn" aria-label="새로고침" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <LeaderboardControls
        search={search}
        onSearchChange={setSearch}
        character={character}
        onCharacterChange={setCharacter}
        tier={tier}
        onTierChange={setTier}
        tiers={tiers}
        sort={sort}
        onSortChange={setSort}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        collapsible={entries.length > COLLAPSED_VISIBLE}
        filtering={search.trim() !== '' || character !== '' || tier !== ''}
        shown={visible.length}
        total={entries.length}
      />
      {/* The home page's summary rows, at full length. This board was a
          <table> of its own shape, 통계 had a six-column one, and the home
          page had a grid --- three renderings of the same five facts about
          the same players. The home row is the one they all take. */}
      <RankList
        rows={visible.map((e) => {
          const total = totals(e)
          return {
            key: e.np_id,
            npid: e.np_id,
            name: e.online_name,
            // The true rank, not the row: a filtered view must not award a
            // medal to whoever happens to land in the top rows.
            rank: e.rank,
            detail: total.winRate === null ? undefined : `${Math.round(total.winRate * 100)}%`,
            detailSub: total.winRate === null ? undefined : `${total.matches}판`,
            detailEmpty: total.winRate === null ? '기록 없음' : undefined,
            mainChar: e.player_info?.main_char_info,
            subChar: e.player_info?.sub_char_info,
            isMe: me != null && e.online_name === me,
          }
        })}
        label="전체 랭킹"
        detailLabel="전적"
        emptyMsg="검색 결과가 없습니다"
        onSelect={setSelectedNpid}
      />
      {selectedNpid && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={data?.entries.find(e => e.np_id === selectedNpid)} leaderboardEntries={data?.entries} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
}
