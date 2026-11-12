"""ESG Report Lens - analysis core (pure Python, standard library only).

Used in two places with identical results:
  * lens.py on the PC (PDF read with PyMuPDF)
  * the scdd.pro web page (PDF read with pdf.js, this file run by Pyodide)

Input document:
  {"file": name, "pages": [{"text": reading-order text, "words": [[x0, y0, x1, y1, text], ...]}, ...]}
  Coordinates are PDF points, y grows downwards.
Config: {"indicators": [...], "rules": [...], "terms": [...]} - rows of the Excel config files.
"""
import difflib
import math
import re
from collections import Counter, defaultdict

CORE_VERSION = "2.1"
CJK = r"㐀-鿿豈-﫿"
SEV = ["High", "Medium", "Low", "Info"]
SEV_ORDER = {s: i for i, s in enumerate(SEV)}

NUM_UNIT = re.compile(
    r"\d[\d,，]*(?:\.\d+)?\s*(?:%|％|万?吨(?:标准煤|二氧化碳当量|CO2e?)?|tCO2e?|tCO₂e?|tce|万?千瓦时|兆瓦时|kWh|MWh|GWh|GJ|TJ|万?立方米|m3|m³|"
    r"小时|人次|人|次|起|家|万?元|亿元|件|项|个|tonnes?|tons?|hours?|employees|people|cases|incidents)",
    re.I,
)

# ======================================================================= text
TXT = {
    "en": {
        "sev": {"High": "High", "Medium": "Medium", "Low": "Low", "Info": "Info"},
        "type": {"Consistency": "Numbers", "Claim": "Claim", "Gap": "Gap", "Change": "Year on year"},
        "headline": "Covers {g}% of the exchange-guideline indicators ({a}% of all {n} indicators checked). {issues}",
        "issues_line": "{c} number problem(s), {h} high- and {m} medium-priority claim(s) to substantiate, {k} key gap(s).",
        "s_cov": "Broad coverage: {g}% of the exchange-guideline indicators are addressed.",
        "s_scope123": "Discloses Scope 1, 2 and 3 emissions figures.",
        "s_scope12": "Discloses Scope 1 and Scope 2 emissions figures.",
        "s_assure": "External assurance mentioned (p.{p}).",
        "s_target": "Dated near-term target(s), e.g. p.{p}: “{s}”",
        "s_years": "Data tables give multi-year comparatives ({n} values over {y} years).",
        "s_sums": "Totals in the data tables add up ({n} arithmetic checks passed).",
        "s_plain": "Concrete language: few vague commitments ({d} per 10,000 characters).",
        "s_noclaim": "No high-priority unsupported claims found.",
        "s_dmat": "Double materiality assessment described.",
        "w_numbers": "{n} number problem(s) in the data, e.g. {e}",
        "w_claims": "{n} claim(s) that need evidence, e.g. “{e}” (p.{p}).",
        "w_gaps": "Key gaps: {e}.",
        "w_cov": "Thin coverage: only {g}% of the exchange-guideline indicators are addressed.",
        "w_vague": "Vague language is frequent ({d} vague commitments per 10,000 characters).",
        "w_boundary": "Some data covers only part of the company (partial boundary, p.{p}).",
        "w_dropped": "{n} item(s) disclosed last year are missing or no longer quantified this year.",
        "w_restated": "{n} prior-year value(s) changed without a restatement note.",
        "l_tables": "No machine-readable data table was found, so the number checks could not run (figures may be images).",
        "l_few": "Only {n} values could be read from data tables (much of the data may be in charts or images), so few number checks could run.",
        "l_scan": "{n} page(s) have no text layer (scanned images); they were not read.",
        "l_keyword": "Coverage is keyword-based: it shows a topic is mentioned, not that the disclosure is good. Open the page before quoting.",
        "gap_title": "Not found: {i}",
        "gap_note": "No mention found in the report.",
        "gap_partly": "Mentioned, but no figure found.",
        "gap_why": "The exchange guideline (2024) and/or ISSB/GRI expect this item.",
        "gap_fix": "Disclose it, or explain why it is not material.",
        "key_gaps": {
            "E-CL-07": "Scope 1 emissions figure", "E-CL-08": "Scope 2 emissions figure", "E-CL-09": "Scope 3 emissions",
            "G-RP-03": "external assurance", "G-GV-04": "materiality assessment", "E-CL-11": "GHG method / base year",
            "G-RP-02": "reporting boundary and period"},
        "c_scope": "Scope 1 + Scope 2 does not equal the total ({y})",
        "c_scope_d": "Scope 1 {a} + Scope 2 {b} = {s}, but the total shown is {t} {u}.",
        "c_gender": "Men + women does not equal the total ({y})",
        "c_gender_d": "{lm} {m} + {lf} {f} = {s}, but {lt} is {t}.",
        "c_break": "Breakdown “{g}” does not add up to 100% ({y})",
        "c_break_d": "{parts} = {s}%.",
        "footnote": "The table has a footnote here - read it first; it may explain the difference.",
        "c_child": "An ‘of which’ item is larger than its total ({y})",
        "c_child_d": "“{c}” = {cv} is larger than “{p}” = {pv} {u}.",
        "c_pct": "Percentage above 100% ({y})",
        "c_pct_d": "“{l}” = {v}%.",
        "c_dup": "Same indicator, two different values ({y})",
        "c_dup_d": "“{l}” is {a} on p.{p1} but {b} on p.{p2} ({u}).",
        "c_int": "Intensity does not match total ÷ revenue ({y})",
        "c_int_d": "{lt} {t} ÷ {lr} {r} = {x} (any power of ten), but “{li}” is {i}.",
        "c_jump": "Large change in “{l}” ({y0}→{y1})",
        "c_jump_d": "{a} → {b} {u} ({p:+.0f}%). {note}",
        "c_jump_note_yes": "The report mentions a boundary/method change - check it explains this.",
        "c_jump_note_no": "No boundary or method change is mentioned - the change should be explained.",
        "c_why": "Figures that don't add up are the first thing an analyst, auditor or regulator checks.",
        "c_fix": "Re-check the source data and the table; footnote any difference in boundary or rounding.",
        "c_jump_why": "Big swings are often boundary or method changes that readers can't see.",
        "c_jump_fix": "Explain the change: new sites, acquisitions, emission factors or method.",
        "y_dropped": "Disclosed last year, not found this year: {i}",
        "y_numdrop": "Quantified last year, only described this year: {i}",
        "y_restated": "Prior-year value changed: {l} ({y})",
        "y_restated_d": "Last year's report: {a}; this report: {b}. {n}",
        "y_note_yes": "The report mentions a restatement - check it covers this item.",
        "y_note_no": "No restatement note found.",
        "y_target": "Target from last year's report not found this year",
        "y_target_d": "Last year p.{p}: “{s}” (best match this year {m}%).",
        "y_why": "Quietly dropped items and restated numbers are classic consistency problems.",
        "y_fix": "Keep last year's indicators, or explain why they changed or were dropped; footnote restatements.",
        "scoped": "Scoped claim (a specific stream or site) - lower priority, but say how it is verified.",
        "evidence": "Supporting detail found on p.{p} - check that it covers this claim.",
        "blob": "Text taken from a table or graphic - check the page.",
        "also": "Also on p.{p}.",
    },
    "zh": {
        "sev": {"High": "高", "Medium": "中", "Low": "低", "Info": "提示"},
        "type": {"Consistency": "数据", "Claim": "表述", "Gap": "缺失", "Change": "跨年"},
        "headline": "交易所指引相关指标覆盖 {g}%（全部 {n} 项指标覆盖 {a}%）。{issues}",
        "issues_line": "数据问题 {c} 项，需补充依据的高/中风险表述 {h}/{m} 项，关键缺失 {k} 项。",
        "s_cov": "覆盖面广：交易所指引相关指标覆盖 {g}%。",
        "s_scope123": "披露了范围一、范围二和范围三排放数据。",
        "s_scope12": "披露了范围一和范围二排放数据。",
        "s_assure": "提及第三方鉴证（第 {p} 页）。",
        "s_target": "设有带年份的近期目标，例如第 {p} 页：“{s}”",
        "s_years": "数据表提供多年对比（{y} 个年度，共 {n} 个数值）。",
        "s_sums": "数据表中的合计数核对一致（通过 {n} 项算术核对）。",
        "s_plain": "表述具体：模糊承诺用语较少（每万字 {d} 次）。",
        "s_noclaim": "未发现高风险的无依据表述。",
        "s_dmat": "描述了双重重要性评估。",
        "w_numbers": "数据中有 {n} 处数字问题，例如：{e}",
        "w_claims": "{n} 处表述需要依据支撑，例如“{e}”（第 {p} 页）。",
        "w_gaps": "关键缺失：{e}。",
        "w_cov": "覆盖不足：交易所指引相关指标仅覆盖 {g}%。",
        "w_vague": "模糊用语较多（每万字 {d} 次模糊承诺）。",
        "w_boundary": "部分数据只覆盖公司的一部分（边界不完整，第 {p} 页）。",
        "w_dropped": "{n} 项去年披露的内容今年未见或不再量化。",
        "w_restated": "{n} 个往年数值发生变化，但没有重述说明。",
        "l_tables": "未找到可读取的数据表，数字核对无法运行（数据可能是图片）。",
        "l_few": "仅从数据表中读取到 {n} 个数值（大部分数据可能是图表或图片），能运行的数字核对很少。",
        "l_scan": "{n} 页没有文字层（扫描图片），未能读取。",
        "l_keyword": "覆盖检查基于关键词：只说明报告提到了该议题，不代表披露质量好。引用前请打开原页核对。",
        "gap_title": "未找到：{i}",
        "gap_note": "报告中未找到相关内容。",
        "gap_partly": "有提及，但未找到数据。",
        "gap_why": "交易所《可持续发展报告指引》（2024）及/或 ISSB、GRI 要求或期望披露此项。",
        "gap_fix": "补充披露，或说明其不具重要性的理由。",
        "key_gaps": {
            "E-CL-07": "范围一排放数据", "E-CL-08": "范围二排放数据", "E-CL-09": "范围三排放",
            "G-RP-03": "第三方鉴证", "G-GV-04": "重要性评估", "E-CL-11": "温室气体核算方法 / 基准年",
            "G-RP-02": "报告边界与期间"},
        "c_scope": "范围一 + 范围二 不等于排放总量（{y}）",
        "c_scope_d": "范围一 {a} + 范围二 {b} = {s}，但报告的总量为 {t} {u}。",
        "c_gender": "男性 + 女性 不等于总数（{y}）",
        "c_gender_d": "{lm} {m} + {lf} {f} = {s}，但{lt}为 {t}。",
        "c_break": "“{g}”的占比合计不等于 100%（{y}）",
        "c_break_d": "{parts} = {s}%。",
        "footnote": "表格此处有脚注，请先阅读，它可能解释了差异。",
        "c_child": "“其中”项大于合计（{y}）",
        "c_child_d": "“{c}” = {cv}，大于“{p}” = {pv} {u}。",
        "c_pct": "百分比超过 100%（{y}）",
        "c_pct_d": "“{l}” = {v}%。",
        "c_dup": "同一指标出现两个不同数值（{y}）",
        "c_dup_d": "“{l}”在第 {p1} 页为 {a}，在第 {p2} 页为 {b}（{u}）。",
        "c_int": "强度与“总量 ÷ 营收”不符（{y}）",
        "c_int_d": "{lt} {t} ÷ {lr} {r} = {x}（允许 10 的整数次方差异），但“{li}”为 {i}。",
        "c_jump": "“{l}”变化较大（{y0}→{y1}）",
        "c_jump_d": "{a} → {b} {u}（{p:+.0f}%）。{note}",
        "c_jump_note_yes": "报告提到了边界或方法变化，请核对是否解释了这一变化。",
        "c_jump_note_no": "报告未提及边界或方法变化，应解释变化原因。",
        "c_why": "数字对不上，是分析师、审核员或监管机构首先会检查的问题。",
        "c_fix": "复核源数据与表格；如边界或四舍五入导致差异，请加脚注说明。",
        "c_jump_why": "大幅波动往往来自读者看不到的边界或方法变化。",
        "c_jump_fix": "说明变化原因：新增工厂、并购、排放因子或核算方法变化。",
        "y_dropped": "去年已披露，今年未找到：{i}",
        "y_numdrop": "去年有数据，今年只有文字描述：{i}",
        "y_restated": "往年数值发生变化：{l}（{y}）",
        "y_restated_d": "去年报告：{a}；本报告：{b}。{n}",
        "y_note_yes": "报告提到了数据重述，请核对是否涵盖此项。",
        "y_note_no": "未找到重述说明。",
        "y_target": "去年报告中的目标今年未找到",
        "y_target_d": "去年第 {p} 页：“{s}”（今年最接近的表述相似度 {m}%）。",
        "y_why": "悄悄删除的指标和被改动的往年数字，是典型的一致性问题。",
        "y_fix": "保留去年的指标，或说明变化/删除的原因；重述的数据加脚注说明。",
        "scoped": "针对特定排放物或场所的表述，风险较低，但应说明如何验证。",
        "evidence": "第 {p} 页有相关支持信息，请核对是否涵盖此表述。",
        "blob": "文字取自表格或图片，请打开原页核对。",
        "also": "另见第 {p} 页。",
    },
}


