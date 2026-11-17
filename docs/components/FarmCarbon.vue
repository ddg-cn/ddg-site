<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { IPCC, FARM_INPUTS, CROPS, BENCH } from './carbon/factors.js'

const props = defineProps({ lang: { type: String, default: 'en' } })
const zh = computed(() => props.lang === 'zh')
const tr = (en, z) => (zh.value ? z : en)
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'
const EF = Object.fromEntries(FARM_INPUTS.map(f => [f.id, f.ef]))

// fertiliser products: nutrient contents (fractions) and N type for volatilisation
const FERTS = [
  { id: 'urea', en: 'Urea (46% N)', zh: '尿素（含氮 46%）', n: 0.46, p: 0, k: 0, nType: 'urea', nEf: 'n_urea', urea: true },
  { id: 'npk', en: 'Compound fertiliser (N-P-K %)', zh: '复合肥（N-P-K %）', n: 0.15, p: 0.15, k: 0.15, nType: 'ammonium', nEf: 'n_compound', edit: true },
  { id: 'dap', en: 'DAP (18-46-0)', zh: '磷酸二铵（18-46-0）', n: 0.18, p: 0.46, k: 0, nType: 'ammonium', nEf: 'n_compound' },
  { id: 'abc', en: 'Ammonium bicarbonate (17% N)', zh: '碳铵（含氮 17%）', n: 0.17, p: 0, k: 0, nType: 'ammonium', nEf: 'n_abc' },
  { id: 'can', en: 'Calcium ammonium nitrate (15.5% N)', zh: '硝酸铵钙（含氮 15.5%）', n: 0.155, p: 0, k: 0, nType: 'an', nEf: 'n_an' },
  { id: 'ssp', en: 'Superphosphate (12% P2O5)', zh: '过磷酸钙（12% P2O5）', n: 0, p: 0.12, k: 0, nType: null },
  { id: 'kcl', en: 'Potassium chloride (60% K2O)', zh: '氯化钾（60% K2O）', n: 0, p: 0, k: 0.60, nType: null },
  { id: 'sop', en: 'Potassium sulphate (50% K2O)', zh: '硫酸钾（50% K2O）', n: 0, p: 0, k: 0.50, nType: null },
  { id: 'org', en: 'Organic fertiliser / manure (N %)', zh: '有机肥/粪肥（含氮 %）', n: 0.02, p: 0.02, k: 0.02, nType: 'organic', nEf: 'manure_n', edit: true },
]

const unit = ref('mu') // 'mu' | 'ha'
const perHa = computed(() => (unit.value === 'mu' ? 15 : 1))
const s = reactive({
  crop: 'tomato_gh', area: 10, yieldPer: 5000, climate: 'wet', irrigated: true,
  ferts: Object.fromEntries(FERTS.map(f => [f.id, { kg: 0, n: f.n * 100, p: f.p * 100, k: f.k * 100 }])),
  pest: 0, film: 0, diesel: 0, petrol: 0, elec: 0, lime: 0, steel: 0, residueN: 0,
  rice: { region: 'east_asia', days: 112, water: 'single', pre: 'short', strawShort: 0, strawLong: 0, manure: 0, compost: 0, green: 0 },
  ef: { ...EF }, showFactors: false,
})
const crop = computed(() => CROPS.find(c => c.id === s.crop))
const isRice = computed(() => !!crop.value?.rice)

// fill inputs from a crop preset (per ha values → current unit)
function applyPreset() {
  const c = crop.value
  if (!c) return
  const k = 1 / perHa.value
  for (const f of FERTS) s.ferts[f.id].kg = 0
  const npkKg = c.p / 0.15
  s.ferts.npk.kg = round(npkKg * k)
  const nLeft = Math.max(0, c.n - npkKg * 0.15)
  s.ferts.urea.kg = round(nLeft / 0.46 * k)
  const kLeft = Math.max(0, c.k - npkKg * 0.15)
  s.ferts.kcl.kg = round(kLeft / 0.6 * k)
  s.diesel = round(c.diesel * k); s.elec = round(c.elec * k); s.film = round(c.film * k); s.pest = round(c.pest * k, 1)
  s.yieldPer = round(c.yield * 1000 * k)
  s.lime = 0; s.steel = 0; s.petrol = 0; s.residueN = 0
}
const round = (v, d = 0) => { const m = 10 ** d; return Math.round(v * m) / m }
watch(() => s.crop, applyPreset)
watch(unit, (nu, old) => {
  const f = nu === 'mu' ? 1 / 15 : 15
  for (const id in s.ferts) s.ferts[id].kg = round(s.ferts[id].kg * f, 1)
  for (const k of ['pest', 'film', 'diesel', 'petrol', 'elec', 'lime', 'steel', 'residueN', 'yieldPer']) s[k] = round(s[k] * f, k === 'pest' ? 2 : 1)
  s.area = round(s.area / f, 2)
})
applyPreset()

