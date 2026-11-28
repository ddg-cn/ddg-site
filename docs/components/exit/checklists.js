// Checklist content for the Responsible Exit guide (EN/ZH).
// Roles: bs = buyer sourcing/management, bl = buyer legal/compliance, fo = factory owner/finance,
//        fh = factory HR, wr = workers and representatives, au = auditor/verifier, ag = agent/trading company
// Situations: s1 buyer leaves, s2 factory leaves a customer, s3 closure, s4 relocation, s5 forced exit

export const ROLES = {
  en: [
    { k: 'bs', label: 'Buyer: sourcing / management' },
    { k: 'bl', label: 'Buyer: legal / compliance' },
    { k: 'ag', label: 'Agent / trading company' },
    { k: 'fo', label: 'Factory: owner / finance' },
    { k: 'fh', label: 'Factory: HR' },
    { k: 'wr', label: 'Worker representative' },
    { k: 'au', label: 'Auditor / verifier' },
  ],
  zh: [
    { k: 'bs', label: '采购方：采购/管理层' },
    { k: 'bl', label: '采购方：法务/合规' },
    { k: 'ag', label: '代理商/贸易公司' },
    { k: 'fo', label: '工厂：业主/财务' },
    { k: 'fh', label: '工厂：人力资源' },
    { k: 'wr', label: '工人代表' },
    { k: 'au', label: '审核员/验证员' },
  ],
}
export const SITS = {
  en: [
    { k: 's1', label: 'S1 Buyer leaves' }, { k: 's2', label: 'S2 Factory leaves a customer' },
    { k: 's3', label: 'S3 Closure' }, { k: 's4', label: 'S4 Relocation' }, { k: 's5', label: 'S5 Forced exit' },
  ],
  zh: [
    { k: 's1', label: 'S1 采购方退出' }, { k: 's2', label: 'S2 工厂退出客户' },
    { k: 's3', label: 'S3 关厂' }, { k: 's4', label: 'S4 搬迁' }, { k: 's5', label: 'S5 被迫退出' },
  ],
}
export const PHASES = {
  en: [
    { k: 'p0', label: 'Before you need it' }, { k: 'p1', label: 'Decide' }, { k: 'p2', label: 'Tell and consult' },
    { k: 'p3', label: 'Wind down' }, { k: 'p4', label: 'Pay and prove' }, { k: 'p5', label: 'After the exit' },
  ],
  zh: [
    { k: 'p0', label: '未雨绸缪' }, { k: 'p1', label: '决策' }, { k: 'p2', label: '告知与协商' },
    { k: 'p3', label: '有序收尾' }, { k: 'p4', label: '支付与留证' }, { k: 'p5', label: '退出之后' },
  ],
}

