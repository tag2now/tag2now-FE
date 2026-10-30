import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import usePolledData from '@/shared/hooks/usePolledData'

// Pre-refactor safety net: public data, refresh and failure behavior must survive type cleanup.
describe('usePolledData', () => {
  it('retains loaded data on a refresh failure and recovers on the next refresh', async () => {
    const fetcher = vi.fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['before'])
      .mockRejectedValueOnce(new Error('새로고침 실패'))
      .mockResolvedValueOnce(['after'])
    const { result } = renderHook(() => usePolledData(fetcher, null))

    await waitFor(() => expect(result.current.data).toEqual(['before']))
    await act(async () => { await result.current.refresh() })

    expect(result.current).toMatchObject({ data: ['before'], error: '새로고침 실패', loading: false, refreshing: false })

    await act(async () => { await result.current.refresh() })
    expect(result.current).toMatchObject({ data: ['after'], error: null, loading: false, refreshing: false })
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it.each([new Error('서버 오류'), { message: '서버 오류' }, '서버 오류'])('exposes an initial failure message: %j', async (error) => {
    const fetcher = vi.fn<() => Promise<string[]>>().mockRejectedValue(error)
    const { result } = renderHook(() => usePolledData(fetcher, null))

    await waitFor(() => expect(result.current.error).toBe('서버 오류'))
    expect(result.current).toMatchObject({ data: null, loading: false, refreshing: false })
  })
})
