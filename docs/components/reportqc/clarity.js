// Clarity (Bureau Veritas) field audit report checker.
// Report types: Social, Environment, Health & Safety, Business Ethics (checklists) and Summary.
import { cells, collector, clip, nonLatinShare, dmy, fmt, days, negativeHits, norm, PLACEHOLDER, lineText } from './common.js'

export const RULES = {
  'CL-01': { sev: 'error', en: 'Cover page field missing (site, address, contact, telephone, email, completed by/on, report no.)', zh: '封面字段缺失（工厂、地址、联系人、电话、邮箱、完成人/日期、报告编号）' },
  'CL-02': { sev: 'error', en: 'Report number differs between pages or has an unexpected format', zh: '各页报告编号不一致或格式异常' },
  'CL-03': { sev: 'warning', en: 'Report is marked as a draft', zh: '报告标记为草稿' },
  'CL-04': { sev: 'error', en: 'Completed On date missing, unreadable or in the future', zh: '完成日期缺失、无法识别或晚于今天' },
  'CL-05': { sev: 'error', en: 'Score table: section nonconformities do not add up to the Total row', zh: '得分表：各章节不符合项之和与“Total”行不一致' },
  'CL-06': { sev: 'error', en: 'Score table: required-practice NCs exceed total NCs, or a 100 % section has NCs', zh: '得分表：必要实践不符合项多于总数，或 100% 的章节仍有不符合项' },
  'CL-07': { sev: 'error', en: 'Score table: Total score lies outside the range of the section scores', zh: '得分表：总分不在各章节得分范围内' },
  'CL-08': { sev: 'error', en: 'NC count in the score table differs from the rows in the Synthetic Overview of Nonconformities', zh: '得分表不符合项数与“不符合项汇总”行数不一致' },
  'CL-09': { sev: 'error', en: 'Audit summary states a different number of NCs (or "no NC") than the score table', zh: '审核总结中的不符合项数量（或“无不符合项”）与得分表不一致' },
  'CL-10': { sev: 'error', en: 'NC action plan contact: NCs raised but contact is NA/blank (or NA expected but filled)', zh: '不符合项行动计划联系人：有不符合项却填 NA/空白（或无不符合项却填写）' },
  'CL-11': { sev: 'error', en: 'Synthetic overview row without NC status or target completion date', zh: '不符合项汇总行缺少状态或目标完成日期' },
  'CL-12': { sev: 'warning', en: 'Target completion date is before the audit, or more than 12 months after it', zh: '目标完成日期早于审核日期，或晚于审核日期 12 个月以上' },
  'CL-13': { sev: 'warning', en: 'NC status "Open" while the comments say the correction was accepted/closed (or "Closed" without follow-up evidence)', zh: '状态为 Open 但评论称整改已接受/关闭（或 Closed 却无跟进证据）' },
  'CL-14': { sev: 'warning', en: 'NC in the overview, but the checklist answer is "Yes" (or the checkpoint is missing from the checklist)', zh: '汇总中列为不符合项，但检查表答案为“Yes”（或检查表中没有该检查点）' },
  'CL-15': { sev: 'error', en: 'Checklist question without an answer', zh: '检查表问题未作答' },
  'CL-16': { sev: 'error', en: '"No", "Partially" or "NA" answer without a comment', zh: '“No”“Partially”或“NA”答案缺少评论' },
  'CL-17': { sev: 'warning', en: '"Yes" answer without a comment (no evidence recorded)', zh: '“Yes”答案没有评论（未记录证据）' },
  'CL-18': { sev: 'warning', en: '"Yes" answer whose comment describes a gap (possible wrong answer)', zh: '答案为“Yes”但评论描述了缺陷（答案可能有误）' },
  'CL-19': { sev: 'warning', en: 'Comment is too short or generic to serve as evidence', zh: '评论过短或过于笼统，不足以作为证据' },
  'CL-20': { sev: 'warning', en: 'Comment is not in English', zh: '评论不是英文' },
  'CL-21': { sev: 'info', en: 'Same comment pasted on three or more questions', zh: '同一评论粘贴在三个及以上问题' },
  'CL-22': { sev: 'warning', en: 'Comment cites a date after the audit date', zh: '评论引用的日期晚于审核日期' },
  'CL-23': { sev: 'error', en: 'Section marked "Not Relevant" without a justification', zh: '章节标记“Not Relevant”但未说明理由' },
  'CL-24': { sev: 'warning', en: 'Audit summary missing, too short, or still template text', zh: '审核总结缺失、过短或仍为模板文字' },
  'CL-25': { sev: 'warning', en: 'Placeholder or unfinished text', zh: '占位符或未完成的文字' },
  'CL-26': { sev: 'error', en: 'Summary report: number of employees or strengths/weaknesses missing', zh: '汇总报告：缺少员工人数或优势/不足' },
  'CL-27': { sev: 'warning', en: 'Files of one site disagree (site name, auditor, or audit dates more than 60 days apart)', zh: '同一工厂的多份报告不一致（工厂名称、审核员，或审核日期相差超过 60 天）' },
}

