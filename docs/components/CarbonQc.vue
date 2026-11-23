<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { capText, sizeProblem } from './limits.js'
import { toSheets, checkFile, crossCheck, RULES } from './carbon/cfqc.js'
import { STANDARDS } from './carbon/standards.js'

const props = defineProps({ lang: { type: String, default: 'en' } })
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'

const T = {
  en: {
    drop: 'Drop carbon footprint forms here', or: 'or', choose: 'Choose Excel files',
    hint: 'Excel forms (.xlsx / .xlsm / .xls / .xlsb) or CSV: EU battery carbon footprint report (CFR) templates, customer PCF templates with TeR / GeR / TiR columns, and life-cycle inventory data sheets. Several files are cross-checked. No form yet? Blank forms per standard are under the tool.',
    privacy: 'Runs entirely in your browser. The files are read on your computer and are not uploaded anywhere.',
    loading: 'Loading the Excel reader…', reading: 'Reading {name} ({i}/{n})…',
    load: 'The Excel reader could not load. Check your internet connection and try again.',
    drm: '{name} is DRM-encrypted (TSD). Open it with your company\'s document security client and save an unprotected copy, then add that copy.',
    failed: '{name}: could not be read ({err}).', none: 'No issues match the current filters.', clean: 'No issues found.',
    nothing: '{name}: no dataset table (TeR / GeR / TiR columns) or inventory sheet was recognised.',
    files: '{n} file(s) checked', errors: 'Errors', warnings: 'Warnings', info: 'Info',
    tIssues: 'Issues', tRatings: 'Data quality ratings', tFactors: 'Factor check',
    download: 'Download Excel report', again: 'Check other files', allRules: 'All rules', allFiles: 'All files', search: 'Search sheet, cell, material or text…',
    sev: 'Severity', rule: 'Rule', file: 'File', where: 'Where', issue: 'Issue', fix: 'How to fix', cross: 'Cross-file',
    item: 'Item', dataset: 'Dataset', stated: 'Stated', sug: 'Suggested', why: 'Reasons', ef: 'EF', range: 'Public range', verdict: 'Result',
    onlyDiff: 'Only rows where stated and suggested differ', more: 'Show {n} more', sevName: { error: 'Error', warning: 'Warning', info: 'Info' },
    ratingNote: 'Suggested ratings use the rules described below the tool (1 = best, 5 = worst). "—" means the rule could not judge from the form. P is suggested even when the template has no P column.',
  },
  zh: {
    drop: '将碳足迹表格拖到这里', or: '或', choose: '选择 Excel 文件',
    hint: 'Excel 表格（.xlsx / .xlsm / .xls / .xlsb）或 CSV：欧盟电池碳足迹报告（CFR）模板、带 TeR / GeR / TiR 列的客户 PCF 模板，以及生命周期清单数据表。多个文件会做跨文件核对。没有表格？工具下方提供各标准的空白表格。',
    privacy: '检查完全在您的浏览器中进行，文件在本机读取，不会上传到任何地方。',
    loading: '正在加载 Excel 读取组件……', reading: '正在读取 {name}（{i}/{n}）……',
    load: 'Excel 读取组件加载失败，请检查网络连接后重试。',
    drm: '{name} 已被加密（TSD 文档安全）。请用公司的文档安全客户端打开并另存一份未加密的副本，再添加该副本。',
    failed: '{name}：无法读取（{err}）。', none: '没有符合当前筛选条件的问题。', clean: '未发现问题。',
    nothing: '{name}：未识别到数据集表（TeR / GeR / TiR 列）或清单数据表。',
    files: '已检查 {n} 个文件', errors: '错误', warnings: '警告', info: '提示',
    tIssues: '问题清单', tRatings: '数据质量评分', tFactors: '因子核对',
    download: '下载 Excel 报告', again: '检查其他文件', allRules: '全部规则', allFiles: '全部文件', search: '搜索工作表、单元格、材料或内容……',
    sev: '严重程度', rule: '规则', file: '文件', where: '位置', issue: '问题', fix: '整改建议', cross: '跨文件',
    item: '项目', dataset: '数据集', stated: '填报', sug: '建议', why: '理由', ef: '因子', range: '公开范围', verdict: '结果',
    onlyDiff: '只看填报与建议不同的行', more: '再显示 {n} 条', sevName: { error: '错误', warning: '警告', info: '提示' },
    ratingNote: '建议评分依据工具下方说明的规则（1 = 最好，5 = 最差）。"—" 表示无法从表格判断。即使模板没有 P 列，也会给出 P 的建议值。',
  },
}
const L = computed(() => (props.lang === 'zh' ? 'zh' : 'en'))
const t = computed(() => T[L.value])
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const title = id => RULES[id]?.[L.value] || RULES[id]?.en || id