const ALL = ['s1', 's2', 's3', 's4', 's5']
// [id, phase, roles, situations, en, zh, ref]
const RAW = [
  // Before you need it
  ['p0a', 'p0', ['bs', 'bl', 'ag'], ALL, 'Publish a responsible exit policy and make sure the sourcing team has read it.', '发布负责任退出政策，并确保采购团队真正读过。', 'Fair Wear BPC 3.17'],
  ['p0b', 'p0', ['bl', 'ag'], ALL, 'Put exit clauses in supplier contracts: notice, payment for goods made and materials bought, tooling, data, and a duty on whichever side terminates.', '在供货合同中写入退出条款：通知期、已生产货物和已采购物料的付款、模具、数据，以及终止方（无论哪一方）的义务。', 'RCP SMC cl. 9; ABA MCC 2.0 §1.3(f)'],
  ['p0c', 'p0', ['fo'], ALL, 'Keep a severance reserve and know your total severance liability today.', '设立经济补偿准备金，并清楚当前全部经济补偿负债。', 'LCL Arts. 46–47'],
  ['p0d', 'p0', ['fo', 'fh'], ALL, 'Pay social insurance and housing fund on full wages; correct any gap now.', '按实际工资足额缴纳社保和公积金，现在就补齐差额。', 'Social Insurance Law; SPC Interp. (II)'],
  ['p0e', 'p0', ['fo'], ['s2', 's3', 's4'], 'Check your landlord, lease registration and building approvals; check customer concentration and payment terms.', '核查房东、租赁备案和建筑审批；检查客户集中度和付款条件。', 'Civil Code Art. 405'],
  ['p0f', 'p0', ['bs', 'ag'], ALL, 'Track your share of each supplier\'s output, and flag any factory where you are over 30%.', '跟踪您在每家供应商产量中的占比，对占比超过30%的工厂做标记。', 'ACT'],
  ['p0g', 'p0', ['au'], ALL, 'Know the red flags of a coming bad exit (late wages, insurance on base wage, equipment moving out).', '熟悉不良退出的预警信号（欠薪、按基本工资缴社保、设备外搬）。', 'Guide ch. 11'],
  ['p0h', 'p0', ['bs', 'fo'], ALL, 'Screen sites and suppliers for climate and flood risk as part of business continuity.', '将选址和供应商的气候与洪涝风险纳入业务连续性评估。', 'Guide ch. 15'],

  // Decide
  ['p1a', 'p1', ['bs', 'ag'], ['s1', 's5'], 'Write down the reason for leaving and the evidence. If it is a human-rights problem, check whether staying and pressing for change would do more good.', '书面记录退出原因和依据。如属人权问题，先评估留下并推动改进是否更有利。', 'OECD; UNGP 19'],
  ['p1b', 'p1', ['bs', 'fo', 'ag'], ALL, 'Run the impact check: dependence, workers affected, money owed, legal arrears, timing, alternatives.', '开展影响评估：依赖度、受影响工人、欠款、法定欠缴、时机、替代方案。', 'Guide ch. 4'],
  ['p1c', 'p1', ['bs'], ['s1', 's5'], 'Set the notice from the order share: under 10% about 3 months; 10–30% 6 months; over 30% 6–12 months.', '按订单占比确定通知期：10%以下约3个月；10–30%为6个月；30%以上6–12个月。', 'Guide 4.2'],
  ['p1d', 'p1', ['bs'], ['s1', 's5'], 'Check whether other buyers are leaving the same factory or region at the same time.', '核实是否有其他采购方同时退出同一工厂或地区。', 'ETI 2026'],
  ['p1e', 'p1', ['bl'], ['s1', 's5'], 'Check sanctions, import bans, licence windows and China\'s counter-measure laws before wording the decision.', '在措辞决定前核查制裁、进口禁令、许可窗口期和中国反制裁法规。', 'Guide ch. 9'],
  ['p1f', 'p1', ['fo'], ['s2'], 'Check the customer contract and Civil Code grounds; decide whether to finish lawful open orders.', '核查客户合同和《民法典》依据；决定是否完成合法的在制订单。', 'Civil Code Arts. 533, 562–566'],
  ['p1g', 'p1', ['fo'], ['s3', 's4'], 'Pass a written resolution with reasons, after hearing the union and workers.', '在听取工会和职工意见后，作出书面决议并写明理由。', 'Company Law Art. 17'],
  ['p1h', 'p1', ['fo'], ['s3', 's4'], 'List government incentives, subsidies, land terms and sponsored programmes that may have to be repaid or completed.', '列出可能需要退还或履行完毕的政府优惠、补贴、土地条件和资助项目。', 'Guide 7.5'],
  ['p1i', 'p1', ['fo'], ['s3', 's4'], 'Commission an environmental close-out plan: hazardous waste, soil, permits, fees.', '委托制定环境收尾方案：危险废物、土壤、许可证、费用。', 'Guide 7.4'],
  ['p1j', 'p1', ['fh'], ['s2', 's3', 's4'], 'Identify protected workers (illness, injury, pregnancy, nursing, 15+ years near retirement).', '识别受保护员工（患病、工伤、孕期、哺乳期、工龄15年以上且距退休不足5年）。', 'LCL Art. 42'],

  // Tell and consult
  ['p2a', 'p2', ['bs', 'ag'], ['s1', 's5'], 'Send written notice with reasons, timeline and a monthly volume forecast to the last order.', '发出书面通知，写明原因、时间表以及截至最后一单的逐月订单预测。', 'ACT; ETI 2026'],
  ['p2b', 'p2', ['bs'], ['s1', 's5'], 'Ask the factory to share the notice with its union or worker representatives, and get written confirmation that workers were told.', '请工厂将通知告知工会或工人代表，并取得已告知工人的书面确认。', 'ETI 2026 Box 4'],
  ['p2c', 'p2', ['fo'], ['s2'], 'Send written notice to the customer with the last order date and proposals for stock, tooling and money.', '向客户发出书面通知，写明最后订单日期及库存、模具和款项的处理建议。', 'Template 14.2'],
  ['p2d', 'p2', ['fh'], ['s2', 's3', 's4'], 'If 20+ people or 10%+ are affected: explain to the union or all staff 30 days ahead, hear views, report to the labour bureau.', '裁减20人以上或10%以上的：提前30日向工会或全体职工说明情况、听取意见，并向劳动行政部门报告。', 'LCL Art. 41'],
  ['p2e', 'p2', ['fh'], ['s4'], 'Offer transfer to the new site in writing, with transport, housing and wage terms; give a real choice.', '书面提供调往新址的方案，含交通、住宿和工资条件；给员工真正的选择。', 'LCL Art. 40(3)'],
  ['p2f', 'p2', ['wr'], ALL, 'Ask for the decision, timeline and severance method in writing, and who to contact.', '要求书面提供决定、时间表、经济补偿计算方法及联系人。', ''],
  ['p2g', 'p2', ['wr'], ALL, 'Ask for alternatives to dismissal: redeployment, reduced overtime, training, transfer.', '提出裁员的替代方案：转岗、减少加班、培训、调动。', 'FLA 2023'],
  ['p2h', 'p2', ['fo'], ['s3', 's4'], 'Tell customers, suppliers and the landlord in writing, with the closure or move date and a contact.', '书面通知客户、供应商和房东，写明关停或搬迁日期及联系人。', ''],
  ['p2i', 'p2', ['bl'], ['s5'], 'If the law forces an immediate stop, tell the supplier at once in writing that the date is set by law, and apply for any licence needed to pay.', '如法律要求立即停止，应立即书面告知供应商日期由法律决定，并申请付款所需的许可。', 'Guide 9.1'],

  // Wind down
  ['p3a', 'p3', ['bs', 'fo', 'ag'], ['s1', 's2', 's5'], 'Agree open orders, work in progress, finished goods and materials in writing.', '书面确认在制订单、在制品、成品和物料的处理。', 'Guide ch. 10'],
  ['p3b', 'p3', ['bs', 'fo'], ['s1', 's2'], 'Return or destroy tooling, branded packaging, samples and technical files against signed receipts.', '凭签收单归还或销毁模具、品牌包材、样品和技术文件。', 'Guide ch. 10'],
  ['p3c', 'p3', ['bl', 'fo'], ALL, 'Delete or return worker personal data you no longer need; keep cross-border transfers lawful.', '删除或返还不再需要的工人个人信息；确保跨境传输合法。', 'PIPL Arts. 38–39'],
  ['p3d', 'p3', ['fh'], ['s2', 's3', 's4'], 'Redeploy before dismissing; offer time off to look for work; help with job fairs.', '先转岗再裁员；给予求职时间；协助组织招聘会。', 'Better Work'],
  ['p3e', 'p3', ['fo'], ['s3', 's4'], 'Dispose of hazardous waste through licensed handlers; survey soil if required; cancel the discharge permit; settle environmental tax.', '委托有资质单位处置危险废物；按要求开展土壤调查；注销排污许可证；结清环境保护税。', 'Guide 7.4'],
  ['p3f', 'p3', ['au'], ['s3', 's4'], 'Check for machinery or stock leaving the site and for batches of "voluntary" resignations.', '核查设备或存货是否外运，以及是否有成批的"自愿"辞职。', 'Guide ch. 11'],
  ['p3g', 'p3', ['ag'], ['s1'], 'If you move the brand\'s orders to another factory, treat it as the brand\'s exit and follow the same steps.', '如将品牌订单转到其他工厂，视同品牌退出，按同样步骤处理。', 'ACT'],

  // Pay and prove
  ['p4a', 'p4', ['bs', 'ag'], ['s1', 's5'], 'Pay for goods made and materials bought, on time; no new claims or discounts at exit.', '按时支付已生产货物和已采购物料款项；退出时不提出新的索赔或折扣。', 'ACT; ABA MCC 2.0'],
  ['p4b', 'p4', ['bs'], ['s1', 's3', 's5'], 'Offer to bring final payments forward so severance can be paid; consider escrow or direct payment on the factory\'s instruction.', '主动提前支付尾款以便工厂支付经济补偿；可考虑共管账户或按工厂指示直接支付。', 'Guide 9.4'],
  ['p4c', 'p4', ['fo', 'fh'], ['s2', 's3', 's4'], 'Pay wages to the last day, shutdown pay, severance and unused leave; no waivers.', '支付至最后工作日的工资、停工工资、经济补偿和未休年假工资；不得要求放弃权利。', 'LCL Arts. 46–47; FLA ER.15'],
  ['p4d', 'p4', ['fh'], ['s2', 's3', 's4'], 'Issue termination certificates and transfer files and social insurance within 15 days.', '15日内出具解除或终止证明，办理档案和社保转移。', 'LCL Art. 50'],
  ['p4e', 'p4', ['fo'], ['s3'], 'Liquidate in the legal order; clear wages before deregistration.', '按法定顺序清算；注销前清偿工资。', 'Company Law Art. 236; Decree 724 Art. 22'],
  ['p4f', 'p4', ['bs', 'bl', 'au'], ['s1', 's3', 's4', 's5'], 'Collect proof: payroll and bank records, severance calculations, the labour bureau acknowledgement.', '收集证据：工资和银行流水、经济补偿计算表、劳动部门回执。', 'Guide ch. 13'],
  ['p4g', 'p4', ['au'], ['s2', 's3', 's4'], 'Check that severance matches the calculation sheet, payroll and bank statements, and that settlement agreements contain no waivers.', '核对经济补偿与计算表、工资表和银行流水一致，和解协议中无弃权条款。', 'SA8000 D3.12; FLA ER.15'],
  ['p4h', 'p4', ['wr'], ['s2', 's3', 's4'], 'Check your severance against the calculation, and your social insurance record online.', '对照计算方法核对经济补偿，并在网上查询社保记录。', '12333'],

  // After
  ['p5a', 'p5', ['bs', 'ag'], ['s1', 's5'], 'Keep a grievance channel open to the factory\'s workers for about six months.', '对工厂工人的申诉渠道保持开放约六个月。', 'ETI 2026'],
  ['p5b', 'p5', ['bs', 'bl'], ['s1', 's5'], 'Update your published supplier list and date the removal; report exits in your due-diligence reporting.', '更新已公开的供应商名单并注明移除日期；在尽职调查报告中披露退出情况。', 'Guide 5.3'],
  ['p5c', 'p5', ['fo'], ['s2', 's3', 's4'], 'Name a contact for after the exit and keep records for the legal retention period.', '指定退出后的联系人，并按法定期限保存记录。', ''],
  ['p5d', 'p5', ['wr'], ALL, 'If not paid: call 12333, the labour inspection brigade, and the buyer\'s grievance channel.', '未获支付的：拨打12333，联系劳动保障监察大队，并使用采购方的申诉渠道。', ''],
  ['p5e', 'p5', ['bs'], ['s1', 's3', 's5'], 'If workers were not paid, act: mediation, contribution, or remedy. Do it before final payment if you can.', '如工人未获支付，应采取行动：调解、出资或补救，尽可能在支付尾款前完成。', 'ACT'],
  ['p5f', 'p5', ['au'], ['s3', 's4'], 'Record closure or relocation events and what you saw, so the next reviewer has the history.', '记录关厂或搬迁事件及所见情况，供后续审核人员参考。', ''],
  // more steps for HR, legal, workers, auditors
  ['x01', 'p0', ['wr'], ALL, 'Keep copies of your contract, pay slips and attendance records, and check online that social insurance and housing fund are paid on your full wage.', '保存劳动合同、工资条和考勤记录，并在网上核对社保和公积金是否按实际工资缴纳。', '12333'],
  ['x02', 'p2', ['wr'], ['s4'], 'If the factory is moving, ask for the transfer terms (location, transport, housing, wage) in writing before you decide.', '工厂搬迁的，先要求书面提供调动条件（地点、交通、住宿、工资），再做决定。', 'LCL Art. 40(3)'],
  ['x03', 'p3', ['wr'], ['s2', 's3', 's4'], 'Do not sign a "voluntary resignation" or a waiver of your rights: resigning can cost you your severance.', '不要签"自愿离职"或放弃权利的文件：主动辞职可能拿不到经济补偿。', 'LCL Art. 46; FLA ER.15'],
  ['x04', 'p0', ['au'], ALL, 'Compare headcount, overtime and the timing of wage payments over 12 months for signs of strain.', '比较12个月内的人数、加班和工资发放时间，判断是否有经营困难的迹象。', 'Guide 12.6'],
  ['x05', 'p1', ['au'], ['s3', 's4'], 'Ask management directly whether a closure, relocation or loss of a major customer is planned, and record the answer.', '直接询问管理层是否计划关厂、搬迁或将失去主要客户，并记录答复。', 'Guide 12.6'],
  ['x06', 'p4', ['au'], ['s3', 's4'], 'Check the environmental close-out: hazardous waste transfer manifests and the discharge permit cancellation.', '核查环境收尾：危险废物转移联单和排污许可证注销情况。', 'Guide 7.4'],
  ['x07', 'p1', ['fh'], ['s2', 's3', 's4'], 'Prepare each worker\'s 12-month average wage and service record, and calculate severance with the sheet in 14.4.', '整理每名员工前12个月的平均工资和工龄，用14.4的计算表测算经济补偿。', 'LCL Art. 47'],
  ['x08', 'p3', ['fh'], ['s3', 's4'], 'Pay shutdown wages correctly if production stops before contracts end: normal wage for one pay cycle, then at least the local minimum.', '如在合同终止前停产，按规定支付停工工资：一个工资支付周期内照发，之后不低于当地标准。', 'Wage Payment Rules Art. 12'],
  ['x09', 'p1', ['bl'], ['s1', 's2', 's5'], 'Check the contract\'s notice, termination, force majeure, tooling, IP and data clauses before the notice goes out.', '发出通知前，核查合同中的通知、解除、不可抗力、模具、知识产权和数据条款。', 'Guide 12.2'],
  ['x10', 'p5', ['bl'], ALL, 'Keep the exit file (decision, notice, payments, worker evidence) for at least five years.', '退出档案（决定、通知、付款、工人相关证据）至少保存五年。', 'Guide ch. 13'],
]

