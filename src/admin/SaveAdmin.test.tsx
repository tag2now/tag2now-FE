import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SaveAdmin from './SaveAdmin'
import { editSave, fetchSave, fetchSaveBackups, fetchSaveLog } from './saveApi'
import type { SaveChar, SaveInfo, SaveWriteResult } from './types'
import { AppError } from '@/shared/util/AppError'

vi.mock('./saveApi', () => ({
  fetchSave: vi.fn(),
  fetchSaveBackups: vi.fn(),
  fetchSaveLog: vi.fn(),
  editSave: vi.fn(),
}))

const char = (id: number, character: string, rank = 0, wins = 0): SaveChar => ({
  id, character, rank, rank_name: rank === 20 ? 'Berserker' : 'Beginner', tier: '', points: 1500, streak: -2, wins, losses: wins ? 1 : 0,
})

const save: SaveInfo = {
  username: 'Alice', data_id: 1001, saved_at: '2026-09-30T12:34:56Z', sha256: 'a'.repeat(64), checksum_ok: true,
  account_rank: 20, progress: 4, total: 15, wins: 10, losses: 5, online: false,
  chars: [char(0, 'Paul', 20, 10), char(1, 'Law'), char(2, 'Lei')],
}

const preview: SaveWriteResult = {
  username: 'Alice', sha256: 'b'.repeat(64), online: false, applied: false, result: null,
  changes: {
    account_rank: null,
    chars: [{
      id: 0, character: 'Paul',
      before: { rank: 20, rank_name: 'Berserker', points: 1500, streak: 0 },
      after: { rank: 29, rank_name: 'Genbu', points: 1500, streak: 0 },
    }],
  },
}

const written: SaveWriteResult = {
  ...preview, applied: true, result: { backup: '20261001-120000-123456', checksum: '0x1', data_id: 1001, landed: true },
}

function lookUp(name = 'alice') {
  fireEvent.change(screen.getByLabelText('플레이어 아이디'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: '세이브 조회' }))
}

const section = (name: string) => within(screen.getByRole('region', { name }))

/** The names of the pictures inside an element, in order. */
const imagesIn = (element: HTMLElement) => within(element).getAllByRole('img').map((img) => img.getAttribute('alt') ?? img.getAttribute('aria-label'))

const missingPassword = vi.fn()

async function loaded(password = 'pw') {
  render(<SaveAdmin password={password} onMissingPassword={missingPassword} />)
  lookUp()
  await waitFor(() => expect(screen.getByRole('region', { name: '조회한 세이브' })).toBeInTheDocument())
}

