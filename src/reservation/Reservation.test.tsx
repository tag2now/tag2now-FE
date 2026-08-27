import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Reservation from './Reservation'
import { cancelParticipation, createReservation, fetchReservations, hasParticipation, joinReservation, type ApiReservation } from './reservationApi'
import { clearUsername, saveUsername } from '@/shared/util/cookie'

vi.mock('./reservationApi', () => ({
  fetchReservations: vi.fn(),
  createReservation: vi.fn(),
  joinReservation: vi.fn(),
  cancelParticipation: vi.fn(),
  hasParticipation: vi.fn(),
}))

const apiReservation = {
  id: 1,
  start_at: '2026-08-25T12:00:00+00:00',
  duration_minutes: 60,
  host_display_name: '나',
  host_ranks: ['Yaksa', 'Vanquisher'],
  match_type: 'rank_match' as const,
  capacity: 1,
  memo: '',
  status: 'open' as const,
  participant_count: 0,
  created_at: '2026-08-25T10:00:00+00:00',
}

vi.mock('@ncdai/react-wheel-picker', () => ({
  WheelPickerWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WheelPicker: ({ value, onValueChange, options }: {
    value: string
    onValueChange: (value: string) => void
    options: Array<{ value: string, label: React.ReactNode }>
  }) => (
    <select
      aria-label={options.length === 24 ? '시간 휠' : '분 휠'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}))

beforeEach(() => {
  // Without this, a "never called" assertion passes on a stale call from an
  // earlier test, and a "called with" one can match the wrong test's call.
  vi.clearAllMocks()
  vi.mocked(fetchReservations).mockResolvedValue([])
  vi.mocked(hasParticipation).mockReturnValue(false)
  vi.mocked(createReservation).mockResolvedValue(apiReservation)
  saveUsername('나')
})

function openReservationModal() {
  render(<Reservation />)
  fireEvent.click(screen.getByRole('button', { name: '+ 예약 추가' }))
  return screen.getByRole('dialog', { name: '예약 추가' })
}

describe('Reservation', () => {
  it('opens and closes the reservation modal', () => {
    openReservationModal()
    expect(screen.getByRole('dialog', { name: '예약 추가' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '예약 추가 닫기' }))
    expect(screen.queryByRole('dialog', { name: '예약 추가' })).not.toBeInTheDocument()
  })

  it('uses a mutually exclusive match type control and hides ranks for player matches', () => {
    openReservationModal()
    const rankMatch = screen.getByRole('radio', { name: '랭크매치' })
    const playerMatch = screen.getByRole('radio', { name: '플레이어 매치' })

    expect(rankMatch).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(playerMatch)

    expect(playerMatch).toHaveAttribute('aria-checked', 'true')
    expect(rankMatch).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('group', { name: /보유 계급/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('모집 인원')).toBeInTheDocument()
  })

  it('shows all 36 ranks with higher rows above and higher ranks on the right', () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('button', { name: /계급 선택, 현재/ }))

    const picker = document.getElementById('reservation-rank-picker')
    expect(picker).not.toBeNull()
    const tiles = within(picker!).getAllByRole('button', { pressed: false })
      .concat(within(picker!).getAllByRole('button', { pressed: true }))
      .filter((button) => button.getAttribute('aria-pressed') !== null)
    const imageNames = Array.from(picker!.querySelectorAll('button[aria-pressed] img')).map((image) => image.getAttribute('alt'))

    expect(tiles).toHaveLength(36)
    expect(imageNames.slice(0, 4)).toEqual(['Suzaku', 'Fujin', 'Raijin', 'Yaksa'])
    expect(imageNames.slice(-4)).toEqual(['Beginner', '9th kyu', '8th kyu', '7th kyu'])
  })

  it('shows selected rank images from highest to lowest in the collapsed control', () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('button', { name: /계급 선택, 현재/ }))
    const picker = document.getElementById('reservation-rank-picker')!
    fireEvent.click(within(picker).getByRole('button', { name: /Yaksa/ }))
    fireEvent.click(within(picker).getByRole('button', { name: '선택 완료' }))

    const summary = screen.getByRole('button', { name: '계급 선택, 현재 Yaksa, Vanquisher' })
    expect(Array.from(summary.querySelectorAll('img')).map((image) => image.alt)).toEqual(['Yaksa', 'Vanquisher'])
    expect(within(summary).queryByText('+1')).not.toBeInTheDocument()
  })

  it('keeps the previous time on cancel and commits it on confirm', () => {
    openReservationModal()
    const timeButton = screen.getByRole('button', { name: '시작 시각 21:00' })

    fireEvent.click(timeButton)
    fireEvent.change(screen.getByLabelText('시간 휠'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('분 휠'), { target: { value: '35' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: '시간 선택' })).getByRole('button', { name: '취소' }))
    expect(timeButton).toHaveAttribute('aria-label', '시작 시각 21:00')

    fireEvent.click(timeButton)
    fireEvent.change(screen.getByLabelText('시간 휠'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('분 휠'), { target: { value: '35' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: '시간 선택' })).getByRole('button', { name: '선택 완료' }))
    expect(timeButton).toHaveAttribute('aria-label', '시작 시각 22:35')
  })

  it('creates a rank reservation using the highest rank image and a +N badge', async () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('button', { name: /계급 선택, 현재/ }))
    const picker = document.getElementById('reservation-rank-picker')!
    fireEvent.click(within(picker).getByRole('button', { name: /Yaksa/ }))
    vi.mocked(fetchReservations).mockResolvedValue([apiReservation])
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    const createdCard = await screen.findByRole('button', { name: /나 모집중 Yaksa, Vanquisher/ })
    expect(within(createdCard).getByRole('img', { name: 'Yaksa' })).toBeInTheDocument()
    expect(within(createdCard).getByText('+1')).toBeInTheDocument()
  })

  it('sends the form values to the backend contract on submit', async () => {
    openReservationModal()
    fireEvent.change(screen.getByLabelText('예상 시간'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText(/메모/), { target: { value: '가볍게 한 판' } })
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith({
      start_time: '21:00:00',
      duration_minutes: 120,
      display_name: '나',
      ranks: ['Vanquisher'],
      match_type: 'rank_match',
      capacity: 1,
      memo: '가볍게 한 판',
    }))
  })

  it('sends a player match without ranks and with the chosen capacity', async () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('radio', { name: '플레이어 매치' }))
    fireEvent.change(screen.getByLabelText('모집 인원'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: 'player_match', ranks: [], capacity: 3 }),
    ))
  })

  it('renders a full card when the backend reports the reservation as matched', async () => {
    vi.mocked(fetchReservations).mockResolvedValue([{ ...apiReservation, status: 'matched', participant_count: 1 }])
    render(<Reservation />)

    expect(await screen.findByRole('button', { name: /나 마감/ })).toBeInTheDocument()
  })
})

