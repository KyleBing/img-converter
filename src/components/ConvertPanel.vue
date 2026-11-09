<script setup lang="ts">
import { watch } from 'vue'
import type { ConvertOptions, OutputFormat, ResizeMode } from '../types/image'
import { OUTPUT_FORMATS } from '../utils/convert'

const options = defineModel<ConvertOptions>({ required: true })

const props = defineProps<{
  sourceCount: number
  selectedCount: number
  converting: boolean
  /** 已选源图中的最长边，用于限制最大宽高输入 */
  maxSourceSide: number
}>()

const emit = defineEmits<{
  convert: []
}>()

const RESIZE_MODES: { value: ResizeMode; label: string }[] = [
  { value: 'none', label: '原尺寸' },
  { value: 'percent', label: '百分比' },
  { value: 'max', label: '最大宽高' },
]

function setFormat(format: OutputFormat) {
  options.value = { ...options.value, format }
}

function setResizeMode(mode: ResizeMode) {
  options.value = { ...options.value, resizeMode: mode }
}

/** 将最大宽高钳制在已选图片最长边以内 */
function clampMaxDims(side: number) {
  if (side <= 0) return
  const next = { ...options.value }
  let changed = false
  if (next.maxWidth > side) {
    next.maxWidth = side
    changed = true
  }
  if (next.maxHeight > side) {
    next.maxHeight = side
    changed = true
  }
  if (changed) options.value = next
}

watch(
  () => props.maxSourceSide,
  (side) => clampMaxDims(side),
  { immediate: true },
)

function onMaxWidthInput(e: Event) {
  const raw = Number((e.target as HTMLInputElement).value)
  const cap = props.maxSourceSide > 0 ? props.maxSourceSide : Number.MAX_SAFE_INTEGER
  const v = Number.isFinite(raw) ? Math.max(0, Math.min(Math.floor(raw), cap)) : 0
  options.value = { ...options.value, maxWidth: v }
}

