---
title: SMETA Audit Report QC
description: Check SMETA audit reports and corrective action plan reports (CAPR) in your browser
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../components/ReportQc.vue'
</script>

# 🧭 SMETA Audit Report QC <Badge type="warning" text="preview" />

Drop a **SMETA audit report** and/or its **corrective action plan report (CAPR)** from the Sedex platform to check that the summary, findings, worker numbers, wages and hours data and dates agree. Select the report and the CAPR of the same audit together and they are compared.

<ClientOnly>
  <ReportQc kind="smeta" lang="en" />
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
| SMETA-01 | Error | Key audit or site field missing (references, site, audit company, dates, audit type, pillars, lead auditor, APSCA number, declarations) |
| SMETA-02 | Error | Audit dates out of order or implausible (audit date vs start/end, declaration dates, time in/out, audit days) |
| SMETA-03 | Warning | Reference number format wrong (ZAA / ZS / ZC / ZAF) or page footers disagree with the audit details |
| SMETA-04 | Info | Finding reference blank ("ZAF-"): the PDF was generated before the findings were submitted on Sedex |
| SMETA-05 | Error | Summary of findings does not match the finding details (missing finding, type, code area, workplace requirement, local-law flag) |
| SMETA-06 | Error | Code-section summary disagrees with the overall summary of findings |
| SMETA-07 | Error | Non-compliance incomplete: issue title, description, corrective action, status, time given or verification method missing |
| SMETA-08 | Error | Local-law non-compliance without a local law reference, or local law issue not linked to a finding |
| SMETA-09 | Warning | Corrective action only repeats the description or issue title |
| SMETA-10 | Warning | Issue title contradicts the description (e.g. title "has been completed", description "not completed") |
| SMETA-11 | Warning | CAPR timeline: due date ≠ audit end + time given, closed before the audit ended or after the PDF date, or open past due |
| SMETA-12 | Error | Worker numbers do not add up (men + women = total, worker types, migrants, pay types, percentages) |
| SMETA-13 | Error | Worker interview numbers do not add up or exceed the workforce (groups + individual, by type, "N groups of M") |
| SMETA-14 | Error | Wages, hours or age data show a breach (over 60 h/week, 7+ days without a day off, pay below legal minimum, under-age workers) but no NC in that code section |
| SMETA-15 | Warning | Working-hours data contradict each other (maximum week above regular hours but zero overtime, average vs regular vs maximum) |
| SMETA-16 | Warning | Data point answer contradicts its own comment or the same question answered elsewhere |
| SMETA-17 | Warning | Code section has "No findings" but the evidence text describes a gap |
| SMETA-18 | Warning | Environmental data inconsistent (renewable = non-renewable electricity, waste routes exceed total waste, hazardous > total) |
| SMETA-19 | Warning | Audit attendance: absence without a reason, or attendance contradicts the union / worker representative data |
| SMETA-20 | Warning | CAPR signed by someone other than the site representative in the declaration |
| SMETA-21 | Warning | Spelling error from the common-typo list or a doubled word |
| SMETA-22 | Warning | Placeholder or blank text (empty evidence for a code section, "TBC", "provide details" not given) |
| SMETA-23 | Warning | Sentence pasted twice in a row |
| SMETA-24 | Info | All management-system grades "Robust" in a code section that has non-compliances |
| SMETA-25 | Error | Audit report and CAPR for the same audit reference disagree (site, dates, audit company, findings) |
| SMETA-26 | Warning | Audit pillars do not match the code sections covered (4-pillar without 10.B / 10.C, or 2-pillar with them) |
| SMETA-27 | Error | Sample arithmetic: "X out of Y" with X > Y, or a percentage that does not match X/Y |
| SMETA-28 | Info | Layout not recognised as a SMETA 7 platform report: only text-wide checks were run |

::: warning Please note
Built for SMETA 7 reports generated on the Sedex platform. Older SMETA 6.x Word reports get the text-wide checks only (SMETA-28). Closure evidence is held on Sedex, not in the PDF, so closed findings are checked through their status, dates and verification method. This tool helps a self-check; it does not replace the audit company's quality review.
:::

To tabulate many reports, use the [Report data extractor](/en/data-extract.html). · [All tools](/en/tools.html)
