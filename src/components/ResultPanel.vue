<script setup lang="ts">
import { ref } from 'vue'
import type { ConvertedImage } from '../types/image'
import { formatBytes } from '../utils/format'
import { canPickDirectory } from '../utils/download'
import ViewToggle, { type ViewMode } from './ViewToggle.vue'

defineProps<{
  items: ConvertedImage[]
  selectedIds: Set<string>
  exporting: boolean
  /** 已绑定源目录时显示目录名 */
  sourceDirName?: string
}>()

const emit = defineEmits<{
  remove: [id: string]
  clear: []
  preview: [item: ConvertedImage]
  download: [item: ConvertedImage]
  toggleSelect: [id: string]
  selectAll: []
  exportDir: []
  exportZip: []
  saveToSource: []
}>()

const dirSupported = canPickDirectory()
const viewMode = ref<ViewMode>('list')
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <div>
        <h2>转换结果</h2>
        <p class="panel__sub">{{ items.length }} 个文件</p>
      </div>
      <div class="panel__head-actions">
        <ViewToggle v-model="viewMode" />
        <button type="button" class="btn ghost" :disabled="!items.length" @click="emit('selectAll')">全选</button>
        <button type="button" class="btn ghost danger" :disabled="!items.length" @click="emit('clear')">清空</button>
      </div>
    </header>

    <div class="exports" v-if="items.length">
      <button
        type="button"
        class="btn primary"
        :disabled="!selectedIds.size || exporting || !dirSupported"
        :title="
          sourceDirName
            ? `写入源目录「${sourceDirName}」`
            : dirSupported
              ? '写入源目录（未绑定则弹出选择）'
              : '当前浏览器不支持目录写入'
        "
        @click="emit('saveToSource')"
      >
        {{ exporting ? '保存中…' : sourceDirName ? `保存回源目录` : '保存回源目录…' }}
      </button>
      <button
        type="button"
        class="btn secondary"
        :disabled="!selectedIds.size || exporting"
        @click="emit('exportDir')"
        :title="dirSupported ? '选择本地目录批量导出' : '当前浏览器不支持目录导出，将改用 ZIP'"
      >
        导出到目录
      </button>
      <button
        type="button"
        class="btn secondary"
        :disabled="!selectedIds.size || exporting"
        @click="emit('exportZip')"
      >
        打包 ZIP
      </button>
    </div>
    <p v-if="items.length && sourceDirName" class="exports-hint">源目录：{{ sourceDirName }}</p>

    <div v-if="items.length" class="scroll" :data-view="viewMode">
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
              <span class="ext">.{{ item.format }}</span>
            </div>
            <div class="card__line muted">{{ item.durationMs }} ms</div>
          </div>
          <div class="card__actions">
            <button type="button" class="btn ghost sm" @click="emit('download', item)">下载</button>
            <button type="button" class="icon-btn" title="删除" @click="emit('remove', item.id)">×</button>
          </div>
        </li>
      </ul>

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
              <span>{{ formatBytes(item.size) }}</span>
              <span class="ext">.{{ item.format }}</span>
            </div>
          </div>
          <div class="card__actions card__actions--row">
            <button type="button" class="btn ghost sm" @click="emit('download', item)">下载</button>
            <button type="button" class="icon-btn" title="删除" @click="emit('remove', item.id)">×</button>
          </div>
        </li>
      </ul>

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
          <button type="button" class="icon-btn icon-btn--abs" title="下载" @click="emit('download', item)">
            ↓
          </button>
        </li>
      </ul>
    </div>
    <p v-else class="empty">转换完成后将显示在这里</p>
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

.exports {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.exports .btn.primary {
  grid-column: 1 / -1;
}

.exports-hint {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

.card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card__actions--row {
  justify-content: space-between;
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
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.88);
  opacity: 0;
  transition: opacity 0.12s;
}

.card--thumb:hover .icon-btn--abs,
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
