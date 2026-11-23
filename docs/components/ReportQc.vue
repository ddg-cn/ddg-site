<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { readPdf, detectKind } from './reportqc/extract.js'
import { LIMITS, capText, sizeProblem, pagesNote, readProblem } from './limits.js'
import * as clarity from './reportqc/clarity.js'
import * as cdp from './reportqc/cdp.js'
import * as rba from './reportqc/rba.js'
import * as ecovadis from './reportqc/ecovadis.js'
import * as smeta from './reportqc/smeta.js'
import * as bsci from './reportqc/bsci.js'

const props = defineProps({ kind: { type: String, required: true }, lang: { type: String, default: 'en' } })
const MODS = { clarity, cdp, rba, ecovadis, smeta, bsci }
const NAMES = {
  en: { clarity: 'Clarity audit report', cdp: 'CDP response', rba: 'RBA audit report', ecovadis: 'EcoVadis questionnaire', smeta: 'SMETA audit report', bsci: 'amfori BSCI audit report' },
  zh: { clarity: 'Clarity 审核报告', cdp: 'CDP 问卷回答', rba: 'RBA 审核报告', ecovadis: 'EcoVadis 问卷', smeta: 'SMETA 审核报告', bsci: 'amfori BSCI 审核报告' },
}
const AUTO_ORDER = ['rba', 'smeta', 'bsci', 'clarity', 'cdp', 'ecovadis']
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/'
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'

const T = {
  en: {
    drop: 'Drop {what} PDF(s) here', or: 'or', choose: 'Choose PDF files',
    privacy: 'Runs entirely in your browser — the file is read on your computer and not uploaded anywhere.',
    multi: 'You can select several files at once (for example all reports of one site); files are also cross-checked.',
    loading: 'Loading the PDF reader…', reading: 'Reading {name} ({i}/{n})…', checking: 'Checking…',
    error: 'The check could not finish.', load: 'The PDF reader could not load. Check your internet connection and try again.',
    scanned: '{name}: no text found — this looks like a scanned PDF. Please use the text PDF exported from the platform.',
    wrong: '{name} is a different report type ({other}). Use its own checker instead:',
    dropAuto: 'Drop audit report or questionnaire PDFs here',
    word: '{name} is a Word file. The checks read the page layout of the report, which only a PDF keeps: in Word choose File → Save As → PDF, then drop the PDF.',
    types: 'Recognised: Clarity, RBA, SMETA, amfori BSCI, EcoVadis and CDP. The type of each file is detected automatically.',
    unknown: '{name}: report type not recognised. Supported: Clarity, RBA, SMETA, amfori BSCI, EcoVadis, CDP.',
    excel: '{name}: spreadsheets (Excel / CSV) are checked on their own pages:',
    excelLinks: [['Carbon Footprint Form Check', '/en/carbon-qc.html'], ['SLCP Verifier Tool QC', '/en/slcp-qc.html']],
    rulesOf: 'Rules and notes', reports: 'Reports',
    detail: 'Details',
    files: '{n} file(s) checked', errors: 'Errors', warnings: 'Warnings', info: 'Info',
    download: 'Download Excel report', again: 'Check other files',
    allRules: 'All rules', allFiles: 'All files', search: 'Search reference, page or text…',
    sev: 'Severity', rule: 'Rule', file: 'File', page: 'Page', ref: 'Ref.', issue: 'Issue',
    none: 'No issues match the current filters.', clean: 'No issues found.', cross: 'Cross-file',
    more: 'Show {n} more', sevName: { error: 'Error', warning: 'Warning', info: 'Info' },
  },
  zh: {
    drop: '将{what} PDF 拖到这里', or: '或', choose: '选择 PDF 文件',
    privacy: '检查完全在您的浏览器中进行，文件在本机读取，不会上传到任何地方。',
    multi: '可一次选择多个文件（例如同一工厂的全部报告），并会做跨文件核对。',
    loading: '正在加载 PDF 读取组件……', reading: '正在读取 {name}（{i}/{n}）……', checking: '正在检查……',
    error: '检查未能完成。', load: 'PDF 读取组件加载失败，请检查网络连接后重试。',
    scanned: '{name}：未读到文字，似乎是扫描件。请使用平台导出的文字版 PDF。',
    wrong: '{name} 看起来是{other}，不是{what}。请改用{other}质检：',
    dropAuto: '将审核报告或问卷 PDF 拖到这里',
    word: '{name} 是 Word 文件。检查依据报告的版面位置，只有 PDF 能保留：请在 Word 中选择“文件 → 另存为 → PDF”，再拖入 PDF。',
    types: '可识别：Clarity、RBA、SMETA、amfori BSCI、EcoVadis 和 CDP，自动判断每个文件的类型。',
    unknown: '{name}：未能识别报告类型。支持：Clarity、RBA、SMETA、amfori BSCI、EcoVadis、CDP。',
    excel: '{name}：表格文件（Excel / CSV）请在专门页面检查：',
    excelLinks: [['碳足迹表格检查', '/zh/tools/carbon-qc.html'], ['SLCP 核查工具在线质检', '/zh/tools/slcp-qc.html']],
    rulesOf: '规则与说明', reports: '报告',
    detail: '详细信息',
    files: '已检查 {n} 个文件', errors: '错误', warnings: '警告', info: '提示',
    download: '下载 Excel 报告', again: '检查其他文件',
    allRules: '全部规则', allFiles: '全部文件', search: '搜索编号、页码或内容……',
    sev: '严重程度', rule: '规则', file: '文件', page: '页', ref: '编号', issue: '问题',
    none: '没有符合当前筛选条件的问题。', clean: '未发现问题。', cross: '跨文件',
    more: '再显示 {n} 条', sevName: { error: '错误', warning: '警告', info: '提示' },
  },
}
const LINKS = {
  en: { clarity: '/en/clarity-qc.html', cdp: '/en/cdp-qc.html', rba: '/en/rba-qc.html', ecovadis: '/en/ecovadis-qc.html', smeta: '/en/smeta-qc.html', bsci: '/en/bsci-qc.html' },
  zh: { clarity: '/zh/tools/clarity-qc.html', cdp: '/zh/tools/cdp-qc.html', rba: '/zh/tools/rba-qc.html', ecovadis: '/zh/tools/ecovadis-qc.html', smeta: '/zh/tools/smeta-qc.html', bsci: '/zh/tools/bsci-qc.html' },
}
const L = computed(() => (props.lang === 'zh' ? 'zh' : 'en'))
const t = computed(() => T[L.value])
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const auto = computed(() => props.kind === 'auto')
const mod = computed(() => MODS[props.kind])
const what = computed(() => (auto.value ? t.value.reports : NAMES[L.value][props.kind]))

