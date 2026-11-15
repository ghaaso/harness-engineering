// A stricter shell classifier: skips assignments, loop keywords and waits; separates heredoc/sed -i/perl -pi writes and interpreter runs.
const READ_W = new Set('cat head tail sed less nl wc awk grep rg egrep find ls tree jq type dir Get-Content Select-String Get-ChildItem gc stat file diff sort cut strings findstr more'.split(' '));
const RUN_W = new Set('npm npx pnpm yarn node python python3 py pytest docker docker-compose make dotnet cargo go mvn gradle vitest jest tsc eslint playwright curl psql bash sh pwsh powershell timeout wsl uv ruff mypy alembic pip bun deno java prisma turbo nx python.exe uv.exe locust'.split(' '));
const SKIP_W = new Set('cd export set pushd popd echo mkdir source sleep unset date true done fi else for while until time local printf'.split(' '));
const FS_W = new Set('cp mv rm touch chmod ln icacls tar unzip'.split(' '));
const GIT_READ = new Set('diff show log status grep blame ls-files cat-file rev-parse branch ls-tree shortlog describe reflog worktree'.split(' '));
const BS = String.fromCharCode(92);
module.exports = function shellKind2(cmd) {
  const segs = String(cmd || '').split(/&&|\|\||;|\n/).map((x) => x.trim()).filter(Boolean);
  for (let seg of segs) {
    seg = seg.replace(/^[({]+\s*/, '').replace(/^(do|then|if|!|time)\s+/, '').replace(/^(do|then|if)\s+/, '');
    let prev; do { prev = seg; seg = seg.replace(/^\$?\w+=("[^"]*"|'[^']*'|\$\([^)]*\)|\S*)\s*/, ''); } while (seg !== prev && seg);
    if (!seg) continue;
    let w = seg.split(/\s+/)[0].replace(/^["'&]+|["']+$/g, '');
    if (w === '&') w = seg.split(/\s+/)[1] || '';
    w = w.split('/').pop().split(BS).pop();
    if (SKIP_W.has(w)) continue;
    if (/^\$(UV|PY|uv|py)\b/.test(w) || /^\$\{?(UV|PY)/.test(w)) return ['shell-run', 'run'];
    if (w === 'git') { const sub = (seg.match(/git\s+(?:-C\s+\S+\s+|-c\s+\S+\s+|--no-pager\s+)*(\S+)/) || [])[1] || ''; return [GIT_READ.has(sub) ? 'shell-read' : 'shell-git-write', 'git ' + sub]; }
    if (w === 'cat' && /^cat\s*>/.test(seg)) return /\b(python|node|uv|bash|sh|py|pwsh|powershell)\b[^\n]*$/.test(String(cmd).split(/^EOF|^PYEOF|^PY$/m).slice(-1)[0]) ? ['shell-run', 'heredoc+run'] : ['shell-write', 'heredoc'];
    if (w === 'sed' && /\bsed\s+(-[a-zA-Z]*i|--in-place)/.test(seg)) return ['shell-write', 'sed -i'];
    if (w === 'perl' && /-[a-zA-Z0-9]*i/.test(seg)) return ['shell-write', 'perl -i'];
    if (READ_W.has(w)) return ['shell-read', w];
    if (RUN_W.has(w)) return ['shell-run', w];
    if (FS_W.has(w)) return ['shell-fs', w];
    return ['shell-other', w];
  }
  return ['shell-other', '(none)'];
};
