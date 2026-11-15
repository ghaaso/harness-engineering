// check4.cjs — full-text reclassification of shell-other commands from raw transcripts; prompt-counter audit
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const P = 'C:/Users/User/.claude/projects';
const TOOLCAT = eval('(' + fs.readFileSync(path.join(D, 'aggregate.cjs'), 'utf8').match(/const TOOLCAT = (\(n, t\) => \{[\s\S]*?\n\};)/)[1].replace(/;$/, '') + ')');
const STORES = {
  fixflow: ['C--Users-User-Documents-projects-EMS-workshop1', 'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-baml-57fde3', 'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-horthy-2371b9', 'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c', 'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-wizardly-hertz-02c46a', 'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-23-FixFlow'],
  clinic: fs.readdirSync(P).filter(n => n.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop') || n === 'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'),
};
// what does the command DO? strip var assignments / cd / export / echo-banners, then look at the verbs used anywhere
const kind = (cmd) => {
  const c = cmd.replace(/"[^"\n]*"/g, '""').replace(/'[^'\n]*'/g, "''");
  const has = (re) => re.test(c);
  const verbs = [];
  if (has(/(^|[\s;&|(`]|do\s|then\s)(python[\w.]*|\$py\w*|\$pp|py|uv|node|npm|npx|pytest|ruff|mypy|alembic|docker|railway|gh|curl|wsl|ssh|vm_ssh|scp|bash|pwsh|powershell|perl)\b|^\s*&\s/)) verbs.push('run');
  if (has(/\bgit\b/)) verbs.push(has(/\bgit\s+(\S+\s+)*?(add|commit|push|checkout|switch|merge|rebase|stash|worktree|clone|fetch|pull|reset|apply)\b/) ? 'git-write' : 'git-read');
  if (has(/(^|[\s;&|(]|do\s|then\s)(cat|head|tail|sed|awk|nl|Get-Content|gc|type|jq|cut|sort|uniq|tr)\b/)) verbs.push('read');
  if (has(/(^|[\s;&|(]|do\s|then\s)(grep|rg|find|ls|wc|dir|tree|Get-ChildItem|Select-String|stat|du|diff|cmp|md5sum|sha256sum|Test-Path)\b/)) verbs.push('search');
  if (has(/(^|[\s;&|(])(cp|mv|rm|mkdir|tee|touch|Set-Content|Out-File|New-Item|Copy-Item|Remove-Item|Move-Item)\b|\bsed\s+-i|perl\s+-\S*i|[^2&]>{1,2}\s*[^&\s]/)) verbs.push('write');
  if (has(/\b(sleep|timeout|until|Start-Sleep|Wait-Process)\b/)) verbs.push('wait');
  if (!verbs.length) return 'none-found';
  // dominant: run > write > git > read/search
  if (verbs.includes('run')) return 'run(+' + verbs.filter(v => v !== 'run').join('+') + ')';
  if (verbs.includes('write')) return 'write';
  if (verbs.includes('git-write')) return 'git-write';
  if (verbs.includes('wait')) return 'wait';
  if (verbs.every(v => /read|search|git-read/.test(v))) return 'lookup(' + verbs.join('+') + ')';
  return verbs.join('+');
};
function walk(dir, acc) { if (!fs.existsSync(dir)) return acc; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
(async () => {
  const R = {};
  for (const g of ['fixflow', 'clinic']) {
    // targets: message ids having a shell-other tool use; record rc in order
    const targets = new Map();
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(D, 'out', `${g}.calls.jsonl`)), crlfDelay: Infinity });
    for await (const line of rl) { const c = JSON.parse(line); const so = c.tools.filter(t => TOOLCAT(t.n, t) === 'shell-other'); if (so.length) targets.set(c.id, c.tools.map(t => ({ cat: TOOLCAT(t.n, t), rc: t.rc, n: t.n }))); }
    const files = [];
    for (const s of STORES[g]) { const dir = path.join(P, s); for (const n of fs.readdirSync(dir)) { if (n.endsWith('.jsonl')) { files.push({ f: path.join(dir, n), main: true }); walk(path.join(dir, n.replace(/\.jsonl$/, ''), 'subagents'), []).forEach(f => files.push({ f, main: false })); } } }
    const kN = {}, kRc = {}; const seen = new Set(); const perId = {}; const samples = []; let found = 0;
    const prom = { counted: 0, byKind: {}, examples: {} };
    let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (const { f, main } of files) {
      const rl2 = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl2) {
        if (line.startsWith('{"type":"api-request-blob') || line.startsWith('{"type":"file-history')) continue;
        if (main && line.includes('"type":"user"')) {
          let o; try { o = JSON.parse(line); } catch { continue; }
          if (o.type !== 'user' || !o.message || o.isCompactSummary) continue;
          const content = o.message.content; const texts = [];
          if (typeof content === 'string') texts.push(content);
          else if (Array.isArray(content)) for (const b of content) if (b.type === 'text' && (o.origin && o.origin.kind === 'human' || (o.userType === 'external' && !/^<system-reminder>|^<task-notification>|^<side-sessions|^<ci-monitor|^\[Request interrupted/.test(b.text || ''))) && !/^<system-reminder>/.test(b.text || '')) texts.push(b.text || '');
          for (const t of texts) {
            prom.counted++;
            const k = /^<command-name>|^<command-message>/.test(t) ? 'slash-command' : /^<local-command-stdout>|^<local-command-stderr>|^<local-command-caveat>|^Caveat:/.test(t) ? 'local-command-output/caveat' : /^<task-notification>/.test(t) ? 'task-notification' : /^<bash-input>|^<bash-stdout>|^<bash-stderr>/.test(t) ? 'bash-mode' : /^\[Request interrupted/.test(t) ? 'interrupt-marker' : /^This session is being continued/.test(t) ? 'compact-continuation' : /^Base directory for this skill|^# .*skill/i.test(t) ? 'skill-body' : /^<[a-z-]+>/.test(t) ? 'other-tag:' + t.match(/^<([a-z-]+)>/)[1] : /^\[Workflow harness|^\[Artifact comment/.test(t) ? 'harness-relay' : (o.origin && o.origin.kind) ? 'origin:' + o.origin.kind : 'plain-text';
            prom.byKind[k] = (prom.byKind[k] || 0) + 1; if (k === 'plain-text') (prom.plain ||= []).push(t.slice(0, 90).replace(/s+/g, ' ')); if (!prom.examples[k]) prom.examples[k] = t.slice(0, 120).replace(/\s+/g, ' ');
          }
          continue;
        }
        if (!line.includes('"type":"assistant"')) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const m = o.message; if (!m || !targets.has(m.id) || !Array.isArray(m.content)) continue;
        const tl = targets.get(m.id);
        for (const b of m.content) {
          if (b.type !== 'tool_use' || seen.has(b.id) || !(b.name === 'Bash' || b.name === 'PowerShell')) continue;
          const cmd = String((b.input || {}).command || '');
          const cat = TOOLCAT(b.name, { cmd: cmd.slice(0, 160) });
          if (cat !== 'shell-other') continue;
          seen.add(b.id); found++;
          // rc: match by position among same-name tools in the stored row
          const idx = m.content.filter(x => x.type === 'tool_use').findIndex(x => x.id === b.id);
          const rc = (tl[idx] && tl[idx].cat === 'shell-other') ? tl[idx].rc : 0;
          const k = kind(cmd); const kk = k.replace(/\(.*\)/, m0 => m0.includes('read') || m0.includes('search') ? m0 : '');
          kN[kk] = (kN[kk] || 0) + 1; (perId[m.id] ||= []).push(k); kRc[kk] = (kRc[kk] || 0) + rc;
          if (samples.length < 30 && rnd() < 0.01) samples.push({ k, rc, len: cmd.length, cmd: cmd.replace(/\s+/g, ' ').slice(0, 400) });
        }
      }
    }
    const tot = Object.values(kRc).reduce((a, b) => a + b, 0);
    const agg = {}; for (const [k, v] of Object.entries(kRc)) { const top = k.startsWith('lookup') ? 'lookup (read/search/git-read only)' : k.startsWith('run') ? 'run script/program' : k; agg[top] = agg[top] || { n: 0, rc: 0 }; agg[top].n += kN[k]; agg[top].rc += v; }
    fs.writeFileSync(path.join(__dirname, g + ".perid.json"), JSON.stringify(perId)); R[g] = { found, targets: targets.size, rcTotal: tot, byKind: Object.fromEntries(Object.entries(agg).sort((a, b) => b[1].rc - a[1].rc).map(([k, v]) => [k, `n=${v.n} rc=${(100 * v.rc / tot).toFixed(1)}%`])), lookupDetail: Object.fromEntries(Object.entries(kRc).filter(([k]) => k.startsWith('lookup')).map(([k, v]) => [k, (100 * v / tot).toFixed(1) + '%'])), samples, prompts: prom };
  }
  fs.writeFileSync(path.join(__dirname, 'check6.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
})();
