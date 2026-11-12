<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({ lang: { type: String, default: 'en' } })

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/'
const CHUNK = 4 * 1024 * 1024

const T = {
  en: {
    drop: 'Drop a sustainability / ESG / CSR report (PDF) here',
    or: 'or',
    choose: 'Choose PDF',
    linkPh: 'Paste a link to a PDF report (e.g. cninfo, SSE, SZSE, HKEX, company site)',
    check: 'Check link',
    prevToggle: 'Compare with last year’s report (optional)',
    prevNote: 'Adds year-on-year checks: dropped indicators, changed prior-year figures, targets that disappeared.',
    prevSet: 'Last year: {name}',
    clear: 'Remove',
    privacy: 'The PDF is read in your browser and not stored anywhere. Links are fetched through a scdd.pro relay only because report sites block direct downloads.',
    runtime: 'Loading the checker (first time about 20 s, cached afterwards)…',
    packages: 'Loading the Excel writer…',
    download_s: 'Downloading {name}… {got} / {total} MB',
    reading: 'Reading {name}: page {i} of {n}…',
    analysing: 'Analysing…',
    elapsed: '{s} s',
    e_link: 'The link could not be downloaded. Check that it opens a PDF in your browser, or download the file and choose it above.',
    e_notpdf: 'This does not look like a PDF file.',
    e_read: 'The PDF could not be read (it may be damaged or password-protected).',
    e_scan: 'This PDF has (almost) no text layer — it is a scanned image. Text recognition (OCR) is not supported yet.',
    error: 'The check could not finish.',
    load: 'The checker could not load. Check your internet connection and try again.',
    detail: 'Details',
    pages: '{n} pages',
    compared: 'compared with {name}',
    download: 'Download Excel',
    csv: 'Download CSV',
    again: 'Check another report',
    read: 'The read',
    good: 'What is good',
    bad: 'What needs work',
    limits: 'Limits of this check',
    sg: 'Guideline coverage',
    sa: 'All indicators',
    allTypes: 'All types',
    search: 'Search issues, pages or text…',
    sev: 'Priority', type: 'Type', issue: 'Issue', page: 'Page',
    why: 'Why it matters', fix: 'What good looks like',
    none: 'No issues match the current filters.',
    clean: 'No issues found.',
    more: 'Show {n} more',
    coverage: 'Indicator coverage ({n})',
    covAll: 'All', ind: 'Indicator', status: 'Status', num: 'Figure found',
    stName: { Disclosed: 'Disclosed', Partly: 'Partly', Missing: 'Missing' },
    sevName: { High: 'High', Medium: 'Medium', Low: 'Low', Info: 'Info' },
    typeName: { Consistency: 'Numbers', Claim: 'Claim', Gap: 'Gap', Change: 'Year on year' },
    disclaimer: 'Automated screening: flags are prompts for a reviewer, not verdicts. Open the page before quoting any result.'
  },
  zh: {
    drop: '将可持续发展 / ESG / 社会责任报告（PDF）拖到这里',
    or: '或',
    choose: '选择 PDF',
    linkPh: '粘贴 PDF 报告链接（如巨潮资讯、上交所、深交所、港交所或公司官网）',
    check: '检查链接',
    prevToggle: '与去年的报告对比（可选）',
    prevNote: '增加跨年检查：被删除的指标、被改动的往年数据、消失的目标。',
    prevSet: '去年报告：{name}',
    clear: '移除',
    privacy: 'PDF 在您的浏览器中读取，不会被保存。报告网站禁止跨站直接下载，因此链接通过 scdd.pro 中转获取。',
    runtime: '正在加载检查程序（首次约 20 秒，之后会缓存）……',
    packages: '正在加载 Excel 组件……',
    download_s: '正在下载 {name}…… {got} / {total} MB',
    reading: '正在读取 {name}：第 {i} / {n} 页……',
    analysing: '正在分析……',
    elapsed: '{s} 秒',
    e_link: '无法下载该链接。请确认它在浏览器中能直接打开 PDF，或先下载文件再在上方选择。',
    e_notpdf: '该文件看起来不是 PDF。',
    e_read: '无法读取该 PDF（文件可能已损坏或设有密码）。',
    e_scan: '该 PDF（几乎）没有文字层，是扫描图片。暂不支持文字识别（OCR）。',
    error: '检查未能完成。',
    load: '检查程序加载失败，请检查网络连接后重试。',
    detail: '详细信息',
    pages: '共 {n} 页',
    compared: '对比 {name}',
    download: '下载 Excel',
    csv: '下载 CSV',
    again: '检查其他报告',
    read: '解读',
    good: '做得好的',
    bad: '需要改进的',
    limits: '本检查的局限',
    sg: '交易所指引覆盖',
    sa: '全部指标',
    allTypes: '全部类型',
    search: '搜索问题、页码或内容……',
    sev: '优先级', type: '类型', issue: '问题', page: '页码',
    why: '为什么重要', fix: '更好的做法',
    none: '没有符合当前筛选条件的问题。',
    clean: '未发现问题。',
    more: '再显示 {n} 条',
    coverage: '指标覆盖（{n} 项）',
    covAll: '全部', ind: '指标', status: '状态', num: '找到的数据',
    stName: { Disclosed: '已披露', Partly: '部分', Missing: '缺失' },
    sevName: { High: '高', Medium: '中', Low: '低', Info: '提示' },
    typeName: { Consistency: '数据', Claim: '表述', Gap: '缺失', Change: '跨年' },
    disclaimer: '自动筛查：标记只是提示审阅人关注，并非结论。引用任何结果前请打开原页核对。'
  }
}
const t = computed(() => T[props.lang] || T.en)
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k])

