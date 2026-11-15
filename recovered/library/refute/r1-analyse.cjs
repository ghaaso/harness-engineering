// R1 refuter: analyses over r1-extract output. Read-only.
// Usage: node r1-analyse.cjs <calls.jsonl> [excludeSessionPrefix]
const fs = require('fs');
const [inF, excl] = process.argv.slice(2);
let calls = fs.readFileSync(inF, 'utf8').trim().split('\n').map(JSON.parse);
if (excl) calls = calls.filter(c => !c.win.startsWith(excl));
const pct = x => (100 * x).toFixed(1) + '%';

// ---------- 1. classifiers ----------
const LOOK_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch', 'NotebookRead']);
const RV = /^(cat|sed\s+-n|head|tail|nl|grep|rg|egrep|fgrep|ls|dir|find|wc|awk|sort|uniq|cut|tr|echo|printf|pwd|stat|file|tree|type|jq|du|df|diff|cmp|basename|dirname|realpath|readlink|which|where|test|\[|true|date|env|printenv|sha256sum|md5sum|od|xxd|column|comm|paste|tac|rev|fold|less|more|xargs|for|do|done|while|if|then|fi|else|git\s+(-C\s+\S+\s+)?(-c\s+\S+\s+)*(log|show|diff|status|blame|ls-files|grep|rev-parse|branch|cat-file|ls-tree|describe|reflog|shortlog|merge-base|name-rev|for-each-ref|rev-list|remote|tag\s+-l|config\s+--get|whatchanged|count-objects)|gh\s+(pr|issue|run|repo|release)\s+(view|list|diff|checks|status)|gh\s+api|Get-Content|gc|Select-String|Get-ChildItem|gci|Test-Path|Measure-Object|Select-Object|Where-Object|ForEach-Object|Format-\w+|Sort-Object|Get-Item|Resolve-Path|Split-Path|Join-Path|Write-Output|Out-String|cd|Set-Location)\b/i;
const WRITE = /\bsed\s+-i\b|\btee\b|(^|[^0-9&>2])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython3?\b|\bdocker\b|\btouch\b|\bchmod\b|Set-Content|Out-File|New-Item|Remove-Item|Copy-Item|Move-Item|\bgit\s+(-C\s+\S+\s+)?(commit|push|merge|checkout|add|rebase|reset|worktree|stash|cherry|switch|restore|clean|pull|fetch|clone|apply|am|rm|mv|tag\s+[^-])/i;
function shellParts(cmd) { return String(cmd).split(/\s*(?:&&|\|\||;|\||\n)\s*/).map(s => s.trim()).filter(Boolean); }
function strictCmd(cmd) { if (WRITE.test(cmd)) return false; const ps = shellParts(cmd); return ps.length > 0 && ps.every(p => RV.test(p) || /^2>\/dev\/null$/.test(p) || /^\$?\w+=/.test(p)); }
function looseCmd(cmd) { return !WRITE.test(cmd); }
function isLook(c, mode) {
  if (!c.tools.length) return false;
  return c.tools.every(t => LOOK_TOOLS.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && (mode === 'strict' ? strictCmd(t.cmd) : looseCmd(t.cmd))));
}
for (const c of calls) { c.ls = isLook(c, 'strict'); c.ll = isLook(c, 'loose'); }
const T = calls.reduce((a, c) => a + c.ctx, 0);
const res = {};
res.calls = calls.length; res.tokensBn = +(T / 1e9).toFixed(3);
res.lookStrict = { callShare: pct(calls.filter(c => c.ls).length / calls.length), tokShare: pct(calls.filter(c => c.ls).reduce((a, c) => a + c.ctx, 0) / T) };
res.lookLoose = { callShare: pct(calls.filter(c => c.ll).length / calls.length), tokShare: pct(calls.filter(c => c.ll).reduce((a, c) => a + c.ctx, 0) / T) };
// what the loose classifier adds over strict: first verb of the first non-cd part, token weighted
const addv = new Map(); let addT = 0;
for (const c of calls) if (c.ll && !c.ls) {
  addT += c.ctx;
  for (const t of c.tools) if (t.cmd && !strictCmd(t.cmd)) {
    const ps = shellParts(t.cmd).filter(p => !/^cd\b|^Set-Location/i.test(p));
    const bad = ps.find(p => !(RV.test(p) || /^2>\/dev\/null$/.test(p) || /^\$?\w+=/.test(p))) || ps[0] || '';
    const v = bad.split(/\s+/).slice(0, 2).join(' ').slice(0, 30);
    addv.set(v, (addv.get(v) || 0) + c.ctx / c.tools.length);
  }
}
res.looseOnly = { tokShareOfAll: pct(addT / T), topVerbs: [...addv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => k + ' ' + pct(v / T)) };

