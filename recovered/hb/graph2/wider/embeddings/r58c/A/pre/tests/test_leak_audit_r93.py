"""Plumbing test of train/leak_audit.py (rulings 60, 72, 78, 81, 89; MF-8, MF-10, MF-11), run in a CPU container (ktest-a<N>)
with git, the raw facts cache and build/tasks/tasks.jsonl mounted read-only (FIXFLOW_REPO, LEAK_LANE_HOST name the host
paths). MF-8 / ruling 80: it reads NO real table and nothing under train/stageB/parts: the parts are a copy of the EOR
test's synthetic parts (r58b/out/leak_parts) in r58c/A/out, each given a meta.json naming its folder's checkpoint, and
the plan is the synthetic copy r58b/out/fakeB/stageB/plan.json (the real assignment, a fake plan_hash). The held-out
staging is r58b/out/hstage (mounted at /w/heldout_inputs), the probe staging r58c/A/fixtures/pstage (/w/probe_inputs,
built by the new heldout_inputs.js for the largest tuning parent). The stage-B mount evidence is ruling 89's capture
orchestrator/kge-B1-inspect-20261114T190928Z.json (sha256 pinned).
Fail before: r58c/A/pre/leak_audit.py (the bytes at the start of round r58c) and r58c/A/pre/heldout.sh.
Checks (one per defect): the cut lists (every file in the JSON, counts in the markdown); kge_reads_no_task_file's narrow
match (a planted np.load of a task file); unknown keys accepted; heldout.py missing from the code evidence; ruling 81's
exact allow-list (extra mount, ancestor mount, missing mount, per-commit folder of no parent, sealed/ and reference
paths); zero mount rows per role; inspect rows need Source and Destination; the task list pinned; C's raw history
non-empty and containing C; the --test default output off the real path; the ruling 81 disclosure count; ruling 89
(parts' meta checkpoints, graph sites, the pinned kge-B1 capture); real mode's EMB_ROOT check. The earlier rounds'
checks (c1-c5, coverage, ruling 72's eval listing) are kept."""
import os, sys, json, shutil, glob, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import leak_audit as la
show_hashes('train/leak_audit.py', 'train/heldout.sh', 'r58c/A/pre/leak_audit.py', 'r58c/A/pre/leak_audit_r89.py', 'r58c/A/pre/heldout.sh', 'train/kge.py', 'train/stageB.py',
            'orchestrator/kge-B1-inspect-20261114T190928Z.json')
REPO = os.environ.get('FIXFLOW_REPO', 'C:/Users/User/Documents/projects/EMS_workshop1')
B = os.path.normpath(os.path.join(ROOT, '..', '..', 'build')).replace('\\', '/')
LANE_HOST = os.environ.get('LEAK_LANE_HOST') or os.path.normpath(ROOT).replace('\\', '/')
GBH = LANE_HOST.rsplit('/', 2)[0] + '/build' if LANE_HOST.endswith('/wider/embeddings') else B
D = fresh(os.path.join(OUTR, 'leak_test'))
_GITS = {}  # one memoised git reader per repository across the audit runs below (keys do not depend on the run)
def _memo_git(mod):
    orig = mod.Git
    mod.Git = lambda repo: _GITS.setdefault((mod.__name__, repo), orig(repo))
_memo_git(la)
_WALK = {}  # the mounted trees do not change during the test: one walk per (function, arguments)
def _memo(name):
    orig = getattr(la, name)
    def run(*a, **k):
        key = (name, a, tuple(sorted(k.items())))
        if key not in _WALK: _WALK[key] = orig(*a, **k)
        return type(_WALK[key])(_WALK[key])
    setattr(la, name, run)