const ANS = /^(Yes|No|Partially|N\/?A|Not Applicable)$/i
const REF = /^[A-Z]{1,2}\.\d+\.\d+(?:_\d+)?$/
const REF_OV = /^[A-Z]{1,2}\.\d+\.\d+$/
const GENERIC = /^(yes|no|ok|okay|na|n\/a|nil|none|verified|checked|available|done|in place|provided|compliant|complied|confirmed|noted|partially|not applicable|refer(?: to)? (?:above|document)s?)\.?$/i

function parse(doc) {
  const all = doc.pages.flatMap(p => p.lines)
  const p1 = (doc.pages[0]?.lines || []).map(l => l.text).join('\n')
  const head = (doc.pages.slice(0, 4).flatMap(p => p.lines)).map(l => l.text).join('\n')
  const R = { cover: {}, reportNos: [], rel: [], score: [], total: null, summary: '', summaryPage: null, contact: {}, ov: [], rows: [], type: '' }
  const t = /(SOCIAL|ENVIRONMENT|HEALTH\s*&\s*SAFETY|BUSINESS ETHICS|SUMMARY)\s*\n?\s*(FIELD AUDIT|SELF ASSESSMENT)/i.exec(p1)
  R.saq = !!(t && /SELF/i.test(t[2]))
  R.type = t ? t[1].replace(/\s+/g, ' ').toUpperCase() : ''
  const grab = (re) => { const m = re.exec(head); return m ? m[1].trim() : '' }
  R.cover = {
    site: grab(/Site\s*:\s*(.+)/), address: grab(/Address\s*:\s*(.+)/), contact: grab(/Contact Person\s*:\s*(.*)/),
    telephone: grab(/Telephone\s*:\s*(.*)/), email: grab(/Email\s*:\s*(.*)/), by: grab(/Completed By\s*:\s*(.*)/), on: grab(/Completed On\s*:\s*(.*)/),
  }
  for (const p of doc.pages) {
    const l = p.lines.find(l => /Report No\s*:/.test(l.text))
    if (l) R.reportNos.push({ page: p.n, no: l.text.replace(/.*Report No\s*:\s*/, '').trim() })
  }
  // section relevancy
  let i = all.findIndex(l => /Section Name/.test(l.text) && /Response/.test(l.text))
  if (i >= 0) {
    for (let j = i + 1; j < all.length && !/Practice in Place/i.test(all[j].text); j++) {
      const c = cells(all[j])
      const resp = c.find(x => /^(Not )?Relevant$/i.test(x.text))
      if (resp) R.rel.push({ name: c[0].text, resp: resp.text, comment: c.filter(x => x.x > resp.x + 40).map(x => x.text).join(' '), page: all[j].page })
    }
  }
  // score table
  for (const l of all) {
    const c = cells(l)
    if (c.length === 4 && /%$/.test(c[1].text) && /^\d+$/.test(c[2].text) && /^\d+$/.test(c[3].text)) {
      const row = { name: c[0].text, pct: parseFloat(c[1].text), req: +c[2].text, tot: +c[3].text, page: l.page }
      if (/^Total$/i.test(row.name)) { if (!R.total) R.total = row } else if (!R.total) R.score.push(row)
    }
  }
  // audit summary
  i = all.findIndex(l => /^Audit Summary \(to be written/i.test(l.text) || /^Audit Summary$/i.test(l.text) && R.type === 'SUMMARY')
  if (i >= 0) {
    const buf = []
    for (let j = i; j < all.length && !/Nonconformity Action Plan Contact|^Report No/i.test(all[j].text); j++) buf.push(all[j].text)
    R.summary = buf.join(' ').replace(/^Audit Summary\s*(\(to be written after completing the below checklist\))?/i, '').trim()
    R.summaryPage = all[i].page
  }
  for (const [k, re] of [['name', /^Contact Name\s*(.*)$/i], ['email', /^Contact Email\s*(.*)$/i], ['phone', /^Contact Phone Number\s*(.*)$/i]]) {
    const l = all.find(l => re.test(l.text)); if (l) R.contact[k] = re.exec(l.text)[1].trim()
  }
  // synthetic overview + checklist
  const ovStart = all.findIndex(l => /Synthetic Overview of Nonconformities/i.test(l.text))
  const clStart = all.findIndex(l => /^CLARITY .*CHECKLIST$/i.test(l.text))
  const ovEnd = all.findIndex((l, i) => i > ovStart && (/^CLARITY .*CHECKLIST$|^OTHER RECORDS PROVIDED/i.test(l.text)))
  R.hasOv = ovStart >= 0
  if (ovStart >= 0) R.ov = table(all.slice(ovStart, ovEnd >= 0 ? ovEnd : all.length), 'ov')
  if (clStart >= 0) R.rows = table(all.slice(clStart), 'cl')
  return R
}

// Reads a table whose rows are anchored by a checkpoint reference in a narrow column.
function table(lines, kind) {
  let cols = null
  const anchors = []
  const rows = []
  const isFooter = l => /^Report No/.test(l.text)
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k]
    const cs = cells(l)
    const isHdr = cs.some(c => /^Comments\/?(Observations)?$/.test(c.text)) ||
      (cs.some(c => /^Practice( in)?$/.test(c.text)) && lines.some(m => m.page === l.page && Math.abs(m.y - l.y) < 14 && cells(m).some(c => /^Comments\/?(Observations)?$/.test(c.text))))
    if (isHdr) {
      const nearL = lines.filter(m => m.page === l.page && Math.abs(m.y - l.y) < 14)
      for (const m of nearL) m.header = true
      const near = nearL.flatMap(m => cells(m))
      const xs = near.map(c => ({ x: c.x, t: c.text }))
      const find = re => xs.find(c => re.test(c.t))?.x
      if (kind === 'cl' && find(/^Practice/) == null) continue
      cols = { practice: find(/^Practice/), comments: find(/^Comments/), xs: xs.map(c => c.x).sort((a, b) => a - b), hy: l.y, page: l.page }
      l.header = true
      continue
    }
    const a = cs.find(c => (kind === 'ov' ? REF_OV : REF).test(c.text) && c.x < 120)
    if (a && cols && !(cols.page === l.page && l.y < cols.hy + 10)) anchors.push({ k, l, ref: a.text, refX: a.x, cols: { ...cols } })
  }
  // region of each anchor: split the lines between neighbouring anchors at the largest vertical gap
  const body = lines.filter(l => !l.header && !isFooter(l) && !/^CLARITY .*CHECKLIST$|Synthetic Overview/i.test(l.text))
  const idx = new Map(body.map((l, i) => [l, i]))
  for (let q = anchors.length - 1; q >= 0; q--) if (!idx.has(anchors[q].l)) anchors.splice(q, 1)
  const pos = anchors.map(a => idx.get(a.l))
  const bounds = []
  for (let n = 0; n < pos.length; n++) {
    const from = n ? pos[n - 1] : pos[0], to = pos[n]
    let cut = to
    if (n) {
      let best = -1
      for (let q = from + 1; q <= to; q++) {
        const a = body[q - 1], b = body[q]
        const g = a.page !== b.page ? 1000 + q : b.y - a.y
        if (g > best && q > from) { best = g; cut = q }
      }
      if (best < 11 && body[from].page === body[to].page) cut = Math.round((from + to) / 2) + 1
    }
    bounds.push(cut)
  }
  for (let n = 0; n < pos.length; n++) {
    const a = anchors[n]
    const s = bounds[n], e = n + 1 < pos.length ? bounds[n + 1] : body.length
    const region = body.slice(s, e).filter(l => !(cells(l).length === 1 && /^\d+\.\s+\S/.test(l.text) && l.x < 60 && l !== a.l))
    const C = a.cols
    const xs = C.xs
    const nextAfter = x => xs.find(v => v > x + 20) ?? 9999
    const comX = C.comments ?? 196
    const comEnd = nextAfter(comX)
    const row = { ref: a.ref, page: a.l.page, answer: '', question: '', comment: '', reviewer: '', status: '', dates: [] }
    const q = [], com = [], rev = []
    for (const l of region) for (const c of cells(l, 6)) {
      if (kind === 'cl' && C.practice != null && c.x >= C.practice - 16 && c.x < comX - 22 && (ANS.test(c.text) || l === a.l || Math.abs(l.y - a.l.y) < 6)) { row.answer = (row.answer ? row.answer + ' ' : '') + c.text; continue }
      if (c.x >= comX - 20 && c.x < comEnd - 6) com.push(c.text)
      else if (kind === 'cl' && c.x >= comEnd - 6 && c.x < nextAfter(comEnd) - 6) rev.push(c.text)
      else if (c.x > a.refX + 20 && c.x < comX - 20 && !(kind === 'cl' && C.practice != null && c.x >= C.practice - 16)) q.push(c.text)
    }
    if (kind === 'ov') {
      const cs = cells(a.l, 6)
      row.status = (cs.find(c => /^(Open|Closed?|In Progress|Pending|Rejected|Accepted)$/i.test(c.text)) || {}).text || ''
      row.dates = cs.filter(c => c.x > comX + 100 && dmy(c.text)).map(c => dmy(c.text))
    }
    row.question = q.join(' ').replace(/\s+/g, ' ').trim()
    row.comment = com.join(' ').replace(/\s+/g, ' ').trim()
    row.reviewer = rev.join(' ').replace(/\s+/g, ' ').trim()
    rows.push(row)
  }
  return rows
}

