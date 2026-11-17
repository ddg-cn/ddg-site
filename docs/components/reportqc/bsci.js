// amfori BSCI audit report checker (PDF extracts from the amfori / BSCI platforms).
// Templates handled:
//   v1 – BSCI platform audit report extract (BSCI 2.0, "Producer / DBID / Audit Id", Finding Report per PA,
//        follow-up audits list the previous full audit too)
//   v2 – amfori Sustainability Platform "Monitoring result for …" (2021 layout, findings as paragraphs)
//   v3 – amfori Sustainability Platform "Monitoring summary report for …" (2023 layout, findings per question)
// All three use the 13 Performance Areas rated A–E. Other layouts are read generically (PA lines, metrics).
import { cells, collector, clip, dmy, textDates, fmt, days, num, negativeHits, PLACEHOLDER, norm } from './common.js'

export const RULES = {
  'BSCI-01': { sev: 'error', en: 'Key audit or site field missing (IDs, site, address, dates, audit company, auditors, ratings)', zh: '关键审核或工厂字段缺失（编号、工厂、地址、日期、审核机构、审核员、评级）' },
  'BSCI-02': { sev: 'error', en: 'Audit dates out of order, in the future, or inconsistent within the report', zh: '审核日期顺序错误、在未来，或报告内前后不一致' },
  'BSCI-03': { sev: 'warning', en: 'Expiry / follow-up date does not fit the rating (A/B: 2 years; C/D/E: 12 months, follow-up 2–12 months after the full audit)', zh: '有效期/跟进日期与评级不符（A/B：2 年；C/D/E：12 个月，跟进审核在全面审核后 2–12 个月内）' },
  'BSCI-04': { sev: 'info', en: 'Report submitted more than 15 calendar days after the last audit day', zh: '报告在最后审核日后超过 15 个日历日才提交' },
  'BSCI-05': { sev: 'warning', en: 'Overall rating does not follow from the Performance Area ratings', zh: '总体评级与各绩效领域评级的推导结果不符' },
  'BSCI-06': { sev: 'error', en: 'Ratings differ between parts of the report (rating table, PA headings, summary table)', zh: '报告各部分的评级不一致（评级表、绩效领域标题、汇总表）' },
  'BSCI-07': { sev: 'error', en: 'Performance Area rated B–E but no open finding is reported for it', zh: '绩效领域评为 B–E，但没有列出任何未关闭的发现' },
  'BSCI-08': { sev: 'warning', en: 'Summary list of areas / questions with findings does not match the findings section', zh: '摘要中列出的有发现的领域/问题与发现部分不一致' },
  'BSCI-09': { sev: 'warning', en: 'Finding cites a question number that differs from its heading or belongs to another Performance Area', zh: '发现引用的问题编号与标题不符或属于其他绩效领域' },
  'BSCI-10': { sev: 'warning', en: 'Finding without a description of what was found', zh: '发现缺少具体情况描述' },
  'BSCI-11': { sev: 'error', en: 'Finding claims a breach of law but cites no law, rule or section', zh: '发现声称违反法律，但未引用任何法律、条例或条款' },
  'BSCI-12': { sev: 'error', en: 'Worker numbers do not add up or differ between the metrics and the description', zh: '工人数据加总不一致，或指标与描述不符' },
  'BSCI-13': { sev: 'error', en: 'Sample arithmetic: "X out of Y" with X > Y, or a percentage that does not match X/Y', zh: '抽样计算：“X out of Y”中 X > Y，或百分比与 X/Y 不符' },
  'BSCI-14': { sev: 'error', en: 'Lowest wage below the legal minimum wage without a wage finding', zh: '最低工资低于法定最低工资，但没有相应的工资发现' },
  'BSCI-15': { sev: 'warning', en: 'Weekly hours over 60 described while Decent Working Hours has no finding', zh: '描述了每周超过 60 小时，但“体面工时”没有发现' },
  'BSCI-16': { sev: 'warning', en: 'Area described as compliant, but the text describes a gap', zh: '领域被描述为符合，但文字描述了缺陷' },
  'BSCI-17': { sev: 'warning', en: 'Placeholder, blank or unfinished text', zh: '占位符、空白或未完成的文字' },
  'BSCI-18': { sev: 'warning', en: 'Sentence pasted twice in a row', zh: '同一句话连续重复粘贴' },
  'BSCI-19': { sev: 'warning', en: 'Spelling error from the common-typo list', zh: '常见拼写错误' },
  'BSCI-20': { sev: 'warning', en: 'Zero-tolerance issue mentioned in the report', zh: '报告中提到零容忍问题' },
  'BSCI-21': { sev: 'info', en: 'Finding on a CRUCIAL question', zh: '关键（CRUCIAL）问题存在发现' },
  'BSCI-22': { sev: 'warning', en: 'Audit description (days, dates, man-days) disagrees with the header', zh: '审核描述（天数、日期、人天）与报告抬头不一致' },
  'BSCI-23': { sev: 'error', en: 'Same site in two reports with different facility data or worker numbers', zh: '同一工厂在两份报告中的工厂信息或工人数量不一致' },
  'BSCI-24': { sev: 'info', en: 'Rating changes between audits of the same site', zh: '同一工厂不同审核之间的评级变化' },
}

