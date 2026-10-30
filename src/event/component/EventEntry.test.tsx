import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { EventFloatingLink, EventSidebarCard } from '@/event/component'

const at = (path: string, ui: React.ReactElement) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

it('links the sidebar card to the event', () => {
  at('/', <EventSidebarCard />)

  expect(screen.getByRole('link', { name: '데스활성화 이벤트' })).toHaveAttribute('href', '/event')
})

it('marks the sidebar card while the event is open', () => {
  at('/event', <EventSidebarCard />)

  expect(screen.getByRole('link', { name: '데스활성화 이벤트' })).toHaveAttribute('aria-current', 'page')
})

it('floats a link to the event on other pages', () => {
  at('/stats', <EventFloatingLink />)

  expect(screen.getByRole('link', { name: '데스활성화 이벤트' })).toHaveAttribute('href', '/event')
})

it('has nothing to float on the event page itself', () => {
  at('/event', <EventFloatingLink />)

  expect(screen.queryByRole('link')).toBeNull()
})
