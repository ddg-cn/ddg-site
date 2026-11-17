// Shared reference library for the carbon tools on scdd.pro.
// Values are PUBLIC reference figures or plausibility ranges, not a licensed database.
// Each entry: id, en, zh, re (matches item or dataset names), unit, lo/hi (plausible range),
// typ (typical / reference value), src (where the figure comes from), kind.
// Ranges are deliberately wide: they catch unit slips and wrong datasets, not small differences.

export const MATERIALS = [
  // battery materials
  { id: 'cam_lfp', en: 'LFP cathode active material', zh: '磷酸铁锂正极材料', kind: 'battery', re: /lifepo|(?<![a-z])lfp(?![a-z])|磷酸铁锂/i, unit: 'kg', lo: 3, hi: 16, typ: 7, src: 'Battery LCA literature; EU battery CFR submissions' },
  { id: 'pcam_fepo4', en: 'Iron phosphate (pCAM for LFP)', zh: '磷酸铁', kind: 'battery', re: /fepo|磷酸铁(?!锂)/i, unit: 'kg', lo: 1.5, hi: 10, typ: 4, src: 'Battery LCA literature' },
  { id: 'cam_nmc', en: 'NMC / NCA cathode active material', zh: '三元正极材料', kind: 'battery', re: /(?<![a-z])(nmc|nca|ncm)(?![a-z])|三元/i, unit: 'kg', lo: 8, hi: 45, typ: 20, src: 'Battery LCA literature' },
  { id: 'graphite_syn', en: 'Graphite, synthetic (anode)', zh: '人造石墨', kind: 'battery', re: /(artificial|synthetic)\s*graph|人造石墨|aam\s*-\s*art/i, unit: 'kg', lo: 3, hi: 25, typ: 10, src: 'Graphitisation is power-intensive; Chinese coal-power routes at the top of the range' },
  { id: 'graphite_nat', en: 'Graphite, natural (anode)', zh: '天然石墨', kind: 'battery', re: /natural\s*graph|天然石墨/i, unit: 'kg', lo: 0.8, hi: 8, typ: 3, src: 'Mining, spheroidisation and purification; battery LCA literature' },
  { id: 'graphite', en: 'Graphite', zh: '石墨', kind: 'battery', re: /graphit|石墨/i, unit: 'kg', lo: 0.8, hi: 25, typ: 8, src: 'Natural to synthetic range; battery LCA literature' },
  { id: 'electrolyte', en: 'Electrolyte (Li-ion)', zh: '电解液', kind: 'battery', re: /electrolyte|电解液/i, unit: 'kg', lo: 2, hi: 20, typ: 6, src: 'LiPF6 in carbonate solvents; battery LCA literature' },
  { id: 'lipf6', en: 'LiPF6', zh: '六氟磷酸锂', kind: 'chem', re: /lipf6|六氟磷酸锂/i, unit: 'kg', lo: 5, hi: 60, typ: 20, src: 'Battery LCA literature' },
  { id: 'separator', en: 'Separator (PE/PP film)', zh: '隔膜', kind: 'polymer', re: /separator|隔膜/i, unit: 'kg', lo: 1.5, hi: 12, typ: 4, src: 'Polyolefin plus film processing / coating' },
  { id: 'nmp', en: 'NMP (N-methyl-2-pyrrolidone)', zh: 'NMP（氮甲基吡咯烷酮）', kind: 'chem', re: /(?<![a-z])nmp(?![a-z])|pyrrolidon|吡咯烷酮/i, unit: 'kg', lo: 2, hi: 9, typ: 5, src: 'Virgin NMP; recovered NMP is much lower and should be stated as recycled' },
  { id: 'pvdf', en: 'PVDF', zh: 'PVDF（聚偏氟乙烯）', kind: 'polymer', re: /pvdf|polyvinylidene|聚偏氟/i, unit: 'kg', lo: 5, hi: 30, typ: 12, src: 'Fluoropolymer production; ecoinvent / Sphera public summaries' },
  { id: 'cmc', en: 'CMC (carboxymethyl cellulose)', zh: 'CMC（羧甲基纤维素钠）', kind: 'chem', re: /(?<![a-z])cmc(?![a-z])|carboxymethyl|羧甲基纤维素/i, unit: 'kg', lo: 1.5, hi: 7, typ: 3.5, src: 'ecoinvent public summaries' },
  { id: 'sbr', en: 'SBR (styrene-butadiene rubber)', zh: 'SBR（丁苯橡胶）', kind: 'polymer', re: /(?<![a-z])sbr(?![a-z])|styrene.butadiene|丁苯/i, unit: 'kg', lo: 2, hi: 5, typ: 3.5, src: 'Synthetic rubber eco-profiles' },
  { id: 'carbon_black', en: 'Carbon black / conductive carbon', zh: '炭黑/导电剂', kind: 'chem', re: /carbon\s*black|super\s*p|acetylene\s*black|炭黑|碳黑|导电剂|carbon nanotube|碳纳米管/i, unit: 'kg', lo: 1.5, hi: 15, typ: 2.5, src: 'Carbon black about 2–3; CNT pastes much higher' },
  { id: 'boehmite', en: 'Boehmite / alumina (coating)', zh: '勃姆石/氧化铝', kind: 'chem', re: /boehmite|勃姆石|alumina(?!te)|氧化铝|alooh/i, unit: 'kg', lo: 0.5, hi: 4, typ: 1.5, src: 'Alumina / aluminium hydroxide production (proxy)' },
  // polymers
  { id: 'pp', en: 'Polypropylene (PP)', zh: '聚丙烯 PP', kind: 'polymer', re: /polypropyl|(?<![a-z])e?pp(?![a-z])|聚丙烯(?!酰)/i, unit: 'kg', lo: 1.2, hi: 5, typ: 1.8, src: 'PlasticsEurope eco-profile (about 1.6–2 kg CO2e/kg granulate); Chinese coal-to-olefin routes up to about 4.5' },
  { id: 'pe', en: 'Polyethylene (PE)', zh: '聚乙烯 PE', kind: 'polymer', re: /polyethyl(?!ene tere)|(?<![a-z])(hd|ld|lld)?pe(?![a-z])|聚乙烯/i, unit: 'kg', lo: 1.3, hi: 5, typ: 1.9, src: 'PlasticsEurope eco-profiles; Chinese coal-to-olefin routes up to about 4.5' },
  { id: 'pet', en: 'PET', zh: 'PET（聚酯）', kind: 'polymer', re: /(?<![a-z])pet(?![a-z])|terephthal|聚酯|涤纶/i, unit: 'kg', lo: 1.8, hi: 4.5, typ: 2.7, src: 'PlasticsEurope eco-profile' },
  { id: 'pc', en: 'Polycarbonate (PC)', zh: '聚碳酸酯 PC', kind: 'polymer', re: /polycarbonat|(?<![a-z])pc(?![a-z])|聚碳酸酯/i, unit: 'kg', lo: 3, hi: 9, typ: 5, src: 'PlasticsEurope eco-profile' },
  { id: 'pa', en: 'Polyamide (PA6 / PA66)', zh: '尼龙 PA', kind: 'polymer', re: /polyamide|nylon|(?<![a-z])pa\s?6{1,2}|尼龙|聚酰胺/i, unit: 'kg', lo: 5, hi: 11, typ: 7.5, src: 'PlasticsEurope eco-profiles' },
  { id: 'pps', en: 'PPS', zh: 'PPS（聚苯硫醚）', kind: 'polymer', re: /(?<![a-z])pps(?![a-z])|polyphenylene sulf|聚苯硫醚/i, unit: 'kg', lo: 3, hi: 10, typ: 6, src: 'Engineering polymer literature (proxy datasets common)' },
  { id: 'abs', en: 'ABS', zh: 'ABS', kind: 'polymer', re: /(?<![a-z])abs(?![a-z])|acrylonitrile.butadiene/i, unit: 'kg', lo: 2.5, hi: 5, typ: 3.5, src: 'PlasticsEurope eco-profile' },
  { id: 'pvc', en: 'PVC', zh: 'PVC', kind: 'polymer', re: /(?<![a-z])pvc(?![a-z])|polyvinyl chlor|聚氯乙烯/i, unit: 'kg', lo: 1.5, hi: 3, typ: 2, src: 'PlasticsEurope eco-profile' },
  { id: 'epoxy', en: 'Epoxy resin', zh: '环氧树脂', kind: 'polymer', re: /epoxy|环氧/i, unit: 'kg', lo: 3.5, hi: 9, typ: 6, src: 'PlasticsEurope eco-profile' },
  { id: 'fkm', en: 'Fluoroelastomer (FKM)', zh: '氟橡胶', kind: 'polymer', re: /fluoro.?(rubber|elastomer)|(?<![a-z])fkm(?![a-z])|氟橡胶/i, unit: 'kg', lo: 5, hi: 40, typ: 15, src: 'Fluoropolymer literature (proxy datasets common)' },
  { id: 'adhesive_tape', en: 'Adhesive tape', zh: '胶带/胶纸', kind: 'polymer', re: /tape|胶纸|胶带/i, unit: 'kg', lo: 2, hi: 8, typ: 4, src: 'PET/PP film plus acrylic adhesive' },
  // other
  { id: 'glass_fibre', en: 'Glass fibre', zh: '玻璃纤维', kind: 'other', re: /glass\s*fib|玻纤|玻璃纤维/i, unit: 'kg', lo: 1, hi: 3.5, typ: 2, src: 'Glass Fibre Europe / ecoinvent summaries' },
  { id: 'cardboard', en: 'Cardboard / paper', zh: '纸箱/纸板', kind: 'packaging', re: /cardboard|corrugat|carton|paper|纸箱|纸板|瓦楞|纸围板|纸护角|砂管纸/i, unit: 'kg', lo: 0.3, hi: 2, typ: 0.9, src: 'FEFCO corrugated board LCA (fossil about 0.6–1.0)' },
  { id: 'wood', en: 'Wood / wooden pallet', zh: '木材/木托盘', kind: 'packaging', re: /wood|pallet|timber|木|栈板|托盘/i, unit: 'kg', lo: 0.02, hi: 0.8, typ: 0.2, src: 'Sawn wood, fossil emissions only (biogenic CO2 reported separately)' },
  { id: 'desiccant', en: 'Desiccant (clay / silica)', zh: '干燥剂', kind: 'packaging', re: /desiccant|干燥剂|蒙脱石|silica gel/i, unit: 'kg', lo: 0.1, hi: 3, typ: 0.8, src: 'Bentonite / silica gel production' },
  { id: 'water_di', en: 'Water, deionised', zh: '去离子水/纯水', kind: 'utility', re: /deioni[sz]ed|demineral|ultrapure|去离子水|纯水/i, unit: 'kg', lo: 0.0001, hi: 0.01, typ: 0.0006, src: 'Water treatment; ecoinvent public summaries' },
  { id: 'water_tap', en: 'Water, tap / industrial', zh: '自来水/工业用水', kind: 'utility', re: /tap\s*water|water(?!\s*treat)|自来水|工业用水|用水/i, unit: 'kg', lo: 0.00005, hi: 0.003, typ: 0.0004, src: 'Water supply LCI; per kg (≈0.4 kg CO2e/m³)' },
  { id: 'nitrogen', en: 'Nitrogen (industrial gas)', zh: '氮气', kind: 'utility', re: /nitrogen(?!.*fertil)|air separation|氮气|(?<![a-z])n2(?![a-z0-9])/i, unit: 'kg', lo: 0.05, hi: 0.8, typ: 0.3, src: 'Air separation, electricity based' },
  { id: 'helium', en: 'Helium', zh: '氦气', kind: 'utility', re: /helium|氦/i, unit: 'kg', lo: 1, hi: 40, typ: 8, src: 'Natural-gas co-product; wide literature range' },
  { id: 'ethanol', en: 'Ethanol / alcohol', zh: '酒精/乙醇', kind: 'chem', re: /ethanol|alcohol|酒精|乙醇/i, unit: 'kg', lo: 0.4, hi: 3, typ: 1.3, src: 'Fermentation vs synthetic routes' },
  { id: 'dmc', en: 'Dimethyl carbonate (DMC)', zh: '碳酸二甲酯 DMC', kind: 'chem', re: /(?<![a-z])dmc(?![a-z])|dimethyl carbonate|碳酸二甲酯/i, unit: 'kg', lo: 1, hi: 5, typ: 3, src: 'ecoinvent public summaries' },
  { id: 'naoh', en: 'Sodium hydroxide', zh: '氢氧化钠/片碱', kind: 'chem', re: /sodium hydroxide|caustic|naoh|chlor-alkali|氢氧化钠|片碱|烧碱/i, unit: 'kg', lo: 0.5, hi: 2.5, typ: 1.2, src: 'Chlor-alkali, electricity based' },
  // metals
  { id: 'al_recycled', en: 'Aluminium, recycled / secondary', zh: '再生铝', kind: 'metal', re: /(recycl|secondary|scrap|再生|回收).{0,40}alumin|alumin.{0,40}(recycl|secondary|scrap|再生)|再生铝/i, unit: 'kg', lo: 0.2, hi: 2.0, typ: 0.6, src: 'Remelting of post-consumer scrap; ecoinvent / Sphera public summaries, IAI' },
  { id: 'al_foil', en: 'Aluminium foil / sheet (primary)', zh: '铝箔/铝板（原生）', kind: 'metal', re: /alumin\w*\s*(foil|sheet|strip|rolled)|铝箔|铝板|铝带/i, unit: 'kg', lo: 7, hi: 26, typ: 18, src: 'Primary ingot (IAI 2023 global average 14.8 t CO2e/t cradle-to-gate; coal-based Chinese smelting higher) plus rolling' },
  { id: 'al_primary', en: 'Aluminium, primary', zh: '原生铝', kind: 'metal', re: /(?<!poly)alumin(?!at|a|um hydrox)|(?<![a-z])al(?![a-z])|铝(?!塑|酸)/i, unit: 'kg', lo: 5, hi: 24, typ: 16, src: 'IAI 2023 global average 14.8 t CO2e/t (cradle-to-gate); China estimates about 11.5–20 depending on boundary and power mix' },
  { id: 'cu_recycled', en: 'Copper, recycled / secondary', zh: '再生铜', kind: 'metal', re: /(recycl|secondary|scrap|再生).{0,40}copper|copper.{0,40}(recycl|secondary|scrap)|再生铜/i, unit: 'kg', lo: 0.3, hi: 3.5, typ: 1.5, src: 'Secondary copper refining; ecoinvent / ICA public summaries' },
  { id: 'cu_foil', en: 'Copper foil', zh: '铜箔', kind: 'metal', re: /copper\s*(collector\s*)?foil|铜箔/i, unit: 'kg', lo: 3, hi: 14, typ: 8, src: 'Cathode copper plus electrodeposition; battery LCA literature' },
  { id: 'cu', en: 'Copper', zh: '铜', kind: 'metal', re: /copper|(?<![a-z])cu(?![a-z])|铜/i, unit: 'kg', lo: 1.5, hi: 7, typ: 4, src: 'International Copper Association cathode LCA (about 4 kg CO2e/kg); ecoinvent ranges' },
  { id: 'steel_stainless', en: 'Stainless steel', zh: '不锈钢', kind: 'metal', re: /stainless|不锈钢|sus\s?3\d\d/i, unit: 'kg', lo: 2, hi: 8, typ: 4.5, src: 'worldsteel / ISSF public LCI summaries' },
  { id: 'steel', en: 'Steel', zh: '钢', kind: 'metal', re: /steel|pig iron|cast iron|钢|生铁|铸铁/i, unit: 'kg', lo: 0.4, hi: 3.5, typ: 2.2, src: 'worldsteel: BF-BOF about 2.2, EAF (scrap) about 0.7 kg CO2e/kg' },
  { id: 'nickel', en: 'Nickel', zh: '镍', kind: 'metal', re: /nickel|(?<![a-z])ni(?![a-z])|镍/i, unit: 'kg', lo: 5, hi: 60, typ: 15, src: 'Nickel Institute LCA (class 1 about 13–15); laterite/NPI routes much higher' },
  { id: 'cobalt', en: 'Cobalt', zh: '钴', kind: 'metal', re: /cobalt|(?<![a-z])co(?![a-z2])|钴/i, unit: 'kg', lo: 5, hi: 60, typ: 20, src: 'Cobalt Institute LCA; battery LCA literature' },
  { id: 'lithium', en: 'Lithium carbonate / hydroxide', zh: '碳酸锂/氢氧化锂', kind: 'chem', re: /lithium\s*(carbonate|hydroxide)|碳酸锂|氢氧化锂/i, unit: 'kg', lo: 2, hi: 25, typ: 10, src: 'Brine vs spodumene routes; battery LCA literature' },
]

