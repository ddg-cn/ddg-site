<script setup>
import { ref, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({ lang: { type: String, default: 'en' } })
const zh = props.lang === 'zh'
const T = zh ? {
  loading: '加载中…', failed: '数据加载失败。', updated: '数据更新于',
  chart: '各项目每年审核 / 评估数量', program: '项目', year: '年份', latest: '最新数据',
  source: '来源', noData: '暂无', metric: '指标',
  m: { 'Audits': '审核 / 评估', 'Members': '会员', 'Operating countries': '覆盖国家', 'Producers - all': '工厂 / 场所', 'Workers Covered (mil.)': '覆盖工人（百万）', 'Brands accepting data': '接受数据的品牌' },
} : {
  loading: 'Loading…', failed: 'The data could not be loaded.', updated: 'Data updated',
  chart: 'Audits or assessments per year, by program', program: 'Program', year: 'Year', latest: 'Latest figures',
  source: 'Source', noData: '—', metric: 'Metric',
  m: { 'Audits': 'Audits / assessments', 'Members': 'Members', 'Operating countries': 'Countries', 'Producers - all': 'Facilities / sites', 'Workers Covered (mil.)': 'Workers covered (m)', 'Brands accepting data': 'Brands accepting data' },
}
const METRICS = ['Audits', 'Members', 'Operating countries', 'Producers - all', 'Workers Covered (mil.)', 'Brands accepting data']

const data = ref(null)
const err = ref(false)
const hover = ref(null)
onMounted(async () => {
  try {
    const r = await fetch(withBase('/data/peer-programs.json'))
    if (!r.ok) throw new Error(r.status)
    data.value = await r.json()
  } catch (e) { err.value = true }
})

const fmt = (v) => v == null ? '—' : (v % 1 ? v.toLocaleString(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 }) : v.toLocaleString(zh ? 'zh-CN' : 'en-US'))
const short = (v) => v >= 1000 ? (Math.round(v / 100) / 10) + 'k' : String(v)

const programs = computed(() => {
  if (!data.value) return []
  const set = [...new Set(data.value.rows.map((r) => r.program))]
  return set.sort()
})

// latest figure per program x metric
const table = computed(() => {
  if (!data.value) return []
  return programs.value.map((p) => {
    const rows = data.value.rows.filter((r) => r.program === p)
    const cells = METRICS.map((m) => rows.filter((r) => r.metric === m).sort((a, b) => b.year - a.year)[0] || null)
    const site = rows.find((r) => r.website)?.website
    const src = rows.filter((r) => r.source_url).sort((a, b) => b.year - a.year)[0]
    return { p, cells, site, src }
  }).filter((r) => r.cells.some(Boolean))
})
const shownMetrics = computed(() => METRICS.map((m, i) => ({ m, i })).filter(({ i }) => table.value.some((r) => r.cells[i])))

// chart geometry (viewBox units)
const W = 720, H = 360, M = { t: 12, r: 92, b: 28, l: 48 }
const chart = computed(() => {
  if (!data.value) return null
  const rows = data.value.rows.filter((r) => r.metric === 'Audits')
  const y0 = Math.min(...rows.map((r) => r.year)), y1 = Math.max(...rows.map((r) => r.year))
  const vmax = Math.max(...rows.map((r) => r.value))
  const stepV = Math.pow(10, Math.floor(Math.log10(vmax / 4)))
  const tickStep = [1, 2, 5, 10].map((k) => k * stepV).find((s) => vmax / s <= 6)
  const top = Math.ceil(vmax / tickStep) * tickStep
  const x = (yr) => M.l + (yr - y0) / Math.max(1, y1 - y0) * (W - M.l - M.r)
  const y = (v) => H - M.b - v / top * (H - M.t - M.b)
  const series = programs.value.map((p) => {
    const pts = rows.filter((r) => r.program === p).sort((a, b) => a.year - b.year).map((r) => ({ ...r, x: x(r.year), y: y(r.value) }))
    return { p, pts, d: pts.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(1) + ',' + q.y.toFixed(1)).join('') }
  }).filter((s) => s.pts.length)
  // end labels nudged apart
  const ends = series.map((s) => ({ p: s.p, last: s.pts[s.pts.length - 1], ly: s.pts[s.pts.length - 1].y })).sort((a, b) => a.ly - b.ly)
  // nudge apart only labels that end in the same year, and keep them above the x axis
  const byX = {}
  ends.forEach((e) => (byX[e.last.x] ||= []).push(e))
  Object.values(byX).forEach((g) => {
    for (let i = 1; i < g.length; i++) if (g[i].ly - g[i - 1].ly < 13) g[i].ly = g[i - 1].ly + 13
    for (let i = g.length - 1; i >= 0; i--) {
      const lim = H - M.b - 6 - (g.length - 1 - i) * 13
      if (g[i].ly > lim) g[i].ly = lim
    }
  })
  const yt = []; for (let v = 0; v <= top; v += tickStep) yt.push({ v, y: y(v) })
  const xt = []; for (let v = y0; v <= y1; v++) xt.push({ v, x: x(v) })
  return { series, ends, yt, xt }
})
</script>

