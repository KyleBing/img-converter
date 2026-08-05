<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import SourcePanel from './components/SourcePanel.vue'
import ConvertPanel from './components/ConvertPanel.vue'
import ResultPanel from './components/ResultPanel.vue'
import CompareTable from './components/CompareTable.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import CompareLightbox from './components/CompareLightbox.vue'
import type {
  CompareRow,
  ConvertedImage,
  ConvertOptions,
  SourceImage,
} from './types/image'
import { convertImageFile, readImageMeta } from './utils/convert'
import {
  canPickDirectory,
  downloadAsZip,
  downloadBlob,
  exportToDirectory,
} from './utils/download'
import { getExt, replaceExt } from './utils/format'

const sources = ref<SourceImage[]>([])
const results = ref<ConvertedImage[]>([])
const compareRows = ref<CompareRow[]>([])

/** 勾选 id 用对象存储，便于模板响应式更新 */
const sourceSelected = ref<Record<string, boolean>>({})
const resultSelected = ref<Record<string, boolean>>({})

const options = ref<ConvertOptions>({
  format: 'png',
  quality: 0.92,
  keepName: true,
})

const converting = ref(false)
const exporting = ref(false)
const statusMsg = ref('')
const statusError = ref(false)

const lightbox = ref<{ url: string; name: string } | null>(null)
const compareLightbox = ref<CompareRow | null>(null)

/** header 主 tab：转换工作台 / 转换对比 */
type AppTab = 'convert' | 'compare'
const appTab = ref<AppTab>('convert')

const selectedSourceCount = computed(
  () => Object.values(sourceSelected.value).filter(Boolean).length,
)

const sourceSelectedSet = computed(
  () => new Set(Object.keys(sourceSelected.value).filter((id) => sourceSelected.value[id])),
)

const resultSelectedSet = computed(
  () => new Set(Object.keys(resultSelected.value).filter((id) => resultSelected.value[id])),
)

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function setStatus(msg: string, isError = false) {
  statusMsg.value = msg
  statusError.value = isError
}

/** 批量添加图片文件 */
async function addFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(bmp|png|jpe?g|webp|gif)$/i.test(f.name))
  if (!files.length) {
    setStatus('未识别到有效图片文件', true)
    return
  }

  let added = 0
  for (const file of files) {
    try {
      const meta = await readImageMeta(file)
      const item: SourceImage = {
        id: uid(),
        file,
        name: file.name,
        ext: getExt(file.name) || 'img',
        size: file.size,
        width: meta.width,
        height: meta.height,
        lastModified: file.lastModified,
        previewUrl: meta.previewUrl,
      }
      sources.value.push(item)
      sourceSelected.value[item.id] = true
      added++
    } catch (e) {
      console.error(e)
    }
  }
  setStatus(added ? `已添加 ${added} 张图片` : '添加失败，请检查文件格式', !added)
}

function removeSource(id: string) {
  const idx = sources.value.findIndex((s) => s.id === id)
  if (idx < 0) return
  const [item] = sources.value.splice(idx, 1)
  if (item) URL.revokeObjectURL(item.previewUrl)
  delete sourceSelected.value[id]
}

function clearSources() {
  for (const s of sources.value) URL.revokeObjectURL(s.previewUrl)
  sources.value = []
  sourceSelected.value = {}
}

function toggleSourceSelect(id: string) {
  sourceSelected.value[id] = !sourceSelected.value[id]
}

function selectAllSources() {
  const next: Record<string, boolean> = {}
  for (const s of sources.value) next[s.id] = true
  sourceSelected.value = next
}

function removeResult(id: string) {
  const idx = results.value.findIndex((r) => r.id === id)
  if (idx < 0) return
  const [item] = results.value.splice(idx, 1)
  if (item) URL.revokeObjectURL(item.previewUrl)
  delete resultSelected.value[id]
  compareRows.value = compareRows.value.filter((r) => r.id !== id)
}

function clearResults() {
  for (const r of results.value) URL.revokeObjectURL(r.previewUrl)
  results.value = []
  resultSelected.value = {}
  compareRows.value = []
}

function toggleResultSelect(id: string) {
  resultSelected.value[id] = !resultSelected.value[id]
}

function selectAllResults() {
  const next: Record<string, boolean> = {}
  for (const r of results.value) next[r.id] = true
  resultSelected.value = next
}