export const ENERGY = [
  { id: 'electricity', en: 'Electricity (grid)', zh: '电力', re: /electricit|electric power|grid (electricity|mix)|power grid|电力|电网|^电$|用电|市电/i, unit: 'kWh', lo: 0, hi: 1.2, typ: null, src: 'National grid factors vary from near 0 to about 1.1 kg CO2e/kWh' },
  { id: 'steam', en: 'Steam', zh: '蒸汽', re: /steam|蒸汽/i, unit: 'kg', lo: 0.12, hi: 0.5, typ: 0.3, src: 'Gas or coal boiler, about 2.5–3 MJ/kg' },
  { id: 'natural_gas', en: 'Natural gas (burned)', zh: '天然气', re: /natural gas|天然气|(?<![a-z])lng(?![a-z])/i, unit: 'm3', lo: 1.8, hi: 2.7, typ: 2.2, src: 'IPCC 2006 combustion about 1.9–2.0 kg CO2/m³ plus upstream' },
  { id: 'diesel', en: 'Diesel (burned)', zh: '柴油', re: /diesel|柴油/i, unit: 'kg', lo: 3.1, hi: 4.0, typ: 3.5, src: 'IPCC 2006 combustion 3.16 kg CO2/kg plus upstream (per litre ≈ ×0.84)' },
  { id: 'coal', en: 'Coal (burned)', zh: '煤', re: /coal|煤/i, unit: 'kg', lo: 1.6, hi: 3.0, typ: 2.3, src: 'IPCC 2006, depends on calorific value' },
  { id: 'lpg', en: 'LPG (burned)', zh: '液化石油气', re: /(?<![a-z])lpg(?![a-z])|liquefied petroleum|液化石油气/i, unit: 'kg', lo: 2.9, hi: 3.6, typ: 3.2, src: 'IPCC 2006 combustion about 3.0 kg CO2/kg plus upstream' },
]