// Performance Areas of the amfori BSCI Code of Conduct (13 PAs)
export const PA_NAMES = ['Social Management System', 'Workers Involvement and Protection', 'Freedom of Association and Collective Bargaining', 'No Discrimination', 'Fair Remuneration', 'Decent Working Hours', 'Occupational Health and Safety', 'No Child Labour', 'Special Protection for Young Workers', 'No Precarious Employment', 'No Bonded Labour', 'Protection of the Environment', 'Ethical Business Behaviour']
const PA_KEYS = [/social management/i, /workers?['’]? involvement/i, /freedom of association|collective bargaining/i, /discrimination/i, /remuneration/i, /working hours?/i, /health (?:and|&) safety/i, /child labou?r/i, /young workers/i, /precarious/i, /bonded/i, /environment/i, /ethical business/i]

const TYPOS = { complaince: 'compliance', recieve: 'receive', recieved: 'received', occured: 'occurred', accomodation: 'accommodation', interferance: 'interference', seperate: 'separate', seperated: 'separated', managment: 'management', enviroment: 'environment', goverment: 'government', trainning: 'training', sufficent: 'sufficient', procces: 'process', emergancy: 'emergency', maintainance: 'maintenance', adequete: 'adequate', responsibilty: 'responsibility', worksers: 'workers', wokers: 'workers', auditted: 'audited', publically: 'publicly', refered: 'referred', recrutiment: 'recruitment', recuritment: 'recruitment', insurace: 'insurance', ovetime: 'overtime', overtme: 'overtime', calender: 'calendar', definately: 'definitely', untill: 'until', reciept: 'receipt', neccessary: 'necessary', necessery: 'necessary', certifcate: 'certificate', acheive: 'achieve', wich: 'which', wether: 'whether', thier: 'their', teh: 'the', evacaution: 'evacuation', dinning: 'dining', equipments: 'equipment', labours: 'labour', segrigation: 'segregation', fullfill: 'fulfil', fulfils_: null, commited: 'committed', grievence: 'grievance', greivance: 'grievance', licence_: null, liscense: 'license', lisence: 'license', seperately: 'separately', concern_: null, ware: null }

const BN = /[ঀ-৿]/g
// The 2018 platform extract maps some punctuation to Bengali glyphs (ী = comma, ন…য = brackets, ্ = apostrophe).
function fixLine(s) { return s.replace(/ী/g, ',').replace(/ন/g, '(').replace(/য/g, ')').replace(/্/g, "'").replace(BN, '') }
function prep(doc) {
  const pages = doc.pages.map(p => {
    const lines = []
    for (const l of p.lines) {
      const bn = (l.text.match(BN) || []).length, lat = (l.text.match(/[A-Za-z0-9]/g) || []).length
      if (bn && bn >= lat) continue // translation line
      const fix = bn > 0
      const items = fix ? l.items.map(it => ({ ...it, str: fixLine(it.str) })) : l.items
      const text = fix ? fixLine(l.text).replace(/\s+/g, ' ').trim() : l.text
      if (!text) continue
      lines.push({ ...l, items, text, h: p.height })
    }
    return { n: p.n, height: p.height, lines }
  })
  return pages
}
const isFooter = (l, v) => l.y > l.h - 35 || /^Created with EO\.Pdf|^Generated on:|^Page \d+\/\d+$/.test(l.text) || (v === 'v1' && l.page > 1 && l.y < 52)

const LAW = /(?:^|[\s(\[,;:])((?:[A-Z][\w&'’.-]*\s+){1,6}(?:Act|Law|Laws|Rules?|Regulations?|Ordinance|Decree|Proclamation|Code)\b(?:[^\];:]{0,60}))/g
function balance(s) { let d = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') { if (!d) return s.slice(0, i); d-- } } return d ? s.replace(/\s*\([^()]*$/, '') : s }
function legalRefs(t) {
  const out = []
  for (const m of String(t || '').matchAll(LAW)) {
    let s = balance(m[1].trim())
    if (/^(?:amfori|BSCI|The amfori|In accordance)/i.test(s) || /^(?:amfori )?BSCI (?:COC|Code)/i.test(s) || /Code of Conduct/i.test(s)) continue
    s = s.replace(/\s+(?:and|&)$/, '').replace(/[,.\s]+$/, '')
    if (!/\d/.test(s) && !/Act|Law|Rules?|Regulation|Ordinance|Decree|Code/.test(s)) continue
    out.push(s)
  }
  return [...new Set(out)]
}
const LEGAL_CLAIM = /\bnot (?:\w+ ){0,3}as per (?:the )?(?:local )?(?:law|legal requirements?)|instead of [^.]{0,60}as per (?:the )?(?:local )?law|did not compl\w* with (?:the )?(?:local )?(?:law|legislation|legal)|exceed\w* (?:the )?legal limit|\bviolat\w+ (?:of )?(?:the )?(?:local |national )?(?:law|legislation)|(?<!\bno )\billegal(?:ly)?\b|non[- ]?complian\w+ with (?:the )?(?:local |national )?(?:law|legislation)/i

const D = s => dmy(String(s || '').replace(/\s+/g, ''))
const letter = s => { const m = /^\s*([A-E])\s*$/.exec(s || ''); return m ? m[1] : '' }

// ---------- parsing ----------
function parse(doc) {
  const raw = doc.text || ''
  const v = /DBID\s*:/.test(raw) && /Audit Id\s*:/.test(raw) ? 'v1' : /Monitoring summary report for/i.test(raw) ? 'v3' : /Monitoring result for/i.test(raw) ? 'v2' : 'other'
  const pages = prep(doc)
  const all = pages.flatMap(p => p.lines)
  const L = all.filter(l => !isFooter(l, v))
  const R = { v, info: {}, pa: {}, paPage: null, overall: '', overallDerived: '', metrics: {}, metricsPage: null, findings: [], desc: '', descPage: null, descLines: [], auditors: [], prev: null, summaryRows: [], blocks: [], paSummary: {}, ztText: [] }
  if (v === 'v1') parseV1(L, R, pages)
  else parseV23(L, R, v)
  // overall rating rule
  const pas = Array.from({ length: 13 }, (_, i) => R.pa[i + 1]?.r || '')
  if (pas.every(Boolean)) R.overallDerived = deriveOverall(pas)
  // zero tolerance mentions
  for (const l of L) if (/zero[- ]tolerance/i.test(l.text) && !/^This is an extract/.test(l.text)) R.ztText.push(l)
  return R
}

// Overall rating from the 13 PA ratings (amfori BSCI 2.0 rating rules, System Manual Part II, as summarised by SGS):
// A = at least 7 PAs rated A and none C/D/E; B = no D/E and at most 3 C; C = no E and at most 2 D;
// D = at most 6 E; E = 7 or more E.
export function deriveOverall(pas) {
  const c = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const r of pas) if (c[r] !== undefined) c[r]++
  if (c.E >= 7) return 'E'
  if (c.E > 0 || c.D > 2) return 'D'
  if (c.D > 0 || c.C > 3) return 'C'
  if (c.C > 0 || c.A < 7) return 'B'
  return 'A'
}

function parseV1(L, R, pages) {
  const I = R.info
  // header (page 1 top)
  const p1 = pages[0]?.lines || []
  const h = p1.slice(0, 6).map(l => l.text).join(' ')
  let m
  if ((m = /Producer\s*:\s*(.+?)(?=\s+DBID|$)/.exec(h))) I.producer = m[1].trim()
  if ((m = /DBID\s*:\s*(\d+)/.exec(h))) I.dbid = m[1]
  if ((m = /Audit Id\s*:\s*(\d+)/.exec(h))) I.auditId = m[1]
  if ((m = /Audit Type\s*:\s*(.+?)$/m.exec(p1.slice(0, 6).map(l => l.text).join('\n')))) I.auditType = m[1].trim()
  // label : value cells
  const kv = {}
  for (const l of L) {
    const cs = cells(l, 10)
    for (let i = 0; i < cs.length; i++) {
      const t = cs[i].text
      const mm = /^(.{2,90}?)\s*:\s*(.*)$/.exec(t)
      if (!mm || /^(Overall comments|Finding|Note)/i.test(mm[1])) continue
      if (/:\s*$/.test(t)) { const nx = cs[i + 1]; if (nx && !/:\s*$/.test(nx.text) && kv[mm[1]] === undefined) { kv[mm[1]] = { v: nx.text, page: l.page, l }; i++ } else if (kv[mm[1]] === undefined) kv[mm[1]] = { v: '', page: l.page, l } }
    }
  }
  // value continuation lines (address / management representative): only the value column
  const K = k => kv[k]?.v || ''
  R.kv = kv
  Object.assign(I, {
    auditee: K('Auditee') || K('Name of producer'), dateFrom: K('Audit Date From'), dateTo: K('Audit Date To'), expiry: K('Expiry Date of the Audit'),
    company: K('Auditing Company'), auditorsRaw: K("Auditor’s Name(s)") || K("Auditor's Name(s)"), branch: K('Auditing Branch (if applicable)'),
    address: K('Address'), province: K('Province'), country: K('Country'), sector: K('Sector'), industry: K('Industry Type') || K('Industry'),
    productGroup: K('Product group') || K('Product Group'), productType: K('Product Type'), dbidNo: K('DBID number'), auditIdNo: K('Audit ID'),
    ruc: K('Random Unannounced Check (RUC)'), overallStated: letter(K('Overall rating')), followUp: K('Need of follow-up'), followUpBy: K('If YES, by'),
    legalStatus: K('Legal status'), founded: K('Year in which the auditee was founded'), city: K('City'), region: K('Region'),
  })
  if (kv['Overall rating']) R.overallPage = kv['Overall rating'].page
  R.overall = I.overallStated
  // full address: Main Auditee Information address + continuation
  // PA rating row
  for (let i = 0; i < L.length - 1; i++) {
    const cs = cells(L[i], 8)
    if (cs.length >= 13 && cs.every(c => /^PA ?\d+$/.test(c.text))) {
      const vs = cells(L[i + 1], 8)
      for (const c of cs) { const n = +c.text.replace(/\D/g, ''); const vv = vs.find(x => Math.abs(x.x - c.x) < 15); R.pa[n] = { r: letter(vv?.text), name: PA_NAMES[n - 1], page: L[i].page } }
      R.paPage = L[i].page
      break
    }
  }
  // employment structure
  const M = R.metrics
  const ti = L.findIndex(l => /^Total number of workers/.test(l.text))
  if (ti >= 0) {
    const cs = cells(L[ti], 10)
    M.total = num(cs[1]?.text); M.prodUnit = num(cs[3]?.text); R.metricsPage = L[ti].page
    const map = { 'Permanent workers': 'perm', 'Temporary workers': 'temp', 'In management positions': 'mgmt', 'Apprentices': 'appr', 'On probation': 'prob', 'With disabilities': 'dis', 'Migrants (national citizens)': 'migDom', 'Migrants (foreign citizens)': 'migFor', 'Workers on the permanent payroll': 'payroll', 'Production based workers': 'piece', 'With shifts at night': 'night', 'Unionised': 'union', 'Pregnant': 'preg', 'On maternity leave': 'parental' }
    for (const l of L.slice(ti + 1, ti + 25)) {
      const c = cells(l, 10)
      const k = map[c[0]?.text]
      if (!k || c.length < 3) continue
      M[k + 'M'] = num(c[1].text); M[k + 'F'] = num(c[2].text)
    }
    if (M.payrollM != null && M.payrollF != null) { M.male = M.payrollM; M.female = M.payrollF }
    M.preg = M.pregF; M.parentalF = M.parentalF
  }
  // executive summary
  const ei = L.findIndex(l => /^Executive summary of audit report/i.test(l.text))
  if (ei >= 0) {
    const buf = []
    for (let j = ei + 1; j < L.length && !/^Ratings Summary|^Auditee's background/.test(L[j].text); j++) { buf.push(L[j].text); R.descLines.push(L[j]) }
    R.desc = buf.join(' '); R.descPage = L[ei].page
  }
  // auditors
  R.auditors = String(I.auditorsRaw || '').split(/,\s*/).map(s => s.trim()).filter(Boolean)
  I.lead = (R.auditors.find(a => /\(lead\)/i.test(a)) || '').replace(/\s*\(lead\)/i, '')
  const cv = /BSCI Version\s*([\d.]+)/i.exec(R.desc); if (cv) I.cocVersion = 'BSCI ' + cv[1]
  const sm = /selected (\d+) (?:employees|workers)[^.]{0,30}interview/i.exec(R.desc); if (sm && M.sample == null) M.sample = +sm[1]
  // Finding Report
  let pa = null, blk = null, f = null, mode = null
  const fi = L.findIndex(l => /^Finding Report$/.test(l.text))
  for (const l of fi >= 0 ? L.slice(fi + 1) : []) {
    const t = l.text
    if (/^Summary$/.test(t) || /^Producer Photos/.test(t)) break
    let mm
    if ((mm = /^Performance Area (\d+)\s*:\s*(.+)$/.exec(t))) { pa = +mm[1]; blk = null; f = null; mode = null; continue }
    if ((mm = /^(?:\d+-\s*)?(Follow-?up|Full) Audit \[Audit Id - (\d+)\] Audit Date:\s*(\S+)\s*PA Score:\s*([A-E])?\s*(?:Deadline date:\s*(\S*))?/i.exec(t))) {
      blk = { pa, kind: /full/i.test(mm[1]) ? 'Full' : 'Follow-up', id: mm[2], date: mm[3], score: mm[4] || '', deadline: mm[5] || '', page: l.page, comments: '', remarks: '', good: '', findings: [], current: !R.blocks.some(b => b.pa === pa) }
      R.blocks.push(blk); f = null; mode = null; continue
    }
    if (!blk) continue
    if (/^GOOD PRACTICES:?$/i.test(t)) { mode = 'good'; f = null; continue }
    if (/^AREAS OF IMPROVEMENT:?$/i.test(t)) { mode = 'comments'; f = null; continue }
    if (/^Remarks from Auditee:?$/i.test(t)) { mode = 'remarks'; f = null; continue }
    if ((mm = /^(\d{1,2}\.\d{1,2})\s*-\s*(.*)$/.exec(t)) && l.x < 92) {
      f = { audit: blk.current ? 'current' : 'previous', auditId: blk.id, auditKind: blk.kind, pa, ref: mm[1], text: mm[2], page: l.page, deadline: blk.deadline, blk }
      blk.findings.push(f); mode = 'finding'; continue
    }
    if (mode === 'finding' && f) f.text += ' ' + t
    else if (mode === 'comments') blk.comments += (blk.comments ? ' ' : '') + t
    else if (mode === 'remarks') blk.remarks += (blk.remarks ? ' ' : '') + t
    else if (mode === 'good') blk.good += (blk.good ? ' ' : '') + t
  }
  for (const b of R.blocks) for (const x of b.findings) {
    const st = [...x.text.matchAll(/\b(Not corrected|New issue|Corrected)\s*:/gi)].map(s => s[1].toLowerCase())
    x.status = [...new Set(st)].map(s => s === 'not corrected' ? 'Not corrected' : s === 'new issue' ? 'New issue' : 'Corrected').join(' / ')
    x.open = b.kind === 'Full' && !b.current ? true : (st.length ? st.some(s => s !== 'corrected') : true)
    x.finding = (/Finding\s*:\s*(.*)$/i.exec(x.text) || [, x.text.replace(/^(Not corrected|New issue|Corrected)\s*:\s*/i, '').replace(/^In accordance with[^:]*:\s*/i, '')])[1]
    x.cited = [...x.text.matchAll(/(?:questionnaire|COC|check ?point|Performance Area[^)]*\))\s*(?:point\s*)?(?:no\.?\s*)?(\d{1,2}\.\d{1,2})/gi)].map(s => s[1])
    x.legal = legalRefs(x.text).join('; ')
    x.paRating = b.score; x.remarks = b.remarks
  }
  R.findings = R.blocks.flatMap(b => b.findings)
  const cur = R.blocks.filter(b => b.current)
  const prev = R.blocks.filter(b => !b.current)
  if (prev.length) R.prev = { id: prev[0].id, date: prev[0].date, kind: prev[0].kind, pa: Object.fromEntries(prev.map(b => [b.pa, b.score])) }
  R.curBlocks = cur
  // summary table
  const si = L.findIndex(l => /^Summary$/.test(l.text))
  if (si >= 0) for (const l of L.slice(si + 1, si + 15)) {
    const cs = cells(l, 6)
    const letters = cs.filter(c => /^[A-E]$/.test(c.text))
    const dm = /(\d{2}\/\d{2}\/\d{4})\s+(\d+)/.exec(l.text)
    if (letters.length >= 14 && dm) R.summaryRows.push({ date: dm[1], id: dm[2], pas: letters.slice(0, 13).map(c => c.text), overall: letters[13].text, page: l.page, full: /Full Audit/.test(l.text) })
  }
  // follow-up date
  I.start = I.dateFrom; I.end = I.dateTo
}

function parseV23(L, R, v) {
  const I = R.info
  const p1 = L.filter(l => l.page === 1)
  const stop = p1.findIndex(l => /^This is an extract/i.test(l.text))
  const head = stop > 0 ? p1.slice(0, stop) : p1.slice(0, 30)
  let m
  const tt = head.map(l => l.text).join('\n')
  if ((m = /MONITORING ID:\s*(\S+)/i.exec(tt))) I.monitoringId = m[1]
  if ((m = /Monitoring (?:summary report|result) for (.+)/i.exec(tt))) I.titleName = m[1].trim()
  const LABELS = ['Monitored Party', 'amfori ID', 'Address', 'Monitoring Activity', 'Monitoring Type', 'Monitoring Partner', 'Monitoring Start Date', 'Closing Meeting Finished Date', 'Submission Date', 'Expiration Date', 'Announcement Type', 'Site', 'Site amfori ID']
  const kv = {}
  if (v === 'v2') {
    let last = null
    for (const l of head) {
      const cs = cells(l, 10)
      if (cs.length >= 2 && LABELS.includes(cs[0].text) && /^:/.test(cs[1].text)) { last = cs[0].text; kv[last] = [cs.slice(1).map(c => c.text).join(' ').replace(/^:\s*/, '')] }
      else if (last === 'Address' && cs.length === 1 && /^:/.test(cs[0].text)) kv[last].push(cs[0].text.replace(/^:\s*/, ''))
      else last = null
    }
  } else {
    let cols = null
    for (const l of head) {
      const cs = cells(l, 10)
      if (cs.length && cs.every(c => LABELS.includes(c.text))) { cols = cs.map(c => ({ x: c.x, k: c.text })); for (const c of cols) kv[c.k] = []; continue }
      if (!cols) continue
      for (const c of cs) { const col = cols.reduce((a, b) => Math.abs(b.x - c.x) < Math.abs(a.x - c.x) ? b : a); if (Math.abs(col.x - c.x) < 30) kv[col.k].push(c.text) }
    }
  }
  const J = (k, sep = ' ') => (kv[k] || []).join(sep).replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim()
  Object.assign(I, {
    party: J('Monitored Party'), amforiId: J('amfori ID'), site: J('Site'), siteId: J('Site amfori ID'), activity: J('Monitoring Activity'), auditType: J('Monitoring Type'),
    partner: J('Monitoring Partner'), start: J('Monitoring Start Date'), end: J('Closing Meeting Finished Date'), submission: J('Submission Date'), expiry: J('Expiration Date'),
    announcement: J('Announcement Type'), address: J('Address', v === 'v2' ? ', ' : ' ').replace(/,\s*,/g, ','),
  })
  const al = kv.Address || []
  I.country = (al.length ? al[al.length - 1] : '').replace(/^.*,\s*/, '').trim()
  if (/\d/.test(I.country)) I.country = ''
  const gm = /generated on (\d{2}\/\d{2}\/\d{4})/i.exec(p1.map(l => l.text).join(' ')); if (gm) I.generated = gm[1]
  // section ratings
  const gi = L.findIndex(l => /^General description$/i.test(l.text))
  const top = gi > 0 ? L.slice(0, gi) : L.slice(0, 80)
  for (let i = 0; i < top.length; i++) {
    const mm = /^PA ?(\d{1,2})\s*:\s*(.+?)(?:\s+([A-E]))?$/.exec(top[i].text)
    if (!mm) continue
    let r = mm[3] || ''
    if (!r) for (const nx of top.slice(i + 1, i + 3)) { const c = cells(nx, 10); if (c.length === 1 && /^[A-E]$/.test(c[0].text) && c[0].x > 300) { r = c[0].text; break } }
    let name = mm[2].trim()
    if (top[i + 2] && !/^PA ?\d/.test(top[i + 2].text) && cells(top[i + 1], 10).length === 1 && /^[A-E]$/.test(top[i + 1].text) && /^[A-Z][a-z]+$/.test(top[i + 2].text)) name += ' ' + top[i + 2].text
    R.pa[+mm[1]] = { r, name, page: top[i].page }
    if (!R.paPage) R.paPage = top[i].page
  }
  // general description
  if (gi >= 0) {
    const buf = []
    for (let j = gi + 1; j < L.length && !/^(SITE DETAILS|Site Details|METRICS|Metrics)$/.test(L[j].text); j++) { buf.push(L[j].text); R.descLines.push(L[j]) }
    R.desc = buf.join(' ').replace(/\s+/g, ' '); R.descPage = L[gi].page
  }
  const d = R.desc
  if ((m = /Audit Company name\s*:\s*(.+?)\.?\s+(?=Audit date|Auditors)/i.exec(d))) I.company = m[1].replace(/\.$/, '')
  if ((m = /Monitoring partner\s*:\s*(.+?\b(?:Ltd|Limited|Inc|GmbH|LLC|Co)\.?)(?=\s|$)/i.exec(d))) I.company = m[1]
  if ((m = /Audit date\s*:\s*(\d{1,2}\/\s*\d{1,2}\/\s*\d{4})/i.exec(d))) I.auditDateText = m[1].replace(/\s+/g, '')
  if ((m = /Lead Auditor\s*:\s*([A-Z][A-Za-z. ]+?)\s*[-–:]\s*(?:RA|ASCA|CSCA|EA|LA)\s?\d/i.exec(d))) I.lead = m[1].trim()
  for (const a of d.matchAll(/([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*){0,4})\s*[-–:]\s*((?:RA|ASCA|CSCA|EA|LA)\s?\d{8})/g)) R.auditors.push(`${a[1].trim()} (${a[2].replace(/\s/g, '')})`)
  // GICS / site details
  const sd = L.findIndex(l => /^(SITE DETAILS|Site Details)$/.test(l.text))
  if (sd >= 0) {
    const seg = L.slice(sd, sd + 25)
    for (let i = 0; i < seg.length; i++) {
      const cs = cells(seg[i], 10)
      for (const c of cs) {
        const mm = /^(Sector|Industry Group|Industry|Sub Industry)\s*(?::\s*(.*))?$/.exec(c.text)
        if (!mm) continue
        if (mm[2]) { I[mm[1]] = mm[2]; continue }
        const nx = cells(L[L.indexOf(seg[i]) + 1] || { items: [] }, 10)
        if (!nx.length) continue
        const hit = nx.find(x => Math.abs(x.x - c.x) < 30)
        if (hit && !/^(Sector|Industry|Sub Industry)/.test(hit.text)) { let val = hit.text; const nn = cells(L[L.indexOf(seg[i]) + 2] || { items: [] }, 10); const h2 = nn.length === 1 && Math.abs(nn[0].x - c.x) < 30 && /^[A-Z][a-z]+$/.test(nn[0].text) ? nn[0].text : ''; I[mm[1]] = (val + ' ' + h2).trim() }
      }
      // v2 inline cells "Sector | : value | Industry | : value"
      for (let k = 0; k < cs.length - 1; k++) if (/^(Sector|Industry Group|Industry|Sub Industry)$/.test(cs[k].text) && /^:/.test(cs[k + 1].text)) I[cs[k].text] = cs[k + 1].text.replace(/^:\s*/, '')
    }
  }
  // metrics
  const MK = { 'Total workforce': 'total', 'Legal minimum wage in local currency': 'minWage', 'Lowest wage paid for regular work at the site': 'lowWage', 'Calculated living wage in local currency': 'livingWage', 'Total sample': 'sample', 'Male workers': 'male', 'Female workers': 'female', 'Permanent workers - Male': 'permM', 'Permanent workers - Female': 'permF', 'Temporary workers - Male': 'tempM', 'Temporary workers - Female': 'tempF', 'Seasonal workers - Male': 'seasM', 'Seasonal workers - Female': 'seasF', 'Management - Male': 'mgmtM', 'Management - Female': 'mgmtF', 'Apprentices - Male': 'apprM', 'Apprentices - Female': 'apprF', 'Workers on probation - Male': 'probM', 'Workers on probation - Female': 'probF', 'Workers with night shift - Male': 'nightM', 'Workers with night shift - Female': 'nightF', 'Workers with disabilities - Male': 'disM', 'Workers with disabilities - Female': 'disF', 'Domestic migrant workers - Male': 'migDomM', 'Domestic migrant workers - Female': 'migDomF', 'Foreign migrant workers - Male': 'migForM', 'Foreign migrant workers - Female': 'migForF', 'Workers hired directly - Male': 'directM', 'Workers hired directly - Female': 'directF', 'Workers hired indirectly - Male': 'indirectM', 'Workers hired indirectly - Female': 'indirectF', 'Unionised workers - Male': 'unionM', 'Unionised workers - Female': 'unionF', 'Workers under CBA - Male': 'cbaM', 'Workers under CBA - Female': 'cbaF', 'Pregnant workers': 'preg', 'Workers on parental leave - Male': 'parentalM', 'Workers on parental leave - Female': 'parentalF', 'Sample - Male': 'sampleM', 'Sample - Female': 'sampleF', 'Young workers - Male': 'youngM', 'Young workers - Female': 'youngF', 'Young workers': 'young' }
  for (const l of L) {
    const cs = cells(l, 10)
    if (cs.length !== 2) continue
    const k = MK[cs[0].text]
    if (!k) continue
    const mm = /^(-?[\d,.]+)\s*(\w*)/.exec(cs[1].text)
    R.metrics[k] = mm ? num(mm[1]) : null
    if (k === 'minWage' && mm) R.metrics.wageUnit = mm[2]
    if (!R.metricsPage) R.metricsPage = l.page
  }
  // findings
  const fi = L.findIndex((l, i) => i > gi && /^(FINDINGS|Findings)$/.test(l.text))
  if (fi < 0) return
  const FL = L.slice(fi + 1)
  if (v === 'v3' || FL.some(l => /^Question:\s*\d/.test(l.text))) {
    let pa = null, f = null, mode = null
    for (const l of FL) {
      const t = l.text
      let mm
      if ((mm = /^PA ?(\d{1,2})\s*:\s*(.+)$/.exec(t)) && !/Question/.test(t)) { pa = +mm[1]; f = null; continue }
      if (/^Site:.*amfori ID/.test(t)) continue
      if ((mm = /^Question:\s*(\d{1,2}\.\d{1,2})\s*(.*)$/.exec(t))) { f = { audit: 'current', pa, ref: mm[1], question: mm[2], text: '', page: l.page }; R.findings.push(f); mode = 'q'; continue }
      if (!f) continue
      if (/^(ENGLISH|Finding|Original|LOCAL LANGUAGE)$/i.test(t)) { mode = 'f'; continue }
      if (mode === 'q') f.question += ' ' + t
      else f.text += (f.text ? ' ' : '') + t
    }
    for (const x of R.findings) {
      x.crucial = /^CRUCIAL\b/i.test(x.question)
      x.question = x.question.replace(/^CRUCIAL:\s*/i, '').trim()
      const fm = /\bFindings?\s*:\s*(.*?)(?=\s*\bNote(?:\s+that)?\s*[:,]|$)/i.exec(x.text)
      x.finding = fm ? fm[1].trim() : x.text.replace(/^In accordance with.*?\?\)?:?\s*/i, '')
      const nm = /\bNote(?:\s+that)?\s*[:,]\s*(.*)$/i.exec(x.text) || /([^.]*\bpartial rating[^.]*\.?)\s*$/i.exec(x.text); x.note = nm ? nm[1].trim() : ''
      x.answer = /partial(?:ly)? rating|rated as partial|partially/i.test(x.text) ? 'Partially' : /rated as no\b|"no" rating|no rating was given/i.test(x.text) ? 'No' : ''
      const acc = /In accordance with(.*?)(?=\s*Findings?\s*:|$)/i.exec(x.text)
      x.legal = legalRefs(acc ? acc[1] : x.text).join('; ')
      x.cited = [...x.text.matchAll(/(?:Performance Area\s*\([^)]*\)\s*No\.?|questionnaire|check ?point(?: no\.?)?)\s*(\d{1,2}\.\d{1,2})/gi)].map(s => s[1])
      x.paRating = R.pa[x.pa]?.r || ''
      x.open = true
    }
  } else {
    // v2: paragraphs under PA headings
    let pa = null, f = null, lastY = null, lastPage = null
    for (const l of FL) {
      const t = l.text
      const mm = /^PA ?(\d{1,2})\s*:\s*(.+)$/.exec(t)
      if (mm && t.length < 90) { pa = +mm[1]; f = null; lastY = null; continue }
      if (pa == null) continue
      const gap = lastPage === l.page && lastY != null ? l.y - lastY : 99
      if (!f || gap > 13.5) { f = { audit: 'current', pa, ref: '', text: t, page: l.page }; R.findings.push(f) }
      else f.text += ' ' + t
      lastY = l.y; lastPage = l.page
    }
    for (const x of R.findings) {
      x.cited = [...x.text.matchAll(/(?:check ?point|COC)\s*(?:no\.?\s*)?(\d{1,2}\.\d{1,2})/gi)].map(s => s[1])
      x.ref = x.cited[0] || ''
      x.finding = x.text.replace(/\s*[\[(]\s*As per amfori BSCI.*$/i, '').trim()
      const ap = /As per (.*)$/i.exec(x.text)
      x.legal = legalRefs(ap ? x.text.slice(ap.index) : '').join('; ')
      x.paRating = R.pa[x.pa]?.r || ''
      x.open = true
    }
  }
  // PA summaries in the description (v3): "PA 4 (No Discrimination): …"
  const re = /PA ?(\d{1,2})\s*\(([^)]{3,80})\)\s*:\s*(.*?)(?=\s*PA ?\d{1,2}\s*\([^)]{3,80}\)\s*:|\s*#|$)/g
  for (const mm of d.matchAll(re)) R.paSummary[+mm[1]] = mm[3]
}

// ---------- checks ----------
export function check(doc, file = '') {
  const { out, add } = collector(RULES)
  const F = { file }
  const R = parse(doc)
  const I = R.info, M = R.metrics, v = R.v
  const p1 = 1
  // 01 key fields
  const need = v === 'v1'
    ? { 'Producer': I.producer || I.auditee, 'DBID': I.dbid, 'Audit Id': I.auditId, 'Audit Type': I.auditType, 'Audit Date From': I.dateFrom, 'Audit Date To': I.dateTo, 'Auditing Company': I.company, "Auditor's Name(s)": I.auditorsRaw, 'Address': I.address, 'Country': I.country, 'Overall rating': I.overallStated, 'Total number of workers': M.total }
    : v === 'v2' || v === 'v3'
      ? { 'Monitored Party': I.party, 'amfori ID': I.amforiId, 'Site': I.site, 'Site amfori ID': I.siteId, 'Address': I.address, 'Monitoring Activity': I.activity, 'Monitoring Type': I.auditType, 'Submission Date': I.submission, 'Expiration Date': I.expiry, 'Audit company': I.company || I.partner, 'Auditors (APSCA no.)': R.auditors.length ? 'x' : '', 'Total workforce': M.total, 'Total sample': M.sample, ...(v === 'v3' ? { 'Monitoring ID': I.monitoringId, 'Monitoring Start Date': I.start, 'Closing Meeting Finished Date': I.end, 'Announcement Type': I.announcement, 'Monitoring Partner': I.partner } : { 'Audit date': I.auditDateText }) }
      : {}
  const miss = Object.entries(need).filter(([, x]) => x == null || x === '' || /^(n\/?a|-|none)$/i.test(String(x))).map(([k]) => k)
  if (miss.length) add('BSCI-01', { ...F, page: p1, msg: 'Missing: ' + miss.join(', ') })
  const pasRead = Object.keys(R.pa).length
  const noRating = Object.entries(R.pa).filter(([, p]) => !p.r).map(([k]) => 'PA ' + k)
  if (pasRead && noRating.length) add('BSCI-01', { ...F, page: R.paPage, msg: 'No rating for ' + noRating.join(', ') })
  if ((v === 'v2' || v === 'v3') && pasRead && pasRead < 13) add('BSCI-01', { ...F, page: R.paPage, msg: `Only ${pasRead} of 13 Performance Area ratings found` })

  // 02 dates
  const now = new Date()
  const start = D(I.start || I.auditDateText), end = D(I.end || I.auditDateText), sub = D(I.submission), exp = D(I.expiry), gen = D(I.generated)
  const pg = R.v === 'v1' ? 1 : p1
  if (start && end && end < start) add('BSCI-02', { ...F, page: pg, msg: `Audit end ${fmt(end)} before start ${fmt(start)}` })
  if (start && end && days(start, end) > 7) add('BSCI-02', { ...F, sev: 'warning', page: pg, msg: `Audit lasted ${days(start, end) + 1} days (${fmt(start)} – ${fmt(end)})` })
  if (end && sub && sub < end) add('BSCI-02', { ...F, page: pg, msg: `Submitted ${fmt(sub)} before the audit ended ${fmt(end)}` })
  if (sub && gen && gen < sub) add('BSCI-02', { ...F, page: pg, msg: `Extract generated ${fmt(gen)} before submission ${fmt(sub)}` })
  for (const [k, d] of [['Audit start', start], ['Submission', sub]]) if (d && d > now) add('BSCI-02', { ...F, page: pg, msg: `${k} ${fmt(d)} is in the future` })
  if (exp && sub && exp <= sub) add('BSCI-02', { ...F, page: pg, msg: `Expiration ${fmt(exp)} not after submission ${fmt(sub)}` })
  if (v === 'v1') {
    const hd = /Audit Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/.exec(doc.pages[0]?.lines.slice(0, 4).map(l => l.text).join(' ') || '')
    if (hd && start && fmt(D(hd[1])) !== fmt(start)) add('BSCI-02', { ...F, page: 1, msg: `Header audit date ${hd[1]} vs Audit Date From ${I.dateFrom}` })
    if (I.dbidNo && I.dbid && I.dbidNo !== I.dbid) add('BSCI-02', { ...F, sev: 'error', page: 3, msg: `DBID ${I.dbidNo} vs header ${I.dbid}` })
    if (I.auditIdNo && I.auditId && I.auditIdNo !== I.auditId) add('BSCI-02', { ...F, page: 3, msg: `Audit ID ${I.auditIdNo} vs header ${I.auditId}` })
    for (const b of R.curBlocks || []) {
      if (I.auditId && b.id !== I.auditId) add('BSCI-02', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `PA block Audit Id ${b.id}, report Audit Id ${I.auditId}` })
      if (start && D(b.date) && fmt(D(b.date)) !== fmt(start)) add('BSCI-02', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `PA block audit date ${b.date}, report ${I.dateFrom}` })
      const dl = D(b.deadline)
      if (dl && start && dl <= start) add('BSCI-02', { ...F, sev: 'warning', page: b.page, ref: 'PA ' + b.pa, msg: `Deadline ${b.deadline} not after the audit date` })
    }
    if (R.prev && start) {
      const pd = D(R.prev.date)
      if (pd && pd >= start) add('BSCI-02', { ...F, page: R.blocks.find(b => !b.current)?.page, msg: `Previous audit ${R.prev.date} not before this audit ${I.dateFrom}` })
    }
  }
  // narrative date / man-days (22)
  narrative(R, add, F, start, end)

  // 03 validity / follow-up
  const overall = R.overall || R.overallDerived
  const src = R.overall ? 'stated' : 'derived from the PA ratings'
  if (exp && sub && overall) {
    const months = (exp.getUTCFullYear() - sub.getUTCFullYear()) * 12 + exp.getUTCMonth() - sub.getUTCMonth()
    const want = /[AB]/.test(overall) ? 24 : 12
    if (Math.abs(months - want) > 1) add('BSCI-03', { ...F, page: p1, msg: `Expiration ${fmt(exp)} is ${months} months after submission; overall rating ${overall} (${src}) gives ${want} months` })
  }
  if (v === 'v1' && R.overall) {
    const fu = /yes/i.test(I.followUp), cde = /[CDE]/.test(R.overall)
    if (I.followUp && fu !== cde) add('BSCI-03', { ...F, page: R.overallPage, msg: `Overall rating ${R.overall}, "Need of follow-up: ${I.followUp}"` })
    const by = D(I.followUpBy)
    if (by && start && (days(start, by) > 366 || by <= start)) add('BSCI-03', { ...F, page: R.overallPage, msg: `Follow-up by ${I.followUpBy}: ${days(start, by)} days after the audit` })
    if (R.prev && /full/i.test(R.prev.kind) && /follow/i.test(I.auditType || '') && start) {
      const pd = D(R.prev.date)
      if (pd) { const dd = days(pd, start); if (dd < 55 || dd > 366) add('BSCI-03', { ...F, page: R.blocks.find(b => !b.current)?.page, msg: `Follow-up ${dd} days after the full audit of ${R.prev.date} (window 2–12 months)` }) }
    }
  }
  // 04 submission lag
  if (end && sub && days(end, sub) > 15) add('BSCI-04', { ...F, page: p1, msg: `Submitted ${fmt(sub)}, ${days(end, sub)} days after the closing meeting ${fmt(end)}` })

  // 05 overall rule
  if (R.overall && R.overallDerived && R.overall !== R.overallDerived) add('BSCI-05', { ...F, page: R.overallPage || R.paPage, msg: `Overall ${R.overall}; PA ratings ${paStr(R)} give ${R.overallDerived}` })
  for (const s of R.summaryRows) {
    const dd = deriveOverall(s.pas)
    if (dd !== s.overall) add('BSCI-05', { ...F, page: s.page, ref: 'Audit ' + s.id, msg: `Summary table: overall ${s.overall}; PA ratings ${s.pas.join('')} give ${dd}` })
  }
  // 06 internal rating consistency (v1)
  if (v === 'v1') {
    const cur = R.summaryRows.find(s => s.id === I.auditId)
    if (cur) {
      if (R.overall && cur.overall !== R.overall) add('BSCI-06', { ...F, page: cur.page, msg: `Overall ${R.overall} on page ${R.overallPage}, ${cur.overall} in the summary table` })
      cur.pas.forEach((r, i) => { if (R.pa[i + 1]?.r && R.pa[i + 1].r !== r) add('BSCI-06', { ...F, page: cur.page, ref: 'PA ' + (i + 1), msg: `PA ${i + 1}: ${R.pa[i + 1].r} in the rating table, ${r} in the summary table` }) })
    }
    for (const b of R.blocks) {
      const row = R.summaryRows.find(s => s.id === b.id)
      const want = b.current ? R.pa[b.pa]?.r : row?.pas[b.pa - 1]
      if (want && b.score && want !== b.score) add('BSCI-06', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `PA ${b.pa} score ${b.score} in the finding report (audit ${b.id}), ${want} in the ${b.current ? 'rating table' : 'summary table'}` })
    }
  }
  // 07 PA below A without open finding
  const openBy = {}
  for (const x of R.findings) if (x.audit === 'current' && x.open) openBy[x.pa] = (openBy[x.pa] || 0) + 1
  if (R.findings.length || v !== 'other') for (const [n, p] of Object.entries(R.pa)) {
    if (/[B-E]/.test(p.r) && !openBy[n]) add('BSCI-07', { ...F, page: (R.curBlocks || []).find(b => b.pa === +n)?.page || p.page, ref: 'PA ' + n, msg: `PA ${n} (${p.name || PA_NAMES[n - 1]}) rated ${p.r}, no open finding listed` })
  }
  // 08 summary lists vs findings
  summaryLists(R, add, F, openBy)
  // per finding
  const seenDup = new Set()
  for (const x of R.findings) {
    const ref = (x.pa ? 'PA ' + x.pa : '') + (x.ref ? ' / ' + x.ref : '') + (x.audit === 'previous' ? ' (prev.)' : '')
    // 09 cited numbers
    if (x.cited?.length) {
      const other = x.pa ? x.cited.filter(c => +c.split('.')[0] !== x.pa) : []
      if (v !== 'v2' && x.ref && x.cited[0] !== x.ref) add('BSCI-09', { ...F, page: x.page, ref, msg: `Heading ${x.ref}, text cites ${x.cited[0]}${other.includes(x.cited[0]) ? ` (a PA ${x.cited[0].split('.')[0]} question)` : ''}`, text: x.text })
      else if (other.length) add('BSCI-09', { ...F, page: x.page, ref, msg: `Under PA ${x.pa}, cites ${other.join(', ')}`, text: x.text })
    }
    // 10 description
    const desc = (x.finding || '').replace(/\s+/g, ' ').trim()
    if (x.open && x.status !== 'Corrected' && desc.length < 40) add('BSCI-10', { ...F, page: x.page, ref, msg: desc ? `Only "${clip(desc, 60)}"` : 'No finding text', text: x.text })
    // 11 legal claim without law
    const lc = LEGAL_CLAIM.exec(x.text)
    if (lc && !x.legal && !legalRefs(x.text).length) add('BSCI-11', { ...F, page: x.page, ref, msg: `"${lc[0]}" without a law reference`, text: around(x.text, lc.index) })
    // 13 arithmetic, 18 duplicates
    arith(x.text, x.page, ref, add, F)
    // 21 crucial
    if (x.crucial) add('BSCI-21', { ...F, page: x.page, ref, msg: clip(x.question, 120) })
    const k = norm(desc)
    if (k.length > 60 && seenDup.has(k + x.audit)) add('BSCI-18', { ...F, page: x.page, ref, msg: 'Same finding text appears twice', text: desc })
    seenDup.add(k + x.audit)
  }
  for (const b of R.blocks) arith(b.comments, b.page, 'PA ' + b.pa, add, F)
  arith(R.desc, R.descPage, 'Description', add, F)

  // 12 workers
  workers(R, add, F)
  // 14 wages
  if (M.minWage != null && M.lowWage != null && M.lowWage < M.minWage) {
    const wf = R.findings.some(x => x.pa === 5 && /minimum wage|legal wage|below.*wage/i.test(x.text) && !/ensur\w* (?:the )?minimum wage/i.test(x.text))
    if (!wf) add('BSCI-14', { ...F, page: R.metricsPage, ref: 'PA 5', msg: `Lowest wage ${M.lowWage} < legal minimum ${M.minWage}; PA 5 rated ${R.pa[5]?.r || '?'}` })
  }
  // 15 hours
  if (R.pa[6] && !openBy[6]) {
    const texts = [{ t: R.desc, page: R.descPage }, ...(R.curBlocks || []).filter(b => b.pa === 6).map(b => ({ t: b.comments, page: b.page })), { t: R.paSummary[6] || '', page: R.descPage }]
    for (const o of texts) for (const m of String(o.t || '').matchAll(/(\d{2,3})\s*(?:hours?|hrs?)(?:\s*\([^)]*\))?\s*(?:in a week|per week|a week|\/\s*week|weekly)/gi)) {
      if (+m[1] > 60 && +m[1] < 200 && !/overtime/i.test(o.t.slice(Math.max(0, m.index - 30), m.index))) { add('BSCI-15', { ...F, page: o.page, ref: 'PA 6', msg: `${m[0]}; PA 6 rated ${R.pa[6].r} with no finding`, text: around(o.t, m.index) }); break }
    }
  }
  // 16 compliant areas describing gaps
  for (const [n, s] of Object.entries(R.paSummary)) {
    if (openBy[n] || R.pa[n]?.r !== 'A') continue
    const h = negHit(s)
    if (h) add('BSCI-16', { ...F, page: R.descPage, ref: 'PA ' + n, msg: `PA ${n} has no finding, summary says "${h}"`, text: s })
  }
  for (const b of R.curBlocks || []) {
    if (openBy[b.pa] || /partially/i.test(b.comments)) continue
    const h = negHit(b.comments)
    if (h) add('BSCI-16', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `PA ${b.pa} has no open finding, comments say "${h}"`, text: b.comments })
  }
  // 20 zero tolerance
  const ztSeen = new Set()
  for (const l of R.ztText) if (!/no zero[- ]tolerance|zero[- ]tolerance (?:issues? |findings? |cases? )?(?:were |was )?not (?:found|identified|observed)|without any zero/i.test(l.text) && !ztSeen.has(l.page)) { ztSeen.add(l.page); add('BSCI-20', { ...F, page: l.page, msg: 'Check the zero-tolerance protocol was followed and the rating reflects it', text: l.text }) }
  // 17 / 19 / 18 text-wide
  textWide(doc, R, add, F)
  R.qc = { error: out.filter(x => x.sev === 'error').length, warning: out.filter(x => x.sev === 'warning').length }
  return { kind: 'bsci', meta: meta(R, file), findings: out, stats: { findings: R.findings.filter(x => x.audit === 'current').length, pas: pasRead }, R }
}

