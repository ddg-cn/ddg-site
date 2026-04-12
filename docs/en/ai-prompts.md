# Generating Customized Compliance Documents with AI

With the help of AI assistants (Claude, ChatGPT, Gemini, etc.), compliance professionals can generate high-quality drafts of compliance documents in minutes, significantly compressing the drafting cycle. This page provides a library of ready-to-use prompts (Prompt Library) covering the most common document types such as SAQs, audit checklists, Codes of Conduct, CAPs, worker interview questions, policy documents, and risk matrices. **Please ensure you cross-check AI-generated content with official texts, especially regarding regulation numbers and cited data.**

---

## 1\. Prepare Your "Company Background" First

All high-quality compliance prompts should start with a standardized "Company Background" block. Fill this out once, save it, and paste it before every prompt you use to avoid repetitive explanations.

```text
\[ORGANIZATIONAL CONTEXT]
Company Name: \[Full Name + Common Abbreviation]
Industry: \[e.g., Apparel \& Textile / Consumer Electronics / Food \& Agriculture / Chemicals]
Supply Chain Role: \[Brand / Manufacturer / Trader / Retailer]
Primary Sales Markets: \[EU / USA / China Domestic / UK / Japan / ...]
Applicable Regulatory Frameworks: \[LkSG / CSDDD / UFLPA / UK MSA / EUDR / ...]
Total Number of Suppliers (approx.): \[N], Management Tiers: \[N]
High-Risk Categories / Raw Materials: \[e.g., Cotton, Tin, Cobalt, Palm Oil]
Internal Compliance Maturity: \[Early Setup / System Running / Mature \& Optimized]



**Tip:** If you are using the companion DD Tools Streamlit App, you can generate this background block automatically in the "AI Template Builder" module.



## 2\. Prompt Library: Core Document Generation

Template A: Drafting a Supplier Code of Conduct (SCoC)

Prompt:



"Please refer to the \[ORGANIZATIONAL CONTEXT] provided above and draft a professional Supplier Code of Conduct (SCoC). The document should include the following sections: 1. Labor \& Human Rights (referencing ILO conventions); 2. Occupational Health \& Safety; 3. Environmental Protection (referencing ISO 14001); 4. Business Ethics (Anti-bribery and Fair Competition); 5. Intellectual Property \& Data Security; 6. Grievance Mechanisms \& Non-retaliation. Requirements: Use formal legal language, include a signature block for the supplier's legal representative, and ensure all requirements are actionable."



Template B: Generating a Self-Assessment Questionnaire (SAQ)

Prompt:



"Based on the \[ORGANIZATIONAL CONTEXT], please generate a Supplier Self-Assessment Questionnaire (SAQ) for our Tier 1 manufacturers. For each section (Social, Environmental, Ethics), provide 5–8 high-quality 'Yes/No/Partial' questions. For every question, include a 'Requested Evidence' column (e.g., 'Please provide your last 3 months of payroll records'). Focus the questions on high-risk areas specific to our industry."



Template C: Creating an On-site Audit Checklist

Prompt:



"Acting as a Lead Auditor, generate an On-site Audit Checklist for the \[Industry Name] sector. The checklist must include: 1. Document Review list; 2. Physical Site Tour inspection points (e.g., chemical storage, fire safety); 3. Confidential Worker Interview topics. Format this as a table with a 'Compliance Status' column and an 'Auditor Observation Notes' column."



Template D: Developing a Corrective Action Plan (CAP)

Prompt:



"I have conducted an audit and found the following non-compliance: \[Describe the finding, e.g., 'Factory exit doors were locked during the night shift']. Please act as a senior compliance auditor and generate a Corrective Action Plan (CAP) table. The table should include: 1. Description of the non-compliance; 2. Root cause analysis; 3. Immediate corrective action; 4. Long-term preventive action; 5. Deadline for completion; 6. Required verification documents."



## 3\. Advanced AI Techniques for Compliance

Technique 1: Regulatory Gap Analysis

"I will paste our current Supplier Policy below. Please analyze it against the requirements of the \[Name of Regulation, e.g., LkSG]. Identify exactly which clauses are missing or weak, and provide specific wording to improve them to reach full compliance."



Technique 2: "Kill Switch" Analysis for Scoring Matrices

"Analyze the following supplier scoring matrix. Identify which indicators should be classified as 'Zero Tolerance' (Automatic Fail) items (e.g., Child Labor, Active Bribery). Suggest a logic for how these findings should override the numerical score."



Technique 3: Drafting Worker Interview Questions

"Generate 10 open-ended interview questions for factory workers regarding \[Specific Topic, e.g., Forced Labor / Excessive Overtime]. The questions must be designed to put the worker at ease and avoid 'Yes/No' answers. Include a brief 'Auditor Tip' for each question on what red flags to listen for in the responses."



Technique 4: Formatting for Clarity (The "Red Flag" Example)

"Take the following compliance requirements and rewrite them for a supplier audience. Add a specific 'Non-compliance Example' for each main requirement (1–2 sentences).

Format: '❌ Non-compliance Example: \[Describe a specific scenario].'"



Technique 5: Handling Uncertain Regulatory Citations

"Please review the content you just generated. Mark all cited regulation numbers, fine amounts, deadlines, and statistics with \[TO BE VERIFIED]. For any citation you are uncertain of, state 'Suggested check: \[Name of official source]'. Do not delete them, just flag them for my manual review."



Technique 6: Localization \& Translation

"Please translate the following English compliance document into \[Target Language]. Requirements: 1. Use accurate legal and industry terminology specific to \[Country/Region] (e.g., Labor Contracts, Social Insurance); 2. Map international regulations to equivalent local laws where applicable; 3. Maintain the original numbering and structure."



## 4\. Requirement for "Completion Scoring" \& Missing Lists

After generating any important document, ask the AI for a self-assessment:



"Please perform a self-assessment on the \[Document Name] you just generated:



Give it a completion score out of 100.



List exactly what is currently missing from the document (ranked by importance).



Suggest 3 additional questions or clauses that would make this document 'best-in-class' for our industry."





