import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlayerProfileCard from './PlayerProfileCard'
import { setIdentity } from '@/community/communityApi'
import { AppError } from '@/shared/util/AppError'
import { USERNAME_KEY } from '@/shared/util/cookie'

vi.mock('@/community/communityApi', () => ({ setIdentity: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

const mockSetIdentity = vi.mocked(setIdentity)
const mockToastError = vi.mocked(toast.error)

function renderProfile(leaderboardEntries: Parameters<typeof PlayerProfileCard>[0]['leaderboardEntries'] = []) {
  return render(<PlayerProfileCard leaderboardEntries={leaderboardEntries} />, { wrapper: MemoryRouter })
}

async function submitName(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '유저명 설정' }))
  fireEvent.change(screen.getByLabelText('유저명 입력'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
}

describe('Player profile username save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A successful save writes the name to localStorage, and the header reads
    // it back on mount — so without this a later test renders already named
    // and never sees the "유저명 설정" button. The cookie line cleared
    // "tag2now_username", which is not the key the app writes.
    localStorage.clear()
    document.cookie = `${USERNAME_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

  afterEach(() => {
    document.getElementById('headerProfileSlot')?.remove()
  })

  it('keeps the typed name in an open editor when the save fails', async () => {
    // The editor used to close before the request resolved, so a dropped
    // connection discarded what the user had typed.
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderProfile()

    await submitName('TekkenGosu')

    await waitFor(() => expect(screen.getByLabelText('유저명 입력')).toHaveValue('TekkenGosu'))
  })

  it('answers a transport failure in Korean, not with the browser message', async () => {
    mockSetIdentity.mockRejectedValue(new TypeError('Failed to fetch'))
    renderProfile()

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
    renderProfile()

    await submitName('A'.repeat(51))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('유저명은 50자를 넘을 수 없습니다.'),
    )
  })

  it('falls back to Korean when the API failed without explaining', async () => {
    mockSetIdentity.mockRejectedValue(new AppError('request failed: 500', 500, false))
    renderProfile()

    await submitName('TekkenGosu')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
      ),
    )
  })

  it('closes the editor and keeps the name when the save succeeds', async () => {
    mockSetIdentity.mockResolvedValue(undefined as never)
    renderProfile()

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
    renderProfile()

    await submitName('철권고수')

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        '유저명에 한글·이모지는 아직 쓸 수 없습니다. 영문·숫자로 입력해 주세요.',
      ),
    )
    expect(mockSetIdentity).not.toHaveBeenCalled()
  })

  it('leaves the refused name in the editor to be corrected', async () => {
    renderProfile()

    await submitName('철권고수')

    await waitFor(() => expect(screen.getByLabelText('유저명 입력')).toHaveValue('철권고수'))
  })

  // Latin-1 survives the round trip — the server escapes it into the cookie and
  // reads it back — so the guard must not widen into an ASCII-only rule.
  it('accepts an accented name, which the backend does carry', async () => {
    mockSetIdentity.mockResolvedValue(undefined as never)
    renderProfile()

    await submitName('café')

    await waitFor(() => expect(mockSetIdentity).toHaveBeenCalledWith('café'))
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('shows both character portraits and ranks without visible role or character-name text', () => {
    document.cookie = `${USERNAME_KEY}=TestPlayer; path=/`
    renderProfile([{
      np_id: 'p1',
      rank: 1,
      online_name: 'TestPlayer',
      player_info: {
        main_char_info: { name: 'Jin', rank_info: { name: 'Destroyer', tier: 'Destroyer' }, wins: 250, losses: 80 },
        sub_char_info: { name: 'Heihachi', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' }, wins: 180, losses: 60 },
      },
    }])

    expect(screen.getByAltText('Jin')).toBeInTheDocument()
    expect(screen.getByAltText('Heihachi')).toBeInTheDocument()
    expect(screen.getByAltText('Destroyer')).toBeInTheDocument()
    expect(screen.getByAltText('Vanquisher')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.queryByText('My fighter')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 정보 보기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '내 전적 보기' })).not.toBeInTheDocument()
    expect(screen.queryByText('MAIN')).not.toBeInTheDocument()
    expect(screen.queryByText('SUB')).not.toBeInTheDocument()
    expect(screen.queryByText('Jin')).not.toBeInTheDocument()
    expect(screen.queryByText('Heihachi')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.char-cell--compact')).toHaveLength(2)
    const records = document.querySelectorAll('.char-cell--compact .char-cell-record')
    expect(records).toHaveLength(2)
    // Rate first, raw record behind it --- the same emphasis the leaderboard
    // gives the same figure. The card used to lead with the record and label
    // the rate "WR:", which made one number read two ways on one screen.
    expect(records[0]).toHaveTextContent('76%250W 80L')
    expect(records[1]).toHaveTextContent('75%180W 60L')
  })

  it('shares the username editor with the header profile control', async () => {
    document.cookie = `${USERNAME_KEY}=TestPlayer; path=/`
    const headerTarget = document.createElement('div')
    headerTarget.id = 'headerProfileSlot'
    document.body.append(headerTarget)
    renderProfile()

    const header = within(headerTarget)
    await waitFor(() => expect(header.getByText('TestPlayer')).toBeInTheDocument())
    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 헤더에서 유저명 수정' }))

    expect(header.getByLabelText('유저명 입력')).toHaveValue('TestPlayer')
    expect(screen.getAllByLabelText('유저명 입력')).toHaveLength(1)
  })

  // Phones hide the sidebar card and its 내 정보 보기, so the header carries a
  // way in of its own (CSS shows it only there). It follows the sidebar's rule:
  // there is a record to open only for a name the leaderboard knows.
  it('offers 내 정보 in the header, open only for a ranked name', async () => {
    document.cookie = `${USERNAME_KEY}=TestPlayer; path=/`
    const headerTarget = document.createElement('div')
    headerTarget.id = 'headerProfileSlot'
    document.body.append(headerTarget)
    const { rerender } = renderProfile()

    const header = within(headerTarget)
    await waitFor(() => expect(header.getByRole('button', { name: '내 정보' })).toBeDisabled())

    rerender(<PlayerProfileCard leaderboardEntries={[{ np_id: 'p1', rank: 1, online_name: 'TestPlayer', player_info: null }]} />)
    expect(header.getByRole('button', { name: '내 정보' })).toBeEnabled()
  })
})
