# AUDIT (embeddings lane, addendum 8) -- TEST OUTPUT

Written 2026-11-15T13:51:51Z by r58c/write_audit_claims.py (sha256 d299f772125ede20b763b1ed9dfdfd0b9e65d44034c885167477017c37ed1352), a draft writer; it computes no result: every row below is read from the files listed under Inputs.

Test markers found (test mode lists them; the real run refuses): tune: /plan_hash is the r58 test plan hash; tune: /stamp/plan_hash is the r58 test plan hash; item22: /test is true; item22: /plan_hash is the r58 test plan hash; answer: /test is true; answer: /plan_hash is the r58 test plan hash; answer_graded: /test is true; tune_rank: /test is true; leak: /test is true; leak: /plan_hash is the r58 test plan hash; item27: /plan_hash is the r58 test plan hash; item27: /test is true; item27: contains 'fakeB'; heldout: /test is true; handoff: /test is true; plan: /plan_hash is the r58 test plan hash; route: /test is true; result_json: /item27/test is true; result_json: /test is true; RESULT.md: says TEST OUTPUT

## Inputs

| input | file | bytes | sha256 |
|---|---|---|---|
| answer | r58c/B/out/test_write_audit_claims/wac/in/answer/answer_level.json | 3410 | 420f1878c308130d229e525b489dd5772d5b3e74ec6498bde42250d3d01fcbac |
| answer_graded | r58c/B/out/test_write_audit_claims/wac/in/grader-returns/tune-item24.json | 2904 | 1a16593d3044e666f2e8a4ef7ca7c82ea980e4ddf2974e31515838b09867c883 |
| code:eval/evalcore.py | eval/evalcore.py | 16450 | 4054976ce935e081082cbeb6ef1ccc64d102a50a00ce61123ea0fd093d7da0ff |
| code:export/checkpoints.py | export/checkpoints.py | 9613 | 508c245f179345780a31e68fb4b2ce43b30540f2b66fe8046e689be83f602b4e |
| code:train/RUNLOG.md | train/RUNLOG.md | 79735 | 731199c9fe4e2579da2f9eca5a379e3efa051bad466899b0a61706558833794a |
| code:train/heldout.py | train/heldout.py | 63827 | f541b3ffac7ccdde3d361c546dba3530f29de12483692c8c13ed4b31323eabc3 |
| code:train/kge.py | train/kge.py | 37577 | 4b01984f085ec29c9c59e628c6016c326d526b0cb5407df5e6edc03155fb9e0f |
| code:train/proj.py | train/proj.py | 6661 | dcad14d5bb851e6bd44be69ee571cae0e465b6528718ebbabf67e007220400c9 |
| code:train/stageB.py | train/stageB.py | 26334 | 32c8c070938bd51400dcf233604d7ff51ea50a80a02184fdb04480009602ed23 |
| handoff | r58c/B/out/test_write_audit_claims/wac/in/heldout/HANDOFF.json | 603 | a3ccbcc41f9f9c34feb7628801f324ce9b087245cd6e7de56484ce354ee09177 |
| heldout | r58c/B/out/test_write_audit_claims/wac/in/grader-returns/heldout.json | 3156 | f2c7c2364abfc937ef30ac78caa2aa7a6ba620c0910d8f6913ff69cf133d60d0 |
| item22 | r58c/B/out/test_write_audit_claims/wac/in/item22/item22.json | 8351 | 7f12156e2a4671b1c15369610ea991b5441614e3eca9f4eae97dffd84607f1f2 |
| item27 | r58c/B/out/test_write_audit_claims/wac/in/fakeB/heldout/item27.json | 16610 | 3eed8a692154bcc428db9ed9ac8791428f2fb28dbbf15f7ceef2272c0e760b94 |
| leak | r58c/B/out/test_write_audit_claims/wac/in/leak_audit.json | 1028 | 3f44baf9e35a671ff2f2b9497964065aefa48b0dae6504f4f5d8c4ca90d38801 |
| leak_audit_py | train/leak_audit.py | 94752 | 1702acb35150c7eec67317996ab6e21800b8588a8325b63faec649c32eeb09f9 |
| plan | r58c/B/out/test_write_audit_claims/wac/in/fakeB/stageB/plan.json | 38526 | cbc238fe9cb676ae5f97109d2574184109300d21d7f739a02924e8bc5d55ac7a |
| protocol | <repo>/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md | 91376 | f30edd01599cd1efb3909f4f176a63a4544061aa8cc62d9ee88eb386a60a109f |
| result_json | r58c/B/out/test_write_audit_claims/wac/result49/result.json | 137642 | 2af5c930f42e75f21775a064d4968dcd0a396c5abc8a8a86d32bef467f66f9de |
| result_md | r58c/B/out/test_write_audit_claims/wac/result49/RESULT.md | 26597 | e5b0e1ed4ba8eebf56d0c4ccd8635befb8471bf9d76f87bade30530ad4c9af54 |
| route | r58c/B/out/test_write_audit_claims/wac/in/e5_route.json | 644 | 13f83ca5890f78471942e9beae8514266e6f35cafcdf9e19280db3ba5a4bf0cd |
| tune | r58c/B/out/test_write_audit_claims/wac/in/fakeB/report/tune.json | 257503 | 38bc037b07212a50ccd50f8e13995bd08b7988f7bae7ddc111ac4410a079e9fb |
| write_result | train/write_result.py | 60688 | cd2bd6f95e1c1afdb67e161af7fdc27b101a86867864c9e17907d98dc49a0f1b |
| writer | r58c/B/pre-r105/write_audit_claims.py | 84092 | d299f772125ede20b763b1ed9dfdfd0b9e65d44034c885167477017c37ed1352 |

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

