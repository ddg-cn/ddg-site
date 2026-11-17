// CDP corporate questionnaire response export checker (2024+ integrated questionnaire, PDF export of the response).
// Also recognises CDP score reports and summarises them.
import { cells, collector, clip, mdy, fmt, days, nonLatinShare, norm, PLACEHOLDER } from './common.js'

export const RULES = {
  'CDP-01': { sev: 'warning', en: 'Core question missing from the export (unanswered questions are left out)', zh: '导出文件缺少核心问题（未作答的问题不会导出）' },
  'CDP-02': { sev: 'error', en: '"Select from" list with nothing ticked', zh: '“Select from” 选项未勾选' },
  'CDP-03': { sev: 'warning', en: 'Field left blank', zh: '字段留空' },
  'CDP-04': { sev: 'warning', en: 'Reporting year or base year dates inconsistent', zh: '报告年度或基准年日期不一致' },
  'CDP-05': { sev: 'error', en: 'Emissions breakdown does not add up to the reported total', zh: '排放细分加总与报告总量不一致' },
  'CDP-06': { sev: 'warning', en: 'Year-on-year change (7.10.1): percentages imply different previous-year totals', zh: '同比变化（7.10.1）：各项百分比推算出的上年总量不一致' },
  'CDP-07': { sev: 'error', en: 'Target base-year figures do not add up', zh: '目标基准年数据加总不一致' },
  'CDP-08': { sev: 'error', en: 'Date after the reporting year or after the export date (e.g. target set after the year it was "active")', zh: '日期晚于报告年度或导出日期（如目标设定日期晚于其“生效”年度）' },
  'CDP-09': { sev: 'warning', en: '"Same as above" style answer (each answer is scored on its own)', zh: '“同上”式回答（每个回答单独评分）' },
  'CDP-10': { sev: 'error', en: 'Verification status and verification details disagree', zh: '核查状态与核查详情不一致' },
  'CDP-11': { sev: 'error', en: 'Percentage outside 0–100', zh: '百分比超出 0–100' },
  'CDP-12': { sev: 'warning', en: 'Response language (1.1) does not match the text', zh: '回答语言（1.1）与正文不符' },
  'CDP-13': { sev: 'warning', en: 'Malformed year or number in text (e.g. "204年")', zh: '正文中年份或数字格式错误（如“204年”）' },
  'CDP-14': { sev: 'warning', en: 'Scope 3 category: status and value/explanation disagree', zh: '范围三类别：状态与数值/解释不一致' },
  'CDP-15': { sev: 'info', en: 'Same long text pasted in three or more answers', zh: '同一段长文本粘贴在三个及以上回答中' },
  'CDP-16': { sev: 'error', en: 'Sign-off (13.3) missing job title or category', zh: '签核（13.3）缺少职位或类别' },
  'CDP-17': { sev: 'info', en: 'Target base year differs from the base year in 7.5', zh: '目标基准年与 7.5 的基准年不同' },
  'CDP-18': { sev: 'info', en: 'CDP score report (not a questionnaire response)', zh: 'CDP 评分报告（不是问卷回答）' },
  'CDP-19': { sev: 'warning', en: 'Placeholder or unfinished text', zh: '占位符或未完成的文字' },
}

const CORE = { '1.1': 1, '1.2': 1, '1.3': 1, '1.4': 2, '1.5': 1, '1.7': 1, '2.1': 1, '2.2': 1, '2.2.1': 1, '2.2.2': 1, '2.4': 1, '3.1': 1, '3.6': 1, '4.1': 1, '4.1.1': 1, '4.2': 1, '4.3': 1, '4.6': 1, '5.1': 1, '5.2': 1, '5.10': 1, '5.11': 1, '6.1': 1, '7.1': 1, '7.3': 1, '7.5': 2, '7.6': 2, '7.7': 2, '7.8': 2, '7.9': 2, '7.10': 1, '7.30': 1, '7.45': 1, '7.53': 1, '7.54': 1, '7.55': 1, '13.3': 2 }
const NUM = /^-?\d[\d,]*(\.\d+)?$/
const toNum = s => parseFloat(String(s).replace(/,/g, ''))

