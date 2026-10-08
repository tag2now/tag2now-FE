// node e2e/style-snapshot/coverage.mjs <snapshot dir>
// Lists, per stylesheet, the classes it defines that no recorded state drew.
// A rule on such a class went unchecked by any comparison of that directory —
// either a state is missing, or nothing renders the class any more.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execSync } from 'node:child_process'

const [dir] = process.argv.slice(2)
const drawn = new Set()
for (const project of fs.readdirSync(dir)) {
  for (const file of fs.readdirSync(path.join(dir, project))) {
    const rows = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, project, file))))
    for (const [, , classes] of rows) for (const name of (classes ?? '').split(/\s+/)) drawn.add(name)
  }
}

const sheets = execSync('git ls-files "src/*.css" "src/**/*.css"').toString().trim().split('\n')
let unchecked = 0
for (const sheet of sheets) {
  // Comments and the @theme block name things that are not classes.
  const css = fs.readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@theme\s*\{[\s\S]*?\n\}/, '')
  const defined = new Set((css.match(/\.[a-z][a-z0-9-]*/gi) ?? []).map((name) => name.slice(1)))
  const missing = [...defined].filter((name) => !drawn.has(name) && !/^(css|app)$/.test(name))
  if (missing.length === 0) continue
  unchecked += missing.length
  console.log(`${sheet} (${missing.length}/${defined.size}): ${missing.join(' ')}`)
}
console.log(`\n${unchecked} classes defined in a sheet were never drawn`)
