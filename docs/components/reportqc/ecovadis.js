// EcoVadis questionnaire export ("Survey Full" PDF) checker — run before submitting the questionnaire.
import { cells, collector, clip, CJK, nonLatinShare, PLACEHOLDER, norm, num } from './common.js'

export const RULES = {
  'EV-01': { sev: 'error', en: 'Question not complete (status Mandatory / Incomplete)', zh: '问题未完成（状态为 Mandatory / Incomplete）' },
  'EV-02': { sev: 'error', en: 'Attached document without indicated pages', zh: '附件未标注页码' },
  'EV-03': { sev: 'warning', en: 'Indicated page range is very wide or malformed', zh: '标注的页码范围过宽或格式错误' },
  'EV-04': { sev: 'warning', en: 'Document name or comment not in English (analysts may not be able to read it)', zh: '文件名或评论不是英文（评审员可能无法阅读）' },
  'EV-05': { sev: 'warning', en: 'Document name contains an internal note (e.g. "decrypted", "draft", "copy", "test")', zh: '文件名包含内部备注（如“解密”“草稿”“副本”“测试”）' },
  'EV-06': { sev: 'info', en: 'One document attached to many questions (check it really covers each topic)', zh: '同一文件被附在多个问题下（请确认确实覆盖各主题）' },
  'EV-07': { sev: 'info', en: 'Document type "Other" (a specific type helps the analyst)', zh: '文件类型为“Other”（选择具体类型便于评审）' },
  'EV-08': { sev: 'error', en: 'KPI: year given but no value', zh: 'KPI：填写了年份但没有数值' },
  'EV-09': { sev: 'warning', en: 'KPI value implausible (percentage over 100, negative, decimal count, ratio entered as a percent)', zh: 'KPI 数值不合理（百分比超过 100、负数、计数带小数、比率按百分比填写）' },
  'EV-10': { sev: 'warning', en: 'KPI year more than two years old, or a target year already reached', zh: 'KPI 年份早于两年前，或目标年份已过' },
  'EV-11': { sev: 'warning', en: '"Please specify" left empty for an "Other" option that has a document', zh: '“Other”选项附了文件但“Please specify”为空' },
  'EV-12': { sev: 'warning', en: 'Same document attached twice to one answer option', zh: '同一答案选项下重复附同一文件' },
  'EV-13': { sev: 'info', en: 'Theme with few supporting documents', zh: '某主题的支持文件很少' },
  'EV-14': { sev: 'warning', en: 'Placeholder or unfinished text', zh: '占位符或未完成的文字' },
  'EV-15': { sev: 'info', en: 'Document comment explains a gap or partial evidence', zh: '文件评论说明了缺口或证据不完整' },
}

const STATUS = /^(Complete|Mandatory|Optional|Incomplete|Not answered|In progress|Not started|Required)$/i
const CODE = /^(GEN|LAB|ENV|CAR|FB|SUP|CP|SA|HR|ETH|IMP)\d{2,5}$/
const INTERNAL = /解密|可上传|草稿|副本|测试|内部|勿传|最终版?|修改|\bdraft\b|\bcopy\b|\btest\b|\btemp\b|\bold\b|\bv\d+(?:\.\d+)?\s*(?:final|new)\b|\bfinal\s*final\b|\bdo not\b|\(\d\)$/i

const BOIL = /^(Examples of|Document guidelines|Your document|The document\(s\)|This metric|Example calculation|There is no document|Here are some|Qualitative objective|Quantitative target|Please |Select |Indicate |A baseline|Answers to this)/
function titleAbove(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    const l = lines[j], gap = j > 0 ? l.y - lines[j - 1].y : 99
    if (l.x >= 52 && l.x <= 62 && gap > 14 && !BOIL.test(l.text) && l.text.length < 200) return l.text
  }
  return ''
}

