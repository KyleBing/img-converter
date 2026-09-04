import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { IFD } from 'utif2'

/** ImageData → 单帧 GIF（最多 256 色，保留透明） */
export function encodeGif(imageData: ImageData): Blob {
  const rgba = imageData.data
  const { width, height } = imageData
  const format = 'rgba4444' as const
  const palette = quantize(rgba, 256, { format })
  const index = applyPalette(rgba, palette, format)

  let transparentIndex = -1
  for (let i = 0; i < palette.length; i++) {
    const color = palette[i]
    if (color && (color[3] ?? 255) < 128) {
      transparentIndex = i
      break
    }
  }

  const gif = GIFEncoder()
  gif.writeFrame(index, width, height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
  })
  gif.finish()
  const bytes = gif.bytes()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: 'image/gif' })
}

/**
 * 将位图编码为 ICO（内嵌 PNG）
 * 超过 256×256 时等比缩小，以兼容常见图标场景
 */
export async function encodeIco(bitmap: ImageBitmap): Promise<Blob> {
  const max = 256
  let w = bitmap.width
  let h = bitmap.height
  if (w > max || h > max) {
    const scale = Math.min(max / w, max / h)
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文')
  ctx.drawImage(bitmap, 0, 0, w, h)

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!pngBlob) throw new Error('ICO 编码失败')
  const png = new Uint8Array(await pngBlob.arrayBuffer())

  const headerSize = 6 + 16
  const buffer = new ArrayBuffer(headerSize + png.byteLength)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)
  bytes[6] = w >= 256 ? 0 : w
  bytes[7] = h >= 256 ? 0 : h
  bytes[8] = 0
  bytes[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, png.byteLength, true)
  view.setUint32(18, headerSize, true)
  bytes.set(png, headerSize)

  return new Blob([buffer], { type: 'image/x-icon' })
}

/** ImageData → 未压缩 TIFF */
export async function encodeTiff(imageData: ImageData): Promise<Blob> {
  const UTIF = await import('utif2')
  const rgba = new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength)
  const buf = UTIF.encodeImage(rgba, imageData.width, imageData.height)
  return new Blob([buf], { type: 'image/tiff' })
}

/** TIFF → ImageBitmap（取第一页） */
export async function decodeTiffBitmap(file: File): Promise<ImageBitmap> {
  const UTIF = await import('utif2')
  const buffer = await file.arrayBuffer()
  const ifds = UTIF.decode(buffer) as IFD[]
  const ifd = ifds[0]
  if (!ifd) throw new Error('无效的 TIFF 文件')
  UTIF.decodeImage(buffer, ifd)
  const rgba = UTIF.toRGBA8(ifd)
  const imageData = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height)
  return createImageBitmap(imageData)
}

/** HEIC / HEIF → PNG Blob（动态加载解码器） */
export async function decodeHeicToPng(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({ blob: file, toType: 'image/png' })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) throw new Error('HEIC 解码失败')
  return blob
}