/** 执行批量转换 */
async function runConvert() {
  const targets = sources.value.filter((s) => sourceSelected.value[s.id])
  if (!targets.length) return

  converting.value = true
  setStatus(`正在转换 0 / ${targets.length}…`)

  // 新一轮转换前清理旧结果
  clearResults()

  let done = 0
  let failed = 0

  for (const source of targets) {
    const t0 = performance.now()
    try {
      const { blob, width, height } = await convertImageFile(
        source.file,
        options.value.format,
        options.value.quality,
      )
      const durationMs = Math.round(performance.now() - t0)
      const name = options.value.keepName
        ? replaceExt(source.name, options.value.format === 'jpeg' ? 'jpg' : options.value.format)
        : replaceExt(`converted-${done + 1}`, options.value.format === 'jpeg' ? 'jpg' : options.value.format)

      const converted: ConvertedImage = {
        id: uid(),
        sourceId: source.id,
        name,
        format: options.value.format,
        blob,
        size: blob.size,
        width,
        height,
        previewUrl: URL.createObjectURL(blob),
        durationMs,
      }
      results.value.push(converted)
      resultSelected.value[converted.id] = true

      compareRows.value.push({
        id: converted.id,
        name: source.name,
        beforeExt: source.ext,
        afterExt: options.value.format === 'jpeg' ? 'jpg' : options.value.format,
        beforeSize: source.size,
        afterSize: blob.size,
        beforeWidth: source.width,
        beforeHeight: source.height,
        afterWidth: width,
        afterHeight: height,
        durationMs,
        sourcePreviewUrl: source.previewUrl,
        resultPreviewUrl: converted.previewUrl,
      })
      done++
    } catch (e) {
      console.error(e)
      failed++
    }
    setStatus(`正在转换 ${done + failed} / ${targets.length}…`)
  }

  converting.value = false
  setStatus(
    failed
      ? `完成 ${done} 张，失败 ${failed} 张`
      : `成功转换 ${done} 张 → ${options.value.format.toUpperCase()}`,
    failed > 0 && done === 0,
  )
}

function downloadOne(item: ConvertedImage) {
  downloadBlob(item.blob, item.name)
}

function selectedResults(): ConvertedImage[] {
  return results.value.filter((r) => resultSelected.value[r.id])
}

async function exportDir() {
  const items = selectedResults()
  if (!items.length) return
  exporting.value = true
  try {
    if (canPickDirectory()) {
      const n = await exportToDirectory(items)
      setStatus(`已导出 ${n} 个文件到所选目录`)
    } else {
      await downloadAsZip(items)
      setStatus('当前浏览器不支持目录导出，已改为 ZIP 下载')
    }
  } catch (e) {
    // 用户取消选择目录不提示错误
    if (e instanceof DOMException && e.name === 'AbortError') {
      setStatus('已取消导出')
    } else {
      console.error(e)
      setStatus('导出失败，可尝试打包 ZIP', true)
    }
  } finally {
    exporting.value = false
  }
}

async function exportZip() {
  const items = selectedResults()
  if (!items.length) return
  exporting.value = true
  try {
    await downloadAsZip(items)
    setStatus(`已打包下载 ${items.length} 个文件`)
  } catch (e) {
    console.error(e)
    setStatus('ZIP 打包失败', true)
  } finally {
    exporting.value = false
  }
}

function openLightbox(url: string, name: string) {
  lightbox.value = { url, name }
}

function previewSource(item: SourceImage) {
  openLightbox(item.previewUrl, item.name)
}

function previewResult(item: ConvertedImage) {
  openLightbox(item.previewUrl, item.name)
}

function openCompareLightbox(row: CompareRow) {
  compareLightbox.value = row
}

onBeforeUnmount(() => {
  clearSources()
  clearResults()
})
</script>

<template>
  <div class="app">
    <header class="hero">
      <div class="hero__bg" aria-hidden="true" />
      <div class="hero__left">
        <p class="brand">Img Converter</p>
        <nav class="header-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="header-tabs__btn"
            :class="{ active: appTab === 'convert' }"
            :aria-selected="appTab === 'convert'"
            @click="appTab = 'convert'"
          >
            转换
          </button>
          <button
            type="button"
            role="tab"
            class="header-tabs__btn"
            :class="{ active: appTab === 'compare' }"
            :aria-selected="appTab === 'compare'"
            @click="appTab = 'compare'"
          >
            转换对比
            <span v-if="compareRows.length" class="header-tabs__count">{{ compareRows.length }}</span>
          </button>
        </nav>
      </div>
      <p v-if="statusMsg" class="status" :class="{ error: statusError }">{{ statusMsg }}</p>
    </header>

    <main v-show="appTab === 'convert'" class="workspace">
      <div class="col">
        <SourcePanel
          :items="sources"
          :selected-ids="sourceSelectedSet"
          @add="addFiles"
          @remove="removeSource"
          @clear="clearSources"
          @preview="previewSource"
          @toggle-select="toggleSourceSelect"
          @select-all="selectAllSources"
        />
      </div>

      <div class="col col--mid">
        <ConvertPanel
          v-model="options"
          :source-count="sources.length"
          :selected-count="selectedSourceCount"
          :converting="converting"
          @convert="runConvert"
        />
      </div>

      <div class="col">
        <ResultPanel
          :items="results"
          :selected-ids="resultSelectedSet"
          :exporting="exporting"
          @remove="removeResult"
          @clear="clearResults"
          @preview="previewResult"
          @download="downloadOne"
          @toggle-select="toggleResultSelect"
          @select-all="selectAllResults"
          @export-dir="exportDir"
          @export-zip="exportZip"
        />
      </div>
    </main>

    <section v-show="appTab === 'compare'" class="compare-page">
      <CompareTable
        :rows="compareRows"
        @preview-compare="openCompareLightbox"
      />
    </section>

    <ImageLightbox
      v-if="lightbox"
      :url="lightbox.url"
      :name="lightbox.name"
      @close="lightbox = null"
    />

    <CompareLightbox
      v-if="compareLightbox"
      :row="compareLightbox"
      @close="compareLightbox = null"
    />
  </div>
</template>
