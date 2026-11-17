---
title: amfori BSCI Audit Report QC
description: Check amfori BSCI audit reports in your browser
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🌐 amfori BSCI Audit Report QC <Badge type="warning" text="preview" />

Drop **amfori BSCI audit reports** (platform extract, monitoring result or monitoring summary report) to check that ratings, findings, worker numbers, wages, hours and dates agree. Reports of the same site are compared with each other.

<ClientOnly>
  <ReportQc kind="bsci" lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The PDF is read inside your browser and is not uploaded to any server. The first check downloads the PDF reader (about 1 MB), which your browser then caches.
:::

## Reading the results

- **Error** = must fix · **Warning** = review · **Info** = note.
- Click a count to filter by severity; filter by rule or file, or search for a reference, page or text.
- **Page** is the page of the PDF. **Ref.** is the code section, question or finding the issue is about.
- **Download Excel report** gives the same list (Summary, Issues and Rules sheets) to share or track fixes.

## What it checks

| Rule | Severity | Check |
|------|----------|-------|
| BSCI-01 | Error | Key audit or site field missing (IDs, site, address, dates, audit company, auditors, ratings) |
| BSCI-02 | Error | Audit dates out of order, in the future, or inconsistent within the report |
| BSCI-03 | Warning | Expiry / follow-up date does not fit the rating (A/B: 2 years; C/D/E: 12 months, follow-up 2–12 months after the full audit) |
| BSCI-04 | Info | Report submitted more than 15 calendar days after the last audit day |
| BSCI-05 | Warning | Overall rating does not follow from the Performance Area ratings |
| BSCI-06 | Error | Ratings differ between parts of the report (rating table, PA headings, summary table) |
| BSCI-07 | Error | Performance Area rated B–E but no open finding is reported for it |
| BSCI-08 | Warning | Summary list of areas / questions with findings does not match the findings section |
| BSCI-09 | Warning | Finding cites a question number that differs from its heading or belongs to another Performance Area |
| BSCI-10 | Warning | Finding without a description of what was found |
| BSCI-11 | Error | Finding claims a breach of law but cites no law, rule or section |
| BSCI-12 | Error | Worker numbers do not add up or differ between the metrics and the description |
| BSCI-13 | Error | Sample arithmetic: "X out of Y" with X > Y, or a percentage that does not match X/Y |
| BSCI-14 | Error | Lowest wage below the legal minimum wage without a wage finding |
| BSCI-15 | Warning | Weekly hours over 60 described while Decent Working Hours has no finding |
| BSCI-16 | Warning | Area described as compliant, but the text describes a gap |
| BSCI-17 | Warning | Placeholder, blank or unfinished text |
| BSCI-18 | Warning | Sentence pasted twice in a row |
| BSCI-19 | Warning | Spelling error from the common-typo list |
| BSCI-20 | Warning | Zero-tolerance issue mentioned in the report |
| BSCI-21 | Info | Finding on a CRUCIAL question |
| BSCI-22 | Warning | Audit description (days, dates, man-days) disagrees with the header |
| BSCI-23 | Error | Same site in two reports with different facility data or worker numbers |
| BSCI-24 | Info | Rating changes between audits of the same site |

::: warning Please note
Works with the 13-Performance-Area reports (2018 extract, 2021 monitoring result, 2023 monitoring summary). In the 2021 and 2023 layouts the overall rating is a coloured bar, not text, so it is worked out from the 13 area ratings and shown as "derived". The overall-rating rule (BSCI-05) follows a public summary of amfori's method; amfori keeps the calculation internal, so it is a warning, not an error. Reports under the newer 6-area methodology get the text-wide checks only.
:::

To tabulate many reports, use the [Report data extractor](/en/data-extract.html). · [All tools](/en/tools.html)
