#!/usr/bin/env node
// harness-kit/tokens.mjs: what each helper of a session cost, so that limits get a basis of your own.
//
//   node harness-kit/tokens.mjs [--project <folder>] [<session id or its first characters>]
//       prints, for that session of the project (default: the newest), each helper with its description, model,
//       messages and tokens, then the session's own figure and the sum.
//   node harness-kit/tokens.mjs [--project <folder>] --basis "<what was measured>" <agent id or its first characters>
//       adds that helper's figure to <project>/.harness/basis.json as { id: "own-NNNN", status: "measured", date, claim }.
//       The fan-out gate in kit mode accepts that id as the basis of a limit:
//       token limit 3 M (expected about 2 M, basis own-0001)
//
// The project defaults to the current folder. Tokens are counted as the fan-out gate counts them
// (.claude/hooks/fanout-gate.mjs): input + cache creation + cache read + output, once per message id (a message seen in
// two files counts once). The transcripts are where Claude Code keeps them: <config>/projects/<the project's path with
// every character other than a letter or digit made "-">/<session id>.jsonl and <session id>/subagents/agent-<id>.jsonl
// (with .meta.json beside), <config> being $CLAUDE_CONFIG_DIR or ~/.claude. Both the path as given and its real path are
// tried (/tmp is /private/tmp on macOS).
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, basename } from 'node:path';

const args = process.argv.slice(2);
function take(flag) {
  const i = args.indexOf(flag);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v == null ? '' : v;
}
const projArg = take('--project');
const basisWhat = take('--basis');
const want = (args.find((a) => !a.startsWith('--')) || '').trim();
const PROJECT = resolve(projArg || process.cwd());

const fail = (m) => { console.error('tokens: ' + m); process.exit(1); };
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + ' M' : (n / 1e3).toFixed(1) + ' K');