function negHit(s) {
  const t = String(s || '').replace(/did not keep any original[^.]*|not (?:found|observed|identified|noted) (?:any )?(?:child|forced|bonded|young|discriminat|harass|corrupt)[^.]*|no (?:non-?conformit\w*|findings?|issues?)[^.]*/gi, ' ')
  return negativeHits(t)
}

function paStr(R) { return Array.from({ length: 13 }, (_, i) => R.pa[i + 1]?.r || '?').join('') }

function narrative(R, add, F, start, end) {
  const d = R.desc
  if (!d) return
  // "conducted in two days (30 and 31 August 2023)"
  const m = /\((\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:and|&|-|–|to)\s*(\d{1,2})(?:st|nd|rd|th)?)?\s+([A-Za-z]{3,9})\s+(\d{4})\)/.exec(d)
  if (m) {
    const a = textDates(`${m[1]} ${m[3]} ${m[4]}`)[0]?.d, b = textDates(`${m[2] || m[1]} ${m[3]} ${m[4]}`)[0]?.d
    if (a && start && fmt(a) !== fmt(start)) add('BSCI-22', { ...F, page: R.descPage, msg: `Description: audit from ${fmt(a)}; start date ${fmt(start)}`, text: around(d, m.index) })
    if (b && end && fmt(b) !== fmt(end)) { add('BSCI-22', { ...F, page: R.descPage, msg: `Description: audit ${fmt(a)} – ${fmt(b)}; header start ${fmt(start)}, closing meeting ${fmt(end)}`, text: around(d, m.index) }); R._dayFlag = true }
  } else {
    const td = textDates(d)
    const on = /\bon (?:the )?((?:[A-Z][a-z]+ \d{1,2},? \d{4})|(?:\d{1,2}(?:st|nd|rd|th)? [A-Z][a-z]+,? \d{4}))/.exec(d)
    if (on && start && td.length) { const x = textDates(on[1])[0]?.d; if (x && fmt(x) !== fmt(start) && (!end || fmt(x) !== fmt(end))) add('BSCI-22', { ...F, page: R.descPage, msg: `Description: audit on ${fmt(x)}; header ${fmt(start)}`, text: around(d, on.index) }) }
  }
  if (R.info.auditDateText && R.info.submission) { /* v2: only one audit date */ }
  const md = /(\d+(?:\.\d+)?)\s*man-?days? (?:were|was) spent on-?site/i.exec(d)
  const ad = /(\d+)\s*auditors? on day one and (\d+)\s*auditors? on day two/i.exec(d)
  if (md && ad && +ad[1] + +ad[2] !== +md[1]) add('BSCI-22', { ...F, page: R.descPage, msg: `${ad[1]} + ${ad[2]} auditor-days, but ${md[1]} man-days on site`, text: around(d, md.index) })
  const nd = /(?:conducted|audit) in (one|two|three|four|five|\d) days?/i.exec(d)
  if (nd && start && end && !R._dayFlag) { const n = { one: 1, two: 2, three: 3, four: 4, five: 5 }[nd[1].toLowerCase()] || +nd[1]; const span = days(start, end) + 1; if (n !== span) add('BSCI-22', { ...F, page: R.descPage, msg: `Description: ${n}-day audit; header dates span ${span} days (${fmt(start)} – ${fmt(end)})`, text: around(d, nd.index) }) }
  const na = /conducted by (\w+) \((\d+)\) auditors/i.exec(d)
  if (na && R.auditors.length && +na[2] !== R.auditors.length) add('BSCI-22', { ...F, sev: 'info', page: R.descPage, msg: `${na[2]} auditors stated, ${R.auditors.length} listed with APSCA numbers` })
}

