import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from './Header'
import { setIdentity } from '@/community/communityApi'
import { AppError } from '@/shared/util/AppError'

vi.mock('@/community/communityApi', () => ({ setIdentity: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

const mockSetIdentity = vi.mocked(setIdentity)
const mockToastError = vi.mocked(toast.error)

function renderHeader() {
  return render(<Header totalUsers={0} leaderboardEntries={[]} />, { wrapper: MemoryRouter })
}

async function submitName(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '유저명 설정' }))
  fireEvent.change(screen.getByLabelText('유저명 입력'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
}

describe('Header username save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.cookie = 'tag2now_username=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('keeps the typed name in an open editor when the save fails', async () => {
    // The editor used to close before the request resolved, so a dropped
    // connection discarded what the user had typed.
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderHeader()

    await submitName('철권고수')

    await waitFor(() => expect(screen.getByLabelText('유저명 입력')).toHaveValue('철권고수'))
  })

  it('answers a transport failure in Korean, not with the browser message', async () => {
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderHeader()

    await submitName('철권고수')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
      ),
    )
  })

  it('shows the API message when the API explained the failure', async () => {
    // The server writes these for users and in Korean, so a generic line would
    // be strictly less useful than what it already said.
    mockSetIdentity.mockRejectedValue(
      new AppError('유저명은 50자를 넘을 수 없습니다.', 422, true),
    )
    renderHeader()

    await submitName('A'.repeat(51))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('유저명은 50자를 넘을 수 없습니다.'),
    )
  })

  it('falls back to Korean when the API failed without explaining', async () => {
    mockSetIdentity.mockRejectedValue(new AppError('request failed: 500', 500, false))
    renderHeader()

    await submitName('철권고수')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
      ),
    )
  })

  it('closes the editor and keeps the name when the save succeeds', async () => {
    mockSetIdentity.mockResolvedValue(undefined as never)
    renderHeader()

    await submitName('철권고수')

    await waitFor(() => expect(screen.queryByLabelText('유저명 입력')).not.toBeInTheDocument())
    expect(mockToastError).not.toHaveBeenCalled()
    expect(screen.getByText('철권고수')).toBeInTheDocument()
  })
})
