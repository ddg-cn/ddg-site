---
title: SLCP Verifier Tool QC Checker (2.0.0)
description: Check a filled offline SLCP Verifier Tool 2.0.0 before submission and get an Excel QC report
---

# 🧪 SLCP Verifier Tool QC Checker

For the **offline SLCP Verifier Tool 2.0.0**. Before submitting, a verifier drops the filled `.xlsm` onto the checker and gets an Excel report listing every input to fix or review. The tool file itself is never modified.

[⬇️ Download v1.1 (zip, about 34 KB)](/downloads/tools/slcp-verifier-qc-checker-v1.1.zip)

## Quick start

Requires Python 3.9+ with `openpyxl`:

```bash
py -m pip install openpyxl
```

- **Drag and drop:** drop one or more filled `.xlsm` files onto `Run Quality Checker.bat`.
- **Command line:** `py vt_quality_checker.py "<tool>.xlsm" [-o "<report>.xlsx"]`

The report is saved next to the tool as `<tool name> - QC Report <yymmdd>.xlsx`, with three sheets:

| Sheet | Contents |
|------|------|
| **Summary** | Count per rule, plus rules that could not run on this template |
| **Issues** | One row per finding: severity, rule, question number and key. The *Tool Row* link opens the tool at that row (keep the report in the same folder as the tool) |
| **Rules** | The full rule catalogue |

Severity: **Error** = must fix · **Warning** = review · **Info** = note.

## What it checks

| Group | IDs | Summary |
|------|------|------|
| Language | LANG-01..04 | Verification Data, Corrected Response and verifier answers in English (except "in local language as per business license" questions). A facility answer in another language cannot be *Accurate* |
| Selection | SEL-01..16 | *Accurate* has no correction. *Inaccurate* / *Updated* need a correction that differs from the facility answer, plus Verification Data. *Not visible* means a blank facility answer. *No longer applicable* has no correction or data. A facility answer needs a selection, and the selection must be in the question's list |
| Data type | DATA-01..08 | Whole numbers, non-negative numbers, 0–100 %, lat/long in range and inside the facility country, YYYY-MM-DD dates, answers in the option list, checkboxes = X |
| Legal flag | LEGAL-01..05 | X needs a Legal Reference. A violation needs X plus a reference. X on a compliant or NALR answer is flagged |
| Specific | SPEC-01..20 | 60 h and rest days, forced vs voluntary overtime, start/end dates, duplicate certifications and subcontractors, youngest worker, volume vs capacity, contact details, prison labour, harassment cases, working-hour thresholds, sampling vs answers, OS ID format |
| Relevance | REL-01..06 | A child answered while the parent's answer doesn't trigger it. "None of the above" ticked with other options. Breakdown > total (e.g. male > total workers). Implausible proportions. Visible questions left unanswered |
| Plausibility | PLAUS-01..04 | Nationalities, languages or wage grades = 0. Lead time over 52 weeks. A wage of 0 for one gender only. Built area under 2 m² per worker |

## v1.1: rules calibrated on real reports

A rule that fires on many genuine, verified reports is more likely wrong than the reports. In v1.1 the relationship and plausibility rules were run against **1,000 randomly sampled, anonymised platform VRFs (tool versions 1.4–1.7.1)**:

| Rule | Fired before | Change | After |
|------|------|------|------|
| OSH committee employer + worker ≠ total | 37 % | Committees often have other members; only *more than* the total is flagged | 3 % |
| Take-home pay below basic wage | 18 % | Deductions are common; flagged below 80 % of basic | 6 % |
| Largest union members > total workers | 13 % | Error → Warning | — |
| Legal Reference without X | 60 % | Warning → Info | — |
| New PLAUS-01..04 | — | — | 0.1–3.4 % each |

Most breakdown > total cases in the data came from hidden questions still holding old values. The checker only checks questions that currently apply, so it doesn't report them.

::: info Data and privacy
Only aggregated firing rates were used. Every report was anonymised locally before analysis: facility, verifier body and personal details were replaced or dropped, and the raw data never left the PC. The download contains no facility, verifier or report data.
:::

## Maintenance

- Question keys in the SPEC and relevance rules are written for v2.0.0. If a key disappears in a later version, that rule is skipped and listed under *Notes* on the Summary sheet. It doesn't crash.
- Thresholds are constants at the top of `vt_quality_checker.py`.
- `tests/test_qc.py` injects one error per rule into a filled tool and checks that the rule fires (76 tests in v1.1): `py test_qc.py "<filled tool>.xlsm"`.

::: warning Please note
This is a self-check aid for verifiers. It does **not** replace the SLCP verification protocol or a verifier body's quality review.
:::
