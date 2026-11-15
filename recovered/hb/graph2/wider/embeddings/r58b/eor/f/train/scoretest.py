"""Functional test of kge.score() (fold-in, unscored counts, E5 routing) before stage B. A model is trained
for 2 epochs at the stage-A checkpoint C (no hold-out) and scores the unrestricted candidates of the tune
tasks at one later parent P that has C as an ancestor (leak rule checked). Only counts and finiteness are
reported; no metric is computed. Writes train/scoretest.json."""
import os, sys, json, gzip, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'export'))
import kge, checkpoints as ck

P = ck.load_parents()
Psha = kge.STAGEA_SHA
C = max(P[Psha]['ancestor_parents'], key=lambda c: P[c]['commit_time'])  # latest ancestor task parent
tasks = [json.loads(l) for l in open(os.path.join(kge.ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]
tasks = [t for t in tasks if t['parent'] == Psha]
cands = collections.defaultdict(list)
with gzip.open(os.path.join(kge.ROOT, 'eval', 'comparators', 'candidates_unrestricted.tsv.gz'), 'rt') as f:
    next(f)
    for l in f:
        tid, c, _ = l.rstrip('\n').split('\t')
        cands[tid].append(c)
rows = [(t['task_id'], t['seed'], cands[t['task_id']]) for t in tasks]
out = dict(C=C, P=Psha, leak_ok=ck.is_ancestor_or_self(C, Psha, P), tasks=len(rows))
cfg = dict(E1=dict(embedding_dim=256, margin=6, lr=0.002, adversarial_temperature=0.5),
           E2=dict(embedding_dim=128, n3_weight=0.05, lr=0.1),
           E3=dict(embedding_dim=256, margin=6, lr=0.002, scoring_fct_norm=1),
           E4=dict(num_layers=1, embedding_dim=100, composition='mult', lr=0.001),
           E5=dict(embedding_dim=256, margin=6, lr=0.002, adversarial_temperature=0.5))
for arm in sys.argv[1:] or kge.ARMS:
    d = os.path.join(os.environ.get('KGE_SCORETEST_DIR') or os.path.join(kge.HERE, 'tmp'), 'scoretest', arm)
    kge.train(arm, cfg[arm], 1, C, holdout=False, outdir=d, max_epochs=2, es=False)
    table, cnt = kge.score(os.path.join(d, 'reps.pt'), rows, Psha)
    vals = [v for t in table.values() for v in t.values()]
    out[arm] = dict(counts=cnt, scored_rows=len(vals), all_finite=all(v == v and abs(v) != float('inf') for v in vals))
    print(arm, json.dumps(out[arm]), flush=True)
json.dump(out, open(os.environ.get('KGE_SCORETEST_OUT') or os.path.join(kge.HERE, 'scoretest.json'), 'w'), indent=1)
