import { zref } from './checklists.js'
// Contract checklist for the Responsible Contracting guide (EN/ZH).
export const C_ROLES = {
  en: [{ k: 'b', label: 'Buyer' }, { k: 's', label: 'Supplier / factory' }],
  zh: [{ k: 'b', label: '采购方' }, { k: 's', label: '供应商/工厂' }],
}
export const C_PHASES = {
  en: [
    { k: 'a', label: 'Shared responsibility' }, { k: 'b', label: 'Price and payment' }, { k: 'c', label: 'Orders, forecasts and changes' },
    { k: 'd', label: 'Audits, data and remedies' }, { k: 'e', label: 'Law, disputes and the way out' },
  ],
  zh: [
    { k: 'a', label: '共同责任' }, { k: 'b', label: '价格与付款' }, { k: 'c', label: '订单、预测与变更' },
    { k: 'd', label: '审核、数据与补救' }, { k: 'e', label: '法律、争议与退出' },
  ],
}
const BS = ['b', 's']
// [id, phase, roles, en, zh, ref]
const RAW = [
  ['a1', 'a', BS, 'The code of conduct binds both sides: the buyer\'s purchasing duties are written in, not only the supplier\'s warranties.', '行为准则约束双方：合同写明采购方的采购义务，而不只是供应商的保证。', 'ABA MCC 2.0 §1.3; CFRPP P4'],
  ['a2', 'a', BS, 'No strict-liability warranty of "full compliance"; instead, both parties do due diligence and work together on problems.', '不要求供应商对"完全合规"承担严格责任；改为双方各自开展尽职调查、共同解决问题。', 'ABA MCC 2.0 §1.1'],
  ['a3', 'a', ['s'], 'You were able to negotiate the terms; standard terms that cut your rights were pointed out and explained to you.', '条款经过协商；限制您权利的格式条款已被提示并说明。', 'Civil Code Arts. 496–497'],
  ['a4', 'a', BS, 'A right to cure and a remediation plan come before any termination, except for zero-tolerance issues.', '除零容忍事项外，终止合作前先给予纠正期并制定整改计划。', 'ABA MCC 2.0 §2.3–2.4'],
  ['a5', 'a', BS, 'Indemnities are reduced where the buyer\'s own conduct (prices, deadlines, changes) contributed to the breach.', '如采购方自身行为（价格、交期、变更）促成了违约，赔偿责任相应减轻。', 'ABA MCC 2.0 §6.5(b)'],
  ['b1', 'b', BS, 'The price covers all production costs, including legal wages, benefits and health and safety; labour cost is shown separately where possible.', '价格覆盖全部生产成本，包括法定工资、福利和职业健康安全；尽可能单列人工成本。', 'Schedule Q 3.3; SMC 3.6; ACT'],
  ['b2', 'b', BS, 'A price review is triggered by minimum-wage rises and major input-cost or currency changes.', '最低工资上调、原材料成本或汇率大幅变动时，启动价格复议。', 'Schedule Q 4.6; SMC 3.8'],
  ['b3', 'b', BS, 'Payment terms are agreed before the order, are 60 days or less, and cannot be changed retroactively.', '付款条件在下单前约定，不超过60天，且不得追溯变更。', 'BBPPI; CFRPP P4; Order 802 Art. 9'],
  ['b4', 'b', ['s'], 'No payment "when our customer pays us", and no forced acceptance of commercial bills to stretch payment.', '不接受"客户付款后再付款"，不被迫接受商业汇票等变相延长付款期。', 'Order 802 Arts. 9, 11'],
  ['b5', 'b', BS, 'Every chargeback, penalty and deduction is listed in the contract, capped at actual loss and backed by evidence. Late payment by the buyer carries a penalty too.', '所有扣款、罚款都在合同中列明，以实际损失为上限并有证据支持；采购方逾期付款同样承担违约责任。', 'SMC 3.12; CFRPP P4'],
  ['b6', 'b', ['s'], 'Liquidated damages are not excessive compared with the likely loss.', '违约金不过分高于可能造成的损失。', 'Civil Code Art. 585'],
  ['c1', 'c', BS, 'Forecasts are shared early, their basis explained, and they say whether they are binding. Reserved capacity is paid for.', '尽早共享预测并说明依据，写明是否具有约束力；预留产能需付费。', 'SMC 3.2–3.3'],
  ['c2', 'c', BS, 'Lead times are agreed and realistic. The buyer carries delays caused by its own late approvals or nominated suppliers.', '交期经双方约定且切实可行；因采购方延迟确认或指定供应商造成的延误由采购方承担。', 'SMC 3.5; CFRPP P3'],
  ['c3', 'c', BS, 'Order changes are made in writing, with price and deadline adjusted. The supplier may refuse changes that would cause excessive hours, without retaliation.', '订单变更须书面确认，并相应调整价格和交期；供应商可拒绝会导致超时加班的变更，且不受报复。', 'Schedule Q 4.1–4.4; SMC 3.9'],
  ['c4', 'c', BS, 'Cancellation is treated as an order change: finished goods, work in progress and materials bought are paid for.', '取消订单视同订单变更：已完成货物、在制品和已采购物料照付。', 'SMC 3.9; Abandoned? (2020)'],
  ['c5', 'c', BS, 'The number of free samples is capped; extra samples are paid for.', '免费样品数量有上限，超出部分付费。', 'SMC 3.4'],
  ['c6', 'c', BS, 'Subcontracting rules are clear: what needs approval, and how approved subcontractors are covered.', '分包规则清楚：哪些需要批准，经批准的分包商如何纳入管理。', 'Exit guide 2.4'],
  ['d1', 'd', BS, 'A recent equivalent third-party audit or shared assessment is accepted instead of a new audit.', '接受近期同等水平的第三方审核或共享评估结果，不重复审核。', 'SMC 3.13'],
  ['d2', 'd', BS, 'Who pays for audits is stated. Under the CSDDD, the buyer bears verification costs for SME partners.', '写明审核费用由谁承担；按CSDDD，对中小企业合作方的核查费用由采购方承担。', 'CSDDD Art. 10(5)'],
  ['d3', 'd', BS, 'Audit and worker data: what is collected, how it is minimised, where it is stored, who receives it, and how it may leave China lawfully.', '审核和工人数据：收集哪些、如何最小化、存放在哪里、谁能获得，以及如何合法出境。', 'PIPL Arts. 38–39'],
  ['d4', 'd', BS, 'Both sides name a grievance channel open to the supplier\'s workers, and say how complaints about the buyer\'s practices are handled.', '双方明确对供应商工人开放的申诉渠道，并写明针对采购方做法的投诉如何处理。', 'Grievance guide'],
  ['d5', 'd', BS, 'Remediation is funded first: neither side may profit from a breach, and the cost of putting things right is agreed.', '优先为补救提供资金：任何一方不得从违约中获益，并约定纠正问题的费用。', 'SMC 7'],
  ['e1', 'e', BS, 'Governing law, language and dispute route (negotiation, then mediation, then arbitration or court) are stated; you know which law applies to the standard terms.', '写明适用法律、合同语言和争议解决路径（先协商、再调解、后仲裁或诉讼）；清楚格式条款适用哪国法律。', 'Civil Code; Arbitration Law 2026'],
  ['e2', 'e', BS, 'Force majeure needs prompt notice and proof, and does not cancel payment for goods already made.', '不可抗力须及时通知并提供证明，且不免除对已生产货物的付款义务。', 'Civil Code Art. 590; ICC 2020'],
  ['e3', 'e', BS, 'A sanctions clause provides for notice, consultation and payment for goods already delivered, not automatic withholding of payment.', '制裁条款规定通知、协商和已交付货物的付款，而不是自动扣付货款。', 'AFSL Art. 12; Order 835'],
  ['e4', 'e', BS, 'A responsible exit clause binds whichever side ends the relationship: notice in proportion to dependence, payment for goods made and help for workers.', '负责任退出条款约束终止合作的任何一方：预告期与依赖程度相当、支付已生产货物、帮助受影响工人。', 'RCP SMC cl. 9; Exit guide'],
]
export function contractItems(lang) {
  const z = lang === 'zh'
  return RAW.map(([id, phase, roles, en, zh, ref]) => ({ id, phase, roles, text: z ? zh : en, ref: z ? zref(ref).replace('Exit guide', '退出指南').replace('Grievance guide', '申诉渠道指南') : ref }))
}
