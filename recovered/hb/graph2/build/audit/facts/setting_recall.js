// Recall probe for reads_setting over the whole repo: Python `settings.<field>` reads (any file),
// shop-setting KEY_ constants, and JS/TS env reads (process.env.X, import.meta.env.X).
// A hit = an extractor reads_setting edge at that file and line (+-1) to a setting whose name matches.
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]), repo = L.mkRepo(process.argv[3]);
const E = F.edges.filter((e) => e.kind === "reads_setting");
const at = new Map();
for (const e of E) { const k = e.evidence_path + ":" + e.evidence_line; if (!at.has(k)) at.set(k, []); at.get(k).push(F.N.get(e.dst).name); }
const fields = new Set();
const cfg = repo.text("backend/app/core/config.py") || "";
for (const m of cfg.matchAll(/^\s{4}(\w+)\s*:\s*[^=\n]+(=|$)/gm)) fields.add(m[1]);
const keyOf = new Map();
for (const e of F.edges.filter((e) => e.kind === "defines" && e.dst.startsWith("setting:shop/"))) keyOf.set(e.src.split("#")[1], F.N.get(e.dst).name);
const out = { py_settings: [0, 0, []], shop_keys: [0, 0, []], js_env: [0, 0, []], py_environ: [0, 0, []] };
const isTest = (p) => /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /conftest\.py$/.test(p) || /\.(test|spec)\.[^/]+$/.test(p);
const has = (f, i, nm) => [i, i - 1, i + 1].some((l) => (at.get(f + ":" + l) || []).includes(nm));
for (const f of repo.files) {
  const py = /\.py$/.test(f), js = /\.(js|jsx|ts|tsx|mjs)$/.test(f) && !/node_modules/.test(f);
  if (!py && !js) continue;
  repo.lines(f).forEach((ln, idx) => {
    const i = idx + 1;
    if (/^\s*#/.test(ln) || /^\s*\/\//.test(ln)) return;
    if (py) {
      for (const m of ln.matchAll(/\bsettings\.(\w+)\b(?!\s*=[^=])/g)) { if (!fields.has(m[1]) || f === "backend/app/core/config.py") continue; const b = out.py_settings; b[0]++; if (has(f, i, m[1])) b[1]++; else b[2].push((isTest(f) ? "[test] " : "") + f + ":" + i + " " + m[1]); }
      for (const m of ln.matchAll(/\b(KEY_[A-Z0-9_]+)\b/g)) { const nm = keyOf.get(m[1]); if (!nm || /^\s*KEY_\w+\s*=/.test(ln)) continue; const b = out.shop_keys; b[0]++; if (has(f, i, nm)) b[1]++; else b[2].push((isTest(f) ? "[test] " : "") + f + ":" + i + " " + m[1]); }
      for (const m of ln.matchAll(/os\.(?:environ(?:\.get)?\[?\(?|getenv\()\s*["'](\w+)["']/g)) { const b = out.py_environ; b[0]++; if (has(f, i, m[1])) b[1]++; else b[2].push(f + ":" + i + " " + m[1]); }
    } else {
      for (const m of ln.matchAll(/(?:process\.env|import\.meta\.env)\.(\w+)/g)) { const b = out.js_env; b[0]++; if (has(f, i, m[1])) b[1]++; else b[2].push((isTest(f) ? "[test] " : "") + f + ":" + i + " " + m[1]); }
    }
  });
}
for (const [k, [n, h, miss]] of Object.entries(out)) { console.log(k, "sites", n, "found", h); for (const m of miss.slice(0, 60)) console.log("   " + m); if (miss.length > 25) console.log("   ... " + (miss.length - 25) + " more"); }
