# Frontend architecture and feature behavior

[Documentation index](../CLAUDE.md)

Paths and commands in prose are relative to the FE repository root unless linked otherwise.

**Feature-folder layout.** Each feature owns its components, hooks, types and API
calls. `shared/` currently contains generic primitives, game/player domain code
and some application composition. Follow the [reuse search guide](reuse.md) to
find current implementations before adding an equivalent.

```
src/
  App.tsx              visit-wide data subscriptions and application composition
  app/                 application layout, routes, navigation, account and ranking-view composition
  main.tsx             root render, Toaster, global unhandledrejection handler
  index.css            the stylesheet import list; its order is the cascade
  config/              routes, endpoints, polling, tabConfig, patchNotes, test-setup
  auth/                RPCN login — session store, useAuth, LoginDialog
  admin/               account moderation and TTT2 saves — Admin page, SaveAdmin, adminApi, saveApi (admins only)
  overview/            landing summary — useOverview, Overview, KPI and top-five cards
  match/               rooms — useRooms, Rooms, RankMatchTable, PlayerMatchTable
  reservation/         appointments — Reservation, reservationApi, reservationLabels
  community/           board — useCommunity, communityApi, post/comment components
  stat/                statistics — useStats, useWeeklyTop, Stats
  records/             everyone's rank matches — useMatchRecords, Records
  chat/                lobby chat — chatStream (SSE store), Chat, launcher/panel components
  streaming/           a player's registered broadcast channel and its edit dialog
  popup/               site popups — SitePopups, popupApi, popupDismissal
  install/             install eligibility, captured browser prompt and install sheet
  shared/              api util, Leaderboard, hooks, components, colors, formatters
```

Feature folders use a container, state hooks, types, API modules and a `component/`
subfolder where needed. Not every feature needs every file or a barrel export.

## Ownership and current exceptions

- Keep feature-specific rules in the feature. Generic UI and transport helpers
  must not acquire unrelated feature behavior as part of a small UI change.
- Compose cross-feature screens at the application boundary. `App.tsx` currently
  owns visit-wide data subscriptions and passes data into application composition
  under `app/`. The layout arranges the sidebar, routed content and persistent chat;
  the route table connects feature screens to that data without new subscriptions.
- Rank order, code/name conversion and sorting belong to the shared game domain,
  independent of React and feature folders. Feature screens and rank presentation
  consume that model directly; UI modules do not re-export domain functions.
- Activity summaries and player-history contracts used across features belong to
  shared domain models. Shared charts and helpers consume those models directly;
  types used only by a feature remain in that feature.
- Account composition belongs to `app/`: it connects authentication, the header
  portal, player history and stream settings. The shared profile card receives
  display data and a history callback without owning those application behaviors.
- Ranking-view composition belongs to `app/`: it connects URL selection, board
  data and the signed-in reader. The shared leaderboard receives the reader's id
  as a prop alongside its data, without subscribing to authentication itself.
- Shared rank presentation accepts a name and optional tier, independently of
  room and character response types. Feature-owned payload fields remain in
  their models rather than becoming dependencies of the shared image component.
- The API helper reads `auth/session.ts` for bearer tokens and session expiry.
  This transport integration is the explicit import-boundary exception; it does
  not permit other shared code to depend on authentication.

The feature-folder layout remains in place. Application composition is separated
under `app/`; production import boundaries are enforced locally and in CI.

## Import boundaries

