// The measurements behind count-gate.mjs's times (unit T8-FIX, 2026-11-24; fix B4 of research-tree/build/refute/TOP8.md).
// Read only: this project's helper files and .claude/logs/plan-gate.jsonl. Usage: node measure-numbers.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const P = 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const LOG = 'C:/Users/User/Documents/projects/harness-engineering/.claude/logs/plan-gate.jsonl';
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(p * (b.length - 1))] : null; };
// (a) a finished helper: its transcript's last write after its meta's (finished: true), in seconds.
const lag = [];
for (const s of readdirSync(P)) {
  const d = join(P, s, 'subagents'); if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.meta.json')) continue;
    let m; try { m = JSON.parse(readFileSync(join(d, f), 'utf8')); } catch { continue; }
    const tp = join(d, f.replace(/\.meta\.json$/, '.jsonl'));
    if (!m.finished || !existsSync(tp)) continue;
    lag.push((statSync(tp).mtimeMs - statSync(join(d, f)).mtimeMs) / 1000);
  }
}
// (b) revivals: SubagentStop ("end") to the same helper's next SubagentStart ("run"), in seconds.
const L = readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const lastEnd = new Map(), rev = [];
for (const o of L) {
  if (o.ev === 'end' && o.agent) lastEnd.set(o.agent, o.t);
  if (o.ev === 'run' && o.agent && lastEnd.has(o.agent)) { rev.push((o.t - lastEnd.get(o.agent)) / 1000); lastEnd.delete(o.agent); }
}
// (c) pending: PreToolUse ("allow") to the Agent call's return ("start"), same tool_use id, in seconds.
const st = new Map(L.filter((o) => o.ev === 'start').map((o) => [o.tu, o.t])), pend = [];
for (const a of L.filter((o) => o.ev === 'allow' && o.tu)) if (st.has(a.tu)) pend.push((st.get(a.tu) - a.t) / 1000);
const fmt = (a) => ({ n: a.length, min: q(a, 0), median: q(a, 0.5), max: q(a, 1) });
console.log(JSON.stringify({ finishedLag_s: fmt(lag), revivalGap_s: fmt(rev), pending_s: fmt(pend), planGateLines: L.length, from: new Date(L[0].t).toISOString(), to: new Date(L[L.length - 1].t).toISOString() }));