// Grid factors with public sources (kg CO2e/kWh unless noted)
export const GRID = {
  CN: { lo: 0.45, hi: 0.70, refs: [
    { v: 0.5777, label: 'MEE 2024 national electricity carbon footprint factor (kg CO2e/kWh) — the figure meant for product footprints', ok: true },
    { v: 0.6205, label: 'MEE 2023 national electricity carbon footprint factor (superseded by the 2024 value 0.5777)', old: true },
    { v: 0.5306, label: 'MEE 2023 national average CO2 emission factor (kg CO2/kWh) — meant for organisational inventories, not product footprints', kind: 'ef' },
    { v: 0.6096, label: 'MEE 2023 CO2 emission factor excluding market-traded non-fossil power — organisational inventories', kind: 'ef' },
    { v: 0.5366, label: 'MEE 2022 national average CO2 emission factor — superseded and meant for organisational inventories', kind: 'ef', old: true },
    { v: 0.5703, label: 'MEE 2021-era national grid emission factor (carbon market) — superseded', kind: 'ef', old: true },
  ] },
}

export const TRANSPORT = [
  { id: 'air', en: 'Air freight', zh: '空运', re: /air|plane|flight|空运|航空/i, unit: 't·km', lo: 0.4, hi: 2.5, typ: 1.1 },
  { id: 'ship', en: 'Sea / inland ship', zh: '海运/水运', re: /ship|sea|ocean|vessel|barge|container|海运|水运|船/i, unit: 't·km', lo: 0.002, hi: 0.05, typ: 0.012 },
  { id: 'rail', en: 'Rail freight', zh: '铁路', re: /rail|train|铁路|火车/i, unit: 't·km', lo: 0.005, hi: 0.07, typ: 0.025 },
  { id: 'truck', en: 'Road freight (truck)', zh: '公路（货车）', re: /truck|lorry|road|hgv|van|陆运|公路|货车|卡车|汽运/i, unit: 't·km', lo: 0.04, hi: 0.35, typ: 0.1 },
]
export const TRANSPORT_SRC = 'DESNZ/DEFRA freight factors and GLEC framework (WTW): HGV ≈ 0.08–0.12, container ship ≈ 0.01–0.02, rail ≈ 0.02–0.03, air ≈ 1 kg CO2e/t·km'

