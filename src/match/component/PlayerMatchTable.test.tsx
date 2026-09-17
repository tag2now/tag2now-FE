import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import {PlayerMatchTable} from "@/match/component";
import type {Room, RoomUser} from "@/match/types";

/** A row is a room, the way it is on the rank tab. These used to assert one row
 * per person under a band naming the host, which is why the toolbar could say
 * "방 2개" above three rows. */
const rowFor = (host: string) =>
  screen.getByRole('row', { name: new RegExp(host) })

describe('PlayerMatchTable', () => {
  it('names its columns in the same language as the rank tab', () => {
    render(<PlayerMatchTable rooms={[]} />)

    expect(screen.getByRole('columnheader', { name: '호스트' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '참가자' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '인원' })).toBeInTheDocument()
  })

  it('renders one row per room, with the host apart from the guests', () => {
    const rooms: Room[] = [
      {
        room_id: 1,
        owner_online_name: 'Alice',
        rank_info: null,
        max_slots: 4,
        users: [
          { online_name: 'Alice', np_id: 'a' },
          { online_name: 'Bob', np_id: 'b' },
        ] as RoomUser[],
      },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    // One room, one row — not one row for Alice and another for Bob.
    expect(screen.getAllByRole('row')).toHaveLength(2)  // header + the room
    const row = rowFor('Alice')
    // The host is named once. Listing them as a guest as well was the old
    // table's doing: the band said "Alice" and row 1 said "Alice".
    expect(within(row).getAllByText('Alice')).toHaveLength(1)
    expect(within(row).getByText('Bob')).toBeInTheDocument()
  })

  it('shows how full the lobby is, which the old table never said', () => {
    const rooms: Room[] = [
      { room_id: 1, owner_online_name: 'Host', rank_info: null, max_slots: 8, users: [
        { online_name: 'Host', np_id: 'h' },
        { online_name: 'P1', np_id: 'p1' },
        { online_name: 'P2', np_id: 'p2' },
      ] as RoomUser[] },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(rowFor('Host').textContent).toContain('3/8')
  })

  it('renders every room', () => {
    const rooms: Room[] = [
      { room_id: 1, owner_online_name: 'Room1Owner', rank_info: null, max_slots: 2, users: [{ online_name: 'UserA', np_id: 'a' }] as RoomUser[] },
      { room_id: 2, owner_online_name: 'Room2Owner', rank_info: null, max_slots: 4, users: [
        { online_name: 'Room2Owner', np_id: 'b' },
        { online_name: 'UserC', np_id: 'c' },
      ] as RoomUser[] },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('Room1Owner')).toBeInTheDocument()
    expect(screen.getByText('UserA')).toBeInTheDocument()
    expect(screen.getByText('UserC')).toBeInTheDocument()
  })

  // A lobby nobody has joined is the same state the rank tab calls "상대 찾는
  // 중", so it is stated rather than left as an empty cell.
  it('says a lobby is still waiting rather than leaving the cell blank', () => {
    const rooms: Room[] = [
      { room_id: 1, owner_online_name: 'EmptyRoom', rank_info: null, max_slots: 4 } as Room,
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getByText('참가자 대기 중')).toBeInTheDocument()
    expect(screen.getByText('EmptyRoom')).toBeInTheDocument()
  })
})
