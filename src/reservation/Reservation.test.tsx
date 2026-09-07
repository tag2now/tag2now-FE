import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Reservation from './Reservation'
import { cancelParticipation, cancelReservation, createReservation, fetchReservations, hasParticipation, isOwner, joinReservation, updateReservation, type ApiReservation } from './reservationApi'
import { clearUsername, saveUsername } from '@/shared/util/cookie'

vi.mock('./reservationApi', () => ({
  fetchReservations: vi.fn(),
  createReservation: vi.fn(),
  joinReservation: vi.fn(),
  cancelParticipation: vi.fn(),
  cancelReservation: vi.fn(),
  updateReservation: vi.fn(),
  hasParticipation: vi.fn(),
  isOwner: vi.fn(),
}))

const apiReservation = {
  id: 1,
  start_at: '2026-08-25T12:00:00+00:00',
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

// 20:10 KST, so the default start time — the next whole hour in Seoul — is a
// fixed 21:00 and the assertions below stay deterministic.
const KST_2010 = new Date('2026-08-28T11:10:00Z')

beforeEach(() => {
  vi.setSystemTime(KST_2010)
  // Without this, a "never called" assertion passes on a stale call from an
  // earlier test, and a "called with" one can match the wrong test's call.
  vi.clearAllMocks()
  vi.mocked(fetchReservations).mockResolvedValue([])
  vi.mocked(hasParticipation).mockReturnValue(false)
  vi.mocked(isOwner).mockReturnValue(false)
  vi.mocked(createReservation).mockResolvedValue(apiReservation)
  saveUsername('나')
})

afterEach(() => {
  // setSystemTime pins Date globally; leaving it pinned would follow the suite
  // into the next file.
  vi.useRealTimers()
})

function openReservationModal() {
  render(<MemoryRouter><Reservation /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '+ 예약 추가' }))
  return screen.getByRole('dialog', { name: '예약 추가' })
}

// Highest first, matching the picker's own order, so a slice takes the tiles a
// host would plausibly reach for.
const rankNames = ['Yaksa', 'Raijin', 'Fujin', 'Suzaku', 'Seiryu', 'Byakko', 'Genbu', 'Savior', 'Conqueror', 'Destroyer',
  'Vanquisher', 'Pugilist', 'Duelist', 'Avenger', 'Warrior', 'Berserker', 'Fighter', 'Marauder', 'Brawler', 'Grand Master',
  'Master']

/** Open the picker, press the named tiles, close it. Nothing is preselected, so
 * every flow that posts a rank match has to go through here. */
function selectRanks(...ranks: string[]) {
  fireEvent.click(screen.getByRole('button', { name: /계급 선택/ }))
  const picker = document.getElementById('reservation-rank-picker')!
  for (const rank of ranks) fireEvent.click(within(picker).getByRole('button', { name: `${rank} ${rank}` }))
  fireEvent.click(within(picker).getByRole('button', { name: '선택 완료' }))
}

// The filter bar offers radios with the same labels, so the form's own
// match-type radios have to be reached through their group.
const matchTypeControl = () => within(screen.getByRole('radiogroup', { name: '매치 종류' }))

