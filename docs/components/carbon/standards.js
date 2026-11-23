// Standard-specific checks for the carbon footprint form checker.
// Each rule below is taken from the standard's official text (checked 17 Nov 2026); where the text is
// paywalled or still a draft, the standard's `status` says so and the page repeats it.
// Rules: CF-30 … CF-38 (defined in cfqc.js RULES).

export const STANDARDS = [
  { id: 'battery', en: 'EU Battery Regulation – carbon footprint (draft method)', zh: '欧盟电池法规 – 碳足迹（方法草案）',
    status: { en: 'Regulation (EU) 2023/1542 Art. 7 and Annex II; the calculation method is the Commission draft delegated act of April 2024 (not yet adopted).', zh: '依据 (EU) 2023/1542 第 7 条及附件 II；计算方法为欧盟委员会 2024 年 4 月的授权法案草案（尚未通过）。' },
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=PI_COM:Ares(2024)3131389',
    dqr: { parts: ['ter', 'ger', 'tir'], div: 3 }, efCompliant: true, noInstruments: true, gwp: /EF\s*3\.1/i, gwpName: 'EF 3.1', cutoff: 1, offsets: true,
    docs: [['functional unit', /functional unit|declared unit|功能单位|co2[^\n]{0,10}\/\s*kwh/i], ['service life', /service life|cycle life|循环寿命|使用寿命|full equivalent cycles/i]] },
  { id: 'pef', en: 'PEF – Recommendation (EU) 2021/2279', zh: 'PEF – 欧盟建议 (EU) 2021/2279',
    status: { en: 'Commission Recommendation (EU) 2021/2279, Annex I (PEF method).', zh: '欧盟委员会建议 (EU) 2021/2279 附件 I（PEF 方法）。' },
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32021H2279',
    dqr: { parts: ['ter', 'ger', 'tir', 'p'], div: 4 }, efCompliant: true, secondaryMax: 3.0, primaryMax: { dqr: 1.5, each: 2, p: 3 }, cutoff: 3, residual: true,
    docs: [['cut-off', /cut-?off|截断/i], ['allocation', /allocation|分配/i]] },
  { id: 'iso14067', en: 'ISO 14067:2018', zh: 'ISO 14067:2018',
    status: { en: 'ISO 14067 is a paid standard; these checks follow its widely published requirements and only test that the items are documented. Confirm against your copy.', zh: 'ISO 14067 为付费标准；以下检查依据其公开的要求，只检查相关内容是否有记录。请对照您手中的标准原文确认。' },
    url: 'https://www.iso.org/standard/71206.html',
    dqr: null, gwp: /AR6|sixth assessment|IPCC\s*2021/i, gwpName: 'latest IPCC (AR6)',
    docs: [['cut-off criteria', /cut-?off|截断/i], ['allocation', /allocation|分配/i], ['GWP / characterisation', /GWP|IPCC|characteri[sz]ation|EF\s*3/i], ['biogenic carbon', /biogenic|生物源/i], ['land-use change', /land[- ]use change|dLUC|土地利用/i], ['time period', /reporting period|time period|data collection period|数据收集周期|时间段|reference year/i], ['data quality', /data quality|DQR|数据质量/i]] },
  { id: 'ghg', en: 'GHG Protocol Product Standard (2011)', zh: 'GHG Protocol 产品标准（2011）',
    status: { en: 'GHG Protocol Product Life Cycle Accounting and Reporting Standard (2011). Its data quality scale is guidance, so ratings are not tested against thresholds.', zh: 'GHG Protocol 产品生命周期核算与报告标准（2011）。其数据质量评分为指南性内容，因此不按阈值检查评分。' },
    url: 'https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard_041613.pdf',
    dqr: null, offsets: true,
    docs: [['GWP source', /GWP|IPCC/i], ['biogenic / land-use change', /biogenic|land[- ]use|生物源|土地利用/i], ['allocation', /allocation|分配/i], ['time period', /reporting period|time period|data collection period|数据收集周期|reference year/i], ['assurance', /assurance|verification|review|核查|鉴证|审查/i], ['uncertainty', /uncertaint|不确定/i]] },
  { id: 'pact', en: 'WBCSD PACT Methodology v3.0', zh: 'WBCSD PACT 方法 v3.0',
    status: { en: 'PACT Methodology v3.0 (April 2025). Data quality ratings (TeR, GeR, TiR, 1–5) are mandatory from 2028.', zh: 'PACT 方法 v3.0（2025 年 4 月）。数据质量评分（TeR、GeR、TiR，1–5）自 2028 年起强制。' },
    url: 'https://www.carbon-transparency.org/resources/pact-methodology-v3-methodology-for-calculating-and-exchanging-cradle-to-gate-product-carbon-footprints-pcfs',
    dqr: { parts: ['ter', 'ger', 'tir'], div: 3 }, secondaryTerMin: 3, cutoff: 3, residual: true, gwp: /AR6|sixth assessment|IPCC\s*2021/i, gwpName: 'IPCC AR6',
    docs: [['primary data share (PDS)', /primary data share|PDS|一手数据占比|初级数据/i], ['biogenic carbon', /biogenic|生物源/i]] },
  { id: 'catenax', en: 'Catena-X PCF Rulebook v4', zh: 'Catena-X PCF 规则手册 v4',
    status: { en: 'Catena-X Product Carbon Footprint Rulebook v4 (September 2025); data quality ratings use the PACT v3 matrix.', zh: 'Catena-X 产品碳足迹规则手册 v4（2025 年 9 月）；数据质量评分采用 PACT v3 矩阵。' },
    url: 'https://catena-x.net/wp-content/uploads/2025/10/Catena-X-Product-Carbon-Footprint-Rulebook_v4-with-line-numbers.pdf',
    dqr: { parts: ['ter', 'ger', 'tir'], div: 3 }, secondaryTerMin: 3, cutoff: 3, residual: true, gwp: /AR6|sixth assessment|IPCC\s*2021/i, gwpName: 'IPCC AR6',
    docs: [['primary data share (PDS)', /primary data share|PDS|一手数据占比|初级数据/i]] },
  { id: 'tfs', en: 'TfS PCF Guideline v3.0 (chemicals)', zh: 'TfS PCF 指南 v3.0（化工）',
    status: { en: 'Together for Sustainability PCF Guideline v3.0 (December 2024); data quality ratings use the PACT v3 matrix.', zh: 'Together for Sustainability PCF 指南 v3.0（2024 年 12 月）；数据质量评分采用 PACT v3 矩阵。' },
    url: 'https://tfs-initiative.com/app/uploads/2024/12/TfS-PCF-Guidelines-2024.pdf',
    dqr: { parts: ['ter', 'ger', 'tir'], div: 3 }, secondaryTerMin: 3, cutoff: 3, residual: true, gwp: /AR6|sixth assessment|IPCC\s*2021/i, gwpName: 'IPCC AR6',
    docs: [['primary data share (PDS)', /primary data share|PDS|一手数据占比|初级数据/i]] },
]

