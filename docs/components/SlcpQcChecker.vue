<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({ lang: { type: String, default: 'en' } })

const T = {
  en: {
    drop: 'Drop a filled SLCP Verifier Tool (.xlsm) here',
    or: 'or',
    choose: 'Choose file',
    privacy: 'Runs entirely in your browser — the file is not uploaded anywhere.',
    supports: 'Supports Verifier Tool 1.7.x.',
    runtime: 'Loading the checker (first time about 25 s, cached afterwards)…',
    packages: 'Loading the Excel reader…',
    checking: 'Checking {name}… (about 30 s for a full tool)',
    elapsed: '{s} s',
    unsupported: 'This tool version is not supported yet. The checker currently supports SLCP Verifier Tool 1.7.x.',
    not_tool: 'This does not look like a filled SLCP Verifier Tool (.xlsm). Please choose the tool file itself.',
    error: 'The check could not finish.',
    load: 'The checker could not load. Check your internet connection and try again.',
    detail: 'Details',
    summary: '{n} questions checked in “{sheet}”',
    errors: 'Errors', warnings: 'Warnings', info: 'Info',
    download: 'Download Excel report',
    reportTip: 'Save the report in the same folder as the tool so the row links open the tool.',
    allRules: 'All rules', search: 'Search key, number or text…',
    sev: 'Severity', rule: 'Rule', q: 'Question', key: 'Key', row: 'Row', field: 'Field', issue: 'Issue',
    none: 'No issues match the current filters.',
    clean: 'No issues found.',
    notes: 'Checks that could not run on this tool',
    more: 'Show {n} more', again: 'Check another file',
    sevName: { Error: 'Error', Warning: 'Warning', Info: 'Info' }
  },
  zh: {
    drop: '将已填写的 SLCP 核查工具（.xlsm）拖到这里',
    or: '或',
    choose: '选择文件',
    privacy: '检查完全在您的浏览器中进行，文件不会上传到任何地方。',
    supports: '支持核查工具 1.7.x 版本。',
    runtime: '正在加载质检程序（首次约 25 秒，之后会缓存）……',
    packages: '正在加载 Excel 读取组件……',
    checking: '正在检查 {name}……（完整工具约需 30 秒）',
    elapsed: '{s} 秒',
    unsupported: '暂不支持此工具版本。目前支持 SLCP 核查工具 1.7.x。',
    not_tool: '该文件看起来不是已填写的 SLCP 核查工具（.xlsm），请选择工具文件本身。',
    error: '检查未能完成。',
    load: '质检程序加载失败，请检查网络连接后重试。',
    detail: '详细信息',
    summary: '已检查“{sheet}”中的 {n} 道题目',
    errors: '错误', warnings: '警告', info: '提示',
    download: '下载 Excel 报告',
    reportTip: '请将报告保存在工具文件所在的文件夹，行号链接即可直接打开工具中的对应行。',
    allRules: '全部规则', search: '搜索 Key、题号或内容……',
    sev: '严重程度', rule: '规则', q: '题号', key: 'Key', row: '行', field: '字段', issue: '问题',
    none: '没有符合当前筛选条件的问题。',
    clean: '未发现问题。',
    notes: '在此工具上无法运行的检查',
    more: '再显示 {n} 条', again: '检查其他文件',
    sevName: { Error: '错误', Warning: '警告', Info: '提示' }
  }
}
const t = computed(() => T[props.lang] || T.en)
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k])

const state = ref('idle')       // idle | busy | done | failed
const stage = ref('')
const fileName = ref('')
const fail = ref(null)
const result = ref(null)
const reportUrl = ref('')
const reportName = ref('')
const secs = ref(0)
const dragging = ref(false)
const sevOn = ref({ Error: true, Warning: true, Info: true })
const ruleSel = ref('')
const query = ref('')
const limit = ref(300)
const input = ref(null)
let worker = null
let timer = null

