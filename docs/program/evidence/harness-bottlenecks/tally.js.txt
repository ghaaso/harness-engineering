const fs = require('fs'), path = require('path'), readline = require('readline');
const P = 'C:/Users/User/.claude/projects';
const dirs = fs.readdirSync(P).filter(d => d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
const groups = {};
const walk = (d, out) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; };
(async () => {
  let files = 0, bytes = 0;
  for (const d of dirs) {
    const isWt = d.includes('worktrees');
    const all = walk(path.join(P, d), []);
    for (const f of all) {
            const rel = path.relative(path.join(P, d), f).split(path.sep).join("/");
      const isSub = rel.includes('/');           // anything below the folder root = subagent / workflow transcript
      const g = (isWt ? 'slice' : 'root') + (isSub ? '-subagents' : '-main');
      groups[g] = groups[g] || { calls: 0, cr: 0, cc: 0, inp: 0, out: 0, ids: new Set() };
      files++; bytes += fs.statSync(f).size;
      const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.indexOf('"usage"') < 0 || line.indexOf('"timestamp":"2026-11') < 0) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const m = o.message; if (!m || !m.usage || !m.id) continue;
        const G = groups[g]; if (G.ids.has(m.id)) continue; G.ids.add(m.id);
        const u = m.usage; G.calls++; G.cr += u.cache_read_input_tokens || 0; G.cc += u.cache_creation_input_tokens || 0; G.inp += u.input_tokens || 0; G.out += u.output_tokens || 0;
      }
    }
  }
  let tot = 0; for (const g in groups) tot += groups[g].cr;
  console.log(`project folders ${dirs.length}, transcript files ${files}, ${(bytes / 1e6).toFixed(0)} MB`);
  for (const g of Object.keys(groups).sort()) { const G = groups[g]; console.log(`${g.padEnd(16)} calls ${String(G.calls).padStart(6)}  cache-read ${(G.cr / 1e6).toFixed(1).padStart(8)}M (${(100 * G.cr / tot).toFixed(1)}%)  cache-write ${(G.cc / 1e6).toFixed(1)}M  output ${(G.out / 1e6).toFixed(1)}M  mean context/call ${Math.round((G.cr + G.cc + G.inp) / Math.max(1, G.calls) / 1000)}k`); }
  console.log(`total cache-read ${(tot / 1e6).toFixed(1)}M`);
})();
