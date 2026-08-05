<script setup lang="ts">
import type { ConvertOptions, OutputFormat } from '../types/image'
import { OUTPUT_FORMATS } from '../utils/convert'

const options = defineModel<ConvertOptions>({ required: true })

defineProps<{
  sourceCount: number
  selectedCount: number
  converting: boolean
}>()

const emit = defineEmits<{
  convert: []
}>()

function setFormat(format: OutputFormat) {
  options.value = { ...options.value, format }
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
    </div>

    <div class="field" v-if="options.format === 'jpeg' || options.format === 'webp'">
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
      <p>主要场景：BMP 转 PNG。也可在 PNG / JPEG / WebP / BMP 之间互转。</p>
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
  grid-template-columns: 1fr 1fr;
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

.tip {
  margin: 0;
  font-size: 12px;
  color: var(--accent);
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
