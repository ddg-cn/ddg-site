// RBA Validated Audit Report (VAP) checker — full report and executive summary report.
import { cells, collector, clip, mdy, textDates, fmt, days, num, nonLatinShare, PLACEHOLDER, norm } from './common.js'

export const RULES = {
  'RBA-01': { sev: 'error', en: 'Audit or facility information field missing', zh: '审核或工厂信息字段缺失' },
  'RBA-02': { sev: 'error', en: 'Audit dates out of order (start ≤ closing meeting ≤ QC completed) or implausible gaps', zh: '审核日期顺序错误（开始 ≤ 末次会议 ≤ QC 完成）或间隔异常' },
  'RBA-03': { sev: 'warning', en: 'Audit reference number does not match the start date or country', zh: '审核参考编号与开始日期或国家不符' },
  'RBA-04': { sev: 'error', en: 'Conformance results do not add up (conformance + NCs + N/A = total)', zh: '符合性结果加总不一致（符合 + 不符合 + 不适用 = 总数）' },
  'RBA-05': { sev: 'error', en: 'Finding summary by section does not match the overall results', zh: '分章节发现汇总与总体结果不一致' },
  'RBA-06': { sev: 'error', en: 'Compliant / minor / major / priority percentages do not match the counts', zh: '符合/轻微/严重/优先百分比与数量不符' },
  'RBA-07': { sev: 'error', en: 'Non-conformance details list does not match the ratings in the results or the full listing', zh: '不符合项明细与结果或完整清单中的评级不一致' },
  'RBA-08': { sev: 'error', en: 'Executive summary disagrees with the report (finding counts, audit dates, closing meeting)', zh: '执行摘要与报告不一致（发现数量、审核日期、末次会议）' },
  'RBA-09': { sev: 'warning', en: 'Major / priority finding missing from the executive summary list', zh: '执行摘要清单中缺少严重/优先发现' },
  'RBA-10': { sev: 'warning', en: 'Rating and conclusion disagree (NC without evidence, or Conformance that describes a gap)', zh: '评级与结论矛盾（不符合项缺少证据，或“符合”却描述了缺陷）' },
  'RBA-11': { sev: 'error', en: 'Legal non-conformance without a legal reference', zh: '法律不符合项缺少法律依据' },
  'RBA-12': { sev: 'error', en: 'Sample arithmetic: "X out of Y" with X > Y, or a percentage that does not match X/Y', zh: '抽样计算：“X out of Y”中 X > Y，或百分比与 X/Y 不符' },
  'RBA-13': { sev: 'warning', en: 'Stated average or highest value does not match the monthly figures', zh: '所述平均值或最高值与各月数据不符' },
  'RBA-14': { sev: 'warning', en: 'Blank value left in a data point (e.g. "highest of hrs", empty reference)', zh: '数据点中留有空值（如 “highest of hrs”、空的引用）' },
  'RBA-15': { sev: 'warning', en: 'Sentence pasted twice in a row', zh: '同一句话连续重复粘贴' },
  'RBA-16': { sev: 'info', en: 'Record-review periods differ within one question', zh: '同一问题内的记录审阅期间不一致' },
  'RBA-17': { sev: 'error', en: 'Population figures do not add up or differ from the header', zh: '人员数据加总不一致或与封面不符' },
  'RBA-18': { sev: 'warning', en: 'Question rated Not Applicable without a reason', zh: '评为不适用但未说明理由' },
  'RBA-19': { sev: 'warning', en: 'Spelling error from the common-typo list', zh: '常见拼写错误' },
  'RBA-20': { sev: 'error', en: 'Executive summary report differs from the full report', zh: '执行摘要报告与完整报告不一致' },
  'RBA-21': { sev: 'warning', en: 'Placeholder, "Not disclosed" or unfinished text', zh: '占位符、“Not disclosed”或未完成的文字' },
  'RBA-22': { sev: 'warning', en: 'Overall score implausible for the findings (score > 200, or 200 with NCs)', zh: '总分与发现不符（超过 200，或有不符合项仍为 200）' },
  'RBA-23': { sev: 'info', en: 'Data point or conclusion mostly not in English', zh: '数据点或结论大部分不是英文' },
}

