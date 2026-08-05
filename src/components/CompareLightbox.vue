<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { CompareRow } from '../types/image'
import { formatBytes, sizeDeltaText } from '../utils/format'
import ZoomPanStage, { type ViewTransform } from './ZoomPanStage.vue'

const props = defineProps<{
  row: CompareRow
}>()

const emit = defineEmits<{
  close: []
}>()

const root = ref<HTMLElement | null>(null)
// 左右共用同一套变换，实现同步缩放 / 平移
const transform = ref<ViewTransform>({ scale: 1, x: 0, y: 0 })

function resetView() {
  transform.value = { scale: 1, x: 0, y: 0 }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function openBlank(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

watch(
  () => props.row.id,
  () => resetView(),
)

onMounted(() => {
  root.value?.focus()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div class="lightbox" role="dialog" aria-modal="true" tabindex="-1" ref="root">
      <div class="lightbox__backdrop" @click="emit('close')" />
      <div class="lightbox__panel">
        <header class="lightbox__bar">
          <div class="lightbox__title">
            <span class="lightbox__name" :title="row.name">{{ row.name }}</span>
            <span class="lightbox__meta">
              .{{ row.beforeExt }} → .{{ row.afterExt }}
              ·
              {{ formatBytes(row.beforeSize) }} → {{ formatBytes(row.afterSize) }}
              （{{ sizeDeltaText(row.beforeSize, row.afterSize) }}）
            </span>
          </div>
          <span class="lightbox__zoom">{{ Math.round(transform.scale * 100) }}%</span>
          <div class="lightbox__actions">
            <button type="button" class="btn ghost" @click="resetView">复位</button>
            <button type="button" class="btn ghost" @click="emit('close')">关闭</button>
          </div>
        </header>

        <div class="lightbox__split">
          <div class="pane">
            <div class="pane__label">
              <span>转换前</span>
              <button type="button" class="link" @click="openBlank(row.sourcePreviewUrl)">新窗口</button>
            </div>
            <div class="pane__stage">
              <ZoomPanStage
                :src="row.sourcePreviewUrl"
                :alt="`${row.name} 转换前`"
                v-model:transform="transform"
              />
            </div>
          </div>
          <div class="pane">
            <div class="pane__label">
              <span>转换后</span>
              <button type="button" class="link" @click="openBlank(row.resultPreviewUrl)">新窗口</button>
            </div>
            <div class="pane__stage">
              <ZoomPanStage
                :src="row.resultPreviewUrl"
                :alt="`${row.name} 转换后`"
                v-model:transform="transform"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  outline: none;
}

.lightbox__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(18, 22, 28, 0.72);
  backdrop-filter: blur(4px);
}

.lightbox__panel {
  position: relative;
  z-index: 1;
  width: min(98vw, 1400px);
  height: min(94vh, 920px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  animation: pop 0.22s ease-out;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.lightbox__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
}

.lightbox__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lightbox__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 650;
  font-size: 14px;
}

.lightbox__meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.lightbox__zoom {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

.lightbox__actions {
  display: flex;
  gap: 8px;
}

.lightbox__split {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--border);
}

.pane:last-child {
  border-right: none;
}

.pane__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-secondary);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.link {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.link:hover {
  text-decoration: underline;
}

.pane__stage {
  flex: 1;
  min-height: 0;
}

/* 对比模式下只保留一侧提示，避免重复 */
.pane:last-child :deep(.stage__hint) {
  display: none;
}
</style>
