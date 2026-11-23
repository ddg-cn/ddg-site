<script setup>
import { ref, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import GlanceBars from './GlanceBars.vue'

const props = defineProps({ lang: { type: String, default: 'en' } })
const zh = props.lang === 'zh'
const T = zh ? {
  loading: '加载中…', failed: '数据加载失败。', built: '数据整理于', asOf: '数据截至', source: '来源',
  tiles: { sbti: 'SBTi 企业', sbtiSub: '{a} 家已设定近期目标，{b} 家已设定净零目标', cdp: 'CDP A 名单（2025）', cdpSub: '约 {a} 家评分企业中的 {b}%', ev: 'EcoVadis 已评级企业', evSub: '2024 年平均分 {a}', re: 'RE100 成员', reSub: '承诺 100% 使用可再生电力；{a} 家经核实已达 100%', irma: 'IRMA 评估矿山', irmaSub: '{a} 家达到 IRMA 100', rmi: 'RMI 冶炼/精炼厂', rmiSub: '{a} 家为“符合”状态' },
  sbtiH: 'SBTi：谁设定了科学碳目标', angle: '分组方式', measure: '指标', all: '全部',
  region: '地区', country: '国家/地区', sector: '行业', type: '组织类型', status: '近期目标状态', ambition: '近期目标雄心', netzero: '净零目标状态', year: '最近更新年份',
  mCount: '企业数', mNz: '已设定净零目标的比例', mAmb: '1.5°C 目标的比例（已设定目标者）', mRemoved: '承诺被移除的比例',
  sel: '当前筛选：{n} 家企业 · {a}% 已设定近期目标 · {b}% 已设定净零目标 · {c}% 承诺已移除',
  table: '查看表格', more: '另有 {n} 组（共 {c} 家企业）未显示。', showAll: '显示全部', showTop: '只显示前 15 组', chart: '查看图表', other: '其他（{n} 项）', yearNote: '“最近更新年份”是 SBTi 最后一次更新该企业记录的年份，不等于目标获批年份。',
  cdpH: 'CDP：A 名单增长，评分企业减少', cdpYear: 'A 名单企业数', cdpTheme: '2025 年各主题 A 评分数', cdpMarket: '进入 A 名单的评分企业比例（最高的市场）', tripleA: '三项 A：2024 年 {a} 家 → 2025 年 {b} 家',
  evH: 'EcoVadis：按比例颁发的奖牌', evMedal: '获得奖牌需进入的前百分比', evAvg: '平均分（满分 100）', evProc: '最弱的主题是可持续采购：全球平均约 {a} 分。',
  g1: '气候目标、承诺与 ESG 评级', g1Sub: '企业层面的气候目标、可再生电力承诺、信息披露和可持续发展管理评级。',
  reH: 'RE100：承诺 100% 可再生电力的企业', reHq: '总部所在国家 / 地区', reInd: '行业', reTarget: '实现 100% 的目标年份', reJoin: '各年加入（现有成员）', reMix: '可再生电力来源结构（{y} 报告，TWh）',
  reFacts: '{t}：{r} 家成员报告用电 {w} TWh，报告的可再生电力占 {p}%，按 RE100 技术标准认可的占 {q}%；{v} 家经核实达到 100%。采购最难的市场：{h}。', reNote: '加入年份只统计现有成员，已退出的企业不在名单中。',
  g2: '负责任矿产尽职调查', g2Sub: '矿山和冶炼/精炼厂层面的尽职调查，同时涵盖社会议题（人权、劳工、社区、冲突）和环境议题（水、尾矿、生物多样性）。',
  irmaH: 'IRMA：独立评估的矿山', irmaLevel: '达成等级', irmaRegion: '所在地区（约数）',
  rmiH: 'RMI：负责任矿产冶炼/精炼厂', metal: '金属', level: '供应链环节', rstatus: '尽职调查评估状态', facilities: '家工厂',
  pctOf: '{v}%（{n}/{d}）', countTip: '{n} 家，占 {p}%',
} : {
  loading: 'Loading…', failed: 'The data could not be loaded.', built: 'Data compiled', asOf: 'Data as of', source: 'Source',
  tiles: { sbti: 'SBTi companies', sbtiSub: '{a} with near-term targets set, {b} with net-zero targets set', cdp: 'CDP A List (2025)', cdpSub: '{b}% of about {a} scored companies', ev: 'EcoVadis-rated companies', evSub: 'average score {a} in 2024', re: 'RE100 members', reSub: 'committed to 100% renewable electricity; {a} verified at 100%', irma: 'IRMA-assessed mines', irmaSub: '{a} at IRMA 100', rmi: 'RMI smelters and refiners', rmiSub: '{a} conformant' },
  sbtiH: 'SBTi: who has science-based targets', angle: 'Break down by', measure: 'Measure', all: 'All',
  region: 'Region', country: 'Country / area', sector: 'Sector', type: 'Organisation type', status: 'Near-term status', ambition: 'Near-term ambition', netzero: 'Net-zero status', year: 'Year last updated',
  mCount: 'Companies', mNz: 'Share with a net-zero target set', mAmb: 'Share at 1.5°C (of targets set)', mRemoved: 'Share with commitment removed',
  sel: 'Selection: {n} companies · {a}% near-term targets set · {b}% net-zero targets set · {c}% commitment removed',
  table: 'Show table', more: '{n} more groups ({c} companies) not shown.', showAll: 'Show all', showTop: 'Show top 15 only', chart: 'Show chart', other: 'Other ({n} groups)', yearNote: '"Year last updated" is when SBTi last updated the company record, not the year the target was approved.',
  cdpH: 'CDP: a bigger A List from a smaller pool', cdpYear: 'Companies on the A List', cdpTheme: 'A scores by theme, 2025', cdpMarket: 'Share of a market\'s scored companies on the A List (top markets)', tripleA: 'Triple A: {a} in 2024 → {b} in 2025',
  evH: 'EcoVadis: medals graded on a curve', evMedal: 'Medal = top percentile of rated companies', evAvg: 'Average score (out of 100)', evProc: 'The weakest theme is Sustainable Procurement: about {a} on average worldwide.',
  g1: 'Climate targets, commitments & ESG ratings', g1Sub: 'Company-level climate targets, renewable electricity commitments, disclosure and sustainability management ratings.',
  reH: 'RE100: companies committed to 100% renewable electricity', reHq: 'Headquarters', reInd: 'Industry', reTarget: 'Target year for 100%', reJoin: 'Joined per year (current members)', reMix: 'Where renewable electricity comes from ({y} report, TWh)',
  reFacts: '{t}: {r} members reported {w} TWh of electricity use; {p}% was reported as renewable and {q}% met RE100’s technical criteria; {v} were verified at 100%. Hardest markets to source in: {h}.', reNote: 'Joining years count current members only; companies that left are not on the list.',
  g2: 'Responsible minerals due diligence', g2Sub: 'Site-level due diligence at mines, smelters and refiners, covering social issues (human rights, labour, communities, conflict) and environmental issues (water, tailings, biodiversity) together.',
  irmaH: 'IRMA: independently assessed mines', irmaLevel: 'Achievement level', irmaRegion: 'Location (approximate)',
  rmiH: 'RMI: responsible minerals smelters and refiners', metal: 'Metal', level: 'Supply-chain level', rstatus: 'Due diligence assessment status', facilities: 'facilities',
  pctOf: '{v}% ({n} of {d})', countTip: '{n} companies, {p}% of the selection',
}
const f = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const num = v => v == null ? '—' : v.toLocaleString(zh ? 'zh-CN' : 'en-US')
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0

const data = ref(null)
const err = ref(false)
onMounted(async () => {
  try { const r = await fetch(withBase('/data/esg-glance.json')); if (!r.ok) throw new Error(r.status); data.value = await r.json() } catch (e) { err.value = true }
})

// ---------- SBTi explorer ----------
const D = ['region', 'country', 'sector', 'type', 'status', 'ambition', 'netzero', 'year']
const angle = ref('region')
const measure = ref('count')
const filt = ref({ region: -1, sector: -1, type: -1 })
const showTable = ref(false)
const S = computed(() => data.value?.sbti)
const dimVals = k => S.value ? S.value.dims[k] : []
const cells = computed(() => {
  if (!S.value) return []
  const fx = filt.value
  return S.value.cube.filter(c => (fx.region < 0 || c[0] === fx.region) && (fx.sector < 0 || c[2] === fx.sector) && (fx.type < 0 || c[3] === fx.type))
})
const idx = k => D.indexOf(k)
const code = (k, v) => dimVals(k).indexOf(v)
const summary = computed(() => {
  let n = 0, set = 0, nz = 0, rem = 0
  const sSet = code('status', 'Targets set'), sRem = code('status', 'Commitment removed'), zSet = code('netzero', 'Targets set')
  for (const c of cells.value) { const k = c[8]; n += k; if (c[4] === sSet) set += k; if (c[4] === sRem) rem += k; if (c[6] === zSet) nz += k }
  return { n, set, nz, rem }
})
const bars = computed(() => {
  if (!S.value) return []
  const di = idx(angle.value), vals = dimVals(angle.value)
  const g = new Map()
  const sSet = code('status', 'Targets set'), sRem = code('status', 'Commitment removed'), zSet = code('netzero', 'Targets set'), a15 = code('ambition', '1.5°C')
  for (const c of cells.value) {
    const k = c[di]; const o = g.get(k) || { n: 0, set: 0, nz: 0, amb: 0, rem: 0 }
    o.n += c[8]; if (c[4] === sSet) { o.set += c[8]; if (c[5] === a15) o.amb += c[8] } if (c[4] === sRem) o.rem += c[8]; if (c[6] === zSet) o.nz += c[8]
    g.set(k, o)
  }
  const tot = summary.value.n
  let list = [...g].map(([k, o]) => {
    const label = vals[k] === 0 ? (zh ? '未知' : 'Unknown') : String(vals[k])
    let v, tip
    if (measure.value === 'count') { v = o.n; tip = f(T.countTip, { n: num(o.n), p: pct(o.n, tot) }) }
    else if (measure.value === 'nz') { v = pct(o.nz, o.n); tip = f(T.pctOf, { v, n: num(o.nz), d: num(o.n) }) }
    else if (measure.value === 'amb') { v = pct(o.amb, o.set); tip = f(T.pctOf, { v, n: num(o.amb), d: num(o.set) }) }
    else { v = pct(o.rem, o.n); tip = f(T.pctOf, { v, n: num(o.rem), d: num(o.n) }) }
    return { k: String(k), label, v, n: o.n, tip, raw: vals[k] }
  })
  if (angle.value === 'year') return list.filter(x => x.raw !== 0).sort((a, b) => a.raw - b.raw)
  // shares are only meaningful for groups with enough companies
  if (measure.value !== 'count') list = list.filter(x => x.n >= 20)
  list.sort((a, b) => b.v - a.v)
  return list
})
const LIM = 15
const showAll = ref(false)
const shownBars = computed(() => (showAll.value || bars.value.length <= LIM + 2 ? bars.value : bars.value.slice(0, LIM)))
const hiddenNote = computed(() => {
  const rest = bars.value.slice(shownBars.value.length)
  return rest.length ? f(T.more, { n: rest.length, c: num(rest.reduce((a, x) => a + x.n, 0)) }) : ''
})
const unit = computed(() => (measure.value === 'count' ? '' : '%'))

// ---------- RMI explorer ----------
const rAngle = ref(0) // 0 metal, 1 country, 2 level, 3 status
const rMetal = ref('')
const R = computed(() => data.value?.rmi)
const metals = computed(() => R.value ? [...new Set(R.value.rows.map(r => r[0]))].sort() : [])
const rBars = computed(() => {
  if (!R.value) return []
  const g = new Map(); let tot = 0
  for (const r of R.value.rows) { if (rMetal.value && r[0] !== rMetal.value) continue; g.set(r[rAngle.value], (g.get(r[rAngle.value]) || 0) + r[4]); tot += r[4] }
  const list = [...g].map(([k, v]) => ({ k, v, tip: f(T.countTip, { n: v, p: pct(v, tot) }).replace(zh ? '家' : 'companies', zh ? '家' : T.facilities) })).sort((a, b) => b.v - a.v)
  return list.slice(0, 20)
})
const rmiConformant = computed(() => R.value ? R.value.rows.filter(r => r[3] === 'Conformant').reduce((a, r) => a + r[4], 0) : 0)

const L = (o) => (zh && o.zh) || o.k
</script>

<template>
  <div class="eg">
    <p v-if="err" class="muted">{{ T.failed }}</p>
    <p v-else-if="!data" class="muted">{{ T.loading }}</p>
    <template v-else>
      <p class="muted">{{ T.built }} {{ data.built }}</p>

      <h2 id="climate" class="grp">{{ T.g1 }}</h2>
      <p class="muted">{{ T.g1Sub }}</p>
      <div class="tiles">
        <div class="tile"><div class="tl">{{ T.tiles.sbti }}</div><div class="tv">{{ num(data.sbti.companies) }}</div><div class="ts">{{ f(T.tiles.sbtiSub, { a: num(data.sbti.cube.filter(c => c[4] === data.sbti.dims.status.indexOf('Targets set')).reduce((a, c) => a + c[8], 0)), b: num(data.sbti.cube.filter(c => c[6] === data.sbti.dims.netzero.indexOf('Targets set')).reduce((a, c) => a + c[8], 0)) }) }}</div></div>
        <div class="tile"><div class="tl">{{ T.tiles.cdp }}</div><div class="tv">{{ num(data.cdp.aList.at(-1).n) }}</div><div class="ts">{{ f(T.tiles.cdpSub, { a: num(data.cdp.scored.at(-1).n), b: pct(data.cdp.aList.at(-1).n, data.cdp.scored.at(-1).n) }) }}</div></div>
        <div class="tile"><div class="tl">{{ T.tiles.ev }}</div><div class="tv">{{ num(data.ecovadis.rated) }}+</div><div class="ts">{{ f(T.tiles.evSub, { a: data.ecovadis.avgScores.find(x => /Global/.test(x.k))?.v }) }}</div></div>
        <div v-if="data.re100" class="tile"><div class="tl">{{ T.tiles.re }}</div><div class="tv">{{ num(data.re100.members) }}</div><div class="ts">{{ f(T.tiles.reSub, { a: data.re100.report.verified100 }) }}</div></div>
      </div>

      <!-- SBTi -->
      <h3 id="sbti">{{ T.sbtiH }}</h3>
      <div class="ctrl">
        <label>{{ T.region }} <select v-model.number="filt.region"><option :value="-1">{{ T.all }}</option><option v-for="(v, i) in data.sbti.dims.region" :key="v" :value="i">{{ v }}</option></select></label>
        <label>{{ T.sector }} <select v-model.number="filt.sector"><option :value="-1">{{ T.all }}</option><option v-for="(v, i) in data.sbti.dims.sector" :key="v" :value="i">{{ v }}</option></select></label>
        <label>{{ T.type }} <select v-model.number="filt.type"><option :value="-1">{{ T.all }}</option><option v-for="(v, i) in data.sbti.dims.type" :key="v" :value="i">{{ v }}</option></select></label>
      </div>
      <div class="ctrl">
        <span class="cl">{{ T.angle }}</span>
        <button v-for="k in D" :key="k" class="seg" :class="{ on: angle === k }" :aria-pressed="angle === k" @click="angle = k">{{ T[k] }}</button>
      </div>
      <div class="ctrl">
        <span class="cl">{{ T.measure }}</span>
        <button v-for="m in [['count', T.mCount], ['nz', T.mNz], ['amb', T.mAmb], ['removed', T.mRemoved]]" :key="m[0]" class="seg" :class="{ on: measure === m[0] }" :aria-pressed="measure === m[0]" @click="measure = m[0]">{{ m[1] }}</button>
      </div>
      <p class="sel">{{ f(T.sel, { n: num(summary.n), a: pct(summary.set, summary.n), b: pct(summary.nz, summary.n), c: pct(summary.rem, summary.n) }) }}</p>
      <GlanceBars v-if="!showTable" :items="shownBars" :unit="unit" :digits="measure === 'count' ? 0 : 1" :max="measure === 'count' ? 0 : 100" :lang="lang" />
      <div v-else class="tw"><table><thead><tr><th>{{ T[angle] }}</th><th class="num">{{ measure === 'count' ? T.mCount : (measure === 'nz' ? T.mNz : measure === 'amb' ? T.mAmb : T.mRemoved) }}</th></tr></thead>
        <tbody><tr v-for="b in bars" :key="b.k"><td>{{ b.label }}</td><td class="num">{{ b.v.toLocaleString() }}{{ unit }}</td></tr></tbody></table></div>
      <p v-if="hiddenNote && !showTable" class="muted">{{ hiddenNote }} <button class="link" @click="showAll = true">{{ T.showAll }}</button></p>
      <p v-else-if="showAll && bars.length > LIM + 2 && !showTable" class="muted"><button class="link" @click="showAll = false">{{ T.showTop }}</button></p>
      <p class="muted"><button class="link" @click="showTable = !showTable">{{ showTable ? T.chart : T.table }}</button> · <span v-if="angle === 'year'">{{ T.yearNote }} · </span>{{ T.source }}: <a :href="data.sbti.url" target="_blank" rel="noopener">{{ data.sbti.source }}</a>, {{ T.asOf }} {{ data.sbti.asOf }}</p>

      <!-- CDP -->
      <h3 id="cdp">{{ T.cdpH }}</h3>
      <div class="grid2">
        <div><h4>{{ T.cdpYear }}</h4><GlanceBars :items="data.cdp.aList.map(x => ({ k: String(x.year), v: x.n, tip: (data.cdp.scored.find(s => s.year === x.year) ? pct(x.n, data.cdp.scored.find(s => s.year === x.year).n) + '%' : '') }))" :lang="lang" /></div>
        <div><h4>{{ T.cdpTheme }}</h4><GlanceBars :items="data.cdp.themes2025.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
      </div>
      <h4>{{ T.cdpMarket }}</h4>
      <GlanceBars :items="data.cdp.marketShare.map(x => ({ k: x.k, label: L(x), v: x.pct }))" unit="%" :max="20" :lang="lang" />
      <p class="muted">{{ f(T.tripleA, { a: data.cdp.tripleA[0].n, b: data.cdp.tripleA.at(-1).n }) }} · {{ T.source }}: <a :href="data.cdp.url" target="_blank" rel="noopener">{{ data.cdp.source }}</a>, {{ data.cdp.asOf }}</p>

      <!-- EcoVadis -->
      <h3 id="ecovadis">{{ T.evH }}</h3>
      <div class="grid2">
        <div><h4>{{ T.evMedal }}</h4><GlanceBars :items="data.ecovadis.medals.map(x => ({ k: x.k, label: L(x), v: x.top }))" unit="%" :max="100" :lang="lang" /></div>
        <div><h4>{{ T.evAvg }}</h4><GlanceBars :items="data.ecovadis.avgScores.map(x => ({ k: x.k, label: L(x), v: x.v }))" :max="100" :digits="1" :lang="lang" /></div>
      </div>
      <p class="muted">{{ f(T.evProc, { a: data.ecovadis.procurement }) }} {{ T.source }}: <a :href="data.ecovadis.url" target="_blank" rel="noopener">{{ data.ecovadis.source }}</a>, {{ data.ecovadis.asOf }}</p>

      <!-- RE100 -->
      <template v-if="data.re100">
        <h3 id="re100">{{ T.reH }}</h3>
        <div class="grid2">
          <div><h4>{{ T.reHq }}</h4><GlanceBars :items="data.re100.hq.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
          <div><h4>{{ T.reInd }}</h4><GlanceBars :items="data.re100.industry.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
          <div><h4>{{ T.reTarget }}</h4><GlanceBars :items="data.re100.target.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
          <div><h4>{{ T.reJoin }}</h4><GlanceBars :items="data.re100.joins.map(x => ({ k: String(x.year), v: x.n }))" :lang="lang" /></div>
        </div>
        <p class="muted">{{ T.reNote }} {{ T.source }}: <a :href="data.re100.url" target="_blank" rel="noopener">{{ data.re100.source }}</a>, {{ data.re100.asOf }}</p>
        <h4>{{ f(T.reMix, { y: data.re100.report.published }) }}</h4>
        <GlanceBars :items="data.re100.report.mix.map(x => ({ k: x.k, label: L(x), v: x.twh, tip: x.pct + '%' }))" :lang="lang" />
        <p class="muted">{{ f(T.reFacts, { t: data.re100.report.title, r: data.re100.report.reporting, w: data.re100.report.twh, p: data.re100.report.reportedPct, q: data.re100.report.recognisedPct, v: data.re100.report.verified100, h: data.re100.report.hardest.map(x => L(x) + ' (' + x.n + ')').join(', ') }) }} {{ T.source }}: <a :href="data.re100.report.url" target="_blank" rel="noopener">{{ data.re100.report.title }}</a>, {{ data.re100.report.pages }}</p>
      </template>

      <h2 id="minerals" class="grp">{{ T.g2 }}</h2>
      <p class="muted">{{ T.g2Sub }}</p>
      <div class="tiles">
        <div class="tile"><div class="tl">{{ T.tiles.irma }}</div><div class="tv">{{ data.irma.sites }}</div><div class="ts">{{ f(T.tiles.irmaSub, { a: data.irma.levels.find(x => x.k === 'IRMA 100')?.n ?? 0 }) }}</div></div>
        <div class="tile"><div class="tl">{{ T.tiles.rmi }}</div><div class="tv">{{ num(data.rmi.facilities) }}</div><div class="ts">{{ f(T.tiles.rmiSub, { a: num(rmiConformant) }) }}</div></div>
      </div>

      <!-- IRMA -->
      <h3 id="irma">{{ T.irmaH }}</h3>
      <div class="grid2">
        <div><h4>{{ T.irmaLevel }}</h4><GlanceBars :items="data.irma.levels.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
        <div><h4>{{ T.irmaRegion }}</h4><GlanceBars :items="data.irma.regions.map(x => ({ k: x.k, label: L(x), v: x.n }))" :lang="lang" /></div>
      </div>
      <p class="muted">{{ T.source }}: <a :href="data.irma.url" target="_blank" rel="noopener">{{ data.irma.source }}</a>, {{ data.irma.asOf }}</p>

      <!-- RMI -->
      <h3 id="rmi">{{ T.rmiH }}</h3>
      <div class="ctrl">
        <label>{{ T.metal }} <select v-model="rMetal"><option value="">{{ T.all }}</option><option v-for="m in metals" :key="m" :value="m">{{ m }}</option></select></label>
      </div>
      <div class="ctrl">
        <span class="cl">{{ T.angle }}</span>
        <button v-for="(k, i) in [T.metal, T.country, T.level, T.rstatus]" :key="i" class="seg" :class="{ on: rAngle === i }" :aria-pressed="rAngle === i" @click="rAngle = i">{{ k }}</button>
      </div>
      <GlanceBars :items="rBars" :lang="lang" />
      <p class="muted">{{ T.source }}: <a :href="data.rmi.url" target="_blank" rel="noopener">{{ data.rmi.source }}</a>, {{ T.asOf }} {{ data.rmi.asOf }}</p>
    </template>
  </div>
</template>

<style scoped>
.eg { margin-top: 16px; }
.muted { color: var(--vp-c-text-2); font-size: 13px; }
.grp { margin-top: 32px; border-top: none; padding-top: 0; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 12px 0 8px; }
.tile { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 10px 12px; background: var(--vp-c-bg-soft); }
.tl { font-size: 12px; color: var(--vp-c-text-2); }
.tv { font-size: 26px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.ts { font-size: 12px; color: var(--vp-c-text-2); line-height: 1.35; }
.ctrl { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; margin: 8px 0; font-size: 13px; }
.ctrl label { display: flex; gap: 6px; align-items: center; }
.ctrl select { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 3px 8px; background: var(--vp-c-bg); color: var(--vp-c-text-1); max-width: 220px; }
.cl { color: var(--vp-c-text-2); }
.seg { border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: 2px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; font-size: 12.5px; }
.seg.on { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.sel { font-size: 13px; margin: 6px 0; font-weight: 500; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px 24px; }
.eg h4 { margin: 12px 0 2px; font-size: 14px; }
.tw { overflow-x: auto; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.link { background: none; border: none; padding: 0; color: var(--vp-c-brand-1); cursor: pointer; font-size: inherit; }
</style>
