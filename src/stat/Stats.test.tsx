import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API } from '@/config/endpoints'
import { GET } from '@/shared/util/api'
import Stats from './Stats'

vi.mock('@/shared/util/api', () => ({ GET: vi.fn() }))

beforeEach(() => {
  vi.mocked(GET).mockReset().mockResolvedValue([])
})

// Pre-refactor safety net: selections must reach the API as numeric queries.
// A post-refactor failure here means the screen's observable contract changed.
describe('statistics selections', () => {
  it('opens with two weeks of charts and twenty-five weekly players', async () => {
    render(<Stats />)
    await screen.findByText('14일')

    expect(GET).toHaveBeenCalledWith(API.stats().path, { days: 14 })
    expect(GET).toHaveBeenCalledWith(API.dailyStats().path, { days: 14 })
    expect(GET).toHaveBeenCalledWith(API.weeklyTop().path, { limit: 25 })
    expect(screen.getByRole('radio', { name: '14일' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '25' })).toBeChecked()
  })

  it.each([7, 90])('requests both charts for %i days without changing the weekly limit', async (days) => {
    render(<Stats />)
    fireEvent.click(await screen.findByText(`${days}일`))

    await waitFor(() => {
      expect(GET).toHaveBeenCalledWith(API.stats().path, { days })
      expect(GET).toHaveBeenCalledWith(API.dailyStats().path, { days })
    })
    expect(await screen.findByRole('radio', { name: `${days}일` })).toBeChecked()
    expect(GET).toHaveBeenCalledWith(API.weeklyTop().path, { limit: 25 })
    expect(vi.mocked(GET).mock.calls.filter(([path]) => path === API.weeklyTop().path)).toHaveLength(1)
  })

  it.each([10, 50])('requests %i weekly players without changing the chart period', async (limit) => {
    render(<Stats />)
    await screen.findByText('14일')
    fireEvent.click(screen.getByText(String(limit), { exact: true }))

    await waitFor(() => expect(GET).toHaveBeenCalledWith(API.weeklyTop().path, { limit }))
    expect(screen.getByRole('radio', { name: String(limit) })).toBeChecked()
    expect(vi.mocked(GET).mock.calls.filter(([path]) => path === API.stats().path)).toHaveLength(1)
    expect(vi.mocked(GET).mock.calls.filter(([path]) => path === API.dailyStats().path)).toHaveLength(1)
  })

  it('shows each weekly player with their match count, wins and losses', async () => {
    vi.mocked(GET).mockImplementation(async (path) =>
      path === API.weeklyTop().path
        ? [{ npid: 'alice', online_name: 'Alice', match_count: 42, wins: 25, losses: 17 }]
        : [])
    render(<Stats />)

    const row = (await screen.findByText('Alice')).closest('.rank-row')
    expect(row).toHaveTextContent('42판')
    expect(row).toHaveTextContent('25승 17패')
  })

  it('keeps the chart period usable when the weekly ranking fails', async () => {
    vi.mocked(GET).mockImplementation(async (path) => {
      if (path === API.weeklyTop().path) throw new Error('주간 순위를 불러오지 못했습니다.')
      return []
    })
    render(<Stats />)

    expect(await screen.findByRole('alert')).toHaveTextContent('주간 순위를 불러오지 못했습니다.')
    fireEvent.click(await screen.findByText('7일'))
    await waitFor(() => expect(GET).toHaveBeenCalledWith(API.stats().path, { days: 7 }))
  })
})
