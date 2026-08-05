/** 格式化文件大小 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes
  let i = -1
  do {
    value /= 1024
    i++
  } while (value >= 1024 && i < units.length - 1)
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

/** 格式化修改时间 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 取文件扩展名（小写，不含点） */
export function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** 替换扩展名 */
export function replaceExt(name: string, ext: string): string {
  const i = name.lastIndexOf('.')
  const base = i >= 0 ? name.slice(0, i) : name
  return `${base}.${ext}`
}

/** 尺寸变化百分比文案 */
export function sizeDeltaText(before: number, after: number): string {
  if (before <= 0) return '-'
  const ratio = ((after - before) / before) * 100
  const sign = ratio > 0 ? '+' : ''
  return `${sign}${ratio.toFixed(1)}%`
}