const BOILER = /^(Validated Audit Report|Executive Summary Report|Important Notice|RBA CONFIDENTIAL|The information in this report is strictly|\d+ \/ \d+$|\d+$|\/$)/
const ISO3 = { china: 'CHN', india: 'IND', vietnam: 'VNM', 'viet nam': 'VNM', malaysia: 'MYS', thailand: 'THA', mexico: 'MEX', 'united states': 'USA', philippines: 'PHL', indonesia: 'IDN', taiwan: 'TWN', 'korea, republic of': 'KOR', korea: 'KOR', 'south korea': 'KOR', japan: 'JPN', hungary: 'HUN', 'czech republic': 'CZE', czechia: 'CZE', poland: 'POL', germany: 'DEU', brazil: 'BRA', morocco: 'MAR', singapore: 'SGP', 'hong kong': 'HKG', romania: 'ROU', slovakia: 'SVK', ireland: 'IRL', israel: 'ISR', 'costa rica': 'CRI', turkey: 'TUR', türkiye: 'TUR', cambodia: 'KHM', bangladesh: 'BGD', 'sri lanka': 'LKA', egypt: 'EGY', tunisia: 'TUN', canada: 'CAN', 'united kingdom': 'GBR', france: 'FRA', italy: 'ITA', spain: 'ESP', netherlands: 'NLD' }
const TYPOS = { complaince: 'compliance', complaint: null, recieve: 'receive', recieved: 'received', occured: 'occurred', accomodation: 'accommodation', accomodations: 'accommodations', interferance: 'interference', seperate: 'separate', managment: 'management', enviroment: 'environment', goverment: 'government', trainning: 'training', sufficent: 'sufficient', procces: 'process', emergancy: 'emergency', maintainance: 'maintenance', adequete: 'adequate', responsibilty: 'responsibility', comformance: 'conformance', conformace: 'conformance', worksers: 'workers', wokers: 'workers', auditted: 'audited', publically: 'publicly', reimburse_d: null, refered: 'referred', recrutiment: 'recruitment', recuritment: 'recruitment', insurace: 'insurance', ovetime: 'overtime', overtme: 'overtime', perion: 'period', calender: 'calendar', definately: 'definitely', untill: 'until', reciept: 'receipt', occassional: 'occasional', neccessary: 'necessary', necessery: 'necessary', regulaton: 'regulation', certifcate: 'certificate', acheive: 'achieve', wich: 'which', wether: 'whether', thier: 'their', teh: 'the' }