export const WASTE = [
  { id: 'incin_plastic', en: 'Incineration of plastics', zh: '塑料焚烧', re: /incinerat.{0,40}(plastic|polymer|pp|pe|pet)|焚烧/i, unit: 'kg', lo: 0.8, hi: 3.3, typ: 2.3 },
  { id: 'landfill', en: 'Landfill', zh: '填埋', re: /landfill|填埋/i, unit: 'kg', lo: 0.005, hi: 1.0, typ: 0.1 },
  { id: 'wastewater', en: 'Wastewater treatment', zh: '污水处理', re: /waste\s*water|sewage|污水|废水/i, unit: 'm3', lo: 0.1, hi: 1.5, typ: 0.4 },
]

// ---------- geography ----------
const REGION = {
  CN: 'AS', JP: 'AS', KR: 'AS', IN: 'AS', VN: 'AS', TH: 'AS', ID: 'AS', MY: 'AS', TW: 'AS', SG: 'AS', PH: 'AS',
  DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', PL: 'EU', HU: 'EU', CZ: 'EU', SK: 'EU', SE: 'EU', FI: 'EU', NL: 'EU', BE: 'EU', AT: 'EU', PT: 'EU', RO: 'EU', HR: 'EU', SI: 'EU', NO: 'EU', GB: 'EU', CH: 'EU',
  US: 'NA', CA: 'NA', MX: 'NA', BR: 'SA', AR: 'SA', CL: 'SA', AU: 'OC', NZ: 'OC', MA: 'AF', ZA: 'AF', EG: 'AF', CD: 'AF', TR: 'EU', RU: 'EU',
}
const NAMES = {
  china: 'CN', 中国: 'CN', prc: 'CN', japan: 'JP', korea: 'KR', india: 'IN', vietnam: 'VN', thailand: 'TH', indonesia: 'ID', malaysia: 'MY', taiwan: 'TW',
  germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES', poland: 'PL', hungary: 'HU', 匈牙利: 'HU', czech: 'CZ', slovakia: 'SK', sweden: 'SE', finland: 'FI', netherlands: 'NL', belgium: 'BE', austria: 'AT', portugal: 'PT', romania: 'RO', croatia: 'HR', 'united kingdom': 'GB', uk: 'GB',
  'united states': 'US', usa: 'US', canada: 'CA', mexico: 'MX', brazil: 'BR', chile: 'CL', australia: 'AU', morocco: 'MA', 摩洛哥: 'MA', 'south africa': 'ZA', turkey: 'TR',
}
// "CN", "China", "CN-SGCC", "RER", "GLO", "RoW", "EU-28", "RAS"
export function geoCode(s) {
  if (s == null) return null
  const t = String(s).trim()
  if (!t || /^(n|na|n\/a|\/|-|0)$/i.test(t)) return null
  if (/^glo/i.test(t) || /global|world|全球/i.test(t)) return { kind: 'GLO', code: 'GLO' }
  if (/^row$|rest.of.(the.)?world/i.test(t)) return { kind: 'ROW', code: 'ROW' }
  if (/^(rer|eu|eu-?\d+|europe|eur)\b/i.test(t) || /欧洲|欧盟/.test(t)) return { kind: 'REG', code: 'EU' }
  if (/^ras\b|^asia|亚洲/i.test(t)) return { kind: 'REG', code: 'AS' }
  if (/^(rna|north america)/i.test(t)) return { kind: 'REG', code: 'NA' }
  if (/^(rla|latin america|south america)/i.test(t)) return { kind: 'REG', code: 'SA' }
  if (/^raf|africa/i.test(t)) return { kind: 'REG', code: 'AF' }
  const iso = /^([A-Z]{2})(?:[-_ ].*)?$/.exec(t)
  if (iso && REGION[iso[1]]) return { kind: 'C', code: iso[1] }
  const low = t.toLowerCase()
  for (const [k, v] of Object.entries(NAMES)) if (low.includes(k)) return { kind: 'C', code: v }
  for (const c of Object.keys(REGION)) if (new RegExp(`(^|[^A-Za-z])${c}([^A-Za-z]|$)`).test(t)) return { kind: 'C', code: c }
  return null
}
export const regionOf = c => REGION[c] || null

