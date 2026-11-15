'use strict';
// Preflight check 4, step 3: can the search arm see text of a removed file? For each variant task, the
// search arm is opened (arms/search/arm.js, through the shared registry) on the graph without and with
// the removal. For each removed path: present in the tree without removal; absent with it; a line of
// that file that occurs in no other file of the tree (the longest such line) is grepped over the whole
// tree (all files, not only code) and with the arm's own grep; and the BM25 index is checked.
// usage (in graphtest:1): node probe_search.js <variants.jsonl> <out.json>
const fs = require('fs');
const { graphFor, openArm } = require('/build/arms/common/arms.js');
const V = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
(async () => {
  const rows = [];
  for (const t of V) {
    const G0 = graphFor(t.parent, []);
    const a0 = await openArm('search', G0);
    const G1 = graphFor(t.parent, t.remove_paths);
    const a1 = await openArm('search', G1);
    for (const p of t.remove_paths) {
      const c0 = a0.raw.ctx; const c1 = a1.raw.ctx;
      const text = c0.files.get(p);
      const r = { id: t.id, path: p, in_tree_without_removal: c0.files.has(p), in_tree_with_removal: c1.files.has(p), in_lines_with_removal: c1.lines.has(p) };
      if (text) {
        const others = new Set();
        for (const [q, s] of c0.files) if (q !== p) for (const l of s.split('\n')) others.add(l.trim());
        const cands = text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 20 && !others.has(l)).sort((x, y) => y.length - x.length);
        let probe = null;
        for (const l of cands.slice(0, 50)) { let n = 0; for (const [, s] of c0.files) if (s.includes(l)) n++; if (n === 1) { probe = l; break; } }
        r.probe_len = probe ? probe.length : 0;
        if (probe) {
          const re = new RegExp(esc(probe));
          let anyFile1 = 0; for (const [, s] of c1.files) if (re.test(s)) anyFile1++;
          let anyFile0 = 0; for (const [, s] of c0.files) if (re.test(s)) anyFile0++;
          r.files_with_probe_without_removal = anyFile0; r.files_with_probe_with_removal = anyFile1;
          r.arm_grep_hits_with_removal = c1.grep(re).length; r.arm_grep_hits_without_removal = c0.grep(re).length;
        }
        r.bm25_doc_with_removal = c1.bm25().docs.has(p); r.bm25_doc_without_removal = c0.bm25().docs.has(p);
      }
      rows.push(r);
    }
    await a0.close(); await a1.close();
  }
  const bad = rows.filter((r) => !r.in_tree_without_removal || r.in_tree_with_removal || r.in_lines_with_removal || r.files_with_probe_with_removal || r.arm_grep_hits_with_removal || r.bm25_doc_with_removal);
  const out = { rows, removed_paths: rows.length, failures: bad.length,
    code_probes_found_without_removal: rows.filter((r) => r.arm_grep_hits_without_removal > 0).length };
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ removed_paths: out.removed_paths, failures: out.failures, code_probes_found_without_removal: out.code_probes_found_without_removal }));
})().catch((e) => { console.error(e); process.exit(2); });
