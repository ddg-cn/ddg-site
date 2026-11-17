---
title: Carbon Footprint Form Check
description: Check product carbon footprint forms in your browser — dataset names, TeR / GeR / TiR / P ratings, emission factors against public references
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import CarbonQc from '../components/CarbonQc.vue'
</script>

# 🌡️ Carbon Footprint Form Check <Badge type="warning" text="preview" />

Drop **carbon footprint forms** (EU battery carbon footprint report templates, customer PCF templates, life-cycle inventory data sheets) to check:
- whether each component is modelled with a dataset for the right material
- whether the TeR / GeR / TiR / P ratings and the DQR fit the rules
- whether emission factors for materials, energy, transport and waste are within public reference ranges
- whether the arithmetic holds

<ClientOnly>
  <CarbonQc lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The workbook is read inside your browser and is not uploaded to any server. The first check downloads the Excel reader (about 900 KB), which your browser then caches. DRM-protected files (for example TSD) must be saved as an unprotected copy first.
:::

## Reading the results

- **Issues**: every finding with the sheet and cell and a suggested fix. **Error** = must fix · **Warning** = review · **Info** = note.
- **Data quality ratings**: for every dataset row, the stated rating (top) and the suggested rating (bottom; red = the form is more optimistic, green = more cautious), with reasons.
- **Factor check**: each emission factor next to the public reference range for that material, energy carrier or transport mode.
- **Download Excel report**: Issues (with Status and Comment columns), Ratings, Factors and Rules sheets.

## How the suggested ratings work

Scale 1 (best) to 5 (worst), as in the PEF / EU battery carbon footprint rules. DQR = the average of the ratings the template uses.

| Criterion | Rule used |
|---|---|
| **TeR** (technology) | 2 when the dataset is for the same material or material family (1 is kept for supplier-specific data); 4 for a proxy (dataset names a different material, or none of the component's words); 4–5 when the dataset is for a different material class (e.g. aluminium processed with a steel dataset); 3 for an estimate or vendor figure without a dataset |
| **GeR** (geography) | 1 same country as the origin; 2 a region containing it; 3 GLO or RoW; 4 another country in the same region; 5 another region (e.g. EU dataset for production in China) |
| **TiR** (time) | Years between the dataset's reference year (ecoinvent 3.x → 2013 + x; year in the source name) and the report year: ≤2 → 1, ≤4 → 2, ≤6 → 3, ≤8 → 4, more → 5 |
| **P** (precision) | 1 measured; 2 calculated from primary data; 3 secondary database value; 4 estimate, vendor or assumed value |

The rules read only what the form says. A stated rating can be right for reasons the form does not record. Where it is, add the reason in the "details" column.

## What it checks

| Rule | Severity | Check |
|------|----------|-------|
| CF-01 | Error | Rating cell holds text instead of a number (e.g. "1+R25": a formula that lost its "=") |
| CF-02 | Error | DQR is not the average of the ratings |
| CF-03 | Error | Rating outside 1–5 for a used dataset |
| CF-04 | Error / Warning | Emission factor without data source, dataset name or valid UUID |
| CF-05 | Warning | Dataset material does not match the component |
| CF-06 | Warning / Info | Proxy dataset rated as if it were the real material |
| CF-07 | Warning / Info | Stated TeR / GeR / TiR / P better than the rules suggest |
| CF-08 | Warning | Emission factor outside the public reference range (also flags ×1000 unit slips and fuel-supply datasets used for burned fuel) |
| CF-09 | Info / Warning | Which published China electricity figure is used (MEE carbon footprint factor vs CO2 emission factor) |
| CF-10 | Error | Emissions ≠ quantity × emission factor (materials, processes, energy, transport legs) |
| CF-11 | Warning | Estimated or vendor data rated 1 on every criterion |
| CF-12 | Info | Several database versions mixed |
| CF-14 | Warning | Excel error values (#VALUE!, #REF!, #DIV/0!) in used sheets |
| CF-15 | Info | Report information incomplete (completion date, external review, mislabelled columns) |
| CF-16 | Error | Product totals do not add up (module = cells × cell energy, mass and footprint, per-kWh figure) |
| CF-17 | Info | Same material with a different factor or dataset in another uploaded file |
| CF-20 – CF-28 | Error / Warning / Info | Life-cycle inventory sheets: product name vs specification, data period (at least 6 months), line in file name vs form, per-unit = total ÷ production, mass balance gap ≥ 5%, unit labels, data from other periods, t·km = mass × distance, blank required fields |

## Reference values

The factor ranges are public reference figures (IAI for aluminium, worldsteel, PlasticsEurope eco-profiles, International Copper Association, IPCC 2006 for fuels, DESNZ / GLEC for freight, MEE for Chinese electricity, battery LCA literature). They are **plausibility ranges**: they catch wrong datasets and unit slips, not small differences. No licensed database content (ecoinvent, Sphera) is included or needed.

[All tools](/en/tools.html) · [Farm produce carbon calculator](/en/farm-carbon.html)

::: warning Please note
This is a self-check aid. It reads header names and text patterns. An unusual template layout may not be recognised, and a dataset choice that is right for reasons not written in the form can be flagged. It does not replace a critical review or third-party verification.
:::
