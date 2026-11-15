// parwork analysis helpers: node ana.js m1   (writes m1-analysis.json and hashes-m1.tsv)
const fs = require('fs'), path = require('path');
const P = __dirname;
const rd = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean) : [];
function runs(tag) { return rd(path.join(P, 'runs', tag + '.jsonl')).map(JSON.parse).filter(r => r.status); }
function gpu(tag) {
  const L = rd(path.join(P, 'logs', tag + '.gpu')); const z = (L[0].match(/ ([+-]\d{4})$/) || [])[1] || '+0500';
  const tz = z.slice(0, 3) + ':' + z.slice(3);
  return L.slice(1).map(l => l.split(', ')).filter(a => a.length >= 5).map(a => ({
    t: Date.parse(a[0].replace(/\//g, '-').replace(' ', 'T') + tz) / 1000, util: parseFloat(a[1]), mem: parseFloat(a[2]), pw: parseFloat(a[3]), temp: parseFloat(a[4]), sm: parseFloat(a[5]) }));
}
function mem(tag) { return rd(path.join(P, 'logs', tag + '.mem')).map(l => { const a = l.split(/\s+/); return { t: +a[0], anon: +a[2], file: +a[4], current: +a[8] }; }); }
function host(tag) { return rd(path.join(P, 'logs', tag + '.host')).filter(l => /free_kb/.test(l)).map(l => ({ t: +l.split(' ')[0], free: +l.match(/free_kb=(\d+)/)[1], commit: +l.match(/commit_kb=(\d+)/)[1], others: l.match(/others=\[(.*)\]/)[1].trim() })); }
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function key(r) { return r.unit + (r.det ? '/det' : ''); }
function fp(r) { // fingerprint of a finished unit: everything that must be byte-identical
  return { reps: Object.fromEntries(Object.entries(r.reps_tensors).map(([k, v]) => [k, v.sha256 || v.value])), losses: r.losses,
    pool: r.tables_sha256.pool, unrestricted: r.tables_sha256.unrestricted, counts: r.counts_sha256 }; }
function same(a, b) { const A = fp(a), B = fp(b); const out = {};
  out.reps = JSON.stringify(A.reps) === JSON.stringify(B.reps);
  out.losses = A.losses.length === B.losses.length && A.losses.every((x, i) => x === B.losses[i]);
  out.first_loss_diff_epoch = out.losses ? null : A.losses.findIndex((x, i) => x !== B.losses[i]) + 1;
  out.pool = A.pool === B.pool; out.unrestricted = A.unrestricted === B.unrestricted; out.counts = A.counts === B.counts;
  out.identical = out.reps && out.losses && out.pool && out.unrestricted && out.counts; return out; }
function spe(r) { return r.epoch_s ? mean(r.epoch_s.slice(1)) : null; }
function phases(r) { // [start, end] of: p0 (call -> end of epoch 1), epochs 2..n, tail (last epoch end -> unit end)
  const e = r.t_ep_end || []; const ph = [{ k: 'p0', a: r.t_call, b: e[0] }];
  for (let i = 1; i < e.length; i++) ph.push({ k: 'e' + (i + 1), a: e[i - 1], b: e[i] });
  if (r.status === 'done') ph.push({ k: 'tail', a: e[e.length - 1], b: r.t_end });
  return ph.filter(p => p.a && p.b); }
function busy(G, a, b) { const s = G.filter(g => g.t >= a && g.t <= b); return { n: s.length, util: mean(s.map(g => g.util)), power: mean(s.map(g => g.pw)), mem_mb_max: Math.max(...s.map(g => g.mem)) }; }
function peakAnon(M, a, b) { const s = M.filter(m => m.t >= a && m.t <= b); return s.length ? Math.max(...s.map(m => m.anon)) / 2 ** 20 : null; }
module.exports = { runs, gpu, mem, host, mean, median, key, fp, same, spe, phases, busy, peakAnon };

if (require.main === module && process.argv[2] === 'm1') {
  const G = gpu('m1'), M = mem('m1'), H = host('m1');
  const tags = ['m1_pass1', 'm1_pass2', 'm1_det1', 'm1_det2'];
  const R = {}; tags.forEach(t => runs(t).forEach(r => { (R[key(r)] = R[key(r)] || []).push(r); }));
  const units = {}; const hashRows = ['unit\trun\treps_file_sha256\ttensor\tsha256\tlosses_sha\tpool\tunrestricted\tcounts'];
  const crypto = require('crypto');
  for (const [k, rs] of Object.entries(R)) {
    const u = units[k] = { runs: rs.map(r => ({ tag: r.tag, order_in_process: r.i, status: r.status, wall_s: +(r.t_end - r.t_call).toFixed(2),
      s_per_epoch_after_first: +spe(r).toFixed(4), s_per_epoch_median_after_first: +median(r.epoch_s.slice(1)).toFixed(4), first_epoch_s: +r.epoch_s[0].toFixed(3),
      load_to_first_epoch_end_s: +(r.t_ep_end[0] - r.t_call).toFixed(2), tail_s: +(r.t_end - r.t_ep_end[r.t_ep_end.length - 1]).toFixed(2),
      card_busy_pct_training: +busy(G, r.t_ep_end[0], r.t_ep_end[r.t_ep_end.length - 1]).util.toFixed(1),
      card_samples: busy(G, r.t_ep_end[0], r.t_ep_end[r.t_ep_end.length - 1]).n,
      power_w: +busy(G, r.t_ep_end[0], r.t_ep_end[r.t_ep_end.length - 1]).power.toFixed(1),
      peak_anon_mb: peakAnon(M, r.t_call, r.t_end), peak_cuda_reserved_mb: r.peak_cuda_reserved_mb, peak_rss_mb: r.peak_rss_mb,
      losses: r.losses, epochs: r.epochs })) };
    if (rs.length >= 2) u.identical_between_alone_runs = same(rs[0], rs[1]);
    rs.forEach(r => { const ls = crypto.createHash('sha256').update(JSON.stringify(r.losses)).digest('hex');
      for (const [tk, tv] of Object.entries(r.reps_tensors)) hashRows.push([k, r.tag, r.reps_file_sha256, tk, tv.sha256 || tv.value, ls, r.tables_sha256.pool, r.tables_sha256.unrestricted, r.counts_sha256].join('\t')); });
  }
  const perArm = {};
  for (const [k, u] of Object.entries(units)) { const arm = k.split('/')[0] + (k.endsWith('/det') ? '-det' : '');
    const p = perArm[arm] = perArm[arm] || { busy: [], anon: [] }; u.runs.forEach(r => { p.busy.push(r.card_busy_pct_training); p.anon.push(r.peak_anon_mb); }); }
  for (const a in perArm) perArm[a] = { card_busy_pct_mean: +mean(perArm[a].busy).toFixed(1), card_busy_pct_runs: perArm[a].busy, peak_anon_mb: Math.max(...perArm[a].anon) };
  const out = { units, per_arm: perArm, host_min_free_gb: Math.min(...H.map(h => h.free)) / 2 ** 20, host_max_commit_gb: Math.max(...H.map(h => h.commit)) / 2 ** 20,
    other_kge_seen: [...new Set(H.map(h => h.others).filter(Boolean))], gpu_samples: G.length };
  fs.writeFileSync(path.join(P, 'm1-analysis.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(P, 'hashes-m1.tsv'), hashRows.join('\n') + '\n');
  for (const [k, u] of Object.entries(units)) console.log(k.padEnd(30), 'identical:', JSON.stringify(u.identical_between_alone_runs), '|', u.runs.map(r => `${r.tag} wall ${r.wall_s} spe ${r.s_per_epoch_after_first} busy ${r.card_busy_pct_training}% (${r.card_samples}) anon ${r.peak_anon_mb && r.peak_anon_mb.toFixed(0)}`).join(' || '));
  console.log(JSON.stringify(perArm)); console.log('host', out.host_min_free_gb.toFixed(2), out.host_max_commit_gb.toFixed(2), out.other_kge_seen, 'gpu samples', G.length);
}
