// Commit check (version 3, 2026-11-24, unit T8-JOURNAL of top session 8; version 2 of 2026-11-19 added
// docs/program/evidence/, finding 1 of research-tree/build/refute/P0-GATE.md). Run by tools/git-hooks/pre-commit
// (core.hooksPath = the absolute path of tools/git-hooks, so every worktree runs the main checkout's copy). It reads the
// index of the checkout or worktree being committed and the manifests of that worktree, with the main checkout's as
// well (a worktree cut from an old base may have none); when neither copy of a manifest can be read it refuses the
// commit (fails closed).
// Refuses a commit that
//   1. changes, renames or deletes archived evidence: a file under recovered/ or docs/program/evidence/, or one listed
//      in migration/source-manifest.json or migration/clinic-manifest.json (CLAUDE.md rule 1, AGENTS.md). What is
//      changed, renamed or deleted is always a file the HEAD of the checkout being committed holds; added files commit;
//   2. changes or drops a line of a library journal file, or renames or deletes one (library/README.md rule 1);
//   3. adds a journal line that is not a valid record, by the rules tools/journal.mjs applies (tools/journal-rules.mjs:
//      one JSON object; id, kind, status and claim present; kind and status from library/README.md; fields in the
//      README's order and of their type; an id whose writer prefix matches its file and that no other line uses, read
//      by JSON so spacing cannot hide it; "supersedes" and id-shaped "see" entries naming records that exist);
//   4. (version 3) adds a journal line that tools/journal.mjs did not write (or adopt): every added line must be one the
//      tool recorded in the seal (git common directory, journal-seal.json), so a line written by any other route, or
//      rewritten after the tool wrote it (t7-0801: a field moved by `node -e`), is refused;
//   5. (version 3) commits a journal file from which a line the tool appended since HEAD is missing, in the index and in
//      the working tree alike (t7-0800: uncommitted lines removed by hand). Checked while HEAD is the commit the tool
//      wrote at; once HEAD has moved, the journal watch has already reported such a loss when it happened.
// `git commit --no-verify` skips it; that is the owner's call, never a session's. git runs no pre-commit hook for a
// merge without conflicts, a revert, a cherry-pick or a rebase: the record guard refuses a revert or a reset that would
// take journal lines out; the others are not checked here.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { isJournal, linesOf, idOfLine, parseLine, validateRecord, lineSha, findCheckout, readSeal, checkoutOf } from './journal-rules.mjs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const root = git('rev-parse', '--show-toplevel').trim();
// the main checkout: the folder that holds the common git directory (the same as root outside a worktree)
let mainRoot = root;
try { mainRoot = dirname(git('rev-parse', '--path-format=absolute', '--git-common-dir').trim()); } catch {}
const errors = [];

let hasHead = true;
let head = null;
try { head = git('rev-parse', '--verify', 'HEAD').trim(); } catch { hasHead = false; }

const archivedSet = new Set();
for (const [file, pick] of [['source-manifest.json', (m) => m], ['clinic-manifest.json', (m) => m.files || []]]) {
  let read = 0;
  for (const dir of new Set([root, mainRoot])) {
    try { for (const x of pick(JSON.parse(readFileSync(resolve(dir, 'migration', file), 'utf8')))) archivedSet.add(String(x.path).toLowerCase()); read++; } catch {}
  }
  if (!read) errors.push(`migration/${file} cannot be read in ${root}${mainRoot !== root ? ` or in ${mainRoot}` : ''}, so archived evidence cannot be told; the commit is refused (fails closed). Restore the manifest from git.`);
}
const isArchived = (p) => { const l = p.toLowerCase(); return l.startsWith('recovered/') || l.startsWith('docs/program/evidence/') || archivedSet.has(l); };

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
  for (const line of linesOf(txt)) {
    const id = idOfLine(line);
    if (id) { if (!idFiles.has(id)) idFiles.set(id, []); idFiles.get(id).push(p); }
  }
}

// the seal of tools/journal.mjs for the checkout being committed
const ck = findCheckout(root);
const seal = ck ? readSeal(ck.common) : null;
const sealed = seal && ck ? checkoutOf(seal, ck.key).files : {};

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
  const foreign = [];
  added.forEach((line, k) => {
    if (!line.trim()) return;
    const where = `${c.path} (added line ${k + 1})`;
    if (!seal || !seal.lines[lineSha(line)]) foreign.push(`${k + 1}${idOfLine(line) ? ' ' + idOfLine(line) : ''}`);
    const p = parseLine(line, where);
    if (p.error) { errors.push(p.error); return; }
    errors.push(...validateRecord(p.o, { where, stem, uses: (id) => idFiles.get(id), exists: (id) => idFiles.has(id) }));
  });
  if (foreign.length) {
    errors.push(`${c.path}: ${foreign.length} added line(s) were not written by node tools/journal.mjs, or were changed after it wrote them (added line ${foreign.slice(0, 5).join(', ')}); ` +
      'records are added only through the tool (library/README.md, "How to add records"). Lines written before the tool existed are adopted once: node tools/journal.mjs --adopt <file>, then --apply.');
  }
  const entry = sealed[c.path];
  if (entry && hasHead && entry.head === head && Array.isArray(entry.pending) && entry.pending.length) {
    const have = new Set(linesOf(neu).map(lineSha));
    try { for (const l of linesOf(readFileSync(resolve(root, c.path), 'utf8'))) have.add(lineSha(l)); } catch {}
    const lost = entry.pending.filter(([s]) => !have.has(s)).map(([, id]) => id || '?');
    if (lost.length) {
      errors.push(`${c.path}: ${lost.length} line(s) tools/journal.mjs appended since the last commit are gone from it (${lost.slice(0, 6).join(', ')}); a journal line is never removed (library/README.md rule 1). ` +
        'The tool\'s last state of the file is kept in the git folder (journal-seal.d); putting it back needs the owner\'s word.');
    }
  }
}

if (errors.length) {
  process.stderr.write('Commit refused by tools/check-commit.mjs:\n' + errors.slice(0, 40).map((e) => '  - ' + e).join('\n') +
    (errors.length > 40 ? `\n  ... and ${errors.length - 40} more` : '') + '\n');
  process.exit(1);
}
process.exit(0);
