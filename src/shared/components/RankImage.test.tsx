import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RankImage from '@/shared/components/RankImage'

describe('RankImage', () => {
  it('renders nothing without a rank', () => {
    const { container } = render(<RankImage rankInfo={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('builds the asset path from the rank name', () => {
    render(<RankImage rankInfo={{ name: 'Tekken God', tier: 'God' }} />)
    expect(screen.getByRole('img', { name: 'Tekken God' })).toHaveAttribute('src', '/ranks/Tekken_God.png')
  })

  it('disappears rather than showing a broken image when the asset is missing', () => {
    // Several ranks the API reports have no artwork; the browser's broken-image
    // glyph reads as a bug, so the element removes itself instead.
    render(<RankImage rankInfo={{ name: 'Initiate', tier: 'Initiate' }} />)
    const img = screen.getByRole('img', { name: 'Initiate' })

    fireEvent.error(img)

    expect(screen.queryByRole('img', { name: 'Initiate' })).not.toBeInTheDocument()
  })

  it('a rank that does have art still renders after a different one failed', () => {
    // The failure is keyed by name because React reuses this element across
    // rows; a bare boolean would blank the next rank in the list.
    const { rerender } = render(<RankImage rankInfo={{ name: 'Initiate', tier: 'Initiate' }} />)
    fireEvent.error(screen.getByRole('img', { name: 'Initiate' }))

    rerender(<RankImage rankInfo={{ name: 'Vanquisher', tier: 'Vanquisher' }} />)

    expect(screen.getByRole('img', { name: 'Vanquisher' })).toBeInTheDocument()
  })
})
