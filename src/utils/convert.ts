import type { OutputFormat } from '../types/image'
import {
  decodeHeicBitmap,
  decodeHeicToPng,
  decodeTiffBitmap,
  encodeGif,
  encodeIco,
  encodeTiff,
} from './codecs'

const MIME_MAP: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
}

type CanvasFormat = 'png' | 'jpeg' | 'webp' | 'avif'

/** 输出格式对应 MIME */
export function mimeOf(format: OutputFormat): string {
  return MIME_MAP[format]
}

/** 输出文件扩展名（jpeg → jpg） */
export function formatExt(format: OutputFormat): string {
  if (format === 'jpeg') return 'jpg'
  return format
}

function isTiffFile(file: File): boolean {
  return file.type === 'image/tiff' || /\.tiff?$/i.test(file.name)
}

/** 按扩展名 / MIME 判断 HEIC、HEIF（含序列） */
export function isHeicFile(file: File): boolean {
  if (/image\/hei[cf]/i.test(file.type) || /image\/heic-sequence/i.test(file.type)) return true
  return /\.hei[cf]s?$/i.test(file.name)
}

/**
 * 读取 ftyp box 嗅探 HEIC/HEIF（MIME / 扩展名不准时兜底）
 * 需出现 heic 族品牌；排除 AVIF（同为 HEIF 容器）
 */
export async function sniffHeicFile(file: Blob): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  if (buf.length < 12) return false
  const ascii = Array.from(buf, (b) => String.fromCharCode(b)).join('')
  if (!ascii.includes('ftyp')) return false
  if (/avif|avis/i.test(ascii)) return false
  return /heic|heix|heim|heis|hevc|hevx/i.test(ascii)
}

/** 加载 HEIC：优先原生，失败则走 WASM 解码 */
async function loadHeicBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    return decodeHeicBitmap(file)
  }
}

/** 通过 HTMLImageElement 回退加载 */
async function loadBitmapViaImage(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`无法读取图片: ${file.name}`))
      el.src = url
    })
    return createImageBitmap(img)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 从 File 读取为 ImageBitmap */
export async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (isTiffFile(file)) {
    return decodeTiffBitmap(file)
  }

  if (isHeicFile(file)) {
    return loadHeicBitmap(file)
  }

  try {
    return await createImageBitmap(file)
  } catch {
    // 扩展名/MIME 缺失时，按文件头再试 HEIC
    if (await sniffHeicFile(file)) {
      return loadHeicBitmap(file)
    }
    return loadBitmapViaImage(file)
  }
}

/** 将 ImageBitmap 画到 canvas 并取 ImageData */
export function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文')
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/**
 * 将 ImageData 编码为未压缩 24-bit BMP
 * BMP 行按 4 字节对齐，像素自下而上存储
 */
export function encodeBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // BITMAPFILEHEADER
  view.setUint16(0, 0x4d42, true) // 'BM'
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true)
  view.setUint32(10, 54, true)

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(30, 0, true)
  view.setUint32(34, pixelSize, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)
  view.setUint32(46, 0, true)
  view.setUint32(50, 0, true)

  // 像素：BGR，自下而上
  let offset = 54
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4
      bytes[offset++] = data[i + 2]! // B
      bytes[offset++] = data[i + 1]! // G
      bytes[offset++] = data[i]! // R
    }
    // 行填充
    const padding = rowSize - width * 3
    for (let p = 0; p < padding; p++) bytes[offset++] = 0
  }

  return new Blob([buffer], { type: 'image/bmp' })
}

/** 用 canvas 导出 PNG / JPEG / WebP / AVIF */
async function canvasToBlob(
  bitmap: ImageBitmap,
  format: CanvasFormat,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文')

  // JPEG 不支持透明，先铺白底
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(bitmap, 0, 0)

  const mime = mimeOf(format)
  const blob = await new Promise<Blob | null>((resolve) => {
    if (format === 'png') {
      canvas.toBlob(resolve, mime)
    } else {
      canvas.toBlob(resolve, mime, quality)
    }
  })
  if (!blob) {
    if (format === 'avif') {
      throw new Error('当前浏览器不支持导出 AVIF，请使用 Chrome / Edge / Firefox 最新版')
    }
    throw new Error(`导出 ${format} 失败`)
  }
  return blob
}

