<script setup>
// Horizontal bar list: one series, value label at the bar end, hover for detail.
import { computed, ref } from 'vue'
const props = defineProps({
  items: { type: Array, required: true }, // [{ k, label, v, tip }]
  unit: { type: String, default: '' },
  max: { type: Number, default: 0 },
  digits: { type: Number, default: 0 },
  lang: { type: String, default: 'en' },
})
const hover = ref(null)
const top = computed(() => props.max || Math.max(1, ...props.items.map(i => i.v || 0)))
const fmt = v => v == null ? '—' : v.toLocaleString(props.lang === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: props.digits, minimumFractionDigits: props.digits })
</script>

<template>
  <div class="gb" role="list">
    <div v-for="i in items" :key="i.k" class="row" role="listitem" :class="{ hl: hover === i.k, dim: hover && hover !== i.k }"
         @mouseenter="hover = i.k" @mouseleave="hover = null" @focus="hover = i.k" @blur="hover = null" tabindex="0" :title="i.tip || ''">
      <div class="lab">{{ i.label ?? i.k }}</div>
      <div class="track">
        <div class="inner">
          <div class="bar" :style="{ width: Math.max(0.4, (i.v || 0) / top * 100) + '%' }"></div>
          <span class="val" :style="{ left: Math.max(0.4, (i.v || 0) / top * 100) + '%' }">{{ fmt(i.v) }}{{ unit }}</span>
        </div>
      </div>
      <div v-if="hover === i.k && i.tip" class="tip">{{ i.tip }}</div>
    </div>
  </div>
</template>

<style scoped>
.gb { display: grid; gap: 4px; margin: 8px 0 4px; font-size: 13px; }
.row { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; gap: 10px; align-items: center; padding: 2px 4px; border-radius: 6px; outline: none; position: relative; }
.row:focus-visible { box-shadow: 0 0 0 2px var(--vp-c-brand-1); }
.lab { color: var(--vp-c-text-1); line-height: 1.25; overflow-wrap: anywhere; }
.track { padding-right: 64px; min-width: 0; }
.inner { position: relative; height: 16px; }
.bar { position: absolute; top: 1px; left: 0; height: 14px; background: var(--vp-c-brand-1); border-radius: 0 4px 4px 0; }
.val { position: absolute; top: -1px; margin-left: 6px; color: var(--vp-c-text-2); font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12px; }
.hl { background: var(--vp-c-default-soft); }
.hl .val { color: var(--vp-c-text-1); font-weight: 600; }
.dim .bar { opacity: .55; }
.tip { grid-column: 1 / -1; font-size: 12px; color: var(--vp-c-text-2); padding: 0 0 2px; }
</style>