const state = ref('idle')            // idle | busy | done | failed
const stage = ref({ key: '', o: {} })
const fail = ref(null)
const result = ref(null)
const reportUrl = ref('')
const reportName = ref('')
const csvUrl = ref('')
const secs = ref(0)
const dragging = ref(false)
const link = ref('')
const showPrev = ref(false)
const prevSrc = ref(null)            // { file } | { url }
const prevLink = ref('')
const sevOn = ref({ High: true, Medium: true, Low: true, Info: false })
const typeSel = ref('')
const query = ref('')
const limit = ref(100)
const open = ref({})
const covSel = ref('Missing')
const input = ref(null)
const prevInput = ref(null)
let worker = null
let timer = null
let pdfjs = null

// ---------------------------------------------------------------- worker
let pending = null
function getWorker() {
  if (worker) return worker
  worker = new Worker('/tools/esg-lens/worker.js')
  worker.onmessage = (e) => {
    const m = e.data
    if (m.type === 'progress') { if (state.value === 'busy' && stage.value.key !== 'reading' && stage.value.key !== 'download_s') stage.value = { key: m.stage, o: {} } }
    else if (m.type === 'result' && pending) { pending.resolve(m); pending = null }
    else if (m.type === 'failed' && pending) { pending.reject(Object.assign(new Error(m.detail || ''), { code: m.code })); pending = null }
  }
  worker.onerror = (e) => { if (pending) { pending.reject(Object.assign(new Error(e.message || ''), { code: 'load' })); pending = null } }
  return worker
}
function warm() { if (!worker) getWorker().postMessage({ type: 'init' }) }
function analyseInWorker(doc, prev) {
  return new Promise((resolve, reject) => {
    pending = { resolve, reject }
    const d = new Date()
    const when = d.toISOString().slice(0, 16).replace('T', ' ')
    getWorker().postMessage({ type: 'analyse', doc, prev, lang: props.lang === 'zh' ? 'zh' : 'en', when })
  })
}