const state = ref('idle') // idle | busy | done | failed
const stage = ref('')
const failMsg = ref('')
const notices = ref([])
const results = ref([])
const crossFindings = ref([])
const dragging = ref(false)
const sevOn = ref({ error: true, warning: true, info: true })
const ruleSel = ref('')
const fileSel = ref('')
const query = ref('')
const limit = ref(300)
const input = ref(null)
const reportUrl = ref('')
const reportName = ref('')
let pdfjs = null

async function getPdfjs() {
  if (!pdfjs) {
    pdfjs = await import(/* @vite-ignore */ PDFJS + 'build/pdf.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.mjs'
  }
  return pdfjs
}
function warm() { getPdfjs().catch(() => {}) }

async function run(fileList) {
  const isPdf = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf'
  const picked = [...(fileList || [])]
  const xl = auto.value ? picked.filter(f => /\.(xls[xmb]?|csv)$/i.test(f.name)) : []
  const word = picked.filter(f => /\.docx?$/i.test(f.name))
  const big = []
  const files = picked.filter(isPdf).filter(f => { const p = sizeProblem(f, L.value); if (p) big.push(p); return !p })
  if (!files.length && !xl.length && !word.length && !big.length) return
  state.value = 'busy'; notices.value = []; results.value = []; crossFindings.value = []
  for (const m of big) notices.value.push({ msg: m })
  for (const f of word) notices.value.push({ msg: fmt(t.value.word, { name: f.name }) })
  for (const f of xl) notices.value.push({ msg: fmt(t.value.excel, { name: f.name }), links: t.value.excelLinks })
  if (!files.length) { failMsg.value = ''; state.value = 'failed'; return }
  ruleSel.value = ''; fileSel.value = ''; query.value = ''; limit.value = 300
  sevOn.value = { error: true, warning: true, info: true }
  stage.value = t.value.loading
  try { await getPdfjs() } catch (e) { failMsg.value = t.value.load + ' ' + (e.message || ''); state.value = 'failed'; return }
  const out = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const label = fmt(t.value.reading, { name: f.name, i: i + 1, n: files.length })
    stage.value = label
    let doc
    try {
      const data = new Uint8Array(await f.arrayBuffer())
      doc = await readPdf(pdfjs, data, { cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', maxPages: LIMITS.pdfPages, onPage: (n, tot) => { stage.value = `${label} ${n}/${tot}` } })
    } catch (e) { notices.value.push({ msg: readProblem(f.name, e, L.value) }); continue }
    try {
      if (doc.totalPages > doc.numPages) notices.value.push({ msg: pagesNote(f.name, doc.totalPages, L.value) })
      if (doc.text.replace(/\s/g, '').length < 200) { notices.value.push({ msg: fmt(t.value.scanned, { name: f.name }) }); continue }
      let kind = props.kind
      if (auto.value) {
        kind = detectKind(doc, MODS, AUTO_ORDER)
        if (!kind) { notices.value.push({ msg: fmt(t.value.unknown, { name: f.name }) }); continue }
      } else if (!mod.value.detect(doc.text)) {
        const other = detectKind(doc, MODS, Object.keys(MODS).filter(k => k !== props.kind))
        if (other) { notices.value.push({ msg: fmt(t.value.wrong, { name: f.name, other: NAMES[L.value][other], what: what.value }), link: LINKS[L.value][other] }); continue }
      }
      const r = MODS[kind].check(doc, f.name)
      r.file = f.name; r.kind = kind
      for (const x of r.findings) { x.file = f.name; x.kind = kind }
      out.push(r)
    } catch (e) {
      notices.value.push({ msg: `${f.name}: ${t.value.error} ${e.message || ''}` })
    }
  }
  stage.value = t.value.checking
  let cross = []
  for (const k of new Set(out.map(r => r.kind))) {
    const grp = out.filter(r => r.kind === k)
    try { if (MODS[k].crossCheck && grp.length > 1) cross.push(...MODS[k].crossCheck(grp).map(x => ({ ...x, cross: true, kind: k }))) } catch (e) { notices.value.push({ msg: 'Cross-file check: ' + (e.message || e) }) }
  }
  for (const r of out) delete r.R
  results.value = out
  crossFindings.value = cross
  if (!out.length) { failMsg.value = notices.value.length ? '' : t.value.error; state.value = 'failed'; return }
  state.value = 'done'
  buildReport().catch(() => {})
}
function onPick(e) { run(e.target.files); e.target.value = '' }
function onDrop(e) { dragging.value = false; run(e.dataTransfer.files) }
function reset() { state.value = 'idle'; results.value = []; notices.value = []; crossFindings.value = [] }

const all = computed(() => [...results.value.flatMap(r => r.findings), ...crossFindings.value])
const kindsUsed = computed(() => (auto.value ? AUTO_ORDER.filter(k => results.value.some(r => r.kind === k)) : [props.kind]))
const rules = computed(() => Object.assign({}, ...kindsUsed.value.map(k => MODS[k].RULES)))
const title = id => rules.value[id]?.[L.value] || rules.value[id]?.en || id
const counts = computed(() => { const c = { error: 0, warning: 0, info: 0 }; for (const x of all.value) c[x.sev]++; return c })
const rulesUsed = computed(() => {
  const n = new Map(); for (const x of all.value) n.set(x.id, (n.get(x.id) || 0) + 1)
  return Object.keys(rules.value).filter(id => n.has(id)).map(id => ({ id, title: title(id), n: n.get(id) }))
})
const ORDER = { error: 0, warning: 1, info: 2 }
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all.value.filter(x => sevOn.value[x.sev] && (!ruleSel.value || x.id === ruleSel.value) && (!fileSel.value || x.file === fileSel.value || (x.cross && x.file.includes(fileSel.value))) &&
    (!q || [x.ref, x.msg, x.text, x.page, title(x.id)].some(v => String(v ?? '').toLowerCase().includes(q))))
    .sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || (a.file > b.file ? 1 : a.file < b.file ? -1 : 0) || (a.page ?? 0) - (b.page ?? 0))
})
const multi = computed(() => results.value.length > 1)

