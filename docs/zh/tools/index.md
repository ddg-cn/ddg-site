---
aside: false
title: 工具
description: scdd.pro 上的浏览器端质检与参考工具
head:
  - - meta
    - name: robots
      content: noindex, nofollow
---

# 🧰 工具

所有检查都在您的浏览器中运行：文件在本机读取，不会上传。每个工具都在页面上列出检查结果，并可导出为 Excel。

<!-- 英文页 /en/tools.md 为准；修改时请同步本页。 -->

## 报告质检

| 工具 | 检查内容 | 输入 | English |
|------|--------|-------|------|
| [🧾 **报告质检**](/zh/tools/report-qc.html) | 可同时拖入 Clarity、RBA、SMETA、amfori BSCI、EcoVadis 和 CDP 的 PDF，自动识别每个文件的类型并检查。每类报告另有专门页面说明规则和各项数据的含义（如 RBA 估算得分），可从报告质检页进入 | PDF（可多个、可混合） | [English](/en/report-qc.html) |
| [📚 制度文件一致性检查](/zh/tools/policy-qc.html) | 一套政策、手册、程序和表单：同一规定数字不同、引用的文件名称或编号错误、术语有两种定义、保存期限、中国法定最低要求 | .docx / PDF / .txt（多个） | [English](/en/policy-qc.html) |
| [🌡️ 碳足迹表格检查](/zh/tools/carbon-qc.html) | 产品碳足迹表格（欧盟电池碳足迹报告模板、客户 PCF 模板、LCI 数据表），按您选择的标准检查（欧盟电池、PEF、ISO 14067、GHG Protocol、PACT、Catena-X、TfS）：数据集与部件是否对应、建议的 TeR / GeR / TiR / P 及理由、DQR 计算、排放因子与公开范围比较、数量 × 排放因子 | .xlsx / .xlsm（多个） | [English](/en/carbon-qc.html) |
| [🧪 SLCP 核查工具在线质检](/zh/tools/slcp-qc.html) | 已填写的离线 SLCP 核查工具 1.7.x，包括 SLCP 平台的自动数据质量检查 | .xlsm | [English](/en/slcp-qc.html) |

## 分析与参考

| 工具 | 用途 | English |
|------|--------------|------|
| [🗂️ 报告数据提取](/zh/tools/data-extract.html) | 把多份 Clarity、RBA、SMETA、BSCI、EcoVadis、CDP 报告、SLCP 工具和碳足迹表格整理成每类一张 Excel 表，列可自选；不上传、不保存 | [English](/en/data-extract.html) |
| [🔍 ESG 报告透镜](/zh/tools/esg-lens.html) | 抽查可持续发展 / ESG 报告：对不上的数字、需要证据的说法、与报告标准的差距；A–E 内容评级 | [English](/en/esg-lens.html) |
| [🥬 农产品碳足迹计算器](/zh/tools/farm-carbon.html) | 根据化肥、燃料、电力和地膜用量，快速估算蔬菜、水果、茶叶和粮食的农场端碳足迹；IPCC 2019 Tier 1 田间 N2O 和稻田 CH4；排放因子可修改，可导出 Excel | [English](/en/farm-carbon.html) |
| [🗺️ 气候与 ESG 评级一览](/zh/tools/esg-glance.html) | 按地区、行业和规模查看 SBTi 目标；CDP A 名单；EcoVadis 奖牌；IRMA 矿山；RMI 冶炼厂。可自选角度筛选；每年更新 | [English](/en/esg-glance.html) |
| [📈 主要社会责任审核项目一览](/zh/tools/peer-programs.html) | SLCP、SMETA、amfori BSCI、RBA、SA8000、Better Work、FLA、Fair Wear、Higg FEM 等项目的审核数量与覆盖范围 | [English](/en/peer-programs.html) |
| [🌐 国家与地区参考](/zh/tools/country-ref.html) | 供应商风险筛查的国家背景：清廉指数、世界银行治理分数、美国劳工部货物清单和 CBP 暂扣令，并链接 UFLPA 实体清单等参考资料 | [English](/en/country-ref.html) |

本地运行的 Streamlit 工具套件（供应商风险评分、制裁筛查、CMRT 差距分析等）另见 [DD Tools 工具套件](/zh/dd-toolkit.html)。
