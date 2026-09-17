import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RankImage from '@/shared/components/RankImage'

describe('RankImage', () => {
  it('renders nothing without a rank', () => {
    const { container } = render(<RankImage rankInfo={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('builds the asset path from the rank name', () => {
    render(<RankImage rankInfo={{ name: 'Tekken God', tier: '황금단' }} />)
    expect(screen.getByRole('img', { name: 'Tekken God' })).toHaveAttribute('src', '/ranks/Tekken_God.png')
  })

  it('falls back to a named plate when the asset is missing', () => {
    // The seven ranks above Toshin ship no banner. Removing the element left a
    // hole the size of the art beside it; the plate fills the same frame with
    // the rank's name in its band's colour, so a column holding both keeps one
    // width and one height.
    render(<RankImage rankInfo={{ name: 'Tekken God' }} />)
    fireEvent.error(screen.getByRole('img', { name: 'Tekken God' }))

    const plate = screen.getByRole('img', { name: 'Tekken God' })
    expect(plate.tagName).toBe('SPAN')
    expect(plate).toHaveClass('rank-plate')
    expect(plate).toHaveTextContent('Tekken God')
  })

  it('a rank that does have art still renders after a different one failed', () => {
    // The failure is keyed by name because React reuses this element across
    // rows; a bare boolean would blank the next rank in the list.
    const { rerender } = render(<RankImage rankInfo={{ name: 'Tekken God' }} />)
    fireEvent.error(screen.getByRole('img', { name: 'Tekken God' }))

    rerender(<RankImage rankInfo={{ name: 'Vanquisher', tier: '주황단' }} />)

    expect(screen.getByRole('img', { name: 'Vanquisher' }).tagName).toBe('IMG')
  })
})
