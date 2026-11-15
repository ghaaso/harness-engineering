const fs = require('fs'), path = require('path'), readline = require('readline');
const ROOT = 'C:/Users/User/.claude/projects';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens/indep/clinic-tools/result.json';
const stores = fs.readdirSync(ROOT).filter(d => d.includes('24-Clinic-Workshop'));
const files = [];
function walk(dir, store) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, store);
    else if (e.name.endsWith('.jsonl')) {
      const isSub = e.name.startsWith('agent-') && p.replace(/\\/g, '/').includes('/subagents/');
      files.push({ p, store, kind: isSub ? 'sub' : 'main' });
    }
  }
}
for (const s of stores) walk(path.join(ROOT, s), s);

const FILE_READ = new Set(['cat', 'head', 'tail', 'sed', 'less', 'get-content', 'type']);
const SEARCH = new Set(['grep', 'rg', 'find', 'ls', 'wc', 'dir', 'tree']);
const GIT_READ = new Set(['diff', 'show', 'log', 'status', 'blame']);
const RUN = new Set(['npm', 'npx', 'pytest', 'node', 'python', 'python3', 'uv', 'docker', 'eas', 'railway', 'gh', 'curl']);
const WRITECMD = new Set(['cp', 'mv', 'rm', 'mkdir']);
// leading cd / VAR=value / $var = expr prefixes are stripped before taking the first word
const RE_CD = /^cd\s+("[^"]*"|'[^']*'|[^\s;&|]+)\s*(&&|;|\r?\n)\s*/i;
const RE_ASSIGN = /^[A-Za-z_]\w*=("[^"]*"|'[^']*'|\$\([^)]*\)|\S*)\s*(&&|;|\r?\n)?\s*/;
const RE_PSASSIGN = /^\$\w+\s*=[^;\n]*(;|\r?\n)\s*/;
function firstWord(cmd) {
  let c = (cmd || '').trim();
  for (let i = 0; i < 12; i++) {
    const m = c.match(RE_CD) || c.match(RE_ASSIGN) || c.match(RE_PSASSIGN);
    if (!m) break;
    c = c.slice(m[0].length);
  }
  const m = c.match(/^\s*([^\s;&|<>]+)/);
  let w = m ? m[1].replace(/^["']|["']$/g, '') : '';
  w = w.replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase();
  return { w, rest: c };
}
const REDIR = /(?:^|[^0-9&>])>{1,2}\s*(?!&|\/dev\/null|\$null|nul\b)[^\s]/;
function shellCat(cmd) {
  const { w, rest } = firstWord(cmd);
  const hasWrite = /<<-?\s*['"]?\w+/.test(rest) || REDIR.test(rest);
  if (w === 'git') {
    const sub = (rest.match(/^\s*git\s+(?:-[^\s]+\s+(?:[^\s-][^\s]*\s+)?)*([a-z-]+)/i) || [])[1];
    if (sub && GIT_READ.has(sub.toLowerCase())) return ['git-read', w];
    return ['shell-write', w];
  }
  if (FILE_READ.has(w)) return [hasWrite ? 'shell-write' : 'file-read', w];
  if (SEARCH.has(w)) return ['search', w];
  if (RUN.has(w)) return ['shell-run', w];
  if (WRITECMD.has(w)) return ['shell-write', w];
  if (hasWrite) return ['shell-write', w];
  return ['shell-other', w];
}
function category(name, input) {
  if (name === 'Bash' || name === 'PowerShell') return shellCat(input && input.command);
  let c;
  if (name === 'Read') c = 'file-read';
  else if (name === 'Grep' || name === 'Glob') c = 'search';
  else if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(name)) c = 'edit';
  else if (['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop'].includes(name)) c = 'delegation';
  else if (name === 'WebSearch' || name === 'WebFetch') c = 'web';
  else if (name.startsWith('mcp__Claude_Browser__') || name.startsWith('mcp__claude-in-chrome__')) c = 'browser';
  else if (name.startsWith('mcp__ccd_')) c = 'app-mcp';
  else if (name.startsWith('mcp__')) c = 'other-mcp';
  else if (name === 'Skill' || name === 'ToolSearch') c = 'skill-toolsearch';
  else if (['Artifact', 'AskUserQuestion', 'StructuredOutput'].includes(name)) c = 'ui';
  else c = 'other';
  return [c, null];
}
function resLen(c) {
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) { let n = 0; for (const b of c) { if (typeof b === 'string') n += b.length; else if (b && typeof b.text === 'string') n += b.text.length; } return n; }
  return 0;
}
function mk() { return { calls: 0, resultChars: 0, errors: 0, inputChars: 0, noResult: 0, tools: {}, cats: {}, shell: {} }; }
const agg = { main: mk(), sub: mk() };
function bump(o, k, calls, rc, err, ic) { const x = o[k] || (o[k] = { calls: 0, resultChars: 0, errors: 0, inputChars: 0 }); x.calls += calls; x.resultChars += rc; x.errors += err; x.inputChars += ic; }
const seenIds = new Map(); let crossDup = 0;
const nfiles = { main: 0, sub: 0 };

async function doFile(f) {
  const uses = new Map(), results = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(f.p, { encoding: 'utf8', highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    if (!line.includes('"tool_use"') && !line.includes('"tool_result"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const isA = o.type === 'assistant', isU = o.type === 'user';
    if (!isA && !isU) continue;
    const content = o.message && o.message.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (!b || typeof b !== 'object') continue;
      if (isA && b.type === 'tool_use' && b.id && !uses.has(b.id)) {
        uses.set(b.id, { name: b.name, input: b.input, ilen: JSON.stringify(b.input === undefined ? null : b.input).length });
      } else if (isU && b.type === 'tool_result' && b.tool_use_id) {
        const L = resLen(b.content), e = b.is_error ? 1 : 0;
        const prev = results.get(b.tool_use_id);
        if (!prev || L > prev.L) results.set(b.tool_use_id, { L, e });
      }
    }
  }
  const A = agg[f.kind]; nfiles[f.kind]++;
  for (const [id, u] of uses) {
    if (seenIds.has(id) && seenIds.get(id) !== f.p) crossDup++; else seenIds.set(id, f.p);
    const r = results.get(id); const L = r ? r.L : 0, e = r ? r.e : 0;
    if (!r) A.noResult++;
    A.calls++; A.resultChars += L; A.errors += e; A.inputChars += u.ilen;
    bump(A.tools, u.name, 1, L, e, u.ilen);
    const [cat, w] = category(u.name, u.input);
    bump(A.cats, cat, 1, L, e, u.ilen);
    if (w !== null) bump(A.shell, w || '(empty)', 1, L, e, u.ilen);
  }
}
(async () => {
  for (const f of files) { try { await doFile(f); } catch (e) { console.error('ERR', f.p, e.message); } }
  fs.writeFileSync(OUT, JSON.stringify({ stores: stores.length, files: files.length, nfiles, crossFileDuplicateToolIds: crossDup, agg }, null, 1));
  console.log('done', files.length, JSON.stringify(nfiles), 'crossDup', crossDup);
})();
