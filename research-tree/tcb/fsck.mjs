// fsck.mjs: the store check (CONTRACT §5 unit U2a; spec/fsck.mjs.md; design rules R23, R28, R31, R13, R14).
//
//   node tcb/scripts/fsck.mjs --root <abs> --ce <n> [--now <iso>] [--dry-run]
//
// Object hashes, commit records, the ledger chain, foreign keys, the writers of the status files,
// `tcb/` against the owner's commit (read-only git, before the lock), every attempt's `.claude/`, and
// the frozen and cut files. A failing item is tampering: exit 3. The one write is the `fsck` ledger line.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as lib from './lib.mjs';

const SCRIPT = 'fsck';
const OBJ_RE = /^([a-z])_([0-9a-f]{16})\.json$/;
const GIT_TIMEOUT_MS = 60000;

const ARGS = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    now: { type: 'string' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
    'dry-run': { type: 'bool' },
  },
};

function tcbError(code, exit, detail) {
  if (typeof lib.TcbError === 'function') return new lib.TcbError(code, exit, detail);
  const e = new Error(code);
  e.code = code;
  e.exit = exit;
  e.detail = detail;
  return e;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const toPosix = (p) => String(p).replace(/\\/g, '/');
const say = (msg) => process.stderr.write(`fsck: ${msg}\n`);
const item = (check, id, code) => ({ check, id, code });

function layout(root) {
  const L = lib.paths(root) || {};
  const j = (...s) => path.join(root, ...s);
  const pick = (k, d) => (typeof L[k] === 'string' ? L[k] : d);
  return {
    coord: pick('coord', j('run', 'coord.json')),
    ledger: pick('ledger', j('run', 'ledger.jsonl')),
    objects: j('store', 'objects'),
    commits: j('store', 'commits'),
    cardStatus: j('store', 'status', 'card_status.jsonl'),
    witness: j('store', 'witness.jsonl'),
    frozen: j('plan', 'frozen'),
    completeness: j('completeness'),
    agents: j('tcb', 'agents'),
    attempt(task, e) {
      if (typeof L.attempt === 'function') {
        const p = L.attempt(task, e);
        if (typeof p === 'string') return p;
      }
      return j('wt', `${task}-e${e}`);
    },
  };
}

async function readJsonlOr(file) {
  if (!fs.existsSync(file)) return { records: [], torn: null, badLines: [] };
  const r = await lib.readJsonl(file);
  return { records: r.records || [], torn: r.torn || null, badLines: r.badLines || [] };
}

function shaOfFile(file) {
  try {
    return lib.sha256hex(fs.readFileSync(file));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- check 1: objects

function checkObjects(L) {
  const failing = [];
  const anomalies = [];
  const present = new Set(); // every well-named object file (a target that exists)
  const values = new Map(); // id -> value, for objects that pass
  const shas = new Map(); // id -> sha256 of the bytes
  let n = 0;
  if (!fs.existsSync(L.objects)) return { n, failing, anomalies, present, values, shas };
  const PREFIX = lib.PREFIX;
  for (const name of fs.readdirSync(L.objects).sort()) {
    const abs = path.join(L.objects, name);
    const m = OBJ_RE.exec(name);
    if (!m) {
      anomalies.push({ code: 'stray-file', id: `store/objects/${name}` });
      continue;
    }
    n++;
    const id = name.slice(0, -5);
    present.add(id);
    if (m[1] === 's') {
      failing.push(item('objects', id, 'seed-id'));
      continue;
    }
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile() || st.isSymbolicLink()) {
      failing.push(item('objects', id, 'object-mismatch'));
      continue;
    }
    const buf = fs.readFileSync(abs);
    const sha = lib.sha256hex(buf);
    shas.set(id, sha);
    let value;
    let ok = true;
    try {
      const text = buf.toString('utf8');
      value = JSON.parse(text);
      if (lib.canonicalize(value) !== text) ok = false;
    } catch {
      ok = false;
    }
    if (ok && sha.slice(0, 16) !== m[2]) ok = false;
    if (ok && !(isObj(value) && PREFIX[value.kind] === m[1])) ok = false;
    if (!ok) failing.push(item('objects', id, 'object-mismatch'));
    else values.set(id, value);
  }
  return { n, failing, anomalies, present, values, shas };
}

// ---------------------------------------------------------------- check 2: commit records

async function checkCommits(root, L, table, lines, objs) {
  const failing = [];
  const anomalies = [];
  let n = 0;
  const rows = new Map((table.tasks || []).map((r) => [r.task, r]));
  const files = fs.existsSync(L.commits) ? fs.readdirSync(L.commits).filter((f) => f.endsWith('.json')).sort() : [];
  const recordSha = new Map(); // "<task>.<step>" -> sha of bytes
  for (const name of files) {
    n++;
    const key = name.slice(0, -5);
    const abs = path.join(L.commits, name);
    const sha = shaOfFile(abs);
    recordSha.set(key, sha);
    let rec;
    try {
      rec = await lib.readJson(abs);
    } catch {
      failing.push(item('commits', key, 'commit-mismatch'));
      continue;
    }
    try {
      await lib.checkFormat(root, 'commit-record', rec);
    } catch (e) {
      if (e && (e.code === 'schema-version' || e.code === 'schema-invalid')) {
        failing.push(item('commits', key, 'commit-mismatch'));
        continue;
      }
      throw e;
    }
    let bad = `${rec.task}.${rec.step}` !== key;
    if (!bad) {
      try {
        bad = lib.sha256hex(lib.canonicalize(rec.outputs)) !== rec.outputs_sha;
      } catch {
        bad = true;
      }
    }
    if (!bad) {
      for (const o of rec.outputs || []) {
        const s = objs.shas.has(o.id) ? objs.shas.get(o.id) : shaOfFile(path.join(L.objects, `${o.id}.json`));
        if (!s || s !== o.sha256) {
          bad = true;
          break;
        }
      }
    }
    if (bad) {
      failing.push(item('commits', key, 'commit-mismatch'));
      continue;
    }
    const row = rows.get(rec.task);
    const inRow = !!(row && row.commits && row.commits[rec.step]);
    const logged = lines.some(
      (l) => l.kind === 'commit' && l.task === rec.task && l.data && l.data.step === rec.step && l.data.outputs_sha === rec.outputs_sha,
    );
    if (!inRow || !logged) anomalies.push({ code: 'commit-torn', id: key });
  }
  for (const row of table.tasks || []) {
    for (const [step, sha] of Object.entries(row.commits || {})) {
      const key = `${row.task}.${step}`;
      if (!recordSha.has(key) || recordSha.get(key) !== sha) failing.push(item('commits', key, 'commit-mismatch'));
    }
    if (row.state === 'committed') {
      for (const step of row.steps || []) {
        if (!(row.commits && row.commits[step])) failing.push(item('commits', `${row.task}.${step}`, 'commit-mismatch'));
      }
    }
  }
  return { n, failing: dedupe(failing), anomalies };
}

// ---------------------------------------------------------------- check 3: ledger

function checkLedger(led) {
  const failing = [];
  const anomalies = [];
  for (const b of led.badLines) failing.push(item('ledger', typeof b === 'number' ? b : b && b.line != null ? b.line : String(b), 'ledger-broken'));
  const v = lib.verifyLedger(led.records);
  if (!v.ok) failing.push(item('ledger', v.brokenAt ?? null, 'ledger-broken'));
  if (led.torn && led.torn.length) anomalies.push({ code: 'torn-tail', id: 'run/ledger.jsonl' });
  return { n: led.records.length, failing: dedupe(failing), anomalies };
}

// ---------------------------------------------------------------- check 4: foreign keys

function checkFk(table, objs, statusRecs, witnessRecs) {
  const failing = [];
  const has = (id) => typeof id === 'string' && objs.present.has(id);
  const need = (src, target) => {
    if (!has(target)) failing.push(item('fk', `${src}->${target}`, 'fk-missing'));
  };
  const cardsOfPack = (id) => {
    const p = objs.values.get(id);
    return p && Array.isArray(p.cards) ? new Set(p.cards) : null;
  };
  const sentenceCites = (src, sentences, packCards) => {
    for (const s of sentences || []) {
      for (const c of s.cites || []) {
        need(src, c);
        if (packCards && !packCards.has(c)) failing.push(item('fk', `${src}#${s.sid}->${c}`, 'fk-missing'));
      }
    }
  };
  let n = 0;
  for (const [id, v] of objs.values) {
    n++;
    switch (v.kind) {
      case 'card':
        if (v.supersedes != null) need(id, v.supersedes);
        break;
      case 'pack':
        for (const c of v.cards || []) need(id, c);
        if (v.parent != null) need(id, v.parent);
        sentenceCites(id, v.conclusions, new Set(v.cards || []));
        break;
      case 'review': {
        need(id, v.pack);
        if (v.parent != null) need(id, v.parent);
        sentenceCites(id, v.sentences, cardsOfPack(v.pack));
        const sids = new Set((v.sentences || []).map((s) => s.sid));
        for (const vd of v.verdicts || []) {
          for (const s of vd.supports || []) if (!sids.has(s)) failing.push(item('fk', `${id}->${s}`, 'fk-missing'));
        }
        for (const d of v.dismissals || []) if (!sids.has(d.sid)) failing.push(item('fk', `${id}->${d.sid}`, 'fk-missing'));
        break;
      }
      case 'certificate':
        need(id, v.subject);
        need(id, v.pack);
        for (const r of v.read_set || []) need(id, r.card_id);
        break;
      default:
        break;
    }
  }
  for (const row of table.tasks || []) {
    for (const a of row.attempts || []) if (a && a.manifest) need(`${row.task}-e${a.epoch}`, a.manifest);
  }
  for (const r of statusRecs) need(`card_status:${r.seq}`, r.card_id);
  for (const r of witnessRecs) need(`witness:${r.seq}`, r.card_id);
  return { n, failing: dedupe(failing) };
}

// ---------------------------------------------------------------- check 5: status writers

function checkStatus(lines, objs, statusLed, witnessLed) {
  const failing = [];
  const anomalies = [];
  const cover = (kind) => lines.filter((l) => l.kind === kind && l.data && Number.isInteger(l.data.first_seq) && Number.isInteger(l.data.last_seq));
  const onSeqs = (name, led, kind, withSha) => {
    for (const b of led.badLines) failing.push(item('status', `${name}:line:${typeof b === 'number' ? b : String(b)}`, 'status-unreadable'));
    if (led.torn && led.torn.length) anomalies.push({ code: 'torn-tail', id: name });
    const covering = cover(kind);
    led.records.forEach((r, i) => {
      const id = `${name}:${r && r.seq}`;
      if (!r || r.seq !== i + 1) failing.push(item('status', id, 'status-unlogged'));
      else {
        const k = covering.filter((l) => l.data.first_seq <= r.seq && r.seq <= l.data.last_seq).length;
        if (k !== 1) failing.push(item('status', id, 'status-unlogged'));
      }
      if (withSha && r && typeof r.card_id === 'string' && objs.present.has(r.card_id)) {
        const sha = objs.shas.get(r.card_id);
        if (sha && r.card_sha !== sha) failing.push(item('status', `${name}:${r.seq}:${r.card_id}`, 'card-changed'));
      }
    });
  };
  onSeqs('card_status', statusLed, 'promote', true);
  onSeqs('witness', witnessLed, 'witness', false);
  return { n: statusLed.records.length + witnessLed.records.length, failing: dedupe(failing), anomalies };
}

// ---------------------------------------------------------------- check 6: unlogged objects (anomalies)

function checkUnlogged(objs, lines, table) {
  const anomalies = [];
  const intake = new Set();
  const certs = new Set();
  for (const l of lines) {
    if (l.kind === 'intake') for (const o of (l.data && l.data.objects) || []) intake.add(o.id);
    if (l.kind === 'certificate' && l.data) certs.add(l.data.id);
  }
  const manifests = new Set();
  for (const row of table.tasks || []) for (const a of row.attempts || []) if (a && a.manifest) manifests.add(a.manifest);
  for (const id of [...objs.present].sort()) {
    const p = id[0];
    if ('cprd'.includes(p) && !intake.has(id)) anomalies.push({ code: 'object-unlogged', id });
    else if (p === 'x' && !certs.has(id)) anomalies.push({ code: 'object-unlogged', id });
    else if (p === 'm' && !manifests.has(id)) anomalies.push({ code: 'object-unlogged', id });
  }
  return anomalies;
}

// ---------------------------------------------------------------- check 7: tcb against the owner's commit

function git(root, args) {
  const r = spawnSync(
    'git',
    [
      '--no-pager',
      '--no-optional-locks',
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.hooksPath=NUL',
      '-c',
      'core.longpaths=true',
      '-c',
      'core.autocrlf=false',
      '-C',
      root,
      ...args,
    ],
    { cwd: root, shell: false, windowsHide: true, timeout: GIT_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.error || r.signal) return { ran: false };
  return { ran: true, status: r.status, stdout: r.stdout || '' };
}

function checkTcb(root, coord) {
  if (!fs.existsSync(path.join(root, '.git'))) return { result: 'not_run', reason: 'no-git', failing: [] };
  const C = coord && coord.tcb_commit;
  if (typeof C !== 'string' || !/^[0-9a-f]{40}$/.test(C)) {
    return { result: 'fail', failing: [item('tcb', String(C ?? null), 'tcb-commit-unknown')] };
  }
  const known = git(root, ['cat-file', '-e', `${C}^{commit}`]);
  if (!known.ran) return { result: 'not_run', reason: 'no-git', failing: [] };
  if (known.status !== 0) return { result: 'fail', failing: [item('tcb', C, 'tcb-commit-unknown')] };
  const diff = git(root, ['diff', '--name-only', '-z', '--no-ext-diff', '--no-textconv', C, '--', 'tcb']);
  const others = git(root, ['ls-files', '-z', '--others', '--', 'tcb']);
  if (!diff.ran || !others.ran || diff.status !== 0 || others.status !== 0) return { result: 'not_run', reason: 'no-git', failing: [] };
  const paths = new Set(
    [...diff.stdout.split('\0'), ...others.stdout.split('\0')].map((s) => s.trim()).filter(Boolean).map(toPosix),
  );
  const failing = [...paths].sort().map((p) => item('tcb', p, 'tcb-differs'));
  return { result: failing.length ? 'fail' : 'pass', failing };
}

// ---------------------------------------------------------------- check 8: every attempt's .claude/

async function checkClaude(root, L, table) {
  const failing = [];
  const anomalies = [];
  let n = 0;
  for (const row of table.tasks || []) {
    for (const a of row.attempts || []) {
      if (!a || !Number.isInteger(a.epoch)) continue;
      const name = `${row.task}-e${a.epoch}`;
      const dir = L.attempt(row.task, a.epoch);
      let st;
      try {
        st = fs.lstatSync(dir);
      } catch {
        anomalies.push({ code: 'attempt-gone', id: name });
        continue;
      }
      n++;
      if (st.isSymbolicLink() || !st.isDirectory()) {
        failing.push(item('claude', name, 'claude-extra'));
        continue;
      }
      let allowed = new Map(); // type -> sha256 from the manifest
      if (a.manifest) {
        try {
          const m = await lib.getObject(root, a.manifest);
          allowed = new Map((m.agents || []).map((g) => [lib.segmentName(String(g.type)), { type: g.type, sha256: g.sha256 }]));
        } catch {
          allowed = new Map(); // the objects and fk checks report the manifest itself
        }
      }
      const walked = await lib.walkFiles(dir);
      const files = (walked.files || []).map(toPosix);
      const links = (walked.links || []).map(toPosix);
      let settingsRel = null;

      const judge = async (rel, isLink) => {
        const raw = rel.split('/');
        const seg = raw.map((s) => lib.segmentName(s));
        const id = `${name}/${rel}`;
        const last = seg[seg.length - 1];
        // a nested .claude folder anywhere below the top
        if (seg.slice(1, -1).includes('.claude') || (seg.length > 1 && seg.slice(1).includes('.claude') && isLink)) {
          failing.push(item('claude', id, 'claude-extra'));
          return;
        }
        if (seg[0] === '.claude') {
          if (isLink) {
            failing.push(item('claude', id, 'claude-extra'));
            return;
          }
          if (seg.length === 2 && last === 'settings.json') {
            settingsRel = rel;
            return;
          }
          if (seg.length === 3 && seg[1] === 'agents' && last.endsWith('.md')) {
            const type = last.slice(0, -3);
            const want = allowed.get(type);
            if (!want) {
              failing.push(item('claude', id, 'claude-extra'));
              return;
            }

            const mine = fs.readFileSync(path.join(dir, ...raw));
            const ref = (() => {
              try {
                return fs.readFileSync(path.join(L.agents, `${want.type}.md`));
              } catch {
                return null;
              }
            })();
            if (!ref || !mine.equals(ref) || lib.sha256hex(mine) !== want.sha256) failing.push(item('claude', id, 'agents-differs'));
            return;
          }
          failing.push(item('claude', id, 'claude-extra'));
          return;
        }
        if (last === 'claude.md' || last === 'claude.local.md') {
          failing.push(item('claude', id, 'claude-extra'));
          return;
        }
        if (isLink && seg.includes('.claude')) failing.push(item('claude', id, 'claude-extra'));
      };
      for (const f of files) await judge(f, false);
      for (const l of links) await judge(l, true);
      // The manifest's types are *allowed*, not required (spec check 8): a missing agent file is no item.
      const hasClaudeDir = fs.existsSync(path.join(dir, '.claude'));
      if (settingsRel === null) {
        if (a.settings_sha || hasClaudeDir) failing.push(item('claude', `${name}/.claude/settings.json`, 'settings-missing'));
      } else {
        const sha = shaOfFile(path.join(dir, ...settingsRel.split('/')));
        if (!sha || sha !== a.settings_sha) failing.push(item('claude', `${name}/${settingsRel}`, 'settings-differs'));
      }
    }
  }
  return { n, failing: dedupe(failing), anomalies };
}

// ---------------------------------------------------------------- check 9: frozen and cut files

function checkFrozen(root, L, lines) {
  const failing = [];
  let n = 0;
  const hashName = (dir, re, relDir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      const m = re.exec(name);
      if (!m) continue;
      n++;
      const sha = shaOfFile(path.join(dir, name));
      if (!sha || sha.slice(0, 12) !== m[1]) failing.push(item('frozen', `${relDir}/${name}`, 'frozen-mismatch'));
    }
  };
  hashName(L.frozen, /^.+-([0-9a-f]{12})\.json$/, 'plan/frozen');
  hashName(L.completeness, /^cut-([0-9a-f]{12})\.md$/, 'completeness');
  const under = (p) => (path.isAbsolute(p) ? p : path.join(root, ...toPosix(p).split('/')));
  for (const l of lines) {
    const d = l.data || {};
    if (['protocol-freeze', 'protocol-amend', 'plan-freeze'].includes(l.kind)) {
      const built = typeof d.name === 'string' && typeof d.sha256 === 'string' ? path.join(L.frozen, `${d.name}-${d.sha256.slice(0, 12)}.json`) : null;
      const named = typeof d.path === 'string' ? under(d.path) : null;
      if (!((named && fs.existsSync(named)) || (built && fs.existsSync(built)))) {
        failing.push(item('frozen', toPosix(d.path || (built ? path.relative(root, built) : `${l.kind}:${l.seq}`)), 'frozen-missing'));
      }
    } else if (l.kind === 'cut' && typeof d.sha === 'string') {
      const f = path.join(L.completeness, `cut-${d.sha.slice(0, 12)}.md`);
      if (!fs.existsSync(f)) failing.push(item('frozen', `completeness/cut-${d.sha.slice(0, 12)}.md`, 'frozen-missing'));
    }
  }
  return { n, failing: dedupe(failing) };
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const f of list) {
    const k = `${f.check}|${f.id}|${f.code}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(f);
    }
  }
  return out;
}

async function storeChecks(root, L, table, led, statusLed, witnessLed) {
  const objs = checkObjects(L);
  const commits = await checkCommits(root, L, table, led.records, objs);
  const ledger = checkLedger(led);
  const fk = checkFk(table, objs, statusLed.records, witnessLed.records);
  const unlogged = checkUnlogged(objs, led.records, table);
  return { objs, commits, ledger, fk, unlogged };
}

// ---------------------------------------------------------------- main

async function main(ctx) {
  const { flags } = lib.parseArgs(process.argv.slice(2), ARGS);
  const { root, ce } = flags;
  const dry = !!flags['dry-run'];
  if (!path.isAbsolute(root)) throw tcbError('usage', 66, { flag: 'root', why: 'not absolute' });
  if (!(Number.isInteger(ce) && ce >= 1)) throw tcbError('usage', 66, { flag: 'ce' });
  ctx.mode = null;
  ctx.dryRun = dry;
  ctx.dry_run = dry;

  const facts = lib.edgeFacts(flags);
  const now = facts.now;
  const L = layout(root);

  // Step 1.
  if (!fs.existsSync(L.coord)) throw tcbError('no-coordinator', 2, { path: 'run/coord.json' });
  let coord;
  try {
    coord = await lib.readJson(L.coord);
  } catch (e) {
    if (e && e.code === 'unparseable') throw tcbError('table-corrupt', 67, { path: 'run/coord.json' });
    throw e;
  }
  const table = await lib.readTasks(root);

  // Step 2: phase 1, without the lock (git runs only here).
  const led1 = await readJsonlOr(L.ledger);
  const last1 = led1.records.length ? led1.records[led1.records.length - 1] : null;
  const H1 = { seq: last1 ? last1.seq : 0, hash: last1 ? last1.hash : '0'.repeat(64) };
  const statusLed = await readJsonlOr(L.cardStatus);
  const witnessLed = await readJsonlOr(L.witness);
  let store = await storeChecks(root, L, table, led1, statusLed, witnessLed);
  let status = checkStatus(led1.records, store.objs, statusLed, witnessLed);
  const tcb = checkTcb(root, coord);
  const claude = await checkClaude(root, L, table);
  const frozen = checkFrozen(root, L, led1.records);

  const T = (() => {
    try {
      return lib.thresholds(root);
    } catch {
      return null;
    }
  })();
  const getOr = (name, dflt) => {
    try {
      const v = T ? T.get(name) : dflt;
      return v === null || v === undefined ? dflt : v;
    } catch (e) {
      if (e && e.code === 'param-missing') return dflt;
      throw e;
    }
  };

  // Steps 3-4: phase 2, under the lock.
  const finish = async (handle) => {
    let head = H1;
    const led2 = await readJsonlOr(L.ledger);
    const last2 = led2.records.length ? led2.records[led2.records.length - 1] : null;
    // promote and witness append their status lines and then their ledger line, under the lock; phase 1
    // read the ledger before the status files without it, so it can meet status lines whose ledger
    // line came later (U2-F7). Under the lock both status files are read again.
    const statusLed2 = await readJsonlOr(L.cardStatus);
    const witnessLed2 = await readJsonlOr(L.witness);
    const sameJsonl = (x, y) => JSON.stringify([x.records, x.badLines, x.torn]) === JSON.stringify([y.records, y.badLines, y.torn]);
    const headMoved = !!(last2 && (last2.seq !== H1.seq || last2.hash !== H1.hash));
    const statusMoved = !sameJsonl(statusLed, statusLed2) || !sameJsonl(witnessLed, witnessLed2);
    if (headMoved || statusMoved) {
      // Re-verify the chain and recheck objects, records, keys and status coverage over everything the
      // new lines can name (a superset of "the lines after H1"), so a pass covers every earlier line.
      const table2 = await lib.readTasks(root);
      const ledNow = last2 ? led2 : led1;
      store = await storeChecks(root, L, table2, ledNow, statusLed2, witnessLed2);
      status = checkStatus(ledNow.records, store.objs, statusLed2, witnessLed2);
      if (headMoved) head = { seq: last2.seq, hash: last2.hash };
    }
    const checks = {
      objects: { n: store.objs.n, failing: store.objs.failing },
      commits: { n: store.commits.n, failing: store.commits.failing },
      ledger: { n: store.ledger.n, failing: store.ledger.failing },
      fk: { n: store.fk.n, failing: store.fk.failing },
      status: { n: status.n, failing: status.failing },
      tcb: { result: tcb.result, reason: tcb.reason ?? null, failing: tcb.failing },
      claude: { n: claude.n, failing: claude.failing },
      frozen: { n: frozen.n, failing: frozen.failing },
    };
    const failing = dedupe(Object.values(checks).flatMap((c) => c.failing));
    const anomalies = [
      ...store.objs.anomalies,
      ...store.commits.anomalies,
      ...store.ledger.anomalies,
      ...status.anomalies,
      ...store.unlogged,
      ...claude.anomalies,
    ];
    const result = failing.length ? 'fail' : tcb.result === 'not_run' ? 'not_run' : 'pass';
    if (handle) {
      try {
        await lib.appendLedger(root, handle, { ctx, ce, kind: 'fsck', now, data: { result, failing } });
      } catch (e) {
        if (!(e && e.code === 'ledger-broken')) throw e;
        // The tail itself is broken: no line (spec step 4), exit 3.
        if (!failing.some((f) => f.code === 'ledger-broken')) failing.push(item('ledger', head.seq, 'ledger-broken'));
        say('the ledger tail does not verify: no fsck line appended');
      }
    }
    const res = { checks, failing, anomalies, head_checked: head, result };
    if (failing.length) {
      say(`${failing.length} failing item(s): all work stops`);
      return { exit: 3, result: res, reasons: failing.map((f) => ({ code: f.code, detail: { check: f.check, id: f.id } })) };
    }
    if (result === 'not_run') {
      say('tcb check not run (no git): not_run');
      return { exit: 2, result: res, reasons: [{ code: tcb.reason || 'no-git', detail: null }] };
    }
    return { exit: 0, result: res, reasons: [] };
  };

  let out;
  if (dry) {
    await lib.checkCe(root, ce);
    out = await finish(null);
  } else {
    out = await lib.withRunLock(
      root,
      { script: SCRIPT, ce, now, proc: lib.realProc({ exe: getOr('proc_exe', undefined) }), retries: getOr('lock_retries', 300) },
      finish,
    );
  }
  return { ...out, mode: null, dry_run: dry, dryRun: dry };
}

lib.runMain(import.meta.url, SCRIPT, main);