// ---------------------------------------------------------------- PDF in
const isPdf = (buf) => new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(1024, buf.byteLength))).includes('%PDF')
const nameFromUrl = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop()) || 'report.pdf' } catch (_) { return 'report.pdf' } }

async function fetchPdf(url, name) {
  try {
    const r = await fetch(url, { mode: 'cors' })
    if (r.ok) { const b = await r.arrayBuffer(); if (isPdf(b)) return b }
  } catch (_) { /* blocked by CORS: use the relay */ }
  const q = (s, e) => `/api/fetch-pdf?url=${encodeURIComponent(url)}&start=${s}&end=${e}`
  const first = await fetch(q(0, CHUNK - 1))
  if (!first.ok) throw Object.assign(new Error(`relay ${first.status}`), { code: first.status === 415 ? 'e_notpdf' : 'e_link' })
  const total = parseInt(first.headers.get('X-Total-Length') || '0', 10)
  const parts = [new Uint8Array(await first.arrayBuffer())]
  let got = parts[0].byteLength
  const mb = (n) => (n / 1048576).toFixed(1)
  stage.value = { key: 'download_s', o: { name, got: mb(got), total: total ? mb(total) : '?' } }
  while (total && got < total) {
    const r = await fetch(q(got, Math.min(total, got + CHUNK) - 1))
    if (!r.ok) throw Object.assign(new Error(`relay ${r.status}`), { code: 'e_link' })
    const b = new Uint8Array(await r.arrayBuffer())
    if (!b.byteLength) break
    parts.push(b); got += b.byteLength
    stage.value = { key: 'download_s', o: { name, got: mb(got), total: mb(total) } }
  }
  const out = new Uint8Array(got)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.byteLength }
  if (!isPdf(out.buffer)) throw Object.assign(new Error('not a pdf'), { code: 'e_notpdf' })
  return out.buffer
}

async function readPdf(buffer, name) {
  if (!pdfjs) {
    pdfjs = await import(/* @vite-ignore */ PDFJS + 'build/pdf.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.mjs'
  }
  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true,
      standardFontDataUrl: PDFJS + 'standard_fonts/', isEvalSupported: false }).promise
  } catch (e) { throw Object.assign(e, { code: 'e_read' }) }
  const pages = []
  let chars = 0
  for (let i = 1; i <= doc.numPages; i++) {
    stage.value = { key: 'reading', o: { name, i, n: doc.numPages } }
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    let text = ''
    const words = []
    for (const it of tc.items) {
      if (!('str' in it)) continue
      text += it.str
      if (it.hasEOL) text += '\n'
      if (!it.str.trim()) continue
      const m = pdfjs.Util.transform(vp.transform, it.transform)
      const fh = Math.hypot(m[2], m[3]) || Math.abs(it.height) || 8
      const x0 = m[4], yb = m[5]
      const w = Math.abs(it.width) || fh * it.str.length * 0.5
      words.push([+x0.toFixed(1), +(yb - fh).toFixed(1), +(x0 + w).toFixed(1), +yb.toFixed(1), it.str])
    }
    chars += text.trim().length
    pages.push({ text, words })
    page.cleanup()
  }
  const n = doc.numPages
  await doc.destroy()
  if (chars < n * 20) throw Object.assign(new Error('no text layer'), { code: 'e_scan' })
  return { file: name, pages }
}

async function load(src) {
  const name = src.file ? src.file.name : nameFromUrl(src.url)
  const buf = src.file ? await src.file.arrayBuffer() : await fetchPdf(src.url, name)
  if (!isPdf(buf)) throw Object.assign(new Error('not a pdf'), { code: 'e_notpdf' })
  return readPdf(buf, name)
}

// ---------------------------------------------------------------- run
function startTimer() { secs.value = 0; stopTimer(); timer = setInterval(() => secs.value++, 1000) }
function stopTimer() { if (timer) clearInterval(timer); timer = null }

