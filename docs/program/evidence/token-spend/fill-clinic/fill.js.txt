// What fills the session windows: November context tokens of the clinic transcripts, split by what the content was.
// Method: context(k+1) - context(k) = output of call k + content that arrived between the two calls.
// Each piece is weighted by how many later November calls in the same window re-read it.
const fs = require('fs'), path = require('path'), readline = require('readline');
const P = 'C:/Users/User/.claude/projects';
const dirs = fs.readdirSync(P).filter((d) => d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop')).concat(fs.existsSync(P+'/C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop')?['C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop']:[]);
const walk = (d, out) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; };
const BS = String.fromCharCode(92);
const READ_W = new Set('cat head tail sed less nl wc awk grep rg egrep find ls tree jq type dir Get-Content Select-String Get-ChildItem gc stat file diff sort cut strings findstr more'.split(' '));
const RUN_W = new Set('npm npx pnpm yarn node python python3 py pytest docker docker-compose make dotnet cargo go mvn gradle vitest jest tsc eslint playwright curl psql bash sh pwsh powershell timeout wsl uv ruff mypy alembic pip bun deno java prisma turbo nx'.split(' '));
const SKIP_W = new Set('cd export set pushd echo mkdir source'.split(' '));
const GIT_READ = new Set('diff show log status grep blame ls-files cat-file rev-parse branch ls-tree shortlog describe reflog worktree'.split(' '));
function shellKind(cmd) {
  const segs = String(cmd || '').split(/&&|;|\n/).map((x) => x.trim()).filter(Boolean);
  for (const seg of segs) {
    const w = seg.replace(/^(\w+=\S+\s+)+/, '').split(/\s+/)[0].split('/').pop().split(BS).pop();
    if (SKIP_W.has(w)) continue;
    if (w === 'git') { const sub = (seg.match(/git\s+(?:-C\s+\S+\s+|-c\s+\S+\s+|--no-pager\s+)*(\S+)/) || [])[1] || ''; return [GIT_READ.has(sub) ? 'shell-read' : 'shell-git-write', 'git ' + sub]; }
    if (READ_W.has(w)) return ['shell-read', w];
    if (RUN_W.has(w)) return ['shell-run', w];
    return ['shell-other', w];
  }
  return ['shell-other', '(none)'];
}
const DOC = new Set('md txt mdx rst'.split(' ')), DATA = new Set('json jsonl yml yaml toml csv xml lock env log'.split(' '));
function fileKind(s) {
  const m = String(s || '').match(/[\w.\/:-]+\.([A-Za-z0-9]{1,6})(?![\w.])/g);
  if (!m) return 'no-path';
  const ext = m[0].split('.').pop().toLowerCase();
  return DOC.has(ext) ? 'doc' : DATA.has(ext) ? 'data' : 'code';
}
function pathOf(s) { const m = String(s || '').replace(/^cds+("[^"]*"|S+)s*&&/, '').match(/[w./:~-]+.[A-Za-z0-9]{1,6}(?![w.])/); return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : ''; }
function resultCat(tu) {
  if (!tu) return ['tool-other', '', ''];
  const n = tu.name, inp = tu.input || {};
  if (n === 'Read') return ['file-read', fileKind(inp.file_path), String(inp.file_path || ''), pathOf(String(inp.file_path || '').split(BS).join('/'))];
  if (n === 'Grep' || n === 'Glob') return ['search', 'no-path', ''];
  if (n === 'Bash' || n === 'PowerShell') { const [k, w] = shellKind(inp.command); return [k, k === 'shell-read' ? fileKind(String(inp.command || '').replace(/^cd\s+\S+\s*&&/, '')) : '', w]; }
  if (n === 'Agent' || n === 'Task' || n === 'Workflow' || n === 'SendMessage') return ['subagent-report', '', ''];
  if (n === 'Edit' || n === 'Write' || n === 'NotebookEdit' || n === 'MultiEdit') return ['edit-confirm', '', ''];
  if (n === 'ToolSearch') return ['tool-schemas', '', ''];
  if (n.startsWith('mcp__')) return ['connector', '', ''];
  return ['tool-other', '', n];
}
function useCat(n) {
  if (n === 'Edit' || n === 'Write' || n === 'NotebookEdit' || n === 'MultiEdit') return 'out-writes';
  if (n === 'Agent' || n === 'Task' || n === 'Workflow' || n === 'SendMessage') return 'out-briefs';
  return 'out-commands';
}
function resLen(c) {
  if (typeof c === 'string') return c.length;
  if (!Array.isArray(c)) return 0;
  let n = 0; for (const x of c) n += x.type === 'text' ? (x.text || '').length : x.type === 'image' ? 3000 : 2000; return n;
}
module.exports = { P, dirs, walk, resultCat, useCat, resLen, readline, fs, path };
// Later declarations replace the earlier ones (the first patch lost its backslashes in the shell).
function pathOf(s) {
  const t = String(s || '').split(BS).join('/').replace(/^cd\s+("[^"]*"|\S+)\s*&&/, '');
  const m = t.match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/);
  return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : '';
}
function resultCat(tu) {
  if (!tu) return ['tool-other', '', '', ''];
  const n = tu.name, inp = tu.input || {};
  if (n === 'Read') return ['file-read', fileKind(inp.file_path), '', pathOf(inp.file_path)];
  if (n === 'Grep' || n === 'Glob') return ['search', 'no-path', '', ''];
  if (n === 'Bash' || n === 'PowerShell') { const [k, w] = shellKind(inp.command); const c = String(inp.command || '').replace(/^cd\s+("[^"]*"|\S+)\s*&&/, ''); return [k, k === 'shell-read' ? fileKind(c) : '', w, k === 'shell-read' ? pathOf(c) : '']; }
  if (n === 'Agent' || n === 'Task' || n === 'Workflow' || n === 'SendMessage') return ['subagent-report', '', '', ''];
  if (n === 'Edit' || n === 'Write' || n === 'NotebookEdit' || n === 'MultiEdit') return ['edit-confirm', '', '', ''];
  if (n === 'ToolSearch') return ['tool-schemas', '', '', ''];
  if (n.startsWith('mcp__')) return ['connector', '', '', ''];
  return ['tool-other', '', n, ''];
}
module.exports.resultCat = resultCat;
