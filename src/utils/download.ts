import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import type { ConvertedImage } from '../types/image'

const IMAGE_EXT = /\.(bmp|png|jpe?g|webp|gif)$/i

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

/** 申请目录读写权限 */
export async function ensureDirPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  if ((await handle.queryPermission({ mode })) === 'granted') return true
  return (await handle.requestPermission({ mode })) === 'granted'
}

/** 去重文件名，避免同名覆盖冲突 */
function uniqueName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0
  used.set(name, count + 1)
  if (count === 0) return name
  const i = name.lastIndexOf('.')
  const base = i >= 0 ? name.slice(0, i) : name
  const ext = i >= 0 ? name.slice(i) : ''
  return `${base}(${count})${ext}`
}

/** 写入已有目录句柄 */
export async function writeToDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  items: ConvertedImage[],
): Promise<number> {
  const ok = await ensureDirPermission(handle, 'readwrite')
  if (!ok) throw new Error('未获得目录写入权限')

  let written = 0
  const used = new Map<string, number>()

  for (const item of items) {
    const name = uniqueName(item.name, used)
    const fileHandle = await handle.getFileHandle(name, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(item.blob)
    await writable.close()
    written++
  }
  return written
}

/** 弹出目录选择并写入 */
export async function exportToDirectory(items: ConvertedImage[]): Promise<{
  count: number
  handle: FileSystemDirectoryHandle
}> {
  if (!window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持目录选择')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const count = await writeToDirectoryHandle(handle, items)
  return { count, handle }
}

/** 选择源文件夹并读取其中的图片 */
export async function pickSourceDirectory(): Promise<{
  handle: FileSystemDirectoryHandle
  files: File[]
}> {
  if (!window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持目录选择')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const files: File[] = []

  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    if (!IMAGE_EXT.test(entry.name)) continue
    const file = await entry.getFile()
    files.push(file)
  }

  return { handle, files }
}

/** 在新窗口打开 Blob / URL */
export function openInNewWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
