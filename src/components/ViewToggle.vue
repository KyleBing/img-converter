<script setup lang="ts">
export type ViewMode = 'list' | 'grid' | 'thumbs'

const mode = defineModel<ViewMode>({ required: true })

const modes: { value: ViewMode; label: string; title: string }[] = [
  { value: 'list', label: '列表', title: '列表：缩略图 + 详细信息' },
  { value: 'grid', label: '网格', title: '网格：缩略图 + 简要信息' },
  { value: 'thumbs', label: '缩略图', title: '仅缩略图' },
]
</script>

<template>
  <div class="view-toggle" role="group" aria-label="展示样式">
    <button
      v-for="m in modes"
      :key="m.value"
      type="button"
      class="view-toggle__btn"
      :class="{ active: mode === m.value }"
      :title="m.title"
      @click="mode = m.value"
    >
      {{ m.label }}
    </button>
  </div>
</template>

<style scoped>
.view-toggle {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  gap: 2px;
}

.view-toggle__btn {
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}

.view-toggle__btn:hover {
  color: var(--text);
}

.view-toggle__btn.active {
  background: var(--surface);
  color: var(--accent);
  box-shadow: 0 1px 2px rgba(21, 32, 51, 0.08);
}
</style>
