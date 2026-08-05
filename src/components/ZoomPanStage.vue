<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

export interface ViewTransform {
  scale: number
  x: number
  y: number
}

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    /** 受控变换；不传则组件内部管理 */
    transform?: ViewTransform
    minScale?: number
    maxScale?: number
  }>(),
  {
    alt: '',
    minScale: 0.1,
    maxScale: 32,
  },
)

const emit = defineEmits<{
  'update:transform': [ViewTransform]
}>()

const viewport = ref<HTMLElement | null>(null)
const local = ref<ViewTransform>({ scale: 1, x: 0, y: 0 })

const view = computed(() => props.transform ?? local.value)

function setView(next: ViewTransform) {
  const clamped = {
    scale: Math.min(props.maxScale, Math.max(props.minScale, next.scale)),
    x: next.x,
    y: next.y,
  }
  if (props.transform) emit('update:transform', clamped)
  else local.value = clamped
}

function reset() {
  setView({ scale: 1, x: 0, y: 0 })
}

watch(
  () => props.src,
  () => reset(),
)

/** 滚轮缩放，以指针为中心 */
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const el = viewport.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const mx = e.clientX - rect.left - rect.width / 2
  const my = e.clientY - rect.top - rect.height / 2
  const { scale, x, y } = view.value

  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const nextScale = Math.min(props.maxScale, Math.max(props.minScale, scale * factor))
  if (nextScale === scale) return

  // 保持指针下的图像点不动
  const wx = (mx - x) / scale
  const wy = (my - y) / scale
  setView({
    scale: nextScale,
    x: mx - wx * nextScale,
    y: my - wy * nextScale,
  })
}

let dragging = false
let lastX = 0
let lastY = 0

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  const { scale, x, y } = view.value
  setView({ scale, x: x + dx, y: y + dy })
}

function onPointerUp(e: PointerEvent) {
  dragging = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onDblClick() {
  reset()
}

// 阻止触控板手势把页面一起滚走
onMounted(() => {
  const el = viewport.value
  if (!el) return
  el.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  viewport.value?.removeEventListener('wheel', onWheel)
})

defineExpose({ reset })
</script>

<template>
  <div
    ref="viewport"
    class="stage"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="onDblClick"
  >
    <div
      class="stage__world"
      :style="{
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
      }"
    >
      <img :src="src" :alt="alt" draggable="false" />
    </div>
    <div class="stage__hint">滚轮缩放 · 拖拽平移 · 双击复位</div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background:
    linear-gradient(45deg, #e8ebf0 25%, transparent 25%),
    linear-gradient(-45deg, #e8ebf0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e8ebf0 75%),
    linear-gradient(-45deg, transparent 75%, #e8ebf0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-color: #f4f6f9;
}

.stage:active {
  cursor: grabbing;
}

.stage__world {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  transform-origin: center center;
  will-change: transform;
}

.stage__world img {
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
  object-fit: contain;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.stage__hint {
  position: absolute;
  left: 10px;
  bottom: 8px;
  z-index: 1;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  color: var(--text-muted);
  pointer-events: none;
}
</style>