_memo("walk_files"); _memo("sha_folders")
GIT = la.Git(REPO)
PLAN = os.path.join(ROOT, 'r58b', 'out', 'fakeB', 'stageB', 'plan.json'); plan = json.load(open(PLAN))
B1 = os.path.join(ROOT, la.B1_INSPECT[0]); HM = [(GBH, B)]
# MF-8: the synthetic parts, copied into this round's folder, each with a meta.json naming its checkpoint
LP = os.path.join(fresh(os.path.join(OUTR, 'leak_parts')), 'parts'); shutil.copytree(os.path.join(ROOT, 'r58b', 'out', 'leak_parts', 'parts'), LP)
nparts = 0
for dp, dn, fn in os.walk(LP):
    if 'counts.json' in fn:
        a_, c_, s_ = os.path.relpath(dp, LP).split(os.sep)[:3]
        json.dump(dict(arm=a_, config_id=c_, seed=int(s_[1:]), checkpoint=os.path.basename(dp), plan_hash=plan['plan_hash'], synthetic=True),
                  open(os.path.join(dp, 'meta.json'), 'w')); nparts += 1
SCRIPTS = [os.path.join(ROOT, 'orchestrator', 'guard-stageB.sh'), os.path.join(TRAIN, 'heldout.sh')]
core = ['--repo', REPO, '--facts', B + '/facts/cache', '--heldout-tasks', B + '/tasks/tasks.jsonl', '--lane-host', LANE_HOST, '--plan', PLAN,
        '--host-map', GBH + '=' + B]
base = core + ['--scripts', ','.join(SCRIPTS), '--mounts', B1, '--parts', 'tune=' + LP, '--test', '--expect-rows', 'tune=2328,heldout=0',
               '--expect-parts', str(nparts)]
out = lambda n: ['--out-md', os.path.join(D, n + '.md'), '--out-json', os.path.join(D, n + '.json')]
check('mf8_synthetic_parts_only', nparts == 2 * 3 * 53 and LP.startswith(os.path.join(ROOT, 'r58c', 'A')) and 'train/stageB' not in ' '.join(base),
      'parts', nparts, 'under', os.path.relpath(LP, ROOT), '; no argument names train/stageB')
res = la.main(base + out('main'))
sp = res['splits']; r89 = res['ruling89']; r81 = res['ruling78']
check('leak_covered_run', not res['failures'] and res['coverage']['ok'] and r81['ok'] and sp['tune']['tasks'] == 388 and sp['heldout']['tasks'] == 418
      and res['c4_parts']['by_split'] == {'tune': 2328} and res['kge_reads_no_task_file']['ok'] and res['code_evidence']['ok'] and res['test'] is True,
      'coverage', res['coverage']['problems'], 'ruling 81', r81['problems'][:3], 'containers', json.dumps(r81['containers']))
check('r89_parts_name_tuning_checkpoints', r89['parts'] == dict(stageB=nparts, planned=nparts, heldout=0, problems=[]) and r89['site_problems'] == [],
      json.dumps(r89['parts']), r89['site_problems'][:3])
# ---- ruling 90: make_plan's held-out lineage read is listed under its own name and does not fail
md = open(os.path.join(D, 'main.md')).read()
r90s = r89['ruling90_sites']
check('r90_make_plan_site_listed', len(r90s) == 1 and r90s[0].startswith('train/stageB.py:') and r89['other_key_sites'] == [] and r89['ok'] and res['ok']
      and 'Ruling 90: the one read of held-out parents\' folders, %s' % r90s[0] in r89['text'] and ('Ruling 90 (listed, not a failure): the held-out lineage read at plan time, %s.' % r90s[0]) in md,
      'listed', r90s, '; ruling89.ok', r89['ok'], '; audit ok', res['ok'])
P89 = load_module('leak_audit_r89', os.path.join(ROOT, 'r58c', 'A', 'pre', 'leak_audit_r89.py')); P89.HERE = la.HERE
r89p = P89.ruling89(plan, ['tune=' + LP], True, nparts)
check('r90_pre_failed_on_the_site', not r89p['ok'] and ['%s:%d' % (s['file'], s['line']) for s in r89p['other_key_sites']] == r90s,
      'fail before: the ruling-89 bytes (r58c/A/pre/leak_audit_r89.py) failed on', ['%s:%d' % (s['file'], s['line']) for s in r89p['other_key_sites']])
