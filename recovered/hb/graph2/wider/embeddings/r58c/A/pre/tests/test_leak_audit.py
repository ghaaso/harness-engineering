"""Plumbing test of train/leak_audit.py (ruling 60), run in a CPU container (ktest-N) with git and the raw facts cache.
The audit over both splits must pass; then each kind of violation must be caught: a tune task served by a LATER
checkpoint (c1, c2, c3), a held-out parent served by a later held-out checkpoint (c2, c3), and a launcher that mounts
a folder under sealed/ (c5). It reads plan.json, tune_tasks.jsonl, the ids/parents of build/tasks/tasks.jsonl, the
raw facts cache and git; it opens nothing under sealed/ (a sealed PATH in a fake launcher is classified by name).
Ruling 72: the audit must also list every file of the mounted eval/ folder with its class (tune truth file by file,
eval/git/pilot_commits.json included) and the code lines showing that training takes no task and scoring takes only
(task id, seed, candidates), with no line of the training/scoring code reading a task's truth key. The pre-ruling-72
audit (r58b/pre/leak_audit.py) wrote neither: fail before.
This round (review audit-result-3, ruling 78; fail before on r58b/pre2/leak_audit.py, the previous round's bytes):
  * run with its defaults (no launcher, no parts) the audit FAILS on coverage; the previous audit passed vacuously;
  * coverage passes only with a launcher per role and the planned parts rows (--test --expect-rows on a stable copy of
    the EOR test's synthetic parts, r58b/out/leak_parts: 2 configs x 3 seeds x 388 tasks = 2,328 rows);
  * ruling 78: the current heldout.sh (staged inputs, /w/heldout_inputs = r58b/out/hstage built by heldout_inputs.js
    from the 70 held-out parents) passes; the previous heldout.sh (whole facts cache and arms/common) fails, and so does
    a staged folder holding one extra facts folder; the previous audit passed both.
Runs with the repository, the facts cache and build/tasks/tasks.jsonl mounted read-only (FIXFLOW_REPO, LEAK_LANE_HOST
name the host paths)."""
import os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import leak_audit as la
show_hashes('train/leak_audit.py', 'r58b/pre/leak_audit.py', 'r58b/pre2/leak_audit.py', 'train/heldout.sh', 'r58b/pre2/heldout.sh')
REPO = os.environ.get('FIXFLOW_REPO', 'C:/Users/User/Documents/projects/EMS_workshop1')
B = os.path.normpath(os.path.join(ROOT, '..', '..', 'build')).replace('\\', '/')
LANE_HOST = os.environ.get('LEAK_LANE_HOST') or os.path.normpath(ROOT).replace('\\', '/')
D = fresh(os.path.join(OUTR, 'leak_test'))
SCRIPTS = [os.path.join(ROOT, 'orchestrator', 'guard-stageB.sh'), os.path.join(TRAIN, 'heldout.sh')]
core = ['--repo', REPO, '--facts', B + '/facts/cache', '--heldout-tasks', B + '/tasks/tasks.jsonl', '--lane-host', LANE_HOST]
base = core + ['--scripts', ','.join(SCRIPTS), '--mounts', os.path.join(OUTR, 'inspect-kge-B1.json'), '--parts', os.path.join(TRAIN, 'stageB', 'parts'), '--test']
res = la.main(base + ['--out-md', os.path.join(OUTR, 'AUDIT-leak.md'), '--out-json', os.path.join(OUTR, 'leak_audit.json')])
sp = res['splits']
check('leak_real_pass', not res['failures'] and res['ruling78']['ok'] and sp['tune']['tasks'] == 388 and sp['heldout']['tasks'] == 418
      and res['c4_parts']['ok'] == res['c4_parts']['task_rows'] > 0,
      'tune', sp['tune']['checkpoints'], 'checkpoints', sp['tune']['tasks'], 'tasks; held-out', sp['heldout']['checkpoints'], sp['heldout']['tasks'],
      '; parts rows (stage B still training, so coverage is short)', json.dumps(res['c4_parts']), '; mount rows', len(res['mounts']))
check('leak_heldout_launcher_mounts_clean', all(m['cls'] == 'clean' for m in res['mounts'] if m['container'] == 'held-out')
      and any(m['container'] == 'held-out' for m in res['mounts']), [m['dest'] for m in res['mounts'] if m['container'] == 'held-out'])
