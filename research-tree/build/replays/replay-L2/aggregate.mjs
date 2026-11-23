// replay-L2 aggregation over raw/scan-*.jsonl. Usage: node aggregate.mjs > raw/aggregate.txt
import fs from 'node:fs';
import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const R = [];
for (const f of fs.readdirSync(path.join(D, 'raw'))) if (/^scan-\d+\.jsonl$/.test(f))
  for (const l of fs.readFileSync(path.join(D, 'raw', f), 'utf8').split('\n')) if (l) R.push(JSON.parse(l));
const k = x => (x / 1e6).toFixed(1) + 'M', pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const fam = n => n.startsWith('mcp__') ? n.split('__').slice(0, 2).join('__') : n;
const out = [];
const P = s => out.push(s);

// chars-to-tokens fit: helpers of the harness project with an instructions attachment, P against component chars
const comp = r => Object.values(r.att).reduce((a, b) => a + b, 0) + r.briefChars;
const fitSet = R.filter(r => r.att.instructions && r.calls >= 1);
const hfit = fitSet.filter(r => r.role === 'helper');
let n = hfit.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
for (const r of hfit) { const x = comp(r), y = r.P; sx += x; sy += y; sxx += x * x; sxy += x * y; }
const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
P(`# fit over ${n} helper files with attachments (per-project fits unstable, see RESULT.md): P = ${a.toFixed(0)} + ${b.toFixed(4)} x component chars (chars per token ${(1 / b).toFixed(2)})`);
const cpt = 1 / b > 2 && 1 / b < 6 ? 1 / b : 3.5;
P(`# chars per token used: ${cpt.toFixed(2)}${cpt === 3.5 ? ' (fit out of range, 3.5 assumed)' : ''}`);

function agg(rows) {
  const s = { files: rows.length, calls: 0, ctx: 0, fresh: 0, all: 0, reread: 0, pfS: 0, pfL: 0, cc1: 0, cr1: 0, in1: 0, cr: 0, Ps: [], cc1h: 0, cc5m: 0 };
  for (const r of rows) {
    s.calls += r.calls; s.ctx += r.ctx; s.fresh += r.fresh; s.all += r.all; s.reread += r.P * r.calls;
    s.pfS += r.preFreshStart; s.pfL += r.preFreshLater; s.cc1 += r.firstCC; s.cr1 += r.firstCR; s.in1 += r.firstIn;
    s.cr += r.ctx - (r.fresh - r.out); s.Ps.push(r.P); s.cc1h += r.cc1h; s.cc5m += r.cc5m;
  }
  return s;
}
const head = '| group | files | calls | P median (Q1-Q3) | prefix re-read / context | prefix fresh at starts | later | prefix fresh / fresh | / all | start written / start ctx | fresh / all |';
const row = (g, s) => `| ${g} | ${s.files} | ${s.calls} | ${med(s.Ps)} (${q(s.Ps, .25)}-${q(s.Ps, .75)}) | ${pc(s.reread, s.ctx)} | ${k(s.pfS)} | ${k(s.pfL)} | ${pc(s.pfS + s.pfL, s.fresh)} | ${pc(s.pfS + s.pfL, s.all)} | ${pc(s.cc1 + s.in1, s.cc1 + s.in1 + s.cr1)} | ${pc(s.fresh, s.all)} |`;
const group = (rows, key) => { const m = new Map(); for (const r of rows) { const g = key(r); if (!m.has(g)) m.set(g, []); m.get(g).push(r); } return [...m.entries()].sort(); };

P('\n## 1. By project and role'); P(head); P('|' + '---|'.repeat(11));
for (const [g, rows] of group(R, r => r.project + ' ' + r.role)) P(row(g, agg(rows)));
for (const [g, rows] of group(R, r => r.project)) P(row(g + ' (both)', agg(rows)));
const AJ = R.filter(r => r.project !== 'other');
P(row('four projects', agg(AJ))); P(row('all incl. other', agg(R)));

P('\n## 2. By project and month (both roles)'); P(head); P('|' + '---|'.repeat(11));
for (const [g, rows] of group(R, r => r.project + ' ' + r.month)) P(row(g, agg(rows)));

P('\n## 3. Helpers by kind and model (P = context at the first call)'); P(head); P('|' + '---|'.repeat(11));
for (const [g, rows] of group(R.filter(r => r.role === 'helper'), r => r.project + ' ' + r.kind + ' ' + (r.model.match(/opus|sonnet|haiku|fable/) || ['?'])[0])) if (rows.length >= 5) P(row(g, agg(rows)));
P('\n## 3b. Sessions by model'); P(head); P('|' + '---|'.repeat(11));
for (const [g, rows] of group(R.filter(r => r.role === 'session'), r => r.project + ' ' + (r.model.match(/opus|sonnet|haiku|fable/) || ['?'])[0])) P(row(g, agg(rows)));

