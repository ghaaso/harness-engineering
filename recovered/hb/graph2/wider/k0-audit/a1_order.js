'use strict';
// Audit check 1: snapshot order. Independent of k0/chain.js and k0/tree.js: builds the commit parent map
// from one `git rev-list --parents --all` (read-only), walks first parents itself, and compares with
// k0/data/tree.json and k0/data/chain.json. Then checks the replay's processing order (k0/replay.js DFS
// as logged in out/final1/lookups_tree.jsonl.gz) never uses a snapshot before its tree parent, and that
// each main-chain lane's predecessor is processed before it.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const BUILD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const K0 = path.resolve(__dirname, '..', 'k0');
const FACTS = path.join(BUILD, 'facts', 'cache');
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { maxBuffer: 1 << 28 }).toString();
const out = {};

// parent map of every reachable commit, plus committer time
const par = new Map(); const time = new Map();
for (const l of git('log', '--all', '--format=%H %ct %P').split('\n')) {
  if (!l) continue; const [h, t, ...ps] = l.split(' '); par.set(h, ps); time.set(h, Number(t));
}
const snaps = fs.readdirSync(FACTS).filter((d) => fs.existsSync(path.join(FACTS, d, 'meta.json')));
out.n_snapshots = snaps.length;
const S = new Set(snaps);
// meta sanity: directory name is a commit; meta's commit time matches git
let notCommit = 0; let timeMismatch = 0; const evs = new Set(); const metaKeys = new Set();
for (const s of snaps) {
  const m = JSON.parse(fs.readFileSync(path.join(FACTS, s, 'meta.json'), 'utf8'));
  Object.keys(m).forEach((k) => metaKeys.add(k));
  evs.add(m.extractor_version);
  if (!par.has(s)) notCommit++;
  else if (m.commit_time != null && Number(m.commit_time) !== time.get(s)) timeMismatch++;
  if (m.commit && m.commit !== s) out.meta_commit_mismatch = (out.meta_commit_mismatch || 0) + 1;
}
Object.assign(out, { not_reachable_commit: notCommit, meta_time_mismatch_vs_committer_time: timeMismatch, extractor_versions: [...evs], meta_keys: [...metaKeys] });

// my tree: nearest snapshot on the own first-parent chain
const mine = {};
for (const s of snaps) {
  let c = par.get(s)[0]; let g = 1;
  while (c && !S.has(c)) { c = (par.get(c) || [])[0]; g++; }
  mine[s] = c ? { parent: c, gap: g } : { parent: null, gap: null };
}
const tree = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'tree.json'), 'utf8'));
let same = 0; const diff = [];
for (const s of snaps) { const t = tree.nodes[s]; if (t && t.parent === mine[s].parent && t.gap === mine[s].gap) same++; else diff.push({ s, mine: mine[s], k0: t && { parent: t.parent, gap: t.gap } }); }
out.tree_parent_and_gap_agree = same; out.tree_diffs = diff.slice(0, 5);
const roots = snaps.filter((s) => !mine[s].parent); out.roots = roots;
// each tree edge: parent is an ancestor (merge-base --is-ancestor), parent committer time <= child
let anc = 0; let timeBack = 0; const tb = [];
for (const s of snaps) {
  const p = mine[s].parent; if (!p) continue;
  try { execFileSync('git', ['-C', REPO, 'merge-base', '--is-ancestor', p, s]); anc++; } catch (e) { /* not ancestor */ }
  if (time.get(p) > time.get(s)) { timeBack++; tb.push({ p: p.slice(0, 10), s: s.slice(0, 10), dt_s: time.get(s) - time.get(p) }); }
}
out.tree_edges_parent_is_ancestor = anc; out.tree_edges_committer_time_goes_back = timeBack; out.time_back_examples = tb.slice(0, 5);