FR = fresh(os.path.join(D, 'code90'))
for rel_ in la.STAGEB_CODE + la.LATER_CODE:
    os.makedirs(os.path.dirname(os.path.join(FR, rel_)), exist_ok=True); shutil.copyfile(os.path.join(ROOT, rel_), os.path.join(FR, rel_))
sb = open(os.path.join(ROOT, 'train', 'stageB.py'), encoding='utf-8').read()
open(os.path.join(FR, 'train', 'stageB.py'), 'w', encoding='utf-8').write(sb + "\n\ndef peek(P):\n    return open(os.path.join(kge.G0, P, 'triples.tsv')).read()\n")
s90a, p90a = la.graph_sites(la.STAGEB_CODE + la.LATER_CODE, root=FR)
open(os.path.join(FR, 'train', 'stageB.py'), 'w', encoding='utf-8').write(sb + "\n\ndef again(s, F):\n    return ck.assignment_m('heldout', s, F)\n")
s90b, p90b = la.graph_sites(la.STAGEB_CODE + la.LATER_CODE, root=FR)
s90c, p90c = la.graph_sites(la.STAGEB_CODE + la.LATER_CODE)
check('r90_extra_unkeyed_read_fails', any('is a graph site no rule classifies' in p and "'triples.tsv'" in p for p in p90a)
      and any(p.startswith('ruling 90: the held-out lineage read must be ONE site') for p in p90b) and p90c == [],
      'a planted read by another key:', [p for p in p90a if 'triples' in p][:1], '; a second held-out lineage call:', [p for p in p90b if 'ruling 90' in p][:1])
# ---- ruling 92: stage B ran under guard-stageB.sh and guard-stageB-r92.sh; both are given and parsed, and their docker
# run lines may differ only in the MIN_FREE_GB / START_FREE_GB values. The old guard stays the fixture above (SCRIPTS[0]).
G92 = os.path.join(ROOT, 'orchestrator', 'guard-stageB-r92.sh')
FG = fresh(os.path.join(D, 'guard92')); g92 = open(G92, encoding='utf-8', newline='').read()
def g92_copy(sub, a_, b_):
    os.makedirs(os.path.join(FG, sub), exist_ok=True); p_ = os.path.join(FG, sub, 'guard-stageB-r92.sh')
    assert a_ in g92, a_; open(p_, 'w', encoding='utf-8', newline='').write(g92.replace(a_, b_, 1)); return p_
g_net = g92_copy('net', '--network none --cpus 6 -m', '--network bridge --cpus 6 -m')  # a run-line flag changed (not the comment at line 5)
g_cap = g92_copy('cap', 'CAP=$' '{CAP:-2560m}', 'CAP=$' '{CAP:-8g}')          # a variable the run line expands changed
g_min = g92_copy('min', 'MIN_FREE_GB=5', 'MIN_FREE_GB=7')              # only an allowed value changed
k92 = la.ruling92([SCRIPTS[0], G92, SCRIPTS[1]], False)
k_net, k_cap, k_min = (la.ruling92([SCRIPTS[0], g_, SCRIPTS[1]], False) for g_ in (g_net, g_cap, g_min))
k_one = la.ruling92(SCRIPTS, False)
check('r92_both_guards_parsed', k92['ok'] and [r['script'] for r in k92['guards']] == ['guard-stageB.sh', 'guard-stageB-r92.sh']
      and all(r['runs'] for r in k92['guards']) and [r['free_values'] for r in k92['guards']] == [dict(MIN_FREE_GB='10', START_FREE_GB='15'), dict(MIN_FREE_GB='5', START_FREE_GB='6')]
      and k_min['ok'] and not k_net['ok'] and not k_cap['ok'] and any('differ beyond MIN_FREE_GB/START_FREE_GB' in p for p in k_net['problems'] + k_cap['problems'])
      and not k_one['ok'] and any('must give both stage-B guards' in p for p in k_one['problems']),
      'runs per guard', [len(r['runs']) for r in k92['guards']], '; free values', [r['free_values'] for r in k92['guards']],
      '; a changed flag:', k_net['problems'][:1], '; a changed CAP:', k_cap['problems'][:1], '; only one guard:', k_one['problems'][:1])
