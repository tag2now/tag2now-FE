import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerMatchTable from '../components/PlayerMatchTable'
import type {Room, RoomUser} from '@/types'

describe('PlayerMatchTable', () => {
  it('renders room separator with owner name and user count', () => {
    const rooms: Room[] = [
      {
        room_id: 1,
        owner_online_name: 'Alice',
        rank_info: null,
        users: [
          { online_name: 'Alice', np_id: 'Alice' },
          { online_name: 'Bob', np_id: 'Bob' },
        ] as RoomUser[],
      },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Alice (2)')).toBeInTheDocument()
  })

  it('renders each user as a separate row', () => {
    const rooms: Room[] = [
      {
        room_id: 1,
        owner_online_name: 'Host',
        rank_info: null,
        users: [
          { online_name: 'Player1', np_id: 'p1' },
          { online_name: 'Player2', np_id: 'p2' },
          { online_name: 'Player3', np_id: 'p3' },
        ] as RoomUser[],
      },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getByText('Player1')).toBeInTheDocument()
    expect(screen.getByText('Player2')).toBeInTheDocument()
    expect(screen.getByText('Player3')).toBeInTheDocument()
  })

  it('renders multiple rooms with their users', () => {
    const rooms: Room[] = [
      {
        room_id: 1,
        owner_online_name: 'Room1Owner',
        rank_info: null,
        users: [{ online_name: 'UserA', np_id: 'a' }] as RoomUser[],
      },
      {
        room_id: 2,
        owner_online_name: 'Room2Owner',
        rank_info: null,
        users: [
          { online_name: 'UserB', np_id: 'b' },
          { online_name: 'UserC', np_id: 'c' },
        ] as RoomUser[],
      },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getByText('Room1Owner (1)')).toBeInTheDocument()
    expect(screen.getByText('Room2Owner (2)')).toBeInTheDocument()
    expect(screen.getByText('UserA')).toBeInTheDocument()
    expect(screen.getByText('UserB')).toBeInTheDocument()
    expect(screen.getByText('UserC')).toBeInTheDocument()
  })

  it('handles rooms with no users gracefully', () => {
    const rooms: Room[] = [
      {
        room_id: 1,
        owner_online_name: 'EmptyRoom',
        rank_info: null,
      },
    ]
    render(<PlayerMatchTable rooms={rooms} />)

    expect(screen.getByText('EmptyRoom (0)')).toBeInTheDocument()
  })
})
