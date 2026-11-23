---
title: 碳足迹表格检查
description: 在浏览器中检查产品碳足迹表格——数据集名称、TeR/GeR/TiR/P 评分、排放因子与公开参考值对比
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import CarbonQc from '../../components/CarbonQc.vue'
</script>

# 🌡️ 碳足迹表格检查

把**碳足迹表格**（欧盟电池碳足迹报告模板、客户 PCF 模板、生命周期清单数据表）拖到下方，检查：
- 各组件是否选用了对应材料的数据集
- TeR/GeR/TiR/P 评分和 DQR 是否符合规则
- 材料、能源、运输、废弃物的排放因子是否在公开参考范围内
- 计算是否前后一致

<ClientOnly>
  <CarbonQc lang="zh" />
</ClientOnly>

::: info 文件不会离开您的电脑
表格在您的浏览器中读取，不会上传到任何服务器。首次检查需下载约 900 KB 的 Excel 读取组件，之后浏览器会缓存。经 DRM 加密（如 TSD）的文件需先另存为未加密副本。
:::

## 如何阅读结果

- **问题清单**：每条问题附工作表、单元格和整改建议。**错误** = 必须修改 · **警告** = 需复核 · **提示** = 供参考。
- **数据质量评分**：逐行列出填报评分（上）与建议评分（下；红色 = 表格更乐观，绿色 = 更保守）及理由。
- **因子核对**：每个排放因子与对应材料、能源或运输方式的公开参考范围对比。
- **下载 Excel 报告**：问题清单（含"状态""备注"列）、评分、因子和规则。

## 对照标准检查

在上传区上方选择标准。下表之外的表格检查始终运行；所选标准会增加其专门规则（CF-30 至 CF-38）。**自动**：欧盟电池碳足迹报告模板按欧盟电池规则检查，下方提供的表格按其对应标准检查，其他表格不对照标准。检查后更换标准，会立即按新标准重新检查同一批文件。

| 标准 | 数据质量评分 | 主要检查 |
|---|---|---|
| 欧盟电池法规（方法仍为草案） | TeR、GeR、TiR；DQR = 三项之和 ÷ 3；无 P | EF 兼容数据集；最相关过程的二手数据集 TeR ≤ 4；电力用国家消费结构，不得使用绿证或 PPA；EF 3.1；截断 ≤ 每个部件质量的 1%；不得计入抵消；功能单位为使用寿命内每 kWh |
| PEF – 欧盟建议 (EU) 2021/2279 | TeR、GeR、TiR、P；DQR = 四项之和 ÷ 4 | 企业特定数据 DQR ≤ 1.5（各项 ≤ 2，P ≤ 3）；最相关过程的二手数据 DQR ≤ 3.0；EF 兼容数据集；截断 ≤ 3%；电力：供应商特定 → 剩余组合 |
| ISO 14067:2018 | 无数值评分 | 是否记录：截断准则、分配、GWP、生物源碳、土地利用变化、时间段、数据质量 |
| GHG Protocol 产品标准（2011） | 仅为指南 | 不得计入抵消；是否记录：GWP 来源、生物源与土地利用变化、分配、时间段、鉴证、不确定性 |
| PACT v3.0 · Catena-X v4 · TfS v3.0 | TeR、GeR、TiR，1–5 | TeR 1–2 仅限一手数据（数据库数据集最多评 3）；截断 ≤ 3%；IPCC AR6；电力：供应商特定 → 剩余组合；记录一手数据占比 |

