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
| Selection | SEL-01..16 | *Accurate* has no correction. *Inaccurate* / *Updated* need a correction that differs from the facility answer, plus Verification Data. *Not visible* means a blank facility answer. *No longer applicable* has no correction or data. A facility answer needs a selection, and the selection must be in the question's list. Unticked checklist options are valid answers and are not flagged |
| Data type | DATA-01..08 | Whole numbers, non-negative numbers, 0–100 %, lat/long in range and inside the facility country, YYYY-MM-DD dates, answers in the option list, checkboxes = X |
| Legal flag | LEGAL-01..05 | X needs a Legal Reference. A violation needs X plus a reference ("Is the facility failing to …" questions count *Yes* as the violation). X on a compliant or "no applicable legal requirement" answer is flagged |
| Specific | SPEC | 60 h and rest days, forced vs voluntary overtime, duplicate certifications and subcontractors, youngest worker, volume vs capacity, contact details, harassment cases, working-hour thresholds, sampling vs answers, OS ID format |
| Relevance | REL-01..06 | A child answered while the parent's answer doesn't trigger it. "None of the above" ticked with other options. Breakdown > total. Implausible proportions. Visible questions left unanswered |
| Plausibility | PLAUS-01..04 | Nationalities, languages or wage grades = 0. Lead time over 52 weeks. A wage of 0 for one gender only. Built area under 2 m² per worker |

Only questions that currently apply are checked. A question hidden by show/hide logic isn't reported, even if it still holds an old value.

## Calibrated on real reports

A rule that fires on many genuine, verified reports is more likely wrong than the reports. The rules were run against **1,000 randomly sampled, anonymised platform VRFs**, and the ones that fired too often were adjusted:

| Rule | Fired before | Change | After |
|------|------|------|------|
| OSH committee employer + worker ≠ total | 37 % | Committees often have other members; only *more than* the total is flagged | 3 % |
| Take-home pay below basic wage | 18 % | Deductions are common; flagged below 80 % of basic | 6 % |
| Unticked checklist option marked *Accurate* or *Not visible* | 31–38 % | Unticked is a valid answer; no longer flagged | — |
| Legal Reference without X | 60 % | Warning → Info | — |

Only aggregated rates were used. Every report was anonymised locally before analysis, and no facility, verifier body or personal data was involved.

## Offline version

To check many files on your own PC, download the offline version (Python 3.9+ with `openpyxl`):

[⬇️ Download offline version (zip)](/tools/slcp-qc/slcp-verifier-qc-checker.zip)

Drop one or more `.xlsm` files onto `Run Quality Checker.bat`. The report is saved next to each tool.

::: warning Please note
This is a self-check aid for verifiers. It does **not** replace the SLCP verification protocol or a verifier body's quality review.
:::
