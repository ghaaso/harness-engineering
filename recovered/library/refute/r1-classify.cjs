// R1 refuter: lookup-only token share under three classifiers, with quoted strings stripped before splitting.
// medium = loose minus waits/polls and minus commands that run code, builds, deploys or checks.
const fs = require('fs');
const [inF] = process.argv.slice(2);
const calls = fs.readFileSync(inF, 'utf8').trim().split('\n').map(JSON.parse);
const LOOK_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch', 'NotebookRead']);
const WRITE = /\bsed\s+-i\b|\btee\b|(^|[^0-9&>2])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython3?\b|\bdocker\b|\btouch\b|\bchmod\b|Set-Content|Out-File|New-Item|Remove-Item|Copy-Item|Move-Item|\bgit\s+(-C\s+\S+\s+)?(commit|push|merge|checkout|add|rebase|reset|worktree|stash|cherry|switch|restore|clean|pull|fetch|clone|apply|am|rm|mv)\b/i;
const RUNWAIT = /\buntil\b|\bwhile\b|\bsleep\b|\btimeout\s+\d|\bbreak\b|\buv\s+run\b|\bbash\s+\S+\.sh|\bsh\s+\S+\.sh|(^|[;&|]\s*)(\.|source)\s+\S+|\bmake\b|\bcargo\b|\bgradle|\bruff\b|\bmypy\b|\balembic\b|\brailway\s+(up|run|redeploy)|\beas\s+build|\bcurl\b[^|]*-X\s*(POST|PUT|PATCH|DELETE)|\bgh\s+(pr\s+(create|merge|edit|comment)|issue\s+(create|comment)|release\s+create)|\bpip\b|\bpnpm\b|\byarn\b|\bvitest\b|\bjest\b|\btsc\b|\beslint\b|\bmanage\.py\b|\bInvoke-|Start-Process|Stop-Process|\.\/\S+/i;
const RV = /^(cat|sed\s+-n|head|tail|nl|grep|rg|egrep|fgrep|ls|dir|find|wc|awk|sort|uniq|cut|tr|echo|printf|pwd|stat|file|tree|type|jq|du|df|diff|cmp|basename|dirname|realpath|readlink|which|where|test|\[|true|date|env|printenv|sha256sum|md5sum|od|xxd|column|comm|paste|tac|rev|fold|less|more|xargs|for|do|done|if|then|fi|else|git|gh|curl|Get-Content|gc|Select-String|Get-ChildItem|gci|Test-Path|Measure-Object|Select-Object|Where-Object|ForEach-Object|Format-\w+|Sort-Object|Get-Item|Resolve-Path|Split-Path|Join-Path|Write-Output|Out-String|cd|Set-Location|\$?\w+=)/i;
function strip(cmd) { return String(cmd).replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""'); }
function parts(cmd) { return strip(cmd).split(/\s*(?:&&|\|\||;|\||\n)\s*/).map(s => s.trim()).filter(Boolean); }
function kind(cmd) {
  const s = strip(cmd);
  if (WRITE.test(s)) return 'act';
  if (RUNWAIT.test(s)) return 'runwait';
  const ps = parts(cmd);
  if (ps.every(p => RV.test(p) || /^2>\/dev\/null$/.test(p))) return 'read';
  return 'other';
}
let T = 0; const acc = { strict: 0, medium: 0, loose: 0 }; const kinds = {};
for (const c of calls) {
  T += c.ctx; if (!c.tools.length) continue;
  let s = true, m = true, l = true;
  for (const t of c.tools) {
    if (LOOK_TOOLS.has(t.n)) continue;
    if ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd) {
      const k = kind(t.cmd);
      if (k === 'act') { s = m = l = false; } else if (k === 'runwait') { s = m = false; } else if (k === 'other') { s = false; }
    } else { s = m = l = false; }
  }
  if (s) acc.strict += c.ctx; if (m) acc.medium += c.ctx; if (l) acc.loose += c.ctx;
  for (const t of c.tools) if ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd) { const k = kind(t.cmd); kinds[k] = (kinds[k] || 0) + c.ctx / c.tools.length; }
}
const pct = x => (100 * x).toFixed(1) + '%';
console.log(inF, 'strict', pct(acc.strict / T), 'medium', pct(acc.medium / T), 'loose', pct(acc.loose / T), 'shell kinds (token-weighted share of all):', Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, pct(v / T)])));
