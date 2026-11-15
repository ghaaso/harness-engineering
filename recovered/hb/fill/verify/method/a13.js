// What is inside "window start": the first user message (brief) versus fixed harness context.
const H = require('./fill.js'); const { S } = require('./attr.js');
(async () => { const R = {}; const add = (g, k, v) => { R[g] = R[g] || {}; R[g][k] = (R[g][k] || 0) + v; };
  const firstCtx = {}; for (const s of S) if (s.calls.length) { let en = 0; const C = s.calls; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++; firstCtx[s.f] = { ctx: C[0].ctx, n: en + 1 }; }
  for (const d of H.dirs) for (const f of H.walk(H.path.join(H.P, d), [])) {
    const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/'); const key = d.replace('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop', '') + '/' + rel; const fc = firstCtx[key]; if (!fc) continue;
    const g = rel.includes('/') ? 'subagents' : d.includes('worktrees') ? 'slice-main' : 'root-main';
    const rl = H.readline.createInterface({ input: H.fs.createReadStream(f), crlfDelay: Infinity }); let ch = 0, att = 0;
    for await (const line of rl) { let o; try { o = JSON.parse(line); } catch { continue; } if (o.type === 'assistant' && o.message && o.message.usage) break;
      if (o.type === 'user' && o.message) { const c = o.message.content; ch += typeof c === 'string' ? c.length : JSON.stringify(c).length; } else if (o.type === 'attachment' && o.attachment && !['prompt_snapshot', 'deferred_tools_record'].includes(o.attachment.type)) att += JSON.stringify(o.attachment).length; }
    rl.close(); add(g, 'startTok', fc.ctx * fc.n); add(g, 'briefTok', ch / 2.5 * fc.n); add(g, 'attTok', att / 2.5 * fc.n); add(g, 'files', 1); add(g, 'briefChars', ch); }
  const { tot } = JSON.parse(H.fs.readFileSync('items.json', 'utf8'));
  for (const g in R) { const r = R[g]; console.log(g.padEnd(10), 'files', r.files, 'first-window start', (r.startTok / 1e6).toFixed(0) + 'M', 'of which first user message', (100 * r.briefTok / r.startTok).toFixed(1) + '%', '(' + (100 * r.briefTok / tot).toFixed(2) + ' pts of all)', 'pre-call attachments', (100 * r.attTok / r.startTok).toFixed(1) + '%', 'mean brief chars', Math.round(r.briefChars / r.files)); }
})();