s92 = [SCRIPTS[0], G92, SCRIPTS[1]]
rb = la.main([(','.join(s92) if x == ','.join(SCRIPTS) else x) for x in base] + out('r92'))
md92 = open(os.path.join(D, 'r92.md')).read()
rn = la.main([(','.join([SCRIPTS[0], g_net, SCRIPTS[1]]) if x == ','.join(SCRIPTS) else x) for x in base] + out('r92net'))
P91 = load_module('leak_audit_r91', os.path.join(ROOT, 'r58c', 'A', 'pre', 'leak_audit_r91.py')); P91.HERE = la.HERE; _memo_git(P91)
rp = P91.main([(','.join([SCRIPTS[0], g_net, SCRIPTS[1]]) if x == ','.join(SCRIPTS) else x) for x in base] + out('r92net_pre'))
check('r92_audit_fails_on_a_differing_guard', rb['ok'] and rb['ruling92']['ok'] and rb['ruling92']['text'] in md92 and 'identical apart from the values of' in rb['ruling92']['text']
      and {m['source'].split(':')[0] for m in rb['mounts']} >= {'guard-stageB.sh', 'guard-stageB-r92.sh'}
      and not rn['ok'] and not rn['coverage']['ok'] and any(p.startswith('ruling 92:') for p in rn['coverage']['problems'])
      and rp['ok'] and 'ruling92' not in rp,
      'both guards: ok', rb['ok'], '; a run line changed: ok', rn['ok'], rn['coverage']['problems'][:1],
      '; fail before: the ruling-91 bytes (r58c/A/pre/leak_audit_r91.py) passed the changed guard, ok', rp['ok'])
sites = {(s['file'], s['cls']) for s in r89['sites']}
check('r89_graph_sites_cited', {('train/kge.py', 'caller-key'), ('train/stageB.py', 'plan-checkpoint'), ('train/stageB.py', 'task-parent'),
                                ('train/heldout.py', 'plan-checkpoint')} <= sites and r89['constants']['STAGEA_SHA'] in plan['checkpoints']
      and r89['stageB_evalcore_calls'] == ['read_score_table', 'write_score_table'],
      ['%s:%d %s' % (s['file'], s['line'], s['cls']) for s in r89['sites'] if s['file'] in ('train/kge.py', 'train/stageB.py')])
md = open(os.path.join(D, 'main.md')).read()
check('r89_text_in_audit_md', 'Ruling 89 (a limit of the isolation, not a clean pass)' in md and r89['text'] in md and res['disclosure81']['text'] in md
      and md.index(res['disclosure81']['text']) < md.index(r89['text']), 'ruling89.text follows ruling 81\'s disclosure')
PRE = load_module('leak_audit_pre3', os.path.join(ROOT, 'r58c', 'A', 'pre', 'leak_audit.py')); PRE.HERE = la.HERE; _memo_git(PRE)
pargs = [x for x in base if x not in ('--test',)]
pargs = [x for i, x in enumerate(pargs) if not (x.startswith('--expect') or (i and pargs[i - 1].startswith('--expect')))]
pargs = [x if x != 'tune=' + LP else LP for x in pargs]
rp = PRE.main(pargs + out('pre'))
check('r89_pre_had_no_check', 'ruling89' not in rp and 'Ruling 89' not in open(os.path.join(D, 'pre.md')).read(), 'fail before: the round-start audit had no ruling-89 check')
# ---- ruling 89 with a held-out checkpoint in a part, run together with a tuning override (c3 below)
tp = sorted(set(plan['assignment']), key=GIT.key); hp = set(plan['heldout']['assignment']); hpp = sorted(hp, key=GIT.key)
P, C = tp[10], tp[20]
LP2 = os.path.join(D, 'parts89'); shutil.copytree(LP, LP2)
mp = sorted(glob.glob(os.path.join(LP2, '**', 'meta.json'), recursive=True))[0]
m = json.load(open(mp)); m['checkpoint'] = plan['heldout']['checkpoints'][0]; json.dump(m, open(mp, 'w'))
r = la.main([x if x != 'tune=' + LP else 'tune=' + LP2 for x in base] + out('p89') + ['--override-assign', 'tune:%s=%s' % (P, C)])
check('r89_heldout_checkpoint_in_a_part_fails', not r['ruling89']['ok'] and len(r['ruling89']['parts']['problems']) == 1
      and 'not one of the plan\'s 53 tuning checkpoints' in r['ruling89']['parts']['problems'][0], r['ruling89']['parts']['problems'])