// --- Joining and cancelling --------------------------------------------------
// The suite above covers creating a reservation. These cover the other half a
// user can reach: joining someone else's, and taking that back.

describe('Reservation participation', () => {
  const openReservation = { ...apiReservation, id: 7, host_display_name: '상대', participant_count: 0, status: 'open' as const }

  /** Mirror the backend: joining fills the single slot, cancelling frees it. */
  function backendHolding(initial: ApiReservation) {
    let current = initial
    const joinedIds = new Set<number>()

    vi.mocked(fetchReservations).mockImplementation(async () => [current])
    vi.mocked(hasParticipation).mockImplementation((id: number) => joinedIds.has(id))
    vi.mocked(joinReservation).mockImplementation(async (id: number) => {
      joinedIds.add(id)
      current = { ...current, participant_count: current.capacity, status: 'matched' }
      return current
    })
    vi.mocked(cancelParticipation).mockImplementation(async (id: number) => {
      joinedIds.delete(id)
      current = { ...current, participant_count: 0, status: 'open' }
      return current
    })
    return { joinedIds }
  }

  async function selectTheReservation() {
    render(<Reservation />)
    fireEvent.click(await screen.findByRole('button', { name: /상대/ }))
    return screen.getByRole('complementary', { name: '선택한 예약 상세' })
  }


  it('joins with the saved username and turns the button into a cancel', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    await waitFor(() => expect(joinReservation).toHaveBeenCalledWith(7, '나'))
    expect(await within(detail).findByRole('button', { name: '참가 취소' })).toBeInTheDocument()
  })

  it('announces that the match is settled once joining fills the slot', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('매칭이 성사되었습니다.')
  })

  it('says a slot is still open when the reservation wants more participants', async () => {
    backendHolding({ ...openReservation, match_type: 'player_match', capacity: 3 })
    vi.mocked(joinReservation).mockResolvedValue({ ...openReservation, match_type: 'player_match', capacity: 3, participant_count: 1, status: 'open' })

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('다른 참가자를 기다리고 있어요.')
  })

  it('refuses to join without a username instead of calling the backend', async () => {
    backendHolding(openReservation)
    clearUsername()

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('상단바에서 유저명을 설정한 뒤 참가할 수 있습니다.')
    expect(joinReservation).not.toHaveBeenCalled()
  })

  it('cancels a participation and offers to join again', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))
    fireEvent.click(await within(detail).findByRole('button', { name: '참가 취소' }))

    await waitFor(() => expect(cancelParticipation).toHaveBeenCalledWith(7))
    expect(await within(detail).findByRole('button', { name: '참가하기' })).toBeInTheDocument()
  })

  it('reopens the reservation for everyone after a participant leaves', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))
    await within(detail).findByRole('button', { name: '참가 취소' })
    fireEvent.click(within(detail).getByRole('button', { name: '참가 취소' }))

    expect(await screen.findByRole('status')).toHaveTextContent('다시 모집중으로 전환되었습니다.')
    expect(await screen.findByRole('button', { name: /상대 모집중/ })).toBeInTheDocument()
  })

  it('surfaces the backend message when joining is refused', async () => {
    backendHolding(openReservation)
    vi.mocked(joinReservation).mockRejectedValue(new Error('이미 마감된 예약입니다.'))

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('이미 마감된 예약입니다.')
  })

  it('surfaces the backend message when cancelling is refused', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))
    await within(detail).findByRole('button', { name: '참가 취소' })
    vi.mocked(cancelParticipation).mockRejectedValue(new Error('참가 취소 권한이 없습니다.'))
    fireEvent.click(within(detail).getByRole('button', { name: '참가 취소' }))

    expect(await screen.findByRole('status')).toHaveTextContent('참가 취소 권한이 없습니다.')
  })

  it('leaves a full reservation the user never joined unclickable', async () => {
    backendHolding({ ...openReservation, status: 'matched', participant_count: 1 })

    const detail = await selectTheReservation()

    const button = within(detail).getByRole('button', { name: '모집 마감' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(joinReservation).not.toHaveBeenCalled()
  })

  it('stops offering to join once a poll fills the reservation', async () => {
    vi.useFakeTimers()
    try {
      backendHolding(openReservation)
      render(<Reservation />)
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      fireEvent.click(screen.getByRole('button', { name: /상대/ }))
      const detail = screen.getByRole('complementary', { name: '선택한 예약 상세' })
      expect(within(detail).getByRole('button', { name: '참가하기' })).toBeEnabled()

      vi.mocked(fetchReservations).mockResolvedValue([{ ...openReservation, status: 'matched', participant_count: 1 }])
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })

      expect(within(detail).getByRole('button', { name: '모집 마감' })).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('still lets a participant cancel after the reservation filled up', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))

    const cancel = await within(detail).findByRole('button', { name: '참가 취소' })
    expect(cancel).toBeEnabled()
  })

  it('remembers an existing participation on first load', async () => {
    backendHolding({ ...openReservation, status: 'matched', participant_count: 1 }).joinedIds.add(7)

    const detail = await selectTheReservation()

    expect(within(detail).getByRole('button', { name: '참가 취소' })).toBeInTheDocument()
  })
})
