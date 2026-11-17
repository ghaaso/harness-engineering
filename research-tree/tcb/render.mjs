// render.mjs: every page and view a person or a gate reads, built from stored objects, labels,
// statuses, the ledger and the transcripts. Everything it writes is derived (spec/render.mjs.md,
// CONTRACT.md 3.22). It decides nothing: gates read its files.
//
// node render.mjs --root R --ce N [--now iso] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import {
  TcbError, parseArgs, runMain, edgeFacts, thresholds, sha256hex, canonicalize, getObject,
  readJson, readJsonl, writeAtomic, acquireLock, appendLedger, recordIncident, readLedger,
  verifyLedger, readTasks, attemptOf, sessionTranscripts, parseTranscript, spendOf,
  clopperPearson, currentProtocol, currentDesign, checkCe, realProc,
} from './lib.mjs';

const SCRIPT = 'render';
const SPEC = {
  flags: {
    root: { type: 'string', required: true },
    ce: { type: 'int', required: true },
    now: { type: 'string' },
    'dry-run': { type: 'bool' },
    'free-mb': { type: 'int' },
    boot: { type: 'string' },
  },
};

const SEED_RE = /(?<![A-Za-z0-9_])s_[0-9a-f]{16}(?![A-Za-z0-9_])/;
const UPPER_BOUND_NOTE = 'upper bound: seeds are probably easier to find than the average relevant source';
const LABEL_RANK = { STALE: 4, PENDING: 3, JUDGMENT: 2, IN: 1 };
const CHECKER_REJECT = new Set(['number_mismatch', 'baseline_swapped', 'conditions_mismatch', 'outside_conditions']);
const CITATION_CODES = new Set(['uncited-fact', 'cite-outside-pack', 'bad-sid']);
const BACK_ROUTES = new Set(['backward', 'forward', 'contrary']);

// ---------------------------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------------------------
function isoNow(flags) {
  let now;
  try { now = edgeFacts(flags).now; } catch { now = flags.now; }
  if (now === null || now === undefined) now = flags.now;
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'number') return new Date(now).toISOString();
  return String(now);
}
const exists = (p) => fs.existsSync(p);
const sortUnique = (xs) => [...new Set(xs)].sort();
const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const arr = (v) => (Array.isArray(v) && v.length ? v.join(',') : '-');
const str = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));
const num = (v) => (v === null || v === undefined ? 'n/a' : String(v));
const sidNum = (s) => Number(String(s).replace(/^s/, '')) || 0;
const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const tasksOfRef = (ref) => String(ref).slice(0, String(ref).lastIndexOf('.'));

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = sortKeys(v[k]);
    return o;
  }
  return v;
}
const pretty = (v) => JSON.stringify(sortKeys(v), null, 2) + '\n';

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir).filter((n) => n.endsWith(ext)).sort();
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function readJsonlOpt(file, code) {
  if (!exists(file)) return [];
  const r = readJsonl(file);
  const bad = Array.isArray(r.badLines) ? r.badLines.length : Number(r.badLines) || 0;
  if (bad > 0) throw new TcbError(code, 2, { file: path.basename(file), bad_lines: r.badLines });
  return r.records;
}

// ---------------------------------------------------------------------------------------------
// formats shared by the pages
// ---------------------------------------------------------------------------------------------
function condText(c) {
  const k = c ?? {};
  return `task=${arr(k.task)}; model_family=${arr(k.model_family)}; language=${arr(k.language)}; repo_size=${str(k.repo_size)}; metric=${str(k.metric)}; other=${str(k.other)}`;
}
function scopeText(a) {
  const keys = ['task', 'model_family', 'repo_size', 'language', 'metric'].filter((k) => a && a[k] !== undefined && a[k] !== null && !(Array.isArray(a[k]) && a[k].length === 0));
  if (keys.length === 0) return '-';
  return keys.map((k) => `${k}=${Array.isArray(a[k]) ? a[k].join(',') : a[k]}`).join('; ');
}
function cardLine(id, card) {
  const m = card.measured ?? {};
  return `${id}: ${m.effect} ${m.value} ${m.unit} vs ${m.baseline} (${m.baseline_kind}); conditions: ${condText(card.conditions)}; source: ${card.source?.url ?? '-'}`;
}

