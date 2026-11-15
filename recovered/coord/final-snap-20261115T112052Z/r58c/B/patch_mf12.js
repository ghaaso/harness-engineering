// agent B, r58c: MF-12 alignment of write_result's ruling-91 reader with HANDOFF-FORMAT v2 rev 1b section 1 item 10
// ({<variant name>: {"pool": n, "unrestricted": n}}). Run: node r58c/B/patch_mf12.js (from LANE).
const fs = require('fs');
const P = 'train/write_result.py';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b) { if (s.split(a).length !== 2) throw new Error('not exactly once: ' + a.slice(0, 80)); s = s.replace(a, () => b); }
rep(`def absent_counts(path):
    """Ruling 91: {variant label: tasks absent} from a hand-off file (None when the file or the key is absent)."""
    H = load(path) if path else None
    v = (H or {}).get(ABSENT_KEY)
    return v if isinstance(v, dict) else None


def absent_cell(AB, names):
    """The ruling-91 cell of a table row: per name, its counts (per seed s1/s2/s3 when the hand-off lists seeds)."""
    if AB is None: return 'n/a'
    out = []
    for n in names:
        ks = sorted(k for k in AB if k == n or k == n + '_mean' or re.match(re.escape(n) + r'_s\\d+$', k))
        out.append('/'.join(str(AB[k]) for k in ks) if ks else '-')
    return ' ; '.join(out)`,
`def absent_ok(v):
    """HANDOFF-FORMAT v2 rev 1 item 10: {<variant name>: {"pool": n, "unrestricted": n}}, n a non-negative integer."""
    cnt = lambda n: isinstance(n, int) and not isinstance(n, bool) and n >= 0
    return isinstance(v, dict) and bool(v) and all(isinstance(k, str) and isinstance(c, dict) and set(c) == set(SCOPES)
                                                    and all(cnt(c[x]) for x in SCOPES) for k, c in v.items())


def absent_counts(path):
    """Ruling 91: the hand-off's absent_tasks (None when the file or the key is absent, or not in the format's shape)."""
    H = load(path) if path else None
    v = (H or {}).get(ABSENT_KEY)
    return v if absent_ok(v) else None


def absent_cell(AB, names):
    """The ruling-91 cell of a table row: per name, pool/unrestricted counts, one per seed (s1, s2, s3) when the hand-off
    lists seeds; a seed-mean row (<name>_mean) shows its seeds' counts."""
    if AB is None: return 'n/a'
    out = []
    for n in names:
        b = n[:-len('_mean')] if n.endswith('_mean') else n
        ks = sorted(k for k in AB if k == n or k == b or re.match(re.escape(b) + r'_s\\d+$', k))
        out.append(', '.join('%d/%d' % (AB[k]['pool'], AB[k]['unrestricted']) for k in ks) if ks else '-')
    return ' ; '.join(out)`);
rep(`counts per seed (s1/s2/s3) from the hand-off\\'s %s.`, `counts pool/unrestricted, per seed s1, s2, s3, from the hand-off\\'s %s.`);
rep(`| tasks absent (ruling 91) |', '|---' * 11`, `| tasks absent pool/unrestricted (ruling 91) |', '|---' * 11`);
rep(`'file recall within 8,000 tokens, lane-computed | minus RRF [95 %] | tasks absent (ruling 91) |'`,
    `'file recall within 8,000 tokens, lane-computed | minus RRF [95 %] | tasks absent pool/unrestricted (ruling 91) |'`);
rep(`'the tuning hand-off %s has no %s (ruling 91)'`, `'the tuning hand-off %s has no %s in the format\\'s shape (ruling 91)'`);
rep(`'the held-out HANDOFF.json has no %s (ruling 91)'`, `'the held-out HANDOFF.json has no %s in the format\\'s shape (ruling 91)'`);
fs.writeFileSync(P, s);

