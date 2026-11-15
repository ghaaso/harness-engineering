// Recall probe over the whole repo for overrides (dependency_overrides[X] = ...) and mocks
// (vi.mock / jest.mock / vi.doMock / jest.doMock with a repo path, patch("pkg.mod.attr"),
// patch.object(x, "a"), monkeypatch.setattr(x, "a", ...) and monkeypatch.setattr("pkg.mod.attr", ...)).
// A hit = an extractor edge of the kind whose evidence is that file and line (+-2).
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]), repo = L.mkRepo(process.argv[3]);
const idx = (kind) => { const s = new Map(); for (const e of F.edges.filter((e) => e.kind === kind)) { const k = e.evidence_path; if (!s.has(k)) s.set(k, []); s.get(k).push(e); } return s; };
const OV = idx("overrides"), MK = idx("mocks");
const near = (m, f, i) => (m.get(f) || []).filter((e) => Math.abs(e.evidence_line - i) <= 2);
const out = { overrides: [0, 0, [], []], js_mock: [0, 0, [], []], py_patch: [0, 0, [], []], monkeypatch: [0, 0, [], []] };
const isTest = (p) => /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /conftest\.py$/.test(p) || /\.(test|spec)\.[^/]+$/.test(p) || /setup\.(js|ts)$/.test(p);
for (const f of repo.files.filter(isTest)) {
  const lines = repo.lines(f) || [];
  lines.forEach((ln, idx0) => {
    const i = idx0 + 1;
    if (/^\s*(#|\/\/)/.test(ln)) return;
    for (const m of ln.matchAll(/dependency_overrides\[\s*([\w.]+)\s*\]\s*=/g)) { const b = out.overrides; b[0]++; const h = near(OV, f, i); if (h.length) { b[1]++; } else b[2].push(f + ":" + i + " " + m[1]); }
    const jm = ln.match(/\b(?:vi|jest)\.(?:mock|doMock)\(\s*["']([^"']+)["']/);
    if (jm) { const res = L.tsResolveSpec(repo, f, jm[1]); const b = out.js_mock; if (res) { b[0]++; const h = near(MK, f, i); if (h.some((e) => F.N.get(e.dst).path === res)) b[1]++; else b[2].push(f + ":" + i + " " + jm[1] + " -> " + res + (h.length ? " (edge to other: " + h.map((e) => e.dst).join(",") + ")" : "")); } else b[3].push(jm[1]); }
    const pp = ln.match(/\bpatch(?:\.object)?\(\s*(["'][\w.]+["']|[\w.]+\s*,\s*["']\w+["'])/);
    if (pp && /\.py$/.test(f)) { const b = out.py_patch; b[0]++; if (near(MK, f, i).length) b[1]++; else b[2].push(f + ":" + i + " " + pp[1]); }
    const mp = ln.match(/monkeypatch\.setattr\(\s*([^,\n]+)(?:,\s*["'](\w+)["'])?/) || (/monkeypatch\.setattr\($/.test(ln.trim()) ? [null, (lines[idx0 + 1] || "").trim().replace(/,$/, ""), ((lines[idx0 + 2] || "").match(/["'](\w+)["']/) || [])[1]] : null);
    if (mp) { const b = out.monkeypatch; b[0]++; if (near(MK, f, i).length) b[1]++; else b[2].push(f + ":" + i + " " + mp[1] + (mp[2] ? "." + mp[2] : "")); }
  });
}
for (const [k, [n, h, miss, ext]] of Object.entries(out)) { console.log(k, "sites", n, "found", h, ext.length ? "external specs " + ext.length : ""); for (const m of miss.slice(0, 40)) console.log("   " + m); if (miss.length > 40) console.log("   ... " + (miss.length - 40)); }
