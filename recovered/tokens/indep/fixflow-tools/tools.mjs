import fs from 'fs';
import path from 'path';
import readline from 'readline';

const base = 'C:/Users/User/.claude/projects/';
const stores = [
  'C--Users-User-Documents-projects-EMS-workshop1',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-baml-57fde3',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-horthy-2371b9',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-wizardly-hertz-02c46a',
  'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-23-FixFlow',
];
const out = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens/indep/fixflow-tools/result.json';

function walk(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}

const FILE_READ = new Set(['cat', 'head', 'tail', 'sed', 'less', 'get-content', 'type']);
const SEARCH = new Set(['grep', 'rg', 'find', 'ls', 'wc', 'dir', 'tree']);
const RUN = new Set(['npm', 'npx', 'pytest', 'node', 'python', 'python3', 'uv', 'docker', 'eas', 'railway', 'gh', 'curl']);
const GIT_READ = new Set(['diff', 'show', 'log', 'status', 'blame']);
const WRITE_W = new Set(['cp', 'mv', 'rm', 'mkdir']);

function firstWord(cmd) {
  let s = (cmd || '').trim();
  // strip leading cd ... && / ;
  for (let i = 0; i < 5; i++) {
    const m = s.match(/^cd\s+(?:"[^"]*"|'[^']*'|[^\s&;|]+)\s*(?:&&|;|\r?\n)\s*/i);
    if (!m) break;
    s = s.slice(m[0].length);
  }
  // strip env assignments
  while (/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+/.test(s)) s = s.replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+/, '');
  const m = s.match(/^[&.]?\s*("[^"]*"|'[^']*'|[^\s|;&<>()]+)/);
  let w = m ? m[1].replace(/^["']|["']$/g, '') : '';
  w = w.replace(/\\/g, '/').split('/').pop();
  w = w.replace(/\.exe$/i, '');
  return { w: w.toLowerCase(), rest: s };
}

function hasWrite(cmd) {
  if (/<<-?\s*['"]?\w+/.test(cmd)) return true;
  // redirect to a file (not fd dup, not /dev/null, not $null)
  const stripped = cmd.replace(/\d?>&\d/g, '').replace(/\d?>>?\s*(\/dev\/null|\$null|nul)\b/gi, '');
  if (/(^|[^<=>-])>>?\s*[^\s&>]/.test(stripped)) return true;
  if (/\b(Set-Content|Out-File|Add-Content|New-Item)\b/i.test(cmd)) return true;
  return false;
}

function shellCat(cmd) {
  const { w, rest } = firstWord(cmd);
  const write = hasWrite(cmd);
  if (w === 'git') {
    const sub = (rest.match(/^git\s+(?:-[cC]\s+\S+\s+|--[\w-]+(?:=\S+)?\s+)*([a-z-]+)/i) || [])[1];
    return GIT_READ.has((sub || '').toLowerCase()) ? 'git-read' : 'shell-write';
  }
  if (SEARCH.has(w)) return 'search';
  if (RUN.has(w)) return 'shell-run';
  if (FILE_READ.has(w)) return write ? 'shell-write' : 'file-read';
  if (WRITE_W.has(w) || write) return 'shell-write';
  return 'shell-other';
}

function category(name, input) {
  if (name === 'Read') return 'file-read';
  if (name === 'Grep' || name === 'Glob') return 'search';
  if (name === 'Bash' || name === 'PowerShell') return shellCat(input && input.command);
  if (['Edit', 'Write', 'NotebookEdit'].includes(name)) return 'edit';
  if (['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop'].includes(name)) return 'delegation';
  if (name === 'WebSearch' || name === 'WebFetch') return 'web';
  if (name.startsWith('mcp__Claude_Browser__') || name.startsWith('mcp__claude-in-chrome__')) return 'browser';
  if (name.startsWith('mcp__ccd_')) return 'app-mcp';
  if (name.startsWith('mcp__')) return 'other-mcp';
  if (name === 'Skill' || name === 'ToolSearch') return 'skill-toolsearch';
  if (['Artifact', 'AskUserQuestion', 'StructuredOutput'].includes(name)) return 'ui';
  return 'other';
}

function resultLen(c) {
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) {
    let n = 0;
    for (const b of c) {
      if (typeof b === 'string') n += b.length;
      else if (b && typeof b.text === 'string') n += b.text.length;
    }
    return n;
  }
  return 0;
}

const stat = { tools: {}, cats: {}, shell: {}, files: 0, subFiles: 0, mainFiles: 0, unmatched: 0, lines: 0 };
function bump(o, k, side, rc, err, inl) {
  const e = (o[k] ||= { calls: 0, mainCalls: 0, subagentCalls: 0, resultChars: 0, errors: 0, inputChars: 0 });
  e.calls++; side === 'main' ? e.mainCalls++ : e.subagentCalls++;
  e.resultChars += rc; e.errors += err ? 1 : 0; e.inputChars += inl;
}

async function processFile(file, side) {
  const uses = new Map(); // id -> {name,input}
  const results = new Map(); // id -> {len, err}
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    stat.lines++;
    if (line.length < 20) continue;
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    const hasUse = line.includes('"type":"tool_use"');
    const hasRes = line.includes('"type":"tool_result"');
    if (!hasUse && !hasRes) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const content = o.message && o.message.content;
    if (!Array.isArray(content)) continue;
    if (o.type === 'assistant' && o.message.model !== '<synthetic>') {
      for (const b of content) {
        if (b && b.type === 'tool_use' && b.id && !uses.has(b.id)) uses.set(b.id, { name: b.name, input: b.input || {} });
      }
    } else if (o.type === 'user') {
      for (const b of content) {
        if (b && b.type === 'tool_result' && b.tool_use_id && !results.has(b.tool_use_id)) {
          results.set(b.tool_use_id, { len: resultLen(b.content), err: !!b.is_error });
        }
      }
    }
  }
  for (const [id, u] of uses) {
    const r = results.get(id);
    if (!r) stat.unmatched++;
    const rc = r ? r.len : 0, err = r ? r.err : false;
    const inl = JSON.stringify(u.input).length;
    const cat = category(u.name, u.input);
    bump(stat.tools, u.name, side, rc, err, inl);
    bump(stat.cats, cat, side, rc, err, inl);
    if (u.name === 'Bash' || u.name === 'PowerShell') bump(stat.shell, firstWord(u.input.command).w || '(empty)', side, rc, err, inl);
  }
}

const all = [];
for (const s of stores) {
  const dir = base + s;
  for (const p of walk(dir, [])) {
    const rel = p.slice(dir.length).replace(/\\/g, '/');
    const side = rel.includes('/subagents/') ? 'sub' : 'main';
    all.push([p, side]);
  }
}
console.log('files', all.length);
for (const [p, side] of all) {
  stat.files++; side === 'main' ? stat.mainFiles++ : stat.subFiles++;
  await processFile(p, side);
}
const sum = (o, k) => Object.values(o).reduce((a, e) => a + e[k], 0);
stat.totalCalls = sum(stat.tools, 'calls');
stat.totalResultChars = sum(stat.tools, 'resultChars');
fs.writeFileSync(out, JSON.stringify(stat, null, 1));
console.log('done', stat.totalCalls, stat.totalResultChars, stat.files, stat.unmatched);
