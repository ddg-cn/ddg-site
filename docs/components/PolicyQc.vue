<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { readDocx, readText, fromPdf } from './policyqc/read.js'
import { checkSet, RULES } from './policyqc/rules.js'
import { readPdf } from './reportqc/extract.js'

const props = defineProps({ lang: { type: String, default: 'en' } })
const FFLATE = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js'
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/'
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'

const T = {
  en: {
    drop: 'Drop your policy documents here', or: 'or', choose: 'Choose files',
    hint: 'Word (.docx), PDF with a text layer, or .txt / .md. Select all the documents that belong together: policies, procedures, forms and records.',
    privacy: 'Runs entirely in your browser. The files are read on your computer and are not uploaded anywhere.',
    loading: 'Loading the readers…', reading: 'Reading {name} ({i}/{n})…', checking: 'Comparing {n} documents…',
    load: 'A reader could not load. Check your internet connection and try again.',
    doc: '{name}: old .doc format. Open it in Word and save it as .docx, then add it again.',
    skip: '{name}: file type not supported, skipped.', scanned: '{name}: no text found (scanned PDF?), skipped.',
    one: 'Add at least two documents. The checker compares documents with each other.',
    failed: '{name}: could not be read ({err}).',
    docs: 'Documents', topics: 'Topics compared', conflicts: 'Topics in conflict', missing: 'Cited but not uploaded',
    errors: 'Errors', warnings: 'Warnings', info: 'Info',
    tIssues: 'Issues', tTopics: 'Topics', tDocs: 'Documents', tMissing: 'Cited but not uploaded',
    download: 'Download Excel report', again: 'Check other files',
    allRules: 'All rules', search: 'Search document, section or text…',
    sev: 'Severity', rule: 'Rule', where: 'Documents / where', issue: 'Issue', fix: 'How to fix',
    topic: 'Topic', values: 'Values found', code: 'Code', title: 'Title', version: 'Version', dept: 'Department', paras: 'Paragraphs', file: 'File',
    cited: 'Cited title', times: 'Times', by: 'Cited by',
    none: 'No issues match the current filters.', clean: 'No inconsistencies found.', noTopics: 'None of the compared topics (working hours, ages, overtime pay, leave, retention, frequencies…) were found.',
    more: 'Show {n} more', same: 'consistent', diff: 'conflict', sevName: { error: 'Error', warning: 'Warning', info: 'Info' },
  },
  zh: {
    drop: '将制度文件拖到这里', or: '或', choose: '选择文件',
    hint: '支持 Word（.docx）、带文字层的 PDF、.txt / .md。请一次选择同一套文件：政策、程序、表单和记录。',
    privacy: '检查完全在您的浏览器中进行，文件在本机读取，不会上传到任何地方。',
    loading: '正在加载读取组件……', reading: '正在读取 {name}（{i}/{n}）……', checking: '正在比对 {n} 份文件……',
    load: '读取组件加载失败，请检查网络连接后重试。',
    doc: '{name}：旧版 .doc 格式。请在 Word 中另存为 .docx 后再添加。',
    skip: '{name}：不支持的文件类型，已跳过。', scanned: '{name}：未读到文字（扫描件？），已跳过。',
    one: '请至少添加两份文件，本工具比对的是文件之间的一致性。',
    failed: '{name}：无法读取（{err}）。',
    docs: '文件数', topics: '比对事项', conflicts: '不一致事项', missing: '被引用但未上传',
    errors: '错误', warnings: '警告', info: '提示',
    tIssues: '问题清单', tTopics: '事项比对', tDocs: '文件清单', tMissing: '被引用但未上传',
    download: '下载 Excel 报告', again: '检查其他文件',
    allRules: '全部规则', search: '搜索文件、章节或内容……',
    sev: '严重程度', rule: '规则', where: '文件 / 位置', issue: '问题', fix: '整改建议',
    topic: '事项', values: '各文件中的数值', code: '编号', title: '名称', version: '版本', dept: '部门', paras: '段落数', file: '文件',
    cited: '被引用的名称', times: '次数', by: '引用文件',
    none: '没有符合当前筛选条件的问题。', clean: '未发现不一致。', noTopics: '未找到可比对的事项（工时、年龄、加班工资、假期、保存期限、频次等）。',
    more: '再显示 {n} 条', same: '一致', diff: '不一致', sevName: { error: '错误', warning: '警告', info: '提示' },
  },
}
const L = computed(() => (props.lang === 'zh' ? 'zh' : 'en'))
const t = computed(() => T[L.value])
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const title = id => RULES[id]?.[L.value] || RULES[id]?.en || id

