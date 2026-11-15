---
title: Clarity Audit Report QC
description: Check Bureau Veritas CLARITY field audit and self-assessment reports in your browser before they go to the client
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🔎 Clarity Audit Report QC <Badge type="warning" text="preview" />

Drop one or more **CLARITY field audit reports** (Social, Environment, Health & Safety, Business Ethics and the Summary report, or the self-assessment versions) to check them before release. Select all reports of one site together and they are also cross-checked.

<ClientOnly>
  <ReportQc kind="clarity" lang="en" />
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

It reads the cover page, the section relevancy and score tables, the audit summary, the NC action-plan contact, the *Synthetic Overview of Nonconformities* and every checklist question (answer, comments, reviewer comments).

| Rule | Severity | Check |
|------|----------|-------|
| CL-01 | Error | Cover page field missing (site, address, contact, telephone, email, completed by/on, report no.) |
| CL-02 | Error | Report number differs between pages or has an unexpected format |
| CL-03 | Warning | Report is marked as a draft |
| CL-04 | Error | Completed On date missing, unreadable or in the future |
| CL-05 | Error | Score table: section nonconformities do not add up to the Total row |
| CL-06 | Error | Score table: required-practice NCs exceed total NCs, or a 100 % section has NCs |
| CL-07 | Error | Score table: Total score lies outside the range of the section scores |
| CL-08 | Error | NC count in the score table differs from the rows in the Synthetic Overview of Nonconformities |
| CL-09 | Error | Audit summary states a different number of NCs (or "no NC") than the score table |
| CL-10 | Error | NC action plan contact: NCs raised but contact is NA/blank (or NA expected but filled) |
| CL-11 | Error | Synthetic overview row without NC status or target completion date |
| CL-12 | Warning | Target completion date is before the audit, or more than 12 months after it |
| CL-13 | Warning | NC status "Open" while the comments say the correction was accepted/closed (or "Closed" without follow-up evidence) |
| CL-14 | Warning | NC in the overview, but the checklist answer is "Yes" (or the checkpoint is missing from the checklist) |
| CL-15 | Error | Checklist question without an answer |
| CL-16 | Error | "No", "Partially" or "NA" answer without a comment |
| CL-17 | Warning | "Yes" answer without a comment (no evidence recorded) |
| CL-18 | Warning | "Yes" answer whose comment describes a gap (possible wrong answer) |
| CL-19 | Warning | Comment is too short or generic to serve as evidence |
| CL-20 | Warning | Comment is not in English |
| CL-21 | Info | Same comment pasted on three or more questions |
| CL-22 | Warning | Comment cites a date after the audit date |
| CL-23 | Error | Section marked "Not Relevant" without a justification |
| CL-24 | Warning | Audit summary missing, too short, or still template text |
| CL-25 | Warning | Placeholder or unfinished text |
| CL-26 | Error | Summary report: number of employees or strengths/weaknesses missing |
| CL-27 | Warning | Files of one site disagree (site name, auditor, or audit dates more than 60 days apart) |

[All tools](/en/tools.html)

::: warning Please note
This is a self-check aid built from sample reports. Text rules (for example "Yes answer whose comment describes a gap") are heuristics and can flag a correct answer. It does **not** replace the scheme's own quality review.
:::