function parse(doc) {
  const qs = []
  let q = null, theme = '', opt = '', doc_ = null, kpiName = '', state = null, hdr = null
  const pending = []
  for (const p of doc.pages) {
    const lines = p.lines.filter(l => !/^© Copyright EcoVadis|^\d+ \/ \d+$/.test(l.text))
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], cs = cells(l, 10), t = l.text
      const th = /^Theme:\s*(.*)$/.exec(t); if (th) { theme = th[1] || theme; continue }
      if (/^Assessment scope:/.test(t)) continue
      if (cs.length >= 2 && STATUS.test(cs[0].text) && CODE.test(cs[1].text)) {
        q = { status: cs[0].text, code: cs[1].text, impact: cs[2]?.text || '', text: '', theme, page: p.n, docs: [], kpis: [], specify: [] }
        qs.push(q); opt = ''; doc_ = null; state = 'qtext'; continue
      }
      if (!q) continue
      if (state === 'qtext') { if (l.x < 50) { q.text += (q.text ? ' ' : '') + t; continue } state = null }
      if (/^Attached document$/.test(t)) { doc_ = { name: '', type: '', pages: null, comment: '', opt, page: p.n }; q.docs.push(doc_); state = 'dname'; continue }
      if (doc_ && state === 'dname') { if (/^Replace document$/.test(t)) continue; if (cs.length === 1 && l.x > 80 && l.x < 120) { if (!doc_.name) { doc_.name = t; continue } if (!doc_.type) { doc_.type = t; continue } } }
      if (doc_ && /^Indicated pages:/.test(t)) { state = 'dpages'; doc_.pagesX = l.x; doc_.comX = cs.find(c => /^Comment:/.test(c.text))?.x ?? 180; doc_.pages = ''; continue }
      if (doc_ && state === 'dpages') {
        if (/^Attached document$|^Examples of documents|^Document guidelines/.test(t) || (l.x < 62 && cs.length === 1)) { state = null; doc_ = null; i--; continue }
        for (const c of cells(l, 10)) { if (c.x < doc_.comX - 10) doc_.pages += (doc_.pages ? ' ' : '') + c.text; else doc_.comment += (doc_.comment ? ' ' : '') + c.text }
        continue
      }
      // KPI tables
      if (/^Examples of documents to attach$|^There is no document to attach/.test(t)) {
        const prev = lines[i - 1]
        if (prev && prev.x >= 52 && prev.x <= 62 && !/^(Examples|Document guidelines|This metric|Example calculation)/.test(prev.text)) kpiName = prev.text
        state = null; continue
      }
      if (cs.length && cs[0].text === 'Year' && l.x < 70) {
        hdr = { cols: cs.map(c => ({ k: c.text, x: c.x })), name: titleAbove(lines, i) }
        continue
      }
      if (cs.length && /^(19|20)\d{2}$/.test(cs[0].text) && l.x < 70 && hdr) {
        const row = { name: hdr.name || kpiName, year: +cs[0].text, unit: '', value: '', target: hdr.cols.some(c => c.k === 'Target'), page: p.n }
        for (const c of cs.slice(1)) {
          if (/^value$/i.test(c.text)) continue
          const col = hdr.cols.reduce((a, b) => Math.abs(b.x - c.x) < Math.abs(a.x - c.x) ? b : a)
          if (col.k === 'Unit' || c.text === '%') row.unit = (row.unit ? row.unit + ' ' : '') + c.text
          else if (col.k === 'Value' || col.k === 'Target') row.value = c.text
          else if (!row.value && /^-?[\d,.]+$/.test(c.text)) row.value = c.text
          else row.unit = (row.unit ? row.unit + ' ' : '') + c.text
        }
        q.kpis.push(row)
        continue
      }
      // option labels and "Please specify"
      if (l.x >= 52 && l.x <= 62 && cs.length === 1 && t.length < 160 && !/^(Examples of|Document guidelines|Here are some|Qualitative objective|Quantitative target|This metric|Example calculation|Please select this option|Select the range|An endorsement|Click on|Your document)/.test(t)) {
        if (/^Please specify$/.test(t)) {
          const next = lines[i + 1]
          const val = next && next.x > 62 && next.x < 200 && !/^Attached document|^Examples/.test(next.text) ? next.text : ''
          q.specify.push({ opt, val, page: p.n, lineIdx: i })
          continue
        }
        if (!/[.:]$/.test(t) || t.length < 80) opt = t
      }
    }
  }
  return { qs }
}

