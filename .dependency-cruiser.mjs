const TEST_FILES = '(?:^|/)(?:__tests__|__mocks__)/|[.](?:test(?:-d)?|spec)[.](?:[cm]?ts|tsx)$|^src/config/test-setup[.]ts$'
const COMMON = '^src/(?:shared|config)/'
const FEATURES = '^src/(?!(?:app|shared|config)/)[^/]+/'
const APP = '^src/(?:app/|[^/]+[.](?:[cm]?ts|tsx)$)'
const API = '^src/shared/util/api[.]ts$'
const SESSION = '^src/auth/session[.]ts$'

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'common-must-not-depend-on-screens',
      severity: 'error',
      from: { path: COMMON, pathNot: [TEST_FILES, API] },
      to: { path: '^src/', pathNot: COMMON },
    },
    {
      name: 'api-auth-exception-is-transport-only',
      comment: 'Only the HTTP transport may attach tokens and end refused sessions.',
      severity: 'error',
      from: { path: API },
      to: { path: '^src/', pathNot: [COMMON, SESSION] },
    },
    {
      name: 'features-must-not-depend-on-app',
      severity: 'error',
      from: { path: FEATURES, pathNot: TEST_FILES },
      to: { path: APP },
    },
    {
      name: 'production-must-not-import-tests',
      severity: 'error',
      from: { path: '^src/', pathNot: TEST_FILES },
      to: { path: TEST_FILES },
    },
    {
      name: 'production-local-code-stays-in-src',
      severity: 'error',
      from: { path: '^src/', pathNot: TEST_FILES },
      to: { path: '^(?!src/|node_modules/).*[.](?:[cm]?[jt]s|[jt]sx)$' },
    },
    {
      name: 'production-imports-must-resolve',
      severity: 'error',
      from: { path: '^src/', pathNot: TEST_FILES },
      to: { couldNotResolve: true },
    },
  ],
  required: [
    {
      name: 'api-auth-exception-must-remain-used',
      comment: 'Remove this rule and its exception together when HTTP no longer reads the session.',
      severity: 'error',
      module: { path: API },
      to: { path: SESSION },
    },
  ],
  options: {
    doNotFollow: { path: ['^node_modules/', TEST_FILES] },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'browser', 'default'],
      mainFields: ['browser', 'module', 'main'],
    },
  },
}
