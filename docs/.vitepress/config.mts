import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Supply Chain Guides',
  description: 'Responsible Supply Chain Management — Practical Guidance on Supply Chain Due Diligence',
  ignoreDeadLinks: true,

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
          { text: '指南', items: [
            { text: '供应链尽职调查实操指南', link: '/zh/ddg' },
            { text: '劳工与社会责任', link: '/zh/csr-guide' },
            { text: '环境合规', link: '/zh/env-guide' },
            { text: '供应链安全', link: '/zh/security-guide' },
            { text: '知识产权保护', link: '/zh/ip-guide' },
            { text: '商业道德与财务韧性', link: '/zh/ethics-guide' },
          ]},
          { text: '关于/联系', link: '/zh/about' },
        ],
        sidebar: [
          // ─── 总览 ──────────────────────────────────────────────
          {
            text: '总览',
            collapsed: false,
            items: [
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
            text: '劳工与社会责任',
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

          // ─── 参考资源 ─────────────────────────────────────────
          { text: '名词解释', link: '/zh/glossary' },
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
