// Carbon footprint form checker (browser + Node). Pure JS.
// Input: sheets = [{ name, hidden, rows: [[value...]], r0, c0 }] from toSheets().
// It finds dataset tables by their headers (TeR / GeR / TiR / DQR, EF, data source, dataset name,
// geography, UUID), so it works on the EU battery CFR template and on similar customer templates.
// It also checks life-cycle inventory (LCI) data collection sheets.

import { applyStandard, defaultStandard, STANDARDS } from './standards.js'
import { matchMaterial, matchEnergy, matchTransport, matchWaste, geoCode, regionOf, dbYear, MATERIALS, ENERGY, TRANSPORT, GRID, TRANSPORT_SRC } from './factors.js'

export const RULES = {
  'CF-01': { sev: 'error', en: 'Rating cell holds text instead of a number (broken formula?)', zh: '评分单元格是文字而非数字（公式损坏？）' },
  'CF-02': { sev: 'error', en: 'DQR is not the average of its TeR / GeR / TiR (/ P) ratings', zh: 'DQR 不等于 TeR/GeR/TiR（/P）的平均值' },
  'CF-03': { sev: 'error', en: 'Rating outside 1–5 for a used dataset', zh: '已使用的数据集评分不在 1–5 之间' },
  'CF-04': { sev: 'warning', en: 'Emission factor without data source, dataset name or valid UUID', zh: '排放因子缺少数据来源、数据集名称或有效 UUID' },
  'CF-05': { sev: 'warning', en: 'Dataset material does not match the component', zh: '数据集材料与组件不符' },
  'CF-06': { sev: 'warning', en: 'Proxy dataset rated as if it were the real material', zh: '代用数据集按真实材料评分' },
  'CF-07': { sev: 'warning', en: 'Stated data quality rating is better than the rules suggest', zh: '填报的数据质量评分优于规则建议值' },
  'CF-08': { sev: 'warning', en: 'Emission factor outside the public reference range', zh: '排放因子超出公开参考范围' },
  'CF-09': { sev: 'info', en: 'Electricity factor: which published figure is used', zh: '电力因子：所用的公开数值' },
  'CF-10': { sev: 'error', en: 'Emissions do not equal quantity × emission factor', zh: '排放量不等于用量 × 排放因子' },
  'CF-11': { sev: 'warning', en: 'Estimated or vendor data rated as best quality (1)', zh: '估算或供应商数据被评为最优（1）' },
  'CF-12': { sev: 'info', en: 'Several database versions mixed in one study', zh: '同一研究混用多个数据库版本' },
  'CF-14': { sev: 'warning', en: 'Excel error values in the form', zh: '表中存在 Excel 错误值' },
  'CF-15': { sev: 'info', en: 'Report information incomplete', zh: '报告基本信息不完整' },
  'CF-16': { sev: 'error', en: 'Product totals do not add up (energy, mass or emissions)', zh: '产品合计不一致（能量、质量或排放）' },
  'CF-17': { sev: 'info', en: 'Same material with a different factor or dataset in another file', zh: '同一材料在不同文件中的因子或数据集不同' },
  'CF-20': { sev: 'error', en: 'Product description contradicts its specifications', zh: '产品名称与规格参数矛盾' },
  'CF-21': { sev: 'warning', en: 'Data collection period shorter than required', zh: '数据收集周期短于要求' },
  'CF-22': { sev: 'warning', en: 'Line or site in the file name differs from the form', zh: '文件名中的产线/基地与表内不一致' },
  'CF-23': { sev: 'warning', en: 'Per-unit value is not total ÷ production quantity', zh: '单位产品用量不等于总量 ÷ 产量' },
  'CF-24': { sev: 'warning', en: 'Mass balance gap of 5% or more', zh: '质量守恒差异 ≥5%' },
  'CF-25': { sev: 'warning', en: 'Unit label does not fit the quantity', zh: '单位与数量不符' },
  'CF-26': { sev: 'warning', en: 'Data or allocation taken from a different period', zh: '数据或分配依据来自其他期间' },
  'CF-27': { sev: 'warning', en: 'Transport t·km does not equal mass × distance', zh: '运输吨公里不等于质量 × 距离' },
  'CF-28': { sev: 'info', en: 'Required fields left blank', zh: '必填字段空白' },
  'CF-30': { sev: 'error', en: 'Rating not allowed under the selected standard (e.g. TeR 1–2 for a database dataset)', zh: '评分不符合所选标准（如数据库数据集评 TeR 1–2）' },
  'CF-31': { sev: 'warning', en: 'DQR formula or criteria differ from the selected standard', zh: 'DQR 公式或评分项与所选标准不同' },
  'CF-32': { sev: 'warning', en: 'Data quality above the threshold of the selected standard', zh: '数据质量超出所选标准的限值' },
  'CF-33': { sev: 'warning', en: 'Datasets not EF-compliant where the standard requires EF-compliant data', zh: '标准要求 EF 兼容数据集，但所用数据集未标明 EF 兼容' },
  'CF-34': { sev: 'warning', en: 'Electricity modelling does not follow the selected standard', zh: '电力建模方式不符合所选标准' },
  'CF-35': { sev: 'warning', en: 'GWP set / characterisation method differs from the selected standard or is not stated', zh: 'GWP / 特征化方法与所选标准不同或未说明' },
  'CF-36': { sev: 'warning', en: 'Cut-off above the limit of the selected standard', zh: '截断比例超出所选标准的限值' },
  'CF-37': { sev: 'error', en: 'Offsets or carbon credits included in the footprint', zh: '碳足迹中计入了抵消或碳信用' },
  'CF-38': { sev: 'info', en: 'Item the selected standard asks to document not found in the form', zh: '表格中未找到所选标准要求记录的内容' },
}

// ---------- workbook → sheets ----------
export function colName(c) { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26) } return s }
export function toSheets(X, wb) {
  return wb.SheetNames.map((name, i) => {
    const ws = wb.Sheets[name]
    const hidden = !!(wb.Workbook && wb.Workbook.Sheets && wb.Workbook.Sheets[i] && wb.Workbook.Sheets[i].Hidden)
    if (!ws || !ws['!ref']) return { name, hidden, rows: [], r0: 0, c0: 0 }
    const rg = X.utils.decode_range(ws['!ref'])
    const rows = []
    for (let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 3000); r++) {
      const row = []
      for (let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 120); c++) {
        const cell = ws[X.utils.encode_cell({ r, c })]
        row.push(!cell ? null : cell.t === 'e' ? '#ERR:' + (cell.w || '#ERROR') : cell.v)
      }
      rows.push(row)
    }
    return { name, hidden, rows, r0: rg.s.r, c0: rg.s.c }
  })
}

// ---------- helpers ----------
const txt = v => v == null ? '' : String(v).replace(/\s+/g, ' ').trim()
const isNum = v => typeof v === 'number' && isFinite(v)
const num = v => { if (isNum(v)) return v; const t = txt(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(t) ? parseFloat(t) : null }
const blank = v => { const t = txt(v); return !t || /^(n|na|n\/a|\/|-|none|null)$/i.test(t) }
const addr = (sh, r, c) => `${colName(sh.c0 + c)}${sh.r0 + r + 1}`
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12)
const fmtN = v => !isNum(v) ? String(v) : Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 1 ? +v.toFixed(3) + '' : +v.toPrecision(3) + ''
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTIMATE = /estimat|vendor|assum|proxy|估算|估计|假设|经验|reuse.*estimate|use vendor/i
const MEASURED = /measur|meter|metered|实测|测量|抄表|监测/i
const family = m => !m ? null : m.id.replace(/_(recycled|primary|foil|syn|nat|di|tap|stainless|gh)$/, '').replace(/^(cam|pcam)_.*/, 'cam')

