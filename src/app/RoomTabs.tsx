import { useNavigate } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { pathOf } from '@/config/routes'
import { formatGroupName } from '@/config/tabConfig'
import type { Room } from '@/match/types'

interface RoomTabsProps {
  activeTab: string
  groupKeys: string[]
  groups: Record<string, Room[]>
  loaded: boolean
}

// A pending or failed first load has no count. After a successful load, an
// omitted group really is empty.
function roomCountLabel(rooms: Room[] | undefined, loaded: boolean): string {
  if (!loaded) return '—'
  return String(rooms?.length ?? 0)
}

export default function RoomTabs({ activeTab, groupKeys, groups, loaded }: RoomTabsProps) {
  const navigate = useNavigate()

  return (
    <nav className="room-tabs" role="tablist" aria-label="매칭 종류 선택">
      <span className="room-tabs-label">매칭 종류</span>
      <div>
        {groupKeys.map((key) => (
          <button
            key={key}
            role="tab"
            aria-label={`${formatGroupName(key)} (${roomCountLabel(groups[key], loaded)})`}
            id={`tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`tabpanel-${key}`}
            tabIndex={activeTab === key ? 0 : -1}
            onClick={() => navigate(pathOf(key))}
            className={activeTab === key ? 'active' : ''}
          >
            <Swords size={14} aria-hidden="true" />
            {formatGroupName(key)}
            <span>{roomCountLabel(groups[key], loaded)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
