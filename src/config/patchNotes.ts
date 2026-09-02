export type PatchNote = {
  version: string
  items: string[]
}

/**
 * Newest first. The top entry's version doubles as the "seen" marker in
 * localStorage, so adding an entry here is what re-shows the dialog — there is
 * no second version constant to keep in sync.
 */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: '2.2',
    items: [
      '"개요" 탭 추가 — 접속자, 활성 방, 오늘 최대 접속, 등록 플레이어를 한눈에',
      '개요에서 리더보드 TOP 5 / 주간 철악귀 / 모집 중인 예약 / 최신 게시글 요약 확인',
      '접속 시 첫 화면이 개요로 변경',
    ],
  },
  {
    version: '2.1.1',
    items: ['예약 매치 종류에 "상관없음" 추가 (양쪽 필터에 모두 표시)'],
  },
  {
    version: '2.1',
    items: [
      '리더보드에 100위 밖 플레이어도 표시',
      '리더보드 이름 검색 및 캐릭터 필터 추가',
      '내가 만든 예약 수정 / 삭제 가능',
    ],
  },
  {
    version: '2.0.1',
    items: ['Yaksa 까지 계급 이미지 추가'],
  },
  {
    version: '2.0',
    items: [
      '신규 서버로 변경 (rpcn.tag2now.click)',
    ],
  },
  {
    version: '1.1',
    items: [
      '유저 이름 클릭 시 플레이어 히스토리 패널 오픈\n(리더보드, 랭크매치, 주간 철악귀)',
      '플레이어 히스토리에 활동 시간대 차트 추가',
    ],
  },
]

export const LATEST_PATCH_VERSION = PATCH_NOTES[0].version

/** How many lines the collapsed dialog is allowed to render — a version heading
 * counts as one, and so does each of its items.
 */
export const PATCH_NOTE_LINE_BUDGET = 10

/** The newest releases that fit the budget, whole versions only.
 *
 * A version is taken all-or-nothing: half a release reads as if the rest of it
 * never shipped. The first is always included, so a single release longer than
 * the budget still shows in full rather than collapsing to nothing.
 */
export function recentPatchNotes(notes: PatchNote[] = PATCH_NOTES): PatchNote[] {
  const taken: PatchNote[] = []
  let lines = 0
  for (const note of notes) {
    const cost = 1 + note.items.length
    if (taken.length > 0 && lines + cost > PATCH_NOTE_LINE_BUDGET) break
    taken.push(note)
    lines += cost
  }
  return taken
}