function parse(doc) {
  const lines = doc.pages.flatMap(p => p.lines).filter(l => !BOILER.test(l.text) && !/^Important Notice/.test(l.text))
  const R = { summaryReport: /Executive Summary Report/.test(doc.pages[0]?.lines.map(l => l.text).join(' ') || ''), info: {}, results: null, pct: null, sections: [], ncList: [], exec: '', execPage: null, closing: '', closingPage: null, qs: [], pop: {}, popPage: null }
  // key/value cells on page 1
  const p1 = lines.filter(l => l.page === 1)
  const LABELS = ['Audit Reference Number', 'Audited Facility', 'Overall Audit Score', 'Audit ID', 'QC Completed Date', 'Audit Start Date', 'Closing Meeting Date', 'Audit Type', 'Audit Firm', 'Auditor Information', 'Audit Category', 'Business Type', 'VAP Version', 'Company Name', 'Facility Name', 'RBA Facility ID', 'Facility Address', 'Facility Country', 'Facility Point Of Contact', 'Total Number Of Workers']
  for (const l of p1) {
    const cs = cells(l, 10)
    for (let i = 0; i < cs.length; i++) {
      const lab = LABELS.find(x => cs[i].text === x)
      if (lab && cs[i + 1] && !LABELS.includes(cs[i + 1].text)) R.info[lab] = cs[i + 1].text
      else if (lab && R.info[lab] === undefined) R.info[lab] = ''
    }
  }
  // conformance results: the first line of 9 numbers
  for (const l of lines.slice(0, 200)) {
    const cs = cells(l, 10)
    if (!R.results && cs.length === 9 && cs.every(c => num(c.text) != null)) {
      const v = cs.map(c => num(c.text))
      R.results = { score: v[0], conf: v[1], risk: v[2], minor: v[3], major: v[4], priority: v[5], ofi: v[6], total: v[7], na: v[8], page: l.page }
    }
    if (!R.pct && cs.length === 4 && cs.every(c => /^\d+(\.\d+)?%$/.test(c.text))) R.pct = { conf: num(cs[0].text), minor: num(cs[1].text), major: num(cs[2].text), priority: num(cs[3].text), page: l.page }
  }
  // section table
  const si = lines.findIndex(l => /^Finding Summary by Section/.test(l.text))
  if (si >= 0) {
    for (let j = si + 1; j < lines.length && R.sections.length < 5 && !/^#|Working Hours|Non-conformance Findings/.test(lines[j].text); j++) {
      const cs = cells(lines[j], 10)
      const nums = cs.filter(c => num(c.text) != null && c.x > 100)
      if (nums.length === 8) {
        const v = nums.map(c => num(c.text))
        R.sections.push({ name: 'ABCDE'[R.sections.length], conf: v[0], risk: v[1], minor: v[2], major: v[3], priority: v[4], ofi: v[5], total: v[6], na: v[7], page: lines[j].page })
      }
    }
  }
  // NC details list
  const ni = lines.findIndex(l => /^Non-conformance Findings Details/.test(l.text))
  const ne = lines.findIndex((l, i) => i > ni && /^Process and Summary$|^Question # Process and Summary/.test(l.text))
  if (ni >= 0) for (const l of lines.slice(ni, ne > 0 ? ne : ni + 200)) {
    const cs = cells(l, 10)
    let rt = cs.find(c => /Non-Conformance|Risk of|Opportunity|^Conformance$/i.test(c.text) && c.x > 400)
    if (!rt) { const m = /((?:Priority|Major|Minor|Risk of) Non-Conformance|Opportunity for Improvement)$/i.exec(l.text); if (m) rt = { text: m[1] } }
    if (/^VAP-[A-E]/.test(cs[0]?.text || '')) R.ncList.push({ id: cs[0].text.split(' ')[0], rating: rt ? rt.text : '', page: l.page })
    else if (rt && R.ncList.length && !R.ncList[R.ncList.length - 1].rating) R.ncList[R.ncList.length - 1].rating = rt.text
  }
  // executive summary + closing meeting
  const ei = lines.findIndex(l => /^Process and summary: Executive summary/i.test(l.text) || /^VAP-Info19\.7/.test(l.text))
  if (ei >= 0) {
    const buf = []
    for (let j = ei + 1; j < lines.length && !/^Question #/.test(lines[j].text); j++) buf.push(lines[j].text)
    R.exec = buf.join(' ').replace(/^Process and summary: Executive summary\s*/i, '').replace(/VAP-\s+/g, 'VAP-')
    R.execPage = lines[ei].page
  }
  const ci = lines.findIndex(l => /^VAP-Info19\.4/.test(l.text))
  if (ci >= 0) { const buf = [lines[ci].text]; for (let j = ci + 1; j < lines.length && !/^VAP-Info/.test(lines[j].text); j++) buf.push(lines[j].text); R.closing = buf.join(' '); R.closingPage = lines[ci].page }
  // full listing
  const fi = lines.findIndex(l => /^Full Listing of Questionnaire Results/.test(l.text))
  let q = null, field = null
  if (fi >= 0) for (const l of lines.slice(fi + 1)) {
    const cs = cells(l, 10)
    const lab = cs[0] && cs[0].x < 60 ? cs[0].text : null
    if (/^VAP-Info\d/.test(l.text) || /^(GENERAL|POPULATION|SITE ACTIVITIES|AUDIT INFORMATION|FACILITY INFORMATION)/.test(l.text)) { q = null; field = null }
    if (lab === 'Question #') { q = { id: (cs[1]?.text || '').trim(), text: '', rating: '', conclusion: '', dp: [], page: l.page }; R.qs.push(q); field = null; continue }
    if (!q) continue
    if (lab && /^(Question Text|Rating|Conclusion|Data points)$/.test(lab)) {
      field = lab
      const rest = cs.slice(1).map(c => c.text).join(' ')
      if (field === 'Data points') { if (rest) q.dp.push({ t: rest, page: l.page }) } else q[field === 'Question Text' ? 'text' : field.toLowerCase()] += rest
      continue
    }
    if (lab && cs[0].x < 60 && cs.length === 1 && /^[A-E](\.M)?\d*\)|^[A-E]\.M\.\d+\)/.test(lab)) { field = null; continue }
    if (!field) continue
    const t = cs.map(c => c.text).join(' ')
    if (field === 'Data points') {
      if (/^Data Point:/.test(t) || !q.dp.length) q.dp.push({ t, page: l.page })
      else q.dp[q.dp.length - 1].t += ' ' + t
    } else { const k = field === 'Question Text' ? 'text' : field.toLowerCase(); q[k] += (q[k] ? ' ' : '') + t }
  }
  // population info
  for (const l of lines) {
    const m = /^VAP-Info(2\.\d[a-z]?|3\.\d+)\s*-\s*(.*)$/.exec(l.text)
    if (!m) continue
    const cs = cells(l, 10)
    let v = cs.length > 1 ? cs[cs.length - 1].text : (/\s(\d[\d,]*|NA|Not disclosed)$/.exec(m[2]) || [])[1]
    R.pop[m[1]] = { v: num(v), raw: v, page: l.page }
    if (!R.popPage) R.popPage = l.page
  }
  return R
}

