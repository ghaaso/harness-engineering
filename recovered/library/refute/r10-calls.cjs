// R10: one pass over raw transcripts. Read-only.
// Per API call: context tokens (input + cache writes + cache reads), output, list-price cost units (pricing.json),
// strict lookup-only class, and failure-repair episodes (a failed check/build/deploy command until the same
// family next passes, or the window ends). Per window: code-edit and failure flags. Per session: totals.
// Usage: node --max-old-space-size=8192 r10-calls.cjs <projectsRoot> <pricing.json> <out.json>
const fs = require('fs'), path = require('path');
const [root, pricingFile, outFile] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pricingFile, 'utf8'));
const groups = {
  fixflow: f => f.includes('EMS-workshop1') || f.includes('23-FixFlow'),
  clinic: f => f.includes('24-Clinic-Workshop'),
};
function walk(d, o) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (e.name.endsWith('.jsonl')) o.push(p); } return o; }
const READ_VERBS = /^(cat|sed|head|tail|grep|rg|ls|find|wc|nl|less|more|tree|stat|file|du|git (log|show|diff|status|blame|grep|ls-files|ls-tree|rev-parse|branch|cat-file)|get-content|select-string|get-childitem|type|cd|echo|printf|sort|uniq|cut|awk|jq|test|\[)/i;
function isLookupCmd(cmd) {
  if (!cmd) return false;
  const s = cmd.replace(/"[^"]*"|'[^']*'/g, 'Q').replace(/\$\([^)]*\)/g, 'Q');
  if (/>\s*[^&|]/.test(s.replace(/2>&1|2>\/dev\/null|>\s*\/dev\/null|2>\$null/g, ''))) return false; // redirect = write
  const segs = s.split(/&&|\|\||;|\||\n/).map(x => x.trim()).filter(Boolean);
  return segs.length > 0 && segs.every(x => READ_VERBS.test(x));
}
const CHECK = /\b(pytest|vitest|jest|tsc|mypy|ruff|eslint|alembic|eas\s+(build|update)|railway\s+(up|deploy|run)|docker\s+(build|compose)|manage\.py\s+(test|check|migrate|makemigrations)|npm\s+(run\s+)?(test|build|lint|typecheck|check)|npx\s+(tsc|vitest|jest|expo\s+export|eslint)|make\s+(test|check)|check\.(sh|ps1|cmd)|run[-_]check|lint-imports|expo\s+export|gradlew)\b/i;
function isCheckCmd(cmd) {
  if (isLookupCmd(cmd)) return false;
  const q = cmd.replace(/"[^"]*"|'[^']*'/g, 'Q');
  const segs = q.split(/&&|\|\||;|\||\n/).map(x => x.trim().replace(/^(timeout\s+\d+\s+|env\s+\S+=\S+\s+|\w+=\S+\s+|uv\s+run\s+|python3?\s+-m\s+|poetry\s+run\s+|\.\/node_modules\/\.bin\/)+/i, ''));
  return segs.some(x => /^(\S*[\/\\])?(pytest|vitest|jest|tsc|mypy|ruff|eslint|alembic|eas|railway|docker|npm|npx|make|lint-imports|gradlew|bash\s+\S*check|sh\s+\S*check|\.\/\S*check|\S*manage\.py)\b/i.test(x) && CHECK.test(x));
}
const TRIVIAL = /Python was not found|tool_use_error|command not found|is not recognized as/i;
const FAILTEXT = /\bFAILED\b|Traceback \(most recent|error TS\d+|Found [1-9]\d* errors?|npm ERR!|Build failed|[1-9]\d* failed\b|ERRORS? collecting|CommandError|exit code [1-9]/i;
const CHECKOBS = /check\d*\.log|scripts[\/\\]check\.py|\bcheck\.py\b|\bpytest\b|manage\.py\s+test|\bmypy\b|\bruff\s+check|\bvitest\b|\bjest\b|\btsc\b/i;
const FAIL2 = /\b[1-9]\d* failed\b|\bFAILED\b|Traceback \(most recent|AssertionError|error TS\d+|Found [1-9]\d* errors?|npm ERR!|Build failed|ERRORS? collecting|\bFAIL:|check failed|CHECK FAILED|exit=[1-9]|rc=[1-9]/;
const PASS2 = /\b\d+ passed\b|All checks passed|Success: no issues|\bpassed in \d|\bOK \(|exit=0\b|rc=0\b|CHECK PASSED|check passed/i;
const CODE_EXT = /\.(py|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|sql|html|css|kt|java|gradle|sh|ps1)$/i;
function price(model, u) {
  const m = P['claude-' + model] || P[model] || P[(model || '').startsWith('claude-') ? model : 'claude-' + model];
  if (!m) return 0;
  const cc = u.cache_creation || {};
  const c1h = cc.ephemeral_1h_input_tokens || 0;
  const c5m = (cc.ephemeral_5m_input_tokens != null) ? cc.ephemeral_5m_input_tokens : Math.max(0, (u.cache_creation_input_tokens || 0) - c1h);
  return ((u.input_tokens || 0) * m.input + c5m * m.cache_write_5m + c1h * m.cache_write_1h + (u.cache_read_input_tokens || 0) * m.cache_read + (u.output_tokens || 0) * m.output) / 1e6;
}
const out = {};
const SAMPLES = [];
for (const [g, pick] of Object.entries(groups)) {
  const folders = fs.readdirSync(root).filter(pick);
  const G = { windows: 0, calls: 0, ctx: 0, cost: 0, outTok: 0, look: { ctx: 0, cost: 0, out: 0, calls: 0 }, rep: { ctx: 0, cost: 0, calls: 0, episodes: 0 },
    winFail: { ctx: 0, n: 0 }, winEdit: { ctx: 0, n: 0 }, winEither: { ctx: 0 }, failures: 0, sessions: {} };
  for (const fo of folders) {
    for (const file of walk(path.join(root, fo), [])) {
      const rel = path.relative(path.join(root, fo), file).split(path.sep);
      const sid = rel[0].replace(/\.jsonl$/, '');
      const msgs = new Map(); const order = []; const results = new Map();
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (const line of lines) {
        if (!line) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const m = j.message; if (!m) continue;
        if (m.role === 'assistant' && m.id) {
          const key = m.id + '|' + (j.requestId || '');
          let x = msgs.get(key);
          if (!x) { x = { model: (m.model || '').replace(/^claude-/, ''), usage: null, tools: [], ts: j.timestamp }; msgs.set(key, x); order.push(x); }
          if (m.usage) x.usage = m.usage;
          for (const b of (m.content || [])) if (b.type === 'tool_use') x.tools.push({ id: b.id, name: b.name, input: b.input || {} });
        } else if (m.role === 'user' && Array.isArray(m.content)) {
          for (const b of m.content) if (b.type === 'tool_result') {
            let t = b.content; if (Array.isArray(t)) t = t.map(c => c.text || '').join('\n'); t = String(t || '');
            results.set(b.tool_use_id, { err: !!b.is_error, text: t.slice(0, 4000) });
          }
        }
      }
      const calls = order.filter(x => x.usage && ((x.usage.input_tokens || 0) + (x.usage.cache_read_input_tokens || 0) + (x.usage.cache_creation_input_tokens || 0) > 0));
      if (!calls.length) continue;
      G.windows++;
      let wctx = 0, edit = false, fail = false;
      const ctxs = calls.map(c => { const u = c.usage; return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0); });
      const costs = calls.map(c => price(c.model, c.usage));
      // per-call flags
      const failAt = [], passAt = [], failB = [], passB = [], obsB = [];
      calls.forEach((c, i) => {
        const ctx = ctxs[i], cost = costs[i], o = c.usage.output_tokens || 0;
        G.calls++; G.ctx += ctx; G.cost += cost; G.outTok += o; wctx += ctx;
        const s = (G.sessions[sid] = G.sessions[sid] || { ctx: 0, cost: 0, calls: 0, folder: fo });
        s.ctx += ctx; s.cost += cost; s.calls++;
        const t = c.tools;
        const look = t.length > 0 && t.every(x => ['Read', 'Grep', 'Glob', 'LS'].includes(x.name) || ((x.name === 'Bash' || x.name === 'PowerShell') && isLookupCmd(x.input.command)));
        if (look) { G.look.ctx += ctx; G.look.cost += cost; G.look.out += o; G.look.calls++; }
        for (const x of t) {
          if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(x.name)) {
            const p = String(x.input.file_path || x.input.notebook_path || '').split('\\').join('/');
            if (CODE_EXT.test(p) && !/scratchpad|\/Temp\/|\/docs\//i.test(p) && !/\/\.claude\/(?!worktrees\/)/i.test(p)) edit = true;
          }
          if ((x.name === 'Bash' || x.name === 'PowerShell') && isCheckCmd(String(x.input.command || ''))) {
            const r = results.get(x.id);
            if (!r) continue;
            const bad = (r.err && !TRIVIAL.test(r.text)) || (!r.err && FAILTEXT.test(r.text) && !/\b0 failed\b/.test(r.text) && /FAILED|Traceback|error TS|Found [1-9]|npm ERR|Build failed/i.test(r.text));
            if (bad) failAt.push(i); else passAt.push(i);
          }
          // broad: any command that runs a check or reads a check log / test output; judge by the result text
          if ((x.name === 'Bash' || x.name === 'PowerShell') && (isCheckCmd(String(x.input.command || '')) || CHECKOBS.test(String(x.input.command || '')))) {
            const r = results.get(x.id);
            if (!r || TRIVIAL.test(r.text)) continue;
            const body = r.text.replace(/^Exit code \d+\s*/, '');
            const failTxt = FAIL2.test(body) && !/^\s*$/.test(body);
            const passTxt = PASS2.test(body) && !failTxt;
            obsB.push(i);
            if (failTxt || (r.err && body.trim().length > 0 && !/^grep|\|\s*grep/.test(String(x.input.command || '').trim()))) {
              failB.push(i);
              if (SAMPLES.length < 4000) SAMPLES.push({ g, fo: fo.slice(-30), cmd: String(x.input.command).slice(0, 160).replace(/\s+/g, ' '), res: body.slice(0, 220).replace(/\s+/g, ' ') });
            }
            else if (passTxt) passB.push(i);
          }
        }
      });
      // repair episodes: from each failure to the next pass of any check command (or window end); merge overlaps
      if (failAt.length) { fail = true; G.failures += failAt.length; }
      const inEp = new Array(calls.length).fill(false);
      let k = 0;
      for (const f of failAt) {
        if (inEp[f]) continue;
        const nextPass = passAt.find(p => p > f);
        const end = nextPass === undefined ? calls.length - 1 : nextPass;
        for (let i = f; i <= end; i++) inEp[i] = true;
        k++;
      }
      G.rep.episodes += k;
      inEp.forEach((v, i) => { if (v) { G.rep.ctx += ctxs[i]; G.rep.cost += costs[i]; G.rep.calls++; } });
      // broad episodes
      const inB = new Array(calls.length).fill(false); let kb = 0;
      for (const f of failB) { if (inB[f]) continue; const np = passB.find(p => p > f); const e = np === undefined ? calls.length - 1 : np; for (let i = f; i <= e; i++) inB[i] = true; kb++; }
      G.repB = G.repB || { ctx: 0, cost: 0, calls: 0, episodes: 0, failures: 0, winCtx: 0, wins: 0 };
      G.repB.episodes += kb; G.repB.failures += failB.length;
      inB.forEach((v, i) => { if (v) { G.repB.ctx += ctxs[i]; G.repB.cost += costs[i]; G.repB.calls++; } });
      if (failB.length) { G.repB.winCtx += wctx; G.repB.wins++; }
      // tight episodes: from a failing observation to the next check observation of any kind (one repair attempt)
      const inC = new Array(calls.length).fill(false);
      for (const f of failB) { const nx = obsB.find(p => p > f); const e = nx === undefined ? Math.min(calls.length - 1, f + 30) : nx; for (let i = f; i <= e; i++) inC[i] = true; }
      G.repC = G.repC || { ctx: 0, cost: 0, calls: 0 };
      inC.forEach((v, i) => { if (v) { G.repC.ctx += ctxs[i]; G.repC.cost += costs[i]; G.repC.calls++; } });
      if (fail) { G.winFail.ctx += wctx; G.winFail.n++; }
      if (edit) { G.winEdit.ctx += wctx; G.winEdit.n++; }
      if (fail || edit) G.winEither.ctx += wctx;
    }
  }
  out[g] = G;
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
fs.writeFileSync(outFile.replace(/\.json$/, '-failsamples.json'), JSON.stringify(SAMPLES, null, 1));
const pc = (a, b) => (100 * a / b).toFixed(1) + '%';
for (const [g, G] of Object.entries(out)) {
  console.log(`== ${g}: windows ${G.windows}, calls ${G.calls}, ctx ${(G.ctx / 1e9).toFixed(2)}B, output ${(G.outTok / 1e6).toFixed(1)}M, cost units ${G.cost.toFixed(0)}`);
  console.log(`  strict lookup-only calls: ${pc(G.look.calls, G.calls)} of calls, ${pc(G.look.ctx, G.ctx)} of ctx, ${pc(G.look.cost, G.cost)} of list-price cost, ${pc(G.look.out, G.outTok)} of output`);
  console.log(`  failure-repair episodes: ${G.rep.episodes} episodes from ${G.failures} failed checks; ${pc(G.rep.calls, G.calls)} of calls, ${pc(G.rep.ctx, G.ctx)} of ctx, ${pc(G.rep.cost, G.cost)} of cost`);
  const B = G.repB; console.log(`  BROAD failure-repair episodes: ${B.episodes} episodes from ${B.failures} failing check observations in ${B.wins} windows; ${pc(B.calls, G.calls)} of calls, ${pc(B.ctx, G.ctx)} of ctx, ${pc(B.cost, G.cost)} of cost; windows with one: ${pc(B.winCtx, G.ctx)} of ctx`);
  console.log(`  TIGHT repair spans (failure to next check observation, else at most 30 calls): ${pc(G.repC.calls, G.calls)} of calls, ${pc(G.repC.ctx, G.ctx)} of ctx, ${pc(G.repC.cost, G.cost)} of cost`);
  console.log(`  windows with a failed check: ${G.winFail.n} windows, ${pc(G.winFail.ctx, G.ctx)} of ctx; with a code edit: ${G.winEdit.n}, ${pc(G.winEdit.ctx, G.ctx)}; either ${pc(G.winEither.ctx, G.ctx)}`);
}
