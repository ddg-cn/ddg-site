// Chart data for the Responsible Exit guide. Every value has a public source; see the guide's notes.
// est: true marks an estimate, a computed value or a partial period.
const L = (en, zh) => ({ en, zh })

export default {
  // 2.1 Bangladesh, spring 2020 (USD bn)
  bdScale: {
    en: [
      { k: 'exp', label: 'Garment exports, calendar 2019', v: 33.07, tip: 'Export Promotion Bureau, via press reports' },
      { k: 'can', label: 'Orders cancelled or held, by end of April 2020', v: 3.18, tip: 'BGMEA tracker as reported end-April 2020: 1,150 factories, 2.28 million workers. About 9.6% of 2019 exports.' },
      { k: 'a19', label: 'Exports in April 2019', v: 2.54, tip: 'EPB/BGMEA via press' },
      { k: 'a20', label: 'Exports in April 2020', v: 0.375, tip: '85% below April 2019' },
    ],
    zh: [
      { k: 'exp', label: '2019年服装出口额', v: 33.07, tip: '孟加拉国出口促进局，据媒体报道' },
      { k: 'can', label: '截至2020年4月底被取消或暂停的订单', v: 3.18, tip: 'BGMEA统计（据2020年4月底报道）：1,150家工厂、228万工人，约占2019年出口额的9.6%' },
      { k: 'a19', label: '2019年4月出口额', v: 2.54, tip: '出口促进局/BGMEA，据媒体报道' },
      { k: 'a20', label: '2020年4月出口额', v: 0.375, tip: '比2019年4月下降85%' },
    ],
  },
  bdSurvey: {
    en: [
      { k: 'b', label: 'Furloughed workers sent home without pay', v: 72.4 },
      { k: 'a', label: 'Buyers refusing to pay for raw materials already bought', v: 72.1 },
      { k: 'c', label: 'Buyers refusing to pay production costs', v: 91.3 },
      { k: 'd', label: 'Buyers refusing to help with furlough wages', v: 98.1 },
    ],
    zh: [
      { k: 'b', label: '被停工且无薪回家的工人', v: 72.4 },
      { k: 'a', label: '拒付已采购原材料费用的买方', v: 72.1 },
      { k: 'c', label: '拒付生产成本的买方', v: 91.3 },
      { k: 'd', label: '拒绝分担停工工资的买方', v: 98.1 },
    ],
  },

  // 2.6 scale snapshots (USD bn) - different years and definitions, not additive
  scale: {
    en: [
      { k: 's1', label: 'S1 Buyers: orders cancelled and prices cut worldwide, Mar–Jun 2020', v: 16.2, tip: 'Penn State CGWR and WRC, Unpaid Billions (2020). Estimate from trade data.' },
      { k: 's3a', label: 'S3 Closures: unpaid income and severance, 7 Asian countries, Mar 2020–Mar 2021', v: 11.85, tip: 'Clean Clothes Campaign, Still Un(der)paid (2021). Estimate; includes lost income during furloughs.' },
      { k: 's5', label: 'S5 Import bans: goods stopped under the US UFLPA, FY2024', v: 1.77, tip: 'CBP dashboard via a secondary compilation, data as of Oct 2026. Value of goods stopped, not lost.' },
      { k: 's3c', label: 'S3 China: wages recovered by labour inspection, 2022', v: 1.32, tip: 'MOHRSS bulletin: RMB 9.54 bn for 845,000 workers, all sectors. Recovered, so a floor, not a loss.' },
      { k: 's3b', label: 'S3 Closures: severance stolen worldwide in the pandemic (upper estimate)', v: 0.85, tip: 'WRC, Fired, then Robbed (2021): USD 0.5–0.85 bn' },
    ],
    zh: [
      { k: 's1', label: 'S1 买方：全球取消订单和压价，2020年3–6月', v: 16.2, tip: '宾州州立大学CGWR与WRC《未付的数十亿》（2020），根据贸易数据估算' },
      { k: 's3a', label: 'S3 关厂：亚洲7国未付收入和经济补偿，2020年3月–2021年3月', v: 11.85, tip: '清洁衣服运动《仍未（足额）支付》（2021），估算，含停工期间的收入损失' },
      { k: 's5', label: 'S5 进口禁令：美国UFLPA扣留货物，2024财年', v: 1.77, tip: '美国海关数据（经二手汇编，截至2026年10月）。为被扣货值，不是损失' },
      { k: 's3c', label: 'S3 中国：劳动保障监察追发工资，2022年', v: 1.32, tip: '人社部统计公报：95.4亿元，84.5万人，全行业。为追回金额，是下限而非损失' },
      { k: 's3b', label: 'S3 关厂：疫情期间全球被拖欠的经济补偿（估算上限）', v: 0.85, tip: 'WRC《先被解雇，再被抢》（2021）：5–8.5亿美元' },
    ],
  },

  // China Labour Bulletin Strike Map: collective actions recorded per year (mostly wage arrears)
  clb: [
    { x: '2014', v: 1379 },
    { x: '2015', v: 2774 },
    { x: '2016', v: null, tip: L('No verified total', '无可核实的总数') },
    { x: '2017', v: 1250, est: true, tip: L('About 1,250; CLB changed its sampling this year', '约1,250起；当年CLB调整了抽样方法') },
    { x: '2018', v: 1701 },
    { x: '2019', v: 1385 },
    { x: '2020', v: 800, tip: L('More than 80% about wage arrears', '超过80%与欠薪有关') },
    { x: '2021', v: 1095 },
    { x: '2022', v: 822, est: true, tip: L('814–831 in different versions', '不同版本为814–831起') },
    { x: '2023', v: 1794, tip: L('Many electronics plants closing or relocating', '大量电子厂关闭或搬迁') },
    { x: '2024', v: 1509, tip: L('88% about wage arrears', '88%与欠薪有关') },
    { x: '2025', v: 573, est: true, tip: L('January to early May only; CLB closed in June 2025', '仅1月至5月初；CLB于2025年6月解散') },
  ],

  // SPP: persons prosecuted for refusing to pay wages (Criminal Law Art. 276-1)
  spp: [
    { x: '2021', v: 1382, est: true, tip: L('January–November only', '仅1–11月') },
    { x: '2022', v: 999, est: true, tip: L('January–November only', '仅1–11月') },
    { x: '2023', v: 1739, est: true, tip: L('Back-calculated from the 2024 growth rate', '根据2024年同比增幅倒推') },
    { x: '2024', v: 1866, tip: L('Full year; 612 arrests approved; RMB 244 million recovered', '全年；批准逮捕612人；追回2.44亿元') },
    { x: '2025', v: 960, est: true, tip: L('January–November, "more than 960"', '1–11月，"960余人"') },
  ],

  // OFAC SDN list: persons added per year
  sdn: [
    { x: '2018', v: 1500, est: true, tip: L('About 1,500, a record at the time', '约1,500个，当时的最高纪录') },
    { x: '2019', v: 785 },
    { x: '2020', v: 777 },
    { x: '2021', v: 765 },
    { x: '2022', v: 2275, tip: L('1,698 Russia-related', '其中1,698个与俄罗斯有关') },
    { x: '2023', v: 2502 },
    { x: '2024', v: 3135 },
    { x: '2025', v: 1322 },
  ],

  // UFLPA shipments stopped by US fiscal year
  uflpa: [
    { x: 'FY22', v: 2356, est: true, tip: L('From 21 June 2022 only', '自2022年6月21日起') },
    { x: 'FY23', v: 10902 },
    { x: 'FY24', v: 11660 },
    { x: 'FY25', v: 12275, tip: L('Many low-value shipments: total value fell to USD 0.19 bn', '大量低值货物：总货值降至1.9亿美元') },
    { x: 'FY26', v: 7458 },
  ],

  // Earliest public evidence of a responsible exit policy or procedure (cumulative), apparel and retail only
  policies: [
    { x: '2018', v: 1, tip: L('Fair Wear guidelines (for members)', 'Fair Wear指南（面向会员）') },
    { x: '2019', v: 1 },
    { x: '2020', v: 1 },
    { x: '2021', v: 5, tip: L('+ adidas, Nike, Kmart Australia, ACT checklist in use', '+ adidas、耐克、澳大利亚Kmart，ACT核对清单投入使用') },
    { x: '2022', v: 7, tip: L('+ JD Sports, Primark (Myanmar)', '+ JD Sports、Primark（缅甸）') },
    { x: '2023', v: 9, tip: L('+ Lidl, Inditex (Myanmar statements)', '+ Lidl、Inditex（缅甸声明）') },
    { x: '2024', v: 10, tip: L('+ VF Corporation; SOMO: no electronics brand has one', '+ VF集团；SOMO：没有一家电子品牌有此类政策') },
    { x: '2025', v: 11, tip: L('+ C&A standalone policy (current version Dec 2025)', '+ C&A独立政策（现行版本2025年12月）') },
  ],
}

