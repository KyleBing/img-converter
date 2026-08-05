/** 支持的输出格式 */
export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'bmp'

/** 源图片条目 */
export interface SourceImage {
  id: string
  file: File
  name: string
  ext: string
  size: number
  width: number
  height: number
  lastModified: number
  previewUrl: string
}

/** 转换后的图片条目 */
export interface ConvertedImage {
  id: string
  sourceId: string
  name: string
  format: OutputFormat
  blob: Blob
  size: number
  width: number
  height: number
  previewUrl: string
  /** 转换耗时 ms */
  durationMs: number
}

/** 转换参数 */
export interface ConvertOptions {
  format: OutputFormat
  /** JPEG / WebP 质量 0.1 ~ 1 */
  quality: number
  /** 是否保持原始文件名（仅改扩展名） */
  keepName: boolean
}

/** 对比行数据 */
export interface CompareRow {
  id: string
  name: string
  beforeExt: string
  afterExt: string
  beforeSize: number
  afterSize: number
  beforeWidth: number
  beforeHeight: number
  afterWidth: number
  afterHeight: number
  durationMs: number
  sourcePreviewUrl: string
  resultPreviewUrl: string
}