f = [x for x in r['failures'] if x.get('parent') == P and 'c3' in x]
check('leak_catches_later_tune_checkpoint', not r['ok'] and f and all(not x['c3'] and not x['c2'] for x in f), 'tasks failed', len(f))
# ---- pins: the kge-B1 capture and the task list (one run, two wrong pins)
r = la.main(base + out('pins') + ['--b1-inspect-sha256', '0' * 64, '--tasks-sha256', 'ab' * 32])
check('r89_b1_capture_pinned', any('hashes to 052cbfa0ec863e3b' in p for p in r['coverage']['problems']) and sha(B1) == la.B1_INSPECT[1],
      r['coverage']['problems'][:2])
check('mf10_tasks_pinned', res['heldout_tasks']['sha256'] == la.TASKS_SHA256 and res['heldout_tasks']['rows'] == 418 and not r['ok']
      and any('hashes to' in p for p in r['heldout_tasks']['problems']) and 'heldout_tasks' not in rp,
      'pinned', la.TASKS_SHA256[:16], '; a wrong pin fails; fail before: the round-start audit pinned nothing')
# ---- the four leak_audit defects (coordinator: each its own fail before / pass after)
big = [mm for mm in res['mounts'] if mm['n_files'] > 6]
row_md = [l for l in md.splitlines() if l.startswith('| heldout.sh:')]
check('cut_lists_all_listed', big and all(len(mm['files']) == mm['n_files'] for mm in res['mounts'])
      and all('(mounts[' in l for l in row_md) and 'outside_lane[i].files' in md,
      'mounts over 6 files:', [(mm['source'], mm['n_files']) for mm in big][:4], '; markdown prints counts and the JSON field')
CUT = fresh(os.path.join(D, 'cut'))
for i in range(8):
    os.makedirs(os.path.join(CUT, 'd%d' % i)); open(os.path.join(CUT, 'd%d' % i, 'tune_refs.jsonl'), 'w').write('{}\n')
CS = os.path.join(D, 'cut-stageB.sh')
open(CS, 'w').write('W=%s\ndocker run -v $W/%s:/x:ro img\n' % (LANE_HOST, os.path.relpath(CUT, ROOT).replace(os.sep, '/')))
cn = la.audit_mounts([CS], [], LANE_HOST, HM)[0]; cp = PRE.audit_mounts([CS], [], LANE_HOST)
check('cut_lists_pre_cut_silently', len(cn) == 1 and cn[0]['n_files'] == 8 and len(cn[0]['files']) == 8 and len(cp) == 1 and len(cp[0]['files']) == 6
      and 'n_files' not in cp[0], 'a mount of 8 tune_refs.jsonl files: now', len(cn[0]['files']), 'of', cn[0]['n_files'], '; fail before: the round-start audit kept',
      len(cp[0]['files']), 'and no count')
KD = fresh(os.path.join(D, 'kge_plant')); src = open(os.path.join(TRAIN, 'kge.py')).read()
open(os.path.join(KD, 'kge.py'), 'w').write(src + "\nTT = np.load(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl'))\n")
kn = la.kge_reads_no_task_file(os.path.join(KD, 'kge.py'))
PRE.HERE = KD; kp = PRE.kge_reads_no_task_file(); PRE.HERE = la.HERE
check('kge_read_sites_wide_match', not kn['ok'] and kn['open_lines'] and 'tune_tasks.jsonl' in kn['open_lines'][0][1] and kp['ok'],
      'planted np.load caught at line', kn['open_lines'][:1], '; fail before: the round-start check said ok =', kp['ok'])