function summaryLists(R, add, F, openBy) {
  const d = R.desc
  const withF = new Set(R.findings.filter(x => x.audit === 'current' && x.open).map(x => x.pa))
  const cmp = (listed, page, text, label) => {
    const miss = [...withF].filter(n => !listed.has(n)).sort((a, b) => a - b), extra = [...listed].filter(n => !withF.has(n)).sort((a, b) => a - b)
    if (miss.length) add('BSCI-08', { ...F, page, msg: `${label}: findings for PA ${miss.join(', ')} are not in the list`, text })
    if (extra.length) add('BSCI-08', { ...F, page, msg: `${label}: PA ${extra.join(', ')} listed but has no finding`, text })
  }
  let m
  if ((m = /Improvement areas (?:were|are) identified in ((?:PA ?\d{1,2}[,\s]*(?:and\s*)?)+)/i.exec(d))) cmp(new Set([...m[1].matchAll(/\d{1,2}/g)].map(x => +x[0])), R.descPage, around(d, m.index), 'Summary list')
  else if ((m = /Non-?complian\w* (?:were|was|have been|has been) (?:noted|found|identified) in the areas? of (.*?)(?:Details|For other areas|\.\s)/i.exec(d))) {
    const set = new Set(); for (let i = 0; i < 13; i++) if (PA_KEYS[i].test(m[1])) set.add(i + 1)
    if (/workers? involvement and protection/i.test(m[1]) && !/protection of the environment|environment/i.test(m[1].replace(/workers? involvement and protection/ig, ''))) set.delete(12)
    cmp(set, R.descPage, around(d, m.index), 'Overall findings')
  }
  if ((m = /For ((?:PA ?\d{1,2}[,\s]*(?:and\s*)?)+)no non-?conformit/i.exec(d))) {
    const none = [...m[1].matchAll(/\d{1,2}/g)].map(x => +x[0])
    const bad = none.filter(n => withF.has(n) || /[B-E]/.test(R.pa[n]?.r || ''))
    if (bad.length) add('BSCI-08', { ...F, page: R.descPage, msg: `PA ${bad.join(', ')} said to have no non-conformity, but ${bad.map(n => withF.has(n) ? 'has findings' : 'rated ' + R.pa[n].r).join(', ')}`, text: around(d, m.index) })
  }
  // v1: "03 questionnaires (1.1, 1.2 & 1.3) have been marked as a partially"
  for (const b of R.curBlocks || []) {
    const mm = /(\d+)\s*questionnaires?\s*\(([\d.,&\sand]+)\)\s*(?:have|has) been marked/i.exec(b.comments)
    if (!mm) continue
    const list = [...mm[2].matchAll(/\d{1,2}\.\d{1,2}/g)].map(x => x[0])
    if (+mm[1] !== list.length) add('BSCI-08', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `"${+mm[1]} questionnaires" but ${list.length} listed (${list.join(', ')})`, text: around(b.comments, mm.index) })
    const open = b.findings.filter(x => x.open).map(x => x.ref)
    const miss = open.filter(r => !list.includes(r)), extra = list.filter(r => !open.includes(r))
    if (miss.length) add('BSCI-08', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `Open finding(s) ${miss.join(', ')} not in the "marked partially" list`, text: around(b.comments, mm.index) })
    if (extra.length) add('BSCI-08', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: `${extra.join(', ')} marked partially but no open finding listed`, text: around(b.comments, mm.index) })
  }
}

