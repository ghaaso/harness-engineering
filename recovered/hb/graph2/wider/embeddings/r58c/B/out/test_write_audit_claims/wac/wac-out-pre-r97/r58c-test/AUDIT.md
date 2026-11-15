# AUDIT (embeddings lane, addendum 8) -- TEST OUTPUT

Written 2026-11-15T11:09:58Z by r58c/write_audit_claims.py (sha256 20a8e93e4f61ad5c99242641aafc06a7935ee2c6b263cb4f65f70478aebe3acb), a draft writer; it computes no result: every row below is read from the files listed under Inputs.

Test markers found (test mode lists them; the real run refuses): tune: /plan_hash is the r58 test plan hash; tune: /stamp/plan_hash is the r58 test plan hash; item22: /test is true; item22: /plan_hash is the r58 test plan hash; answer: /test is true; answer: /plan_hash is the r58 test plan hash; answer_graded: /test is true; tune_rank: /test is true; leak: /test is true; leak: /plan_hash is the r58 test plan hash; item27: /plan_hash is the r58 test plan hash; item27: /test is true; item27: contains 'fakeB'; heldout: /test is true; handoff: /test is true; plan: /plan_hash is the r58 test plan hash; result_json: /item27/test is true; result_json: /test is true; RESULT.md: says TEST OUTPUT

## Inputs

| input | file | bytes | sha256 |
|---|---|---|---|
| answer | r58c/B/out/test_write_audit_claims/wac/in/answer/answer_level.json | 3410 | 420f1878c308130d229e525b489dd5772d5b3e74ec6498bde42250d3d01fcbac |
| answer_graded | r58c/B/out/test_write_audit_claims/wac/in/grader-returns/tune-item24.json | 2904 | 1a16593d3044e666f2e8a4ef7ca7c82ea980e4ddf2974e31515838b09867c883 |
| code:eval/evalcore.py | eval/evalcore.py | 16450 | 4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff |
| code:export/checkpoints.py | export/checkpoints.py | 9613 | 508c245f179345780a31e68fb4b2ce43b30540f2b66fe8046e689be83f602b4e |
| code:train/RUNLOG.md | train/RUNLOG.md | 78853 | 69ce40f9c4e473923e41ccdcee5bb3a26853aa3510aaa1e01f9a79fca539e5f7 |
| code:train/heldout.py | train/heldout.py | 63827 | f541b3ffac7ccdde3d361c546dba3530f29de12483692c8c13ed4b31323eabc3 |
| code:train/kge.py | train/kge.py | 37577 | 4b01984f085ec29c9c59e628c6016c326d526b0cb5407df5e6edc03155fb9e0f |
| code:train/proj.py | train/proj.py | 6661 | dcad14d5bb851e6bd44be69ee571cae0e465b6528718ebbabf67e007220400c9 |
| code:train/stageB.py | train/stageB.py | 26334 | 32c8c070938bd51400dcf233604d7ff51ea50a80a02184fdb04480009602ed23 |
| handoff | r58c/B/out/test_write_audit_claims/wac/in/heldout/HANDOFF.json | 603 | db7323cbd47e5adcda0f6c8daedeb63ad7902a22c4552dfde7f96c4a1a996130 |
| heldout | r58c/B/out/test_write_audit_claims/wac/in/grader-returns/heldout.json | 3156 | 2fa0b8f43d2b6a31fd8b21a613a2129b4e2e459cf1d6819087d7014abe334a5e |
| item22 | r58c/B/out/test_write_audit_claims/wac/in/item22/item22.json | 8351 | 7f12156e2a4671b1c15369610ea991b5441614e3eca9f4eae97dffd84607f1f2 |
| item27 | r58c/B/out/test_write_audit_claims/wac/in/fakeB/heldout/item27.json | 16610 | 3dcd3bdda09ae6d2d319880f2d0eaf7ccbcd588db462d441b73a6dd3b7548ec1 |
| leak | r58c/B/out/test_write_audit_claims/wac/in/leak_audit.json | 1028 | 3f44baf9e35a671ff2f2b9497964065aefa48b0dae6504f4f5d8c4ca90d38801 |
| leak_audit_py | train/leak_audit.py | 94382 | 8c53e487675d740ae3ff05a0e3fd6f5bcd4c0990b92a1843f2cfaae6cd6c6e76 |
| plan | r58c/B/out/test_write_audit_claims/wac/in/fakeB/stageB/plan.json | 38526 | cbc238fe9cb676ae5f97109d2574184109300d21d7f739a02924e8bc5d55ac7a |
| protocol | <repo>/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md | 82226 | 5ccc042c4fbab7beac1486490ee387058f7e081e2788f43f9f02d734b7fc8420 |
| result_json | r58c/B/out/test_write_audit_claims/wac/result0/result.json | 136341 | cadd036bfbcc813182f15fddc360126c3f8a1692d0b7cceb31fac8f17a7a06b6 |
| result_md | r58c/B/out/test_write_audit_claims/wac/result0/RESULT.md | 26139 | ff6ff1c158f1729481f370c172db03eb4f300f7a3ec47b3c17ce3b43f6d94ad7 |
| tune | r58c/B/out/test_write_audit_claims/wac/in/fakeB/report/tune.json | 257503 | 79774be5a0bc3d01eba6e3a0a595f78e5a6536bd831bf7c18e63b148597fd1dc |
| write_result | train/write_result.py | 60688 | cd2bd6f95e1c1afdb67e161af7fdc27b101a86867864c9e17907d98dc49a0f1b |
| writer | r58c/B/pre-r97/write_audit_claims.py | 73684 | 20a8e93e4f61ad5c99242641aafc06a7935ee2c6b263cb4f65f70478aebe3acb |

## 1. Leak audit (item 18; ruling 60)

> 18. The training graph never contains the task commit, anything after P, or a reference answer. The tuning truth is derived from git for tuning commits only; held-out references are read only by the grader. The audit checks the leak rule on every checkpoint used.

> 60. Leak audit (item 18). For every checkpoint used in either split and every task assigned to it: the task commit is not in the checkpoint's history; ruling 49's conditions hold, read from the raw facts cache; C is not later than P in ruling 50's order; no truth file is mounted in a training or scoring container. The table goes into AUDIT.md with ruling 35's disclosure.

From leak_audit.json (written None; s = None; plan_hash 7e577e577e577e577e577e577e577e577e577e577e577e577e577e577e577e57; ok = True; test = True).
c1: the task commit is not in C's history; c2: ruling 49; c3: C not later than P (ruling 50). Counts are tasks passing.