rs = res['read_sites']
check('kge_read_sites_cited', all(rs[f] for f in la.READ_FILES) and not any(s['names_task_file'] for s in rs['train/kge.py'])
      and any('load_tasks' in s['text'] for s in rs['train/stageB.py']), {f: len(v) for f, v in rs.items()})
rc_u = exits(la.main, base + ['--bogus', 'x'] + out('u'))
rc_t = exits(la.main, [x for x in base if x != '--test'] + out('t'))
# one round-start run: --bogus and no output option (it took the key and ran to the real path)
try:
    PRE.main(pargs + ['--bogus', 'x']); pre_def = 'accepted --bogus and wrote the real path'
except OSError as e:
    pre_def = 'accepted --bogus and tried the real path: ' + e.__class__.__name__
check('unknown_keys_refused', rc_u == 2 and rc_t == 2 and pre_def.startswith('accepted --bogus'), 'exit', rc_u, '; a test key without --test: exit', rc_t,
      '; fail before: the round-start audit', pre_def)
hl = [c for c in res['code_evidence']['lines'] if c['file'] == 'train/heldout.py']
check('code_evidence_has_heldout_py', any(c['text'].startswith('TRUTHY = ') for c in hl) and any('if any(k in r for k in TRUTHY)' in c['text'] for c in hl)
      and not any(c['file'] == 'train/heldout.py' for c in rp['code_evidence']['lines']), ['train/heldout.py:%d' % c['line'] for c in hl],
      '; fail before: the round-start evidence had no heldout.py line')
# ---- ruling 81: the exact allow-list (fail before: the round-start audit and heldout.sh); mounts only (audit_mounts + ruling81)
def r81_only(scripts, stage_rel=la.STAGE_REL):
    rows, bad = la.audit_mounts(scripts, [B1], LANE_HOST, HM)
    return dict(mounts=rows, r81=la.ruling81(rows, plan, LANE_HOST, None, stage_rel, la.PROBE_STAGE_REL, HM))
cont = r81['containers']
check('r81_current_launcher_matches', r81['ok'] and cont['held-out']['mount_rows'] == 9 and cont['probe']['mount_rows'] == 7
      and r81['staged']['held-out']['facts'] == 70 and r81['staged']['probe']['facts'] == 1, json.dumps(cont), json.dumps(r81['staged'])[:200])
oldsh = [SCRIPTS[0], os.path.join(ROOT, 'r58c', 'A', 'pre', 'heldout.sh')]
ro = r81_only(oldsh)['r81']
ro_pre = PRE.main([x if x != ','.join(SCRIPTS) else ','.join(oldsh) for x in pargs] + out('old_pre'))
check('r81_round_start_launcher_fails', not ro['ok'] and any('/gt/' in p and 'not in the held-out allow-list' in p for p in ro['problems']), ro['problems'][:2])
check('r81_pre_passed_it', ro_pre['ruling78']['ok'], 'fail before: the round-start audit passed the /gt/ mounts')
tmpl = open(os.path.join(TRAIN, 'heldout.sh')).read()
def variant(name, old, new):
    p = os.path.join(D, name); s = tmpl.replace(old, new, 1); assert s != tmpl, name; open(p, 'w').write(s); return p
v_extra = variant('extra-heldout.sh', ' -v $W/export:/w/export:ro \\\n -v $STAGE', ' -v $W/export:/w/export:ro -v $W/fixes:/w/fixes:ro \\\n -v $STAGE')
v_anc = variant('anc-heldout.sh', ' -v $W/train:/w/train:ro -v $W/train/heldout:', ' -v $W:/w:ro -v $W/train:/w/train:ro -v $W/train/heldout:')
v_miss = variant('miss-heldout.sh', ' -v $W/progress.jsonl:/w/progress.jsonl:ro', '')
v_sealed = variant('sealed-heldout.sh', ' -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro', ' -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $GB/sealed/refs:/s:ro')
v_ref = variant('ref-heldout.sh', ' -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro', ' -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $W/eval/x_reference.jsonl:/w/r.jsonl:ro')
v_rw = variant('rw-heldout.sh', ' -v $W/export:/w/export:ro \\\n -v $STAGE', ' -v $W/export:/w/export \\\n -v $STAGE')
pr = {k: r81_only([SCRIPTS[0], p]) for k, p in (('extra', v_extra), ('ancestor', v_anc), ('missing', v_miss), ('sealed', v_sealed), ('reference', v_ref), ('rw', v_rw))}
check('r81_extra_mount_fails', not pr['extra']['r81']['ok'] and any('/w/fixes ' in p and 'not in the held-out allow-list' in p for p in pr['extra']['r81']['problems']),
      [p for p in pr['extra']['r81']['problems'] if '/w/fixes' in p][:1])
