// node:sqlite FTS5 bm25(); usage: node bm25.mjs <datadir>
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const STOP = new Set("the and for with that this from into when then than are was were has have had not but can all any use used using should would could its it's they them their there here which what where while also more most only such some will need needs make makes made get gets new add adds added fix fixes fixed update updates remove removes instead been being does did one two".split(' '));
export function camel(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2'); }
export function terms(text, cap = 40) {
  const out = [];
  for (const w0 of camel(text).match(/[A-Za-z0-9]+/g) ?? []) {
    const w = w0.toLowerCase();
    if (w.length >= 3 && !STOP.has(w) && !out.includes(w)) out.push(w);
  }
  return out.slice(0, cap);
}
export function run(dir) {
  const rd = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const files = rd('files.jsonl'), qs = rd('queries.jsonl');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE VIRTUAL TABLE docs USING fts5(path UNINDEXED, body)');
  const ins = db.prepare('INSERT INTO docs(path, body) VALUES (?, ?)');
  db.exec('BEGIN');
  for (const f of files) ins.run(f.path, camel(f.path + '\n' + f.text));
  db.exec('COMMIT');
  const sel = db.prepare('SELECT path, bm25(docs) AS s FROM docs WHERE docs MATCH ? ORDER BY s LIMIT 5000');
  const lines = [];
  for (const q of qs) {
    const ts = terms(q.query);
    const scores = [];
    if (ts.length) for (const r of sel.all(ts.map(t => `"${t}"`).join(' OR '))) scores.push([r.path, -r.s]);
    lines.push(JSON.stringify({ qid: q.qid, scores }));
  }
  fs.writeFileSync(`${dir}/rank_bm25.jsonl`, lines.join('\n') + '\n');
}
if (process.argv[1] && process.argv[1].endsWith('bm25.mjs') && process.argv[2]) run(process.argv[2]);