Run `npm run lint:architecture`. [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
owns parsing, module resolution and dependency validation. The project maintains
the [boundary configuration](../.dependency-cruiser.mjs), not its own analyzer.
`tsConfig` reads the project's aliases and `tsPreCompilationDeps` includes type-only
references. Package exports use browser/import resolution. The command starts at
the `src/` directory rather than relying on the TypeScript project's include list.

| Source | Allowed local targets |
|--------|-----------------------|
| `app/` and application entry modules directly under `src/` | Any production layer |
| `shared/`, `config/` | `shared/`, `config/` |
| Feature folders | Feature folders, `shared/`, `config/` |

Any other folder under `src/` is a feature automatically. New components and
features need no registry entry. This gate does not restrict references between
features or detect copied UI; source-based reuse review still applies.

Statically resolved imports, type imports, re-exports, literal dynamic imports,
import type expressions and require forms follow the same rules. Unresolved
production imports fail. Local TypeScript/JavaScript code outside `src/` cannot
serve as a bridge; external packages remain allowed. Arbitrary computed paths
such as `import(variable)` are outside static dependency analysis; use literal
paths for architectural dependencies and inspect computed loaders during review.
Syntax and type correctness are checked separately by TypeScript.

Test/spec files, compile-only `.test-d.ts` files, `__tests__/` and `__mocks__/`
folders, and the test setup entry are exempt as dependency sources. Production
imports of those test-only files fail. The setup entry's fixed path is a test-harness
boundary, not a list to update when a component is added.

The transport/session exception lives in the configuration as an exact resolved
source/target pair with a reason. It does not permit a whole feature or directory.
A native `required` rule fails if the transport stops depending on the session;
the policy test also verifies the real edge exists if the source itself is removed.
Remove the exception, required rule and that policy assertion together when the
integration is removed. `npm run test:architecture` checks project rules against
temporary projects using dependency-cruiser's public API and native CLI, including
type-only references, re-export paths and a nonzero exit on violations.

## Data flow

Backend HTTP calls use [shared/util/api.ts](../src/shared/util/api.ts).
`GET`/`POST`/`PUT`/`PATCH`/`DELETE` prepend the base URL, attach
`Authorization: Bearer <token>` when signed in and throw on non-2xx. A 401 on a
request that carried a token ends the session and requests login with the server's
reason. Paths come from [config/endpoints.ts](../src/config/endpoints.ts).

JSON helpers default to `unknown`; feature API calls declare their response type
and reuse domain input types. Query records contain scalar strings, numbers or
booleans; repeated keys use `URLSearchParams`. Write bodies contain JSON values,
with undefined object fields omitted by the existing JSON serialization.
DELETE defaults to a no-content contract; endpoints returning JSON declare its
type explicitly. These types describe backend contracts without validating payloads
at runtime. Server shapes that differ from UI models are mapped at the API boundary.
Room groups retain their specific contracts through that mapping: rank-match rooms
carry rank metadata, while player and additional room groups may omit it. The room
screen selects from those groups without asserting a generic room is a rank match.
Data hooks narrow rejected values from `unknown` with the shared error-message
helper, preserving supplied string messages and converting other values to strings.

The build-update hook separately fetches `/version.json`; chat uses `EventSource`
with a URL from `chat/chatApi.ts`. Do not route either through JSON API helpers
merely to make every transport look alike.

The base URL is `window.__ENV__?.API_BASE ?? '/api'`, letting a deployed build override the endpoint at runtime without a rebuild.

**Fetching and polling have two lifetimes.** Both expose data, first-load state,
background-refresh state, error, refresh and last-updated time:

- [usePolledData](../src/shared/hooks/usePolledData.ts) owns state and a timer per
  caller. Use it for a single consumer; null interval means fetch once.
- [createPolledSource](../src/shared/hooks/createPolledSource.ts) shares a snapshot
  and one polling schedule across consumers of the same dataset. It uses the
  fastest requested interval and joins background reads already in flight. Explicit
  refresh waits for a read after the current request, so a write is followed by
  fresh data. State resets when the last subscriber leaves.

Intervals belong in [config/polling.ts](../src/config/polling.ts), not a new local
constant. A single-consumer hook looks like:

```ts
export default function useRooms(): PolledState<RoomsData> {
  return usePolledData(fetchRoomsAll, POLL.rooms)
}
```

`App.tsx` mounts rooms, best-rank and current-rank hooks for the visit. Rooms poll;
both leaderboards fetch once and offer manual refresh. App also subscribes to
`useReservations` and `useCommunityFeed` for navigation badges, choosing the active
or background rate from `POLL` by route. Reservations share their source with the
reservation panel. The community source covers the first unfiltered feed page;
filtered/paginated posts and post details have their own requests in `useCommunity`.
Do not replace them with the badge feed, which does not represent those queries.

## Overview (the landing tab)

A summary of the other tabs, and the entry point rather than a replacement for
them: every card links to the tab it summarises.

Rooms and both leaderboards arrive as props from `App.tsx`. The overview adds
five one-shot requests: daily stats, weekly top, recent posts, notices and
reservations. Do not add a
`useRooms()` or `useLeaderboard()` call here; that would double the traffic for
data the page already holds.

`useOverview` batches those five with `Promise.allSettled`, and a rejected
source degrades to an empty list. One failing endpoint therefore costs its own
card, not the page. It uses a `null` interval — a snapshot, since only
the room figures are genuinely live and those stay fresh through App's poll.
There is no refresh button: the route remounts when the reader leaves the tab
and comes back, which refetches, and the error state keeps its own retry. The
panel's h2 is `sr-only` — it holds the heading outline together (h1 → h2 →
the cards' h3) without spending a toolbar's height above the figures.

The overview reservation request currently runs separately from the badge's
shared source. Preserve that distinction when measuring requests; the overview
has not yet been migrated to a shared snapshot.

**Two joins worth knowing:**

- The weekly-top endpoint (`/records/weekly-top`) reports match counts with
  wins and losses, not characters. Portraits are joined in from the current-rank
  board by npid in `shared/weeklyTop.ts`, which both the stats tab and this card use;
  a player outside the leaderboard renders dashes rather than dropping columns.
- `fetchRoomsAll` deliberately shuffles group order, so the "활성 방" hint reads
  the groups back in `GROUP_ORDER`. Without that the KPI reorders itself on
  every 5s poll.

The two ranking cards are `shared/components/RankList`, the same component the
leaderboard tab and 통계 draw — see **Rankings** below.

## Rankings

**One list, three tabs.** The leaderboard, 이번 주 활동왕 on 통계, and the two
summary cards on the home page show the same five things about the same
players — position, name, the figure the list is ranked by, main, sub. They
used to be two `<table>`s of differing column counts and a grid of `<li>`s, so
the same player looked like different data depending on which tab you reached
them from. `shared/components/RankList` is the only thing that renders a
ranking now; a caller supplies rows and the heading over the figure.

It is a **grid carrying the table roles** (`role="table"/"row"/"columnheader"/
"cell"`) rather than a real `<table>`: in a narrow list the figure moves *under*
the name, which table layout cannot express. Five tracks hold 386px before the
name gets any, so a list under 540px runs four columns and two lines instead.
That is a **container query on `.rank-list`**, not a media query: a phone
lands there, and so do the home page's two rankings, which sit side by side —
주간 철찌 left, above the chart — at half a desktop each. The cells are
placed by **`:nth-child`, never `:nth-of-type`**: every child of a row is a
`<span>`, so by type they all count as one and a `:nth-of-type` rule silently
selects the position cell instead.

`rank` is the position shown and the one the podium colours key off, and it
defaults to the row's place in the list. Pass it explicitly wherever the list
can be filtered — the leaderboard does — or a filtered view awards a medal to
whoever happens to land in the top three rows.

`MiniCharCell` is the character cell every ranking uses: the portrait, rank
badge, win rate and record at row size. `shared/components/CharCell` is the
larger one, left to the history panel and the profile card.

The rules live in `shared/styles/ranking.css`, imported directly after
`overview/overview.css` because that is where they were written — moving them
would reorder them against the rules in `styles/boards.css`,
`shared/styles/leaderboard.css` and `styles/responsive.css`.

## Leaderboard: current and highest rank

Both boards rank players by rank. **현재 계급** (`/leaderboard`, the default)
is the rank each save holds now, from tag2now-BE's `GET /saves/leaderboard`;
**최고 계급** (`/leaderboard/best`) is the RPCN score board, the highest rank a
player reached. Name code by that difference --- `currentRank…` and `best` ---
never bare `rank…`, which says nothing about which board.

`shared/currentRankLeaderboard.ts` turns the current-rank answer into the score
board's `LeaderboardEntry` shape --- the highest character in the main slot,
the second in the sub --- so one `Leaderboard` draws both with the same search,
filters and sorts. A save knows only the RPCN id, so the online name is joined
in from the score board, and a player missing there shows their id. Players who
stand equal share a place (1, 2, 2, 4), so pass `rank` through. **최근 30일**
asks the backend for `?days=30`, which filters and re-ranks there; the request
is made only while the option is on, and one `Leaderboard` serves every board so
a search survives a switch.

**Every other place and rank comes from the current-rank board.** App and
`app/AppRoutes` hand `currentRankData?.entries` to the home page, rooms, the
profile card, reservations, the board, 통계, 전적 and the chat, so a `#N` reads
the same on every tab. The score board (`best` in App) feeds only
`/leaderboard/best` and the online names a save lacks --- which is why
같은 계급 상대 찾기 still takes it beside the current-rank entries.

## 같은 계급 상대 찾기 (the match tab)

A button beside 실시간 방 목록's title, on every match tab, opens
`match/component/CurrentRankHolders`: a dialog of players to play now --- who
played a character currently at the chosen rank within 30 days, from
tag2now-BE's `GET /saves/current-rank-holders` (spec 09). The backend orders
them lowest on the current-rank leaderboard first, since rank correction lifts
a strong player's other characters; this adds only that anyone in a room right
now --- `roomUsers`, from App's rooms poll --- moves to the top.

- Nothing is asked until the dialog opens, then once per rank chosen, never
  polled: the backend caches for five minutes, and who is in a room already
  refreshes with the rooms. The rank chosen survives closing and reopening.
- A signed-in player's opens on the highest rank they *played* a character at
  (`bestPlayedRank`, from their own save); a rank they pick wins over it even if
  the save answers later. Signed out, nothing is asked until a rank is picked.
- The rank is picked with `shared/components/RankField` --- the admin save
  editor's picker, moved to `shared/` for this --- from 1st dan up.
- Each name carries the community's byline: the account rank (the highest
  reached, never demoted) and the place on the current-rank board, joined from
  App's `/saves/leaderboard` by RPCN id. The reader is left off their own list.
  A name comes from the score board, else their room, else the bare id.