const ZREF = [
  [/LCL Arts?\. /g, '《劳动合同法》第'], [/Company Law Art\. /g, '《公司法》第'], [/Civil Code Arts?\. /g, '《民法典》第'],
  [/Decree 724 Art\. /g, '《保障农民工工资支付条例》第'], [/PIPL Arts\. /g, '《个人信息保护法》第'],
  [/Ecological Environment Code Arts\. /g, '《生态环境法典》第'], [/Permit Measures Art\. /g, '《排污许可管理办法》第'],
  [/Tax Rules Arts\. /g, '《税收征收管理法实施细则》第'], [/Wage Payment Rules Art\. /g, '《工资支付暂行规定》第'],
  [/SPC Interp\. \(II\)/g, '最高法劳动争议解释（二）'], [/Social Insurance Law/g, '《社会保险法》'],
  [/Guide ch\. (\d+)/g, '本指南第$1章'], [/Guide (\d+\.\d+)/g, '本指南$1节'], [/Template (\d+\.\d+)/g, '模板$1'],
]
function zref(r) {
  if (!r) return r
  let out = r
  for (const [re, to] of ZREF) out = out.replace(re, to)
  // add 条 after article numbers converted above
  return out.replace(/(第[\d–(), ]+?)(?=[;；]|$)/g, m => m.trim() + '条').replace(/条条/g, '条')
}

