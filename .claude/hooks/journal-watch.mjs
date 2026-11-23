// Journal watch (unit T8-JOURNAL, top session 8, 2026-11-24; ruling r57-0056; library/README.md rule 1).
// PostToolUse hook for Bash and PowerShell. The record guard (PreToolUse) refuses every write to library/journal/ it can
// read from a command; what it cannot read (a script file that computes its path, a path held in a variable set by
// another program) is caught here, right after the call: every file under library/journal of the session's checkout
// and of this repository's main checkout must be in the state tools/journal.mjs last wrote, or, where the tool has not
// written it since HEAD moved, the state HEAD holds (tools/journal-rules.mjs, judgeFile). A file in any other state is
// reported to the session once (exit 2: a PostToolUse hook cannot undo the call, x01-0305; its stderr reaches the
// model), with what changed and where the tool's last good copy is; the commit check then refuses it.
// Fast path: one stat per journal file against the sizes and times last seen consistent (the seal's "known"); git runs
// only when one of them differs. An unreadable input, or an error of the watch itself, lets the session go on and is
// logged to ../logs/journal-watch.jsonl.
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
function log(o) {
  try { mkdirSync(resolve(here, '..', 'logs'), { recursive: true }); appendFileSync(resolve(here, '..', 'logs', 'journal-watch.jsonl'), JSON.stringify({ t: Date.now(), ...o }) + '\n'); } catch {}
}
// The wait for a running append (the tool's lock) is tools/journal-rules.mjs's LOCK_WAIT_MS (t8-0104); it only runs
// while a lock exists.

let j;
try { j = JSON.parse(readFileSync(0, 'utf8')); } catch { log({ note: 'hook input unreadable' }); process.exit(0); }
if (j.hook_event_name !== 'PostToolUse') process.exit(0);

let R;
try { R = await import('../../tools/journal-rules.mjs'); } catch (e) { log({ note: 'tools/journal-rules.mjs cannot be loaded: ' + String(e && e.message).slice(0, 200) }); process.exit(0); }

const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const reports = [];
try {
  const tops = new Map();
  for (const d of [typeof j.cwd === 'string' && j.cwd ? j.cwd : null, resolve(here, '..', '..')]) {
    if (!d) continue;
    const c = R.findCheckout(d);
    if (c && !tops.has(c.key)) tops.set(c.key, c);
  }
  for (const ck of tops.values()) {
    let present = R.listJournal(ck.top);
    if (!present.size) continue;
    let seal = R.readSeal(ck.common), c = R.checkoutOf(seal, ck.key);
    const changed = () => { const xs = []; for (const rel of new Set([...present.keys(), ...Object.keys(c.known)])) { const st = present.get(rel); if (!same(st && [st.size, st.mtimeMs], c.known[rel])) xs.push(rel); } return xs; };
    let todo = changed();
    if (!todo.length) continue;
    if (R.lockHeld(ck.common)) { // an append is running: judge after it
      const release = R.lock(ck.common, R.LOCK_WAIT_MS);
      if (release) release();
      present = R.listJournal(ck.top); seal = R.readSeal(ck.common); c = R.checkoutOf(seal, ck.key);
      todo = changed();
      if (!todo.length) continue;
    }
    const hs = R.headState(ck.top);
    const ok = [], bad = [];
    for (const rel of todo) {
      let buf = null;
      try { buf = present.has(rel) ? readFileSync(join(ck.top, rel)) : null; } catch {}
      const entry = c.files[rel];
      const r = R.judgeFile(rel, buf, entry, hs.blobs.get(rel), hs.head, () => R.headText(ck.top, rel));
      if (r.ok) { ok.push(rel); continue; }
      if (c.flagged[rel] === (r.sha || 'removed')) continue; // reported already
      const base = entry && entry.head === hs.head ? R.readCopy(ck.common, entry.sha) : R.headText(ck.top, rel);
      bad.push({ rel, r, entry, diff: R.lineDiff(base, buf) });
    }
    const release = R.lock(ck.common, R.LOCK_WAIT_MS);
    if (release) {
      try {
        seal = R.readSeal(ck.common); c = R.checkoutOf(seal, ck.key);
        for (const rel of ok) { const st = present.get(rel); if (st) c.known[rel] = [st.size, st.mtimeMs]; else delete c.known[rel]; delete c.flagged[rel]; }
        for (const b of bad) c.flagged[b.rel] = b.r.sha || 'removed';
        R.writeSeal(ck.common, seal);
      } finally { release(); }
    }
    for (const b of bad) {
      const d = b.diff;
      const where = ck.key === R.findCheckout(resolve(here, '..', '..'))?.key ? b.rel : `${b.rel} (in ${ck.top})`;
      const copy = b.entry ? ` The tool's last state of it is kept at ${join(ck.common, 'journal-seal.d', b.entry.sha + '.jsonl')}; git holds the committed part.` : '';
      const before = !b.entry && b.r.why !== 'removed'
        ? ' If these are records written before tools/journal.mjs existed (before 2026-11-24), the top session adopts them once: node tools/journal.mjs --adopt ' + b.rel + ' (a dry run), then with --apply.'
        : '';
      reports.push(`journal watch (library/README.md rule 1): the last command left ${where} ${b.r.why === 'removed' ? 'removed' : 'changed'} outside node tools/journal.mjs: ` +
        `${d.lost.length} line(s) of its last good state gone or changed${d.lost.length ? ` (${d.lost.slice(0, 6).join(', ')})` : ''}, ` +
        `${d.added.length} line(s) added by another route${d.added.length ? ` (${d.added.slice(0, 6).join(', ')})` : ''}. ` +
        'The journal is only added to, and only through the tool.' + copy + before +
        ' Do not write the file again by hand; tell the top session, which tells the owner (putting lines back or taking them out needs his word, as in r57-0055). The commit check refuses the file as it is.');
      log({ session: typeof j.session_id === 'string' ? j.session_id.slice(0, 8) : null, tool: j.tool_name, rel: b.rel, why: b.r.why, lost: d.lost.length, added: d.added.length });
    }
  }
} catch (e) {
  log({ note: 'watch error: ' + String(e && e.stack || e).slice(0, 300) });
  process.exit(0);
}
if (reports.length) { process.stderr.write(reports.join('\n') + '\n'); process.exit(2); }
process.exit(0);
