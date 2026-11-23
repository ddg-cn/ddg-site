---
aside: false
title: Country Reference
description: Country background for supplier risk screening - Corruption Perceptions Index, World Bank governance indicators, US Department of Labor goods list, US CBP Withhold Release Orders - from the publishers' own data
head:
  - - meta
    - name: robots
      content: noindex
---

<script setup>
import CountryRef from '../components/CountryRef.vue'
</script>

# 🌐 Country Reference

Background figures for screening sourcing countries, taken unchanged from the publishers' own datasets. They describe a country, not a supplier: a low score says nothing about any one factory, and a high score is no reason to skip due diligence.

<ClientOnly>
  <CountryRef lang="en" />
</ClientOnly>

## Official lists

These are enforcement and reference lists kept by US government agencies. The counts below are as published; open the list itself for names and details.

| List | What it is | Latest |
|---|---|---|
| [UFLPA Entity List](https://www.dhs.gov/uflpa-entity-list) (US Department of Homeland Security) | Entities whose goods are presumed barred from import into the US under the Uyghur Forced Labor Prevention Act | 210 listings (196 distinct entries) as shown on the page, last updated 28 Oct 2026 |
| [Withhold Release Orders and Findings](https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard) (US Customs and Border Protection) | Orders to detain specific goods suspected of being made with forced labour (WRO) or confirmed to be (Finding) | 63 active (55 WROs, 8 Findings) and 5 partly modified, in CBP's dataset of 10 Nov 2026; 6 of the active orders concern fishing vessels rather than a country |
| [List of Goods Produced by Child Labor or Forced Labor](https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods) (US Department of Labor) | Goods and countries where the Department has reason to believe child or forced labour is used | 2024 edition: 204 goods from 82 countries and areas |

## Also useful (links only)

These are widely cited, but their terms do not allow the figures to be reproduced here, so they are linked rather than shown.

- [Global Slavery Index 2023](https://www.walkfree.org/global-slavery-index/) (Walk Free): estimated prevalence of modern slavery, vulnerability and government response, by country. The prevalence figures are modelled estimates, and the 2018 and 2023 editions are not directly comparable. The next edition is expected in 2027.
- [ITUC Global Rights Index 2026](https://www.ituc-csi.org/global-rights-index) (International Trade Union Confederation): ratings from 1 to 5+ for respect of collective labour rights (freedom of association, collective bargaining, strike).

## Reading the figures

- **CPI** (Transparency International) measures how corrupt a country's public sector is perceived to be, from 0 (highly corrupt) to 100 (very clean), combining 3 to 10 expert and business surveys. Changes of one or two points are usually within the margin of error (see the standard error in each country's details). Scores are comparable from 2012 onwards.
- **WGI** (World Bank) gives six governance scores from 0 to 100. Since the 2025 revision the World Bank publishes these absolute scores instead of percentile ranks, so older published ranks cannot be compared with them. The "WGI average" column is the plain mean of the six scores, calculated here. The World Bank says the indicators are for research and policy analysis and should not be the sole basis for critical financial decisions. amfori's country risk classification for amfori BSCI is also based on the average of the six WGI scores; its cut-offs are published to members only and are not reproduced here.
- **US Department of Labor list**: a good is listed when there is reason to believe child labour, forced labour or forced child labour is used in its production in that country. It does not mean that all production of that good there is affected.
- **CBP orders** apply to named goods, and usually to named producers. Click a country for the year, type and goods of each order, and see CBP's dashboard for the producers named.

## Sources and licences

- Transparency International, Corruption Perceptions Index 2025, published 10 Feb 2026. Licensed under [CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/); values are shown unchanged and are not combined with other data.
- World Bank, Worldwide Governance Indicators, 2026 update (data year 2025), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Values are rounded to two decimals; the average is our calculation.
- US Department of Labor, 2024 List of Goods Produced by Child Labor or Forced Labor; US Customs and Border Protection, WRO and Findings dataset of 10 Nov 2026; US Department of Homeland Security, UFLPA Entity List. US government works, shown without endorsement by the agencies.
- Country names follow UN and World Bank usage.

Data collected 23 Nov 2026. CPI is updated each February, WGI each September, and the Department of Labor list about every two years.

---

🧰 [All tools](/en/tools.html) · [Social compliance programs at a glance](/en/peer-programs.html) · [Climate & ESG at a glance](/en/esg-glance.html)
