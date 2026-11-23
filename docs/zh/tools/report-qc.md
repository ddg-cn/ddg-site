---
aside: false
title: 报告质检
description: 拖入任意 Clarity、RBA、SMETA、amfori BSCI、EcoVadis 或 CDP PDF，在浏览器中检查，自动识别报告类型
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ReportQc from '../../components/ReportQc.vue'
</script>

# 🧾 报告质检

所有 PDF 报告检查集中在一处。可同时拖入 **Clarity、RBA、SMETA、amfori BSCI、EcoVadis 和 CDP** 的 PDF：自动识别每个文件的类型，检查内容与各自专门页面相同；同类报告之间还会互相核对。

<ClientOnly>
  <ReportQc kind="auto" lang="zh" />
</ClientOnly>

::: info 文件不会离开您的电脑
PDF 在浏览器中读取，不会上传到任何服务器。首次检查会下载 PDF 读取组件（约 1 MB），之后由浏览器缓存。
:::

## 结果说明

- **错误** = 必须修改 · **警告** = 需复核 · **提示** = 供参考。
- 每份报告的卡片显示从报告中读取的关键数据，例如 RBA 估算得分或 BSCI 总评级。点击 **规则与说明** 可打开该类报告的专门页面，查看每条规则及各项数据的含义。
- 点击数量可按严重程度筛选；也可按规则或文件筛选，或搜索编号、页码、内容。
- Excel 报告每个文件一行汇总，每个问题一行明细。

## 报告类型

| 报告 | 专门页面（规则与说明） |
|---|---|
| Bureau Veritas CLARITY 现场审核及自评报告 | [Clarity 审核报告质检](/zh/tools/clarity-qc.html) |
| RBA VAP 验证审核报告（完整版及摘要版），含估算得分 | [RBA 审核报告质检](/zh/tools/rba-qc.html) |
| SMETA 7 审核报告及 CAPR | [SMETA 审核报告质检](/zh/tools/smeta-qc.html) |
| amfori BSCI 审核报告 | [amfori BSCI 审核报告质检](/zh/tools/bsci-qc.html) |
| EcoVadis 问卷（Survey Full） | [EcoVadis 问卷质检](/zh/tools/ecovadis-qc.html) |
| CDP 问卷回答 | [CDP 问卷回答质检](/zh/tools/cdp-qc.html) |


---

🧰 [全部工具](/zh/tools/) · [报告数据提取](/zh/tools/data-extract.html)