// ---------- matching ----------
export function matchMaterial(...names) {
  for (const n of names) {
    const s = String(n || '')
    if (!s.trim()) continue
    for (const m of MATERIALS) if (m.re.test(s)) return m
  }
  return null
}
export const matchEnergy = s => ENERGY.find(e => e.re.test(String(s || ''))) || null
export const matchTransport = s => TRANSPORT.find(e => e.re.test(String(s || ''))) || null
export const matchWaste = s => WASTE.find(e => e.re.test(String(s || ''))) || null

// database name + version -> reference year (approximate release year of the data)
export function dbYear(src, name = '') {
  const s = `${src || ''} ${name || ''}`
  let m = /ecoinvent\s*v?\s*(3)\.(\d{1,2})/i.exec(s)
  if (m) { const minor = +m[2]; return { year: 2013 + minor, label: `ecoinvent 3.${minor}` } } // 3.12 → 2025, 3.10 → 2023, 3.9 → 2022
  m = /(sphera|gabi|lca for experts|mlc|elcd|ef\s*3\.\d|clcd|cpcd|ecoinvent|agribalyse|uslci|idea)\D{0,20}(20\d\d)/i.exec(s)
  if (m) return { year: +m[2], label: `${m[1]} ${m[2]}` }
  m = /(20[0-3]\d)/.exec(s)
  if (m) return { year: +m[1], label: m[1] }
  return null
}