| split | checkpoint | tasks | parents | C = P | c1 | c2 | c3 | task commit checked |
|---|---|---|---|---|---|---|---|---|

Totals: tune 53 checkpoints, 388 tasks; heldout 70 checkpoints, 418 tasks. Parts rows on their planned checkpoint (c4): 2385.
Failures: 0.

**Ruling 35 (disclosure), word for word:** 35. Disclosure: while building the evaluation core, one builder's look at a temp file showed the names of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came from git for the June commits only. The audit records it.

**Ruling 81 (disclosure; leak_audit.json disclosure81.text):** RULING-81-DISCLOSURE-TEXT export/ is mounted read-only in the stage-B container.

**Ruling 89, the per-use rule, a limit of the isolation and not a clean pass (leak_audit.json ruling89.text; check ok = True):** RULING-89-PER-USE-TEXT stage B loads a graph only for a plan checkpoint; 2385 parts checked.

**Ruling 90 (the one by-design read of held-out lineage metadata, listed and not failed):** 90. Ruling 89's last condition, narrowed. The frozen stage-B code opens the held-out parents' folders in one place: when the plan is written, `make_plan` calls `checkpoints.assignment_m('heldout', ...)`, which reads each held-out parent's `ancestors.txt` (the commit ids in its facts history) and `sizes.json` (counts) to put the held-out assignment and lag into the plan under rulings 49 to 52. That is by design: the plan hash then fixes the held-out assignment before any unit trains. It ran once (`make_plan` returns the stored plan when `plan.json` exists). No triple, path or co-change pair is read there, and no training or scoring path of stage B opens a held-out parent's folder. The audit lists this site by file and line under its own name and does not fail on it; it fails on any other read of a graph folder that is not keyed by a checkpoint of the plan.

**Ruling 92 (the two stage-B guards; leak_audit.json ruling92.text; check ok = True):** RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values.

## 2. Mount audit (rulings 60, 72, 78)

> 72. Ruling 60, mounts. Held-out truth mounted in any training or scoring container fails the audit. Tuning truth inside the mounted `eval` folder is allowed for stage B and is listed in AUDIT.md file by file, with the code lines that show training and scoring take only task id, seed and candidates. Stage B was already running with that mount when this was ruled.

> 78. Held-out mounts (ruling 72 applied). The held-out container mounts the facts and the source store of the 70 held-out parents only. Nothing from a later commit is mounted: a later commit's history lists the files the held-out commits changed, and that is held-out truth. The leak audit compares the container's mount list with the plan's 70 parents and fails on anything else.

Coverage (a vacuous audit fails): ok = None; roles None; planned rows null; problems none.
Ruling 78: ok = None; held-out parents None; staged null; problems none.
eval/ is mounted in: no listed container.

| mount (script:line or inspect) | container | host source | destination | class | files (as stored; at most 6 per row, open question 6) | ok | probe |
|---|---|---|---|---|---|---|---|
| orchestrator/guard-stageB.sh:40 | kge-B1 | /w/export | /w/export | code+graphs | graphs, graphs0 | yes | ro |
| inspect kge-B1 | kge-B1 | /build/tasks/tasks.jsonl | /build/tasks/tasks.jsonl | tasks | tasks.jsonl | yes | ro |

## 2b. The mounted task rows (/w/r58c/B/out/test_write_audit_claims/wac/in/tasks.jsonl)

4 rows (sha256 f80b6dc401a3606b2e6c9706b769f14fd809e78ab44181c5b8b7843673344a8f): per split {"heldout": 1, "tune": 3}; rows with remove_paths (tune variants that drop paths; no truth) 2; rows with a truth-like key (truth, reference, references, files, defs, definitions, ref_files, ref_defs) 1: H-z (truth).
Row keys seen: id, parent, remove_paths, seed, set, split, truth.

## 3. The mounted eval/ folder, every file (ruling 72)

Walked here (sealed/ never entered); "leak audit agrees" compares bytes and sha256 with leak_audit.json's eval_files. 25 files, 5 of them tune truth.