def tr(lang):
    return TXT.get(lang, TXT["en"])


# ======================================================================= config
def compile_or_none(pattern, flags=0):
    pattern = (pattern or "").strip()
    if not pattern:
        return None
    try:
        return re.compile(pattern, flags)
    except re.error:
        return None


def _active(rows):
    return [r for r in rows if r.get("ID") and str(r.get("Active (Y/N)", "Y")).strip().upper() != "N"]


def compile_config(cfg):
    inds = []
    for d in _active(cfg["indicators"]):
        d = dict(d)
        d["re_cn"] = compile_or_none(d.get("Keywords CN (regex)"))
        d["re_en"] = compile_or_none(d.get("Keywords EN (regex)"), re.I)
        d["quant"] = str(d.get("Quantitative (Y/N)", "")).upper() == "Y"
        d["guide"] = "CN Guide" in (d.get("References") or "")
        inds.append(d)
    rules = []
    for r in _active(cfg["rules"]):
        r = dict(r)
        r["re_cn"] = compile_or_none(r.get("Pattern CN (regex)"))
        r["re_en"] = compile_or_none(r.get("Pattern EN (regex)"), re.I)
        r["re_unless"] = compile_or_none(r.get("Unless in same sentence (regex)"), re.I)
        r["re_lower"] = compile_or_none(r.get("Lower if (regex)"), re.I)
        r["evidence"] = (r.get("Evidence elsewhere (regex, {m} = match)") or "").strip()
        rules.append(r)
    terms = []
    for t in cfg.get("terms", []):
        rx = compile_or_none(t.get("Term (regex)"), re.I)
        if rx and str(t.get("Active (Y/N)", "Y")).strip().upper() != "N":
            ids = {x.strip() for x in re.split(r"[,;\s]+", t.get("Rules (blank = all)") or "") if x.strip()}
            terms.append({"rx": rx, "rules": ids})
    return {"indicators": inds, "rules": rules, "terms": terms}


# ======================================================================= text
def normalise(text):
    text = text.replace("　", " ").replace("\xa0", " ")
    text = re.sub(rf"(?<=[{CJK}])[ \t]+(?=[{CJK}])", "", text)  # pdf.js may space CJK runs
    text = re.sub(rf"(?<=[{CJK}，、；：（）“”])\s*\n\s*(?=[{CJK}（）“”])", "", text)  # join wrapped CJK lines
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"[ \t]*\n[ \t]*", "\n", text)
    return text


def strip_repeats(pages):
    """Drop running headers, footers and navigation bars: lines repeated on many pages."""
    seen = Counter(line for p in pages for line in {x.strip() for x in p.split("\n") if len(x.strip()) >= 4})
    limit = max(3, len(pages) * 0.25)
    rep = {line for line, n in seen.items() if n >= limit}
    return ["\n".join(x for x in p.split("\n") if x.strip() not in rep) for p in pages]


SPLIT = re.compile(r"(?<=[。！？；!?;])|(?<=[a-z0-9\)]\.)\s+(?=[A-Z])")


def is_blob(lines):
    """A chunk of table cells / chart labels rather than prose."""
    flat = "".join(lines)
    if len(lines) >= 4 and sum(len(x) for x in lines) / len(lines) < 30:
        return True
    if len(flat) > 80:
        digits = len(re.findall(r"\d", flat))
        punct = len(re.findall(r"[，,、]", flat))
        if digits / len(flat) > 0.25 or (len(flat) > 200 and punct / len(flat) < 0.006):
            return True
    return False


def units(pages):
    """Sentence-like units: (page, text, from_blob). Table blobs are split into their lines."""
    out = []
    for pno, txt in enumerate(pages, 1):
        for chunk in SPLIT.split(txt):
            lines = [x.strip() for x in chunk.split("\n") if x.strip()]
            if not lines:
                continue
            if is_blob(lines):
                out.extend((pno, x, True) for x in lines if len(x) >= 6)
            else:
                s = " ".join(lines)
                s = re.sub(rf"(?<=[{CJK}]) (?=[{CJK}])", "", s)
                if len(s) >= 6:
                    out.append((pno, s, False))
    return out


def lang_of(pages):
    sample = "".join(pages)[:200000]
    cjk = len(re.findall(f"[{CJK}]", sample))
    lat = len(re.findall(r"[A-Za-z]", sample))
    return "zh" if cjk > lat * 0.3 else "en"


def short(s, n=220):
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[: n - 1] + "…"


# ======================================================================= coverage
def coverage(inds, pages):
    rows = []
    for d in inds:
        hits = []
        for pno, txt in enumerate(pages, 1):
            for rx in (d["re_cn"], d["re_en"]):
                if not rx:
                    continue
                for m in rx.finditer(txt):
                    lo, hi = max(0, m.start() - 60), min(len(txt), m.end() + 120)
                    after = NUM_UNIT.search(txt, m.end(), min(len(txt), m.end() + 40))
                    num = after
                    if not after:
                        seg = txt[max(0, m.start() - 30):m.start()]
                        b = list(NUM_UNIT.finditer(seg))
                        num = b[-1] if b else None
                    hits.append((pno, re.sub(r"\s+", " ", txt[lo:hi]).strip(), num.group(0) if num else ""))
                    if len(hits) > 400:
                        break
        pages_hit = sorted({h[0] for h in hits})
        numbered = [h for h in hits if h[2]]
        if not hits:
            status = "Missing"
        elif d["quant"]:
            status = "Disclosed" if numbered else "Partly"
        else:
            status = "Disclosed" if len(pages_hit) >= 2 or len(hits) >= 3 else "Partly"
        best = (numbered or hits or [(None, "", "")])[0]
        rows.append({
            "ID": d["ID"], "Pillar": d.get("Pillar", ""), "Topic": d.get("Topic", ""),
            "Indicator": d.get("Indicator (CN)", ""), "Indicator EN": d.get("Indicator (EN)", ""),
            "Guideline": "Y" if d["guide"] else "", "Quant": "Y" if d["quant"] else "N", "Status": status,
            "Mentions": len(hits), "Pages": ", ".join(map(str, pages_hit[:15])) + (" …" if len(pages_hit) > 15 else ""),
            "First page": best[0] or "", "Number found": re.sub(r"\s+", " ", best[2]), "Evidence": best[1][:300],
            "References": d.get("References", ""),
        })
    return rows


def upgrade_from_tables(cov, inds, kpis):
    """A quantitative indicator whose keyword matches a data-table row label counts as disclosed with that figure."""
    by = {d["ID"]: d for d in inds}
    for r in cov:
        d = by.get(r["ID"])
        if not d or not d["quant"] or r["Status"] == "Disclosed":
            continue
        for k in kpis:
            if any(rx and rx.search(k["label"]) for rx in (d["re_cn"], d["re_en"])) and not EXCL_ABS.search(k["label"]):
                r["Status"] = "Disclosed"
                r["Number found"] = f'{k["value"]} {k["unit"]} ({k["year"]})'.strip()
                r["Evidence"] = f'[table p.{k["page"]}] {k["label"]}'
                r["First page"] = k["page"]
                if str(k["page"]) not in r["Pages"].split(", "):
                    r["Pages"] = (r["Pages"] + ", " if r["Pages"] else "") + str(k["page"])
                r["Mentions"] = max(r["Mentions"], 1)
                break


