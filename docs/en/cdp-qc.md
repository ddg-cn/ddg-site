---
aside: false
title: CDP Response QC
description: Check your CDP questionnaire response export in your browser before submitting it
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🌍 CDP Response QC

Export your **CDP corporate questionnaire response** from the CDP portal and save it as PDF, then drop it here before you submit. The export leaves out unanswered questions, so the checker also lists core questions that are missing. CDP score reports are recognised and summarised, but there is nothing in them to check.

<ClientOnly>
  <ReportQc kind="cdp" lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The PDF is read inside your browser and is not uploaded to any server. The first check downloads the PDF reader (about 1 MB), which your browser then caches.
:::

## Reading the results

- **Error** = must fix · **Warning** = review · **Info** = note.
- Click a count to filter by severity; filter by rule or file, or search for a reference, page or text.
- **Page** is the page of the PDF. **Ref.** is the question, checkpoint or section the finding is about.
- **Download Excel report** gives the same list (Summary, Issues and Rules sheets) to share or track fixes.

## What it checks

It reads every question and data point in the export (selected options, numbers, dates, text) and recalculates the totals that CDP asks you to break down.

| Rule | Severity | Check |
|------|----------|-------|
| CDP-01 | Warning | Core question missing from the export (unanswered questions are left out) |
| CDP-02 | Error | "Select from" list with nothing ticked |
| CDP-03 | Warning | Field left blank |
| CDP-04 | Warning | Reporting year or base year dates inconsistent |
| CDP-05 | Error | Emissions breakdown does not add up to the reported total |
| CDP-06 | Warning | Year-on-year change (7.10.1): percentages imply different previous-year totals |
| CDP-07 | Error | Target base-year figures do not add up |
| CDP-08 | Error | Date after the reporting year or after the export date (e.g. target set after the year it was "active") |
| CDP-09 | Warning | "Same as above" style answer (each answer is scored on its own) |
| CDP-10 | Error | Verification status and verification details disagree |
| CDP-11 | Error | Percentage outside 0–100 |
| CDP-12 | Warning | Response language (1.1) does not match the text |
| CDP-13 | Warning | Malformed year or number in text (e.g. "204年") |
| CDP-14 | Warning | Scope 3 category: status and value/explanation disagree |
| CDP-15 | Info | Same long text pasted in three or more answers |
| CDP-16 | Error | Sign-off (13.3) missing job title or category |
| CDP-17 | Info | Target base year differs from the base year in 7.5 |
| CDP-18 | Info | CDP score report (not a questionnaire response) |
| CDP-19 | Warning | Placeholder or unfinished text |

::: warning Please note
This is a self-check aid built from sample reports. Text rules (for example "Yes answer whose comment describes a gap") are heuristics and can flag a correct answer. It does **not** replace the scheme's own quality review.
:::

---

🧰 [All tools](/en/tools.html) · [Report QC](/en/report-qc.html) · [Report data extractor](/en/data-extract.html)