function workers(R, add, F) {
  const M = R.metrics, pg = R.metricsPage
  const s = (a, b) => (M[a] ?? 0) + (M[b] ?? 0)
  const has = (...k) => k.every(x => M[x] != null)
  const flag = (msg, page = pg) => add('BSCI-12', { ...F, page, msg })
  if (has('total', 'male', 'female') && M.male + M.female !== M.total) flag(`Male ${M.male} + female ${M.female} = ${M.male + M.female}, total ${M.total}`)
  if (has('sample', 'sampleM', 'sampleF') && M.sampleM + M.sampleF !== M.sample) flag(`Sample male ${M.sampleM} + female ${M.sampleF} ≠ total sample ${M.sample}`)
  if (has('total', 'sample') && M.sample > M.total) flag(`Sample ${M.sample} larger than workforce ${M.total}`)
  const dd = has('total', 'directM', 'directF') ? s('directM', 'directF') + s('indirectM', 'indirectF') : null
  const pp = has('total', 'permM', 'permF') && R.v !== 'v1' ? s('permM', 'permF') + s('tempM', 'tempF') + s('seasM', 'seasF') : null
  if (dd != null && dd !== M.total && pp != null && pp > M.total && pp === dd) flag(`Hired directly + indirectly = ${dd} and permanent + temporary + seasonal = ${pp}, but total workforce is ${M.total}`)
  else {
    if (dd != null && dd !== M.total) flag(`Hired directly + indirectly = ${dd}, total workforce ${M.total}`)
    if (pp != null && pp > M.total) flag(`Permanent + temporary + seasonal = ${pp}, more than total workforce ${M.total}`)
  }
  if (has('total', 'payrollM', 'payrollF') && s('payrollM', 'payrollF') !== M.total) flag(`Permanent payroll ${s('payrollM', 'payrollF')} vs total ${M.total}`)
  const groups = { perm: 'Permanent', temp: 'Temporary', mgmt: 'Management', prob: 'Probation', night: 'Night shift', dis: 'Disabled', migDom: 'Domestic migrants', migFor: 'Foreign migrants', union: 'Unionised', cba: 'Under CBA' }
  if (M.total != null) for (const [k, n] of Object.entries(groups)) { const g = s(k + 'M', k + 'F'); if ((M[k + 'M'] != null || M[k + 'F'] != null) && g > M.total && !(k === 'perm' && R.v !== 'v1')) flag(`${n} workers ${g} exceed total ${M.total}`) }
  if (M.prodUnit && M.total != null && M.prodUnit > M.total) flag(`Workers in the production unit ${M.prodUnit} exceed total ${M.total}`)
  const fem = M.female ?? M.payrollF
  if (M.preg != null && fem != null && M.preg > fem) flag(`Pregnant ${M.preg} > female workers ${fem}`)
  // narrative
  const d = R.desc
  const m = /total(?: number of)?(?: no\.)?(?: workers| employees)?(?: is| are| of| was)?\s*(\d[\d,]*)\s*(?:workers|employees)?[^.]{0,40}?(\d[\d,]*)\s*(?:were\s*)?(male|female)\w*[^.]{0,20}?(\d[\d,]*)\s*(?:were\s*)?(male|female)/i.exec(d)
  if (m) {
    const tot = num(m[1]), a = num(m[2]), b = num(m[4])
    const male = /^male/i.test(m[3]) ? a : b, female = /^male/i.test(m[3]) ? b : a
    if (a + b !== tot) flag(`Description: ${a} + ${b} ≠ ${tot}`, R.descPage)
    if (M.total != null && tot !== M.total) flag(`Description says ${tot} workers (${male} male, ${female} female); metrics ${M.total} (${M.male ?? '?'} male, ${M.female ?? '?'} female)`, R.descPage)
  }
  const pm = /(\d+)\s+pregnant/i.exec(d); if (pm && M.preg != null && +pm[1] !== M.preg) flag(`Description: ${pm[1]} pregnant; metrics ${M.preg}`, R.descPage)
  const dm = /(\d+)\s+(?:disabled|workers with disabilit)/i.exec(d); if (dm && (M.disM != null || M.disF != null) && +dm[1] !== s('disM', 'disF')) flag(`Description: ${dm[1]} disabled; metrics ${s('disM', 'disF')}`, R.descPage)
  const sm = /selected (\d+) (?:employees|workers)[^.]{0,30}interview/i.exec(d); if (sm && M.sample != null && +sm[1] !== M.sample) flag(`Description: ${sm[1]} workers interviewed; total sample ${M.sample}`, R.descPage)
  if (/no young workers|young workers were not found/i.test(d) && s('youngM', 'youngF') + (M.young ?? 0) > 0) flag('Description says no young workers, metrics list young workers', R.descPage)
}