**E1, a note (r58c/closed-lists/FINDINGS-common.md, the coordinator):** `ranked_sha` (build/arms/common/harness.js:384) hashes integer node ids, which shift when the new nodes sort in (facts.js:62-63). No lane or common code compares it.

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

- item27.json sha256 3eed8a692154bcc428db9ed9ac8791428f2fb28dbbf15f7ceef2272c0e760b94; item27.json.sha256 says 3eed8a692154bcc428db9ed9ac8791428f2fb28dbbf15f7ceef2272c0e760b94 (match).
- chosen E2 c07, w 1.0, epochs 20, s 1, device cpu, image sha256:wr-test; plan_hash 7e577e577e577e577e577e577e577e577e577e577e577e577e577e577e577e57; test True.
- tables r58c/B/out/test_write_result/wr/fakeB/stageB/tables, tables_digest 9121ff642643e61dd4ab29ce19d5dab0d3b17942213c0632dd565328c3a0bc11; choices.json sha256 per arm {"E1": "df0872b439a334dcfb4014ac518e473c7c4f9c422abbcf0de628289db6eb55e4", "E2": "960fb0bbce6c540828720a2aabec716d97255d40aabd725c9a74e006e2d12a04", "E3": "6e6f7cf0e61ee2c75778150be1aeb3e5ea36fe4cbd3db0908a12a7c14f17fc11", "E4": "bca7f27a55497b0784359dc658a7858828b5cc0b4aadda433befc1fd5eacb4ce", "E5": "220ef499ef95f9357769ca2144ac9a6fadaba7b6fb5560a9fdf4e9578720ac6e"}.
- HANDOFF.json: sha256 a3ccbcc41f9f9c34feb7628801f324ce9b087245cd6e7de56484ce354ee09177; its freeze_sha256 3eed8a692154bcc428db9ed9ac8791428f2fb28dbbf15f7ceef2272c0e760b94 (equals the record).
- The grader's literal check of ruling 73: not available to the lane (open question 5).

## 7. Assembled tables (assemble_checks, rulings 66, 67)

- RUNLOG line 923 names orchestrator/end-of-run/assemble_checks-20261115T123811Z.log (sha256 7b259bd1bad9590f6935dc12dd7357904acb4942dbb480f3f504c4088a3bae83).
- `assemble_checks PASS` in it: True; REFUSED line: False; sha256 of the current orchestrator/assemble_checks.py (ba0ca39de0ec3ba9edf90fe3428ef035957fd6557145d0f74e2fccad59343568) in it: True.
- tables_digest in the log ['f8cb1f8bc905bc74e4b50a9348f767e1f78a102516cf9567ee7df14a7593ffe0']; on the RUNLOG PASS line f8cb1f8bc905bc74e4b50a9348f767e1f78a102516cf9567ee7df14a7593ffe0 (equal to the log); of the current tables not computed in test mode.
- Runner lines in the log (first 20):
  - `assemble_checks PASS: 2385 parts (477 E4), arms ['E1', 'E2', 'E3', 'E4', 'E5'], runners per arm {'E1': 1, 'E2': 1, 'E3': 1, 'E4': 1, 'E5': 1}`

