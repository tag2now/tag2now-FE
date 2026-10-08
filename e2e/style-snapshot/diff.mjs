// node e2e/style-snapshot/diff.mjs <base> <other> [noise]
// Lists every element whose computed style differs between two snapshot dirs.
// A third dir (a second run of the base) marks what differs run to run anyway.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const [base, other, noise] = process.argv.slice(2)
const rowsOf = (file) => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)))
const load = (file) => new Map(rowsOf(file).map(([k, v]) => [k, v]))
const classes = (file) => new Map(rowsOf(file).map(([k, , c]) => [k, c ?? '']))
const props = (s) => new Map(s.split(';').map((p) => { const i = p.indexOf(':'); return [p.slice(0, i), p.slice(i + 1)] }))

function differences(a, b) {
  const out = new Map()
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key), y = b.get(key)
    if (x === y) continue
    if (x === undefined || y === undefined) { out.set(key, [x === undefined ? '(added)' : '(removed)']); continue }
    // Custom properties enumerate in no fixed order, so compare by name.
    const px = props(x), py = props(y)
    const lines = [...new Set([...px.keys(), ...py.keys()])]
      // A custom property only matters through var(), and then the property
      // reading it differs too — Tailwind drops unused theme variables.
      .filter((p) => !p.startsWith('--') && px.get(p) !== py.get(p))
      .map((p) => `${p}: ${px.get(p)} → ${py.get(p)}`)
    if (lines.length) out.set(key, lines)
  }
  return out
}

let states = 0, changed = 0
const unmatched = []
for (const project of fs.readdirSync(base)) {
  for (const file of fs.readdirSync(path.join(base, project))) {
    // A state only one side reached cannot be compared; say so instead.
    if (!fs.existsSync(path.join(other, project, file))) { unmatched.push(`${project}/${file}`); continue }
    states++
    const a = load(path.join(base, project, file))
    const b = load(path.join(other, project, file))
    const cls = classes(path.join(other, project, file))
    // Without a second run of this state, nothing is discounted as noise.
    const again = noise && path.join(noise, project, file)
    const noisy = again && fs.existsSync(again) ? differences(a, load(again)) : new Map()
    const real = [...differences(a, b)].filter(([key]) => !noisy.has(key))
    if (real.length === 0) continue
    changed++
    console.log(`\n## ${project}/${file.replace('.json.gz', '')}  (${real.length} elements, ${a.size} total)`)
    for (const [key, lines] of real.slice(0, 40)) console.log(`  ${key}  [${cls.get(key)}]\n    ${lines.join('\n    ')}`)
    if (real.length > 40) console.log(`  … ${real.length - 40} more`)
  }
}
if (unmatched.length) console.log(`\nNot compared, missing from ${other}: ${unmatched.join(' ')}`)
console.log(`\n${changed} of ${states} states differ`)
