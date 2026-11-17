// SLCP Verifier / Facility Tool (1.7.x, .xlsm) -> data for the Report data extractor.
// Reads the "Main Survey Actual" sheet (question list) and the "SLCP Data Collection Tool" sheet (answers).
const F3 = a => a.map(([key, en, zh]) => ({ key, en, zh }))
const DCT_FIRST_ROW = 17
const COL = { num: 'D', fac: 'S', sel: 'Y', cor: 'AB', exp: 'AH', nc: 'AN', lr: 'AP', key: 'AZ' }

export function detect(wb) { return wb.SheetNames.includes('Main Survey Actual') && wb.SheetNames.some(n => n.startsWith('SLCP Data Collection Tool')) }

// fixed report columns: [key, en, zh, question key]
const FIXED = [
  ['facility', 'Facility name', '工厂名称', 'fp-bi-1'], ['facilityLocal', 'Facility name (local)', '工厂名称（本地语言）', 'fp-bi-3'], ['osId', 'OS ID', 'OS ID', 'fp-oar-1'],
  ['country', 'Country', '国家', 'fp-bi-7'], ['city', 'City', '城市', 'fp-bas-2'], ['province', 'State / province', '省/州', 'fp-bas-3'],
  ['step', 'Step', '步骤', 'fp-step-1'], ['completion', 'Completion %', '完成度', 'fp-step-2'], ['accuracy', 'Accuracy index', '准确性指数', 'fp-acc-1'],
  ['submission', 'Submission type', '提交类型', 'fp-bi-18'], ['saDate', 'Self/joint-assessment date', '自评/联合评估日期', 'fp-bi-22'],
  ['workers', 'Total workers', '工人总数', 'fp-ed-2'], ['male', 'Male workers', '男性工人', 'fp-ed-3'], ['foreignMigrant', 'Foreign migrant workers', '外籍外来工', 'fp-ed-8'],
  ['domesticMigrant', 'Domestic migrant workers', '国内外来工', 'fp-ed-9'], ['agency', 'Agency / contract workers', '派遣/劳务工', 'fp-wor-9'], ['under18', 'Workers under 18', '未满 18 岁工人', 'fp-ed-12'],
  ['vStart', 'Verification start', '核查开始', 'vd-e4'], ['vEnd', 'Verification end', '核查结束', 'vd-e5'], ['vDuration', 'Verification duration', '核查时长', 'vd-e6'],
  ['vWindow', 'Verification window', '核查通知方式', 'vd-e10'], ['vBodyType', 'Verifier body type', '核查机构类型', 'vd-e11'], ['vBody', 'Verifier body', '核查机构', 'vd-e12'],
  ['interviews', 'Worker interviews', '工人访谈数', 'vd-e14'], ['payrollSample', 'Payroll: workers sampled', '工资抽样人数', 'vd-veri-32'], ['belowMin', 'Payroll: below minimum wage', '低于最低工资人数', 'vd-veri-33'],
  ['hoursSample', 'Hours: weeks sampled', '工时抽样周数', 'vd-veri-35'], ['over60', 'Hours: weeks over 60 h', '超过 60 小时的周数', 'vd-veri-36'],
]
export const EXTRACT = {
  report: F3([...FIXED.map(f => f.slice(0, 3)), ['answered', 'Questions answered', '已回答问题数'], ['inaccurate', 'Inaccurate (verifier)', '核查不准确数'], ['updated', 'Updated during verification', '核查中更新数'], ['ncs', 'Non-compliances flagged', '标记的不合规项']]),
  rows: { en: 'Inaccuracies and non-compliances', zh: '不准确与不合规项', fields: F3([['key', 'Question key', '问题键'], ['num', 'No.', '编号'], ['section', 'Section', '章节'], ['question', 'Question', '问题'],
    ['facility', 'Facility answer', '工厂回答'], ['selection', 'Verifier selection', '核查员选择'], ['corrected', 'Verifier answer', '核查员回答'], ['final', 'Final answer', '最终回答'],
    ['explanation', 'Verifier explanation', '核查员说明'], ['nc', 'Non-compliance', '不合规'], ['legal', 'Legal reference', '法律依据'], ['row', 'Tool row', '工具行号']]) },
}

function val(c) {
  if (!c || c.v == null || c.v === '') return ''
  // SheetJS dates sit just before local midnight; adding 12 hours gives the right day
  if (c.v instanceof Date) { const d = new Date(c.v.getTime() + 43200000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  return typeof c.v === 'string' ? c.v.trim() : c.v
}
const inacc = s => /^(inaccurate|updated during verification)/i.test(String(s || ''))

// X = SheetJS module; wb read with { cellDates: true }. Every question is also offered as its own column ("q:<key>").
export function extract(X, wb, file) {
  const msa = X.utils.sheet_to_json(wb.Sheets['Main Survey Actual'], { defval: null })
  const meta = new Map()
  for (const r of msa) { const k = String(r.Key ?? '').trim(); if (k && !meta.has(k)) meta.set(k, { num: r.Number ?? '', section: r.Section ?? '', text: String(r['Main Text'] ?? '').trim(), type: r['Master Type'] ?? '', msaFinal: r['Final Response'] ?? r['Facility Self/Joint-Assessment Response'] ?? '' }) }
  const ws = wb.Sheets[wb.SheetNames.find(n => n.startsWith('SLCP Data Collection Tool'))]
  const last = X.utils.decode_range(ws['!ref']).e.r + 1
  const ans = new Map()
  for (let r = DCT_FIRST_ROW; r <= last; r++) {
    const k = String(ws[COL.key + r]?.v ?? '').trim()
    if (!k || ans.has(k) || !meta.has(k)) continue
    const g = c => val(ws[COL[c] + r])
    const a = { fac: g('fac'), sel: g('sel'), cor: g('cor'), exp: g('exp'), nc: g('nc'), lr: g('lr'), row: r }
    a.final = inacc(a.sel) && a.cor !== '' ? a.cor : a.fac
    ans.set(k, a)
  }
  const report = { file }
  for (const [key, , , q] of FIXED) { const v = ans.get(q)?.final; report[key] = v !== undefined && v !== '' ? v : (meta.get(q)?.msaFinal instanceof Date ? val({ v: meta.get(q).msaFinal }) : meta.get(q)?.msaFinal ?? '') }
  if (typeof report.accuracy === 'number') report.accuracy = Math.round(report.accuracy * 10000) / 10000
  let answered = 0, nInacc = 0, nUpd = 0, nNc = 0
  const rows = [], extraFields = []
  for (const [k, m] of meta) {
    const a = ans.get(k); if (!a) continue
    if (/^(Instructions|Header|MS Header)$/i.test(m.type)) continue
    extraFields.push({ key: 'q:' + k, en: `${m.num ? m.num + ' ' : ''}${m.text}`.slice(0, 160) + ` [${k}]`, group: m.section || 'Other' })
    if (a.final !== '') { answered++; report['q:' + k] = a.final }
    if (/^inaccurate/i.test(a.sel)) nInacc++
    if (/^updated during verification/i.test(a.sel)) nUpd++
    if (a.nc !== '') nNc++
    if (inacc(a.sel) || a.nc !== '') rows.push({ key: k, num: m.num, section: m.section, question: m.text, facility: a.fac, selection: a.sel, corrected: a.cor, final: a.final, explanation: a.exp, nc: a.nc, legal: a.lr, row: a.row })
  }
  Object.assign(report, { answered, inaccurate: nInacc, updated: nUpd, ncs: nNc })
  return { report, rows, extraFields, extraDefault: false }
}