check('leak_no_grep_pseudo_mount', not any('kge-B1' in m['host'] for m in res['mounts']), 'a `grep -v` is not a mount')
# ---- ruling 72: the eval/ folder file by file, and the code lines
ef = {e['file']: e for e in res['eval_files']}
walk = sorted(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/') for dp, dn, fn in os.walk(os.path.join(ROOT, 'eval'))
              if '__pycache__' not in dp and 'sealed' not in dp for f in fn)
tt = sorted(f for f, e in ef.items() if e['cls'] == 'tune truth')
check('r72_every_eval_file_listed', sorted(ef) == walk and all(sha(os.path.join(ROOT, f)) == e['sha256'] for f, e in ef.items()),
      len(ef), 'files; tune truth:', tt, '; derived:', sorted(f for f, e in ef.items() if e['cls'].startswith('derived')))
check('r72_tune_truth_named', set(tt) == {'eval/tune_tasks.jsonl', 'eval/tune_commits.jsonl', 'eval/git/pilot_rows.tsv', 'eval/git/june_namestatus.txt',
                                          'eval/git/pilot_commits.json'} and all(ef[f]['why'] for f in tt) and res['eval_mounted_in'],
      'eval mounted in', res['eval_mounted_in'])
ce = res['code_evidence']
has = lambda f, t: any(c['file'] == f and c['text'].startswith(t) for c in ce['lines'])
need = [('train/stageB.py', 'def load_tasks'), ('train/stageB.py', 'def score_tasks'), ('train/kge.py', 'def train'), ('train/kge.py', 'def score')]
check('r72_code_lines', all(has(f, t) for f, t in need) and any('kge.score(reps_path, [(tid, t[\'seed\'], cands[sc]' in c['text'] for c in ce['lines'])
      and any('kge.train(arm, c[\'cfg\'], seed, C' in c['text'] for c in ce['lines']) and ce['truth_key_reads'] == [] and ce['ok'],
      ['%s:%d' % (c['file'], c['line']) for c in ce['lines']], 'truth-key reads', ce['truth_key_reads'])
check('r72_truth_read_detector', bool(la.TRUTH_READ.search("x = t['truth']")) and bool(la.TRUTH_READ.search('t.get("truth")')) and not la.TRUTH_READ.search("t['task_id']"),
      'a planted truth-key read is caught')
md = open(os.path.join(OUTR, 'AUDIT-leak.md')).read()
check('r72_audit_md_lists_them', '### Tuning truth inside the mounted eval/ folder (ruling 72)' in md and all(('| %s | ' % f) in md for f in ef)
      and '`train/kge.py:' in md and 'read a task\'s truth key: none.' in md, 'AUDIT-leak.md section present with', len(ef), 'rows')
PRE = load_module('leak_audit_pre', os.path.join(ROOT, 'r58b', 'pre', 'leak_audit.py'))
PRE.HERE = la.HERE  # the snapshot folder holds only the .py; its defaults (plan, kge.py) are train/'s
pbase = [x for x in base if x != '--test']
rp = PRE.main(pbase + ['--out-md', os.path.join(D, 'pre.md'), '--out-json', os.path.join(D, 'pre.json')])
check('r72_pre_listed_no_eval_files', 'eval_files' not in rp and 'code_evidence' not in rp and 'ruling 72' not in open(os.path.join(D, 'pre.md')).read()
      and 'eval/git/pilot_commits.json' not in PRE.TUNE_TRUTH, 'fail before: the pre-ruling-72 audit had no eval listing, no code lines, and missed pilot_commits.json')
plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
g = la.Git(REPO)
tp = sorted(set(plan['assignment']), key=g.key); hp = sorted(set(plan['heldout']['assignment']), key=g.key)
P, C = tp[10], tp[20]
r = la.main(base + ['--out-md', os.path.join(D, 'a.md'), '--out-json', os.path.join(D, 'a.json'), '--override-assign', 'tune:%s=%s' % (P, C)])
f = [x for x in r['failures'] if x.get('parent') == P and 'c3' in x]
f4 = [x for x in r['failures'] if x.get('parent') == P and x.get('c4') is False]
check('leak_catches_later_tune_checkpoint', not r['ok'] and f and all(not x['c3'] and not x['c2'] for x in f) and any(not x['c1'] for x in f) and len(f4) > 0,
      'tasks failed', len(f), 'c1/c2/c3', [(x['c1'], x['c2'], x['c3']) for x in f][:3], '; parts rows off their planned checkpoint (c4)', len(f4))