<template>
  <div class="pp">
    <p v-if="err" class="pp-muted">{{ T.failed }}</p>
    <p v-else-if="!data" class="pp-muted">{{ T.loading }}</p>
    <template v-else>
      <p class="pp-muted">{{ T.updated }} {{ data.updated }}</p>

      <h3>{{ T.chart }}</h3>
      <div class="pp-chart">
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="T.chart">
          <g v-for="t in chart.yt" :key="'y' + t.v">
            <line :x1="M.l" :x2="W - M.r" :y1="t.y" :y2="t.y" class="grid" />
            <text :x="M.l - 6" :y="t.y + 4" text-anchor="end" class="tick">{{ short(t.v) }}</text>
          </g>
          <text v-for="t in chart.xt" :key="'x' + t.v" :x="t.x" :y="H - 8" text-anchor="middle" class="tick">{{ t.v }}</text>
          <g v-for="s in chart.series" :key="s.p" :class="{ hl: hover === s.p, dim: hover && hover !== s.p }"
             @mouseenter="hover = s.p" @mouseleave="hover = null">
            <path :d="s.d" class="line" />
            <circle v-for="q in s.pts" :key="q.year" :cx="q.x" :cy="q.y" r="3.5" class="dot">
              <title>{{ s.p }} {{ q.year }}: {{ fmt(q.value) }}{{ q.note ? ' (' + q.note + ')' : '' }}</title>
            </circle>
          </g>
          <text v-for="e in chart.ends" :key="'l' + e.p" :x="e.last.x + 7" :y="e.ly + 4" class="end"
                :class="{ hl: hover === e.p }">{{ e.p }} {{ short(e.last.value) }}</text>
        </svg>
      </div>

      <h3>{{ T.latest }}</h3>
      <div class="pp-tw">
        <table>
          <thead>
            <tr>
              <th>{{ T.program }}</th>
              <th v-for="c in shownMetrics" :key="c.m">{{ T.m[c.m] }}</th>
              <th>{{ T.source }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in table" :key="r.p">
              <td>{{ r.p }}</td>
              <td v-for="c in shownMetrics" :key="c.m" class="num">
                <template v-if="r.cells[c.i]">{{ fmt(r.cells[c.i].value) }} <span class="yr">{{ r.cells[c.i].year }}</span></template>
                <template v-else>{{ T.noData }}</template>
              </td>
              <td class="src">
                <a v-if="r.src" :href="r.src.source_url" target="_blank" rel="noopener">{{ r.src.year }}</a>
                <a v-else-if="r.site" :href="'https://' + r.site" target="_blank" rel="noopener">{{ r.site }}</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pp { margin-top: 16px; }
.pp-muted { color: var(--vp-c-text-2); font-size: 14px; }
.pp-chart svg { width: 100%; height: auto; display: block; }
.grid { stroke: var(--vp-c-divider); stroke-width: 1; }
.tick { fill: var(--vp-c-text-2); font-size: 11px; }
.line { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.6; }
.dot { fill: var(--vp-c-text-3); }
.hl .line { stroke: var(--vp-c-brand-1); stroke-width: 3; }
.hl .dot { fill: var(--vp-c-brand-1); }
.dim { opacity: .35; }
.end { fill: var(--vp-c-text-2); font-size: 11px; }
.end.hl { fill: var(--vp-c-brand-1); font-weight: 600; }
.pp-tw { overflow-x: auto; }
.pp table { font-variant-numeric: tabular-nums; }
.pp td.num { text-align: right; white-space: nowrap; }
.pp .yr { color: var(--vp-c-text-3); font-size: 11px; margin-left: 2px; }
.pp td.src { white-space: nowrap; }
</style>