const state = ref('idle'), stage = ref(''), notices = ref([]), results = ref([]), crossF = ref([])
const dragging = ref(false), tab = ref('issues'), sevOn = ref({ error: true, warning: true, info: true })
const ruleSel = ref(''), fileSel = ref(''), query = ref(''), limit = ref(200), onlyDiff = ref(true)
const input = ref(null), reportUrl = ref(''), reportName = ref('')
let X = null
const std = ref('auto')
let lastFiles = null
const stdInfo = computed(() => STANDARDS.find(x => x.id === std.value))
const stdLabel = { en: { label: 'Check against', auto: 'Automatic (by form: EU battery CFR template, scdd.pro forms)', none: 'Form checks only (no standard)', rerun: 'Re-check with this standard' }, zh: { label: '对照标准', auto: '自动（按表格：欧盟电池 CFR 模板、本站表格）', none: '仅表格检查（不对照标准）', rerun: '按此标准重新检查' } }

async function run(fileList) {
  const big = []
  const files = [...(fileList || [])].filter(f => /\.(xlsx|xlsm|xls|xlsb|csv)$/i.test(f.name)).filter(f => { const p = sizeProblem(f, L.value); if (p) big.push(p); return !p })
  if (!files.length) { notices.value = big; return }
  lastFiles = files
  state.value = 'busy'; notices.value = big; results.value = []; crossF.value = []; tab.value = 'issues'
  ruleSel.value = ''; fileSel.value = ''; query.value = ''; limit.value = 200; sevOn.value = { error: true, warning: true, info: true }
  stage.value = t.value.loading
  try { if (!X) X = await import(/* @vite-ignore */ XLSX_URL) } catch (e) { notices.value.push(t.value.load); state.value = 'idle'; return }
  const out = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    stage.value = fmt(t.value.reading, { name: f.name, i: i + 1, n: files.length })
    await new Promise(r => setTimeout(r, 10))
    try {
      const buf = new Uint8Array(await f.arrayBuffer())
      if (new TextDecoder().decode(buf.slice(0, 11)) === '%TSD-Header') { notices.value.push(fmt(t.value.drm, { name: f.name })); continue }
      const wb = X.read(buf, { type: 'array', cellFormula: false, cellHTML: false })
      const r = checkFile(toSheets(X, wb), f.name, { standard: std.value === 'none' ? '' : std.value })
      if (!r.ratings.length && !r.factors.length && /carbon footprint form/i.test(r.meta.type)) notices.value.push(fmt(t.value.nothing, { name: f.name }))
      out.push(r)
    } catch (e) { notices.value.push(fmt(t.value.failed, { name: f.name, err: e.message || e })) }
  }
  if (!out.length) { state.value = 'idle'; return }
  try { crossF.value = out.length > 1 ? crossCheck(out) : [] } catch (e) { /* ignore */ }
  results.value = out
  state.value = 'done'
  buildReport().catch(() => {})
}
function onPick(e) { run(e.target.files); e.target.value = '' }
// a new standard re-checks the files already loaded (the same files, read again with the new rules)
watch(std, () => { if (lastFiles && state.value === 'done') run(lastFiles) })
function onDrop(e) { dragging.value = false; run(e.dataTransfer.files) }
function reset() { state.value = 'idle'; results.value = []; notices.value = [] }

