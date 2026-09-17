import { charImageUrl } from '@/shared/characterImage'
import { DEFAULT_POST_TYPE, POST_TYPES } from '@/community/types'

type BadgeSize = 'sm' | 'md'

interface PostTypeBadgeProps {
  postType: string
  /** The characters the post is about — up to two. */
  characters?: string[]
  size?: 'sm' | 'md'
}

/** What a post is tagged with: its category, and the characters it is about.
 *
 * These used to be the same value. `post_type` held either a category or a
 * character name, and this component decided which by asking whether the
 * string happened to match a portrait file — so a post could be a 공략 or
 * about Jin, never both, and a tag-team post could name only half of itself.
 * The backend has carried a separate two-slot `characters` array all along.
 *
 * 자유 is the *absence* of a category — it is the default nobody has to choose
 * — so it is shown only when there is nothing else to show. A post tagged with
 * Jin and Kazuya is about Jin and Kazuya; labelling it 자유 as well states the
 * opposite of what the tags say. 건의 and 공략 are deliberate choices and do
 * render beside characters, because "a 공략 about these two" is a real thing to
 * be and the subject does not replace the kind.
 *
 * Posts written before the split still carry their character in `post_type`
 * and have an empty `characters`. The name moves to the portrait row where it
 * belongs, and no category is shown: that field held a character, so the post's
 * category was never recorded at all.
 */
export default function PostTypeBadge({ postType, characters = [], size = 'sm' }: PostTypeBadgeProps) {
  const legacyCharacter = characters.length === 0
    && !(POST_TYPES as readonly string[]).includes(postType)
    && charImageUrl(postType) !== null

  const tagged = legacyCharacter ? [postType] : characters

  const portraits = tagged.map((name) => [name, charImageUrl(name)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null)

  const category = legacyCharacter || (postType === DEFAULT_POST_TYPE && portraits.length > 0)
    ? null
    : postType

  return (
    <span className={`post-tags post-tags-${size}`}>
      {category && <span className="post-type-chip">{category}</span>}
      {portraits.length > 0 && (
        <span className="post-tag-chars">
          {portraits.map(([name, url]) => (
            <img key={name} src={url} alt={name} title={name} className="char-art post-tag-char" />
          ))}
        </span>
      )}
    </span>
  )
}
