"""Plumbing test, ruling 55 (E5 scoring at stage B), tuning data only. The stage-A E5 model (stageA/E5/c01/reps.pt,
trained at cd806c80 on the 90 % split) scores the tune tasks whose parent is cd806c80 (pool and unrestricted
candidates) through kge.score. Checked from the reps file itself, per scored (task, candidate):
  - the candidate's entity is known to at least one routed specialist that has the co_changed relation, OR it is
    absent from the whole checkpoint graph (the union of the specialists' known sets) -- otherwise it was folded
    in for a specialist that does not know it, which ruling 55 forbids;
  - the same for each scored seed;
  - the counts keep the two unscored cases apart (keys cands_unscored_absent_at_C and
    cands_unscored_not_in_routed_specialists summing to cands_unscored) and count folds per candidate.
No metric is computed. Prints RESULT PASS|FAIL."""
import os, sys, json, gzip, collections
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import torch, kge

P = kge.STAGEA_SHA
RP = os.path.join(ROOT, 'train', 'stageA', 'E5', 'c01', 'reps.pt')
reps = torch.load(RP, weights_only=False)
spec_known = {A: set(sd['known']) for A, sd in reps['specialists'].items()}
has_co = {A for A, sd in reps['specialists'].items() if sd['rco'] is not None}
at_C = set().union(*spec_known.values())
entsP, triP = kge.read_graph(P); nbP = kge.neighbours(triP)
tasks = [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]
tasks = [t for t in tasks if t['parent'] == P]
cands = {}
for sc in ('pool', 'unrestricted'):
    d = collections.defaultdict(list)
    with gzip.open(os.path.join(ROOT, 'eval', 'comparators', 'candidates_%s.tsv.gz' % sc), 'rt') as f:
        next(f)
        for l in f:
            tid, c, _ = l.rstrip('\n').split('\t'); d[tid].append(c)
    cands[sc] = d
viol = collections.Counter(); scored = collections.Counter(); keys_ok = True; allcnt = {}
for sc in ('pool', 'unrestricted'):
    rows = [(t['task_id'], t['seed'], cands[sc].get(t['task_id'], [])) for t in tasks]
    table, cnt = kge.score(RP, rows, P)
    allcnt[sc] = cnt
    for t in tasks:
        s = 'file:' + t['seed']
        routed = [A for A in kge.route(s, entsP, nbP) if A in has_co]
        tb = table.get(t['task_id'], {})
        if tb and not (any(s in spec_known[A] for A in routed) or s not in at_C): viol['seed_folded_for_specialist_' + sc] += 1
        for c in tb:
            e = 'file:' + c; scored[sc] += 1
            if not (any(e in spec_known[A] for A in routed) or e not in at_C): viol['cand_folded_for_specialist_' + sc] += 1
    a, b = cnt.get('cands_unscored_absent_at_C'), cnt.get('cands_unscored_not_in_routed_specialists')
    if a is None and b is None and cnt.get('cands_unscored', 0) > 0: keys_ok = False
    elif (a or 0) + (b or 0) != cnt.get('cands_unscored', 0): keys_ok = False
print('tasks', len(tasks), 'scored candidate rows', dict(scored), 'entities at C', len(at_C), flush=True)
print('counts', json.dumps(allcnt), flush=True)
print('violations (scored although present at C and unknown to every routed specialist)', dict(viol), 'two-case count keys', 'ok' if keys_ok else 'MISSING', flush=True)
ok = not viol and keys_ok
print('RESULT', 'PASS' if ok else 'FAIL', 'test_r55', 'violations', sum(viol.values()), 'keys', keys_ok, flush=True)