/** 从位图生成 PNG 预览（供浏览器无法直接显示的格式使用） */
async function bitmapToPngBlob(bitmap: ImageBitmap): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文')
  ctx.drawImage(bitmap, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('预览生成失败')
  return blob
}

/** 将文件转换为目标格式 Blob */
export async function convertImageFile(
  file: File,
  format: OutputFormat,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number; previewBlob: Blob }> {
  const bitmap = await loadBitmap(file)
  try {
    const { width, height } = bitmap

    if (format === 'bmp') {
      const blob = encodeBmp(bitmapToImageData(bitmap))
      return { blob, width, height, previewBlob: blob }
    }
    if (format === 'gif') {
      const blob = encodeGif(bitmapToImageData(bitmap))
      return { blob, width, height, previewBlob: blob }
    }
    if (format === 'ico') {
      const blob = await encodeIco(bitmap)
      const max = 256
      let outW = width
      let outH = height
      if (width > max || height > max) {
        const scale = Math.min(max / width, max / height)
        outW = Math.max(1, Math.round(width * scale))
        outH = Math.max(1, Math.round(height * scale))
      }
      return { blob, width: outW, height: outH, previewBlob: blob }
    }
    if (format === 'tiff') {
      const previewBlob = await bitmapToPngBlob(bitmap)
      const blob = await encodeTiff(bitmapToImageData(bitmap))
      return { blob, width, height, previewBlob }
    }

    const blob = await canvasToBlob(bitmap, format, quality)
    return { blob, width, height, previewBlob: blob }
  } finally {
    bitmap.close()
  }
}

/** 读取图片尺寸（用于源列表元信息） */
export async function readImageMeta(
  file: File,
): Promise<{ width: number; height: number; previewUrl: string }> {
  // HEIC / TIFF 浏览器可能无法直接预览，先解码为可显示 PNG
  let previewSource: Blob = file
  const maybeUntyped = !file.type || file.type === 'application/octet-stream'
  const heicLike = isHeicFile(file) || (maybeUntyped && (await sniffHeicFile(file)))
  if (heicLike) {
    try {
      // 即便原生能解码，也转成 PNG，保证 <img> 在 Chrome 等浏览器可显示
      const bitmap = await createImageBitmap(file)
      try {
        previewSource = await bitmapToPngBlob(bitmap)
      } finally {
        bitmap.close()
      }
    } catch {
      previewSource = await decodeHeicToPng(file)
    }
  } else if (isTiffFile(file)) {
    const bitmap = await decodeTiffBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      throw new Error('无法创建 Canvas 上下文')
    }
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    previewSource = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('TIFF 预览生成失败'))), 'image/png')
    })
  }

  const previewUrl = URL.createObjectURL(previewSource)
  try {
    const bitmap = await createImageBitmap(previewSource)
    const { width, height } = bitmap
    bitmap.close()
    return { width, height, previewUrl }
  } catch {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error(`无法读取图片: ${file.name}`))
      img.src = previewUrl
    })
    return { ...size, previewUrl }
  }
}

/** 常见输入扩展名（用于目录扫描 / 拖拽兜底） */
export const INPUT_EXT_RE =
  /\.(bmp|png|jpe?g|jfif|jpe|webp|avif|gif|svg|ico|cur|tiff?|hei[cf]s?|apng)$/i

/** 可接受的输入 MIME / 扩展名（扩展名靠前，避免 Chrome 因 image/* 漏掉 HEIC） */
export const ACCEPT_INPUT = [
  '.heic',
  '.heif',
  '.heics',
  '.bmp',
  '.png',
  '.jpg',
  '.jpeg',
  '.jfif',
  '.jpe',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.ico',
  '.cur',
  '.tif',
  '.tiff',
  '.apng',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/bmp',
  'image/x-ms-bmp',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/tiff',
  'image/*',
].join(',')

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  // 部分系统 HEIC MIME 为空或 octet-stream，靠扩展名兜底
  if (INPUT_EXT_RE.test(file.name)) return true
  return false
}

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'gif', label: 'GIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'ico', label: 'ICO' },
  { value: 'tiff', label: 'TIFF' },
]
