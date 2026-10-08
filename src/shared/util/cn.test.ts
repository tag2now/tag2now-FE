import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn } from './cn'

const tokens = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8')

/** Every utility name a theme namespace generates, e.g. `text` → ['13', 'sm', …]. */
function themeNames(namespace: string): string[] {
  const pattern = new RegExp(`^\\s*--${namespace}-([a-z0-9]+):`, 'gm')
  return [...tokens.matchAll(pattern)].map((match) => match[1])
}

describe('cn', () => {
  it('lets the later class win where two set the same property', () => {
    expect(cn('px-3 py-2', 'px-4')).toBe('py-2 px-4')
    expect(cn('flex flex-wrap', 'flex-nowrap')).toBe('flex flex-nowrap')
    expect(cn('text-txt-dim', 'text-primary-text')).toBe('text-primary-text')
  })

  it('drops what is not a class, so a condition can sit inline', () => {
    expect(cn('panel', false, null, undefined, 0, ['tbl-td', ''])).toBe('panel tbl-td')
  })

  it('keeps sheet classes, which it has no reason to touch', () => {
    expect(cn('panel-meta', 'state-msg px-4')).toBe('panel-meta state-msg px-4')
  })

  describe.each(themeNames('text'))('font size text-%s', (size) => {
    it('stands beside a colour rather than being read as one', () => {
      expect(cn(`text-${size}`, 'text-txt-dim')).toBe(`text-${size} text-txt-dim`)
    })

    it('replaces another size, and is replaced by one', () => {
      expect(cn('text-base', `text-${size}`)).toBe(`text-${size}`)
      expect(cn(`text-${size}`, 'text-(length:--text-base)')).toBe('text-(length:--text-base)')
    })
  })

  describe.each(themeNames('radius'))('radius rounded-%s', (radius) => {
    it('replaces another radius', () => {
      expect(cn('rounded-md', `rounded-${radius}`)).toBe(`rounded-${radius}`)
    })
  })

  it('reads the theme it guards', () => {
    // A tokens.css restructured past this parser would leave the loops empty
    // and passing; these are the names that need registering today.
    expect(themeNames('text')).toEqual(expect.arrayContaining(['13', '15', '17', '19', 'display']))
    expect(themeNames('radius')).toEqual(['panel', 'control', 'row'])
  })
})
