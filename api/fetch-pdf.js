// Relay for public PDF reports (e.g. cninfo, SSE, SZSE, HKEX, company sites) used by /en/esg-lens.
// Report sites don't allow browsers on other sites to download their files (CORS), so the page asks
// this function for the file in byte ranges of up to 4 MB (Vercel's response limit is 4.5 MB).
// Only PDFs are passed through; nothing is stored or logged here.
const MAX_CHUNK = 4 * 1024 * 1024;
const MAX_FILE = 120 * 1024 * 1024;

function badHost(h) {
  h = h.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (h.includes(":")) return true; // IPv6 literals: not needed for public report sites
  return false;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Expose-Headers", "X-Total-Length, X-Final-Url");
  const q = req.query || {};
  let target;
  try {
    target = new URL(String(q.url || ""));
  } catch (_) {
    return res.status(400).json({ error: "bad_url" });
  }
  if (!/^https?:$/.test(target.protocol) || badHost(target.hostname)) return res.status(400).json({ error: "bad_url" });
  const start = Math.max(0, parseInt(q.start || "0", 10) || 0);
  const end = Math.min(parseInt(q.end || String(start + MAX_CHUNK - 1), 10), start + MAX_CHUNK - 1);
  if (!(end >= start) || start >= MAX_FILE) return res.status(400).json({ error: "bad_range" });

  let up;
  try {
    up = await fetch(target.href, {
      headers: { Range: `bytes=${start}-${end}`, "User-Agent": "Mozilla/5.0 (compatible; ESG-Report-Lens; +https://scdd.pro)" },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    return res.status(502).json({ error: "fetch_failed", detail: String((e && e.message) || e).slice(0, 200) });
  }
  if (!up.ok) return res.status(502).json({ error: "upstream", status: up.status });
  const ctype = (up.headers.get("content-type") || "").toLowerCase();
  if (/text\/html|json|javascript|image\//.test(ctype)) {
    try { await up.body.cancel(); } catch (_) { /* ignore */ }
    return res.status(415).json({ error: "not_pdf", type: ctype.slice(0, 60) });
  }

  let total = null;
  let body;
  if (up.status === 206) {
    const cr = up.headers.get("content-range") || "";
    const m = cr.match(/\/(\d+)\s*$/);
    total = m ? parseInt(m[1], 10) : null;
    body = Buffer.from(await up.arrayBuffer());
  } else {
    // Server ignored the range: read the whole stream up to `end`, skipping `start` bytes.
    total = parseInt(up.headers.get("content-length") || "", 10) || null;
    const reader = up.body.getReader();
    const parts = [];
    let pos = 0;
    while (pos <= end) {
      const { done, value } = await reader.read();
      if (done) break;
      const from = Math.max(0, start - pos);
      const to = Math.min(value.length, end - pos + 1);
      if (to > from) parts.push(Buffer.from(value.subarray(from, to)));
      pos += value.length;
      if (pos > MAX_FILE) break;
    }
    try { await reader.cancel(); } catch (_) { /* ignore */ }
    body = Buffer.concat(parts);
    if (!total && pos <= end) total = pos;
  }
  if (start === 0 && body.subarray(0, 1024).indexOf("%PDF") < 0) return res.status(415).json({ error: "not_pdf" });
  if (total && total > MAX_FILE) return res.status(413).json({ error: "too_large", total });

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  if (total) res.setHeader("X-Total-Length", String(total));
  res.setHeader("X-Final-Url", up.url || target.href);
  return res.status(200).send(body);
};