export function check(doc, file = '') {
  const { out, add } = collector(RULES)
  const R = parse(doc)
  const F = { file }
  const auditDate = dmy(R.cover.on)
  // cover
  const isSummary = R.type === 'SUMMARY'
  const missing = Object.entries({ site: 'Site', address: 'Address', contact: 'Contact Person', telephone: 'Telephone', email: 'Email', by: 'Completed By', on: 'Completed On' })
    .filter(([k]) => !R.cover[k] || /^[-–\s]*$/.test(R.cover[k])).map(([, v]) => v)
  if (!R.reportNos.length) missing.push('Report No')
  if (missing.length) add('CL-01', { ...F, page: 1, msg: 'Missing: ' + missing.join(', ') })
  const nos = [...new Set(R.reportNos.map(r => r.no).filter(Boolean))]
  if (nos.length > 1) add('CL-02', { ...F, msg: 'Report numbers found: ' + nos.join(', ') })
  for (const n of nos) if (!/^\d{3}-\d{4}-\d{6}-[A-Z]{2}$/.test(n)) add('CL-02', { ...F, page: R.reportNos.find(r => r.no === n).page, msg: /X{3,}/i.test(n) ? `Report number is still a placeholder: "${n}"` : `Unexpected report number format "${n}"` })
  if (nos.length === 1 && auditDate) { const y = +nos[0].split('-')[1]; if (y && Math.abs(y - auditDate.getUTCFullYear()) > 1) add('CL-02', { ...F, msg: `Report number year ${y} vs completed on ${fmt(auditDate)}` }) }
  if (/draft/i.test(file) || doc.pages.some(p => p.lines.some(l => /^\s*DRAFT\s*$/i.test(l.text)))) add('CL-03', { ...F, msg: 'The file name or a page is marked "draft".' })
  if (!auditDate) add('CL-04', { ...F, page: 1, msg: `Completed On: "${R.cover.on || ''}"` })
  else if (auditDate > new Date()) add('CL-04', { ...F, page: 1, msg: `Completed On ${fmt(auditDate)} is in the future` })

  if (isSummary) {
    const t = doc.text
    const emp = /No of Employees\s*(\d[\d,]*)/i.exec(t)
    const miss = []
    if (!emp) miss.push('number of employees')
    const flat = t.replace(/\s+/g, ' ')
    if (!/Strengths\s*:?\s*[^:]{30,}/i.test(flat)) miss.push('strengths')
    if (!/Weaknesses\s*:?\s*[^:]{20,}/i.test(flat)) miss.push('weaknesses')
    if (miss.length) add('CL-26', { ...F, page: 2, msg: 'Missing: ' + miss.join(', ') })
    placeholders(doc, add, F)
    return { kind: 'clarity', meta: meta(R, file), findings: out, stats: { questions: 0 } }
  }

  // relevancy
  for (const r of R.rel) if (/^Not Relevant$/i.test(r.resp) && (!r.comment || /^(nil|na|n\/a|-|none)$/i.test(r.comment))) add('CL-23', { ...F, page: r.page, ref: r.name, msg: `"${r.name}" is Not Relevant with comment "${r.comment || ''}"` })

  // score table
  const T = R.total
  if (T && R.score.length) {
    const sTot = R.score.reduce((a, r) => a + r.tot, 0), sReq = R.score.reduce((a, r) => a + r.req, 0)
    if (sTot !== T.tot || sReq !== T.req) add('CL-05', { ...F, page: T.page, msg: `Sections: ${sReq} required / ${sTot} total NCs; Total row: ${T.req} / ${T.tot}` })
    for (const r of [...R.score, T]) {
      if (r.req > r.tot) add('CL-06', { ...F, page: r.page, ref: r.name, msg: `${r.name}: required NCs ${r.req} > total NCs ${r.tot}` })
      if (r.pct >= 100 && r.tot > 0) add('CL-06', { ...F, page: r.page, ref: r.name, msg: `${r.name}: score ${r.pct} % but ${r.tot} NC(s)` })
    }
    const ps = R.score.map(r => r.pct)
    if (T.pct < Math.min(...ps) - 0.01 || T.pct > Math.max(...ps) + 0.01) add('CL-07', { ...F, page: T.page, msg: `Total ${T.pct} % vs sections ${Math.min(...ps)}–${Math.max(...ps)} %` })
  }
  const ncTotal = T ? T.tot : null
  const ovCount = new Map(); for (const o of R.ov) ovCount.set(o.ref, (ovCount.get(o.ref) || 0) + 1)
  const dup = [...ovCount].filter(([, n]) => n > 1).map(([r, n]) => `${r} ×${n}`)
  R.ov = R.ov.filter((o, i) => R.ov.findIndex(x => x.ref === o.ref) === i)
  if (ncTotal != null && (R.hasOv || (!R.saq && ncTotal > 0)) && R.ov.length !== ncTotal) add('CL-08', { ...F, page: R.ov[0]?.page || T.page, msg: `Score table: ${ncTotal} NC(s); overview: ${R.hasOv ? R.ov.length + ' checkpoint(s)' + (R.ov.length ? ' (' + R.ov.map(r => r.ref).join(', ') + ')' : '') : 'section not found'}` })
  if (dup.length) add('CL-08', { ...F, sev: 'warning', page: R.ov[0]?.page, msg: 'Checkpoints listed more than once in the overview: ' + dup.join(', ') })
  // summary text
  const S = R.summary
  if (!S || S.length < 150) add('CL-24', { ...F, page: R.summaryPage, msg: S ? `Only ${S.length} characters` : 'No audit summary found' })
  if (S && ncTotal != null) {
    const sayNone = /\bno (?:nc|non-?conformit(?:y|ies)|nonconformit(?:y|ies))\b[^.]{0,40}\b(?:raised|found|identified|noted)|\bno nc finding/i.test(S)
    const m = /\b(?:there (?:are|were|is|was|has been|have been)|total of|in total|totally)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:\(\d+\)\s+)?(?:nc|ncs|non-?conformit(?:y|ies)|nonconformit(?:y|ies))\b|\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:\(\d+\)\s+)?(?:nc|ncs|non-?conformit(?:y|ies)|nonconformit(?:y|ies))(?: findings?)? (?:was|were|has been|have been) (?:raised|identified|found|noted)/i.exec(S)
    const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
    const nw = m ? (m[1] || m[2]).toLowerCase() : null
    const n = m ? (W[nw] ?? +nw) : null
    if (sayNone && ncTotal > 0) add('CL-09', { ...F, page: R.summaryPage, msg: `Summary says no NC; score table has ${ncTotal}` })
    else if (n != null && n !== ncTotal) add('CL-09', { ...F, page: R.summaryPage, msg: `Summary says ${m[0]}; score table has ${ncTotal}`, text: S.slice(Math.max(0, m.index - 60), m.index + 60) })
  }
  // contact
  if (ncTotal != null && Object.keys(R.contact).length) {
    const na = v => !v || /^(na|n\/a|nil|-|none)$/i.test(v)
    if (ncTotal > 0 && (na(R.contact.name) || na(R.contact.email))) add('CL-10', { ...F, page: R.summaryPage, msg: `${ncTotal} NC(s) but contact name/email is "${R.contact.name || ''}" / "${R.contact.email || ''}"` })
    if (ncTotal === 0 && !na(R.contact.name)) add('CL-10', { ...F, sev: 'info', page: R.summaryPage, msg: `No NC, but a contact is filled ("${R.contact.name}"); the form asks for NA` })
  }
  // overview rows
  const byRef = new Map(R.rows.map(r => [r.ref, r]))
  const late = {}, far = {}
  for (const o of R.ov) {
    if (!o.status || !o.dates.length) add('CL-11', { ...F, page: o.page, ref: o.ref, msg: `Status "${o.status || '—'}", target date ${o.dates.length ? fmt(o.dates[0]) : '—'}` })
    const tgt = o.dates[o.dates.length - 1]
    if (tgt && auditDate) {
      const d = days(auditDate, tgt)
      if (d < 0 && /open/i.test(o.status)) (late[fmt(tgt)] = late[fmt(tgt)] || []).push(o)
      else if (d > 366) (far[fmt(tgt)] = far[fmt(tgt)] || []).push(o)
    }
    const done = /\b(correct(?:ive|ion)s?\s+actions?\s+(?:were|was|have been|has been)\s+accepted|was closed|were closed|has been closed|have been closed|nc (?:is|was) closed|closed on|verified as closed|closure (?:was )?accepted)\b/i
    if (/^open$/i.test(o.status) && done.test(o.comment)) add('CL-13', { ...F, page: o.page, ref: o.ref, msg: 'Status Open, but the comment says the correction was accepted/closed', text: o.comment.slice(Math.max(0, o.comment.search(done) - 80), o.comment.search(done) + 80) })
    if (/^closed?$/i.test(o.status) && !/follow|evidence|accepted|closed|correct|verified|provided|submitted/i.test(o.comment)) add('CL-13', { ...F, sev: 'info', page: o.page, ref: o.ref, msg: 'Status Closed but no follow-up or evidence is described' })
    const r = byRef.get(o.ref)
    if (R.rows.length && !r) add('CL-14', { ...F, page: o.page, ref: o.ref, msg: 'Checkpoint not found in the checklist' })
    else if (r && /^yes$/i.test(r.answer)) add('CL-14', { ...F, page: r.page, ref: o.ref, msg: 'Listed as NC but answered "Yes" in the checklist' })
  }
  for (const [d, os] of Object.entries(late)) add('CL-12', { ...F, page: os[0].page, ref: os.map(o => o.ref).join(', '), msg: `${os.length} open NC(s) with target ${d}, before the audit (${fmt(auditDate)})` })
  for (const [d, os] of Object.entries(far)) add('CL-12', { ...F, page: os[0].page, ref: os.map(o => o.ref).join(', '), msg: `${os.length} NC(s) with target ${d}, ${Math.round(days(auditDate, new Date(d)) / 30)} months after the audit` })
  // checklist rows
  const mixed = []
  const seen = new Map()
  for (const r of R.rows) {
    const sub = /_\d+$/.test(r.ref)
    const a = r.answer.toLowerCase()
    const c = r.comment
    if (!r.answer) { if (!sub && !r.comment) add('CL-15', { ...F, page: r.page, ref: r.ref, msg: clip(r.question, 120) }); continue }
    if (/^(no|partially|n\/?a|not applicable)$/.test(a) && !c) add('CL-16', { ...F, page: r.page, ref: r.ref, msg: `"${r.answer}" without comment`, text: r.question })
    if (a === 'yes' && !c && !sub) add('CL-17', { ...F, page: r.page, ref: r.ref, msg: clip(r.question, 120) })
    if (!c) continue
    if (a === 'yes' && !/follow[- ]?up/i.test(c)) { const w = negativeHits(c); if (w) add('CL-18', { ...F, page: r.page, ref: r.ref, msg: `Answer Yes; comment contains "${w}"`, text: c }) }
    if ((c.length < 15 && !/\d/.test(c)) || GENERIC.test(c)) add('CL-19', { ...F, page: r.page, ref: r.ref, msg: `"${clip(c, 60)}"` })
    const nl = nonLatinShare(c)
    if (nl > 0.5) add('CL-20', { ...F, page: r.page, ref: r.ref, msg: 'Mostly non-English', text: c })
    else if (nl > 0.1) mixed.push(r.ref)
    if (auditDate) for (const d of commentDates(c)) if (days(auditDate, d.d) > 1 && !/valid|expir|until|till|upto|up to|\bto\b|due|next|plan|target|deadline|renew|\bby\b|before|within|schedul|from\b/i.test(c.slice(Math.max(0, d.i - 60), d.i))) { add('CL-22', { ...F, page: r.page, ref: r.ref, msg: `"${d.s}" is after the audit date ${fmt(auditDate)}`, text: c }); break }
    const k = norm(c)
    if (k.length > 25) { if (!seen.has(k)) seen.set(k, []); seen.get(k).push(r) }
  }
  if (mixed.length) add('CL-20', { ...F, sev: 'info', page: null, ref: mixed.slice(0, 12).join(', ') + (mixed.length > 12 ? ' …' : ''), msg: `${mixed.length} comment(s) mix English with another language (bilingual is fine if the client accepts it)` })
  for (const [, rs] of seen) if (rs.length >= 3) add('CL-21', { ...F, page: rs[0].page, ref: rs.map(r => r.ref).join(', '), text: rs[0].comment })
  placeholders(doc, add, F)
  return { kind: 'clarity', meta: meta(R, file), findings: out, stats: { questions: R.rows.length, ncs: R.ov.length } }
}