const all = computed(() => [...results.value.flatMap(r => r.findings), ...crossF.value.map(x => ({ ...x, cross: true }))])
const counts = computed(() => { const c = { error: 0, warning: 0, info: 0 }; for (const x of all.value) c[x.sev]++; return c })
const rulesUsed = computed(() => { const n = new Map(); for (const x of all.value) n.set(x.id, (n.get(x.id) || 0) + 1); return Object.keys(RULES).filter(id => n.has(id)).map(id => ({ id, title: title(id), n: n.get(id) })) })
const ORDER = { error: 0, warning: 1, info: 2 }
const match = (x, q) => !q || Object.values(x).some(v => String(v ?? '').toLowerCase().includes(q))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all.value.filter(x => sevOn.value[x.sev] && (!ruleSel.value || x.id === ruleSel.value) && (!fileSel.value || x.file === fileSel.value || x.cross) && match(x, q))
    .sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || (a.id < b.id ? -1 : 1))
})
const diff = r => ['ter', 'ger', 'tir'].some(k => r.sug[k] != null && r.stated[k] != null && r.sug[k] !== r.stated[k])
const ratings = computed(() => {
  const q = query.value.trim().toLowerCase()
  return results.value.flatMap(r => r.ratings).filter(r => (!fileSel.value || r.file === fileSel.value) && (!onlyDiff.value || diff(r)) && match({ a: r.item, b: r.db, c: r.sheet, d: r.cell }, q))
})
const factors = computed(() => {
  const q = query.value.trim().toLowerCase()
  return results.value.flatMap(r => r.factors).filter(f => f.lo != null && (!fileSel.value || f.file === fileSel.value) && match({ a: f.item, b: f.ref, c: f.sheet, d: f.cell }, q))
    .sort((a, b) => (a.verdict === 'within range') - (b.verdict === 'within range'))
})
const multi = computed(() => results.value.length > 1)
const n = v => v == null ? '—' : typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? +v.toFixed(2) : +v.toPrecision(3)) : v
const cmp = (st, sg) => st == null || sg == null ? '' : sg > st ? 'worse' : sg < st ? 'better' : ''