// ---------- 2. windows ----------
const W = new Map();
for (const c of calls) {
  let w = W.get(c.win); if (!w) { w = { id: c.win, sess: c.win.split('/')[0], role: c.role, start: c.ts, end: c.ts, T: 0, reads: [] }; W.set(c.win, w); }
  if (c.ts) { w.start = Math.min(w.start || c.ts, c.ts); w.end = Math.max(w.end || c.ts, c.ts); }
  w.T += c.ctx;
}
// read events
const R = [];
for (const c of calls) for (const t of c.tools) if (t.rp && t.rp.length) for (const p of t.rp) R.push({ w: c.win, p, ts: c.ts, ch: t.ch / t.rp.length });
for (const r of R) W.get(r.w).reads.push(r);
R.sort((a, b) => a.ts - b.ts);
// 2a file-level repeat share of read chars
function fileRepeat(filterEarlier) {
  const firstBy = new Map(); // path -> list of {w, ts, sess, end}
  let all = 0, rep = 0; const perWin = new Map();
  for (const r of R) {
    const w = W.get(r.w); const lst = firstBy.get(r.p) || [];
    const hit = lst.some(e => e.w !== r.w && filterEarlier(e, r, w));
    all += r.ch; if (hit) rep += r.ch;
    const pw = perWin.get(r.w) || { all: 0, rep: 0 }; pw.all += r.ch; if (hit) pw.rep += r.ch; perWin.set(r.w, pw);
    lst.push({ w: r.w, ts: r.ts, sess: w.sess, end: w.end }); firstBy.set(r.p, lst);
  }
  const out = { charShare: pct(rep / all) };
  for (const role of ['main', 'sub']) {
    let tw = 0, acc = 0, a2 = 0, r2 = 0;
    for (const [id, pw] of perWin) { const w = W.get(id); if (w.role !== role) continue; tw += w.T; acc += w.T * pw.rep / pw.all; a2 += pw.all; r2 += pw.rep; }
    out[role] = { charShare: pct(r2 / a2), winTokWeighted: pct(acc / tw) };
  }
  return out;
}
res.fileRepeat_anyEarlierWindow = fileRepeat(() => true);
res.fileRepeat_otherSession = fileRepeat((e, r, w) => e.sess !== w.sess);
res.fileRepeat_earlierWindowFinished = fileRepeat((e, r, w) => e.end <= r.ts);