function arith(t, page, ref, add, F) {
  if (!t) return
  for (const m of t.matchAll(/\b(\d+)\s+out of\s+(\d+)\s*(?:\w+\s){0,4}?(?:\(\s*(\d+(?:\.\d+)?)\s*%\s*\))?/gi)) {
    const x = +m[1], y = +m[2]
    if (x > y) add('BSCI-13', { ...F, page, ref, msg: `"${m[0].trim()}": ${x} > ${y}`, text: around(t, m.index) })
    else if (m[3] && y > 0 && Math.abs(x / y * 100 - +m[3]) > 1.01) add('BSCI-13', { ...F, page, ref, msg: `"${m[0].trim()}": ${x}/${y} = ${(x / y * 100).toFixed(1)} %`, text: around(t, m.index) })
  }
  for (const m of t.matchAll(/\b(\d+)\s+out\s+(\d+)\b/gi)) add('BSCI-19', { ...F, page, ref, msg: `"${m[0]}" → "${m[1]} out of ${m[2]}"`, text: around(t, m.index) })
  const sents = t.split(/(?<=[.;])\s+/).map(s => s.trim()).filter(s => s.length > 40)
  for (let i = 1; i < sents.length; i++) if (norm(sents[i]) === norm(sents[i - 1])) { add('BSCI-18', { ...F, page, ref, text: sents[i] }); break }
}
const around = (t, i) => String(t || '').slice(Math.max(0, i - 80), i + 160)

