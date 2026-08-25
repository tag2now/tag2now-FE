import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Reservation from './Reservation'
import { createReservation, fetchReservations, hasParticipation } from './reservationApi'
import { saveUsername } from '@/shared/util/cookie'

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