// ---------- farm calculator factors ----------
// IPCC 2019 Refinement, Vol.4 Ch.11 Table 11.1 / 11.3 and Ch.5 Tables 5.11–5.14 (checked against the official PDF, 2026-11-17)
export const IPCC = {
  EF1: { agg: 0.010, wet_syn: 0.016, wet_other: 0.006, dry: 0.005, rice: 0.004 },
  EF4: { agg: 0.010, wet: 0.014, dry: 0.005 },
  EF5: 0.011,
  FracGASF: { agg: 0.11, urea: 0.15, ammonium: 0.08, nitrate: 0.01, an: 0.05 },
  FracGASM: 0.21,
  FracLEACH: 0.24, // wet climates / irrigated; 0 in dry climates without irrigation
  N2O_N: 44 / 28,
  GWP: { CH4: 27.0, N2O: 273, label: 'IPCC AR6 100-year GWP (CH4 non-fossil 27.0, N2O 273)' },
  UREA_C: 0.20, // t C per t urea (IPCC 2006 Vol.4 Ch.11 Eq.11.13)
  LIME_C: { limestone: 0.12, dolomite: 0.13 },
  RICE: {
    EFc: { global: 1.19, east_asia: 1.32, se_asia: 1.22, south_asia: 0.85, europe: 1.56, north_america: 0.65, south_america: 1.27 },
    days: { global: 113, east_asia: 112 },
    SFw: { flooded: 1.00, single: 0.71, multiple: 0.55, rainfed: 0.54, drought: 0.16, deep: 0.06, upland: 0 },
    SFp: { short: 1.00, long: 0.89, flooded: 2.41, over_year: 0.59 },
    CFOA: { straw_short: 1.00, straw_long: 0.19, compost: 0.17, manure: 0.21, green: 0.45 },
    SFoExp: 0.59,
  },
}