async function buildReport() {
  const X = await import(/* @vite-ignore */ XLSX_URL)
  const wb = X.utils.book_new()
  const sum = [['File', 'Type', 'Title', 'Errors', 'Warnings', 'Info', ...new Set(results.value.flatMap(r => r.meta.fields.map(f => f[0])))]]
  const extra = sum[0].slice(6)
  for (const r of results.value) {
    const c = { error: 0, warning: 0, info: 0 }; for (const x of r.findings) c[x.sev]++
    const m = Object.fromEntries(r.meta.fields)
    sum.push([r.file, r.meta.type, r.meta.title, c.error, c.warning, c.info, ...extra.map(k => m[k] ?? '')])
  }
  const s1 = X.utils.aoa_to_sheet(sum); s1['!cols'] = sum[0].map((_, i) => ({ wch: i < 3 ? 40 : 14 }))
  X.utils.book_append_sheet(wb, s1, 'Summary')
  const rows = [['File', 'Severity', 'Rule', 'Rule title', 'Page', 'Reference', 'Issue', 'Text']]
  for (const x of filtered.value.length === all.value.length ? filtered.value : all.value) rows.push([x.file, x.sev, x.id, title(x.id), x.page ?? '', x.ref, x.msg, x.text])
  const s2 = X.utils.aoa_to_sheet(rows); s2['!cols'] = [{ wch: 36 }, { wch: 9 }, { wch: 8 }, { wch: 50 }, { wch: 6 }, { wch: 18 }, { wch: 70 }, { wch: 80 }]
  s2['!autofilter'] = { ref: `A1:H${rows.length}` }
  X.utils.book_append_sheet(wb, s2, 'Issues')
  const rr = [['Rule', 'Severity', 'Title (EN)', 'Title (ZH)']]
  for (const [id, r] of Object.entries(rules.value)) rr.push([id, r.sev, r.en, r.zh])
  const s3 = X.utils.aoa_to_sheet(rr); s3['!cols'] = [{ wch: 9 }, { wch: 9 }, { wch: 80 }, { wch: 50 }]
  X.utils.book_append_sheet(wb, s3, 'Rules')
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' })
  if (reportUrl.value) URL.revokeObjectURL(reportUrl.value)
  reportUrl.value = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const d = new Date(), ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
  reportName.value = (results.value.length === 1 ? results.value[0].file.replace(/\.pdf$/i, '') : what.value) + ` - QC ${ymd}.xlsx`
}