// components
P('\n## 4. Components of the prefix (files with attachments; tokens = chars / ' + cpt.toFixed(2) + ', medians)');
P('| group | files | P | skill listing | deferred tool names | CLAUDE.md + memory | session context | system prompt | other attachments | brief | residual (loaded tool schemas and framing) |');
P('|' + '---|'.repeat(11));
for (const [g, rows] of group(fitSet, r => r.project + ' ' + r.role)) {
  const t = x => Math.round(x / cpt);
  const col = f => med(rows.map(f));
  const oth = r => Object.entries(r.att).filter(([x]) => !['skill_listing', 'deferred_tools_delta', 'instructions', 'session_context', 'prompt_snapshot'].includes(x)).reduce((a, [, v]) => a + v, 0);
  P(`| ${g} | ${rows.length} | ${col(r => r.P)} | ${t(col(r => r.att.skill_listing || 0))} | ${t(col(r => r.att.deferred_tools_delta || 0))} | ${t(col(r => r.att.instructions || 0))} | ${t(col(r => r.att.session_context || 0))} | ${t(col(r => r.att.prompt_snapshot || 0))} | ${t(col(oth))} | ${t(col(r => r.briefChars))} | ${col(r => r.P - Math.round(comp(r) / cpt))} |`);
}

// loaded, never used
P('\n## 5. Loaded and never used (files with attachments)');
P('| group | files | skill listing loaded | no Skill call | deferred list loaded | no ToolSearch call | unused tokens per file (median) | unused re-read / context |');
P('|' + '---|'.repeat(8));
const unusedOf = r => ((r.att.skill_listing && !r.tools.Skill) ? r.att.skill_listing : 0) / cpt + ((r.att.deferred_tools_delta && !r.tools.ToolSearch) ? r.att.deferred_tools_delta : 0) / cpt;
for (const [g, rows] of group(fitSet, r => r.project + ' ' + r.role)) {
  const sl = rows.filter(r => r.att.skill_listing), dl = rows.filter(r => r.att.deferred_tools_delta);
  const ur = rows.reduce((a, r) => a + unusedOf(r) * r.calls, 0), cx = rows.reduce((a, r) => a + r.ctx, 0);
  P(`| ${g} | ${rows.length} | ${sl.length} | ${sl.filter(r => !r.tools.Skill).length} | ${dl.length} | ${dl.filter(r => !r.tools.ToolSearch).length} | ${Math.round(med(rows.map(unusedOf)))} | ${pc(ur, cx)} |`);
}
P('\nTool families called (files calling each, of files with attachments, by role):');
for (const [g, rows] of group(fitSet, r => r.role)) {
  const c = {}; for (const r of rows) for (const t of new Set(Object.keys(r.tools).map(fam))) c[t] = (c[t] || 0) + 1;
  P(`- ${g} (${rows.length} files): ` + Object.entries(c).sort((x, y) => y[1] - x[1]).map(([t, v]) => `${t} ${v}`).join(', '));
}

// ceilings
P('\n## 6. Ceiling of a lean prefix on the meter (index = fresh + 0.01 x cache reads; S17)');
P('| group | meter index | lean A: brief + 5,000 | share | lean B: unused parts removed | share | fresh saved A | cached saved A |');
P('|' + '---|'.repeat(8));
const ceil = (rows, Lf) => {
  let idx = 0, sA = 0, fA = 0, cA = 0;
  for (const r of rows) {
    const cr = r.ctx - (r.fresh - r.out); idx += r.fresh + 0.01 * cr;
    const L = Math.min(r.P, Lf(r)), cut = r.P - L, fr = r.P ? (r.preFreshStart + r.preFreshLater) * cut / r.P : 0;
    const cached = Math.max(0, cut * r.calls - fr); fA += fr; cA += cached; sA += fr + 0.01 * cached;
  }
  return { idx, sA, fA, cA };
};
for (const [g, rows] of [...group(R, r => r.project), ['four projects', AJ]]) {
  const A = ceil(rows, r => Math.round(r.briefChars / cpt) + 5000);
  const B = ceil(rows, r => r.P - unusedOf(r));
  P(`| ${g} | ${k(A.idx)} | ${k(A.sA)} | ${pc(A.sA, A.idx)} | ${k(B.sA)} | ${pc(B.sA, B.idx)} | ${k(A.fA)} | ${k(A.cA)} |`);
}
P(`\n1-hour cache writes ${k(agg(R).cc1h)}, 5-minute ${k(agg(R).cc5m)} (where the field exists).`);
console.log(out.join('\n'));
