import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PostTypeBadge from './PostTypeBadge'

describe('PostTypeBadge', () => {
  it('shows the category on its own when nothing is tagged', () => {
    render(<PostTypeBadge postType="건의" characters={[]} />)
    expect(screen.getByText('건의')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  // The whole point of the split: a post is a 공략 *and* about two characters.
  it('shows a chosen category alongside both characters', () => {
    render(<PostTypeBadge postType="공략" characters={['Jin', 'Kazuya']} />)
    expect(screen.getByText('공략')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Jin' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Kazuya' })).toBeInTheDocument()
  })

  // 자유 is the default nobody picks, so beside characters it contradicts them:
  // a post tagged Jin and Kazuya is about Jin and Kazuya, not "casual".
  it('drops 자유 when characters are tagged', () => {
    const { container } = render(<PostTypeBadge postType="자유" characters={['Jin', 'Kazuya']} />)
    expect(container.querySelector('.post-type-chip')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Jin' })).toBeInTheDocument()
  })

  it('keeps 자유 when it is the only thing the post carries', () => {
    render(<PostTypeBadge postType="자유" characters={[]} />)
    expect(screen.getByText('자유')).toBeInTheDocument()
  })

  // Posts written before the split put the character in post_type and left
  // characters empty. Reading those literally printed "Steve" as a category.
  it('reads a pre-split post as a character rather than a category', () => {
    render(<PostTypeBadge postType="Steve" characters={[]} />)
    expect(screen.getByRole('img', { name: 'Steve' })).toBeInTheDocument()
    expect(screen.queryByText('Steve')).not.toBeInTheDocument()
  })

  // The field held a character, so no category was ever chosen for these. 자유
  // is a category somebody picks; claiming it here states something the post
  // never said.
  it('shows no category for a pre-split post, because none was recorded', () => {
    const { container } = render(<PostTypeBadge postType="Steve" characters={[]} />)
    expect(container.querySelector('.post-type-chip')).not.toBeInTheDocument()
  })

  it('leaves a real category alone even when it is not a known one', () => {
    render(<PostTypeBadge postType="공지" characters={[]} />)
    expect(screen.getByText('공지')).toBeInTheDocument()
  })
})