- At most five portraits a row, then `+N`: some players have played every
  character at a rank, all 59 at once.
- The dialog is portalled to `document.body`: inside the title bar, a phone rule
  (`.section-title p { display: none }`) hid its paragraphs. It is capped at
  half the screen's height, and its button at 36px on a phone, under the 44px
  floor every other button keeps there.

## Routing

**The URL is the navigation state.** There is no `tab` state — `useActiveTab`
(`shared/hooks/useActiveTab.ts`) derives the selected tab from `useLocation()`,
so a nav click, the back button, and a cold deep link all arrive the same way.

| Path | Panel |
|------|-------|
| `/` | overview (the landing panel, so a bare link opens it) |
| `/match/:group` | rooms for that group |
| `/leaderboard`, `/leaderboard/best` | the leaderboard: current ranks, or the highest each player reached |
| `/stats` | that tab |
| `/records` | everyone's recorded rank matches |
| `/reservation`, `/reservation/:id` | reservations, optionally opened on one |
| `/community`, `/community/:postId` | the board, optionally opened on one post |
| `/admin`, `/admin/saves`, `/admin/streams`, `/admin/popups` | the admin page's sections; no nav tab, reached from the account menu |
| `/event` | the rank event; no nav tab, reached from a sidebar card or, on a phone, a floating link |
| anything else | overview, via the catch-all route |

