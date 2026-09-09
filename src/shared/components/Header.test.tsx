import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from './Header'
import { setIdentity } from '@/community/communityApi'
import { AppError } from '@/shared/util/AppError'
import { USERNAME_KEY } from '@/shared/util/cookie'

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
    // A successful save writes the name to localStorage, and the header reads
    // it back on mount — so without this a later test renders already named
    // and never sees the "유저명 설정" button. The cookie line cleared
    // "tag2now_username", which is not the key the app writes.
    localStorage.clear()
    document.cookie = `${USERNAME_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

  it('keeps the typed name in an open editor when the save fails', async () => {
    // The editor used to close before the request resolved, so a dropped
    // connection discarded what the user had typed.
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderHeader()

    await submitName('TekkenGosu')

    await waitFor(() => expect(screen.getByLabelText('유저명 입력')).toHaveValue('TekkenGosu'))
  })

  it('answers a transport failure in Korean, not with the browser message', async () => {
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderHeader()

    await submitName('TekkenGosu')

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

    await submitName('TekkenGosu')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
      ),
    )
  })

  it('closes the editor and keeps the name when the save succeeds', async () => {
    mockSetIdentity.mockResolvedValue(undefined as never)
    renderHeader()

    await submitName('TekkenGosu')

    await waitFor(() => expect(screen.queryByLabelText('유저명 입력')).not.toBeInTheDocument())
    expect(mockToastError).not.toHaveBeenCalled()
    expect(screen.getByText('TekkenGosu')).toBeInTheDocument()
  })

  // The backend cannot carry a name above U+00FF: it comes back as a cookie
  // value, and POST /community/identity answers a bare 500 rather than
  // anything the toast could quote. Stopping here is what turns that into a
  // sentence the user can act on — and it goes away when the backend does not
  // put the raw name in a header.
  it('refuses a name the backend cannot carry, without asking it', async () => {
    renderHeader()

    await submitName('철권고수')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명에 한글·이모지는 아직 쓸 수 없습니다. 영문·숫자로 입력해 주세요.',
      ),
    )
    expect(mockSetIdentity).not.toHaveBeenCalled()
  })

  it('leaves the refused name in the editor to be corrected', async () => {
    renderHeader()

    await submitName('철권고수')

    await waitFor(() => expect(screen.getByLabelText('유저명 입력')).toHaveValue('철권고수'))
  })

  // Latin-1 survives the round trip — the server escapes it into the cookie and
  // reads it back — so the guard must not widen into an ASCII-only rule.
  it('accepts an accented name, which the backend does carry', async () => {
    mockSetIdentity.mockResolvedValue(undefined as never)
    renderHeader()

    await submitName('café')

    await waitFor(() => expect(mockSetIdentity).toHaveBeenCalledWith('café'))
    expect(mockToastError).not.toHaveBeenCalled()
  })
})
