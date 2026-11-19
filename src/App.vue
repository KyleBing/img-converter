<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import SourcePanel from './components/SourcePanel.vue'
import ConvertPanel from './components/ConvertPanel.vue'
import ResultPanel from './components/ResultPanel.vue'
import CompareTable from './components/CompareTable.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import CompareLightbox from './components/CompareLightbox.vue'
import ViewToggle, { type ViewMode } from './components/ViewToggle.vue'
import type {
  CompareRow,
  ConvertedImage,
  ConvertOptions,
  SourceImage,
} from './types/image'
import {
  convertImageFile,
  formatExt,
  isLikelyImageFile,
  readImageMeta,
  sniffHeicFile,
} from './utils/convert'
import {
  canPickDirectory,
  downloadAsZip,
  downloadBlob,
  downloadBlobs,
  pickSourceDirectory,
} from './utils/download'
import { appendDimSuffix, getExt, replaceExt } from './utils/format'

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
  resizeMode: 'none',
  resizePercent: 100,
  maxWidth: 0,
  maxHeight: 0,
})

const converting = ref(false)
const exporting = ref(false)
const statusMsg = ref('')
const statusError = ref(false)

/** 源目录名（仅用于展示导入来源） */
const sourceDirName = ref('')
const dirSupported = canPickDirectory()

const lightbox = ref<{ url: string; name: string } | null>(null)
const compareLightbox = ref<CompareRow | null>(null)

/** 侧边栏主 tab：转换工作台 / 转换对比 */
type AppTab = 'convert' | 'compare'
const appTab = ref<AppTab>('convert')

/** 源图 / 结果列表共用的展示模式 */
const viewMode = ref<ViewMode>('list')

const selectedSourceCount = computed(
  () => Object.values(sourceSelected.value).filter(Boolean).length,
)

/** 已选源图最长边，用于限制「最大宽高」输入 */
const maxSourceSide = computed(() => {
  let max = 0
  for (const s of sources.value) {
    if (!sourceSelected.value[s.id]) continue
    max = Math.max(max, s.width, s.height)
  }
  return max
})

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
  const raw = Array.from(fileList)
  const files: File[] = []
  for (const file of raw) {
    if (isLikelyImageFile(file)) {
      files.push(file)
      continue
    }
    // 无扩展名 / MIME 异常时按文件头识别 HEIC
    if (await sniffHeicFile(file)) files.push(file)
  }
  if (!files.length) {
    setStatus('未识别到有效图片文件', true)
    return
  }

  let added = 0
  let failed = 0
  let lastError = ''
  for (const file of files) {
    try {
      const meta = await readImageMeta(file)
      const item: SourceImage = {
        id: uid(),
        file,
        name: file.name,
        ext: getExt(file.name) || (await sniffHeicFile(file) ? 'heic' : 'img'),
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
      failed++
      lastError = e instanceof Error ? e.message : String(e)
    }
  }
  setStatus(
    added
      ? failed
        ? `已添加 ${added} 张，${failed} 张无法识别${lastError ? `（${lastError}）` : ''}`
        : `已添加 ${added} 张图片`
      : `添加失败${lastError ? `：${lastError}` : '，请检查文件格式'}`,
    !added,
  )
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
  sourceDirName.value = ''
}