## 7b. Stage-B memory caps (ruling 98)

> 98. The cap of the remaining stage-B units is 4 GB (item 2's maximum; ruling 43's 2560m is amended for them). Measured on 2026-11-15: the container ran E4 c12 (159 units) and the first 39 units of c13 in one process and was then killed by the kernel at the 2560m cap (exit 137) at 05:55:39Z; each relaunch since has finished exactly one unit and been killed about twenty seconds into the next (05:59:07Z, 06:02:32Z), because the process still holds the first model's memory when the second is built on the larger checkpoints. At one unit per launch the 279 units left would take about sixteen hours, and a launch that finished none would stop the guard. The cap changes no result: it limits memory, not arithmetic; E4 is deterministic (rulings 67 and 87), and the re-run check of the end order trains one c13 and one c16 unit again in a fresh process and compares them byte for byte with the parts made under either cap. The guard script is not edited: its cap is read from the environment, so the same file (sha256 59d3fb8e...) is started with the cap set to 4g, and its start line records it. The guard's memory and disk lines are unchanged. AUDIT.md lists which units ran under which cap, from the guard log, and the result's limits carry this ruling beside ruling 43. If the container is still killed under 4 GB, the lane reports and changes nothing further.

Not available: train/progress.jsonl or orchestrator/guard-stageB.log was not given (test mode).

## 8. Disclosures reported as they are