| file | class | bytes | sha256 | why it is truth | leak audit agrees |
|---|---|---|---|---|---|
| eval/evalcore.py | no truth | 16450 | 4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff |  | absent |
| eval/gate.json | derived from tune truth (aggregates) | 1639 | cfc4476f3c3bc19f5fc842e36b2791bf9a25128f7b1f5ed5e90fa13f404e0d0d | evaluation-core gate counts (aggregates, no file list) | absent |
| eval/run_comparators.py | no truth | 7228 | 08c1b92e944c1f865ca6d4f654e776d77ccefbf7d58b7b34f31a61cccf156141 |  | absent |
| eval/smoke_stats.py | no truth | 1079 | 8e1b0b57df30b37126d29d219ed6c980339eee71beac78b3526441d2886b5a2b |  | absent |
| eval/tune_commits.jsonl | tune truth | 40374 | 20fbceb893db09d0c2b44ce06848ede5ec444875ea9af1374c68bfce11e654d9 | per commit: seeds (changed files) and task ids | absent |
| eval/tune_tasks.jsonl | tune truth | 383172 | e47b9fe5811a74c6dac4b0dca41e350c32ccb9c7a6ebc3a31f117ded941a3789 | per task: truth = the commit's other changed files | absent |
| eval/comparators/CO_pool.tsv.gz | no truth | 7762 | 8a14cc03c65a16193c566f0ba25dd2f1e5912d75f95844d4c52b2d76c96b11ee |  | absent |
| eval/comparators/CO_unrestricted.tsv.gz | no truth | 7770 | a2731b4213be54e70392f44218a3a3a74aa9ac279ede73f99db0ca51cb0ae64e |  | absent |
| eval/comparators/DIR_pool.tsv.gz | no truth | 58954 | c4658e5b8c6cf90901a6029d01598656b82fba27dffd39b64edc0becbaeb18fe |  | absent |
| eval/comparators/DIR_unrestricted.tsv.gz | no truth | 242357 | e752155e72e1283e133ea1a05fc1294bff3b988bf299fe4f8a2121d1a416afbe |  | absent |
| eval/comparators/PPR_pool.tsv.gz | no truth | 211303 | 6db126a15168d849dd969f49e988494b2513071d7165e994873c6337f517d982 |  | absent |
| eval/comparators/PPR_unrestricted.tsv.gz | no truth | 947649 | 0d229f3ef2ffa246b276c79500002b9f70a89e1ea50bf73e610887dcf219d63d |  | absent |
| eval/comparators/RANDOM_pool.tsv.gz | no truth | 56530 | 8087c0b87572e3a76a4936be05588df403b98e26857dfbf50797f359b52cfae4 |  | absent |
| eval/comparators/RANDOM_unrestricted.tsv.gz | no truth | 230643 | 0f3333a31abf78f722ae6e515f79154743e6fd88672de9028f93ff8ad875e715 |  | absent |
| eval/comparators/RRF_pool.tsv.gz | no truth | 101940 | 82e0fcf5a571beaca03c7dde23957eeb8d09a279d75fd207eb568d70caeac8d4 |  | absent |
| eval/comparators/RRF_unrestricted.tsv.gz | no truth | 424726 | bff2de2700dc1fb170ba0afe40647b2b3c7298965eb7f732e88735cdf1ade954 |  | absent |
| eval/comparators/candidates_pool.tsv.gz | no truth | 56534 | 4ee503ab6b419dbd95ca6c84cf6d50c832d80b22c2afaa19eb9cce8c6434ca43 |  | absent |
| eval/comparators/candidates_unrestricted.tsv.gz | no truth | 230647 | c44dccb16f71e7f5bf9a597b2e4c5f9a4b699c2dcc3967a5fec23b6693e0a5cb |  | absent |
| eval/comparators/metrics.json | derived from tune truth (aggregates) | 4532 | 17ff7a1f61bda7796026c22933353aacb091d68743c6d7bca8dae692bb3a2552 | comparator metrics computed against tune truth (aggregates, no file list) | absent |
| eval/git/all_commits_nofiles.txt | no truth | 87120 | aca13ed0bb905e29e34b33f437a6a0bd27e6a6713605cbdfff573ae072e0d75b |  | absent |
| eval/git/head_commits_nofiles.txt | no truth | 57631 | 5d31a22c726170ba05d860b93306d79db51a225790709f8256e1208179fdaf79 |  | absent |
| eval/git/june_head.txt | no truth | 27692 | 6c07d21e6fa0c5349ee16af47cb3e93df466de0cffb281f4a5bf364091f57aa1 |  | absent |
| eval/git/june_namestatus.txt | tune truth | 43744 | 90cfe2c3375f5b12e09a705fdef718ff74485f648f8d5910133c989a16579cdd | git name-status of the June (tune) commits | absent |
| eval/git/pilot_commits.json | tune truth | 20624 | f689b15aa0d021557a39e45567fa04d71cdbf70d58bf6a287da43bd2faabb905 | pilot commits with their changed files | absent |
| eval/git/pilot_rows.tsv | tune truth | 1732509 | 653444136dea8ef1c880bf0cc79a7e924519894cfe91b67d3eee9a4c7450d6fd | pilot rows with the truth label y | absent |

## 4. Training takes no task; scoring takes only task id, seed and candidates (ruling 72)

Located by pattern in the current bytes (sha256 in Inputs). Stage B loads eval/tune_tasks.jsonl, but passes kge.score only (task id, seed path, candidate list) and the parent sha; kge.train gets arm, configuration, seed and checkpoint.

| what | file:line | code |
|---|---|---|
| stage B loads the tune tasks | train/stageB.py:101 | `def load_tasks():` |
| ... from eval/tune_tasks.jsonl | train/stageB.py:102 | `return [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]` |
| stage B loads the candidate lists | train/stageB.py:109 | `with gzip.open(os.path.join(ROOT, 'eval', 'comparators', 'candidates_%s.tsv.gz' % sc), 'rt') as f:` |
| a unit loads both | train/stageB.py:282 | `tasks = load_tasks(); cands = load_cands()` |
| training gets arm, config, seed and checkpoint (no task) | train/stageB.py:312 | `_, info, _ = kge.train(arm, c['cfg'], seed, C, holdout=False, outdir=mdir, max_epochs=c['epochs'], es=False)` |
| scoring entry | train/stageB.py:202 | `def score_tasks(reps_path, task_rows, cands, P_of, lag, C):` |
| the unit scores its checkpoint's tasks | train/stageB.py:313 | `tables, per = score_tasks(os.path.join(mdir, 'reps.pt'), by_ck[C], cands, None, plan['lag'], C)` |
| per task: id and parent only | train/stageB.py:206 | `tid = t['task_id']; rec = dict(parent=t['parent'], checkpoint=C, lag=lag[tid])` |
| kge.score gets (task id, seed, candidates) and the parent | train/stageB.py:208 | `tb, cnt = kge.score(reps_path, [(tid, t['seed'], cands[sc].get(tid, []))], t['parent'])` |
| kge.train signature | train/kge.py:606 | `def train(arm, config, seed, checkpoint_sha, holdout=None, outdir=None, max_epochs=None, es=True, batch_size=None,` |
| kge.score signature | train/kge.py:653 | `def score(reps_path, rows, parent_sha):` |
| kge.score rows | train/kge.py:654 | `"""rows: [(task_id, seed_path, [candidate paths])] for tasks at parent P = parent_sha, model trained at` |
| held-out rows with a truth-like key are refused | train/heldout.py:386 | `if any(k in r for k in TRUTHY): refuse(6, 'task %s carries a truth-like key' % r.get('id'))` |
| held-out task fields | train/heldout.py:406 | `self.tasks.append(dict(task_id=r['id'], parent=P, seed=r['seed']['path'], checkpoint=C, lag=hp['lag_by_parent'][P]))` |
| held-out candidates from the seed | train/heldout.py:411 | `self.cands = {sc: {t['task_id']: ec.candidates(t, sc) for t in self.tasks} for sc in SCOPES}` |
| held-out training (no task) | train/heldout.py:481 | `_, info, _ = kge.train(self.arm, self.cfg, seed, C, holdout=False, outdir=mdir, max_epochs=self.epochs, es=False)` |
| held-out scoring through stageB.score_tasks | train/heldout.py:482 | `tables, per = stageB.score_tasks(os.path.join(mdir, 'reps.pt'), self.by_ck[C], self.cands, None, self.lag, C)` |
| candidates come from the seed and parent | eval/evalcore.py:130 | `def candidates(task, scope):` |
| ... the pool of the seed | eval/evalcore.py:132 | `return g.pool(task['seed']) if scope == 'pool' else g.unrestricted(task['seed'])` |

Every file-read site of train/kge.py and train/stageB.py (open, gzip.open, torch.load, np.load):

