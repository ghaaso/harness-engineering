// Stage 3: assign a question form to every lookup call by rule; aggregate counts and tokens by form, per work class.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out');
const CPT = JSON.parse(fs.readFileSync(path.join(OUT, 'cpt.json'), 'utf8')).median; // chars per context token, measured
const EP = fs.readFileSync(path.join(OUT, 'episodes.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const files = [...new Set([...fs.readFileSync(path.join(OUT, 'files-main.txt'), 'utf8').split('\n'), ...fs.readFileSync(path.join(OUT, 'files-originmain.txt'), 'utf8').split('\n')])].filter(Boolean);
const prodFiles = files.filter((f) => /^(backend|src|technician-app|ops|scripts|\.github)\/|^[^/]+$/.test(f));
const bySuffix = new Map();
let FALLBACK_CODE = false;
for (const f of prodFiles) { const parts = f.split('/'); for (let k = 1; k <= Math.min(4, parts.length); k++) { const suf = parts.slice(-k).join('/'); if (!bySuffix.has(suf)) bySuffix.set(suf, f); } }
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
function pzone(p) {
  const s = String(p || '').replace(/\\/g, '/');
  if (/node_modules\/|site-packages\/|\.(kt|java|gradle)$/.test(s)) return 'dependency';
  if (/\.fixflow-cache|\/tasks\/[\w-]+\.output|\.log$|\/Temp\/|scratchpad/i.test(s)) return 'scratch';
  if (/\.claude\/projects\/.*memory/i.test(s)) return 'memory';
  if (/\.claude\/projects\//i.test(s)) return 'transcripts';
  if (/docs\/program\//.test(s)) return /\.md$/.test(s) ? 'program-doc' : 'program-evidence';
  if (/(^|\/)\.claude\/(agents|skills)\/|(^|\/)(agents|skills)\/[\w-]+(\/SKILL)?\.md$/.test(s)) return 'harness-instructions';
  const m = s.match(/EMS_workshop1(?:\/\.claude\/worktrees\/[^/]+)?\/(.*)$/i);
  let r = m ? m[1] : null;
  if (!r) { const parts = s.replace(/^\.\//, '').split('/'); for (let k = Math.min(4, parts.length); k >= 1; k--) { const hit = bySuffix.get(parts.slice(-k).join('/')); if (hit && (k > 1 || /\.(py|tsx?|jsx?|mjs|md|json|toml|ya?ml|sh)$/.test(s))) { r = hit; break; } } }
  if (!r && FALLBACK_CODE && /^(\.\/)?tests\/[\w.\/-]+\.py$/.test(s)) r = 'backend/' + s.replace(/^\.\//, '');
  if (!r && /^(\.\/)?(backend|src|technician-app|docs|ops|scripts|\.github|app|lib|features)\//.test(s)) r = s.replace(/^\.\//, '');
  if (!r && /^(CLAUDE|ARCHITECTURE|README|CONTRIBUTING)\.md$/.test(s)) r = s;
  if (!r && FALLBACK_CODE && /^[\w.-]+\.(tsx?|py|jsx)$/.test(s)) r = (/\.test\.|^test_/.test(s) ? 'technician-app/tests/' : 'src/') + s;
  if (!r) return /^https?:/.test(s) ? 'web' : 'unknown';
  if (/^ops\/|\.sh$/.test(r)) return 'config';
  if (/^(app|lib|features)\//.test(r)) r = (/\.py$/.test(r) ? 'backend/' : 'technician-app/src/') + r;
  const low = r.toLowerCase();
  if (/^(backend|src|technician-app)(\/[\w.-]+)*\/?$/.test(low) && !/\.\w{1,5}$/.test(low)) return /(^|\/)(tests?|__tests__)$/.test(low) ? 'test' : 'code';
  if (/^docs\/?$/.test(low)) return 'product-doc';
  if (low === 'claude.md') return 'rule-doc';
  if (/^docs\/.*\.md$|^[^/]+\.md$|^(backend|technician-app)\/[^/]+\.md$/.test(low)) return 'product-doc';
  if (/(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\.|(^|\/)test_\w+\.py$|conftest\.py$/.test(low)) return 'test';
  if (/alembic\/versions\/|models\.py$/.test(low)) return 'schema';
  if (/\.(py|tsx?|jsx?|mjs|cjs)$/.test(low) && /^(backend|src|technician-app|ops-server)/.test(low)) return 'code';
  return 'config';
}
function pathsIn(cmd) { return (cmd.match(/("[^"]+"|'[^']+'|[^\s;|&<>()]+)/g) || []).map((t) => t.replace(/^["']|["']$/g, '')).filter((t) => /[\w-]\.[A-Za-z]{1,5}$|\/$|^(backend|src|technician-app|docs)\b/.test(t) && !/^-/.test(t)); }
const ZRANK = ['code', 'schema', 'test', 'rule-doc', 'product-doc', 'config', 'dependency', 'harness-instructions', 'program-doc', 'program-evidence', 'memory', 'transcripts', 'scratch', 'web', 'unknown'];
function byResult(c) { const zs = (c.paths || []).map(pzone).filter((z) => z !== 'unknown'); if (!zs.length) return null; const n = {}; for (const z of zs) n[z] = (n[z] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; }
function callZone(c) {
  if (c.n === 'WebFetch' || c.n === 'WebSearch') return 'web';
  if (c.n === 'Read' || c.n === 'Grep' || c.n === 'Glob') { const z = pzone(c.t); if (z !== 'unknown') return z; if (c.n === 'Read') return 'unknown'; return byResult(c) || (/\.(py|tsx?|jsx?)\b|\b(py|ts|js)\b/.test(String(c.g || '')) ? 'code' : 'repo-wide'); }
  const q = strip(c.q); const zs = pathsIn(q).map(pzone).filter((z) => z !== 'unknown');
  if (!zs.length) return /\bgit\b|\bgh\b/.test(q) ? 'git' : byResult(c) || 'repo-wide';
  zs.sort((a, b) => ZRANK.indexOf(a) - ZRANK.indexOf(b)); return zs[0];
}
const DEF = /\b(def|class|function|interface|type|const|enum)\s+\w|export\s+(default\s+)?(async\s+)?(function|const|class|type|interface)|\bdef |async def/;
const CONTRACT = /\/api\/|@router|APIRouter|\bfetch\(|apiFetch|jobsApi|axios|response_model|endpoint|\broute\b|calls_url|\bURL\b|\.(get|post|put|patch|delete)\(\s*["'`]\//i;
const SETTING = /settings\.|FIXFLOW_|EXPO_PUBLIC_|os\.environ|getenv|process\.env|import\.meta\.env|shop_setting|enable_\w+|\w+_enabled\b/;
const SCHEMA = /__tablename__|Column\(|ForeignKey|mapped_column|op\.(add_column|create_table|create_index|execute)|alembic|revision|down_revision|\bCHECK\b|unique|index=/i;
function form(c, z) {
  const q = strip(c.q || ''); const pat = c.n === 'Grep' ? String(c.q || '') : q;
  if (z === 'web') return 'external-docs';
  if (c.k === 'look-gh') return /\bpr\s+(diff|view)/.test(q) && /diff|files/.test(q) ? 'change-under-review' : /\brun\b|checks/.test(q) ? 'ci-or-run-status' : 'pr-or-issue-text';
  if (c.k === 'look-history') { if (/\bgit\s+(-C\s+\S+\s+)?show\s+[\w~^]+:/.test(q)) return 'change-under-review'; if (/\bblame\b/.test(q) || (/\blog\b/.test(q) && /\s--\s|\s-L|--follow|\.(py|tsx?|jsx?|md)\b/.test(q))) return 'history-of-code'; if (/\bshow\b/.test(q) && !/--stat|--name/.test(q)) return 'change-under-review'; return 'history-of-repo'; }
  if (c.k === 'look-state') { if (/\bgit\s+(-C\s+\S+\s+)?diff\b/.test(q) && !/--stat|--name-only|--quiet/.test(q)) return 'change-under-review'; return 'repo-state'; }
  if (c.k === 'look-net') return 'live-service-state';
  if (c.k === 'look-artifact' || c.k === 'look-session') return 'artifact-or-session';
  if (z === 'scratch') { const all = (c.t || '') + ' ' + q; if (/handoff|reviews?\/|verdict|report|findings|refute|critic|audit/i.test(all)) return 'prior-conclusions'; if (/\/tasks\/[\w-]+\.output|\.output\b|tool-results/.test(all)) return 'agent-or-job-output'; if (/\.log\b|tail\s|gate|ci-|pytest|jest|lab\//i.test(all)) return 'run-log'; return 'scratch-work-files'; }
  if (z === 'transcripts') return 'past-session-transcript';
  if (z === 'memory') return 'memory-notes';
  if (z === 'program-doc') return /\b(grep|rg)\b|Select-String/.test(q) || c.n === 'Grep' ? 'program-doc-search' : 'program-doc-read';
  if (z === 'program-evidence') return 'program-evidence';
  if (z === 'harness-instructions') return 'agent-instructions';
  if (z === 'rule-doc') return 'invariant-rule';
  if (z === 'product-doc') return 'product-doc';
  if (z === 'dependency') return 'library-internals';
  if (c.k === 'look-list') return 'locate-files';
  if (!['code', 'schema', 'test', 'config'].includes(z)) { if (c.k === 'look-search') return 'search-unresolved-target'; if (c.k === 'look-list') return 'locate-files'; return 'read-unresolved-target'; }
  // code-side forms
  const isSearch = c.k === 'look-search';
  if (isSearch && CONTRACT.test(pat)) return 'contract-other-half';
  if (isSearch && SETTING.test(pat)) return 'setting-or-flag';
  if ((z === 'schema') || (isSearch && SCHEMA.test(pat))) return isSearch || c.part ? 'data-model' : 'data-model';
  if (z === 'test') return 'tests-for-code';
  if (z === 'config') return 'build-or-ci-config';
  if (isSearch) {
    if (DEF.test(pat) || /-A\s*\d+|-B\s*\d+|-C\s*\d+/.test(q) && !/\s-r|grep\s+-\w*r/.test(q)) return 'definition-or-body';
    if (/\s-\w*r|\brg\b|git\s+grep/.test(q) || (c.n === 'Grep' && !/\.\w{1,4}$/.test(String(c.t || '')))) return 'usages-of-symbol';
    return 'search-in-file';
  }
  if (c.k === 'look-read') return c.part || /sed\s+-n|head\s+-|tail\s+-|awk\s+'NR/.test(q) ? 'read-part-of-code' : 'read-whole-code-file';
  return 'other';
}
const PRODUCT_Z = new Set(['code', 'schema', 'test', 'rule-doc', 'product-doc', 'config', 'dependency', 'repo-wide', 'git']);
const agg = {}; const add = (k, f, v) => { const a = (agg[k] = agg[k] || {}); const r = (a[f] = a[f] || { calls: 0, eps: new Set(), fetch: 0, carried: 0, stepctx: 0, empty: 0, err: 0, notNamed: 0, reread: 0, big: 0 }); r.calls++; r.eps.add(v.ep); r.fetch += v.fetch; r.carried += v.carried; r.stepctx += v.sctx; r.empty += v.empty; r.err += v.err; r.notNamed += v.notNamed; r.reread += v.reread; r.big += v.big; };
const labelled = [];
const seenRead = new Map();
EP.forEach((e, idx) => {
  const wcls = e.tcls === 'program' ? 'program' : 'product';
  FALLBACK_CODE = wcls === 'product';
  for (const c of e.calls) {
    const z = callZone(c); const f = form(c, z); c.form = f; c.zone2 = z;
    const fetch = c.rc / CPT; const carried = fetch * (c.later || 0);
    // re-read: same transcript, same target, same window, seen before
    let reread = 0; if (c.k === 'look-read' && c.t) { const key = e.file + '|' + c.t + '|' + (c.part ? 'p' : 'w'); const prev = seenRead.get(key); if (prev && prev.later >= (c.i - prev.i) && c.i > prev.i) reread = 1; seenRead.set(key, { i: c.i, later: c.later }); }
    const v = { ep: idx, fetch, carried, sctx: c.sctx || 0, empty: c.empty && c.k !== 'look-read' ? 1 : 0, err: c.err ? 1 : 0, notNamed: c.named === -1 ? 1 : 0, reread, big: fetch > 5000 ? 1 : 0 };
    add(wcls, f, v); add(wcls + '|zone', z, v); add('ALL', f, v);
  }
  e.forms = [...new Set(e.calls.map((c) => c.form))];
  labelled.push(e);
});
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const out = {};
for (const k of Object.keys(agg)) {
  const rows = Object.entries(agg[k]).map(([f, r]) => ({ form: f, calls: r.calls, episodes: r.eps.size, fetchTok: Math.round(r.fetch), carriedTok: Math.round(r.carried), lookupStepCtx: Math.round(r.stepctx), emptySearch: r.empty, errors: r.err, readNeverNamedAgain: r.notNamed, rereadSameWindow: r.reread, over5kTok: r.big }));
  rows.sort((a, b) => b.carriedTok + b.lookupStepCtx - (a.carriedTok + a.lookupStepCtx));
  out[k] = rows;
  console.log('\n== ' + k);
  console.log('form'.padEnd(26) + 'calls'.padStart(7) + 'eps'.padStart(6) + 'fetched'.padStart(11) + 'carried'.padStart(14) + 'stepCtx'.padStart(14) + 'empty'.padStart(7) + 'err'.padStart(5) + 'unnamed'.padStart(8) + 'reread'.padStart(7) + '>5k'.padStart(5));
  for (const r of rows) console.log(r.form.padEnd(26) + String(r.calls).padStart(7) + String(r.episodes).padStart(6) + fmt(r.fetchTok).padStart(11) + fmt(r.carriedTok).padStart(14) + fmt(r.lookupStepCtx).padStart(14) + String(r.emptySearch).padStart(7) + String(r.errors).padStart(5) + String(r.readNeverNamedAgain).padStart(8) + String(r.rereadSameWindow).padStart(7) + String(r.over5kTok).padStart(5));
}
fs.writeFileSync(path.join(OUT, 'forms.json'), JSON.stringify(out, null, 1));
const w = fs.createWriteStream(path.join(OUT, 'episodes-labelled.jsonl')); for (const e of labelled) w.write(JSON.stringify(e) + '\n'); w.end();
