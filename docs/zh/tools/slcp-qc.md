---
title: SLCP 核查工具在线质检
description: 在浏览器中检查已填写的 SLCP 离线核查工具，文件不上传，直接在页面上查看问题清单并下载 Excel 报告
---

<script setup>
import SlcpQcChecker from '../../components/SlcpQcChecker.vue'
</script>

# 🧪 SLCP 核查工具在线质检

核查员在提交前把已填写的 **SLCP 离线核查工具（Verifier Tool）** 拖到下方，即可在页面上看到需要修改或复核的全部输入，并下载 Excel 质检报告。

<ClientOnly>
  <SlcpQcChecker lang="zh" />
</ClientOnly>

::: info 文件不会离开您的电脑
质检程序（Python）在您的浏览器中运行，工具文件只在本机内存中读取，不会上传到任何服务器。首次使用需下载约 15 MB 的运行环境，之后浏览器会缓存。
:::

## 结果怎么看

- **Error（错误）** = 必须修改 · **Warning（警告）** = 需要复核 · **Info（提示）** = 仅供参考。
- 点击上方的计数标签可按严重程度筛选，也可以按规则筛选或搜索 Key、题号和内容。
- **行**是该问题在工具 `SLCP Data Collection Tool` 工作表中的行号。Excel 报告中的行号是链接：把报告与工具放在同一文件夹，点击即可跳到对应行。
- 题号取自您所用的工具版本，与工具中显示的一致。

## 检查内容

| 规则组 | 编号 | 说明 |
|------|------|------|
| 语言 | LANG-01..04 | 核查数据、更正答案和核查员填写的答案须为英文（营业执照所用当地语言的题目除外）；工厂用其他语言作答时不能选 *Accurate* |
| 核查选项 | SEL-01..18 | *Accurate* 不应有更正答案；更正答案须不同于工厂答案；*Inaccurate* / *Updated* 需有更正答案及核查数据；工厂未作答时只能选 *Facility did not reply*、*Not visible*、*No longer applicable* 或 *Verification only*；*No longer applicable* 不应有更正或核查数据；有工厂答案就要有核查选项，且选项须在该题的列表中。必填叙述题、*Not applicable due to special facility circumstances* 和 *Facility did not reply* 须填写核查数据；核查数据不超过 6,000 字符，且须包含 "Reason:" 及信息来源。未勾选的多选项是有效答案，不会被报告 |
| 数据类型 | DATA-01..09 | 整数、非负数、0–100 %、经纬度范围及是否落在工厂所在国家、YYYY-MM-DD 日期（必填日期不能为空）、答案在选项列表中、复选框只能为 X |
| 法律标记 | LEGAL-01..07 | 标记 X 与法律依据须同时填写，并需有核查数据说明；违规答案需标记 X 并附法律依据（“工厂是否未能……”类题目以 *Yes* 为违规）；合规答案或“无适用法律要求”不应标记 X；中国工厂设有工会时，自由组建、自由加入及加入联合会三题须标记法律不合规 |
| 特定问答 | SPEC | 核查方式不能为 *SLCP Full Virtual Verification*、60 小时与休息日、强迫与自愿加班、认证与分包商重复、最小工人年龄、产量与产能、联系人与电话、骚扰案例、工时阈值、抽样数据与答案矛盾、OS ID 格式等 |
| 关联逻辑 | REL-01..06 | 父题答案不触发时子题却已作答；“以上皆非”与其他选项同时勾选；分项大于总数；不合理比例；可见题目未作答 |
| 合理性 | PLAUS-01..04 | 国籍数、语言数或工资等级为 0；最长交货期超过 52 周；仅一个性别的工资为 0；人均建筑面积低于 2 m² |
| 平台提示 | ADV-01..04 | 核查非连续天数却未说明原因；整份报告没有 *Inaccurate - Incorrect*；使用了 *Not applicable due to special facility circumstances*；法律不合规项为零 |

**SLCP 平台检查。** 自 2026 年 11 月起，SLCP 平台在提交报告时进行自动数据质量检查（[检查清单](https://slcp.zendesk.com/hc/article_attachments/31495285677596)）。本工具以“错误”覆盖其阻止提交的检查 #1–#19，以“警告”覆盖提示性检查 #29–#32，每条规则标题注明对应的平台检查编号，如 *[SLCP #19]*。未覆盖：#10 联合评估信息（离线工具中没有该题）和 #33 Better Work 零容忍规程。

只检查当前适用的题目：被显示/隐藏逻辑隐藏的题目即使保留了旧数值，也不会被报告。

::: warning 使用前请注意
本工具用于辅助核查员自查，**不替代** SLCP 核查规程或核查机构的质量审核，结果仅供参考。
:::
