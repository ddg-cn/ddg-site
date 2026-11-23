---
aside: false
title: Report QC
description: Drop any Clarity, RBA, SMETA, amfori BSCI, EcoVadis or CDP PDF and check it in your browser; the report type is detected automatically
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🧾 Report QC

One place for all PDF report checks. Drop any mix of **Clarity, RBA, SMETA, amfori BSCI, EcoVadis and CDP** PDFs: each file's type is detected and it gets the same checks as on its own page. Reports of the same type are also compared with each other.

<ClientOnly>
  <ReportQc kind="auto" lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The PDF is read inside your browser and is not uploaded to any server. The first check downloads the PDF reader (about 1 MB), which your browser then caches.
:::

## Reading the results

- **Error** = must fix · **Warning** = review · **Info** = note.
- Each report card shows the key figures read from the report, such as the RBA estimated score or the BSCI overall rating. Its **Rules and notes** link opens the page for that report type, which explains every rule and what the figures mean.
- Click a count to filter by severity; filter by rule or file, or search for a reference, page or text.
- The Excel report has a summary row per file and one row per issue.

## Report types

| Report | Own page (rules and notes) |
|---|---|
| Bureau Veritas CLARITY field audit and self-assessment | [Clarity Audit Report QC](/en/clarity-qc.html) |
| RBA VAP validated audit (full and summary), with estimated score | [RBA Audit Report QC](/en/rba-qc.html) |
| SMETA 7 audit report and CAPR | [SMETA Audit Report QC](/en/smeta-qc.html) |
| amfori BSCI audit report | [amfori BSCI Audit Report QC](/en/bsci-qc.html) |
| EcoVadis questionnaire (Survey Full) | [EcoVadis Questionnaire QC](/en/ecovadis-qc.html) |
| CDP questionnaire response | [CDP Response QC](/en/cdp-qc.html) |


---

🧰 [All tools](/en/tools.html) · [Report data extractor](/en/data-extract.html)