function getWorker() {
  if (worker) return worker
  worker = new Worker('/tools/slcp-qc/worker.js')
  worker.onmessage = (e) => {
    const m = e.data
    if (m.type === 'progress') stage.value = m.stage
    else if (m.type === 'result') {
      stopTimer()
      result.value = m.result
      if (reportUrl.value) URL.revokeObjectURL(reportUrl.value)
      reportUrl.value = URL.createObjectURL(new Blob([m.report], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      reportName.value = m.result.reportName
      state.value = 'done'
    } else if (m.type === 'failed') {
      stopTimer()
      fail.value = m
      state.value = 'failed'
    }
  }
  worker.onerror = (e) => { stopTimer(); fail.value = { code: 'load', detail: e.message || '' }; state.value = 'failed' }
  return worker
}
function warm() { if (!worker) getWorker().postMessage({ type: 'init' }) }
function startTimer() { secs.value = 0; stopTimer(); timer = setInterval(() => secs.value++, 1000) }
function stopTimer() { if (timer) clearInterval(timer); timer = null }

async function run(file) {
  if (!file) return
  fileName.value = file.name
  fail.value = null; result.value = null
  ruleSel.value = ''; query.value = ''; limit.value = 300
  sevOn.value = { Error: true, Warning: true, Info: true }
  state.value = 'busy'; stage.value = worker ? 'checking' : 'runtime'
  startTimer()
  const buffer = await file.arrayBuffer()
  getWorker().postMessage({ type: 'check', name: file.name, buffer }, [buffer])
}
function onPick(e) { run(e.target.files[0]); e.target.value = '' }
function onDrop(e) { dragging.value = false; run(e.dataTransfer.files[0]) }
function reset() { state.value = 'idle'; result.value = null; fail.value = null }

const counts = computed(() => {
  const c = { Error: 0, Warning: 0, Info: 0 }
  for (const i of result.value?.issues || []) c[i.sev]++
  return c
})
const rulesUsed = computed(() => {
  const seen = new Map()
  for (const i of result.value?.issues || []) seen.set(i.rule, (seen.get(i.rule) || 0) + 1)
  return (result.value?.rules || []).filter(r => seen.has(r.id)).map(r => ({ ...r, n: seen.get(r.id) }))
})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (result.value?.issues || []).filter(i =>
    sevOn.value[i.sev] && (!ruleSel.value || i.rule === ruleSel.value) &&
    (!q || [i.key, i.num, i.msg, i.text, i.section, i.field].some(v => String(v || '').toLowerCase().includes(q))))
})
const stageText = computed(() =>
  stage.value === 'checking' ? fmt(t.value.checking, { name: fileName.value })
    : stage.value === 'packages' ? t.value.packages : t.value.runtime)

onBeforeUnmount(() => { stopTimer(); if (worker) worker.terminate(); if (reportUrl.value) URL.revokeObjectURL(reportUrl.value) })
</script>

