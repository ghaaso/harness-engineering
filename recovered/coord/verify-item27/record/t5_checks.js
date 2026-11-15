const fs = require('fs'), crypto = require('crypto'), zlib = require('zlib'), path = require('path');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/record/t5_result.txt';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const o = []; const P = s => o.push(s);
const recB = fs.readFileSync(LANE + '/train/heldout/item27.json'); const rec = JSON.parse(recB);
const recSha = sha(recB);
// --- tables digest (ruling 82, selectB.tables_digest replicated)
const plan = JSON.parse(fs.readFileSync(LANE + '/train/stageB/plan.json', 'utf8'));
const tb = LANE + '/train/stageB/tables';
const fsha = (p, gz) => { if (!fs.existsSync(p)) return 'missing'; const b = fs.readFileSync(p); return sha(gz ? zlib.gunzipSync(b) : b); };
let s = 'plan.json\t' + fsha(LANE + '/train/stageB/plan.json', false) + '\n'; let nfiles = 0, nmissing = 0;
for (const arm of Object.keys(plan.configs).sort()) for (const c of plan.configs[arm]) for (const sd of [1, 2, 3])
  for (const [suf, gz] of [['_pool.tsv.gz', true], ['_unrestricted.tsv.gz', true], ['_counts.json', false]]) {
    const n = `${arm}_${c.config_id}_s${sd}${suf}`; const h = fsha(path.join(tb, n), gz); nfiles++; if (h === 'missing') nmissing++;
    s += `${n}\t${h}\n`;
  }