def score(cov, guide_only=False):
    pts = {"Disclosed": 1, "Partly": 0.5, "Missing": 0}
    rows = [r for r in cov if r["Guideline"] == "Y"] if guide_only else cov
    return round(sum(pts[r["Status"]] for r in rows) / max(len(rows), 1) * 100)


# ======================================================================= claims
def lower(sev, n=1):
    return SEV[min(SEV_ORDER.get(sev, 3) + n, 3)]


def claims(rules, terms, unit_list, pages, L):
    """Claim flags, grouped by (rule, matched text). Returns (issues, density)."""
    total_chars = sum(len(p) for p in pages)
    alltext = [(i, re.sub(r"\s+", "", p)) for i, p in enumerate(pages, 1)]
    groups, density = {}, {}
    for r in rules:
        count = 0
        for k, (pno, s, blob) in enumerate(unit_list):
            hit = None
            for rx in (r["re_cn"], r["re_en"]):
                if rx and (m := rx.search(s)):
                    hit = m
                    break
            if not hit:
                continue
            ctx = s[max(0, hit.start() - 80): hit.end() + 80]
            # neighbouring units on the same page count as "the same sentence" for the Unless test
            near = [u[1] for u in unit_list[max(0, k - 1): k + 2] if u[0] == pno and not u[2]] if not blob else [s]
            wide = " ".join(near) if near else ctx
            if r["re_unless"] and (r["re_unless"].search(ctx) or (not blob and r["re_unless"].search(wide))):
                continue
            if any(t["rx"].search(ctx) for t in terms if not t["rules"] or r["ID"] in t["rules"]):
                continue
            count += 1
            if r.get("Severity") == "Density":
                continue
            sev, notes = r.get("Severity", "Low"), []
            if r["re_lower"] and r["re_lower"].search(ctx):
                sev = lower(sev)
                notes.append(L["scoped"])
            key = (r["ID"], re.sub(r"\s+", "", hit.group(0)).lower())
            g = groups.get(key)
            if g is None:
                g = groups[key] = {"rule": r, "sev": sev, "pages": [], "found": hit.group(0), "evidence": ctx,
                                   "notes": notes, "blob": blob, "first": pno}
            elif SEV_ORDER[sev] < SEV_ORDER[g["sev"]]:
                g.update(sev=sev, evidence=ctx, notes=notes, blob=blob, first=pno)
            if pno not in g["pages"]:
                g["pages"].append(pno)
        if r.get("Severity") == "Density":
            density[r["Category"]] = round(count / max(total_chars, 1) * 10000, 2)
    out = []
    for (rid, found), g in groups.items():
        r = g["rule"]
        sev, notes = g["sev"], list(g["notes"])
        if r["evidence"]:
            rx = compile_or_none(r["evidence"].replace("{m}", re.escape(re.sub(r"\s+", "", g["found"]))), re.I)
            ev = next((p for p, t in alltext if rx and rx.search(t)), None)
            if ev:
                sev = lower(sev)
                notes.append(L["evidence"].format(p=ev))
        if g["blob"]:
            notes.append(L["blob"])
        others = [p for p in sorted(g["pages"]) if p != g["first"]]
        if others:
            notes.append(L["also"].format(p=", ".join(map(str, others[:12])) + (" …" if len(others) > 12 else "")))
        zh = L is TXT["zh"]
        out.append({
            "sev": sev, "type": "Claim", "rule": rid,
            "title": (r.get("Category (CN)") if zh else None) or r.get("Category", ""),
            "pages": [g["first"]] + others, "found": g["found"], "evidence": short(g["evidence"], 260),
            "note": " ".join(notes),
            "why": (r.get("Why it matters (CN)") if zh else None) or r.get("Why it matters", ""),
            "fix": (r.get("What good looks like (CN)") if zh else None) or r.get("What good looks like", ""),
        })
    return out, density


# ======================================================================= tables from word positions
YEARTOK = re.compile(r"^(?:FY\s*)?(20[0-3]\d)\s*(?:年度?|FY|财年)?$", re.I)
NUMTOK = re.compile(r"^[-−–]?\d[\d,，]*(?:\.\d+)?\s*[%％]?$")
UNITTOK = re.compile(
    r"^[（(]?(?:%|％|人|人次|名|个|家|次|起|件|项|天|日|小时|h|元|万元|亿元|百万元|千元|美元|万美元|"
    r"吨|万吨|千吨|吨二氧化碳当量|万吨二氧化碳当量|吨CO2e?|tCO2e?|tCO₂e?|tonnes?|t|kt|"
    r"千瓦时|万千瓦时|兆瓦时|MWh|kWh|GWh|吉焦|GJ|TJ|吨标准煤|万吨标准煤|tce|"
    r"立方米|万立方米|m3|m³|吨/万元|tCO2e/万元|.{0,12}/.{0,8})[）)]?$", re.I)


def _split_words(words):
    """pdf.js runs may hold several words ('2023 2024 2025'); split them with proportional x."""
    out = []
    for w in words:
        if len(w) < 5:
            continue
        x0, y0, x1, y1, t = float(w[0]), float(w[1]), float(w[2]), float(w[3]), str(w[4])
        if not t.strip():
            continue
        if not re.search(r"\s{1,}", t.strip()):
            out.append((x0, y0, x1, y1, t.strip()))
            continue
        n = max(len(t), 1)
        for m in re.finditer(r"\S+", t):
            out.append((x0 + (x1 - x0) * m.start() / n, y0, x0 + (x1 - x0) * m.end() / n, y1, m.group(0)))
    return out


