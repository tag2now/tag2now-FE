import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NAME_TONES, nameTone } from '@/chat/nameTone'

describe('nameTone', () => {
  it('answers the same tone for the same account every time', () => {
    expect(nameTone('ZeroLight')).toBe(nameTone('ZeroLight'))
  })

  it('stays inside the palette and uses all of it', () => {
    const tones = new Set(Array.from({ length: 400 }, (_, i) => nameTone(`player${i}`)))
    expect([...tones].every((tone) => tone >= 0 && tone < NAME_TONES)).toBe(true)
    expect(tones.size).toBe(NAME_TONES)
  })

  it('has a token and a rule for every tone and no more', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf-8')
    const chat = readFileSync('src/chat/chat.css', 'utf-8')
    expect(tokens.match(/--color-chat-name-\d+:/g)).toHaveLength(NAME_TONES)
    expect(chat.match(/\.chat-name-\d+ \{/g)).toHaveLength(NAME_TONES)
  })
})
