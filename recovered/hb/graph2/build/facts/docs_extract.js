// FACTS stage: documents. Doc and section nodes, doc ids, CLAUDE.md invariants;
// cites (doc section -> file, status resolved | ambiguous | not-in-repo), mentions (section ->
// symbol / table / column / setting / constant / route / doc id), constrains (invariant -> anchor).
// Derived from research/schema/docs_extract.js. Changes: runs on the clean export (tracked
// files only); every top-level invariant bullet counts (20, not 19); citations keep their
// status and line; ambiguous anchors get one edge per candidate with confidence 1/k.
"use strict";
const fs = require("fs");
const path = require("path");

const FILE_TOKEN = /(?:^|[\s(`'"\[])((?:\.{0,2}\/)?[A-Za-z0-9_@.\-]+(?:\/[A-Za-z0-9_@.\-\[\]{}]+)*\.(?:py|tsx|ts|jsx|js|mjs|json|md|yml|yaml|toml|sh|html|css|txt|mermaid|ini|cfg))(?::(\d+))?/g;
const ID_DEF = /^(?:#{1,6} +|\| ?\*{0,2}|- \*\*|\*\*)((?:KS-)?[A-Z]{1,3}\d{1,3}[a-z]?)(?![A-Za-z0-9])/;
const ID_ANY = /(?<![A-Za-z0-9-])((?:KS-)?[A-Z]{1,3}\d{1,3}[a-z]?)(?![A-Za-z0-9])/g;
const AMBIG_FANOUT = 3; // a bare name matching more files than this is a generic reference, not a citation of each
const ROUTE_RE = /\b(GET|POST|PUT|PATCH|DELETE)\s+`?(\/api\/[A-Za-z0-9_\-/{}.]+)/g;

function extractDocs({ files, nodesById, routes }) {
  // files: sorted list of exported paths; nodesById: Map of code nodes (already built)
  const N = [], E = [], S = {};
  const inc = (k, n = 1) => (S[k] = (S[k] || 0) + n);
  const fileSet = new Set(files);
  const byBase = new Map();
  for (const f of files) { const b = path.posix.basename(f); if (!byBase.has(b)) byBase.set(b, []); byBase.get(b).push(f); }
  const dirSet = new Set();
  for (const f of files) { let d = path.posix.dirname(f); while (d && d !== ".") { dirSet.add(d); d = path.posix.dirname(d); } }
  // name index for anchors
  const nameIdx = new Map();
  const addName = (k, id) => { if (!k) return; if (!nameIdx.has(k)) nameIdx.set(k, new Set()); nameIdx.get(k).add(id); };
  for (const [id, n] of nodesById) {
    if (["function", "method", "class", "component"].includes(n.kind) && id.startsWith("sym:")) {
      const qual = id.split("#")[1];
      addName(n.name, id);
      const parts = qual.split(".");
      if (parts.length >= 2) addName(parts.slice(-2).join("."), id);
      addName(qual, id);
    } else if (n.kind === "table") addName(n.name, id);
    else if (n.kind === "column") { addName(id.slice(7), id); }
    else if (n.kind === "constant") addName(n.name, id);
    else if (n.kind === "setting") { addName(n.name, id); if (id.startsWith("setting:") && !id.includes("/") && !id.includes("#")) { addName("settings." + n.name, id); addName("FIXFLOW_" + n.name.toUpperCase(), id); } if (id.includes("#")) addName(n.name.split(".").slice(-2).join("."), id); }
    else if (n.kind === "scheduled_job") addName(n.name, id);
  }
  const colByName = new Map();
  for (const [id, n] of nodesById) if (n.kind === "column") { if (!colByName.has(n.name)) colByName.set(n.name, []); colByName.get(n.name).push(id); }
  const routeIdx = new Map();
  for (const r of routes) routeIdx.set(r.method + " " + r.path.replace(/\{[^}]+\}/g, "{}"), r.id);

  function resolveFile(tokRaw, docPath) {
    let t = tokRaw.replace(/^\.\//, "").replace(/[#?].*$/, "").replace(/:\d+(?:-\d+)?$/, "").replace(/[),.;:]+$/, "");
    if (!t || /^https?:/.test(t)) return null;
    if (t.startsWith("../") || t.startsWith("./")) t = path.posix.normalize(path.posix.join(path.posix.dirname(docPath), t));
    if (fileSet.has(t)) return { status: "resolved", hits: [t] };
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(docPath), t));
    if (fileSet.has(rel)) return { status: "resolved", hits: [rel] };
    if (dirSet.has(t.replace(/\/$/, ""))) return { status: "directory", hits: [] };
    const hits = t.includes("/") ? files.filter((f) => f.endsWith("/" + t)) : (byBase.get(t) || []);
    if (hits.length === 1) return { status: "resolved", hits };
    if (hits.length > 1) return { status: "ambiguous", hits };
    return { status: "not-in-repo", hits: [] };
  }
  function resolveName(tokRaw, preferFiles, opts) {
    opts = opts || {};
    let t = tokRaw.trim().replace(/\(.*\)?$/, "").replace(/^(?:async |def |class |function |const )/, "").replace(/[`;,]$/, "");
    if (!t || t.length < 3 || /\s/.test(t)) return null;
    const cands = [];
    const tries = [t];
    if (t.includes(":")) tries.push(t.split(":").pop());
    const parts = t.split(/[.:]/);
    if (parts.length >= 2) tries.push(parts.slice(-2).join("."));
    tries.push(parts[parts.length - 1]);
    for (const k of tries) {
      if (nameIdx.has(k)) { cands.push(...nameIdx.get(k)); break; }
    }
    if (!cands.length) {
      const last = parts[parts.length - 1];
      if (colByName.has(last) && /_/.test(last)) cands.push(...colByName.get(last));
    }
    if (!cands.length) return null;
    const last = parts[parts.length - 1];
    // identifier-likeness: avoid generic one-word names
    let ids = [...new Set(cands)].sort();
    if (!/[a-z][A-Z]|_|^[A-Z][a-z]+[A-Z]|^_?[A-Z][A-Z0-9_]{2,}$/.test(last) && !(parts.length >= 2 && cands.length === 1)) {
      // a generic one-word name is accepted only when the caller allows it (an invariant's `name()`)
      // and the files named beside it narrow it to one definition
      if (!(opts.allowGeneric && preferFiles && preferFiles.size)) return { ids: [], skipped: "generic" };
      const pref = ids.filter((id) => preferFiles.has((nodesById.get(id) || {}).path));
      if (pref.length !== 1) return { ids: [], skipped: "generic" };
      return { ids: pref, how: "generic_call_in_named_file" };
    }
    if (ids.length > 1 && preferFiles && preferFiles.size) {
      const pref = ids.filter((id) => preferFiles.has((nodesById.get(id) || {}).path));
      if (pref.length) ids = pref;
    }
    return { ids };
  }

  const docs = files.filter((f) => f.endsWith(".md") && !f.includes("node_modules/"));
  return { N, E, S, docs, resolveFile, resolveName, routeIdx, inc };
}

function runDocs(root, files, nodesById, routes) {
  const ctx = extractDocs({ files, nodesById, routes });
  const { N, E, S, docs, resolveFile, resolveName, routeIdx, inc } = ctx;
  const tok = (s) => Math.ceil(s.length / 4);
  const missing = new Set();
  const sectionsOf = new Map();
  const docIdOwner = new Map(); // ID -> Set(doc)
  const texts = new Map();
  for (const d of docs) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(root, d), "utf8"); } catch (e) { inc("doc_read_errors"); continue; }
    texts.set(d, txt);
    const lines = txt.split("\n");
    N.push({ id: "file:" + d, kind: "doc", path: d, name: path.posix.basename(d), line_start: 1, line_end: lines.length, signature: (lines.find((l) => /^#\s/.test(l)) || "").slice(0, 240) || null, tokens: tok(txt) });
    // sections (flat): preamble + one per heading, fenced code ignored
    const heads = [];
    let fence = false;
    lines.forEach((ln, i) => { if (/^\s*(```|~~~)/.test(ln)) fence = !fence; else if (!fence && /^#{1,6}\s/.test(ln)) heads.push(i); });
    const secs = [];
    if (!heads.length || heads[0] > 0) secs.push({ start: 0, end: (heads[0] || lines.length) - 1, name: "(preamble)", sig: null });
    heads.forEach((h, k) => secs.push({ start: h, end: (k + 1 < heads.length ? heads[k + 1] : lines.length) - 1, name: lines[h].replace(/^#+\s*/, "").trim().slice(0, 160), sig: lines[h].trim().slice(0, 240) }));
    const secNodes = [];
    for (const s of secs) {
      const body = lines.slice(s.start, s.end + 1).join("\n");
      if (s.name === "(preamble)" && !body.trim()) continue;
      const id = "sec:" + d + "#L" + (s.start + 1);
      N.push({ id, kind: "doc_section", path: d, name: s.name, line_start: s.start + 1, line_end: s.end + 1, signature: s.sig, tokens: tok(body) });
      E.push({ src: "file:" + d, dst: id, kind: "contains", evidence_path: d, evidence_line: s.start + 1, confidence: 1, attrs: null });
      secNodes.push({ id, start: s.start, end: s.end });
    }
    sectionsOf.set(d, secNodes);
    // doc id definitions
    fence = false;
    lines.forEach((ln, i) => {
      if (/^\s*(```|~~~)/.test(ln)) { fence = !fence; return; }
      if (fence) return;
      const m = ln.match(ID_DEF);
      if (!m) return;
      const did = "docid:" + d + "#" + m[1];
      if (N.some((x) => x.id === did)) return;
      const sec = secNodes.find((s) => i >= s.start && i <= s.end);
      N.push({ id: did, kind: "doc_id", path: d, name: m[1], line_start: i + 1, line_end: i + 1, signature: ln.trim().slice(0, 240), tokens: tok(ln) });
      if (sec) E.push({ src: sec.id, dst: did, kind: "defines", evidence_path: d, evidence_line: i + 1, confidence: 1, attrs: null });
      if (!docIdOwner.has(m[1])) docIdOwner.set(m[1], new Set());
      docIdOwner.get(m[1]).add(d);
    });
  }
  const secAt = (d, i) => (sectionsOf.get(d) || []).find((s) => i >= s.start && i <= s.end);
  // citations, mentions
  for (const d of docs) {
    const txt = texts.get(d);
    if (txt == null) continue;
    const lines = txt.split("\n");
    let fence = false;
    const seen = new Set();
    const emit = (e) => { const k = e.kind + "|" + e.src + "|" + e.dst + "|" + e.evidence_line; if (!seen.has(k)) { seen.add(k); E.push(e); } };
    // gather every file-like token on a line (a markdown link's `:line` / `:a-b` suffix is split off)
    const tokensOf = (ln) => {
      const toks = [];
      for (const m of ln.matchAll(/\]\(([^)\s]+)\)/g)) if (!/^https?:|^mailto:|^#/.test(m[1])) { const lm = m[1].match(/^(.*?):(\d+)(?:-\d+)?$/); toks.push(lm ? [lm[1], lm[2], "link"] : [m[1], null, "link"]); }
      const ticks = [...ln.matchAll(/`([^`]{2,160})`/g)].map((m) => m[1]);
      for (const t of ticks) { const fm = t.match(/^((?:\.{0,2}\/)?[A-Za-z0-9_@.\-/\[\]{}]+\.[a-z]{1,8})(?::(\d+))?/); if (fm && /\.(py|tsx|ts|jsx|js|mjs|json|md|yml|yaml|toml|sh|html|css|txt|mermaid|ini|cfg)$/.test(fm[1])) toks.push([fm[1], fm[2], "backtick"]); }
      const bare = ln.replace(/`[^`]*`/g, " ").replace(/\]\([^)]*\)/g, " ");
      for (const m of bare.matchAll(FILE_TOKEN)) if (!/^https?:/.test(m[1]) && /[/]/.test(m[1])) toks.push([m[1], m[2], "bare"]);
      return { toks, ticks };
    };
    // context for breaking a tie between a few candidates: files this document (and this section)
    // cites unambiguously
    const docCtx = [], secCtx = new Map();
    {
      let f2 = false;
      lines.forEach((ln, i) => {
        if (/^\s*(```|~~~)/.test(ln)) { f2 = !f2; return; }
        const sec = secAt(d, i);
        if (!sec) return;
        for (const [raw] of tokensOf(ln).toks) {
          const r = resolveFile(raw, d);
          if (r && r.status === "resolved") { docCtx.push(r.hits[0]); if (!secCtx.has(sec.id)) secCtx.set(sec.id, []); secCtx.get(sec.id).push(r.hits[0]); }
        }
      });
    }
    const sliceKey = (p) => { const m = p.match(/^(backend\/app\/features\/[^/]+|technician-app\/src\/features\/[^/]+|src\/features\/[^/]+|backend\/[^/]+|technician-app\/src\/[^/]+|src\/[^/]+)\//); return m ? m[1] : path.posix.dirname(p); };
    const docDir = path.posix.dirname(d);
    const ROOTS = ["backend", "backend/app", "technician-app", "technician-app/src", "src"];
    const breakTie = (hits, secId, raw) => {
      const tries = [];
      // a path written relative to a runtime root (`tests/conftest.py` = backend/tests/conftest.py)
      const tokPath = String(raw || "").replace(/^\.\//, "").replace(/[#?].*$/, "").replace(/:\d+(?:-\d+)?$/, "");
      if (tokPath.includes("/")) tries.push(["runtime_root", (h) => (ROOTS.some((r) => h === r + "/" + tokPath) ? 1 : 0)]);
      if (docDir !== ".") tries.push(["doc_dir", (h) => (h.startsWith(docDir + "/") ? 1 : 0)]);
      const sc = secCtx.get(secId) || [];
      tries.push(["section_dir", (h) => sc.filter((f) => path.posix.dirname(f) === path.posix.dirname(h)).length]);
      tries.push(["doc_dir_cites", (h) => docCtx.filter((f) => path.posix.dirname(f) === path.posix.dirname(h)).length]);
      tries.push(["section_slice", (h) => sc.filter((f) => sliceKey(f) === sliceKey(h)).length]);
      tries.push(["doc_slice", (h) => docCtx.filter((f) => sliceKey(f) === sliceKey(h)).length]);
      for (const [how, score] of tries) {
        const s = hits.map(score);
        const mx = Math.max(...s);
        if (mx > 0 && s.filter((v) => v === mx).length === 1) return { hit: hits[s.indexOf(mx)], how };
      }
      return null;
    };
    lines.forEach((ln, i) => {
      if (/^\s*(```|~~~)/.test(ln)) { fence = !fence; return; }
      const sec = secAt(d, i);
      if (!sec) return;
      const L = i + 1;
      const citedHere = new Set();
      // gather every file-like token on the line first, so a resolved citation on the same line can
      // disambiguate a bare name (`identity/service.py`, `router.py` -> identity/router.py)
      const { toks, ticks } = tokensOf(ln);
      const resolved = toks.map(([raw, lineRef, form]) => ({ raw, lineRef, form, r: resolveFile(raw, d) })).filter((x) => x.r);
      const ctxDirs = new Set(resolved.filter((x) => x.r.status === "resolved").map((x) => path.posix.dirname(x.r.hits[0])));
      for (const x of resolved) {
        const { raw, lineRef, form } = x;
        let r = x.r;
        let ctxHow = null;
        if (r.status === "ambiguous" && ctxDirs.size) {
          const k = r.hits.filter((h) => ctxDirs.has(path.posix.dirname(h)));
          if (k.length === 1) { r = { status: "resolved_by_context", hits: k }; ctxHow = "line_dir"; }
        }
        if (r.status === "ambiguous" && r.hits.length <= AMBIG_FANOUT) {
          const b = breakTie(r.hits, sec.id, raw);
          if (b) { r = { status: "resolved_by_context", hits: [b.hit] }; ctxHow = b.how; }
        }
        inc("cites_" + r.status);
        if (ctxHow) inc("cites_context_" + ctxHow);
        if (r.status === "directory") continue;
        const lineAttr = Object.assign(lineRef ? { line: Number(lineRef) } : {}, ctxHow ? { context: ctxHow } : {});
        if (r.status === "not-in-repo" || (r.status === "ambiguous" && r.hits.length > AMBIG_FANOUT)) {
          const nm = raw.replace(/^\.\//, "");
          const mid = (r.status === "not-in-repo" ? "missing:" : "ambiguous:") + nm;
          if (!missing.has(mid)) { missing.add(mid); N.push({ id: mid, kind: r.status === "not-in-repo" ? "missing_ref" : "ambiguous_ref", path: null, name: nm, line_start: null, line_end: null, signature: r.status === "ambiguous" ? r.hits.length + " files named " + nm : null, tokens: 0 }); }
          emit({ src: sec.id, dst: mid, kind: "cites", evidence_path: d, evidence_line: L, confidence: 0.5, attrs: Object.assign({ status: r.status, form }, r.status === "ambiguous" ? { candidates: r.hits.length } : {}, lineAttr) });
          continue;
        }
        for (const h of r.hits) {
          citedHere.add(h);
          const conf = r.status === "resolved" ? 1 : r.status === "resolved_by_context" ? 0.8 : Math.round(1e4 / r.hits.length) / 1e4;
          emit({ src: sec.id, dst: "file:" + h, kind: "cites", evidence_path: d, evidence_line: L, confidence: conf, attrs: Object.assign({ status: r.status, form }, r.status === "ambiguous" ? { candidates: r.hits.length } : {}, lineAttr) });
        }
      }
      if (fence) return;
      // symbol / table / setting mentions from backticked identifiers
      for (const t of ticks) {
        if (/\.(py|tsx|ts|jsx|js|mjs|json|md|toml|ya?ml)(:\d+)?$/.test(t) || /\//.test(t)) continue;
        if (!/^[A-Za-z_][\w.:]*(\(.*\))?$/.test(t)) continue;
        const r = resolveName(t, citedHere);
        if (!r) { inc("mentions_unresolved"); continue; }
        if (!r.ids.length) { inc("mentions_skipped_" + r.skipped); continue; }
        if (r.ids.length > 5) { inc("mentions_too_ambiguous"); continue; }
        const st = r.ids.length === 1 ? "resolved" : "ambiguous";
        inc("mentions_" + st);
        for (const id of r.ids) emit({ src: sec.id, dst: id, kind: "mentions", evidence_path: d, evidence_line: L, confidence: st === "resolved" ? 0.9 : Math.round(1e4 / r.ids.length) / 1e4, attrs: { status: st, token: t.slice(0, 80) } });
      }
      for (const m of ln.matchAll(ROUTE_RE)) {
        const k = m[1] + " " + m[2].replace(/\{[^}]+\}/g, "{}").replace(/[.,;]+$/, "").replace(/\/$/, "");
        const rid = routeIdx.get(k);
        if (rid) { inc("mentions_route"); emit({ src: sec.id, dst: rid, kind: "mentions", evidence_path: d, evidence_line: L, confidence: 1, attrs: { status: "resolved", token: k } }); }
      }
      for (const m of ln.matchAll(ID_ANY)) {
        const own = docIdOwner.get(m[1]);
        if (!own) continue;
        if (own.has(d)) emit({ src: sec.id, dst: "docid:" + d + "#" + m[1], kind: "mentions", evidence_path: d, evidence_line: L, confidence: 1, attrs: { status: "resolved", token: m[1] } });
        else if (own.size === 1) emit({ src: sec.id, dst: "docid:" + [...own][0] + "#" + m[1], kind: "mentions", evidence_path: d, evidence_line: L, confidence: 0.6, attrs: { status: "cross_doc", token: m[1] } });
        else inc("docid_mentions_ambiguous");
      }
    });
  }
  // drop self-mentions of a doc id on its own defining line
  // ---- CLAUDE.md invariants ----
  const inv = [];
  const cm = texts.get("CLAUDE.md");
  if (cm) {
    const lines = cm.split("\n");
    const startI = lines.findIndex((l) => /^##\s+Invariants/.test(l));
    if (startI >= 0) {
      let endI = lines.findIndex((l, i) => i > startI && /^##\s/.test(l));
      if (endI < 0) endI = lines.length;
      let group = "(none)", groupLine = startI + 1, cur = null;
      for (let i = startI + 1; i < endI; i++) {
        const ln = lines[i];
        const h = ln.match(/^###\s+(.*)/);
        if (h) { group = h[1].trim(); groupLine = i + 1; cur = null; continue; }
        if (/^- /.test(ln)) { cur = { group, groupLine, start: i, end: i, text: ln }; inv.push(cur); continue; }
        if (cur && /^\s+\S/.test(ln)) { cur.end = i; cur.text += " " + ln.trim(); continue; }
        if (cur && !ln.trim()) continue;
        cur = null;
      }
    }
    const groups = new Map();
    inv.forEach((v, k) => {
      const id = "inv:CLAUDE.md#" + (k + 1);
      const title = (v.text.match(/^- \*\*([^*]+)\*\*/) || [null, v.text.replace(/^- /, "")])[1].trim().slice(0, 160);
      const body = lines.slice(v.start, v.end + 1).join("\n");
      N.push({ id, kind: "invariant", path: "CLAUDE.md", name: title, line_start: v.start + 1, line_end: v.end + 1, signature: v.group + ": " + title.slice(0, 200), tokens: tok(body) });
      const gid = "invgroup:CLAUDE.md#" + v.group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!groups.has(gid)) { groups.set(gid, true); N.push({ id: gid, kind: "invariant_group", path: "CLAUDE.md", name: v.group, line_start: v.groupLine, line_end: v.groupLine, signature: "### " + v.group, tokens: tok(v.group) }); }
      E.push({ src: gid, dst: id, kind: "contains", evidence_path: "CLAUDE.md", evidence_line: v.start + 1, confidence: 1, attrs: null });
      const filesHere = new Set();
      const anchors = [];
      for (const m of v.text.matchAll(/`([^`]+)`/g)) {
        // `cursor.last_seq = …` names cursor.last_seq: an assignment's right-hand side is dropped
        const t = m[1].trim().replace(/\s+=(?!=).*$/, "");
        const fm = t.match(/^([A-Za-z0-9_@.\-/]+\.(?:py|tsx|ts|jsx|js|mjs|json|md|toml|yml|yaml|sh))(?::(\d+))?/);
        if (fm) {
          const r = resolveFile(fm[1], "CLAUDE.md");
          if (r && r.hits.length) { for (const h of r.hits) filesHere.add(h); anchors.push({ t, ids: r.hits.map((h) => "file:" + h), how: "file:" + r.status }); }
          else anchors.push({ t, ids: [], how: "file:" + (r ? r.status : "none") });
          continue;
        }
        anchors.push({ t, ids: null });
      }
      for (const a of anchors) {
        if (a.ids !== null) continue;
        // `name()` marks a function: a generic one-word name is accepted when the files the bullet
        // names narrow it to one definition (`transition()` beside `jobs/service.py`)
        let r = resolveName(a.t, filesHere, { allowGeneric: /^[A-Za-z_]\w*\(\)$/.test(a.t) });
        let how = r && r.how ? "name:" + r.how : null;
        // `Owner.field` where the field is not a node (a pydantic field such as JobDetail.evidence):
        // anchor to the owner, when the owner itself resolves to one definition
        if ((!r || !r.ids.length) && /^[A-Z][A-Za-z0-9]+\.[a-z_][A-Za-z0-9_]*$/.test(a.t)) {
          const o = resolveName(a.t.split(".")[0], filesHere);
          // only a class has fields: a same-named component or screen is not the owner
          const cls = o ? o.ids.filter((id) => (nodesById.get(id) || {}).kind === "class") : [];
          if (cls.length === 1) { r = { ids: cls }; how = "name:owner_of_field"; }
        }
        if (r && r.ids.length && r.ids.length <= 4) { a.ids = r.ids; a.how = how || (r.ids.length === 1 ? "name:resolved" : "name:ambiguous"); }
        else { a.ids = []; a.how = r && r.skipped ? "name:generic" : "unresolved"; }
      }
      let anchored = 0;
      for (const a of anchors) {
        for (const dst of a.ids) {
          anchored++;
          E.push({ src: id, dst, kind: "constrains", evidence_path: "CLAUDE.md", evidence_line: v.start + 1, confidence: a.ids.length === 1 ? 1 : Math.round(1e4 / a.ids.length) / 1e4, attrs: { token: a.t.slice(0, 80), how: a.how } });
        }
        if (!a.ids.length) inc("invariant_tokens_unanchored");
      }
      inc(anchored ? "invariants_anchored" : "invariants_unanchored");
    });
    S.invariants = inv.length;
  }
  return { nodes: N, edges: E, stats: S };
}
module.exports = { runDocs };
