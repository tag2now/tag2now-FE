import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { cruise } from 'dependency-cruiser'
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config'
import config from '../.dependency-cruiser.mjs'

const repo = fileURLToPath(new URL('..', import.meta.url))
const cli = path.join(repo, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs')
const configPath = path.join(repo, '.dependency-cruiser.mjs')
const transport = {
  'src/shared/util/api.ts': "import '@/auth/session'",
  'src/auth/session.ts': 'export {}',
}

function project(t, files, options = {}) {
  const parent = path.resolve(os.tmpdir())
  const root = mkdtempSync(path.join(parent, 'tag2now-boundaries-'))
  t.after(() => {
    assert.equal(path.dirname(root), parent)
    rmSync(root, { recursive: true, force: true })
  })
  const tsconfig = { compilerOptions: { moduleResolution: 'bundler', module: 'esnext', paths: { '@/*': ['./src/*'] }, ...options }, include: ['src'] }
  for (const [file, content] of Object.entries({ 'tsconfig.json': JSON.stringify(tsconfig), ...transport, ...files })) {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  return root
}

async function inspect(root) {
  const previous = process.cwd()
  process.chdir(root)
  try {
    const result = await cruise(['src'], {
      ...config.options, ruleSet: config, validate: true, outputType: 'json',
    }, { bustTheCache: true }, { tsConfig: extractTSConfig(path.join(root, 'tsconfig.json')) })
    return JSON.parse(result.output)
  } finally {
    process.chdir(previous)
  }
}

// These protect our configured policy; parsing and module resolution belong to dependency-cruiser.
test('allows app composition, common modules and references between new feature folders', async (t) => {
  const root = project(t, {
    'src/App.tsx': "import './app/Screen'; import './feature-a/View'",
    'src/app/Screen.tsx': "import '@/feature-a/View'; import '@/shared/View'",
    'src/feature-a/View.tsx': "import '@/shared/View'; import '@/feature-b/model'",
    'src/feature-b/model.ts': 'export const value = 1',
    'src/shared/View.tsx': "import '@/config/value'; import 'node:path'",
    'src/config/value.ts': "export { value } from '@/shared/model'",
    'src/shared/model.ts': 'export const value = 1',
  })
  assert.equal((await inspect(root)).summary.error, 0)
})

for (const [name, from, target, statement, rule] of [
  ['alias', 'shared/View.ts', 'feature/Value.ts', "import '@/feature/Value'", 'common-must-not-depend-on-screens'],
  ['relative path', 'shared/nested/View.ts', 'feature/Value.ts', "import '../../feature/Value'", 'common-must-not-depend-on-screens'],
  ['type-only import', 'shared/View.ts', 'feature/Value.ts', "import type { Value } from '@/feature/Value'", 'common-must-not-depend-on-screens'],
  ['re-export', 'shared/index.ts', 'feature/Value.ts', "export * from '@/feature/Value'", 'common-must-not-depend-on-screens'],
  ['dynamic import', 'shared/View.ts', 'feature/Value.ts', "const load = () => import('@/feature/Value')", 'common-must-not-depend-on-screens'],
  ['import type expression', 'shared/View.ts', 'feature/Value.ts', "type Value = import('@/feature/Value').Value", 'common-must-not-depend-on-screens'],
  ['require', 'shared/View.ts', 'feature/Value.ts', "const value = require('@/feature/Value')", 'common-must-not-depend-on-screens'],
  ['feature to app', 'new-feature/View.ts', 'app/Screen.ts', "import '@/app/Screen'", 'features-must-not-depend-on-app'],
  ['feature to entry point', 'new-feature/View.ts', 'App.tsx', "import '@/App'", 'features-must-not-depend-on-app'],
  ['shared to app', 'shared/View.ts', 'app/Screen.ts', "import '@/app/Screen'", 'common-must-not-depend-on-screens'],
  ['config bridge', 'config/index.ts', 'feature/Value.ts', "export * from '@/feature/Value'", 'common-must-not-depend-on-screens'],
]) {
  test(`rejects the configured boundary through ${name}`, async (t) => {
    const root = project(t, { [`src/${from}`]: statement, [`src/${target}`]: 'export type Value = string' })
    const result = await inspect(root)
    assert.ok(result.summary.violations.some((violation) => violation.rule.name === rule
      && violation.from === `src/${from}` && violation.to === `src/${target}`), JSON.stringify(result.summary.violations))
  })
}

test('keeps the exception limited to the exact transport/session pair', async (t) => {
  const root = project(t, {
    'src/shared/util/api.ts': "import '@/auth/session'; import '@/auth/useAuth'",
    'src/shared/View.ts': "import '@/auth/session'",
    'src/auth/useAuth.ts': 'export {}',
  })
  const result = await inspect(root)
  assert.equal(result.summary.error, 2)
  assert.ok(result.summary.violations.some((violation) => violation.rule.name === 'api-auth-exception-is-transport-only'))
  assert.ok(result.summary.violations.some((violation) => violation.from === 'src/shared/View.ts'))
})

test('fails the native required rule when the transport exception becomes unused', async (t) => {
  const root = project(t, { 'src/shared/util/api.ts': 'export {}' })
  assert.ok((await inspect(root)).summary.violations.some((violation) => violation.rule.name === 'api-auth-exception-must-remain-used'))
})

test('separates test code from production while rejecting production imports of tests', async (t) => {
  const root = project(t, {
    'src/shared/View.test.ts': "import '@/app/Screen'",
    'src/shared/View.test-d.ts': "type Value = import('@/app/Screen').Value",
    'src/shared/__tests__/helper.ts': "import '@/app/Screen'",
    'src/config/test-setup.ts': "import '@/auth/session'",
    'src/app/Screen.ts': 'export type Value = string',
    'src/shared/View.ts': "import './View.test'",
  })
  const result = await inspect(root)
  assert.equal(result.summary.error, 1)
  assert.equal(result.summary.violations[0].rule.name, 'production-must-not-import-tests')
})

test('rejects unresolved imports and a local bridge outside src', async (t) => {
  const root = project(t, {
    'src/shared/View.ts': "import '@/missing/View'; import '../../bridge'",
    'bridge.ts': 'export {}',
  })
  const result = await inspect(root)
  assert.ok(result.summary.violations.some((violation) => violation.rule.name === 'production-imports-must-resolve'))
  assert.ok(result.summary.violations.some((violation) => violation.rule.name === 'production-local-code-stays-in-src'))
})

test('uses the native CLI and returns a failure for a policy violation', (t) => {
  const root = project(t, {})
  const args = [cli, '--config', configPath, '--output-type', 'err', 'src']
  const clean = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: root })
  assert.equal(clean.status, 0, clean.stderr)
  writeFileSync(path.join(root, 'src/shared/View.ts'), "import '@/auth/session'")
  const invalid = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: root })
  assert.equal(invalid.status, 1, invalid.stderr)
  assert.match(invalid.stdout + invalid.stderr, /common-must-not-depend-on-screens/)
})

test('the real project still uses the documented exception, even if its source is later removed', async () => {
  const result = await inspect(repo)
  assert.equal(result.summary.error, 0, JSON.stringify(result.summary.violations))
  const api = result.modules.find((module) => module.source === 'src/shared/util/api.ts')
  assert.ok(api?.dependencies.some((dependency) => dependency.resolved === 'src/auth/session.ts'),
    'Remove the obsolete transport exception and its policy test when the session dependency goes away.')
})