def rows_of(words):
    """Group words into visual rows, then rows into cells (big horizontal gap = new cell)."""
    ws = sorted(_split_words(words), key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    rows = []
    for w in ws:
        h = max(w[3] - w[1], 1.0)
        yc = (w[1] + w[3]) / 2
        if rows and abs(yc - rows[-1]["yc"]) <= max(1.5, 0.35 * rows[-1]["h"]):
            rows[-1]["w"].append(w)
        else:
            rows.append({"yc": yc, "h": h, "w": [w]})
    out = []
    for r in rows:
        hs = sorted(max(w[3] - w[1], 1.0) for w in r["w"])
        hmed = hs[len(hs) // 2]
        cells = []
        for w in sorted(r["w"], key=lambda w: w[0]):
            small = (w[3] - w[1]) < 0.72 * hmed
            if small and re.fullmatch(r"\d{1,2}|[*＊※]", w[4]):
                # footnote mark: keep it on a text label (clean_label() turns it into a note), drop it elsewhere
                if cells and w[0] - cells[-1]["x1"] <= hmed and not NUMTOK.match(cells[-1]["t"]):
                    cells[-1]["t"] += w[4] if w[4].isdigit() else ""
                    cells[-1]["x1"] = max(cells[-1]["x1"], w[2])
                continue
            gap = w[0] - cells[-1]["x1"] if cells else 1e9
            if gap <= 0.15 * hmed:
                cells[-1]["t"] += w[4]  # touching pieces of one word or number ('2' '.' '53')
                cells[-1]["x1"] = max(cells[-1]["x1"], w[2])
            elif gap <= 0.55 * hmed and not (NUMTOK.match(w[4]) and NUMTOK.match(cells[-1]["t"])):
                c = cells[-1]
                sep = "" if re.search(f"[{CJK}]$", c["t"]) or re.match(f"[{CJK}]", w[4]) else " "
                c["t"] += sep + w[4]
                c["x1"] = max(c["x1"], w[2])
            else:
                cells.append({"x0": w[0], "x1": w[2], "t": w[4]})
        if cells:
            out.append({"y": r["yc"], "h": hmed, "cells": cells})
    return out


def num(v):
    v = v.replace(",", "").replace("，", "").replace("%", "").replace("％", "").replace("−", "-").replace("–", "-").strip()
    try:
        return float(v)
    except ValueError:
        return None


FOOTNOTE_END = re.compile(rf"(?<=[{CJK}）)a-z])\s*\d{{1,2}}(?:\s*[，,]\s*\d{{1,2}})*$")
UNIT_NUM = re.compile(r"^(\D.*?)([-−–]?\d[\d,，]*(?:\.\d+)?\s*[%％]?)$")
BLANKS = ("/", "-", "—", "–", "N/A", "NA", "不适用", "--", "——")


def clean_label(t):
    """Strip footnote markers ('温室气体排放总量1', '量2，3'). Returns (label, had_note)."""
    t = re.sub(r"\s+", " ", t or "").strip()
    m = FOOTNOTE_END.search(t)
    if m:
        return t[: m.start()].strip(), True
    return t, False


def _split_unit_num(cells):
    """'次/百万工时0.00' -> unit cell + number cell (proportional x)."""
    out = []
    for c in cells:
        m = UNIT_NUM.match(c["t"].strip())
        if m and UNITTOK.match(m.group(1).strip()):
            n = len(c["t"])
            cut = c["x0"] + (c["x1"] - c["x0"]) * len(m.group(1)) / max(n, 1)
            out.append({"x0": c["x0"], "x1": cut, "t": m.group(1).strip()})
            out.append({"x0": cut, "x1": c["x1"], "t": m.group(2).strip()})
        else:
            out.append(c)
    return out


def _is_year(c):
    return YEARTOK.match(c["t"].replace(" ", ""))


def _header_groups(cells):
    """Year cells of a header row, split into side-by-side tables when years repeat."""
    ys = []
    for c in cells:
        m = _is_year(c)
        if m:
            ys.append(((c["x0"] + c["x1"]) / 2, c["x0"], c["x1"], m.group(1)))
    ys.sort()
    groups, cur = [], []
    for y in ys:
        if any(y[3] == z[3] for z in cur):
            groups.append(cur)
            cur = []
        cur.append(y)
    if cur:
        groups.append(cur)
    return [g for g in groups if len(g) >= 2]


def _vertical_tables(pno, rows):
    """Tables with years down the side: rows '2023 | 354', label in a header cell above the numbers."""
    out, used = [], set()
    for i, r in enumerate(rows):
        if i in used:
            continue
        yc = [c for c in r["cells"] if _is_year(c)]
        if len(yc) != 1:
            continue
        x_year = yc[0]["x0"]
        block = [i] + [j for j in range(i + 1, min(i + 12, len(rows)))
                       if any(_is_year(c) and abs(c["x0"] - x_year) < 6 for c in rows[j]["cells"])]
        if len(block) < 2:
            continue
        recs = []
        for j in block:
            yr = next(c for c in rows[j]["cells"] if _is_year(c) and abs(c["x0"] - x_year) < 6)
            y = _is_year(yr).group(1)
            for c in rows[j]["cells"]:
                t = c["t"].replace(" ", "")
                if c is yr or not NUMTOK.match(t) or c["x0"] < yr["x1"] or c["x0"] - yr["x1"] > 260:
                    continue
                xc = (c["x0"] + c["x1"]) / 2
                head = None
                for k in range(i - 1, max(-1, i - 7), -1):
                    head = next((h for h in rows[k]["cells"] if h["x0"] - 15 <= xc <= h["x1"] + 15
                                 and not NUMTOK.match(h["t"].replace(" ", "")) and not _is_year(h)), None)
                    if head:
                        break
                if head:
                    recs.append((head["t"], y, t))
        if len({x[1] for x in recs}) >= 2:
            used.update(block)
            labels = {}
            for lab, y, v in recs:
                labels.setdefault(lab, len(labels))
                lab2, note = clean_label(lab)
                n = num(v)
                if n is not None:
                    pct = v.endswith(("%", "％"))
                    out.append({"page": pno, "table": f"{pno}.v{i}", "row": labels[lab], "title": "", "group": "", "label": lab2[:90],
                                "unit": "%" if pct else "", "year": y, "value": v, "num": n, "pct": pct, "note": note})
    return out


def tables_from_page(pno, words):
    rows = rows_of(words)
    for r in rows:
        r["cells"] = _split_unit_num(r["cells"])
    out, t_no, i = [], 0, 0
    while i < len(rows):
        r = rows[i]
        groups = _header_groups(r["cells"])
        if not groups:
            i += 1
            continue
        unit_xs = [(c["x0"] + c["x1"]) / 2 for c in r["cells"] if re.fullmatch(r"单位|Unit|Units", c["t"].strip(), re.I)]
        title = ""
        if i > 0 and len(rows[i - 1]["cells"]) <= 2 and r["y"] - rows[i - 1]["y"] < 6 * r["h"]:
            title = clean_label(rows[i - 1]["cells"][0]["t"])[0][:60]
        segs = []
        for g_i, g in enumerate(groups):
            spacing = min(b[0] - a[0] for a, b in zip(g, g[1:]))
            tol = max(12.0, 0.6 * spacing)
            lo = -1e9 if g_i == 0 else groups[g_i - 1][-1][2] + 4
            # a header label cell ('指标', 'Indicator') left of the years marks where this table starts
            lefts = [c for c in r["cells"] if c["x1"] <= g[0][1] and c["x0"] > lo and not _is_year(c)
                     and not NUMTOK.match(c["t"].replace(" ", ""))]
            heads = [c for c in lefts if re.search(r"指标|项目|类别|单位|Indicator|KPI|Item|Metric|Unit", c["t"], re.I)]
            if heads:
                hx = min(c["x0"] for c in heads)
                before = [c["x1"] for c in r["cells"] if c["x1"] < hx - 2 and c["x0"] > lo]
                if before:
                    lo = max(before) + 4  # another table's cells share this row
            segs.append({"cols": g, "tol": tol, "lo": lo, "hi": g[-1][2] + tol * 1.5, "left": g[0][1] - tol * 0.5,
                         "unit_x": next((u for u in unit_xs if lo < u < g[0][1]), None)})
        for g_i in range(len(segs) - 1):
            segs[g_i]["hi"] = min(segs[g_i]["hi"], segs[g_i + 1]["lo"])
        lo_all, hi_all = segs[0]["lo"], segs[-1]["hi"]
        state = [{"pending": None, "group": "", "recs": [], "last": None} for _ in segs]
        j, last_y = i + 1, r["y"]
        while j < len(rows):
            row = rows[j]
            if row["y"] - last_y > 8 * max(row["h"], r["h"]):
                break
            if any(lo_all <= y_[0] <= hi_all for g in _header_groups(row["cells"]) for y_ in g):
                break  # a new header in this table's columns
            any_vals = False
            for s_i, sg in enumerate(segs):
                st = state[s_i]
                cells = [c for c in row["cells"] if sg["lo"] <= (c["x0"] + c["x1"]) / 2 < sg["hi"]]
                if not cells:
                    continue
                vals, label, unit = {}, [], ""
                for c in cells:
                    xc = (c["x0"] + c["x1"]) / 2
                    t = c["t"].strip()
                    if NUMTOK.match(t.replace(" ", "")) and xc >= sg["left"]:
                        best = min(sg["cols"], key=lambda k: abs(k[0] - xc))
                        d = abs(best[0] - xc)
                        if d <= sg["tol"] and (best[3] not in vals or d < vals[best[3]][1]):
                            vals[best[3]] = (t.replace(" ", ""), d)
                    elif t in BLANKS:
                        any_vals = True
                        vals.setdefault("_blank", ("", 0))
                    elif c["x0"] < sg["left"]:
                        if (sg["unit_x"] is not None and abs(xc - sg["unit_x"]) < 30) or UNITTOK.match(t):
                            unit = t
                        else:
                            label.append(t)
                label = " ".join(label).strip()
                vals.pop("_blank", None) if len(vals) > 1 else None
                if not vals:
                    if not label:
                        continue
                    lr = st["last"]
                    if lr is not None and lr.get("wrapped") and row["y"] - lr["y"] < 1.6 * row["h"]:
                        lr["label"] = (lr["label"] + label).strip()
                        lr["wrapped"] = False
                        continue
                    if st["pending"] and row["y"] - st["pending"][1] >= 1.6 * row["h"]:
                        st["group"] = st["pending"][0]
                    st["pending"] = (label, row["y"]) if len(label) < 60 else None
                    continue
                any_vals = True
                wrapped = False
                if st["pending"]:
                    p_lab, p_y = st["pending"]
                    if row["y"] - p_y < 1.6 * row["h"]:
                        label, wrapped = (p_lab + label).strip(), not label
                    else:
                        st["group"] = p_lab
                    st["pending"] = None
                m = re.search(r"[（(]([^（）()]{1,16})[）)]\s*$", label)
                if not unit and m and UNITTOK.match(m.group(1)):
                    unit = m.group(1)
                rec = {"label": label, "unit": unit, "vals": {y: v for y, (v, _) in vals.items() if y != "_blank"},
                       "y": row["y"], "group": st["group"], "wrapped": wrapped}
                st["recs"].append(rec)
                st["last"] = rec
            if any_vals:
                last_y = row["y"]
            j += 1
        for s_i, sg in enumerate(segs):
            t_no += 1
            for k, rr in enumerate(state[s_i]["recs"]):
                lab, note = clean_label(rr["label"])
                grp, gnote = clean_label(rr["group"])
                if not lab:
                    continue
                for y, v in rr["vals"].items():
                    n = num(v)
                    if n is None:
                        continue
                    pct = v.endswith(("%", "％")) or rr["unit"] in ("%", "％")
                    out.append({"page": pno, "table": f"{pno}.{t_no}", "row": k, "title": title, "group": grp[:60], "label": lab[:90],
                                "unit": rr["unit"], "year": y, "value": v, "num": n, "pct": pct, "note": note or gnote})
        i += 1
    if not out:
        out = _vertical_tables(pno, rows)
    return out


def kpis_of(doc):
    out = []
    for pno, p in enumerate(doc["pages"], 1):
        if p.get("words"):
            out.extend(tables_from_page(pno, p["words"]))
    return out


# ======================================================================= number checks
SCALE = [(re.compile(r"^(百万|million|M(?=t|Wh)|Mt)", re.I), 1e6), (re.compile(r"^亿"), 1e8), (re.compile(r"^万"), 1e4),
         (re.compile(r"^(千(?!瓦)|kt\b|thousand)", re.I), 1e3)]


def unit_key(u):
    """(base unit, scale) so 万吨 and 吨 compare."""
    u = re.sub(r"[\s（）()]", "", u or "")
    f = 1.0
    for rx, s in SCALE:
        if rx.match(u):
            f, u = s, rx.sub("", u, count=1)
            break
    base = u.lower()
    base = re.sub(r"二氧化碳当量|co2e|co₂e|co2|co₂", "co2e", base)
    base = {"t": "吨", "tonnes": "吨", "tonne": "吨", "tons": "吨", "tco2e": "吨co2e"}.get(base, base)
    base = base.replace("tco2e", "吨co2e")
    if base == "吨co2e":
        base = "吨co2e"
    return base, f


def same_base(a, b):
    ba, bb = unit_key(a)[0], unit_key(b)[0]
    return ba == bb or not ba or not bb or {ba, bb} <= {"吨", "吨co2e"}


def scaled(k):
    return k["num"] * unit_key(k["unit"])[1]


BREAK = re.compile(r"^按.{1,8}(分|划分)|^by\s+\w+|(性别|年龄|地区|地域|学历|职级|类别)(结构|分布|构成)$", re.I)
EXCL_ABS = re.compile(r"强度|intensity|单位(产值|产品|营收|收入|面积)|每|占比|比例|比率|率|%|percentage|减排量|减少|降低|下降|reduction|目标|target|增长|同比|变化|抵消|避免|avoided|offset|碳汇|核查|覆盖", re.I)
MET = {
    "s1": re.compile(r"范围\s*[一1](?![\d.、,，和及与+&]\s*(范围)?\s*[二2三3])|scope\s*1(?!\s*[\d.,+&]|\s*and)|直接(温室气体)?排放", re.I),
    "s2": re.compile(r"范围\s*[二2](?![\d.、,，和及与+&]\s*(范围)?\s*[三3])|scope\s*2(?!\s*[\d.,+&]|\s*and)|(能源|外购)?间接(温室气体)?排放(?<!其他间接排放)", re.I),
    "s3": re.compile(r"范围\s*[三3]|scope\s*3|其他间接", re.I),
    "tot": re.compile(r"范围\s*[一1]\s*[、,，和及与+&]\s*(范围)?\s*[二2](?!\s*[、,，和及与+&]\s*(范围)?\s*[三3])|scope\s*1\s*(\+|and|&)\s*2(?!\s*(\+|and|&)\s*3)|"
                      r"温室气体(排放)?总量|(碳|温室气体)排放总量|总(温室气体|碳)?排放量|total\s+(ghg|greenhouse gas|carbon)?\s*emissions", re.I),
    "emp": re.compile(r"^(员工(总数|总人数|人数|总计|数量)|在职员工(总数|总人数|人数)?|员工总数|总员工人数|total\s+(number\s+of\s+)?employees|total\s+workforce|employees?\s*total)", re.I),
    "male": re.compile(r"^(其中[：:，,]?\s*)?(男性?|男性员工|男员工|male|men)(员工)?(人数|数量|占比|比例)?$", re.I),
    "female": re.compile(r"^(其中[：:，,]?\s*)?(女性?|女性员工|女员工|female|women)(员工)?(人数|数量|占比|比例)?$", re.I),
    "energy": re.compile(r"综合能源?消耗(总)?量|能源消耗总量|总能耗|能源使用总量|total energy (consumption|use)", re.I),
    "water": re.compile(r"(总)?(用水|耗水|取水|新鲜水(消耗|使用)?)总?量|total water (consumption|withdrawal|use)", re.I),
    "revenue": re.compile(r"^营业(总)?收入|^revenue|^total revenue", re.I),
    "ghg_int": re.compile(r"(温室气体|碳)排放强度|emissions? intensity|ghg intensity", re.I),
}


def metric(k):
    lab = k["label"]
    if MET["ghg_int"].search(lab):
        return "ghg_int"
    for key in ("emp", "male", "female", "revenue"):
        if MET[key].search(lab):
            return key
    if EXCL_ABS.search(lab) or k["pct"]:
        return ""
    if MET["tot"].search(lab):
        return "tot"
    for key in ("s3", "s1", "s2", "energy", "water"):
        if MET[key].search(lab):
            return key
    return ""


def fmtn(x):
    if abs(x - round(x)) < 1e-9:
        return f"{int(round(x)):,}"
    return f"{x:,.2f}"


def number_checks(kpis, pages, L):
    """Arithmetic checks on table values. Returns (issues, n_checks_passed)."""
    issues, passed = [], 0
    for k in kpis:
        k["metric"] = metric(k)
    # a plain '合计 / Total' row in a table that has Scope 1 and Scope 2 rows is the Scope total
    tab_metrics = defaultdict(set)
    for k in kpis:
        tab_metrics[k["table"]].add(k["metric"])
    for k in kpis:
        if not k["metric"] and {"s1", "s2"} <= tab_metrics[k["table"]] and re.match(r"^(合计|总计|小计|总量|total)?", k["label"], re.I):
            k["metric"] = "tot"

    def add(sev, title, detail, pages_, rule, why=None, fix=None, ks=()):
        note = L["footnote"] if any(k.get("note") for k in ks) else ""
        issues.append({"sev": sev, "type": "Consistency", "rule": rule, "title": title, "pages": sorted(set(pages_)),
                       "found": "", "evidence": detail, "note": note, "why": why or L["c_why"], "fix": fix or L["c_fix"]})

    by_year = defaultdict(lambda: defaultdict(list))
    for k in kpis:
        if k["metric"]:
            by_year[k["year"]][k["metric"]].append(k)

    def uniq(lst):
        seen, out = set(), []
        for k in lst:
            key = round(scaled(k), 3)
            if key not in seen:
                seen.add(key)
                out.append(k)
        return out

    # 1. Scope 1 + Scope 2 = total: inside each table (and sub-section) first, then report-wide unique values
    def tag(k):
        lab = k["label"]
        return "loc" if re.search(r"位置|地点|location", lab, re.I) else "mkt" if re.search(r"市场|market", lab, re.I) else ""

    def scope_check(s1, s2, s3, tot, y):
        """None = not checkable, else number of totals that add up; failures are reported."""
        if len(s1) != 1 or not s2 or not tot:
            return None
        a = s1[0]
        res = 0
        for t in tot:
            if not (same_base(a["unit"], t["unit"]) and all(same_base(a["unit"], b["unit"]) for b in s2)):
                continue
            cand = [b for b in s2 if not tag(t) or not tag(b) or tag(b) == tag(t)] or s2
            tv = scaled(t)
            tolv = max(abs(tv) * 0.011, 1.0)
            sums = [scaled(a) + scaled(b) for b in cand]
            if len(s3) == 1:
                sums += [x + scaled(s3[0]) for x in sums]
            if any(abs(x - tv) <= tolv for x in sums):
                res += 1
                continue
            if len(tot) > 1 and not tag(t):
                continue  # several totals, this one may be a different boundary
            b = cand[0]
            f = unit_key(t["unit"])[1] or 1
            add("Medium", L["c_scope"].format(y=y),
                L["c_scope_d"].format(a=a["value"], b=b["value"], s=fmtn((scaled(a) + scaled(b)) / f), t=t["value"], u=t["unit"]),
                [a["page"], b["page"], t["page"]], "NUM-01", ks=(a, b, t))
        return res

    done_years = set()
    tables = defaultdict(list)
    for k in kpis:
        tables[(k["table"], k["group"], k["year"])].append(k)
    for (tid, grp, y), ks in tables.items():
        m = defaultdict(list)
        for k in ks:
            m[k["metric"]].append(k)
        r_ = scope_check(uniq(m["s1"]), uniq(m["s2"]), uniq(m["s3"]), uniq(m["tot"]), y)
        if r_ is not None:
            done_years.add(y)
            passed += r_
    for y, m in by_year.items():
        if y not in done_years:
            r_ = scope_check(uniq(m["s1"]), uniq(m["s2"]), uniq(m["s3"]), uniq(m["tot"]), y)
            passed += r_ or 0

    # 2a. men + women = headcount (same table)
    by_table = defaultdict(list)
    for k in kpis:
        by_table[(k["table"], k["year"])].append(k)
    for (tid, y), ks in by_table.items():
        e = [k for k in ks if k["metric"] == "emp" and not k["pct"]]
        ml = [k for k in ks if k["metric"] == "male" and not k["pct"]]
        fl = [k for k in ks if k["metric"] == "female" and not k["pct"]]
        if len(e) != 1 or len(ml) != 1 or len(fl) != 1:
            continue
        e, mk, fk = e[0], ml[0], fl[0]
        if not (e["row"] < mk["row"] <= e["row"] + 5 and e["row"] < fk["row"] <= e["row"] + 5):
            continue
        s = mk["num"] + fk["num"]
        if abs(s - e["num"]) <= 1:
            passed += 1
            continue
        add("Medium", L["c_gender"].format(y=y),
            L["c_gender_d"].format(lm=mk["label"], m=mk["value"], lf=fk["label"], f=fk["value"], s=fmtn(s), lt=e["label"], t=e["value"]),
            [e["page"]], "NUM-02", ks=(e, mk, fk))

    # 2b. a percentage breakdown ("按性别分", "by age") should add up to 100%
    for (tid, grp, y), ks in tables.items():
        if not BREAK.search(grp or ""):
            continue
        if not ks or not all(k["pct"] for k in ks) or len(ks) < 2 or len(ks) > 12:
            continue
        s = sum(k["num"] for k in ks)
        if abs(s - 100) <= 0.6:
            passed += 1
            continue
        if s < 90 or s > 110:
            continue  # not a breakdown of one whole (e.g. coverage rate per group)
        parts = " + ".join(f'{k["label"]} {k["value"].rstrip("%％")}' for k in ks)
        add("Low" if any(k.get("note") for k in ks) else "Medium", L["c_break"].format(g=grp, y=y), L["c_break_d"].format(parts=parts, s=f"{s:.2f}"),
            [ks[0]["page"]], "NUM-02", ks=ks)

    # 3. "of which" larger than its parent (same table, same unit)
    rows_by_table = defaultdict(dict)
    for k in kpis:
        rows_by_table[k["table"]].setdefault(k["row"], []).append(k)
    for tid, rows in rows_by_table.items():
        parent = None
        for rn in sorted(rows):
            ks = rows[rn]
            lab = ks[0]["label"]
            if re.match(r"^(其中|含|包括|of which|including)", lab, re.I):
                if not parent:
                    continue
                pv = {k["year"]: k for k in parent}
                for c in ks:
                    p = pv.get(c["year"])
                    if not p or c["pct"] != p["pct"] or not same_base(c["unit"], p["unit"]) or c["pct"]:
                        continue
                    if scaled(c) > scaled(p) * 1.001 + 1e-9:
                        add("Medium", L["c_child"].format(y=c["year"]),
                            L["c_child_d"].format(c=c["label"], cv=c["value"], p=p["label"], pv=p["value"], u=p["unit"] or c["unit"]),
                            [c["page"]], "NUM-03")
                    else:
                        passed += 1
            else:
                parent = ks

    # 4. percentages over 100
    for k in kpis:
        if k["pct"] and k["num"] > 100.05 and not re.search(r"增长|增幅|增速|同比|环比|变化|增减|完成率|达成率|超额|倍|growth|change|increase|vs", k["label"], re.I):
            add("Low", L["c_pct"].format(y=k["year"]), L["c_pct_d"].format(l=k["label"], v=k["value"].rstrip("%％")), [k["page"]], "NUM-04")

    # 5. same indicator, two values (different tables)
    seen = defaultdict(list)
    for k in kpis:
        lab = re.sub(r"[\s\W_]+", "", k["label"]).lower()
        ctx = re.sub(r"[\s\W\d_]+", "", (k["group"] or "")).lower()
        generic = BREAK.search(k["group"] or "") or re.search(r"(占比|比例|比率|率|share|ratio|rate)$", lab)
        if (k["metric"] or len(lab) >= 10) and not generic and not re.match(r"^(其中|男|女|合计|总计|小计|total)", lab):
            seen[(lab, ctx, k["year"], unit_key(k["unit"])[0], k["pct"])].append(k)
    reported = set()
    for (lab, ctx, y, u, pct), ks in seen.items():
        tabs = {}
        for k in ks:
            tabs.setdefault(k["table"], k)
        if len(tabs) < 2:
            continue
        vals = list(tabs.values())
        a = vals[0]
        for b in vals[1:]:
            va, vb = scaled(a), scaled(b)
            if abs(va - vb) > max(abs(va), abs(vb)) * 0.01 and (lab, y) not in reported:
                reported.add((lab, y))
                add("Medium", L["c_dup"].format(y=y),
                    L["c_dup_d"].format(l=a["label"], a=a["value"], p1=a["page"], b=b["value"], p2=b["page"], u=a["unit"] or b["unit"] or "-"),
                    [a["page"], b["page"]], "NUM-05", ks=(a, b))
            else:
                passed += 1

    # 6. intensity = total / revenue (to a power of ten)
    for y, m in by_year.items():
        rev, ints, tot = uniq(m["revenue"]), uniq(m["ghg_int"]), uniq(m["tot"])
        if not tot:
            s1, s2 = uniq(m["s1"]), uniq(m["s2"])
            if len(s1) == 1 and len(s2) == 1:
                tot = [{"num": s1[0]["num"] * unit_key(s1[0]["unit"])[1] + s2[0]["num"] * unit_key(s2[0]["unit"])[1],
                        "unit": "", "label": "范围一+范围二", "value": "", "page": s1[0]["page"]}]
                tot[0]["value"] = fmtn(tot[0]["num"])
        if len(rev) != 1 or len(tot) != 1 or not ints:
            continue
        r, t = rev[0], tot[0]
        x = (t["num"] * unit_key(t["unit"])[1]) / (r["num"] or 1)
        for i in ints:
            if not re.search(r"营收|营业收入|收入|万元|百万元|亿元|revenue|RMB|CNY|元", i["label"] + i["unit"], re.I) or i["num"] <= 0 or x <= 0:
                continue
            lg = math.log10(x / i["num"])
            if abs(lg - round(lg)) < 0.03:
                passed += 1
            else:
                add("Low", L["c_int"].format(y=y),
                    L["c_int_d"].format(lt=t["label"], t=t["value"], lr=r["label"], r=r["value"], x=f"{x:.4g}", li=i["label"], i=i["value"]),
                    [t["page"], r["page"], i["page"]], "NUM-06")

    # 7. large unexplained jumps in absolute environmental totals
    explained = any(re.search(r"(统计|核算|报告|数据)(口径|边界|范围)(调整|变化|变更)|口径(调整|变化)|新增.{0,10}纳入|纳入.{0,10}统计范围|并购|收购|重述|追溯调整|boundary (change|expan)|restat|acquisition", p, re.I) for p in pages)
    rowsk = defaultdict(dict)
    for k in kpis:
        if k["metric"] in ("s1", "s2", "tot", "energy", "water"):
            rowsk[(k["table"], k["row"])][k["year"]] = k
    for (tid, rn), yv in rowsk.items():
        ys = sorted(yv)
        for y0, y1 in zip(ys, ys[1:]):
            a, b = yv[y0], yv[y1]
            if int(y1) - int(y0) != 1 or a["num"] <= 0:
                continue
            ch = (b["num"] - a["num"]) / a["num"] * 100
            if ch > 100 or ch < -50:
                add("Info", L["c_jump"].format(l=a["label"], y0=y0, y1=y1),
                    L["c_jump_d"].format(a=a["value"], b=b["value"], u=a["unit"], p=ch,
                                         note=L["c_jump_note_yes"] if explained else L["c_jump_note_no"]),
                    [a["page"]], "NUM-07", why=L["c_jump_why"], fix=L["c_jump_fix"])
    return merge_years(issues), passed


def merge_years(issues):
    """One issue per problem: the same rule + same pages + same title (year aside) are merged."""
    out, idx = [], {}
    for i in issues:
        m = re.search(r"[（(](20\d\d)(?:→20\d\d)?[）)]\s*$", i["title"])
        key = (i["rule"], re.sub(r"[（(]20\d\d(?:→20\d\d)?[）)]\s*$", "", i["title"]), tuple(i["pages"]))
        if not m or key not in idx:
            idx[key] = len(out)
            out.append(dict(i, years=[m.group(1)] if m else []))
            continue
        o = out[idx[key]]
        o["years"].append(m.group(1))
        o["evidence"] += " | " + m.group(1) + ": " + i["evidence"]
    for o in out:
        ys = sorted(set(o.pop("years")))
        if len(ys) > 1:
            first = re.search(r"[（(](20\d\d)", o["title"]).group(1)
            o["evidence"] = first + ": " + o["evidence"]
            o["title"] = re.sub(r"([（(])20\d\d(?:→20\d\d)?([）)])\s*$", lambda mm: mm.group(1) + ", ".join(ys) + mm.group(2), o["title"])
    return out


# ======================================================================= gaps
KEY_GAPS = {"E-CL-07": "Medium", "E-CL-08": "Medium", "G-RP-03": "Medium", "G-GV-04": "Medium",
            "E-CL-11": "Low", "G-RP-02": "Low", "E-CL-09": "Low"}


def gap_issues(cov, L, zh):
    out = []
    for r in cov:
        key = r["ID"] in KEY_GAPS
        partly_key = key and r["Status"] == "Partly" and r["Quant"] == "Y"
        if not (r["Status"] == "Missing" and (key or r["Guideline"] == "Y")) and not partly_key:
            continue
        sev = KEY_GAPS.get(r["ID"], "Low")
        if partly_key:
            sev = "Low" if sev == "Medium" else "Info"
        name = r["Indicator"] if zh else (r["Indicator EN"] or r["Indicator"])
        out.append({"sev": sev, "type": "Gap", "rule": r["ID"], "title": L["gap_title"].format(i=name),
                    "pages": [r["First page"]] if r["First page"] else [], "found": "",
                    "evidence": L["gap_partly"] if r["Status"] == "Partly" else L["gap_note"],
                    "note": r["References"], "why": L["gap_why"], "fix": L["gap_fix"]})
    return out


# ======================================================================= year on year
def target_units(us):
    rx = re.compile(r"(目标|承诺|力争|target|commit|pledge).{0,40}20\d\d|20\d\d.{0,40}(目标|承诺|target)", re.I)
    return [(p, s) for p, s, b in us if not b and rx.search(s)]


def yoy(cur, prev, L, zh):
    out = []
    pc = {r["ID"]: r for r in prev["coverage"]}
    for r in cur["coverage"]:
        p = pc.get(r["ID"])
        name = r["Indicator"] if zh else (r["Indicator EN"] or r["Indicator"])
        if p and p["Status"] != "Missing" and r["Status"] == "Missing":
            out.append({"sev": "Medium" if r["ID"] in KEY_GAPS or r["Guideline"] == "Y" else "Low", "type": "Change", "rule": "YOY-01",
                        "title": L["y_dropped"].format(i=name), "pages": [], "found": "",
                        "evidence": f'{p["Status"]} (p.{p["Pages"]})', "note": "", "why": L["y_why"], "fix": L["y_fix"]})
        elif p and p["Status"] == "Disclosed" and r["Status"] == "Partly" and r["Quant"] == "Y":
            out.append({"sev": "Low", "type": "Change", "rule": "YOY-02", "title": L["y_numdrop"].format(i=name),
                        "pages": [r["First page"]] if r["First page"] else [], "found": "",
                        "evidence": f'{p["Number found"]} → —', "note": "", "why": L["y_why"], "fix": L["y_fix"]})

    def keyed(rows):
        groups = defaultdict(list)
        for k in rows:
            groups[(re.sub(r"\W", "", k["label"]).lower(), k["year"], unit_key(k["unit"])[0], k["pct"])].append(k)
        return {key: v[0] for key, v in groups.items() if len({x["num"] for x in v}) == 1 and len(key[0]) >= 2}

    pk, ck = keyed(prev["kpis"]), keyed(cur["kpis"])
    restated = any(re.search(r"重述|追溯调整|restate", s, re.I) for _, s, _ in cur["units"])
    for key, c in ck.items():
        p = pk.get(key)
        if not p:
            continue
        a, b = scaled(p), scaled(c)
        if abs(a - b) > max(abs(a), 1e-9) * 0.005:
            out.append({"sev": "Low" if restated else "Medium", "type": "Change", "rule": "YOY-03",
                        "title": L["y_restated"].format(l=c["label"], y=c["year"]), "pages": [c["page"]], "found": "",
                        "evidence": L["y_restated_d"].format(a=f'{p["value"]} {p["unit"]} (p.{p["page"]})', b=f'{c["value"]} {c["unit"]} (p.{c["page"]})',
                                                             n=L["y_note_yes"] if restated else L["y_note_no"]),
                        "note": "", "why": L["y_why"], "fix": L["y_fix"]})
    cur_t = [s for _, s in target_units(cur["units"])]
    for p, s in target_units(prev["units"]):
        best = max((difflib.SequenceMatcher(None, s, c).ratio() for c in cur_t), default=0)
        if best < 0.55:
            out.append({"sev": "Low", "type": "Change", "rule": "YOY-04", "title": L["y_target"], "pages": [], "found": "",
                        "evidence": L["y_target_d"].format(p=p, s=short(s, 200), m=round(best * 100)), "note": "",
                        "why": L["y_why"], "fix": L["y_fix"]})
    return out


# ======================================================================= the read
def the_read(res, L, prev=None):
    cov = {r["ID"]: r for r in res["coverage"]}
    st = lambda i: cov.get(i, {}).get("Status", "Missing")  # noqa: E731
    g, a = res["score_guide"], res["score_all"]
    iss = res["issues"]
    cons = [i for i in iss if i["type"] == "Consistency" and i["sev"] != "Info"]
    hc = [i for i in iss if i["type"] == "Claim" and i["sev"] == "High"]
    mc = [i for i in iss if i["type"] == "Claim" and i["sev"] == "Medium"]
    kg = [i for i in iss if i["type"] == "Gap" and i["rule"] in KEY_GAPS and i["sev"] in ("Medium", "Low") and i["rule"] != "E-CL-09"]
    strengths, weak, limits = [], [], []
    if g >= 75:
        strengths.append(L["s_cov"].format(g=g))
    if st("E-CL-07") == st("E-CL-08") == "Disclosed":
        strengths.append(L["s_scope123"] if st("E-CL-09") == "Disclosed" else L["s_scope12"])
    if st("G-RP-03") != "Missing":
        strengths.append(L["s_assure"].format(p=cov["G-RP-03"]["First page"]))
    tgt = dated_targets(res["units"], report_year(res))
    if tgt:
        strengths.append(L["s_target"].format(p=tgt[0][0], s=short(tgt[0][1], 90)))
    yrs = {k["year"] for k in res["kpis"]}
    if len(yrs) >= 3 and len(res["kpis"]) >= 30:
        strengths.append(L["s_years"].format(n=len(res["kpis"]), y=len(yrs)))
    if res["checks_passed"] >= 3 and not cons:
        strengths.append(L["s_sums"].format(n=res["checks_passed"]))
    vague = sum(res["density"].values())
    if res["density"] and vague < 1.5:
        strengths.append(L["s_plain"].format(d=round(vague, 1)))
    if not hc:
        strengths.append(L["s_noclaim"])
    if any(re.search(r"双重重要性|double materiality", s, re.I) for _, s, _ in res["units"]):
        strengths.append(L["s_dmat"])

    if cons:
        weak.append(L["w_numbers"].format(n=len(cons), e=cons[0]["evidence"]))
    if hc or mc:
        e = (hc or mc)[0]
        weak.append(L["w_claims"].format(n=len(hc) + len(mc), e=short(e["found"], 40), p=e["pages"][0] if e["pages"] else "?"))
    if kg:
        names = [L["key_gaps"].get(i["rule"], i["rule"]) for i in kg]
        weak.append(L["w_gaps"].format(e=", ".join(names) if L is TXT["en"] else "、".join(names)))
    if g < 60:
        weak.append(L["w_cov"].format(g=g))
    if vague >= 3:
        weak.append(L["w_vague"].format(d=round(vague, 1)))
    pb = next((i for i in iss if i["rule"] == "GW-15"), None)
    if pb:
        weak.append(L["w_boundary"].format(p=pb["pages"][0]))
    if prev is not None:
        dropped = [i for i in iss if i["rule"] in ("YOY-01", "YOY-02")]
        rest = [i for i in iss if i["rule"] == "YOY-03" and i["sev"] == "Medium"]
        if dropped:
            weak.append(L["w_dropped"].format(n=len(dropped)))
        if rest:
            weak.append(L["w_restated"].format(n=len(rest)))
    if not res["kpis"]:
        limits.append(L["l_tables"])
    elif len(res["kpis"]) < 30:
        limits.append(L["l_few"].format(n=len(res["kpis"])))
    if res["scanned"]:
        limits.append(L["l_scan"].format(n=len(res["scanned"])))
    limits.append(L["l_keyword"])
    headline = L["headline"].format(g=g, a=a, n=len(res["coverage"]),
                                    issues=L["issues_line"].format(c=len(cons), h=len(hc), m=len(mc), k=len(kg)))
    return {"headline": headline, "strengths": strengths[:7], "weaknesses": weak[:7], "limits": limits}


# ======================================================================= content rating
RATE_TXT = {
    "en": {
        "dims": {"coverage": "Coverage", "data": "Data depth", "accuracy": "Numbers add up", "claims": "Claims are supported",
                 "targets": "Targets", "verify": "Verifiable"},
        "r_cov": "{g}% of exchange-guideline indicators addressed (E {e}% · S {s}% · G {gv}%).",
        "r_data": "{d} of {n} quantitative indicators have a figure; {k} table values over {y} year(s).{drop}",
        "r_drop": " {n} item(s) dropped since last year.",
        "r_acc": "{p} arithmetic check(s) passed, {h} problem(s) at High/Medium, {l} at Low.{rest}",
        "r_rest": " {n} prior-year value(s) changed without a note.",
        "r_acc_na": "Not rated: too few table values to check.",
        "r_claims": "{h} High, {m} Medium and {l} Low claim flag(s); {v} vague commitments per 10,000 characters.",
        "r_tgt": "{n} dated, quantified near-term target(s); {i} target flag(s) (no baseline, no date, long-dated only).",
        "r_ver": "Assurance: {a}; GHG method/base year: {m}; boundary: {b}; materiality: {t}.",
        "st": {"Disclosed": "yes", "Partly": "partly", "Missing": "no"},
        "grade": {"A": "Strong disclosure", "B": "Good, with gaps", "C": "Mixed", "D": "Weak", "E": "Very weak"},
        "note": "Rates how complete, consistent and verifiable the report is - not the company's ESG performance.",
    },
    "zh": {
        "dims": {"coverage": "覆盖面", "data": "数据深度", "accuracy": "数字一致", "claims": "表述有依据",
                 "targets": "目标质量", "verify": "可验证性"},
        "r_cov": "交易所指引相关指标覆盖 {g}%（环境 {e}% · 社会 {s}% · 治理 {gv}%）。",
        "r_data": "{n} 项定量指标中 {d} 项有数据；数据表共 {k} 个数值，覆盖 {y} 个年度。{drop}",
        "r_drop": "去年披露的 {n} 项今年未见。",
        "r_acc": "通过 {p} 项算术核对；高/中问题 {h} 项，低 {l} 项。{rest}",
        "r_rest": "{n} 个往年数值被改动且无说明。",
        "r_acc_na": "不评分：可核对的表格数据太少。",
        "r_claims": "表述标记：高 {h}、中 {m}、低 {l}；模糊承诺每万字 {v} 次。",
        "r_tgt": "带年份的量化近期目标 {n} 个；目标相关标记 {i} 项（无基准、无期限、只有远期目标）。",
        "r_ver": "第三方鉴证：{a}；核算方法/基准年：{m}；报告边界：{b}；重要性评估：{t}。",
        "st": {"Disclosed": "有", "Partly": "部分", "Missing": "无"},
        "grade": {"A": "披露扎实", "B": "较好，有缺口", "C": "参差", "D": "较弱", "E": "很弱"},
        "note": "评的是报告的完整性、一致性和可验证性，不是公司的 ESG 表现。",
    },
}
RATE_W = {"coverage": 20, "data": 20, "accuracy": 20, "claims": 15, "targets": 10, "verify": 15}
TARGET_RULES = ("GW-04", "GW-05", "GW-06", "GW-07")


def report_year(res):
    ys = [int(k["year"]) for k in res.get("kpis", []) if str(k.get("year", "")).isdigit()]
    return max(ys) if ys else 2025


def dated_targets(us, ry=2025):
    def near(s):
        return any(ry < int(y) <= ry + 10 for t in re.findall(r"(?:by|before|until)\s*(20[2-4]\d)|(?<!\d)(20[2-4]\d)\s*年(?!度)", s, re.I) for y in t if y)
    return [(p, s) for p, s in target_units(us)
            if near(s)
            and re.search(r"\d+(\.\d+)?\s*[%％]|碳中和|净零|net[- ]zero|carbon neutral", s, re.I)
            and not re.search(r"可持续发展目标|SDG|行业领先", s)]


def rating(res, lang, prev=None):
    """Transparent 0-100 rating of the report's content in six dimensions, plus an overall grade A-E."""
    R = RATE_TXT["zh" if lang == "zh" else "en"]
    cov, iss = res["coverage"], res["issues"]
    by = {r["ID"]: r for r in cov}
    clamp = lambda x: max(0, min(100, round(x)))  # noqa: E731
    dims = {}

    def pil(p):
        rows = [r for r in cov if r["Pillar"] == p and r["Guideline"] == "Y"]
        return score(rows) if rows else "-"
    dims["coverage"] = (res["score_guide"], R["r_cov"].format(g=res["score_guide"], e=pil("E"), s=pil("S"), gv=pil("G")))

    quant = [r for r in cov if r["Quant"] == "Y"]
    qd = sum(r["Status"] == "Disclosed" for r in quant)
    yrs = {k["year"] for k in res["kpis"]}
    dropped = [i for i in iss if i["rule"] in ("YOY-01", "YOY-02")] if prev is not None else []
    s = 70 * qd / max(len(quant), 1) + 15 * min(1, len(res["kpis"]) / 150) + (15 if len(yrs) >= 3 else 8 if len(yrs) == 2 else 0)
    s -= min(20, 4 * len(dropped))
    dims["data"] = (clamp(s), R["r_data"].format(d=qd, n=len(quant), k=len(res["kpis"]), y=len(yrs),
                                                 drop=R["r_drop"].format(n=len(dropped)) if dropped else ""))

    cons = [i for i in iss if i["type"] == "Consistency" and i["sev"] != "Info"]
    hm = sum(i["sev"] in ("High", "Medium") for i in cons)
    lo = sum(i["sev"] == "Low" for i in cons)
    rest = [i for i in iss if i["rule"] == "YOY-03" and i["sev"] == "Medium"] if prev is not None else []
    if res["checks_passed"] + len(cons) < 3:
        dims["accuracy"] = (None, R["r_acc_na"])
    else:
        dims["accuracy"] = (clamp(100 - 20 * hm - 7 * lo - 10 * len(rest)),
                            R["r_acc"].format(p=res["checks_passed"], h=hm, l=lo, rest=R["r_rest"].format(n=len(rest)) if rest else ""))

    cl = [i for i in iss if i["type"] == "Claim" and i["rule"] not in TARGET_RULES]
    ch, cm, cl_ = (sum(i["sev"] == x for i in cl) for x in ("High", "Medium", "Low"))
    vague = sum(res["density"].values())
    s = 100 - 15 * ch - 6 * cm - min(20, 2 * cl_) - min(20, 8 * max(0, vague - 1.5))
    dims["claims"] = (clamp(s), R["r_claims"].format(h=ch, m=cm, l=cl_, v=round(vague, 1)))

    tg = dated_targets(res["units"], report_year(res))
    ti = [i for i in iss if i["rule"] in TARGET_RULES and i["sev"] in ("High", "Medium", "Low")]
    s = 25 if not tg else (65 if len(tg) == 1 else 80) + (20 if not ti else -8 * len(ti))
    dims["targets"] = (clamp(s), R["r_tgt"].format(n=len(tg), i=len(ti)))

    pts = {"Disclosed": 1, "Partly": 0.5, "Missing": 0}
    st = lambda i: by.get(i, {}).get("Status", "Missing")  # noqa: E731
    s = 40 * pts[st("G-RP-03")] + 20 * pts[st("E-CL-11")] + 20 * pts[st("G-RP-02")] + 20 * pts[st("G-GV-04")]
    dims["verify"] = (clamp(s), R["r_ver"].format(a=R["st"][st("G-RP-03")], m=R["st"][st("E-CL-11")],
                                                   b=R["st"][st("G-RP-02")], t=R["st"][st("G-GV-04")]))

    used = [(k, v[0]) for k, v in dims.items() if v[0] is not None]
    overall = round(sum(RATE_W[k] * v for k, v in used) / max(sum(RATE_W[k] for k, _ in used), 1))
    grade = "A" if overall >= 85 else "B" if overall >= 70 else "C" if overall >= 55 else "D" if overall >= 40 else "E"
    return {"overall": overall, "grade": grade, "label": R["grade"][grade], "note": R["note"],
            "dims": [{"key": k, "name": R["dims"][k], "score": v[0], "weight": RATE_W[k], "why": v[1]} for k, v in dims.items()]}


# ======================================================================= main entry
def analyse(doc, cfg, lang="auto", prev_doc=None, _is_prev=False):
    """doc -> result dict. cfg = compile_config(...) output."""
    raw = [normalise(p.get("text") or "") for p in doc["pages"]]
    pages = strip_repeats(raw)
    rl = lang_of(pages)
    lang = rl if lang == "auto" else lang
    L, zh = tr(lang), lang == "zh"
    us = units(pages)
    cov = coverage(cfg["indicators"], pages)
    kpis = kpis_of(doc)
    upgrade_from_tables(cov, cfg["indicators"], kpis)
    res = {"file": doc.get("file", ""), "core": CORE_VERSION, "lang": lang, "report_lang": rl, "n_pages": len(pages),
           "chars": sum(len(p) for p in pages), "units": us, "coverage": cov, "kpis": kpis,
           "scanned": [i + 1 for i, p in enumerate(raw) if len(p.strip()) < 40],
           "score_all": score(cov), "score_guide": score(cov, guide_only=True)}
    if _is_prev:
        return res
    cl, dens = claims(cfg["rules"], cfg["terms"], us, pages, L)
    nc, passed = number_checks(kpis, pages, L)
    issues = nc + cl + gap_issues(cov, L, zh)
    prev = None
    if prev_doc:
        prev = analyse(prev_doc, cfg, lang, _is_prev=True)
        issues += yoy(res, prev, L, zh)
        res["prev_file"] = prev_doc.get("file", "")
    tord = {"Consistency": 0, "Claim": 1, "Change": 2, "Gap": 3}
    issues.sort(key=lambda i: (SEV_ORDER[i["sev"]], tord[i["type"]], i["pages"][0] if i["pages"] else 9999))
    for n, i in enumerate(issues, 1):
        i["no"] = n
    res.update(issues=issues, density=dens, checks_passed=passed)
    res["read"] = the_read(res, L, prev)
    res["rating"] = rating(res, lang, prev)
    res["counts"] = {s: sum(i["sev"] == s for i in issues) for s in SEV}
    return res


def public(res):
    """JSON-safe subset for the web page."""
    keep = ("file", "prev_file", "core", "lang", "report_lang", "n_pages", "score_all", "score_guide", "issues", "read", "counts",
            "checks_passed", "density", "scanned", "rating")
    out = {k: res[k] for k in keep if k in res}
    out["coverage"] = [{k: r[k] for k in ("ID", "Pillar", "Topic", "Indicator", "Indicator EN", "Guideline", "Status", "Pages", "Number found")}
                       for r in res["coverage"]]
    out["n_kpis"] = len(res["kpis"])
    return out


# ======================================================================= Excel (xlsxwriter)
XL = {
    "en": {"read": "Read", "issues": "Issues", "cov": "Coverage", "data": "Data tables", "title": "ESG Report Lens",
           "report": "Report", "prev": "Compared with", "pages": "Pages", "lang": "Report language", "sg": "Guideline coverage score",
           "sa": "All-indicator coverage score", "counts": "Issues (High / Medium / Low / Info)", "run": "Run", "ver": "Lens version",
           "good": "What is good", "bad": "What needs work", "limits": "Limits of this check", "vague": "Vague-language density (per 10,000 characters)",
           "h_issues": ["No", "Severity", "Type", "Rule", "Issue", "Pages", "Found", "Evidence / detail", "Note", "Why it matters", "What good looks like"],
           "h_data": ["Page", "Table", "Section", "Label", "Unit", "Year", "Value", "Check group"],
           "rating": "Content rating", "weight": "weight",
           "disclaimer": "Automated screening. Flags are prompts for a reviewer, not verdicts. Check every page reference before quoting."},
    "zh": {"read": "解读", "issues": "问题清单", "cov": "覆盖", "data": "数据表", "title": "ESG 报告透镜",
           "report": "报告", "prev": "对比报告", "pages": "页数", "lang": "报告语言", "sg": "交易所指引覆盖得分",
           "sa": "全部指标覆盖得分", "counts": "问题数（高 / 中 / 低 / 提示）", "run": "运行时间", "ver": "版本",
           "good": "做得好的", "bad": "需要改进的", "limits": "本检查的局限", "vague": "模糊用语密度（每万字）",
           "h_issues": ["序号", "严重程度", "类型", "规则", "问题", "页码", "匹配内容", "证据 / 详情", "备注", "为什么重要", "更好的做法"],
           "h_data": ["页码", "表", "栏目", "指标", "单位", "年份", "数值", "核对分组"],
           "rating": "内容评级", "weight": "权重",
           "disclaimer": "自动筛查结果。标记只是提示审阅人关注，并非结论。引用前请逐一核对页码。"},
}


def write_xlsx(res, path_or_buffer, when=""):
    import xlsxwriter
    lang = res["lang"] if res["lang"] in XL else "en"
    X, L = XL[lang], tr(lang)
    wb = xlsxwriter.Workbook(path_or_buffer, {"in_memory": True})
    f = wb.add_format
    H = f({"bold": True, "bg_color": "#1F4E78", "font_color": "white", "text_wrap": True, "valign": "top", "border": 1})
    C = f({"text_wrap": True, "valign": "top"})
    B = f({"bold": True, "valign": "top"})
    TITLE = f({"bold": True, "font_size": 14})
    SEVF = {"High": f({"bg_color": "#FFC7CE", "valign": "top"}), "Medium": f({"bg_color": "#FFEB9C", "valign": "top"}),
            "Low": f({"bg_color": "#DDEBF7", "valign": "top"}), "Info": f({"bg_color": "#EDEDED", "valign": "top"}),
            "Disclosed": f({"bg_color": "#C6EFCE"}), "Partly": f({"bg_color": "#FFEB9C"}), "Missing": f({"bg_color": "#FFC7CE"})}

    ws = wb.add_worksheet(X["read"])
    ws.set_column(0, 0, 34)
    ws.set_column(1, 1, 110)
    ws.write(0, 0, X["title"], TITLE)
    rd = res["read"]
    ws.write(1, 0, rd["headline"], C)
    info = [(X["report"], res["file"])]
    if res.get("prev_file"):
        info.append((X["prev"], res["prev_file"]))
    info += [(X["pages"], res["n_pages"]), (X["lang"], res["report_lang"]), (X["sg"], f'{res["score_guide"]} / 100'),
             (X["sa"], f'{res["score_all"]} / 100'), (X["counts"], " / ".join(str(res["counts"][s]) for s in SEV)),
             (X["run"], when), (X["ver"], res["core"])]
    r = 3
    for k, v in info:
        ws.write(r, 0, k, B)
        ws.write(r, 1, v, C)
        r += 1
    for head, items, mark in ((X["good"], rd["strengths"], "✓ "), (X["bad"], rd["weaknesses"], "✗ "), (X["limits"], rd["limits"], "• ")):
        r += 1
        ws.write(r, 0, head, B)
        for it in items or ["—"]:
            ws.write(r, 1, mark + it, C)
            r += 1
    rt = res.get("rating")
    if rt:
        r += 1
        ws.write(r, 0, X["rating"], B)
        ws.write(r, 1, f'{rt["grade"]} ({rt["overall"]}/100) - {rt["label"]}. {rt["note"]}', B)
        r += 1
        for d in rt["dims"]:
            ws.write(r, 0, f'  {d["name"]} ({X["weight"]} {d["weight"]}%)', C)
            ws.write(r, 1, f'{"-" if d["score"] is None else d["score"]} / 100 - {d["why"]}', C)
            r += 1
    r += 1
    ws.write(r, 0, X["vague"], B)
    for k, v in res["density"].items():
        ws.write(r, 1, f"{k}: {v}", C)
        r += 1
    r += 1
    ws.write(r, 0, X["disclaimer"], C)

    ws = wb.add_worksheet(X["issues"])
    ws.write_row(0, 0, X["h_issues"], H)
    for n, i in enumerate(res["issues"], 1):
        ws.write_row(n, 0, [i["no"]], C)
        ws.write(n, 1, L["sev"][i["sev"]], SEVF[i["sev"]])
        ws.write_row(n, 2, [L["type"][i["type"]], i["rule"], i["title"], ", ".join(map(str, i["pages"])), i["found"], i["evidence"],
                            i["note"], i["why"], i["fix"]], C)
    for c, w in enumerate([5, 9, 10, 9, 40, 10, 16, 70, 36, 40, 40]):
        ws.set_column(c, c, w)
    ws.freeze_panes(1, 0)
    ws.autofilter(0, 0, max(len(res["issues"]), 1), len(X["h_issues"]) - 1)

    ws = wb.add_worksheet(X["cov"])
    cols = ["ID", "Pillar", "Topic", "Indicator", "Indicator EN", "Guideline", "Quant", "Status", "Mentions", "Pages", "Number found", "Evidence", "References"]
    ws.write_row(0, 0, cols, H)
    for n, row in enumerate(res["coverage"], 1):
        for c, k in enumerate(cols):
            ws.write(n, c, row[k], SEVF.get(row[k], C) if k == "Status" else C)
    for c, w in enumerate([9, 5, 14, 26, 28, 8, 6, 10, 8, 16, 16, 70, 34]):
        ws.set_column(c, c, w)
    ws.freeze_panes(1, 0)
    ws.autofilter(0, 0, len(res["coverage"]), len(cols) - 1)

    if "kpis" in res:
        ws = wb.add_worksheet(X["data"])
        ws.write_row(0, 0, X["h_data"], H)
        for n, k in enumerate(res["kpis"], 1):
            ws.write_row(n, 0, [k["page"], k["table"], k["title"], k["label"], k["unit"], k["year"], k["value"], k.get("metric", "")], C)
        for c, w in enumerate([6, 7, 24, 46, 14, 6, 14, 10]):
            ws.set_column(c, c, w)
        ws.freeze_panes(1, 0)
        if res["kpis"]:
            ws.autofilter(0, 0, len(res["kpis"]), 7)
    wb.close()
    return path_or_buffer