async function buildReport() {
  const wb = X.utils.book_new()
  const sheet = (rows, widths, name) => { const s = X.utils.aoa_to_sheet(rows); s['!cols'] = widths.map(w => ({ wch: w })); s['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) }; X.utils.book_append_sheet(wb, s, name) }
  const iss = [['File', 'Severity', 'Rule', 'Rule title', 'Sheet', 'Cell', 'Item', 'Issue', 'How to fix', 'Status', 'Comment']]
  for (const x of all.value) iss.push([x.file, x.sev, x.id, title(x.id), x.sheet, x.cell, x.ref, x.msg, x.fix, '', ''])
  sheet(iss, [36, 9, 7, 44, 24, 10, 36, 80, 60, 10, 24], 'Issues')
  const ra = [['File', 'Sheet', 'Cell (EF)', 'Item', 'Block', 'EF', 'Data source', 'Dataset', 'Geography', 'Origin', 'TeR stated', 'GeR stated', 'TiR stated', 'P stated', 'DQR stated', 'TeR suggested', 'GeR suggested', 'TiR suggested', 'P suggested', 'DQR suggested', 'TeR reason', 'GeR reason', 'TiR reason', 'P reason']]
  for (const r of results.value.flatMap(r => r.ratings)) ra.push([r.file, r.sheet, r.cell, r.item, r.block, r.ef, r.src, r.db, r.geo, r.origin, r.stated.ter, r.stated.ger, r.stated.tir, r.stated.p, r.stated.dqr, r.sug.ter, r.sug.ger, r.sug.tir, r.sug.p, r.sug.dqr, r.why.ter, r.why.ger, r.why.tir, r.why.p])
  sheet(ra, [30, 20, 9, 34, 9, 10, 16, 50, 10, 8, 6, 6, 6, 6, 7, 6, 6, 6, 6, 7, 40, 40, 30, 30], 'Ratings')
  const fa = [['File', 'Sheet', 'Cell', 'Item', 'Block', 'EF (kg CO2e/unit)', 'Unit', 'Reference', 'Low', 'High', 'Result', 'Reference source']]
  for (const f of results.value.flatMap(r => r.factors)) fa.push([f.file, f.sheet, f.cell, f.item, f.block, f.ef, f.unit, f.ref, f.lo, f.hi, f.verdict, f.src])
  sheet(fa, [30, 20, 8, 34, 9, 12, 6, 30, 7, 7, 13, 60], 'Factors')
  const rr = [['Rule', 'Severity', 'Title (EN)', 'Title (ZH)']]
  for (const [id, x] of Object.entries(RULES)) rr.push([id, x.sev, x.en, x.zh])
  sheet(rr, [7, 9, 70, 40], 'Rules')
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' })
  if (reportUrl.value) URL.revokeObjectURL(reportUrl.value)
  reportUrl.value = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const d = new Date(), ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
  reportName.value = (results.value.length === 1 ? results.value[0].file.replace(/\.xls[xm]?$/i, '') : 'Carbon footprint forms') + ` - QC ${ymd}.xlsx`
}
onBeforeUnmount(() => { if (reportUrl.value) URL.revokeObjectURL(reportUrl.value) })
</script>

<template>
  <div class="qc">
    <div class="stdsel">
      <label>{{ stdLabel[L].label }}
        <select v-model="std">
          <option value="auto">{{ stdLabel[L].auto }}</option>
          <option v-for="s in STANDARDS" :key="s.id" :value="s.id">{{ s[L] }}</option>
          <option value="none">{{ stdLabel[L].none }}</option>
        </select>
      </label>
      
      <p v-if="stdInfo" class="fine">{{ stdInfo.status[L] }} <a :href="stdInfo.url" target="_blank" rel="noopener">↗</a></p>
    </div>
    <div v-if="state === 'idle'" class="drop" :class="{ over: dragging }" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
      <p class="drop-main">{{ t.drop }}</p>
      <p class="drop-or">{{ t.or }}</p>
      <button class="btn primary" @click="input.click()">{{ t.choose }}</button>
      <input ref="input" type="file" accept=".xlsx,.xlsm,.xls,.xlsb,.csv" multiple hidden @change="onPick">
      <p class="fine">{{ t.hint }}</p>
      <p class="fine">🔒 {{ t.privacy }}</p>
      <p class="fine">📏 {{ capText(L) }}</p>
    </div>
    <div v-for="(m, i) in notices" :key="i" class="alert" role="status">{{ m }}</div>
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
          <div class="ctitle">{{ r.meta.product || '—' }}</div>
          <div class="fine file">{{ r.file }}</div>
          <dl><template v-for="f in r.meta.fields" :key="f[0]"><dt>{{ f[0] }}</dt><dd>{{ f[1] }}</dd></template></dl>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button v-for="(lbl, k) in { issues: t.tIssues, ratings: t.tRatings, factors: t.tFactors }" :key="k" role="tab" :aria-selected="tab === k" class="tab" :class="{ on: tab === k }" @click="tab = k; limit = 200">{{ lbl }}</button>
      </div>
      <div class="filters">
        <select v-if="tab === 'issues'" v-model="ruleSel" :aria-label="t.rule"><option value="">{{ t.allRules }}</option><option v-for="r in rulesUsed" :key="r.id" :value="r.id">{{ r.id }} · {{ r.title }} ({{ r.n }})</option></select>
        <select v-if="multi" v-model="fileSel" :aria-label="t.file"><option value="">{{ t.allFiles }}</option><option v-for="r in results" :key="r.file" :value="r.file">{{ r.file }}</option></select>
        <input v-model="query" type="search" :placeholder="t.search" :aria-label="t.search">
      </div>

      <template v-if="tab === 'issues'">
        <div class="chips">
          <button v-for="(lbl, sv) in { error: t.errors, warning: t.warnings, info: t.info }" :key="sv" class="chip" :class="[sv, { off: !sevOn[sv] }]" :aria-pressed="sevOn[sv]" @click="sevOn[sv] = !sevOn[sv]"><b>{{ counts[sv] }}</b> {{ lbl }}</button>
        </div>
        <div v-if="all.length" class="tablewrap">
          <table>
            <thead><tr><th>{{ t.sev }}</th><th>{{ t.rule }}</th><th>{{ t.where }}</th><th>{{ t.issue }}</th><th>{{ t.fix }}</th></tr></thead>
            <tbody>
              <tr v-for="(x, i) in filtered.slice(0, limit)" :key="i">
                <td><span class="sev" :class="x.sev">{{ t.sevName[x.sev] }}</span></td>
                <td><span class="rule" :title="title(x.id)">{{ x.id }}</span></td>
                <td class="mono wc"><template v-if="x.cross">{{ t.cross }}</template><template v-else>{{ x.sheet }}<br v-if="x.sheet && x.cell">{{ x.cell }}</template><div v-if="multi && !x.cross" class="fine">{{ x.file }}</div></td>
                <td><div class="rt">{{ title(x.id) }}</div><div v-if="x.ref" class="fine">{{ x.ref }}</div><div>{{ x.msg }}</div></td>
                <td class="fixc">{{ x.fix }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filtered.length" class="fine pad">{{ t.none }}</p>
        </div>
        <p v-else class="clean">✅ {{ t.clean }}</p>
        <button v-if="filtered.length > limit" class="btn more" @click="limit += 200">{{ fmt(t.more, { n: Math.min(200, filtered.length - limit) }) }}</button>
      </template>

      <template v-if="tab === 'ratings'">
        <p class="fine">{{ t.ratingNote }}</p>
        <label class="fine chk"><input v-model="onlyDiff" type="checkbox"> {{ t.onlyDiff }}</label>
        <div class="tablewrap">
          <table class="rtab">
            <thead><tr><th>{{ t.item }}</th><th>{{ t.dataset }}</th><th class="c">TeR</th><th class="c">GeR</th><th class="c">TiR</th><th class="c">P</th><th class="c">DQR</th><th>{{ t.why }}</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in ratings.slice(0, limit)" :key="i">
                <td><div class="rt">{{ r.item }}</div><div class="fine mono">{{ r.sheet }} {{ r.cell }} · {{ r.block }} · EF {{ n(r.ef) }}</div><div v-if="multi" class="fine">{{ r.file }}</div></td>
                <td class="fine">{{ r.db || r.src || '—' }}<div v-if="r.geo">{{ r.geo }}</div></td>
                <td v-for="k in ['ter', 'ger', 'tir', 'p', 'dqr']" :key="k" class="c mono"><span>{{ n(r.stated[k]) }}</span><br><b :class="cmp(r.stated[k], r.sug[k])">{{ n(r.sug[k]) }}</b></td>
                <td class="fine why"><div v-for="(w, k) in r.why" :key="k"><b>{{ k.toUpperCase() }}</b> {{ w }}</div></td>
              </tr>
            </tbody>
          </table>
          <p class="fine">{{ t.stated }} / <b>{{ t.sug }}</b></p>
        </div>
        <button v-if="ratings.length > limit" class="btn more" @click="limit += 200">{{ fmt(t.more, { n: Math.min(200, ratings.length - limit) }) }}</button>
      </template>

      <template v-if="tab === 'factors'">
        <div class="tablewrap">
          <table>
            <thead><tr><th>{{ t.item }}</th><th class="c">{{ t.ef }}</th><th>{{ t.range }}</th><th>{{ t.verdict }}</th></tr></thead>
            <tbody>
              <tr v-for="(f, i) in factors.slice(0, limit)" :key="i">
                <td><div class="rt">{{ f.item }}</div><div class="fine mono">{{ f.sheet }} {{ f.cell }} · {{ f.block }}</div></td>
                <td class="c mono">{{ n(f.ef) }}<div class="fine">kg CO2e/{{ f.unit }}</div></td>
                <td><div>{{ f.ref }}: {{ f.lo }}–{{ f.hi }}</div><div class="fine">{{ f.src }}</div></td>
                <td><span class="tag" :class="f.verdict === 'within range' ? 'ok' : 'bad'">{{ f.verdict }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button v-if="factors.length > limit" class="btn more" @click="limit += 200">{{ fmt(t.more, { n: Math.min(200, factors.length - limit) }) }}</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.qc { margin: 24px 0; }
.stdsel { margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.stdsel label { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-weight: 500; }
.stdsel select { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 5px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); max-width: 100%; }
.stdsel .fine { flex-basis: 100%; margin: 0; }
.btn.sm { padding: 3px 10px; font-size: .85em; }
.drop { border: 2px dashed var(--vp-c-divider); border-radius: 12px; padding: 32px 16px; text-align: center; background: var(--vp-c-bg-soft); }
.drop.over { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.drop p { margin: 6px 0; }
.drop-main { font-weight: 600; font-size: 1.05em; }
.drop-or { color: var(--vp-c-text-2); }
.fine { color: var(--vp-c-text-2); font-size: .85em; line-height: 1.5; }
.mono { font-family: var(--vp-font-family-mono); font-size: .85em; }
.btn { display: inline-block; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; text-decoration: none !important; }
.btn:hover { border-color: var(--vp-c-brand-1); }
.btn.primary { background: var(--vp-c-brand-3); border-color: var(--vp-c-brand-3); color: var(--vp-c-white); }
.alert { margin-top: 12px; padding: 12px 16px; border-radius: 8px; background: var(--vp-c-warning-soft); border-left: 4px solid var(--vp-c-warning-1); }
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
.tabs { display: flex; gap: 4px; flex-wrap: wrap; margin: 18px 0 4px; border-bottom: 1px solid var(--vp-c-divider); }
.tab { padding: 6px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--vp-c-text-2); cursor: pointer; font-weight: 500; }
.tab.on { color: var(--vp-c-brand-1); border-bottom-color: var(--vp-c-brand-1); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.chip { border-radius: 999px; padding: 4px 14px; border: 1px solid transparent; cursor: pointer; font-size: .9em; }
.chip.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.chip.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.chip.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.chip.off { opacity: .45; text-decoration: line-through; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 4px; }
.filters select, .filters input { flex: 1 1 200px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.chk { display: flex; gap: 6px; align-items: center; margin: 6px 0; }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; margin: 8px 0 0; font-size: .88em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 7px 9px; }
.c { text-align: center; }
.wc { max-width: 150px; word-break: break-word; }
.why { min-width: 220px; }
.rt { font-weight: 600; font-size: .95em; word-break: break-word; }
.fixc { min-width: 180px; max-width: 320px; }
b.worse { color: var(--vp-c-danger-1); }
b.better { color: var(--vp-c-tip-1); }
.sev { font-size: .8em; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.sev.error { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.sev.warning { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.sev.info { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.rule { font-family: var(--vp-font-family-mono); font-size: .85em; white-space: nowrap; border-bottom: 1px dotted var(--vp-c-text-3); cursor: help; }
.tag { font-size: .78em; font-weight: 600; padding: 1px 8px; border-radius: 999px; white-space: nowrap; }
.tag.ok { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.tag.bad { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.more { margin-top: 8px; }
.pad { padding: 12px; }
.clean { font-weight: 600; margin-top: 12px; }
</style>