`config/routes.ts` is the single answer to "what URL is this tab?" — `pathOf`,
`postPath`, `reservationPath`, and `FIXED_TABS`/`isRoomTab`. The nav, the
overview's section links, and the tests all read it, so none of them can drift
apart. Adding a non-room tab means adding it to `FIXED_TABS` **and** `TAB_PATHS`
there; miss the first and it is handed the rooms panel.

**Detail views are routes, not local state.** `Community` reads `:postId` and
`Reservation` reads `:id` rather than holding a selection of their own, which is
what makes a post link shareable. `Community` keeps one genuinely local mode —
`create` — because there is nothing to link to until the post exists; a `mode`
value collapses it with the URL-derived detail so the branches stay exclusive.

The catch-all matters in production: nginx serves `index.html` for every path
(`try_files`), so a typo reaches the app rather than a 404 page and has to land
somewhere sensible.

## Tabs

Navigation has two levels in `app/`, composed by `App.tsx`:

- The primary navigation is fixed: home, match, reservation, community, leaderboard,
  stats and records — seven, which is also the phone tab bar's column count. Match opens the first room group; admin is reached through the account menu.
- Room-group tabs appear only on a match route. Their keys start with `GROUP_ORDER`
  from `config/tabConfig.ts`, followed by any unknown groups returned by the API.
  Known groups remain present during the initial load or a failed request.

