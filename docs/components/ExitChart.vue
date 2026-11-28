<script setup>
// Single-series year chart (bars or line) for the Responsible Exit guide.
// Estimates are hatched and flagged; hover shows value + note; a table view is one click away.
import { computed, ref } from 'vue'
const props = defineProps({
  data: { type: Array, required: true },   // [{ x: '2020', v: 12.3, est: false, tip: 'source / note' }]
  unit: { type: String, default: '' },     // suffix shown after values, e.g. ' bn USD'
  mode: { type: String, default: 'bar' },  // 'bar' | 'line'
  digits: { type: Number, default: 0 },
  lang: { type: String, default: 'en' },
  label: { type: String, default: '' },    // accessible name
  note: { type: String, default: '' },     // caption under the chart
})
const W = 640, H = 240, L = 48, R = 12, T = 14, B = 30
const hover = ref(null)
const showTable = ref(false)
const zh = computed(() => props.lang === 'zh')
const vals = computed(() => props.data.map(d => d.v).filter(v => v != null))
const niceMax = computed(() => {
  const m = Math.max(1e-9, ...vals.value)
  const p = Math.pow(10, Math.floor(Math.log10(m)))
  for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * p >= m) return s * p
  return 10 * p
})
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map(f => f * niceMax.value))
const n = computed(() => props.data.length)
const band = computed(() => (W - L - R) / n.value)
const bw = computed(() => Math.min(36, band.value * 0.62))
const xc = i => L + band.value * (i + 0.5)
const y = v => T + (H - T - B) * (1 - v / niceMax.value)
const fmt = v => v == null ? '—' : Number(v).toLocaleString(zh.value ? 'zh-CN' : 'en-US', { maximumFractionDigits: props.digits, minimumFractionDigits: props.digits })
const short = v => {
  const a = Math.abs(v)
  if (a >= 1e9) return fmt(v / 1e9) + (zh.value ? '十亿' : 'bn')
  if (a >= 1e6) return (v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'm'
  if (a >= 1e4) return (v / 1e3).toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'k'
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: props.digits })
}
const barPath = (i, v) => {
  const x0 = xc(i) - bw.value / 2, x1 = x0 + bw.value, y0 = y(0), y1 = y(v)
  const r = Math.min(4, (y0 - y1) / 2, bw.value / 2)
  if (y0 - y1 < 0.5) return ''
  return `M${x0},${y0}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x1 - r}Q${x1},${y1} ${x1},${y1 + r}V${y0}Z`
}
const linePts = computed(() => props.data.map((d, i) => d.v == null ? null : [xc(i), y(d.v)]))
const lineD = computed(() => {
  let s = '', pen = false
  for (const p of linePts.value) { if (!p) { pen = false; continue } s += (pen ? 'L' : 'M') + p[0] + ',' + p[1]; pen = true }
  return s
})
const anyEst = computed(() => props.data.some(d => d.est))
const showEvery = computed(() => Math.ceil(n.value / 12))
const hv = computed(() => hover.value == null ? null : props.data[hover.value])
const tipX = computed(() => hover.value == null ? 0 : Math.min(Math.max(xc(hover.value) / W * 100, 18), 82))
const uid = 'h' + Math.random().toString(36).slice(2, 8)
</script>

