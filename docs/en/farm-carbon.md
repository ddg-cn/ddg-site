---
title: Farm Produce Carbon Calculator
description: Quick farm-gate carbon footprint for vegetables, fruit, tea and grain from fertiliser, fuel, power and film use — IPCC 2019 Tier 1 method
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import FarmCarbon from '../components/FarmCarbon.vue'
</script>

# 🥬 Farm Produce Carbon Calculator

A quick **farm-gate** carbon footprint for vegetables, fruit, tea and grain. Pick a crop, enter what you actually used per mu or hectare (fertiliser bags, diesel, electricity, film), and get kg CO2e per kg of produce, which inputs matter most, and an Excel sheet with the inputs, result and factors.

<ClientOnly>
  <FarmCarbon lang="en" />
</ClientOnly>

::: info Nothing is uploaded
The calculation runs in your browser. Crop presets are typical Chinese values to start from; replace them with your own records.
:::

## Method

Boundary: **cradle to farm gate** for one growing season — production of the inputs plus emissions in the field. Packing, cooling, transport, land-use change and soil carbon changes are not included.

| Part | How it is calculated |
|---|---|
| Fertiliser production | Pure nutrient × factor. China N factors from Zhang et al. 2013 (PNAS) as cited in later studies: urea 8.1, compound fertiliser 7.4, ammonium bicarbonate 7.2 kg CO2e/kg N; P2O5 1.5; K2O 0.7 |
| Direct field N2O | IPCC 2019 Table 11.1: EF1 = 0.016 (synthetic N, wet climate), 0.006 (organic N and residues, wet), 0.005 (all N, dry), 0.004 (flooded rice) kg N2O-N per kg N |
| Indirect N2O | Volatilisation: FracGASF urea 0.15, ammonium-based 0.08, ammonium nitrate 0.05; organic 0.21; EF4 0.014 (wet) / 0.005 (dry). Leaching: FracLEACH 0.24 (wet or irrigated, else 0) × EF5 0.011 (IPCC 2019 Table 11.3) |
| Urea CO2 | 0.20 t C per t urea × 44/12 (IPCC 2006, Eq. 11.13) |
| Lime | 0.12 t C per t limestone (0.44 kg CO2/kg) plus quarrying |
| Paddy CH4 | EF = EFc × SFw × SFp × SFo × days. East Asia EFc 1.32 kg CH4/ha/day; SFw: flooded 1.00, single drainage 0.71, multiple drainage 0.55; SFp: < 180 days 1.00, > 180 days 0.89, flooded > 30 days 2.41; SFo = (1 + Σ amount × CFOA)^0.59 with straw < 30 days 1.00, > 30 days 0.19, manure 0.21, green manure 0.45 (IPCC 2019 Tables 5.11–5.14) |
| Fuel, power, film, pesticide | Diesel 3.0 kg CO2e/L, petrol 2.7/L (IPCC combustion plus upstream); electricity 0.5777 kg CO2e/kWh (MEE 2024 national electricity carbon footprint factor); PE film 2.5/kg; pesticide 15/kg active ingredient |
| GWP | IPCC AR6, 100 years: CH4 27.0, N2O 273 |

Every input factor can be changed under **Edit factors**, for example to a supplier's own fertiliser footprint or a provincial grid factor.

## Good to know

- **Nitrogen dominates** most vegetable and fruit footprints: making the fertiliser plus the N2O it causes in the field. Matching the N rate to the crop's need is usually the biggest lever.
- **Rice is different**: paddy methane is usually the largest part, and drainage (烤田, alternate wetting and drying) cuts it sharply.
- The result is a **screening estimate** (IPCC Tier 1). For a claim on a label or to a buyer, a study under ISO 14067 with measured farm records and a review is needed.

---

🧰 [All tools](/en/tools.html) · [Carbon footprint form check](/en/carbon-qc.html)
