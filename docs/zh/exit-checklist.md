---
title: 负责任退出核对清单
description: 选择您的角色和情形，获取业务关系终止、工厂关闭或搬迁时适用于您的步骤
aside: false
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import ExitChecklist from '../components/ExitChecklist.vue'
import { ROLES, SITS, PHASES, roleItems } from '../components/exit/checklists.js'
</script>

# 负责任退出核对清单

选择您的角色，也可以选择所处情形，清单会按顺序列出适用于您的步骤。内容来自[《负责任退出指南》](./exit-guide)、ACT《负责任退出政策与核对清单》（2022）、FLA裁员指南（2023）、ETI《负责任脱离技术指南》（2026）和中国法律。每一步后面注明了出处。

<ClientOnly>
  <ExitChecklist lang="zh" store-key="scdd-exit-roles-zh" :items="roleItems('zh')" :roles="ROLES.zh" :sits="SITS.zh" :phases="PHASES.zh" />
</ClientOnly>

::: tip 五种情形
**S1** 采购方终止或大幅削减订单 · **S2** 工厂终止与某客户的合作 · **S3** 工厂关闭 · **S4** 工厂搬迁 · **S5** 因制裁、进口禁令或法律冲突被迫退出。详见[指南](./exit-guide)。
:::

*本清单为一般性信息，不构成法律意见。行动前请核对现行法律。*
