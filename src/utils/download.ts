import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import type { ConvertedImage } from '../types/image'
import { INPUT_EXT_RE } from './convert'

/** 单张下载（落到浏览器默认下载目录） */
export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename)
}

/** 批量逐个下载到默认下载目录 */
export async function downloadBlobs(
  items: ConvertedImage[],
  pauseMs = 180,
): Promise<number> {
  const used = new Map<string, number>()
  let count = 0

  for (const item of items) {
    const name = uniqueDownloadName(item.name, used)
    downloadBlob(item.blob, name)
    count++
    if (pauseMs > 0 && count < items.length) {
      await new Promise((r) => setTimeout(r, pauseMs))
    }
  }
  return count
}

/** 打包 ZIP 下载 */
export async function downloadAsZip(items: ConvertedImage[], zipName = 'converted-images.zip') {
  const zip = new JSZip()
  const used = new Map<string, number>()

  for (const item of items) {
    zip.file(uniqueDownloadName(item.name, used), item.blob)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, zipName)
}

/** 去重文件名，避免同名覆盖冲突 */
function uniqueDownloadName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0
  used.set(name, count + 1)
  if (count === 0) return name
  const i = name.lastIndexOf('.')
  const base = i >= 0 ? name.slice(0, i) : name
  const ext = i >= 0 ? name.slice(i) : ''
  return `${base}(${count})${ext}`
}

/** 是否支持目录选择 API */
export function canPickDirectory(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** 选择源文件夹并读取其中的图片（只读） */
export async function pickSourceDirectory(): Promise<{
  handle: FileSystemDirectoryHandle
  files: File[]
}> {
  if (!window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持目录选择')
  }
  const handle = await window.showDirectoryPicker({ mode: 'read' })
  const files: File[] = []

  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    if (!INPUT_EXT_RE.test(entry.name)) continue
    const file = await entry.getFile()
    files.push(file)
  }

  return { handle, files }
}

/** 在新窗口打开 Blob / URL */
export function openInNewWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
