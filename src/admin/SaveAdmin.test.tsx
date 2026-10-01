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

async function loaded(password = 'pw') {
  render(<SaveAdmin password={password} />)
  lookUp()
  await waitFor(() => expect(screen.getByRole('region', { name: '조회한 세이브' })).toBeInTheDocument())
}

const choose = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

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

  it('needs the admin password before it looks anything up', () => {
    render(<SaveAdmin password="" />)
    fireEvent.change(screen.getByLabelText('플레이어 아이디'), { target: { value: 'alice' } })

    expect(screen.getByRole('button', { name: '세이브 조회' })).toBeDisabled()
  })

  it('shows the save, its used characters, backups and log', async () => {
    await loaded('secret')

    expect(fetchSave).toHaveBeenCalledWith('alice', 'secret')
    expect(section('조회한 세이브').getByText('Berserker (4/11)')).toBeInTheDocument()
    expect(section('조회한 세이브').getByText('15판 10승 5패')).toBeInTheDocument()
    expect(section('캐릭터 목록').getAllByRole('row')).toHaveLength(2)   // header + Paul
    expect(section('캐릭터 목록').getByText('-2')).toBeInTheDocument()
    expect(section('백업').getByText('base')).toBeInTheDocument()
    // the integrity fields of a write are left out of the log
    expect(section('수정 기록').getByText('via=web rank=29')).toBeInTheDocument()

    fireEvent.click(section('캐릭터 목록').getByRole('checkbox'))
    expect(section('캐릭터 목록').getAllByRole('row')).toHaveLength(4)
  })

  it('previews an edit, then applies exactly that edit with the previewed sha256', async () => {
    await loaded()
    choose('계급', '29')
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText('Genbu · 1500점 · 0')).toBeInTheDocument())
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

    choose('계급', '30')

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
    choose('캐릭터', 'all')
    choose('계급', '0')   // not offered for "all"; the lowest offered is used

    expect(screen.queryByLabelText('점수 (비우면 그대로)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'set-rank', char: 'all', rank: 1 }, null))
  })

  it('previews a floor with its options', async () => {
    vi.mocked(editSave).mockResolvedValue({ ...preview, floor: { reached: 30, floor: 19, raised: 58, points_fixed: 0, likely_demoted: false } })
    await loaded()
    choose('수정 종류', 'floor')
    fireEvent.click(screen.getByRole('checkbox', { name: '강등으로 보이는 캐릭터도 올리기' }))
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText(/도달 Byakko → floor Fighter, 58칸 올림/)).toBeInTheDocument())
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

  it('previews a restore from the backup list', async () => {
    await loaded()
    fireEvent.click(section('백업').getByRole('button', { name: 'base 복원 미리보기' }))

    await waitFor(() => expect(section('미리보기').getByText('base 백업으로 복원')).toBeInTheDocument())
    expect(editSave).toHaveBeenLastCalledWith('Alice', 'pw', { action: 'restore', label: 'base' }, null)
  })

  it('shows the server reason inline', async () => {
    vi.mocked(fetchSave).mockRejectedValue(new AppError('이 계정에는 TTT2 세이브가 없습니다.', 404))
    render(<SaveAdmin password="pw" />)
    lookUp()

    expect(await screen.findByRole('alert')).toHaveTextContent('이 계정에는 TTT2 세이브가 없습니다.')
  })
})
