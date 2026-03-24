# Version Up

Bump the project version by auto-incrementing the patch number.

## Steps

1. Read `src/version.ts` and extract the current `APP_VERSION` value
2. Auto-increment the patch number (e.g., `1.0.7` → `1.0.8`)
3. Update `src/version.ts` with the new version
4. Commit with message `chore: bump version to {new_version}`
5. Tag the commit with `v{new_version}`
6. Report the new version
