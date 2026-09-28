import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import useStats from '@/stat/useStats'
import { API } from '@/config/endpoints'
import { GET } from '@/shared/util/api'

vi.mock('@/shared/util/api', () => ({ GET: vi.fn().mockResolvedValue([]) }))

it('opens on two weeks, for both the hourly and the daily read', async () => {
  const { result } = renderHook(() => useStats())
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.days).toBe(14)
  expect(GET).toHaveBeenCalledWith(API.stats().path, { days: 14 })
  expect(GET).toHaveBeenCalledWith(API.dailyStats().path, { days: 14 })
})