check('r81_ancestor_mount_fails', any('contains the allowed' in p for p in pr['ancestor']['r81']['problems']), pr['ancestor']['r81']['problems'][:1])
check('r81_missing_mount_fails', any('missing' in p and 'progress.jsonl' in p for p in pr['missing']['r81']['problems']), pr['missing']['r81']['problems'][:1])
check('r81_rw_mount_fails', any('is rw, the allow-list says ro' in p for p in pr['rw']['r81']['problems']), pr['rw']['r81']['problems'][:1])
check('r81_sealed_and_reference_fail', any(mm['cls'] == 'heldout_truth' and not mm['ok'] and '/sealed/' in mm['host'] for mm in pr['sealed']['mounts'])
      and any(mm['cls'] == 'heldout_truth' and not mm['ok'] and 'reference' in mm['host'] for mm in pr['reference']['mounts']),
      'sealed/ and *reference*.jsonl classified held-out truth by name')
F = fresh(os.path.join(D, 'fstage'))
for Pp in plan['heldout']['assignment']: os.makedirs(os.path.join(F, 'facts', Pp))
bogus = '0123456789abcdef0123456789abcdef01234567'; os.makedirs(os.path.join(F, 'facts', bogus))
os.makedirs(os.path.join(F, 'common', 'srcstore', 'trees')); os.makedirs(os.path.join(F, 'common', 'srcstore', 'blobs'))
for Pp in plan['heldout']['assignment']: json.dump({'a.py': 'ab' * 20}, open(os.path.join(F, 'common', 'srcstore', 'trees', Pp + '.json'), 'w'))
open(os.path.join(F, 'common', 'srcstore', 'blobs', 'ab' * 20 + '.txt'), 'w').write('x\n')
rel = os.path.relpath(F, ROOT).replace(os.sep, '/')
v_pc = variant('percommit-heldout.sh', 'STAGE=$W/heldout_inputs', 'STAGE=$W/' + rel)
pp = r81_only([SCRIPTS[0], v_pc], rel)['r81']['problems']
check('r81_per_commit_folder_of_no_parent_fails', any('neither a tuning nor a held-out parent' in p and bogus in p for p in pp)
      and any('71 folders, 1 not a held-out parent' in p for p in pp), [p for p in pp if bogus in p][:2])
# ---- coverage: zero mount rows per role, inspect rows need Source and Destination (one run)
IB = os.path.join(D, 'kge-H1-inspect.json')
json.dump([dict(Source=LANE_HOST + '/train', Destination='/w/train', RW=False), dict(Source=LANE_HOST + '/export', RW=False)], open(IB, 'w'))
rz = la.main([(SCRIPTS[0] if x == ','.join(SCRIPTS) else (B1 + ',' + IB if x == B1 else x)) for x in base] + out('zero'))
check('ar24_zero_rows_per_role_fail', not rz['ok'] and 'no launcher script for the heldout role' in rz['coverage']['problems'], rz['coverage']['problems'][:3])
check('ar24_inspect_needs_destination', any('entry 1 has no Source or no Destination' in p for p in rz['coverage']['problems']), rz['coverage']['problems'][:2])
# ---- MF-10: C's raw history non-empty and C's own (ancestry; AR2-5)
FF = fresh(os.path.join(D, 'facts_empty')); SA = 'cd806c803c4ad8ec198790096d196460789951f0'
os.makedirs(os.path.join(FF, SA)); open(os.path.join(FF, SA, 'commits.jsonl'), 'w').close()
la.raw_hist.__defaults__[0].clear(); new = la.check_pair(GIT, FF, SA, SA)
PRE.raw_hist.__defaults__[0].clear(); old = PRE.check_pair(PRE.Git(REPO), FF, SA, SA)
la.raw_hist.__defaults__[0].clear(); PRE.raw_hist.__defaults__[0].clear()
nC = sum(1 for x in res['failures'] if 'c1_history_ok' in x and not x['c1_history_ok'])
check('ar25_empty_history_fails_c1', new['c1'] is False and new['c1_history_ok'] is False and old['c1'] is True and la.hist_ok(frozenset([SA]), SA) and nC == 0,
      'empty commits.jsonl: c1', new['c1'], '; real histories failing the check:', nC, '; fail before: the round-start c1 =', old['c1'])
