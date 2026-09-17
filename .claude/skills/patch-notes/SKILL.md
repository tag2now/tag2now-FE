---
name: patch-notes
description: Write or revise an entry in src/config/patchNotes.ts for a tag2now-FE release. Use when preparing a release, adding a version to the patch notes, or when asked to trim or rewrite notes that read as a changelog. Covers what earns a line, the 10-line budget that decides how many versions stay visible, and how the top version drives the dialog.
---

# Writing tag2now patch notes

The notes live in `src/config/patchNotes.ts`, newest first. They are shown in a
modal on the user's first visit after a release — to players checking whether a
room is up, not to anyone reading a changelog.

## The one test

**Does a reader lose something by not knowing this?**

A line earns its place when the answer is yes. Everything else is noise that
buries the lines that matter.

| Earns a line | Does not |
|---|---|
| A tab, button or label was renamed or moved | The palette, spacing or typography changed |
| Something is possible now that was not | A layout was rationalised |
| A figure is calculated differently, or is now absent | Components were unified or a column reformatted |
| A bug they hit is fixed | Internal counts ("43 ranks", "17 endpoints") |
| A number on screen will look different | Anything visible the moment the screen opens |

The distinction is not size. A 189-file redesign earns **one** line — 전체 디자인
개편 — because the screen shows the rest. A three-line change to a chart's date
range earns a full line with a reason in parentheses, because the reader cannot
see why a data point vanished and will read it as missing data.

## Rules

1. **Name the ability, not the edit.** "게시글에 캐릭터를 2명까지 태그 가능",
   not "post_type에서 characters 배열 분리". The reader does not have the
   codebase.
2. **One line, one thing.** Three screens in one sentence means none of them
   registers.
3. **No implementation vocabulary.** 열, 컴포넌트, 토큰, 필드, 엔드포인트 — all
   belong in the commit message, which is where the detail already is.
4. **Explain a surprise, not a feature.** If a number will look wrong without
   context, put the reason in parentheses: "당일은 제외 (집계 중이라 낮게 보임)".
5. **Short sentences.** The dialog is ~380px wide on a phone. A line that wraps
   to three is skipped.
6. **Korean, no trailing period.** Match the existing entries.

## The budget decides what stays visible

`PATCH_NOTE_LINE_BUDGET` is 10. A version heading costs 1 line and each item
costs 1. `recentPatchNotes()` takes whole versions while they fit, and the rest
collapse behind "이전 버전 N개 더보기".

The newest version is always shown in full, even if it alone exceeds the budget.
So a long entry does not overflow — it **hides every older version**. Nine items
cost 10 lines and leave room for nothing else; seven cost 8 and still leave the
next version out, because v2.5 is 6 lines on its own.

Check what the dialog will actually show before committing. The budget test in
`src/config/patchNotes.test.ts` asserts the entry fits but not how many versions
survive.

## Versioning

Tags are `vX.Y` for a release with new abilities and `vX.Y.Z` for fixes to one.
The FE and BE repositories are tagged independently; a version here says nothing
about the backend.

The top entry's `version` **is** the localStorage seen-marker
(`LATEST_PATCH_VERSION`), so adding an entry is what re-shows the dialog to
everyone. There is no second constant to update. A version in the file must
match the tag that ships it.

## Steps

1. Read the commits since the last tag: `git log v<last>..HEAD --oneline`.
   Read the bodies too — they say what the user-visible consequence was.
2. Sort them by the test above. Most commits produce no line.
3. Write the entry at the top of `PATCH_NOTES`.
4. `npm test` — the budget test must pass.
5. Confirm how many versions the collapsed dialog shows, and whether that is
   acceptable for this release.
6. Commit as `docs(patch-notes): ...`, separately from the code it describes.

## Worked example

v2.6 was 35 commits and 189 files: a full visual overhaul, tab reordering, the
ranking surfaces unified, the matching tables rebuilt, community character tags,
the stats page merged, 43 ranks, and a pile of mobile fixes.

The first draft ran nine items including "색·글꼴·간격을 한 기준으로 통일",
"리더보드·주간 철악귀·홈 요약이 같은 형식으로 표시되고, 순위 기준이 별도 열로
노출" and "계급 43종 전체 지원". It filled the budget exactly and hid all eleven
older versions.

What shipped:

```
전체 디자인 개편
"개요" 탭이 "홈"으로 바뀌고 탭 순서 변경
매칭 목록에서 남은 자리 확인 가능
게시글에 캐릭터를 2명까지 태그 가능
자주 함께한 플레이어를 눌러 바로 이동
일별 접속자 그래프에서 당일은 제외 (집계 중이라 낮게 보임)
모바일에서 이름·전적이 잘리던 문제 수정
```

The three dropped lines described things the screen already shows. The tab
rename stayed because a reader who cannot find 개요 is lost until they are told.
