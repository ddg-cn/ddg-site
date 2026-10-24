// Runs the SLCP Verifier Tool Quality Checker (Python) in the browser with Pyodide.
// The workbook is only ever held in this worker's memory - nothing is uploaded.
/* global importScripts, loadPyodide */
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;

async function init() {
  if (py) return py;
  post("progress", { stage: "runtime" });
  py = await loadPyodide({ indexURL: PYODIDE });
  post("progress", { stage: "packages" });
  await py.loadPackage("micropip");
  await py.runPythonAsync('import micropip\nawait micropip.install(["openpyxl"])');
  const src = await (await fetch(new URL("slcp_qc_checker.py", self.location.href))).text();
  py.FS.mkdirTree("/app");
  py.FS.writeFile("/app/slcp_qc_checker.py", src);
  await py.runPythonAsync(`
import sys, json, os, datetime
sys.path.insert(0, "/app")
import slcp_qc_checker as q

def run_check(path):
    c = q.Checker(path)
    c.run()
    base = os.path.splitext(os.path.basename(path))[0]
    report = os.path.join(os.path.dirname(path), f"{base} - QC Report {datetime.date.today():%y%m%d}.xlsx")
    q.write_report(c, report)
    issues = sorted(c.issues, key=lambda x: (q.SEV_ORDER[x.severity], x.item.order if x.item else 0, x.rule))
    rows = []
    for x in issues:
        it = x.item
        rows.append(dict(sev=x.severity, rule=x.rule, cat=q.RULES[x.rule][0], title=q.RULES[x.rule][1],
                         section=(it.section if it else ""), num=(it.num if it else ""), key=(it.key if it else ""),
                         row=(it.row if it else None), field=x.field, msg=x.msg, text=(q.short(it.text, 200) if it else "")))
    return json.dumps(dict(version=q.CHECKER_VERSION, sheet=c.dct_sheet, questions=len(c.items), issues=rows,
                           notes=[dict(rule=r, msg=m) for r, m in c.skipped],
                           rules=[dict(id=k, cat=v[0], title=v[1], sev=v[2]) for k, v in q.RULES.items()],
                           report=report))
`);
  post("ready", {});
  return py;
}

function post(type, data) { self.postMessage({ type, ...data }); }

self.onmessage = async (e) => {
  const { type } = e.data;
  try {
    if (type === "init") { await init(); return; }
    if (type === "check") {
      await init();
      post("progress", { stage: "checking" });
      const safe = e.data.name.replace(/[\\/:*?"<>|]/g, "_");
      py.FS.mkdirTree("/work");
      for (const f of py.FS.readdir("/work")) if (f !== "." && f !== "..") py.FS.unlink("/work/" + f);
      const path = "/work/" + safe;
      py.FS.writeFile(path, new Uint8Array(e.data.buffer));
      py.globals.set("tool_path", path);
      let res;
      try {
        res = JSON.parse(await py.runPythonAsync("run_check(tool_path)"));
      } catch (err) {
        const m = String(err && err.message || err);
        const code = /UnsupportedTool/.test(m) ? "unsupported"
          : /SystemExit|not found - is this an SLCP|zipfile|BadZipFile|InvalidFileException|KeyError: "There is no item/.test(m) ? "not_tool" : "error";
        const last = m.trim().split("\n").pop();
        post("failed", { code, detail: last.slice(0, 300) });
        return;
      } finally {
        try { py.FS.unlink(path); } catch (_) { /* already gone */ }
      }
      const report = py.FS.readFile(res.report);
      py.FS.unlink(res.report);
      res.reportName = res.report.split("/").pop();
      delete res.report;
      self.postMessage({ type: "result", result: res, report: report.buffer }, [report.buffer]);
    }
  } catch (err) {
    post("failed", { code: "load", detail: String(err && err.message || err).slice(0, 300) });
  }
};
