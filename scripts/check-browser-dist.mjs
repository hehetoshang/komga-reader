import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputs = ['komga-reader.es.js', 'komga-reader.umd.js']

for (const output of outputs) {
  const path = resolve('browser-dist', output)
  const source = await readFile(path, 'utf8')
  const forbidden = [
    /\bfrom\s+["']vue["']/,
    /\brequire\(["']vue["']\)/,
    /process\.env/,
  ]
  const match = forbidden.find((pattern) => pattern.test(source))
  if (match) throw new Error(`${output} is not browser-standalone: matched ${match}`)
  if (!source.includes('destroy')) throw new Error(`${output} does not expose the standalone lifecycle facade`)
}
