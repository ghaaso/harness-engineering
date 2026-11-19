// Commit check (version 0, 2026-11-19). Run by tools/git-hooks/pre-commit (core.hooksPath = tools/git-hooks).
// Refuses a commit that
//   1. changes, renames or deletes archived evidence: a file under recovered/, or one listed in
//      migration/source-manifest.json or migration/clinic-manifest.json (CLAUDE.md rule 1, AGENTS.md);
//   2. changes or drops a line of a library journal file, or renames or deletes one (library/README.md rule 1);
//   3. adds a journal line that is not a valid record: one JSON object; id, kind, status and claim present;
//      kind and status from library/README.md; fields in the README's order; an id whose writer prefix
//      matches its file and is not already used anywhere in the journal.
// This catches what the record guard hook cannot see: writes made through shell commands or by hand.
// `git commit --no-verify` skips it; that is the owner's call, never a session's.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const root = git('rev-parse', '--show-toplevel').trim();
const errors = [];

let hasHead = true;
try { git('rev-parse', '--verify', 'HEAD'); } catch { hasHead = false; }

const archivedSet = new Set();
for (const [file, pick] of [['source-manifest.json', (m) => m], ['clinic-manifest.json', (m) => m.files || []]]) {
  try { for (const x of pick(JSON.parse(readFileSync(resolve(root, 'migration', file), 'utf8')))) archivedSet.add(String(x.path).toLowerCase()); } catch {}
}
const isArchived = (p) => { const l = p.toLowerCase(); return l.startsWith('recovered/') || archivedSet.has(l); };
const isJournal = (p) => /^library\/journal\/.+\.jsonl$/i.test(p);

const ORDER = ['id', 'kind', 'status', 'claim', 'when', 'quote', 'evidence', 'see', 'note', 'handles', 'footprint', 'supersedes', 'date', 'by'];
const KINDS = new Set(['ruling', 'fact', 'status', 'result', 'hypothesis', 'open', 'mistake', 'pointer', 'adjudication']);
const STATUS = new Set(['owner', 'measured', 'observed', 'quoted', 'summary', 'textbook', 'reasoned', 'designed-only', 'open']);

const staged = git('diff', '--cached', '--name-status', '-M', '-z').split('\0').filter(Boolean);
const changes = [];
for (let i = 0; i < staged.length;) {
  const st = staged[i++];
  if (st[0] === 'R' || st[0] === 'C') changes.push({ st: st[0], from: staged[i++], path: staged[i++] });
  else changes.push({ st: st[0], path: staged[i++] });
}

// ids already used, read from the index (what this commit will hold), with the file each is in
const idFiles = new Map();
const ls = git('ls-files', '-z', '--', 'library/journal').split('\0').filter((p) => p.endsWith('.jsonl'));
for (const p of ls) {
  let txt = '';
  try { txt = git('show', ':' + p); } catch { continue; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\{"id":"([^"]+)"/.exec(line);
    if (m) { if (!idFiles.has(m[1])) idFiles.set(m[1], []); idFiles.get(m[1]).push(p); }
  }
}

for (const c of changes) {
  const src = c.from || c.path;
  if ((c.st === 'M' || c.st === 'D' || c.st === 'R' || c.st === 'T') && isArchived(src)) {
    errors.push(`${src}: archived evidence is never changed, renamed or deleted (CLAUDE.md rule 1). Put new work in a new file.`);
  }
  if ((c.st === 'D' || c.st === 'R') && isJournal(src)) {
    errors.push(`${src}: a journal file is never deleted or renamed (library/README.md rule 1).`);
  }
  if (!isJournal(c.path) || c.st === 'D') continue;
  const neu = git('show', ':' + c.path);
  let old = '';
  if (c.st === 'M' && hasHead) {
    old = git('show', 'HEAD:' + c.path);
    if (!neu.startsWith(old)) {
      errors.push(`${c.path}: an existing journal line was changed or dropped; the journal is only added to (library/README.md rule 1). A correction is a new record whose "supersedes" names the old one.`);
      continue;
    }
  }
  const stem = c.path.split('/').pop().replace(/\.jsonl$/i, '');
  const added = neu.slice(old.length).split(/\r?\n/);
  added.forEach((line, k) => {
    if (!line.trim()) return;
    const where = `${c.path} (added line ${k + 1})`;
    let o;
    try { o = JSON.parse(line); } catch { errors.push(`${where}: not one JSON object on one line.`); return; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) { errors.push(`${where}: not a JSON object.`); return; }
    for (const f of ['id', 'kind', 'status', 'claim']) if (!o[f]) errors.push(`${where}: field "${f}" is missing.`);
    if (o.kind && !KINDS.has(o.kind)) errors.push(`${where}: kind "${o.kind}" is not one of ${[...KINDS].join(', ')}.`);
    if (o.status && !STATUS.has(o.status)) errors.push(`${where}: status "${o.status}" is not one of ${[...STATUS].join(', ')}.`);
    let last = -1;
    for (const key of Object.keys(o)) {
      const at = ORDER.indexOf(key);
      if (at < 0) { errors.push(`${where}: field "${key}" is not a record field (library/README.md, "A record").`); continue; }
      if (at < last) { errors.push(`${where}: field "${key}" is out of the README's order (${ORDER.join(', ')}).`); break; }
      last = at;
    }
    const id = String(o.id || '');
    const m = /^([a-z0-9]+)-(\d{4})$/.exec(id);
    if (!m) errors.push(`${where}: id "${id}" is not <prefix>-<four digits>.`);
    else if (!stem.startsWith(m[1])) errors.push(`${where}: id "${id}" belongs to writer "${m[1]}", not to the file "${stem}" (one file per writer).`);
    const files = idFiles.get(id) || [];
    if (files.length > 1) errors.push(`${where}: id "${id}" is used more than once in the journal (${[...new Set(files)].join(', ')}); an id is never reused.`);
  });
}

if (errors.length) {
  process.stderr.write('Commit refused by tools/check-commit.mjs:\n' + errors.slice(0, 40).map((e) => '  - ' + e).join('\n') +
    (errors.length > 40 ? `\n  ... and ${errors.length - 40} more` : '') + '\n');
  process.exit(1);
}
process.exit(0);
