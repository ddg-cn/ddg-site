---
title: ESG Report Lens
description: Spot-check a sustainability / ESG report in your browser - numbers that don't add up, claims that need evidence, gaps against the exchange guideline - and export the issue list
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import EsgLens from '../components/EsgLens.vue'
</script>

# 🔍 ESG Report Lens <Badge type="warning" text="preview" />

Upload a sustainability, ESG or CSR report (PDF), or paste a link to one. You get a short **read** of what is good and what needs work, plus a list of issues with page references that you can export to Excel or CSV.

<ClientOnly>
  <EsgLens lang="en" />
</ClientOnly>

## What it checks

| Type | What it looks for |
|------|------|
| **Numbers** | Figures in the report's data tables that don't add up: Scope 1 + Scope 2 ≠ the stated total; men + women ≠ headcount; a breakdown (by gender, age, region…) that doesn't reach 100%; an "of which" item larger than its total; percentages above 100%; the same indicator with two different values; intensity ≠ total ÷ revenue; large year-on-year swings with no boundary or method explanation |
| **Claims** | Statements that need evidence: absolute claims (零排放, pollution-free), carbon-neutral / zero-carbon claims without scope or certification, offsets, long-dated targets with no interim milestone, reductions without a baseline, targets without a date, intensity-only reductions, 100% renewable, unsupported superlatives, vague eco labels, partial boundaries and more. A claim is lowered in priority when it is scoped (e.g. *wastewater* zero discharge) or when supporting detail appears elsewhere in the report; recognised programme names such as ZDHC are not flagged |
| **Gaps** | 119 indicators mapped to the exchange sustainability-reporting guideline (2024), GRI and ISSB S2. Key gaps: Scope 1 / 2 figures, external assurance, materiality assessment, GHG method and base year, reporting boundary |
| **Year on year** | When you add last year's report (step 2, or "Compare with last year's report" after a check): indicators that disappeared or lost their figure, prior-year values that changed without a restatement note, targets that are no longer mentioned |

## Standards

Choose what to check against, or leave **As stated in the report** ticked: the tool reads which standards the report says it follows ("prepared with reference to GRI…", "参照…") and checks against those. If the report names none, it uses the exchange guideline and GRI.

| Standard | Kind | Clauses |
|------|------|------|
| Exchange guideline (2024) - SSE No.14 / SZSE No.17 / BSE No.11 | Exchange rule | 50 |
| GRI Standards (GRI 2, 3 and topic standards) | Reporting standard | 94 |
| ISSB (IFRS S1 / S2) | Reporting standard | 22 |
| HKEX ESG Reporting Code (Appendix C2) | Exchange rule | 50 |
| IFC Performance Standards | Reference lens - written for financed projects, not for reports, so scores run lower | 26 |
| Rater key issues | Rater lens - built from the key-issue lists raters such as MSCI publish; **not an MSCI rating**, not affiliated with any rater; sector-specific issues are shown but not scored | 32 |

Each standard gets its own score (Disclosed = 1, Partly = ½), and gaps name the clauses that expect the item (e.g. *GRI 305-3 · HKEX D Scope 3*). TCFD and SASB are recognised but not scored yet.

**GRI content index check.** When the report has a GRI content index, every entry is checked: if the index says a disclosure is reported, is there matching content in the report? If the index gives page numbers, the tool also works out the printed-to-PDF page offset and checks that each cited page (± 1) holds that content. Entries the index marks as omitted are counted, not flagged.

## Content rating

The grade (A–E) rates **the report as a piece of disclosure** - how complete, consistent and verifiable it is. It does not rate the company's ESG performance. Six parts, each 0-100, weighted:

| Part | Weight | Based on |
|------|------|------|
| Coverage | 20% | Average score of the selected reporting standards and exchange rules (the two lenses are shown but not averaged), with E / S / G shown separately |
| Data depth | 20% | Share of quantitative indicators with a figure, number of table values, years of comparatives; items dropped since last year lower it |
| Numbers add up | 20% | Arithmetic checks passed vs. number problems found, plus GRI content-index errors; not rated when there is too little to check |
| Claims are supported | 15% | High / Medium / Low claim flags and the density of vague commitments |
| Targets | 10% | Dated, quantified near-term targets; flags for missing baselines, missing dates or long-dated-only targets |
| Verifiable | 15% | External assurance, GHG method / base year, reporting boundary, materiality assessment |

A ≥ 85 · B ≥ 70 · C ≥ 55 · D ≥ 40 · E below 40. Each part shows the reason behind its score, so you can check it against the report.

## Reading the results

- **High / Medium** = look at these first · **Low** = worth checking · **Info** = context (hidden by default; click the chip to show).
- Click a row to see why it matters and what good disclosure looks like.
- Every issue cites a page. Open the page before quoting anything: this is automated screening, not an audit opinion.

::: info Privacy
The PDF is read **in your browser** (pdf.js) and analysed there (Python in WebAssembly); the report is not uploaded or stored. When you paste a link, report sites such as cninfo don't allow other websites to download their files, so the file is passed through a small scdd.pro relay in 4 MB pieces; nothing is kept.
:::

::: warning Limits
- Scanned PDFs (images without a text layer) can't be read yet.
- Number checks need data in tables. Figures shown only in charts or images are not checked.
- Coverage is keyword-based: it shows that a topic is mentioned, not that the disclosure is good.
:::