const res = computed(() => {
  const H = perHa.value // multiply per-unit-area inputs by H to get per ha
  const wet = s.climate === 'wet'
  let nSyn = 0, nOrg = 0, P = 0, K = 0, volN = 0, ureaKg = 0
  const prod = [] // production emissions per ha
  for (const f of FERTS) {
    const x = s.ferts[f.id]; const kg = (+x.kg || 0) * H
    if (!kg) continue
    const nf = (f.edit ? +x.n : f.n * 100) / 100, pf = (f.edit ? +x.p : f.p * 100) / 100, kf = (f.edit ? +x.k : f.k * 100) / 100
    const N = kg * nf
    P += kg * pf; K += kg * kf
    if (f.nType === 'organic') { nOrg += N; volN += N * IPCC.FracGASM }
    else if (N) { nSyn += N; volN += N * IPCC.FracGASF[f.nType] }
    if (f.urea) ureaKg += kg
    if (N && f.nEf) prod.push({ k: 'fert', en: `${f.en}: N`, zh: `${f.zh}：氮`, v: N * s.ef[f.nEf] })
  }
  prod.push({ k: 'fert', en: 'Phosphate (P2O5)', zh: '磷（P2O5）', v: P * s.ef.p2o5 }, { k: 'fert', en: 'Potash (K2O)', zh: '钾（K2O）', v: K * s.ef.k2o })
  prod.push({ k: 'other', en: 'Pesticides', zh: '农药', v: s.pest * H * s.ef.pesticide }, { k: 'other', en: 'Plastic film', zh: '农膜', v: s.film * H * s.ef.film },
    { k: 'energy', en: 'Diesel', zh: '柴油', v: s.diesel * H * s.ef.diesel }, { k: 'energy', en: 'Petrol', zh: '汽油', v: s.petrol * H * s.ef.petrol },
    { k: 'energy', en: 'Electricity', zh: '电力', v: s.elec * H * s.ef.electricity_cn }, { k: 'other', en: 'Lime', zh: '石灰', v: s.lime * H * s.ef.lime },
    { k: 'other', en: 'Greenhouse steel', zh: '大棚钢材', v: s.steel * H * s.ef.greenhouse_steel })
  // field N2O (IPCC 2019 Tier 1)
  const nRes = (+s.residueN || 0) * H
  const ef1Syn = isRice.value ? IPCC.EF1.rice : wet ? IPCC.EF1.wet_syn : IPCC.EF1.dry
  const ef1Oth = isRice.value ? IPCC.EF1.rice : wet ? IPCC.EF1.wet_other : IPCC.EF1.dry
  const direct = (nSyn * ef1Syn + (nOrg + nRes) * ef1Oth) * IPCC.N2O_N * IPCC.GWP.N2O
  const vol = volN * (wet ? IPCC.EF4.wet : IPCC.EF4.dry) * IPCC.N2O_N * IPCC.GWP.N2O
  const fracLeach = wet || s.irrigated ? IPCC.FracLEACH : 0
  const leach = (nSyn + nOrg + nRes) * fracLeach * IPCC.EF5 * IPCC.N2O_N * IPCC.GWP.N2O
  const ureaCO2 = ureaKg * IPCC.UREA_C * 44 / 12
  const field = [
    { k: 'n2o', en: 'Field N2O, direct', zh: '农田直接 N2O', v: direct },
    { k: 'n2o', en: 'Field N2O, from volatilised NH3/NOx', zh: '氨挥发间接 N2O', v: vol },
    { k: 'n2o', en: 'Field N2O, from leaching / runoff', zh: '淋溶径流间接 N2O', v: leach },
    { k: 'co2', en: 'Urea hydrolysis CO2', zh: '尿素水解 CO2', v: ureaCO2 },
  ]
  // rice CH4
  let ch4 = 0, riceInfo = null
  if (isRice.value) {
    const R = IPCC.RICE, r = s.rice
    const roa = (+r.strawShort || 0) * R.CFOA.straw_short + (+r.strawLong || 0) * R.CFOA.straw_long + (+r.manure || 0) * R.CFOA.manure + (+r.compost || 0) * R.CFOA.compost + (+r.green || 0) * R.CFOA.green
    const SFo = Math.pow(1 + roa, R.SFoExp)
    const EFi = R.EFc[r.region] * R.SFw[r.water] * R.SFp[r.pre] * SFo
    const kgCH4 = EFi * (+r.days || 0)
    ch4 = kgCH4 * IPCC.GWP.CH4
    riceInfo = { EFi, SFo, kgCH4 }
    field.push({ k: 'ch4', en: 'Paddy CH4', zh: '稻田甲烷', v: ch4 })
  }
  const rows = [...prod, ...field].filter(x => x.v > 0.0001)
  const total = rows.reduce((a, x) => a + x.v, 0)
  const yieldKgHa = (+s.yieldPer || 0) * H
  return { rows: rows.sort((a, b) => b.v - a.v), total, perKg: yieldKgHa ? total / yieldKgHa : null, perUnitArea: total / H, yieldKgHa, nSyn, nOrg, P, K, riceInfo,
    farm: (+s.area || 0) * total / H }
})
const max = computed(() => Math.max(...res.value.rows.map(r => r.v), 1))
const COLORS = { fert: '#5470c6', energy: '#ee6666', other: '#91cc75', n2o: '#fac858', co2: '#73c0de', ch4: '#3ba272' }
const bench = computed(() => BENCH[s.crop] ?? null)
const fx = (v, d = 2) => v == null || !isFinite(v) ? '—' : v >= 1000 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v.toFixed(d)
const au = computed(() => (unit.value === 'mu' ? tr('mu', '亩') : 'ha'))