// 2b window-level question proxies (read sets), earlier = started before; also 'finished before start'
const wins = [...W.values()].filter(w => w.reads.length).sort((a, b) => a.start - b.start);
const tokAllRole = { main: 0, sub: 0 }; for (const w of W.values()) tokAllRole[w.role] += w.T;
const tokReadRole = { main: 0, sub: 0 }; for (const w of wins) tokReadRole[w.role] += w.T;
function winProxy(needFinished) {
  const seen = []; const acc = { main: { j50: 0, c50: 0, c80: 0, c100: 0 }, sub: { j50: 0, c50: 0, c80: 0, c100: 0 } };
  for (const w of wins) {
    const P = new Set(w.reads.map(r => r.p));
    let bj = 0, bc = 0;
    for (const s of seen) {
      if (needFinished && s.end > w.start) continue;
      let k = 0; for (const p of P) if (s.P.has(p)) k++;
      const j = k / (P.size + s.P.size - k), cc = k / P.size;
      if (j > bj) bj = j; if (cc > bc) bc = cc;
    }
    const A = acc[w.role];
    if (bj >= 0.5) A.j50 += w.T; if (bc >= 0.5) A.c50 += w.T; if (bc >= 0.8) A.c80 += w.T; if (bc >= 1) A.c100 += w.T;
    seen.push({ P, end: w.end });
  }
  const o = {};
  for (const role of ['main', 'sub']) { const A = acc[role], d = tokReadRole[role]; o[role] = { jaccard50: pct(A.j50 / d), contain50: pct(A.c50 / d), contain80: pct(A.c80 / d), contain100: pct(A.c100 / d) }; }
  const all = tokReadRole.main + tokReadRole.sub;
  o.all = { jaccard50: pct((acc.main.j50 + acc.sub.j50) / all), contain80: pct((acc.main.c80 + acc.sub.c80) / all), contain100: pct((acc.main.c100 + acc.sub.c100) / all) };
  return o;
}
res.roleTokShare = { main: pct(tokAllRole.main / T), sub: pct(tokAllRole.sub / T), windowsWithReadsTokShare: pct((tokReadRole.main + tokReadRole.sub) / T) };
res.windowProxy_startedBefore = winProxy(false);
res.windowProxy_finishedBefore = winProxy(true);

// ---------- 3. run-level proxies (the unit the library would skip) ----------
function runs(mode) {
  const byWin = new Map(); for (const c of calls) { const l = byWin.get(c.win) || []; l.push(c); byWin.set(c.win, l); }
  const out = [];
  for (const [id, lst] of byWin) {
    let run = null;
    for (const c of lst) {
      const lk = mode === 'strict' ? c.ls : c.ll;
      if (lk) { if (!run) run = { win: id, ts: c.ts, tok: 0, n: 0, P: new Set(), greps: 0 }; run.tok += c.ctx; run.n++; for (const t of c.tools) { for (const p of (t.rp || [])) run.P.add(p); if (t.n === 'Grep' || t.n === 'Glob') run.greps++; } }
      else if (run) { out.push(run); run = null; }
    }
    if (run) out.push(run);
  }
  return out.sort((a, b) => a.ts - b.ts);
}
function runProxy(mode) {
  const rs = runs(mode); const totRun = rs.reduce((a, r) => a + r.tok, 0);
  // reference sets: earlier finished windows' read sets (by end time) and earlier runs' sets
  const winList = [...W.values()].filter(w => w.reads.length).map(w => ({ P: new Set(w.reads.map(r => r.p)), end: w.end, id: w.id }));
  const prevRuns = [];
  let multiTok = 0, multiC80w = 0, multiC80r = 0; let noRead = 0, c80w = 0, c100w = 0, c80r = 0, c100r = 0, anyFile = 0;
  const everRead = new Map(); // path -> first ts
  for (const r of R) if (!everRead.has(r.p)) everRead.set(r.p, r.ts);
  for (const r of rs) {
    if (!r.P.size) { noRead += r.tok; prevRuns.push(r); continue; }
    let bw = 0;
    for (const w of winList) { if (w.id === r.win || w.end > r.ts) continue; let k = 0; for (const p of r.P) if (w.P.has(p)) k++; const cc = k / r.P.size; if (cc > bw) bw = cc; }
    let br = 0;
    for (const q of prevRuns) { if (q.win === r.win || !q.P.size) continue; let k = 0; for (const p of r.P) if (q.P.has(p)) k++; const cc = k / r.P.size; if (cc > br) br = cc; }
    let seenAll = true; for (const p of r.P) { const f = everRead.get(p); if (!(f < r.ts)) { seenAll = false; break; } }
    if (r.P.size >= 2) { multiTok += r.tok; if (bw >= 0.8) multiC80w += r.tok; if (br >= 0.8) multiC80r += r.tok; } if (bw >= 0.8) c80w += r.tok; if (bw >= 1) c100w += r.tok; if (br >= 0.8) c80r += r.tok; if (br >= 1) c100r += r.tok; if (seenAll) anyFile += r.tok;
    prevRuns.push(r);
  }
  return { runs: rs.length, runTokShareOfAll: pct(totRun / T), noFileReadRuns: pct(noRead / totRun),
    ofRunTokens: { allFilesReadBeforeAnywhere: pct(anyFile / totRun), containedInOneEarlierFinishedWindow80: pct(c80w / totRun), containedInOneEarlierFinishedWindow100: pct(c100w / totRun), containedInOneEarlierRun80: pct(c80r / totRun), containedInOneEarlierRun100: pct(c100r / totRun) },
    asShareOfAllTokens: { containedWin80: pct(c80w / T), containedRun80: pct(c80r / T) }, multiFileRuns: { shareOfRunTokens: pct(multiTok / totRun), containedWin80_ofRunTokens: pct(multiC80w / totRun), containedRun80_ofRunTokens: pct(multiC80r / totRun) } };
}
res.runProxy_loose = runProxy('loose');
res.runProxy_strict = runProxy('strict');