- train/kge.py:83 `return json.load(open(CONFIG_FILE))`
- train/kge.py:112 `with open(os.path.join(d, 'entities.tsv')) as f:`
- train/kge.py:118 `with open(os.path.join(d, 'triples.tsv')) as f:`
- train/kge.py:635 `json.dump(info, open(os.path.join(part, 'meta.json'), 'w'), indent=1, default=str)`
- train/kge.py:657 `reps = torch.load(reps_path, weights_only=False)`
- train/stageB.py:52 `with open(p, 'rb') as f:`
- train/stageB.py:67 `try: return json.load(open(os.path.join(out, 'meta.json'))).get('plan_hash')`
- train/stageB.py:75 `with open(PROG, 'a') as f: f.write(json.dumps(dict(step='stageB', unit=unit, status=status, t=now(), **kw)) + '\n')`
- train/stageB.py:81 `with open(p, encoding='utf-8', errors='replace') as fh:`
- train/stageB.py:102 `return [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]`
- train/stageB.py:109 `with gzip.open(os.path.join(ROOT, 'eval', 'comparators', 'candidates_%s.tsv.gz' % sc), 'rt') as f:`
- train/stageB.py:127 `if os.path.exists(PLAN): return json.load(open(PLAN))`
- train/stageB.py:132 `top = json.load(open(os.path.join(HERE, 'stageA', 'top3.json')))`
- train/stageB.py:139 `timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {}`
- train/stageB.py:144 `meta = json.load(open(os.path.join(HERE, 'stageA', arm, cid, 'meta.json')))`
- train/stageB.py:195 `with open(os.path.join(HERE, 'RUNLOG.md'), 'a') as f: f.write('\n'.join(lines) + '\n')`
- train/stageB.py:243 `json.dump(per, open(os.path.join(part, 'counts.json'), 'w'), indent=1)`
- train/stageB.py:244 `json.dump(meta, open(os.path.join(part, 'meta.json'), 'w'), indent=1, default=str)`
- train/stageB.py:258 `if json.load(open(os.path.join(out, 'counts.json'))) != json.loads(json.dumps(per)):`
- train/stageB.py:298 `nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']`
- train/stageB.py:354 `and os.path.exists(base + '_meta.json') and json.load(open(base + '_meta.json')).get('plan_hash') == plan['plan_hash']:`
- train/stageB.py:362 `for tid, rec in json.load(open(os.path.join(d, 'counts.json'))).items():`
- train/stageB.py:383 `runners = sorted({json.dumps({k: json.load(open(os.path.join(d, 'meta.json'))).get(k) for k in ('runner', 'processes')},`
- train/stageB.py:422 `plan = json.load(open(PLAN))`
- train/stageB.py:426 `plan = json.load(open(PLAN))`

Lines of train/stageB.py, train/kge.py, train/proj.py, export/checkpoints.py, train/heldout.py that read a task's truth key (leak_audit.TRUTH_READ): none.

## 5. Item 22 (ruling 61), before an arm is called weak

> 22. Before an arm is called weak: its stage-A MRR is compared with PPR's and CO's on the same held-out triples, its loss curve is checked for convergence, and its score direction and use of the reciprocal relation are checked against PyKEEN's own prediction call on 20 queries.

Stage-A held-out triples: 32 queries at cd806c803c4ad8ec198790096d196460789951f0; PPR MRR 0.282 (file/doc 0.28172547913309764), CO MRR 0.002 (file/doc 0.00984825800090036).
CO's figure is a floor by construction, not a comparator score: train/RUNLOG.md:38 `0.010 (file/doc): CO cannot score a removed pair, so this is its floor by construction.`.

| arm | config | stage-A MRR all / file-doc | minus PPR / CO | loss ratio as run / to selection epoch | stage-B loss ratio median (units) |
|---|---|---|---|---|---|
| E1 | c04 | 0.730 / 0.7310846721843558 | +0.448 / +0.729 | n/a / +1.014 | n/a (0) |
| E1 | c15 | 0.724 / 0.7265531617505301 | +0.442 / +0.722 | n/a / +1.023 | n/a (0) |
| E1 | c12 | 0.722 / 0.7244595013348589 | +0.440 / +0.720 | n/a / +1.014 | n/a (0) |
| E2 | c11 | 0.752 / 0.7518402350164204 | +0.470 / +0.750 | n/a / +0.992 | n/a (0) |
| E2 | c07 | 0.746 / 0.7463790380586046 | +0.465 / +0.745 | n/a / +0.991 | n/a (0) |
| E2 | c10 | 0.727 / 0.7267409673659674 | +0.445 / +0.725 | n/a / +0.995 | n/a (0) |
| E3 | c11 | 0.741 / 0.741461599883856 | +0.460 / +0.740 | n/a / +1.031 | n/a (0) |
| E3 | c03 | 0.740 / 0.740554627023223 | +0.459 / +0.739 | n/a / +1.019 | n/a (0) |
| E3 | c13 | 0.740 / 0.7405486874236875 | +0.459 / +0.739 | n/a / +1.030 | n/a (0) |
| E4 | c12 | 0.729 / 0.7296233008958912 | +0.448 / +0.728 | n/a / +0.903 | n/a (0) |
| E4 | c13 | 0.685 / 0.6908903755698204 | +0.404 / +0.684 | n/a / +0.925 | n/a (0) |
| E4 | c16 | 0.681 / 0.6848664630325815 | +0.399 / +0.679 | n/a / +0.907 | n/a (0) |
| E5 | c03 | 0.402 / 0.4439520532431961 | +0.120 / +0.400 | n/a / +0.993 | n/a (0) |
| E5 | c11 | 0.400 / 0.42649972578093676 | +0.118 / +0.399 | n/a / +0.987 | n/a (0) |
| E5 | c09 | 0.393 / 0.4462085300804881 | +0.111 / +0.391 | n/a / +0.985 | n/a (0) |

Comparison with PyKEEN's predict_target (tail prediction of (h, co_changed, ?)):

- E1: c04: injection ok; 20/20 orders identical, max |diff| 0.0. Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): None.
- E2: c11: injection ok; 20/20 orders identical, max |diff| None. Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): None.
- E3: c11: injection ok; 20/20 orders identical, max |diff| 1e-07. Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): None.
- E4: c12: None/None orders identical, max |diff| None; a FRESH model of the selected configuration (ruling 74: it tests the scoring path, not the stored model). Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): None.
- E5: per specialist: . Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): None.

