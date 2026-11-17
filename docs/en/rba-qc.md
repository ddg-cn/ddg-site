---
title: RBA Audit Report QC
description: Check RBA VAP Validated Audit Reports (full and executive summary) in your browser
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🏭 RBA Audit Report QC <Badge type="warning" text="preview" />

Drop an **RBA Validated Audit Report** (VAP full report and/or executive summary report) to check that the counts, dates, findings and data points agree with each other. Select the full report and the summary report together and they are compared.

<ClientOnly>
  <ReportQc kind="rba" lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The PDF is read inside your browser and is not uploaded to any server. The first check downloads the PDF reader (about 1 MB), which your browser then caches.
:::

## Reading the results

- **Error** = must fix · **Warning** = review · **Info** = note.
- Click a count to filter by severity; filter by rule or file, or search for a reference, page or text.
- **Page** is the page of the PDF. **Ref.** is the question, checkpoint or section the finding is about.
- **Download Excel report** gives the same list (Summary, Issues and Rules sheets) to share or track fixes.

## Estimated score

The summary card shows an **estimated score** worked out from the finding counts: 200 minus 20 per Priority, about 6.3 (6–7) per Major and about 2 (1–3) per Minor non-conformance. RBA does not publish its formula, so this is a rule of thumb. It matched the one real report used for testing (8 Major and 1 Minor: 147.6/200), but treat it as a guide. It helps you see how far a facility is from 160 (Silver), 180 (Gold) or 200 (Platinum), and RBA-24 flags a stated score that falls outside the range.

## What it checks

It reads the audit and facility information, the conformance results, the finding summary by section, the non-conformance details, the process summary and every question in the full listing (rating, conclusion, data points), plus the population figures.

| Rule | Severity | Check |
|------|----------|-------|
| RBA-01 | Error | Audit or facility information field missing |
| RBA-02 | Error | Audit dates out of order (start ≤ closing meeting ≤ QC completed) or implausible gaps |
| RBA-03 | Warning | Audit reference number does not match the start date or country |
| RBA-04 | Error | Conformance results do not add up (conformance + NCs + N/A = total) |
| RBA-05 | Error | Finding summary by section does not match the overall results |
| RBA-06 | Error | Compliant / minor / major / priority percentages do not match the counts |
| RBA-07 | Error | Non-conformance details list does not match the ratings in the results or the full listing |
| RBA-08 | Error | Executive summary disagrees with the report (finding counts, audit dates, closing meeting) |
| RBA-09 | Warning | Major / priority finding missing from the executive summary list |
| RBA-10 | Warning | Rating and conclusion disagree (NC without evidence, or Conformance that describes a gap) |
| RBA-11 | Error | Legal non-conformance without a legal reference |
| RBA-12 | Error | Sample arithmetic: "X out of Y" with X > Y, or a percentage that does not match X/Y |
| RBA-13 | Warning | Stated average or highest value does not match the monthly figures |
| RBA-14 | Warning | Blank value left in a data point (e.g. "highest of hrs", empty reference) |
| RBA-15 | Warning | Sentence pasted twice in a row |
| RBA-16 | Info | Record-review periods differ within one question |
| RBA-17 | Error | Population figures do not add up or differ from the header |
| RBA-18 | Warning | Question rated Not Applicable without a reason |
| RBA-19 | Warning | Spelling error from the common-typo list |
| RBA-20 | Error | Executive summary report differs from the full report |
| RBA-21 | Warning | Placeholder, "Not disclosed" or unfinished text |
| RBA-22 | Warning | Overall score implausible for the findings (score > 200, or 200 with NCs) |
| RBA-23 | Info | Data point or conclusion mostly not in English |
| RBA-24 | Warning | Overall score outside the range estimated from the finding counts |

[All tools](/en/tools.html)

::: warning Please note
This is a self-check aid built from sample reports. Text rules (for example "Yes answer whose comment describes a gap") are heuristics and can flag a correct answer. It does **not** replace the scheme's own quality review.
:::
