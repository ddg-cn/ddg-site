<script setup>
import { ref, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({ lang: { type: String, default: 'en' } })
const zh = props.lang === 'zh'
const T = zh ? {
  loading: '加载中…', failed: '数据加载失败。', search: '搜索国家或地区', allRegions: '全部地区', onLists: '只看列入美国清单的',
  sort: '排序', byName: '名称', byCpi: 'CPI 分数', byWgi: 'WGI 平均分', country: '国家 / 地区', region: '地区',
  cpi: 'CPI 2025', cpiSub: '分数 · 排名', wgi: 'WGI 平均', wgiSub: '六项平均（本站计算）', dol: '美国劳工部清单', dolSub: '货物数', cbp: 'CBP 暂扣令', cbpSub: '生效中',
  rank: '第 {r} 名', prev: '2024：{s}', none: '—', shown: '显示 {n} / {t} 个国家和地区', more: '点击行查看详情',
  dims: { va: '话语权与问责', pv: '政治稳定与无暴力', ge: '政府效能', rq: '监管质量', rl: '法治', cc: '腐败控制' },
  cpiTitle: '透明国际清廉指数（CPI）2025', wgiTitle: '世界银行全球治理指标（0–100）', dolTitle: '美国劳工部清单所列货物', cbpTitle: '美国海关 CBP 暂扣令与认定',
  child: '童工', forced: '强迫劳动', forcedChild: '强迫童工', wro: '暂扣令', finding: '认定', active: '生效中',
  partly: '部分修改', pending: '诉讼中暂停', se: '标准误 ±{v}', srcN: '{n} 个数据源', noDetail: '没有更多数据。'
} : {
  loading: 'Loading…', failed: 'The data could not be loaded.', search: 'Search a country or area', allRegions: 'All regions', onLists: 'Only those on a US list',
  sort: 'Sort', byName: 'Name', byCpi: 'CPI score', byWgi: 'WGI average', country: 'Country / area', region: 'Region',
  cpi: 'CPI 2025', cpiSub: 'score · rank', wgi: 'WGI avg', wgiSub: 'mean of six (our calculation)', dol: 'US DOL list', dolSub: 'goods', cbp: 'CBP orders', cbpSub: 'active',
  rank: 'rank {r}', prev: '2024: {s}', none: '—', shown: 'Showing {n} of {t} countries and areas', more: 'Click a row for details',
  dims: { va: 'Voice and accountability', pv: 'Political stability', ge: 'Government effectiveness', rq: 'Regulatory quality', rl: 'Rule of law', cc: 'Control of corruption' },
  cpiTitle: 'Transparency International CPI 2025', wgiTitle: 'World Bank governance indicators (0–100)', dolTitle: 'Goods on the US Department of Labor list', cbpTitle: 'US CBP Withhold Release Orders and Findings',
  child: 'child labour', forced: 'forced labour', forcedChild: 'forced child labour', wro: 'WRO', finding: 'Finding', active: 'active',
  partly: 'partly modified', pending: 'inactive, pending litigation', se: 'standard error ±{v}', srcN: '{n} sources', noDetail: 'No further data.'
}
const REGION_ZH = {
  'East Asia & Pacific': '东亚与太平洋', 'Europe & Central Asia': '欧洲与中亚', 'Latin America & Caribbean': '拉丁美洲与加勒比',
  'Middle East & North Africa': '中东与北非', 'Middle East, North Africa, Afghanistan & Pakistan': '中东、北非、阿富汗与巴基斯坦',
  'North America': '北美', 'South Asia': '南亚', 'Sub-Saharan Africa': '撒哈拉以南非洲'
}
// names follow UN / World Bank usage for these areas
const NAME_FIX = { TW: ['Taiwan, China', '中国台湾'], HK: ['Hong Kong SAR, China', '中国香港'], MO: ['Macao SAR, China', '中国澳门'] }
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k])

const data = ref(null)
const err = ref(false)
const q = ref('')
const region = ref('')
const onlyLists = ref(false)
const sortBy = ref('name')
const open = ref(null)

let dnEn = null, dnZh = null
try { dnEn = new Intl.DisplayNames(['en'], { type: 'region' }); dnZh = new Intl.DisplayNames(['zh-CN'], { type: 'region' }) } catch (e) { /* old browser: ISO codes */ }
const nameOf = (c) => {
  const f = NAME_FIX[c.iso2]
  const en = f ? f[0] : (dnEn ? dnEn.of(c.iso2) : c.iso3)
  const z = f ? f[1] : (dnZh ? dnZh.of(c.iso2) : en)
  return { en, zh: z, show: zh ? z : en }
}
const regionName = (r) => (zh ? REGION_ZH[r] || r : r)

