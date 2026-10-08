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

  it('gives the plate its own classes when the caller names them', () => {
    // A banner sized by utilities would otherwise size the plate too, and a
    // utility beats .rank-plate's frame.
    render(<RankImage rankInfo={{ name: 'Tekken God' }} className="h-8 w-auto" plateClassName="shrink-0" />)
    fireEvent.error(screen.getByRole('img', { name: 'Tekken God' }))

    const plate = screen.getByRole('img', { name: 'Tekken God' })
    expect(plate).toHaveClass('rank-plate', 'shrink-0')
    expect(plate).not.toHaveClass('h-8')
  })

  it('gives the plate the image classes when the caller names no others', () => {
    render(<RankImage rankInfo={{ name: 'Tekken God' }} className="mini-char-rank" />)
    fireEvent.error(screen.getByRole('img', { name: 'Tekken God' }))

    expect(screen.getByRole('img', { name: 'Tekken God' })).toHaveClass('rank-plate', 'mini-char-rank')
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
