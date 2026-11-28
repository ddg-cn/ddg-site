<script setup>
// Tickable checklist. With `roles`, shows a role picker (and optional situation picker) and filters items.
// Ticks are kept in this browser only (if storage is available). Print uses the browser's print dialog.
import { computed, onMounted, ref, watch } from 'vue'
const props = defineProps({
  items: { type: Array, required: true },   // [{ id, phase, text, ref?, roles?: [], sit?: [] }]
  phases: { type: Array, default: () => [] }, // [{ k, label }]
  roles: { type: Array, default: () => [] },  // [{ k, label }]
  sits: { type: Array, default: () => [] },   // [{ k, label }]
  storeKey: { type: String, required: true },
  lang: { type: String, default: 'en' },
})
const zh = computed(() => props.lang === 'zh')
const t = (en, z) => (zh.value ? z : en)
const done = ref({})
const role = ref(props.roles.length ? props.roles[0].k : null)
const sit = ref('all')
onMounted(() => {
  try {
    const s = JSON.parse(localStorage.getItem(props.storeKey) || 'null')
    if (s) { done.value = s.done || {}; if (s.role) role.value = s.role; if (s.sit) sit.value = s.sit }
  } catch (e) {}
})
watch([done, role, sit], () => { try { localStorage.setItem(props.storeKey, JSON.stringify({ done: done.value, role: role.value, sit: sit.value })) } catch (e) {} }, { deep: true })

const visible = computed(() => props.items.filter(i =>
  (!role.value || !i.roles || i.roles.includes(role.value)) &&
  (sit.value === 'all' || !i.sit || i.sit.includes(sit.value))))
const groups = computed(() => {
  const ph = props.phases.length ? props.phases : [{ k: undefined, label: '' }]
  return ph.map(p => ({ ...p, items: visible.value.filter(i => i.phase === p.k) })).filter(g => g.items.length)
})
const count = computed(() => visible.value.filter(i => done.value[i.id]).length)
const reset = () => { const d = { ...done.value }; visible.value.forEach(i => delete d[i.id]); done.value = d }
const roleLabel = computed(() => props.roles.find(r => r.k === role.value)?.label || '')
const num = computed(() => { const m = {}; let k = 0; groups.value.forEach(g => g.items.forEach(i => { m[i.id] = ++k })); return m })
</script>

<template>
  <div class="ck">
    <div v-if="roles.length" class="pick">
      <div class="lbl">{{ t('I am', '我是') }}</div>
      <div class="chips" role="radiogroup">
        <button v-for="r in roles" :key="r.k" role="radio" :aria-checked="role === r.k" :class="{ on: role === r.k }" @click="role = r.k">{{ r.label }}</button>
      </div>
    </div>
    <div v-if="sits.length" class="pick">
      <div class="lbl">{{ t('Situation', '情形') }}</div>
      <div class="chips" role="radiogroup">
        <button role="radio" :aria-checked="sit === 'all'" :class="{ on: sit === 'all' }" @click="sit = 'all'">{{ t('All', '全部') }}</button>
        <button v-for="s in sits" :key="s.k" role="radio" :aria-checked="sit === s.k" :class="{ on: sit === s.k }" @click="sit = s.k">{{ s.label }}</button>
      </div>
    </div>
    <div class="bar">
      <span class="prog"><b>{{ count }}</b> / {{ visible.length }} {{ t('done', '已完成') }}<span v-if="roleLabel" class="who"> · {{ roleLabel }}</span></span>
      <span class="track"><span class="fill" :style="{ width: visible.length ? (count / visible.length * 100) + '%' : 0 }"></span></span>
      <button @click="reset">{{ t('Untick all', '全部取消') }}</button>
      <button onclick="window.print()">{{ t('Print', '打印') }}</button>
    </div>
    <div v-for="g in groups" :key="g.k || 'x'" class="grp">
      <div v-if="g.label" class="gh">{{ g.label }}</div>
      <label v-for="i in g.items" :key="i.id" class="item" :class="{ ok: done[i.id] }">
        <input type="checkbox" v-model="done[i.id]" />
        <span class="no">{{ num[i.id] }}.</span>
        <span class="tx">{{ i.text }}<span v-if="i.ref" class="ref">{{ i.ref }}</span></span>
      </label>
    </div>
    <p class="priv">{{ t('Ticks are saved in this browser only.', '勾选记录仅保存在本浏览器中。') }}</p>
  </div>
</template>

<style scoped>
.ck { margin: 12px 0 20px; font-size: 14px; }
.pick { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-bottom: 8px; }
.lbl { color: var(--vp-c-text-2); font-size: 13px; min-width: 54px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: 3px 12px; font-size: 13px; color: var(--vp-c-text-2); background: var(--vp-c-bg); }
.chips button.on { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 600; }
.bar { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin: 10px 0 6px; font-size: 13px; color: var(--vp-c-text-2); }
.bar button { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 2px 10px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font-size: 12.5px; }
.track { flex: 1 1 120px; height: 6px; background: var(--vp-c-default-soft); border-radius: 3px; overflow: hidden; }
.fill { display: block; height: 100%; background: var(--vp-c-brand-1); transition: width .2s; }
.grp { margin-top: 12px; }
.gh { font-weight: 600; font-size: 14px; margin-bottom: 4px; color: var(--vp-c-text-1); }
.item { display: grid; grid-template-columns: 20px 26px 1fr; gap: 4px; align-items: start; padding: 5px 6px; border-radius: 6px; cursor: pointer; line-height: 1.5; }
.item:hover { background: var(--vp-c-bg-soft); }
.item input { margin-top: 5px; }
.no { color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; }
.ok .tx { color: var(--vp-c-text-3); text-decoration: line-through; text-decoration-color: var(--vp-c-text-3); }
.ref { display: inline-block; margin-left: 6px; font-size: 11.5px; color: var(--vp-c-text-3); }
.priv { font-size: 12px; color: var(--vp-c-text-3); margin-top: 8px; }
@media print { .pick button:not(.on), .bar button, .priv { display: none; } .item { break-inside: avoid; } }
</style>
