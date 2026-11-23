---
title: Policy Consistency Check
description: Compare a set of policies, procedures and forms in your browser and find where they contradict each other
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import PolicyQc from '../components/PolicyQc.vue'
</script>

# 📚 Policy Consistency Check

Drop a **set of company documents** (policies, manuals, procedures, forms, records) to find where they contradict each other: different numbers for the same rule, wrong document names or codes in references, terms defined two ways, retention periods that don't match. Each finding says which documents and sections to change.

<ClientOnly>
  <PolicyQc lang="en" />
</ClientOnly>

::: info Your files stay on your computer
The documents are read inside your browser and are not uploaded to any server. The first check downloads a small reader (about 30 KB, plus about 1 MB if you add PDFs), which your browser then caches.
:::

## Reading the results

- **Issues** lists every finding with a suggested fix. **Error** = must fix · **Warning** = review · **Info** = note.
- **Topics** shows each compared rule (working hours, minimum age, overtime pay, leave, frequencies…) with the value each document gives, so you can see the whole picture at once.
- **Cited but not uploaded** lists documents your set refers to that you have not added. Add them and run again to check them too.
- **Download Excel report** gives the Issues, Topics, Documents and Cited-not-uploaded lists. The Issues sheet has empty Status and Comment columns for tracking fixes.

## What it checks

| Rule | Severity | Check |
|------|----------|-------|
| PC-01 | Error | Two documents use the same document code |
| PC-02 | Warning | Code in the document header differs from the file name |
| PC-03 | Warning | Document cited by a code that belongs to a different title, e.g. QP-HR-004《招聘管理规定》 when QP-HR-004 is the attendance rule |
| PC-04 | Warning | Cited title is close to, but not the same as, an uploaded document (《…管理制度》 vs 《…管理规定》) |
| PC-05 | Warning | Same topic, different values across documents. The suggested value comes from the policy / manual level, otherwise from the majority |
| PC-06 | Warning | The same sentence appears in several documents with different numbers |
| PC-07 | Warning | Record retention period stated differently (a form's own header vs other documents) |
| PC-08 | Warning / Info | Term defined differently in different documents |
| PC-09 | Warning | Company named differently in the scope or header |
| PC-10 | Info | Department named in more than one way (质量部 / 质量管理部) |
| PC-11 | Warning | Value is less protective than the PRC national statutory figure (child labour age, overtime caps, overtime pay, maternity leave, probation). Chinese documents only |
| PC-12 | Info | Cited document code is not in the uploaded set |
| PC-13 | Info | Cited internal document is not in the uploaded set |
| PC-14 | Info | Header fields blank or placeholder text left |

**Topics compared:** child labour age, juvenile worker age, standard daily and weekly hours, maximum weekly hours, overtime caps (day / month), rest days, overtime pay (working day / rest day / holiday), maternity leave, probation, grievance acknowledgement and closing times, gift thresholds, management review, internal audit and drill frequency, wage payment date.

::: warning Please note
This is a self-check aid. It reads text patterns and can miss a rule worded in an unusual way or flag two values that are both correct in their own context. Decide each finding yourself. Statutory figures are PRC national figures; local rules can differ. It does not replace legal review.
:::

---

🧰 [All tools](/en/tools.html)
