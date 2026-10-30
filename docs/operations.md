# Deployment and analytics

[Documentation index](../CLAUDE.md)

Paths and commands in prose are relative to the FE repository root unless linked otherwise.

Docker multi-stage: `node:24-alpine` builds the SPA, `nginx:alpine` serves `dist/`. `nginx.conf.template` is rendered by nginx's envsubst with `BACKEND_URL` (filtered to the `BACKEND` prefix), proxying `/api/` to the backend.

Caching in nginx: hashed `/assets/` are immutable for a year; `index.html` is `no-cache` so deploys take effect immediately.

The [deploy workflow](../.github/workflows/deploy.yml) builds and pushes the image
to ECR, then releases it over SSH to a Lightsail Docker Compose host. The registry
comes from the ECR login step, the repository from `ECR_REPOSITORY`, and the image
tag from the Git tag. Deployment settings are configured in Actions, not hardcoded
registry values in this document.

The configured public origin in [index.html](../index.html) is
`https://match.tag2now.click`. Keep absolute share/canonical URLs aligned with that
origin. Infrastructure and CDN configuration belong in the backend's
[operations guide](../../tag2now-BE/docs/aws-setup.md); verify deployed settings
there when doing operational work.

| Workflow | Trigger | Does |
|----------|---------|------|
| `test.yml` | PR to `master`, push to `master`, `workflow_call` | unit tests + app typecheck and an independent E2E job |
| `deploy.yml` | `v*` tag | calls test.yml, then builds/pushes the image and deploys over SSH |

The called CI workflow does not yet include the local workflow's E2E typecheck
or CSS lint. See [testing](testing.md#verification-workflow-and-current-ci-coverage).

## Versioning

There is no `APP_VERSION` constant. `src/config/patchNotes.ts` is the single
source of truth: `PATCH_NOTES[0].version` is exported as `LATEST_PATCH_VERSION`,
which drives both the version shown in the footer and the "seen" marker that
decides whether the patch-notes dialog reappears. Adding an entry to the top of
that array is therefore the whole version bump — there is no second constant to
remember, which is what previously let the header, the dialog, and the tags
drift apart. It also **re-opens the dialog for every user**, including everyone
who pressed 다시 보지 않기.

**A release does not need an entry.** Write one only when the user asks for
patch notes — "태그 달아서 배포하자" is a request to ship, not to announce — and
show the proposed lines before adding them. A release without an entry gets a
patch number on the current top version (`v2.9.1` after 2.9), which leaves the
footer and the dialog untouched. A release with a new entry is tagged
`v{version}` to match it; that pairing is the one still done by hand.

**Release is automatic on a `v*` tag.** The `deploy` job SSHes into Lightsail,
writes `FE_IMAGE_TAG` into the instance's `.env`, and restarts **only
`fe`** — `be` and the datastores are left alone, and are released independently
by the backend repo.

`compose.prod.yml` lives in **tag2now-BE**, which uploads it as the instance's
`compose.yml`; it describes the whole stack, including this service's image. A change to how `fe` runs in production belongs
in that repo.

The SSH and ECR settings are **org-level** secrets/variables on the `tag2now`
org, shared with tag2now-BE; this repo defines only `ECR_REPOSITORY`
(`tag2-now/fe`) and its own `production` environment. See
[aws-setup.md](../../tag2now-BE/docs/aws-setup.md#actions-configuration).

## Analytics

Google Analytics (`G-S4Y67MPNPR`) is loaded by the gtag snippet in
[index.html](../index.html). The frontend has no custom route-change page-view
handler. That fact alone does not establish what GA collects: inspect the
property's Enhanced Measurement settings and observed navigation events before
adding manual route tracking, so events are not counted twice.

The backend operations guide contains the CDN logging setup and an unresolved
logging-plan note. Treat console settings and actual delivery as operational
state to verify, rather than inferring current collection or plan eligibility
from this source checkout.