function parse(doc) {
  const lines = []
  for (const p of doc.pages) for (const l of p.lines) {
    if (l.items.length === 1 && /^\d+$/.test(l.text) && (l.y > p.height - 60 || (l.y < 40 && Math.abs(+l.text - p.n) <= 2))) continue
    lines.push(l)
  }
  const start = lines.findIndex(l => /^\(1\.1\)/.test(l.text) && !/\.{5,}/.test(l.text))
  const toc = new Set()
  for (const l of lines.slice(0, start > 0 ? start : 0)) { const m = /^\((\d+(?:\.\d+)+)\)/.exec(l.text); if (m) toc.add(m[1]) }
  const nodes = []
  let cur = null, rowLabel = ''
  for (const l of lines.slice(Math.max(0, start))) {
    const m = /^\((\d+(?:\.\d+)+)\)\s*(.*)$/.exec(l.text)
    if (m) { cur = { id: m[1], label: m[2], lines: [], page: l.page, row: rowLabel }; nodes.push(cur); continue }
    if (/^C\d+\.\s/.test(l.text)) { cur = null; continue }
    if (!cur) continue
    if (/^\[(Fixed|Add) row\]$/.test(l.text)) { cur.end = true; rowLabel = ''; continue }
    if (/^Row \d+$/.test(l.text)) { rowLabel = l.text; cur.end = true; continue }
    cur.lines.push(l)
  }
  // a node's own content = lines up to the first line that looks like a row label for the next field;
  for (const n of nodes) {
    n.sel = n.lines.filter(l => /^☑/.test(l.text) || cells(l).some(c => /^☑/.test(c.text))).flatMap(l => cells(l).filter(c => /^☑/.test(c.text)).map(c => c.text.replace(/^☑\s*/, '')))
    n.selectFrom = n.lines.filter(l => /Select from:|Select all that apply/.test(l.text)).length
    n.nums = n.lines.flatMap(l => cells(l, 14)).map(c => c.text).filter(t => NUM.test(t)).map(toNum)
    n.text = n.lines.map(l => l.text).join(' ')
  }
  const exportDate = mdy((doc.pages[0]?.lines || []).map(l => l.text).join(' '))
  const org = ((doc.pages[0]?.lines || []).find(l => !/^\d{1,2}\/\d{1,2}\/\d{4}|CDP Corporate Questionnaire|Word version|^Important|^This document|^been requested|^submission|^Read full|^\.$/i.test(l.text)) || {}).text || ''
  return { nodes, toc, exportDate, org }
}