<template>
  <div class="qc">
    <div v-if="state === 'idle' || state === 'failed'"
         class="drop" :class="{ over: dragging }"
         @dragenter.prevent="dragging = true; warm()" @dragover.prevent @dragleave.prevent="dragging = false"
         @drop.prevent="onDrop" @mouseenter="warm" @focusin="warm">
      <p class="drop-main">{{ t.drop }}</p>
      <p class="drop-or">{{ t.or }}</p>
      <button class="btn primary" @click="input.click()">{{ t.choose }}</button>
      <input ref="input" type="file" accept=".xlsm,.xlsx" hidden @change="onPick">
      <p class="fine">🔒 {{ t.privacy }} {{ t.supports }}</p>
    </div>

    <div v-if="state === 'failed'" class="alert" role="alert">
      <strong>{{ t[fail.code] || t.error }}</strong>
      <details v-if="fail.detail && fail.code !== 'unsupported'"><summary>{{ t.detail }}</summary><code>{{ fail.detail }}</code></details>
    </div>

    <div v-if="state === 'busy'" class="busy" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ stageText }}</span>
      <span class="secs">{{ fmt(t.elapsed, { s: secs }) }}</span>
    </div>

    <div v-if="state === 'done'" class="result">
      <div class="head">
        <div>
          <div class="file">{{ fileName }}</div>
          <div class="fine">{{ fmt(t.summary, { n: result.questions.toLocaleString(), sheet: result.sheet }) }}</div>
        </div>
        <div class="actions">
          <a class="btn primary" :href="reportUrl" :download="reportName">⬇ {{ t.download }}</a>
          <button class="btn" @click="reset">{{ t.again }}</button>
        </div>
      </div>
      <p class="fine">{{ t.reportTip }}</p>

      <div class="chips">
        <button v-for="(lbl, sv) in { Error: t.errors, Warning: t.warnings, Info: t.info }" :key="sv"
                class="chip" :class="[sv.toLowerCase(), { off: !sevOn[sv] }]" :aria-pressed="sevOn[sv]"
                @click="sevOn[sv] = !sevOn[sv]">
          <b>{{ counts[sv] }}</b> {{ lbl }}
        </button>
      </div>

      <template v-if="result.issues.length">
        <div class="filters">
          <select v-model="ruleSel" :aria-label="t.rule">
            <option value="">{{ t.allRules }}</option>
            <option v-for="r in rulesUsed" :key="r.id" :value="r.id">{{ r.id }} · {{ r.title }} ({{ r.n }})</option>
          </select>
          <input v-model="query" type="search" :placeholder="t.search" :aria-label="t.search">
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>{{ t.sev }}</th><th>{{ t.rule }}</th><th>{{ t.q }}</th><th>{{ t.issue }}</th><th>{{ t.row }}</th></tr></thead>
            <tbody>
              <tr v-for="(i, n) in filtered.slice(0, limit)" :key="n">
                <td><span class="sev" :class="i.sev.toLowerCase()">{{ t.sevName[i.sev] }}</span></td>
                <td><span class="rule" :title="i.title">{{ i.rule }}</span></td>
                <td class="qcell"><div>{{ i.num || i.key }}</div><div class="fine mono">{{ i.key }}</div></td>
                <td><div>{{ i.msg }}</div><div v-if="i.text" class="fine">{{ i.text }}</div><div v-if="i.field" class="fine">{{ i.field }}</div></td>
                <td class="mono">{{ i.row }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filtered.length" class="fine pad">{{ t.none }}</p>
        </div>
        <button v-if="filtered.length > limit" class="btn more" @click="limit += 300">{{ fmt(t.more, { n: Math.min(300, filtered.length - limit) }) }}</button>
      </template>
      <p v-else class="clean">✅ {{ t.clean }}</p>

      <details v-if="result.notes.length" class="notes">
        <summary>{{ t.notes }} ({{ result.notes.length }})</summary>
        <ul><li v-for="(x, n) in result.notes" :key="n"><b>{{ x.rule }}</b> — {{ x.msg }}</li></ul>
      </details>
    </div>
  </div>
</template>

<style scoped>
.qc { margin: 24px 0; }
.drop { border: 2px dashed var(--vp-c-divider); border-radius: 12px; padding: 32px 16px; text-align: center; background: var(--vp-c-bg-soft); transition: border-color .15s, background .15s; }
.drop.over { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.drop p { margin: 6px 0; }
.drop-main { font-weight: 600; font-size: 1.05em; }
.drop-or { color: var(--vp-c-text-2); }
.fine { color: var(--vp-c-text-2); font-size: .85em; line-height: 1.5; }
.mono { font-family: var(--vp-font-family-mono); font-size: .85em; }
.btn { display: inline-block; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; text-decoration: none !important; }
.btn:hover { border-color: var(--vp-c-brand-1); }
.btn.primary { background: var(--vp-c-brand-3); border-color: var(--vp-c-brand-3); color: var(--vp-c-white); }
.btn.primary:hover { background: var(--vp-c-brand-2); }
.alert { margin-top: 12px; padding: 12px 16px; border-radius: 8px; background: var(--vp-c-danger-soft); border-left: 4px solid var(--vp-c-danger-1); }
.alert code { display: block; white-space: pre-wrap; font-size: .8em; margin-top: 6px; }
.busy { display: flex; align-items: center; gap: 12px; padding: 20px 16px; border-radius: 12px; background: var(--vp-c-bg-soft); }
.secs { margin-left: auto; color: var(--vp-c-text-2); font-variant-numeric: tabular-nums; }
.spinner { width: 18px; height: 18px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin .8s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.file { font-weight: 600; word-break: break-all; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 8px; }
.chip { border-radius: 999px; padding: 4px 14px; border: 1px solid transparent; cursor: pointer; font-size: .9em; }
.chip.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.chip.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.chip.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.chip.off { opacity: .45; text-decoration: line-through; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.filters select, .filters input { flex: 1 1 220px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; margin: 0; font-size: .9em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 8px 10px; }
.qcell { white-space: nowrap; }
.sev { font-size: .8em; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.sev.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.sev.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.sev.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.rule { font-family: var(--vp-font-family-mono); font-size: .85em; white-space: nowrap; border-bottom: 1px dotted var(--vp-c-text-3); cursor: help; }
.more { margin-top: 8px; }
.pad { padding: 12px; }
.clean { font-weight: 600; margin-top: 12px; }
.notes { margin-top: 16px; font-size: .9em; }
</style>
