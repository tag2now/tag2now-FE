import { Share } from 'lucide-react'
import useInstallSheet from './useInstallSheet'

/** Offers tag2now as an app: the browser's install where it has one, the iOS
 * share-sheet route where it does not. A strip, not a dialog — nothing behind
 * it is blocked. */
export default function InstallSheet() {
  const { kind, install, dismiss } = useInstallSheet()
  if (!kind) return null

  return (
    <aside
      aria-label="앱 설치 안내"
      className="install-sheet flex items-center gap-3 p-3 bg-bg-panel border border-border-light rounded-lg shadow-lg"
    >
      <img src="/icon-192.png" alt="" className="size-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-txt">tag2now를 앱으로</p>
        {kind === 'prompt' ? (
          <p className="m-0 mt-0.5 text-xs text-txt-dim">홈 화면에서 바로, 주소창 없이 열 수 있어요</p>
        ) : (
          <p className="m-0 mt-0.5 text-xs text-txt-dim">
            공유 <Share size={12} className="inline align-[-1px]" aria-label="버튼" /> → <b className="text-txt">홈 화면에 추가</b>
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {kind === 'prompt' && <button type="button" className="btn-primary" onClick={install}>설치</button>}
        <button type="button" className="btn-ghost" onClick={dismiss}>닫기</button>
      </div>
    </aside>
  )
}
