import { describe, expect, it } from 'vitest'
import { parseYouTubeVideoId } from './youtube'

describe('YouTube links', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=example',
    'https://youtu.be/dQw4w9WgXcQ?si=example&t=15',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '  https://youtu.be/dQw4w9WgXcQ  ',
  ])('extracts only the video ID from %s', (url) => {
    expect(parseYouTubeVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it.each([
    '', 'dQw4w9WgXcQ', '<iframe src="https://youtube.com"></iframe>',
    'javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ',
    'https://evil.test@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/playlist?list=dQw4w9WgXcQ',
    'https://youtu.be/short', 'https://youtu.be/dQw4w9WgXcQ/extra',
    'https://youtube.com/watch?v=dQw4w9WgXcQ%22',
    'https://youtube.com/watch?v=dQw4w9WgXcQ%0A',
    'ftp://youtube.com/watch?v=dQw4w9WgXcQ',
  ])('rejects invalid or unsupported input %s', (url) => {
    expect(parseYouTubeVideoId(url)).toBeNull()
  })
})