// the test: fixtures in the format's shape, the cells that follow, and a check that fails on r58c/B/pre-mf12 bytes
const T = 'train/r58/tests/test_write_result.py';
let t = fs.readFileSync(T, 'utf8');
function rept(a, b) { if (t.split(a).length !== 2) throw new Error('test: not exactly once: ' + a.slice(0, 80)); t = t.replace(a, () => b); }
rept(`ABS = {'%s_%s_s%d' % (a, k, s): (2 if k == 'alone' and a == 'E5' else 0) for a in EMB + ('PLACEBO',) for k in wr.KINDS for s in (1, 2, 3)}
ABS.update(RRF=0, PPR=0, DIR=0, CO=3)`,
`PU = lambda p, u: dict(pool=p, unrestricted=u)  # HANDOFF-FORMAT v2 rev 1 item 10
ABS = {'%s_%s_s%d' % (a, k, s): (PU(2, 1) if k == 'alone' and a == 'E5' else PU(0, 0)) for a in EMB + ('PLACEBO',) for k in wr.KINDS for s in (1, 2, 3)}
ABS.update(RRF=PU(0, 0), PPR=PU(0, 0), DIR=PU(0, 0), CO=PU(3, 2))`);
rept(`wr.ABSENT_KEY: {v: (1 if v == 'CO' else 0) for v in wr.ho_variants(rec['chosen']['arm']) if not v.endswith('_mean')}}`,
     `wr.ABSENT_KEY: {v: (PU(1, 1) if v == 'CO' else PU(0, 0)) for v in wr.ho_variants(rec['chosen']['arm']) if not v.endswith('_mean')}}`);
rept(`check('r91_absent_counts_beside_figures', '| tasks absent (ruling 91) |' in md and any(l.startswith('| E5 |') and l.rstrip().endswith('| 2/2/2 ; 0/0/0 |') for l in md.splitlines())
      and any(l.startswith('| CO |') and l.rstrip().endswith('| 3 |') for l in md.splitlines() if '0.' in l)
      and any(l.startswith('| CO | ') and l.rstrip().endswith('| 1 |') for l in md.splitlines() if l.count('|') > 10),`,
`check('r91_absent_counts_beside_figures', '| tasks absent pool/unrestricted (ruling 91) |' in md
      and any(l.startswith('| E5 |') and l.rstrip().endswith('| 2/1, 2/1, 2/1 ; 0/0, 0/0, 0/0 |') for l in md.splitlines())
      and any(l.startswith('| CO |') and l.rstrip().endswith('| 3/2 |') for l in md.splitlines() if '0.' in l)
      and any(l.startswith('| CO | ') and l.rstrip().endswith('| 1/1 |') for l in md.splitlines() if l.count('|') > 10),`);
rept(`check('mf12_item24_grader_table',`,
`# MF-12 (format rev 1 item 10): the reader takes {variant: {pool, unrestricted}} and refuses any other shape;
# the r58c/B/pre-mf12 bytes printed the dicts raw and accepted scalar counts.
PM = load_module('write_result_pre_mf12', os.path.join(ROOT, 'r58c', 'B', 'pre-mf12', 'write_result.py'))
SCAL = {'CO': 3, 'E5_alone_s1': 2}
BADS = [SCAL, {'CO': PU(1, -1)}, {'CO': dict(pool=1)}, {'CO': dict(pool=True, unrestricted=0)}, {}, [PU(0, 0)]]
def mf12_ok(m):
    cell = m.absent_cell(ABS, ['E5_alone', 'E5_fused']); mean = m.absent_cell(ABS, ['E5_alone_mean'])
    rd = fresh(os.path.join(D, 'mf12_' + m.__name__)); res = []
    for i, v in enumerate(BADS):
        p = os.path.join(rd, '%d.json' % i); json.dump({m.ABSENT_KEY: v}, open(p, 'w')); res.append(m.absent_counts(p))
    return (cell == '2/1, 2/1, 2/1 ; 0/0, 0/0, 0/0' and mean == '2/1, 2/1, 2/1' and all(r is None for r in res)), (cell, mean, res)
ok_new, ev_new = mf12_ok(wr); ok_pre, ev_pre = mf12_ok(PM)
check('mf12_absent_shape_pass_after', ok_new, ev_new)
check('mf12_absent_shape_fail_before', not ok_pre, ev_pre)
check('mf12_item24_grader_table',`);
// the real-run refusal of a scalar-shaped key (exit 10 path): a case beside the r91 ones
rept(`cases['r91_heldout_handoff'] = bad_case(a=dict(ar, handoff=HO_T.replace('HANDOFF.json', 'no91.json')))`,
`cases['r91_heldout_handoff'] = bad_case(a=dict(ar, handoff=HO_T.replace('HANDOFF.json', 'no91.json')))
SC91 = os.path.join(os.path.dirname(HO_T), 'scalar91.json'); json.dump({'split': 'heldout', wr.ABSENT_KEY: SCAL}, open(SC91, 'w'))
cases['mf12_scalar_heldout_handoff'] = bad_case(a=dict(ar, handoff=SC91))`);
fs.writeFileSync(T, t);
console.log('patched', P, T);
