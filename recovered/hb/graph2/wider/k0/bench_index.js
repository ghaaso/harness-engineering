'use strict';
// Cost of keeping the dependency index, at the frozen commit: time to answer every question with and
// without recording, time to turn the records into dependency arrays, and the arrays' real byte size.
// Run alone (no replay running) so the timings are not shared with other processes.
const fs = require('fs');
const path = require('path');
const C = require('./conf');
const { Snap } = require('./load');
const { Rec, derivation, flatDep } = require('./rec');
const { P } = require('./programs');

class NullRec extends Rec {
  node(sid) { return this.s.node.get(sid) || null; }
  _edges(t, sid, kinds) { const ks = new Set(kinds); const src = t === 'O' ? this.s.out.get(sid) : this.s.inn.get(sid); return (src || []).filter((e) => ks.has(e.kind)); }
  incident() { return []; }
  byPath(p) { return this.s.byPath.get(p) || []; }
  byName(n) { return this.s.byName.get(n) || []; }
  sub(name, args, fn) { return fn(this); }
}
const Q = JSON.parse(fs.readFileSync(path.join(C.DATA, 'questions.json'), 'utf8')).questions.filter((q) => q.exists_at.includes(C.FROZEN));
const S = new Snap(C.FROZEN);
const ms = (f) => { const t = process.hrtime.bigint(); f(); return Number(process.hrtime.bigint() - t) / 1e6; };
const res = {};
for (const group of ['kinds_1_to_8', 'completion']) {
  const qs = Q.filter((q) => (group === 'completion') === (q.kind === 'completion'));
  // warm up
  for (const q of qs.slice(0, 3)) { P[q.kind](new NullRec(S), q.target); P[q.kind](new Rec(S), q.target); }
  const reps = 3; let tNull = 0; let tRec = 0; let tFin = 0; let bytes = 0;
  for (let r = 0; r < reps; r++) {
    tNull += ms(() => { for (const q of qs) P[q.kind](new NullRec(S), q.target); });
    const recs = [];
    tRec += ms(() => { for (const q of qs) { const rec = new Rec(S); const a = P[q.kind](rec, q.target); recs.push([rec, a]); } });
    let deps = [];
    tFin += ms(() => { deps = recs.map(([rec, a]) => flatDep(derivation(rec, a))); });
    if (r === 0) for (const d of deps) for (const k of ['nk', 'nhf', 'nhs', 'npos', 'ek', 'ehf', 'ehs', 'epos', 'pk', 'ph', 'fk', 'fb']) bytes += d[k].byteLength;
  }
  res[group] = { questions: qs.length, ms_answer_without_recording: +(tNull / reps).toFixed(1), ms_answer_with_recording: +(tRec / reps).toFixed(1), ms_to_dependency_arrays: +(tFin / reps).toFixed(1), dependency_array_bytes_all_questions: bytes, bytes_per_question: Math.round(bytes / qs.length) };
}
console.log(JSON.stringify(res, null, 1));
fs.writeFileSync(path.join(C.OUT, 'bench_index.json'), JSON.stringify({ commit: C.FROZEN, note: 'note: the NullRec run of kind 9 skips the incident-edge scan entirely, so its difference is the full recording cost; the JS heap overhead of Maps during recording is not counted in bytes', ...res }, null, 1));
