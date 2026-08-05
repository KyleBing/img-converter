<script setup lang="ts">
import { ref } from 'vue'
import type { SourceImage } from '../types/image'
import { formatBytes, formatDate } from '../utils/format'
import ViewToggle, { type ViewMode } from './ViewToggle.vue'

defineProps<{
  items: SourceImage[]
  selectedIds: Set<string>
  /** 已绑定的源目录名 */
  sourceDirName?: string
  dirSupported?: boolean
}>()

const emit = defineEmits<{
  add: [files: FileList | File[]]
  remove: [id: string]
  clear: []
  preview: [item: SourceImage]
  toggleSelect: [id: string]
  selectAll: []
  pickFolder: []
}>()

const viewMode = ref<ViewMode>('list')

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) emit('add', input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (files?.length) emit('add', files)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <div>
        <h2>源图片</h2>
        <p class="panel__sub">
          {{ items.length }} 个文件
          <template v-if="sourceDirName"> · 源目录 {{ sourceDirName }}</template>
        </p>
      </div>
      <div class="panel__head-actions">
        <ViewToggle v-model="viewMode" />
        <button
          v-if="dirSupported"
          type="button"
          class="btn ghost"
          title="选择文件夹作为源目录，便于转换后写回"
          @click="emit('pickFolder')"
        >
          源文件夹
        </button>
        <button type="button" class="btn ghost" :disabled="!items.length" @click="emit('selectAll')">全选</button>
        <button type="button" class="btn ghost danger" :disabled="!items.length" @click="emit('clear')">清空</button>
      </div>
    </header>

    <div class="drop-row">
      <label class="dropzone" @drop="onDrop" @dragover="onDragOver">
        <input
          type="file"
          multiple
          accept="image/bmp,image/png,image/jpeg,image/webp,image/gif,.bmp,.png,.jpg,.jpeg,.webp,.gif"
          hidden
          @change="onPick"
        />
        <span class="dropzone__title">拖拽图片到此处，或点击选择</span>
        <span class="dropzone__hint">支持 BMP / PNG / JPEG / WebP / GIF</span>
      </label>
    </div>

    <div v-if="items.length" class="scroll" :data-view="viewMode">
      <!-- 列表 -->
      <ul v-if="viewMode === 'list'" class="items items--list">
        <li
          v-for="item in items"
          :key="item.id"
          class="card card--list"
          :class="{ selected: selectedIds.has(item.id) }"
        >
          <label class="card__check">
            <input
              type="checkbox"
              :checked="selectedIds.has(item.id)"
              @change="emit('toggleSelect', item.id)"
            />
          </label>
          <button type="button" class="card__thumb" @click="emit('preview', item)" title="查看大图">
            <img :src="item.previewUrl" :alt="item.name" loading="lazy" />
          </button>
          <div class="card__meta">
            <div class="card__name" :title="item.name">{{ item.name }}</div>
            <div class="card__line">
              <span>{{ item.width }}×{{ item.height }}</span>
              <span>{{ formatBytes(item.size) }}</span>
              <span class="ext">.{{ item.ext }}</span>
            </div>
            <div class="card__line muted">{{ formatDate(item.lastModified) }}</div>
          </div>
          <button type="button" class="icon-btn" title="删除" @click="emit('remove', item.id)">×</button>
        </li>
      </ul>

      <!-- 网格：缩略图 + 简要信息 -->
      <ul v-else-if="viewMode === 'grid'" class="items items--grid">
        <li
          v-for="item in items"
          :key="item.id"
          class="card card--grid"
          :class="{ selected: selectedIds.has(item.id) }"
        >
          <label class="card__check card__check--overlay">
            <input
              type="checkbox"
              :checked="selectedIds.has(item.id)"
              @change="emit('toggleSelect', item.id)"
            />
          </label>
          <button type="button" class="card__thumb card__thumb--lg" @click="emit('preview', item)" title="查看大图">
            <img :src="item.previewUrl" :alt="item.name" loading="lazy" />
          </button>
          <div class="card__meta">
            <div class="card__name" :title="item.name">{{ item.name }}</div>
            <div class="card__line">
              <span>{{ item.width }}×{{ item.height }}</span>
              <span>{{ formatBytes(item.size) }}</span>
            </div>
          </div>
          <button type="button" class="icon-btn icon-btn--abs" title="删除" @click="emit('remove', item.id)">×</button>
        </li>
      </ul>

      <!-- 仅缩略图 -->
      <ul v-else class="items items--thumbs">
        <li
          v-for="item in items"
          :key="item.id"
          class="card card--thumb"
          :class="{ selected: selectedIds.has(item.id) }"
          :title="`${item.name}\n${item.width}×${item.height} · ${formatBytes(item.size)}`"
        >
          <label class="card__check card__check--overlay">
            <input
              type="checkbox"
              :checked="selectedIds.has(item.id)"
              @change="emit('toggleSelect', item.id)"
            />
          </label>
          <button type="button" class="card__thumb card__thumb--fill" @click="emit('preview', item)">
            <img :src="item.previewUrl" :alt="item.name" loading="lazy" />
          </button>
          <button type="button" class="icon-btn icon-btn--abs" title="删除" @click="emit('remove', item.id)">×</button>
        </li>
      </ul>
    </div>
    <p v-else class="empty">尚未添加图片</p>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.panel__head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.panel__sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.panel__head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.drop-row {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border: 1.5px dashed var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 0;
}

.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.dropzone__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.dropzone__hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* 面板内滚动，避免撑高整页 */
.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.items--list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.items--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
}

.items--thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
}

.card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.card.selected {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.card--list {
  display: grid;
  grid-template-columns: auto 56px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
}

.card--grid {
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 6px;
}

.card--thumb {
  aspect-ratio: 1;
  overflow: hidden;
  padding: 0;
}

.card__check {
  display: grid;
  place-items: center;
}

.card__check--overlay {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.card__thumb {
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #f0f2f5;
  cursor: zoom-in;
}

.card__thumb--lg {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.card__thumb--fill {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
}

.card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card__meta {
  min-width: 0;
}

.card__name {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
}

.card__line.muted {
  color: var(--text-muted);
}

.ext {
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.icon-btn--abs {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 22px;
  height: 22px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.88);
  opacity: 0;
  transition: opacity 0.12s;
}

.card--grid:hover .icon-btn--abs,
.card--thumb:hover .icon-btn--abs,
.card--grid.selected .icon-btn--abs,
.card--thumb.selected .icon-btn--abs {
  opacity: 1;
}

.icon-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.empty {
  margin: 24px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
