import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import EventPage from '@/event/Event'
import { API } from '@/config/endpoints'
import { GET } from '@/shared/util/api'
import type { EventAchiever, EventBoard, EventPlayer } from '@/event/types'

vi.mock('@/shared/util/api', () => ({ GET: vi.fn() }))
const auth = vi.hoisted(() => ({ user: null as { username: string } | null }))
vi.mock('@/auth/useAuth', () => ({ default: () => auth }))

const pugilist = { rank: 24, name: 'Pugilist', tier: '노랑단' }
const conqueror = { rank: 27, name: 'Conqueror', tier: '주황단' }

const achiever = (place: number, username: string, extra: Partial<EventAchiever> = {}): EventAchiever => ({
  place,
  username,
  gain: 3,
  main: true,
  char: { id: 0, character: 'Paul' },
  from_rank: pugilist,
  to_rank: conqueror,
  new_player: false,
  number_only: false,
  ...extra,
})

const board = (extra: Partial<EventBoard> = {}): EventBoard => ({
  start_at: '2026-10-28T10:00:00Z',
  end_at: null,
  ended: false,
  capacity: 20,
  achievers: [achiever(1, 'gosan')],
  ...extra,
})

const player = (extra: Partial<EventPlayer> = {}): EventPlayer => ({
  username: 'gosan',
  top_rank: pugilist,
  best_rank: conqueror,
  main_steps: 3,
  sub_steps: 3,
  sub_floor: { rank: 20, name: 'Berserker', tier: '녹단' },
  achieved: false,
  place: null,
  new_player: false,
  number_only: false,
  slots: [{
    char: { id: 0, character: 'Paul' },
    main: true,
    start: pugilist,
    target: conqueror,
    rank: { rank: 25, name: 'Vanquisher', tier: '주황단' },
    achieved: false,
  }],
  ...extra,
})

function answer(eventBoard: EventBoard, found: Record<string, EventPlayer> = {}) {
  vi.mocked(GET).mockImplementation(async (path: string) => {
    if (path === API.event().path) return eventBoard
    const hit = Object.entries(found).find(([npid]) => path === API.eventPlayer(npid).path)
    if (hit) return hit[1]
    throw new Error('이벤트 시작 때 세이브가 없던 계정입니다.')
  })
}

beforeEach(() => {
  auth.user = null
  vi.mocked(GET).mockReset()
})

it('says the deadline is not set rather than inventing one', async () => {
  answer(board())
  render(<EventPage />)

  expect(await screen.findByText(/마감 미정/)).toBeInTheDocument()
})

it('shows the deadline once there is one, and that the event is over', async () => {
  answer(board({ end_at: '2026-10-31T15:00:00Z', ended: true }))
  render(<EventPage />)

  expect(await screen.findByText(/11\. 1\..*00:00 \(종료\)/)).toBeInTheDocument()
  expect(screen.getByText(/확정 결과는 공지를/)).toBeInTheDocument()
})

it('says the board is provisional while the event runs', async () => {
  answer(board())
  render(<EventPage />)

  expect(await screen.findByText(/잠정 순위입니다/)).toBeInTheDocument()
})

it('ranks achievers with the climb and marks the organiser\'s cases', async () => {
  answer(board({ achievers: [achiever(1, 'gosan', { gain: 5 }), achiever(2, 'newbie', { main: false, new_player: true })] }))
  render(<EventPage />)

  const list = await screen.findByRole('table', { name: '달성자 순위' })
  expect(within(list).getByText('+5')).toBeInTheDocument()
  expect(within(list).getByText('부캐 · 신규 심사')).toBeInTheDocument()
  expect(within(list).getByRole('columnheader', { name: '시작' })).toBeInTheDocument()
  expect(within(list).getByRole('columnheader', { name: '현재' })).toBeInTheDocument()
  expect(within(list).getByText('2')).toBeInTheDocument()
})

it('draws the portrait of the character climbed', async () => {
  answer(board({ achievers: [achiever(1, 'gosan', { char: { id: 0x2b, character: 'Panda' } })] }))
  render(<EventPage />)

  const list = await screen.findByRole('table', { name: '달성자 순위' })
  expect(within(list).getAllByRole('img', { name: 'Panda' })).toHaveLength(2)
})

it('splits the board at the prize line', async () => {
  const achievers = Array.from({ length: 21 }, (_, i) => achiever(i + 1, `player${i + 1}`))
  answer(board({ achievers }))
  render(<EventPage />)

  const beyond = await screen.findByRole('table', { name: '순위 밖 달성자' })
  expect(within(beyond).getByRole('button', { name: 'player21' })).toBeInTheDocument()
  expect(within(screen.getByRole('table', { name: '달성자 순위' })).queryByRole('button', { name: 'player21' })).toBeNull()
})

it('opens on the signed-in account', async () => {
  auth.user = { username: 'gosan' }
  answer(board({ achievers: [] }), { gosan: player() })
  render(<EventPage />)

  expect(await screen.findByText('gosan의 진행 현황')).toBeInTheDocument()
  expect(screen.getByText('+3계급 (역대와 달라 +1 포함)')).toBeInTheDocument()
  expect(screen.getByText('2계급 남음')).toBeInTheDocument()
})

it('marks a character that holds its condition', async () => {
  auth.user = { username: 'gosan' }
  const slot = { ...player().slots[0], rank: conqueror, achieved: true }
  answer(board({ achievers: [] }), { gosan: player({ achieved: true, place: 1, slots: [slot] }) })
  render(<EventPage />)

  expect(await screen.findByText('달성')).toBeInTheDocument()
  expect(screen.getByText('1위')).toBeInTheDocument()
})

it('does not call a rank without a game achieved', async () => {
  auth.user = { username: 'gosan' }
  const slot = { ...player().slots[0], rank: conqueror }
  answer(board({ achievers: [] }), { gosan: player({ slots: [slot] }) })
  render(<EventPage />)

  expect(await screen.findByText('게임 기록 없음')).toBeInTheDocument()
})

it('asks a signed-out reader to search', async () => {
  answer(board())
  render(<EventPage />)

  expect(await screen.findByText(/아이디를 검색하면/)).toBeInTheDocument()
  expect(GET).toHaveBeenCalledTimes(1)
})

it('shows a player picked from the board', async () => {
  answer(board(), { gosan: player() })
  render(<EventPage />)

  fireEvent.click(await screen.findByRole('button', { name: 'gosan' }))

  expect(await screen.findByText('gosan의 진행 현황')).toBeInTheDocument()
})

it('keeps a failed search inside its own section', async () => {
  answer(board())
  render(<EventPage />)

  fireEvent.change(await screen.findByRole('textbox', { name: 'RPCN 아이디' }), { target: { value: 'nobody' } })
  fireEvent.click(screen.getByRole('button', { name: '조회' }))

  expect(await screen.findByText('이벤트 시작 때 세이브가 없던 계정입니다.')).toBeInTheDocument()
  expect(screen.getByRole('table', { name: '달성자 순위' })).toBeInTheDocument()
})