export function check(doc, file = '') {
  const { out, add } = collector(RULES)
  const F = { file }
  const R = parse(doc)
  const I = R.info
  const need = ['Audit Reference Number', 'Audited Facility', 'Overall Audit Score', 'Audit ID', 'QC Completed Date', 'Audit Start Date', 'Closing Meeting Date', 'Audit Type', 'Audit Firm', 'Auditor Information', 'Audit Category', 'VAP Version', 'Facility Name', 'Facility Address', 'Facility Country', 'Total Number Of Workers']
  const miss = need.filter(k => !I[k] || /^(-|na|n\/a|not disclosed)$/i.test(I[k]))
  if (miss.length) add('RBA-01', { ...F, page: 1, msg: 'Missing: ' + miss.join(', ') })
  const start = mdy(I['Audit Start Date']), close = mdy(I['Closing Meeting Date']), qc = mdy(I['QC Completed Date'])
  if (start && close && close < start) add('RBA-02', { ...F, page: 1, msg: `Closing meeting ${fmt(close)} before start ${fmt(start)}` })
  if (close && qc && qc < close) add('RBA-02', { ...F, page: 1, msg: `QC completed ${fmt(qc)} before closing meeting ${fmt(close)}` })
  if (start && close && days(start, close) > 14) add('RBA-02', { ...F, sev: 'warning', page: 1, msg: `Closing meeting ${days(start, close)} days after the start` })
  if (qc && qc > new Date()) add('RBA-02', { ...F, page: 1, msg: `QC completed ${fmt(qc)} is in the future` })
  const ref = I['Audit Reference Number'] || ''
  const rm = /^VAR-(\d{8})-([A-Z]{3})-/.exec(ref)
  if (ref && !rm) add('RBA-03', { ...F, page: 1, msg: `Unexpected format "${ref}"` })
  if (rm && start && rm[1] !== fmt(start).replace(/-/g, '')) add('RBA-03', { ...F, page: 1, msg: `Reference date ${rm[1]} vs audit start ${fmt(start)}` })
  const iso = ISO3[(I['Facility Country'] || '').toLowerCase().trim()]
  if (rm && iso && rm[2] !== iso) add('RBA-03', { ...F, page: 1, msg: `Reference country ${rm[2]} vs facility country ${I['Facility Country']}` })
  const scoreTxt = /([\d.]+)\s*\/\s*200/.exec(I['Overall Audit Score'] || '')
  const X = R.results
  if (X) {
    const sumNc = X.risk + X.minor + X.major + X.priority
    if (X.conf + sumNc + X.na !== X.total && X.conf + sumNc + X.ofi + X.na !== X.total) add('RBA-04', { ...F, page: X.page, msg: `${X.conf} conformance + ${sumNc} NC/risk + ${X.na} N/A = ${X.conf + sumNc + X.na}, total scored questions ${X.total}` })
    if (scoreTxt && Math.abs(+scoreTxt[1] - X.score) > 0.05) add('RBA-04', { ...F, page: 1, msg: `Overall Audit Score ${scoreTxt[1]} vs results table ${X.score}` })
    if (X.score > 200 || X.score < 0 || (X.score === 200 && sumNc > 0)) add('RBA-22', { ...F, page: 1, msg: `Score ${X.score} with ${sumNc} NC/risk finding(s)` })
    if (R.sections.length) {
      for (const k of ['conf', 'risk', 'minor', 'major', 'priority', 'ofi', 'total', 'na']) {
        const s = R.sections.reduce((a, r) => a + r[k], 0)
        if (s !== X[k]) add('RBA-05', { ...F, page: R.sections[0].page, msg: `${k}: sections add up to ${s}, overall ${X[k]}` })
      }
      for (const r of R.sections) if (r.conf + r.risk + r.minor + r.major + r.priority + r.na !== r.total && r.conf + r.risk + r.minor + r.major + r.priority + r.ofi + r.na !== r.total) add('RBA-05', { ...F, page: r.page, ref: 'Section ' + r.name, msg: `Section ${r.name}: ${r.conf}+${r.risk}+${r.minor}+${r.major}+${r.priority}+${r.na} ≠ ${r.total}` })
    }
    if (R.pct) {
      const base = X.total - X.na
      const exp = { conf: X.conf / base * 100, minor: X.minor / base * 100, major: X.major / base * 100, priority: X.priority / base * 100 }
      for (const k of Object.keys(exp)) if (Math.abs(exp[k] - R.pct[k]) > 0.06) add('RBA-06', { ...F, page: R.pct.page, msg: `${k}: shown ${R.pct[k]} %, counts give ${exp[k].toFixed(2)} %` })
    }
    // NC list vs counts
    if (R.ncList.length || sumNc) {
      const cnt = { minor: 0, major: 0, priority: 0, risk: 0 }
      for (const n of R.ncList) { const t = n.rating.toLowerCase(); if (/priority/.test(t)) cnt.priority++; else if (/major/.test(t)) cnt.major++; else if (/minor/.test(t)) cnt.minor++; else if (/risk/.test(t)) cnt.risk++ }
      for (const k of ['minor', 'major', 'priority']) if (cnt[k] !== X[k]) add('RBA-07', { ...F, page: R.ncList[0]?.page || X.page, msg: `${k} NCs: ${X[k]} in the results, ${cnt[k]} in the details list` })
    }
  }
  // full listing vs NC list
  const qById = new Map(R.qs.map(q => [q.id, q]))
  if (R.qs.length) {
    for (const n of R.ncList) { const q = qById.get(n.id); if (q && norm(q.rating) !== norm(n.rating)) add('RBA-07', { ...F, page: q.page, ref: n.id, msg: `Details list "${n.rating}", full listing "${q.rating}"` }) }
    const listed = new Set(R.ncList.map(n => n.id))
    for (const q of R.qs) if (/non-conformance/i.test(q.rating) && !listed.has(q.id) && R.ncList.length + 0 >= 0 && R.ncList.length) add('RBA-07', { ...F, page: q.page, ref: q.id, msg: `${q.rating} in the full listing but not in the details list` })
    if (X) {
      const c = { conf: 0, na: 0 }
      for (const q of R.qs) { if (/^conformance$/i.test(q.rating.trim())) c.conf++; if (/not applicable|^n\/?a$/i.test(q.rating.trim())) c.na++ }
      const scored = R.qs.filter(q => /^VAP-[A-E]/.test(q.id)).length
      if (scored >= X.total * 0.9 && c.conf !== X.conf) add('RBA-07', { ...F, page: X.page, msg: `Conformance: ${X.conf} in the results, ${c.conf} rated Conformance in the full listing` })
    }
  }
  // executive summary
  const E = R.exec
  if (E && X) {
    const pick = re => { const m = re.exec(E); return m ? +m[1] : null }
    const es = { priority: pick(/Priority findings?\s*:?\s*(\d+)/i), major: pick(/Major findings?\s*:?\s*(\d+)/i), minor: pick(/minor findings?\s*:?\s*(\d+)/i), risk: pick(/Risk of non-?conformance\s*:?\s*(\d+)/i), ofi: pick(/Opportunit(?:y|ies) for improvement\s*:?\s*(\d+)/i) }
    for (const [k, v] of Object.entries(es)) if (v != null && v !== X[k]) add('RBA-08', { ...F, page: R.execPage, msg: `Executive summary says ${k} ${v}; results show ${X[k]}` })
    const held = /held from (.{6,30}?) to (.{6,30}?)[.;,]/i.exec(E)
    if (held) {
      const a = textDates(held[1])[0]?.d, b = textDates(held[2])[0]?.d
      if (a && start && fmt(a) !== fmt(start)) add('RBA-08', { ...F, page: R.execPage, msg: `Summary: audit held from ${fmt(a)}; Audit Start Date ${fmt(start)}`, text: held[0] })
      if (b && close && fmt(b) !== fmt(close)) add('RBA-08', { ...F, sev: 'warning', page: R.execPage, msg: `Summary: audit held until ${fmt(b)}; Closing Meeting Date ${fmt(close)}`, text: held[0] })
    }
    // majors listed
    const majors = R.qs.filter(q => /major|priority/i.test(q.rating)).map(q => q.id)
    const fromList = R.ncList.filter(n => /major|priority/i.test(n.rating)).map(n => n.id)
    const ids = [...new Set([...majors, ...fromList])]
    const missing = ids.filter(id => !new RegExp(id.replace(/\./g, '\\.') + '(?![\\d.])').test(E))
    if (/List of Major Findings/i.test(E) && missing.length) add('RBA-09', { ...F, page: R.execPage, msg: 'Not in the list: ' + missing.join(', ') })
  }
  if (R.closing && close) {
    const d = textDates(R.closing)[0]?.d
    if (d && fmt(d) !== fmt(close)) add('RBA-08', { ...F, page: R.closingPage, msg: `Closing meeting text ${fmt(d)}; Closing Meeting Date ${fmt(close)}`, text: R.closing })
  }
  // per question
  for (const q of R.qs) {
    const rating = q.rating.trim(), con = q.conclusion
    const all = con + ' ' + q.dp.map(d => d.t).join(' ')
    if (/non-conformance|risk of/i.test(rating) && (!con || con.length < 40 || norm(con) === norm(q.text))) add('RBA-10', { ...F, page: q.page, ref: q.id, msg: `${rating} without evidence in the conclusion`, text: con })
    if (/^conformance$/i.test(rating) && /\bhowever\b[^.]{0,80}\b(not|no|exceed|fail|lack|missing)/i.test(con)) add('RBA-10', { ...F, page: q.page, ref: q.id, msg: 'Rated Conformance, but the conclusion describes a gap', text: con })
    if (/not applicable|^n\/?a$/i.test(rating) && con.length < 25) add('RBA-18', { ...F, page: q.page, ref: q.id, text: con })
    if (/legal (non[- ]?conformance|non[- ]?compliance|nc)|non[- ]?complian\w+ (?:with|to) (?:local )?law/i.test(con)) {
      if (/Legal Reference\s*:\s*(;|$|\.)/i.test(con) || !/(article|art\.|law|regulation|act\b|code\b|rules?\b|decree|ordinance|standard|GB\s?\d|第.{1,6}条|法)/i.test(con.replace(/legal (non[- ]?conformance|non[- ]?compliance)|local law/gi, ''))) add('RBA-11', { ...F, page: q.page, ref: q.id, msg: /Legal Reference\s*:\s*(;|$)/i.test(con) ? '"Legal Reference:" is empty' : 'No law or article cited', text: con })
    }
    for (const d of [{ t: con, page: q.page }, ...q.dp]) arith(d, q, add, F)
    if (q.dp.length) {
      const periods = new Set()
      for (const d of q.dp) { const m = d.t.matchAll(/for the period (\w+ \d{4}) to (\w+ \d{4})/gi); for (const x of m) periods.add(x[1] + ' – ' + x[2]) }
      if (periods.size > 1) add('RBA-16', { ...F, page: q.page, ref: q.id, msg: [...periods].join('; ') })
    }
    const nl = nonLatinShare(all.replace(/\[[^\]]*\]|《[^》]*》[^。]*。/g, ''))
    if (nl > 0.35) add('RBA-23', { ...F, page: q.page, ref: q.id })
  }
  // population
  const P = k => R.pop[k]?.v
  if (P('2.3') != null) {
    if (P('2.1') != null && P('2.2') != null && P('2.1') + P('2.2') !== P('2.3')) add('RBA-17', { ...F, page: R.popPage, msg: `Male ${P('2.1')} + female ${P('2.2')} ≠ total ${P('2.3')}` })
    const hw = num(I['Total Number Of Workers'])
    if (hw != null && hw !== P('2.3')) add('RBA-17', { ...F, page: R.popPage, msg: `Total workers ${P('2.3')} vs ${hw} on page 1` })
    if (P('3.4') != null && P('3.5') != null && P('3.6') != null && P('3.4') + P('3.5') !== P('3.6')) add('RBA-17', { ...F, page: R.popPage, msg: `Migrant male ${P('3.4')} + female ${P('3.5')} ≠ total ${P('3.6')}` })
    for (const k of ['3.1', '3.2', '3.3', '3.6', '3.7']) if (P(k) != null && P(k) > P('2.3') && k !== '3.7') add('RBA-17', { ...F, page: R.popPage, msg: `Info${k} = ${P(k)} exceeds total workers ${P('2.3')}` })
    if (P('3.1') > 0 && /no young workers/i.test(doc.text)) add('RBA-17', { ...F, page: R.popPage, msg: `${P('3.1')} worker(s) under 18, but the report says "No young workers"` })
  }
  // text-wide checks
  const seenT = new Set(), seenP = new Set()
  for (const p of doc.pages) {
    const txt = p.lines.filter(l => !BOILER.test(l.text)).map(l => l.text).join(' ')
    for (const m of txt.matchAll(/\b[a-z]+\b/gi)) {
      const w = m[0].toLowerCase()
      if (TYPOS[w] && !seenT.has(w)) { seenT.add(w); add('RBA-19', { ...F, page: p.n, msg: `"${m[0]}" → "${TYPOS[w]}"`, text: txt.slice(Math.max(0, m.index - 60), m.index + 60) }) }
    }
    const ph = PLACEHOLDER.exec(txt)
    if (ph && !seenP.has(ph[0])) { seenP.add(ph[0]); add('RBA-21', { ...F, page: p.n, msg: `"${ph[0]}"`, text: txt.slice(Math.max(0, ph.index - 60), ph.index + 60) }) }
  }
  const nd = []
  for (const l of doc.pages.flatMap(p => p.lines)) if (/Not disclosed/i.test(l.text) && !/Management Interview Not disclosed/i.test(l.text)) nd.push(l)
  if (nd.length) add('RBA-21', { ...F, sev: 'info', page: nd[0].page, msg: `"Not disclosed" appears ${nd.length} time(s), e.g. ${clip(nd[0].text, 80)}` })
  return { kind: 'rba', meta: meta(R, file), findings: out, stats: { questions: R.qs.length, ncs: R.ncList.length }, R }
}