async function run(src) {
  if (!src || (!src.file && !src.url)) return
  fail.value = null; result.value = null; open.value = {}
  typeSel.value = ''; query.value = ''; limit.value = 100; covSel.value = 'Missing'
  sevOn.value = { High: true, Medium: true, Low: true, Info: false }
  state.value = 'busy'; stage.value = { key: 'runtime', o: {} }
  startTimer()
  warm()
  try {
    const doc = await load(src)
    const prev = prevSrc.value ? await load(prevSrc.value) : null
    stage.value = { key: 'analysing', o: {} }
    const m = await analyseInWorker(doc, prev)
    result.value = m.result
    if (reportUrl.value) URL.revokeObjectURL(reportUrl.value)
    reportUrl.value = URL.createObjectURL(new Blob([m.report], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    reportName.value = `${doc.file.replace(/\.pdf$/i, '')} - ESG Lens.xlsx`
    makeCsv()
    state.value = 'done'
  } catch (e) {
    fail.value = { code: e.code || 'error', detail: String(e.message || e).slice(0, 400) }
    state.value = 'failed'
  } finally { stopTimer() }
}
function onPick(e) { run({ file: e.target.files[0] }); e.target.value = '' }
function onDrop(e) { dragging.value = false; const f = e.dataTransfer.files[0]; if (f) run({ file: f }) }
function onLink() { const u = link.value.trim(); if (/^https?:\/\//i.test(u)) run({ url: u }) }
function onPrevPick(e) { const f = e.target.files[0]; if (f) prevSrc.value = { file: f }; e.target.value = '' }
function onPrevLink() { const u = prevLink.value.trim(); if (/^https?:\/\//i.test(u)) prevSrc.value = { url: u } }
function reset() { state.value = 'idle'; result.value = null; fail.value = null }
const prevName = computed(() => prevSrc.value ? (prevSrc.value.file ? prevSrc.value.file.name : nameFromUrl(prevSrc.value.url)) : '')

// ---------------------------------------------------------------- results
const counts = computed(() => result.value?.counts || {})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (result.value?.issues || []).filter(i =>
    sevOn.value[i.sev] && (!typeSel.value || i.type === typeSel.value) &&
    (!q || [i.title, i.evidence, i.found, i.note, i.rule, (i.pages || []).join(',')].some(v => String(v || '').toLowerCase().includes(q))))
})
const typesUsed = computed(() => {
  const c = {}
  for (const i of result.value?.issues || []) c[i.type] = (c[i.type] || 0) + 1
  return ['Consistency', 'Claim', 'Change', 'Gap'].filter(k => c[k]).map(k => ({ k, n: c[k] }))
})
const covRows = computed(() => (result.value?.coverage || []).filter(r => !covSel.value || r.Status === covSel.value))
const stageText = computed(() => {
  const s = stage.value
  return t.value[s.key] ? fmt(t.value[s.key], s.o || {}) : t.value.runtime
})
function pagesText(p) { return (p || []).slice(0, 6).join(', ') + ((p || []).length > 6 ? ' …' : '') }

function makeCsv() {
  const r = result.value
  const head = ['No', t.value.sev, t.value.type, 'Rule', t.value.issue, t.value.page, 'Found', 'Evidence', 'Note', t.value.why, t.value.fix]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = r.issues.map(i => [i.no, t.value.sevName[i.sev], t.value.typeName[i.type], i.rule, i.title, (i.pages || []).join(' '), i.found, i.evidence, i.note, i.why, i.fix])
  const csv = '﻿' + [head, ...rows].map(x => x.map(esc).join(',')).join('\r\n')
  if (csvUrl.value) URL.revokeObjectURL(csvUrl.value)
  csvUrl.value = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

onBeforeUnmount(() => {
  stopTimer(); if (worker) worker.terminate()
  for (const u of [reportUrl.value, csvUrl.value]) if (u) URL.revokeObjectURL(u)
})
</script>

<template>
  <div class="lens">
    <template v-if="state === 'idle' || state === 'failed'">
      <div class="drop" :class="{ over: dragging }"
           @dragenter.prevent="dragging = true; warm()" @dragover.prevent @dragleave.prevent="dragging = false"
           @drop.prevent="onDrop" @mouseenter="warm" @focusin="warm">
        <p class="drop-main">{{ t.drop }}</p>
        <button class="btn primary" @click="input.click()">{{ t.choose }}</button>
        <input ref="input" type="file" accept=".pdf,application/pdf" hidden @change="onPick">
        <p class="drop-or">{{ t.or }}</p>
        <form class="linkrow" @submit.prevent="onLink">
          <input v-model="link" type="url" :placeholder="t.linkPh" :aria-label="t.linkPh">
          <button class="btn" type="submit" :disabled="!/^https?:\/\//i.test(link.trim())">{{ t.check }}</button>
        </form>
      </div>

      <details class="prev" :open="showPrev" @toggle="showPrev = $event.target.open">
        <summary>{{ t.prevToggle }}</summary>
        <p class="fine">{{ t.prevNote }}</p>
        <div v-if="prevSrc" class="prevset">
          <span>📄 {{ fmt(t.prevSet, { name: prevName }) }}</span>
          <button class="btn small" @click="prevSrc = null; prevLink = ''">{{ t.clear }}</button>
        </div>
        <div v-else class="linkrow">
          <button class="btn" @click="prevInput.click()">{{ t.choose }}</button>
          <input ref="prevInput" type="file" accept=".pdf,application/pdf" hidden @change="onPrevPick">
          <input v-model="prevLink" type="url" :placeholder="t.linkPh" :aria-label="t.linkPh" @change="onPrevLink" @keyup.enter="onPrevLink">
        </div>
      </details>
      <p class="fine">🔒 {{ t.privacy }}</p>

      <div v-if="state === 'failed'" class="alert" role="alert">
        <strong>{{ t[fail.code] || t.error }}</strong>
        <details v-if="fail.detail"><summary>{{ t.detail }}</summary><code>{{ fail.detail }}</code></details>
      </div>
    </template>

    <div v-if="state === 'busy'" class="busy" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ stageText }}</span>
      <span class="secs">{{ fmt(t.elapsed, { s: secs }) }}</span>
    </div>

    <div v-if="state === 'done'" class="result">
      <div class="head">
        <div>
          <div class="file">{{ result.file }}</div>
          <div class="fine">{{ fmt(t.pages, { n: result.n_pages }) }}<span v-if="result.prev_file"> · {{ fmt(t.compared, { name: result.prev_file }) }}</span></div>
        </div>
        <div class="actions">
          <a class="btn primary" :href="reportUrl" :download="reportName">⬇ {{ t.download }}</a>
          <a class="btn" :href="csvUrl" :download="reportName.replace(/\.xlsx$/, '.csv')">{{ t.csv }}</a>
          <button class="btn" @click="reset">{{ t.again }}</button>
        </div>
      </div>

      <section class="read">
        <div class="scores">
          <div class="score"><b>{{ result.score_guide }}</b><span>/100</span><div class="fine">{{ t.sg }}</div></div>
          <div class="score dim"><b>{{ result.score_all }}</b><span>/100</span><div class="fine">{{ t.sa }}</div></div>
        </div>
        <h3>{{ t.read }}</h3>
        <p class="headline">{{ result.read.headline }}</p>
        <div class="cols">
          <div>
            <h4 class="good">✓ {{ t.good }}</h4>
            <ul><li v-for="(s, n) in result.read.strengths" :key="n">{{ s }}</li><li v-if="!result.read.strengths.length">—</li></ul>
          </div>
          <div>
            <h4 class="bad">✗ {{ t.bad }}</h4>
            <ul><li v-for="(s, n) in result.read.weaknesses" :key="n">{{ s }}</li><li v-if="!result.read.weaknesses.length">—</li></ul>
          </div>
        </div>
        <details class="limits"><summary>{{ t.limits }}</summary><ul><li v-for="(s, n) in result.read.limits" :key="n">{{ s }}</li></ul></details>
      </section>

      <div class="chips">
        <button v-for="sv in ['High', 'Medium', 'Low', 'Info']" :key="sv"
                class="chip" :class="[sv.toLowerCase(), { off: !sevOn[sv] }]" :aria-pressed="sevOn[sv]"
                @click="sevOn[sv] = !sevOn[sv]">
          <b>{{ counts[sv] || 0 }}</b> {{ t.sevName[sv] }}
        </button>
      </div>

      <template v-if="result.issues.length">
        <div class="filters">
          <select v-model="typeSel" :aria-label="t.type">
            <option value="">{{ t.allTypes }}</option>
            <option v-for="x in typesUsed" :key="x.k" :value="x.k">{{ t.typeName[x.k] }} ({{ x.n }})</option>
          </select>
          <input v-model="query" type="search" :placeholder="t.search" :aria-label="t.search">
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>{{ t.sev }}</th><th>{{ t.type }}</th><th>{{ t.issue }}</th><th>{{ t.page }}</th></tr></thead>
            <tbody>
              <tr v-for="i in filtered.slice(0, limit)" :key="i.no" class="row" @click="open[i.no] = !open[i.no]">
                <td><span class="sev" :class="i.sev.toLowerCase()">{{ t.sevName[i.sev] }}</span></td>
                <td class="nowrap">{{ t.typeName[i.type] }}<div class="fine mono">{{ i.rule }}</div></td>
                <td>
                  <div class="ititle">{{ i.title }}<span v-if="i.found" class="found"> · {{ i.found }}</span></div>
                  <div v-if="i.evidence" class="fine ev">{{ i.evidence }}</div>
                  <div v-if="i.note" class="fine note">{{ i.note }}</div>
                  <div v-if="open[i.no]" class="more-info">
                    <div><b>{{ t.why }}:</b> {{ i.why }}</div>
                    <div><b>{{ t.fix }}:</b> {{ i.fix }}</div>
                  </div>
                </td>
                <td class="mono nowrap">{{ pagesText(i.pages) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filtered.length" class="fine pad">{{ t.none }}</p>
        </div>
        <button v-if="filtered.length > limit" class="btn more" @click="limit += 100">{{ fmt(t.more, { n: Math.min(100, filtered.length - limit) }) }}</button>
      </template>
      <p v-else class="clean">✅ {{ t.clean }}</p>

      <details class="cov">
        <summary>{{ fmt(t.coverage, { n: result.coverage.length }) }}</summary>
        <div class="filters">
          <select v-model="covSel">
            <option value="">{{ t.covAll }}</option>
            <option v-for="s in ['Missing', 'Partly', 'Disclosed']" :key="s" :value="s">{{ t.stName[s] }}</option>
          </select>
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>ID</th><th>{{ t.ind }}</th><th>{{ t.status }}</th><th>{{ t.page }}</th><th>{{ t.num }}</th></tr></thead>
            <tbody>
              <tr v-for="r in covRows" :key="r.ID">
                <td class="mono nowrap">{{ r.ID }}<span v-if="r.Guideline" title="Exchange guideline"> ★</span></td>
                <td>{{ lang === 'zh' ? r.Indicator : (r['Indicator EN'] || r.Indicator) }}<div class="fine">{{ r.Topic }}</div></td>
                <td><span class="st" :class="r.Status.toLowerCase()">{{ t.stName[r.Status] }}</span></td>
                <td class="mono">{{ r.Pages }}</td>
                <td class="fine">{{ r['Number found'] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <p class="fine disclaimer">{{ t.disclaimer }}</p>
    </div>
  </div>
</template>

<style scoped>
.lens { margin: 24px 0; }
.drop { border: 2px dashed var(--vp-c-divider); border-radius: 12px; padding: 28px 16px; text-align: center; background: var(--vp-c-bg-soft); transition: border-color .15s, background .15s; }
.drop.over { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.drop p { margin: 8px 0; }
.drop-main { font-weight: 600; font-size: 1.05em; }
.drop-or { color: var(--vp-c-text-2); }
.linkrow { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 640px; margin: 0 auto; }
.linkrow input { flex: 1 1 260px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.prev { margin: 12px 0 4px; font-size: .95em; }
.prev summary { cursor: pointer; color: var(--vp-c-brand-1); }
.prev .linkrow { justify-content: flex-start; margin: 8px 0 0; max-width: none; }
.prevset { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
.fine { color: var(--vp-c-text-2); font-size: .85em; line-height: 1.5; }
.mono { font-family: var(--vp-font-family-mono); font-size: .85em; }
.nowrap { white-space: nowrap; }
.btn { display: inline-block; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; text-decoration: none !important; font-size: .9em; }
.btn:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
.btn:disabled { opacity: .5; cursor: default; }
.btn.small { padding: 2px 10px; }
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
.read { margin: 16px 0; padding: 16px; border-radius: 12px; background: var(--vp-c-bg-soft); position: relative; }
.read h3 { margin: 0 0 6px; padding: 0; border: 0; font-size: 1.1em; }
.read h4 { margin: 12px 0 4px; font-size: .95em; }
.read ul { margin: 0; padding-left: 20px; }
.read li { margin: 4px 0; font-size: .92em; line-height: 1.55; }
.headline { margin: 0; font-weight: 500; }
.scores { display: flex; gap: 16px; float: right; margin: 0 0 8px 16px; }
.score { text-align: center; }
.score b { font-size: 1.8em; font-variant-numeric: tabular-nums; color: var(--vp-c-brand-1); }
.score.dim b { color: var(--vp-c-text-2); font-size: 1.3em; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; clear: both; }
@media (max-width: 640px) { .cols { grid-template-columns: 1fr; } .scores { float: none; margin: 0 0 8px; } }
.good { color: var(--vp-c-green-1, #18794e); }
.bad { color: var(--vp-c-danger-1); }
.limits { margin-top: 10px; font-size: .88em; color: var(--vp-c-text-2); }
.limits summary { cursor: pointer; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 8px; }
.chip { border-radius: 999px; padding: 4px 14px; border: 1px solid transparent; cursor: pointer; font-size: .9em; }
.chip.high { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.chip.medium { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.chip.low { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.chip.info { background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
.chip.off { opacity: .45; text-decoration: line-through; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.filters select, .filters input { flex: 1 1 200px; min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: .9em; }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; margin: 0; font-size: .9em; }
.tablewrap th, .tablewrap td { vertical-align: top; padding: 8px 10px; }
.row { cursor: pointer; }
.ititle { font-weight: 500; }
.found { color: var(--vp-c-text-2); font-weight: 400; }
.ev { word-break: break-word; }
.note { font-style: italic; }
.more-info { margin-top: 6px; font-size: .85em; line-height: 1.5; padding: 8px; border-radius: 6px; background: var(--vp-c-bg-soft); }
.sev, .st { font-size: .8em; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.sev.high, .st.missing { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.sev.medium, .st.partly { background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.sev.low { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.sev.info { background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
.st.disclosed { background: var(--vp-c-green-soft, var(--vp-c-tip-soft)); color: var(--vp-c-green-1, var(--vp-c-tip-1)); }
.more { margin-top: 8px; }
.pad { padding: 12px; }
.clean { font-weight: 600; margin-top: 12px; }
.cov { margin-top: 20px; }
.cov summary { cursor: pointer; font-weight: 500; }
.disclaimer { margin-top: 16px; }
</style>