describe('Reservation', () => {
  it('opens and closes the reservation modal', () => {
    openReservationModal()
    expect(screen.getByRole('dialog', { name: '예약 추가' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '예약 추가' })).not.toBeInTheDocument()
  })

  it('uses a mutually exclusive match type control and hides ranks for player matches', () => {
    openReservationModal()
    const rankMatch = matchTypeControl().getByRole('radio', { name: '랭크매치' })
    const playerMatch = matchTypeControl().getByRole('radio', { name: '플레이어 매치' })

    // Native radios, so the browser owns the mutual exclusivity, one tab stop
    // and arrow-key navigation rather than the component reimplementing them.
    expect(rankMatch).toBeChecked()
    fireEvent.click(playerMatch)

    expect(playerMatch).toBeChecked()
    expect(rankMatch).not.toBeChecked()
    expect(screen.queryByRole('group', { name: /보유 계급/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('모집 인원')).toBeInTheDocument()
  })

  it('shows all 36 ranks with higher rows above and higher ranks on the right', () => {
    openReservationModal()
    fireEvent.click(screen.getByRole('button', { name: /계급 선택/ }))

    const picker = document.getElementById('reservation-rank-picker')
    expect(picker).not.toBeNull()
    const tiles = within(picker!).getAllByRole('button', { pressed: false })
      .concat(within(picker!).queryAllByRole('button', { pressed: true }))
      .filter((button) => button.getAttribute('aria-pressed') !== null)
    const imageNames = Array.from(picker!.querySelectorAll('button[aria-pressed] img')).map((image) => image.getAttribute('alt'))

    expect(tiles).toHaveLength(36)
    expect(imageNames.slice(0, 4)).toEqual(['Suzaku', 'Fujin', 'Raijin', 'Yaksa'])
    expect(imageNames.slice(-4)).toEqual(['Beginner', '9th kyu', '8th kyu', '7th kyu'])
  })

  it('shows selected rank images from highest to lowest in the collapsed control', () => {
    openReservationModal()
    selectRanks('Vanquisher', 'Yaksa')

    const summary = screen.getByRole('button', { name: '계급 선택, 현재 Yaksa, Vanquisher' })
    expect(Array.from(summary.querySelectorAll('img')).map((image) => image.alt)).toEqual(['Yaksa', 'Vanquisher'])
    expect(within(summary).queryByText('+1')).not.toBeInTheDocument()
  })

  it('starts with no rank chosen, so a host cannot post one they never picked', () => {
    openReservationModal()

    expect(screen.getByRole('button', { name: '계급 선택' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예약 등록' })).toBeDisabled()
  })

  it('refuses a 21st rank, the limit the backend enforces', () => {
    openReservationModal()
    selectRanks(...rankNames.slice(0, 20))

    fireEvent.click(screen.getByRole('button', { name: /계급 선택, 현재/ }))
    const picker = within(document.getElementById('reservation-rank-picker')!)

    expect(picker.getByRole('status')).toHaveTextContent('계급은 최대 20개까지 선택할 수 있습니다.')
    expect(picker.getByRole('button', { name: `${rankNames[20]} ${rankNames[20]}` })).toBeDisabled()
    expect(screen.getByRole('button', { name: /계급 선택, 현재/ }).querySelectorAll('img')).toHaveLength(20)
  })

  it('defaults the start time to the next whole hour in Seoul', () => {
    vi.setSystemTime(new Date('2026-08-28T04:55:00Z'))  // 13:55 KST
    openReservationModal()

    expect(screen.getByRole('button', { name: /시작 시각/ })).toHaveAttribute('aria-label', '시작 시각 14:00')
  })

  it('defaults to the next hour even moments after the last one struck', () => {
    vi.setSystemTime(new Date('2026-08-28T04:01:00Z'))  // 13:01 KST
    openReservationModal()

    expect(screen.getByRole('button', { name: /시작 시각/ })).toHaveAttribute('aria-label', '시작 시각 14:00')
  })

  it('stays at 23:00 in the last hour, which has no bookable next hour', () => {
    // The API takes a time of day with no date, so midnight would resolve to
    // today's midnight and be rejected as past.
    vi.setSystemTime(new Date('2026-08-28T14:30:00Z'))  // 23:30 KST
    openReservationModal()

    expect(screen.getByRole('button', { name: /시작 시각/ })).toHaveAttribute('aria-label', '시작 시각 23:00')
  })

  it('offers the hour that is next when the form opens, not when the page loaded', () => {
    render(<MemoryRouter><Reservation /></MemoryRouter>)
    vi.setSystemTime(new Date('2026-08-28T06:20:00Z'))  // 15:20 KST, two hours later
    fireEvent.click(screen.getByRole('button', { name: '+ 예약 추가' }))

    expect(screen.getByRole('button', { name: /시작 시각/ })).toHaveAttribute('aria-label', '시작 시각 16:00')
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

  it('creates a rank reservation whose card shows every rank the host picked', async () => {
    openReservationModal()
    selectRanks('Vanquisher', 'Yaksa')
    vi.mocked(fetchReservations).mockResolvedValue([apiReservation])
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    const createdCard = await screen.findByRole('button', { name: /나 모집중 Yaksa, Vanquisher/ })
    expect(Array.from(createdCard.querySelectorAll('img')).map((image) => image.alt)).toEqual(['Yaksa', 'Vanquisher'])
    expect(within(createdCard).queryByText(/^\+/)).not.toBeInTheDocument()
  })

  // Three icons is what the card's rank cell fits; the rest are a count, and the
  // detail panel is where the full list lives.
  it('counts the ranks a card cannot fit and lists them all in the detail panel', async () => {
    const ranks = ['Yaksa', 'Fujin', 'Warrior', 'Vanquisher', 'Mentor']
    vi.mocked(fetchReservations).mockResolvedValue([{ ...apiReservation, host_ranks: ranks }])
    render(<MemoryRouter><Reservation /></MemoryRouter>)

    const card = await screen.findByRole('button', { name: /나 모집중 Yaksa, Fujin, Vanquisher, Warrior, Mentor/ })
    expect(Array.from(card.querySelectorAll('img')).map((image) => image.alt)).toEqual(['Yaksa', 'Fujin', 'Vanquisher'])
    expect(within(card).getByText('+2')).toBeInTheDocument()

    fireEvent.click(card)
    const detail = screen.getByRole('complementary', { name: '선택한 예약 상세' })
    expect(Array.from(detail.querySelectorAll('img')).map((image) => image.alt)).toEqual(['Yaksa', 'Fujin', 'Vanquisher', 'Warrior', 'Mentor'])
    expect(within(detail).queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('sends the form values to the backend contract on submit', async () => {
    openReservationModal()
    selectRanks('Vanquisher')
    fireEvent.change(screen.getByLabelText(/메모/), { target: { value: '가볍게 한 판' } })
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith({
      start_time: '21:00:00',
      display_name: '나',
      ranks: ['Vanquisher'],
      match_type: 'rank_match',
      capacity: 1,
      memo: '가볍게 한 판',
    }))
  })

  it('keeps the modal open and shows the reason when creation fails', async () => {
    vi.mocked(createReservation).mockRejectedValue(new Error('이미 같은 시간에 예약이 있습니다.'))
    openReservationModal()
    selectRanks('Vanquisher')

    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('이미 같은 시간에 예약이 있습니다.')
    expect(screen.getByRole('dialog', { name: '예약 추가' })).toContainElement(alert)
  })

  it('sends a player match without ranks and with the chosen capacity', async () => {
    openReservationModal()
    fireEvent.click(matchTypeControl().getByRole('radio', { name: '플레이어 매치' }))
    fireEvent.change(screen.getByLabelText('모집 인원'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: 'player_match', ranks: [], capacity: 3 }),
    ))
  })

  it('offers ranks and a capacity together when either match type will do', async () => {
    openReservationModal()
    fireEvent.click(matchTypeControl().getByRole('radio', { name: '상관없음' }))

    expect(screen.getByRole('group', { name: /보유 계급/ })).toBeInTheDocument()
    selectRanks('Vanquisher')
    fireEvent.change(screen.getByLabelText('모집 인원'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: 'any', ranks: ['Vanquisher'], capacity: 2 }),
    ))
  })

  it('lets a reservation for either type be posted without any rank', async () => {
    openReservationModal()
    fireEvent.click(matchTypeControl().getByRole('radio', { name: '상관없음' }))
    fireEvent.click(screen.getByRole('button', { name: '계급 선택' }))
    expect(within(document.getElementById('reservation-rank-picker')!).queryAllByRole('button', { pressed: true })).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: 'any', ranks: [] }),
    ))
  })

  it('keeps a reservation for either type in both single-type filters', async () => {
    vi.mocked(fetchReservations).mockResolvedValue([
      { ...apiReservation, id: 2, host_display_name: '아무나', match_type: 'any', host_ranks: [], capacity: 2 },
    ])
    render(<MemoryRouter><Reservation /></MemoryRouter>)
    expect(await screen.findByRole('button', { name: /아무나/ })).toBeInTheDocument()

    for (const filter of ['랭크매치', '플레이어 매치']) {
      fireEvent.click(screen.getByRole('radio', { name: filter }))
      expect(screen.getByRole('button', { name: /아무나/ })).toBeInTheDocument()
    }
  })

  it('offers the match-type filter as a toggle defaulting to 전체', () => {
    render(<MemoryRouter><Reservation /></MemoryRouter>)

    const group = screen.getByRole('group', { name: '매치 종류 필터' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value')))
      .toEqual(['전체', '랭크매치', '플레이어 매치'])
    expect(within(group).getByRole('radio', { name: '전체' })).toBeChecked()
  })

  async function openDetail(reservation: ApiReservation = apiReservation) {
    vi.mocked(fetchReservations).mockResolvedValue([reservation])
    render(<MemoryRouter><Reservation /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /나/ }))
    return screen.getByRole('complementary', { name: '선택한 예약 상세' })
  }

  it('deletes the reservation once the host confirms', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    vi.mocked(cancelReservation).mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const detail = await openDetail()

    fireEvent.click(within(detail).getByRole('button', { name: '예약 삭제' }))

    await waitFor(() => expect(cancelReservation).toHaveBeenCalledWith(1))
    confirmSpy.mockRestore()
  })

  it('leaves the reservation alone when the host dismisses the confirmation', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const detail = await openDetail()

    fireEvent.click(within(detail).getByRole('button', { name: '예약 삭제' }))

    expect(cancelReservation).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('warns that participants lose their spot before deleting', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const detail = await openDetail({ ...apiReservation, capacity: 3, participant_count: 2 })

    fireEvent.click(within(detail).getByRole('button', { name: '예약 삭제' }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('참가자 2명'))
    confirmSpy.mockRestore()
  })

  it('offers joining rather than deleting on a reservation the user does not own', async () => {
    const detail = await openDetail()

    expect(within(detail).getByRole('button', { name: '참가하기' })).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: '예약 삭제' })).not.toBeInTheDocument()
  })

  it('opens the form already filled in with what the host posted', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const detail = await openDetail({ ...apiReservation, memo: '초보 환영' })

    fireEvent.click(within(detail).getByRole('button', { name: '예약 수정' }))

    expect(screen.getByRole('dialog', { name: '예약 수정' })).toBeInTheDocument()
    expect(screen.getByLabelText(/메모/)).toHaveValue('초보 환영')
  })

  it('refuses to open the editor once somebody has joined', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const detail = await openDetail({ ...apiReservation, capacity: 3, participant_count: 1 })

    const edit = within(detail).getByRole('button', { name: '예약 수정' })

    expect(edit).toBeDisabled()
    // The reason has to be readable without hovering: a title tooltip on a
    // disabled control never reaches keyboard or touch users.
    const reason = within(detail).getByText(/참가자가 있는 예약은 수정할 수 없습니다/)
    expect(reason).toBeVisible()
    expect(edit).toHaveAttribute('aria-describedby', reason.id)
  })

  it('still allows deleting a reservation somebody joined', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const detail = await openDetail({ ...apiReservation, capacity: 3, participant_count: 1 })

    expect(within(detail).getByRole('button', { name: '예약 삭제' })).toBeEnabled()
  })

  it('sends only the reservation id and the edited conditions', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    vi.mocked(updateReservation).mockResolvedValue(apiReservation)
    const detail = await openDetail()

    fireEvent.click(within(detail).getByRole('button', { name: '예약 수정' }))
    const modal = screen.getByRole('dialog', { name: '예약 수정' })
    fireEvent.change(screen.getByLabelText(/메모/), { target: { value: '자리 하나 남음' } })
    fireEvent.click(within(modal).getByRole('button', { name: '예약 수정' }))

    await waitFor(() => expect(updateReservation).toHaveBeenCalledWith(1, expect.objectContaining({ memo: '자리 하나 남음' })))
    expect(createReservation).not.toHaveBeenCalled()
  })

  it('creates rather than edits after the edit form is dismissed', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    const detail = await openDetail()

    fireEvent.click(within(detail).getByRole('button', { name: '예약 수정' }))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    fireEvent.click(screen.getByRole('button', { name: '+ 예약 추가' }))
    selectRanks('Vanquisher')
    fireEvent.click(screen.getByRole('button', { name: '예약 등록' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalled())
    expect(updateReservation).not.toHaveBeenCalled()
  })

  it('surfaces the backend reason when an edit is refused', async () => {
    vi.mocked(isOwner).mockReturnValue(true)
    vi.mocked(updateReservation).mockRejectedValue(new Error('참가자가 있는 예약은 수정할 수 없습니다.'))
    const detail = await openDetail()

    fireEvent.click(within(detail).getByRole('button', { name: '예약 수정' }))
    const modal = screen.getByRole('dialog', { name: '예약 수정' })
    fireEvent.click(within(modal).getByRole('button', { name: '예약 수정' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('참가자가 있는 예약은 수정할 수 없습니다.')
  })

  it('renders a full card when the backend reports the reservation as matched', async () => {
    vi.mocked(fetchReservations).mockResolvedValue([{ ...apiReservation, status: 'matched', participant_count: 1 }])
    render(<MemoryRouter><Reservation /></MemoryRouter>)

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
    render(<MemoryRouter><Reservation /></MemoryRouter>)
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

    expect(await screen.findByRole('alert')).toHaveTextContent('상단바에서 유저명을 설정한 뒤 참가할 수 있습니다.')
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

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 마감된 예약입니다.')
  })

  it('surfaces the backend message when cancelling is refused', async () => {
    backendHolding(openReservation)

    const detail = await selectTheReservation()
    fireEvent.click(within(detail).getByRole('button', { name: '참가하기' }))
    await within(detail).findByRole('button', { name: '참가 취소' })
    vi.mocked(cancelParticipation).mockRejectedValue(new Error('참가 취소 권한이 없습니다.'))
    fireEvent.click(within(detail).getByRole('button', { name: '참가 취소' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('참가 취소 권한이 없습니다.')
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
      render(<MemoryRouter><Reservation /></MemoryRouter>)
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