<template>
  <figure class="ec">
    <div class="wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label" @mouseleave="hover = null">
        <defs>
          <pattern :id="uid" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" class="estbg" /><line x1="0" y1="0" x2="0" y2="6" class="esthatch" stroke-width="2.4" />
          </pattern>
        </defs>
        <g class="grid">
          <g v-for="t in ticks" :key="t">
            <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" />
            <text :x="L - 6" :y="y(t) + 4" text-anchor="end">{{ short(t) }}</text>
          </g>
        </g>
        <template v-if="mode === 'bar'">
          <path v-for="(d, i) in data" :key="'b' + i" v-show="d.v != null" :d="barPath(i, d.v || 0)"
                :class="['bar', { est: d.est, dim: hover != null && hover !== i }]" :style="d.est ? { fill: `url(#${uid})`, stroke: 'var(--est)', strokeWidth: 1 } : null" />
        </template>
        <template v-else>
          <path :d="lineD" class="line" />
          <circle v-for="(p, i) in linePts" :key="'p' + i" v-show="p" :cx="p ? p[0] : 0" :cy="p ? p[1] : 0"
                  :r="hover === i ? 5.5 : 4" :class="['dot', { est: data[i].est }]" />
        </template>
        <line v-if="hover != null && mode !== 'bar'" :x1="xc(hover)" :x2="xc(hover)" :y1="T" :y2="H - B" class="cross" />
        <g class="xax">
          <text v-for="(d, i) in data" :key="'x' + i" v-show="i % showEvery === 0 || i === n - 1" :x="xc(i)" :y="H - B + 18" text-anchor="middle">{{ d.x }}</text>
        </g>
        <rect v-for="(d, i) in data" :key="'h' + i" :x="xc(i) - band / 2" :y="T" :width="band" :height="H - T - B + 20"
              class="hit" @mouseenter="hover = i" @focus="hover = i" @blur="hover = null" tabindex="0"
              :aria-label="`${d.x}: ${fmt(d.v)}${unit}${d.est ? (zh ? '（估算）' : ' (estimate)') : ''}`" />
      </svg>
      <div v-if="hv" class="tip" :style="{ left: tipX + '%' }">
        <b>{{ hv.x }}</b> · {{ fmt(hv.v) }}{{ unit }}<span v-if="hv.est" class="tag">{{ zh ? '估算' : 'estimate' }}</span>
        <div v-if="hv.tip" class="tipnote">{{ hv.tip }}</div>
      </div>
    </div>
    <figcaption>
      <span v-if="anyEst" class="key"><svg width="14" height="10"><rect width="14" height="10" :fill="`url(#${uid})`" rx="2" /></svg>{{ zh ? '估算或不完整年份' : 'estimate or partial year' }}</span>
      <span v-if="note" class="cap">{{ note }}</span>
      <button class="tbtn" @click="showTable = !showTable">{{ showTable ? (zh ? '隐藏数据表' : 'Hide table') : (zh ? '查看数据表' : 'Show table') }}</button>
    </figcaption>
    <table v-if="showTable" class="tbl">
      <thead><tr><th>{{ zh ? '年份' : 'Year' }}</th><th>{{ zh ? '数值' : 'Value' }}</th><th>{{ zh ? '说明' : 'Note' }}</th></tr></thead>
      <tbody><tr v-for="(d, i) in data" :key="'t' + i"><td>{{ d.x }}</td><td>{{ fmt(d.v) }}{{ unit }}{{ d.est ? (zh ? '（估算）' : ' (est.)') : '' }}</td><td>{{ d.tip }}</td></tr></tbody>
    </table>
  </figure>
</template>

<style scoped>
.ec { margin: 14px 0 18px; --s1: #2a78d6; --est: #86b6ef; --estbg: #e3eefc; }
:root.dark .ec { --s1: #3987e5; --est: #5598e7; --estbg: #1d2a3d; }
.wrap { position: relative; }
svg { width: 100%; height: auto; display: block; overflow: visible; }
.grid line { stroke: var(--vp-c-divider); stroke-width: 1; }
.grid text, .xax text { fill: var(--vp-c-text-2); font-size: 11px; font-variant-numeric: tabular-nums; }
.bar { fill: var(--s1); transition: opacity .12s; }
.bar.dim { opacity: .5; }
.estbg { fill: var(--estbg); }
.esthatch { stroke: var(--est); }
.line { fill: none; stroke: var(--s1); stroke-width: 2; stroke-linejoin: round; }
.dot { fill: var(--s1); stroke: var(--vp-c-bg); stroke-width: 2; }
.dot.est { fill: var(--vp-c-bg); stroke: var(--s1); }
.cross { stroke: var(--vp-c-text-3); stroke-dasharray: 3 3; }
.hit { fill: transparent; outline: none; cursor: default; }
.hit:focus-visible { stroke: var(--vp-c-brand-1); stroke-width: 1.5; }
.tip { position: absolute; top: 0; transform: translateX(-50%); background: var(--vp-c-bg-elv); border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 9px; font-size: 12.5px; line-height: 1.4; max-width: 300px; box-shadow: var(--vp-shadow-2); pointer-events: none; color: var(--vp-c-text-1); }
.tipnote { color: var(--vp-c-text-2); margin-top: 2px; }
.tag { margin-left: 6px; font-size: 11px; padding: 0 5px; border-radius: 4px; background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
figcaption { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; font-size: 12.5px; color: var(--vp-c-text-2); margin-top: 4px; }
.key { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.cap { flex: 1 1 260px; }
.tbtn { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 1px 8px; font-size: 12px; color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); }
.tbtn:hover { color: var(--vp-c-text-1); }
.tbl { font-size: 12.5px; margin-top: 8px; }
</style>