async function download() {
  const X = await import(/* @vite-ignore */ XLSX_URL)
  const wb = X.utils.book_new()
  const r = res.value
  const sum = [[tr('Item', '项目'), 'kg CO2e/ha', `kg CO2e/${au.value}`, '%']]
  for (const x of r.rows) sum.push([tr(x.en, x.zh), +x.v.toFixed(2), +(x.v / perHa.value).toFixed(2), +(x.v / r.total * 100).toFixed(1)])
  sum.push([tr('Total', '合计'), +r.total.toFixed(1), +(r.total / perHa.value).toFixed(1), 100], [], [tr('Yield (kg/ha)', '产量（kg/公顷）'), r.yieldKgHa], [tr('kg CO2e per kg product (farm gate)', '每公斤产品 kg CO2e（农场大门）'), r.perKg ? +r.perKg.toFixed(3) : ''])
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(sum), tr('Result', '结果'))
  const inp = [[tr('Input', '投入'), tr('Amount per ', '每') + au.value, tr('Unit', '单位')]]
  for (const f of FERTS) if (+s.ferts[f.id].kg) inp.push([tr(f.en, f.zh) + (f.edit ? ` (${s.ferts[f.id].n}-${s.ferts[f.id].p}-${s.ferts[f.id].k})` : ''), +s.ferts[f.id].kg, 'kg'])
  for (const [k, en, z, u] of [['pest', 'Pesticide a.i.', '农药有效成分', 'kg'], ['film', 'Plastic film', '农膜', 'kg'], ['diesel', 'Diesel', '柴油', 'L'], ['petrol', 'Petrol', '汽油', 'L'], ['elec', 'Electricity', '电力', 'kWh'], ['lime', 'Lime', '石灰', 'kg'], ['steel', 'Greenhouse steel per year', '大棚钢材（每年）', 'kg'], ['residueN', 'Crop residue N returned', '还田秸秆氮', 'kg N']]) if (+s[k]) inp.push([tr(en, z), +s[k], u])
  inp.push([], [tr('Climate', '气候'), s.climate], [tr('Irrigated', '灌溉'), s.irrigated ? 'yes' : 'no'])
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(inp), tr('Inputs', '投入'))
  const fac = [[tr('Factor', '因子'), tr('Value', '数值'), tr('Unit', '单位'), tr('Source', '来源')]]
  for (const f of FARM_INPUTS) fac.push([tr(f.en, f.zh), s.ef[f.id], `kg CO2e/${f.unit}`, f.src])
  fac.push(['EF1 / EF4 / EF5 / FracGASF / FracLEACH', 'see method', '', 'IPCC 2019 Refinement Vol.4 Ch.11 Tables 11.1, 11.3'], ['Rice CH4', 'see method', '', 'IPCC 2019 Refinement Vol.4 Ch.5 Tables 5.11–5.14'], ['GWP', 'CH4 27.0, N2O 273', '', IPCC.GWP.label])
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(fac), tr('Factors', '因子'))
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `${tr('Farm carbon footprint', '农产品碳足迹')} - ${tr(crop.value.en, crop.value.zh)}.xlsx`
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
</script>