export function check(doc, file = '') {
  const { out, add } = collector(RULES)
  const F = { file }
  const { qs } = parse(doc)
  const exportYear = (() => { const m = /© Copyright EcoVadis (\d{4})/.exec(doc.text); const f = /(20\d{2})/.exec(file); return m ? +m[1] : f ? +f[1] : new Date().getFullYear() })()
  const docUse = new Map()
  const nonEn = [], other = [], internal = new Map()
  for (const q of qs) {
    if (!/^complete$/i.test(q.status) && !/^optional$/i.test(q.status)) add('EV-01', { ...F, page: q.page, ref: q.code, msg: `Status "${q.status}"`, text: q.text })
    for (const d of q.docs) {
      const ref = q.code
      if (!d.pages || !d.pages.trim()) add('EV-02', { ...F, page: d.page, ref, msg: `"${d.name}"`, text: d.opt })
      else {
        const pg = d.pages.replace(/\s/g, '')
        if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(pg)) add('EV-03', { ...F, page: d.page, ref, msg: `"${d.name}": pages "${d.pages}" not in the form 1-3,5` })
        else {
          let n = 0, bad = false
          for (const part of pg.split(',')) { const [a, b] = part.split('-').map(Number); if (b != null && b < a) bad = true; n += b != null ? Math.max(0, b - a + 1) : 1; if (a === 0) bad = true }
          if (bad) add('EV-03', { ...F, page: d.page, ref, msg: `"${d.name}": page range "${d.pages}" is reversed or starts at 0` })
          else if (n > 30) add('EV-03', { ...F, page: d.page, ref, msg: `"${d.name}": ${n} pages indicated ("${d.pages}") — point the analyst to the relevant pages`, text: d.opt })
        }
      }
      if (CJK.test(d.name) || nonLatinShare(d.comment) > 0.3) nonEn.push({ q, d })
      if (INTERNAL.test(d.name)) { if (!internal.has(d.name)) internal.set(d.name, { page: d.page, qs: new Set() }); internal.get(d.name).qs.add(ref) }
      if (/^other$/i.test(d.type)) other.push(q.code)
      const key = norm(d.name)
      if (!docUse.has(key)) docUse.set(key, { name: d.name, qs: new Set(), page: d.page })
      docUse.get(key).qs.add(q.code)
      const prevD = q.docs[q.docs.indexOf(d) - 1]
      if (prevD && norm(prevD.name) === key && (prevD.pages || '') === (d.pages || '')) add('EV-12', { ...F, page: d.page, ref, msg: `"${d.name}" pages ${d.pages || '—'}` })
      if (/\b(only|partial|part of|not (?:yet|all)|some of|sample|too many|太多|部分|抽样|尚未|暂无|未)\b|部分|抽样|尚未|暂无/i.test(d.comment)) add('EV-15', { ...F, page: d.page, ref, msg: `"${d.name}"`, text: d.comment })
    }
    for (const s of q.specify) if (/other/i.test(s.opt) && !s.val && q.docs.some(d => d.opt === s.opt)) add('EV-11', { ...F, page: s.page, ref: q.code, text: s.opt })
    for (const k of q.kpis) {
      const name = k.name || q.text
      if (!k.value) { add('EV-08', { ...F, sev: /^complete$/i.test(q.status) ? 'info' : 'error', page: k.page, ref: q.code, msg: `${clip(name, 90)} (${k.year})` + (/^complete$/i.test(q.status) ? ' — fine only if this option is not selected' : '') }); continue }
      if (k.target) { if (k.year <= exportYear) add('EV-10', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: target year ${k.year} is not after the export year ${exportYear}; EcoVadis needs a target still valid at assessment` }); continue }
      const v = parseFloat(k.value.replace(/,/g, ''))
      if (isNaN(v)) { add('EV-09', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: "${k.value}" is not a number` }); continue }
      if (v < 0) add('EV-09', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: negative value ${k.value}` })
      if (/percent|%/i.test(k.unit) && v > 100 && !/ratio/i.test(name)) add('EV-09', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: ${k.value} % is over 100` })
      if (/ratio/i.test(name) && /percent|%/i.test(k.unit)) add('EV-09', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: a ratio entered as ${k.value} ${k.unit} — check the unit (e.g. 19.69 : 1 vs 1969 %)` })
      if (/^number of (?!hours|days)/i.test(name) && !Number.isInteger(v)) add('EV-09', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: count with decimals (${k.value})` })
      if (k.year < exportYear - 2) add('EV-10', { ...F, page: k.page, ref: q.code, msg: `${clip(name, 90)}: ${k.year} (export ${exportYear})` })
    }
  }
  if (nonEn.length) add('EV-04', { ...F, page: nonEn[0].d.page, ref: [...new Set(nonEn.map(x => x.q.code))].slice(0, 15).join(', '), msg: `${nonEn.length} of ${qs.reduce((a, q) => a + q.docs.length, 0)} attached documents have non-English names or comments, e.g. "${nonEn[0].d.name}". EcoVadis accepts many languages, but an English title or summary page helps the analyst.` })
  for (const [n, u] of internal) add('EV-05', { ...F, page: u.page, ref: [...u.qs].join(', '), msg: `"${n}"` })
  if (other.length) add('EV-07', { ...F, msg: `${other.length} document(s) typed "Other"`, ref: [...new Set(other)].slice(0, 15).join(', ') })
  for (const [, u] of docUse) if (u.qs.size >= 5) add('EV-06', { ...F, page: u.page, ref: [...u.qs].join(', '), msg: `"${u.name}" is used for ${u.qs.size} questions` })
  const byTheme = {}
  for (const q of qs) { const k = q.theme || 'General'; byTheme[k] = byTheme[k] || { q: 0, d: 0 }; byTheme[k].q++; byTheme[k].d += q.docs.length }
  for (const [k, v] of Object.entries(byTheme)) if (v.q >= 4 && v.d < v.q / 2) add('EV-13', { ...F, msg: `${k}: ${v.d} document(s) for ${v.q} questions` })
  const seen = new Set()
  for (const p of doc.pages) for (const l of p.lines) { const m = PLACEHOLDER.exec(l.text); if (m && !seen.has(l.text)) { seen.add(l.text); add('EV-14', { ...F, page: p.n, msg: `"${m[0]}"`, text: l.text }) } }
  const scope = (/Assessment scope:\s*(.+)/.exec(doc.text) || [])[1] || ''
  return {
    R: { qs, scope, exportYear }, kind: 'ecovadis', findings: out, stats: { questions: qs.length, documents: qs.reduce((a, q) => a + q.docs.length, 0), kpis: qs.reduce((a, q) => a + q.kpis.length, 0) },
    meta: { type: 'EcoVadis questionnaire', title: scope || file, fields: [['Scope', scope], ['Questions', String(qs.length)], ['Complete', String(qs.filter(q => /^complete$/i.test(q.status)).length)], ['Documents', String(qs.reduce((a, q) => a + q.docs.length, 0))], ['KPI values', String(qs.reduce((a, q) => a + q.kpis.filter(k => k.value).length, 0))]].filter(f => f[1]) },
  }
}

