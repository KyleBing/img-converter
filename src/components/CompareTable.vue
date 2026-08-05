<script setup lang="ts">
import type { CompareRow } from '../types/image'
import { formatBytes, sizeDeltaText } from '../utils/format'

defineProps<{
  rows: CompareRow[]
}>()

const emit = defineEmits<{
  /** 点击源图或结果缩略图，打开左右对比预览 */
  previewCompare: [row: CompareRow]
}>()
</script>

<template>
  <section class="compare">
    <p v-if="!rows.length" class="empty">暂无对比数据，完成转换后可在此查看前后体积与尺寸</p>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>源图</th>
            <th>结果</th>
            <th>文件名</th>
            <th>格式</th>
            <th>尺寸</th>
            <th>体积</th>
            <th>变化</th>
            <th>耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <button type="button" class="thumb" title="左右对比预览" @click="emit('previewCompare', row)">
                <img :src="row.sourcePreviewUrl" :alt="row.name" loading="lazy" />
              </button>
            </td>
            <td>
              <button type="button" class="thumb" title="左右对比预览" @click="emit('previewCompare', row)">
                <img :src="row.resultPreviewUrl" :alt="row.name" loading="lazy" />
              </button>
            </td>
            <td class="name" :title="row.name">{{ row.name }}</td>
            <td class="mono">
              <span class="before">.{{ row.beforeExt }}</span>
              <span class="arrow">→</span>
              <span class="after">.{{ row.afterExt }}</span>
            </td>
            <td class="mono">
              {{ row.beforeWidth }}×{{ row.beforeHeight }}
              <span class="arrow">→</span>
              {{ row.afterWidth }}×{{ row.afterHeight }}
            </td>
            <td class="mono">
              {{ formatBytes(row.beforeSize) }}
              <span class="arrow">→</span>
              {{ formatBytes(row.afterSize) }}
            </td>
            <td
              class="mono delta"
              :class="{
                down: row.afterSize < row.beforeSize,
                up: row.afterSize > row.beforeSize,
              }"
            >
              {{ sizeDeltaText(row.beforeSize, row.afterSize) }}
            </td>
            <td class="mono">{{ row.durationMs }} ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.compare {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

th {
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--surface-2);
  position: sticky;
  top: 0;
  z-index: 1;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: var(--accent-soft);
}

.thumb {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  background: #f0f2f5;
  cursor: zoom-in;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.name {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
}

.arrow {
  margin: 0 4px;
  color: var(--text-muted);
}

.before {
  color: var(--text-muted);
}

.after {
  color: var(--accent);
  font-weight: 650;
}

.delta.down {
  color: #0f766e;
  font-weight: 650;
}

.delta.up {
  color: #b45309;
  font-weight: 650;
}

.empty {
  margin: auto;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
