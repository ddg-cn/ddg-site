---
title: SLCP Verifier Tool Online QC
description: Check a filled offline SLCP Verifier Tool in your browser - nothing is uploaded - and see every finding on the page or download an Excel report
---

<script setup>
import SlcpQcChecker from '../components/SlcpQcChecker.vue'
</script>

# 🧪 SLCP Verifier Tool Online QC

Before submitting, drop the filled **offline SLCP Verifier Tool** below. Every input to fix or review is listed on the page, and you can download the findings as an Excel report.

<ClientOnly>
  <SlcpQcChecker lang="en" />
</ClientOnly>

::: info Your file stays on your computer
The checker (Python) runs inside your browser. The tool is read in memory on your machine and is not uploaded to any server. The first check downloads about 15 MB of runtime, which your browser then caches.
:::

## Reading the results

- **Error** = must fix · **Warning** = review · **Info** = note.
- Click a count above to filter by severity. You can also filter by rule or search for a key, question number or text.
- **Row** is the row in the tool's `SLCP Data Collection Tool` sheet. In the Excel report the row is a link: keep the report in the same folder as the tool and it opens that row.
- Question numbers come from your tool, so they match what you see in it.

## What it checks

| Group | IDs | Summary |
|------|------|------|
| Language | LANG-01..04 | Verification Data, Corrected Response and verifier answers in English (except "in local language as per business license" questions). A facility answer in another language cannot be *Accurate* |
| Selection | SEL-01..18 | *Accurate* has no correction. Any correction differs from the facility answer. *Inaccurate* / *Updated* need a correction plus Verification Data. A blank facility answer only with *Facility did not reply*, *Not visible*, *No longer applicable* or *Verification only*. *No longer applicable* has no correction or data. A facility answer needs a selection from the question's list. Verification Data is required for mandatory narrative keys, *Not applicable due to special facility circumstances* and *Facility did not reply*, is at most 6,000 characters and must contain "Reason:" plus a source. Unticked checklist options are valid answers and are not flagged |
| Data type | DATA-01..09 | Whole numbers, non-negative numbers, 0–100 %, lat/long in range and inside the facility country, YYYY-MM-DD dates (required dates not blank), answers in the option list, checkboxes = X |
| Legal flag | LEGAL-01..07 | X and a Legal Reference always go together, and need Verification Data. A violation needs X plus a reference ("Is the facility failing to …" questions count *Yes* as the violation). X on a compliant or "no applicable legal requirement" answer is flagged. China with a union in place: legal non-compliance on the free-to-form, free-to-join and federations questions |
| Specific | SPEC | Validation method not *SLCP Full Virtual Verification*, 60 h and rest days, forced vs voluntary overtime, duplicate certifications and subcontractors, youngest worker, volume vs capacity, contact details, harassment cases, working-hour thresholds, sampling vs answers, OS ID format |
| Relevance | REL-01..06 | A child answered while the parent's answer doesn't trigger it. "None of the above" ticked with other options. Breakdown > total. Implausible proportions. Visible questions left unanswered |
| Plausibility | PLAUS-01..04 | Nationalities, languages or wage grades = 0. Lead time over 52 weeks. A wage of 0 for one gender only. Built area under 2 m² per worker |
| Platform advisory | ADV-01..04 | Non-consecutive verification days without a reason. No *Inaccurate - Incorrect* in the report. *Not applicable due to special facility circumstances* used. Zero legal non-compliances |

**SLCP platform checks.** Since November 2026 the SLCP platform checks reports on submission ([list of automated data quality checks](https://slcp.zendesk.com/hc/article_attachments/31495285677596)). The checker covers the blocking checks #1–#19 as Errors and the advisory checks #29–#32 as Warnings; each rule's title names its platform check, e.g. *[SLCP #19]*. Not covered: #10 joint-assessment details (not in the offline tool) and #33 Better Work Zero Tolerance Protocol.

Only questions that currently apply are checked. A question hidden by show/hide logic isn't reported, even if it still holds an old value.

::: warning Please note
This is a self-check aid for verifiers. It does **not** replace the SLCP verification protocol or a verifier body's quality review.
:::