Room data affects only the **count in the label**, never which tabs exist. Until the first successful load the count renders as `(—)` rather than `(0)`, so a pending or failed fetch is not mistaken for "no rooms"; afterwards a group the payload omits is genuinely `(0)`.

Do not gate room tabs on the rooms response. Doing so made the tab strip shift during load, silently moved the default tab to `reservation`, and required a fallback that rendered the rooms error panel on top of unrelated tabs.

Both levels use `tablist`/`tab` roles and a linked tabpanel. The primary navigation
implements roving `tabIndex` and arrow-key navigation; room-group buttons currently
have selection-based `tabIndex` but no arrow-key handler. Preserve existing URL and
focus behavior when extracting navigation and verify any keyboard improvement
explicitly. Nav buttons call `navigate()`; overview content links use `<Link>`.

## Login

Every write — reservations, their comments, the whole board and the chat —
needs a signed-in **RPCN account**; reads need nothing. `POST /auth/login` checks the
password with RPCN and answers a stateless bearer token (a JWT, 7 days by
default). Nothing on the server can end it early, so signing out is just
forgetting it.

`auth/session.ts` holds the session outside React so `api.ts` can read the token.
Remembered sessions use the `STORAGE_KEYS.session` key and synchronize across tabs
through storage events. With remember-login unchecked, the session stays in memory
for the current page and does not overwrite another tab's persisted session.
Expiry is scheduled in the session store. Components subscribe through `useAuth()`
(`useSyncExternalStore`).

**Guard writes with `requireUser(reason, retry)`**, never by checking `user` and
showing an error: it returns the user, or opens the one `LoginDialog` App
mounts — with `reason` as its lead line — and returns null so the handler just
returns. It does not throw; the dialog is the message. Pass the handler itself
as `retry`: it runs again once the login succeeds, so the press that asked is
not lost. Dismissing the dialog drops it, and closing the dialog aborts a login
still in flight — a cancelled login must never sign anyone in.

The account lives in the header at every width: a login button while signed
out, otherwise the name, which opens an account menu (내 정보 보기, 관리자 메뉴
for admins, 로그아웃) rather than signing out. Signing out always goes through
a confirmation. The sidebar card is the profile — characters, ranks, the record — and renders only
while someone is signed in; a phone hides it.

**"Is this mine?" compares `user.username`** — the RPCN id, which is also the
leaderboard's `np_id` — never a displayed name. Reservations carry
`host_username`, participants `username`, comments `author_username`; the
board's `author` *is* the username. `online_name` is for display only. The
profile card and the leaderboard's own-row mark find the record by `np_id` for
the same reason; two players can share an online name. Rows written before
login have a null username and belong to nobody.

A comment — on the board or on a reservation — is also any admin's to delete;
`isAuthorOrAdmin` in `auth/types.ts` offers the button, and the backend decides.
A deleted board comment with replies still standing comes back as `deleted`
with an empty body and is shown as "삭제된 댓글입니다.".

## Account moderation

The admin page has four sections behind inner tabs, each with its own URL:
accounts, saves, stream channels and popups. Every section stays mounted while
hidden, so a switch keeps a lookup's result and a half-written form.

