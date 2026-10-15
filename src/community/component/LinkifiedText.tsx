import Linkify from 'linkify-react'

/* Board text is written by players, so its links open away from the board and
   carry `nofollow ugc`: the site vouches for none of them. */
const LINK_OPTIONS = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow ugc',
  className: 'text-primary-text underline underline-offset-2 hover:text-primary',
}

/** Text with its URLs turned into links, rendered as a `<p>`. */
export default function LinkifiedText({ text, className }: { text: string; className?: string }) {
  return <Linkify as="p" options={LINK_OPTIONS} className={className}>{text}</Linkify>
}
