// Carbon footprint forms (.xlsx/.xlsm) -> data for the Report data extractor, via the carbon form checker.
import { toSheets, checkFile } from '../carbon/cfqc.js'
const F3 = a => a.map(([key, en, zh]) => ({ key, en, zh }))
export const EXTRACT = {
  report: F3([['type', 'Form type', '表格类型'], ['product', 'Product', '产品'], ['datasets', 'Datasets rated', '已评分数据集'], ['factors', 'Factors with a reference range', '有参考范围的因子'],
    ['outside', 'Factors outside the range', '超出范围的因子'], ['errors', 'Errors', '错误'], ['warnings', 'Warnings', '警告']]),
  rows: { en: 'Datasets and emission factors', zh: '数据集与排放因子', fields: F3([['sheet', 'Sheet', '工作表'], ['cell', 'Cell', '单元格'], ['item', 'Component / item', '组件/项目'], ['block', 'Block', '分块'],
    ['ef', 'Emission factor', '排放因子'], ['unit', 'Reference unit', '参考单位'], ['source', 'Data source', '数据来源'], ['dataset', 'Dataset', '数据集'], ['geo', 'Geography', '地理'],
    ['ter', 'TeR (form)', 'TeR（表格）'], ['ger', 'GeR (form)', 'GeR（表格）'], ['tir', 'TiR (form)', 'TiR（表格）'], ['p', 'P (form)', 'P（表格）'], ['dqr', 'DQR (form)', 'DQR（表格）'],
    ['sTer', 'TeR (suggested)', 'TeR（建议）'], ['sGer', 'GeR (suggested)', 'GeR（建议）'], ['sTir', 'TiR (suggested)', 'TiR（建议）'], ['sP', 'P (suggested)', 'P（建议）'], ['sDqr', 'DQR (suggested)', 'DQR（建议）'],
    ['refLo', 'Reference low', '参考下限'], ['refHi', 'Reference high', '参考上限'], ['verdict', 'Factor check', '因子核对']]) },
}
export function detect(wb) { return !wb.SheetNames.includes('Main Survey Actual') }
const r3 = x => x == null || x === '' ? '' : Math.round(x * 1000) / 1000
export function extract(X, wb, file) {
  const r = checkFile(toSheets(X, wb), file)
  if (!r.ratings.length && !r.factors.length && !/inventory|CFR/i.test(r.meta.type)) return null
  const c = { error: 0, warning: 0 }; for (const x of r.findings) if (c[x.sev] != null) c[x.sev]++
  const report = { file, type: r.meta.type, product: r.meta.product || '', datasets: r.ratings.length, factors: r.factors.filter(f => f.lo != null).length,
    outside: r.factors.filter(f => f.lo != null && f.verdict !== 'within range').length, errors: c.error, warnings: c.warning }
  const extraFields = []
  for (const [k, v] of r.meta.fields) if (!/^(Datasets rated|Factors checked)$/.test(k)) { report[k] = v; extraFields.push({ key: k, en: k, group: 'Form details' }) }
  const fac = new Map(r.factors.map(f => [f.sheet + '!' + f.cell, f]))
  const rows = r.ratings.map(x => {
    const f = fac.get(x.sheet + '!' + x.cell) || {}
    return {
      sheet: x.sheet, cell: x.cell, item: x.item, block: x.block, ef: x.ef, unit: f.unit || '', source: x.src || '', dataset: x.db || '', geo: x.geo || '',
      ter: x.stated.ter ?? '', ger: x.stated.ger ?? '', tir: x.stated.tir ?? '', p: x.stated.p ?? '', dqr: r3(x.stated.dqr),
      sTer: x.sug.ter ?? '', sGer: x.sug.ger ?? '', sTir: x.sug.tir ?? '', sP: x.sug.p ?? '', sDqr: r3(x.sug.dqr), refLo: f.lo ?? '', refHi: f.hi ?? '', verdict: f.verdict || '',
    }
  })
  return { report, rows, extraFields, extraDefault: true }
}
