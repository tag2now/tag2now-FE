import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import PlayerRecordsSection from '@/shared/components/PlayerRecordsSection'
import { fetchPlayerRecords } from '@/shared/matchRecordsApi'
import { AppError } from '@/shared/util/AppError'
import type { MatchRecord, PlayerRecordPage, RecordSide } from '@/shared/matchRecords'

vi.mock('@/shared/matchRecordsApi', () => ({ fetchPlayerRecords: vi.fn(), fetchMatchRecords: vi.fn() }))

const ranked = (name: string, rank: string) => ({ name, rank: { name: rank, tier: '파랑단' } })
const ALICE: RecordSide = { npid: 'alice', online_name: 'Alice', chars: [ranked('Jin', 'Yaksa'), ranked('Devil Jin', 'Raijin')] }
const BOB: RecordSide = { npid: 'bob', online_name: 'Bob', chars: [ranked('Kazuya', 'Vanquisher'), ranked('Heihachi', 'Destroyer')] }

const match = (id: number, winner: RecordSide | null, loser: RecordSide | null): MatchRecord =>
  ({ id, played_at: new Date(Date.now() - 5 * 60_000).toISOString(), winner, loser })

const page = (matches: MatchRecord[], next_before: number | null = null): PlayerRecordPage =>
  ({ npid: 'alice', wins: 1, losses: 1, matches, next_before })

const section = () => screen.getByRole('region', { name: '전적' })
const rows = () => within(section()).getAllByRole('listitem')

beforeEach(() => {
  vi.mocked(fetchPlayerRecords).mockReset()
})

describe('PlayerRecordsSection', () => {
  it("shows the totals and each match from the player's side, their result first", async () => {
    vi.mocked(fetchPlayerRecords).mockResolvedValue(page([match(2, ALICE, BOB), match(1, BOB, ALICE)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByText('2판 1승 1패')).toBeInTheDocument()
    expect(rows().map((row) => row.firstElementChild?.textContent)).toEqual(['승', '패'])
    // The player is on the left both times, whichever side of the match they were.
    for (const row of rows()) expect(within(row).getAllByText(/Alice|Bob/).map((n) => n.textContent)).toEqual(['Alice', 'Bob'])
    expect(fetchPlayerRecords).toHaveBeenCalledWith('alice', null)
  })

  it('draws each character with the rank it went in at', async () => {
    vi.mocked(fetchPlayerRecords).mockResolvedValue(page([match(1, ALICE, BOB)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    const row = (await within(section()).findAllByRole('listitem'))[0]
    expect(within(row).getAllByRole('img').map((img) => img.getAttribute('alt')))
      .toEqual(['Jin', 'Yaksa', 'Devil Jin', 'Raijin', 'Kazuya', 'Vanquisher', 'Heihachi', 'Destroyer'])
  })

  it('shows portraits alone for a match recorded before ranks were kept', async () => {
    const unranked: RecordSide = { ...BOB, chars: [{ name: 'Kazuya', rank: null }, { name: 'Heihachi', rank: null }] }
    vi.mocked(fetchPlayerRecords).mockResolvedValue(page([match(1, ALICE, unranked)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    const row = (await within(section()).findAllByRole('listitem'))[0]
    expect(within(row).getAllByRole('img').map((img) => img.getAttribute('alt')).slice(4)).toEqual(['Kazuya', 'Heihachi'])
  })

  it('says what is unknown: characters without a save, an opponent without a room', async () => {
    vi.mocked(fetchPlayerRecords).mockResolvedValue(page([match(2, ALICE, { ...BOB, chars: null }), match(1, null, ALICE)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    await within(section()).findAllByRole('listitem')
    expect(within(rows()[0]).getByText('캐릭터 미확인')).toBeInTheDocument()
    expect(within(rows()[1]).getByText('상대 미확인')).toBeInTheDocument()
  })

  it("opens the opponent, never the player already on screen", async () => {
    const onOpen = vi.fn()
    vi.mocked(fetchPlayerRecords).mockResolvedValue(page([match(1, ALICE, BOB)]))
    render(<PlayerRecordsSection npid="alice" onOpen={onOpen} />)

    fireEvent.click(await within(section()).findByRole('button', { name: 'Bob 기록 보기' }))
    expect(onOpen).toHaveBeenCalledWith('bob')
    expect(within(section()).queryByRole('button', { name: 'Alice 기록 보기' })).not.toBeInTheDocument()
  })

  it('appends the next page from the last id shown', async () => {
    vi.mocked(fetchPlayerRecords)
      .mockResolvedValueOnce(page([match(9, ALICE, BOB)], 9))
      .mockResolvedValueOnce(page([match(4, BOB, ALICE)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    fireEvent.click(await within(section()).findByRole('button', { name: '더 보기' }))
    expect(await within(section()).findByText('패')).toBeInTheDocument()
    expect(rows()).toHaveLength(2)
    expect(fetchPlayerRecords).toHaveBeenLastCalledWith('alice', 9)
    expect(within(section()).queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
  })

  it('keeps what it has when the next page fails, and offers it again', async () => {
    vi.mocked(fetchPlayerRecords)
      .mockResolvedValueOnce(page([match(9, ALICE, BOB)], 9))
      .mockRejectedValueOnce(new AppError('서버 오류', 502))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    fireEvent.click(await within(section()).findByRole('button', { name: '더 보기' }))
    expect(await within(section()).findByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(within(section()).getByRole('alert')).toHaveTextContent('더 불러오지 못했습니다')
    expect(rows()).toHaveLength(1)
  })

  it('says so when the player has no recorded match', async () => {
    vi.mocked(fetchPlayerRecords).mockResolvedValue({ ...page([]), wins: 0, losses: 0 })
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByText('기록된 랭크 매치가 아직 없습니다.')).toBeInTheDocument()
  })

  it('reports a failed read in the section alone', async () => {
    vi.mocked(fetchPlayerRecords).mockRejectedValue(new AppError('서버 오류', 502))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByRole('alert')).toHaveTextContent('전적을 불러오지 못했습니다')
  })
})