function textWide(doc, R, add, F) {
  const seenT = new Set(), seenP = new Set()
  for (const p of prep(doc)) {
    const txt = p.lines.filter(l => !isFooter(l, R.v) && !/\.(?:jpe?g|png|gif|pdf)\b/i.test(l.text)).map(l => l.text).join(' ')
    for (const m of txt.matchAll(/\b[a-z]+\b/gi)) {
      const w = m[0].toLowerCase()
      if (TYPOS[w] && !seenT.has(w)) { seenT.add(w); add('BSCI-19', { ...F, page: p.n, msg: `"${m[0]}" → "${TYPOS[w]}"`, text: txt.slice(Math.max(0, m.index - 60), m.index + 60) }) }
    }
    const ph = PLACEHOLDER.exec(txt)
    if (ph && !seenP.has(ph[0].toLowerCase())) { seenP.add(ph[0].toLowerCase()); add('BSCI-17', { ...F, page: p.n, msg: `"${ph[0]}"`, text: txt.slice(Math.max(0, ph.index - 60), ph.index + 60) }) }
  }
  // v1: open findings without a deadline; finding blocks with empty remarks are normal
  for (const b of R.curBlocks || []) if (b.findings.some(x => x.open) && !b.deadline) add('BSCI-17', { ...F, page: b.page, ref: 'PA ' + b.pa, msg: 'Open findings but no deadline date' })
}

function meta(R, file) {
  const I = R.info, M = R.metrics
  const type = { v1: 'amfori BSCI audit report (BSCI platform extract, 13 PAs)', v2: 'amfori BSCI monitoring result (2021 layout, 13 PAs)', v3: 'amfori BSCI monitoring summary report (2023 layout, 13 PAs)', other: 'amfori BSCI report (layout not recognised)' }[R.v]
  return {
    type,
    title: I.site || I.producer || I.auditee || I.party || I.titleName || file,
    fields: [
      ['Audit / monitoring ID', I.monitoringId || I.auditId], ['Site amfori ID / DBID', I.siteId || I.dbid], ['Audit type', I.auditType], ['Audit dates', [I.start || I.auditDateText, I.end].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' – ')],
      ['Audit company', I.company || I.partner], ['Overall rating', R.overall || (R.overallDerived ? R.overallDerived + ' (derived from PA ratings; not in the PDF text)' : '')], ['PA ratings', Object.keys(R.pa).length ? paStr(R) : ''],
      ['Workers', M.total != null ? String(M.total) : ''], ['Expiry', I.expiry && !/refer/i.test(I.expiry) ? I.expiry : I.followUpBy ? 'follow-up by ' + I.followUpBy : ''], ['Findings read', String(R.findings.filter(x => x.audit === 'current').length)],
    ].filter(f => f[1]),
    ref: I.siteId || I.dbid || I.monitoringId || I.auditId || '',
  }
}

// ---------- cross-file ----------
export function crossCheck(results) {
  const { out, add } = collector(RULES)
  const by = new Map()
  for (const r of results) if (r.kind === 'bsci' && r.R && r.meta.ref) { const k = r.R.info.siteId || r.R.info.dbid; if (!k) continue; if (!by.has(k)) by.set(k, []); by.get(k).push(r) }
  for (const [k, g] of by) {
    if (g.length < 2) continue
    const date = r => D(r.R.info.start || r.R.info.auditDateText || r.R.info.submission)
    g.sort((a, b) => (date(a) || 0) - (date(b) || 0))
    for (let i = 1; i < g.length; i++) {
      const a = g[i - 1], b = g[i], A = a.R, B = b.R
      const files = `${a.file} ↔ ${b.file}`
      const idA = A.info.monitoringId || A.info.auditId, idB = B.info.monitoringId || B.info.auditId
      if (idA && idA === idB) add('BSCI-23', { file: files, ref: k, sev: 'warning', msg: `Same audit ID ${idA} in both files` })
      const nm = x => norm(x.info.site || x.info.producer || x.info.auditee || '')
      if (nm(A) && nm(B) && nm(A) !== nm(B)) add('BSCI-23', { file: files, ref: k, msg: `Site name "${A.info.site || A.info.producer || A.info.auditee}" vs "${B.info.site || B.info.producer || B.info.auditee}"` })
      if (A.info.country && B.info.country && norm(A.info.country) !== norm(B.info.country)) add('BSCI-23', { file: files, ref: k, msg: `Country ${A.info.country} vs ${B.info.country}` })
      const ta = A.metrics.total, tb = B.metrics.total
      if (ta && tb && Math.abs(ta - tb) / Math.max(ta, tb) > 0.3) add('BSCI-23', { file: files, ref: k, sev: 'warning', msg: `Workforce ${ta} → ${tb} (${Math.round((tb - ta) / ta * 100)} %)` })
      const ch = []
      for (let n = 1; n <= 13; n++) { const x = A.pa[n]?.r, y = B.pa[n]?.r; if (x && y && x !== y) ch.push(`PA ${n} ${x}→${y}`) }
      const oa = A.overall || A.overallDerived, ob = B.overall || B.overallDerived
      if (ch.length || (oa && ob && oa !== ob)) add('BSCI-24', { file: files, ref: k, msg: `Overall ${oa || '?'}→${ob || '?'}${ch.length ? '; ' + ch.join(', ') : ''}` })
    }
  }
  return out
}

export function detect(text) {
  const t = String(text || '')
  if (/Validated Audit Report|SMETA|Sedex Members Ethical Trade|CDP|EcoVadis|Clarity/i.test(t.slice(0, 4000)) && !/amfori/i.test(t.slice(0, 4000))) return false
  return (/amfori|BSCI/.test(t)) && (/Site amfori ID|Monitoring (?:summary report|result) for|amfori Social Audit/i.test(t) || (/DBID\s*:/.test(t) && /Audit Id\s*:/.test(t) && /BSCI/.test(t)) || /Performance Area \d+\s*:/.test(t) && /amfori BSCI/i.test(t))
}