export function check(doc, file = '') {
  const { out, add } = collector(RULES)
  const F = { file }
  if (/CDP SCORE REPORT/i.test(doc.text)) return scoreReport(doc, file)
  const { nodes, toc, exportDate, org } = parse(doc)
  const byId = id => nodes.filter(n => n.id === id)
  const first = id => byId(id)[0]
  const v1 = id => { const n = first(id); return n && n.nums.length ? n.nums[n.nums.length - 1] : null }
  const sumOf = id => byId(id).reduce((a, n) => a + (n.nums.length ? n.nums[n.nums.length - 1] : 0), 0)
  const present = new Set([...toc, ...nodes.map(n => n.id)])
  const qPresent = id => present.has(id)
  // CDP-01 core questions
  const missCore = Object.keys(CORE).filter(id => !qPresent(id))
  const hard = missCore.filter(id => CORE[id] === 2), soft = missCore.filter(id => CORE[id] === 1)
  if (hard.length) add('CDP-01', { ...F, sev: 'error', ref: hard.join(', '), msg: 'Key emissions/sign-off questions not in the export: ' + hard.join(', ') })
  if (soft.length) add('CDP-01', { ...F, ref: soft.join(', '), msg: 'Core questions not in the export: ' + soft.join(', ') })
  const hasWater = [...present].some(id => id.startsWith('9.'))
  if (hasWater) { const w = ['9.1', '9.2', '9.2.2', '9.15'].filter(id => !qPresent(id)); if (w.length) add('CDP-01', { ...F, ref: w.join(', '), msg: 'Water questions not in the export: ' + w.join(', ') }) }
  // CDP-02 select-from with nothing ticked; CDP-03 blank sibling fields
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], next = nodes[i + 1]
    if (n.selectFrom && !n.sel.length) add('CDP-02', { ...F, page: n.page, ref: n.id, msg: clip(n.label, 110), text: n.row })
    const depth = n.id.split('.').length
    const sib = next && next.id.split('.').length === depth && next.id.split('.').slice(0, -1).join('.') === n.id.split('.').slice(0, -1).join('.') && depth >= 3
    if (sib && !n.lines.length && !n.end) add('CDP-03', { ...F, page: n.page, ref: n.id, msg: clip(n.label, 120), text: n.row })
  }
  // CDP-04 dates
  const n14 = first('1.4')
  const endDate = n14 ? mdy(n14.text) : null
  if (endDate) {
    const nextDay = new Date(endDate.getTime() + 86400000)
    if (nextDay.getUTCDate() !== 1) add('CDP-04', { ...F, page: n14.page, ref: '1.4', msg: `Reporting year ends ${fmt(endDate)}, not on a month end — check (e.g. 12/31)` })
  }
  const by = byId('7.5.1').map(n => ({ n, d: mdy(n.text) })).filter(x => x.d)
  if (by.length) {
    const s3 = by.filter(x => /Scope 3/i.test(x.n.row) || /category/i.test(nodes[nodes.indexOf(x.n) - 1]?.lines.slice(-1)[0]?.text || ''))
    const distinct = [...new Set(by.map(x => fmt(x.d)))]
    if (distinct.length > 2) add('CDP-04', { ...F, sev: 'info', page: by[0].n.page, ref: '7.5', msg: `Base year end dates used in 7.5: ${distinct.join(', ')} — make sure each differs on purpose` })
    if (endDate) for (const d of distinct) { const x = new Date(d); if (x.getUTCMonth() !== endDate.getUTCMonth() || x.getUTCDate() !== endDate.getUTCDate()) { add('CDP-04', { ...F, page: by[0].n.page, ref: '7.5', msg: `Base year end ${d} does not fall on the same day as the reporting year end (${fmt(endDate)})` }); break } }
    const tb = byId('7.53.1.11').map(n => mdy(n.text)).filter(Boolean)
    for (const d of tb) if (!distinct.includes(fmt(d))) add('CDP-17', { ...F, page: first('7.53.1.11').page, ref: '7.53.1.11', msg: `Target base year ends ${fmt(d)}; 7.5 base years: ${distinct.join(', ')}` })
  }
  // CDP-08 dates after reporting year / export
  for (const n of nodes.filter(n => /^Date target was set/i.test(n.label))) {
    const d = mdy(n.text)
    if (d && endDate && d > endDate) add('CDP-08', { ...F, page: n.page, ref: n.id, msg: `Target set on ${fmt(d)}, after the reporting year ended (${fmt(endDate)}) — it cannot have been active in the reporting year`, text: n.row })
  }
  if (exportDate) for (const n of nodes) { const d = mdy(n.text); if (d && d > exportDate && !/target year|end date of target|target date|year of target/i.test(n.label)) add('CDP-08', { ...F, sev: 'warning', page: n.page, ref: n.id, msg: `Date ${fmt(d)} is after the export date ${fmt(exportDate)}`, text: n.label }) }
  // CDP-05 breakdowns
  const tol = (a, b) => Math.abs(a - b) > Math.max(1, Math.abs(b) * 0.005)
  const s1 = v1('7.6.1'), s2l = v1('7.7.1'), s2m = v1('7.7.2')
  const chk = (label, sum, total, id, page) => { if (sum != null && total != null && sum > 0 && tol(sum, total)) add('CDP-05', { ...F, page, ref: id, msg: `${label}: breakdown adds up to ${round(sum)}, total reported ${round(total)} (${pct(sum, total)})` }) }
  if (s1 != null) {
    if (byId('7.15.1.2').length) chk('Scope 1 by gas (7.15.1)', sumOf('7.15.1.2'), s1, '7.15.1', first('7.15.1.2').page)
    if (byId('7.17.1.2').length) chk('Scope 1 by business division (7.17.1)', sumOf('7.17.1.2'), s1, '7.17.1', first('7.17.1.2').page)
    if (byId('7.17.2.2').length) chk('Scope 1 by facility (7.17.2)', sumOf('7.17.2.2'), s1, '7.17.2', first('7.17.2.2').page)
    if (byId('7.17.3.2').length) chk('Scope 1 by activity (7.17.3)', sumOf('7.17.3.2'), s1, '7.17.3', first('7.17.3.2').page)
    if (byId('7.23.1.12').length) chk('Scope 1 by subsidiary (7.23.1)', sumOf('7.23.1.12'), s1, '7.23.1', first('7.23.1.12').page)
    if (byId('7.22.1').length) chk('Scope 1 consolidated + other (7.22)', sumOf('7.22.1'), s1, '7.22', first('7.22.1').page)
  }
  if (s2l != null) {
    for (const [id, lab] of [['7.20.1.2', 'Scope 2 LB by division (7.20.1)'], ['7.20.2.2', 'Scope 2 LB by facility (7.20.2)'], ['7.20.3.2', 'Scope 2 LB by activity (7.20.3)'], ['7.23.1.13', 'Scope 2 LB by subsidiary (7.23.1)'], ['7.22.2', 'Scope 2 LB consolidated + other (7.22)']]) if (byId(id).length) chk(lab, sumOf(id), s2l, id, first(id).page)
  }
  if (s2m != null) {
    for (const [id, lab] of [['7.20.1.3', 'Scope 2 MB by division (7.20.1)'], ['7.20.2.3', 'Scope 2 MB by facility (7.20.2)'], ['7.20.3.3', 'Scope 2 MB by activity (7.20.3)'], ['7.23.1.14', 'Scope 2 MB by subsidiary (7.23.1)'], ['7.22.3', 'Scope 2 MB consolidated + other (7.22)']]) if (byId(id).length) chk(lab, sumOf(id), s2m, id, first(id).page)
  }
  const c16 = first('7.16')
  if (c16) {
    const rows = c16.lines.map(l => cells(l, 14)).filter(cs => cs.length >= 2 && cs.slice(1).every(c => NUM.test(c.text)))
    const col = k => rows.reduce((a, cs) => a + (cs[k] ? toNum(cs[k].text) : 0), 0)
    if (rows.length) { chk('Scope 1 by country (7.16)', col(1), s1, '7.16', c16.page); if (rows[0].length > 2) chk('Scope 2 LB by country (7.16)', col(2), s2l, '7.16', c16.page); if (rows[0].length > 3) chk('Scope 2 MB by country (7.16)', col(3), s2m, '7.16', c16.page) }
  }
  // CDP-06 7.10.1 implied previous-year totals
  const ch = byId('7.10.1.1'), pc = byId('7.10.1.3')
  const implied = []
  for (let i = 0; i < Math.min(ch.length, pc.length); i++) {
    const a = ch[i].nums.slice(-1)[0], p = pc[i].nums.slice(-1)[0]
    if (a > 0 && p >= 1) implied.push({ base: a / p * 100, a, p, page: ch[i].page })
  }
  if (implied.length >= 2) {
    const bs = implied.map(x => x.base), mn = Math.min(...bs), mx = Math.max(...bs)
    if (mx / mn > 1.05) add('CDP-06', { ...F, page: implied[0].page, ref: '7.10.1', msg: 'Implied previous-year Scope 1+2 totals: ' + implied.map(x => `${round(x.a)} / ${x.p} % → ${round(x.base)}`).join('; ') })
  }
  // CDP-07 target sums
  for (const row of rowsOf(nodes, '7.53.1')) {
    const g = id => { const n = row.find(n => n.id === id); return n && n.nums.length ? n.nums.slice(-1)[0] : null }
    const cats = row.filter(n => { const k = +n.id.split('.')[3]; return k >= 14 && k <= 30 && /emissions covered by target \(metric/i.test(n.label + ' ' + n.text) }).map(n => n.nums.slice(-1)[0]).filter(v => v != null)
    const t3 = g('7.53.1.31'), tAll = g('7.53.1.32'), b1 = g('7.53.1.12'), b2 = g('7.53.1.13')
    const p = row[0]?.page
    if (t3 != null && cats.length && tol(cats.reduce((a, b) => a + b, 0), t3)) add('CDP-07', { ...F, page: p, ref: '7.53.1.31', msg: `Scope 3 categories add up to ${round(cats.reduce((a, b) => a + b, 0))}, total ${round(t3)}` })
    if (tAll != null) { const s = (b1 || 0) + (b2 || 0) + (t3 || 0); if (s > 0 && tol(s, tAll)) add('CDP-07', { ...F, page: p, ref: '7.53.1.32', msg: `Scope 1 + 2 + 3 = ${round(s)}, total ${round(tAll)}` }) }
  }
  // CDP-09 same as above; CDP-13 malformed year; CDP-15 duplicates; CDP-11 percentages
  const same = [], dup = new Map()
  for (const n of nodes) {
    const t = n.text.trim()
    if (/^(同上|同前|见上|参见上文|如上|same as above|see above|refer to (?:the )?above|as above|ditto)[。.]?(\s|$)/i.test(t) && t.length < 120 || /^1、前\d条同上/.test(t)) same.push(n)
    for (const m of t.matchAll(/(?<![\d.])(\d{3}|\d{5})年/g)) if (!/^\d{5}$/.test(m[1]) || +m[1] > 30000) add('CDP-13', { ...F, page: n.page, ref: n.id, msg: `"${m[0]}"`, text: t.slice(Math.max(0, m.index - 40), m.index + 40) })
    if (/%|percentage|proportion/i.test(n.label) && !/change|direction|increase|decrease|achieved|intensity/i.test(n.label)) for (const v of n.nums) if (v > 100 || v < 0) { add('CDP-11', { ...F, page: n.page, ref: n.id, msg: `${v} in "${clip(n.label, 90)}"` }); break }
    if (t.length > 120 && !/^[\d,.\s]+$/.test(t)) { const k = norm(t); if (!dup.has(k)) dup.set(k, []); dup.get(k).push(n) }
    const ph = PLACEHOLDER.exec(t); if (ph) add('CDP-19', { ...F, page: n.page, ref: n.id, msg: `"${ph[0]}"` })
  }
  if (same.length) add('CDP-09', { ...F, page: same[0].page, ref: same.map(n => n.id).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20).join(', '), msg: `${same.length} answer(s) only say "same as above" (e.g. ${same[0].id})` })
  for (const [, ns] of dup) if (ns.length >= 3) add('CDP-15', { ...F, page: ns[0].page, ref: [...new Set(ns.map(n => n.id))].join(', '), text: ns[0].text })
  // CDP-10 verification
  const n79 = first('7.9')
  if (n79) {
    const t = n79.text
    const ver = s => new RegExp(s + '[^☑]*☑\\s*Third-party verification', 'i').test(t)
    for (const [s, id] of [['Scope 1', '7.9.1'], ['Scope 2', '7.9.2'], ['Scope 3', '7.9.3']]) if (ver(s) && !qPresent(id)) add('CDP-10', { ...F, page: n79.page, ref: id, msg: `7.9 says ${s} is verified, but ${id} is missing` })
    for (const id of ['7.9.1', '7.9.2', '7.9.3']) {
      for (const n of byId(id + '.4').concat(byId(id + '.5'))) if (/attach/i.test(n.label) && !n.lines.length) add('CDP-10', { ...F, page: n.page, ref: n.id, msg: 'No verification statement attached' })
      const pn = id === '7.9.2' ? '.8' : '.7'
      for (const n of byId(id + pn)) for (const v of n.nums) if (v > 100 || v <= 0) add('CDP-10', { ...F, page: n.page, ref: n.id, msg: `Proportion verified ${v} %` })
    }
  }
  // CDP-12 language
  const lang = first('1.1')?.sel[0] || ''
  const body = nodes.map(n => n.text).join(' ')
  const share = nonLatinShare(body)
  if (/english/i.test(lang) && share > 0.15) add('CDP-12', { ...F, page: first('1.1').page, ref: '1.1', msg: `Language "English", but ${Math.round(share * 100)} % of the text is CJK` })
  // CDP-14 scope 3 categories
  for (const n of byId('7.8.1')) {
    const st = n.sel[0] || ''
    const i = nodes.indexOf(n)
    const sibs = []
    for (let j = i + 1; j < nodes.length && nodes[j].id.startsWith('7.8.') && nodes[j].id !== '7.8.1'; j++) sibs.push(nodes[j])
    const em = sibs.find(x => x.id === '7.8.2')
    const ex = sibs.find(x => /explanation|explain/i.test(x.label))
    if (/^Relevant, calculated/i.test(st) && (!em || !em.nums.length)) add('CDP-14', { ...F, page: n.page, ref: '7.8', msg: `"${st}" without emissions`, text: n.row || nodes[i - 1]?.lines.slice(-1)[0]?.text || '' })
    if (/^Not relevant|not yet calculated|not evaluated/i.test(st) && ex && ex.text.trim().length < 15) add('CDP-14', { ...F, page: n.page, ref: '7.8', msg: `"${st}" without an explanation` })
  }
  // CDP-16 sign-off
  if (qPresent('13.3')) { const t = first('13.3.1'), c = first('13.3.2'); if (!t || !t.text.trim() || !c || !c.sel.length) add('CDP-16', { ...F, page: (t || c || first('13.3') || {}).page, ref: '13.3' }) }
  const revenue = v1('1.4.1')
  return {
    R: { nodes, org, exportDate, endDate, revenue, s1, s2l, s2m, lang },
    kind: 'cdp', findings: out, stats: { questions: nodes.filter(n => n.id.split('.').length <= 3).length, fields: nodes.length },
    meta: { type: 'CDP questionnaire response', title: org || file, fields: [['Organisation', org], ['Exported', exportDate ? fmt(exportDate) : ''], ['Language', lang], ['Reporting year end', endDate ? fmt(endDate) : ''], ['Revenue (1.4.1)', revenue != null ? revenue.toLocaleString('en') : ''], ['Scope 1', s1 != null ? round(s1) : ''], ['Scope 2 (LB / MB)', s2l != null ? `${round(s2l)} / ${round(s2m)}` : ''], ['Questions in export', String(toc.size || '')]].filter(f => f[1]) },
  }
}

