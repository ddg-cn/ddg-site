---
title: Report Data Extractor
description: Turn a stack of audit reports, questionnaires and carbon footprint forms into one Excel table, with the columns you choose
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import DataExtract from '../components/DataExtract.vue'
</script>

# 🗂️ Report Data Extractor

Drop a stack of reports and get **one table per report type** in Excel: one row per report with the fields you pick, plus one row per finding, target or dataset. Use it to compare suppliers, build a tracker, or load audit results into your own system without retyping.

<ClientOnly>
  <DataExtract lang="en" />
</ClientOnly>

::: info Nothing is uploaded or stored
Files are read in your browser. The website does not receive or keep them; the Excel file is created on your computer. Your column choices are remembered in this browser only.
:::

## What it reads

| Report type | File | One row per report (examples) | One row per item |
|---|---|---|---|
| Clarity (Bureau Veritas) | PDF | site, module, report no., completed on, total score, NC counts, score and NCs per section | nonconformity: checkpoint, question, comment, status, dates |
| RBA VAP | PDF (full or summary) | audit ref., facility, firm, dates, score, estimated score, NC counts by severity and section, workers | non-conformance: question, section, rating, legal NC, conclusion |
| SMETA | PDF (audit report or CAPR) | Sedex refs, site, audit type and pillars, dates, audit company, workers, NC counts | non-compliance: code section, description, evidence, corrective action, status |
| amfori BSCI | PDF | amfori ID, site, dates, overall and per-area ratings, workers | finding: performance area, question, rating, description |
| EcoVadis | PDF (questionnaire export) | scope, questions complete, documents per theme, KPI and target counts | KPI value: question, KPI, year, value, unit |
| CDP | PDF (response export or score report) | organisation, revenue, reporting year, Scope 1 / 2 / 3, targets; or score and band | emission target: type, science-based, base and target year, reduction %, status |
| SLCP | .xlsm (Verifier or Facility Tool 1.7.x) | facility, OS ID, country, step, accuracy index, workers, verification dates and body, and **any question** in the tool | inaccurate or non-compliant answer: facility answer, verifier selection and answer, explanation |
| Carbon footprint | .xlsx (EU battery CFR template, LCI data sheet) | form type, product, supplier, datasets, factors outside the reference range | dataset: component, EF, database, geography, stated and suggested TeR / GeR / TiR / P |

## How to use it

1. Drop all the files at once (you can mix types) or add more later.
2. Pick a report type tab, then tick the columns for each table. Search to find a field fast; **Default** restores the standard set. For SLCP, every question of the tool is listed by section, so you can add exactly the answers you track.
3. Check the preview, then **Download Excel**. Each table gets its own sheet with filters on. **Download Excel (all types)** puts every type in one workbook.

::: warning Please note
Fields are read from the text layout of each report, so an unusual template or a scanned page can leave a field blank. Check important values against the report. Use the matching [checker](/en/tools.html) to find errors in a report before you rely on its data.
:::

---

🧰 [All tools](/en/tools.html) · [Report QC](/en/report-qc.html)