const td = sha(Buffer.from(s, 'utf8'));
P(`tables digest recomputed ${td} over ${nfiles} files (${nmissing} missing), arms ${Object.keys(plan.configs).sort()}; record ${rec.tables_digest}; equal ${td === rec.tables_digest}`);
// --- stamps
const tuneB = fs.readFileSync(LANE + '/train/report/tune.json'); const tune = JSON.parse(tuneB);
P(`tune.json sha256 ${sha(tuneB)} record stamp_tune.tune_sha256 ${rec.stamp_tune.tune_sha256} equal ${sha(tuneB) === rec.stamp_tune.tune_sha256}`);
const repSha = sha(fs.readFileSync(LANE + '/train/report.py'));
P(`report.py sha256 ${repSha} record stamp_tune.report_sha256 ${rec.stamp_tune.report_sha256} equal ${repSha === rec.stamp_tune.report_sha256}; tune.json stamp.report_sha256 ${tune.stamp.report_sha256}`);
const planSha = sha(fs.readFileSync(LANE + '/train/stageB/plan.json'));
P(`plan.json sha256 ${planSha} record plan_sha256 ${rec.plan_sha256} equal ${planSha === rec.plan_sha256}; plan.plan_hash ${plan.plan_hash} record plan_hash ${rec.plan_hash} equal ${plan.plan_hash === rec.plan_hash}; plan.s ${plan.s} record s ${rec.s}; plan.device ${JSON.stringify(plan.device)}`);
P(`tune.json test ${tune.test} plan_hash eq ${tune.plan_hash === rec.plan_hash} stamp.tables_digest eq record ${tune.stamp.tables_digest === rec.tables_digest}`);
for (const arm of ['E1', 'E2', 'E3', 'E4', 'E5']) {
  const cj = LANE + `/train/selectB/${arm}/choices.json`; const cb = fs.readFileSync(cj); const c = JSON.parse(cb);
  const f = c.final_all65; const a = rec.arms[arm];
  const tf = (tune.choices[arm] || {}).final_all65 || {};
  P(`${arm}: choices.json sha ${sha(cb) === rec.choices_sha256[arm]} (tune stamp ${tune.stamp.choices_sha256[arm] === rec.choices_sha256[arm]}); stamp digest ${(c.stamp || {}).tables_digest === rec.tables_digest}; final_all65 ${f.config_id} ${f.w} ${f.mean}; tune.choices ${tf.config_id} ${tf.w} ${tf.mean}; record ${a.config_id} ${a.w} ${a.mean}; eq ${f.config_id === a.config_id && +f.w === +a.w && f.mean === a.mean && tf.config_id === a.config_id && +tf.w === +a.w && tf.mean === a.mean}`);
  // ruling 53 re-run on the record's own candidate stats, and cfg/epochs/size against plan.json
  const cfgOf = Object.fromEntries(plan.configs[arm].map(x => [x.config_id, x]));
  const size = id => [cfgOf[id].cfg.embedding_dim || 0, cfgOf[id].cfg.num_layers || 0];
  const C = a.candidates; const top = Math.max(...C.map(x => x.mean));
  const tied = C.filter(x => x.mean === top); const best = tied.sort((x, y) => (y.se - x.se) || (x.config_id < y.config_id ? -1 : x.config_id > y.config_id ? 1 : 0) || (x.w - y.w))[0];
  const band = C.filter(x => x.mean >= top - best.se);
  const cmp = (x, y) => { const sx = size(x.config_id), sy = size(y.config_id); return (sx[0] - sy[0]) || (sx[1] - sy[1]) || (y.mean - x.mean) || (x.config_id < y.config_id ? -1 : x.config_id > y.config_id ? 1 : 0) || (x.w - y.w); };
  const pick = band.slice().sort(cmp)[0];
  P(`   rule53 from record candidates: n=${C.length} band=${band.length} best=${best.config_id}/${best.w} pick=${pick.config_id}/${pick.w} mean ${pick.mean}; record pick ${a.config_id}/${a.w}; eq ${pick.config_id === a.config_id && pick.w === a.w && pick.mean === a.mean}; cfg eq plan ${JSON.stringify(cfgOf[a.config_id].cfg) === JSON.stringify(a.cfg)} epochs plan ${cfgOf[a.config_id].epochs} record ${a.epochs}; size ${size(a.config_id)} record ${a.size}; plan configs ${plan.configs[arm].map(x => x.config_id + ':' + JSON.stringify(size(x.config_id)))}; candidate ids eq plan x w ${JSON.stringify([...new Set(C.map(x => x.config_id))].sort()) === JSON.stringify(plan.configs[arm].map(x => x.config_id).sort())} ws ${JSON.stringify(C.map(x => x.w))}`);
}
const order = ['E3', 'E1', 'E2', 'E4', 'E5'];
const r4 = x => Math.round(x * 1e4) / 1e4;
const figs = Object.fromEntries(Object.entries(rec.arms).map(([k, v]) => [k, v.mean]));
const topf = Math.max(...Object.values(figs).map(r4)); const tg = Object.keys(figs).filter(k => r4(figs[k]) === topf);
const chosen = tg.sort((x, y) => (rec.arms[x].size[0] - rec.arms[y].size[0]) || (rec.arms[x].size[1] - rec.arms[y].size[1]) || (order.indexOf(x) - order.indexOf(y)))[0];
P(`ruling 57: figures 4dp ${JSON.stringify(Object.fromEntries(Object.entries(figs).map(([k, v]) => [k, r4(v)])))} tie group ${tg} chosen ${chosen}; record chosen ${rec.chosen.arm} tie_group ${rec.tie_group_4dp}`);
const ch = rec.chosen, ac = rec.arms[ch.arm];
P(`chosen vs arms[${ch.arm}]: config ${ch.config_id === ac.config_id} cfg ${JSON.stringify(ch.cfg) === JSON.stringify(ac.cfg)} w ${ch.w === ac.w} epochs ${ch.epochs === ac.epochs} figure ${ch.figure_all65 === ac.mean} se ${ch.se === ac.se}`);
P(`types: chosen.arm ${typeof ch.arm} config_id ${typeof ch.config_id} cfg ${typeof ch.cfg} w ${typeof ch.w} epochs ${typeof ch.epochs}/${Number.isInteger(ch.epochs)} s ${typeof rec.s} device ${rec.device} image ${rec.image_id} test ${rec.test} (${typeof rec.test}) tables ${rec.tables} frozen_at ${rec.frozen_at}`);
const nulls = []; const walk = (x, p) => { if (x === null) nulls.push(p); else if (typeof x === 'object') for (const k in x) walk(x[k], p + '.' + k); }; walk(rec, 'rec');
P(`null fields anywhere: ${JSON.stringify(nulls)}`);
P(`record keys ${Object.keys(rec).sort()}`);
// --- progress.jsonl
const pgB = fs.readFileSync(LANE + '/progress.jsonl'); const pg = pgB.toString('utf8');
P(`progress.jsonl bytes ${pgB.length} sha256 ${sha(pgB)} last byte 0x${pgB[pgB.length - 1].toString(16)} CRLF count ${(pg.match(/\r\n/g) || []).length} BOM ${pgB[0] === 0xef}`);
const L = pg.split('\n'); let i27 = 0; const want = ['code_freeze', 'grader_frozen', 'tune_report', 'tune_rank_check', 'tables_digest'];
const last = {};
L.forEach((l, i) => { let r; try { r = JSON.parse(l); } catch (e) { if (l.trim()) P('unparsable line ' + (i + 1)); return; } if (r.step === 'coordinator' && r.unit === 'item27_freeze') i27++; if (r.step === 'coordinator' && want.includes(r.unit)) last[r.unit] = { line: i + 1, t: r.t, sha256: r.sha256, file: r.file, handoff_sha256: r.handoff_sha256, status: (r.status || '').slice(0, 120), keys: Object.keys(r) }; });
P(`item27_freeze lines now: ${i27}; total lines ${L.filter(x => x.trim()).length}`);
for (const u of want) P(`${u}: ${JSON.stringify(last[u])}; before frozen_at ${last[u] && last[u].t < rec.frozen_at}`);
const tdl = L.find(l => l.includes('"unit":"tables_digest"')); P('tables_digest line digest mention: ' + ((tdl || '').match(/[0-9a-f]{64}/g) || []).join(',') + ' ; contains record digest ' + (tdl || '').includes(rec.tables_digest));
const trj = LANE + '/grader-returns/tune-rank.json'; const trB = fs.readFileSync(trj); const tr = JSON.parse(trB);
const hoB = fs.readFileSync(LANE + '/train/report/answer_level/handoff/HANDOFF.json');
P(`tune-rank.json sha ${sha(trB)} eq line ${sha(trB) === last.tune_rank_check.sha256}; HANDOFF sha ${sha(hoB)} eq line ${sha(hoB) === last.tune_rank_check.handoff_sha256} eq return ${tr.handoff_sha256 === sha(hoB)}`);
const tl = L.find(l => l.includes('"unit":"tune_report"')); P('tune_report line hashes: ' + ((tl || '').match(/[0-9a-f]{64}/g) || []).join(',') + '; mentions tune sha ' + (tl || '').includes(rec.stamp_tune.tune_sha256));
// --- simulate the anchor on a scratch copy (replicating heldout.anchor_line)
const line = JSON.stringify({ step: 'coordinator', unit: 'item27_freeze', file: 'train/heldout/item27.json', sha256: recSha, t: '2026-11-15T17:40:00Z' });
const sim = pg + (pg.endsWith('\n') ? '' : '\n') + line + '\n';
const simRaw = pg + line + '\n';
const anchor = txt => { const f = []; for (const l of txt.split('\n')) { let r; try { r = JSON.parse(l); } catch (e) { continue; } if (r && typeof r === 'object' && !Array.isArray(r) && r.step === 'coordinator' && r.unit === 'item27_freeze') f.push(r); } if (f.length !== 1) return 'found ' + f.length; if (f[0].file !== 'train/heldout/item27.json') return 'file'; if (!/^[0-9a-f]{64}$/.test(String(f[0].sha256))) return 'hex'; return f[0].sha256; };
P(`anchor line as given: ${line}`);
P(`simulated anchor on copy (newline-safe): ${anchor(sim)} eq record sha ${anchor(sim) === recSha}; raw append without adding newline: ${anchor(simRaw)}`);
P(`.sha256 file first token ${fs.readFileSync(LANE + '/train/heldout/item27.json.sha256', 'utf8').split(/\s+/)[0] === recSha}`);
fs.writeFileSync(OUT, o.join('\n'));
console.log(o.join('\n'));