export function slug(p) { return String(p).replace(/[^A-Za-z0-9]/g, '-'); }
export function projectDirs(project, env = process.env) {
  let real = project;
  try { real = realpathSync.native(project); } catch {}
  const configs = [env.CLAUDE_CONFIG_DIR, join(homedir(), '.claude')].filter(Boolean);
  return [...new Set(configs.flatMap((c) => [project, real].map((p) => join(c, 'projects', slug(p)))))];
}
const readText = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
// One transcript: messages (id -> tokens, the last usage of that id in the file) and the most used model.
export function readTranscript(path) {
  const msgs = new Map(), models = new Map();
  for (const l of readText(path).split('\n')) {
    if (!l.startsWith('{') || !l.includes('"assistant"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const m = o && o.type === 'assistant' && o.message;
    if (!m || !m.usage || !m.id) continue;
    const u = m.usage;
    msgs.set(m.id, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0));
    if (m.model && m.model !== '<synthetic>') models.set(m.model, (models.get(m.model) || 0) + 1);
  }
  const model = [...models.entries()].sort((a, b) => b[1] - a[1])[0];
  return { msgs, model: model ? model[0] : '' };
}
// Sums once per message id across files, in the order given (the session first, then its helpers).
export function session(dir, file) {
  const seen = new Set();
  const count = (t) => { let n = 0, k = 0; for (const [id, v] of t.msgs) { if (seen.has(id)) continue; seen.add(id); n += v; k++; } return { tokens: n, messages: k }; };
  const own = readTranscript(join(dir, file));
  const out = { id: file.replace(/\.jsonl$/, ''), own: { ...count(own), model: own.model }, helpers: [] };
  const sub = join(dir, out.id, 'subagents');
  let names = []; try { names = readdirSync(sub).filter((n) => /^agent-.+\.jsonl$/.test(n)); } catch {}
  const metas = names.map((n) => {
    const id = n.replace(/^agent-/, '').replace(/\.jsonl$/, '');
    let meta = {}; try { meta = JSON.parse(readText(join(sub, `agent-${id}.meta.json`)) || '{}'); } catch {}
    let t = 0; try { t = statSync(join(sub, n)).mtimeMs; } catch {}
    return { id, n, meta, t };
  }).sort((a, b) => a.t - b.t);
  for (const { id, n, meta } of metas) {
    const tr = readTranscript(join(sub, n));
    out.helpers.push({ id, description: String(meta.description || ''), model: tr.model || String(meta.model || ''),
      parent: meta.parentAgentId ? String(meta.parentAgentId).replace(/^agent-/, '') : null, depth: meta.spawnDepth || 1, ...count(tr) });
  }
  out.total = out.own.tokens + out.helpers.reduce((a, h) => a + h.tokens, 0);
  return out;
}

function main() {
  const dirs = projectDirs(PROJECT).filter((d) => existsSync(d));
  if (!dirs.length) fail(`no transcripts for ${PROJECT}; looked in ${projectDirs(PROJECT).join(' and ')}`);
  const files = dirs.flatMap((d) => readdirSync(d).filter((n) => n.endsWith('.jsonl')).map((n) => ({ d, n, t: statSync(join(d, n)).mtimeMs })));

  if (basisWhat != null) {
    if (!basisWhat.trim() || !want) fail('usage: node harness-kit/tokens.mjs [--project <folder>] --basis "<what was measured>" <agent id>');
    const aid = want.replace(/^agent-/, '');
    const hits = [];
    for (const { d, n } of files) {
      const s = n.replace(/\.jsonl$/, '');
      let names = []; try { names = readdirSync(join(d, s, 'subagents')); } catch {}
      for (const x of names) if (x.startsWith('agent-' + aid) && x.endsWith('.jsonl')) hits.push({ d, n, id: x.replace(/^agent-/, '').replace(/\.jsonl$/, '') });
    }
    if (hits.length !== 1) fail(hits.length ? `${aid} names ${hits.length} helpers (${hits.map((h) => h.id).join(', ')}); give more characters` : `no helper ${aid} in the sessions of ${PROJECT}`);
    const s = session(hits[0].d, hits[0].n);
    const h = s.helpers.find((x) => x.id === hits[0].id);
    const file = join(PROJECT, '.harness', 'basis.json');
    let list = [];
    if (existsSync(file)) { try { list = JSON.parse(readText(file)); } catch { fail(`${file} is not JSON; fix it first`); } }
    if (!Array.isArray(list)) fail(`${file} does not hold a list`);
    const next = 1 + list.reduce((m, e) => { const k = /^own-(\d{4})$/.exec((e && e.id) || ''); return k ? Math.max(m, +k[1]) : m; }, 0);
    const d = new Date();
    const entry = {
      id: 'own-' + String(next).padStart(4, '0'), status: 'measured',
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      claim: `${basisWhat.trim()}: ${h.tokens.toLocaleString('en-US')} tokens (${fmt(h.tokens)}), ${h.messages} messages on ${h.model || 'an unknown model'}; helper "${h.description}", agent ${h.id}, session ${s.id.slice(0, 8)}; counted as the fan-out gate counts`,
    };
    list.push(entry);
    mkdirSync(join(PROJECT, '.harness'), { recursive: true });
    writeFileSync(file + '.tmp', JSON.stringify(list, null, 1) + '\n');
    renameSync(file + '.tmp', file);
    console.log(`added ${entry.id} to ${file}:\n  ${entry.claim}\nA limit on similar work: token limit ${fmt(Math.ceil(h.tokens * 1.5 / 1e5) * 1e5)} (expected about ${fmt(h.tokens)}, basis ${entry.id})`);
    return;
  }

  const pick = want ? files.filter((f) => f.n.startsWith(want)) : files.sort((a, b) => b.t - a.t).slice(0, 1);
  if (!pick.length) fail(`no session ${want || ''} among the transcripts of ${PROJECT}`);
  if (pick.length > 1) fail(`${want} names ${pick.length} sessions (${pick.map((f) => f.n.slice(0, 12)).join(', ')}); give more characters`);
  const s = session(pick[0].d, pick[0].n);
  console.log(`session ${s.id} (${PROJECT})`);
  const rows = s.helpers.map((h) => [h.id.slice(0, 17), (h.depth > 1 ? '  '.repeat(h.depth - 1) : '') + h.description.slice(0, 60), h.model, String(h.messages), fmt(h.tokens)]);
  rows.push(['(the session)', 'its own messages', s.own.model, String(s.own.messages), fmt(s.own.tokens)]);
  rows.push(['', 'sum', '', '', fmt(s.total)]);
  const head = ['helper', 'description', 'model', 'messages', 'tokens'];
  const w = head.map((x, i) => Math.max(x.length, ...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => (i >= 3 ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
  console.log('Tokens: input + cache creation + cache read + output, once per message id (as the fan-out gate counts).');
  console.log('Add a helper as a basis of your own: node harness-kit/tokens.mjs --basis "<what it did>" <helper id>');
}
if (process.argv[1] && basename(process.argv[1]) === 'tokens.mjs') main();
