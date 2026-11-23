// Upload limits shared by every browser tool on scdd.pro.
// Files are read in the visitor's browser, so the caps protect the tab from running out of memory
// and keep a check within a minute or two. Change the numbers here only; pages read them from here.

export const LIMITS = { pdfMB: 100, pdfPages: 600, officeMB: 30, textMB: 5 }

const T = {
  en: {
    cap: `Per file: PDF up to ${LIMITS.pdfMB} MB and ${LIMITS.pdfPages} pages; Word / Excel / CSV up to ${LIMITS.officeMB} MB.`,
    tooBig: '{name} is {mb} MB; the limit for this file type is {cap} MB. Split the file, or save a copy without images (for a PDF: "Save as reduced size" / "Optimise"), and try again.',
    pages: '{name} has {pages} pages; only the first {cap} were read, so findings after page {cap} are missing. Split the file to check the rest.',
    password: '{name} is password-protected. Save an unprotected copy and try again.',
    broken: '{name} could not be opened ({err}). The file may be damaged or only partly downloaded; open it on your computer, save it again and retry.',
  },
  zh: {
    cap: `单个文件上限：PDF ${LIMITS.pdfMB} MB、${LIMITS.pdfPages} 页；Word / Excel / CSV ${LIMITS.officeMB} MB。`,
    tooBig: '{name} 大小为 {mb} MB，此类文件上限为 {cap} MB。请拆分文件，或另存为不含图片的副本（PDF 可用"缩小文件大小"/"优化"），再试一次。',
    pages: '{name} 共 {pages} 页，只读取了前 {cap} 页，第 {cap} 页之后的问题不会显示。请拆分文件后检查其余部分。',
    password: '{name} 设有密码。请另存一份无密码的副本后再试。',
    broken: '{name} 无法打开（{err}）。文件可能已损坏或未下载完整；请在电脑上打开并重新保存后再试。',
  },
}
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '')
const lang = l => (l === 'zh' ? 'zh' : 'en')

export function capText(l) { return T[lang(l)].cap }

// null when the file is within the limit, otherwise a message for the page
export function sizeProblem(file, l) {
  const pdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
  const text = /\.(txt|md)$/i.test(file.name)
  const cap = pdf ? LIMITS.pdfMB : text ? LIMITS.textMB : LIMITS.officeMB
  const mb = file.size / 1048576
  return mb > cap ? fmt(T[lang(l)].tooBig, { name: file.name, mb: mb.toFixed(1), cap }) : null
}

export function pagesNote(name, pages, l) { return fmt(T[lang(l)].pages, { name, pages, cap: LIMITS.pdfPages }) }

// turn a reader error into a plain message
export function readProblem(name, e, l) {
  const t = T[lang(l)]
  if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) return fmt(t.password, { name })
  return fmt(t.broken, { name, err: (e && (e.message || e.name)) || 'unknown error' })
}
