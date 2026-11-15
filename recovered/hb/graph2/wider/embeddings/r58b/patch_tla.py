import sys
p = sys.argv[1] + '/train/r58/tests/test_leak_audit.py'
s = open(p).read()
reps = [
("""raw facts cache and git; it opens nothing under sealed/ (a sealed PATH in a fake launcher is classified by name).\"\"\"""",
 """raw facts cache and git; it opens nothing under sealed/ (a sealed PATH in a fake launcher is classified by name).
Ruling 72: the audit must also list every file of the mounted eval/ folder with its class (tune truth file by file,
eval/git/pilot_commits.json included) and the code lines showing that training takes no task and scoring takes only
(task id, seed, candidates), with no line of the training/scoring code reading a task's truth key. The pre-ruling-72
audit (r58b/pre/leak_audit.py) wrote neither: fail before. Runs in a CPU container (ktest-N) with the repository,
the facts cache and build/tasks/tasks.jsonl mounted read-only (FIXFLOW_REPO, LEAK_LANE_HOST name the host paths).\"\"\""""),
("show_hashes('train/leak_audit.py')", "show_hashes('train/leak_audit.py', 'r58b/pre/leak_audit.py')"),
("LANE_HOST = os.path.normpath(ROOT).replace('\\\\', '/')", "LANE_HOST = os.environ.get('LEAK_LANE_HOST') or os.path.normpath(ROOT).replace('\\\\', '/')"),
("""plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
""", """# ---- ruling 72: the eval/ folder file by file, and the code lines
ef = {e['file']: e for e in res['eval_files']}
walk = sorted(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/') for dp, dn, fn in os.walk(os.path.join(ROOT, 'eval'))
              if '__pycache__' not in dp and 'sealed' not in dp for f in fn)
tt = sorted(f for f, e in ef.items() if e['cls'] == 'tune truth')
check('r72_every_eval_file_listed', sorted(ef) == walk and all(sha(os.path.join(ROOT, f)) == e['sha256'] for f, e in ef.items()),
      len(ef), 'files; tune truth:', tt, '; derived:', sorted(f for f, e in ef.items() if e['cls'].startswith('derived')))
check('r72_tune_truth_named', set(tt) == {'eval/tune_tasks.jsonl', 'eval/tune_commits.jsonl', 'eval/git/pilot_rows.tsv', 'eval/git/june_namestatus.txt',
                                          'eval/git/pilot_commits.json'} and all(ef[f]['why'] for f in tt) and res['eval_mounted_in'],
      'eval mounted in', res['eval_mounted_in'])
ce = res['code_evidence']; got = {(c['file'], c['text'].split('(')[0].split(' = ')[0][:40]) for c in ce['lines']}
need = [('train/stageB.py', 'def load_tasks'), ('train/stageB.py', 'def score_tasks'), ('train/kge.py', 'def train'), ('train/kge.py', 'def score')]
has = lambda f, t: any(c['file'] == f and c['text'].startswith(t) for c in ce['lines'])
check('r72_code_lines', all(has(f, t) for f, t in need) and any('kge.score(reps_path, [(tid, t[\\'seed\\'], cands[sc]' in c['text'] for c in ce['lines'])
      and any('kge.train(arm, c[\\'cfg\\'], seed, C' in c['text'] for c in ce['lines']) and ce['truth_key_reads'] == [] and ce['ok'],
      ['%s:%d' % (c['file'], c['line']) for c in ce['lines']], 'truth-key reads', ce['truth_key_reads'])
check('r72_truth_read_detector', bool(la.TRUTH_READ.search("x = t['truth']")) and bool(la.TRUTH_READ.search('t.get("truth")')) and not la.TRUTH_READ.search("t['task_id']"),
      'a planted truth-key read is caught')
md = open(os.path.join(OUTR, 'AUDIT-leak.md')).read()
check('r72_audit_md_lists_them', '### Tuning truth inside the mounted eval/ folder (ruling 72)' in md and all(('| %s | ' % f) in md for f in ef)
      and '`train/kge.py:' in md and 'read a task\\'s truth key: none.' in md, 'AUDIT-leak.md section present with', len(ef), 'rows')
PRE = load_module('leak_audit_pre', os.path.join(ROOT, 'r58b', 'pre', 'leak_audit.py'))
rp = PRE.main(base + ['--out-md', os.path.join(D, 'pre.md'), '--out-json', os.path.join(D, 'pre.json')])
check('r72_pre_listed_no_eval_files', 'eval_files' not in rp and 'code_evidence' not in rp and 'ruling 72' not in open(os.path.join(D, 'pre.md')).read()
      and 'eval/git/pilot_commits.json' not in PRE.TUNE_TRUTH, 'fail before: the pre-ruling-72 audit had no eval listing, no code lines, and missed pilot_commits.json')
plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
"""),
]
for a, b in reps:
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
open(p, 'w', newline='\n').write(s)
print('patched test_leak_audit.py')