来源：[(EU) 2023/1542](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32023R1542) 及 [2024 年 4 月方法草案](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=PI_COM:Ares(2024)3131389)（尚未通过）；[(EU) 2021/2279](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32021H2279)；[GHG Protocol 产品标准](https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard_041613.pdf)；[PACT 方法 v3.0](https://www.carbon-transparency.org/resources/pact-methodology-v3-methodology-for-calculating-and-exchanging-cradle-to-gate-product-carbon-footprints-pcfs)；[Catena-X PCF 规则手册 v4](https://catena-x.net/wp-content/uploads/2025/10/Catena-X-Product-Carbon-Footprint-Rulebook_v4-with-line-numbers.pdf)；[TfS PCF 指南 v3.0](https://tfs-initiative.com/app/uploads/2024/12/TfS-PCF-Guidelines-2024.pdf)。ISO 14067 为付费标准，只检查相关内容是否有记录，请对照标准原文确认。表格无法判断哪些是“最相关过程”，因此仅适用于最相关过程的规则以警告提示，供复核。

## 各标准的空白表格

还没有表格，或客户表格未被识别？请下载对应标准的表格，填写后拖到上方检查。表格为中英双语，含填写说明（附该标准的要求）、研究信息和清单三个工作表，清单会自动计算排放量和 DQR。填好的表格在**自动**模式下按其对应的标准检查。

[欧盟电池](/tools/carbon-templates/pcf-form-battery.xlsx) · [PEF](/tools/carbon-templates/pcf-form-pef.xlsx) · [ISO 14067](/tools/carbon-templates/pcf-form-iso14067.xlsx) · [GHG Protocol](/tools/carbon-templates/pcf-form-ghg.xlsx) · [PACT](/tools/carbon-templates/pcf-form-pact.xlsx) · [Catena-X](/tools/carbon-templates/pcf-form-catenax.xlsx) · [TfS](/tools/carbon-templates/pcf-form-tfs.xlsx)

其他表格按列名识别，列的顺序不限：材料或组件名称、用量、排放因子，以及（如有）数据来源、数据集、地理、TeR / GeR / TiR / P 和 DQR（可用简写、英文全称如 "Technological representativeness" 或中文名称如"技术代表性"）。支持 Excel（.xlsx、.xlsm、.xls、.xlsb）和 CSV。

## 建议评分规则

评分 1（最好）到 5（最差），与 PEF / 欧盟电池碳足迹规则一致；DQR = 模板所用各项评分的平均值。

| 指标 | 规则 |
|---|---|
| **TeR**（技术代表性） | 数据集与组件为同一材料或同一材料族 → 2（1 留给供应商实测数据）；代用数据集（数据集名称是另一种材料或与组件名称无共同词）→ 4；材料类别不同（如铝件用钢材加工数据集）→ 4–5；无数据集的估算或供应商数值 → 3 |
| **GeR**（地理代表性） | 与原产国相同 → 1；包含该国的区域 → 2；GLO 或 RoW → 3；同区域的其他国家 → 4；其他区域（如中国生产用 EU 数据集）→ 5 |
| **TiR**（时间代表性） | 数据集参考年（ecoinvent 3.x → 2013 + x；来源名称中的年份）与报告年份之差：≤2 → 1，≤4 → 2，≤6 → 3，≤8 → 4，更多 → 5 |
| **P**（精确度） | 实测 → 1；由一手数据计算 → 2；二手数据库数值 → 3；估算、供应商或假设值 → 4 |

规则只依据表格中写明的信息。若填报评分有表格未记录的理由，请在"details"列中写明。

## 检查内容

| 规则 | 严重程度 | 检查项 |
|------|----------|--------|
| CF-01 | 错误 | 评分单元格是文字而非数字（如"1+R25"：公式丢了"="） |
| CF-02 | 错误 | DQR 不等于各项评分的平均值 |
| CF-03 | 错误 | 已使用数据集的评分不在 1–5 之间 |
| CF-04 | 错误 / 警告 | 排放因子缺少数据来源、数据集名称或有效 UUID |
| CF-05 | 警告 | 数据集材料与组件不符 |
| CF-06 | 警告 / 提示 | 代用数据集按真实材料评分 |
| CF-07 | 警告 / 提示 | 填报的 TeR/GeR/TiR/P 优于规则建议值 |
| CF-08 | 警告 | 排放因子超出公开参考范围（也会提示 ×1000 单位错误，以及燃烧燃料却只用了燃料供应数据集） |
| CF-09 | 提示 / 警告 | 所用的中国电力因子是哪一个（生态环境部碳足迹因子还是 CO2 排放因子） |
| CF-10 | 错误 | 排放量 ≠ 用量 × 排放因子（材料、加工、能源、运输各段） |
| CF-11 | 警告 | 估算或供应商数据各项均评为 1 |
| CF-12 | 提示 | 混用多个数据库版本 |
| CF-14 | 警告 | 已使用的工作表中有 Excel 错误值（#VALUE!、#REF!、#DIV/0!） |
| CF-15 | 提示 | 报告基本信息不完整（完成日期、外部审查、列标题错误） |
| CF-16 | 错误 | 产品合计不一致（模组 = 电芯数 × 电芯能量、质量、碳足迹、每 kWh 数值） |
| CF-17 | 提示 | 同一材料在另一份上传文件中的因子或数据集不同 |
| CF-20 – CF-28 | 错误 / 警告 / 提示 | 生命周期清单表：产品名称与规格、数据周期（至少 6 个月）、文件名与表内产线、单位用量 = 总量 ÷ 产量、质量守恒差异 ≥5%、单位标注、其他期间的数据、吨公里 = 质量 × 距离、必填字段空白 |
| CF-30 | 错误 | 评分不符合所选标准（如 PACT 下数据库数据集评 TeR 1–2） |
| CF-31 | 警告 / 提示 | DQR 公式或评分项与所选标准不同 |
| CF-32 | 警告 | 数据质量超出所选标准的限值 |
| CF-33 | 警告 | 标准要求 EF 兼容数据集，但所用数据集未标明 EF 兼容 |
| CF-34 | 错误 / 警告 / 提示 | 电力建模方式不符合所选标准 |
| CF-35 | 警告 / 提示 | GWP 或特征化方法与标准不同或未说明 |
| CF-36 | 警告 | 截断比例超出所选标准的限值 |
| CF-37 | 错误 | 碳足迹中计入了抵消或碳信用 |
| CF-38 | 提示 | 表格中未找到所选标准要求记录的内容 |

## 参考数值

因子范围取自公开资料（铝：IAI；钢：worldsteel；塑料：PlasticsEurope 生态档案；铜：国际铜业协会；燃料：IPCC 2006；运输：DESNZ / GLEC；中国电力：生态环境部；电池 LCA 文献）。它们是**合理性范围**，用于发现选错数据集和单位错误，而非细微差异。本工具不包含也不需要任何商业数据库（ecoinvent、Sphera）内容。

::: warning 请注意
本工具为自查辅助，依据表头名称和文字规律识别。特殊的模板格式可能无法识别；数据集选择若有表格未写明的理由，也可能被标出。本工具不能替代关键性评审或第三方核查。问题说明目前为英文。
:::

---

🧰 [全部工具](/zh/tools/) · [农产品碳足迹计算器](/zh/tools/farm-carbon.html) · [报告数据提取](/zh/tools/data-extract.html)
