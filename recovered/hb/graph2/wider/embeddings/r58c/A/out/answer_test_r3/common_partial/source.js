'use strict';
// Source text at a commit, for the snippet and signature output forms and for doc-section text in the
// text index. The repo is only read: each commit is exported with `git archive | tar -x` into
// build/tmp, the files that are graph nodes are copied into a content-addressed store, and the export
// is deleted. trees/<sha>.json maps path -> blob hash; blobs/<hash>.txt holds the text.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const P = require('./paths');

const treeCache = new Map();
const blobCache = new Map();

function treeFile(sha) { return path.join(P.SRCSTORE, 'trees', sha + '.json'); }
// paths that were wanted but are not files in the commit's export (so a check never re-exports for them)
function absentFile(sha) { return path.join(P.SRCSTORE, 'trees', sha + '.absent.json'); }

// The tree is keyed by the commit alone, so it must hold every path any load of that commit wants.
// facts.js always asks for every file and doc path of the commit (removed documents included). A tree
// written before the pre-flight fix by a removal run lacks the removed document: it is detected here (a
// wanted path neither in the tree nor recorded as absent) and rebuilt with the union of both path sets.
function ensureTree(sha, wantedPaths) {
  const tf = treeFile(sha);
  let keep = [];
  if (fs.existsSync(tf)) {
    const have = JSON.parse(fs.readFileSync(tf, 'utf8'));
    const absent = fs.existsSync(absentFile(sha)) ? new Set(JSON.parse(fs.readFileSync(absentFile(sha), 'utf8'))) : new Set();
    if ([...wantedPaths].every((p) => p in have || absent.has(p))) return;
    keep = Object.keys(have);
    treeCache.delete(sha);
  }
  wantedPaths = new Set([...wantedPaths, ...keep]);
  fs.mkdirSync(path.join(P.SRCSTORE, 'blobs'), { recursive: true });
  fs.mkdirSync(path.join(P.SRCSTORE, 'trees'), { recursive: true });
  const dir = path.join(P.TMP, 'src-' + sha.slice(0, 12) + '-' + process.pid);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const tar = execFileSync('git', ['-C', P.REPO, 'archive', '--format=tar', sha], { maxBuffer: 1 << 30 });
    execFileSync('tar', ['-x', '-C', dir.split(path.sep).join('/')], { input: tar, maxBuffer: 1 << 30 });
    const tree = {}; const absent = [];
    for (const p of [...wantedPaths].sort()) {
      const f = path.join(dir, p);
      if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { absent.push(p); continue; }
      const text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
      const h = crypto.createHash('sha1').update(text).digest('hex');
      const bf = path.join(P.SRCSTORE, 'blobs', h + '.txt');
      if (!fs.existsSync(bf)) fs.writeFileSync(bf, text);
      tree[p] = h;
    }
    if (absent.length) fs.writeFileSync(absentFile(sha), JSON.stringify(absent));
    fs.writeFileSync(tf + '.part', JSON.stringify(tree));
    fs.renameSync(tf + '.part', tf);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function getTree(sha) {
  if (!treeCache.has(sha)) treeCache.set(sha, JSON.parse(fs.readFileSync(treeFile(sha), 'utf8')));
  return treeCache.get(sha);
}

// Lines of a file at a commit, 1-based array access via lines[n-1]; null if not stored.
function getLines(sha, p) {
  const h = getTree(sha)[p];
  if (!h) return null;
  if (!blobCache.has(h)) {
    if (blobCache.size > 4000) blobCache.clear();
    const a = fs.readFileSync(path.join(P.SRCSTORE, 'blobs', h + '.txt'), 'utf8').split('\n');
    if (a.length > 1 && a[a.length - 1] === '') a.pop(); // a final newline ends the last line
    blobCache.set(h, a);
  }
  return blobCache.get(h);
}

module.exports = { ensureTree, getTree, getLines };
