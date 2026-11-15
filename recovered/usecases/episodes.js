// Stage 2: classify calls, zones and transcripts; reconstruct lookup episodes; calibrate chars per token.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out');
const lines = fs.readFileSync(path.join(OUT, 'steps.jsonl'), 'utf8').split('\n').filter(Boolean);
const CODE_EXT = /\.(py|js|jsx|ts|tsx|mjs|cjs)$/i;
function relOf(p) {
  if (!p || typeof p !== 'string') return null;
  const s = p.replace(/\\/g, '/');
  const m = s.match(/EMS_workshop1(?:\/\.claude\/worktrees\/[^/]+)?\/(.*)$/i);
  if (m) return m[1];
  if (/^(backend|src|technician-app|docs|scripts|\.github|public)\//.test(s) || /^(CLAUDE\.md|ARCHITECTURE\.md|README\.md|package\.json|ops-server\.mjs|vite[\w.]*\.js)$/.test(s)) return s;
  return null;
}
function zone(r, raw) {
  if (r == null) {
    const s = String(raw || '').replace(/\\/g, '/');
    if (/\.claude\/projects\/.*memory/i.test(s)) return 'memory';
    if (/scratchpad|\/Temp\//i.test(s)) return 'scratch';
    if (/24_Clinic_Workshop|Clinic/i.test(s)) return 'testbed';
    if (/\.claude\/projects\//i.test(s)) return 'transcripts';
    return 'outside';
  }
  const low = r.toLowerCase();
  if (low.startsWith('docs/program/')) return /\.md$/.test(low) ? 'program-doc' : 'program-evidence';
  if (low === 'claude.md') return 'claude-md';
  if (/^(backend|src|technician-app)\//.test(low) || low === 'ops-server.mjs' || /^vite/.test(low)) {
    if (/(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\.|(^|\/)test_[\w]+\.py$|conftest\.py$/.test(low)) return 'test';
    if (CODE_EXT.test(low)) return 'code';
    if (/alembic\/versions\//.test(low)) return 'code';
    if (/\.md$/.test(low)) return 'product-doc';
    return 'product-config';
  }
  if (/\.md$/.test(low)) return 'product-doc';
  if (/^\.claude\//.test(low)) return 'harness-config';
  return 'product-config';
}
const PRODUCT = new Set(['code', 'test', 'product-config', 'product-doc', 'claude-md']);
const LOOKUP_SH = /(^|[|;&(\s])(grep|rg|egrep|find|ls|cat|head|tail|sed\s+-n|wc|tree|Get-Content|Select-String|Get-ChildItem|gci|type|awk|stat|du|jq|diff)\b/i;
const GIT_HIST = /\bgit\s+(-C\s+\S+\s+)?(-c\s+\S+\s+)*(log|show|blame|shortlog|rev-list|reflog|describe|name-rev|merge-base)\b/;
const GIT_STATE = /\bgit\s+(-C\s+\S+\s+)?(-c\s+\S+\s+)*(status|diff|branch|ls-files|ls-tree|rev-parse|remote|worktree\s+list|grep|cat-file|stash\s+list)\b/;
const GH_READ = /\bgh\s+(pr|issue|run|api|repo)\s+(view|list|diff|checks|status|view|api)?/;
const RUN_VERIFY = /\b(pytest|vitest|jest|npm\s+(run\s+)?(test|lint|build|typecheck|run)|npx\s+(tsc|expo|eslint|prettier|vitest|jest)|tsc\b|ruff|mypy|lint-imports|alembic|eas\s+build|gradlew|docker|uv\s+run|pip\b|node\s+--test)/i;
const ACT = /\bgit\s+(-C\s+\S+\s+)?(commit|push|checkout|switch|add|merge|rebase|reset|stash(?!\s+list)|cherry-pick|worktree\s+add|tag)\b|\bgh\s+pr\s+(create|merge|edit|comment|ready)|\brailway\b|\b(rm|mv|cp|mkdir|touch)\s|>\s*[\w"'/.]/;
function shellKind(cmd) {
  const c = String(cmd || '');
  if (/\bcat\s*>>?\s*\S|\btee\s+(-a\s+)?\S|\bsed\s+-i|\bprintf\b[^|]*>\s*["$\w/]|\becho\b[^|]*>>?\s*["$\w/]|Set-Content|Out-File|Add-Content/.test(c)) return 'edit-sh';
  if (/^\s*(until|while)\b[^;]*;\s*do\s+sleep|\bsleep\s+\d+\s*;?\s*$/.test(c) || /until\s+grep\s+-q/.test(c)) return 'wait';
  if (ACT.test(c) && !/\b2>\s*\/dev\/null|>\s*\/dev\/null|2>&1/.test(c.replace(/>\s*[\w"'/.]/, ''))) { if (/\bgit\s+(commit|push)|gh\s+pr|railway/.test(c)) return 'act'; }
  if (/\bgit\s+(commit|push)\b|\bgh\s+pr\s+(create|merge|edit|comment|ready)|\brailway\s+(up|run|redeploy|variables)/.test(c)) return 'act';
  if (RUN_VERIFY.test(c)) return 'run-verify';
  if (/\b(node|python|python3|py)\b[^|]*\.(js|py|txt)\b|python\.exe|node\s+-e|node\s+-/.test(c)) return 'run-script';
  if (GIT_HIST.test(c)) return 'look-history';
  if (GH_READ.test(c)) return 'look-gh';
  if (GIT_STATE.test(c)) return /\bgit\s+(-C\s+\S+\s+)?grep\b/.test(c) ? 'look-search' : 'look-state';
  if (/(^|[|;&(\s])(grep|rg|egrep|Select-String|findstr)\b/i.test(c)) return 'look-search';
  if (/(^|[|;&(\s])(find|ls|tree|Get-ChildItem|gci|dir)\b/i.test(c)) return 'look-list';
  if (/(^|[|;&(\s])(cat|head|tail|sed\s+-n|Get-Content|wc|awk|jq|type)\b/i.test(c)) return 'look-read';
  if (/\bcurl\b|Invoke-WebRequest/.test(c)) return 'look-net';
  return 'run-other';
}
function shellPaths(c) { return (String(c || '').match(/[\w.:\\/-]*[\\/][\w.\\/-]+\.[A-Za-z]{1,5}\b|\b[\w-]+\.(py|tsx?|jsx?|mjs|md|json|toml)\b/g) || []).slice(0, 12); }
const NEUTRAL = new Set(['TodoWrite', 'ToolSearch', 'Skill', 'mcp__ccd_turn__update_plan', 'mcp__ccd_turn__wrap_up', 'mcp__ccd_session__mark_chapter', 'ExitPlanMode', 'StructuredOutput', 'SendUserFile', 'Monitor', 'TaskOutput', 'BashOutput', 'KillShell', 'TaskStop']);
function classify(c) {
  const n = c.name, i = c.inp || {};
  if (n === 'Read') { const r = relOf(i.file_path); return { k: 'look-read', z: zone(r, i.file_path), t: r || i.file_path, part: i.offset != null || i.limit != null }; }
  if (n === 'Grep') { const r = relOf(i.path); return { k: 'look-search', z: i.path ? zone(r, i.path) : 'cwd', t: r || i.path || '.', q: i.pattern, g: i.glob || i.type, mode: i.output_mode }; }
  if (n === 'Glob') { const r = relOf(i.path); return { k: 'look-list', z: i.path ? zone(r, i.path) : 'cwd', t: r || i.path || '.', q: i.pattern }; }
  if (n === 'Edit' || n === 'Write' || n === 'MultiEdit' || n === 'NotebookEdit') { const r = relOf(i.file_path || i.notebook_path); return { k: 'edit', z: zone(r, i.file_path), t: r || i.file_path }; }
  if (n === 'Bash' || n === 'PowerShell') { const k = shellKind(i.command); const ps = shellPaths(i.command).map((p) => relOf(p) || p); const zs = ps.map((p) => zone(relOf(p) || (/^(backend|src|technician-app|docs)\//.test(p) ? p : null), p)); return { k, z: zs.find((z) => PRODUCT.has(z)) || zs[0] || 'cwd', t: ps[0] || '', q: i.command }; }
  if (n === 'Agent' || n === 'Task') return { k: 'delegate', z: '-', t: i.subagent_type || '', q: i.description || '' };
  if (n === 'WebFetch' || n === 'WebSearch') return { k: 'look-web', z: 'web', t: i.url || i.query || '' };
  if (NEUTRAL.has(n)) return { k: 'neutral', z: '-' };
  if (/^mcp__Claude_Browser|^mcp__claude-in-chrome/.test(n)) return { k: 'browser', z: '-' };
  if (n === 'Artifact') return { k: i.action === 'read' || i.action === 'list' ? 'look-artifact' : 'act', z: '-' };
  if (/ArtifactComments|ArtifactData/.test(n)) return { k: 'look-artifact', z: '-' };
  if (/mcp__ccd_session_mgmt__(search_session|get_session|list)/.test(n)) return { k: 'look-session', z: '-' };
  return { k: 'other', z: '-' };
}
const isLook = (k) => k.startsWith('look-');
// ---- calibrate chars per token on result-only steps
const ratios = [];
// ---- main pass
const T = []; // transcript summaries
const EP = [];
for (const ln of lines) {
  const tr = JSON.parse(ln);
  const S = tr.steps; const cps = new Set(tr.compact || []);
  // window id per step
  let win = 0; const winOf = []; for (let i = 0; i < S.length; i++) { if (cps.has(i)) win++; if (i > 0 && S[i - 1].ctx > 60000 && S[i].ctx < S[i - 1].ctx * 0.45) win++; winOf.push(win); }
  const laterInWin = []; for (let i = S.length - 1; i >= 0; i--) laterInWin[i] = i + 1 < S.length && winOf[i + 1] === winOf[i] ? laterInWin[i + 1] + 1 : 0;
  const ts = { file: tr.file, folder: tr.folder, sub: tr.sub, ts0: tr.ts0, steps: S.length, ctxSum: 0, edits: {}, looks: {}, lookTok: {}, prodEdits: 0 };
  for (let i = 0; i < S.length; i++) {
    const s = S[i]; ts.ctxSum += s.ctx;
    for (const c of s.calls) {
      c.cl = classify(c);
      if (c.cl.k === 'edit') { ts.edits[c.cl.z] = (ts.edits[c.cl.z] || 0) + 1; if (['code', 'test', 'product-config'].includes(c.cl.z)) ts.prodEdits++; }
      if (isLook(c.cl.k)) { ts.looks[c.cl.z] = (ts.looks[c.cl.z] || 0) + 1; ts.lookTok[c.cl.z] = (ts.lookTok[c.cl.z] || 0) + c.rc; }
    }
    if (i + 1 < S.length && s.calls.length && winOf[i + 1] === winOf[i]) {
      const rc = s.calls.reduce((a, c) => a + c.rc, 0); const d = S[i + 1].ctx - s.ctx - s.out;
      if (d > 3000 && rc > 8000) ratios.push(rc / d);
    }
  }
  const prodLook = ['code', 'test', 'product-config', 'product-doc', 'claude-md'].reduce((a, z) => a + (ts.lookTok[z] || 0), 0);
  const progLook = ['program-doc', 'program-evidence', 'memory', 'transcripts', 'testbed'].reduce((a, z) => a + (ts.lookTok[z] || 0), 0);
  const allLook = Object.values(ts.lookTok).reduce((a, b) => a + b, 0); ts.prodShare = allLook ? prodLook / allLook : 0; const progEdits = (ts.edits['program-doc'] || 0) + (ts.edits['program-evidence'] || 0) + (ts.edits.memory || 0); ts.cls = ts.prodEdits > 0 && ts.prodEdits >= progEdits ? 'product-edit' : prodLook > progLook && prodLook > 20000 && prodLook >= 0.4 * allLook ? 'product-read' : 'program';
  T.push(ts);
  // episodes
  const blob = S.map((st) => (st.text || '') + ' ' + st.calls.filter((c) => c.cl.k !== 'look-read').map((c) => JSON.stringify(c.inp)).join(' '));
  const namedLater = (c, i) => { const t = String(c.cl.t || '').replace(/\\/g, '/'); const b = t.split('/').pop(); if (!b || b.length < 4 || !/\./.test(b)) return null; for (let j = i + 1; j < S.length; j++) if (blob[j].includes(b)) return j - i; return -1; };
  let cur = null;
  const close = (endStep, endKind) => { if (cur && cur.calls.length) { cur.end = endKind; cur.endStep = endStep; EP.push(cur); } cur = null; };
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const ks = s.calls.map((c) => c.cl.k);
    const looks = s.calls.filter((c) => isLook(c.cl.k));
    const nonLook = s.calls.filter((c) => !isLook(c.cl.k) && c.cl.k !== 'neutral');
    if (!cur && looks.length) cur = { file: tr.file, folder: tr.folder, sub: tr.sub, tcls: null, ti: T.length - 1, start: i, steps: 0, ctxRead: 0, calls: [], intent: '', task: ((tr.prompts || []).filter((p) => p.at <= i).slice(-1)[0] || {}).text || '' }; if (cur && cur.task) cur.task = cur.task.slice(0, 600);
    if (cur) {
      if (looks.length) { cur.steps += nonLook.length ? 0 : 1; cur.ctxRead += nonLook.length ? 0 : s.ctx; if (!cur.intent) cur.intent = (s.text || s.think || '').slice(0, 500); if (!cur.prevText && i > 0) cur.prevText = (S[i - 1].text || '').slice(-400); }
      for (const c of looks) cur.calls.push({ i, n: c.name, k: c.cl.k, z: c.cl.z, t: c.cl.t, q: c.cl.q, g: c.cl.g, part: c.cl.part, rc: c.rc, err: c.err, empty: c.rc < 5 || /^No (matches|files) found|^No files found|^\s*$/.test(c.head || '') , later: laterInWin[i], sctx: nonLook.length ? 0 : s.ctx / looks.length, named: namedLater(c, i), head: (c.head || '').slice(0, 160), paths: c.paths });
      if (nonLook.length) { const e = nonLook[0].cl; close(i, e.k + ':' + (e.z || '') + (e.k === 'edit' ? ':' + e.t : '') ); cur && (cur = null); }
      else if (!s.calls.length) { cur.answer = (s.text || '').slice(0, 300); close(i, 'answer'); }
    }
  }
  close(S.length - 1, 'transcript-end');
}
ratios.sort((a, b) => a - b);
const cpt = ratios[Math.floor(ratios.length / 2)];
console.log('chars/token calibration: n', ratios.length, 'p25', ratios[Math.floor(ratios.length * 0.25)].toFixed(2), 'median', cpt.toFixed(2), 'p75', ratios[Math.floor(ratios.length * 0.75)].toFixed(2));
for (const e of EP) e.tcls = T[e.ti].cls;
fs.writeFileSync(path.join(OUT, 'transcripts.json'), JSON.stringify(T));
const w = fs.createWriteStream(path.join(OUT, 'episodes.jsonl'));
for (const e of EP) w.write(JSON.stringify(e) + '\n');
w.end();
const cnt = {}; for (const t of T) { const k = t.cls + (t.sub ? '/sub' : '/main'); cnt[k] = (cnt[k] || 0) + 1; }
console.log('transcripts by class', cnt);
const ec = {}; for (const e of EP) ec[e.tcls] = (ec[e.tcls] || 0) + 1; console.log('episodes by transcript class', ec, 'total', EP.length);
fs.writeFileSync(path.join(OUT, 'cpt.json'), JSON.stringify({ n: ratios.length, median: cpt, p25: ratios[Math.floor(ratios.length * 0.25)], p75: ratios[Math.floor(ratios.length * 0.75)] }));
