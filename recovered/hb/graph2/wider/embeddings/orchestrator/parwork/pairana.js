// node pairana.js PAIR TAG1 TAG2  -> pair-<PAIR>-analysis.json + hashes-<PAIR>.tsv
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const A = require('./ana.js'); const P = __dirname;
const [PAIR, T1, T2] = process.argv.slice(2);
const ALONE_TAGS = ['m1_pass1', 'm1_pass2', 'm1_det1', 'm1_det2', 'm1b_nondet3', 'm1b_nondet4', 'm1b_det1', 'm1b_det2'];
const alone = {}; ALONE_TAGS.forEach(t => A.runs(t).filter(r => r.status === 'done').forEach(r => (alone[A.key(r)] = alone[A.key(r)] || []).push(r)));
const drv = fs.readFileSync(path.join(P, 'logs', PAIR + '.driver'), 'utf8').split('\n');
const tS = +drv.find(l => /STEADY/.test(l)).split(' ')[0], tE = +drv.find(l => /STOP file/.test(l)).split(' ')[0];
const W = tE - tS;
function refPhase(k, ph) {
  const rs = alone[k]; const d = rs.map(r => { const p = A.phases(r).find(x => x.k === ph); return p ? p.b - p.a : null; }).filter(x => x != null);
  return ph === 'p0' ? Math.min(...d) : A.mean(d);
}
function rawLines(tag) { return fs.readFileSync(path.join(P, 'runs', tag + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse); }
const life = {}; [T1, T2].forEach(t => { const L = rawLines(t); life[t] = [L.find(x => x.event === 'start').t, (L.find(x => x.event === 'end') || { t: Infinity }).t]; });
const G = A.gpu(PAIR), H = A.host(PAIR);
const out = { pair: PAIR, window: { t_start: tS, t_end: tE, seconds: W }, containers: {}, units: [] };
const hashRows = ['pair\ttag\ti\tunit\toverlapped_other\tidentical_to_alone_ref\treps\tlosses\tpool\tunrestricted\tcounts\tfirst_loss_diff_epoch\tlosses_sha'];
let comb = 0;
for (const [tag, other] of [[T1, T2], [T2, T1]]) {
  const rs = A.runs(tag); let eq = 0, epochsInW = 0; const spe = {};
  for (const r of rs) {
    const k = A.key(r);
    for (const ph of A.phases(r)) {
      const a = Math.max(ph.a, tS), b = Math.min(ph.b, tE); if (b <= a) continue;
      const f = (b - a) / (ph.b - ph.a); eq += f * refPhase(k, ph.k);
      if (ph.k !== 'p0' && ph.k !== 'tail' && ph.b <= tE && ph.a >= tS) epochsInW++;
    }
    if (r.status === 'done') {
      const ov = !(r.t_end <= life[other][0] || r.t_call >= life[other][1]);
      const inW = r.t_call >= tS && r.t_end <= tE;
      const ref = alone[k][0]; const s = A.same(r, ref);
      const alt = alone[k].slice(1).map(x => A.same(r, x).identical);
      const rec = { tag, i: r.i, unit: k, overlapped_other_container: ov, fully_in_window: inW, wall_s: +(r.t_end - r.t_call).toFixed(2),
        s_per_epoch_after_first: +A.spe(r).toFixed(4), alone_s_per_epoch_after_first: +A.mean(alone[k].map(A.spe)).toFixed(4),
        identical_to_alone: s.identical, identical_to_any_alone_run: s.identical || alt.some(Boolean), detail: s };
      out.units.push(rec);
      if (inW) (spe[k] = spe[k] || []).push(A.spe(r));
      const ls = crypto.createHash('sha256').update(JSON.stringify(r.losses)).digest('hex');
      hashRows.push([PAIR, tag, r.i, k, ov, s.identical, s.reps, s.losses, s.pool, s.unrestricted, s.counts, s.first_loss_diff_epoch, ls].join('\t'));
    }
  }
  const M = A.mem(tag);
  out.containers[tag] = { alone_equivalent_seconds_in_window: +eq.toFixed(1), throughput_vs_alone: +(eq / W).toFixed(3), epochs_completed_in_window: epochsInW,
    s_per_epoch_in_window_vs_alone: Object.fromEntries(Object.entries(spe).map(([k, v]) => [k, { pair: +A.mean(v).toFixed(4), alone: +A.mean(alone[k].map(A.spe)).toFixed(4), ratio_alone_over_pair: +(A.mean(alone[k].map(A.spe)) / A.mean(v)).toFixed(3), n: v.length }])),
    peak_anon_mb_in_window: +A.peakAnon(M, tS, tE).toFixed(0), peak_anon_mb_whole_run: +A.peakAnon(M, 0, 1e12).toFixed(0) };
  comb += eq / W;
}
out.combined_speedup = +comb.toFixed(3);
const both = [Math.max(life[T1][0], life[T2][0]), Math.min(life[T1][1], life[T2][1])];
const Hb = H.filter(h => h.t >= both[0] - 10 && h.t <= both[1] + 10);
out.host_while_both = { min_free_gb: +(Math.min(...Hb.map(h => h.free)) / 2 ** 20).toFixed(2), max_commit_gb: +(Math.max(...Hb.map(h => h.commit)) / 2 ** 20).toFixed(2), samples: Hb.length,
  other_kge: [...new Set(Hb.map(h => h.others).filter(Boolean))] };
const gb = A.busy(G, tS, tE); out.card_in_window = { util_mean_pct: +gb.util.toFixed(1), power_mean_w: +gb.power.toFixed(1), mem_mb_max: gb.mem_mb_max, samples: gb.n };
out.all_finished_identical = out.units.every(u => u.identical_to_alone);
fs.writeFileSync(path.join(P, 'pair-' + PAIR + '-analysis.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(P, 'hashes-' + PAIR + '.tsv'), hashRows.join('\n') + '\n');
console.log(JSON.stringify({ window: out.window.seconds, containers: out.containers, combined: out.combined_speedup, host: out.host_while_both, card: out.card_in_window }, null, 1));
out.units.forEach(u => console.log(u.tag, u.i, u.unit, 'ov', u.overlapped_other_container, 'inW', u.fully_in_window, 'wall', u.wall_s, 'spe', u.s_per_epoch_after_first, '/', u.alone_s_per_epoch_after_first, 'ident', u.identical_to_alone, u.identical_to_alone ? '' : JSON.stringify(u.detail)));
