<script setup>
// Severance calculation sheet under PRC Labour Contract Law Arts. 46-47, 40, 87.
// Runs in the browser only; nothing is sent anywhere. Rows are kept in this browser if storage is available.
import { computed, onMounted, reactive, ref, watch } from 'vue'
const props = defineProps({ lang: { type: String, default: 'en' } })
const zh = computed(() => props.lang === 'zh')
const KEY = 'scdd-severance-sheet-v1'
const t = (en, z) => (zh.value ? z : en)

const g = reactive({ avg: 10000, min: 2520, end: new Date().toISOString().slice(0, 10) })
const blank = () => ({ name: '', start: '', wage: '', last: '', notice: true, unlawful: false, leave: 0, owed: 0, si: 0 })
const rows = ref([
  { name: t('Worker A', '员工甲'), start: '2016-03-01', wage: 6800, last: 6800, notice: false, unlawful: false, leave: 3, owed: 6800, si: 0 },
  { name: t('Worker B', '员工乙'), start: '2023-09-15', wage: 5200, last: 5000, notice: true, unlawful: false, leave: 0, owed: 2600, si: 1200 },
])

onMounted(() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && Array.isArray(s.rows)) { rows.value = s.rows; Object.assign(g, s.g || {}) }
  } catch (e) { /* storage unavailable */ }
})
watch([rows, g], () => { try { localStorage.setItem(KEY, JSON.stringify({ rows: rows.value, g })) } catch (e) {} }, { deep: true })

// Service: full years count 1; a remainder of 6 months or more counts 1; under 6 months counts 0.5 (Art. 47)
function service(start, end) {
  if (!start || !end) return null
  const a = new Date(start), b = new Date(end)
  if (isNaN(a) || isNaN(b) || b <= a) return null
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months -= 1
  const yrs = Math.floor(months / 12), rem = months - yrs * 12
  const anchor = new Date(a); anchor.setMonth(anchor.getMonth() + months)
  const extraDays = b > anchor
  const units = yrs + (rem >= 6 ? 1 : rem > 0 || extraDays ? 0.5 : 0)
  return { months, units }
}
const num = v => (v === '' || v == null || isNaN(+v) ? 0 : +v)
function calc(r) {
  const s = service(r.start, g.end)
  if (!s) return null
  let wage = Math.max(num(r.wage), num(g.min))            // not below local minimum wage (Implementing Regs Art. 27)
  const cap = num(g.avg) * 3
  const capped = cap > 0 && wage > cap
  const base = capped ? cap : wage
  const months = capped ? Math.min(s.units, 12) : s.units
  const sev = base * months
  const notice = !r.notice && !r.unlawful ? num(r.last || r.wage) : 0      // pay in lieu of notice (Art. 40; Implementing Regs Art. 20)
  const lawful = r.unlawful ? sev * 2 : sev                                    // Art. 87: twice the severance
  const leave = num(r.leave) * (num(r.wage) / 21.75) * 2                       // unused annual leave: extra 200% of daily wage
  const total = lawful + notice + leave + num(r.owed) + num(r.si)
  return { units: s.units, base, capped, months, sev: lawful, notice, leave, total }
}
const res = computed(() => rows.value.map(calc))
const sum = computed(() => res.value.reduce((a, r) => a + (r ? r.total : 0), 0))
const money = v => (v == null ? '—' : Math.round(v).toLocaleString(zh.value ? 'zh-CN' : 'en-US'))
const add = () => rows.value.push(blank())
const del = i => rows.value.splice(i, 1)
const clear = () => { rows.value = [blank()] }

