"""Agent B, round 3: the harness's TEST tune.json against the grader's TEST tune-rank.json, row by row, for the rows the
return carries (ruling 88b's 1e-9 rule, as write_result.check_tune_rank compares them: per seed and seed mean from
arms.late50, comparators from comparators.late50; both scopes; four metrics). Also lists the rows write_result's
TUNE_ROWS expects that the return does not carry. usage: python compare_rank.py <tune.json> <tune-rank.json>
Prints RESULT PASS|FAIL compare-rank."""
import json, sys
sys.path.insert(0, '/w/train')
import write_result as wr
T = json.load(open(sys.argv[1])); TR = json.load(open(sys.argv[2])); rk = TR['rank']
A = T['arms']['late50']; CM = T['comparators']['late50']; diff = 0.0; n = 0; bad = []
for v in sorted(rk):
    for sc in wr.SCOPES:
        for m in wr.METRICS:
            if v in wr.COMPS: lane = (CM.get(sc, {}).get(v) or {}).get(m)
            else:
                base, s = v.rsplit('_', 1); d = A.get(sc, {}).get(base) or {}
                lane = (d.get('seed_mean') or {}).get(m) if s == 'mean' else ((d.get('per_seed') or {}).get(s[1:]) or {}).get(m)
            if not isinstance(lane, (int, float)): bad.append('no %s %s %s' % (v, sc, m)); continue
            diff = max(diff, abs(lane - rk[v][sc][m])); n += 1
print('rows in the return', len(rk), sorted(rk))
print('cells compared', n, 'largest difference %.3g' % diff, 'missing', bad[:5])
print('TUNE_ROWS rows the return does not carry: %d of %d (e.g. %s)' % (len(set(wr.TUNE_ROWS) - set(rk)), len(wr.TUNE_ROWS), sorted(set(wr.TUNE_ROWS) - set(rk))[:4]))
print('tasks %s commits %s (return) vs tasks %s sets %s (tune.json)' % (TR['tasks'], TR['commits'], T['tasks'], T['sets']))
ok = not bad and n == len(rk) * 8 and diff <= 1e-9 and TR['tasks'] == T['tasks'] and TR['commits'] == T['sets']['late50']
print('RESULT %s compare-rank' % ('PASS' if ok else 'FAIL')); sys.exit(0 if ok else 1)