/** 通过文件夹选择导入图片 */
async function pickSourceFolder() {
  if (!dirSupported) {
    setStatus('当前浏览器不支持选择文件夹，请改用拖拽或文件选择', true)
    return
  }
  try {
    const { handle, files } = await pickSourceDirectory()
    sourceDirName.value = handle.name
    if (!files.length) {
      setStatus(`已选择「${handle.name}」，但未找到图片文件`, true)
      return
    }
    await addFiles(files)
    setStatus(`已从「${handle.name}」导入 ${files.length} 张`)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      setStatus('已取消选择文件夹')
    } else {
      console.error(e)
      setStatus('选择文件夹失败', true)
    }
  }
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
  let lastError = ''
  const outExt = formatExt(options.value.format)

  for (const source of targets) {
    const t0 = performance.now()
    try {
      const { blob, width, height, previewBlob } = await convertImageFile(
        source.file,
        options.value.format,
        options.value.quality,
        {
          resizeMode: options.value.resizeMode,
          resizePercent: options.value.resizePercent,
          maxWidth: options.value.maxWidth,
          maxHeight: options.value.maxHeight,
        },
      )
      const durationMs = Math.round(performance.now() - t0)
      let name = options.value.keepName
        ? replaceExt(source.name, outExt)
        : replaceExt(`converted-${done + 1}`, outExt)
      // 调整过输出尺寸时，文件名追加实际输出宽高
      if (
        options.value.resizeMode !== 'none' &&
        (width !== source.width || height !== source.height)
      ) {
        name = appendDimSuffix(name, width, height)
      }

      const converted: ConvertedImage = {
        id: uid(),
        sourceId: source.id,
        name,
        format: options.value.format,
        blob,
        size: blob.size,
        width,
        height,
        previewUrl: URL.createObjectURL(previewBlob),
        durationMs,
      }
      results.value.push(converted)
      resultSelected.value[converted.id] = true

      compareRows.value.push({
        id: converted.id,
        name: source.name,
        beforeExt: source.ext,
        afterExt: outExt,
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
      lastError = e instanceof Error ? e.message : String(e)
    }
    setStatus(`正在转换 ${done + failed} / ${targets.length}…`)
  }

  converting.value = false
  setStatus(
    failed
      ? `完成 ${done} 张，失败 ${failed} 张${lastError ? `（${lastError}）` : ''}`
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

/** 勾选结果逐个下载到默认下载目录 */
async function downloadSelected() {
  const items = selectedResults()
  if (!items.length) return
  exporting.value = true
  try {
    const n = await downloadBlobs(items)
    setStatus(`已开始下载 ${n} 个文件到默认下载目录`)
  } catch (e) {
    console.error(e)
    setStatus('下载失败，可尝试打包 ZIP', true)
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
    <aside class="sidebar">
      <p class="brand">Img Converter</p>

      <nav class="sidebar-tabs" role="tablist" aria-label="主功能">
        <button
          type="button"
          role="tab"
          class="sidebar-tabs__btn"
          :class="{ active: appTab === 'convert' }"
          :aria-selected="appTab === 'convert'"
          @click="appTab = 'convert'"
        >
          转换
        </button>
        <button
          type="button"
          role="tab"
          class="sidebar-tabs__btn"
          :class="{ active: appTab === 'compare' }"
          :aria-selected="appTab === 'compare'"
          @click="appTab = 'compare'"
        >
          <span>转换对比</span>
          <span v-if="compareRows.length" class="sidebar-tabs__count">{{ compareRows.length }}</span>
        </button>
      </nav>

      <div v-show="appTab === 'convert'" class="sidebar-block">
        <p class="sidebar-label">显示</p>
        <ViewToggle v-model="viewMode" />
      </div>

      <div class="sidebar-status">
        <p v-if="statusMsg" class="status" :class="{ error: statusError }">{{ statusMsg }}</p>
      </div>
    </aside>

    <div class="main">
      <main v-show="appTab === 'convert'" class="workspace">
        <div class="col">
          <SourcePanel
            :items="sources"
            :selected-ids="sourceSelectedSet"
            :source-dir-name="sourceDirName"
            :dir-supported="dirSupported"
            :view-mode="viewMode"
            @add="addFiles"
            @remove="removeSource"
            @clear="clearSources"
            @preview="previewSource"
            @toggle-select="toggleSourceSelect"
            @select-all="selectAllSources"
            @pick-folder="pickSourceFolder"
          />
        </div>

        <div class="col col--mid">
          <ConvertPanel
            v-model="options"
            :source-count="sources.length"
            :selected-count="selectedSourceCount"
            :max-source-side="maxSourceSide"
            :converting="converting"
            @convert="runConvert"
          />
        </div>

        <div class="col">
          <ResultPanel
            :items="results"
            :selected-ids="resultSelectedSet"
            :exporting="exporting"
            :view-mode="viewMode"
            @remove="removeResult"
            @clear="clearResults"
            @preview="previewResult"
            @download="downloadOne"
            @toggle-select="toggleResultSelect"
            @select-all="selectAllResults"
            @download-selected="downloadSelected"
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
    </div>

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
