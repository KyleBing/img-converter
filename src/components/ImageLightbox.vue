<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import ZoomPanStage, { type ViewTransform } from './ZoomPanStage.vue'

defineProps<{
  url: string
  name: string
}>()

const emit = defineEmits<{
  close: []
}>()

const root = ref<HTMLElement | null>(null)
const transform = ref<ViewTransform>({ scale: 1, x: 0, y: 0 })
const stageRef = ref<InstanceType<typeof ZoomPanStage> | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function openBlank(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function resetView() {
  stageRef.value?.reset()
  transform.value = { scale: 1, x: 0, y: 0 }
}

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
          <span class="lightbox__name" :title="name">{{ name }}</span>
          <span class="lightbox__zoom">{{ Math.round(transform.scale * 100) }}%</span>
          <div class="lightbox__actions">
            <button type="button" class="btn ghost" @click="resetView">复位</button>
            <button type="button" class="btn ghost" @click="openBlank(url)">新窗口打开</button>
            <button type="button" class="btn ghost" @click="emit('close')">关闭</button>
          </div>
        </header>
        <div class="lightbox__body">
          <ZoomPanStage
            ref="stageRef"
            :src="url"
            :alt="name"
            v-model:transform="transform"
          />
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
  width: min(96vw, 1200px);
  height: min(92vh, 900px);
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

.lightbox__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 13px;
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

.lightbox__body {
  flex: 1;
  min-height: 0;
}
</style>
