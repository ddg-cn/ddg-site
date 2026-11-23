<script setup>
import { ref, computed, watch } from 'vue'
import { readPdf, detectKind } from './reportqc/extract.js'
import { LIMITS, capText, sizeProblem, pagesNote, readProblem } from './limits.js'
import * as clarity from './reportqc/clarity.js'
import * as cdp from './reportqc/cdp.js'
import * as rba from './reportqc/rba.js'
import * as ecovadis from './reportqc/ecovadis.js'
import * as smeta from './reportqc/smeta.js'
import * as bsci from './reportqc/bsci.js'
import * as slcp from './extract/slcp.js'
import * as carbon from './extract/carbon.js'

const props = defineProps({ lang: { type: String, default: 'en' } })
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/'
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'
// detection order matters: specific report types first
const PDF_MODS = { rba, smeta, bsci, clarity, cdp, ecovadis }
const MODS = { ...PDF_MODS, slcp, carbon }
const KINDS = ['clarity', 'rba', 'smeta', 'bsci', 'ecovadis', 'cdp', 'slcp', 'carbon']
const NAMES = {
  en: { clarity: 'Clarity', rba: 'RBA', smeta: 'SMETA', bsci: 'amfori BSCI', ecovadis: 'EcoVadis', cdp: 'CDP', slcp: 'SLCP', carbon: 'Carbon footprint' },
  zh: { clarity: 'Clarity', rba: 'RBA', smeta: 'SMETA', bsci: 'amfori BSCI', ecovadis: 'EcoVadis', cdp: 'CDP', slcp: 'SLCP', carbon: '碳足迹' },
}
const T = {
  en: {
    drop: 'Drop reports here', or: 'or', choose: 'Choose files',
    accepts: 'PDF: Clarity, RBA, SMETA, amfori BSCI, EcoVadis, CDP · Excel (.xlsx / .xlsm / .xls / .xlsb) or CSV: SLCP Verifier / Facility Tool, carbon footprint forms. Mix types freely; each type gets its own table.',
    privacy: 'Runs entirely in your browser: files are read on your computer, nothing is uploaded or saved on the website.',
    loading: 'Loading the readers…', reading: 'Reading {name} ({i}/{n})…', load: 'The PDF or Excel reader could not load. Check your internet connection and try again.',
    scanned: '{name}: no text found; this looks like a scanned PDF.', unknown: '{name}: not recognised as one of the supported report types.',
    drm: '{name} is DRM-encrypted (TSD). Save an unprotected copy and add that instead.', failed: '{name}: could not be read ({msg}).',
    files: '{n} file(s) read', add: 'Add more files', clear: 'Start over',
    reportCols: 'Report columns', reportHint: 'one row per report', rowCols: '{name}', rowHint: 'one row per item, with the file name',
    search: 'Search columns…', all: 'All', none: 'None', defaults: 'Default', shown: '{n} of {m} shown — search to narrow', selected: '{n} selected',
    preview: 'Preview', previewHint: 'first {n} rows', noRows: 'No items in these files.',
    download: 'Download Excel ({name})', downloadAll: 'Download Excel (all types)', file: 'File', standard: 'Standard fields',
  },
  zh: {
    drop: '将报告拖到这里', or: '或', choose: '选择文件',
    accepts: 'PDF：Clarity、RBA、SMETA、amfori BSCI、EcoVadis、CDP · Excel（.xlsx / .xlsm / .xls / .xlsb）或 CSV：SLCP 核查/工厂工具、碳足迹表格。可混合上传，每类报告单独成表。',
    privacy: '完全在您的浏览器中运行：文件在本机读取，不会上传，也不会保存在网站上。',
    loading: '正在加载读取组件……', reading: '正在读取 {name}（{i}/{n}）……', load: 'PDF 或 Excel 读取组件加载失败，请检查网络连接后重试。',
    scanned: '{name}：未读到文字，似乎是扫描件。', unknown: '{name}：不是支持的报告类型。',
    drm: '{name} 已被加密（TSD）。请另存一份未加密的副本再添加。', failed: '{name}：无法读取（{msg}）。',
    files: '已读取 {n} 个文件', add: '添加更多文件', clear: '重新开始',
    reportCols: '报告字段', reportHint: '每份报告一行', rowCols: '{name}', rowHint: '每项一行，附文件名',
    search: '搜索字段……', all: '全选', none: '全不选', defaults: '默认', shown: '显示 {n} / {m}，可搜索缩小范围', selected: '已选 {n} 个',
    preview: '预览', previewHint: '前 {n} 行', noRows: '这些文件中没有此类条目。',
    download: '下载 Excel（{name}）', downloadAll: '下载 Excel（全部类型）', file: '文件', standard: '标准字段',
  },
}
const L = computed(() => (props.lang === 'zh' ? 'zh' : 'en'))
const t = computed(() => T[L.value])
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const lbl = f => (L.value === 'zh' && f.zh) || f.en || f.key

