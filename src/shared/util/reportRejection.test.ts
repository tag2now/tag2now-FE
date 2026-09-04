import { describe, it, expect, vi, beforeEach } from 'vitest'
import toast from 'react-hot-toast'
import { AppError } from '@/shared/util/AppError'
import { reportRejection } from '@/shared/util/reportRejection'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}))

const rejectionOf = (reason: unknown) => {
  const preventDefault = vi.fn()
  return { event: { reason, preventDefault } as unknown as PromiseRejectionEvent, preventDefault }
}

describe('reportRejection', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it('shows the message of an error this app raised', () => {
    const { event } = rejectionOf(new AppError('예약을 삭제할 권한이 없습니다.'))

    reportRejection(event)

    expect(toast.error).toHaveBeenCalledWith('예약을 삭제할 권한이 없습니다.')
  })

  it('claims the rejection so the browser does not also report it', () => {
    const { event, preventDefault } = rejectionOf(new AppError('request failed: 500', 500))

    reportRejection(event)

    expect(preventDefault).toHaveBeenCalled()
  })

  // A third-party script failing — analytics blocked by an extension, say —
  // used to surface as an app toast reading "Cannot read properties of
  // undefined (reading 'M_ID')".
  it('ignores a rejection from outside the app', () => {
    const { event, preventDefault } = rejectionOf(
      new TypeError("Cannot read properties of undefined (reading 'M_ID')"),
    )

    reportRejection(event)

    expect(toast.error).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('ignores a rejection whose reason is not an error at all', () => {
    const { event, preventDefault } = rejectionOf('something threw a string')

    reportRejection(event)

    expect(toast.error).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })
})