P2, C2 = hp[5], hp[15]
r = la.main(base + ['--out-md', os.path.join(D, 'b.md'), '--out-json', os.path.join(D, 'b.json'), '--override-assign', 'heldout:%s=%s' % (P2, C2)])
f = [x for x in r['failures'] if x.get('parent') == P2 and 'c3' in x]
check('leak_catches_later_heldout_checkpoint', not r['ok'] and f and all(not x['c3'] and not x['c2'] for x in f), 'tasks failed', len(f))
fake = os.path.join(D, 'fake-heldout.sh')
open(fake, 'w').write('W=C:/x/hb/graph2/build\ndocker run --rm -v $W/sealed/refs:/s:ro -v $W/tasks/tasks.jsonl:/t:ro img true\n')
r = la.main(base[:base.index('--scripts') + 1] + [fake] + base[base.index('--scripts') + 2:] + ['--out-md', os.path.join(D, 'c.md'), '--out-json', os.path.join(D, 'c.json')])
bad = [m for m in r['mounts'] if not m['ok']]
check('leak_catches_sealed_mount', not r['ok'] and len(bad) == 1 and bad[0]['cls'] == 'heldout_truth' and '/sealed/' in bad[0]['host'], [m['host'] for m in bad])
check('leak_override_needs_test', exits(la.main, pbase + ['--out-md', os.path.join(D, 'x.md'), '--out-json', os.path.join(D, 'x.json'),
                                                        '--override-assign', 'tune:%s=%s' % (P, C)]) != 0, 'refused without --test')
# ---- audit-result-3: a vacuous audit is a FAIL (fail before: the previous audit passed with its defaults)
PRE2 = load_module('leak_audit_pre2', os.path.join(ROOT, 'r58b', 'pre2', 'leak_audit.py')); PRE2.HERE = la.HERE
rd = la.main(core + ['--out-md', os.path.join(D, 'd.md'), '--out-json', os.path.join(D, 'd.json')])
rd_pre = PRE2.main(core + ['--out-md', os.path.join(D, 'd_pre.md'), '--out-json', os.path.join(D, 'd_pre.json')])
check('ar3_defaults_fail_on_coverage', not rd['ok'] and not rd['failures'] and set(rd['coverage']['problems']) == {
      'no launcher script for the stageB role', 'no launcher script for the heldout role', 'tune parts rows 0, planned 17460', 'heldout parts rows 0, planned 1254'}
      and rd['test'] is False, rd['coverage']['problems'], '; ruling78', rd['ruling78']['problems'][:1])
check('ar3_pre_passed_vacuously', rd_pre['ok'] is True and rd_pre['c4_parts']['task_rows'] == 0 and rd_pre['mounts'] == [],
      'fail before: the previous audit said ok =', rd_pre['ok'], 'with 0 parts rows and 0 mount rows')
lp = os.path.join(OUTR, 'leak_parts', 'parts')
rc_ = la.main(base[:base.index('--parts') + 1] + [lp] + base[base.index('--parts') + 2:] + ['--expect-rows', 'tune=2328,heldout=0',
                                                                                             '--out-md', os.path.join(D, 'e.md'), '--out-json', os.path.join(D, 'e.json')])
check('ar3_covered_run_passes', rc_['ok'] and rc_['coverage']['ok'] and rc_['c4_parts']['by_split'] == {'tune': 2328} and rc_['test'] is True
      and rc_['ruling78']['staged'] == dict(facts=70, trees=70, blobs=1060, common_other=[]),
      json.dumps(rc_['coverage']), json.dumps(rc_['ruling78']))
rshort = la.main(base[:base.index('--parts') + 1] + [lp] + base[base.index('--parts') + 2:] + ['--expect-rows', 'tune=2329,heldout=0',
                                                                                               '--out-md', os.path.join(D, 'f.md'), '--out-json', os.path.join(D, 'f.json')])
