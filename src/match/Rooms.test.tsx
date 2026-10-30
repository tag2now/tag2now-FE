import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Rooms from "@/match/Rooms";
import type {RoomsData} from "@/match/types";

describe('Rooms', () => {
  // The first load shows a skeleton shaped like the table, so the announcement
  // is the sr-only status rather than visible text — the placeholder holds the
  // height the rows will take instead of collapsing the panel to one line.
  it('announces the first load and reserves the table height', () => {
    render(<Rooms loading={true} data={null} error={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('방 목록을 불러오는 중')
    expect(document.querySelectorAll('.skeleton-row').length).toBeGreaterThan(1)
  })

  it('shows error message when error is provided', () => {
    render(<Rooms loading={false} data={null} error="Connection refused" />)
    expect(screen.getByText('Connection refused')).toBeInTheDocument()
  })

  it('renders nothing when data is null and not loading', () => {
    const { container } = render(<Rooms loading={false} data={null} error={null} />)
    expect(container.firstChild).toBeNull()
  })

  // The empty state names the mode it is empty *for*, and says the page is
  // still watching — a live tab with a blank list otherwise leaves the reader
  // unsure whether to wait or to reload.
  it('names the mode and says the list keeps watching when there are no rooms', () => {
    const data = { groups: { rank_match: [] } }
    render(<Rooms loading={false} data={data} error={null} groupKey="rank_match" />)
    expect(screen.getByRole('status')).toHaveTextContent('지금 열린 랭매 방이 없습니다')
    expect(screen.getByRole('status')).toHaveTextContent('5초마다')
  })

  it('renders PlayerMatchTable when groupKey is not rank_match', () => {
    const data: Pick<RoomsData, 'groups'> = {
      groups: { player_match: [
        {
          room_id: 1,
          owner_online_name: 'Alice',
          rank_info: null,
          users: [{ online_name: 'Alice', np_id: 'Alice', avatar_url: '' }],
        },
      ] },
    }
    render(<Rooms loading={false} data={data} error={null} />)
    expect(screen.getByRole('columnheader', { name: '호스트' })).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders RankMatchTable when groupKey is rank_match', () => {
    const data: Pick<RoomsData, 'groups'> = {
      groups: { rank_match: [
        {
          room_id: 1,
          rank_info: { id: 1, name: '1st 나무단', tier: '나무단' },
          users: [{ online_name: 'A', np_id: 'a', avatar_url: '' }, { online_name: 'B', np_id: 'b', avatar_url: '' }],
        },
      ] },
    }
    render(<Rooms loading={false} data={data} error={null} groupKey="rank_match" />)
    expect(screen.getByTitle('게임 중')).toBeInTheDocument()
  })

  it('shows an empty list when the selected group is absent', () => {
    const data = { groups: {} }
    render(<Rooms loading={false} data={data} error={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('방이 없습니다')
  })

  it('shows loading bar when refreshing=true', () => {
    const data = { groups: { player_match: [] } }
    const { container } = render(<Rooms loading={false} refreshing={true} data={data} error={null} />)
    const bar = container.querySelector('.loading-bar')
    expect(bar).toBeInTheDocument()
    expect(bar).not.toHaveClass('loading-bar-hidden')
  })

  it('hides loading bar when refreshing=false', () => {
    const data = { groups: { player_match: [] } }
    const { container } = render(<Rooms loading={false} refreshing={false} data={data} error={null} />)
    expect(container.querySelector('.loading-bar')).toHaveClass('loading-bar-hidden')
  })

  it('renders only the selected group, including a custom group', () => {
    const data: Pick<RoomsData, 'groups'> = {
      groups: {
        rank_match: [{ room_id: 1, rank_info: { id: 1, name: '1st dan', tier: '나무단' }, users: [{ np_id: 'rank', online_name: 'RankPlayer', avatar_url: '' }] }],
        custom_mode: [{ room_id: 2, users: [{ np_id: 'custom', online_name: 'CustomPlayer', avatar_url: '' }] }],
      },
    }
    const view = render(<Rooms loading={false} data={data} error={null} groupKey="rank_match" />)
    expect(screen.getByText('RankPlayer')).toBeInTheDocument()
    expect(screen.queryByText('CustomPlayer')).not.toBeInTheDocument()

    view.rerender(<Rooms loading={false} data={data} error={null} groupKey="custom_mode" />)
    expect(screen.getByText('CustomPlayer')).toBeInTheDocument()
    expect(screen.queryByText('RankPlayer')).not.toBeInTheDocument()
  })
})
