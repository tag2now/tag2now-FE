import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Reservation from './Reservation'

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

  it('creates a rank reservation using the highest rank image and a +N badge', () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('button', { name: /계급 선택, 현재/ }))
    const picker = document.getElementById('reservation-rank-picker')!
    fireEvent.click(within(picker).getByRole('button', { name: /Yaksa/ }))
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    const createdCard = screen.getByRole('button', { name: /나 모집중 Yaksa, Vanquisher/ })
    expect(within(createdCard).getByRole('img', { name: 'Yaksa' })).toBeInTheDocument()
    expect(within(createdCard).getByText('+1')).toBeInTheDocument()
  })
})