// Arithmetic inside one text block.
function arith(d, q, add, F) {
  const t = d.t
  if (!t) return
  for (const m of t.matchAll(/\b(\d+)\s+out of\s+(\d+)\s*(?:\(\s*(\d+(?:\.\d+)?)\s*%\s*\))?/gi)) {
    const x = +m[1], y = +m[2]
    if (x > y) add('RBA-12', { ...F, page: d.page, ref: q.id, msg: `"${m[0]}": ${x} > ${y}`, text: around(t, m.index) })
    else if (m[3] && y > 0 && Math.abs(x / y * 100 - +m[3]) > 1.01) add('RBA-12', { ...F, page: d.page, ref: q.id, msg: `"${m[0]}": ${x}/${y} = ${(x / y * 100).toFixed(1)} %`, text: around(t, m.index) })
  }
  // average vs monthly values: "Average = 7.1% with a highest of 70 ... (Dec 2024) 9 % with a highest of 70 ... (Mar 2025) 5 % ..."
  for (const m of t.matchAll(/Average\s*=\s*(\d+(?:\.\d+)?)\s*%\s*with a highest of\s*(\d+(?:\.\d+)?)?/gi)) {
    const seg = t.slice(m.index + m[0].length, m.index + m[0].length + 500).split(/Average\s*=|VAP-[A-E]\d|Data Point:/i)[0]
    const mons = [...seg.matchAll(/\(?\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\)?\s*(?:\(random\))?\s*=?\s*(\d+(?:\.\d+)?)\s*%\s*with a highest of\s*(\d+(?:\.\d+)?)?/gi)]
    if (mons.length >= 2) {
      const vals = mons.map(x => +x[1]), avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const step = /\.\d/.test(m[1]) ? 0.051 : 0.51
      if (Math.abs(avg - +m[1]) > Math.max(step, 0.15) + 0.5 * (vals.some(v => !Number.isInteger(v)) ? 0 : 1)) add('RBA-13', { ...F, page: d.page, ref: q.id, msg: `Average ${m[1]} %, monthly ${vals.join(' / ')} % average ${avg.toFixed(1)} %`, text: around(t, m.index) })
      const hs = mons.map(x => x[2] != null ? +x[2] : null).filter(v => v != null)
      if (m[2] != null && hs.length && Math.max(...hs) !== +m[2]) add('RBA-13', { ...F, page: d.page, ref: q.id, msg: `Highest ${m[2]}, monthly highest ${hs.join(' / ')}`, text: around(t, m.index) })
    }
  }
  const blank = /\bhighest of\s+(?:hrs|h\b|hours|h\/|consecutive|days\b|%)|\b(?:Record reference|Version Number|Issue date|Legal Reference)\s*:\s*[,;]|\bRMB\s*(?:per|\/|,|\.)\s|\b(?:is|are|of|=)\s+%/i
  const b = blank.exec(t)
  if (b && !/\b0\s*%\s*with a\s*$/i.test(t.slice(Math.max(0, b.index - 14), b.index))) add('RBA-14', { ...F, page: d.page, ref: q.id, msg: `"${b[0].trim()}"`, text: around(t, b.index) })
  // sentence pasted twice in a row
  const sents = t.split(/(?<=[.;])\s+/).map(s => s.trim()).filter(s => s.length > 40)
  for (let i = 1; i < sents.length; i++) if (norm(sents[i]) === norm(sents[i - 1])) { add('RBA-15', { ...F, page: d.page, ref: q.id, text: sents[i] }); break }
}
const around = (t, i) => t.slice(Math.max(0, i - 80), i + 160)

