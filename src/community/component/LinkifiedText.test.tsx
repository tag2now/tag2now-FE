import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LinkifiedText from './LinkifiedText'

describe('LinkifiedText', () => {
  it('links a URL and opens it in a new tab without passing the board on', () => {
    render(<LinkifiedText text="공략은 https://example.com/combo 참고" />)

    const link = screen.getByRole('link', { name: 'https://example.com/combo' })
    expect(link).toHaveAttribute('href', 'https://example.com/combo')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
  })

  it('keeps the surrounding text and line breaks', () => {
    const { container } = render(<LinkifiedText text={'첫 줄\nhttps://example.com\n끝'} />)

    expect(container.querySelector('p')?.textContent).toBe('첫 줄\nhttps://example.com\n끝')
  })

  it('leaves trailing punctuation outside the link', () => {
    render(<LinkifiedText text="여기 (https://example.com/a)." />)

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/a')
  })

  it('links a Korean path whole', () => {
    render(<LinkifiedText text="https://namu.wiki/w/철권 문서" />)

    expect(screen.getByRole('link')).toHaveTextContent('https://namu.wiki/w/철권')
  })

  it('does not link a script URL', () => {
    render(<LinkifiedText text="javascript:alert(1)" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
