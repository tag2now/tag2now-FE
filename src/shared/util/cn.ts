import { extendTailwindMerge, type ClassNameValue } from 'tailwind-merge'

/** Joins class lists so that, where two set the same property, the later one
 * wins — what reading the markup suggests, and not what the stylesheet does:
 * Tailwind orders the rules it emits by its own scheme, so `px-3 px-4` on one
 * element pads by whichever it happened to write last. Use this wherever a
 * component's own classes meet a caller's `className`.
 *
 * tailwind-merge recognises a size only by Tailwind's own names, so a theme
 * name it has never seen is mistaken for something else: `text-13` reads as a
 * colour and is dropped beside `text-txt-dim`, and `rounded-panel` is not
 * known to conflict with `rounded-md`. The names below are the ones in
 * `styles/tokens.css` that need telling apart; `cn.test.ts` reads that file,
 * so a token added there without its name here fails rather than merging
 * wrong. */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['13', '15', '17', '19', 'display'],
      radius: ['panel', 'control', 'row'],
    },
  },
})

export function cn(...classes: ClassNameValue[]): string {
  return merge(classes)
}
