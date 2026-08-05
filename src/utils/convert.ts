import type { OutputFormat } from '../types/image'

const MIME_MAP: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
}

/** 输出格式对应 MIME */
export function mimeOf(format: OutputFormat): string {
  return MIME_MAP[format]
}

/** 从 File 读取为 ImageBitmap（兼容 BMP） */
export async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
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

/** 用 canvas 导出 PNG / JPEG / WebP */
async function canvasToBlob(
  bitmap: ImageBitmap,
  format: Exclude<OutputFormat, 'bmp'>,
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
  if (!blob) throw new Error(`导出 ${format} 失败`)
  return blob
}

/** 将文件转换为目标格式 Blob */
export async function convertImageFile(
  file: File,
  format: OutputFormat,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await loadBitmap(file)
  try {
    if (format === 'bmp') {
      const imageData = bitmapToImageData(bitmap)
      return {
        blob: encodeBmp(imageData),
        width: bitmap.width,
        height: bitmap.height,
      }
    }
    const blob = await canvasToBlob(bitmap, format, quality)
    return { blob, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/** 读取图片尺寸（用于源列表元信息） */
export async function readImageMeta(
  file: File,
): Promise<{ width: number; height: number; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file)
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    return { width, height, previewUrl }
  } catch {
    // createImageBitmap 失败时回退到 Image
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error(`无法读取图片: ${file.name}`))
      img.src = previewUrl
    })
    return { ...size, previewUrl }
  }
}

/** 可接受的输入 MIME / 扩展名 */
export const ACCEPT_INPUT =
  'image/bmp,image/x-ms-bmp,image/png,image/jpeg,image/webp,image/gif,.bmp,.png,.jpg,.jpeg,.webp,.gif'

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'bmp', label: 'BMP' },
]