`/admin` looks an RPCN account up and bans it, through `POST /admin/users/lookup`
and `/admin/users/ban`. rpcn-narco wants the admin's password on **every**
call and the backend keeps none, so the page asks for it once --- one field
above the account and save sections, shared by both --- and holds it in
component state only --- never in `session.ts` or storage --- until the page is
left. A ban goes to the account that was looked up, not whatever the id field
says by then.

The lookup buttons are **not** disabled for an empty password or id: pressing
one, or Enter, warns in a toast and puts the cursor in the empty field
(`warnEmpty`). A dimmed button that does nothing explains nothing.

The save section, `SaveAdmin`, edits a player's TTT2 save through
`/admin/saves/*` (tag2now-BE spec `09-save-admin.md`). **An edit is two
requests**: the preview (`dry_run`) answers the changes and the save's
`sha256`, and 적용 sends the *previewed* edit back with that sha256 as
`expect_sha256`, so a save the game rewrote in between is refused (409) rather
than overwritten. Changing any form field drops the preview, and 적용 is not
offered for what the server would refuse: an online player, a floor that reads
as demotions, or a preview that changes nothing. The server stays the
authority; those are 409s too.

The save screen owns lookup, request state, confirmation and the preview/edit
snapshot used for applying a change. Its feature-local form owns input state and
validation; the preview and result sections render data and call back for actions.
They reuse shared controls and the save-character table without fetching again.
An apply refresh keeps the form mounted for the same username; an explicit lookup
clears the old result and preview, so the next result starts with fresh form state.

`user.admin` only decides whether the form is shown; RPCN re-checks the role
each time. A wrong admin password comes back **400**, not 401, because a 401 on
a signed-in request ends the session in `api.ts`.

It and `/event` are the fixed panels with no nav tab. Both are in `FIXED_TABS` so
they are not handed the rooms panel, and App then selects no tab, gives the roving
tabindex to the first one, and names the tabpanel itself.

## Save ranks on a profile

`PlayerHistoryPanel` --- the profile every player name opens, 내 정보 보기
included --- has three ARIA tabs: 플레이 기록 (the default), 전적 (see
**Match records** below) and 캐릭터별 계급, anyone's TTT2 save from the public
`GET /saves/players/{npid}`. The save is
read only when its tab is opened, and fails on its own: a 404 is "no save", any
other error stays inside the tab. The backend caches it for ten minutes.

The play history tab shows activity in KST from noon to the following noon.
Adjacent active hours share one band across midnight. Inactive hours separate
bands, and the total counts distinct active hour slots in the selected period.

The character table is `shared/components/SaveCharTable`, the same one the
admin page draws; its rules live in `shared/styles/saves.css`, not `admin/admin.css`.

## Match records

Finished rank matches, from tag2now-BE's `GET /records/matches` (spec 11): who
played whom, the result, and each character with the rank it **went into the
match at**. Two screens draw the same row, `shared/components/MatchRecordRow`:
1P on the left and 2P on the right as the game seated them (the backend reads
the room's slot order), the result beside the VS --- WIN VS LOSE or LOSE VS WIN
--- and the winner's half tinted. On both sides the higher rank sits by the VS,
since a match pairs players by their best character.

- **`/records`** --- everyone's matches, searchable by name (`q`, asked once
  typing pauses). Fetched once and refreshed by hand, like the leaderboards; a
  name opens the profile.
- **The profile's 전적 tab** --- the same list with `npid`, seated the same way,
  so the player may be 2P; only their own name is not a link. Read only when
  the tab opens; an opponent's name opens them in the same panel, as 자주 함께한
  플레이어 does. The 통산 line above it
  is the save's lifetime record (`GET /saves/players/{npid}`), not a count of
  the list: the backend keeps no per-player totals, and the list starts only
  when tag2now began recording. No save, or a failed read, drops just that line.

Both page by **`before`, not page numbers** (`shared/hooks/useRecordPages`):
matches keep arriving at the top, so page 2 by number would repeat rows.