export function roleItems(lang) {
  const z = lang === 'zh'
  return RAW.map(([id, phase, roles, sit, en, zh, ref]) => ({ id, phase, roles, sit, text: z ? zh : en, ref: z ? zref(ref) : ref }))
}

// 14.5 One-page closure checklist (factory side)
const CLOSE = [
  ['c01', 'Resolution to close, with reasons; union and workers heard.', '作出关厂决议并写明理由；听取工会和职工意见。', 'Company Law Art. 17'],
  ['c02', 'Social insurance and housing fund base checked against actual wages; gaps corrected.', '按实际工资核对社保和公积金缴费基数，补齐差额。', 'SPC Interp. (II)'],
  ['c03', 'Severance reserve calculated (sheet 14.4) and funded before the announcement.', '在宣布前测算（见14.4计算表）并落实经济补偿准备金。', 'LCL Arts. 46–47'],
  ['c04', 'Art. 41 explanation 30 days ahead and labour bureau report, if 20+ people or 10%+.', '如裁减20人以上或10%以上：提前30日说明情况并向劳动行政部门报告。', 'LCL Art. 41'],
  ['c05', 'Protected workers identified and advised on individually.', '识别受保护员工并逐一处理。', 'LCL Art. 42'],
  ['c06', 'Customers, suppliers and landlord told in writing.', '书面通知客户、供应商和房东。', ''],
  ['c07', 'Subsidies, tax incentives, land terms and sponsored programmes checked; repayment or handover agreed.', '核查补贴、税收优惠、土地条件和资助项目，商定退还或移交安排。', 'Guide 7.5'],
  ['c08', 'Hazardous waste disposed of by licensed handlers; transfer manifests kept.', '危险废物交有资质单位处置，保存转移联单。', 'Ecological Environment Code Arts. 495, 532'],
  ['c09', 'Soil survey and dismantling pollution plan, where the site is a key supervised unit or the land use changes.', '属于土壤污染重点监管单位或用地用途变更的：开展土壤调查，制定拆除污染防治方案。', 'Ecological Environment Code Arts. 415, 462'],
  ['c10', 'Discharge permit cancelled; environmental tax and fees settled.', '注销排污许可证；结清环境保护税及相关费用。', 'Permit Measures Art. 29; Tax Rules Arts. 15–16'],
  ['c11', 'Wages to the last day and shutdown pay paid.', '支付至最后工作日的工资和停工期间工资。', 'Wage Payment Rules Art. 12'],
  ['c12', 'Severance and unused leave paid; no waivers in any agreement.', '支付经济补偿和未休年假工资；任何协议中不得有弃权条款。', 'FLA ER.15'],
  ['c13', 'Certificates and file and insurance transfers within 15 days; unemployed list within 7 days.', '15日内出具证明并办理档案和社保转移；7日内报送失业人员名单。', 'LCL Art. 50'],
  ['c14', 'Liquidation in the legal order.', '按法定顺序清算。', 'Company Law Art. 236'],
  ['c15', 'Deregistration only after wages are cleared.', '工资清偿后方可申请注销。', 'Decree 724 Art. 22'],
  ['c16', 'Records kept; contact named for after closure.', '保存记录；指定关厂后的联系人。', ''],
]
export function closureItems(lang) {
  const z = lang === 'zh'
  return CLOSE.map(([id, en, zh, ref]) => ({ id, text: z ? zh : en, ref: z ? zref(ref) : ref }))
}
