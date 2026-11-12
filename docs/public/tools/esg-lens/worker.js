// Runs the ESG Report Lens analysis core (Python) in the browser with Pyodide.
// It receives page text + word positions already read from the PDF by pdf.js; nothing is uploaded.
/* global importScripts, loadPyodide */
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;
let ready = null;

function init() {
  if (!ready) ready = boot().catch((e) => { ready = null; throw e; });
  return ready;
}

async function boot() {
  post("progress", { stage: "runtime" });
  py = await loadPyodide({ indexURL: PYODIDE });
  post("progress", { stage: "packages" });
  await py.loadPackage("micropip");
  await py.runPythonAsync('import micropip\nawait micropip.install(["xlsxwriter==3.2.0"])');
  const base = new URL(".", self.location.href);
  const [src, rules] = await Promise.all([
    fetch(new URL("lens_core.py", base), { cache: "no-cache" }).then((r) => r.text()),
    fetch(new URL("lens_rules.json", base), { cache: "no-cache" }).then((r) => r.text()),
  ]);
  py.FS.mkdirTree("/app");
  py.FS.writeFile("/app/lens_core.py", src);
  py.FS.writeFile("/app/lens_rules.json", rules);
  await py.runPythonAsync(`
import sys, json, datetime
sys.path.insert(0, "/app")
import lens_core as core
CFG = core.compile_config(json.load(open("/app/lens_rules.json", encoding="utf-8")))

def run_lens(doc_json, prev_json, lang, when):
    doc = json.loads(doc_json)
    prev = json.loads(prev_json) if prev_json else None
    res = core.analyse(doc, CFG, lang, prev_doc=prev)
    core.write_xlsx(res, "/work/report.xlsx", when)
    return json.dumps(core.public(res), ensure_ascii=False)
`);
  post("ready", {});
  return py;
}

function post(type, data) { self.postMessage({ type, ...data }); }

self.onmessage = async (e) => {
  const { type } = e.data;
  try {
    if (type === "init") { await init(); return; }
    if (type === "analyse") {
      await init();
      post("progress", { stage: "analysing" });
      py.FS.mkdirTree("/work");
      py.globals.set("doc_json", JSON.stringify(e.data.doc));
      py.globals.set("prev_json", e.data.prev ? JSON.stringify(e.data.prev) : "");
      py.globals.set("out_lang", e.data.lang || "auto");
      py.globals.set("run_when", e.data.when || "");
      let res;
      try {
        res = JSON.parse(await py.runPythonAsync("run_lens(doc_json, prev_json, out_lang, run_when)"));
      } catch (err) {
        const m = String((err && err.message) || err);
        post("failed", { code: "error", detail: m.trim().split("\n").slice(-3).join("\n").slice(0, 400) });
        return;
      } finally {
        py.globals.delete("doc_json");
        py.globals.delete("prev_json");
      }
      const report = py.FS.readFile("/work/report.xlsx");
      py.FS.unlink("/work/report.xlsx");
      self.postMessage({ type: "result", result: res, report: report.buffer }, [report.buffer]);
    }
  } catch (err) {
    post("failed", { code: "load", detail: String((err && err.message) || err).slice(0, 300) });
  }
};
