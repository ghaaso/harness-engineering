// Debug probe: BFS of one configuration part up to --max states; reports how the state vector grows (sessions,
// coordinators, epochs, record length) by BFS depth, and prints one deepest-growth state.
//   node model/as-built/probe.mjs <ID> [--bud k=2,cs=2] [--max 400000]
import { FAULTS, makeParams, initial, canon, encode, decode, successors } from './model.mjs';
import { CONFIGS } from './configs.mjs';
const a = process.argv.slice(2); const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const cfg = CONFIGS.find((c) => c.id === a[0]);
const over = { ...cfg.over, BUD: { ...cfg.over.BUD } };
if (opt('--bud', null)) { for (const k of FAULTS) over.BUD[k] = 0; for (const kv of opt('--bud').split(',')) { const [k, v] = kv.split('='); over.BUD[k] = +v; } }
const P = makeParams(over); const MAX = +opt('--max', 400000);
const buf = new Uint8Array(1024); const seen = new Map(); const q = []; const depth = [];
const key = (s) => { canon(s, P); const len = encode(s, buf); return Buffer.from(buf.subarray(0, len)).toString('latin1'); };
const s0 = initial(P); const k0 = key(s0); seen.set(k0, 0); q.push(k0); depth.push(0);
const byD = {}; let worst = null;
for (let i = 0; i < q.length && seen.size < MAX; i++) {
  const st = decode(Buffer.from(q[i], 'latin1')); const d = depth[i];
  const m = byD[d] ??= { n: 0, S: 0, C: 0, ep: 0, A: 0, W: 0 };
  m.n++; m.S = Math.max(m.S, st.S.length); m.C = Math.max(m.C, st.C.length); m.ep = Math.max(m.ep, ...st.T.map((t) => t.ep)); m.A = Math.max(m.A, st.A.length); m.W = Math.max(m.W, st.W.length);
  if (!worst || st.S.length > worst.S.length) worst = st;
  for (const x of successors(st, P, false)) { const k = key(x.s); if (!seen.has(k)) { seen.set(k, d + 1); q.push(k); depth.push(d + 1); } }
}
console.log(`states ${seen.size}`);
for (const [d, m] of Object.entries(byD)) console.log(`depth ${d}: ${m.n} states, max sessions ${m.S}, coords ${m.C}, max ep ${m.ep}, alarms ${m.A}, watchers ${m.W}`);
console.log(JSON.stringify({ T: worst.T, S: worst.S, C: worst.C, A: worst.A, W: worst.W, ce: worst.ce }));