const state = ref('idle')
const stage = ref('')
const notices = ref([])
const res = ref(null)
const dragging = ref(false)
const tab = ref('issues')
const sevOn = ref({ error: true, warning: true, info: true })
const ruleSel = ref('')
const query = ref('')
const limit = ref(200)
const input = ref(null)
const reportUrl = ref('')
const reportName = ref('')
let fflate = null, pdfjs = null

async function getFflate() { if (!fflate) fflate = await import(/* @vite-ignore */ FFLATE); return fflate }
async function getPdfjs() {
  if (!pdfjs) { pdfjs = await import(/* @vite-ignore */ PDFJS + 'build/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.mjs' }
  return pdfjs
}
function warm() { getFflate().catch(() => {}) }

async function run(fileList) {
  const files = [...(fileList || [])]
  if (!files.length) return
  state.value = 'busy'; notices.value = []; res.value = null; tab.value = 'issues'
  ruleSel.value = ''; query.value = ''; limit.value = 200; sevOn.value = { error: true, warning: true, info: true }
  stage.value = t.value.loading
  try {
    await getFflate()
    if (files.some(f => /\.pdf$/i.test(f.name))) await getPdfjs()
  } catch (e) { notices.value.push({ msg: t.value.load }); state.value = 'idle'; return }
  const docs = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    stage.value = fmt(t.value.reading, { name: f.name, i: i + 1, n: files.length })
    try {
      if (/\.docx$/i.test(f.name)) docs.push(readDocx(fflate.unzipSync, new Uint8Array(await f.arrayBuffer()), f.name))
      else if (/\.pdf$/i.test(f.name)) {
        const pdf = await readPdf(pdfjs, new Uint8Array(await f.arrayBuffer()), { cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/' })
        if (pdf.text.replace(/\s/g, '').length < 50) { notices.value.push({ msg: fmt(t.value.scanned, { name: f.name }) }); continue }
        docs.push(fromPdf(pdf, f.name))
      } else if (/\.(txt|md|markdown)$/i.test(f.name)) docs.push(readText(await f.text(), f.name))
      else if (/\.doc$/i.test(f.name)) notices.value.push({ msg: fmt(t.value.doc, { name: f.name }) })
      else notices.value.push({ msg: fmt(t.value.skip, { name: f.name }) })
    } catch (e) { notices.value.push({ msg: fmt(t.value.failed, { name: f.name, err: e.message || e }) }) }
  }
  if (docs.length < 2) { notices.value.push({ msg: t.value.one }); state.value = 'idle'; return }
  stage.value = fmt(t.value.checking, { n: docs.length })
  await new Promise(r => setTimeout(r, 20))
  try { res.value = checkSet(docs) } catch (e) { notices.value.push({ msg: 'Check failed: ' + (e.message || e) }); state.value = 'idle'; return }
  state.value = 'done'
  buildReport().catch(() => {})
}
function onPick(e) { run(e.target.files); e.target.value = '' }
function onDrop(e) { dragging.value = false; run(e.dataTransfer.files) }
function reset() { state.value = 'idle'; res.value = null; notices.value = [] }

const all = computed(() => res.value?.findings || [])
const counts = computed(() => { const c = { error: 0, warning: 0, info: 0 }; for (const x of all.value) c[x.sev]++; return c })
const rulesUsed = computed(() => {
  const n = new Map(); for (const x of all.value) n.set(x.id, (n.get(x.id) || 0) + 1)
  return Object.keys(RULES).filter(id => n.has(id)).map(id => ({ id, title: title(id), n: n.get(id) }))
})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all.value.filter(x => sevOn.value[x.sev] && (!ruleSel.value || x.id === ruleSel.value) &&
    (!q || [x.ref, x.msg, x.text, x.fix, x.docs.join(' '), title(x.id)].some(v => String(v ?? '').toLowerCase().includes(q))))
})
const conflicts = computed(() => (res.value?.topics || []).filter(x => x.conflict).length)
const short = n => n.replace(/\.[a-z0-9]+$/i, '')
const byDoc = ws => { const m = new Map(); for (const w of ws) { const k = w.lab || short(w.doc); if (!m.has(k)) m.set(k, []); if (w.ref && !m.get(k).includes(w.ref)) m.get(k).push(w.ref) } return [...m].map(([k, r]) => r.length ? `${k} ${r.join(', ')}` : k) }

