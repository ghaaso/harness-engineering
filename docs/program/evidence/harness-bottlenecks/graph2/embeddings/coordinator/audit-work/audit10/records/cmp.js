'use strict';
// Compare docker inspect records against the fixed mount lists. Read-only; writes one report file.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/records/report.json';
const B = JSON.parse(fs.readFileSync(L + '/r58c/B/mounts-B.json', 'utf8'));
const A = JSON.parse(fs.readFileSync(L + '/r58c/A/mounts-A.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync(L + '/train/stageB/plan.json', 'utf8'));
const HO = new Set();
for (const [k, v] of Object.entries(plan.heldout.assignment)) { HO.add(k); if (typeof v === 'string') HO.add(v); else if (Array.isArray(v)) v.forEach((x) => HO.add(x)); }
const CPU = 'sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711';
const GPU = 'sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7';
const files = [];
for (const f of fs.readdirSync(L + '/r58c/mounts')) files.push(['real', L + '/r58c/mounts/' + f]);
for (const f of fs.readdirSync(L + '/orchestrator')) if (/^kge-B1-inspect-.*\.json$/.test(f)) files.push(['stageB', L + '/orchestrator/' + f]);
for (const f of fs.readdirSync(L + '/r58c/B/out/mounts-test')) files.push(['test', L + '/r58c/B/out/mounts-test/' + f]);
const norm = (s) => s.replace(/\\/g, '/');
const res = [];
for (const [kind, f] of files) {
  const raw = fs.readFileSync(f);
  let J; try { J = JSON.parse(raw.toString('utf8')); } catch (e) { res.push({ f, err: e.message }); continue; }
  const r = Array.isArray(J) ? J[0] : J;
  const name = (r.Name || '').replace(/^\//, '');
  const list = B[name] ? ['B', B[name]] : A[name] ? ['A', A[name]] : [null, null];
  const mounts = (r.Mounts || []).map((m) => ({ type: m.Type, src: norm(m.Source), dst: m.Destination, rw: m.RW, mode: m.Mode }));
  const binds = (r.HostConfig && r.HostConfig.Binds) || [];
  const o = { kind, file: path.basename(f), sha256: crypto.createHash('sha256').update(raw).digest('hex'), name, list: list[0],
    image: r.Image, imageCfg: r.Config && r.Config.Image, imageOk: r.Image === CPU ? 'cpu' : r.Image === GPU ? 'gpu' : 'OTHER',
    net: r.HostConfig && r.HostConfig.NetworkMode, networks: r.NetworkSettings && Object.keys(r.NetworkSettings.Networks || {}),
    memory: r.HostConfig && r.HostConfig.Memory, memSwap: r.HostConfig && r.HostConfig.MemorySwap, cpus: r.HostConfig && r.HostConfig.NanoCpus,
    devreq: r.HostConfig && r.HostConfig.DeviceRequests, created: r.Created, started: r.State && r.State.StartedAt,
    status: r.State && r.State.Status, args: (r.Args || []).join(' ').slice(-300), nMounts: mounts.length, nBinds: binds.length,
    nonBind: mounts.filter((m) => m.type !== 'bind'), extra: [], missing: [], modeDiff: [], writable: [], heldoutReads: [], sealed: [], tasksRead: [], stagingReads: [] };
  if (list[1]) {
    const allow = list[1].allow;
    for (const m of mounts) {
      const a = allow.find((x) => x.dst === m.dst);
      if (!a) { o.extra.push(m); continue; }
      let asrc = a.src;
      if (asrc.includes('<STAMP>')) { const re = new RegExp('^' + asrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('<STAMP>', '[0-9]{8}T[0-9]{6}Z') + '$'); if (!re.test(m.src)) o.extra.push({ ...m, listed: a.src }); }
      else if (asrc !== m.src) o.extra.push({ ...m, listed: a.src, srcCaseEq: asrc.toLowerCase() === m.src.toLowerCase() });
      if ((a.mode === 'rw') !== m.rw) o.modeDiff.push({ dst: m.dst, listed: a.mode, rw: m.rw });
    }
    for (const a of allow) if (!mounts.find((m) => m.dst === a.dst)) o.missing.push(a);
    // binds cross-check
    const bset = binds.map((b) => { const i = b.indexOf(':', 2); const rest = b.slice(i + 1); const ro = rest.endsWith(':ro'); return { src: norm(b.slice(0, i)), dst: ro ? rest.slice(0, -3) : rest, ro }; });
    o.bindsVsMounts = bset.filter((b) => !mounts.find((m) => m.dst === b.dst && m.src === b.src && m.rw === !b.ro)).length;
  }
  for (const m of mounts) {
    if (m.rw) o.writable.push(m.src.replace(L, 'LANE') + ' -> ' + m.dst);
    if (/sealed/i.test(m.src)) o.sealed.push(m.src);
    if (/build\/tasks\/tasks\.jsonl$/.test(m.src) || /build\/tasks$/.test(m.src) || /graph2\/build$/.test(m.src)) o.tasksRead.push(m.src + ' -> ' + m.dst + (m.rw ? ' rw' : ' ro'));
    if (/heldout_inputs/.test(m.src)) o.stagingReads.push(m.src.replace(L, 'LANE') + ' -> ' + m.dst + (m.rw ? ' rw' : ' ro'));
    const rel = m.src.startsWith(L) ? m.src.slice(L.length) : null;
    if (rel !== null) {
      if (rel === '' || rel === '/export' || rel === '/export/graphs') o.heldoutReads.push('WHOLE ' + (rel || '/') + ' -> ' + m.dst + (m.rw ? ' rw' : ' ro'));
      const mm = rel.match(/^\/export\/graphs0?\/([0-9a-f]{40})/);
      if (mm && HO.has(mm[1])) o.heldoutReads.push(rel + ' -> ' + m.dst + (m.rw ? ' rw' : ' ro'));
      if (rel === '/export/graphs0') o.heldoutReads.push('WHOLE graphs0 -> ' + m.dst);
    } else if (m.src.includes('graph2') && !m.src.includes('/wider/embeddings')) { o.outsideLane = (o.outsideLane || []).concat(m.src + ' -> ' + m.dst + (m.rw ? ' rw' : ' ro')); }
  }
  res.push(o);
}
fs.writeFileSync(OUT, JSON.stringify({ heldoutParents: HO.size, res }, null, 1));
for (const o of res) {
  if (o.err) { console.log('ERR', o.file, o.err); continue; }
  console.log([o.kind, o.file, o.name, 'list=' + o.list, o.imageOk, 'net=' + o.net, JSON.stringify(o.networks), 'mem=' + o.memory, 'n=' + o.nMounts + '/' + o.nBinds, 'extra=' + o.extra.length, 'missing=' + o.missing.length, 'mode=' + o.modeDiff.length, 'bvm=' + o.bindsVsMounts, 'nonbind=' + o.nonBind.length, 'sealed=' + o.sealed.length].join(' '));
  if (o.extra.length) console.log('   EXTRA', JSON.stringify(o.extra));
  if (o.missing.length) console.log('   MISSING', JSON.stringify(o.missing.map((a) => a.dst + ' ' + a.mode + ' ' + a.src.replace(L, 'LANE'))));
  if (o.modeDiff.length) console.log('   MODE', JSON.stringify(o.modeDiff));
  if (o.writable.length) console.log('   RW', o.writable.join(' | '));
  if (o.heldoutReads.length) console.log('   HO', o.heldoutReads.length, o.heldoutReads.slice(0, 6).join(' | '));
  if (o.stagingReads.length) console.log('   STAGING', o.stagingReads.join(' | '));
  if (o.tasksRead.length) console.log('   TASKS', o.tasksRead.join(' | '));
  if (o.outsideLane) console.log('   OUTSIDE', o.outsideLane.join(' | '));
}
console.log('heldout parents', HO.size);
