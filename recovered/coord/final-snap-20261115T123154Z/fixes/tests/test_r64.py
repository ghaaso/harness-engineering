"""Unit test, ruling 64 (exact tie for the best mean), fixed numbers only; no task, score or truth is read.
usage: python tests/test_r64.py <post|pre3>   pre3 = selectB.py before rulings 63-66 (fixes/pre_m3/selectB.py, by path)
Candidates (values are exact binary fractions, so the tie is exact):
  c02 d200  per-commit [0.5, 0.75]   mean 0.625  SE 0.125
  c03 d200  per-commit [0.375, 0.875] mean 0.625  SE 0.25   (tied with c02 for the best mean, larger SE)
  c01 d100  per-commit [0.45, 0.45]  mean 0.45   SE 0
Ruling 64: band from 0.625 with SE 0.25 -> >= 0.375 -> c01 is in -> ruling 53 picks the smallest model, c01.
Measured from c02's SE (0.125) the band would be >= 0.5 and the pick c02. The test runs choose() and choose_builder()
on all six orders of the three candidates and asserts one choice per function, equal to c01 for choose().
Prints one line per function and RESULT PASS|FAIL."""
import os, sys, json, itertools, importlib.util
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'eval')]
VAR = sys.argv[1] if len(sys.argv) > 1 else 'post'
if VAR == 'pre3':
    spec = importlib.util.spec_from_file_location('selectB_pre3', os.path.join(ROOT, 'fixes', 'pre_m3', 'selectB.py'))
    sel = importlib.util.module_from_spec(spec); spec.loader.exec_module(sel)
else:
    import selectB as sel
rows = [(('c02', 0.5), {'embedding_dim': 200}, 0.5, [0.5, 0.75]),
        (('c03', 0.5), {'embedding_dim': 200}, 0.5, [0.375, 0.875]),
        (('c01', 0.5), {'embedding_dim': 100}, 0.5, [0.45, 0.45])]
ok = {}
for name in ('choose', 'choose_builder'):
    fn = getattr(sel, name)
    picks = {}
    for perm in itertools.permutations(range(3)):
        p = fn([rows[i] for i in perm])[0]
        picks['-'.join(rows[i][0][0] for i in perm)] = '%s w%g' % (p['key'][0], p['w'])
    distinct = sorted(set(picks.values()))
    ok[name] = len(distinct) == 1 and (name != 'choose' or distinct == ['c01 w0.5'])
    print('r64 %s picks by order %s distinct %s %s' % (name, json.dumps(picks), distinct, 'ok' if ok[name] else 'VIOLATED'), flush=True)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_r64', VAR, json.dumps(ok), flush=True)