const SECONDARY = /ecoinvent|gabi|sphera|\bef\s*\d|environmental footprint|ilcd|elcd|cpcd|ckb|cldb|idemat|agri-?footprint|ecoinvent|database|literature|数据库|文献/i
const PRIMARY = /supplier|primary|measured|company[- ]specific|site[- ]specific|epd|vendor|供应商|实测|一手/i
const EF_DB = /\bef\s*3(\.\d)?\b|environmental footprint|ef[- ]compliant|lcdn/i
const INSTRUMENT = /\bgos?\b(?= |$|,|\))|guarantees? of origin|\brecs?\b|\bi-?recs?\b|\bppas?\b|power purchase agreement|green (electricity|power|certificate)|renewable (certificate|electricity|energy) (certificate|contract)|market[- ]based|绿证|绿电|绿色电力/i
const NATIONAL = /national (grid|mix|average)|grid mix|country mix|国家电网|全国|电网平均/i
const ELEC = /electricit|电力|用电|\bpower\b/i

const rowsShort = (list, n = 6) => list.slice(0, n).join('; ') + (list.length > n ? ` … (+${list.length - n})` : '')
const isNum = v => typeof v === 'number' && isFinite(v)

// ctx: { ratings, vis, add, label, txt, isCfr }
export function applyStandard(id, ctx) {
  const S = STANDARDS.find(s => s.id === id)
  if (!S) return
  const { ratings, vis, add, txt } = ctx
  const name = S.en
  const secondary = r => SECONDARY.test(`${r.src} ${r.db}`) && !PRIMARY.test(`${r.src}`)
  const primary = r => PRIMARY.test(`${r.src} ${r.db}`)
  const loc = r => `${r.sheet}!${r.cell} ${r.item}`
  const r2 = v => Math.round(v * 100) / 100

  // CF-30 / CF-31: rating criteria and DQR formula
  if (S.dqr) {
    const usesP = ratings.some(r => isNum(r.stated.p))
    if (usesP && !S.dqr.parts.includes('p')) add('CF-31', { sev: 'info', msg: `${name}: DQR uses TeR, GeR and TiR only (divided by 3); the form also rates P.`, fix: 'Keep P for your own records if you like, but report the DQR as (TeR + GeR + TiR) / 3 for this standard.' })
    if (!usesP && S.dqr.parts.includes('p') && ratings.length) add('CF-31', { msg: `${name}: DQR = (TeR + GeR + TiR + P) / 4, but the form has no P (precision) rating.`, fix: 'Add a P rating for every dataset and recalculate the DQR over four criteria.' })
    const diff = []
    for (const r of ratings) {
      const v = S.dqr.parts.map(k => r.stated[k])
      if (!v.every(isNum) || !isNum(r.stated.dqr)) continue
      const d = v.reduce((a, b) => a + b, 0) / S.dqr.div
      if (Math.abs(d - r.stated.dqr) > 0.05) diff.push(`${loc(r)}: ${r2(r.stated.dqr)} vs ${r2(d)}`)
    }
    if (diff.length) add('CF-31', { sev: 'warning', msg: `${name}: ${diff.length} DQR value(s) differ from (${S.dqr.parts.map(k => k.toUpperCase()).join(' + ')}) / ${S.dqr.div}: ${rowsShort(diff)}.`, fix: 'Recalculate the DQR with the formula of the standard you report against.' })
  }
  if (S.secondaryTerMin) {
    const bad = ratings.filter(r => secondary(r) && isNum(r.stated.ter) && r.stated.ter < S.secondaryTerMin).map(r => `${loc(r)} (TeR ${r.stated.ter})`)
    if (bad.length) add('CF-30', { msg: `${name}: TeR 1–2 is only allowed for primary data; the best rating for a database dataset is 3. ${bad.length} row(s): ${rowsShort(bad)}.`, fix: 'Rate secondary (database) datasets TeR 3 or worse, or replace them with supplier-specific data.' })
  }
  // CF-32: thresholds
  if (S.secondaryMax) {
    const bad = ratings.filter(r => secondary(r) && isNum(r.stated.dqr) && r.stated.dqr > S.secondaryMax).map(r => `${loc(r)} (DQR ${r2(r.stated.dqr)})`)
    if (bad.length) add('CF-32', { msg: `${name}: secondary datasets of most relevant processes need DQR ≤ ${S.secondaryMax}. ${bad.length} row(s) above it: ${rowsShort(bad)}.`, fix: 'Check whether these are most relevant processes; if so, use a better-fitting dataset or company-specific data.' })
  }
  if (S.primaryMax) {
    const bad = ratings.filter(r => primary(r) && ((isNum(r.stated.dqr) && r.stated.dqr > S.primaryMax.dqr) || ['ter', 'ger', 'tir'].some(k => isNum(r.stated[k]) && r.stated[k] > S.primaryMax.each) || (isNum(r.stated.p) && r.stated.p > S.primaryMax.p))).map(r => `${loc(r)} (DQR ${r2(r.stated.dqr)})`)
    if (bad.length) add('CF-32', { msg: `${name}: company-specific datasets need DQR ≤ 1.5 with TeR, GeR, TiR ≤ 2 and P ≤ 3. ${bad.length} row(s) do not: ${rowsShort(bad)}.`, fix: 'Improve the company-specific data, or treat the dataset as secondary.' })
  }
  if (id === 'battery') {
    const over = ratings.filter(r => secondary(r) && isNum(r.stated.ter) && r.stated.ter > 4).map(r => `${loc(r)} (TeR ${r.stated.ter})`)
    if (over.length) add('CF-32', { msg: `${name}: a secondary dataset for a most relevant process needs TeR ≤ 4. ${over.length} row(s): ${rowsShort(over)}.`, fix: 'Use a dataset that represents the technology better, or company-specific data.' })
  }
  // CF-33: EF-compliant datasets
  if (S.efCompliant) {
    const srcs = new Map()
    for (const r of ratings) if (secondary(r) && !EF_DB.test(`${r.src} ${r.db}`)) { const k = (r.src || r.db || '').replace(/\s+/g, ' ').slice(0, 40); srcs.set(k, (srcs.get(k) || 0) + 1) }
    if (srcs.size) add('CF-33', { msg: `${name}: EF-compliant datasets (EF 3.x) are required where they exist. ${[...srcs].map(([k, n]) => `"${k}" ×${n}`).join(', ')} not marked EF-compliant.`, fix: 'Use EF-compliant datasets (EF 3.1 / LCDN) where available, and say which datasets have no EF-compliant equivalent.' })
  }
  // CF-34: electricity modelling
  const elecRows = ratings.filter(r => ELEC.test(`${r.item} ${r.db}`))
  // on the scdd.pro forms, a study-information row counts only when its answer (column B) is filled in,
  // so the printed labels ("Cut-off rule …") do not pass the checks by themselves
  const isTpl = sh => /^scdd\.pro carbon footprint form/i.test(txt((sh.rows[0] || [])[0]))
  const sheetText = vis.filter(s => !/^(guide|content|glossary|auxi|instruction)/i.test(s.name))
    .map(s => (isTpl(s) ? s.rows.slice(1).filter(row => txt(row[1])) : s.rows).map(row => row.map(txt).join(' ')).join('\n')).join('\n')
  if (S.noInstruments) {
    const inst = elecRows.filter(r => INSTRUMENT.test(`${r.item} ${r.db} ${r.src}`)).map(loc)
    if (inst.length || INSTRUMENT.test(sheetText)) add('CF-34', { sev: inst.length ? 'error' : 'warning', msg: `${name}: electricity must be the national average consumption mix (or a direct line from the same installation); guarantees of origin, PPAs and other contractual instruments are not allowed.${inst.length ? ' Rows: ' + rowsShort(inst) : ' The form mentions green electricity or certificates.'}`, fix: 'Model grid electricity with the national consumption mix dataset; keep certificates out of the footprint.' })
  } else if (S.residual) {
    const nat = elecRows.filter(r => NATIONAL.test(`${r.item} ${r.db}`) || /market for electricity|grid/i.test(r.db)).map(loc)
    if (nat.length) add('CF-34', { sev: 'info', msg: `${name}: the electricity order is supplier-specific (with valid contractual instruments) → residual mix → grid mix. ${nat.length} row(s) use a grid mix: ${rowsShort(nat, 4)}.`, fix: 'Use the supplier-specific factor if you hold valid certificates for this site and year; otherwise use the residual mix where one is published, and the grid mix only where none is.' })
  }
  // CF-35: GWP set
  if (S.gwp) {
    const g = /(AR[456]|fifth assessment|sixth assessment|IPCC\s*20(07|13|21)|EF\s*3\.[01]|EF\s*2\.0|CML|ReCiPe|TRACI)/i.exec(sheetText)
    if (!g) add('CF-35', { sev: 'info', msg: `${name}: the form does not say which GWP set / characterisation method was used (expected ${S.gwpName}).`, fix: `State the method, e.g. "${S.gwpName}", in the general information.` })
    else if (/EF\s*3\.1/i.test(g[0]) && /AR6/.test(S.gwpName)) add('CF-35', { sev: 'info', msg: `${name}: the form uses "${g[0]}". EF 3.1 climate-change factors are reported to be based on IPCC AR6, which this standard expects; confirm with the method documentation.`, fix: 'State the GWP source explicitly (e.g. "IPCC AR6 GWP100, via EF 3.1").' })
    else if (!S.gwp.test(g[0]) && !S.gwp.test(sheetText)) add('CF-35', { msg: `${name}: the form uses "${g[0]}"; the standard expects ${S.gwpName}.`, fix: `Recalculate with ${S.gwpName}, or explain the difference.` })
  }
  // CF-36: cut-off
  if (S.cutoff) {
    // "cut-off … 1 %", or a bare number at the end of the line (the forms' "Cut-off rule" answer cell)
    const m = /cut-?off[^\n%]{0,80}?(\d+(?:\.\d+)?)\s*(?:%|$)|截断[^\n%]{0,40}?(\d+(?:\.\d+)?)\s*(?:%|$)/im.exec(sheetText)
    const v0 = m ? parseFloat(m[1] || m[2]) : null
    const v = v0 != null && v0 <= 100 ? v0 : null
    if (v != null && v > S.cutoff) add('CF-36', { msg: `${name}: cut-off ${v}% stated; the limit is ${S.cutoff}%${id === 'battery' ? ' of the mass of each component' : ''}.`, fix: `Bring the excluded share to ${S.cutoff}% or less${id === 'battery' ? ', and add the missing mass to the input with the highest footprint' : ''}.` })
  }
  // CF-37: offsets
  if (S.offsets) {
    const off = ratings.filter(r => /offset|carbon credit|抵消|碳信用/i.test(`${r.item} ${r.db}`)).map(loc)
    if (off.length) add('CF-37', { msg: `${name}: offsets and carbon credits may not be included in the footprint. Rows: ${rowsShort(off)}.`, fix: 'Remove offsets from the calculation; report them separately if at all.' })
  }
  // CF-38: documentation items
  const miss = (S.docs || []).filter(([, re]) => !re.test(sheetText)).map(([k]) => k)
  if (miss.length) add('CF-38', { msg: `${name}: not found in the form: ${miss.join(', ')}.`, fix: 'Add these items to the general information or the study report the form refers to.' })
}

export function defaultStandard(isCfr) { return isCfr ? 'battery' : '' }