A match is found in the saves and its opponent in the rooms, so a row can lack
either: "캐릭터 미확인" when that side's save was not seen, "상대 미확인" when
no room was (the side seen is then 1P), and the id when no name was. Matches recorded before ranks were
kept have `rank: null` and show portraits alone. The row, its API and the hook
live in `shared/` because the profile panel there uses them; the import
boundary forbids `shared/` reaching into `records/`.

## Reservation ownership

Editing (`PATCH /reservations/{id}`) is refused once anyone has joined: participants agreed to the conditions as they stood, and letting the host move the time underneath them would bind people to an appointment they never accepted. The host cancels and re-posts instead. The edit button is disabled once `participant_count > 0` so the host sees the restriction before acting, but the server stays the authority — a participant arriving while the editor is already open is caught by the 400, not by the disabled state. The create modal doubles as the edit form — same fields, same validation — so a rule cannot drift between posting and editing.

Cancelling is a soft delete (`status = 'cancelled'`) that also releases every participant. `GET /reservations` returns only `open` and `matched`, so a cancelled reservation disappears on the next poll without any client-side removal.

Match-type labels and the KST time format live in `reservationLabels.ts`, not
`reservationApi.ts`: the overview needs them too, and `Reservation.test.tsx`
replaces the whole API module with a mock, so anything the UI reads at import
time has to sit outside it.

The booking window — at least ten minutes out, before the next 06:00 KST — is
the backend's rule, mirrored in `bookingWindow.ts` so the form can refuse a
start instead of submitting it. Its constants are copies of `LEAD_TIME` and
`DAY_END_HOUR` in tag2now-BE's `reservation/domain.py`: change both together.
The server still rejects whatever a stale copy lets through.

The list groups and sorts by `start_at`, not the `HH:MM` it displays, and labels
each start 어제/오늘/내일 (`kstDayLabel`). A time alone is ambiguous here: the
window crosses midnight, so "01:00" can follow "23:00".

## Chat

The lobby chat since the previous day's 06:00 KST, from tag2now-BE's `/chat` routes. **Reading is public,
writing needs a login** — and the stream has to stay public, because an
`EventSource` cannot send an `Authorization` header.

`chat/chatStream.ts` holds it outside React, like `auth/session.ts`: one
`EventSource` for the whole page, opened with the first subscriber, closed with
the last and while the tab is hidden. Every connection opens with a `snapshot`
that **replaces** the list. The backend persists messages in PostgreSQL and uses
an in-process event bus. Reconnects receive a fresh snapshot rather than resuming
from `Last-Event-ID`, so deletes missed while disconnected are reflected too.
The backend subscribes before reading its snapshot; overlapping messages are
deduplicated by id. The browser reconnects a dropped stream; the store reopens a
closed stream with backoff. Unread counts compare `created_at` with the last-read
timestamp. The contract is in the [chat specification](../../tag2now-BE/docs/spec/10-chat.md).

`Chat` is mounted once, as the last child of `.app-layout`. From 1350px
(`DOCKED_QUERY`) it is a third, always-open column right of the main one,
300×660 and sticky like the sidebar. 1350 is measured: the narrowest width at
which the home page's two rankings still share a row beside it. Below that it is a launcher in the viewport's
bottom-left corner that opens a 320×440 panel, and on a phone a full-screen
sheet over the tab bar. The grid takes the third column through
`.app-layout:has(> .chat-docked)`, so the breakpoint is written only in JS.

jsdom has no `EventSource`; `test-setup.ts` installs `chat/fakeEventSource.ts`,
and chat tests play the server through `FakeEventSource.latest().emit(...)`.
In E2E, `mockAllApis` answers the stream with its snapshot and a one-day
`retry:`. That response then ends, so the chat shows its "연결이 끊겼습니다"
notice throughout every spec; a real stream stays open.

nginx needs nothing for the stream: the backend's `X-Accel-Buffering: no`
turns proxy buffering off for that response, and its 15 s ping keeps the
connection inside `proxy_read_timeout`. Both were checked through
`nginx.conf.template` in a container.

## Site popups