**Ruling 47:** 47. When the choice was made: the owner approved the card at 08:35Z on 2026-11-14, with 76 of 80 stage-A units finished (E5 c13-c16, none later in E5's top 3, still running); this section was written after stage A finished. Stage A's selection scores (validation MRR on its held-out pairs; they decide only which three configurations go on, item 19) had been seen. No stage-B unit and no task-level embedding score existed then or when this section was accepted. The device was chosen for wall time, and s from the card's timing alone (ruling 44), not from any score. Disclosed: E4's initialisation fix (ruling 42) followed the card sanity runs that showed E4 at 0.209 and 0.555. The fix was kept because it makes E4's initial weights bit-identical to the CPU's, which variant A did not. The validation MRRs of both variants (means 0.626 and 0.683; CPU 0.661) were seen before it was kept.

**Ruling 69:** 69. Two containers, accepted under ruling 66 with conditions. Measured: deterministic E4 beside E1 1.50 times, E1 beside E5 1.23 times, E3 beside E2 1.63 times, with ruling 68's equality on every finished unit (199 units: 5 of the 15 settings, seed 1, two checkpoints). Stage B starts in one container (B) in the order E1, E5, E2, E3, E4. A second container (A) may take E4 over, before any E4 unit has run, once all of these hold: (i) a two-container guard exists and passes its tests; (ii) on the real tree, deterministic E4 c12, c13 and c16 have each trained the smallest checkpoint at seed 1 twice with ruling 68's equality; (iii) the coordinator has written `orchestrator/equality-accepted.json`. From then on each model type belongs to exactly one container, B is relaunched without E4, and each container writes its own progress file. Container A starts only after three samples with at least 6 GB free RAM and commit under 38 GB, and it gives way first: it is stopped after three samples with commit over 41 GB or free RAM under 4 GB, while B keeps ruling 43's lines. For each setting, one finished unit is re-run and compared under ruling 68 during the run; a mismatch stops side-by-side running for that model type at once and its parts made side by side are redone alone. If A never starts, B trains E4 last, deterministic, alone.

Ruling 69's rerun comparisons: not located by this draft (open question 4).

## 9. Rehearsals and mount records (ruling 86(b); ruling 94(e), (f); ruling 95)

> 86. The card window (rulings 79 and 67 applied; it comes after stage B has left the card and before the code freeze). (a) The ruling-79 probe runs on the card under the 4 GB cap and records, for each of the fifteen settings, the container's peak memory, the process's peak memory and the card's peak reserved memory against its total. One further probe process runs the whole unit path (train, score, assemble, rank, pack) on synthetic tasks for the setting with the highest peak. A container peak above 3.5 GB or a card peak above 10 GB is reported to the coordinator before anything else runs. (b) A rehearsal of the held-out driver in test mode: three tuning parents (the smallest, one without a co_changed fact, the largest), the GPU image, the card, the 4 GB cap, test records for E4 (c13 or c16, deterministic), for E5 and for one of E1 to E3, a `docker stop` in the middle of a unit followed by a relaunch, and a stopped leftover container before a launch. It writes only under a scratch folder and reads no real table and no held-out graph. Its logs are kept and listed in AUDIT.md, which also names what it cannot cover: the real record and anchor, the 70 real graphs, wall time.

> 94. Mounts of the end sequence's containers (ruling 72 applied to END-ORDER.md). As written, the launcher of the real steps mounts the whole repository, with its history, and the whole facts cache into every container. The history and the later facts hold what the held-out commits changed. Unlike `export/` in stage B (ruling 89) this has not happened yet and can still be done right. So: (a) the containers of the card window and of steps 4 to 8 (the probe, the rehearsal, the re-run check, selectB, report, the tuning hand-off, item27, the held-out run and both pre-checks) mount neither the repository nor the whole facts cache. (b) The tuning hand-off mounts a staging of the facts and the source store of the late-50 tuning parents only, built and hashed before the code freeze like the held-out staging; its manifest is in the freeze list and is verified before use. (c) Only containers that run after the grader has returned the held-out result may mount the repository's history and the whole facts cache, and only the leak audit does: it has to read history to do its work. The result writer and the audit writer mount the deliverable folder and the protocol file, not the repository. (d) Each step has a fixed list of allowed (host folder, destination) pairs in the launcher. (e) The mount record (`docker inspect`) of every container of every step, tests excluded, is saved, passed to the leak audit and listed in AUDIT.md; the audit fails if a container of the card window or of steps 4 to 8 has a mount outside its step's list. (f) `export/` stays mounted where a step needs the graphs, under ruling 89's per-use rule, and AUDIT.md says so.

> 95. Ruling 94(e), made exact. The leak audit runs before item 22, the result writer and the audit writer, and its output is an input of the last two, so their mount records cannot exist when it runs. Point (e) therefore reads: the mount record (`docker inspect`) of every container of the end sequence, tests excluded, is saved. The records of the containers that ran before the leak audit (the card window and steps 4 to 8) are passed to it, and the audit fails if one of them is missing or shows a mount outside its step's list. The records of the containers that run after it (item 22, the result writer, the audit writer) are saved in the same way and listed with their sha256 in AUDIT.md by the audit writer, except its own, whose record and launcher line the coordinator's independent audit of step 10 checks against the launcher's fixed list. The fail clause of ruling 94 is unchanged.

### 9a. The held-out driver's rehearsal (END-ORDER 2b): logs and container records

| file | bytes | sha256 |
|---|---|---|
| r58c/rehearsal/E1-launch2.out | 4590 | e82a556e8b258882935f29d41c48ccc2119eaa8c1ea7231ddeeeeb237185256b |
| r58c/rehearsal/E4-launch1.out | 4180 | 305f2a39f608766c484060342383eb8a08f9c775d7c681d9ee708a2e4ecd02c0 |
| r58c/rehearsal/E4-launch2.out | 4590 | 92dd1e21c52ce52c1dec3db5b53062c0516b886d099542b4fe87d86885e5735c |
| r58c/rehearsal/E5-launch2.out | 4590 | f47b4b4a3c75d0931e81e9b98252c87d956010b1bcb4a1cd3a762705c04eafc6 |
| r58c/rehearsal/INJ-launch2.out | 4595 | 861a88c2dd85a1f272959d7622e272fe1cefd2427d884609e4e53a4427aef133 |
| r58c/rehearsal/REHEARSAL.txt | 1050 | d13ead7ae24314a803b6acdcd3202d18209eb914b8dfc4d80e49c8992218473a |
| r58c/rehearsal/E1/heldout.log | 1527 | 5e46ed6188bc1a8ff8686616c2c3cd6e0a680b233925b89f47898347c92a9ebf |
| r58c/rehearsal/E1/heldout.rc | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| r58c/rehearsal/E1/rec/progress.jsonl | 277 | 3b1a62a40891d3527134fb352d92c8149c6f1d906b9cdbe97e9eb3d6a9452b24 |
| r58c/rehearsal/E1/run/HANDOFF.json | 11025 | fdf9429ce1b9cc27ff9fe57fb2990ec95e824eef6096f74c879f106ea8e75da4 |
| r58c/rehearsal/E1/run/progress.jsonl | 8528 | 2a7af009b77c299c4688bbc7ab0fa33c228c2625f6d004d602499b4d1f8972eb |
| r58c/rehearsal/E4/heldout.log | 1874 | 85977e2209ed1727790a97e821bb1b93ae7e3ba5bd76691fb5ea5fb5a9487bd7 |
| r58c/rehearsal/E4/heldout.rc | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| r58c/rehearsal/E4/rec/progress.jsonl | 277 | 5c8b3455cb09c6481688688ec8e111fffc62320abeb51b8fff33966a131cfab9 |
| r58c/rehearsal/E4/run/HANDOFF.json | 11020 | 61f8e646bee992b14ab9a6fb2a925b3f9b496513dbcf016ae3dcb78f94fa068a |
| r58c/rehearsal/E4/run/progress.jsonl | 8754 | 69db7b8fcc0ee1f06c0b322547ba9b6dbb92be041a990d0d50b0cca9993f2fd3 |
| r58c/rehearsal/E5/heldout.log | 2823 | fdc68ab8f36404b332afdbb4ea2fce542e277be9929e47a4faf774e1805250e6 |
| r58c/rehearsal/E5/heldout.rc | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |
| r58c/rehearsal/E5/rec/progress.jsonl | 277 | f1b5af837bdede33b3304dbc7517a8675936893f154305d774e9f8f42f0f7850 |
| r58c/rehearsal/E5/run/HANDOFF.json | 11025 | 404615d55cf6820868785e644a7d80a3d6ce1215d99fc91279158ee3f7fd6ead |
| r58c/rehearsal/E5/run/progress.jsonl | 8528 | 75176d920c825f619639884a0fec5f17d56d9acf2d6e262b8e06ba62edbd6d39 |
| r58c/rehearsal/INJ/heldout.log | 8176 | d86be25680412d46adea73e8798fcb2bc9ba7bb970bb370df808346940a77502 |
| r58c/rehearsal/INJ/heldout.rc | 2 | 9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa |

### 9b. The interface rehearsal (END-ORDER 2e): logs and outputs

| file | bytes | sha256 |
|---|---|---|
| r58c/B/out/rehearsal/RESULT.md | 24240 | 6402e2729a6abf21d099036eb9f4090933d413fa0bd16d6be227d99d803b0956 |
| r58c/B/out/rehearsal/result.json | 93759 | 0a849ec8f2bf012f52d47692d8caed50450e79697b08702dfbc59e8054357fc6 |
| r58c/B/out/logs/wr_rehearsal.log | 1891 | d97d9940cf4d57ae7481dca4351ad0d69db32a26b10b8ac721af60d7974727b9 |

**What the rehearsals cannot cover:** the real item-27 record and its coordinator anchor, the 70 real held-out graphs, and the real run's wall time (ruling 86(b)); the rehearsals ran on three tuning parents with test records (2b) and on the grader's test set pick8, 8 late-50 commits and 37 tasks, with test flags (2e).

### 9c. Mount records (ruling 94(e)): the docker inspect of every container of every step, tests excluded

Mount lists: r58c/A/mounts-A.json sha256 92ba5af8e7a35aa0a4259f6a3ea5cb7f1e6de4cfeb48d0d02a3595528301cde5; r58c/B/mounts-B.json sha256 46ec08eef6e5ac62d6698d7e5204c6dfa4bcf24d4819a2b6c7ae8ad27af30880.

| container | list | step | record | bytes | sha256 |
|---|---|---|---|---|---|
| kge-R1 | B | 2c | r58c/mounts/kge-R1.json | 11427 | 7571038f64bebc279a7865a645c3c55f1181b17f4c9525a1d3b96eb60c20d10f |
| ktest-eor | B | 1 | r58c/mounts/ktest-eor.json | 12965 | 2cfc71225e065b2f27a60fc6f674ac8ae62dfd28a78973d7074d66968905e243 |
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
| kge-H1P | A | 2a | r58c/mounts/kge-H1P.json | 11893 | e0008daae7d8fc2f5a5c510278090545a3927c583355fd6fd26d49a8f14a63c0 |
| kge-H1Pc | A | 2a | r58c/mounts/kge-H1Pc.json | 7364 | 5f01b56715fa372444f9a6fce24d8f9768ae4338fc47c3e60338f709793fb760 |
| kge-H1R | A | 2b | r58c/mounts/kge-H1R.json | 15558 | 12d4227cf2a6314e5f052c3cbef11374e2f09bb06c204a0dfd5822998c9b8a22 |
| kge-H1Rc | A | 2b | r58c/mounts/kge-H1Rc.json | 7365 | 733ebffd4072b57a2e52cff1d0d9910606f6919e6531de7db1a545c3dad1a1d4 |
| kge-H1c | A | 7 | NOT FOUND | | |
| kge-B1 | stage B | stage B | orchestrator/kge-B1-inspect-20261114T190928Z.json | 9585 | 052cbfa0ec863e3bb9e2069e99eb97b58a358cb53ded44f803d73dde8d4235e6 |
| kge-B1 | stage B | stage B | orchestrator/kge-B1-inspect-20261115T073116Z.json | 9584 | cfc3cb7d79d20236f7d08a335a7771b6aea402de3267c12cca6afffbfb72f990 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1P.20261115T124639Z.json | 11893 | c1f9cadbd7c2b48bd1122afe1224de8e7ec46e684da546809d0ae034e214e017 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1Pc.20261115T124633Z.json | 7365 | ea8cbde82ad4f376bbd9bd51f4a28dc275d24f8db980b1576cf5be4e69538776 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1R.20261115T130259Z.json | 15548 | 753aae603a5407e561c6843515710299c95ab46b82bfd69dbea32c5f706b881f |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1R.20261115T130452Z.json | 15548 | b05bd25c156ff689725d76aa307243fc49fc801f841562203036de451a386b2b |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1R.20261115T130721Z.json | 15549 | f2450be856a7f3d8f7c551a8551def2a8efed9e356ddb49bd577f7183d346376 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1R.20261115T130915Z.json | 15549 | aefebccc23ed67f8ef2869ed7d99f4091fbd0693cc6c79014c26b8131cbfdfc1 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1Rc.20261115T130255Z.json | 7365 | b319ac82276df999dcef4ea599736f9992beb741c39c7c8b917834b0a164569d |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1Rc.20261115T130449Z.json | 7365 | c8f12b299c4dc9a03aceb083d7b89b44f659902c56d5861144e68ac1086977e7 |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1Rc.20261115T130717Z.json | 7365 | ae918a5bc15f13958cfc6426f920e6cd2a84a50e9bd5a7defcb4fabffce0bbcc |
| (an earlier record of a repeated step) | | | r58c/mounts/kge-H1Rc.20261115T130911Z.json | 7365 | 1bf48d617f1a54d874a88ff267e8cbf338cd4b60c0727c3350eb8242b2d268f8 |

**Ruling 95:** the records of the containers that ran before the leak audit were passed to it (step 9.1); the records of ktest-r11 (the E5 route audit (ruling 97)), ktest-r5 (item 22), ktest-r6 (the result writer), which ran after it, are listed above with their sha256; this writer's own record (ktest-r7) is not listed: the coordinator's independent audit of step 10 checks it.


**Ruling 94(f), export/:** export/ stays mounted only where a step reads graphs, under ruling 89's per-use rule (section 1): kge-R1 (2c; /w/export); ktest-r11 (9.2a; /w/export); ktest-r2 (4; /w/export); ktest-r4 (5; 38 export/graphs/<P> folders, read-only (ruling 102)); ktest-r5 (9.2; /w/export); ktest-r8 (5; 38 export/graphs/<P> folders, read-only (ruling 102)); ktest-r9 (8; 70 export/graphs/<P> folders, read-only (ruling 102)); kge-H1 (7; /w/export); kge-H1P (2a; /w/export); kge-H1R (2b; /w/export); stage B's kge-B1 mounted it as well (its record above). The whole lane, export/ with it: ktest-r10 (9.1; /w). Single export files pinned read-only, no graph folder (C43): ktest-eor (1; /w/export/checkpoints.py, /w/export/parents.jsonl, /w/export/parents_git.jsonl); ktest-r3 (6; /w/export/checkpoints.py, /w/export/parents.jsonl, /w/export/parents_git.jsonl). Every other container of the lists mounts nothing under export/.

