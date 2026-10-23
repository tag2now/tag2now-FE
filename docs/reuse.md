# Finding and reusing existing frontend code

[Documentation index](../CLAUDE.md) · [Working agreement](../AGENTS.md)

Discover candidates from the current source for each task. Component names,
props, exports, supported value types and consumers belong in code; this guide
does not keep a parallel inventory. Adding, moving or deleting a component does
not require updating a Markdown list. Update this guide when the search workflow
or architectural boundaries change.

## Discover by behavior

Run searches from the FE repository root. Start with the shared area and then
search all feature folders: an implementation may still be owned by a feature.
Include relevant hooks and helpers when the repeated responsibility is behavioral.

```sh
rg --files src/shared
rg --files src -g '*.tsx' -g '*.ts' -g '!*.test.*'
```

Choose terms for the task's behavior, visible Korean text, domain data and likely
markup. For a dialog or selection control, for example:

```sh
rg -n -i 'dialog|modal|popover|focus' src -g '*.tsx' -g '*.ts' -g '!*.test.*'
rg -n 'role="(tablist|dialog|alertdialog)"|type="radio"|aria-pressed' src -g '*.tsx'
```

These are search examples, not a required list of component names. Change the
terms for the task. An empty result from one term is not enough to conclude that
no equivalent exists; inspect the file tree and broaden the search.

## Follow the implementation and its consumers

Open a candidate's source and inspect its public API, state ownership and styles.
Then search its exported symbol and module path to find actual use:

```sh
rg -n -F 'SymbolName' src
rg -n -F 'path/to/module' src
```

Replace both placeholders with the candidate's actual symbol and import path.
Follow aliases and barrel re-exports, including renamed imports. Read at least
one real consumer and the relevant public-behavior tests; a text-match count is
not a complete dependency analysis. Inspect affected consumers again before
changing a shared API.

## Compare responsibilities before choosing

Check the properties that matter for the task:

- Interaction meaning: panel navigation, single selection, multiple selection and
  an on/off action need different semantics even with similar styling.
- Public contract: value types, controlled state, optional values and callbacks.
- Accessibility: names, roles, keyboard operation, focus entry and restoration.
- Data lifetime: one consumer or a shared source, duplicate requests, refresh after
  writes, cleanup and loading/error behavior.
- Layout: viewport versus container width, stylesheet ownership and responsive states.
- Ownership: generic behavior, domain rules and application composition have
  different dependency boundaries. Follow the [architecture](architecture.md) and
  [styling](styling.md) guides for those decisions.

Reuse a matching implementation. Prefer a small compatible extension when the
responsibility matches but the API is missing a capability. Keep different
behavior local and explain the mismatch; promote it only when a shared
responsibility is established. Shared CSS classes alone do not establish reuse
of the component or its behavior.

## Review the change

Look for duplicated markup, effects, state, subscriptions and styles in the final
diff. In the change summary, name the candidates inspected, what was reused or
extended, and why any new implementation was needed. This records the reasoning
for that change without creating a permanent consumer list to synchronize.

Verification follows the [testing guide](testing.md). Reuse review is currently
manual; the existing typecheck and CI do not detect copied controls or enforce
import boundaries.