> Ruling 74: 74. Ruling 61 for E4. CompGCN's stored representations cannot be loaded back into a model, so E4's comparison with PyKEEN's own prediction call uses a fresh model of the selected configuration. It tests the scoring path, not the stored model, and is reported so.

## 6. Item 27 freeze (rulings 57, 80)

> 27. Selected arm: the highest seed-averaged fused pool P@10 over all 65 tuning commits (ties: the simplest). Its configuration and w are chosen on all 65 by the item 20 rule and frozen with a hash before any held-out task runs. Exactly one run, 3 seeds, of that arm alone and fused, plus RRF, PPR, CO and DIR, on the 75 held-out commits; rank metrics and the answer-level measure, scored by the grader. No word of section G is applied to held-out.

- item27.json sha256 3dcd3bdda09ae6d2d319880f2d0eaf7ccbcd588db462d441b73a6dd3b7548ec1; item27.json.sha256 says 3dcd3bdda09ae6d2d319880f2d0eaf7ccbcd588db462d441b73a6dd3b7548ec1 (match).
- chosen E2 c07, w 1.0, epochs 20, s 1, device cpu, image sha256:wr-test; plan_hash 7e577e577e577e577e577e577e577e577e577e577e577e577e577e577e577e57; test True.
- tables r58c/B/out/test_write_result/wr/fakeB/stageB/tables, tables_digest 9121ff642643e61dd4ab29ce19d5dab0d3b17942213c0632dd565328c3a0bc11; choices.json sha256 per arm {"E1": "e733b7c927efc6d891035818034aa8b13d82fb0b0cdff5214c47dd94f1f40025", "E2": "791d08e73f8be1700ab1eb6f7b87a2d8ee14a2187b119eee9a38875f5f15ce44", "E3": "a19f20924687f976a204283bb097076bb6a8ce2f0e199a5712349454df6c8620", "E4": "6f409bb6000c2c10c17b9b3f9bf4fb4e6e405af2010164ae846d0a4d68819bca", "E5": "536ec4d8fd5098fe4c33a156cc01388650841e1755d6802a22b9f7f31e685f28"}.
- HANDOFF.json: sha256 db7323cbd47e5adcda0f6c8daedeb63ad7902a22c4552dfde7f96c4a1a996130; its freeze_sha256 3dcd3bdda09ae6d2d319880f2d0eaf7ccbcd588db462d441b73a6dd3b7548ec1 (equals the record).
- The grader's literal check of ruling 73: not available to the lane (open question 5).

## 7. Assembled tables (assemble_checks, rulings 66, 67)

No `PASS assemble-checks` line in train/RUNLOG.md (or its log is missing).

## 8. Disclosures reported as they are