export function series(arr, lang) {
  return arr.map(d => ({ ...d, tip: d.tip ? (typeof d.tip === 'string' ? d.tip : d.tip[lang]) : '' }))
}

// 1.1 Term use: share of documents in each group that use the term (56 public documents, Nov 2026)
export const TERMS = {
  rows: ['responsible exit', 'disengagement', 'termination (of the relationship)', 'suspension', 'exit strategy', 'responsible disengagement', 'phase-out', 'factory closure', 'divestment', 'responsible retrenchment'],
  rowsZh: { 'responsible exit': '负责任退出 responsible exit', 'disengagement': '脱离 disengagement', 'termination (of the relationship)': '终止（合作关系）termination', 'suspension': '暂停 suspension', 'exit strategy': '退出策略 exit strategy', 'responsible disengagement': '负责任脱离 responsible disengagement', 'phase-out': '逐步退出 phase-out', 'factory closure': '关厂 factory closure', 'divestment': '撤资 divestment', 'responsible retrenchment': '负责任裁员 responsible retrenchment' },
  cols: {
    en: [{ k: 'b', label: 'Brands', n: 17 }, { k: 'm', label: 'Initiatives', n: 10 }, { k: 'n', label: 'Intl norms', n: 9 }, { k: 'l', label: 'Laws', n: 5 }, { k: 'd', label: 'Dev. finance', n: 7 }, { k: 'g', label: 'NGOs, unions', n: 8 }],
    zh: [{ k: 'b', label: '品牌', n: 17 }, { k: 'm', label: '行业倡议', n: 10 }, { k: 'n', label: '国际规范', n: 9 }, { k: 'l', label: '法律', n: 5 }, { k: 'd', label: '开发性金融', n: 7 }, { k: 'g', label: 'NGO、工会', n: 8 }],
  },
  values: {
    'responsible exit': { b: 59, m: 50, n: 22, l: 0, d: 29, g: 62 },
    'responsible disengagement': { b: 0, m: 30, n: 44, l: 40, d: 14, g: 25 },
    'disengagement': { b: 12, m: 50, n: 67, l: 40, d: 14, g: 62 },
    'termination (of the relationship)': { b: 35, m: 40, n: 33, l: 40, d: 43, g: 50 },
    'suspension': { b: 12, m: 10, n: 56, l: 80, d: 0, g: 50 },
    'exit strategy': { b: 29, m: 40, n: 22, l: 0, d: 14, g: 38 },
    'phase-out': { b: 35, m: 20, n: 11, l: 40, d: 0, g: 0 },
    'factory closure': { b: 6, m: 10, n: 11, l: 0, d: 0, g: 50 },
    'divestment': { b: 12, m: 10, n: 22, l: 0, d: 0, g: 25 },
    'responsible retrenchment': { b: 6, m: 20, n: 11, l: 0, d: 0, g: 0 },
  },
}
export function termValues(lang) {
  if (lang !== 'zh') return { rows: TERMS.rows, values: TERMS.values }
  const v = {}
  for (const r of TERMS.rows) v[TERMS.rowsZh[r]] = TERMS.values[r]
  return { rows: TERMS.rows.map(r => TERMS.rowsZh[r]), values: v }
}
