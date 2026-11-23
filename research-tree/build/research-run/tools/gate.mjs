// node gate.mjs <unit> --all <percent> --fable <percent>
// The rule (PILOT-PLAN v2 s3; r57-0414), per meter and on the cap. Prints START or HOLD and appends it to run/usage.log.
// Starts are numbered slots run/gate/<k>.json, created with the exclusive flag: k = 1 + the highest slot read; if another
// call won that slot (EEXIST) the decision is made again on the new slots. No lock file; a slot left by a killed call is a
// START like any other. HOLD makes no slot.
import fs from 'node:fs';
import path from 'node:path';
import { RUN, readConfig, tokensByUnit, totalOf } from './lib.mjs';

const a = process.argv.slice(2);
const unit = a[0];
const get = k => { const i = a.indexOf(k); return i >= 0 ? Number(a[i + 1]) : NaN; };
const rdAll = get('--all'), rdFab = get('--fable');
const f2 = x => (Math.round(x * 100) / 100).toString();

function emit(line, code = 0) {
  try { fs.mkdirSync(path.join(RUN, 'run'), { recursive: true }); fs.appendFileSync(path.join(RUN, 'run', 'usage.log'), `${new Date().toISOString()} ${line}\n`); } catch {}
  console.log(line);
  process.exit(code);
}
if (!unit || unit.startsWith('--') || !Number.isFinite(rdAll) || !Number.isFinite(rdFab)) {
  console.log('usage: node gate.mjs <unit> --all <percent> --fable <percent>');
  process.exit(64);
}
const hold = why => emit(`HOLD ${unit}: ${why}`, 1);
const slotDir = path.join(RUN, 'gate');

// Decide once on what is on disk now. Returns { line, slot } for START or calls hold().
function decide() {
  const cfg = readConfig();
  if (!cfg) hold('run/config.json is missing or unreadable');
  if (cfg.preparation_M === null || cfg.preparation_M === undefined) hold('preparation_M is null (top session 5 has not written the preparation tokens)');
  for (const k of ['cap_M', 'preparation_M', 'm_per_point_all', 'm_per_point_fable', 'protected_all_points_per_hour', 'protected_fable_M_per_hour'])
    if (typeof cfg[k] !== 'number' || !Number.isFinite(cfg[k])) hold(`config field ${k} is not a number`);
  const uc = cfg.units && cfg.units[unit];
  if (!uc || typeof uc.expected_M !== 'number') hold(`no units.${unit}.expected_M in config`);
  const co = cfg.coordinator;
  if (!co || typeof co.expected_M !== 'number') hold('no coordinator.expected_M in config');

  const now = process.env.GATE_NOW ? new Date(process.env.GATE_NOW) : new Date();
  const reset = (cfg.resets_utc || []).map(s => new Date(s)).filter(d => d > now).sort((x, y) => x - y)[0];
  if (!reset) hold('no reset in resets_utc after now');
  const hours = (reset - now) / 3600000;

  // running = a START slot and no RETURN.md (fields) or done_file (others)
  const started = new Set();
  let top = 0;
  try {
    for (const n of fs.readdirSync(slotDir)) {
      const m = /^(\d+)\.json$/.exec(n);
      if (!m) continue;
      top = Math.max(top, Number(m[1]));
      try { const s = JSON.parse(fs.readFileSync(path.join(slotDir, n), 'utf8')); if (s && s.unit) started.add(s.unit); } catch {}
    }
  } catch {}
  const isDone = u => {
    const fm = /^f(\d)$/.exec(u);
    if (fm) {
      const d = path.join(RUN, 'fields');
      try { return fs.readdirSync(d).some(n => n.startsWith(fm[1] + '-') && fs.existsSync(path.join(d, n, 'RETURN.md'))); } catch { return false; }
    }
    const df = cfg.units[u] && cfg.units[u].done_file;
    return !!df && fs.existsSync(path.resolve(RUN, df));
  };
  const used = tokensByUnit();
  const tok = u => (used.get(u) ? used.get(u).total : 0) / 1e6;
  const running = [...started].filter(u => u !== unit && cfg.units[u] && !isDone(u));
  const reserves = running.map(u => ({ u, model: cfg.units[u].model, r: Math.max(0, cfg.units[u].expected_M - tok(u)) }));
  reserves.push({ u: 'coordinator', model: 'fable', r: Math.max(0, co.expected_M - tok('coordinator')) });
  const resAll = reserves.reduce((s, x) => s + x.r, 0);
  const resFab = reserves.filter(x => x.model === 'fable').reduce((s, x) => s + x.r, 0);
  const unitFab = uc.model === 'fable' ? uc.expected_M : 0;

  const protAll = cfg.protected_all_points_per_hour * hours;
  const protFab = cfg.protected_fable_M_per_hour * hours / cfg.m_per_point_fable;
  const needAll = rdAll + resAll / cfg.m_per_point_all + uc.expected_M / cfg.m_per_point_all;
  const needFab = rdFab + resFab / cfg.m_per_point_fable + unitFab / cfg.m_per_point_fable;
  const limAll = 100 - protAll, limFab = 100 - protFab;
  const runTok = totalOf(used).total / 1e6;
  const needCap = runTok + resAll + uc.expected_M;
  const limCap = cfg.cap_M - cfg.preparation_M;

  const nums = `all ${f2(needAll)} vs ${f2(limAll)} (reading ${f2(rdAll)} + reserve ${f2(resAll / cfg.m_per_point_all)} + unit ${f2(uc.expected_M / cfg.m_per_point_all)} points; protected ${f2(protAll)} to reset in ${f2(hours)} h); `
    + `fable ${f2(needFab)} vs ${f2(limFab)} (reading ${f2(rdFab)} + reserve ${f2(resFab / cfg.m_per_point_fable)} + unit ${f2(unitFab / cfg.m_per_point_fable)} points; protected ${f2(protFab)}); `
    + `cap ${f2(needCap)} vs ${f2(limCap)} M (run ${f2(runTok)} + reserve ${f2(resAll)} + unit ${f2(uc.expected_M)}; cap ${cfg.cap_M} less preparation ${cfg.preparation_M}); running: ${running.join(',') || 'none'}`;
  const why = [];
  if (needAll > limAll) why.push('all-models meter over');
  if (needFab > limFab) why.push('Fable meter over');
  if (needCap > limCap) why.push('cap over');
  if (why.length) hold(`${why.join(', ')}: ${nums}`);
  return { line: `START ${unit}: ${nums}`, slot: top + 1 };
}

fs.mkdirSync(slotDir, { recursive: true });
for (let tries = 0; tries < 12; tries++) {
  const { line, slot } = decide();
  try {
    fs.writeFileSync(path.join(slotDir, `${slot}.json`), JSON.stringify({ unit, at: new Date().toISOString(), line }), { flag: 'wx' });
  } catch (e) {
    if (e.code === 'EEXIST') continue; // another call won this slot: read again, decide again
    hold(`cannot write run/gate/${slot}.json: ${e.code}`);
  }
  emit(line);
}
hold('gate contended: 12 tries, each slot taken by another call');