async function buildReport() {
  const X = await import(/* @vite-ignore */ XLSX_URL)
  const r = res.value
  const wb = X.utils.book_new()
  const sheet = (rows, widths, name, filter) => {
    const s = X.utils.aoa_to_sheet(rows); s['!cols'] = widths.map(w => ({ wch: w }))
    if (filter) s['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) }
    X.utils.book_append_sheet(wb, s, name)
  }
  const issues = [['Severity', 'Rule', 'Rule title', 'Documents', 'Where / reference', 'Issue', 'How to fix', 'Text', 'Status', 'Comment']]
  for (const x of all.value) {
    if (x.all) for (const y of x.all) issues.push([x.sev, x.id, title(x.id), y.docs.join('; '), y.ref, y.msg, y.fix, '', '', ''])
    else issues.push([x.sev, x.id, title(x.id), x.docs.join('; '), x.ref, x.msg, x.fix, x.text, '', ''])
  }
  sheet(issues, [9, 7, 40, 50, 30, 80, 70, 80, 12, 30], 'Issues', true)
  const tp = [['Topic', '事项', 'Status', 'Value', 'Document', 'Where', 'Text']]
  for (const x of r.topics) for (const v of x.values) for (const w of v.where) tp.push([x.en, x.zh, x.conflict ? 'conflict' : 'consistent', v.label, w.doc, w.ref, w.text])
  sheet(tp, [34, 20, 11, 14, 44, 14, 90], 'Topics', true)
  const ds = [['File', 'Code', 'Title', 'Version', 'Department', 'Paragraphs']]
  for (const d of r.docs) ds.push([d.name, d.code, d.title, d.version, d.dept, d.paras])
  sheet(ds, [50, 14, 40, 9, 16, 10], 'Documents', true)
  const ms = [['Cited title', 'Times cited', 'Cited by', 'Where']]
  for (const m of r.missing) ms.push([m.title, m.n, m.docs.join('; '), m.refs.join('; ')])
  sheet(ms, [40, 10, 60, 80], 'Cited not uploaded', true)
  const rr = [['Rule', 'Severity', 'Title (EN)', 'Title (ZH)']]
  for (const [id, x] of Object.entries(RULES)) rr.push([id, x.sev, x.en, x.zh])
  sheet(rr, [8, 9, 70, 40], 'Rules')
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' })
  if (reportUrl.value) URL.revokeObjectURL(reportUrl.value)
  reportUrl.value = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const d = new Date(), ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
  reportName.value = `Policy consistency ${ymd}.xlsx`
}
onBeforeUnmount(() => { if (reportUrl.value) URL.revokeObjectURL(reportUrl.value) })
</script>

<template>
  <div class="qc">
    <div v-if="state === 'idle'" class="drop" :class="{ over: dragging }"
         @dragenter.prevent="dragging = true; warm()" @dragover.prevent @dragleave.prevent="dragging = false"
         @drop.prevent="onDrop" @mouseenter="warm" @focusin="warm">
      <p class="drop-main">{{ t.drop }}</p>
      <p class="drop-or">{{ t.or }}</p>
      <button class="btn primary" @click="input.click()">{{ t.choose }}</button>
      <input ref="input" type="file" accept=".docx,.pdf,.txt,.md,.doc" multiple hidden @change="onPick">
      <p class="fine">{{ t.hint }}</p>
      <p class="fine">🔒 {{ t.privacy }}</p>
    </div>

    <div v-for="(n, i) in notices" :key="i" class="alert warn" role="status">{{ n.msg }}</div>
    <div v-if="state === 'busy'" class="busy" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>{{ stage }}</span></div>

    <div v-if="state === 'done' && res" class="result">
      <div class="head">
        <div class="stats">
          <div class="stat"><b>{{ res.docs.length }}</b><span>{{ t.docs }}</span></div>
          <div class="stat"><b>{{ res.topics.length }}</b><span>{{ t.topics }}</span></div>
          <div class="stat" :class="{ bad: conflicts }"><b>{{ conflicts }}</b><span>{{ t.conflicts }}</span></div>
          <div class="stat"><b>{{ res.missing.length }}</b><span>{{ t.missing }}</span></div>
        </div>
        <div class="actions">
          <a v-if="reportUrl" class="btn primary" :href="reportUrl" :download="reportName">⬇ {{ t.download }}</a>
          <button class="btn" @click="reset">{{ t.again }}</button>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button v-for="(lbl, k) in { issues: t.tIssues, topics: t.tTopics, docs: t.tDocs, missing: t.tMissing }" :key="k"
                role="tab" :aria-selected="tab === k" class="tab" :class="{ on: tab === k }" @click="tab = k">{{ lbl }}</button>
      </div>

      <template v-if="tab === 'issues'">
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
            <input v-model="query" type="search" :placeholder="t.search" :aria-label="t.search">
          </div>
          <div class="tablewrap">
            <table>
              <thead><tr><th>{{ t.sev }}</th><th>{{ t.rule }}</th><th>{{ t.issue }}</th><th>{{ t.fix }}</th></tr></thead>
              <tbody>
                <tr v-for="(x, n) in filtered.slice(0, limit)" :key="n">
                  <td><span class="sev" :class="x.sev">{{ t.sevName[x.sev] }}</span></td>
                  <td><span class="rule" :title="title(x.id)">{{ x.id }}</span></td>
                  <td>
                    <div class="rt">{{ title(x.id) }}</div>
                    <div>{{ x.msg }}</div>
                    <div v-if="x.text" class="fine quote">{{ x.text }}</div>
                    <div class="fine docs">📄 {{ x.docs.slice(0, 6).map(short).join(' · ') }}<template v-if="x.docs.length > 6"> +{{ x.docs.length - 6 }}</template><template v-if="x.ref"> — {{ x.ref }}</template></div>
                  </td>
                  <td class="fixc">{{ x.fix }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!filtered.length" class="fine pad">{{ t.none }}</p>
          </div>
          <button v-if="filtered.length > limit" class="btn more" @click="limit += 200">{{ fmt(t.more, { n: Math.min(200, filtered.length - limit) }) }}</button>
        </template>
        <p v-else class="clean">✅ {{ t.clean }}</p>
      </template>

      <template v-if="tab === 'topics'">
        <div v-if="res.topics.length" class="tablewrap">
          <table>
            <thead><tr><th>{{ t.topic }}</th><th>{{ t.values }}</th></tr></thead>
            <tbody>
              <tr v-for="x in res.topics" :key="x.id" :class="{ conflict: x.conflict }">
                <td><div class="rt">{{ L === 'zh' ? x.zh : x.en }}</div><div class="fine">{{ L === 'zh' ? x.en : x.zh }}</div>
                  <span class="tag" :class="x.conflict ? 'bad' : 'ok'">{{ x.conflict ? t.diff : t.same }}</span></td>
                <td>
                  <div v-for="v in x.values" :key="v.label" class="val">
                    <b>{{ v.label }}</b>
                    <span class="fine"> — {{ byDoc(v.where).slice(0, 10).join(' · ') }}<template v-if="byDoc(v.where).length > 10"> +{{ byDoc(v.where).length - 10 }}</template></span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="fine pad">{{ t.noTopics }}</p>
      </template>

      <div v-if="tab === 'docs'" class="tablewrap">
        <table>
          <thead><tr><th>{{ t.code }}</th><th>{{ t.title }}</th><th>{{ t.version }}</th><th>{{ t.dept }}</th><th>{{ t.paras }}</th></tr></thead>
          <tbody><tr v-for="d in res.docs" :key="d.name"><td class="mono">{{ d.code }}</td><td>{{ d.title }}<div class="fine">{{ d.name }}</div></td><td>{{ d.version }}</td><td>{{ d.dept }}</td><td>{{ d.paras }}</td></tr></tbody>
        </table>
      </div>

      <div v-if="tab === 'missing'" class="tablewrap">
        <table v-if="res.missing.length">
          <thead><tr><th>{{ t.cited }}</th><th>{{ t.times }}</th><th>{{ t.by }}</th></tr></thead>
          <tbody><tr v-for="m in res.missing.slice(0, limit)" :key="m.title"><td>《{{ m.title }}》</td><td>{{ m.n }}</td><td class="fine">{{ m.refs.slice(0, 6).join(' · ') }}<template v-if="m.refs.length > 6"> +{{ m.refs.length - 6 }}</template></td></tr></tbody>
        </table>
        <p v-else class="fine pad">—</p>
        <button v-if="res.missing.length > limit" class="btn more" @click="limit += 200">{{ fmt(t.more, { n: Math.min(200, res.missing.length - limit) }) }}</button>
      </div>
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
.mono { font-family: var(--vp-font-family-mono); font-size: .85em; white-space: nowrap; }
.btn { display: inline-block; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; text-decoration: none !important; }
.btn:hover { border-color: var(--vp-c-brand-1); }
.btn.primary { background: var(--vp-c-brand-3); border-color: var(--vp-c-brand-3); color: var(--vp-c-white); }
.btn.primary:hover { background: var(--vp-c-brand-2); }
.alert { margin-top: 12px; padding: 12px 16px; border-radius: 8px; background: var(--vp-c-warning-soft); border-left: 4px solid var(--vp-c-warning-1); }
.busy { display: flex; align-items: center; gap: 12px; padding: 20px 16px; border-radius: 12px; background: var(--vp-c-bg-soft); }
.spinner { width: 18px; height: 18px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin .8s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.stats { display: flex; gap: 10px; flex-wrap: wrap; }
.stat { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 8px 14px; background: var(--vp-c-bg-soft); display: flex; flex-direction: column; min-width: 96px; }
.stat b { font-size: 1.4em; line-height: 1.2; }
.stat span { font-size: .8em; color: var(--vp-c-text-2); }
.stat.bad b { color: var(--vp-c-danger-1); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs { display: flex; gap: 4px; flex-wrap: wrap; margin: 18px 0 4px; border-bottom: 1px solid var(--vp-c-divider); }
.tab { padding: 6px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--vp-c-text-2); cursor: pointer; font-weight: 500; }
.tab.on { color: var(--vp-c-brand-1); border-bottom-color: var(--vp-c-brand-1); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 8px; }
.chip { border-radius: 999px; padding: 4px 14px; border: 1px solid transparent; cursor: pointer; font-size: .9em; }
.chip.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.chip.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.chip.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.chip.off { opacity: .45; text-decoration: line-through; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.filters select, .filters input { flex: 1 1 200px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; margin: 8px 0 0; font-size: .9em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 8px 10px; }
.rt { font-weight: 600; font-size: .92em; }
.quote { border-left: 3px solid var(--vp-c-divider); padding-left: 8px; margin-top: 4px; word-break: break-word; }
.docs { margin-top: 4px; word-break: break-word; }
.fixc { min-width: 200px; max-width: 360px; font-size: .92em; }
.sev { font-size: .8em; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.sev.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.sev.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.sev.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.rule { font-family: var(--vp-font-family-mono); font-size: .85em; white-space: nowrap; border-bottom: 1px dotted var(--vp-c-text-3); cursor: help; }
.tag { display: inline-block; margin-top: 4px; font-size: .75em; font-weight: 600; padding: 1px 8px; border-radius: 999px; }
.tag.ok { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.tag.bad { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
tr.conflict td:first-child { border-left: 3px solid var(--vp-c-danger-1); }
.val { margin: 2px 0; word-break: break-word; }
.more { margin-top: 8px; }
.pad { padding: 12px; }
.clean { font-weight: 600; margin-top: 12px; }
@media (max-width: 640px) { .fixc { min-width: 140px; } }
</style>
