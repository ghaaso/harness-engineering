'use strict';
// Checks of the stage-2 answer files (out root argv[2]): every configuration present for every task of
// every set (the same task ids as the stage-1 search sweep), no duplicate, extra or held-out id, the
// config_hash equal to the file's hash, no budget exceeded, n_full + cut + beyond = n_units,
// head_tok + tail_tok <= used, lookups = lookups_head + lookups_pad, meta.ledger_len = lookups_head,
// and the padding lookups as the harness counts them (DIR 1, CO 2, none 0).
const fs = require('fs');
const path = require('path');
const H = require('../../arms/common/harness');
const root = process.argv[2];
const list = H.loadArmList('search', 2, false).list;
const S1 = path.join(__dirname, '..', '..', 'results', 'sweep', 'stage1');
const probs = []; const P = (m) => { if (probs.length < 30) console.log('PROBLEM', m); probs.push(m); };
const stats = { files: 0, records: 0, over_budget: 0, lookups_head: [], tokens_read: [], tail_tok_8k_pos: 0 };
for (const set of ['T1', 'T1x', 'T2']) {
  const want = new Set(JSON.parse(fs.readFileSync(path.join(S1, 'search_' + set + '.summary.json'), 'utf8')).task_ids);
  for (const c of list) {
    const f = path.join(root, 'search', 'tune', c.hash + '.' + set + '.jsonl.gz');
    if (!fs.existsSync(f)) { P('missing file ' + c.name + ' ' + set); continue; }
    stats.files++;
    const recs = H.readGzJsonl(f); const seen = new Set();
    for (const a of recs) {
      stats.records++;
      if (seen.has(a.id)) P('duplicate ' + a.id + ' ' + c.name); seen.add(a.id);
      if (!want.has(a.id)) P('extra id ' + a.id + ' ' + c.name);
      if (a.split !== 'tune') P('split ' + a.split + ' ' + a.id);
      if (a.config_hash !== c.hash) P('hash ' + a.id + ' ' + c.name);
      if (a.config_name !== c.name) P('name ' + a.id + ' ' + c.name);
      for (const [b, v] of Object.entries(a.budgets)) {
        if (v.used > Number(b)) { stats.over_budget++; P('over budget ' + b + ' ' + a.id + ' ' + c.name); }
        if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) P('units ' + b + ' ' + a.id + ' ' + c.name);
        if (v.head_tok + v.tail_tok > v.used) P('head+tail > used ' + b + ' ' + a.id);
      }
      if (a.budgets['8000'].tail_tok > 0) stats.tail_tok_8k_pos++;
      const pad = { none: 0, DIR: 1, CO: 2 }[c.cfg.pad || 'none'];
      if (a.lookups_pad !== pad || a.lookups !== a.lookups_head + a.lookups_pad) P('lookups ' + a.id + ' ' + c.name);
      if (!a.meta || a.meta.ledger_len !== a.lookups_head) P('ledger_len ' + a.id + ' ' + c.name);
      if (set === 'T1') { stats.lookups_head.push(a.lookups_head); stats.tokens_read.push(a.meta.tokens_read); }
    }
    for (const id of want) if (!seen.has(id)) P('missing task ' + id + ' ' + c.name + ' ' + set);
  }
}
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const mx = (x) => x.reduce((p, q) => Math.max(p, q), 0);
console.log(JSON.stringify({ problems: probs.length, files: stats.files, records: stats.records, over_budget: stats.over_budget,
  answers_reaching_tail_at_8k: stats.tail_tok_8k_pos,
  T1_lookups_head_median: med(stats.lookups_head), T1_lookups_head_max: mx(stats.lookups_head),
  T1_tokens_read_median: med(stats.tokens_read), T1_tokens_read_max: mx(stats.tokens_read) }));
