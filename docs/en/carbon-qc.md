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

## Check against a standard

Choose a standard above the drop area. The form checks below always run; the standard adds its own rules (CF-30 to CF-38). **Automatic** applies the EU battery rules to the EU battery CFR template and no standard to other forms.

| Standard | Data quality rating | Main rules checked |
|---|---|---|
| EU Battery Regulation (method still a draft) | TeR, GeR, TiR; DQR = sum ÷ 3; no P | EF-compliant datasets; secondary dataset TeR ≤ 4 for most relevant processes; national consumption-mix electricity, no certificates or PPAs; EF 3.1; cut-off ≤ 1% of mass per component; no offsets; functional unit per kWh over service life |
| PEF – Recommendation (EU) 2021/2279 | TeR, GeR, TiR, P; DQR = sum ÷ 4 | company-specific data DQR ≤ 1.5 (each ≤ 2, P ≤ 3); secondary data of most relevant processes DQR ≤ 3.0; EF-compliant datasets; cut-off ≤ 3%; electricity supplier-specific → residual mix |
| ISO 14067:2018 | no numeric scale | documented: cut-off criteria, allocation, GWP, biogenic carbon, land-use change, time period, data quality |
| GHG Protocol Product Standard (2011) | guidance only | no offsets; documented: GWP source, biogenic and land-use change, allocation, time period, assurance, uncertainty |
| PACT v3.0 · Catena-X v4 · TfS v3.0 | TeR, GeR, TiR, 1–5 | TeR 1–2 only for primary data (database datasets 3 or worse); cut-off ≤ 3%; IPCC AR6; electricity supplier-specific → residual mix; primary data share documented |

Sources: [Regulation (EU) 2023/1542](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32023R1542) and the [April 2024 draft method](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=PI_COM:Ares(2024)3131389) (not yet adopted); [Recommendation (EU) 2021/2279](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32021H2279); [GHG Protocol Product Standard](https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard_041613.pdf); [PACT Methodology v3.0](https://www.carbon-transparency.org/resources/pact-methodology-v3-methodology-for-calculating-and-exchanging-cradle-to-gate-product-carbon-footprints-pcfs); [Catena-X PCF Rulebook v4](https://catena-x.net/wp-content/uploads/2025/10/Catena-X-Product-Carbon-Footprint-Rulebook_v4-with-line-numbers.pdf); [TfS PCF Guideline v3.0](https://tfs-initiative.com/app/uploads/2024/12/TfS-PCF-Guidelines-2024.pdf). ISO 14067 is a paid standard, so its checks only test that the items are documented; confirm against your copy. "Most relevant process" cannot be read from a form, so rules that apply only to most relevant processes are warnings to review.

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
| CF-30 | Error | Rating not allowed under the selected standard (e.g. TeR 1–2 for a database dataset under PACT) |
| CF-31 | Warning / Info | DQR formula or criteria differ from the selected standard |
| CF-32 | Warning | Data quality above the threshold of the selected standard |
| CF-33 | Warning | Datasets not EF-compliant where the standard requires EF-compliant data |
| CF-34 | Error / Warning / Info | Electricity modelling does not follow the selected standard |
| CF-35 | Warning / Info | GWP set or characterisation method differs from the standard or is not stated |
| CF-36 | Warning | Cut-off above the limit of the selected standard |
| CF-37 | Error | Offsets or carbon credits included in the footprint |
| CF-38 | Info | Item the selected standard asks to document not found in the form |

## Reference values

The factor ranges are public reference figures (IAI for aluminium, worldsteel, PlasticsEurope eco-profiles, International Copper Association, IPCC 2006 for fuels, DESNZ / GLEC for freight, MEE for Chinese electricity, battery LCA literature). They are **plausibility ranges**: they catch wrong datasets and unit slips, not small differences. No licensed database content (ecoinvent, Sphera) is included or needed.

[All tools](/en/tools.html) · [Farm produce carbon calculator](/en/farm-carbon.html)

::: warning Please note
This is a self-check aid. It reads header names and text patterns. An unusual template layout may not be recognised, and a dataset choice that is right for reasons not written in the form can be flagged. It does not replace a critical review or third-party verification.
:::