// ---------- 4. opening exploration per compaction segment ----------
function opening(mode) {
  const acc = { main: { T: 0, open: 0, n: 0 }, sub: { T: 0, open: 0, n: 0 } };
  const bySeg = new Map(); for (const c of calls) { const k = c.win + '#' + c.seg; const l = bySeg.get(k) || []; l.push(c); bySeg.set(k, l); }
  for (const [k, s] of bySeg) {
    const role = s[0].role; const N = s.length; const segT = s.reduce((a, c) => a + c.ctx, 0);
    acc[role].T += segT; acc[role].n++;
    let j = 0; while (j < N && (mode === 'strict' ? s[j].ls : s[j].ll)) j++;
    if (j === 0) continue;
    const runTok = s.slice(0, j).reduce((a, c) => a + c.ctx, 0);
    const added = j < N ? Math.max(0, s[j].ctx - s[0].ctx) : 0;
    acc[role].open += runTok + added * (N - j);
  }
  const o = {}; for (const r of ['main', 'sub']) o[r] = { segments: acc[r].n, openingShareOfRoleTokens: pct(acc[r].open / acc[r].T) };
  o.allTokens = pct((acc.main.open + acc.sub.open) / T); return o;
}
res.opening_loose = opening('loose');
res.opening_strict = opening('strict');
console.log(JSON.stringify(res, null, 1));
// ---------- 5. orientation phase: calls before the first edit, write or run (neutral tools ignored) ----------
const NEUTRAL = new Set(['TodoWrite', 'Agent', 'Task', 'Skill', 'ToolSearch', 'TaskOutput', 'Monitor', 'mcp__ccd_turn__update_plan', 'mcp__ccd_session__mark_chapter']);
function acts(c) { return c.tools.some(t => ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && !looseCmd(t.cmd))); }
function orient() {
  const acc = { main: { T: 0, open: 0 }, sub: { T: 0, open: 0 } };
  const bySeg = new Map(); for (const c of calls) { const k = c.win + '#' + c.seg; const l = bySeg.get(k) || []; l.push(c); bySeg.set(k, l); }
  for (const [k, s] of bySeg) {
    const role = s[0].role; const N = s.length; acc[role].T += s.reduce((a, c) => a + c.ctx, 0);
    let j = 0; while (j < N && !acts(s[j])) j++;
    if (j === 0) continue;
    const runTok = s.slice(0, j).reduce((a, c) => a + c.ctx, 0);
    const added = j < N ? Math.max(0, s[j].ctx - s[0].ctx) : 0;
    acc[role].open += runTok + added * (N - j);
  }
  return { main: pct(acc.main.open / acc.main.T), sub: pct(acc.sub.open / acc.sub.T), all: pct((acc.main.open + acc.sub.open) / T) };
}
console.log('orientationBeforeFirstAct', JSON.stringify(orient()));