// main chain: first-parent walk from chain.json's main
const chain = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'chain.json'), 'utf8'));
const fp = []; for (let c = chain.main; c; c = (par.get(c) || [])[0]) fp.push(c); fp.reverse();
const fpi = new Map(fp.map((c, i) => [c, i]));
out.chain_main = chain.main; out.current_main = git('rev-parse', 'main').trim();
out.chain_main_on_current_main_fp = (() => { for (let c = out.current_main; c; c = (par.get(c) || [])[0]) if (c === chain.main) return true; return false; })();
out.my_fp_len = fp.length; out.k0_fp_len = chain.fp_len;
const onMain = snaps.filter((s) => fpi.has(s)).sort((a, b) => fpi.get(a) - fpi.get(b));
out.on_main = onMain.length;
out.k0_main_order_agrees = JSON.stringify(onMain) === JSON.stringify(chain.snapshots.map((x) => x.sha));
// every main-chain snapshot's tree parent is the previous main-chain snapshot
let mp = 0; for (let i = 1; i < onMain.length; i++) if (mine[onMain[i]].parent === onMain[i - 1]) mp++;
out.main_tree_parent_is_previous_main_snapshot = mp + ' of ' + (onMain.length - 1);
// side-branch snapshots: are they merged into chain.main?
let merged = 0; for (const s of snaps) if (!fpi.has(s)) { try { execFileSync('git', ['-C', REPO, 'merge-base', '--is-ancestor', s, chain.main]); merged++; } catch (e) { /* no */ } }
out.off_chain_ancestor_of_main = merged + ' of ' + (snaps.length - onMain.length);

// replay processing order from the per-lookup log: first appearance of each snapshot prefix
const rows = zlib.gunzipSync(fs.readFileSync(path.join(K0, 'out', 'final1', 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean);
const pref = new Map(snaps.map((s) => [s.slice(0, 10), s]));
out.prefix_unique = pref.size === snaps.length;
const firstAt = new Map(); const lastAt = new Map();
rows.forEach((l, i) => { const r = JSON.parse(l); const s = pref.get(r.s); if (!firstAt.has(s)) firstAt.set(s, i); lastAt.set(s, i); });
out.snapshots_in_log = firstAt.size;
let contiguous = 0; let before = 0; let checked = 0; const viol = [];
const seq = [...firstAt.keys()].sort((a, b) => firstAt.get(a) - firstAt.get(b));
for (let i = 0; i < seq.length; i++) { const s = seq[i]; if (i + 1 < seq.length && lastAt.get(s) < firstAt.get(seq[i + 1])) contiguous++; }
for (const s of seq) { const p = mine[s].parent; if (!p) continue; let a = p; while (a && !firstAt.has(a)) a = mine[a].parent; if (!a) continue; checked++; if (lastAt.get(a) < firstAt.get(s)) before++; else viol.push(s); }
out.log_blocks_contiguous = contiguous + ' of ' + (seq.length - 1);
out.log_nearest_logged_ancestor_before_child = before + ' of ' + checked; out.order_violations = viol.slice(0, 5);
// the replay's DFS order (recomputed from my tree) and the main lanes' predecessors
const kids = {}; for (const s of snaps) kids[s] = []; for (const s of snaps) if (mine[s].parent) kids[mine[s].parent].push(s);
const order = []; (function dfs(s) { order.push(s); for (const c of kids[s].slice().sort()) dfs(c); })(roots[0]);
const pos = new Map(order.map((s, i) => [s, i]));
out.dfs_covers = order.length;
for (const k of [1, 2, 4, 8]) { const L = onMain.filter((_, i) => i % k === 0); let ok = 0; for (let i = 1; i < L.length; i++) if (pos.get(L[i - 1]) < pos.get(L[i])) ok++; out['main_s' + k + '_pred_processed_first'] = ok + ' of ' + (L.length - 1); }
// gap histogram on my tree
const gh = {}; for (const s of snaps) if (mine[s].gap) gh[mine[s].gap] = (gh[mine[s].gap] || 0) + 1; out.gap_hist = gh;
out.branch_points = snaps.filter((s) => kids[s].length > 1).length;
fs.writeFileSync(path.join(__dirname, 'a1_order.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'mytree.json'), JSON.stringify({ mine, order, onMain }, null, 0));
console.log(JSON.stringify(out, null, 1));