export function detect(text) { return /EcoVadis/i.test(text) && /(GEN|LAB|ENV|SUP)\d{3}/.test(text) }

// ---- data extraction (Report data extractor page) ----
const F3 = a => a.map(([key, en, zh]) => ({ key, en, zh }))
export const EXTRACT = {
  report: F3([['scope', 'Assessment scope', '评估范围'], ['exportYear', 'Export year', '导出年份'], ['questions', 'Questions', '问题数'], ['complete', 'Complete', '已完成'], ['incomplete', 'Not complete', '未完成'],
    ['documents', 'Documents attached', '附件数'], ['kpis', 'KPI values', 'KPI 数值数'], ['targets', 'Targets', '目标数']]),
  rows: { en: 'KPI values', zh: 'KPI 数值', fields: F3([['code', 'Question', '问题'], ['theme', 'Theme', '主题'], ['kpi', 'KPI', '指标'], ['year', 'Year', '年份'], ['value', 'Value', '数值'], ['unit', 'Unit', '单位'], ['kind', 'Value or target', '数值/目标'], ['page', 'Page', '页']]) },
}
export function extract(R, file) {
  const qs = R?.qs || []
  const kp = qs.flatMap(q => q.kpis.filter(k => k.value).map(k => ({ q, k })))
  const report = { file, scope: R?.scope || '', exportYear: R?.exportYear || '', questions: qs.length, complete: qs.filter(q => /^complete$/i.test(q.status)).length,
    incomplete: qs.filter(q => !/^(complete|optional)$/i.test(q.status)).length, documents: qs.reduce((a, q) => a + q.docs.length, 0), kpis: kp.filter(x => !x.k.target).length, targets: kp.filter(x => x.k.target).length }
  // documents per theme as extra columns
  for (const q of qs) { const k = (q.theme || 'General') + ' – documents'; report[k] = (report[k] || 0) + q.docs.length }
  const rows = kp.map(({ q, k }) => ({ code: q.code, theme: q.theme, kpi: clip(k.name || q.text, 200), year: k.year, value: num(k.value) ?? k.value, unit: k.unit, kind: k.target ? 'Target' : 'Value', page: k.page }))
  return { report, rows }
}