// ---------------------------------------------------------------------------------------------
// the whole run
// ---------------------------------------------------------------------------------------------
async function main(ctx) {
  const { flags } = parseArgs(process.argv.slice(2), SPEC);
  if (!path.isAbsolute(flags.root)) throw new TcbError('usage', 66, { flag: 'root' });
  if (flags.now !== undefined && Number.isNaN(Date.parse(flags.now))) throw new TcbError('usage', 66, { flag: 'now' });
  const root = path.resolve(flags.root);
  const ce = flags.ce;
  const dry = !!flags['dry-run'];
  const th = thresholds(root);
  const now = isoNow(flags);

  const P = {
    ledger: path.join(root, 'run', 'ledger.jsonl'),
    coord: path.join(root, 'run', 'coord.json'),
    store: path.join(root, 'store'),
    objects: path.join(root, 'store', 'objects'),
    commits: path.join(root, 'store', 'commits'),
    status: path.join(root, 'store', 'status', 'card_status.jsonl'),
    witness: path.join(root, 'store', 'witness.jsonl'),
    qual: path.join(root, 'store', 'qualification.json'),
    labels: path.join(root, 'views', 'labels.json'),
    comparison: path.join(root, 'views', 'comparison.json'),
    views: path.join(root, 'views'),
  };

  // The lock is held by this function, not by a library wrapper, and every call inside is awaited:
  // nothing here depends on whether the library's helpers are synchronous.
  async function locked(fn) {
    const h = await acquireLock(root, 'run.lock', { script: SCRIPT, ce, proc: realProc({ exe: th.get('proc_exe') }), now, retries: th.get('lock_retries') });
    try {
      await checkCe(root, ce);
      return await fn(h);
    } finally {
      await h.release();
    }
  }

  // The failure record: under the lock, never any view. Best effort unless the epoch is stale.
  async function failed(exit, reasons, { tamper = false } = {}) {
    const result = { files: [], refused: true };
    if (!dry && exists(P.ledger)) {
      try {
        await locked(async (h) => {
          if (tamper) {
            await recordIncident(root, h, { ctx, ce, cls: 'refusal', detail: { tamper: true, script: SCRIPT, code: reasons[0].code }, now });
          }
          await appendLedger(root, h, {
            ctx, ce, kind: 'check', now,
            data: { check: 'render', subject: 'views', result: exit === 2 ? 'not_run' : 'fail', reasons },
          });
          if (!tamper) {
            await recordIncident(root, h, { ctx, ce, cls: exit === 2 ? 'not-run' : 'refusal', detail: { code: reasons[0].code, reasons }, now });
          }
        });
      } catch (e) {
        if (e instanceof TcbError && (e.exit === 64 || e.exit === 75)) throw e;
        process.stderr.write(`render: could not record the failure: ${e.message}\n`);
      }
    }
    return { exit, result, reasons };
  }

  // ---- step 1: read and verify, no lock ----
  await checkCe(root, ce);
  const table = readTasks(root);
  if (!exists(P.ledger)) throw new TcbError('ledger-missing', 2, { file: 'run/ledger.jsonl' });
  const led = readLedger(root);
  const lines = led.lines;
  const verdict = verifyLedger(lines);
  if (!verdict.ok) return { exit: 3, result: { files: [], refused: true }, reasons: [{ code: 'ledger-broken', detail: verdict }] };
  if (!exists(P.store) || !fs.statSync(P.store).isDirectory()) throw new TcbError('store-missing', 2, { dir: 'store' });
  if (!exists(P.labels)) return failed(2, [{ code: 'labels-missing', detail: { file: 'views/labels.json' } }]);
  let labels;
  try {
    labels = readJson(P.labels);
  } catch (e) {
    if (e instanceof TcbError) return failed(2, [{ code: e.code === 'missing' ? 'labels-missing' : 'labels-unreadable', detail: { file: 'views/labels.json', error: e.code } }]);
    throw e;
  }
  let statusRecs, witnessRecs, qual, comparison;
  try {
    statusRecs = readJsonlOpt(P.status, 'status-unreadable');
    witnessRecs = readJsonlOpt(P.witness, 'witness-unreadable');
    qual = exists(P.qual) ? readJson(P.qual) : null;
    comparison = exists(P.comparison) ? readJson(P.comparison) : null;
  } catch (e) {
    if (e instanceof TcbError && e.exit === 2) return failed(2, [{ code: e.code, detail: e.detail ?? null }]);
    throw e;
  }
  const coord = readJson(P.coord);

  const lastStatus = new Map();
  let statusSeqMax = 0;
  for (const r of statusRecs) {
    lastStatus.set(r.card_id, r);
    if (typeof r.seq === 'number' && r.seq > statusSeqMax) statusSeqMax = r.seq;
  }

  // ---- commit records and the objects they name ----
  const tamper = [];
  const refuse = [];
  const objs = new Map(); // id -> value | null (null: not in the store)
  function loadObject(id, expectSha) {
    if (objs.has(id) && expectSha === undefined) return objs.get(id);
    const file = path.join(P.objects, id + '.json');
    if (!exists(file)) {
      objs.set(id, null);
      return null;
    }
    const buf = fs.readFileSync(file);
    if (expectSha !== undefined && sha256hex(buf) !== expectSha) {
      tamper.push({ code: 'object-mismatch', detail: { id, why: 'sha256-differs-from-commit-record' } });
    }
    if (objs.has(id)) return objs.get(id);
    let value;
    try {
      value = getObject(root, id);
    } catch (e) {
      if (e instanceof TcbError && (e.code === 'object-mismatch' || e.code === 'unparseable')) {
        tamper.push({ code: 'object-mismatch', detail: { id, why: 'bytes-differ-from-name' } });
        objs.set(id, null);
        return null;
      }
      throw e;
    }
    if (SEED_RE.test(JSON.stringify(value))) tamper.push({ code: 'seed-id', detail: { object: id } });
    objs.set(id, value);
    return value;
  }

  const commitRecs = [];
  for (const name of listFiles(P.commits, '.json')) {
    const rec = readJson(path.join(P.commits, name));
    if (SEED_RE.test(JSON.stringify(rec))) tamper.push({ code: 'seed-id', detail: { commit: name } });
    commitRecs.push(rec);
  }
  const cardTask = new Map(); // committed card id -> task
  const packEntries = [];
  const reviewEntries = [];
  for (const rec of commitRecs) {
    for (const out of rec.outputs ?? []) {
      const value = loadObject(out.id, out.sha256);
      if (value === null && !objs.has(out.id)) continue;
      if (value === null) {
        if (!tamper.some((t) => t.detail?.id === out.id)) tamper.push({ code: 'object-mismatch', detail: { id: out.id, why: 'object-missing' } });
        continue;
      }
      if (out.kind === 'card' && !cardTask.has(out.id)) cardTask.set(out.id, rec.task);
      if (out.kind === 'pack') packEntries.push({ id: out.id, value, task: rec.task });
      if (out.kind === 'review') reviewEntries.push({ id: out.id, value, task: rec.task });
    }
  }
  // certificates: every stored x_ object (named by its file)
  const certs = [];
  for (const name of listFiles(P.objects, '.json')) {
    if (!name.startsWith('x_')) continue;
    const id = name.slice(0, -5);
    const value = loadObject(id);
    if (value) certs.push({ id, value });
  }
  if (tamper.length) return failed(3, tamper, { tamper: true });

  // ---- step 2: dangling references and missing labels ----
  const dangling = [];
  const getCard = (id, from, kind) => {
    const v = loadObject(id);
    if (v === null) dangling.push({ id, from, kind });
    return v;
  };
  const renderedCards = new Set(cardTask.keys());
  for (const id of cardTask.keys()) {
    const c = loadObject(id);
    if (c?.supersedes) getCard(c.supersedes, id, 'supersedes');
  }
  for (const p of packEntries) {
    for (const cid of p.value.cards ?? []) {
      if (getCard(cid, p.id, 'pack-card')) renderedCards.add(cid);
    }
    for (const s of p.value.conclusions ?? []) for (const cid of s.cites ?? []) if (getCard(cid, `${p.id}#${s.sid}`, 'cite')) renderedCards.add(cid);
    for (const m of p.value.index ?? []) for (const cid of m.cards ?? []) getCard(cid, p.id, 'index-card');
    if (p.value.parent) getCard(p.value.parent, p.id, 'parent');
  }
  for (const r of reviewEntries) {
    if (r.value.pack) getCard(r.value.pack, r.id, 'pack');
    if (r.value.parent) getCard(r.value.parent, r.id, 'parent');
    for (const s of r.value.sentences ?? []) for (const cid of s.cites ?? []) if (getCard(cid, `${r.id}#${s.sid}`, 'cite')) renderedCards.add(cid);
    for (const d of r.value.dismissals ?? []) for (const cid of d.supports ?? []) if (getCard(cid, `${r.id}#${d.sid}`, 'dismissal-support')) renderedCards.add(cid);
  }
  for (const id of renderedCards) {
    const c = loadObject(id);
    if (c?.supersedes) getCard(c.supersedes, id, 'supersedes');
  }
  if (tamper.length) return failed(3, tamper, { tamper: true });

  if ((labels.inputs?.status_seq ?? 0) < statusSeqMax) {
    refuse.push({ code: 'labels-stale', detail: { labels_status_seq: labels.inputs?.status_seq ?? null, status_seq: statusSeqMax } });
  }
  if (dangling.length) {
    refuse.push({ code: 'dangling-reference', detail: { ids: sortUnique(dangling.map((d) => d.id)), refs: dangling } });
  }
  const certLabelOf = (x) => {
    const v = (labels.certificates ?? {})[x];
    return typeof v === 'string' ? v : v?.label;
  };
  const missingLabels = [];
  const need = (dict, key, kind) => {
    if (!dict || dict[key] === undefined) missingLabels.push({ kind, key });
  };
  for (const id of renderedCards) need(labels.cards, id, 'card');
  for (const p of packEntries) for (const s of p.value.conclusions ?? []) need(labels.nodes, `${p.id}#${s.sid}`, 'node');
  for (const r of reviewEntries) {
    for (const s of r.value.sentences ?? []) need(labels.nodes, `${r.id}#${s.sid}`, 'node');
    for (const v of r.value.verdicts ?? []) need(labels.verdicts, `${r.id}#${v.approach_id}`, 'verdict');
    for (const d of r.value.dismissals ?? []) need(labels.dismissals, `${r.id}#${d.sid}`, 'dismissal');
  }
  const reviewIds = new Set(reviewEntries.map((r) => r.id));
  for (const c of certs) if (reviewIds.has(c.value.subject)) need(labels.certificates, c.id, 'certificate');
  if (missingLabels.length) refuse.push({ code: 'missing-label', detail: { keys: missingLabels.map((m) => m.key), items: missingLabels } });
  if (refuse.length) return failed(1, refuse);

  // ---------------------------------------------------------------------------------------------
  // derived facts
  // ---------------------------------------------------------------------------------------------
  const statusOf = (id) => lastStatus.get(id)?.status ?? 'pending';
  const cardLabel = (id) => labels.cards?.[id]?.label ?? '?';
  const nodeLabel = (key) => labels.nodes?.[key]?.label ?? '?';
  const f5 = th.get('f5_given') === true;
  const basis = f5 ? 'witnessed-or-confirmed' : 'committed';
  // R24: with F5 given, only a witnessed or confirmed card is trusted; a pending, unverifiable,
  // rejected or superseded card is shown under "excluded" with its label, never in the trusted body.
  // Without F5 nothing can be witnessed, so a committed card is the trusted basis (as for coverage).
  const isExcludedCard = (id) => (f5 ? !['witnessed', 'confirmed'].includes(cardLabel(id)) : ['rejected', 'superseded'].includes(cardLabel(id)));
  const isCounted = (id) => {
    const st = statusOf(id);
    // R16: a replaced card never counts, whatever its own status says.
    if (f5) return (st === 'witnessed' || st === 'confirmed') && cardLabel(id) !== 'superseded';
    return st !== 'rejected' && cardLabel(id) !== 'superseded';
  };

  const head = (() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (l.kind === 'check' && l.data?.check === 'render') continue;
      return { seq: l.seq, hash: l.hash };
    }
    return { seq: 0, hash: '0'.repeat(64) };
  })();
  const builtFrom = { ledger_seq: head.seq, ledger_head: head.hash };
  const header = `<!-- render ledger_seq=${head.seq} head=${head.hash.slice(0, 12)} -->\n`;

  // ---- pages: pack and review ----
  const files = new Map(); // relative path -> text
  const renderSentence = (objId, s, excluded) => {
    const key = `${objId}#${s.sid}`;
    const out = [`- [${s.sid}] (${nodeLabel(key)}) ${oneLine(s.text)}`];
    if (excluded) {
      out.push(`    cites: ${(s.cites ?? []).join(', ') || 'none'}`);
      return out;
    }
    out.push(`    scope: ${scopeText(s.applies_to)}`);
    if ((s.cites ?? []).length === 0) out.push('    cites: none');
    else {
      out.push('    cites:');
      for (const cid of s.cites) out.push(`      - ${cardLine(cid, loadObject(cid))}`);
    }
    return out;
  };
  const sentenceExcluded = (s) => (s.cites ?? []).some((c) => isExcludedCard(c));
  const sentencesBlock = (objId, sentences) => {
    const sorted = [...(sentences ?? [])].sort((a, b) => sidNum(a.sid) - sidNum(b.sid));
    const kept = sorted.filter((s) => !sentenceExcluded(s));
    const out = [];
    for (const s of kept) out.push(...renderSentence(objId, s, false));
    if (kept.length === 0) out.push('- none');
    return { out, excluded: sorted.filter(sentenceExcluded) };
  };
  const excludedBlock = (objId, cardIds, excludedSentences) => {
    const out = [];
    for (const cid of sortUnique(cardIds).filter((c) => isExcludedCard(c))) out.push(`- card (${cardLabel(cid)}) ${cardLine(cid, loadObject(cid))}`);
    for (const s of excludedSentences) out.push(...renderSentence(objId, s, true).map((l, i) => (i === 0 ? `- sentence ${l.slice(2)}` : l)));
    if (out.length === 0) out.push('- none');
    return out;
  };

  const certsOfReview = (rid) => certs.filter((c) => c.value.subject === rid).sort((a, b) => byKey(a.id, b.id));
  const certChoice = (rid) => {
    const cs = certsOfReview(rid);
    const good = cs.find((c) => c.value.result === 'certified' && certLabelOf(c.id) === 'VALID');
    if (good) return { cert: good, reason: null };
    if (cs.length === 0) return { cert: null, reason: 'no-certificate' };
    if (cs.some((c) => c.value.result === 'certified' && certLabelOf(c.id) !== 'VALID')) return { cert: cs.find((c) => c.value.result === 'certified'), reason: 'stale-certificate' };
    return { cert: cs[0], reason: 'not-certified' };
  };

  for (const p of packEntries) {
    const v = p.value;
    const blk = sentencesBlock(p.id, v.conclusions);
    const cardsHere = sortUnique([...(v.cards ?? []), ...(v.conclusions ?? []).flatMap((s) => s.cites ?? [])]);
    const L = [header.trimEnd(), '', `# Pack ${p.task}`, '', `pack: ${p.id}`, `field: ${v.field}`, `questions_sha: ${v.questions_sha}`, '', '## Conclusions', ...blk.out, ''];
    L.push('## Index');
    if ((v.index ?? []).length === 0) L.push('- none');
    for (const m of v.index ?? []) L.push(`- ${m.mechanism}: ${oneLine(m.summary)} (cards: ${(m.cards ?? []).filter((c) => !isExcludedCard(c)).join(', ') || 'none'})`);
    L.push('', '## Cards');
    const trusted = cardsHere.filter((c) => !isExcludedCard(c));
    if (trusted.length === 0) L.push('- none');
    for (const cid of trusted) L.push(`- (${cardLabel(cid)}) ${cardLine(cid, loadObject(cid))}`);
    L.push('', '## Not covered');
    if ((v.not_covered ?? []).length === 0) L.push('- none');
    for (const n of v.not_covered ?? []) L.push(`- ${n.question_id}: ${n.reason}`);
    L.push('', '## Excluded', ...excludedBlock(p.id, cardsHere, blk.excluded), '');
    files.set(`views/pack-${p.task}.md`, L.join('\n'));
  }
  for (const r of reviewEntries) {
    const v = r.value;
    const blk = sentencesBlock(r.id, v.sentences);
    const cardsHere = sortUnique((v.sentences ?? []).flatMap((s) => s.cites ?? []));
    const choice = certChoice(r.id);
    const L = [header.trimEnd(), '', `# Review ${r.task}`, '', `review: ${r.id}`, `pack: ${v.pack}`, `field: ${v.field}`];
    if (v.parent) L.push(`parent: ${v.parent}`);
    L.push(choice.cert ? `certificate: ${choice.cert.id} (${certLabelOf(choice.cert.id)}; result ${choice.cert.value.result}; session ${choice.cert.value.session_label})` : 'certificate: none');
    L.push('', '## Sentences', ...blk.out, '', '## Verdicts');
    if ((v.verdicts ?? []).length === 0) L.push('- none');
    for (const d of v.verdicts ?? []) L.push(`- ${d.approach_id}: ${d.verdict} (${labels.verdicts[`${r.id}#${d.approach_id}`].label}) supports: ${(d.supports ?? []).join(', ') || 'none'}`);
    L.push('', '## Dismissals');
    if ((v.dismissals ?? []).length === 0) L.push('- none');
    for (const d of v.dismissals ?? []) {
      const out = (d.outlist ?? []).map((o) => `${o.approach_id}/${o.measure}/${o.effect}`).join(', ') || 'none';
      L.push(`- [${d.sid}] ${d.verdict} (${labels.dismissals[`${r.id}#${d.sid}`].label}) supports: ${(d.supports ?? []).join(', ') || 'none'}; out-list: ${out}`);
    }
    L.push('', '## Our work findings');
    if ((v.our_work_findings ?? []).length === 0) L.push('- none');
    for (const f of v.our_work_findings ?? []) L.push(`- ${f.file} ${f.locator} (${f.reason}): ${oneLine(f.text)}`);
    L.push('', '## Excluded', ...excludedBlock(r.id, cardsHere, blk.excluded), '');
    files.set(`views/review-${r.task}.md`, L.join('\n'));
  }

  // ---- step 4: synthesis ----
  const included = [];
  const notIncluded = [];
  for (const r of reviewEntries) {
    const choice = certChoice(r.id);
    if (choice.reason) notIncluded.push({ id: r.id, task: r.task, reason: choice.reason });
    else included.push({ ...r, cert: choice.cert });
  }
  const rows = new Map();
  for (const r of included) {
    for (const s of r.value.sentences ?? []) {
      const key = `${s.approach_id}\u0000${s.measure}`;
      if (!rows.has(key)) rows.set(key, { approach: s.approach_id, measure: s.measure, rank: 0, label: 'IN', cards: new Set(), reviews: new Map() });
      const row = rows.get(key);
      const lab = nodeLabel(`${r.id}#${s.sid}`);
      if ((LABEL_RANK[lab] ?? 0) > row.rank) { row.rank = LABEL_RANK[lab]; row.label = lab; }
      for (const cid of s.cites ?? []) if (!isExcludedCard(cid)) row.cards.add(cid);
      row.reviews.set(r.id, r.cert.value.session_label);
    }
  }
  const mergeConditions = (cardIds) => {
    const m = { task: [], model_family: [], language: [], repo_size: [], metric: [], other: [] };
    for (const cid of cardIds) {
      const c = loadObject(cid).conditions ?? {};
      for (const k of ['task', 'model_family', 'language']) m[k].push(...(c[k] ?? []));
      for (const k of ['repo_size', 'metric', 'other']) if (c[k]) m[k].push(c[k]);
    }
    return { task: sortUnique(m.task), model_family: sortUnique(m.model_family), language: sortUnique(m.language), repo_size: sortUnique(m.repo_size).join(' | '), metric: sortUnique(m.metric).join(' | '), other: sortUnique(m.other).join(' | ') };
  };
  const synth = [header.trimEnd(), '', '# Synthesis', '', '## Reviews included'];
  if (included.length === 0) synth.push('- none');
  for (const r of included) synth.push(`- ${r.id} (${r.task}): certificate ${r.cert.id} (${certLabelOf(r.cert.id)}), session ${r.cert.value.session_label}`);
  synth.push('', '## Reviews not included');
  if (notIncluded.length === 0) synth.push('- none');
  for (const r of notIncluded) synth.push(`- ${r.id} (${r.task}): ${r.reason}`);
  synth.push('', '## Table', '', '| approach | measure | label | effects | cards | conditions | reviews | note |', '|---|---|---|---|---|---|---|---|');
  const rowList = [...rows.values()].sort((a, b) => byKey(a.approach, b.approach) || byKey(a.measure, b.measure));
  const synthRows = [];
  for (const row of rowList) {
    const cardIds = [...row.cards].sort();
    const effects = sortUnique(cardIds.map((c) => loadObject(c).measured?.effect));
    const weak = effects.length > 1;
    const revs = [...row.reviews.entries()].sort((a, b) => byKey(a[0], b[0])).map(([id, lab]) => `${id} [${lab}]`);
    synth.push(`| ${row.approach} | ${row.measure} | ${row.label} | ${effects.join(', ') || '-'} | ${cardIds.join(', ') || '-'} | ${condText(mergeConditions(cardIds))} | ${revs.join('; ')} | ${weak ? 'weak: disagreement' : ''} |`);
    synthRows.push({ approach_id: row.approach, measure: row.measure, label: row.label, effects, cards: cardIds, weak });
  }
  synth.push('');
  files.set('views/synthesis.md', synth.join('\n'));

  // ---- step 5: coverage ----
  const fieldSet = new Set(table.tasks.map((t) => t.field).filter(Boolean));
  const cardField = new Map();
  for (const id of cardTask.keys()) { const c = loadObject(id); if (c?.field) { cardField.set(id, c.field); fieldSet.add(c.field); } }
  const fields = [...fieldSet].sort();
  const countedAll = [...cardTask.keys()].filter(isCounted);
  const idsCarriedBy = (cardIds) => {
    const s = new Set();
    for (const id of cardIds) for (const q of loadObject(id).question_ids ?? []) s.add(q);
    return s;
  };

  // transcripts, parsed once per session
  const trRoot = th.get('transcripts_root');
  const sessCache = new Map();
  const loadSession = (sessionId) => {
    if (sessCache.has(sessionId)) return sessCache.get(sessionId);
    const zero = { complete: false, input: 0, cache_read: 0, cache_write: 0, output: 0, calls: 0, readerCalls: 0 };
    let res = zero;
    try {
      const found = sessionTranscripts(trRoot, sessionId);
      if (found.main) {
        const parsed = [parseTranscript(found.main), ...found.helpers.map((h) => parseTranscript(h))];
        const sp = spendOf(parsed);
        let readers = 0;
        for (const pr of parsed) for (const u of pr.toolUses ?? []) if (u.access?.kind === 'agent' && u.access?.agentType === 'reader') readers++;
        res = { complete: true, input: sp.input ?? 0, cache_read: sp.cache_read ?? 0, cache_write: sp.cache_write ?? 0, output: sp.output ?? 0, calls: sp.calls ?? 0, readerCalls: readers };
      }
    } catch (e) {
      if (!(e instanceof TcbError)) throw e;
    }
    sessCache.set(sessionId, res);
    return res;
  };
  const sessionsOf = (row) => {
    const out = [];
    for (const a of row.attempts ?? []) {
      const at = attemptOf(row, a.epoch);
      if (at.session) out.push(at.session);
    }
    return out;
  };

  const fieldCoverage = {};
  const approvedUnion = new Set();
  const readerPerField = {};
  for (const f of fields) {
    const proto = currentProtocol(root, f);
    const pv = proto?.value ?? null;
    const approved = pv ? sortUnique([...(pv.question_ids ?? []), ...(pv.cross_field ?? []).map((x) => x.question_id)]) : [];
    for (const q of approved) approvedUnion.add(q);
    const carried = idsCarriedBy(countedAll);
    const covered = approved.filter((q) => carried.has(q));
    const fieldCountedCards = countedAll.filter((id) => cardField.get(id) === f);
    // held-out seed recall
    const heldFile = path.join(root, 'sealed', 'heldout', `${f}.json`);
    let heldout = null;
    if (exists(heldFile)) {
      const list = readJson(heldFile).heldout ?? [];
      const have = new Set();
      for (const id of fieldCountedCards) { const c = loadObject(id); have.add(c.source?.canonical_id); have.add(c.source?.primary_id); }
      const n = list.length;
      const found = list.filter((x) => have.has(x)).length;
      if (n === 0) heldout = { n, found, recall: null, lower: null, upper: null, label: UPPER_BOUND_NOTE };
      else {
        const ci = clopperPearson(found, n);
        heldout = { n, found, recall: found / n, lower: ci.lower, upper: ci.upper, label: UPPER_BOUND_NOTE };
      }
    }
    // Chapman on primary ids (pooled per field)
    const g1 = new Set();
    const g2 = new Set();
    for (const id of fieldCountedCards) {
      const c = loadObject(id);
      if (c.route === 'keyword') g1.add(c.source?.primary_id);
      else if (BACK_ROUTES.has(c.route)) g2.add(c.source?.primary_id);
    }
    const m = [...g1].filter((x) => g2.has(x)).length;
    const observed = new Set([...g1, ...g2]).size;
    const chap = chapman(g1.size, g2.size, m, observed);
    const coverage = [heldout?.recall, chap.coverage_ub].filter((x) => x !== null && x !== undefined);
    const cov = coverage.length ? Math.min(...coverage) : null;
    // yield per reader call
    let readerCalls = 0;
    for (const row of table.tasks) if (row.field === f) for (const s of sessionsOf(row)) readerCalls += loadSession(s).readerCalls;
    const primaries = new Set();
    for (const id of cardTask.keys()) if (cardField.get(id) === f) primaries.add(loadObject(id).source?.primary_id);
    readerPerField[f] = readerCalls;
    const entry = {
      field: f, protocol_sha256: proto?.sha256 ?? null, basis, approved, covered, not_covered: approved.filter((q) => !covered.includes(q)),
      heldout, chapman: chap, coverage: cov,
      reader_calls: readerCalls, primaries: primaries.size, yield_per_reader_call: readerCalls > 0 ? primaries.size / readerCalls : null,
    };
    if (th.isGate('coverage_floor')) entry.below_floor = cov === null ? null : cov < th.get('coverage_floor');
    fieldCoverage[f] = entry;
  }
  const carriedAll = idsCarriedBy(countedAll);
  const unionApproved = [...approvedUnion].sort();
  const unionCovered = unionApproved.filter((q) => carriedAll.has(q));
  const coverageJson = {
    schema_version: 1, built_from: builtFrom, generated_at: now, basis,
    fields: fieldCoverage,
    union: { approved: unionApproved.length, covered: unionCovered.length, not_covered: unionApproved.filter((q) => !carriedAll.has(q)) },
  };

  // ---- step 6: measures ----
  const weights = th.get('weights');
  const sleepGap = th.get('sleep_gap_ms');
  const cardsByTask = new Map();
  for (const [id, t] of cardTask) { if (!cardsByTask.has(t)) cardsByTask.set(t, []); cardsByTask.get(t).push(id); }
  const taskIds = (row, only) => {
    const own = new Set(row.question_ids ?? []);
    const ids = new Set();
    for (const id of cardsByTask.get(row.task) ?? []) {
      if (!only(id)) continue;
      for (const q of loadObject(id).question_ids ?? []) if (own.has(q)) ids.add(q);
    }
    return ids;
  };
  const measureSet = (rows) => {
    const taskSet = new Set(rows.map((r) => r.task));
    const tok = { calls: 0, input: 0, cache_read: 0, cache_write: 0, output: 0, total: 0, complete: true };
    const seen = new Set();
    for (const row of rows) {
      for (const s of sessionsOf(row)) {
        if (seen.has(s)) continue;
        seen.add(s);
        const d = loadSession(s);
        if (!d.complete) tok.complete = false;
        tok.calls += d.calls; tok.input += d.input; tok.cache_read += d.cache_read; tok.cache_write += d.cache_write; tok.output += d.output;
      }
    }
    tok.total = tok.input + tok.cache_read + tok.cache_write + tok.output;
    const tokenCost = tok.input + weights.read * tok.cache_read + weights.write * tok.cache_write + weights.out * tok.output;
    // time
    let time = null;
    const mine = [];
    lines.forEach((l, i) => { if (l.task && taskSet.has(l.task)) mine.push(i); });
    const firstIdx = mine.find((i) => lines[i].kind === 'bind' || lines[i].kind === 'started');
    if (firstIdx !== undefined) {
      const lastIdx = mine[mine.length - 1];
      const t0 = Date.parse(lines[firstIdx].ts);
      const t1 = Date.parse(lines[lastIdx].ts);
      const gaps = [];
      for (let i = firstIdx; i < lastIdx; i++) {
        const a = Date.parse(lines[i].ts);
        const b = Date.parse(lines[i + 1].ts);
        if (b - a > sleepGap) gaps.push({ from: lines[i].ts, to: lines[i + 1].ts, gap_s: (b - a) / 1000 });
      }
      const wall = (t1 - t0) / 1000;
      const quiet = gaps.reduce((s, g) => s + g.gap_s, 0);
      time = { first_ts: lines[firstIdx].ts, last_ts: lines[lastIdx].ts, wall_s: wall, quiet_s: quiet, active_s: wall - quiet, quiet_gaps: gaps };
    }
    const covered = new Set();
    const confirmed = new Set();
    for (const row of rows) {
      for (const q of taskIds(row, isCounted)) covered.add(q);
      for (const q of taskIds(row, (id) => statusOf(id) === 'confirmed' && cardLabel(id) !== 'superseded')) confirmed.add(q);
    }
    // R20: "approved ids covered ... per hour". Over wall hours: a step writes no ledger line while it
    // works, so a ledger gap cannot tell sleep from work; quiet_gaps and active_s stay readings only.
    const throughput = time && time.wall_s > 0 ? covered.size / (time.wall_s / 3600) : null;
    const efficiency = tok.total > 0 ? confirmed.size / (tok.total / 1e6) : null;
    // hallucinations
    const inSet = (cardId) => taskSet.has(cardTask.get(cardId));
    const hall = { witness_rejections: 0, checker_rejections: 0, checker_unclear: 0, citation_failures: 0 };
    for (const w of witnessRecs) if (w.result === 'rejected' && inSet(w.card_id)) hall.witness_rejections++;
    for (const s of statusRecs) {
      const v = s.check?.verdict;
      if (!v || !inSet(s.card_id)) continue;
      if (CHECKER_REJECT.has(v)) hall.checker_rejections++;
      else if (v === 'unclear') hall.checker_unclear++;
    }
    for (const l of lines) {
      if (l.kind !== 'intake' || !taskSet.has(l.task)) continue;
      hall.citation_failures += (l.data?.flagged ?? []).length;
      hall.citation_failures += (l.data?.rejected ?? []).filter((r) => CITATION_CODES.has(r.code)).length;
    }
    return { tokens: tok, token_cost: tokenCost, time, covered_ids: covered.size, confirmed_ids: confirmed.size, throughput_per_h: throughput, efficiency_per_mtok: efficiency, hallucinations: hall };
  };

  const byTask = {};
  const liveRows = table.tasks.filter((r) => (r.attempts ?? []).length > 0);
  for (const row of liveRows.slice().sort((a, b) => byKey(a.task, b.task))) {
    byTask[row.task] = { field: row.field ?? null, stage: row.stage, state: row.state, attempts: row.attempts.length, ...measureSet([row]) };
  }
  const byField = {};
  for (const f of fields) {
    const m = measureSet(liveRows.filter((r) => r.field === f));
    const cs = [...cardTask.keys()].filter((id) => cardField.get(id) === f);
    const cnt = { n: cs.length, pending: 0, witnessed: 0, confirmed: 0, unverifiable: 0, rejected: 0, superseded: 0 };
    for (const id of cs) {
      if (cardLabel(id) === 'superseded') { cnt.superseded++; continue; }
      const st = statusOf(id);
      if (st in cnt) cnt[st]++;
    }
    byField[f] = { ...m, cards: cnt, unverifiable_share: cnt.n > 0 ? cnt.unverifiable / cnt.n : null, coverage: fieldCoverage[f].coverage };
  }
  // arms
  let byArm = null;
  const plan = loadAnalysisPlan();
  if (plan?.arm_tasks) {
    byArm = {};
    for (const arm of Object.keys(plan.arm_tasks).sort()) {
      const refs = [plan.arm_tasks[arm].pack, plan.arm_tasks[arm].review].filter(Boolean).map(tasksOfRef);
      const rows = sortUnique(refs).map((t) => table.tasks.find((r) => r.task === t)).filter(Boolean);
      byArm[arm] = { tasks: sortUnique(refs), ...measureSet(rows) };
    }
  }
  function loadAnalysisPlan() {
    const l = [...lines].reverse().find((x) => (x.kind === 'plan-freeze' || x.kind === 'protocol-amend') && x.data?.name === 'analysis-plan');
    if (l) {
      const file = path.join(root, l.data.path ?? `plan/frozen/analysis-plan-${String(l.data.sha256).slice(0, 12)}.json`);
      if (!exists(file)) throw new TcbError('missing', 2, { file: path.relative(root, file) });
      const buf = fs.readFileSync(file);
      const value = readJson(file);
      if (sha256hex(buf) !== l.data.sha256 && sha256hex(canonicalize(value)) !== l.data.sha256) throw new TcbError('frozen-tampered', 3, { file: path.relative(root, file) });
      return value;
    }
    const draft = path.join(root, 'plan', 'analysis-plan.json');
    return exists(draft) ? readJson(draft) : null;
  }

  const allCards = [...cardTask.keys()];
  const nUnv = allCards.filter((id) => cardLabel(id) !== 'superseded' && statusOf(id) === 'unverifiable').length;
  const lowest = Object.values(fieldCoverage).map((c) => c.coverage).filter((x) => x !== null);
  const values = {
    unverifiable_share: allCards.length > 0 ? nUnv / allCards.length : null,
    coverage: lowest.length ? Math.min(...lowest) : null,
  };
  const overall = measureSet(liveRows);
  const readings = hazardReadings();
  function hazardReadings() {
    const d = currentDesign(root);
    if (!d?.hazards_id) return { state: 'not_run' };
    const hz = getObject(root, d.hazards_id);
    return residualReading(hz, d);
  }

  const measures = {
    schema_version: 1, built_from: builtFrom, generated_at: now,
    weights, by_task: byTask, by_field: byField, by_arm: byArm,
    totals: { tokens: overall.tokens, token_cost: overall.token_cost, hallucinations: overall.hallucinations },
    seeded_escape_rate: qual && qual.escape !== undefined ? qual.escape : null,
    quality: comparison ? (comparison.arms ?? null) : null,
    values, readings,
  };

  // ---- step 8: owner page ----
  const raw = readJson(path.join(root, 'tcb', 'thresholds.json'));
  const actionLines = Object.entries(raw.params ?? {}).filter(([, p]) => p.line).map(([name, p]) => ({ name, measure: p.line.measure, op: p.line.op, value: th.get(name), gate: th.isGate(name) }));
  const o = [header.trimEnd(), '', '# Owner page', ''];
  o.push('## Trusted base', '', `- tcb_commit: ${coord.tcb_commit ?? 'n/a'}`, `- ledger seq: ${head.seq}`, `- ledger head: ${head.hash}`, '');
  o.push('## Seven measures', '', '| scope | throughput_per_h | efficiency_per_mtok | tokens | token_cost | wall_s | active_s | quality | hallucinations |', '|---|---|---|---|---|---|---|---|---|');
  const rowOf = (name, m, quality) => `| ${name} | ${num(m.throughput_per_h)} | ${num(m.efficiency_per_mtok)} | ${m.tokens.total}${m.tokens.complete ? '' : ' (incomplete)'} | ${num(m.token_cost)} | ${num(m.time?.wall_s)} | ${num(m.time?.active_s)} | ${quality} | ${hallText(m.hallucinations)} |`;
  for (const f of fields) o.push(rowOf(`field ${f}`, byField[f], 'n/a'));
  if (byArm) for (const a of Object.keys(byArm)) o.push(rowOf(`arm ${a}`, byArm[a], comparison?.arms?.[a] ? `answered ${num(comparison.arms[a].answered)}` : 'n/a'));
  if (fields.length === 0 && !byArm) o.push('| none | n/a | n/a | 0 | n/a | n/a | n/a | n/a | n/a |');
  o.push('', 'Action lines:', '');
  if (actionLines.length === 0) o.push('- none');
  for (const a of actionLines) {
    const v = values[a.measure];
    const lineText = a.value !== null && a.gate ? `line ${a.value} (${a.op}, gate)` : 'reading (no gate)';
    o.push(`- ${a.measure}: value ${num(v)}, ${a.name}: ${lineText}`);
  }
  o.push('', '## Coverage', '');
  for (const f of fields) {
    const c = fieldCoverage[f];
    o.push(`- ${f}: approved ${c.approved.length}, covered ${c.covered.length} (basis ${c.basis}); coverage ${num(c.coverage)}; ${c.heldout ? `held-out recall ${num(c.heldout.recall)} (${c.heldout.found}/${c.heldout.n}, interval ${num(c.heldout.lower)} to ${num(c.heldout.upper)}; ${UPPER_BOUND_NOTE})` : 'no held-out seeds'}; Chapman N_hat ${num(c.chapman.N_hat)}${c.chapman.reason ? ` (${c.chapman.reason})` : ''}`);
  }
  if (fields.length === 0) o.push('- none');
  o.push(`- union: approved ${coverageJson.union.approved}, covered ${coverageJson.union.covered}`, '');
  o.push('## Hallucination figures', '', `- ${hallText(overall.hallucinations)}`, `- seeded escape: ${measures.seeded_escape_rate ? `${measures.seeded_escape_rate.escaped}/${measures.seeded_escape_rate.n} (rate ${num(measures.seeded_escape_rate.rate)}, upper ${num(measures.seeded_escape_rate.upper)})` : 'not measured'}`, '');
  o.push('## Qualification', '');
  if (!qual) o.push('not measured');
  else {
    const cls = Object.entries(qual.classes ?? {}).sort((a, b) => byKey(a[0], b[0]));
    if (cls.length === 0) o.push('not measured');
    for (const [name, c] of cls) o.push(`- ${name}: d_hat ${num(c.d_hat)}, lower bound ${num(c.lower)}, status ${c.status ?? (c.qualified ? 'qualified' : 'unqualified')}`);
  }
  o.push('');
  // not run and stale
  const nodeCounts = { STALE: 0, PENDING: 0 };
  for (const nd of Object.values(labels.nodes ?? {})) if (nd.label in nodeCounts) nodeCounts[nd.label]++;
  const cardPending = Object.values(labels.cards ?? {}).filter((c) => c.label === 'pending').length;
  const staleCerts = Object.values(labels.certificates ?? {}).filter((v) => (typeof v === 'string' ? v : v?.label) === 'STALE').length;
  const lastCheck = new Map();
  for (const l of lines) if (l.kind === 'check' && !(l.data.check === 'render' && l.data.subject === 'views')) lastCheck.set(`${l.data.check}:${l.data.subject}`, l.data.result);
  const lastFsck = [...lines].reverse().find((l) => l.kind === 'fsck');
  const notRun = [...lastCheck.entries()].filter(([, r]) => r === 'not_run').map(([k]) => k).sort();
  if (lastFsck?.data?.result === 'not_run') notRun.push('fsck:store');
  o.push('## Not run and stale', '', `- STALE nodes: ${nodeCounts.STALE}`, `- PENDING nodes: ${nodeCounts.PENDING}`, `- cards pending: ${cardPending}`, `- STALE certificates: ${staleCerts}`, `- checks not run: ${notRun.length}${notRun.length ? ` (${notRun.join(', ')})` : ''}`, '');
  o.push('## Residual readings', '');
  if (readings.state === 'not_run') o.push('not run: no hazards object for the current cut');
  else {
    o.push(`- Chapman: ${readings.chapman.state === 'estimated' ? `N_hat ${num(readings.chapman.N_hat)} (range ${num(readings.chapman.range.low)} to ${num(readings.chapman.range.high)}), residual ${num(readings.chapman.residual)}` : 'not estimable'}`);
    o.push(`- Chao2: ${readings.chao2.state === 'estimated' ? `estimate ${num(readings.chao2.estimate)} (range ${num(readings.chao2.range.low)} to ${num(readings.chao2.range.high)}), residual ${num(readings.chao2.residual)}` : 'not estimable'}`);
    o.push('- These are readings. They never pass, stop or add anything.');
  }
  o.push('', '## Excluded', '');
  const excl = [];
  for (const id of sortUnique([...renderedCards])) if (isExcludedCard(id)) excl.push(`- card ${id} (${cardLabel(id)})`);
  for (const p of packEntries) for (const s of p.value.conclusions ?? []) if (sentenceExcluded(s)) excl.push(`- sentence ${p.id}#${s.sid} (${nodeLabel(`${p.id}#${s.sid}`)})`);
  for (const r of reviewEntries) for (const s of r.value.sentences ?? []) if (sentenceExcluded(s)) excl.push(`- sentence ${r.id}#${s.sid} (${nodeLabel(`${r.id}#${s.sid}`)})`);
  if (excl.length === 0) o.push('- none');
  o.push(...excl, '');
  files.set('views/owner.md', o.join('\n'));
  files.set('views/coverage.json', pretty(coverageJson));
  files.set('views/measures.json', pretty(measures));

  // ---- write ----
  const names = [...files.keys()].sort();
  if (dry) return { exit: 0, dry_run: true, result: { dry_run: true, would_write: names, built_from: builtFrom }, reasons: [] };
  await locked(async (h) => {
    for (const name of names) await writeAtomic(path.join(root, name), files.get(name));
    await appendLedger(root, h, { ctx, ce, kind: 'check', now, data: { check: 'render', subject: 'views', result: 'pass', reasons: [] } });
  });
  return { exit: 0, result: { files: names, built_from: builtFrom, packs: packEntries.length, reviews: reviewEntries.length, synthesis_rows: synthRows.length }, reasons: [] };
}

// ---------------------------------------------------------------------------------------------
// numerics
// ---------------------------------------------------------------------------------------------
function chapman(n1, n2, m, observed) {
  const base = { n1, n2, m, observed };
  if (n1 === 0 || n2 === 0) return { ...base, N_hat: null, reason: 'no-captures', coverage_ub: null, m_expected: null };
  if (m === 0) return { ...base, N_hat: null, reason: 'no-overlap', coverage_ub: null, m_expected: null };
  const N = ((n1 + 1) * (n2 + 1)) / (m + 1) - 1;
  return { ...base, N_hat: N, reason: null, coverage_ub: observed / N, m_expected: (n1 * n2) / N };
}

function residualReading(hz, design) {
  const entries = (hz.map ?? []).filter((e) => e.source && (e.source.kind === 'uca' || e.source.kind === 'cell'));
  const variant = (moved) => {
    const sets = { uca: new Set(), cell: new Set() };
    for (const e of entries) {
      const id = moved && e.borderline && e.alt_hazard_id ? e.alt_hazard_id : e.hazard_id;
      sets[e.source.kind].add(id);
    }
    const all = new Set([...sets.uca, ...sets.cell]);
    const both = [...sets.uca].filter((x) => sets.cell.has(x)).length;
    const Q2 = both;
    const Q1 = all.size - both;
    const ch = chapman(sets.uca.size, sets.cell.size, both, all.size);
    let chao = null;
    if (all.size > 0) {
      const add = Q2 > 0 ? (Q1 * Q1) / (2 * Q2) : (Q1 * (Q1 - 1)) / (2 * (Q2 + 1));
      chao = { S_obs: all.size, Q1, Q2, estimate: all.size + add, form: Q2 > 0 ? 'classic' : 'bias-corrected' };
    }
    return { ch, chao, uca: sets.uca.size, cell: sets.cell.size };
  };
  const kept = variant(false);
  const moved = variant(true);
  const range = (a, b) => {
    const xs = [a, b].filter((x) => x !== null && x !== undefined);
    return xs.length ? { low: Math.min(...xs), high: Math.max(...xs) } : null;
  };
  const chapmanOut = kept.ch.N_hat === null
    ? { state: 'not_estimable', reason: kept.ch.reason, n1: kept.ch.n1, n2: kept.ch.n2, m: kept.ch.m }
    : { state: 'estimated', n1: kept.ch.n1, n2: kept.ch.n2, m: kept.ch.m, observed: kept.ch.observed, N_hat: kept.ch.N_hat, residual: kept.ch.N_hat - kept.ch.observed, range: range(kept.ch.N_hat, moved.ch.N_hat) };
  const chaoOut = !kept.chao
    ? { state: 'not_estimable', reason: 'no-mapped-hazards' }
    : { state: 'estimated', ...kept.chao, residual: kept.chao.estimate - kept.chao.S_obs, range: range(kept.chao.estimate, moved.chao ? moved.chao.estimate : null) };
  return {
    state: 'run', hazards_id: design.hazards_id, hazards_sha: design.hazards_sha,
    lenses: { uca: kept.uca, cell: kept.cell },
    borderline: entries.filter((e) => e.borderline).length,
    chapman: chapmanOut, chao2: chaoOut,
  };
}

function hallText(h) {
  return `witness_rejections ${h.witness_rejections}, checker_rejections ${h.checker_rejections}, checker_unclear ${h.checker_unclear}, citation_failures ${h.citation_failures}`;
}

await runMain(import.meta.url, SCRIPT, main);