/** Open a rank field and press one of its ranks. */
function pickRank(field: string, rank: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${field}:`) }))
  fireEvent.click(screen.getByRole('button', { name: rank }))
}

/** Open the character field and press a face in the grid. */
function pickCharacter(face: string) {
  fireEvent.click(screen.getByRole('button', { name: /^캐릭터:/ }))
  fireEvent.click(within(screen.getByRole('group', { name: '수정할 캐릭터' })).getByRole('button', { name: face }))
}

describe('Save admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchSave).mockResolvedValue(save)
    vi.mocked(fetchSaveBackups).mockResolvedValue([{ label: 'base', total: 15, account_rank: 20 }])
    vi.mocked(fetchSaveLog).mockResolvedValue([
      { ts: '2026-10-01T12:00:00', user: 'root', action: 'set-rank', username: 'Alice', details: { via: 'web', rank: 29, md5_before: 'x' } },
    ])
    vi.mocked(editSave).mockResolvedValue(preview)
  })

  it('asks for the admin password instead of looking anything up without it', () => {
    render(<SaveAdmin password="" onMissingPassword={missingPassword} />)
    lookUp()

    expect(missingPassword).toHaveBeenCalledTimes(1)
    expect(fetchSave).not.toHaveBeenCalled()
  })

  it('asks for the player id, by Enter too, and puts the cursor in it', () => {
    render(<SaveAdmin password="pw" onMissingPassword={missingPassword} />)
    const field = screen.getByLabelText('플레이어 아이디')
    fireEvent.submit(field.closest('form')!)

    expect(document.activeElement).toBe(field)
    expect(fetchSave).not.toHaveBeenCalled()
    expect(missingPassword).not.toHaveBeenCalled()
  })

  it('shows the save, its used characters, backups and log', async () => {
    await loaded('secret')

    expect(fetchSave).toHaveBeenCalledWith('alice', 'secret')
    // characters and ranks are drawn; their names live on as alt text
    expect(section('조회한 세이브').getByRole('img', { name: 'Berserker' })).toBeInTheDocument()
    expect(section('조회한 세이브').getByText('4/11')).toBeInTheDocument()
    expect(section('조회한 세이브').getByText('15판 10승 5패')).toBeInTheDocument()
    expect(section('캐릭터 목록').getAllByRole('row')).toHaveLength(2)   // header + Paul
    expect(imagesIn(section('캐릭터 목록').getAllByRole('row')[1])).toEqual(['Paul', 'Berserker'])
    expect(section('캐릭터 목록').getByText('-2')).toBeInTheDocument()
    expect(section('백업').getByText('base')).toBeInTheDocument()
    // the integrity fields of a write are left out of the log
    expect(section('수정 기록').getByText('via=web rank=29')).toBeInTheDocument()

    fireEvent.click(section('캐릭터 목록').getByRole('checkbox'))
    expect(section('캐릭터 목록').getAllByRole('row')).toHaveLength(4)
  })

  it('lists characters highest rank first', async () => {
    vi.mocked(fetchSave).mockResolvedValue({
      ...save, chars: [char(0, 'Paul', 20, 10), char(1, 'Law'), char(2, 'Lei', 29, 1), char(3, 'King', 20, 3)],
    })
    await loaded()
    fireEvent.click(section('캐릭터 목록').getByRole('checkbox'))

    const faces = section('캐릭터 목록').getAllByRole('row').slice(1).map((row) => imagesIn(row)[0])
    // Paul and King share a rank and points; Paul has played more
    expect(faces).toEqual(['Lei', 'Paul', 'King', 'Law'])
  })

  it('previews an edit, then applies exactly that edit with the previewed sha256', async () => {
    await loaded()
    pickRank('계급', 'Genbu')
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getAllByRole('row')).toHaveLength(2))
    expect(imagesIn(section('미리보기').getAllByRole('row')[1])).toEqual(['Paul', 'Berserker', 'Genbu'])
    expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 0, rank: 29 }, null)

    vi.mocked(editSave).mockResolvedValue(written)
    fireEvent.click(section('미리보기').getByRole('button', { name: '적용' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '적용' }))

    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 0, rank: 29 }, 'b'.repeat(64)))
    // the save is read again after the write, and the preview is gone
    await waitFor(() => expect(fetchSave).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: '미리보기' })).not.toBeInTheDocument()
  })

  it('drops the preview when the form changes', async () => {
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
    await waitFor(() => expect(screen.getByRole('region', { name: '미리보기' })).toBeInTheDocument())

    pickRank('계급', 'Byakko')

    expect(screen.queryByRole('region', { name: '미리보기' })).not.toBeInTheDocument()
  })

  it('sends points only when given, and refuses ones the save cannot hold', async () => {
    await loaded()
    fireEvent.change(screen.getByLabelText('점수 (비우면 그대로)'), { target: { value: '70000' } })
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('점수 (비우면 그대로)'), { target: { value: '3000' } })
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 0, rank: 10, points: 3000 }, null))
  })

  it('sets every character with a rank that has floor points and no points field', async () => {
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: '전체 캐릭터' }))
    fireEvent.click(screen.getByRole('button', { name: /^계급:/ }))
    expect(screen.getByRole('button', { name: 'Beginner' })).toBeDisabled()   // has no floor points
    fireEvent.click(screen.getByRole('button', { name: '9th kyu' }))

    expect(screen.queryByLabelText('점수 (비우면 그대로)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 'all', rank: 1 }, null))
  })

  it('previews a floor with its options', async () => {
    vi.mocked(editSave).mockResolvedValue({ ...preview, floor: { reached: 30, floor: 19, raised: 58, points_fixed: 0, likely_demoted: false } })
    await loaded()
    fireEvent.click(screen.getByRole('radio', { name: 'floor (최저 계급 올리기)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '강등으로 보이는 캐릭터도 올리기' }))
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText(/58칸 올림/)).toBeInTheDocument())
    expect(imagesIn(section('미리보기').getByText(/58칸 올림/))).toEqual(['Byakko', 'Fighter'])
    expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'floor', fix_points: false, refloor: true }, null)
  })

  it('does not offer to apply what the server would refuse', async () => {
    vi.mocked(editSave).mockResolvedValue({ ...preview, online: true })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText(/게임에 접속 중인 계정은 수정할 수 없습니다/)).toBeInTheDocument())
    expect(section('미리보기').getByRole('button', { name: '적용' })).toBeDisabled()
  })

  it('does not offer to apply a preview that changes nothing', async () => {
    vi.mocked(editSave).mockResolvedValue({ ...preview, changes: { account_rank: null, chars: [] } })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText('바뀌는 것이 없습니다.')).toBeInTheDocument())
    expect(section('미리보기').getByRole('button', { name: '적용' })).toBeDisabled()
  })

  it('picks the character from the grid', async () => {
    await loaded()
    pickCharacter('Law')

    expect(screen.getByRole('button', { name: '캐릭터: Law' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 1, rank: 10 }, null))
  })

  it("gives the second Michelle slot the grid's Angel", async () => {
    vi.mocked(fetchSave).mockResolvedValue({ ...save, chars: [...save.chars, char(0x2E, 'Michelle'), char(0x33, 'Michelle')] })
    await loaded()
    pickCharacter('Angel')
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 0x33, rank: 10 }, null))
  })

  it('previews a restore from the backup list', async () => {
    await loaded()
    fireEvent.click(section('백업').getByRole('button', { name: 'base 복원 미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText('base 백업으로 복원')).toBeInTheDocument())
    expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'restore', label: 'base' }, null)
  })

  it('shows the server reason inline', async () => {
    vi.mocked(fetchSave).mockRejectedValue(new AppError('이 계정에는 TTT2 세이브가 없습니다.', 404))
    render(<SaveAdmin password="pw" onMissingPassword={missingPassword} />)
    lookUp()

    expect(await screen.findByRole('alert')).toHaveTextContent('이 계정에는 TTT2 세이브가 없습니다.')
  })
})