**Ruling 47:** 47. When the choice was made: the owner approved the card at 08:35Z on 2026-11-14, with 76 of 80 stage-A units finished (E5 c13-c16, none later in E5's top 3, still running); this section was written after stage A finished. Stage A's selection scores (validation MRR on its held-out pairs; they decide only which three configurations go on, item 19) had been seen. No stage-B unit and no task-level embedding score existed then or when this section was accepted. The device was chosen for wall time, and s from the card's timing alone (ruling 44), not from any score. Disclosed: E4's initialisation fix (ruling 42) followed the card sanity runs that showed E4 at 0.209 and 0.555. The fix was kept because it makes E4's initial weights bit-identical to the CPU's, which variant A did not. The validation MRRs of both variants (means 0.626 and 0.683; CPU 0.661) were seen before it was kept.

**Ruling 69:** 69. Two containers, accepted under ruling 66 with conditions. Measured: deterministic E4 beside E1 1.50 times, E1 beside E5 1.23 times, E3 beside E2 1.63 times, with ruling 68's equality on every finished unit (199 units: 5 of the 15 settings, seed 1, two checkpoints). Stage B starts in one container (B) in the order E1, E5, E2, E3, E4. A second container (A) may take E4 over, before any E4 unit has run, once all of these hold: (i) a two-container guard exists and passes its tests; (ii) on the real tree, deterministic E4 c12, c13 and c16 have each trained the smallest checkpoint at seed 1 twice with ruling 68's equality; (iii) the coordinator has written `orchestrator/equality-accepted.json`. From then on each model type belongs to exactly one container, B is relaunched without E4, and each container writes its own progress file. Container A starts only after three samples with at least 6 GB free RAM and commit under 38 GB, and it gives way first: it is stopped after three samples with commit over 41 GB or free RAM under 4 GB, while B keeps ruling 43's lines. For each setting, one finished unit is re-run and compared under ruling 68 during the run; a mismatch stops side-by-side running for that model type at once and its parts made side by side are redone alone. If A never starts, B trains E4 last, deterministic, alone.

Ruling 69's rerun comparisons: not located by this draft (open question 4).

## 9. Rehearsals and mount records (ruling 86(b); ruling 94(e), (f); ruling 95)

> 86. The card window (rulings 79 and 67 applied; it comes after stage B has left the card and before the code freeze). (a) The ruling-79 probe runs on the card under the 4 GB cap and records, for each of the fifteen settings, the container's peak memory, the process's peak memory and the card's peak reserved memory against its total. One further probe process runs the whole unit path (train, score, assemble, rank, pack) on synthetic tasks for the setting with the highest peak. A container peak above 3.5 GB or a card peak above 10 GB is reported to the coordinator before anything else runs. (b) A rehearsal of the held-out driver in test mode: three tuning parents (the smallest, one without a co_changed fact, the largest), the GPU image, the card, the 4 GB cap, test records for E4 (c13 or c16, deterministic), for E5 and for one of E1 to E3, a `docker stop` in the middle of a unit followed by a relaunch, and a stopped leftover container before a launch. It writes only under a scratch folder and reads no real table and no held-out graph. Its logs are kept and listed in AUDIT.md, which also names what it cannot cover: the real record and anchor, the 70 real graphs, wall time.

> 94. Mounts of the end sequence's containers (ruling 72 applied to END-ORDER.md). As written, the launcher of the real steps mounts the whole repository, with its history, and the whole facts cache into every container. The history and the later facts hold what the held-out commits changed. Unlike `export/` in stage B (ruling 89) this has not happened yet and can still be done right. So: (a) the containers of the card window and of steps 4 to 8 (the probe, the rehearsal, the re-run check, selectB, report, the tuning hand-off, item27, the held-out run and both pre-checks) mount neither the repository nor the whole facts cache. (b) The tuning hand-off mounts a staging of the facts and the source store of the late-50 tuning parents only, built and hashed before the code freeze like the held-out staging; its manifest is in the freeze list and is verified before use. (c) Only containers that run after the grader has returned the held-out result may mount the repository's history and the whole facts cache, and only the leak audit does: it has to read history to do its work. The result writer and the audit writer mount the deliverable folder and the protocol file, not the repository. (d) Each step has a fixed list of allowed (host folder, destination) pairs in the launcher. (e) The mount record (`docker inspect`) of every container of every step, tests excluded, is saved, passed to the leak audit and listed in AUDIT.md; the audit fails if a container of the card window or of steps 4 to 8 has a mount outside its step's list. (f) `export/` stays mounted where a step needs the graphs, under ruling 89's per-use rule, and AUDIT.md says so.

> 95. Ruling 94(e), made exact. The leak audit runs before item 22, the result writer and the audit writer, and its output is an input of the last two, so their mount records cannot exist when it runs. Point (e) therefore reads: the mount record (`docker inspect`) of every container of the end sequence, tests excluded, is saved. The records of the containers that ran before the leak audit (the card window and steps 4 to 8) are passed to it, and the audit fails if one of them is missing or shows a mount outside its step's list. The records of the containers that run after it (item 22, the result writer, the audit writer) are saved in the same way and listed with their sha256 in AUDIT.md by the audit writer, except its own, whose record and launcher line the coordinator's independent audit of step 10 checks against the launcher's fixed list. The fail clause of ruling 94 is unchanged.

### 9a. The held-out driver's rehearsal (END-ORDER 2b): logs and container records

(none found)

### 9b. The interface rehearsal (END-ORDER 2e): logs and outputs

| file | bytes | sha256 |
|---|---|---|
| r58c/B/out/rehearsal/RESULT.md | 24240 | 6272b7867d354e6ca51de1e0047ba276a26d52bfe243e1842dc0e275711ea7e0 |
| r58c/B/out/rehearsal/result.json | 93731 | 6a5758a3e2ea703d102d5585f5d8a98fd7c51ecc25ef7224153aeb4d2add2330 |
| r58c/B/out/logs/wr_rehearsal.log | 1891 | 35ae7409f8c4912698dd37f4466cc0e449128e6e90bf8eea458a00cebf1561ab |

**What the rehearsals cannot cover:** the real item-27 record and its coordinator anchor, the 70 real held-out graphs, and the real run's wall time (ruling 86(b)); the rehearsals ran on three tuning parents with test records (2b) and on the grader's test set pick8, 8 late-50 commits and 37 tasks, with test flags (2e).

### 9c. Mount records (ruling 94(e)): the docker inspect of every container of every step, tests excluded

Mount lists: r58c/A/mounts-A.json sha256 92ba5af8e7a35aa0a4259f6a3ea5cb7f1e6de4cfeb48d0d02a3595528301cde5; r58c/B/mounts-B.json sha256 46ec08eef6e5ac62d6698d7e5204c6dfa4bcf24d4819a2b6c7ae8ad27af30880.

| container | list | step | record | bytes | sha256 |
|---|---|---|---|---|---|
| kge-R1 | B | 2c | NOT FOUND | | |
| ktest-eor | B | 1 | NOT FOUND | | |
| ktest-r1 | B | 4 | NOT FOUND | | |
| ktest-r10 | B | 9.1 | NOT FOUND | | |
| ktest-r11 | B | 9.2a | NOT FOUND | | |
| ktest-r2 | B | 4 | NOT FOUND | | |
| ktest-r3 | B | 6 | NOT FOUND | | |
| ktest-r4 | B | 5 | NOT FOUND | | |
| ktest-r5 | B | 9.2 | NOT FOUND | | |
| ktest-r6 | B | 9.3 | NOT FOUND | | |
| ktest-r7 | B | 9.4 | not listed: this writer's own record; the coordinator's step-10 audit checks it against the launcher's fixed list (ruling 95) | | |
| ktest-r8 | B | 5 | NOT FOUND | | |
| ktest-r9 | B | 8 | NOT FOUND | | |
| kge-H1 | A | 7 | NOT FOUND | | |
| kge-H1P | A | 2a | NOT FOUND | | |
| kge-H1Pc | A | 2a | NOT FOUND | | |
| kge-H1R | A | 2b | NOT FOUND | | |
| kge-H1Rc | A | 2b | NOT FOUND | | |
| kge-H1c | A | 7 | NOT FOUND | | |
| kge-B1 | stage B | stage B | orchestrator/kge-B1-inspect-20261114T190928Z.json | 9585 | 052cbfa0ec863e3bb9e2069e99eb97b58a358cb53ded44f803d73dde8d4235e6 |
| kge-B1 | stage B | stage B | orchestrator/kge-B1-inspect-20261115T073116Z.json | 9584 | cfc3cb7d79d20236f7d08a335a7771b6aea402de3267c12cca6afffbfb72f990 |

**Ruling 95:** the records of the containers that ran before the leak audit were passed to it (step 9.1); the records of ktest-r5 (item 22), ktest-r6 (the result writer), which ran after it, are listed above with their sha256; this writer's own record (ktest-r7) is not listed: the coordinator's independent audit of step 10 checks it.


**Ruling 94(f), export/:** export/ stays mounted only where a step reads graphs, under ruling 89's per-use rule (section 1): kge-R1 (2c; /w/export); ktest-eor (1; /w/export/checkpoints.py, /w/export/parents.jsonl, /w/export/parents_git.jsonl); ktest-r10 (9.1; /w); ktest-r11 (9.2a; /w/export); ktest-r2 (4; /w/export); ktest-r3 (6; /w/export/checkpoints.py, /w/export/parents.jsonl, /w/export/parents_git.jsonl); ktest-r4 (5; /w/export/graphs/02b9557c6bee2a634ba9ae33e8705d090aade8d1, /w/export/graphs/040c21b83aeade1234dd81459305dd0666047fe1, /w/export/graphs/0a0a297908f88c90ee97bb06908d1059175696da, /w/export/graphs/1a92ea23aa091dff8536fe2ef5b834a7c6cbc22c, /w/export/graphs/1c6b380205c55d3acd9feacd637cdd1607519e10, /w/export/graphs/2920d3d96000a9795f0fd883427e75bd48e9b123, /w/export/graphs/2cff6332bae99a8796e1a0e081a0b4c8f40be906, /w/export/graphs/31ac1ebae55b42ef6febfd649eaab322c890d577, /w/export/graphs/3d5378ef0a0ca722893b3f5c3a5191fefa090518, /w/export/graphs/64adbdd06dd8fb38f3e6c3f71ac2394f60e7be59, /w/export/graphs/65a83c41667e1070c41e28077788ea5297bf1fed, /w/export/graphs/7b3a745281898d3d5808c5a15c4916d1d9dbb1b4, /w/export/graphs/89d41d69aef7aa0afa26670ac96ff3e032ae5f52, /w/export/graphs/8a80e31563cf4b4aa2edee0860a6e6b9ffe0dfae, /w/export/graphs/8f33e2448a1dd2d15187c4e6ccd6a97a3cb44d8c, /w/export/graphs/9647afdaca18b3278685e73a0acdd1d73c379a59, /w/export/graphs/99df571683a6e822de0eabf9d1631276e4241919, /w/export/graphs/9d8961594ba563ddff4aa66bfb00960d7c7f1e2d, /w/export/graphs/a9ad236e04ace907fba169554699ae34430b2474, /w/export/graphs/b2c981e7be8a3aa33033bfa7433c1ba282eccd76, /w/export/graphs/b87058f237010f222b78918e9e3ff5654d37cdd3, /w/export/graphs/ba2b9651515c73731841b88d4132a728a9aedcf4, /w/export/graphs/bbded3a274ab56703991f12a7721eb1988da14a8, /w/export/graphs/c293916e5d81c4a2ba5feea4bd194eb31eaa7e52, /w/export/graphs/c89e021f31492e37d4138364c97133d3c79c2294, /w/export/graphs/c8c7cfc43720c603a028cb4a4f9f43aef90d181e, /w/export/graphs/cc857d357a6dbc48a20492d67e38f4bec2b1f9e5, /w/export/graphs/d26c2b05604477d081563feba0d790191ab65252, /w/export/graphs/d310349868c9852ac32650c640f9da18a91cf057, /w/export/graphs/d40de52eaef63fea1ef45a2d89a39b7cb9b0b445, /w/export/graphs/d96a8dabd82de8b0af8ed4a03863a7525b07752d, /w/export/graphs/ded44c816b7e690b5d9cf2c657cec31c59e93294, /w/export/graphs/df61262aacfd1bbe08ba88bb30d0cdb16432d91a, /w/export/graphs/dfe87430ac1baaa98a70993b14a5610e1be9b063, /w/export/graphs/ec1b5dfb5af0612d13c16347e02d0430fa6fd033, /w/export/graphs/f117fb3c34b7f7b06b1b00cf080bccea31e32a11, /w/export/graphs/f593b73d789d2e0cfeaff74d3bc616e9f2fa6a7b, /w/export/graphs/f94ede296b4c6b2b7c250140083ab6dabac49fa1); ktest-r5 (9.2; /w/export); ktest-r8 (5; /w/export/graphs/02b9557c6bee2a634ba9ae33e8705d090aade8d1, /w/export/graphs/040c21b83aeade1234dd81459305dd0666047fe1, /w/export/graphs/0a0a297908f88c90ee97bb06908d1059175696da, /w/export/graphs/1a92ea23aa091dff8536fe2ef5b834a7c6cbc22c, /w/export/graphs/1c6b380205c55d3acd9feacd637cdd1607519e10, /w/export/graphs/2920d3d96000a9795f0fd883427e75bd48e9b123, /w/export/graphs/2cff6332bae99a8796e1a0e081a0b4c8f40be906, /w/export/graphs/31ac1ebae55b42ef6febfd649eaab322c890d577, /w/export/graphs/3d5378ef0a0ca722893b3f5c3a5191fefa090518, /w/export/graphs/64adbdd06dd8fb38f3e6c3f71ac2394f60e7be59, /w/export/graphs/65a83c41667e1070c41e28077788ea5297bf1fed, /w/export/graphs/7b3a745281898d3d5808c5a15c4916d1d9dbb1b4, /w/export/graphs/89d41d69aef7aa0afa26670ac96ff3e032ae5f52, /w/export/graphs/8a80e31563cf4b4aa2edee0860a6e6b9ffe0dfae, /w/export/graphs/8f33e2448a1dd2d15187c4e6ccd6a97a3cb44d8c, /w/export/graphs/9647afdaca18b3278685e73a0acdd1d73c379a59, /w/export/graphs/99df571683a6e822de0eabf9d1631276e4241919, /w/export/graphs/9d8961594ba563ddff4aa66bfb00960d7c7f1e2d, /w/export/graphs/a9ad236e04ace907fba169554699ae34430b2474, /w/export/graphs/b2c981e7be8a3aa33033bfa7433c1ba282eccd76, /w/export/graphs/b87058f237010f222b78918e9e3ff5654d37cdd3, /w/export/graphs/ba2b9651515c73731841b88d4132a728a9aedcf4, /w/export/graphs/bbded3a274ab56703991f12a7721eb1988da14a8, /w/export/graphs/c293916e5d81c4a2ba5feea4bd194eb31eaa7e52, /w/export/graphs/c89e021f31492e37d4138364c97133d3c79c2294, /w/export/graphs/c8c7cfc43720c603a028cb4a4f9f43aef90d181e, /w/export/graphs/cc857d357a6dbc48a20492d67e38f4bec2b1f9e5, /w/export/graphs/d26c2b05604477d081563feba0d790191ab65252, /w/export/graphs/d310349868c9852ac32650c640f9da18a91cf057, /w/export/graphs/d40de52eaef63fea1ef45a2d89a39b7cb9b0b445, /w/export/graphs/d96a8dabd82de8b0af8ed4a03863a7525b07752d, /w/export/graphs/ded44c816b7e690b5d9cf2c657cec31c59e93294, /w/export/graphs/df61262aacfd1bbe08ba88bb30d0cdb16432d91a, /w/export/graphs/dfe87430ac1baaa98a70993b14a5610e1be9b063, /w/export/graphs/ec1b5dfb5af0612d13c16347e02d0430fa6fd033, /w/export/graphs/f117fb3c34b7f7b06b1b00cf080bccea31e32a11, /w/export/graphs/f593b73d789d2e0cfeaff74d3bc616e9f2fa6a7b, /w/export/graphs/f94ede296b4c6b2b7c250140083ab6dabac49fa1); ktest-r9 (8; /w/export/graphs/00c0a1f7c319a07f789166beb5c2c9ad8ddd3917, /w/export/graphs/01ac9e84d3bb5a0c200e54ad8c322f6dfeb66bf0, /w/export/graphs/028721d0c76feb8a54fd4e077208b7965c31f434, /w/export/graphs/109da0393eb4c31828854da324d66afb6ac67bb8, /w/export/graphs/10be6cca759929ff92c8ef997da11cf8c99dede3, /w/export/graphs/157158eb8b84f720b18311bfecd85bf0f9207929, /w/export/graphs/19c93443811da8b0369ba1ba2fc0322f51cdb0b6, /w/export/graphs/19e80c01f5abdb30520c42cf181e2f55b9fbb327, /w/export/graphs/1bb2276b4028f97fd9de6ba4d7069dfcb72c76b9, /w/export/graphs/1c546a31060d0bb984b4f0a07a79f04d70410b1a, /w/export/graphs/26c9f1edbb91e267351b00e4e9b7c35cb95a8ffc, /w/export/graphs/275a4945dab05fce534380bcc0657eae172c12f9, /w/export/graphs/2c7f91e18293bec2bd186d29936b5d10407f40f2, /w/export/graphs/2fe77f52c4ab8a206fb9ce61ad749983d68dd71e, /w/export/graphs/30e90887e06b6ef7b9936cf8fd697f2b897eb5ef, /w/export/graphs/34b5dd6b5593b7ed5266c4cc5c276bd7e1e6eba5, /w/export/graphs/370e83a8a39de4eef7ff50d1aabf2286b36d7945, /w/export/graphs/383dea747472960d92ea6a880bbbad6a7b58451f, /w/export/graphs/3892b6208e41d31fc36dc8f92d7793413a546e2c, /w/export/graphs/3fff69e0d977be8cc3df1ad1dd60369653dfb125, /w/export/graphs/414da6526799a27e84c85c5b9f7b0d8ff489a34b, /w/export/graphs/436e1809608205549db164ceea321f56d31aee9f, /w/export/graphs/4953f1a8df8f4921e6ee142cae358134fe3752bd, /w/export/graphs/4f28f33f1ab232529af0e6cd3c4271e9d8da80ec, /w/export/graphs/5356305eb53b0cb988ca2312b09d232866a5728f, /w/export/graphs/5616f17641422c1f509fa9150e5776d56b13c92e, /w/export/graphs/5dd258aaeb520d43daaece0756b73e3f55c47b40, /w/export/graphs/5f44fac522b88c60ee7bcfa2346749e0633bbec8, /w/export/graphs/6ad09848b33a02a4367c5d72f056f009d7dcbb86, /w/export/graphs/6c2ef8248d9427680cd7651871e6490ac024493c, /w/export/graphs/6cd54ed2a66fe957632212626cdb6ec97b346963, /w/export/graphs/7006d5a38dd79fd64c4f62768115950dffe65014, /w/export/graphs/7133e9e011eb2333e19672e299da0f55b0feaa60, /w/export/graphs/74098bbd47d208184a7e919b2d41f4bea42c2458, /w/export/graphs/76061e00d177d590fa8863d86c377fb1cbd9c858, /w/export/graphs/76525fbfba8434b23dd336d79807203521ba006b, /w/export/graphs/789d522079fbbbf3a7169cbc844131bb6ffeaec9, /w/export/graphs/7b2e4646aa1e6ec45f08ba6f692447060bca2003, /w/export/graphs/7b395a5dc9d94a7bbc2256c53166617ef23defd2, /w/export/graphs/7d567c7bbc046b70fb3b667e687fd4d9a12352b0, /w/export/graphs/80746425dff60d61172b594b6c1bb339c32c6e78, /w/export/graphs/83d80e8516b0f4778b976b94e4759568852d0914, /w/export/graphs/8d4a7981766d3bb1e190e2a267a3f800e6a507ef, /w/export/graphs/8fb7d33535dd392c1c1869d34847ac5427daba8b, /w/export/graphs/9365c23715bd07223d17386d34af9fb6ea24e8ef, /w/export/graphs/963776a7739f601a672e5b15c452f4ed493d48f7, /w/export/graphs/9712da443a04fa089cd18b35d23b6a7eb5dabcc7, /w/export/graphs/9bffc57c09d1ec5b14cb8adc0a42c55bc4d27adc, /w/export/graphs/9e22a61ad46d391b05b4a4945132bdae3272721b, /w/export/graphs/a440db383ccb900d85952edbf85c2b728fb7dfed, /w/export/graphs/a60a0a696389b1bfa9efc4a24ba3059b2ff8b6d2, /w/export/graphs/a855d552716cf9a2c2bddb772029fedc6847f5e0, /w/export/graphs/b3e7c518e654650dc504bf9c5bd713699ce4af67, /w/export/graphs/b71a3999b94bbb9841a4d7b71068fc9f0dce9181, /w/export/graphs/c1eb31b8975a1b70244bfa2f1da48f71f121969c, /w/export/graphs/c27bb399279fcc71626fc3c9da69a3000abbaa06, /w/export/graphs/c3754ddec989a8a10e7912e94dff32cb6b40d68a, /w/export/graphs/c79bec77a7c53507b70bc4c822dececfb9d825b8, /w/export/graphs/c99e6b0172b19bdabd2343a113918a3918e13aa6, /w/export/graphs/cdf04549269ad6f32a61cc329cc1ed4dd9600735, /w/export/graphs/d03f2773b4ee8fb60bb8f66b6bcb9b8922a64e04, /w/export/graphs/da9d2f36fea02795a4ee33670b785cb15dac77e3, /w/export/graphs/e5f93471dce705010aa447b0ae6f9ecb25bf5afc, /w/export/graphs/ed309767a24f5f89894576d4054505a99d601334, /w/export/graphs/edcf8f30ac070b1b3b88eaa10af8f3de8f00a157, /w/export/graphs/eddc5c6a216cd380d528579e0cb2ab25d036086f, /w/export/graphs/f1ee0c5b41117a04e969f14af4e88423e643ed1a, /w/export/graphs/f286ec634c35f99319436980e6b4ce1ace1b4dc0, /w/export/graphs/f4b9ad99c34af8bddd6d5e07d6974310dc47496f, /w/export/graphs/f57288f1f9a18e41171b0c5be0b0f20674fb4c42); kge-H1 (7; /w/export); kge-H1P (2a; /w/export); kge-H1R (2b; /w/export); stage B's kge-B1 mounted it as well (its record above). Every other container of the lists mounts no export/ folder.

