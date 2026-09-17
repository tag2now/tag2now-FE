/** The wordmark, and the slot the profile portals into on a phone.
 *
 * It used to carry the site's tagline, the version, the Live count and the
 * profile as well — five things in one bar, and the two live player counts
 * (Live here, 접속자 on the overview) within a few hundred pixels of each other
 * saying the same number. The tagline and version went to the footer, where a
 * line read once belongs; Live went above the nav, with the rest of "what is
 * true right now" — the tab you are on, the room count, the reservation count.
 *
 * `#headerProfileSlot` stays in the markup at every width. PlayerProfileCard
 * renders into it through a portal and the stylesheet decides which of its two
 * surfaces is visible, so the username being edited is one piece of state
 * rather than one per surface.
 */
export default function Header() {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        {/* The mark the site is already identified by: this is the same file
            the browser tab and the share card use, so the three cannot drift.
            It replaces a hand-drawn "2" in a bordered box that looked like a
            placeholder for the logo rather than the logo. */}
        <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" width={34} height={34} />
        <h1 aria-label="Tag 2 Now">TAG<span>2</span>NOW</h1>
      </div>
      <div id="headerProfileSlot" className="profile-control" />
    </header>
  )
}
