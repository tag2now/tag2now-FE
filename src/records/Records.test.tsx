import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import Records from '@/records/Records'
import { fetchMatchRecords } from '@/shared/matchRecordsApi'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { GET } from '@/shared/util/api'
import { AppError } from '@/shared/util/AppError'
import type { MatchRecord, MatchRecordPage, RecordSide } from '@/shared/matchRecords'

vi.mock('@/shared/matchRecordsApi', () => ({ fetchMatchRecords: vi.fn() }))
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))
vi.mock('@/shared/util/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/util/api')>('@/shared/util/api')
  return { ...actual, GET: vi.fn() }
})

const side = (npid: string, online_name: string | null, result: RecordSide['result']): RecordSide =>
  ({ npid, online_name, result, chars: [{ name: 'Jin', rank: { name: 'Yaksa', tier: '파랑단' } }] })

/** 1P, then 2P. */
const match = (id: number, p1: RecordSide, p2: RecordSide | null): MatchRecord =>
  ({ id, played_at: new Date().toISOString(), p1, p2 })

const page = (matches: MatchRecord[], next_before: number | null = null): MatchRecordPage => ({ matches, next_before })

const list = () => screen.getByRole('list', { name: '전체 전적' })
const search = () => screen.getByLabelText('플레이어 검색')

beforeEach(() => {
  vi.mocked(fetchMatchRecords).mockReset().mockResolvedValue(page([
    match(2, side('alice', 'Alice', 'win'), side('bob', 'Bob', 'loss')),
    match(1, side('carol', null, 'loss'), side('alice', 'Alice', 'win')),
  ]))
  vi.mocked(fetchPlayerSave).mockReset().mockRejectedValue(new AppError('none', 404))
  vi.mocked(GET).mockReset().mockResolvedValue({
    npid: 'bob', days_active: 1, times_seen: 1, first_seen: null, last_seen: null,
    room_type_counts: {}, top_played_with: [], active_hours: [],
  })
})

describe('Records', () => {
  it('lists everyone\'s matches 1P first, the result beside the VS, a missing name shown as the id', async () => {
    render(<Records />)

    const rows = await within(await screen.findByRole('list', { name: '전체 전적' })).findAllByRole('listitem')
    expect(rows.map((row) => within(row).getAllByText(/^(Alice|Bob|carol|WIN|LOSE)$/).map((node) => node.textContent))).toEqual([
      ['Alice', 'WIN', 'LOSE', 'Bob'],
      ['carol', 'LOSE', 'WIN', 'Alice'],
    ])
    expect(fetchMatchRecords).toHaveBeenCalledWith({ q: '' }, null)
  })

  it('asks for a name once the reader stops typing, not on every letter', async () => {
    render(<Records />)
    await screen.findByRole('list', { name: '전체 전적' })

    fireEvent.change(search(), { target: { value: 'b' } })
    fireEvent.change(search(), { target: { value: 'bo' } })
    await waitFor(() => expect(fetchMatchRecords).toHaveBeenLastCalledWith({ q: 'bo' }, null))
    expect(fetchMatchRecords).not.toHaveBeenCalledWith({ q: 'b' }, null)
  })

  it('says whose matches it could not find', async () => {
    render(<Records />)
    await screen.findByRole('list', { name: '전체 전적' })
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([]))

    fireEvent.change(search(), { target: { value: 'nobody' } })
    expect(await screen.findByText("'nobody'의 전적이 없습니다")).toBeInTheDocument()
  })

  it('loads the next page under the first', async () => {
    vi.mocked(fetchMatchRecords)
      .mockResolvedValueOnce(page([match(9, side('alice', 'Alice', 'win'), side('bob', 'Bob', 'loss'))], 9))
      .mockResolvedValueOnce(page([match(3, side('bob', 'Bob', 'win'), side('alice', 'Alice', 'loss'))]))
    render(<Records />)

    fireEvent.click(await screen.findByRole('button', { name: '더 보기' }))
    await waitFor(() => expect(within(list()).getAllByRole('listitem')).toHaveLength(2))
    expect(fetchMatchRecords).toHaveBeenLastCalledWith({ q: '' }, 9)
  })

  it('offers a retry when the list fails, keeping the search field', async () => {
    vi.mocked(fetchMatchRecords).mockRejectedValueOnce(new AppError('서버 오류', 502))
    render(<Records />)

    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('list', { name: '전체 전적' })).toBeInTheDocument()
    expect(search()).toBeInTheDocument()
  })

  it("opens a player's profile from their name", async () => {
    render(<Records />)

    fireEvent.click((await screen.findAllByRole('button', { name: 'Bob 기록 보기' }))[0])
    expect(await screen.findByRole('dialog')).toHaveTextContent('bob')
  })
})
