// Policy consistency checker: compares a set of policy / procedure / form documents
// with each other. Pure JS (browser + Node tests). Input: docs from read.js.

export const RULES = {
  'PC-01': { sev: 'error', en: 'Two documents use the same document code', zh: '两份文件使用了同一文件编号' },
  'PC-02': { sev: 'warning', en: 'Code in the document header differs from the file name', zh: '文件抬头编号与文件名不一致' },
  'PC-03': { sev: 'warning', en: 'Document cited by a code that belongs to a different title', zh: '引用的编号与文件名称不对应' },
  'PC-04': { sev: 'warning', en: 'Cited document title is close to, but not the same as, an uploaded document', zh: '引用的文件名称与已上传文件相近但不一致' },
  'PC-05': { sev: 'warning', en: 'Same topic, different values across documents', zh: '同一事项在不同文件中的数值不一致' },
  'PC-06': { sev: 'warning', en: 'Same sentence appears in several documents with different numbers', zh: '同一句话在不同文件中数字不同' },
  'PC-07': { sev: 'warning', en: 'Record retention period stated differently', zh: '记录保存期限说法不一致' },
  'PC-08': { sev: 'warning', en: 'Term defined differently in different documents', zh: '同一术语在不同文件中定义不同' },
  'PC-09': { sev: 'warning', en: 'Company named differently in the scope or header', zh: '适用范围或抬头中的公司名称不一致' },
  'PC-10': { sev: 'info', en: 'Department named in more than one way', zh: '同一部门有多种叫法' },
  'PC-11': { sev: 'warning', en: 'Value is less protective than the PRC national statutory figure', zh: '数值低于中国国家法定标准' },
  'PC-12': { sev: 'info', en: 'Cited document code is not in the uploaded set', zh: '引用的文件编号不在已上传文件中' },
  'PC-13': { sev: 'info', en: 'Cited internal document is not in the uploaded set', zh: '引用的内部文件不在已上传文件中' },
  'PC-14': { sev: 'info', en: 'Header fields blank or placeholder text left', zh: '抬头字段空白或仍有占位文字' },
}

