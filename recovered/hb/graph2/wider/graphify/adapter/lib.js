'use strict';
// Shared helpers of the graphify adapter: tasks, graph keys, configuration objects and hashes, the
// adapter code hash and the held-out lock. Used on the host (run.js) and inside the pack container.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CF = require('./configs');

const BUILD = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..', 'build');
const C = require(path.join(BUILD, 'arms', 'common', 'config.js'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

// One graph per parent commit; a T3/T4 task whose document is removed gets its own graph.
function graphKey(parent, removePaths) {
  if (!/^[0-9a-f]{40}$/.test(parent)) throw new Error('bad parent ' + parent);
  const rp = (removePaths || []).slice().sort();
  return rp.length ? parent + '-rm-' + sha256(rp.join('\n')).slice(0, 8) : parent;
}

// The adapter's code hash (addendum 7 item 10: the configuration is frozen with a hash of the adapter
// code): sha256 over "<file> <sha256>\n" lines of every .js, .py and .sh file in this folder, sorted.
function adapterHash(dir = __dirname) {
  const files = fs.readdirSync(dir).filter((f) => /\.(js|py|sh)$/.test(f) && fs.statSync(path.join(dir, f)).isFile()).sort();
  const per = {};
  for (const f of files) per[f] = sha256(fs.readFileSync(path.join(dir, f)));
  return { hash: sha256(files.map((f) => f + ' ' + per[f] + '\n').join('')), files: per };
}

function configsAll() {
  return CF.CONFIGS.map((c) => {
    const cfg = C.normalise(CF.configObject(c));
    return { name: c.name, user: c.user, why: c.why, calls: c.calls.slice(), cfg, hash: C.configHash(cfg) };
  });
}

// The held-out lock. split "tune": no lock. Any other split needs --lock <file>: a frozen record
// {arm: "graphify", config_name, config_hash, adapter_code_hash} written by the grader; the
// configuration must hash to config_hash and the adapter code must hash to adapter_code_hash now.
function checkLock(o, dir = __dirname) {
  if (o.split === 'tune') return null;
  if (o.split !== 'heldout') throw new Error('unknown split ' + o.split);
  if (!o.allowHeldout && !o.lock) throw new Error('REFUSED: held-out needs --allow-heldout --lock <frozen record>');
  if (!o.lock || !fs.existsSync(o.lock)) throw new Error('REFUSED: held-out needs --lock <frozen record file>');
  const rec = JSON.parse(fs.readFileSync(o.lock, 'utf8'));
  if (rec.arm !== 'graphify') throw new Error('REFUSED: frozen record names arm ' + rec.arm);
  const c = configsAll().find((x) => x.name === rec.config_name);
  if (!c) throw new Error('REFUSED: frozen configuration ' + rec.config_name + ' is not in configs.js');
  if (c.hash !== rec.config_hash) throw new Error('REFUSED: configuration ' + c.name + ' hashes to ' + c.hash + ', frozen ' + rec.config_hash);
  const now = adapterHash(dir).hash;
  if (now !== rec.adapter_code_hash) throw new Error('REFUSED: adapter code hash is ' + now + ', frozen ' + rec.adapter_code_hash);
  return rec;
}

function selectConfigs(spec, lock) {
  const all = configsAll();
  if (lock) return all.filter((c) => c.name === lock.config_name);
  if (!spec || spec === 'all') return all;
  const want = spec.split(',');
  const out = all.filter((c) => want.includes(c.name));
  if (out.length !== want.length) throw new Error('unknown configuration in ' + spec);
  return out;
}

// Tasks of the given sets and split. T5 is never run (addendum 4 item 7). A held-out split is read
// only under a lock.
function loadTasks(file, o, lock) {
  if (o.split !== 'tune' && !lock) throw new Error('REFUSED: held-out tasks are locked');
  if (o.sets.includes('T5')) throw new Error('REFUSED: set T5 is not run');
  let ts = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
    .filter((t) => o.sets.includes(t.set) && t.split === o.split && t.seed && t.seed.path);
  if (o.tasksFile) {
    const want = new Set(fs.readFileSync(o.tasksFile, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => (x.startsWith('{') ? JSON.parse(x).id : x)));
    ts = ts.filter((t) => want.has(t.id));
  }
  return ts;
}

module.exports = { BUILD, graphKey, adapterHash, configsAll, checkLock, selectConfigs, loadTasks, sha256 };
