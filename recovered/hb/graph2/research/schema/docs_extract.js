// Measure the document corpus (tracked + untracked) for a document graph, and the
// CLAUDE.md invariants as anchored nodes. Read-only. Usage: node docs_extract.js <repo> <lane>
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = process.argv[2], L = process.argv[3];
const git = (a) => cp.execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
const tracked = git(["ls-files"]);
const untracked = git(["ls-files", "--others", "--exclude-standard"]);
const all = [...new Set(tracked.concat(untracked))];
const trackedSet = new Set(tracked);
const py = JSON.parse(fs.readFileSync(path.join(L, "py_graph.json"), "utf8"));
const tsg = JSON.parse(fs.readFileSync(path.join(L, "ts_graph.json"), "utf8"));
const symNames = new Map(); // name -> [ids]
const addSym = (n, id) => { if (!symNames.has(n)) symNames.set(n, []); symNames.get(n).push(id); };
for (const [id, v] of Object.entries(py.nodes)) if (v.name && ["function", "method", "class"].includes(v.type)) addSym(v.name, id);
for (const d of tsg.defs) addSym(d.id.split("#")[1].split(".").pop(), d.id);
for (const d of tsg.defs) addSym(d.id.split("#")[1], d.id);

function resolveFile(tok) {
  let t = tok.replace(/^\.?\//, "").replace(/[:#].*$/, "").replace(/\)$/, "");
  if (!/\.[a-z0-9]{1,5}$/i.test(t) && !t.endsWith("/")) return null;
  if (all.includes(t)) return [t];
  const hits = all.filter((f) => f.endsWith("/" + t));
  return hits.length ? hits : [];
}
const R = { corpus: {}, ids: {}, links: {}, cites: {}, symbols: {}, supersede: {}, invariants: {} };
const docs = all.filter((f) => f.endsWith(".md") && !f.startsWith("node_modules"));
const docsUnder = docs.filter((f) => f.startsWith("docs/"));
let bytes = 0, bytesUntracked = 0, heads = 0, headByLevel = {}, secSizes = [];
const idCounts = {}, idDocs = {}, idDistinct = {}, idDefs = {};
let mdLinks = 0, mdLinksResolved = 0, docMentions = 0, fileCites = 0, fileCitesUnique = 0, fileCitesAmbig = 0, fileCitesNone = 0;
let symCites = 0, symResolved = 0, symAmbig = 0, sectionRefs = 0, prRefs = 0, supers = 0;
const docToDoc = new Set(), docToFile = new Set(), docToSym = new Set();
const ID_RE = /\b((?:KS-)?[A-Z]{1,3}\d{1,3}[a-z]?)\b/g;
const docBase = new Map(docs.map((d) => [path.basename(d), d]));
for (const d of docs) {
  const txt = fs.readFileSync(path.join(ROOT, d), "utf8");
  const b = Buffer.byteLength(txt);
  if (d.startsWith("docs/") || !d.includes("/")) { bytes += b; if (!trackedSet.has(d)) bytesUntracked += b; }
  const lines = txt.split("\n");
  let secStart = 0;
  lines.forEach((ln, i) => {
    const h = ln.match(/^(#{1,6})\s/);
    if (h) { heads++; headByLevel[h[1].length] = (headByLevel[h[1].length] || 0) + 1; secSizes.push(lines.slice(secStart, i).join("\n").length / 4); secStart = i; }
  });
  secSizes.push(lines.slice(secStart).join("\n").length / 4);
  for (const m of txt.matchAll(ID_RE)) {
    const pre = m[1].replace(/\d.*$/, "");
    if (["H", "C", "U", "V", "X", "S", "M"].includes(pre) && false) continue;
    idCounts[pre] = (idCounts[pre] || 0) + 1; (idDistinct[pre]=idDistinct[pre]||new Set()).add(m[1]);
    (idDocs[pre] = idDocs[pre] || new Set()).add(d);
  }
  for (const m of txt.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^https?:/.test(m[1])) continue;
    mdLinks++;
    const tgt = path.posix.normalize(path.posix.join(path.posix.dirname(d), m[1].replace(/#.*$/, "")));
    if (all.includes(tgt)) { mdLinksResolved++; if (tgt.endsWith(".md")) docToDoc.add(d + ">" + tgt); else docToFile.add(d + ">" + tgt); }
  }
  for (const [bn, full] of docBase) if (full !== d && txt.includes(bn) && bn !== "README.md") { docMentions++; docToDoc.add(d + ">" + full); }
  for (const m of txt.matchAll(/`([^`\s]{3,120})`/g)) {
    const tok = m[1];
    const r = resolveFile(tok);
    if (r) {
      fileCites++;
      if (r.length === 1) { fileCitesUnique++; docToFile.add(d + ">" + r[0]); } else if (r.length > 1) fileCitesAmbig++; else fileCitesNone++;
      continue;
    }
    const nm = tok.replace(/\(.*$/, "").replace(/^.*[.:]/, "");
    if (/^[A-Za-z_][A-Za-z0-9_]{3,}$/.test(nm) && /[a-z][A-Z_]|_|[A-Z][a-z]+[A-Z]/.test(nm)) {
      symCites++;
      const ids = symNames.get(nm);
      if (ids) { const u = [...new Set(ids)]; if (u.length === 1) { symResolved++; docToSym.add(d + ">" + u[0]); } else symAmbig++; }
    }
  }
  for (const m of txt.matchAll(/^(?:#{1,6} |\| ?\*{0,2}|- \*\*)((?:KS-)?[A-Z]{1,3}\d{1,3}[a-z]?)\b/gm)) { const pre=m[1].replace(/\d.*$/,""); (idDefs[pre]=idDefs[pre]||new Set()).add(d+":"+m[1]); }
  sectionRefs += (txt.match(/§\s?\d+(\.\d+)*/g) || []).length;
  prRefs += (txt.match(/\b(PR|pr) ?#\d+|#\d{2,3}\b/g) || []).length;
  supers += (txt.match(/\b(supersed\w*|superseded by|replaces|replaced by|obsolete|stale|no longer)\b/gi) || []).length;
}
secSizes.sort((a, b) => a - b);
R.corpus = {
  md_files_all: docs.length, md_under_docs: docsUnder.length, md_under_docs_untracked: docsUnder.filter((f) => !trackedSet.has(f)).length,
  docs_dir_all_files: all.filter((f) => f.startsWith("docs/")).length, docs_dir_untracked_files: untracked.filter((f) => f.startsWith("docs/")).length,
  md_bytes_docs_and_root: bytes, md_bytes_untracked: bytesUntracked, est_tokens: Math.round(bytes / 4),
  headings: heads, headings_by_level: headByLevel, section_tokens_median: Math.round(secSizes[Math.floor(secSizes.length / 2)]), section_tokens_p90: Math.round(secSizes[Math.floor(secSizes.length * 0.9)]), section_tokens_max: Math.round(secSizes[secSizes.length - 1]),
};
const nonMd = all.filter((f) => f.startsWith("docs/") && !f.endsWith(".md"));
let nonMdBytes = 0; for (const f of nonMd) try { nonMdBytes += fs.statSync(path.join(ROOT, f)).size; } catch (e) {}
R.corpus.docs_non_md_files = nonMd.length; R.corpus.docs_non_md_bytes = nonMdBytes;
R.ids = Object.entries(idCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k}: ${v} mentions, ${idDistinct[k].size} distinct, ${(idDefs[k]||new Set()).size} defining rows/headings, in ${idDocs[k].size} docs`);
R.links = { md_links: mdLinks, md_links_resolved: mdLinksResolved, doc_filename_mentions: docMentions, doc_to_doc_pairs: docToDoc.size, section_refs: sectionRefs, pr_refs: prRefs };
R.cites = { backticked_file_tokens: fileCites, unique: fileCitesUnique, ambiguous: fileCitesAmbig, not_in_repo: fileCitesNone, doc_to_file_pairs: docToFile.size };
R.symbols = { backticked_symbol_like: symCites, resolved_unique: symResolved, ambiguous: symAmbig, doc_to_symbol_pairs: docToSym.size };
R.supersede = { supersede_words: supers };

// ---- CLAUDE.md invariants ----
const cm = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
const block = cm.split("## Invariants you must respect")[1].split("## Where things live")[0];
const inv = [];
let cur = null, sub = "";
for (const ln of block.split("\n")) {
  const h = ln.match(/^### (.*)/); if (h) sub = h[1];
  if (/^- \*\*/.test(ln)) { cur = { group: sub, title: ln.replace(/^- \*\*([^*]+)\*\*.*/, "$1").slice(0, 80), text: ln }; inv.push(cur); }
  else if (cur && /^\s+\S/.test(ln)) cur.text += " " + ln.trim();
}
const tableSet = new Set(Object.values(py.nodes).filter(v=>v.type==="table").map(v=>v.name));
const colSet = new Set(Object.values(py.nodes).filter(v=>v.type==="column").map(v=>v.table+"."+v.name).concat(Object.values(py.nodes).filter(v=>v.type==="column").map(v=>v.name)));
const constSet = new Set(); const cfgKeys = new Set();
for (const f of all.filter(f=>/^(backend|src|technician-app\/src)\/.*\.(py|ts|tsx|js|jsx)$/.test(f))) { const t = fs.readFileSync(path.join(ROOT,f),"utf8"); for (const m of t.matchAll(/^(?:export )?(?:const )?(_?[A-Z][A-Z0-9_]{2,})\s*[:=]/gm)) constSet.add(m[1]); for (const m of t.matchAll(/^\s+([a-z][A-Za-z]+):\s/gm)) if (f.endsWith("config.ts")) cfgKeys.add(m[1]); }
const runtimeOf = (f) => f.startsWith("backend/") ? "backend" : f.startsWith("technician-app/") ? "mobile" : f.startsWith("src/") ? "web" : "other";
for (const v of inv) {
  const files = new Set(), syms = new Set(), unres = [], extra = [];
  for (const m of v.text.matchAll(/`([^`]+)`/g)) {
    const tok = m[1].trim();
    const r = resolveFile(tok.split(" ")[0]);
    if (r && r.length === 1) { files.add(r[0]); continue; }
    if (r && r.length > 1) { unres.push(tok + "(ambiguous " + r.length + ")"); continue; }
    const nm = tok.replace(/\(.*$/, "").split(/[.:]/).pop();
    const ids = symNames.get(nm) || symNames.get(tok);
    if (ids && new Set(ids).size <= 2) { for (const i of new Set(ids)) syms.add(i); continue; }
    const t2 = tok.replace(/^.*\./, "");
    if (tableSet.has(tok) || colSet.has(tok) || colSet.has(t2)) { extra.push("tbl/col:" + tok); continue; }
    if (constSet.has(t2.replace(/[^A-Za-z0-9_]/g,""))) { extra.push("const:" + t2); continue; }
    if (cfgKeys.has(t2)) { extra.push("cfg:" + t2); continue; }
    unres.push(tok);
  }
  v.extra = extra;
  const rts = new Set([...files].map(runtimeOf).concat([...syms].map((s) => s.startsWith("sym:") ? "backend" : runtimeOf(s))));
  v.files = [...files]; v.syms = [...syms]; v.unresolved = unres; v.runtimes = [...rts];
  delete v.text;
}
R.invariants = {
  count: inv.length, with_anchor_incl_tables_consts: inv.filter((v) => v.files.length + v.syms.length + v.extra.length).length, extra_anchors: inv.reduce((a,v)=>a+v.extra.length,0), groups: [...new Set(inv.map(v=>v.group))], with_any_anchor: inv.filter((v) => v.files.length + v.syms.length).length,
  anchors_files: inv.reduce((a, v) => a + v.files.length, 0), anchors_symbols: inv.reduce((a, v) => a + v.syms.length, 0),
  multi_runtime: inv.filter((v) => v.runtimes.length > 1).map((v) => v.title + " [" + v.runtimes.join("+") + "]"),
  list: inv.map((v) => `${v.title} | files ${v.files.length} syms ${v.syms.length} extra ${v.extra.length} unres ${v.unresolved.length}: ${v.unresolved.slice(0, 5).join("; ")}`),
};
fs.writeFileSync(path.join(L, "docs_out.json"), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
