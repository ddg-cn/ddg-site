// Shared PDF text reader for the report checkers (browser + Node tests).
// Turns each page into lines: items with nearly the same baseline are joined,
// left to right, and keep their x position so table columns can be read.

export async function readPdf(pdfjs, data, opts = {}) {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, ...opts }).promise
  const pages = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    const items = []
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue
      const x = it.transform[4], y = vp.height - it.transform[5]
      const h = Math.abs(it.transform[3]) || it.height || 8
      items.push({ x, y, w: it.width, h, str: it.str })
    }
    items.sort((a, b) => a.y - b.y || a.x - b.x)
    const lines = []
    for (const it of items) {
      const tol = Math.max(2, it.h * 0.45)
      let line = null
      for (let i = lines.length - 1; i >= 0 && i >= lines.length - 4; i--) {
        if (Math.abs(lines[i].y - it.y) <= tol) { line = lines[i]; break }
      }
      if (!line) { line = { y: it.y, items: [] }; lines.push(line) }
      line.items.push(it)
    }
    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x)
      let s = '', end = null
      for (const it of l.items) {
        if (end !== null && it.x - end > Math.max(1.5, it.h * 0.2) && !s.endsWith(' ') && !it.str.startsWith(' ')) s += ' '
        s += it.str
        end = it.x + it.w
      }
      l.text = s.replace(/\s+/g, ' ').trim()
      l.x = l.items[0].x
      l.x2 = end
      l.page = n
    }
    pages.push({ n, width: vp.width, height: vp.height, lines: lines.filter(l => l.text) })
    page.cleanup()
  }
  await doc.destroy()
  return { numPages: pages.length, pages, text: pages.map(p => p.lines.map(l => l.text).join('\n')).join('\n\f\n') }
}

// Split one line into column cells: items further apart than `gap` points start a new cell.
export function cells(line, gap = 12) {
  const out = []
  let cur = null, end = null
  for (const it of line.items) {
    if (!cur || it.x - end > gap) { cur = { x: it.x, text: '' }; out.push(cur) }
    else if (it.x - end > 1.5 && !cur.text.endsWith(' ')) cur.text += ' '
    cur.text += it.str
    end = it.x + it.w
  }
  for (const c of out) c.text = c.text.replace(/\s+/g, ' ').trim()
  return out.filter(c => c.text)
}