// ---------- data extraction ----------
export const EXTRACT = {
  report: [
    { key: 'file', en: 'File', zh: '文件' },
    { key: 'template', en: 'Report layout', zh: '报告版式' },
    { key: 'audit_id', en: 'Audit / monitoring ID', zh: '审核/监察编号' },
    { key: 'amfori_id', en: 'amfori ID (monitored party) / DBID', zh: 'amfori ID（受监察方）/ DBID' },
    { key: 'site_amfori_id', en: 'Site amfori ID', zh: '工厂 amfori ID' },
    { key: 'monitored_party', en: 'Monitored party / producer', zh: '受监察方/生产商' },
    { key: 'site', en: 'Site', zh: '工厂' },
    { key: 'address', en: 'Address', zh: '地址' },
    { key: 'country', en: 'Country', zh: '国家' },
    { key: 'activity', en: 'Monitoring activity', zh: '监察活动' },
    { key: 'sector', en: 'Sector', zh: '行业' },
    { key: 'industry', en: 'Industry', zh: '产业' },
    { key: 'product', en: 'Product / sub-industry', zh: '产品/细分行业' },
    { key: 'audit_type', en: 'Audit type (full / follow-up)', zh: '审核类型（全面/跟进）' },
    { key: 'announcement', en: 'Announcement type', zh: '通知方式' },
    { key: 'audit_start', en: 'Audit start', zh: '审核开始' },
    { key: 'audit_end', en: 'Audit end / closing meeting', zh: '审核结束/末次会议' },
    { key: 'submission', en: 'Submission date', zh: '提交日期' },
    { key: 'expiry', en: 'Expiration date', zh: '到期日期' },
    { key: 'follow_up_by', en: 'Follow-up needed by', zh: '跟进审核截止' },
    { key: 'audit_company', en: 'Audit company', zh: '审核机构' },
    { key: 'lead_auditor', en: 'Lead auditor', zh: '主审核员' },
    { key: 'auditors', en: 'Auditors (APSCA no.)', zh: '审核员（APSCA 编号）' },
    { key: 'coc_version', en: 'Code of Conduct version', zh: '行为准则版本' },
    { key: 'overall_rating', en: 'Overall rating (stated)', zh: '总体评级（报告所述）' },
    { key: 'overall_derived', en: 'Overall rating (derived from PAs)', zh: '总体评级（由各领域推导）' },
    ...PA_NAMES.map((n, i) => ({ key: 'pa' + (i + 1), en: `PA ${i + 1} ${n}`, zh: `绩效领域 ${i + 1}` })),
    { key: 'pas_below_a', en: 'PAs rated below A', zh: '低于 A 的领域数' },
    { key: 'prev_audit', en: 'Previous audit (ID, date, overall)', zh: '上次审核（编号、日期、总体评级）' },
    { key: 'zero_tolerance', en: 'Zero-tolerance mention', zh: '零容忍提及' },
    { key: 'findings', en: 'Findings (open)', zh: '发现数量（未关闭）' },
    { key: 'crucial_findings', en: 'Findings on CRUCIAL questions', zh: '关键问题发现数' },
    { key: 'workers_total', en: 'Workers total', zh: '工人总数' },
    { key: 'workers_male', en: 'Male', zh: '男性' },
    { key: 'workers_female', en: 'Female', zh: '女性' },
    { key: 'permanent', en: 'Permanent', zh: '长期工' },
    { key: 'temporary', en: 'Temporary', zh: '临时工' },
    { key: 'seasonal', en: 'Seasonal', zh: '季节工' },
    { key: 'management', en: 'Management', zh: '管理人员' },
    { key: 'apprentices', en: 'Apprentices', zh: '学徒' },
    { key: 'probation', en: 'On probation', zh: '试用期' },
    { key: 'migrant_domestic', en: 'Domestic migrants', zh: '国内流动工人' },
    { key: 'migrant_foreign', en: 'Foreign migrants', zh: '外籍工人' },
    { key: 'young_workers', en: 'Young workers', zh: '未成年工' },
    { key: 'indirect', en: 'Hired indirectly', zh: '间接雇用' },
    { key: 'night_shift', en: 'Night shift', zh: '夜班' },
    { key: 'disabled', en: 'With disabilities', zh: '残障人士' },
    { key: 'unionised', en: 'Unionised', zh: '工会会员' },
    { key: 'pregnant', en: 'Pregnant', zh: '孕期' },
    { key: 'sample', en: 'Workers sampled', zh: '抽样人数' },
    { key: 'min_wage', en: 'Legal minimum wage', zh: '法定最低工资' },
    { key: 'lowest_wage', en: 'Lowest wage paid', zh: '实付最低工资' },
    { key: 'living_wage', en: 'Living wage estimate', zh: '生活工资估算' },
    { key: 'qc_errors', en: 'QC errors', zh: 'QC 错误' },
    { key: 'qc_warnings', en: 'QC warnings', zh: 'QC 警告' },
  ],
  rows: {
    en: 'Findings', zh: '发现',
    fields: [
      { key: 'file', en: 'File', zh: '文件' },
      { key: 'site', en: 'Site', zh: '工厂' },
      { key: 'audit', en: 'Audit (current / previous)', zh: '审核（本次/上次）' },
      { key: 'audit_id', en: 'Audit ID', zh: '审核编号' },
      { key: 'pa', en: 'Performance area', zh: '绩效领域' },
      { key: 'pa_rating', en: 'PA rating', zh: '领域评级' },
      { key: 'ref', en: 'Question', zh: '问题编号' },
      { key: 'question', en: 'Question text', zh: '问题内容' },
      { key: 'crucial', en: 'Crucial', zh: '关键问题' },
      { key: 'answer', en: 'Answer', zh: '回答' },
      { key: 'status', en: 'Follow-up status', zh: '跟进状态' },
      { key: 'finding', en: 'Finding', zh: '发现描述' },
      { key: 'note', en: 'Auditor note / rating reason', zh: '审核员备注/评分理由' },
      { key: 'legal_ref', en: 'Legal reference', zh: '法律依据' },
      { key: 'deadline', en: 'Deadline', zh: '整改期限' },
      { key: 'auditee_remarks', en: 'Remarks from auditee', zh: '受审方意见' },
      { key: 'page', en: 'Page', zh: '页码' },
    ],
  },
}

export function extract(R, file = '') {
  const I = R.info, M = R.metrics
  const sum = (a, b) => M[a] == null && M[b] == null ? '' : (M[a] ?? 0) + (M[b] ?? 0)
  const v = x => x == null ? '' : x
  const pa = {}
  for (let n = 1; n <= 13; n++) pa['pa' + n] = R.pa[n]?.r || ''
  const cur = R.findings.filter(x => x.audit === 'current')
  const report = {
    file,
    template: { v1: 'BSCI platform extract (2018)', v2: 'amfori monitoring result (2021)', v3: 'amfori monitoring summary (2023)', other: 'other' }[R.v],
    audit_id: v(I.monitoringId || I.auditId), amfori_id: v(I.amforiId || I.dbid), site_amfori_id: v(I.siteId),
    monitored_party: v(I.party || I.producer || I.auditee), site: v(I.site || I.auditee || I.producer),
    address: v(I.address), country: v(I.country), activity: v(I.activity), sector: v(I.Sector || I.sector), industry: v(I.Industry || I.industry),
    product: [I.productGroup, I.productType, I['Sub Industry']].filter(Boolean).join(' / '),
    audit_type: v(I.auditType), announcement: v(I.announcement), audit_start: v(I.start || I.auditDateText), audit_end: v(I.end || I.auditDateText),
    submission: v(I.submission), expiry: /refer/i.test(I.expiry || '') ? '' : v(I.expiry), follow_up_by: v(I.followUpBy),
    audit_company: v(I.company || I.partner) + (I.branch && I.branch !== I.company ? ' (' + I.branch + ')' : ''), lead_auditor: v(I.lead), auditors: R.auditors.join('; '),
    coc_version: v(I.cocVersion), overall_rating: v(R.overall), overall_derived: v(R.overallDerived), ...pa,
    pas_below_a: Object.keys(R.pa).length ? Object.values(R.pa).filter(p => /[B-E]/.test(p.r)).length : '',
    prev_audit: R.prev ? `${R.prev.id}, ${R.prev.date}, ${R.summaryRows.find(s => s.id === R.prev.id)?.overall || ''}`.replace(/, $/, '') : '',
    zero_tolerance: R.ztText.length ? clip(R.ztText.map(l => l.text).join(' | '), 200) : 'none mentioned',
    findings: cur.filter(x => x.open).length, crucial_findings: cur.filter(x => x.crucial).length,
    workers_total: v(M.total), workers_male: v(M.male), workers_female: v(M.female), permanent: sum('permM', 'permF'), temporary: sum('tempM', 'tempF'), seasonal: sum('seasM', 'seasF'),
    management: sum('mgmtM', 'mgmtF'), apprentices: sum('apprM', 'apprF'), probation: sum('probM', 'probF'), migrant_domestic: sum('migDomM', 'migDomF'), migrant_foreign: sum('migForM', 'migForF'),
    young_workers: M.young != null ? M.young : sum('youngM', 'youngF'), indirect: sum('indirectM', 'indirectF'), night_shift: sum('nightM', 'nightF'), disabled: sum('disM', 'disF'), unionised: sum('unionM', 'unionF'),
    pregnant: v(M.preg), sample: v(M.sample), min_wage: v(M.minWage), lowest_wage: v(M.lowWage), living_wage: v(M.livingWage),
    qc_errors: R.qc ? R.qc.error : '', qc_warnings: R.qc ? R.qc.warning : '',
  }
  const rows = R.findings.map(x => ({
    file, site: report.site, audit: x.audit, audit_id: x.auditId || report.audit_id, pa: x.pa ? `PA ${x.pa} ${PA_NAMES[x.pa - 1] || ''}`.trim() : '', pa_rating: x.paRating || '',
    ref: x.ref || '', question: x.question || '', crucial: x.crucial ? 'Yes' : '', answer: x.answer || '', status: x.status || '', finding: clip(x.finding || x.text, 2000),
    note: x.note || '', legal_ref: x.legal || '', deadline: x.deadline || '', auditee_remarks: x.remarks && !/^none$/i.test(x.remarks) ? x.remarks : '', page: x.page,
  }))
  return { report, rows }
}
