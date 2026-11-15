// R9 refuter: read-only git checks on main.
// (1) fix commits on main, date span; (2) the five same-cause pairs: dates, gap,
// files, whether each side ships a guard (test / CI / dependabot / lint config);
// (3) a crude "strict write rule" signal per fix commit body (escalation, failed
// approaches, burned build, prod incident) to estimate how many entries a strict
// rule would create, and whether each pair's FIRST commit would be recorded.
// Usage: node R9-git.cjs <repo>
const { execFileSync } = require("child_process");
const repo = process.argv[2];
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const SEP = "\u001e";
const raw = git("log", "main", "--no-merges", `--format=${SEP}%H%x09%ad%x09%s%x09%b`, "--date=iso-strict").split(SEP).filter(Boolean);
const all = raw.map(r => { const [h, d, s, ...b] = r.split("\t"); return { h, d, s, b: b.join("\t") }; });
const fixes = all.filter(c => /^(@ )?fix\b/i.test(c.s));
const isTest = p => /(^|\/)tests?\//.test(p) || /\.test\.(ts|tsx|js|jsx|mjs)$/.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /__tests__\//.test(p);
const isCfg = p => /^\.github\/(workflows\/|dependabot)/.test(p) || /(^|\/)(eslint\.config[^/]*|\.eslintrc[^/]*|pyproject\.toml|mypy\.ini|tsconfig[^/]*\.json)$/.test(p);
const files = h => git("show", "--name-only", "--format=", h).trim().split("\n").filter(Boolean);
// Strict-rule signal: words that show escalation, failed attempts, burned build, prod incident.
const strictRe = /(build (\d+ )?failed|failed at|EAS_BUILD|burn|prod(uction)?\b[^.\n]{0,40}(500|down|outage|incident|broke|failing)|outage|incident|regress|tried|attempt|did not work|didn't work|all failed|still (fail|throw|crash)|root cause|second time|again|re-?drift|reintroduc|the same (bug|race|gap|class))/i;
const rows = fixes.map(c => {
  const fs_ = files(c.h);
  return { h: c.h.slice(0, 7), d: c.d.slice(0, 16), s: c.s.slice(0, 70), test: fs_.some(isTest), cfg: fs_.some(isCfg), strict: strictRe.test(c.s + "\n" + c.b), trailer: (c.b.match(/Co-Authored-By: Claude ([A-Za-z]+ [0-9.]+)/i) || [])[1] || "" };
});
const pairs = [["75b51f9", "981ae08", "mypy re-export"], ["2f09cec", "f29f62f", "NoReferencedTableError"], ["789d522", "0a3b38e", "press race"], ["b7a5b98", "6928828", "SDK-52 pins"], ["dbb3661", "d440855", "expo-audio stop"]];
const find = p => all.find(c => c.h.startsWith(p));
const pairRows = pairs.map(([a, b, n]) => {
  const A = find(a), B = find(b);
  const fa = A ? files(A.h) : [], fb = B ? files(B.h) : [];
  const gapH = A && B ? (Date.parse(B.d) - Date.parse(A.d)) / 36e5 : null;
  return { n, a, b, aOnMain: !!A, bOnMain: !!B, aDate: A && A.d.slice(0, 16), bDate: B && B.d.slice(0, 16), gapHours: gapH && +gapH.toFixed(1),
    aGuard: { test: fa.some(isTest), cfg: fa.some(isCfg) }, bGuard: { test: fb.some(isTest), cfg: fb.some(isCfg) },
    aStrictSignal: A ? strictRe.test(A.s + "\n" + A.b) : null, aIsFixSubject: A ? /^(@ )?fix\b/i.test(A.s) : null };
});
const first = all[all.length - 1].d, last = all[0].d;
const nStrict = rows.filter(r => r.strict).length;
const out = {
  mainNonMerge: all.length, mainSpan: [first.slice(0, 10), last.slice(0, 10)], spanDays: +((Date.parse(last) - Date.parse(first)) / 864e5).toFixed(1),
  fixCommits: fixes.length, fixWithTest: rows.filter(r => r.test).length, fixWithCfg: rows.filter(r => r.cfg).length,
  fixStrictSignal: nStrict,
  trailers: rows.reduce((m, r) => (m[r.trailer || "none"] = (m[r.trailer || "none"] || 0) + 1, m), {}),
  pairs: pairRows,
  usesPerEntry: {
    everyFixRecorded: { entries: fixes.length, uses3: +(3 / fixes.length).toFixed(3), uses5: +(5 / fixes.length).toFixed(3), verified1: +(1 / fixes.length).toFixed(3), verified2: +(2 / fixes.length).toFixed(3) },
    strictSignalRecorded: { entries: nStrict, firstsRecorded: pairRows.filter(p => p.aStrictSignal).length },
  },
  strictRows: rows.filter(r => r.strict).map(r => `${r.h} ${r.d} ${r.s}`),
};
console.log(JSON.stringify(out, null, 1));
