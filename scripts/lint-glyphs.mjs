/**
 * DESIGN.md §3.3 — the CI grep that backs the no-emoji / no-glyph-icon rule.
 *
 * §3.3 specifies an eslint `no-restricted-syntax` rule plus "a CI grep over
 * src/, since strings can arrive from outside TSX". This project has no
 * eslint yet, so the grep carries the rule on its own: it scans every source
 * file rather than only JSX literals, which is the stricter half anyway.
 *
 * Run: npm run lint:glyphs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICONIC_GLYPHS =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2713}\u{2714}\u{2717}\u{2718}\u{2611}\u{2612}\u{25B2}\u{25BC}\u{25C6}\u{25CF}\u{25CB}\u{2605}\u{2606}\u{22EF}]/u

// fileURLToPath, not .pathname — the repo path contains a space, which
// .pathname would hand back percent-encoded.
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const failures = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { walk(full); continue }
    if (!/\.(ts|tsx|css|json)$/.test(entry)) continue
    readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
      const hit = line.match(ICONIC_GLYPHS)
      if (hit) failures.push(`${relative(ROOT, full)}:${i + 1}  ${JSON.stringify(hit[0])}  ${line.trim().slice(0, 80)}`)
    })
  }
}

walk(join(ROOT, 'src'))

if (failures.length) {
  console.error('No emoji or glyph icons allowed — use a lucide icon (DESIGN.md §3.2 has the replacement map).\n')
  failures.forEach((f) => console.error('  ' + f))
  process.exit(1)
}
console.log('lint:glyphs — clean')
