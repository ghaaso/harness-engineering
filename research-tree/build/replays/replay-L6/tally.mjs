// tally.mjs: score the reviewer verdicts of replay-L6 against key.json (SCORING.md "Unit, hit, miss"), and count the
// reviewers' tokens from their transcripts. Usage: node tally.mjs  -> prints and writes tally-out.txt, tally.json.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const { cases } = JSON.parse(fs.readFileSync(path.join(HERE, 'key.json'), 'utf8'));
const VD = path.join(HERE, 'verdicts');
const read = (id, arm) => { try { return JSON.parse(fs.readFileSync(path.join(VD, `${id}-${arm}.json`), 'utf8')); } catch { return null; } };

// reviewer tokens: helper transcripts of the harness repo sessions whose description has "replay-L6 c<NN>-<arm>"
const ROOT = 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const tok = {};
for (const s of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!s.isDirectory()) continue;
  const dir = path.join(ROOT, s.name, 'subagents');
  let names; try { names = fs.readdirSync(dir); } catch { continue; }
  for (const n of names) {
    if (!n.endsWith('.meta.json')) continue;
    let meta; try { meta = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch { continue; }
    const m = String(meta.description || '').match(/replay-L6 (c\d\d-[AB])/);
    if (!m) continue;
    const seen = new Set(); let t = 0, calls = 0;
    const txt = fs.readFileSync(path.join(dir, n.replace(/\.meta\.json$/, '.jsonl')), 'utf8');
    for (const line of txt.split('\n')) {
      if (!line) continue; let o; try { o = JSON.parse(line); } catch { continue; }
      const u = o.message && o.message.usage; if (o.type !== 'assistant' || !u) continue;
      const id = o.message.id; if (seen.has(id)) continue; seen.add(id); calls++;
      t += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
    }
    tok[m[1]] = { tokens: t, calls };
  }
}

const rows = [];
for (const c of cases) {
  const a = read(c.id, 'A'), b = read(c.id, 'B');
  if (!a || !b) continue; // paired only
  const f = (v, th) => v.verdict === 'OVERSTATED' && (th ? (v.confidence ?? 0) >= th : true);
  rows.push({ id: c.id, cls: c.cls, v2src: c.v2src, finding: c.finding, A: a.verdict, Ac: a.confidence, B: b.verdict, Bc: b.confidence,
    fA: f(a), fB: f(b), fA70: f(a, 70), fB70: f(b, 70) });
}
const out = [];
const block = (label, sel) => {
  for (const cls of ['overstated', 'accurate']) {
    const r = rows.filter((x) => x.cls === cls && sel(x)); const n = r.length; if (!n) continue;
    for (const suf of ['', '70']) {
      const A = r.filter((x) => x['fA' + suf]).length, B = r.filter((x) => x['fB' + suf]).length;
      const bOnly = r.filter((x) => x['fB' + suf] && !x['fA' + suf]).length, aOnly = r.filter((x) => x['fA' + suf] && !x['fB' + suf]).length;
      out.push(`${label} | ${cls} | n ${n} | conf>=${suf || 'any'} | flagged A ${A}/${n} (${(100 * A / n).toFixed(1)} %) | B ${B}/${n} (${(100 * B / n).toFixed(1)} %) | B-only ${bOnly} | A-only ${aOnly}`);
    }
    const ctA = r.filter((x) => x.A === 'CANNOT_TELL').length, ctB = r.filter((x) => x.B === 'CANNOT_TELL').length;
    out.push(`${label} | ${cls} | CANNOT_TELL A ${ctA}, B ${ctB}`);
  }
};
block('pooled', () => true);
block('v2 source a', (x) => x.v2src === 'a');
block('v2 source b', (x) => x.v2src === 'b');
const arm = (k) => { const v = Object.entries(tok).filter(([id]) => id.endsWith('-' + k)).map(([, x]) => x); const s = v.reduce((p, x) => p + x.tokens, 0); return `${k}: ${v.length} reviewers, ${s} tokens, mean ${v.length ? Math.round(s / v.length) : 0}, calls ${v.reduce((p, x) => p + x.calls, 0)}`; };
out.push('reviewer tokens ' + arm('A') + ' | ' + arm('B'));
out.push('reviewer tokens total ' + Object.values(tok).reduce((p, x) => p + x.tokens, 0));
fs.writeFileSync(path.join(HERE, 'tally-out.txt'), out.join('\n') + '\n');
fs.writeFileSync(path.join(HERE, 'tally.json'), JSON.stringify({ rows, tok }, null, 1));
console.log(out.join('\n'));