function csv() {
  const head = zh.value
    ? ['姓名', '入职日期', '离职日期', '月平均工资', '上月工资', '已提前30天通知', '违法解除', '未休年假天数', '欠发工资', '社保公积金欠缴', '工龄(月数)', '计发基数', '是否封顶', '计发月数', '经济补偿/赔偿金', '代通知金', '年假工资', '合计']
    : ['Name', 'Start', 'End', 'Average monthly wage', 'Last month wage', '30 days notice given', 'Unlawful termination', 'Unused leave days', 'Wages owed', 'Social insurance arrears', 'Service (units)', 'Base', 'Capped', 'Months payable', 'Severance', 'Notice pay', 'Leave pay', 'Total']
  const lines = [head]
  rows.value.forEach((r, i) => {
    const c = res.value[i] || {}
    lines.push([r.name, r.start, g.end, r.wage, r.last, r.notice ? 'Y' : 'N', r.unlawful ? 'Y' : 'N', r.leave, r.owed, r.si,
      c.units ?? '', Math.round(c.base ?? 0), c.capped ? 'Y' : 'N', c.months ?? '', Math.round(c.sev ?? 0), Math.round(c.notice ?? 0), Math.round(c.leave ?? 0), Math.round(c.total ?? 0)])
  })
  const text = '﻿' + lines.map(l => l.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  a.download = zh.value ? '经济补偿计算表.csv' : 'severance-sheet.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<template>
  <div class="sv">
    <div class="globals">
      <label>{{ t('Last working day', '最后工作日') }}<input type="date" v-model="g.end" /></label>
      <label>{{ t('Local average monthly wage, last year (RMB)', '当地上年度职工月平均工资（元）') }}<input type="number" min="0" v-model.number="g.avg" /></label>
      <label>{{ t('Local minimum monthly wage (RMB)', '当地月最低工资（元）') }}<input type="number" min="0" v-model.number="g.min" /></label>
    </div>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>{{ t('Name', '姓名') }}</th>
            <th>{{ t('Start date', '入职日期') }}</th>
            <th>{{ t('Average wage, last 12 months', '前12个月月平均工资') }}</th>
            <th>{{ t('Last month wage', '上月工资') }}</th>
            <th :title="t('Untick if 30 days written notice was not given (Art. 40)', '未提前30日书面通知的，取消勾选（第40条）')">{{ t('30 days notice given', '已提前30日通知') }}</th>
            <th :title="t('Tick for unlawful termination: twice the severance (Art. 87)', '违法解除：按经济补偿标准的二倍支付赔偿金（第87条）')">{{ t('Unlawful', '违法解除') }}</th>
            <th>{{ t('Unused leave days', '未休年假天数') }}</th>
            <th>{{ t('Wages owed', '欠发工资') }}</th>
            <th>{{ t('Social insurance / housing fund arrears', '社保公积金欠缴') }}</th>
            <th class="out">{{ t('Service', '工龄') }}</th>
            <th class="out">{{ t('Base', '基数') }}</th>
            <th class="out">{{ t('Severance', '补偿/赔偿') }}</th>
            <th class="out">{{ t('Notice pay', '代通知金') }}</th>
            <th class="out">{{ t('Leave pay', '年假工资') }}</th>
            <th class="out">{{ t('Total', '合计') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i">
            <td><input v-model="r.name" class="w-name" /></td>
            <td><input type="date" v-model="r.start" /></td>
            <td><input type="number" min="0" v-model.number="r.wage" /></td>
            <td><input type="number" min="0" v-model.number="r.last" /></td>
            <td class="c"><input type="checkbox" v-model="r.notice" /></td>
            <td class="c"><input type="checkbox" v-model="r.unlawful" /></td>
            <td><input type="number" min="0" v-model.number="r.leave" class="w-s" /></td>
            <td><input type="number" min="0" v-model.number="r.owed" /></td>
            <td><input type="number" min="0" v-model.number="r.si" /></td>
            <td class="out">{{ res[i] ? res[i].units + (res[i].capped && res[i].units > 12 ? ' → 12' : '') : '—' }}</td>
            <td class="out">{{ res[i] ? money(res[i].base) : '—' }}<span v-if="res[i] && res[i].capped" class="flag">{{ t('cap', '封顶') }}</span></td>
            <td class="out">{{ res[i] ? money(res[i].sev) : '—' }}</td>
            <td class="out">{{ res[i] ? money(res[i].notice) : '—' }}</td>
            <td class="out">{{ res[i] ? money(res[i].leave) : '—' }}</td>
            <td class="out tot">{{ res[i] ? money(res[i].total) : '—' }}</td>
            <td><button class="x" @click="del(i)" :aria-label="t('Remove row', '删除此行')">×</button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="14" class="r">{{ t('Total for all workers (RMB)', '全部员工合计（元）') }}</td><td class="out tot">{{ money(sum) }}</td><td></td></tr>
        </tfoot>
      </table>
    </div>
    <div class="sumline">{{ t('Total for', '合计') }} {{ rows.length }} {{ t('workers', '名员工') }}: <b>RMB {{ money(sum) }}</b> <span class="hint">{{ t('(scroll the table sideways for the figures for each worker)', '（左右滑动表格查看每人明细）') }}</span></div>
    <div class="actions">
      <button @click="add">+ {{ t('Add worker', '添加员工') }}</button>
      <button @click="csv">{{ t('Download CSV (opens in Excel)', '下载 CSV（可用 Excel 打开）') }}</button>
      <button @click="clear">{{ t('Clear', '清空') }}</button>
      <span class="priv">{{ t('Calculated in your browser. Nothing is uploaded.', '仅在您的浏览器中计算，不会上传任何数据。') }}</span>
    </div>
    <details class="rules">
      <summary>{{ t('How it is calculated', '计算规则') }}</summary>
      <ul v-if="!zh">
        <li><b>Service:</b> one month's wage per full year; a remainder of six months or more counts as a year, under six months as half a month (LCL Art. 47).</li>
        <li><b>Wage base:</b> the average monthly wage over the 12 months before termination, including bonuses and allowances, and not below the local minimum wage (Implementing Regulations Art. 27).</li>
        <li><b>Cap:</b> if the wage is above three times the local average monthly wage, the base is three times that average and service counts for at most 12 years (Art. 47). The cap applies to service from 1 January 2008; earlier service follows the rules then in force, so check long-service cases.</li>
        <li><b>Notice pay:</b> one month's wage (the previous month's) if 30 days' written notice was not given in an Art. 40 termination. Not added for closures under Art. 44 or for unlawful termination.</li>
        <li><b>Unlawful termination:</b> twice the severance (Art. 87), instead of severance.</li>
        <li><b>Unused annual leave:</b> 300% of the daily wage per day; the sheet adds the extra 200% (the normal 100% is in the wage). Daily wage = monthly wage ÷ 21.75.</li>
        <li>Local rules, collective agreements and court practice differ. Use this to plan the reserve, not as legal advice.</li>
      </ul>
      <ul v-else>
        <li><b>工龄：</b>每满一年支付一个月工资；六个月以上不满一年的，按一年计算；不满六个月的，支付半个月工资（《劳动合同法》第47条）。</li>
        <li><b>工资基数：</b>劳动合同解除或终止前十二个月的平均工资，含奖金、津贴、补贴；低于当地最低工资标准的，按最低工资标准计算（《实施条例》第27条）。</li>
        <li><b>封顶：</b>月工资高于当地上年度职工月平均工资三倍的，按三倍计算，年限最高不超过十二年（第47条）。封顶规则适用于2008年1月1日以后的工龄，之前的工龄按当时规定，长工龄员工请单独核算。</li>
        <li><b>代通知金：</b>依第40条解除且未提前30日书面通知的，额外支付一个月工资（按上月工资）。依第44条关闭终止或违法解除的，不计。</li>
        <li><b>违法解除：</b>按经济补偿标准的二倍支付赔偿金（第87条），不再另付经济补偿。</li>
        <li><b>未休年假：</b>按日工资的300%支付，表中计入额外的200%（正常的100%已含在工资中）。日工资 = 月工资 ÷ 21.75。</li>
        <li>各地规定、集体合同和裁判口径不尽相同。本表用于测算准备金，不构成法律意见。</li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.sv { margin: 12px 0 20px; font-size: 13px; }
.globals { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-bottom: 10px; }
.globals label { display: flex; flex-direction: column; gap: 3px; color: var(--vp-c-text-2); font-size: 12.5px; }
input { border: 1px solid var(--vp-c-divider); border-radius: 5px; padding: 3px 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 13px; width: 100px; }
input[type=date] { width: 132px; }
input[type=checkbox] { width: auto; }
.w-name { width: 96px; } .w-s { width: 56px; }
.scroll { overflow-x: auto; }
table { font-size: 12.5px; margin: 0; display: table; }
th { font-size: 11.5px; line-height: 1.25; vertical-align: bottom; min-width: 60px; }
td, th { padding: 4px 6px !important; }
.c { text-align: center; }
.out { background: var(--vp-c-bg-soft); text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tot { font-weight: 600; }
.r { text-align: right; font-weight: 600; }
.flag { margin-left: 4px; font-size: 10.5px; padding: 0 4px; border-radius: 3px; background: var(--vp-c-warning-soft); color: var(--vp-c-warning-1); }
.x { color: var(--vp-c-text-3); font-size: 16px; padding: 0 6px; }
.x:hover { color: var(--vp-c-danger-1); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
.actions button { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 3px 10px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font-size: 12.5px; }
.actions button:hover { border-color: var(--vp-c-brand-1); }
.sumline { margin-top: 8px; font-size: 14px; }
.hint { color: var(--vp-c-text-3); font-size: 12px; }
.priv { color: var(--vp-c-text-3); font-size: 12px; }
.rules { margin-top: 10px; color: var(--vp-c-text-2); }
.rules summary { cursor: pointer; }
</style>
