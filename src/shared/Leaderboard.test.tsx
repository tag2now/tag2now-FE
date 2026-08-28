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
  it('shows loading message when loading=true', () => {
    render(<Leaderboard loading={true} data={null} error={null} />)
    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument()
  })

  it('shows error message when error is provided', () => {
    render(<Leaderboard loading={false} data={null} error="Network failure" />)
    expect(screen.getByText('Error: Network failure')).toBeInTheDocument()
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
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Sub')).toBeInTheDocument()
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
            main_char_info: { name: 'Kazuya', rank_info: { name: 'Destroyer', tier: 'Destroyer' }, wins: 120, losses: 30 },
            sub_char_info: { name: 'Devil', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' }, wins: 80, losses: 20 },
          },
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    // Scoped to the table: the character picker above it renders a portrait
    // for every character, so an unscoped alt-text query is ambiguous.
    const table = screen.getByRole('table')
    expect(screen.getByText('1ST')).toBeInTheDocument()
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
            main_char_info: { name: 'Kazuya', rank_info: { name: 'Destroyer', tier: 'Destroyer' }, wins: 75, losses: 25 },
            sub_char_info: { name: 'Devil', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' }, wins: 60, losses: 40 },
          },
        },
      ],
    }
    render(<Leaderboard loading={false} data={data} error={null} />)

    // Win rate: 75/(75+25)=75%, 60/(60+40)=60%
    // Text is split across child elements, so use a function matcher
    const statDivs = document.querySelectorAll('.hidden.sm\\:block')
    expect(statDivs).toHaveLength(2)
    expect(statDivs[0].textContent).toContain('75')
    expect(statDivs[0].textContent).toContain('25')
    expect(statDivs[0].textContent).toContain('75%')
    expect(statDivs[1].textContent).toContain('60')
    expect(statDivs[1].textContent).toContain('40')
    expect(statDivs[1].textContent).toContain('60%')
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

  it('shows the whole board by default', () => {
    const entries = Array.from({ length: 150 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    expect(rowNames()).toHaveLength(150)
    expect(screen.getByText('150 / 150')).toBeInTheDocument()
  })

  it('collapses to the top 100 and expands back', () => {
    const entries = Array.from({ length: 150 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya'))
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: '상위 100위만' }))
    expect(rowNames()).toHaveLength(100)
    expect(screen.getByText('100 / 150')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '전체 보기' }))
    expect(rowNames()).toHaveLength(150)
  })

  it('finds a player ranked past 100 while the board is collapsed', () => {
    const entries = [
      ...Array.from({ length: 100 }, (_, i) => entry(i + 1, `player${i + 1}`, 'Kazuya')),
      entry(101, 'deepCut', 'Lili'),
    ]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)
    fireEvent.click(screen.getByRole('button', { name: '상위 100위만' }))

    fireEvent.change(screen.getByLabelText('플레이어 검색'), { target: { value: 'deepCut' } })

    expect(rowNames()).toEqual(['deepCut'])
  })

  it('filters by character across main and sub slots', () => {
    const entries = [entry(1, 'mainJin', 'Jin'), entry(2, 'subJin', 'Lili', 'Jin'), entry(3, 'noJin', 'Asuka')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Jin' }))

    expect(rowNames()).toEqual(['mainJin', 'subJin'])
  })

  it('clears the character filter when the active character is picked again', () => {
    const entries = [entry(1, 'jinMain', 'Jin'), entry(2, 'asukaMain', 'Asuka')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    const jin = screen.getByRole('button', { name: 'Filter by Jin' })
    fireEvent.click(jin)
    expect(rowNames()).toEqual(['jinMain'])

    fireEvent.click(jin)
    expect(rowNames()).toEqual(['jinMain', 'asukaMain'])
  })

  it('marks the selected character as pressed', () => {
    const entries = [entry(1, 'jinMain', 'Jin')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    const jin = screen.getByRole('button', { name: 'Filter by Jin' })
    expect(jin).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(jin)
    expect(jin).toHaveAttribute('aria-pressed', 'true')
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

    expect(screen.getByText('400')).toBeInTheDocument()
    expect(screen.queryByText('1ST')).not.toBeInTheDocument()
  })

  it('hides the collapse toggle when the board is too short to collapse', () => {
    const entries = [entry(1, 'onlyGuy', 'Jin')]
    render(<Leaderboard loading={false} data={boardOf(entries)} error={null} />)

    expect(screen.queryByRole('button', { name: '상위 100위만' })).not.toBeInTheDocument()
  })
})