onMounted(async () => {
  try {
    const r = await fetch(withBase('/data/country-ref.json'))
    if (!r.ok) throw new Error(r.status)
    const d = await r.json()
    d.countries.forEach((c) => {
      c.name = nameOf(c)
      c.nActive = (c.cbp || []).filter((x) => x.st === 'Active').length
    })
    data.value = d
  } catch (e) { err.value = true }
})

const regions = computed(() => data.value ? [...new Set(data.value.countries.map((c) => c.region))].sort() : [])
const rows = computed(() => {
  if (!data.value) return []
  const s = q.value.trim().toLowerCase()
  let l = data.value.countries.filter((c) =>
    (!region.value || c.region === region.value) &&
    (!onlyLists.value || c.dol || c.cbp) &&
    (!s || c.name.en.toLowerCase().includes(s) || c.name.zh.includes(s) || c.iso3.toLowerCase() === s))
  const coll = new Intl.Collator(zh ? 'zh-CN' : 'en')
  const by = {
    name: (a, b) => coll.compare(a.name.show, b.name.show),
    cpi: (a, b) => (b.cpi?.s ?? -1) - (a.cpi?.s ?? -1) || coll.compare(a.name.show, b.name.show),
    wgi: (a, b) => (b.wgi?.avg ?? -1) - (a.wgi?.avg ?? -1) || coll.compare(a.name.show, b.name.show)
  }
  return [...l].sort(by[sortBy.value])
})
const stLabel = (st) => st === 'Active' ? T.active : st === 'Partially Modified' ? T.partly : T.pending
const toggle = (iso3) => { open.value = open.value === iso3 ? null : iso3 }
const n1 = (v) => v == null ? T.none : v.toFixed(1)
</script>

<template>
  <div class="cr">
    <p v-if="err" class="cr-muted">{{ T.failed }}</p>
    <p v-else-if="!data" class="cr-muted">{{ T.loading }}</p>
    <template v-else>
      <div class="cr-bar">
        <input v-model="q" type="search" :placeholder="T.search" :aria-label="T.search">
        <select v-model="region" :aria-label="T.region">
          <option value="">{{ T.allRegions }}</option>
          <option v-for="r in regions" :key="r" :value="r">{{ regionName(r) }}</option>
        </select>
        <label class="cr-sort">{{ T.sort }}
          <select v-model="sortBy">
            <option value="name">{{ T.byName }}</option>
            <option value="cpi">{{ T.byCpi }}</option>
            <option value="wgi">{{ T.byWgi }}</option>
          </select>
        </label>
        <label class="cr-chk"><input v-model="onlyLists" type="checkbox"> {{ T.onLists }}</label>
      </div>
      <p class="cr-muted">{{ fmt(T.shown, { n: rows.length, t: data.countries.length }) }} · {{ T.more }}</p>
      <div class="cr-tw">
        <table>
          <thead>
            <tr>
              <th>{{ T.country }}</th>
              <th class="num">{{ T.cpi }}<span class="sub">{{ T.cpiSub }}</span></th>
              <th class="num">{{ T.wgi }}<span class="sub">{{ T.wgiSub }}</span></th>
              <th class="num">{{ T.dol }}<span class="sub">{{ T.dolSub }}</span></th>
              <th class="num">{{ T.cbp }}<span class="sub">{{ T.cbpSub }}</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="c in rows" :key="c.iso3">
              <tr class="row" :class="{ on: open === c.iso3 }" tabindex="0" @click="toggle(c.iso3)" @keydown.enter="toggle(c.iso3)">
                <td><span class="nm">{{ c.name.show }}</span><span class="rg">{{ regionName(c.region) }}</span></td>
                <td class="num">
                  <template v-if="c.cpi"><b>{{ c.cpi.s }}</b> <span class="yr">{{ fmt(T.rank, { r: c.cpi.r }) }}</span></template>
                  <template v-else>{{ T.none }}</template>
                </td>
                <td class="num">{{ n1(c.wgi?.avg) }}</td>
                <td class="num">{{ c.dol ? c.dol.length : T.none }}</td>
                <td class="num">{{ c.nActive || T.none }}</td>
              </tr>
              <tr v-if="open === c.iso3" class="det">
                <td colspan="5">
                  <div class="grid">
                    <section v-if="c.cpi">
                      <h4>{{ T.cpiTitle }}</h4>
                      <p><b>{{ c.cpi.s }}</b> / 100 · {{ fmt(T.rank, { r: c.cpi.r }) }} / 182
                        <span class="yr">· {{ fmt(T.se, { v: c.cpi.se }) }} · {{ fmt(T.srcN, { n: c.cpi.n }) }}<template v-if="c.cpi.s24 != null"> · {{ fmt(T.prev, { s: c.cpi.s24 }) }}</template></span></p>
                    </section>
                    <section v-if="c.wgi">
                      <h4>{{ T.wgiTitle }}</h4>
                      <div v-for="(lab, k) in T.dims" :key="k" class="bar">
                        <span class="bl">{{ lab }}</span>
                        <span class="bt"><span class="bf" :style="{ width: (c.wgi[k] ?? 0) + '%' }" /></span>
                        <span class="bv">{{ n1(c.wgi[k]) }}</span>
                      </div>
                    </section>
                    <section v-if="c.dol">
                      <h4>{{ T.dolTitle }}</h4>
                      <ul class="goods" :class="{ cols: c.dol.length > 8 }">
                        <li v-for="g in c.dol" :key="g.g">{{ zh ? g.gz : g.g }}
                          <span class="tags"><span v-if="g.c" class="tag">{{ T.child }}</span><span v-if="g.f" class="tag">{{ T.forced }}</span><span v-if="g.fc" class="tag">{{ T.forcedChild }}</span></span>
                        </li>
                      </ul>
                    </section>
                    <section v-if="c.cbp">
                      <h4>{{ T.cbpTitle }}</h4>
                      <ul class="goods">
                        <li v-for="(x, i) in c.cbp" :key="i">{{ x.y }} · {{ x.t === 'WRO' ? T.wro : T.finding }} · {{ zh ? x.mz : x.m }}
                          <span class="tags"><span class="tag" :class="{ act: x.st === 'Active' }">{{ stLabel(x.st) }}</span></span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cr { margin-top: 16px; }
