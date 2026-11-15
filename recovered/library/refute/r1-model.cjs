// R1 refuter: the upper-bound arithmetic with repeat shares measured here (run level), not read-character shares.
// gross = rh * [ e*(1 - kp/mt) + (F+OL)*(1-e)*(1-af) ];  pull cost measured directly (one extra call per run).
const shapes = {
  clinic: { e: 0.444, mt: 11.1, F: 0.27, OL: 0.09, af: 0.04, pull: 0.158, rhQ: 0.199, rhD: 0.379 },
  fixflow: { e: 0.557, mt: 21.1, F: 0.23, OL: 0.09, af: 0.04, pull: 0.109, rhQ: 0.120, rhD: 0.193 },
};
const g = (p, rh, kp) => rh * (p.e * (1 - kp / p.mt) + (p.F + p.OL) * (1 - p.e) * (1 - p.af));
const f = x => (100 * x).toFixed(1) + '%';
for (const [k, p] of Object.entries(shapes)) {
  console.log(k,
    '| design rh 0.217, pull: gross', f(g(p, 0.217, 0)), 'net', f(g(p, 0.217, 0) - p.pull),
    '| push at rh 0.217', f(g(p, 0.217, 1)),
    '| question oracle (rh', p.rhQ + ')', f(g(p, p.rhQ, 0)), 'push', f(g(p, p.rhQ, 1)),
    '| digest oracle, whole runs skipped (rh', p.rhD + ')', f(g(p, p.rhD, 0)),
    '| APC rate 0.46 push', f(g(p, 0.46, 1)),
    '| rh for 50 %:', (0.5 / g(p, 1, 0)).toFixed(2), '(push', (0.5 / g(p, 1, 1)).toFixed(2) + ')');
}
// digest, content only: file-read carry x share on files read before x (1 - digest ratio 0.1)
console.log('digest content-only: clinic', f(0.134 * 0.782 * 0.9), 'fixflow', f(0.089 * 0.534 * 0.9), '| with fact-base fetched share F x 0.75 x 0.9:', f(0.27 * 0.75 * 0.9));