const busy = ref(false)
const stage = ref('')
const notices = ref([])
const data = ref({}) // kind -> [{ file, report, rows, extraFields }]
const active = ref('')
const sel = ref({}) // kind -> { report: string[], rows: string[] }
const q = ref({ report: '', rows: '' })
const dragging = ref(false)
const input = ref(null)
let pdfjs = null, X = null

const kinds = computed(() => KINDS.filter(k => data.value[k]?.length))
const nFiles = computed(() => kinds.value.reduce((a, k) => a + data.value[k].length, 0))

// field lists for a kind: standard fields + extra fields reported by the files (unique, in order)
function fieldsOf(kind) {
  const E = MODS[kind].EXTRACT
  const std = E.report.filter(f => f.key !== 'file').map(f => ({ ...f, group: t.value.standard }))
  const seen = new Set(std.map(f => f.key)), extra = []
  for (const d of data.value[kind] || []) {
    for (const f of d.extraFields || []) if (!seen.has(f.key)) { seen.add(f.key); extra.push(f) }
    for (const k of Object.keys(d.report)) if (k !== 'file' && !seen.has(k)) { seen.add(k); extra.push({ key: k, en: k, group: NAMES[L.value][kind] }) }
  }
  return { report: [...std, ...extra], rows: E.rows.fields.filter(f => f.key !== 'file').map(f => ({ ...f, group: '' })) }
}
const F = computed(() => (active.value ? fieldsOf(active.value) : { report: [], rows: [] }))
function defaults(kind) {
  const fl = fieldsOf(kind)
  const extraOn = (data.value[kind] || []).some(d => d.extraDefault !== false)
  const std = new Set(MODS[kind].EXTRACT.report.map(f => f.key))
  return { report: fl.report.filter(f => std.has(f.key) || (extraOn && !f.key.startsWith('q:'))).map(f => f.key), rows: fl.rows.map(f => f.key) }
}
const STORE = 'scdd-extract-v1-'
function loadSel(kind) {
  try { const s = JSON.parse(localStorage.getItem(STORE + kind) || 'null'); if (s && Array.isArray(s.report)) return s } catch (e) { /* storage blocked */ }
  return null
}
function saveSel(kind) { try { localStorage.setItem(STORE + kind, JSON.stringify(sel.value[kind])) } catch (e) { /* storage blocked */ } }
function ensureSel(kind) {
  if (sel.value[kind]) return
  const d = defaults(kind), s = loadSel(kind)
  const fl = fieldsOf(kind), have = { report: new Set(fl.report.map(f => f.key)), rows: new Set(fl.rows.map(f => f.key)) }
  sel.value[kind] = s ? { report: s.report.filter(k => have.report.has(k)), rows: s.rows.filter(k => have.rows.has(k)) } : d
  if (s && !sel.value[kind].report.length) sel.value[kind].report = d.report
}
watch(sel, () => { if (active.value) saveSel(active.value) }, { deep: true })