function rowsOf(nodes, qid) {
  const rows = []
  let cur = null
  for (const n of nodes) {
    if (!n.id.startsWith(qid + '.')) { if (cur) { rows.push(cur); cur = null } continue }
    if (n.id === qid + '.1') { if (cur) rows.push(cur); cur = [] }
    if (cur) cur.push(n)
  }
  if (cur) rows.push(cur)
  return rows
}
const round = v => (Math.round(v * 100) / 100).toLocaleString('en')
const pct = (a, b) => b ? ((a - b) / b * 100).toFixed(1) + ' %' : ''

function scoreReport(doc, file) {
  const { out, add } = collector(RULES)
  const t = doc.text.replace(/\s+/g, ' ')
  const theme = (/CDP SCORE REPORT - ([A-Z ]+?) (\d{4})/.exec(t) || [])
  const m = /(\S.*?) received an? ([A-D]-?|F) which is in the (\w+) band/.exec(t)
  const reg = /same as the|(higher|lower) than the/.exec(t)
  add('CDP-18', { file, page: 1, msg: `${theme[1] || 'CDP'} ${theme[2] || ''}: score ${m ? m[2] : '?'}${m ? ' (' + m[3] + ' band)' : ''}. This is CDP's score report, so there is nothing to check before submission; drop the questionnaire response export (PDF) to check your answers.`, text: (/received an? .*?sector average of [A-D]-?\./.exec(t) || [''])[0] })
  const om = /(?:CDP SCORE REPORT - [A-Z ]+? \d{4}|UNDERSTANDING YOUR SCORE REPORT) ([^.]{1,80}?) received an? /.exec(t)
  const sec = (/sector average of ([A-D]-?|F)\b/.exec(t) || [])[1] || ''
  return { R: { scoreReport: true, org: om ? om[1] : '', theme: theme[1] || '', year: theme[2] || '', score: m ? m[2] : '', band: m ? m[3] : '', sector: sec }, kind: 'cdp', findings: out, stats: {}, meta: { type: 'CDP score report', title: (m && m[1]) || file, fields: [['Theme', theme[1] || ''], ['Year', theme[2] || ''], ['Score', m ? m[2] : ''], ['Band', m ? m[3] : '']].filter(f => f[1]) } }
}

