// Turns policy documents (.docx, .pdf, .txt/.md) into one shape for the checker:
// { name, kind, paras: [{ text, sec, table, i }], text }
// Pure JS: runs in the browser and in Node tests. `unzip` is fflate's unzipSync.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unent = s => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENT[e] ?? m
})

function runText(xml) {
  // text, tabs and breaks in document order; skip deleted (tracked) text
  let s = ''
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>|<w:delText[\s\S]*?<\/w:delText>/g
  let m
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) s += unent(m[1])
    else if (m[0].startsWith('<w:tab')) s += ' '
    else if (m[0].startsWith('<w:br') || m[0].startsWith('<w:cr')) s += '\n'
  }
  return s
}

// Split body XML into top-level <w:p> and <w:tbl> blocks (tables may nest).
function blocks(body) {
  const out = []
  const re = /<w:tbl>|<w:tbl\s[^>]*>|<\/w:tbl>|<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g
  let depth = 0, start = 0, m
  while ((m = re.exec(body))) {
    const tag = m[0]
    if (tag.startsWith('<w:tbl')) { if (depth === 0) start = m.index; depth++ }
    else if (tag === '</w:tbl>') { depth--; if (depth === 0) out.push({ type: 'tbl', xml: body.slice(start, m.index + tag.length) }) }
    else if (depth === 0) out.push({ type: 'p', xml: tag })
  }
  return out
}

function tableRows(xml) {
  const rows = []
  const inner = xml.replace(/^<w:tbl[^>]*>/, '').replace(/<\/w:tbl>$/, '')
  // flatten nested tables into their cells' text
  const reRow = /<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g
  let m
  while ((m = reRow.exec(inner))) {
    const cells = []
    const reCell = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g
    let c
    while ((c = reCell.exec(m[1]))) {
      const paras = (c[1].match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []).map(runText).filter(t => t.trim())
      cells.push(paras.join('\n').trim())
    }
    rows.push(cells)
  }
  return rows
}

// "3 定义", "3.1.2 xxx", "5.4.3试用期沟通" (a bare "8小时" is not a heading)
const SEC = /^\s*(\d{1,2}(?:\.\d{1,2}){0,4})(?:[\s、．]+|(?<=\d\.\d{1,2})(?=[一-龥]))(?![个小年月天周日元岁次人项%])(\S.{0,40})/
// "第三章 xxx" / "第十二条"
const CHAP = /^\s*(第[一二三四五六七八九十百\d]+[章节条])\s*(.{0,30})/

function addPara(doc, text, table = null) {
  const t = text.replace(/[ \t 　]+/g, ' ').trim()
  if (!t) return
  const m = !table && (SEC.exec(t) || CHAP.exec(t))
  if (m && t.length < 80) doc._sec = m[1]
  doc.paras.push({ text: t, sec: doc._sec || '', table, i: doc.paras.length })
}

export function readDocx(unzip, bytes, name) {
  const files = unzip(bytes, { filter: f => /^word\/(document|header\d*)\.xml$/.test(f.name) })
  const dec = new TextDecoder('utf-8')
  const xml = files['word/document.xml'] ? dec.decode(files['word/document.xml']) : ''
  if (!xml) throw new Error('not a Word document (word/document.xml missing)')
  const body = (/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [, xml])[1]
  const doc = { name, kind: 'docx', paras: [], tables: [], _sec: '' }
  for (const b of blocks(body)) {
    if (b.type === 'p') addPara(doc, runText(b.xml))
    else {
      const rows = tableRows(b.xml)
      const ti = doc.tables.length
      doc.tables.push(rows)
      for (const r of rows) addPara(doc, r.filter(Boolean).join(' | '), { t: ti, cells: r })
    }
  }
  return finish(doc)
}

export function readText(str, name) {
  const doc = { name, kind: 'text', paras: [], tables: [], _sec: '' }
  for (const line of str.split(/\r?\n/)) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim())
      addPara(doc, cells.filter(Boolean).join(' | '), { t: -1, cells })
    } else addPara(doc, line.replace(/^#+\s*/, ''))
  }
  return finish(doc)
}

// pdf: output of reportqc/extract.js readPdf()
export function fromPdf(pdf, name) {
  const doc = { name, kind: 'pdf', paras: [], tables: [], _sec: '' }
  for (const p of pdf.pages) {
    for (const l of p.lines) {
      if (/^\s*(第\s*\d+\s*页|\d+\s*\/\s*\d+|page \d+( of \d+)?)\s*$/i.test(l.text)) continue
      addPara(doc, l.text)
      doc.paras[doc.paras.length - 1] && (doc.paras[doc.paras.length - 1].page = p.n)
    }
  }
  // join wrapped lines: a line that does not end a sentence and the next does not start a section
  const out = []
  for (const p of doc.paras) {
    const prev = out[out.length - 1]
    if (prev && !/[。；;：:！？.!?）)]$/.test(prev.text) && !SEC.test(p.text) && !CHAP.test(p.text) && prev.text.length > 25) {
      prev.text += (/[A-Za-z0-9]$/.test(prev.text) && /^[A-Za-z0-9]/.test(p.text) ? ' ' : '') + p.text
    } else out.push({ ...p })
  }
  out.forEach((p, i) => { p.i = i })
  doc.paras = out
  return finish(doc)
}

function finish(doc) {
  delete doc._sec
  doc.text = doc.paras.map(p => p.text).join('\n')
  return doc
}