function onMaxHeightInput(e: Event) {
  const raw = Number((e.target as HTMLInputElement).value)
  const cap = props.maxSourceSide > 0 ? props.maxSourceSide : Number.MAX_SAFE_INTEGER
  const v = Number.isFinite(raw) ? Math.max(0, Math.min(Math.floor(raw), cap)) : 0
  options.value = { ...options.value, maxHeight: v }
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>转换参数</h2>
      <p class="panel__sub">选择格式后批量转换勾选的图片</p>
    </header>

    <div class="field">
      <label class="label">目标格式</label>
      <div class="format-grid">
        <button
          v-for="f in OUTPUT_FORMATS"
          :key="f.value"
          type="button"
          class="format-btn"
          :class="{ active: options.format === f.value }"
          @click="setFormat(f.value)"
        >
          {{ f.label }}
        </button>
      </div>
      <p v-if="options.format === 'png'" class="tip">推荐：BMP → PNG，体积更小且支持透明</p>
      <p v-if="options.format === 'avif'" class="tip">AVIF 压缩率高，需较新的 Chrome / Edge / Firefox</p>
      <p v-if="options.format === 'gif'" class="tip">导出为单帧 GIF（最多 256 色）</p>
      <p v-if="options.format === 'ico'" class="tip">超过 256×256 会等比缩小为图标尺寸</p>
      <p v-if="options.format === 'tiff'" class="tip">导出为未压缩 TIFF</p>
    </div>

    <div class="field" v-if="options.format === 'jpeg' || options.format === 'webp' || options.format === 'avif'">
      <label class="label">
        质量
        <span class="label__val">{{ Math.round(options.quality * 100) }}%</span>
      </label>
      <input
        class="range"
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        v-model.number="options.quality"
      />
    </div>

    <div class="field">
      <label class="label">输出尺寸</label>
      <div class="mode-row">
        <button
          v-for="m in RESIZE_MODES"
          :key="m.value"
          type="button"
          class="mode-btn"
          :class="{ active: options.resizeMode === m.value }"
          @click="setResizeMode(m.value)"
        >
          {{ m.label }}
        </button>
      </div>

      <template v-if="options.resizeMode === 'percent'">
        <label class="label">
          缩放比例
          <span class="label__val">{{ options.resizePercent }}%</span>
        </label>
        <input
          class="range"
          type="range"
          min="1"
          max="100"
          step="1"
          v-model.number="options.resizePercent"
        />
        <p class="tip">按原图等比缩放，不放大</p>
      </template>

      <template v-else-if="options.resizeMode === 'max'">
        <div class="max-grid">
          <label class="max-field">
            <span class="max-field__label">最大宽度</span>
            <input
              class="num"
              type="number"
              min="0"
              :max="maxSourceSide || undefined"
              :placeholder="maxSourceSide ? `≤ ${maxSourceSide}` : '不限制'"
              :value="options.maxWidth || ''"
              @input="onMaxWidthInput"
            />
            <span class="max-field__unit">px</span>
          </label>
          <label class="max-field">
            <span class="max-field__label">最大高度</span>
            <input
              class="num"
              type="number"
              min="0"
              :max="maxSourceSide || undefined"
              :placeholder="maxSourceSide ? `≤ ${maxSourceSide}` : '不限制'"
              :value="options.maxHeight || ''"
              @input="onMaxHeightInput"
            />
            <span class="max-field__unit">px</span>
          </label>
        </div>
        <p class="tip">
          宽/高为上限，等比缩小；留空或 0 表示该边不限制。
          <template v-if="maxSourceSide">不得超过已选图片最长边 {{ maxSourceSide }} px。</template>
        </p>
      </template>
    </div>

    <div class="field">
      <label class="check">
        <input type="checkbox" v-model="options.keepName" />
        <span>保留原文件名（仅替换扩展名）</span>
      </label>
    </div>

    <div class="summary">
      <div><span>源文件</span><strong>{{ sourceCount }}</strong></div>
      <div><span>已勾选</span><strong>{{ selectedCount }}</strong></div>
      <div><span>输出</span><strong>{{ options.format.toUpperCase() }}</strong></div>
    </div>

    <button
      type="button"
      class="btn primary convert"
      :disabled="!selectedCount || converting"
      @click="emit('convert')"
    >
      {{ converting ? '转换中…' : `开始转换（${selectedCount}）` }}
    </button>

    <div class="note">
      <p>支持 PNG / JPEG / WebP / AVIF / GIF / BMP / ICO / TIFF 等互转；可导入 SVG、HEIC 等。</p>
      <p>转换在浏览器本地完成，图片不会上传。</p>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
}

.panel__head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.panel__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.label__val {
  font-family: var(--font-mono);
  color: var(--accent);
  text-transform: none;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.format-btn {
  padding: 12px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.12s;
}

.format-btn:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.format-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.mode-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.mode-btn {
  padding: 8px 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.mode-btn:hover {
  border-color: var(--accent);
}

.mode-btn.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.max-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.max-field {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 4px 6px;
  align-items: center;
}

.max-field__label {
  grid-column: 1 / -1;
  font-size: 11px;
  color: var(--text-muted);
}

.max-field__unit {
  font-size: 11px;
  color: var(--text-muted);
}

.num {
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
}

.num:focus {
  outline: none;
  border-color: var(--accent);
}

.tip {
  margin: 0;
  font-size: 12px;
  color: var(--accent);
  line-height: 1.45;
}

.range {
  width: 100%;
  accent-color: var(--accent);
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.summary div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.summary span {
  font-size: 11px;
  color: var(--text-muted);
}

.summary strong {
  font-family: var(--font-mono);
  font-size: 15px;
}

.convert {
  width: 100%;
  padding: 14px;
  font-size: 15px;
}

.note {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.note p {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}
</style>