function commentDates(c) {
  const out = []
  const re = /\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b|\b(20\d{2})-(\d{2})-(\d{2})\b/g
  let m
  while ((m = re.exec(c))) {
    let d
    if (m[1]) { d = dmy(m[0]); if (!d && +m[2] > 12) d = null }
    else d = new Date(Date.UTC(+m[4], +m[5] - 1, +m[6]))
    if (d && !isNaN(d)) out.push({ d, s: m[0], i: m.index })
  }
  return out
}

function placeholders(doc, add, F) {
  const seen = new Set()
  for (const p of doc.pages) for (const l of p.lines) {
    if (/^Report No/i.test(l.text)) continue
    const m = PLACEHOLDER.exec(l.text)
    if (m && !seen.has(l.text)) { seen.add(l.text); add('CL-25', { ...F, page: p.n, msg: `"${m[0]}"`, text: l.text }) }
  }
}

function meta(R, file) {
  return {
    type: R.type ? 'Clarity ' + R.type.toLowerCase().replace(/(^|\s)\w/g, s => s.toUpperCase()) + (R.saq ? ' (self-assessment)' : '') : 'Clarity report',
    title: R.cover.site || file,
    fields: [['Site', R.cover.site], ['Completed by', R.cover.by], ['Completed on', R.cover.on], ['Report no.', [...new Set(R.reportNos.map(r => r.no))].join(', ')],
      ['Total score', R.total ? R.total.pct + ' %' : ''], ['NCs', R.total ? String(R.total.tot) : ''], ['Questions read', String(R.rows.length || '')]].filter(f => f[1]),
    site: R.cover.site, by: R.cover.by, on: dmy(R.cover.on),
  }
}

// Cross-file checks for several reports of one site.
export function crossCheck(results) {
  const { out, add } = collector(RULES)
  const groups = new Map()
  for (const r of results) {
    if (r.kind !== 'clarity' || !r.meta.site) continue
    const key = norm(r.meta.site.split(' - ')[0])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  for (const [, g] of groups) {
    if (g.length < 2) continue
    const sites = [...new Set(g.map(r => r.meta.site))]
    if (sites.length > 1) add('CL-27', { msg: 'Site names: ' + sites.join(' | '), file: g.map(r => r.file).join(', ') })
    const ds = g.filter(r => r.meta.on).map(r => r.meta.on)
    if (ds.length > 1) { const span = days(new Date(Math.min(...ds)), new Date(Math.max(...ds))); if (span > 60) add('CL-27', { msg: `Completed-on dates span ${span} days`, file: g.map(r => r.file).join(', ') }) }
  }
  return out
}

export function detect(text) { return /CLARITY|BUREAU VERITAS/i.test(text) && /FIELD AUDIT|SELF ASSESSMENT/i.test(text) }
