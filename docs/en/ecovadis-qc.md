---
title: EcoVadis Questionnaire QC
description: Check your EcoVadis questionnaire export (Survey Full PDF) in your browser before submitting
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🌱 EcoVadis Questionnaire QC <Badge type="warning" text="preview" />

Download the **EcoVadis questionnaire** as PDF (*Survey Full*) and drop it here before you submit. The checker looks at question status, the documents you attached and the KPI values.

<ClientOnly>
  <ReportQc kind="ecovadis" lang="en" />
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

It reads each question (status, code, impact), each attached document (name, type, indicated pages, comment) and each KPI row (year, unit, value).

| Rule | Severity | Check |
|------|----------|-------|
| EV-01 | Error | Question not complete (status Mandatory / Incomplete) |
| EV-02 | Error | Attached document without indicated pages |
| EV-03 | Warning | Indicated page range is very wide or malformed |
| EV-04 | Warning | Document name or comment not in English (analysts may not be able to read it) |
| EV-05 | Warning | Document name contains an internal note (e.g. "decrypted", "draft", "copy", "test") |
| EV-06 | Info | One document attached to many questions (check it really covers each topic) |
| EV-07 | Info | Document type "Other" (a specific type helps the analyst) |
| EV-08 | Error | KPI: year given but no value |
| EV-09 | Warning | KPI value implausible (percentage over 100, negative, decimal count, ratio entered as a percent) |
| EV-10 | Warning | KPI year more than two years old, or a target year already reached |
| EV-11 | Warning | "Please specify" left empty for an "Other" option that has a document |
| EV-12 | Warning | Same document attached twice to one answer option |
| EV-13 | Info | Theme with few supporting documents |
| EV-14 | Warning | Placeholder or unfinished text |
| EV-15 | Info | Document comment explains a gap or partial evidence |

[All tools](/en/tools.html)

::: warning Please note
This is a self-check aid built from sample reports. Text rules (for example "Yes answer whose comment describes a gap") are heuristics and can flag a correct answer. It does **not** replace the scheme's own quality review.
:::