check('ar3_one_row_short_fails', not rshort['ok'] and rshort['coverage']['problems'] == ['tune parts rows 2328, planned 2329'], rshort['coverage']['problems'])
# ---- ruling 78: the previous heldout.sh mounted the whole facts cache and arms/common (with its source store)
old = [os.path.join(ROOT, 'orchestrator', 'guard-stageB.sh'), os.path.join(ROOT, 'r58b', 'pre2', 'heldout.sh')]
rg = la.main(base[:base.index('--scripts') + 1] + [','.join(old)] + base[base.index('--scripts') + 2:] + ['--out-md', os.path.join(D, 'g.md'), '--out-json', os.path.join(D, 'g.json')])
rg_pre = PRE2.main([x for x in base[:base.index('--scripts') + 1] + [','.join(old)] + base[base.index('--scripts') + 2:] if x != '--test']
                   + ['--out-md', os.path.join(D, 'g_pre.md'), '--out-json', os.path.join(D, 'g_pre.json')])
p78 = rg['ruling78']['problems']
check('r78_old_launcher_fails', not rg['ok'] and any('facts/cache' in x for x in p78) and any('arms/common' in x for x in p78)
      and any('/gt/facts' not in x and 'staged source' in x and 'facts/cache' in x for x in p78), p78[:4])  # its /gt/facts is the whole cache, outside the staging
check('r78_pre_audit_passed_old_launcher', 'ruling78' not in rg_pre and not any(not m['ok'] for m in rg_pre['mounts']),
      'fail before: the previous audit marked every mount of the old heldout.sh clean, the whole facts cache included')
# a staged folder with one extra facts folder (a tune parent) and one extra blob
F = fresh(os.path.join(OUTR, 'fstage'))
for Pp in plan['heldout']['assignment']: os.makedirs(os.path.join(F, 'facts', Pp))
os.makedirs(os.path.join(F, 'facts', tp[0]))
os.makedirs(os.path.join(F, 'common', 'srcstore', 'trees')); os.makedirs(os.path.join(F, 'common', 'srcstore', 'blobs'))
for Pp in plan['heldout']['assignment']: json.dump({'a.py': 'ab' * 20}, open(os.path.join(F, 'common', 'srcstore', 'trees', Pp + '.json'), 'w'))
open(os.path.join(F, 'common', 'srcstore', 'blobs', 'ab' * 20 + '.txt'), 'w').write('x\n')
open(os.path.join(F, 'common', 'srcstore', 'blobs', 'cd' * 20 + '.txt'), 'w').write('y\n')
open(os.path.join(F, 'common', 'packer.js'), 'w').write('//\n')
fk = os.path.join(D, 'fake-heldout-78.sh')
rel = os.path.relpath(F, ROOT).replace(os.sep, '/')
open(fk, 'w').write('W=%s\nS=$W/%s\nRUN="docker run -d --name kge-H1 \\\n -v $S/facts:/gt/facts:ro -v $S/common:/gt/common:ro img true"\n' % (LANE_HOST, rel))
rf = la.main(base[:base.index('--scripts') + 1] + [','.join([SCRIPTS[0], fk])] + base[base.index('--scripts') + 2:] + ['--out-md', os.path.join(D, 'h.md'), '--out-json', os.path.join(D, 'h.json')])
pf = rf['ruling78']['problems']
check('r78_extra_staged_folder_fails', not rf['ok'] and any('71 folders, 1 not a held-out parent' in x for x in pf) and any('1 unnamed' in x for x in pf), pf)
shutil.rmtree(os.path.join(F, 'facts', tp[0])); os.remove(os.path.join(F, 'common', 'srcstore', 'blobs', 'cd' * 20 + '.txt'))
rf2 = la.main(base[:base.index('--scripts') + 1] + [','.join([SCRIPTS[0], fk])] + base[base.index('--scripts') + 2:] + ['--out-md', os.path.join(D, 'i.md'), '--out-json', os.path.join(D, 'i.json')])
check('r78_exact_staged_folder_passes', rf2['ruling78']['ok'], rf2['ruling78'])
check('r78_host_norm', la.host_norm('/c/Users/x') == 'C:/Users/x' and la.host_norm('/run/desktop/mnt/host/c/U/y') == 'C:/U/y' and la.host_norm('C:/a') == 'C:/a',
      'inspect sources in /c/ and Docker Desktop form map to C:/')
md = open(os.path.join(D, 'e.md')).read()
check('ar3_md_states_coverage_and_r78', 'Coverage (a vacuous audit fails): ok.' in md and 'Ruling 78 (held-out mounts' in md, 'AUDIT-leak.md lines present')
ok = finish('leak-audit')
sys.exit(0 if ok else 1)