.cr-muted { color: var(--vp-c-text-2); font-size: 14px; }
.cr-bar { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-bottom: 4px; }
.cr-bar input[type=search], .cr-bar select { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 14px; }
.cr-bar input[type=search] { flex: 1 1 200px; min-width: 0; }
.cr-sort, .cr-chk { font-size: 14px; color: var(--vp-c-text-2); display: inline-flex; gap: 6px; align-items: center; }
.cr-tw { overflow-x: auto; }
.cr table { font-variant-numeric: tabular-nums; width: 100%; display: table; }
.cr th { vertical-align: bottom; }
.cr th .sub { display: block; font-weight: 400; font-size: 11px; color: var(--vp-c-text-3); }
.cr .num { text-align: right; white-space: nowrap; }
.cr .row { cursor: pointer; }
.cr .row:hover, .cr .row.on { background: var(--vp-c-bg-soft); }
.cr .row:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.cr .nm { display: block; }
.cr .rg, .cr .yr { color: var(--vp-c-text-3); font-size: 12px; }
.cr .det td { background: var(--vp-c-bg-soft); }
.cr .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px 24px; }
.cr h4 { margin: 4px 0 6px; font-size: 14px; }
.cr .grid p { margin: 0; font-size: 14px; }
.cr .bar { display: grid; grid-template-columns: 9.5em 1fr 3em; gap: 6px; align-items: center; font-size: 12px; margin: 2px 0; }
.cr .bl { color: var(--vp-c-text-2); }
.cr .bt { height: 8px; background: var(--vp-c-divider); border-radius: 4px; overflow: hidden; }
.cr .bf { display: block; height: 100%; background: var(--vp-c-brand-1); }
.cr .bv { text-align: right; }
.cr ul.goods { margin: 0; padding-left: 18px; font-size: 13px; }
.cr ul.goods li { margin: 2px 0; break-inside: avoid; }
.cr ul.goods.cols { columns: 2 14em; column-gap: 24px; }
.cr .grid section:has(ul.cols) { grid-column: 1 / -1; }
.cr .tag { display: inline-block; font-size: 11px; line-height: 1.5; padding: 0 6px; margin-left: 4px; border-radius: 8px; border: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2); }
.cr .tag.act { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
</style>
