// judged.mjs: writes judged.jsonl from the reading of each verdict head (verifiers.jsonl) and the build's refute files.
// C1 = contradicted with a P1/blocker; C2 = contradicted below P1 (a claim or fix broken, P2); OK = no P1/P2 (P3 only or holds);
// PWF = FixFlow PASS-WITH-FIXES/NOTES (done stands with minor fixes). by: how the contradiction was found.
import fs from 'node:fs';
const CL = {C1:'a7c2dd a7ae5a a08cd4 ab3282 a8ae2d a9c953 a6b394 a16997 ab22d3 a07a5e a0a470 a2aaf9 acfbd0 a11428 ab89f2 a39b70 a60c53 a0fb23 ad6e88 a498e6 a9a13d a2727a af23a7 a7c26b a3e150',
 OK:'a11a80 af3c17 ac581c a9640d a4611c a7c6b0 aa34a2 ad4f0e a97862 a9740a a00820 afa0f9 aca59b a8fd47 a22412',
 C2:'ac378f ad2554 a7591f a6d756 a40ca3 abf140 a8b3d2 ad7ed8 a655cf ac564b aa3e2b a47756 a182f7 ae6eb1 a630fe ab9a1d a470c4 ae24b9 a41af1 ab8a3b a84ce9 a3472a ab9131 a28f7b aa05e3 a92f3d a7d5e3 a41b49 a755d1 a92d73 ab93bb ae2aed a6d362 a4a7b2 abebf6 aafe61 a99f92 a3be52 aacc32 aa07ea ae3123 a9e345 a4eec8 acf6cb ab8b55 a79a77 aa757f ac92c6 a5a16c adb63a a87e4f a603df a7f29a ae7aed'};
const FF = {OK:'aff2a7 a7ad35 adee36 a1e303 a3310f a32a7c a322e0 a55ee7 adddb4 a0880e a839bb aa0237 ac5e4c a08b2c a36a7d af0ea0 a5b7f7 a5f4a2 a98010 a6b7b9 a6a959 a2f41e aa2719 a43266 a770f4 aff56a a34bae',
 PWF:'a4e054 a6215d a516f9 ac4e78 a74bdd ad89cd aad7a0 a9a736 a71481 ac2466 ad2665 ad580a ac5231 a66da7 a96409 a14691 a96031',
 C1:'a36a63 a5e923 a2b987 a48f3f aed010', C2:'a9f377'};
const byCheck = new Set(['a7f29a']); // contradiction an existing executed check (the gate's mypy step) shows
const V = fs.readFileSync('verifiers.jsonl','utf8').trim().split('\n').map(JSON.parse);
const out = [];
for (const [proj, m] of [['CL', CL], ['FF', FF]]) for (const [v, ids] of Object.entries(m)) for (const p of ids.split(' ')) {
  const r = V.find(x => x.proj === proj && x.id.startsWith(p)); if (!r) { console.error('missing', proj, p); continue; }
  out.push({ proj, level: 'gate review of a session or fix-round done', verifier: r.id, desc: r.desc, start: r.start, verdict: v, by: byCheck.has(p) ? 'existing executed check' : 'reading or new probe', head: r.head.slice(0, 160) });
}
const H = [['P0','C1','probes on copies (refute/P0-GATE.md:6)'],['GATE','C1','probes in fixtures (refute/P0-GATE.md:6)'],['S0.3','OK',''],['S0.4','OK',''],
 ['S0.5 first','C2','refuter mutations, fix round (STATE.md:669,705,716)'],['S0.5 fix','OK',''],['S0.6','OK',''],['CGATE','OK',''],['CLAIM','OK',''],['OUT','OK',''],['PLAN','OK',''],
 ['W1','OK',''],['W2','OK',''],['W3','C1','landed test of REDO fails on the unit (refute/W3.md:1)'],['W4','OK',''],['W5','C1','own test fails at the merge with build (refute/W5.md:1)'],
 ['W6','C1','model check, old code fails the new test (STATE.md:48)'],['W6-fix','OK',''],['W7','OK',''],['S2.1','C2','mutation survives the unit tests (refute/S2.1.md:1)']];
for (const [u, v, by] of H) out.push({ proj: 'H', level: 'build unit result.md, blind refuter', unit: u, verdict: v, backed: true, by });
fs.writeFileSync('judged.jsonl', out.map(o => JSON.stringify(o)).join('\n') + '\n');
const t = {}; for (const o of out) { const k = o.proj + ' ' + o.verdict; t[k] = (t[k] || 0) + 1; } console.log(JSON.stringify(t));
