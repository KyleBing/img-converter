import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const JSZip = require('jszip')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const distDir = join(root, 'dist')
const archiveDir = join(root, 'archive')

function pad(n) {
  return String(n).padStart(2, '0')
}

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** 递归收集 dist 下所有文件 */
function collectFiles(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) collectFiles(full, list)
    else list.push(full)
  }
  return list
}

if (!existsSync(distDir)) {
  console.error('dist/ 不存在，请先完成 vite build')
  process.exit(1)
}

mkdirSync(archiveDir, { recursive: true })

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const zipName = `${pkg.name}_v${pkg.version}_${stamp()}.zip`
const zipPath = join(archiveDir, zipName)

const zip = new JSZip()
for (const file of collectFiles(distDir)) {
  const rel = relative(distDir, file).replace(/\\/g, '/')
  zip.file(rel, readFileSync(file))
}

const buffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
})

writeFileSync(zipPath, buffer)

const sizeKb = (buffer.length / 1024).toFixed(1)
console.log(`✓ 已打包 → archive/${zipName} (${sizeKb} KB)`)
