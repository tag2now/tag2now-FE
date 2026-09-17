import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import Leaderboard from "@/shared/Leaderboard";

const entry = (rank: number, online_name: string, main?: string, sub?: string) => ({
  np_id: `p${rank}`,
  rank,
  online_name,
  player_info: {
    main_char_info: main ? { name: main } : null,
    sub_char_info: sub ? { name: sub } : null,
  },
})

const boardOf = (entries: ReturnType<typeof entry>[]) => ({ total_records: entries.length, entries })

const rowNames = () =>
  Array.from(document.querySelectorAll('.player-btn')).map((b) => b.textContent)

describe('Leaderboard', () => {
  it('announces the first load and reserves the table height', () => {
    render(<Leaderboard loading={true} data={null} error={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('랭킹을 불러오는 중')
    expect(document.querySelectorAll('.skeleton-row').length).toBeGreaterThan(1)
  })

  it('shows error message when error is provided', () => {
    render(<Leaderboard loading={false} data={null} error="Network failure" />)
    expect(screen.getByText('Network failure')).toBeInTheDocument()
  })

  it('renders nothing when data is null and not loading', () => {
    const { container } = render(<Leaderboard loading={false} data={null} error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders total_records and table headers when data is provided', () => {
    const data = {
      total_records: 42,
      entries: [],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    expect(screen.getByText('Total records: 42')).toBeInTheDocument()
    // An empty board shows the empty state, not a set of headings over
    // nothing — the list is the same one the home page draws, and it says so
    // the same way.
    expect(screen.queryByRole('columnheader', { name: 'Player' })).not.toBeInTheDocument()
    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
  })

  it('heads the columns once it has rows to put under them', () => {
    const data = {
      total_records: 1,
      entries: [{ np_id: 'p1', rank: 1, online_name: 'Solo', player_info: null }],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    const headings = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headings).toEqual(['#', 'Player', '전적', 'Main', 'Sub'])
  })

  it('renders each entry row with rank, name, chars', () => {
    const data = {
      total_records: 1,
      entries: [
        {
          np_id: 'player1',
          rank: 1,
          online_name: 'KazuyaFan',
          player_info: {
            main_char_info: { name: 'Kazuya', rank_info: { name: 'Destroyer', tier: '주황단' }, wins: 120, losses: 30 },
            sub_char_info: { name: 'Devil', rank_info: { name: 'Vanquisher', tier: '주황단' }, wins: 80, losses: 20 },
          },
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    // Scoped to the table: the character picker above it renders a portrait
    // for every character, so an unscoped alt-text query is ambiguous.
    const table = screen.getByRole('table')
    // The position is the number at every rank — the podium is marked by
    // colour, not by a different word in a different box.
    expect(within(table).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('KazuyaFan')).toBeInTheDocument()
    expect(within(table).getByAltText('Kazuya')).toBeInTheDocument()
    expect(within(table).getByAltText('Destroyer')).toBeInTheDocument()
    expect(within(table).getByAltText('Vanquisher')).toBeInTheDocument()
  })

  it('shows em-dash when player_info is missing', () => {
    const data = {
      total_records: 1,
      entries: [
        {
          np_id: 'player2',
          rank: 2,
          online_name: 'NoInfo',
          player_info: null,
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    // Both main and sub should show the em-dash fallback
    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(2)
  })

  it('shows em-dash when char info is missing from player_info', () => {
    const data = {
      total_records: 1,
      entries: [
        {
          np_id: 'player3',
          rank: 3,
          online_name: 'NoChars',
          player_info: {
            main_char_info: null,
            sub_char_info: null,
          },
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(2)
  })

  it('renders win/loss stats for characters', () => {
    const data = {
      total_records: 1,
      entries: [
        {
          np_id: 'player1',
          rank: 1,
          online_name: 'StatPlayer',
          player_info: {
            main_char_info: { name: 'Kazuya', rank_info: { name: 'Destroyer', tier: '주황단' }, wins: 75, losses: 25 },
            sub_char_info: { name: 'Devil', rank_info: { name: 'Vanquisher', tier: '주황단' }, wins: 60, losses: 40 },
          },
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    // Win rate: 75/(75+25)=75%, 60/(60+40)=60%
    // The same cell the home page's rows draw: this board and the summary of
    // it are one component now, so the record cannot differ between them.
    const records = document.querySelectorAll('.mini-char-record')
    expect(records).toHaveLength(2)
    expect(records[0].textContent).toContain('75')
    expect(records[0].textContent).toContain('25')
    expect(records[0].textContent).toContain('75%')
    expect(records[1].textContent).toContain('60')
    expect(records[1].textContent).toContain('40')
    expect(records[1].textContent).toContain('60%')
  })

  it('shows loading bar when refreshing=true', () => {
    const data = { total_records: 0, entries: [] }
    const { container } = render(<Leaderboard loading={false} refreshing={true} data={data} error={null} />)
    const bar = container.querySelector('.loading-bar')
    expect(bar).toBeInTheDocument()
    expect(bar).not.toHaveClass('loading-bar-hidden')
  })

  it('hides loading bar when refreshing=false', () => {
    const data = { total_records: 0, entries: [] }
    const { container } = render(<Leaderboard loading={false} refreshing={false} data={data} error={null} />)
    expect(container.querySelector('.loading-bar')).toHaveClass('loading-bar-hidden')
  })

  // Opens collapsed: 344 live entries rendered at once made the page ~27,000px
  // tall. The toolbar's toggle is what reaches the tail, and it is one click.
  it('opens on the top 100 rather than the whole board', () => {
    const entries = Array.from({ length: 150 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    expect(rowNames()).toHaveLength(100)
    expect(screen.getByText('100 / 150')).toBeInTheDocument()
  })

  it('expands to the whole board and collapses back', () => {
    const entries = Array.from({ length: 150 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: '전체 보기' }))
    expect(rowNames()).toHaveLength(150)
    expect(screen.getByText('150 / 150')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '상위 100위만' }))
    expect(rowNames()).toHaveLength(100)
  })

  it('finds a player ranked past 100 while the board is collapsed', () => {
    const entries = [
      ...Array.from({ length: 100 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya')),
      entry(101, 'deepCut', 'Lili'),
    ]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    // Already collapsed, so 101st place is off the board until the search runs.
    fireEvent.change(screen.getByLabelText('플레이어 검색'), { target: { value: 'deepCut' } })

    expect(rowNames()).toEqual(['deepCut'])
  })

  // The 60-portrait grid is folded behind a disclosure now — it used to open
  // the page — so reaching a tile means opening it first.
  const openCharacterPicker = () => fireEvent.click(screen.getByRole('button', { name: /^캐릭터 필터/ }))

  it('filters by character across main and sub slots', () => {
    const entries = [entry(1, 'mainJin', 'Jin'), entry(2, 'subJin', 'Lili', 'Jin'), entry(3, 'noJin', 'Asuka')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    openCharacterPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Jin' }))

    expect(rowNames()).toEqual(['mainJin', 'subJin'])
  })

  it('clears the character filter when the active character is picked again', () => {
    const entries = [entry(1, 'jinMain', 'Jin'), entry(2, 'asukaMain', 'Asuka')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    openCharacterPicker()
    const jin = screen.getByRole('button', { name: 'Jin' })
    fireEvent.click(jin)
    expect(rowNames()).toEqual(['jinMain'])

    fireEvent.click(jin)
    expect(rowNames()).toEqual(['jinMain', 'asukaMain'])
  })

  // With the grid folded away, clicking the tile again is no longer a reachable
  // way to deselect, so the toolbar carries its own clear.
  it('clears the character filter from the toolbar without reopening the grid', () => {
    const entries = [entry(1, 'jinMain', 'Jin'), entry(2, 'asukaMain', 'Asuka')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    openCharacterPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Jin' }))
    openCharacterPicker()
    expect(rowNames()).toEqual(['jinMain'])

    fireEvent.click(screen.getByRole('button', { name: 'Jin 필터 해제' }))
    expect(rowNames()).toEqual(['jinMain', 'asukaMain'])
  })

  it('names the active character on the control that opens the grid', () => {
    const entries = [entry(1, 'jinMain', 'Jin')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    openCharacterPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Jin' }))

    expect(screen.getByRole('button', { name: 'Jin' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '캐릭터 필터: Jin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jin 필터 해제' })).toBeInTheDocument()
  })

  it('shows an empty-result message when nothing matches', () => {
    const entries = [entry(1, 'onlyGuy', 'Jin')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.change(screen.getByLabelText('플레이어 검색'), { target: { value: 'nobody' } })

    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
    expect(rowNames()).toEqual([])
  })

  it('hides the collapse toggle while a filter is active', () => {
    const entries = Array.from({ length: 150 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.change(screen.getByLabelText('플레이어 검색'), { target: { value: 'player1' } })

    expect(screen.queryByRole('button', { name: '상위 100위만' })).not.toBeInTheDocument()
  })

  it('awards medals by true rank, not by row position in a filtered view', () => {
    const entries = [entry(1, 'champ', 'Jin'), entry(2, 'second', 'Jin'), entry(400, 'lowRanked', 'Lili')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.change(screen.getByLabelText('플레이어 검색'), { target: { value: 'lowRanked' } })

    // A filtered view keeps true ranks, so the 400th shows 400 and no podium
    // colour is awarded to whoever lands in the top row.
    expect(screen.getByText('400')).toBeInTheDocument()
    expect(document.querySelector('.rank-no.is-podium')).not.toBeInTheDocument()
  })

  it('hides the collapse toggle when the board is too short to collapse', () => {
    const entries = [entry(1, 'onlyGuy', 'Jin')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    expect(screen.queryByRole('button', { name: '상위 100위만' })).not.toBeInTheDocument()
  })
})
