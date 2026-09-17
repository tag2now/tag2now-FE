import { LATEST_PATCH_VERSION } from '@/config/patchNotes'

export default function Footer() {
  return (
    <footer className="app-footer">
      {/* Moved down from the header. The version still comes from the patch
          notes, so the one entry at the top of that file remains the only
          place a release number is written. */}
      <p className="app-footer-tagline">
        Tekken Tag Tournament 2 live hub <b>v{LATEST_PATCH_VERSION}</b>
      </p>
      <address className="app-footer-credit">
        버그/개선 제보<span>@doStudy</span>
        <br />
        <small>doStudy 플레이 단점도 제보 가능</small>
      </address>
    </footer>
  )
}