Admins write popups under `/admin/popups` (`admin/PopupAdmin`) and every visitor, signed
in or not, sees the active ones on opening the site, from the public
`GET /popups/active`. The contract is in the
[popup specification](../../tag2now-BE/docs/spec/11-popup.md).

`app/StartupDialogs` keeps it to one dialog at a time: the patch notes first, then
`popup/SitePopups`, which reads the list only once they have closed and shows the
popups newest first, one by one. A failed read shows nothing and says nothing.

Each popup says which of 하루 동안 보지 않기 and 다시 보지 않기 it offers. Either
one writes to `dismissedPopups` in this browser (`popupDismissal`): 'forever', or
the moment 24 hours from the click. X, the backdrop and Escape write nothing, so
those popups return on the next load, as the patch notes do. Nothing is kept on
the server, since a signed-out visitor has no account to keep it on, so another
browser asks again. Editing a popup does not bring it back; a new popup does.

The body is plain text with its line breaks kept, never HTML. Images go through
the API, whose URL carries the content's hash, so the backend can tell browsers to
keep them for good.

Uploads are multipart through `request()`, which leaves the `Content-Type` to the
browser. nginx allows 6 MB on `/api/`, room for the backend's 5 MB image and the
form around it; `PopupAdmin` checks the size first, because past nginx's limit the
answer is an HTML page rather than a sentence to show.

The install sheet is not held back for a popup, which loads after it. It sits
under the popup's backdrop until the popup closes.

In E2E, `mockAllApis` answers an empty list unless a spec passes `popups`.

## Install sheet

`public/manifest.webmanifest` makes the site installable, and
`install/InstallSheet` offers it: a strip, not a dialog, bottom-right on a
desktop (bottom-left while the chat is docked, whose composer owns that corner
on a short screen) and above the tab bar on a phone. Two routes:

- **Chromium** fires `beforeinstallprompt` when it would install the site.
  `install/installPrompt.ts` catches it at module load, outside React, because
  it can arrive before the app mounts and comes once per page. The sheet's
  button calls its `prompt()`, which opens the browser's own dialog and only
  works inside a click. Catching the event also suppresses Chrome's mini-infobar.
- **iOS** has no such event. `canAddToIosHomeScreen` reads the user agent —
  Safari or Chrome, not an in-app browser, not already launched from the home
  screen — and the sheet explains 공유 → 홈 화면에 추가 instead.

It never shows on a load that opened on the patch notes (`hasUnseenPatchNotes`,
read once at mount), so a first visit has one overlay to close, not two. Closing
it, or pressing 설치 whatever the dialog's answer, sets
`installSheetDismissed` and it does not return.

A test runner is not install-eligible, so E2E dispatches a synthetic
`beforeinstallprompt`. For the real dialog, open the dev server in the Android
emulator's Chrome through `adb reverse tcp:5173 tcp:5173` — `localhost` there is
a secure context, as the host's LAN address is not.

## Error handling

`main.tsx` registers [reportRejection](../src/shared/util/reportRejection.ts).
Only rejected `AppError` instances are claimed with `preventDefault()` and shown
as a toast; other rejections retain the browser's reporting. Unexplained API
failures get a generic Korean message. Callers needing inline error state catch
and store the error themselves.

[panelStatus/statusBody](../src/shared/util/panelStatus.tsx) render shared loading
and error states. Empty content is handled by the caller or a domain component
such as RankList.

## Specifications and maintenance

Current backend contracts live in [the backend specifications](../../tag2now-BE/docs/spec/README.md),
especially [reservations](../../tag2now-BE/docs/spec/04-reservation.md) and
[authentication](../../tag2now-BE/docs/spec/07-auth.md). Cross-check their source when
changing a contract. The workspace's [MVP reservation proposal](../../docs/MATCH_RESERVATION_SPEC.md)
is historical; its owner-token and calendar-day design is not the current API.

Update this document when routes, source lifetimes, ownership or feature behavior
change. Discover reusable contracts and their consumers from source for each task;
do not maintain a parallel component list. Keep exact polling values, paths and
storage keys in their source modules rather than another table.
