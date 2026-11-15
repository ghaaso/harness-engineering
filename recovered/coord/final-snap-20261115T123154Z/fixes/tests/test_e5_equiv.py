"""Release gate scoring-selection-5: E5 equivalence of kge.score (stage B's scorer, ruling 55) and stage A's
routed_scores on the same candidates. No training, no metric, no task truth: one frozen stage-A E5 model
(train/stageA/E5/c01/reps.pt, trained at STAGEA_SHA) and up to 5 tuning tasks whose parent is STAGEA_SHA (s = 1,
C = P), both candidate scopes. Read-only; writes OUT/result.json (default /w/fixes/tests/out/<CODE>/e5_equiv).
  e5a  per (task, candidate) where routed_scores gives a value: kge.score gives one too, and max |diff| <= 1e-5.
       Like with like: the candidate list given to BOTH is the candidates present at C (no fold-in can apply), and
       the seed must be present at C.
  e5b  on the full candidate lists: every candidate known to a routed specialist that also knows the seed gets a
       score from kge.score (count of those that should have been scored but were not = 0).
  e5c  on the full lists, every value kge.score gives that routed_scores does not is a fold-in (entity absent at C);
       none for an entity present at C.
Prints one line per check and RESULT PASS|FAIL."""
import os, sys, json, math
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', os.environ.get('CODE', 'post'))), 'e5_equiv')
os.makedirs(OUT, exist_ok=True)
import torch
import kge
import stageB as sb

REPS = os.path.join(ROOT, 'train', 'stageA', 'E5', 'c01', 'reps.pt')
C = kge.STAGEA_SHA
reps = torch.load(REPS, weights_only=False)
assert reps['arm'] == 'E5'
entsP, triP = kge.read_graph(C)
nbP = kge.neighbours(triP)
ent = lambda p: 'file:' + p


class Specs(dict):
    def __missing__(self, A):  # a specialist without a relation vector (no training triples): routed, knows nothing
        return (None, None, None, 'rotate', {})


specs = Specs(); at_C = set()
for A, sd in reps['specialists'].items():
    at_C |= set(sd['known'])
    if sd['rco'] is None: continue
    known = set(sd['known'])
    specs[A] = (sd['labels'], sd['E'], sd['rco'], 'rotate', {e: i for i, e in enumerate(sd['labels']) if e in known})

tasks = [t for t in sb.load_tasks() if t['parent'] == C and ent(t['seed']) in at_C][:5]
cands = sb.load_cands()
res = dict(tasks=len(tasks), checked=0, max_abs_diff=0.0, ref_only=0, should_have_scored_not=0, extra_present_at_C=0,
           extra_folded=0, cands_full=0)
for t in tasks:
    s = ent(t['seed'])
    routed = [A for A in kge.route(s, entsP, nbP) if s in specs[A][4]]
    for sc in sb.SCOPES:
        full = cands[sc].get(t['task_id'], [])
        present = [c for c in full if ent(c) in at_C]
        # e5a on the candidates present at C
        if present:
            ref = kge.routed_scores(specs, [s], [ent(c) for c in present], entsP, nbP)[0]
            tb, _ = kge.score(REPS, [(t['task_id'], t['seed'], present)], C)
            got = tb.get(t['task_id'], {})
            for c, r in zip(present, ref.tolist()):
                if math.isnan(r): continue
                res['checked'] += 1
                if c not in got: res['ref_only'] += 1; continue
                res['max_abs_diff'] = max(res['max_abs_diff'], abs(got[c] - r))
        # e5b, e5c on the full list
        tb, _ = kge.score(REPS, [(t['task_id'], t['seed'], full)], C)
        got = tb.get(t['task_id'], {})
        refF = kge.routed_scores(specs, [s], [ent(c) for c in full], entsP, nbP)[0].tolist() if full else []
        for c, r in zip(full, refF):
            res['cands_full'] += 1
            if any(ent(c) in specs[A][4] for A in routed) and c not in got: res['should_have_scored_not'] += 1
            if c in got and math.isnan(r):
                if ent(c) in at_C: res['extra_present_at_C'] += 1
                else: res['extra_folded'] += 1
ok = dict(e5a=res['tasks'] > 0 and res['checked'] > 0 and res['ref_only'] == 0 and res['max_abs_diff'] <= 1e-5,
          e5b=res['should_have_scored_not'] == 0, e5c=res['extra_present_at_C'] == 0)
print('e5a tasks', res['tasks'], 'candidates checked', res['checked'], 'scored by routed_scores only', res['ref_only'],
      'max |diff| %.3g' % res['max_abs_diff'], 'ok' if ok['e5a'] else 'VIOLATED', flush=True)
print('e5b full lists', res['cands_full'], 'candidates; known to a routed specialist that knows the seed but unscored:',
      res['should_have_scored_not'], 'ok' if ok['e5b'] else 'VIOLATED', flush=True)
print('e5c scored by kge.score only: present at C', res['extra_present_at_C'], '| folded in (absent at C)', res['extra_folded'],
      'ok' if ok['e5c'] else 'VIOLATED', flush=True)
json.dump(dict(res, ok=ok, reps=REPS, checkpoint=C), open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_e5_equiv', json.dumps(res), flush=True)
