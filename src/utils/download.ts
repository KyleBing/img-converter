import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import type { ConvertedImage } from '../types/image'

/** 单张下载 */
export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename)
}

/** 打包 ZIP 下载 */
export async function downloadAsZip(items: ConvertedImage[], zipName = 'converted-images.zip') {
  const zip = new JSZip()
  const used = new Map<string, number>()

  for (const item of items) {
    let name = item.name
    const count = used.get(name) ?? 0
    if (count > 0) {
      const i = name.lastIndexOf('.')
      const base = i >= 0 ? name.slice(0, i) : name
      const ext = i >= 0 ? name.slice(i) : ''
      name = `${base}(${count})${ext}`
    }
    used.set(item.name, count + 1)
    zip.file(name, item.blob)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, zipName)
}

/** 是否支持目录选择 API */
export function canPickDirectory(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** 批量写入用户选择的目录 */
export async function exportToDirectory(items: ConvertedImage[]): Promise<number> {
  if (!window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持目录选择')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  let written = 0
  const used = new Map<string, number>()

  for (const item of items) {
    let name = item.name
    const count = used.get(name) ?? 0
    if (count > 0) {
      const i = name.lastIndexOf('.')
      const base = i >= 0 ? name.slice(0, i) : name
      const ext = i >= 0 ? name.slice(i) : ''
      name = `${base}(${count})${ext}`
    }
    used.set(item.name, count + 1)

    const fileHandle = await handle.getFileHandle(name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(item.blob)
    await writable.close()
    written++
  }
  return written
}

/** 在新窗口打开 Blob / URL */
export function openInNewWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
