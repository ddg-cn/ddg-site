// Helpers shared by the report checkers.
import { cells } from './extract.js'
export { cells }

export const SEV = { E: 'error', W: 'warning', I: 'info' }

// Collects findings; `rules` maps rule id -> { sev, title_en, title_zh }.
export function collector(rules) {
  const out = []
  const add = (id, o = {}) => {
    const r = rules[id]
    if (!r) throw new Error('unknown rule ' + id)
    out.push({ id, sev: o.sev || r.sev, page: o.page ?? null, ref: o.ref || '', msg: o.msg || '', text: clip(o.text || '', 300), file: o.file || '' })
  }
  return { out, add }
}

export const clip = (s, n = 160) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s }

export const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿＀-￯]/
export const nonLatinShare = s => { const t = String(s).replace(/\s/g, ''); if (!t) return 0; let n = 0; for (const ch of t) if (CJK.test(ch)) n++; return n / t.length }

// Dates: dd/mm/yyyy (Clarity), mm/dd/yyyy (RBA, CDP), yyyy-mm-dd; returns Date (UTC) or null.
export function dmy(s) { const m = /(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(s || ''); if (!m) return null; return mk(+m[3], +m[2], +m[1]) }
export function mdy(s) { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || ''); if (!m) return null; return mk(+m[3], +m[1], +m[2]) }
export function ymd(s) { const m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || ''); if (!m) return null; return mk(+m[1], +m[2], +m[3]) }
function mk(y, mo, d) { if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; const t = new Date(Date.UTC(y, mo - 1, d)); return t.getUTCMonth() === mo - 1 ? t : null }
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 }
// "Nov 24 2025", "November 27, 2025", "24 Nov 2025"
export function textDates(s) {
  const out = []
  const re1 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi
  const re2 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/gi
  let m
  while ((m = re1.exec(s))) { const d = mk(+m[3], MON[m[1].toLowerCase()], +m[2]); if (d) out.push({ d, i: m.index, s: m[0] }) }
  while ((m = re2.exec(s))) { const d = mk(+m[3], MON[m[2].toLowerCase()], +m[1]); if (d) out.push({ d, i: m.index, s: m[0] }) }
  return out.sort((a, b) => a.i - b.i)
}
export const fmt = d => d ? d.toISOString().slice(0, 10) : ''
export const days = (a, b) => Math.round((b - a) / 86400000)

export const num = s => { if (s == null) return null; const t = String(s).replace(/[,\s]/g, '').replace(/%$/, ''); return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null }

// Words that suggest a gap; used to spot "Yes"/"Conformance" answers whose text says otherwise.
export const NEG = /\b(not (?:available|provided|established|implemented|in place|conducted|carried out|defined|documented|maintained|posted|displayed|communicated|signed|valid|effective|sufficient|adequate|complete|completed|updated|recorded|trained|done|performed|covered|included|set|kept|equipped|installed|labell?ed|identified|assessed|monitored|reviewed|approved|obtained|renewed|paid|followed|met|compliant)|lack(?:s|ing)?|missing|absence of|absent|failed to|fails? to|unable to|insufficient|inadequate|expired|did not (?:have|provide|establish|conduct|implement|cover|include|define|set|maintain|contain|keep|pay|sign|follow|meet)|does not (?:have|provide|cover|include|define|contain|meet)|has not (?:been )?(?:established|implemented|conducted|provided|defined|set)|have not (?:been )?(?:established|implemented|conducted|provided|defined|set)|no (?:evidence|record|records|policy|procedure|procedures|training|document|documents|documentation|target|targets|plan|system|committee|certificate|permit|license|licence|assessment|audit|program|programme|process|mechanism|report)\b(?! of (?:any )?(?:violation|issue|incident|case|accident|complaint)))/i
export function negativeHits(s) {
  const m = String(s || '').replace(/\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|lacks?)\b/gi, ' ').match(NEG)
  return m ? m[0] : null
}

export const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9㐀-鿿]+/g, ' ').trim()

// Placeholder / unfinished text
export const PLACEHOLDER = /\b(tbd|tbc|to be (?:confirmed|completed|added|updated)|lorem ipsum|xxx+|\[insert[^\]]*\]|\?\?\?|todo|fill in|placeholder)\b/i

export function lineText(lines) { return lines.map(l => l.text).join(' ').replace(/\s+/g, ' ').trim() }