export function detect(text) { return /CDP (Corporate Questionnaire|SCORE REPORT)/i.test(text) }

// ---- data extraction (Report data extractor page) ----
const F3 = a => a.map(([key, en, zh]) => ({ key, en, zh }))
export const EXTRACT = {
  report: F3([['org', 'Organisation', '组织'], ['reportKind', 'Document', '文件类型'], ['theme', 'Score theme', '评分主题'], ['year', 'Score year', '评分年份'], ['score', 'Score', '得分'], ['band', 'Band', '等级段'], ['sectorAvg', 'Sector average', '行业平均'], ['exported', 'Exported', '导出日期'], ['language', 'Language', '语言'], ['currency', 'Currency', '货币'], ['orgType', 'Organisation type', '组织类型'],
    ['revenue', 'Revenue (1.4.1)', '营业收入 (1.4.1)'], ['countries', 'Countries / areas (1.7)', '运营国家/地区 (1.7)'], ['yearEnd', 'Reporting year end', '报告年度结束日'],
    ['scope1', 'Scope 1 (t CO2e)', '范围一 (t CO2e)'], ['scope2lb', 'Scope 2 location-based', '范围二 基于位置'], ['scope2mb', 'Scope 2 market-based', '范围二 基于市场'],
    ['scope3', 'Scope 3 total of 7.8 (t CO2e)', '范围三 7.8 合计 (t CO2e)'], ['s3calc', 'Scope 3 categories calculated', '已计算的范围三类别数'], ['s3notRel', 'Scope 3 categories not relevant', '不相关的范围三类别数'],
    ['absTargets', 'Absolute targets', '绝对目标数'], ['intTargets', 'Intensity targets', '强度目标数'], ['sbt', 'Science-based target (first answer)', '科学碳目标（首个回答）'],
    ['envPolicy', 'Environmental policy (4.6)', '环境政策 (4.6)'], ['firstYear', 'First year reporting (7.1)', '首次报告 (7.1)'], ['questions', 'Questions in export', '导出的问题数']]),
  rows: { en: 'Emission targets (7.53)', zh: '减排目标 (7.53)', fields: F3([['type', 'Type', '类型'], ['ref', 'Target ref.', '目标编号'], ['sbt', 'Science-based', '科学碳目标'], ['ambition', 'Ambition', '雄心水平'], ['set', 'Date set', '设定日期'],
    ['coverage', 'Coverage', '覆盖范围'], ['scopes', 'Scopes', '范围'], ['s2method', 'Scope 2 method', '范围二方法'], ['baseEnd', 'Base year end', '基准年结束日'], ['targetEnd', 'Target end date', '目标结束日'],
    ['reduction', 'Targeted reduction (%)', '目标减排比例 (%)'], ['achieved', '% achieved', '完成比例 (%)'], ['status', 'Status', '状态'], ['page', 'Page', '页']]) },
}
export function extract(R, file) {
  if (R && R.scoreReport) return { report: { file, org: R.org, reportKind: 'Score report', theme: R.theme, year: R.year, score: R.score, band: R.band, sectorAvg: R.sector }, rows: [] }
  if (!R || !R.nodes) return { report: { file }, rows: [] }
  const N = R.nodes, first = id => N.find(n => n.id === id)
  const sel = id => (first(id)?.sel || []).join('; ')
  const s3 = N.filter(n => n.id === '7.8.1')
  let s3sum = 0, s3n = 0
  for (let i = 0; i < N.length; i++) if (N[i].id === '7.8.2' && N[i].nums.length) { s3sum += N[i].nums[N[i].nums.length - 1]; s3n++ }
  // targets: group 7.53.1.* (absolute) and 7.53.2.* (intensity) by row label
  const groups = new Map()
  for (const n of N) {
    const m = /^7\.53\.([12])\.\d+$/.exec(n.id); if (!m) continue
    const k = m[1] + '|' + (n.row || 'Row 1')
    if (!groups.has(k)) groups.set(k, { type: m[1] === '1' ? 'Absolute' : 'Intensity', nodes: [] })
    groups.get(k).nodes.push(n)
  }
  const rows = []
  for (const g of groups.values()) {
    const by = re => g.nodes.find(n => re.test(n.label))
    const v = re => { const n = by(re); return n ? (n.sel.length ? n.sel.join('; ') : n.text.trim()) : '' }
    const d = re => { const n = by(re); const x = n && mdy(n.text); return x ? fmt(x) : '' }
    const nv = re => { const n = by(re); return n && n.nums.length ? n.nums[n.nums.length - 1] : '' }
    rows.push({ type: g.type, ref: v(/^Target reference number/), sbt: v(/^Is this a science-based target/), ambition: v(/^Target ambition/), set: d(/^Date target was set/), coverage: v(/^Target coverage/),
      scopes: v(/^Scopes$/), s2method: v(/^Scope 2 accounting method/), baseEnd: d(/^End date of base year/), targetEnd: d(/^End date of target/), reduction: nv(/^Targeted reduction from base year/),
      achieved: nv(/^% of target achieved/), status: v(/^Target status/), page: g.nodes[0].page })
  }
  const r2 = x => x == null ? '' : Math.round(x * 100) / 100
  const report = {
    file, org: R.org || '', reportKind: 'Questionnaire response', exported: R.exportDate ? fmt(R.exportDate) : '', language: R.lang || '', currency: sel('1.2'), orgType: sel('1.3.2'),
    revenue: R.revenue ?? '', countries: sel('1.7'), yearEnd: R.endDate ? fmt(R.endDate) : '',
    scope1: r2(R.s1), scope2lb: r2(R.s2l), scope2mb: r2(R.s2m), scope3: s3n ? r2(s3sum) : '',
    s3calc: s3.length ? s3.filter(n => /^Relevant, calculated/i.test(n.sel[0] || '')).length : '', s3notRel: s3.length ? s3.filter(n => /^Not relevant/i.test(n.sel[0] || '')).length : '',
    absTargets: rows.filter(r => r.type === 'Absolute').length, intTargets: rows.filter(r => r.type === 'Intensity').length, sbt: rows[0]?.sbt || '',
    envPolicy: sel('4.6'), firstYear: sel('7.1'), questions: new Set(N.map(n => n.id.split('.').slice(0, 2).join('.'))).size,
  }
  return { report, rows }
}