<template>
  <div class="fc">
    <div class="grid">
      <section class="panel">
        <h3>{{ tr('1. Crop and field', '1. 作物与地块') }}</h3>
        <label>{{ tr('Crop (fills typical values you can change)', '作物（自动填入典型值，可修改）') }}
          <select v-model="s.crop"><option v-for="c in CROPS" :key="c.id" :value="c.id">{{ tr(c.en, c.zh) }}</option></select></label>
        <div class="row2">
          <label>{{ tr('Area unit', '面积单位') }}
            <select v-model="unit"><option value="mu">{{ tr('mu (亩)', '亩') }}</option><option value="ha">{{ tr('hectare', '公顷') }}</option></select></label>
          <label>{{ tr('Field area', '种植面积') }} ({{ au }})<input v-model.number="s.area" type="number" min="0" step="any"></label>
        </div>
        <label>{{ tr('Yield', '产量') }} (kg/{{ au }})<input v-model.number="s.yieldPer" type="number" min="0" step="any"></label>
        <div class="row2">
          <label>{{ tr('Climate', '气候') }}
            <select v-model="s.climate"><option value="wet">{{ tr('Wet (most of S & E China)', '湿润（华南、华东大部）') }}</option><option value="dry">{{ tr('Dry (NW China, semi-arid)', '干旱（西北、半干旱区）') }}</option></select></label>
          <label class="chk"><input v-model="s.irrigated" type="checkbox"> {{ tr('Irrigated', '有灌溉') }}</label>
        </div>
      </section>

      <section class="panel">
        <h3>{{ tr('2. Fertiliser', '2. 肥料') }} <span class="fine">(kg / {{ au }})</span></h3>
        <div v-for="f in FERTS" :key="f.id" class="fert">
          <span class="fl">{{ tr(f.en, f.zh) }}</span>
          <input v-model.number="s.ferts[f.id].kg" type="number" min="0" step="any" :aria-label="tr(f.en, f.zh)">
          <span v-if="f.edit" class="npk">
            <input v-model.number="s.ferts[f.id].n" type="number" min="0" max="100" step="any" aria-label="N %">-<input v-model.number="s.ferts[f.id].p" type="number" min="0" max="100" step="any" aria-label="P2O5 %">-<input v-model.number="s.ferts[f.id].k" type="number" min="0" max="100" step="any" aria-label="K2O %">
          </span>
        </div>
        <p class="fine">{{ tr('Pure nutrients', '折纯量') }}: N {{ fx(res.nSyn / perHa, 1) }} + {{ tr('organic', '有机') }} {{ fx(res.nOrg / perHa, 1) }}, P2O5 {{ fx(res.P / perHa, 1) }}, K2O {{ fx(res.K / perHa, 1) }} kg/{{ au }}</p>
      </section>

      <section class="panel">
        <h3>{{ tr('3. Other inputs', '3. 其他投入') }} <span class="fine">(/ {{ au }})</span></h3>
        <div class="row2">
          <label>{{ tr('Diesel (L)', '柴油（升）') }}<input v-model.number="s.diesel" type="number" min="0" step="any"></label>
          <label>{{ tr('Electricity (kWh)', '电（度）') }}<input v-model.number="s.elec" type="number" min="0" step="any"></label>
          <label>{{ tr('Petrol (L)', '汽油（升）') }}<input v-model.number="s.petrol" type="number" min="0" step="any"></label>
          <label>{{ tr('Plastic film (kg)', '农膜/地膜（kg）') }}<input v-model.number="s.film" type="number" min="0" step="any"></label>
          <label>{{ tr('Pesticide active ingredient (kg)', '农药有效成分（kg）') }}<input v-model.number="s.pest" type="number" min="0" step="any"></label>
          <label>{{ tr('Lime (kg)', '石灰（kg）') }}<input v-model.number="s.lime" type="number" min="0" step="any"></label>
          <label>{{ tr('Greenhouse steel ÷ years of use (kg)', '大棚钢材 ÷ 使用年限（kg）') }}<input v-model.number="s.steel" type="number" min="0" step="any"></label>
          <label>{{ tr('Crop residue N returned (kg N)', '还田秸秆含氮（kg N）') }}<input v-model.number="s.residueN" type="number" min="0" step="any"></label>
        </div>
      </section>

      <section v-if="isRice" class="panel">
        <h3>{{ tr('4. Paddy methane', '4. 稻田甲烷') }}</h3>
        <div class="row2">
          <label>{{ tr('Region (IPCC)', '区域（IPCC）') }}<select v-model="s.rice.region"><option value="east_asia">{{ tr('East Asia', '东亚') }}</option><option value="se_asia">{{ tr('Southeast Asia', '东南亚') }}</option><option value="south_asia">{{ tr('South Asia', '南亚') }}</option><option value="global">{{ tr('Global default', '全球默认') }}</option></select></label>
          <label>{{ tr('Days flooded season', '生长期天数') }}<input v-model.number="s.rice.days" type="number" min="0"></label>
          <label>{{ tr('Water regime', '灌溉方式') }}<select v-model="s.rice.water"><option value="flooded">{{ tr('Continuously flooded', '持续淹水') }}</option><option value="single">{{ tr('Single drainage (烤田 once)', '单次排水（烤田一次）') }}</option><option value="multiple">{{ tr('Multiple drainage / AWD', '多次排水/干湿交替') }}</option><option value="rainfed">{{ tr('Regular rainfed', '雨养') }}</option><option value="drought">{{ tr('Drought-prone', '易旱') }}</option></select></label>
          <label>{{ tr('Before the season', '种植前') }}<select v-model="s.rice.pre"><option value="short">{{ tr('Not flooded < 180 days', '未淹水 < 180 天') }}</option><option value="long">{{ tr('Not flooded > 180 days', '未淹水 > 180 天') }}</option><option value="flooded">{{ tr('Flooded > 30 days', '淹水 > 30 天') }}</option><option value="over_year">{{ tr('Not flooded > 1 year (upland rotation)', '一年以上未淹水（水旱轮作）') }}</option></select></label>
          <label>{{ tr('Straw ploughed in < 30 d before (t dry/ha)', '种前 30 天内秸秆还田（吨干重/公顷）') }}<input v-model.number="s.rice.strawShort" type="number" min="0" step="any"></label>
          <label>{{ tr('Straw ploughed in > 30 d before (t dry/ha)', '种前 30 天以上秸秆还田（吨干重/公顷）') }}<input v-model.number="s.rice.strawLong" type="number" min="0" step="any"></label>
          <label>{{ tr('Farmyard manure (t fresh/ha)', '厩肥（吨鲜重/公顷）') }}<input v-model.number="s.rice.manure" type="number" min="0" step="any"></label>
          <label>{{ tr('Green manure (t fresh/ha)', '绿肥（吨鲜重/公顷）') }}<input v-model.number="s.rice.green" type="number" min="0" step="any"></label>
        </div>
        <p v-if="res.riceInfo" class="fine">{{ tr('Daily factor', '日排放因子') }} {{ fx(res.riceInfo.EFi, 3) }} kg CH4/ha/d · SFo {{ fx(res.riceInfo.SFo, 2) }} · {{ fx(res.riceInfo.kgCH4, 0) }} kg CH4/ha</p>
      </section>
    </div>

    <section class="out">
      <div class="big">
        <div><b>{{ fx(res.perKg, 3) }}</b><span>kg CO2e / kg {{ tr('product', '产品') }}</span></div>
        <div><b>{{ fx(res.perUnitArea, 0) }}</b><span>kg CO2e / {{ au }}</span></div>
        <div><b>{{ fx(res.farm / 1000, 2) }}</b><span>t CO2e {{ tr('for', '整块') }} {{ s.area }} {{ au }}</span></div>
      </div>
      <div class="bars">
        <div v-for="r in res.rows" :key="r.en" class="bar">
          <span class="bl">{{ tr(r.en, r.zh) }}</span>
          <span class="bt"><span class="bf" :style="{ width: (r.v / max * 100) + '%', background: COLORS[r.k] }"></span></span>
          <span class="bv">{{ fx(r.v / perHa, 1) }} <small>({{ fx(r.v / res.total * 100, 0) }}%)</small></span>
        </div>
      </div>
      <p class="fine">{{ tr('Bars: kg CO2e per', '条形图：每') }} {{ au }}. {{ tr('Farm gate: inputs + field emissions, no packing, transport or land-use change.', '农场大门边界：投入品 + 田间排放，不含包装、运输和土地利用变化。') }}</p>
      <p v-if="bench" class="fine">{{ tr('Context', '参考') }}: {{ tr('global median for this food, farm to retail incl. land-use change', '该类食品全球中位数（从农场到零售，含土地利用变化）') }} ≈ {{ bench }} kg CO2e/kg — {{ BENCH.src }}</p>
      <div class="actions">
        <button class="btn primary" @click="download">⬇ {{ tr('Download Excel (inputs, result, factors)', '下载 Excel（投入、结果、因子）') }}</button>
        <button class="btn" @click="s.showFactors = !s.showFactors">{{ s.showFactors ? tr('Hide factors', '隐藏因子') : tr('Edit factors', '修改因子') }}</button>
      </div>
      <div v-if="s.showFactors" class="tablewrap">
        <table>
          <thead><tr><th>{{ tr('Input', '投入品') }}</th><th>kg CO2e / {{ tr('unit', '单位') }}</th><th>{{ tr('Source', '来源') }}</th></tr></thead>
          <tbody><tr v-for="f in FARM_INPUTS" :key="f.id"><td>{{ tr(f.en, f.zh) }}</td><td class="nowrap"><input v-model.number="s.ef[f.id]" type="number" step="any" class="efin"> / {{ f.unit }}</td><td class="fine">{{ f.src }}</td></tr></tbody>
        </table>
        <button class="btn" @click="s.ef = { ...EF }">{{ tr('Reset factors', '恢复默认因子') }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fc { margin: 20px 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.panel, .out { border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 14px 16px; background: var(--vp-c-bg-soft); min-width: 0; }
.out { margin-top: 14px; }
h3 { margin: 0 0 10px !important; font-size: 1em; border: 0 !important; padding: 0 !important; }
label { display: flex; flex-direction: column; gap: 3px; font-size: .85em; color: var(--vp-c-text-2); margin-bottom: 8px; }
label.chk { flex-direction: row; align-items: center; gap: 6px; margin-top: 20px; }
input, select { border: 1px solid var(--vp-c-divider); border-radius: 7px; padding: 5px 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 1em; min-width: 0; }
.row2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0 10px; }
.fert { display: grid; grid-template-columns: 1fr 80px; gap: 6px; align-items: center; margin-bottom: 5px; font-size: .88em; }
.fert .npk { grid-column: 1 / -1; display: flex; gap: 3px; align-items: center; justify-content: flex-end; color: var(--vp-c-text-2); }
.fert .npk input { width: 52px; }
.fine { color: var(--vp-c-text-2); font-size: .82em; line-height: 1.5; }
.big { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.big div { flex: 1 1 150px; border-radius: 10px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); padding: 10px 14px; display: flex; flex-direction: column; }
.big b { font-size: 1.6em; line-height: 1.2; color: var(--vp-c-brand-1); }
.big span { font-size: .8em; color: var(--vp-c-text-2); }
.bar { display: grid; grid-template-columns: minmax(110px, 34%) 1fr auto; gap: 8px; align-items: center; font-size: .85em; margin: 4px 0; }
.bt { background: var(--vp-c-bg); border-radius: 4px; height: 12px; overflow: hidden; }
.bf { display: block; height: 100%; border-radius: 4px; }
.bv { white-space: nowrap; font-family: var(--vp-font-family-mono); font-size: .9em; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.btn { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 14px; font-weight: 500; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; }
.btn.primary { background: var(--vp-c-brand-3); border-color: var(--vp-c-brand-3); color: var(--vp-c-white); }
.tablewrap { overflow-x: auto; }
.tablewrap table { display: table; width: 100%; font-size: .85em; }
.efin { width: 80px; }
.nowrap { white-space: nowrap; }
</style>