// Input production factors (kg CO2e per unit), cradle-to-gate, with sources. Editable in the calculator.
export const FARM_INPUTS = [
  { id: 'n_urea', en: 'Nitrogen as urea', zh: '尿素（按纯氮）', unit: 'kg N', ef: 8.1, src: 'China, coal-based production; Zhang et al. 2013 PNAS as cited in later studies (8.1 kg CO2e/kg urea-N)', group: 'fert', nType: 'urea', urea: true },
  { id: 'n_compound', en: 'Nitrogen in compound fertiliser (NPK)', zh: '复合肥中的氮（按纯氮）', unit: 'kg N', ef: 7.4, src: 'China; Zhang et al. 2013 as cited (7.4 kg CO2e/kg compound-fertiliser N)', group: 'fert', nType: 'ammonium' },
  { id: 'n_abc', en: 'Nitrogen as ammonium bicarbonate', zh: '碳铵（按纯氮）', unit: 'kg N', ef: 7.2, src: 'China; Zhang et al. 2013 as cited (7.2 kg CO2e/kg ABC-N)', group: 'fert', nType: 'ammonium' },
  { id: 'n_an', en: 'Nitrogen as ammonium nitrate / CAN', zh: '硝铵/硝酸铵钙（按纯氮）', unit: 'kg N', ef: 4.0, src: 'Fertilizers Europe / EU BAT plants about 3–4.5 kg CO2e/kg N (with N2O abatement); Chinese plants higher', group: 'fert', nType: 'an' },
  { id: 'p2o5', en: 'Phosphate (P2O5)', zh: '磷肥（按 P2O5）', unit: 'kg P2O5', ef: 1.5, src: 'Literature range about 0.7–2 kg CO2e/kg P2O5 (China studies ≈1.5)', group: 'fert' },
  { id: 'k2o', en: 'Potash (K2O)', zh: '钾肥（按 K2O）', unit: 'kg K2O', ef: 0.7, src: 'Literature range about 0.3–1 kg CO2e/kg K2O', group: 'fert' },
  { id: 'manure_n', en: 'Nitrogen in manure / compost', zh: '有机肥中的氮（按纯氮）', unit: 'kg N', ef: 0, src: 'No production burden (by-product); field N2O still counted', group: 'org' },
  { id: 'pesticide', en: 'Pesticides (active ingredient)', zh: '农药（按有效成分）', unit: 'kg a.i.', ef: 15, src: 'Literature range about 10–25 kg CO2e/kg active ingredient', group: 'other' },
  { id: 'film', en: 'Plastic mulch / film (PE)', zh: '农膜/地膜（PE）', unit: 'kg', ef: 2.5, src: 'PE production about 1.9 plus film blowing; end-of-life not included', group: 'other' },
  { id: 'diesel', en: 'Diesel (machinery, pumps)', zh: '柴油（农机、水泵）', unit: 'L', ef: 3.0, src: 'IPCC 2006: 2.68 kg CO2/L combustion plus about 10–15% upstream', group: 'energy' },
  { id: 'petrol', en: 'Petrol', zh: '汽油', unit: 'L', ef: 2.7, src: 'IPCC 2006: 2.31 kg CO2/L combustion plus upstream', group: 'energy' },
  { id: 'electricity_cn', en: 'Electricity (China grid)', zh: '电力（中国电网）', unit: 'kWh', ef: 0.5777, src: 'MEE 2024 national electricity carbon footprint factor', group: 'energy' },
  { id: 'lime', en: 'Lime (limestone, CaCO3)', zh: '石灰（石灰石）', unit: 'kg', ef: 0.44 + 0.04, src: 'Field CO2 = 0.12 t C/t (IPCC) = 0.44 kg CO2/kg, plus ≈0.04 for quarrying and grinding', group: 'other', lime: true },
  { id: 'greenhouse_steel', en: 'Greenhouse steel (annualised)', zh: '大棚钢材（按年分摊）', unit: 'kg/yr', ef: 2.2, src: 'worldsteel BF-BOF about 2.2 kg CO2e/kg; enter steel mass ÷ service years', group: 'other' },
]