// ---------- helpers ----------
const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
export function cnNum(s) {
  if (s == null) return null
  s = String(s).replace(/[,，\s]/g, '')
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  if (!/^[零〇一二两三四五六七八九十百千]+$/.test(s)) return null
  let total = 0, cur = 0
  for (const ch of s) {
    if (ch in CN) cur = CN[ch]
    else { const u = ch === '十' ? 10 : ch === '百' ? 100 : 1000; total += (cur || 1) * u; cur = 0 }
  }
  return total + cur
}
const N = '(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十百]+)'
const clip = (s, n = 220) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s }
const CJK = /[一-龥]/
const CODE = /(?<![A-Za-z0-9-])([A-Z]{1,4}-[A-Z]{2,5}-\d{2,4})(?![A-Za-z0-9-])/g
const normTitle = s => String(s || '').replace(/^[一-龥]{2,20}?(?:股份有限公司|有限责任公司|有限公司|集团)/, '').replace(/[《》<>"“”'‘’\s（）()【】\[\]、，,.。:：·_\-—]/g, '').toLowerCase()
const TYPE_SUFFIX = /(管理规定|管理制度|管理办法|管理程序|控制程序|管理流程|实施细则|作业指导书|指导书|实施方案|规定|制度|办法|程序|流程|政策|方针|准则|手册|规范|细则|方案|守则)$/
const stem = s => normTitle(s).replace(TYPE_SUFFIX, '')
const LEVEL = { POL: 1, MAN: 1, QP: 2, WI: 3, SOP: 3, F: 4, R: 4, TR: 4 }

function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
const ratio = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1)
function bigrams(s) { const t = normTitle(s); const out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out }
function dice(a, b) { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return 2 * n / (A.size + B.size) }
const clauseAt = (text, idx, len) => {
  let s = idx, e = idx + len
  while (s > 0 && !/[。；;！？\n]/.test(text[s - 1])) s--
  while (e < text.length && !/[。；;！？\n]/.test(text[e])) e++
  return text.slice(s, e)
}
const where = p => (p.sec ? '§' + p.sec : '') + (p.page ? (p.sec ? ' ' : '') + 'p.' + p.page : '') || (p.table ? 'table' : '')

// ---------- document metadata ----------
const HDR_KEYS = {
  code: /^(文件编号|表单编号|记录编号|编号|文件代码|document no\.?|doc(?:ument)? (?:no|number|code)\.?|form no\.?)$/i,
  version: /^(版本|版本号|版次|version|rev(?:ision)?\.?)$/i,
  dept: /^(编制部门|归口部门|主责部门|发布部门|owner|department)$/i,
  date: /^(生效日期|发布日期|实施日期|effective date)$/i,
  keep: /^(保存期限|保存年限|retention(?: period)?)$/i,
  keepDept: /^(保存部门)$/,
  author: /^(编制|拟制|prepared by)$/i,
  reviewer: /^(审核|reviewed by)$/i,
  approver: /^(批准|approved by)$/i,
}
function meta(doc) {
  const hdr = {}
  for (const p of doc.paras.slice(0, 40)) {
    if (!p.table) continue
    const c = p.table.cells
    for (let i = 0; i < c.length - 1; i++) {
      const k = (c[i] || '').replace(/\s+/g, ' ').trim()
      for (const [key, re] of Object.entries(HDR_KEYS)) if (!(key in hdr) && re.test(k)) hdr[key] = { v: (c[i + 1] || '').trim(), p }
    }
  }
  const fm = /^([A-Z]{1,4}-[A-Z]{2,5}-\d{2,4})\s*(.*?)(?:\.[a-z0-9]+)?$/i.exec(doc.name)
  const fileCode = fm ? fm[1].toUpperCase() : ''
  const hdrCode = hdr.code && (/[A-Z]{1,4}-[A-Z]{2,5}-\d{2,4}/.exec(hdr.code.v) || [])[0] || ''
  const first = doc.paras.find(p => !p.table && p.text.length <= 40)
  const fileTitle = (fm ? fm[2] : doc.name.replace(/\.[a-z0-9]+$/i, '')).trim()
  const title = (first && doc.paras.indexOf(first) < 3 ? first.text : '') || fileTitle
  const code = hdrCode || fileCode
  const prefix = (/^([A-Z]{1,4})-/.exec(code) || [])[1] || ''
  return { hdr, fileCode, hdrCode, code, title, fileTitle, level: LEVEL[prefix] || 3, zh: CJK.test(doc.text.slice(0, 4000)) }
}

// ---------- topics compared across documents ----------
const freq = s => {
  let m
  if ((m = new RegExp('每年(?:至少|不少于)?' + N + '次').exec(s))) return cnNum(m[1])
  if ((m = new RegExp('每半年(?:至少|不少于)?' + N + '次').exec(s))) return 2 * cnNum(m[1])
  if ((m = new RegExp('每季度?(?:至少|不少于)?' + N + '次').exec(s))) return 4 * cnNum(m[1])
  if ((m = new RegExp('每(?:个)?月(?:至少|不少于)?' + N + '次').exec(s))) return 12 * cnNum(m[1])
  if ((m = new RegExp('(?:间隔|周期)(?:不超过|不得超过|不大于)' + N + '个月').exec(s))) return 12 / cnNum(m[1])
  if ((m = /(annually|once a year|every year|each year)/i.exec(s))) return 1
  if ((m = /(quarterly|every quarter)/i.exec(s))) return 4
  if ((m = /(semi-annually|twice a year|every six months)/i.exec(s))) return 2
  return null
}
const FREQ_RE = new RegExp('(?:每年|每半年|每季度?|每(?:个)?月)(?:至少|不少于)?' + N + '次|(?:间隔|周期)(?:不超过|不得超过|不大于)' + N + '个月|annually|once a year|every year|quarterly|semi-annually|twice a year', 'i')
const fmtFreq = v => v >= 1 ? `${+v.toFixed(2)}×/yr` : `every ${Math.round(12 / v)} months`

// each topic: res = regexes whose group 1 is the value; val(m, clause) -> number|null; not = clause filter
export const TOPICS = [
  { id: 'child_age', en: 'Minimum age (child labour)', zh: '童工年龄界限', unit: 'yrs',
    res: [new RegExp('童工[^。；]{0,12}?(?:未满|不满|低于)' + N + '周?岁'), new RegExp('(?:未满|不满|低于)' + N + '周?岁的?(?:童工|儿童|少年儿童|未成年人)'),
      new RegExp('(?:招用|雇用|使用|聘用|招收|录用)[^。；]{0,6}?(?:未满|不满)' + N + '周?岁'), /minimum (?:working |employment |hiring )?age[^.;]{0,25}?(\d{2})/i, /child(?:ren)? (?:labou?r|is any person)[^.;]{0,40}?(?:under|below) (?:the age of )?(\d{2})/i],
    law: v => v < 16 ? 'PRC Labour Law art. 15 / 禁止使用童工规定: no one under 16' : null },
  { id: 'juvenile_age', en: 'Upper age of juvenile workers', zh: '未成年工年龄上限', unit: 'yrs',
    res: [new RegExp('未成年工[^。；]{0,25}?(?:未满|不满)' + N + '周?岁'), /young workers?[^.;]{0,50}?(?:under|below) (?:the age of )?(\d{2})/i],
    law: v => v < 18 ? 'PRC Labour Law art. 58: juvenile workers are aged 16–17' : null },
  { id: 'day_std', en: 'Standard working hours per day', zh: '每日标准工时', unit: 'h',
    res: [new RegExp('(?:每天|每日)(?:正常|标准)?工作(?:时间)?(?:为|不超过|不得超过)?\\s*' + N + '\\s*个?小时'), /(?:regular|normal|standard) (?:working )?(?:hours|time)[^.;]{0,30}?(\d+(?:\.\d+)?) hours? (?:per|a|each) day/i],
    not: /加班|延长|哺乳|休息|包含|含/,
    law: v => v > 8 ? 'PRC Labour Law art. 36: 8 hours a day' : null },
  { id: 'week_std', en: 'Standard working hours per week', zh: '每周标准工时', unit: 'h',
    res: [new RegExp('(?:每周|周)(?:正常|标准)?工作(?:时间)?(?:为|不超过|不得超过)?\\s*' + N + '\\s*个?小时'), /(?:regular|normal|standard) (?:working )?(?:hours|time)[^.;]{0,30}?(\d+(?:\.\d+)?) hours? (?:per|a|each) week/i],
    not: /加班|延长|总工时|含|包括|including|overtime|过去/, val: v => v <= 48 ? v : null,
    law: v => v > 44 ? 'State Council rule: 40 hours a week (44 under the Labour Law)' : null },
  { id: 'week_max', en: 'Maximum weekly hours incl. overtime', zh: '每周最长工时（含加班）', unit: 'h',
    res: [new RegExp('(?:每周|周)(?:总)?(?:工作|工时)(?:时间)?(?:（含加班）|\\(含加班\\))?[^。；\\d]{0,8}?(?:不超过|不得超过|最多|上限为?|≤)\\s*' + N + '\\s*个?小时'), /(?:total|maximum)[^.;]{0,20}?(?:working )?hours?[^.;]{0,30}?(?:not exceed|no more than|maximum of|max\.?)\s*(\d+) hours? (?:per|a|each|in any) (?:week|7-day)/i, /(\d{2}) hours? per week[^.;]{0,20}including overtime/i],
    val: (v, cl) => (v > 44 || /加班|含|including|overtime|总/.test(cl)) ? v : null,
    law: v => v > 49 ? 'PRC law allows 40 h + up to 36 h overtime a month (about 48 h a week) unless 综合计算工时 is approved' : null, lawSev: 'info' },
  { id: 'ot_month', en: 'Overtime cap per month', zh: '每月加班上限', unit: 'h',
    res: [new RegExp('(?:每月|月|每个月)(?:累计)?(?:加班|延长(?:工作|劳动)时间)(?:时间|时长)?(?:累计)?[^。；\\d]{0,8}?(?:不超过|不得超过|最多|上限为?|≤)\\s*' + N + '\\s*个?小时'),
      new RegExp('(?:加班|延长(?:工作|劳动)时间)[^。；\\d]{0,10}?每月[^。；\\d]{0,6}?(?:不超过|不得超过|最多)\\s*' + N + '\\s*个?小时'), /overtime[^.;]{0,40}?(?:not exceed|no more than|maximum of|up to)\s*(\d+) hours? (?:per|a|each|in a) month/i],
    law: v => v > 36 ? 'PRC Labour Law art. 41: at most 36 hours of overtime a month' : null },
  { id: 'ot_day', en: 'Overtime cap per day', zh: '每日加班上限', unit: 'h',
    res: [new RegExp('(?:每日|每天|日)(?:加班|延长(?:工作|劳动)时间)(?:时间|时长)?[^。；\\d]{0,8}?(?:不超过|不得超过|最多)\\s*' + N + '\\s*个?小时'), /overtime[^.;]{0,30}?(?:not exceed|no more than|maximum of)\s*(\d+) hours? (?:per|a|each) day/i],
    law: v => v > 3 ? 'PRC Labour Law art. 41: at most 3 hours of overtime a day' : null },
  { id: 'rest_day', en: 'Rest days in every 7 days', zh: '每7天休息天数', unit: 'day',
    res: [new RegExp('每(?:七|7)(?:个)?(?:天|日)[^。；]{0,8}?(?:至少|不少于)?休息' + N + '(?:个)?(?:天|日)'), new RegExp('每周(?:至少|不少于)休息' + N + '(?:个)?(?:天|日)'), /(\d|one|a) (?:full )?day(?:s)? off (?:in|every|per|for every) (?:seven|7)/i],
    val: v => v, law: v => v < 1 ? 'PRC Labour Law art. 38: at least one day off a week' : null },
  { id: 'otpay_work', en: 'Overtime pay, working days', zh: '工作日加班工资倍率', unit: '%',
    res: [/(?:工作日|平时|正常工作日|延长工作时间)(?:加班)?[^。；%休节]{0,12}?(\d{3}|\d(?:\.\d)?倍)\s*%?/, /(?:weekday|regular day|working day)s?[^.;%]{0,25}?(\d{3})\s*%/i],
    pct: true, law: v => v < 150 ? 'PRC Labour Law art. 44: at least 150%' : null },
  { id: 'otpay_rest', en: 'Overtime pay, rest days', zh: '休息日加班工资倍率', unit: '%',
    res: [/(?:休息日|周末|双休日)(?:加班)?[^。；%工节]{0,12}?(\d{3}|\d(?:\.\d)?倍)\s*%?/, /(?:rest day|weekend)s?[^.;%]{0,25}?(\d{3})\s*%/i],
    pct: true, law: v => v < 200 ? 'PRC Labour Law art. 44: at least 200% (unless time off is given instead)' : null },
  { id: 'otpay_hol', en: 'Overtime pay, public holidays', zh: '法定节假日加班工资倍率', unit: '%',
    res: [/(?:法定(?:节)?假日|法定节日|节假日)(?:加班)?[^。；%工休]{0,12}?(\d{3}|\d(?:\.\d)?倍)\s*%?/, /(?:public|statutory|national) holidays?[^.;%]{0,25}?(\d{3})\s*%/i],
    pct: true, law: v => v < 300 ? 'PRC Labour Law art. 44: at least 300%' : null },
  { id: 'maternity', en: 'Maternity leave', zh: '产假天数', unit: 'days',
    res: [new RegExp('(?:享受|享有|给予)?' + N + '\\s*天(?:的)?产假'), new RegExp('产假(?:为|不少于|共)?\\s*' + N + '\\s*天'), /(\d{2,3}) days? (?:of )?(?:paid )?maternity leave/i, /maternity leave of (\d{2,3}) days/i],
    not: /流产|难产|多胞胎|增加|延长|每多|地方|奖励|产前/,
    law: v => v < 98 ? 'Special Rules on Labour Protection of Female Employees art. 7: 98 days' : null },
  { id: 'probation', en: 'Longest probation period', zh: '试用期最长期限', unit: 'months',
    res: [new RegExp('试用期[^。；\\d]{0,10}?(?:最长|最多)?(?:不超过|不得超过|最长为?)\\s*' + N + '\\s*个?月'), /probation(?:ary)? period[^.;]{0,25}?(?:not exceed|no more than|maximum of|up to)\s*(\d+) months/i],
    law: v => v > 6 ? 'Labour Contract Law art. 19: at most 6 months' : null },
  { id: 'grv_ack', en: 'Grievance / report: time to acknowledge', zh: '投诉举报受理/回复时限', unit: '',
    res: [new RegExp('(?:举报|投诉|申诉|报告)[^。；]{0,30}?' + N + '\\s*个?(工作日|日|天|小时)内[^。；]{0,6}?(?:受理|回复|答复|反馈|确认|告知)'), new RegExp('(?:受理|回复|答复|确认收到)(?:举报|投诉|申诉)[^。；]{0,10}?' + N + '\\s*个?(工作日|日|天|小时)内')],
    unitGroup: 2, not: /供应商|客户|SQE|不良|质量|来料|物料|产品/ },
  { id: 'grv_close', en: 'Grievance / report: time to conclude', zh: '投诉举报办结时限', unit: '',
    res: [new RegExp('(?:举报|投诉|申诉)[^。；]{0,30}?' + N + '\\s*个?(工作日|日|天)内[^。；]{0,6}?(?:办结|处理完毕|完成调查|调查完毕|结案|处理完成|给出处理)')],
    unitGroup: 2, not: /供应商|客户|SQE|不良|质量|来料|物料|产品/ },
  { id: 'gift', en: 'Gift / hospitality value threshold', zh: '礼品/招待金额界限', unit: 'CNY',
    res: [new RegExp('(?:礼品|礼金|礼物|馈赠|款待|宴请|招待)[^。；]{0,25}?(?:价值|金额)?[^。；\\d]{0,6}?(?:超过|以上|高于|不超过|不得超过|≥|>|大于)\\s*(?:人民币)?\\s*' + N + '\\s*元'), new RegExp('(?:人民币)?\\s*' + N + '\\s*元(?:\\(含\\)|（含）)?(?:以上|及以上)的?(?:礼品|礼金|礼物|馈赠|招待|宴请)')],
    sev: 'info' },
  { id: 'mgmt_review', en: 'Management review frequency', zh: '管理评审频次', unit: 'freq',
    res: [/管理评审[^。]{0,30}/, /management review[^.]{0,40}/i], freq: true },
  { id: 'internal_audit', en: 'Internal audit frequency', zh: '内部审核频次', unit: 'freq',
    res: [/(?:内部审核|内审)[^。]{0,30}/, /internal audits?[^.]{0,40}/i], freq: true },
  { id: 'drill', en: 'Emergency drill frequency', zh: '应急演练频次', unit: 'freq',
    res: [/(?:应急|消防|疏散)演练[^。]{0,25}/, /(?:fire|evacuation|emergency) drills?[^.]{0,40}/i], freq: true, not: /专项|桌面|信息安全/ },
  { id: 'wage_day', en: 'Wage payment date', zh: '工资发放日', unit: 'day',
    res: [new RegExp('工资[^。；\\d]{0,15}?(?:每月|次月)\\s*' + N + '\\s*(?:日|号)(?:前|之前|以前)?'), new RegExp('(?:每月|次月)\\s*' + N + '\\s*(?:日|号)(?:前|之前)?(?:发放|支付)[^。；]{0,4}?工资')] },
]

function topicHits(doc, M) {
  const hits = []
  for (const p of doc.paras) {
    for (const t of TOPICS) {
      for (const re of t.res) {
        const m = re.exec(p.text)
        if (!m) continue
        const cl = clauseAt(p.text, m.index, m[0].length)
        const win = p.text.slice(Math.max(0, m.index - 10), m.index + m[0].length + 8)
        if (t.not && t.not.test(t.freq || t.unitGroup ? cl : win)) continue
        let v, label
        if (t.freq) {
          const fm = FREQ_RE.exec(cl.slice(Math.max(0, cl.indexOf(m[0].slice(0, 4)))))
          if (!fm) continue
          v = freq(fm[0]); if (v == null) continue
          label = fmtFreq(v)
        } else {
          let raw = m[1]
          if (/^(one|a)$/i.test(raw)) raw = '1'
          if (t.pct && /倍$/.test(raw)) v = parseFloat(raw) * 100
          else v = cnNum(raw)
          if (v == null) continue
          if (t.val) { v = t.val(v, cl); if (v == null) continue }
          const unit = t.unitGroup ? m[t.unitGroup] : t.unit
          label = t.unitGroup ? `${v} ${unit}` : `${v}${t.unit === '%' ? '%' : ' ' + t.unit}`
          if (t.unitGroup) v = `${v}|${unit}`
        }
        hits.push({ topic: t.id, v, label, doc: doc.name, p, text: cl })
        break
      }
    }
  }
  // one hit per value per table (rows of one table repeat the same clause)
  const seen = new Set()
  return hits.filter(h => { const k = `${h.topic}|${h.label}|${h.p.table ? 't' + h.p.table.t : h.p.i}`; if (seen.has(k)) return false; seen.add(k); return true })
}

// ---------- main ----------
export function checkSet(docs) {
  const out = []
  const add = (id, o) => out.push({ id, sev: o.sev || RULES[id].sev, docs: o.docs || [], ref: o.ref || '', msg: o.msg || '', fix: o.fix || '', text: clip(o.text || '', 400) })
  const D = docs.map(d => ({ ...d, M: meta(d) }))
  const byCode = new Map()
  for (const d of D) if (d.M.code) { if (!byCode.has(d.M.code)) byCode.set(d.M.code, []); byCode.get(d.M.code).push(d) }

  // short label: the code when it is unique, else the file name
  for (const d of D) d.L = d.M.code && byCode.get(d.M.code).length === 1 ? d.M.code : d.name.replace(/\.[a-z0-9]+$/i, '')
  const lab = name => D.find(d => d.name === name)?.L || name

  // PC-01 duplicate codes
  for (const [code, ds] of byCode) if (ds.length > 1)
    add('PC-01', { docs: ds.map(d => d.name), ref: code, msg: `${code} is used by: ${ds.map(d => d.M.title).join(' / ')}`, fix: `Give each document its own code and update any references to ${code}.` })

  // PC-02 header vs file name
  for (const d of D) if (d.M.fileCode && d.M.hdrCode && d.M.fileCode !== d.M.hdrCode)
    add('PC-02', { docs: [d.name], ref: d.M.hdrCode, msg: `Header says ${d.M.hdrCode}, file name says ${d.M.fileCode}.`, fix: `Decide which code is right and change the other (header field 文件编号 or the file name).`, text: d.M.hdr.code?.p.text })

  // titles index
  const titleIdx = new Map()
  for (const d of D) for (const t of new Set([d.M.title, d.M.fileTitle])) if (t) titleIdx.set(normTitle(t), d)
  const findTitle = t => titleIdx.get(normTitle(t))

  // citations
  const LAW = /^(中华人民共和国|国务院|全国|国家|省|市)|(?:法|条例|公约|宣言|原则|指南|指引|标准|规程|决定|意见|通知|解释|纲要|议定书)$|^(GB|ISO|IEC|OHSAS|SA|RBA|OECD|ILO|UN|IPC|IATF|JEDEC|BSCI|SMETA|SLCP|EICC|REACH|RoHS)/i
  const INTERNAL = /(规定|制度|办法|程序|流程|政策|方针|准则|手册|规范|细则|方案|守则|指导书|计划|表|单|书|记录|台账|报告|清单|协议|承诺书)$/
  const missingCode = new Map(), missingTitle = new Map(), missing = []
  for (const d of D) {
    for (const p of d.paras) {
      // code + title next to each other: QP-HR-004《招聘管理规定》 / 《招聘管理规定》(QP-HR-004)
      const pair = /([A-Z]{1,4}-[A-Z]{2,5}-\d{2,4})\s*[)）]?\s*《([^》]{2,40})》|《([^》]{2,40})》\s*[（(]\s*([A-Z]{1,4}-[A-Z]{2,5}-\d{2,4})\s*[)）]/g
      let m
      while ((m = pair.exec(p.text))) {
        const code = m[1] || m[4], title = m[2] || m[3]
        const target = byCode.get(code)?.[0]
        if (target && target !== d && normTitle(target.M.title) !== normTitle(title) && normTitle(target.M.fileTitle) !== normTitle(title) && ratio(stem(target.M.title), stem(title)) < 0.85)
          add('PC-03', { docs: [d.name], ref: where(p), msg: `${code} is 《${target.M.title}》, but the text calls it 《${title}》.`, fix: findTitle(title) ? `Use ${findTitle(title).M.code} 《${title}》, or correct the title to 《${target.M.title}》.` : `Correct the code or the title so they point to the same document.`, text: p.text })
      }
      // codes
      for (const cm of p.text.matchAll(CODE)) {
        const code = cm[1]
        if (code === d.M.code || byCode.has(code)) continue
        if (!missingCode.has(code)) missingCode.set(code, [])
        missingCode.get(code).push({ d, p })
      }
      // titles
      for (const tm of p.text.matchAll(/《([^》]{2,40})》/g)) {
        const title = tm[1].trim()
        if (LAW.test(title) || !INTERNAL.test(title)) continue
        if (findTitle(title)) continue
        // near miss
        const st = stem(title)
        let best = null, br = 0
        for (const o of D) {
          for (const t of [o.M.title, o.M.fileTitle]) {
            const r = Math.max(stem(t) === st && st.length >= 2 ? 1 : 0, ratio(normTitle(t), normTitle(title)))
            if (r > br) { br = r; best = o }
          }
        }
        if (best && br >= 0.8 && best !== d) {
          const key = 'near|' + normTitle(title) + '|' + best.name
          if (!missingTitle.has(key)) missingTitle.set(key, { near: best, title, hits: [] })
          missingTitle.get(key).hits.push({ d, p })
        } else {
          const key = 'miss|' + normTitle(title)
          if (!missingTitle.has(key)) missingTitle.set(key, { title, hits: [] })
          missingTitle.get(key).hits.push({ d, p })
        }
      }
    }
  }
  for (const [, x] of missingTitle) {
    const docsCiting = [...new Set(x.hits.map(h => h.d.name))]
    const refs = x.hits.slice(0, 6).map(h => `${h.d.L} ${where(h.p)}`).join('; ')
    if (x.near) add('PC-04', { docs: docsCiting, ref: refs, msg: `Cited as 《${x.title}》; the uploaded document is ${x.near.M.code} 《${x.near.M.title}》.`, fix: `Change the citation to 《${x.near.M.title}》${x.near.M.code ? ' (' + x.near.M.code + ')' : ''}, or rename the document if the cited name is the one you want.`, text: x.hits[0].p.text })
    else missing.push({ title: x.title, n: x.hits.length, docs: docsCiting, refs: x.hits.map(h => `${h.d.L} ${where(h.p)}`) })
  }
  missing.sort((a, b) => b.docs.length - a.docs.length || b.n - a.n)
  if (missing.length) add('PC-13', { docs: [...new Set(missing.flatMap(m => m.docs))], ref: `${missing.length} title(s)`,
    msg: `${missing.length} internal document(s) are cited but not in the uploaded set. Most cited: ${missing.slice(0, 8).map(m => `《${m.title}》 (${m.docs.length})`).join(', ')}. The full list is under "Cited but not uploaded" and in the Excel report.`,
    fix: 'Upload the missing documents with the others to check them too. A document that does not exist should be written, or the reference removed.' })
  for (const [code, hits] of missingCode) {
    const docsCiting = [...new Set(hits.map(h => h.d.name))]
    add('PC-12', { docs: docsCiting, ref: code, msg: `${code} is cited in ${docsCiting.length} document(s) but no uploaded document has this code.`, fix: `Upload ${code} with the others, or correct the code.`, text: hits[0].p.text })
  }

  // PC-05 / PC-11 topics
  const allHits = D.flatMap(d => topicHits(d, d.M))
  const topics = []
  for (const t of TOPICS) {
    const hs = allHits.filter(h => h.topic === t.id)
    if (!hs.length) continue
    const groups = new Map()
    for (const h of hs) { const k = String(h.v); if (!groups.has(k)) groups.set(k, { v: h.v, label: h.label, hits: [] }); groups.get(k).hits.push(h) }
    const values = [...groups.values()].map(g => ({ v: g.v, label: g.label, docs: [...new Set(g.hits.map(h => h.doc))], hits: g.hits }))
    values.sort((a, b) => b.docs.length - a.docs.length)
    const conflict = values.length > 1
    topics.push({ id: t.id, en: t.en, zh: t.zh, conflict, values: values.map(v => ({ label: v.label, docs: v.docs, where: v.hits.map(h => ({ doc: h.doc, lab: lab(h.doc), ref: where(h.p), text: clip(h.text, 200) })) })) })
    if (conflict) {
      // reference value: from the highest-level document, else the most common
      const top = Math.min(...hs.map(h => D.find(d => d.name === h.doc).M.level))
      const topVals = values.filter(v => v.hits.some(h => D.find(d => d.name === h.doc).M.level === top))
      const refVal = topVals.length === 1 && top <= 1 ? topVals[0] : values[0]
      const why = refVal === topVals[0] && top <= 1 && topVals.length === 1 ? 'the policy / manual level says' : 'most documents say'
      const others = values.filter(v => v !== refVal)
      add('PC-05', { sev: t.sev, docs: [...new Set(hs.map(h => h.doc))], ref: t.en,
        msg: `${t.zh} / ${t.en}: ${values.map(v => `${v.label} (${v.docs.length} doc${v.docs.length > 1 ? 's' : ''})`).join(' vs ')}.`,
        fix: `Decide the correct value (${why} ${refVal.label}). Then change: ${others.flatMap(v => v.hits.map(h => `${lab(h.doc)} ${where(h.p)} (says ${v.label})`)).slice(0, 8).join('; ')}.`,
        text: others[0].hits[0].text + '  ⟷  ' + refVal.hits[0].text })
    }
    const lawSeen = new Set()
    if (t.law) for (const h of hs) {
      const d = D.find(x => x.name === h.doc)
      if (!d.M.zh || typeof h.v !== 'number' || lawSeen.has(h.doc + '|' + h.v)) continue
      lawSeen.add(h.doc + '|' + h.v)
      const why = t.law(h.v)
      if (why) add('PC-11', { sev: t.lawSev, docs: [h.doc], ref: `${t.en} ${where(h.p)}`, msg: `${h.label} — ${why}.`, fix: t.lawSev === 'info' ? 'Check that a valid approval (e.g. 综合计算工时 permit) covers this, or state the statutory limit alongside the customer code limit.' : 'Change the value so it meets the statutory figure, or cite the local rule or approval that allows it.', text: h.text })
    }
  }

  // PC-06 same sentence, different numbers
  const shapes = new Map()
  for (const d of D) for (const p of d.paras) {
    if (p.text.length < 14 || p.text.length > 260 || p.table && p.table.cells.length > 3) continue
    const t = p.text.replace(/^\s*\d+(\.\d+)*\s*/, '').replace(/^[A-Z][.、)]\s*/, '')
    const nums = []
    const shape = t.replace(/(\d+(?:\.\d+)?|[一二两三四五六七八九十百]+(?=\s*(?:个|年|月|日|天|周|小时|次|元|%|岁|周岁|工作日)))/g, x => { nums.push(cnNum(x)); return '#' }).replace(/\s+/g, '')
    if (!nums.length || shape.replace(/#/g, '').length < 10) continue
    if (!shapes.has(shape)) shapes.set(shape, [])
    shapes.get(shape).push({ d, p, nums: nums.join(','), text: t })
  }
  for (const [, hs] of shapes) {
    const docsN = new Set(hs.map(h => h.d.name))
    const vals = new Set(hs.map(h => h.nums))
    if (docsN.size < 2 || vals.size < 2) continue
    const byVal = new Map(); for (const h of hs) { if (!byVal.has(h.nums)) byVal.set(h.nums, []); byVal.get(h.nums).push(h) }
    const vs = [...byVal.entries()].sort((a, b) => b[1].length - a[1].length)
    add('PC-06', { docs: [...docsN], ref: vs.map(([, h]) => `${h[0].d.L} ${where(h[0].p)}`).join(' vs '),
      msg: vs.map(([n, h]) => `[${n}] in ${[...new Set(h.map(x => x.d.L))].join(', ')}`).join('  vs  '),
      fix: `Check which numbers are right and make the sentence identical in every document${vs[0][1].length > 1 ? ` (most use [${vs[0][0]}])` : ''}.`,
      text: vs.slice(0, 2).map(([, h]) => h[0].text).join('  ⟷  ') })
  }

  // PC-07 retention
  const keeps = new Map() // normalized record name -> [{v, d, p, src}]
  const addKeep = (name, v, d, p, src) => { const k = normTitle(name); if (k.length < 3) return; if (!keeps.has(k)) keeps.set(k, { name, list: [] }); keeps.get(k).list.push({ v, d, p, src }) }
  const yrs = s => { const m = new RegExp(N + '\\s*年').exec(s); return m ? cnNum(m[1]) : (/永久|长期/.test(s) ? 'permanent' : null) }
  for (const d of D) {
    if (d.M.hdr.keep && d.M.hdr.keep.v) { const v = yrs(d.M.hdr.keep.v); if (v != null) addKeep(d.M.title, v, d, d.M.hdr.keep.p, 'header') }
    for (const p of d.paras) {
      const re = new RegExp('(?:保存|保留|存档|归档)(?:期限|年限)?(?:为|不少于|至少|不低于)?\\s*' + N + '\\s*年', 'g')
      let m
      while ((m = re.exec(p.text))) {
        if (p === d.M.hdr.keep?.p) continue
        const v = cnNum(m[1])
        const before = p.text.slice(0, m.index)
        const seg = before.slice(Math.max(before.lastIndexOf('。'), before.lastIndexOf('；'), before.lastIndexOf('：'), before.lastIndexOf(':')) + 1)
        const names = [...seg.matchAll(/《([^》]{2,30})》/g)].map(x => x[1])
        for (const part of seg.replace(/[（(]$/, '').split(/[、，,（(和及与]/)) {
          const n = part.replace(/^.*?(?:包括|如|等|含)/, '').trim()
          if (/(表|单|记录|台账|报告|协议|书|联单|清单)$/.test(n) && n.length <= 20 && !names.includes(n)) names.push(n)
        }
        for (const n of names) addKeep(n, v, d, p, 'text')
      }
    }
  }
  for (const [, k] of keeps) {
    const vals = new Set(k.list.map(x => String(x.v)))
    if (vals.size < 2) continue
    const hdr = k.list.find(x => x.src === 'header')
    add('PC-07', { docs: [...new Set(k.list.map(x => x.d.name))], ref: k.name,
      msg: `《${k.name}》: ` + k.list.map(x => `${x.v === 'permanent' ? 'permanent' : x.v + ' yr'} (${x.d.L}${x.src === 'header' ? ' header' : ' ' + where(x.p)})`).join(' vs '),
      fix: hdr ? `Use one retention period. The form's own header says ${hdr.v} yr; align the other mentions, or change the header if the longer period is required (legal or customer requirement).` : 'Use one retention period for this record in every document; take the longest period that a law or customer requires.',
      text: k.list.filter(x => x.src !== 'header')[0]?.p.text || '' })
  }

  // PC-08 definitions
  const defs = new Map()
  for (const d of D) {
    let inDef = null
    const defTables = new Set()
    for (const p of d.paras) {
      const h = !p.table && /^\s*(\d+(?:\.\d+)*)?\s*(术语和定义|术语与定义|定义|术语|名词解释|definitions?|terms and definitions)\s*$/i.exec(p.text)
      if (h) { inDef = p.sec || 'x'; continue }
      if (inDef && !p.table && p.sec && inDef !== 'x' && p.sec.split('.')[0] !== inDef.split('.')[0]) inDef = null
      if (!inDef) continue
      let term, def
      if (p.table) {
        // only glossary tables (header row names the term / definition columns)
        if (/^(术语|名词|定义|term|序号)/i.test(p.table.cells[0] || '') || /定义|释义|definition/i.test(p.table.cells.join(' '))) { defTables.add(p.table.t); continue }
        if (!defTables.has(p.table.t) || p.table.cells.length < 2) continue
        const c = /^\d+$/.test(p.table.cells[0]) ? p.table.cells.slice(1) : p.table.cells
        term = c[0]; def = c.slice(1).join(' ')
      }
      else { const m = /^\s*(?:\d+(?:\.\d+)*\s*)?([^：:，,。;；]{2,16})[：:]\s*(.{8,})$/.exec(p.text); if (m) { term = m[1]; def = m[2] } }
      if (!term || !def || /^(术语|名词|term|序号)$/i.test(term.trim())) continue
      term = term.replace(/[（(][^）)]*[）)]/g, '').trim()
      const k = normTitle(term)
      if (k.length < 2) continue
      if (!defs.has(k)) defs.set(k, { term, list: [] })
      defs.get(k).list.push({ d, p, def })
    }
  }
  for (const [, x] of defs) {
    const byDoc = new Map(); for (const e of x.list) if (!byDoc.has(e.d.name)) byDoc.set(e.d.name, e)
    const es = [...byDoc.values()]
    if (es.length < 2) continue
    let worst = 1, pair = null
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) { const s = dice(es[i].def, es[j].def); if (s < worst) { worst = s; pair = [es[i], es[j]] } }
    if (worst >= 0.45) continue
    add('PC-08', { sev: worst < 0.2 ? 'warning' : 'info', docs: es.map(e => e.d.name), ref: x.term,
      msg: `"${x.term}" is defined in ${es.length} documents; the wording differs (similarity ${Math.round(worst * 100)}%).`,
      fix: `Agree one definition (usually the one in the policy or manual) and copy it word for word, or point to that document instead of redefining the term.`,
      text: `${pair[0].d.L}: ${clip(pair[0].def, 160)}  ⟷  ${pair[1].d.L}: ${clip(pair[1].def, 160)}` })
  }

  // PC-09 company names in scope / header
  const cos = new Map()
  for (const d of D) for (const p of d.paras.slice(0, 80)) {
    if (!/适用于|以下简称|本公司|甲方|applies to|hereinafter/i.test(p.text)) continue
    for (const m of p.text.matchAll(/([一-龥A-Za-z（）()]{2,30}?(?:股份有限公司|有限责任公司|有限公司|集团公司|集团))/g)) {
      let n = m[1]
      const cut = Math.max(...['适用于', '简称', '为', '由', '与', '是', '对', '向', '及', '和', '、', '即', '本规定', '本制度', '本政策'].map(s => { const i = n.lastIndexOf(s); return i < 0 ? -1 : i + s.length }))
      if (cut > 0) n = n.slice(cut)
      if (n.length < 4 || /[（(]/.test(n[0]) || /供应商|客户|子公司|分公司|关联/.test(n)) continue
      if (!cos.has(n)) cos.set(n, new Set())
      cos.get(n).add(d.name)
    }
  }
  // "规定了X有限公司" etc.: fold a name into a shorter name it ends with
  for (const n of [...cos.keys()].sort((a, b) => b.length - a.length)) {
    const base = [...cos.keys()].filter(o => o !== n && n.endsWith(o) && o.length >= 5).sort((a, b) => cos.get(b).size - cos.get(a).size)[0]
    if (base) { for (const x of cos.get(n)) cos.get(base).add(x); cos.delete(n) }
  }
  for (const n of [...cos.keys()]) if (n.length < 5 || /^公司/.test(n)) cos.delete(n)
  if (cos.size > 1) {
    const list = [...cos.entries()].sort((a, b) => b[1].size - a[1].size)
    add('PC-09', { docs: [...new Set(list.flatMap(([, s]) => [...s]))], ref: 'company name',
      msg: list.map(([n, s]) => `${n} (${s.size} doc${s.size > 1 ? 's' : ''})`).join(' vs '),
      fix: `Use the registered company name everywhere (most documents use ${list[0][0]}): ${list.slice(1).map(([n, s]) => `${n} in ${[...s].slice(0, 5).join(', ')}`).join('; ')}.` })
  }

  // PC-10 department name variants
  const depts = new Map()
  for (const d of D) for (const key of ['dept', 'keepDept']) { const v = d.M.hdr[key]?.v; if (v && /(部|中心|委员会|办公室)$/.test(v) && v.length <= 12) depts.set(v, (depts.get(v) || 0) + 1) }
  const dstem = s => s.replace(/(管理部|管理中心|部门|部|中心|处|科)$/, '')
  const seen = new Set()
  for (const dn of depts.keys()) {
    const st = dstem(dn)
    if (st.length < 2 || seen.has(st)) continue
    seen.add(st)
    const variants = new Map()
    for (const d of D) for (const p of d.paras) for (const m of p.text.matchAll(new RegExp(st + '(管理部|管理中心|部|中心|处|科)', 'g'))) {
      const name = st + m[1]
      const after = p.text.slice(m.index + m[0].length, m.index + m[0].length + 1)
      if (m[1] === '部' && after === '门') continue
      if (!variants.has(name)) variants.set(name, new Set())
      variants.get(name).add(d.name)
    }
    if (variants.size > 1) {
      const vl = [...variants.entries()].sort((a, b) => b[1].size - a[1].size)
      add('PC-10', { docs: [...new Set(vl.flatMap(([, s]) => [...s]))], ref: st,
        msg: vl.map(([n, s]) => `${n} (${s.size} doc${s.size > 1 ? 's' : ''})`).join(' vs '),
        fix: `If these are the same department, use one name (${vl[0][0]} is the most common). If they are different units, say so in the responsibilities section.` })
    }
  }

  // PC-14 blank header / placeholders (one summary line when most of a large set are templates)
  const pc14 = []
  for (const d of D) {
    const blanks = []
    for (const k of ['version', 'date', 'author', 'reviewer', 'approver']) { const h = d.M.hdr[k]; if (h && (!h.v || /^[年月日\s　]+$/.test(h.v))) blanks.push(k) }
    const ph = (d.text.match(/＿{2,}|_{3,}|（[^（）]{0,12}名称）|【[^】]{0,12}】|XXX+|××+/g) || [])
    if (blanks.length || ph.length) pc14.push({ docs: [d.name], ref: d.M.code,
      msg: [blanks.length ? `Blank header fields: ${blanks.join(', ')}` : '', ph.length ? `${ph.length} placeholder(s), e.g. ${[...new Set(ph)].slice(0, 3).join(' ')}` : ''].filter(Boolean).join('. '),
      fix: 'Fill in version, effective date and sign-offs before issue; replace placeholders. Fine to ignore for templates.' })
  }
  if (pc14.length > 8) add('PC-14', { docs: pc14.flatMap(x => x.docs), ref: `${pc14.length} documents`,
    msg: `${pc14.length} of ${D.length} documents have blank header fields or placeholders (normal for templates): ${pc14.slice(0, 12).map(x => x.ref || x.docs[0]).join(', ')}${pc14.length > 12 ? '…' : ''}`,
    fix: 'Fill in version, effective date and sign-offs before issue; replace placeholders. Each document is listed in the Excel report.', all: pc14 })
  else for (const x of pc14) add('PC-14', x)

  const ORDER = { error: 0, warning: 1, info: 2 }
  out.sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return {
    docs: D.map(d => ({ name: d.name, code: d.M.code, title: d.M.title, version: d.M.hdr.version?.v || '', dept: d.M.hdr.dept?.v || '', paras: d.paras.length })),
    topics, findings: out, missing,
  }
}
