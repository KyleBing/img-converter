/** 支持的输出格式 */
export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'gif' | 'ico' | 'tiff'

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

/** 尺寸缩放模式 */
export type ResizeMode = 'none' | 'percent' | 'max'

/** 转换参数 */
export interface ConvertOptions {
  format: OutputFormat
  /** JPEG / WebP / AVIF 质量 0.1 ~ 1 */
  quality: number
  /** 是否保持原始文件名（仅改扩展名） */
  keepName: boolean
  /** 尺寸处理方式 */
  resizeMode: ResizeMode
  /** 百分比缩放 1–100（resizeMode === 'percent'） */
  resizePercent: number
  /** 最大宽度 px，0 表示不限制（resizeMode === 'max'） */
  maxWidth: number
  /** 最大高度 px，0 表示不限制（resizeMode === 'max'） */
  maxHeight: number
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