// Crop presets: typical Chinese yields (t/ha) and N rates (kg N/ha) as starting points only.
export const CROPS = [
  { id: 'tomato_gh', en: 'Tomato (greenhouse)', zh: '番茄（设施）', yield: 75, n: 450, p: 200, k: 450, diesel: 80, elec: 1500, film: 150, pest: 6, residue: 0.03 },
  { id: 'cucumber_gh', en: 'Cucumber (greenhouse)', zh: '黄瓜（设施）', yield: 80, n: 500, p: 220, k: 500, diesel: 80, elec: 1500, film: 150, pest: 6 },
  { id: 'cabbage', en: 'Cabbage / Chinese cabbage', zh: '甘蓝/大白菜', yield: 60, n: 250, p: 90, k: 200, diesel: 60, elec: 300, film: 0, pest: 3 },
  { id: 'potato', en: 'Potato', zh: '马铃薯', yield: 25, n: 180, p: 90, k: 220, diesel: 90, elec: 200, film: 60, pest: 4 },
  { id: 'apple', en: 'Apple', zh: '苹果', yield: 35, n: 400, p: 200, k: 350, diesel: 120, elec: 600, film: 0, pest: 15 },
  { id: 'citrus', en: 'Citrus', zh: '柑橘', yield: 30, n: 350, p: 150, k: 300, diesel: 100, elec: 400, film: 0, pest: 10 },
  { id: 'grape', en: 'Grape', zh: '葡萄', yield: 22, n: 300, p: 150, k: 300, diesel: 100, elec: 500, film: 0, pest: 12 },
  { id: 'tea', en: 'Tea (fresh leaf)', zh: '茶叶（鲜叶）', yield: 8, n: 450, p: 100, k: 150, diesel: 60, elec: 300, film: 0, pest: 4 },
  { id: 'rice', en: 'Rice (paddy)', zh: '水稻', yield: 7.5, n: 190, p: 60, k: 80, diesel: 70, elec: 600, film: 0, pest: 3, rice: true },
  { id: 'wheat', en: 'Wheat', zh: '小麦', yield: 6, n: 210, p: 90, k: 60, diesel: 70, elec: 500, film: 0, pest: 2 },
  { id: 'maize', en: 'Maize', zh: '玉米', yield: 7, n: 200, p: 70, k: 60, diesel: 70, elec: 300, film: 0, pest: 2 },
  { id: 'custom', en: 'Other (enter your own)', zh: '其他（自行填写）', yield: 10, n: 150, p: 60, k: 80, diesel: 60, elec: 200, film: 0, pest: 3 },
]

// Public generic footprints for comparison (farm gate unless noted), kg CO2e/kg product.
export const BENCH = {
  src: 'Poore & Nemecek 2018 (Our World in Data, global median, farm-to-retail incl. land use change) — shown only as context; not comparable 1:1 with a farm-gate result',
  tomato_gh: 2.1, cucumber_gh: null, cabbage: 0.5, potato: 0.5, apple: 0.4, citrus: 0.4, grape: 1.5, tea: null, rice: 4.5, wheat: 1.6, maize: 1.7,
}
