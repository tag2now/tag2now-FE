# Frontend working agreement

This file applies to `tag2now-FE/`. Start here, then use [CLAUDE.md](CLAUDE.md)
as the documentation index. The sibling repositories have their own instructions.

## Planning and scope

- Explain the approach and manageable steps before non-trivial development;
  wait for explicit approval. An approved step may proceed without another
  confirmation. Propose a new plan when the scope or behavior changes materially.
- When meaningful alternatives exist, explain their trade-offs and agree on the
  choice before implementation.
- Check the working tree first and preserve existing changes. Keep each step
  focused so the user can review it independently.
- Respond in Korean; use English for code, paths and identifiers. Give technical
  reasons, concrete findings and verification results.
- Never commit, push, tag or rebase unless the user explicitly requests that
  operation. Completing a step does not authorize a Git mutation.

## Reuse review before implementation

For every UI, hook or helper change:

1. Search the current source in `src/shared/` and the feature folders for an
   existing equivalent. Search by the required behavior, visible text and code
   patterns, not only a guessed component name. Use the [reuse search guide](docs/reuse.md)
   for search techniques; source code supplies the current inventory.
2. Inspect the candidate's public props or return type and at least one real call
   site. Check selection semantics, supported value types, focus/keyboard behavior,
   data subscriptions and responsive behavior before deciding it fits.
3. Reuse a suitable implementation. If a small compatible extension satisfies the
   need, extend it and verify its existing consumers. Do not copy its markup,
   state logic or CSS into a feature just because one prop is missing.
4. If the behavior is different, keep it feature-local and explain the mismatch
   and chosen boundary in the change summary. Promote code to shared only when
   its shared responsibility is clear. A tab, a radio choice and an on/off toggle
   are different controls even when styled alike.
5. Before finishing, review the diff for parallel implementations. Report which
   existing pieces were reused or extended, or why a new piece was necessary.
   State the candidates inspected and the reason for the choice in the change
   summary; do not maintain a separate component or call-site inventory in Markdown.

Reusing a CSS class alone does not replace this review. For ordinary buttons and
inputs without a shared React component, use the existing style primitives; do
not create an abstraction solely to wrap one element. Verify capabilities and
existing duplication in the current source on each task.

## Structure and documentation

- Keep the existing feature-folder layout. Follow [architecture.md](docs/architecture.md)
  for current ownership; do not introduce a new directory hierarchy as incidental cleanup.
- Distinguish generic UI/helpers, game/player domain code and application-level
  feature composition. Existing dependencies in `shared/` are documented exceptions,
  not a pattern to extend without review.
- Use `config/routes.ts`, `config/endpoints.ts`, `config/polling.ts` and
  `shared/util/storage.ts` for their existing contracts instead of copying literals.
- Read [styling.md](docs/styling.md) before changing styles. Preserve stylesheet
  import order and use existing tokens and controls.
- Update the owning document in the same change as the behavior or API it describes.
  Document architectural decisions and workflows; keep component props, exports
  and consumer lists in source. Adding a component alone does not require a
  documentation entry. Use a few source links only where a decision needs an example.
  Label historical plans and unresolved work so they cannot be mistaken for current behavior.

## Verification

- Test observable behavior through public APIs and components; do not test private
  helpers directly or add tests that merely repeat the implementation.
- Use [testing.md](docs/testing.md) and the [test workflow](.claude/skills/test/SKILL.md)
  to choose checks. Code changes require the applicable full workflow when final;
  Markdown-only work gets link, path and content checks rather than a full app suite.
- For shared UI changes, check affected consumers on desktop and phone, including
  focus, keyboard interaction, loading/error states and state preservation.
- Report what ran and any failure or unverified limitation. Do not call a skipped
  or failed check a pass. Ask only for the next unapproved step after finishing the
  currently approved work.
