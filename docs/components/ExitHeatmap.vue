<script setup>
// Term x group heatmap: share of documents in each group that use a term (0-100%).
import { computed, ref } from 'vue'
const props = defineProps({
  rows: { type: Array, required: true },    // ['responsible exit', ...]
  cols: { type: Array, required: true },    // [{ k: 'brand', label: 'Brand policies', n: 9 }]
  values: { type: Object, required: true }, // { 'responsible exit': { brand: 66.7, ... } }
  lang: { type: String, default: 'en' },
  note: { type: String, default: '' },
})
const zh = computed(() => props.lang === 'zh')
const hover = ref(null)
// sequential blue ramp, light -> dark (reference palette 100..700)
const ramp = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']
const cell = v => {
  if (v == null) return { bg: 'transparent', fg: 'var(--vp-c-text-3)' }
  if (v === 0) return { bg: 'var(--vp-c-bg-soft)', fg: 'var(--vp-c-text-3)' }
  const i = Math.min(ramp.length - 1, Math.floor(v / 100 * ramp.length))
  return { bg: ramp[i], fg: i >= 3 ? '#ffffff' : '#0b0b0b' }
}
const rowAvg = r => {
  const xs = props.cols.map(c => props.values[r]?.[c.k]).filter(v => v != null)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
const sorted = computed(() => [...props.rows].sort((a, b) => rowAvg(b) - rowAvg(a)))
</script>

<template>
  <figure class="hm">
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th class="rh">{{ zh ? '用词' : 'Term' }}</th>
            <th v-for="c in cols" :key="c.k" :title="c.label">{{ c.label }}<span class="n">n={{ c.n }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sorted" :key="r">
            <th class="rh">{{ r }}</th>
            <td v-for="c in cols" :key="c.k"
                :style="{ background: cell(values[r]?.[c.k]).bg, color: cell(values[r]?.[c.k]).fg }"
                :class="{ hl: hover === r + c.k }" tabindex="0"
                @mouseenter="hover = r + c.k" @mouseleave="hover = null"
                :title="`${r} · ${c.label}: ${values[r]?.[c.k] == null ? '—' : Math.round(values[r][c.k]) + '%'}`">
              {{ values[r]?.[c.k] == null ? '—' : Math.round(values[r][c.k]) + '%' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <figcaption>
      <span class="scale"><span>0%</span><i v-for="c in ramp" :key="c" :style="{ background: c }"></i><span>100%</span></span>
      <span>{{ note || (zh ? '每格为该类文件中使用该用词的文件所占比例；按平均占比排序。' : 'Each cell is the share of documents in that group that use the term; rows sorted by average share.') }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.hm { margin: 14px 0 18px; }
.scroll { overflow-x: auto; }
table { border-collapse: separate; border-spacing: 2px; font-size: 12.5px; margin: 0; display: table; }
th, td { border: none !important; padding: 5px 8px; }
thead th { font-weight: 600; color: var(--vp-c-text-2); font-size: 12px; vertical-align: bottom; text-align: center; background: transparent !important; }
.n { display: block; font-weight: 400; color: var(--vp-c-text-3); font-size: 11px; }
.rh { text-align: left; white-space: nowrap; font-weight: 500; color: var(--vp-c-text-1); background: transparent !important; }
td { text-align: center; min-width: 64px; border-radius: 4px; font-variant-numeric: tabular-nums; outline: none; }
td.hl, td:focus-visible { box-shadow: 0 0 0 2px var(--vp-c-text-1) inset; }
tr { background: transparent !important; }
figcaption { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; font-size: 12.5px; color: var(--vp-c-text-2); margin-top: 6px; }
.scale { display: inline-flex; align-items: center; gap: 2px; }
.scale i { display: inline-block; width: 14px; height: 10px; border-radius: 2px; }
.scale span { margin: 0 4px; }
</style>