function meta(R, file) {
  const I = R.info
  return {
    type: R.summaryReport ? 'RBA VAP – executive summary report' : 'RBA VAP – full report',
    title: I['Audited Facility'] || I['Facility Name'] || file,
    fields: [['Audit ref.', I['Audit Reference Number']], ['Audit firm', I['Audit Firm']], ['Audit dates', [I['Audit Start Date'], I['Closing Meeting Date']].filter(Boolean).join(' – ')], ['Score', I['Overall Audit Score']], ['VAP version', I['VAP Version']], ['Questions read', String(R.qs.length || '')]].filter(f => f[1]),
    ref: I['Audit Reference Number'],
  }
}

export function crossCheck(results) {
  const { out, add } = collector(RULES)
  const byRef = new Map()
  for (const r of results) if (r.kind === 'rba' && r.meta.ref) { if (!byRef.has(r.meta.ref)) byRef.set(r.meta.ref, []); byRef.get(r.meta.ref).push(r) }
  for (const [ref, g] of byRef) {
    const full = g.find(r => !r.R.summaryReport), sum = g.find(r => r.R.summaryReport)
    if (!full || !sum) continue
    const a = full.R, b = sum.R
    for (const k of Object.keys(a.info)) if (b.info[k] !== undefined && a.info[k] !== b.info[k]) add('RBA-20', { file: sum.file, ref, msg: `${k}: "${b.info[k]}" vs "${a.info[k]}" in the full report` })
    if (a.results && b.results) for (const k of Object.keys(a.results)) if (k !== 'page' && a.results[k] !== b.results[k]) add('RBA-20', { file: sum.file, ref, msg: `${k}: ${b.results[k]} vs ${a.results[k]} in the full report` })
    const ia = a.ncList.map(n => n.id + n.rating).join('|'), ib = b.ncList.map(n => n.id + n.rating).join('|')
    if (ia !== ib) add('RBA-20', { file: sum.file, ref, msg: 'Non-conformance details list differs from the full report' })
  }
  return out
}

export function detect(text) { return /Validated Audit Report/.test(text) && /RBA/.test(text) }
