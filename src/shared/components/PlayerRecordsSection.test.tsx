import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PlayerRecordsSection from '@/shared/components/PlayerRecordsSection'
import { fetchMatchRecords } from '@/shared/matchRecordsApi'
import { fetchPlayerSave } from '@/shared/playerSaveApi'
import { AppError } from '@/shared/util/AppError'
import type { MatchRecord, MatchRecordPage, RecordSide } from '@/shared/matchRecords'
import type { PlayerSave } from '@/shared/saveChars'

vi.mock('@/shared/matchRecordsApi', () => ({ fetchMatchRecords: vi.fn() }))
vi.mock('@/shared/playerSaveApi', () => ({ fetchPlayerSave: vi.fn() }))

const ranked = (name: string, rank: string) => ({ name, rank: { name: rank, tier: '파랑단' } })
const ALICE: RecordSide = { npid: 'alice', online_name: 'Alice', result: 'win', chars: [ranked('Jin', 'Yaksa'), ranked('Devil Jin', 'Raijin')] }
const BOB: RecordSide = { npid: 'bob', online_name: 'Bob', result: 'loss', chars: [ranked('Kazuya', 'Vanquisher'), ranked('Heihachi', 'Destroyer')] }
const lost = (side: RecordSide): RecordSide => ({ ...side, result: 'loss' })
const won = (side: RecordSide): RecordSide => ({ ...side, result: 'win' })

/** 1P, then 2P. */
const match = (id: number, p1: RecordSide, p2: RecordSide | null): MatchRecord =>
  ({ id, played_at: new Date(Date.now() - 5 * 60_000).toISOString(), p1, p2 })

const page = (matches: MatchRecord[], next_before: number | null = null): MatchRecordPage => ({ matches, next_before })

const SAVE: PlayerSave = { username: 'alice', saved_at: '2026-11-03T00:00:00Z', account_rank: 20, total: 15, wins: 10, losses: 5, chars: [] }

const section = () => screen.getByRole('region', { name: '전적' })
const rows = () => within(section()).getAllByRole('listitem')

beforeEach(() => {
  vi.mocked(fetchMatchRecords).mockReset()
  vi.mocked(fetchPlayerSave).mockReset().mockResolvedValue(SAVE)
})

describe('PlayerRecordsSection', () => {
  it("shows the save's lifetime record and each match as the game seated it, the result beside the VS", async () => {
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(2, ALICE, BOB), match(1, lost(BOB), won(ALICE))]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByText('15판 10승 5패')).toBeInTheDocument()
    expect(fetchPlayerSave).toHaveBeenCalledWith('alice')
    await within(section()).findAllByRole('listitem')
    // 1P stays on the left on the player's own profile too, so a match looks the same wherever it is read.
    const seats = rows().map((row) => within(row).getAllByText(/^(Alice|Bob|WIN|LOSE)$/).map((node) => node.textContent))
    expect(seats).toEqual([['Alice', 'WIN', 'LOSE', 'Bob'], ['Bob', 'LOSE', 'WIN', 'Alice']])
    expect(fetchMatchRecords).toHaveBeenCalledWith({ npid: 'alice' }, null)
  })

  it('draws each character with the rank it went in at, the higher by the VS on both sides', async () => {
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(1, ALICE, BOB)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    const row = (await within(section()).findAllByRole('listitem'))[0]
    // Yaksa outranks Raijin and Destroyer outranks Vanquisher, so those two meet at the VS.
    expect(within(row).getAllByRole('img').map((img) => img.getAttribute('alt')))
      .toEqual(['Devil Jin', 'Raijin', 'Jin', 'Yaksa', 'Heihachi', 'Destroyer', 'Kazuya', 'Vanquisher'])
  })

  it('shows portraits alone for a match recorded before ranks were kept', async () => {
    const unranked: RecordSide = { ...BOB, chars: [{ name: 'Kazuya', rank: null }, { name: 'Heihachi', rank: null }] }
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(1, ALICE, unranked)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    const row = (await within(section()).findAllByRole('listitem'))[0]
    expect(within(row).getAllByRole('img').map((img) => img.getAttribute('alt')).slice(4)).toEqual(['Kazuya', 'Heihachi'])
  })

  it('says what is unknown: characters without a save, an opponent without a room', async () => {
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(2, ALICE, { ...BOB, chars: null }), match(1, lost(ALICE), null)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    await within(section()).findAllByRole('listitem')
    expect(within(rows()[0]).getByText('캐릭터 미확인')).toBeInTheDocument()
    expect(within(rows()[1]).getByText('상대 미확인')).toBeInTheDocument()
  })

  it("opens the opponent, never the player already on screen, whichever seat they had", async () => {
    const onOpen = vi.fn()
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(2, ALICE, BOB), match(1, lost(BOB), won(ALICE))]))
    render(<PlayerRecordsSection npid="alice" onOpen={onOpen} />)

    fireEvent.click((await within(section()).findAllByRole('button', { name: 'Bob 기록 보기' }))[0])
    expect(onOpen).toHaveBeenCalledWith('bob')
    expect(within(section()).queryByRole('button', { name: 'Alice 기록 보기' })).not.toBeInTheDocument()
  })

  it('appends the next page from the last id shown', async () => {
    vi.mocked(fetchMatchRecords)
      .mockResolvedValueOnce(page([match(9, ALICE, BOB)], 9))
      .mockResolvedValueOnce(page([match(4, won(BOB), lost(ALICE))]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    fireEvent.click(await within(section()).findByRole('button', { name: '더 보기' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(fetchMatchRecords).toHaveBeenLastCalledWith({ npid: 'alice' }, 9)
    expect(within(section()).queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
  })

  it('keeps what it has when the next page fails, and offers it again', async () => {
    vi.mocked(fetchMatchRecords)
      .mockResolvedValueOnce(page([match(9, ALICE, BOB)], 9))
      .mockRejectedValueOnce(new AppError('서버 오류', 502))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    fireEvent.click(await within(section()).findByRole('button', { name: '더 보기' }))
    expect(await within(section()).findByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(within(section()).getByRole('alert')).toHaveTextContent('더 불러오지 못했습니다')
    expect(rows()).toHaveLength(1)
  })

  it('lists the matches without totals when the player has no save', async () => {
    vi.mocked(fetchPlayerSave).mockRejectedValue(new AppError('이 플레이어의 TTT2 세이브가 없습니다.', 404))
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([match(1, ALICE, BOB)]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    await within(section()).findAllByRole('listitem')
    expect(within(section()).queryByText('통산')).not.toBeInTheDocument()
  })

  it('says so when the player has no recorded match', async () => {
    vi.mocked(fetchMatchRecords).mockResolvedValue(page([]))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByText('기록된 랭크 매치가 아직 없습니다.')).toBeInTheDocument()
  })

  it('reports a failed read in the section alone', async () => {
    vi.mocked(fetchMatchRecords).mockRejectedValue(new AppError('서버 오류', 502))
    render(<PlayerRecordsSection npid="alice" onOpen={() => {}} />)

    expect(await within(section()).findByRole('alert')).toHaveTextContent('전적을 불러오지 못했습니다')
  })
})
