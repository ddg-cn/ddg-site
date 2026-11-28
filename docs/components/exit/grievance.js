// Checklist: verify a partner's (or your own) grievance channel. EN/ZH.
import { zref } from './checklists.js'
export const G_ROLES = {
  en: [{ k: 'v', label: 'Buyer or auditor: checking a supplier' }, { k: 'f', label: 'Factory: checking our own channel' }],
  zh: [{ k: 'v', label: '采购方或审核员：核查供应商' }, { k: 'f', label: '工厂：自查' }],
}
export const G_PHASES = {
  en: [
    { k: 'a', label: 'A. Exists and is written down' }, { k: 'b', label: 'B. Accessible' }, { k: 'c', label: 'C. Legitimate and independent' },
    { k: 'd', label: 'D. Predictable and transparent' }, { k: 'e', label: 'E. Safe' }, { k: 'f', label: 'F. Used and working (the real test)' },
    { k: 'g', label: 'G. Rights and escalation' }, { k: 'h', label: 'H. Learning and dialogue' }, { k: 'i', label: 'I. The buyer\'s own side' },
  ],
  zh: [
    { k: 'a', label: 'A. 有制度、有书面程序' }, { k: 'b', label: 'B. 可及' }, { k: 'c', label: 'C. 正当、独立' },
    { k: 'd', label: 'D. 可预期、透明' }, { k: 'e', label: 'E. 安全' }, { k: 'f', label: 'F. 真正被使用（关键检验）' },
    { k: 'g', label: 'G. 权利与升级' }, { k: 'h', label: 'H. 学习与对话' }, { k: 'i', label: 'I. 采购方自身' },
  ],
}
const VF = ['v', 'f']
// [id, phase, roles, en, zh, ref]
const RAW = [
  ['g01', 'a', VF, 'A written procedure covering scope, stages, time limits and possible outcomes, posted where workers see it.', '有书面程序，写明适用范围、处理步骤、时限和可能的结果，并张贴在工人看得到的地方。', 'SA8000 9.6.1; LkSG §8'],
  ['g02', 'a', VF, 'Large and medium enterprises: a labour dispute mediation committee with equal worker and management members, worker members elected or from the union.', '大中型企业：设立劳动争议调解委员会，职工代表与企业代表人数对等，职工代表由工会委员或全体职工推举。', 'Order 17 Arts. 13, 15'],
  ['g03', 'a', VF, 'A union or workers\' congress exists, with minutes showing pay and discipline rules were discussed.', '有工会或职工代表大会，会议记录显示工资和奖惩制度经过讨论。', 'Trade Union Law Art. 38'],
  ['g04', 'b', VF, 'Several ways in: in person, phone, WeChat or app, and a box in an unwatched place. At least one route bypasses line management.', '有多种渠道：当面、电话、微信或应用程序、放在无人监视处的意见箱。至少一条渠道绕开直接上级。', 'UNGP 31(b)'],
  ['g05', 'b', VF, 'Languages and formats fit the workforce: dialects, migrant workers, low literacy.', '语言和形式适合员工：方言、外来务工人员、文化程度较低者。', 'BAFA 2022'],
  ['g06', 'b', VF, 'Covers dispatch, agency and contract workers, and the next tier where possible.', '覆盖劳务派遣工、外包和合同工，并尽可能覆盖下一级供应商。', 'LkSG §9'],
  ['g07', 'b', VF, 'Free to use, and usable outside working hours.', '免费使用，非工作时间也能使用。', 'UNGP 31(b)'],
  ['g08', 'c', VF, 'Cases are not handled by the accused person or their line manager; handlers are trained.', '案件不由被投诉人或其直接上级处理；处理人员受过培训。', 'UNGP 31(a); LkSG §8(3)'],
  ['g09', 'c', VF, 'There is an external option: the buyer\'s channel, an initiative\'s helpline, or a union or NGO.', '有外部选择：采购方渠道、行业倡议热线、工会或社会组织。', 'UNGP 31(a); SA8000:2026 M9.5'],
  ['g10', 'd', VF, 'Complaints are acknowledged within a set time (benchmarks: 3 working days to accept a mediation case; 7 days under the EU Whistleblower Directive).', '在规定时间内确认收到投诉（参考：调解委员会3个工作日内受理；欧盟举报人指令为7天）。', 'Order 17 Art. 22; EU 2019/1937'],
  ['g11', 'd', VF, 'A decision within a set time (benchmarks: 15 days for mediation; feedback within 3 months).', '在规定时间内作出处理（参考：调解15天内结束；3个月内反馈）。', 'Order 17 Art. 29; EU 2019/1937'],
  ['g12', 'd', VF, 'The complainant is told the outcome and the reasons.', '告知投诉人处理结果及理由。', 'UNGP 31(e); CSDDD Art. 14'],
  ['g13', 'e', VF, 'A written non-retaliation rule; an anonymous route; identities protected in the file.', '有书面的禁止报复规定；有匿名渠道；档案中保护投诉人身份。', 'SA8000:2026 M9.3'],
  ['g14', 'e', VF, 'Personal data handled lawfully: notice before collection, separate consent before sharing with a buyer, sensitive data protected, only anonymised data leaves China.', '依法处理个人信息：收集前告知；向采购方提供前取得单独同意；保护敏感个人信息；只有匿名化数据出境。', 'PIPL Arts. 17, 23, 28–29, 38'],
  ['g15', 'f', VF, 'A log for the last 12 months: cases by topic and worker group, outcomes, average days to close, open cases. Zero or almost zero cases is a red flag, not a pass.', '近12个月的台账：按问题类型和员工群体统计的案件数、处理结果、平均结案天数、未结案件。零投诉或几乎没有投诉是危险信号，不是合格。', 'Order 17 Art. 32; BAFA 2022'],
  ['g16', 'f', ['v'], 'Two or three closed cases traced from receipt to remedy.', '抽查两三个已结案件，从受理追踪到补救。', 'BAFA 2022'],
  ['g17', 'f', VF, 'Workers asked directly (interviews or an anonymous survey): do they know the channel, would they use it, what happened when someone did? Compared with the log.', '直接询问工人（访谈或匿名调查）：是否知道渠道、是否愿意使用、别人用过后结果如何？并与台账对照。', 'Better Work 2025'],
  ['g18', 'f', ['v'], 'A test message or call was acknowledged, and how fast was noted.', '发送测试信息或拨打测试电话，记录是否得到确认及用时。', ''],
  ['g19', 'g', VF, 'Workers are told about state routes (12333, labour inspection, free arbitration within one year) and are never asked to waive them.', '告知工人可利用的政府途径（12333、劳动保障监察、一年内免费仲裁），且从不要求放弃这些权利。', 'Mediation and Arbitration Law Arts. 27, 53'],
  ['g20', 'g', VF, 'Severe cases (forced or child labour, danger to life, harassment) are fast-tracked to senior management or the buyer.', '严重案件（强迫劳动、童工、危及生命、骚扰）快速上报高层或采购方。', 'UNGP 29'],
  ['g21', 'h', VF, 'An annual review of how well the channel works, with changes made as a result.', '每年评估渠道运行效果，并据此改进。', 'UNGP 31(g); LkSG §8(5)'],
  ['g22', 'h', VF, 'Workers or their representatives were consulted on the design; complainants are asked if they were satisfied.', '在设计渠道时征求了工人或其代表的意见；结案后询问投诉人是否满意。', 'UNGP 31(h); SA8000:2026 M2.1(e); BAFA 2022'],
  ['g23', 'i', ['v'], 'Our own channel is open to the supplier\'s workers, or we belong to a shared one (Fair Wear, FLA, amfori, RBA Voices, the Accord).', '我方自己的渠道向供应商工人开放，或已加入共同渠道（Fair Wear、FLA、amfori、RBA Voices、孟加拉国协议）。', 'CSDDD Art. 14'],
  ['g24', 'i', ['v'], 'At exit, our channel stays open and advertised to the factory\'s workers for about six months.', '退出时，我方渠道对该工厂工人继续开放并公布约六个月。', 'ETI 2026; Exit guide'],
]
const ZMAP = [[/Order 17 Arts?\. /g, '人社部令第17号第'], [/Trade Union Law Art\. /g, '《工会法》第'], [/Mediation and Arbitration Law Arts\. /g, '《劳动争议调解仲裁法》第'], [/Exit guide/g, '退出指南']]
export function grievanceItems(lang) {
  const z = lang === 'zh'
  return RAW.map(([id, phase, roles, en, zh, ref]) => {
    let r = ref
    if (z && r) { for (const [re, to] of ZMAP) r = r.replace(re, to); r = zref(r) }
    return { id, phase, roles, text: z ? zh : en, ref: r }
  })
}
