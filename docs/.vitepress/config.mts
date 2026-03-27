import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Supply Chain Guides',
  description: 'Responsible Supply Chain Management — Practical Guidance',

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guides', link: '/en/ddg' },
        ],
        sidebar: [
          {
            text: 'Guides',
            items: [
              { text: 'Due Diligence Handbook', link: '/en/ddg' },
              { text: 'CSR Auditing', link: '/en/csr-guide' },
              { text: 'Environmental Compliance Auditing', link: '/en/env-guide' },
              { text: 'Supply Chain Security Compliance', link: '/en/security-guide' },
              { text: 'IP Protection & Anti-Counterfeiting', link: '/en/ip-guide' },
              { text: 'Business Ethics & Financial Resilience', link: '/en/ethics-guide' },
              { text: 'Glossary', link: '/en/glossary' },
            ],
          },
        ],
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '全站目录', link: '/zh/toc' },
          { text: '指南', link: '/zh/ddg' },
          { text: '案例研究', link: '/zh/cases/' },
          { text: '行业模板', link: '/zh/industry/' },
          { text: '通用模板', link: '/zh/templates/' },
          { text: '🤖 AI工具', items: [
            { text: '生成定制文件（Prompts）', link: '/zh/ai-prompts' },
            { text: '生成完整指南（Guide Builder）', link: '/zh/guide-builder/' },
          ]},
          { text: '🛠️ DD Tools', link: '/zh/tools/' },
          { text: '下载', link: '/zh/downloads' },
          { text: '关于/联系', link: '/zh/about' },
        ],
        sidebar: [
          // ─── 总览 ──────────────────────────────────────────────
          {
            text: '总览',
            collapsed: false,
            items: [
              { text: '📋 全站内容目录', link: '/zh/toc' },
              { text: '关于我们 / 联系我们', link: '/zh/about' },
              { text: '服务条款', link: '/zh/terms' },
            ],
          },

          // ─── 供应链尽责管理 ───────────────────────────────────
          {
            text: '供应链尽责管理',
            collapsed: false,
            items: [
              { text: '实操指南', link: '/zh/ddg' },
              { text: '🌎 国际法规框架', link: '/zh/international/ddg' },
              { text: '💰 尽职调查成本', link: '/zh/cost-guide' },
            ],
          },

          // ─── 六大支柱指南 ─────────────────────────────────────
          {
            text: '劳工与社会责任（CSR）',
            collapsed: true,
            items: [
              { text: '审核指南', link: '/zh/csr-guide' },
              { text: '🌎 国际实践参考', link: '/zh/international/csr' },
            ],
          },
          {
            text: '环境合规',
            collapsed: true,
            items: [
              { text: '审核指南', link: '/zh/env-guide' },
              { text: '🌎 国际实践参考', link: '/zh/international/env' },
            ],
          },
          {
            text: '供应链安全',
            collapsed: true,
            items: [
              { text: '审核指南', link: '/zh/security-guide' },
              { text: '🌎 国际实践参考', link: '/zh/international/security' },
            ],
          },
          {
            text: '知识产权保护',
            collapsed: true,
            items: [
              { text: '审核指南', link: '/zh/ip-guide' },
              { text: '🌎 国际实践参考', link: '/zh/international/ip' },
            ],
          },
          {
            text: '商业道德与财务韧性',
            collapsed: true,
            items: [
              { text: '审核指南', link: '/zh/ethics-guide' },
              { text: '🌎 国际实践参考', link: '/zh/international/ethics' },
            ],
          },

          // ─── 案例研究库 ──────────────────────────────────────
          {
            text: '案例研究库',
            collapsed: true,
            items: [
              { text: '全部案例', link: '/zh/cases/' },
              {
                text: '劳工与CSR',
                collapsed: true,
                items: [
                  { text: 'Rana Plaza（2013）', link: '/zh/cases/csr/rana-plaza' },
                  { text: '富士康/苹果', link: '/zh/cases/csr/foxconn-apple' },
                ],
              },
              {
                text: '商业道德',
                collapsed: true,
                items: [
                  { text: '阿尔斯通（2014）', link: '/zh/cases/ethics/alstom' },
                  { text: '西门子（2008）', link: '/zh/cases/ethics/siemens' },
                ],
              },
              {
                text: '供应链安全',
                collapsed: true,
                items: [
                  { text: 'Target HVAC（2013）', link: '/zh/cases/security/target-hvac' },
                  { text: 'NotPetya（2017）', link: '/zh/cases/security/notpetya' },
                ],
              },
              {
                text: '知识产权',
                collapsed: true,
                items: [
                  { text: 'GE Aviation（2019）', link: '/zh/cases/ip/ge-aviation' },
                  { text: 'Waymo vs Uber（2017）', link: '/zh/cases/ip/waymo-uber' },
                ],
              },
            ],
          },

          // ─── 通用模板库 ──────────────────────────────────────
          {
            text: '通用模板库',
            collapsed: true,
            items: [
              { text: '模板总览', link: '/zh/templates/' },
              {
                text: '🔍 审核方工具包',
                collapsed: true,
                items: [
                  { text: '审核方工具概览', link: '/zh/templates/auditor/' },
                  { text: '审核前文件请求清单', link: '/zh/templates/audit-checklist' },
                  { text: '访谈问题库', link: '/zh/templates/interview-questions' },
                  { text: '操作表单', link: '/zh/templates/forms' },
                  { text: '政策模板', link: '/zh/templates/policies' },
                ],
              },
              {
                text: '🏭 供应商资源包',
                collapsed: true,
                items: [
                  { text: '供应商资源概览', link: '/zh/templates/supplier/' },
                  { text: '供应商行为准则（SCoC）', link: '/zh/templates/supplier-code' },
                  { text: '供应商自评问卷（SAQ）', link: '/zh/templates/saq' },
                  { text: '审核前文件请求清单', link: '/zh/templates/audit-checklist' },
                ],
              },
            ],
          },

          // ─── 行业专项模板库 ──────────────────────────────────
          {
            text: '行业专项模板库',
            collapsed: true,
            items: [
              { text: '行业模板总览', link: '/zh/industry/' },
              {
                text: '服装与纺织',
                collapsed: true,
                items: [
                  { text: '行业概览', link: '/zh/industry/garment/' },
                  { text: 'SAQ（服装版）', link: '/zh/industry/garment/saq' },
                  { text: '审核前文件清单', link: '/zh/industry/garment/audit-checklist' },
                  { text: '工人访谈指引', link: '/zh/industry/garment/worker-interview' },
                ],
              },
              {
                text: '消费电子与代工',
                collapsed: true,
                items: [
                  { text: '行业概览', link: '/zh/industry/electronics/' },
                  { text: 'SAQ（电子版）', link: '/zh/industry/electronics/saq' },
                  { text: '审核前文件清单', link: '/zh/industry/electronics/audit-checklist' },
                ],
              },
              {
                text: '食品与农业',
                collapsed: true,
                items: [
                  { text: '行业概览', link: '/zh/industry/food/' },
                  { text: 'SAQ（食品版）', link: '/zh/industry/food/saq' },
                  { text: '审核前文件清单', link: '/zh/industry/food/audit-checklist' },
                ],
              },
              {
                text: '化工与危险品',
                collapsed: true,
                items: [
                  { text: '行业概览', link: '/zh/industry/chemicals/' },
                  { text: 'SAQ（化工版）', link: '/zh/industry/chemicals/saq' },
                ],
              },
              {
                text: '建筑与工程',
                collapsed: true,
                items: [
                  { text: '行业概览', link: '/zh/industry/construction/' },
                  { text: 'SAQ（建筑版）', link: '/zh/industry/construction/saq' },
                ],
              },
            ],
          },

          // ─── AI 工具 ──────────────────────────────────────────
          {
            text: '🤖 AI 工具',
            collapsed: true,
            items: [
              { text: '用AI生成定制文件', link: '/zh/ai-prompts' },
              { text: '指南生成器概览', link: '/zh/guide-builder/' },
              { text: '综合尽职调查（六柱全覆盖）', link: '/zh/guide-builder/full-ddg' },
              { text: 'CSR 劳工与社会责任', link: '/zh/guide-builder/csr' },
              { text: '环境合规', link: '/zh/guide-builder/env' },
              { text: '供应链安全', link: '/zh/guide-builder/security' },
              { text: '知识产权保护', link: '/zh/guide-builder/ip' },
              { text: '商业道德与财务韧性', link: '/zh/guide-builder/ethics' },
            ],
          },

          // ─── DD Tools Streamlit ──────────────────────────────
          {
            text: '🛠️ DD Tools（Streamlit）',
            collapsed: true,
            items: [
              { text: '工具套件总览', link: '/zh/tools/' },
              {
                text: '第一步：管理体系建设',
                collapsed: true,
                items: [
                  { text: '⚙️ 机构设置', link: '/zh/tools/#机构设置-setup' },
                  { text: '📄 政策文件生成器', link: '/zh/tools/#政策文件生成器-policy-generator' },
                  { text: '🤖 AI模板生成器', link: '/zh/tools/#ai-模板生成器-ai-template-builder' },
                  { text: '🔔 政策监控 ⚡', link: '/zh/tools/#政策监控-policy-monitor' },
                ],
              },
              {
                text: '第二步：风险识别',
                collapsed: true,
                items: [
                  { text: '📊 供应商风险评分', link: '/zh/tools/#供应商风险评分-supplier-risk-scorer' },
                  { text: '🔎 制裁与实体清单筛查', link: '/zh/tools/#制裁与实体清单筛查-sanctions-screener' },
                  { text: '📑 CMRT差距分析', link: '/zh/tools/#cmrt-差距分析-cmrt-checker' },
                  { text: '🗺️ 供应链可视化', link: '/zh/tools/#供应链可视化-supply-chain-mapper' },
                  { text: '🌍 国家风险情报 ⚡', link: '/zh/tools/#国家风险情报-country-intel' },
                  { text: '⏰ 定时筛查 ⚡', link: '/zh/tools/#定时筛查-scheduled-screener' },
                ],
              },
              {
                text: '第三步：风险应对',
                collapsed: true,
                items: [
                  { text: '🚨 纠正行动计划（CAP）', link: '/zh/tools/#纠正行动计划-cap-generator-tracker' },
                  { text: '🔍 审核工具包', link: '/zh/tools/#审核工具包-audit-toolkit' },
                ],
              },
              {
                text: '第四步：验证与追踪',
                collapsed: true,
                items: [
                  { text: '🏛️ 验证机构注册库', link: '/zh/tools/#验证机构注册库-verification-register' },
                  { text: '📈 供应商历史档案', link: '/zh/tools/#供应商历史档案-supplier-history' },
                  { text: '📊 KPI仪表盘 ⚡', link: '/zh/tools/#kpi-仪表盘-kpi-dashboard' },
                ],
              },
              {
                text: '第五步：报告与披露',
                collapsed: true,
                items: [
                  { text: '📝 年度报告生成器', link: '/zh/tools/#年度报告生成器-report-generator' },
                  { text: '📊 演示文稿生成器', link: '/zh/tools/#演示文稿生成器-presentation-builder' },
                  { text: '🌐 披露追踪器', link: '/zh/tools/#披露追踪器-disclosure-tracker' },
                  { text: '🏅 机构DD成熟度评分', link: '/zh/tools/#机构-dd-成熟度评分-org-scorecard' },
                ],
              },
            ],
          },

          // ─── 参考资源 ─────────────────────────────────────────
          { text: '名词解释', link: '/zh/glossary' },
          { text: '📥 资源下载', link: '/zh/downloads' },
        ],
      },
    },
  },

  themeConfig: {
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    socialLinks: [],
    footer: {
      message: '本站内容仅供参考，不构成法律意见。法规要求随时可能变化，使用前请以官方来源为准，并咨询具备资质的合规或法律专业人员。 <a href="/zh/terms">服务条款</a> · <a href="/zh/about">联系我们</a>',
      copyright: 'Supply Chain Due Diligence Guides — For informational purposes only. Not legal advice.',
    },
  },

  mermaid: {
    theme: 'neutral',
  },
}))