// ---------- header detection ----------
const H = {
  // short codes ("TeR", "TeR (1-5)"), full names, Chinese names
  ter: /^te?r\b(?!\s*[a-z])|^technolog(y|ical)[- ]representativ|^技术代表性/i,
  ger: /^ge?r\b(?!\s*[a-z])|^geograph(y|ic|ical)[- ]representativ|^地理代表性/i,
  tir: /^ti?r\b(?!\s*[a-z])|^(time|temporal)[- ](related[- ])?representativ|^时间代表性/i,
  p: /^(p|pr|precision|精确度|精度)$|^(p|precision)\s*\(|^precision\b|^精确度/i, dqr: /^dqr\b|^data quality rating|^数据质量评分|^数据质量等级/i,
  ef: /(^|\s)e\s?f\b|emission factor|evirgin|erecycled|排放因子|kg\s*co2[-\s]?eq\.?\s*\/\s*(kg|fu|ton|t\b|kwh|unit)/i,
  src: /data\s*source|数据来源|^source$/i,
  db: /(database|dataset)\s*-?\s*(material |process )?name|数据集名称|数据库名称/i,
  geo: /geograph|地理/i, uuid: /uuid|identifier/i,
  name: /raw\s*materials?$|^name$|type of energy|material name|^materials?$|component|物料|材料名称|能源类型|^process$|名称/i,
  qty: /consumption|data collected|fu per|用量|消耗量|quantity|amount/i, mass: /mass/i,
  origin: /origin|产地|country/i, details: /details|measured or estimated|数据说明|数据描述/i,
  r1: /(^|\s)r1|recycled content|再生含量/i, emis: /emissions? due to|^kg\s*co2[-\s]?eq\.?\s*\/\s*1\b|排放量/i, dist: /distance|距离/i,
}
function headerText(sh, r, c) { return txt((sh.rows[r - 1] || [])[c]) + ' | ' + txt((sh.rows[r] || [])[c]) }
function cellIs(sh, r, c, re) { return re.test(txt((sh.rows[r] || [])[c])) || (r > 0 && re.test(txt((sh.rows[r - 1] || [])[c]))) }

function findTables(sh) {
  const tables = []
  for (let r = 0; r < sh.rows.length; r++) {
    const row = sh.rows[r]
    const ters = []
    row.forEach((v, c) => { if (H.ter.test(txt(v))) ters.push(c) })
    if (!ters.length) continue
    const blocks = [], groups = []
    let prevEnd = -1
    for (const t of ters) {
      const b = { ter: t }
      for (let c = t + 1; c <= t + 6 && c < row.length; c++) {
        const s = txt(row[c])
        if (b.ger == null && H.ger.test(s)) b.ger = c
        else if (b.tir == null && H.tir.test(s)) b.tir = c
        else if (b.p == null && H.p.test(s)) b.p = c
        else if (b.dqr == null && H.dqr.test(s)) { b.dqr = c; break }
        else if (H.ter.test(s)) break
      }
      for (let c = t - 1; c > prevEnd && c >= t - 10; c--) {
        if (b.uuid == null && cellIs(sh, r, c, H.uuid)) b.uuid = c
        else if (b.geo == null && cellIs(sh, r, c, H.geo)) b.geo = c
        else if (b.db == null && cellIs(sh, r, c, H.db)) b.db = c
        else if (b.src == null && cellIs(sh, r, c, H.src)) b.src = c
        else if (b.ef == null && H.ef.test(txt(row[c]))) b.ef = c
        else if (b.dist == null && b.ef != null && cellIs(sh, r, c, H.dist)) b.dist = c
      }
      if (b.ef == null) for (let c = t - 1; c > prevEnd && c >= t - 10; c--) if (cellIs(sh, r, c, H.ef)) { b.ef = c; break }
      groups.push(b)
      if (b.ef == null) continue
      b.label = (/^(e[a-z_]+)/i.exec(txt(row[b.ef])) || [, 'EF'])[1]
      prevEnd = b.dqr ?? b.tir ?? b.ter
      blocks.push(b)
    }
    // rating blocks moved away from their EF columns (e.g. all at the far right): pair them in order,
    // 1st rating block with the 1st EF column, when there are as many EF columns as rating blocks
    if (blocks.length < groups.length) {
      const efCols = row.map((v, c) => (H.ef.test(txt(v)) && !H.emis.test(txt(v)) ? c : -1)).filter(c => c >= 0)
      if (efCols.length === groups.length) {
        blocks.length = 0
        groups.forEach((g, i) => {
          const b = { ter: g.ter, ger: g.ger, tir: g.tir, p: g.p, dqr: g.dqr, ef: efCols[i] }
          const lo = i ? efCols[i - 1] : -1
          for (let c = b.ef - 1; c > lo && c >= b.ef - 8; c--) {
            if (b.uuid == null && cellIs(sh, r, c, H.uuid)) b.uuid = c
            else if (b.geo == null && cellIs(sh, r, c, H.geo)) b.geo = c
            else if (b.db == null && cellIs(sh, r, c, H.db)) b.db = c
            else if (b.src == null && cellIs(sh, r, c, H.src)) b.src = c
          }
          b.label = (/^(e[a-z_]+)/i.exec(txt(row[b.ef])) || [, 'EF'])[1]
          blocks.push(b)
        })
      }
    }
    if (!blocks.length) continue
    tables.push(buildTable(sh, r, blocks))
  }
  if (!tables.length) { const T = looseTable(sh); if (T) tables.push(T) }
  return tables
}


// name / context / quantity / origin / details / r1 columns, data rows, for one header row.
// loose: the columns were found anywhere in the row, so look on both sides of the EF column.
function buildTable(sh, r, blocks, loose = false) {
  const row = sh.rows[r]
  const firstEf = blocks[0].ef
  const T = { r, blocks, emis: [] }
  // name / context / quantity / origin / details / r1 columns left of the first EF
  const taken = new Set(blocks.flatMap(b => ['ter', 'ger', 'tir', 'p', 'dqr', 'ef', 'src', 'db', 'geo', 'uuid'].map(k => b[k]).filter(v => v != null)))
  const leftCols = loose ? [...Array(row.length).keys()].filter(c => !taken.has(c)).sort((x, y) => Math.abs(x - firstEf) - Math.abs(y - firstEf)).sort((x, y) => (y < firstEf) - (x < firstEf)) : [...Array(firstEf).keys()].reverse()
  for (const c of leftCols) {
    const is = re => cellIs(sh, r, c, re)
    if (T.details == null && is(H.details)) T.details = c
    else if (T.origin == null && is(H.origin)) T.origin = c
    else if (T.qty == null && is(H.qty)) T.qty = c
    else if (T.mass == null && is(H.mass) && !is(/composition/i)) T.mass = c
    else if (is(H.name)) { if (T.name == null) T.name = c; else if (T.ctx == null) T.ctx = c }
    if (T.unit == null && /^fu\b|\(kwh|unit/i.test(txt(sh.rows[r][c]))) T.unit = c
  }
  if (T.qty == null) T.qty = T.mass
  if (T.name == null) { for (let c = firstEf - 1; c >= 0; c--) if (txt(sh.rows[r][c])) { T.name = c; break } }
  for (let c = 0; c < row.length; c++) {
    const s = headerText(sh, r, c)
    if (c > firstEf && H.emis.test(s) && !blocks.some(b => b.ef === c)) T.emis.push(c)
    if (T.r1 == null && H.r1.test(txt(row[c]))) T.r1 = c
  }
  // data rows
  T.rows = []
  let empty = 0
  for (let rr = r + 1; rr < sh.rows.length; rr++) {
    const rw = sh.rows[rr]
    if (rw.some(v => H.ter.test(txt(v)) || /^dqr$/i.test(txt(v)) || /^kg\s*co2[-\s]?eq\.?\s*\/\s*1/i.test(txt(v)))) break
    if (rw.some(v => /please complete/i.test(txt(v)))) continue
    const used = blocks.some(b => num(rw[b.ef]) != null || !blank(rw[b.db]) || !blank(rw[b.src]))
    if (!used) { if (++empty >= 4) break; continue }
    empty = 0
    T.rows.push(rr)
  }
  // unlabelled column holding the real item names (e.g. E = "Material 1", F = "Lithium carbonate")
  for (let c = (T.name ?? -1) + 1; c < firstEf; c++) {
    if (txt(sh.rows[r][c]) || txt((sh.rows[r - 1] || [])[c]) || c === T.qty || c === T.origin || c === T.details || c === T.mass) continue
    const vals = T.rows.map(rr => sh.rows[rr][c]).filter(v => txt(v))
    if (vals.length >= Math.max(1, T.rows.length * 0.5) && vals.filter(v => num(v) == null).length >= vals.length * 0.8) { T.ctx = T.name; T.name = c; break }
  }
  // two "database name" columns: the right one holding country codes is really the geography
  for (const b of blocks) {
    if (b.geo != null || b.db == null) continue
    const looksGeo = col => { const vals = T.rows.map(rr => txt(sh.rows[rr][col])).filter(v => v && !/^n$/i.test(v)); return vals.length && vals.filter(v => geoCode(v)).length >= vals.length * 0.7 }
    if (looksGeo(b.db) && b.db - 1 >= 0 && cellIs(sh, r, b.db - 1, H.db)) { b.geo = b.db; b.db = b.db - 1; b.geoMislabel = true }
  }
  return T
}

// Fallback when no table has the usual layout (TeR / GeR / TiR right next to each other, EF and
// dataset columns just left of them): a header row with an EF column and either two of TeR / GeR /
// TiR or a name and a quantity column, with the columns in any order.
function looseTable(sh) {
  for (let r = 0; r < Math.min(sh.rows.length, 80); r++) {
    const row = sh.rows[r]
    const own = re => row.findIndex(v => re.test(txt(v)))
    const ef = row.findIndex((v, c) => H.ef.test(txt(v)) && !H.emis.test(txt(v)))
    if (ef < 0) continue
    const b = { ef, ter: own(H.ter), ger: own(H.ger), tir: own(H.tir), p: own(H.p), dqr: own(H.dqr) }
    for (const k of Object.keys(b)) if (b[k] < 0) b[k] = null
    const near = re => { let best = null; row.forEach((v, c) => { if (c !== ef && !Object.values(b).includes(c) && cellIs(sh, r, c, re) && (best == null || Math.abs(c - ef) < Math.abs(best - ef))) best = c }); return best }
    b.db = near(H.db); b.src = near(H.src); b.uuid = near(H.uuid)
    b.geo = near(/geograph(?!.*representativ)|^地理(?!代表)|^location$|^region$/i)
    const dq = ['ter', 'ger', 'tir'].filter(k => b[k] != null).length
    const hasName = row.some(v => H.name.test(txt(v))), hasQty = row.some(v => H.qty.test(txt(v)) || H.mass.test(txt(v)))
    if (dq < 2 && !(hasName && hasQty)) continue
    b.label = (/^(e[a-z_]+)/i.exec(txt(row[b.ef])) || [, 'EF'])[1]
    const T = buildTable(sh, r, [b], true)
    if (T.rows.length) { T.loose = true; return T }
  }
  return null
}

// ---------- ratings ----------
function sugGeR(origin, geo) {
  const o = geoCode(origin), g = geoCode(geo)
  if (!o || o.kind !== 'C' || !g) return null
  const or = regionOf(o.code)
  if (g.kind === 'C' && g.code === o.code) return { v: 1, why: `dataset geography ${g.code} = origin ${o.code}` }
  if (g.kind === 'REG' && g.code === or) return { v: 2, why: `dataset region ${geo} contains origin ${o.code}` }
  if (g.kind === 'GLO') return { v: 3, why: `global dataset for origin ${o.code}` }
  if (g.kind === 'ROW') return { v: 3, why: `rest-of-world dataset for origin ${o.code}` }
  if (g.kind === 'C' && regionOf(g.code) === or) return { v: 4, why: `dataset from ${g.code}, a different country in the same region as ${o.code}` }
  return { v: 5, why: `dataset geography ${geo} is outside the origin's region (${o.code})` }
}
function sugTiR(src, db, details, refYear) {
  const y = dbYear(src, db) || (/(20[0-3]\d)/.test(txt(details)) ? { year: +/(20[0-3]\d)/.exec(txt(details))[1], label: txt(details) } : null)
  if (!y || !refYear) return null
  const d = refYear - y.year
  const v = d <= 2 ? 1 : d <= 4 ? 2 : d <= 6 ? 3 : d <= 8 ? 4 : 5
  return { v, why: `${y.label} ≈ ${y.year}, report year ${refYear} (${d} yr)` }
}
const PROCESS_WORDS = /moulding|molding|working|extrusion|rolling|drawing|machining|casting|stamping|welding|coating|production|manufactur|加工|成型|挤出/i
function sugTeR(item, ctx, src, db, details, isEnergy) {
  if (ESTIMATE.test(`${src} ${details}`) && blank(db)) return { v: 3, why: 'estimated / vendor figure without a dataset' }
  if (blank(db)) return null
  const dt = matchTransport(db)
  if (/transport|freight|lorry|truck|ship|rail/i.test(db) && dt) {
    const it = matchTransport(`${item} ${ctx}`)
    if (!it || it.id === dt.id) return { v: 2, why: `${dt.en} dataset` }
    return { v: 4, why: `${it.en} modelled with a ${dt.en} dataset`, mismatch: true }
  }
  if (/treatment of|waste|landfill|incinerat|recycling of/i.test(db) && !/recycl\w* .{0,20}into/i.test(db)) return { v: 2, why: 'end-of-life / waste treatment dataset' }
  if (isEnergy) {
    const ie = matchEnergy(item), de = matchEnergy(db) || matchEnergy(src)
    if (ie && de && ie.id === de.id) return { v: 2, why: `${ie.en} dataset matches` }
    if (ie && de) return { v: 4, why: `${ie.en} modelled with a ${de.en} dataset` }
    if (ie) return null
  }
  const im = matchMaterial(item), dm = matchMaterial(db)
  if (im && dm) {
    if (im.id === dm.id) return { v: 2, why: `dataset is ${dm.en}, same material` }
    if (family(im) === family(dm)) return { v: 2, why: `dataset is ${dm.en}, same material family` }
    if (im.kind === dm.kind) return { v: 4, why: `dataset is ${dm.en}, a different ${im.kind} than ${im.en}`, mismatch: true }
    return { v: 5, why: `dataset is ${dm.en}; component is ${im.en}`, mismatch: true }
  }
  if (im && !dm) {
    if (PROCESS_WORDS.test(db) && !/(production|manufactur)[^,;]*,/i.test(db) && /moulding|molding|working|extrusion|rolling|drawing|machining|casting|stamping/i.test(db))
      return { v: 2, why: 'generic processing dataset, no other material named' }
    const words = String(item).toLowerCase().split(/[^a-z一-龥]+/).filter(w => w.length >= 3)
    if (words.some(w => db.toLowerCase().includes(w))) return { v: 2, why: 'dataset name contains the component name' }
    return { v: 4, why: `"${db}" does not name ${im.en}: a proxy dataset`, proxy: true }
  }
  // no library match: compare the words (chemical names, formulas)
  const words = s => String(s).toLowerCase().replace(/[^a-z0-9一-龥]+/g, ' ').split(' ').filter(w => w.length >= 4 && !/^(production|source|material|mixed|other|from|with|average|market|china|granulate|powder|treatment|reference|data)$/.test(w))
  const SYN = { fe3o4: 'magnetite', fe2o3: 'hematite', h3po4: 'phosphoric', li2co3: 'lithium carbonate', lioh: 'lithium hydroxide', h2so4: 'sulfuric', naoh: 'sodium hydroxide', fpc: 'printed', pcb: 'printed', silicone: 'siloxane silicone', ec: 'ethylene carbonate', dmc: 'dimethyl carbonate', emc: 'ethyl methyl carbonate' }
  const expand = t => t + ' ' + Object.entries(SYN).filter(([k]) => new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`, 'i').test(t)).map(([, v]) => v).join(' ')
  const iw = words(expand(`${item}`)), dw = words(db)
  if (iw.length && dw.length && /[a-z]/.test(iw.join(''))) {
    if (iw.some(w => dw.some(d => d.includes(w) || w.includes(d)))) return { v: 2, why: 'dataset name contains the component name' }
    return { v: 4, why: `"${db}" shares no words with "${item}": possibly a proxy`, proxy: true, weak: true }
  }
  return null
}
function sugP(src, db, details) {
  const s = `${src} ${details}`
  if (ESTIMATE.test(s)) return { v: 4, why: 'estimated / vendor / assumed value' }
  if (MEASURED.test(s)) return { v: 1, why: 'measured data' }
  if (/calculat|计算|bom/i.test(s)) return { v: 2, why: 'calculated from primary data' }
  if (!blank(db) || /ecoinvent|sphera|gabi|database|reference data/i.test(s)) return { v: 3, why: 'secondary database value (precision taken from the dataset)' }
  return null
}

// ---------- reference range check ----------
function refCheck(item, ctx, db, ef, efHeader, unitHint, isTransport, isEnergyTable) {
  const h = txt(efHeader).toLowerCase()
  if (isTransport || /ton\s*\/?\s*km|t\s*km|tkm|吨公里/.test(h)) {
    const m = matchTransport(`${unitHint} ${item} ${db}`)
    if (!m) return null
    return { ref: m, lo: m.lo, hi: m.hi, unit: 't·km', src: TRANSPORT_SRC }
  }
  const perKg = /\/\s*kg|per kg|kg co2-eq\.\/kg/.test(h) || /^e(virgin|recycled)/.test(h)
  const e = perKg && matchMaterial(item) ? null : (matchEnergy(item) || (isEnergyTable && matchEnergy(db) && !matchMaterial(item) ? matchEnergy(db) : null))
  if (e) {
    const u = txt(unitHint).toLowerCase()
    if (e.id === 'electricity' && u && !/kwh|千瓦时|度/.test(u)) return null
    if (e.id === 'diesel' && /\bl\b|升|litre|liter/.test(u)) return { ref: e, lo: 2.6, hi: 3.4, unit: 'L', src: e.src }
    if (e.id === 'natural_gas' && !/m3|m³|nm3|立方/.test(u)) return null
    if ((e.id === 'diesel' || e.id === 'coal' || e.id === 'lpg' || e.id === 'steam') && u && !/kg|千克|公斤/.test(u)) return null
    return { ref: e, lo: e.lo, hi: e.hi, unit: e.unit, src: e.src }
  }
  if (/\/\s*kg|per kg|kg co2-eq\.\/kg/.test(h) || /^e(virgin|recycled)/.test(h)) {
    const recycled = /erecycled|recycl/i.test(h)
    let m = matchMaterial(item)
    if (recycled && m) {
      const f = family(m)
      const rec = MATERIALS.find(x => x.id === f + '_recycled')
      if (rec) m = rec
      else if (m.kind === 'polymer') return { ref: m, lo: 0.1, hi: 1.5, unit: 'kg', src: 'Mechanical recycling of plastics: washing, drying, regranulation (about 0.2–1 kg CO2e/kg)' }
      else return null
    }
    if (!m) return null
    return { ref: m, lo: m.lo, hi: m.hi, unit: 'kg', src: m.src }
  }
  return null
}

// ---------- main: one file ----------
export function checkFile(sheets, fileName, opts = {}) {
  const out = []
  const add = (id, o) => out.push({ id, sev: o.sev || RULES[id].sev, sheet: o.sheet || '', cell: o.cell || '', ref: o.ref || '', msg: o.msg || '', fix: o.fix || '', file: fileName })
  const ratings = [], factors = []
  const refYear = opts.refYear || Math.max(...[...String(fileName).matchAll(/(20[2-3]\d)/g)].map(m => +m[1]), 0) || new Date().getFullYear()
  const meta = { type: 'Carbon footprint form', product: '', fields: [] }
  const vis = sheets.filter(s => !s.hidden)

  // default origin country: plant locations in a general-information sheet, else most common origin
  let defOrigin = null
  const label = (re, sh = null) => {
    for (const s of sh ? [sh] : vis) for (let r = 0; r < s.rows.length; r++) for (let c = 0; c < s.rows[r].length; c++) {
      if (re.test(txt(s.rows[r][c]))) { for (let k = c + 1; k < s.rows[r].length; k++) if (!blank(s.rows[r][k])) return { v: s.rows[r][k], sh: s, r, c: k }; return { v: null, sh: s, r, c } }
    }
    return null
  }
  const cellLoc = h => h ? addr(h.sh, h.r, h.c) : ''
  const pl = label(/plant location for the cell production|产品产地|plant location/i)
  if (pl) defOrigin = geoCode(pl.v)?.code || null

  // ---------- dataset tables ----------
  const versions = new Set()
  for (const sh of vis) {
    // Excel errors
    const errs = []
    sh.rows.forEach((row, r) => row.forEach((v, c) => { if (typeof v === 'string' && v.startsWith('#ERR:') && !(r + sh.r0 === 0 && c + sh.c0 <= 1)) errs.push(addr(sh, r, c)) }))
    const templ = /^(guide|content|glossary|auxi)/i.test(sh.name)
    const hasData = findTables(sh).some(T => T.rows.some(rr => T.blocks.some(b => num(sh.rows[rr][b.ef]) > 0)))
    if (errs.length && !templ && hasData) add('CF-14', { sheet: sh.name, cell: errs.slice(0, 6).join(', ') + (errs.length > 6 ? ` +${errs.length - 6}` : ''), msg: `${errs.length} cell(s) show an Excel error value (#VALUE!, #REF!, #DIV/0!…).`, fix: 'Fix the formula or input behind each error; error values usually break the totals that depend on them.' })

    for (const T of findTables(sh)) {
      const hdr = sh.rows[T.r]
      const isEnergyTable = /type of energy|energy|能源/i.test(headerText(sh, T.r, T.name ?? 0)) || /energy|能源/i.test(txt(hdr[T.ctx]))
      const isTransport = T.blocks.some(b => b.dist != null) || /ton\s*\/\s*km|t·km|tkm/i.test(T.blocks.map(b => txt(hdr[b.ef])).join(' '))
      let lastName = '', lastCtx = ''
      for (const rr of T.rows) {
        const rw = sh.rows[rr]
        let item = txt(rw[T.name]) || lastName
        if (num(item) != null) { item = ''; for (let c = (T.name ?? 1) - 1; c >= 0; c--) if (txt(rw[c]) && num(rw[c]) == null) { item = txt(rw[c]); break } }
        const ctx = txt(rw[T.ctx]) || lastCtx
        if (txt(rw[T.name])) lastName = txt(rw[T.name])
        if (txt(rw[T.ctx])) lastCtx = txt(rw[T.ctx])
        const origin = txt(rw[T.origin]) || defOrigin
        const details = txt(rw[T.details])
        const qty = num(rw[T.qty])
        const unitHint = txt(rw[T.unit]) || (isTransport ? txt(rw[T.blocks[0].ef - 1]) : '')
        if (T.unit != null && txt(rw[T.unit]) && !/^(kwh|mwh|gj|mj|kj|kg|t|g|l|m3|m³|nm3|nm³|m\^3|pcs|tkm|t·km|ton|吨|千瓦时|度|立方米?)$/i.test(txt(rw[T.unit]).replace(/\s/g, '')))
          add('CF-25', { sheet: sh.name, cell: addr(sh, rr, T.unit), ref: item, msg: `Unit "${txt(rw[T.unit])}" is not a recognised unit${/wkh|kwk|khw/i.test(txt(rw[T.unit])) ? ' (typo for kWh?)' : ''}.`, fix: 'Use a standard unit (kWh, MJ, m³, kg, t·km) so the factor can be matched.' })
        const rowLabel = [ctx && ctx !== item ? ctx : '', item].filter(Boolean).join(' › ') || `row ${sh.r0 + rr + 1}`
        const efs = []
        for (const b of T.blocks) {
          const ef = num(rw[b.ef])
          const src = txt(rw[b.src]), db = txt(rw[b.db]), geo = txt(rw[b.geo]), uuid = txt(rw[b.uuid])
          const unused = (!ef || ef === 0) && blank(src) && blank(db)
          efs.push({ b, ef })
          if (unused) continue
          const y = dbYear(src, db); if (y && /ecoinvent/i.test(y.label)) versions.add(y.label)
          const stated = {}
          let broken = false
          for (const k of ['ter', 'ger', 'tir', 'p', 'dqr']) {
            if (b[k] == null) continue
            const raw = rw[b[k]]
            const n = num(raw)
            if (raw != null && n == null && txt(raw)) { broken = true; add('CF-01', { sheet: sh.name, cell: addr(sh, rr, b[k]), ref: `${rowLabel} · ${b.label} ${k.toUpperCase()}`, msg: `${k.toUpperCase()} cell contains "${txt(raw)}" instead of a number.`, fix: 'Re-enter the rating as a number (1–5). Text like "1+R25" means a formula lost its "=" sign, so the DQR that averages it is wrong.' }) }
            stated[k] = n
          }
          const parts = ['ter', 'ger', 'tir', 'p'].filter(k => b[k] != null && stated[k] != null)
          if (ef > 0) {
            const bad = parts.filter(k => !(stated[k] >= 1 && stated[k] <= 5))
            if (bad.length) add('CF-03', { sheet: sh.name, cell: addr(sh, rr, b[bad[0]]), ref: `${rowLabel} · ${b.label}`, msg: `${bad.map(k => k.toUpperCase() + '=' + stated[k]).join(', ')} for a dataset with EF ${fmtN(ef)}.`, fix: 'Rate every used dataset from 1 (best) to 5 (worst).' })
          }
          if (b.dqr != null && stated.dqr != null && parts.length && !broken && parts.every(k => stated[k] >= 1)) {
            const mean = parts.reduce((s, k) => s + stated[k], 0) / parts.length
            if (Math.abs(mean - stated.dqr) > 0.05) add('CF-02', { sheet: sh.name, cell: addr(sh, rr, b.dqr), ref: `${rowLabel} · ${b.label}`, msg: `DQR ${fmtN(stated.dqr)} but the average of ${parts.map(k => k.toUpperCase()).join('/')} (${parts.map(k => stated[k]).join(', ')}) is ${fmtN(mean)}.`, fix: 'Recalculate DQR as the average of the ratings, or correct the rating that changed.' })
          }
          if (ef > 0) {
            const miss = []
            if (blank(src)) miss.push('data source')
            if (/ecoinvent|sphera|gabi|ef\s*3|elcd|clcd/i.test(src)) { if (blank(db)) miss.push('dataset name'); if (b.uuid != null && (blank(uuid) || !UUID.test(uuid))) miss.push(blank(uuid) ? 'UUID' : `valid UUID ("${uuid}")`) }
            if (miss.length) add('CF-04', { sev: miss.includes('data source') ? 'error' : 'warning', sheet: sh.name, cell: addr(sh, rr, b.ef), ref: `${rowLabel} · ${b.label}`, msg: `EF ${fmtN(ef)} has no ${miss.join(', ')}.`, fix: 'Name the database, the exact dataset and its UUID so a reviewer can trace the factor.' })
          }
          // suggested ratings
          const isProc = /process|ef$/i.test(b.label) && T.blocks.length > 1 && b === T.blocks[T.blocks.length - 1]
          const sT = sugTeR(item, ctx, src, db, details, isEnergyTable || !!matchEnergy(item) && !matchMaterial(item))
          const sG = sugGeR(origin, geo)
          const sTi = sugTiR(src, db, details, refYear)
          const sP = sugP(src, db, details)
          const sug = { ter: sT, ger: sG, tir: sTi, p: sP }
          const useK = ['ter', 'ger', 'tir'].concat(b.p != null ? ['p'] : [])
          const sv = useK.map(k => sug[k]?.v).filter(v => v != null)
          ratings.push({ file: fileName, sheet: sh.name, cell: addr(sh, rr, b.ef), item: rowLabel, block: b.label, ef, src, db, geo, origin,
            stated: { ter: stated.ter, ger: stated.ger, tir: stated.tir, p: b.p != null ? stated.p : undefined, dqr: stated.dqr },
            sug: { ter: sT?.v, ger: sG?.v, tir: sTi?.v, p: sP?.v, dqr: sv.length === useK.length ? sv.reduce((a, c) => a + c, 0) / sv.length : null },
            why: Object.fromEntries(Object.entries(sug).filter(([, x]) => x).map(([k, x]) => [k, x.why])) })
          if (sT?.mismatch) add('CF-05', { sheet: sh.name, cell: addr(sh, rr, b.db), ref: `${rowLabel} · ${b.label}`, msg: `${item} is modelled with "${db}". ${sT.why}.`, fix: `Choose a dataset for ${matchMaterial(item)?.en || item} (for processing: a dataset for that material, e.g. aluminium sheet rolling / casting instead of steel metal working).` })
          if (sT?.proxy && stated.ter != null && stated.ter < 3) add('CF-06', { sev: sT.weak ? 'info' : 'warning', sheet: sh.name, cell: addr(sh, rr, b.ter), ref: `${rowLabel} · ${b.label}`, msg: `TeR ${stated.ter}, but ${sT.why}.`, fix: 'Rate a proxy dataset TeR 3–4 and say in the details column why it represents the material, or find a dataset for the actual material.' })
          const better = useK.filter(k => sug[k] && stated[k] != null && stated[k] >= 1 && stated[k] < sug[k].v && !(k === 'ter' && (sT?.mismatch || sT?.proxy)))
          if (better.length) {
            const gap = Math.max(...better.map(k => sug[k].v - stated[k]))
            add('CF-07', { sev: gap >= 2 ? 'warning' : 'info', sheet: sh.name, cell: addr(sh, rr, b[better[0]]), ref: `${rowLabel} · ${b.label}`,
              msg: better.map(k => `${k.toUpperCase()} stated ${stated[k]}, suggested ${sug[k].v} (${sug[k].why})`).join('; ') + '.',
              fix: 'Use the suggested rating or explain in the details column why the dataset is more representative than its metadata shows.' })
          }
          if (ESTIMATE.test(`${src} ${details}`) && parts.length && parts.every(k => stated[k] === 1))
            add('CF-11', { sheet: sh.name, cell: addr(sh, rr, b.ef), ref: `${rowLabel} · ${b.label}`, msg: `"${src || details}" is rated 1 on every criterion.`, fix: 'An estimate is not a best-quality dataset: rate it about TeR 3, P 4, and document the basis of the estimate.' })
          // reference range
          const procBlock = T.blocks.length > 1 && b.label === 'EF' && T.blocks.some(x => /^e(virgin|recycled)/i.test(x.label))
          const eolBlock = !/^(e(virgin|recycled)|ef)$/i.test(b.label)
          const rc = procBlock || eolBlock ? null : refCheck(item, ctx, db, ef, hdr[b.ef], unitHint, isTransport && b.dist != null, isEnergyTable)
          if (rc && ef > 0) {
            const ok = ef >= rc.lo && ef <= rc.hi
            let verdict = ok ? 'within range' : ef < rc.lo ? 'below range' : 'above range'
            const ratio = ef / (rc.ref.typ || (rc.lo + rc.hi) / 2)
            const slip = !ok && (ratio > 300 || ratio < 1 / 300)
            factors.push({ file: fileName, sheet: sh.name, cell: addr(sh, rr, b.ef), item: rowLabel, block: b.label, ef, unit: rc.unit, ref: rc.ref.en, lo: rc.lo, hi: rc.hi, verdict, src: rc.src })
            if (!ok) add('CF-08', { sheet: sh.name, cell: addr(sh, rr, b.ef), ref: `${rowLabel} · ${b.label}`,
              msg: `${fmtN(ef)} kg CO2e/${rc.unit} for ${rc.ref.en}; public reference range ${rc.lo}–${rc.hi}.${slip ? ' The gap is about ×1000: check the unit (g vs kg, t vs kg).' : ''}${rc.ref.id === 'natural_gas' && ef < rc.lo && /natural gas/i.test(db) && !/heat|combust|burn|furnace|boiler/i.test(db) ? ` The dataset "${db}" is the fuel supply only: burning it adds about 2.0 kg CO2/m³, which is missing unless it is reported as a direct emission.` : ''}`,
              fix: `Check the dataset and the unit. Reference: ${rc.src}.` })
          } else if (ef > 0) factors.push({ file: fileName, sheet: sh.name, cell: addr(sh, rr, b.ef), item: rowLabel, block: b.label, ef, unit: '', ref: '', lo: null, hi: null, verdict: 'no reference', src: '' })
          // electricity identity (China)
          if (matchEnergy(item)?.id === 'electricity' && ef > 0) {
            const g = geoCode(geo || origin)
            if (g?.code === 'CN' || /ministry of ecology|生态环境部|mee/i.test(src)) {
              const hit = GRID.CN.refs.find(x => Math.abs(x.v - ef) < 0.0006)
              if (hit) add('CF-09', { sev: hit.ok ? 'info' : 'warning', sheet: sh.name, cell: addr(sh, rr, b.ef), ref: rowLabel, msg: `${fmtN(ef)} = ${hit.label}.`, fix: hit.ok ? 'Correct factor for a product footprint. Note that EU battery rules may require a different electricity modelling (e.g. residual mix or supplier-specific contracts).' : 'For product carbon footprints use MEE\'s electricity carbon footprint factor (2024: 0.5777 kg CO2e/kWh), not the CO2 emission factor for organisational inventories.' })
            }
          }
        }
        // arithmetic: emissions = qty × EF
        if (qty != null && T.emis.length) {
          for (const ec of T.emis) {
            const got = num(rw[ec]); if (got == null) continue
            const eh = headerText(sh, T.r, ec)
            let exp = null, how = ''
            if (isTransport) {
              const legs = T.blocks.filter(b => b.dist != null).map(b => ({ d: num(rw[b.dist]), e: num(rw[b.ef]) })).filter(l => l.d != null && l.e != null)
              if (legs.length) { exp = qty / 1000 * legs.reduce((s, l) => s + l.d * l.e, 0); how = `mass ${fmtN(qty)} kg ÷ 1000 × Σ(distance × EF)` }
            } else if (/material/i.test(eh)) {
              const r1 = num(rw[T.r1]); const e0 = num(rw[T.blocks[0].ef])
              if ((r1 == null || r1 === 0) && e0 != null) { exp = qty * e0; how = `${fmtN(qty)} × ${fmtN(e0)}` }
            } else if (/process/i.test(eh)) {
              const bl = [...T.blocks].reverse().find(b => b.ef < ec); const e = bl && num(rw[bl.ef])
              if (e != null) { exp = qty * e; how = `${fmtN(qty)} × ${fmtN(e)}` }
            } else if (T.blocks.length === 1) {
              const e = num(rw[T.blocks[0].ef]); if (e != null) { exp = qty * e; how = `${fmtN(qty)} × ${fmtN(e)}` }
            }
            if (exp != null && (exp > 1e-9 || got > 1e-9) && rel(exp, got) > 0.02)
              add('CF-10', { sheet: sh.name, cell: addr(sh, rr, ec), ref: rowLabel, msg: `Shows ${fmtN(got)}; ${how} = ${fmtN(exp)} (${(rel(exp, got) * 100).toFixed(1)}% off).`, fix: 'Check the formula and the quantity / factor it uses.' })
          }
        }
      }
    }
  }
  for (const sh of vis) for (const T of findTables(sh)) for (const b of T.blocks) if (b.geoMislabel) add('CF-15', { sheet: sh.name, cell: addr(sh, T.r, b.geo), msg: `Column ${colName(sh.c0 + b.geo)} is headed "${txt(sh.rows[T.r][b.geo])}" but holds geography codes.`, fix: 'Correct the header to "database - geography" so reviewers read the column correctly (template error).' })
  if (versions.size > 1) add('CF-12', { msg: `Datasets come from ${[...versions].sort().join(', ')}.`, fix: 'Use one database version for the whole study where possible, or justify the mix.' })

  // ---------- EU battery CFR template: general information and totals ----------
  const gi = vis.find(s => /general information/i.test(s.name))
  if (gi) {
    meta.type = 'EU battery carbon footprint report (CFR)'
    const v = re => { const h = label(re, gi); return h ? h.v : null }
    meta.product = txt(v(/rfq id|project name/i))
    meta.fields.push(['Supplier', txt(v(/supplier name/i))], ['Cell', `${txt(v(/cell nominal capacity/i))} Ah, ${txt(v(/cell nominal energy/i))} kWh`])
    const d = label(/date of cfp template completion/i, gi)
    const missing = []
    if (d && !(isNum(d.v) || /\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/.test(txt(d.v)))) missing.push(`completion date is "${txt(d.v)}"`)
    const rev = txt(v(/external review performed/i))
    if (/^n/i.test(rev)) missing.push('no external critical review')
    if (missing.length) add('CF-15', { sheet: gi.name, cell: cellLoc(d), msg: missing.join('; ') + '.', fix: 'Enter the completion date as dd/mm/yyyy. Plan the third-party verification the customer or the EU Battery Regulation requires.' })
    const ncell = num(v(/number of cell per module/i)), ce = num(v(/cell nominal energy/i)), me = num(v(/module nominal energy/i))
    const nmod = num(v(/number of module per pack/i)), pe = num(v(/pack nor?minal energy/i))
    if (ncell && ce && me && rel(ncell * ce, me) > 0.01) add('CF-16', { sheet: gi.name, cell: cellLoc(label(/module nominal energy/i, gi)), msg: `Module energy ${fmtN(me)} kWh ≠ ${ncell} cells × ${fmtN(ce)} kWh = ${fmtN(ncell * ce)}.`, fix: 'Correct the cell count or the energies.' })
    if (nmod && me && pe && rel(nmod * me, pe) > 0.01) add('CF-16', { sheet: gi.name, msg: `Pack energy ${fmtN(pe)} kWh ≠ ${nmod} × ${fmtN(me)} kWh.`, fix: 'Correct the module count or the energies.' })
    // summary rows: Cell / Module / Pack with mass and emissions
    const rowOf = re => { for (let r = 0; r < gi.rows.length; r++) if (re.test(txt(gi.rows[r][1] ?? gi.rows[r][0]))) return gi.rows[r]; return null }
    const nums = row => row ? row.map(num).filter(x => x != null) : []
    const cellRow = nums(rowOf(/^cell$/i)), modRow = nums(rowOf(/^module$/i))
    if (cellRow.length >= 2 && modRow.length >= 2 && ncell) {
      const [cm, cco2] = cellRow, [mm, mco2, mkwh] = modRow
      meta.fields.push(['Module', `${fmtN(mco2)} kg CO2e, ${mkwh ? fmtN(mkwh) + ' kg CO2e/kWh' : ''}`])
      if (mm < ncell * cm * 0.999) add('CF-16', { sheet: gi.name, msg: `Module mass ${fmtN(mm)} kg is less than ${ncell} × cell mass ${fmtN(cm)} kg = ${fmtN(ncell * cm)}.`, fix: 'Check module mass or cell count.' })
      if (mco2 < ncell * cco2 * 0.999) add('CF-16', { sheet: gi.name, msg: `Module footprint ${fmtN(mco2)} kg CO2e is less than ${ncell} cells × ${fmtN(cco2)} = ${fmtN(ncell * cco2)}.`, fix: 'The module total must include its cells; check the link to the cell sheet.' })
      if (mkwh && me && rel(mco2 / me, mkwh) > 0.01) add('CF-16', { sheet: gi.name, msg: `Module ${fmtN(mkwh)} kg CO2e/kWh ≠ ${fmtN(mco2)} ÷ ${fmtN(me)} kWh = ${fmtN(mco2 / me)}.`, fix: 'Recalculate the per-kWh figure.' })
    }
  }

  // ---------- LCI data collection sheet ----------
  const base = vis.find(s => /基本数据|basic data|general data/i.test(s.name))
  const mat = vis.find(s => /原料|material/i.test(s.name) && s !== base)
  if (base && mat) lciChecks(vis, base, fileName, add, meta, label, cellLoc)
  // scdd.pro form for a standard: "auto" uses the standard the form was made for
  const tpl = templateInfo(vis)
  if (tpl) { meta.type = 'scdd.pro carbon footprint form'; if (tpl.product) meta.product = tpl.product }
  const std = opts.standard == null || opts.standard === 'auto' ? (tpl && STANDARDS.some(x => x.id === tpl.standard) ? tpl.standard : defaultStandard(!!gi)) : opts.standard
  if (std && ratings.length) {
    applyStandard(std, { ratings, vis, add, label, txt })
    const S = STANDARDS.find(x => x.id === std)
    if (S) meta.fields.push(['Standard', S.en])
  }
  meta.fields.push(['Datasets rated', String(ratings.length)], ['Factors checked', String(factors.filter(f => f.lo != null).length)])
  return { file: fileName, meta, findings: out, ratings, factors, standard: std }
}

// The downloadable forms (site/make_carbon_templates.py) have a "Study information" sheet whose A1
// starts with TEMPLATE_MARK and a row "Standard id" holding the STANDARDS id.
export const TEMPLATE_MARK = 'scdd.pro carbon footprint form'
export function isTemplateInfo(sh) { return sh && new RegExp('^' + TEMPLATE_MARK, 'i').test(txt((sh.rows[0] || [])[0])) }
function templateInfo(vis) {
  const sh = vis.find(isTemplateInfo)
  if (!sh) return null
  const val = re => { const row = sh.rows.find(r => re.test(txt(r[0]))); return row ? txt(row[1]) : '' }
  return { standard: val(/^standard id/i), product: val(/^product name/i) }
}

function lciChecks(vis, base, fileName, add, meta, label, cellLoc) {
  meta.type = 'Life-cycle inventory data sheet'
  const v = re => label(re, base)
  const name = v(/^产品名称|product name/i), cap = v(/标称容量|nominal capacity/i), volt = v(/标称电压|nominal voltage/i), en = v(/标称能量|nominal energy/i)
  meta.product = txt(name?.v)
  const nameAh = /(\d{2,4})\s*ah/i.exec(txt(name?.v))
  if (nameAh && num(cap?.v) && Math.abs(+nameAh[1] - num(cap.v)) > 0.5) add('CF-20', { sheet: base.name, cell: cellLoc(name), msg: `Product name says ${nameAh[1]}Ah, nominal capacity is ${num(cap.v)} Ah.`, fix: 'Correct the product name or the specification so the form describes one product.' })
  if (num(cap?.v) && num(volt?.v) && num(en?.v) && rel(num(cap.v) * num(volt.v) / 1000, num(en.v)) > 0.02) add('CF-20', { sheet: base.name, cell: cellLoc(en), msg: `Energy ${num(en.v)} kWh ≠ ${num(volt.v)} V × ${num(cap.v)} Ah = ${(num(cap.v) * num(volt.v) / 1000).toFixed(3)} kWh.`, fix: 'Correct energy, voltage or capacity.' })
  const per = v(/数据收集周期|collection period/i)
  const pm = /(20\d\d)[.\-/年](\d{1,2})\D+(20\d\d)[.\-/年](\d{1,2})/.exec(txt(per?.v))
  let months = null
  if (pm) {
    months = (+pm[3] - +pm[1]) * 12 + (+pm[4] - +pm[2]) + 1
    meta.fields.push(['Period', `${txt(per.v)} (${months} months)`])
    if (months < 6) add('CF-21', { sheet: base.name, cell: cellLoc(per), msg: `Data period ${txt(per.v)} covers ${months} months; the form asks for normally 1 year and at least half a year.`, fix: 'Extend the period to at least 6 months of stable production, or explain why a shorter period is representative.' })
  }
  const line = v(/统计的线体|production line/i)
  const fl = /(?<![A-Za-z])([CMP]\d{2})(?:线|line)?/i.exec(fileName)
  if (fl && line && txt(line.v) && fl[1].toUpperCase() !== txt(line.v).toUpperCase()) add('CF-22', { sheet: base.name, cell: cellLoc(line), msg: `File name says line ${fl[1]}, the form says ${txt(line.v)}.`, fix: 'Make sure the data belong to the line named in the file, and correct one of them.' })
  // production quantity
  let prod = null
  for (let r = 0; r < base.rows.length; r++) if (/目标产品|target product/i.test(txt(base.rows[r][1] ?? ''))) { prod = num(base.rows[r][2]); break }
  if (prod) meta.fields.push(['Production', `${prod}`])
  // mass balance
  const inp = label(/输入汇总值|input total/i, base), outp = label(/输出汇总值|output total/i, base)
  if (inp && outp) {
    const iv = num(base.rows[inp.r].find((x, i) => i > inp.c && num(x) > 1000)) ?? null
    let ov = 0
    for (let r = outp.r; r < Math.min(outp.r + 7, base.rows.length); r++) { const n = base.rows[r].map(num).filter(x => x != null && x > 100); if (n.length) ov += n[0] }
    if (iv && ov) {
      const gap = (iv - ov) / iv
      const note = base.rows.slice(inp.r, inp.r + 3).flat().map(txt).find(s => /说明|explain|剔除|exclud/i.test(s))
      if (Math.abs(gap) >= 0.05) add('CF-24', { sev: note ? 'info' : 'warning', sheet: base.name, cell: cellLoc(inp), msg: `Inputs ${fmtN(iv)} kg vs outputs ${fmtN(ov)} kg: gap ${(gap * 100).toFixed(1)}%.${note ? ` Note in the form: "${note}"` : ''}`, fix: 'Explain gaps of 5% or more (solvent recovery, water, emissions) or complete the outputs.' })
    }
  }
  // per-unit checks, units, other periods, t·km on inventory sheets
  for (const sh of vis.filter(s => s !== base)) {
    for (let r = 0; r < sh.rows.length; r++) {
      const hdr = sh.rows[r].map(txt)
      const tot = hdr.findIndex(s => /总投入量|总用量|总产出量|total (input|consumption|output)/i.test(s))
      const perU = hdr.findIndex((s, i) => i > tot && /功能单位|per (unit|kg|pcs)/i.test(s))
      if (tot < 0 || perU < 0) continue
      const unitCol = hdr.findIndex((s, i) => i > perU && /单位|unit/i.test(s))
      const tkm = sh.rows[Math.max(0, r + 1)]?.findIndex(x => /吨\*?公里|t\*?km/i.test(txt(x)))
      const tkmCol = tkm >= 0 ? tkm : (sh.rows[r].findIndex(x => /吨\*?公里|t\*?km/i.test(txt(x))))
      const distCol = hdr.findIndex(s => /运输距离|distance/i.test(s))
      const bad = [], units = [], tk = []
      for (let rr = r + 1; rr < Math.min(sh.rows.length, r + 80); rr++) {
        const rw = sh.rows[rr]
        if (rw.map(txt).some(s => /^(物料类别|类别|废弃物名称|废气名称|过程)$/.test(s)) && rr > r + 1) break
        const t = num(rw[tot]), p = num(rw[perU])
        const nm = txt(rw[1]) || txt(rw[2]) || txt(rw[3])
        if (prod && t != null && p != null && t > 0 && rel(t / prod, p) > 0.02) bad.push(`${addr(sh, rr, perU)} ${nm}: ${fmtN(p)} vs ${fmtN(t)} ÷ ${prod} = ${fmtN(t / prod)}`)
        const u = txt(rw[unitCol])
        if (/^pcs\s*\/\s*pcs$/i.test(u) && t != null && t > 0) units.push(`${addr(sh, rr, unitCol)} ${nm} (${u})`)
        if (distCol >= 0 && tkmCol >= 0 && p != null) {
          const d = num(rw[distCol]), w = num(rw[tkmCol])
          if (d && w != null && rel(p * d / 1000, w) > 0.02 && w > 0) tk.push(`${addr(sh, rr, tkmCol)} ${nm}: ${fmtN(w)} vs ${fmtN(p)} kg × ${d} km ÷ 1000 = ${fmtN(p * d / 1000)}`)
        }
        for (const s of rw.map(txt)) {
          const m = /(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*月/.exec(s)
          if (m && months != null && pm && (+m[1] !== +pm[2] || +m[2] !== +pm[4])) units.push(`__period__${addr(sh, rr, rw.map(txt).indexOf(s))}: "${s}"`)
        }
      }
      if (bad.length) add('CF-23', { sheet: sh.name, msg: `${bad.length} row(s): ${bad.slice(0, 4).join('; ')}${bad.length > 4 ? '…' : ''}`, fix: `Per-unit values should equal the period total ÷ ${prod} units; check the formulas or the production quantity.` })
      const u2 = units.filter(x => !x.startsWith('__period__')), per2 = units.filter(x => x.startsWith('__period__')).map(x => x.slice(10))
      if (u2.length) add('CF-25', { sheet: sh.name, msg: `Unit "pcs/pcs" for a material measured in kg: ${u2.join('; ')}.`, fix: 'Use kg/pcs (or the unit of the total column).' })
      if (per2.length) add('CF-26', { sheet: sh.name, msg: `Notes refer to months outside the data period ${txt(per.v)}: ${[...new Set(per2)].slice(0, 4).join('; ')}.`, fix: 'Use data from the stated period, or state the period used for each value and why it is representative.' })
      if (tk.length) add('CF-27', { sheet: sh.name, msg: `${tk.length} row(s): ${tk.slice(0, 4).join('; ')}`, fix: 't·km per unit = mass per unit (kg) × distance (km) ÷ 1000.' })
    }
  }
  const blanks = []
  for (const re of [/^审核人/, /^外形尺寸/, /^产品良率/, /^生产优率/]) { const h = v(re); if (h && blank(h.v)) blanks.push(txt(base.rows[h.r][h.c])) }
  // label() returns the next non-blank cell; detect real blanks by checking the cell next to the label
  const realBlanks = []
  for (let r = 0; r < base.rows.length; r++) { const l = txt(base.rows[r][1]); if (/^(审核人名字|外形尺寸|产品良率|生产优率)$/.test(l) && blank(base.rows[r][2])) realBlanks.push(l) }
  if (realBlanks.length) add('CF-28', { sheet: base.name, msg: `Blank: ${realBlanks.join(', ')}.`, fix: 'Fill in reviewer, dimensions and yields, or mark them "not applicable".' })
}

// ---------- across files ----------
export function crossCheck(results) {
  const out = []
  const by = new Map()
  for (const r of results) for (const x of r.ratings) {
    if (!(x.ef > 0) || x.block !== (r.ratings.find(y => y.item === x.item)?.block)) continue
    const m = matchMaterial(x.item) || matchEnergy(x.item)
    if (!m) continue
    const k = m.id + '|' + x.block
    if (!by.has(k)) by.set(k, { m, list: [] })
    by.get(k).list.push({ file: r.file, ef: x.ef, db: x.db, item: x.item })
  }
  for (const [, g] of by) {
    const files = new Set(g.list.map(x => x.file))
    if (files.size < 2) continue
    const vals = new Map()
    for (const x of g.list) { const k = `${fmtN(x.ef)} (${x.db || 'no dataset'})`; if (!vals.has(k)) vals.set(k, new Set()); vals.get(k).add(x.file) }
    if (vals.size < 2) continue
    out.push({ id: 'CF-17', sev: 'info', file: [...files].join(' / '), sheet: '', cell: '', ref: g.m.en, msg: [...vals.entries()].map(([k, f]) => `${k} in ${[...f].length} file(s)`).join(' vs '), fix: 'Use the same factor for the same material and supplier unless the supply really differs; document why.' })
  }
  return out
}
