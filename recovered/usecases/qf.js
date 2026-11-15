// Stage 4: map call forms to plain-words question forms (QF); count calls, episodes, transcripts, tokens, waste; per work class.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out');
const CPT = JSON.parse(fs.readFileSync(path.join(OUT, 'cpt.json'), 'utf8')).median;
const EP = fs.readFileSync(path.join(OUT, 'episodes-labelled.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const T = JSON.parse(fs.readFileSync(path.join(OUT, 'transcripts.json'), 'utf8'));
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
const ID = /\b(?:[A-Z]{1,3}\d{0,2}-[A-Z]{0,2}\d{1,4}|O\d{1,2}-F\d{1,3}|[BCDFGHLR]\d{2,4}|KS-[OP]\d{1,2}|LIM-\d{2})\b/;
const CITE = /\b[\w.-]+\.(py|tsx?|jsx?|md):\d{1,5}\b|\bs\s+\S+\s+'?\d+(,\d+)?'?\s*;|for\s+(n|l)\s+in\s+\d+\s+\d+\s+\d+/;
function rangeSize(q) { let n = 0; for (const m of String(q).matchAll(/(\d+),(\d+)p/g)) n += Math.max(0, +m[2] - +m[1]); for (const m of String(q).matchAll(/NR>=(\d+)\s*&&\s*NR<=(\d+)/g)) n += Math.max(0, +m[2] - +m[1]); return n; }
function qf(c, wcls) {
  const q = strip(c.q || ''); const pat = c.n === 'Grep' ? String(c.q || '') : q; const f = c.form; const tok = c.rc / CPT;
  const docLike = ['program-doc-read', 'program-doc-search', 'program-evidence', 'product-doc', 'invariant-rule', 'search-unresolved-target', 'read-unresolved-target', 'scratch-work-files', 'prior-conclusions'];
  if (docLike.includes(f) || (c.zone2 && /doc|evidence/.test(c.zone2))) {
    if (CITE.test(q)) return 'Q-cite: does this file:line citation still say what the document claims';
    if (ID.test(pat.replace(/\S*[\/\\]\S*|\S+\.(md|txt|json|ts|py)\b/g, ' ')) && (c.k === 'look-search' || /grep|awk|Select-String/.test(q))) return 'Q-id: where is item ID X defined or cited, and what does it say';
  }
  switch (f) {
    case 'program-doc-read': case 'program-doc-search':
      if (/\^#|"\^#|'\^#|\^##/.test(pat)) return 'Q-toc: what sections does this plan/design document have (heading map)';
      return wcls === 'product' ? 'Q-phase: what is my assignment and what did the plan/design notes decide' : 'Q-doc: what does section Y of plan/design document X say';
    case 'program-evidence': return wcls === 'product' ? 'Q-phase: what is my assignment and what did the plan/design notes decide' : 'Q-prior: what did an earlier lane/round/agent find (evidence and notes)';
    case 'prior-conclusions': return 'Q-prior: what did an earlier lane/round/agent find (evidence and notes)';
    case 'scratch-work-files': return wcls === 'product' ? 'N-ops: run output, logs, job output, PR text, scratch files' : 'Q-prior: what did an earlier lane/round/agent find (evidence and notes)';
    case 'invariant-rule': return 'Q-rule: which rule in the invariants/handoff/runbook text applies here';
    case 'product-doc': return 'Q-rule: which rule in the invariants/handoff/runbook text applies here';
    case 'agent-instructions': return 'N-instr: what do my skill/agent instruction files say';
    case 'change-under-review': return 'Q-diff: what does this change set (diff, commit, PR) change';
    case 'history-of-code': case 'history-of-repo': return 'Q-hist: what changed here recently and why (log, blame, commit list)';
    case 'usages-of-symbol': return 'Q-uses: who uses, calls or references X (impact of a change)';
    case 'contract-other-half': return 'Q-contract: where is the other half of a contract (route and client, payload, key)';
    case 'tests-for-code': return 'Q-tests: which tests and fixtures exercise X, and how are they set up';
    case 'data-model': case 'setting-or-flag': return 'Q-model: what is the data model, migration or setting behind X';
    case 'build-or-ci-config': return 'Q-build: what do the build, CI, ops or lab scripts do';
    case 'definition-or-body': case 'search-in-file': return 'Q-def: where is X defined and what does its body say';
    case 'read-part-of-code': return rangeSize(q) >= 150 || tok > 4000 ? 'Q-how: how does this subsystem work now (orientation read)' : 'Q-def: where is X defined and what does its body say';
    case 'read-whole-code-file': return 'Q-how: how does this subsystem work now (orientation read)';
    case 'locate-files': return 'Q-where: which files exist here / where is the file for X';
    case 'library-internals': return 'N-lib: how does a third-party library behave (its source)';
    case 'external-docs': return 'N-web: external documentation or literature';
    case 'past-session-transcript': return 'N-trans: what happened in a past session (transcript)';
    case 'memory-notes': case 'artifact-or-session': return 'N-mem: memory notes, artifacts, session lists';
    case 'repo-state': case 'ci-or-run-status': case 'pr-or-issue-text': case 'run-log': case 'agent-or-job-output': return 'N-ops: run output, logs, job output, PR text, scratch files';
    case 'search-unresolved-target': case 'read-unresolved-target': return wcls === 'product' ? 'N-ops: run output, logs, job output, PR text, scratch files' : 'Q-prior: what did an earlier lane/round/agent find (evidence and notes)';
    default: return 'N-other: ' + f;
  }
}
const totals = {};
for (const t of T) { const k = t.cls === 'program' ? 'program' : 'product'; totals[k] = totals[k] || { transcripts: 0, ctx: 0 }; totals[k].transcripts++; totals[k].ctx += t.ctxSum; }
const agg = {}; const dup = {}; const seenGlobal = new Map(); const seenWin = new Map(); const seenPat = new Map();
EP.forEach((e, idx) => {
  const wcls = e.tcls === 'program' ? 'program' : 'product';
  for (const c of e.calls) {
    const k = qf(c, wcls); c.qf = k;
    const a = ((agg[wcls] = agg[wcls] || {})[k] = agg[wcls][k] || { calls: 0, eps: new Set(), trs: new Set(), fetch: 0, carried: 0, stepctx: 0, empty: 0, err: 0, nn: 0, named: 0, reread: 0, research: 0, dupCross: 0, dupTok: 0, maxCall: 0 });
    const tok = c.rc / CPT;
    a.calls++; a.eps.add(idx); a.trs.add(e.file); a.fetch += tok; a.carried += tok * (c.later || 0); a.stepctx += c.sctx || 0; a.maxCall = Math.max(a.maxCall, tok);
    if (c.empty && c.k !== 'look-read') a.empty++; if (c.err) a.err++;
    if (c.named === -1) a.nn++; else if (c.named > 0) a.named++;
    // same target + same range read again in the same window
    const q = strip(c.q || '');
    const key = (c.t || '') + '|' + (c.n === 'Read' ? (c.part ? 'part' : 'whole') : q.replace(/\s+/g, ' ').slice(0, 200));
    if (c.k === 'look-read' || /sed -n|cat |awk/.test(q)) {
      const w = seenWin.get(e.file + '#' + key); if (w && w.later >= c.i - w.i && c.i > w.i) a.reread++; seenWin.set(e.file + '#' + key, { i: c.i, later: c.later });
      const g = seenGlobal.get(key); if (g && g !== e.file && tok > 200) { a.dupCross++; a.dupTok += tok; } if (!g) seenGlobal.set(key, e.file);
    }
    if (c.k === 'look-search') { const pk = e.file + '#' + q.replace(/\s+/g, ' ').slice(0, 300); const w = seenPat.get(pk); if (w && w.later >= c.i - w.i && c.i > w.i) a.research++; seenPat.set(pk, { i: c.i, later: c.later }); }
  }
});
const res = {};
for (const wcls of Object.keys(agg)) {
  const rows = Object.entries(agg[wcls]).map(([k, a]) => ({ qf: k, calls: a.calls, episodes: a.eps.size, transcripts: a.trs.size, fetchTok: Math.round(a.fetch), carriedTok: Math.round(a.carried), lookupStepCtx: Math.round(a.stepctx), meanFetchPerCall: Math.round(a.fetch / a.calls), maxCall: Math.round(a.maxCall), empty: a.empty, err: a.err, neverNamedAgain: a.nn, namedAgain: a.named, rereadSameWindow: a.reread, repeatedSearchSameWindow: a.research, crossSessionDuplicateReads: a.dupCross, crossSessionDuplicateTok: Math.round(a.dupTok) }));
  rows.sort((x, y) => y.carriedTok - x.carriedTok);
  res[wcls] = { totals: totals[wcls], rows };
  const S = rows.reduce((s, r) => ({ calls: s.calls + r.calls, fetch: s.fetch + r.fetchTok, carried: s.carried + r.carriedTok, step: s.step + r.lookupStepCtx }), { calls: 0, fetch: 0, carried: 0, step: 0 });
  res[wcls].sum = S;
  console.log(`\n=== ${wcls}: transcripts ${totals[wcls].transcripts}, all context tokens ${(totals[wcls].ctx / 1e6).toFixed(0)}M; lookup calls ${S.calls}, fetched ${(S.fetch / 1e6).toFixed(2)}M, carried ${(S.carried / 1e6).toFixed(0)}M, lookup-step ctx ${(S.step / 1e6).toFixed(0)}M`);
  console.log('qf'.padEnd(12) + 'calls'.padStart(6) + 'eps'.padStart(6) + 'trs'.padStart(5) + 'fetchK'.padStart(8) + 'carriedM'.padStart(10) + 'stepM'.padStart(8) + 'mean'.padStart(6) + 'empty'.padStart(6) + 'err'.padStart(5) + 'nn%'.padStart(5) + 'rrd'.padStart(5) + 'rsrch'.padStart(6) + 'xdup'.padStart(6) + 'xdupK'.padStart(7));
  for (const r of rows) console.log(r.qf.split(':')[0].padEnd(12) + String(r.calls).padStart(6) + String(r.episodes).padStart(6) + String(r.transcripts).padStart(5) + (r.fetchTok / 1000).toFixed(0).padStart(8) + (r.carriedTok / 1e6).toFixed(1).padStart(10) + (r.lookupStepCtx / 1e6).toFixed(1).padStart(8) + String(r.meanFetchPerCall).padStart(6) + String(r.empty).padStart(6) + String(r.err).padStart(5) + String(Math.round(100 * r.neverNamedAgain / Math.max(1, r.neverNamedAgain + r.namedAgain))).padStart(5) + String(r.rereadSameWindow).padStart(5) + String(r.repeatedSearchSameWindow).padStart(6) + String(r.crossSessionDuplicateReads).padStart(6) + (r.crossSessionDuplicateTok / 1000).toFixed(0).padStart(7));
}
fs.writeFileSync(path.join(OUT, 'qf.json'), JSON.stringify(res, null, 1));
const w = fs.createWriteStream(path.join(OUT, 'episodes-qf.jsonl')); for (const e of EP) w.write(JSON.stringify(e) + '\n'); w.end();