onBeforeUnmount(() => { if (reportUrl.value) URL.revokeObjectURL(reportUrl.value) })
</script>

<template>
  <div class="qc">
    <div v-if="state === 'idle' || state === 'failed'" class="drop" :class="{ over: dragging }"
         @dragenter.prevent="dragging = true; warm()" @dragover.prevent @dragleave.prevent="dragging = false"
         @drop.prevent="onDrop" @mouseenter="warm" @focusin="warm">
      <p class="drop-main">{{ auto ? t.dropAuto : fmt(t.drop, { what }) }}</p>
      <p class="drop-or">{{ t.or }}</p>
      <button class="btn primary" @click="input.click()">{{ t.choose }}</button>
      <input ref="input" type="file" accept=".pdf,application/pdf,.docx,.doc" multiple hidden @change="onPick">
      <p class="fine">🔒 {{ t.privacy }} {{ t.multi }}</p>
      <p v-if="auto" class="fine">{{ t.types }}</p>
      <p class="fine">📏 {{ capText(L) }}</p>
    </div>

    <div v-if="state === 'failed' && failMsg" class="alert" role="alert"><strong>{{ failMsg }}</strong></div>
    <div v-for="(n, i) in notices" :key="i" class="alert warn" role="status">
      {{ n.msg }} <a v-if="n.link" :href="n.link">{{ n.link }}</a>
      <template v-for="(l, j) in n.links || []" :key="j">{{ j ? ' · ' : ' ' }}<a :href="l[1]">{{ l[0] }}</a></template>
    </div>

    <div v-if="state === 'busy'" class="busy" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>{{ stage }}</span></div>

    <div v-if="state === 'done'" class="result">
      <div class="head">
        <div class="fine">{{ fmt(t.files, { n: results.length }) }}</div>
        <div class="actions">
          <a v-if="reportUrl" class="btn primary" :href="reportUrl" :download="reportName">⬇ {{ t.download }}</a>
          <button class="btn" @click="reset">{{ t.again }}</button>
        </div>
      </div>

      <div class="cards">
        <div v-for="r in results" :key="r.file" class="card">
          <div class="ctype">{{ r.meta.type }}</div>
          <div class="ctitle">{{ r.meta.title }}</div>
          <div class="fine file">{{ r.file }}</div>
          <div v-if="auto" class="fine"><a :href="LINKS[L][r.kind]">{{ t.rulesOf }} →</a></div>
          <dl><template v-for="f in r.meta.fields" :key="f[0]"><dt>{{ f[0] }}</dt><dd>{{ f[1] }}</dd></template></dl>
        </div>
      </div>

      <div class="chips">
        <button v-for="(lbl, sv) in { error: t.errors, warning: t.warnings, info: t.info }" :key="sv"
                class="chip" :class="[sv, { off: !sevOn[sv] }]" :aria-pressed="sevOn[sv]" @click="sevOn[sv] = !sevOn[sv]">
          <b>{{ counts[sv] }}</b> {{ lbl }}
        </button>
      </div>

      <template v-if="all.length">
        <div class="filters">
          <select v-model="ruleSel" :aria-label="t.rule">
            <option value="">{{ t.allRules }}</option>
            <option v-for="r in rulesUsed" :key="r.id" :value="r.id">{{ r.id }} · {{ r.title }} ({{ r.n }})</option>
          </select>
          <select v-if="multi" v-model="fileSel" :aria-label="t.file">
            <option value="">{{ t.allFiles }}</option>
            <option v-for="r in results" :key="r.file" :value="r.file">{{ r.file }}</option>
          </select>
          <input v-model="query" type="search" :placeholder="t.search" :aria-label="t.search">
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>{{ t.sev }}</th><th>{{ t.rule }}</th><th v-if="multi">{{ t.file }}</th><th>{{ t.page }}</th><th>{{ t.ref }}</th><th>{{ t.issue }}</th></tr></thead>
            <tbody>
              <tr v-for="(x, n) in filtered.slice(0, limit)" :key="n">
                <td><span class="sev" :class="x.sev">{{ t.sevName[x.sev] }}</span></td>
                <td><span class="rule" :title="title(x.id)">{{ x.id }}</span></td>
                <td v-if="multi" class="fine fcell">{{ x.cross ? t.cross : x.file }}</td>
                <td class="mono">{{ x.page ?? '' }}</td>
                <td class="mono refc">{{ x.ref }}</td>
                <td><div class="rt">{{ title(x.id) }}</div><div v-if="x.msg">{{ x.msg }}</div><div v-if="x.text" class="fine quote">{{ x.text }}</div></td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filtered.length" class="fine pad">{{ t.none }}</p>
        </div>
        <button v-if="filtered.length > limit" class="btn more" @click="limit += 300">{{ fmt(t.more, { n: Math.min(300, filtered.length - limit) }) }}</button>
      </template>
      <p v-else class="clean">✅ {{ t.clean }}</p>
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
.alert.warn { background: var(--vp-c-warning-soft); border-left-color: var(--vp-c-warning-1); }
.busy { display: flex; align-items: center; gap: 12px; padding: 20px 16px; border-radius: 12px; background: var(--vp-c-bg-soft); }
.spinner { width: 18px; height: 18px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin .8s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 16px 0 4px; }
.card { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 12px 14px; background: var(--vp-c-bg-soft); min-width: 0; }
.ctype { font-size: .75em; text-transform: uppercase; letter-spacing: .04em; color: var(--vp-c-text-2); }
.ctitle { font-weight: 600; margin: 2px 0; word-break: break-word; }
.file { word-break: break-all; }
.card dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 8px 0 0; font-size: .85em; }
.card dt { color: var(--vp-c-text-2); }
.card dd { margin: 0; word-break: break-word; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 8px; }
.chip { border-radius: 999px; padding: 4px 14px; border: 1px solid transparent; cursor: pointer; font-size: .9em; }
.chip.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.chip.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.chip.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.chip.off { opacity: .45; text-decoration: line-through; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.filters select, .filters input { flex: 1 1 200px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; margin: 0; font-size: .9em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 8px 10px; }
.refc { max-width: 160px; word-break: break-word; }
.fcell { max-width: 160px; word-break: break-all; }
.rt { font-weight: 600; font-size: .92em; }
.quote { border-left: 3px solid var(--vp-c-divider); padding-left: 8px; margin-top: 4px; }
.sev { font-size: .8em; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.sev.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.sev.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.sev.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.rule { font-family: var(--vp-font-family-mono); font-size: .85em; white-space: nowrap; border-bottom: 1px dotted var(--vp-c-text-3); cursor: help; }
.more { margin-top: 8px; }
.pad { padding: 12px; }
.clean { font-weight: 600; margin-top: 12px; }
</style>