# ---- MF-10: outside-lane sources listed; the --test default output is off the real path (run with a held-out override)
ol = {o['host'].rsplit('/', 1)[-1]: o for o in res['outside_lane']}
check('mf10_outside_lane_listed', 'tasks.jsonl' in ol and '95e990307da3b42b.json' in ol and all(o['listed'] and o['files'] for o in res['outside_lane']),
      [(k, len(o['files'])) for k, o in ol.items()])
P2, C2 = hpp[5], hpp[15]
dflt = os.path.join(tempfile.gettempdir(), 'leak_audit_test', 'leak_audit.json')
if os.path.exists(dflt): os.remove(dflt)
r = la.main(base + ['--override-assign', 'heldout:%s=%s' % (P2, C2)])
check('mf10_test_default_output', os.path.exists(dflt) and json.load(open(dflt))['test'] is True and not os.path.exists(os.path.join(TRAIN, 'leak_audit', 'leak_audit.json')),
      'default', dflt, '; fail before: the round-start audit', pre_def)
f = [x for x in r['failures'] if x.get('parent') == P2 and 'c3' in x]
check('leak_catches_later_heldout_checkpoint', not r['ok'] and f and all(not x['c3'] and not x['c2'] for x in f), 'tasks failed', len(f))
# ---- ruling 81's disclosure: the count of exported held-out histories naming another held-out parent
n81 = 0
for Pp in hp:
    anc = {l.strip() for l in open(os.path.join(ROOT, 'export', 'graphs', Pp, 'ancestors.txt')) if l.strip()}
    n81 += int(bool((anc - {Pp}) & hp))
d81 = res['disclosure81']
check('r81_disclosure_count', d81['histories_naming_another_heldout_parent'] == n81 and ('%d of the 70 exported held-out histories' % n81) in d81['text']
      and d81['text'] in md and la.DISCLOSURE_SIBLING in md and 'disclosure81' not in rp, 'count', n81, '; fail before: the round-start audit had no count')
# ---- real mode: EMB_ROOT must be the lane
os.environ['EMB_ROOT'] = '/tmp'; rc_e = exits(la.main, core + out('emb')); os.environ['EMB_ROOT'] = '/w'
check('mf6_real_refuses_other_emb_root', rc_e == 2, 'exit', rc_e)
# ---- kept from earlier rounds: ruling 72, the defaults' coverage
ef = {e['file']: e for e in res['eval_files']}
walk = sorted(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/') for dp, dn, fn in os.walk(os.path.join(ROOT, 'eval'))
              if '__pycache__' not in dp and 'sealed' not in dp for f in fn)
check('r72_every_eval_file_listed', sorted(ef) == walk and all(sha(os.path.join(ROOT, f)) == e['sha256'] for f, e in ef.items()), len(ef), 'files')
rd = la.main(core + ['--test'] + out('d'))
check('ar3_defaults_fail_on_coverage', not rd['ok'] and 'no launcher script for the stageB role' in rd['coverage']['problems']
      and 'tune parts rows 0, planned 17460' in rd['coverage']['problems'], rd['coverage']['problems'][:4])
ok = finish('leak-audit')
sys.exit(0 if ok else 1)
