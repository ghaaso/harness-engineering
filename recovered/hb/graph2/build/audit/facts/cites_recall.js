// Recall probe for cites: in every markdown doc, every backticked or linked token that looks like a repo path
// or file name (has an extension or a slash), resolved by MY suffix match against the export's files.
// Unique resolution -> expect a cites edge to that file from a section of the doc at that line (+-0).
// Ambiguous (several files share the suffix) -> expect a cites edge (any candidate or an ambiguous: node).
"use strict";
const L = require("./lib.js");
const F = L.loadFacts(process.argv[2]), repo = L.mkRepo(process.argv[3]);
const files = repo.files.filter((f) => !/\.(png|jpe?g|gif|webp|ico|svg|ttf|woff2?)$/i.test(f));
const C = new Map();
for (const e of F.edges.filter((e) => e.kind === "cites")) { const k = e.evidence_path + ":" + e.evidence_line; if (!C.has(k)) C.set(k, []); C.get(k).push(e.dst); }
const per = {};
let uniq = 0, uniqHit = 0, amb = 0, ambHit = 0, none = 0;
const missU = [], missA = [];
for (const d of files.filter((f) => f.endsWith(".md"))) {
  let inFence = false;
  repo.lines(d).forEach((ln, i) => {
    if (/^\s*```/.test(ln)) { inFence = !inFence; return; }
    const toks = [...ln.matchAll(/`([^`\s]+)`|\]\(([^)\s#]+)/g)].map((m) => (m[1] || m[2]).replace(/:\d+(-\d+)?$/, "").replace(/^\.\.?\//, "").replace(/^(\.\.\/)+/, ""));
    for (const t0 of toks) {
      const t = t0.replace(/[),.;]+$/, "");
      if (!/\.(py|tsx?|jsx?|mjs|md|json|sh|toml|ya?ml|mermaid|txt|cfg|ini|html)$/.test(t) || /^https?:/.test(t) || /\*/.test(t)) continue;
      const cands = files.filter((f) => f === t || f.endsWith("/" + t));
      const got = C.get(d + ":" + (i + 1)) || [];
      if (cands.length === 1) { uniq++; if (got.includes("file:" + cands[0])) uniqHit++; else missU.push(d + ":" + (i + 1) + " " + t); }
      else if (cands.length > 1) { amb++; if (got.some((g) => cands.includes(g.replace(/^file:/, "")) || g.startsWith("ambiguous:"))) ambHit++; else missA.push(d + ":" + (i + 1) + " " + t + " (" + cands.length + ")"); }
      else none++;
    }
  });
}
console.log(JSON.stringify({ unique_tokens: uniq, unique_hit: uniqHit, ambiguous_tokens: amb, ambiguous_hit: ambHit, not_in_repo: none }));
console.log("unique misses:"); for (const m of missU.slice(0, 30)) console.log("  " + m);
console.log("ambiguous misses:"); for (const m of missA.slice(0, 15)) console.log("  " + m);