async function getPdfjs() {
  if (!pdfjs) { pdfjs = await import(/* @vite-ignore */ PDFJS + 'build/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.mjs' }
  return pdfjs
}
async function getX() { if (!X) X = await import(/* @vite-ignore */ XLSX_URL); return X }

async function run(fileList) {
  const big = []
  const files = [...(fileList || [])].filter(f => /\.(pdf|xlsx|xlsm|xls|xlsb|csv)$/i.test(f.name)).filter(f => { const p = sizeProblem(f, L.value); if (p) big.push(p); return !p })
  if (!files.length) { notices.value = big; return }
  busy.value = true; notices.value = big
  stage.value = t.value.loading
  try {
    if (files.some(f => /\.pdf$/i.test(f.name))) await getPdfjs()
    await getX() // also needed for the download
  } catch (e) { notices.value.push(t.value.load); busy.value = false; return }
  const next = { ...data.value }
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    stage.value = fmt(t.value.reading, { name: f.name, i: i + 1, n: files.length })
    try {
      const buf = new Uint8Array(await f.arrayBuffer())
      let kind = null, out = null
      if (/\.pdf$/i.test(f.name)) {
        let doc
        try {
          doc = await readPdf(pdfjs, buf, { cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', maxPages: LIMITS.pdfPages })
        } catch (e) { notices.value.push(readProblem(f.name, e, L.value)); continue }
        if (doc.totalPages > doc.numPages) notices.value.push(pagesNote(f.name, doc.totalPages, L.value))
        if (doc.text.replace(/\s/g, '').length < 200) { notices.value.push(fmt(t.value.scanned, { name: f.name })); continue }
        kind = detectKind(doc, PDF_MODS, Object.keys(PDF_MODS))
        if (kind) { const r = PDF_MODS[kind].check(doc, f.name); out = PDF_MODS[kind].extract(r.R, f.name) }
      } else {
        if (new TextDecoder().decode(buf.slice(0, 11)) === '%TSD-Header') { notices.value.push(fmt(t.value.drm, { name: f.name })); continue }
        const wb = X.read(buf, { type: 'array', cellDates: true })
        if (slcp.detect(wb)) { kind = 'slcp'; out = slcp.extract(X, wb, f.name) }
        else { out = carbon.extract(X, wb, f.name); if (out) kind = 'carbon' }
      }
      if (!kind || !out) { notices.value.push(fmt(t.value.unknown, { name: f.name })); continue }
      out.report.file = f.name
      next[kind] = [...(next[kind] || []).filter(d => d.report.file !== f.name), { ...out, file: f.name }]
    } catch (e) {
      notices.value.push(fmt(t.value.failed, { name: f.name, msg: e.message || String(e) }))
    }
  }
  data.value = next
  for (const k of kinds.value) ensureSel(k)
  if (!active.value || !kinds.value.includes(active.value)) active.value = kinds.value[0] || ''
  busy.value = false
}
function onPick(e) { run(e.target.files); e.target.value = '' }
function onDrop(e) { dragging.value = false; run(e.dataTransfer.files) }
function reset() { data.value = {}; active.value = ''; notices.value = [] }

// picker
function visible(part) {
  const s = q.value[part].trim().toLowerCase()
  const all = F.value[part]
  const list = s ? all.filter(f => (lbl(f) + ' ' + f.key + ' ' + (f.group || '')).toLowerCase().includes(s)) : all
  return { list: list.slice(0, 400), total: list.length, all: all.length }
}
const vis = computed(() => ({ report: visible('report'), rows: visible('rows') }))
const groupsOf = list => { const g = new Map(); for (const f of list) { const k = f.group || ''; if (!g.has(k)) g.set(k, []); g.get(k).push(f) } return [...g] }
const S = computed(() => sel.value[active.value] || { report: [], rows: [] })
function toggle(part, key) {
  const a = S.value[part], i = a.indexOf(key)
  if (i >= 0) a.splice(i, 1); else a.push(key)
}
function orderSel(kind, part) { const s = new Set(sel.value[kind][part]); return fieldsOf(kind)[part].filter(f => s.has(f.key)) }
function setAll(part, on) {
  const keys = vis.value[part].list.map(f => f.key)
  const cur = new Set(S.value[part])
  for (const k of keys) on ? cur.add(k) : cur.delete(k)
  S.value[part].splice(0, S.value[part].length, ...cur)
}
function setDefault(part) { const d = defaults(active.value)[part]; S.value[part].splice(0, S.value[part].length, ...d) }

// tables
function table(kind, part) {
  const cols = orderSel(kind, part)
  const head = [t.value.file, ...cols.map(lbl)]
  const body = []
  for (const d of data.value[kind] || []) {
    if (part === 'report') body.push([d.file, ...cols.map(c => d.report[c.key] ?? '')])
    else for (const r of d.rows) body.push([d.file, ...cols.map(c => r[c.key] ?? '')])
  }
  return { head, body }
}
const PREV = 15
const prevReport = computed(() => (active.value ? table(active.value, 'report') : null))
const prevRows = computed(() => (active.value ? table(active.value, 'rows') : null))

function sheetName(s) { return s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) }
function addSheets(wb, kind) {
  for (const part of ['report', 'rows']) {
    const { head, body } = table(kind, part)
    if (part === 'rows' && !body.length) continue
    const ws = X.utils.aoa_to_sheet([head, ...body])
    ws['!cols'] = head.map((h, i) => ({ wch: i === 0 ? 36 : Math.min(48, Math.max(10, String(h).length + 2)) }))
    ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: head.length - 1 } }) }
    const nm = NAMES.en[kind] + (part === 'report' ? ' reports' : ' – ' + MODS[kind].EXTRACT.rows.en)
    X.utils.book_append_sheet(wb, ws, sheetName(nm))
  }
}
function stamp() { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` }
function download(which) {
  const wb = X.utils.book_new()
  const list = which === 'all' ? kinds.value : [which]
  for (const k of list) { ensureSel(k); addSheets(wb, k) }
  X.writeFile(wb, `Report data ${which === 'all' ? 'all types' : NAMES.en[which]} ${stamp()}.xlsx`)
}
const cell = v => (v == null ? '' : String(v).length > 140 ? String(v).slice(0, 139) + '…' : v)
</script>

<template>
  <div class="dx">
    <div class="drop" :class="{ over: dragging }" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
      <p class="drop-main">📄 {{ t.drop }}</p>
      <p class="drop-or">{{ t.or }}</p>
      <button class="btn primary" @click="input.click()">{{ kinds.length ? t.add : t.choose }}</button>
      <input ref="input" type="file" accept=".pdf,.xlsx,.xlsm,.xls,.xlsb,.csv" multiple hidden @change="onPick">
      <p class="fine">{{ t.accepts }}</p>
      <p class="fine">🔒 {{ t.privacy }}</p>
      <p class="fine">📏 {{ capText(L) }}</p>
    </div>

    <div v-for="(n, i) in notices" :key="i" class="alert warn" role="status">{{ n }}</div>
    <div v-if="busy" class="busy" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>{{ stage }}</span></div>

    <div v-if="kinds.length && !busy" class="result">
      <div class="head">
        <div class="fine">{{ fmt(t.files, { n: nFiles }) }}</div>
        <div class="actions">
          <button v-if="kinds.length > 1" class="btn" @click="download('all')">⬇ {{ t.downloadAll }}</button>
          <button class="btn" @click="reset">{{ t.clear }}</button>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button v-for="k in kinds" :key="k" role="tab" class="tab" :class="{ on: active === k }" :aria-selected="active === k" @click="active = k; ensureSel(k)">
          {{ NAMES[L][k] }} <span class="n">{{ data[k].length }}</span>
        </button>
      </div>

      <div class="pickers">
        <section v-for="part in ['report', 'rows']" :key="part" class="picker">
          <h4>{{ part === 'report' ? t.reportCols : lbl(MODS[active].EXTRACT.rows) }} <span class="fine">· {{ part === 'report' ? t.reportHint : t.rowHint }}</span></h4>
          <div class="ptools">
            <input v-model="q[part]" type="search" :placeholder="t.search" :aria-label="t.search">
            <button class="btn sm" @click="setAll(part, true)">{{ t.all }}</button>
            <button class="btn sm" @click="setAll(part, false)">{{ t.none }}</button>
            <button class="btn sm" @click="setDefault(part)">{{ t.defaults }}</button>
          </div>
          <div class="fine">{{ fmt(t.selected, { n: S[part].length }) }}<template v-if="vis[part].total > vis[part].list.length"> · {{ fmt(t.shown, { n: vis[part].list.length, m: vis[part].total }) }}</template></div>
          <div class="plist">
            <template v-for="[g, fs] in groupsOf(vis[part].list)" :key="g">
              <div v-if="g" class="pg">{{ g }}</div>
              <label v-for="f in fs" :key="f.key" class="pf">
                <input type="checkbox" :checked="S[part].includes(f.key)" @change="toggle(part, f.key)"> <span>{{ lbl(f) }}</span>
              </label>
            </template>
          </div>
        </section>
      </div>

      <div class="dl"><button class="btn primary" @click="download(active)">⬇ {{ fmt(t.download, { name: NAMES[L][active] }) }}</button></div>

      <template v-for="(P, part) in { report: prevReport, rows: prevRows }" :key="part">
        <h4 v-if="P">{{ t.preview }}: {{ part === 'report' ? t.reportCols : lbl(MODS[active].EXTRACT.rows) }} <span class="fine">· {{ fmt(t.previewHint, { n: Math.min(PREV, P.body.length) }) }} / {{ P.body.length }}</span></h4>
        <div v-if="P && P.body.length" class="tablewrap">
          <table>
            <thead><tr><th v-for="(h, i) in P.head" :key="i">{{ h }}</th></tr></thead>
            <tbody><tr v-for="(r, n) in P.body.slice(0, PREV)" :key="n"><td v-for="(c, i) in r" :key="i" :class="{ fcell: i === 0 }">{{ cell(c) }}</td></tr></tbody>
          </table>
        </div>
        <p v-else-if="P" class="fine">{{ t.noRows }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dx { margin: 24px 0; }
.drop { border: 2px dashed var(--vp-c-divider); border-radius: 12px; padding: 32px 16px; text-align: center; background: var(--vp-c-bg-soft); transition: border-color .15s, background .15s; }
.drop.over { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.drop p { margin: 6px 0; }
.drop-main { font-weight: 600; font-size: 1.05em; }
.drop-or { color: var(--vp-c-text-2); }
.fine { color: var(--vp-c-text-2); font-size: .85em; line-height: 1.5; font-weight: 400; }
.btn { display: inline-block; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; text-decoration: none !important; }
.btn:hover { border-color: var(--vp-c-brand-1); }
.btn.primary { background: var(--vp-c-brand-3); border-color: var(--vp-c-brand-3); color: var(--vp-c-white); }
.btn.primary:hover { background: var(--vp-c-brand-2); }
.btn.sm { padding: 3px 10px; font-size: .85em; }
.alert { margin-top: 12px; padding: 12px 16px; border-radius: 8px; background: var(--vp-c-warning-soft); border-left: 4px solid var(--vp-c-warning-1); }
.busy { display: flex; align-items: center; gap: 12px; padding: 20px 16px; border-radius: 12px; background: var(--vp-c-bg-soft); margin-top: 12px; }
.spinner { width: 18px; height: 18px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin .8s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.result { margin-top: 16px; }
.head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0 10px; border-bottom: 1px solid var(--vp-c-divider); }
.tab { border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0; padding: 6px 14px; background: none; color: var(--vp-c-text-2); cursor: pointer; font-weight: 500; }
.tab.on { border-color: var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.tab .n { font-size: .8em; background: var(--vp-c-default-soft); border-radius: 999px; padding: 0 7px; margin-left: 4px; }
.pickers { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.picker { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 10px 12px; background: var(--vp-c-bg-soft); min-width: 0; }
.picker h4 { margin: 0 0 8px; font-size: 1em; }
.ptools { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.ptools input { flex: 1 1 140px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 4px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.plist { max-height: 300px; overflow-y: auto; margin-top: 6px; padding-right: 4px; }
.pg { font-size: .75em; text-transform: uppercase; letter-spacing: .04em; color: var(--vp-c-text-2); margin: 8px 0 2px; }
.pf { display: flex; gap: 6px; align-items: flex-start; font-size: .88em; line-height: 1.35; padding: 2px 0; cursor: pointer; }
.pf input { margin-top: 3px; flex: none; }
.dl { margin: 14px 0 6px; }
.result h4 { margin: 18px 0 6px; }
.tablewrap { overflow-x: auto; max-height: 420px; overflow-y: auto; border: 1px solid var(--vp-c-divider); border-radius: 8px; }
.tablewrap table { display: table; width: max-content; min-width: 100%; margin: 0; font-size: .82em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 5px 8px; max-width: 280px; }
.tablewrap th { position: sticky; top: 0; background: var(--vp-c-bg-soft); }
.fcell { max-width: 200px; word-break: break-all; }
</style>
