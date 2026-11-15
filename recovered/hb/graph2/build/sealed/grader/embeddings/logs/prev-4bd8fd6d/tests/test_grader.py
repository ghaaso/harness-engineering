"""Grader tests (run inside graphtest-kge:1 via run.sh):  python tests/test_grader.py
Synthetic hand-offs only (tests/make_handoffs.py, tuning tasks of the fixed test set, test flag set); real-mode
refusals use hand-offs that are refused before any list is read, and every real-mode call writes to a scratch
returns folder and a fresh scratch work root under test-out/ (so the held-out marker never lands in work/). The
full-size real-mode rehearsal is tests/rehearse_full.py. Prints one line per test and writes test-out/test-summary.json (names and pass/fail only). Exit 1 on a
failure.
"""
import os, sys, json, gzip, shutil, hashlib, itertools, traceback
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import gradecore as gc
import grade
import make_handoffs as mh
from gradecore import Refuse

OUT = os.path.join(HERE, 'test-out')
HOD = os.path.join(OUT, 'handoffs')
SCR = os.path.join(OUT, 'scratch-returns')
SCW = os.path.join(OUT, 'scratch-work')   # work roots of real-mode calls (the held-out marker lands here, never in work/)
RESULTS = []
_N = itertools.count(1)


def fresh_work():
    return os.path.join(SCW, 'w%03d' % next(_N))


def test(fn):
    try:
        fn(); RESULTS.append((fn.__name__, True, '')); print('PASS', fn.__name__, flush=True)
    except Exception as e:
        RESULTS.append((fn.__name__, False, '%s: %s' % (type(e).__name__, str(e)[:300]))); print('FAIL', fn.__name__, flush=True)
        traceback.print_exc()


def expect_refusal(code, *a, **k):
    k.setdefault('work_root', fresh_work())
    try:
        grade.run(*a, quiet=True, **k)
    except Refuse as e:
        assert e.code == code, 'refused with %d (%s), expected %d' % (e.code, e.msg, code)
        return e.msg
    raise AssertionError('not refused, expected %d' % code)


def tree(d, skip=()):
    out = {}
    for dp, dn, fn in os.walk(d):
        dn[:] = [x for x in dn if os.path.join(dp, x) not in skip]
        for f in fn:
            p = os.path.join(dp, f); out[os.path.relpath(p, d)] = gc.sha256_file(p)
    return out


truth = gc.load_truth()
IDS = sorted(gc.test_sets(truth)['pick8'])  # the fixed test set: 8 late-50 commits spread over time
PICK = sorted({truth[i]['commit'] for i in IDS})
HELD = sorted(i for i, t in truth.items() if t['split'] == 'heldout')
LATE = sorted(i for i, t in truth.items() if t['split'] == 'tune' and t['late50'])
ALL40 = list(gc.COMPARATORS) + ['%s_%s_s%d' % (a, k, s) for a in gc.TUNE_ARMS for k in gc.KINDS for s in gc.SEEDS]
TEN = lambda a: list(gc.COMPARATORS) + ['%s_%s_s%d' % (a, k, s) for k in gc.KINDS for s in gc.SEEDS]

os.makedirs(OUT, exist_ok=True)
for d in (HOD, SCR, SCW):
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d)
real_returns_before = tree(grade.RETURNS, skip=(os.path.join(grade.RETURNS, 'test'),))
here_before = tree(HERE, skip=(OUT, os.path.join(HERE, 'logs')))
T_SHA = mh.make('tune', os.path.join(HOD, 'tune'), set(IDS))
H_SHA = mh.make('heldout', os.path.join(HOD, 'heldout'), set(IDS))
ret = lambda f: os.path.join(grade.RETURNS, 'test', f)


@test
def tune_test_end_to_end():
    rc = grade.main(['tune-test', '--handoff', os.path.join(HOD, 'tune'), '--handoff-sha256', T_SHA])
    assert rc == 0, rc
    R = json.load(open(ret('tune-rank.json'))); A = json.load(open(ret('tune-item24.json')))
    assert R['split'] == 'tune' and R['test'] is True and R['handoff_sha256'] == T_SHA and R['tasks'] == len(IDS) and R['commits'] == len(PICK)
    want = set(TEN('E1')) | {'E1_alone_mean', 'E1_fused_mean'}
    assert set(R['rank']) == want, sorted(R['rank'])
    for v in R['rank'].values(): assert set(v) == {'pool', 'unrestricted'} and all(set(x) == set(gc.METRICS) for x in v.values())
    assert R['truth'] == {'rule': 'item 4', 'tasks_checked': len(IDS), 'equal_to_lane': len(IDS)}, R['truth']
    assert set(A['labels']) == {'E1_alone_mean', 'E1_fused_mean', 'RRF', 'PPR', 'CO', 'DIR'}
    assert 'vs_RRF' not in A['labels']['RRF'] and all('per_seed' not in A['labels'][c] for c in gc.COMPARATORS)
    assert set(A['labels']['E1_fused_mean']['per_seed']) == {'s1', 's2', 's3'}
    assert set(A['labels']['PPR']['vs_RRF']['primary']) == {'diff', 'lo', 'hi', 'p'}
    assert set(R['scorer']) == {'files_sha256', 'evalcore_sha256', 'score_js_sha256'}


@test
def tune_rank_equals_independent_computation():
    """Comparator rows against evalcore on the lane's own truth (tune_tasks.jsonl) and the lane's ranking; seed-mean
    rows against a hand loop (seed mean per task, commit mean, mean over commits)."""
    ec = gc.evalcore(); R = json.load(open(ret('tune-rank.json')))
    lane = [t for t in ec.load_tasks('/lane/eval/tune_tasks.jsonl') if t['task_id'] in set(IDS)]
    for sc in gc.SCOPES:
        C = mh.candidates(sc, set(IDS))
        for n in gc.COMPARATORS:
            T = mh.table(n, sc)
            per = {t['task_id']: ec.task_metrics(ec.rank(t['task_id'], C.get(t['task_id'], []), T.get(t['task_id'], {})), t['truth']) for t in lane}
            ref = ec.summary(per, lane)
            for m in gc.METRICS: assert abs(ref[m] - R['rank'][n][sc][m]) < 1e-12, (n, sc, m)
        rows = [{r['id']: r['ranked'] for r in gc.jsonl(os.path.join(HOD, 'tune', 'ranked', 'E1_fused_s%d_%s.jsonl.gz' % (s, sc)))} for s in gc.SEEDS]
        bycommit = {}
        for i in IDS:
            v = np.mean([ec.task_metrics(rows[s][i], truth[i]['truth'])['P@10'] for s in range(3)])
            bycommit.setdefault(truth[i]['commit'], []).append(v)
        hand = float(np.mean([np.mean(v) for v in bycommit.values()]))
        assert abs(hand - R['rank']['E1_fused_mean'][sc]['P@10']) < 1e-12, (hand, R['rank']['E1_fused_mean'][sc]['P@10'])


@test
def determinism_tune():
    a = gc.sha256_file(ret('tune-rank.json')); b = gc.sha256_file(ret('tune-item24.json'))
    rc = grade.main(['tune-test', '--handoff', os.path.join(HOD, 'tune'), '--handoff-sha256', T_SHA])
    assert rc == 0 and gc.sha256_file(ret('tune-rank.json')) == a and gc.sha256_file(ret('tune-item24.json')) == b


@test
def heldout_test_end_to_end_and_naming():
    rc = grade.main(['heldout-test', '--handoff', os.path.join(HOD, 'heldout'), '--handoff-sha256', H_SHA, '--freeze-sha256', mh.FAKE_FREEZE])
    assert rc == 0, rc
    R = json.load(open(ret('heldout.json')))
    v12 = ['E1_alone_s1', 'E1_alone_s2', 'E1_alone_s3', 'E1_alone_mean', 'E1_fused_s1', 'E1_fused_s2', 'E1_fused_s3', 'E1_fused_mean', 'RRF', 'PPR', 'CO', 'DIR']
    assert sorted(R['rank']) == sorted(v12) and sorted(R['answer_level']) == sorted(v12), sorted(R['rank'])
    assert set(R['vs_RRF']) == {'E1_fused_mean', 'E1_alone_mean'}
    for d in R['vs_RRF'].values():
        assert set(d) == {'pool_P@10', 'unrestricted_P@10', 'answer_level'} and all(set(x) == {'diff', 'lo', 'hi'} for x in d.values())
    assert R['literal_check'] == {'tasks': len(IDS), 'task_commit_in_checkpoint_history': 0, 'parent_mismatch': 0}, R['literal_check']
    assert R['arm'] == 'E1' and R['test'] is True and R['freeze_sha256'] == mh.FAKE_FREEZE and R['tasks'] == len(IDS) and R['commits'] == len(PICK)
    keys = {'split', 'arm', 'test', 'freeze_sha256', 'handoff_sha256', 'commits', 'tasks', 'rank', 'answer_level', 'vs_RRF', 'literal_check', 'scorer'}
    assert set(R) == keys, set(R) ^ keys
    # the same hand-off graded in tune form gives the same rank figures (one rank path)
    T = json.load(open(ret('tune-rank.json')))
    for v in TEN('E1'):
        for sc in gc.SCOPES:
            for m in gc.METRICS: assert abs(T['rank'][v][sc][m] - R['rank'][v][sc][m]) < 1e-12


@test
def determinism_heldout():
    a = gc.sha256_file(ret('heldout.json'))
    rc = grade.main(['heldout-test', '--handoff', os.path.join(HOD, 'heldout'), '--handoff-sha256', H_SHA, '--freeze-sha256', mh.FAKE_FREEZE])
    assert rc == 0 and gc.sha256_file(ret('heldout.json')) == a


@test
def returns_hold_no_task_figure_and_no_reference_path():
    refs = gc.reference_strings(IDS)
    assert len(refs) >= 10, len(refs)
    for f in ('tune-rank.json', 'tune-item24.json', 'heldout.json'):
        txt = open(ret(f), encoding='utf-8').read()
        assert not [s for s in refs if s in txt], f
        assert not gc.TASK_ID.search(txt), f
        for i in IDS: assert i not in txt
        def walk(o, depth=0):
            if isinstance(o, dict):
                for k, v in o.items(): assert not gc.TASK_ID.search(str(k)); walk(v, depth + 1)
            elif isinstance(o, list): raise AssertionError('a list in a return')
            elif isinstance(o, float): assert np.isfinite(o)
        walk(json.loads(txt))
    # the writer itself refuses a return that would carry a reference path or a task id
    p = os.path.join(SCR, 'leak.json'); one = sorted(refs)[0]
    for bad in ({'x': one}, {'x': IDS[0]}, {'x': float('nan')}):
        try: gc.write_return(p, bad, IDS); raise AssertionError('written')
        except Refuse as e: assert e.code in (50, 51)
    assert not os.path.exists(p)


@test
def aggregation_order_hand_example():
    """Seed mean per task, then per commit, then over commits; an empty-truth task stays in. Hand values:
    P@10 (0.3 + (0 + 0.1 + 0.1)/3 + 0)/3 = 0.122222...; pooled over tasks would be 0.1, dropping the empty task 0.18333."""
    T = {'a1': dict(truth=['x1', 'x2', 'x3'], commit='A', date_order=1), 'b1': dict(truth=['y1', 'y2'], commit='B', date_order=2),
         'b2': dict(truth=['y1', 'y2'], commit='B', date_order=2), 'b3': dict(truth=['y1', 'y2'], commit='B', date_order=2),
         'c1': dict(truth=[], commit='C', date_order=3)}
    L = {1: {'a1': ['x1', 'x2', 'x3'], 'b1': ['n'], 'b2': ['y1', 'y2'], 'b3': ['y1'], 'c1': ['z']},
         2: {'a1': ['x1', 'x2', 'x3'], 'b1': [], 'b2': [], 'b3': ['y1', 'y2'], 'c1': ['z']},
         3: {'a1': ['x1', 'x2', 'x3'], 'b1': [], 'b2': ['n', 'y1'], 'b3': [], 'c1': []}}
    hand = {'variants': {'E9_fused_s%d' % s: None for s in gc.SEEDS}, 'arms': ['E9'],
            'ranked': {'E9_fused_s%d' % s: {sc: L[s] for sc in gc.SCOPES} for s in gc.SEEDS}}
    hand['variants'].update({'E9_alone_s%d' % s: None for s in gc.SEEDS}); hand['ranked'].update({'E9_alone_s%d' % s: hand['ranked']['E9_fused_s%d' % s] for s in gc.SEEDS})
    tasks = gc.ec_tasks(T, T)
    rank, _, _ = grade.grade_rank(hand, T, tasks)
    r = rank['E9_fused_mean']['pool']
    exp = {'P@10': (0.3 + 0.2 / 3) / 3, 'R@10': (1 + 1 / 3) / 3, 'R@20': (1 + 1 / 3) / 3,
           'MRR': (1 + (0 + (1 + 0.5) / 3 + 2 / 3) / 3) / 3}
    for m in gc.METRICS: assert abs(r[m] - exp[m]) < 1e-12, (m, r[m], exp[m])
    assert abs(r['P@10'] - 0.1) > 0.02 and abs(r['P@10'] - 0.18333) > 0.05


@test
def ranked_lists_used_as_given():
    T = {'a': dict(truth=['t'], commit='A', date_order=1)}
    m = gc.per_task_rank({'a': ['n%d' % i for i in range(10)] + ['t']}, T)['a']
    assert m == {'P@10': 0.0, 'R@10': 0.0, 'R@20': 1.0, 'MRR': 1.0 / 11}, m


# ------------------------------------------------------------------ refusals (decision 7)
def copy(src, name):
    d = os.path.join(HOD, name)
    if os.path.isdir(d): shutil.rmtree(d)
    shutil.copytree(os.path.join(HOD, src), d); return d


def rewrite(d, edit):
    H = json.load(open(os.path.join(d, 'HANDOFF.json'))); edit(H); return mh.write_handoff(d, H)


@test
def refuse_handoff_sha():
    expect_refusal(3, 'tune-test', os.path.join(HOD, 'tune'), '0' * 64, returns_root=SCR)
    expect_refusal(3, 'heldout', os.path.join(HOD, 'heldout'), '0' * 64, mh.FAKE_FREEZE, returns_root=SCR)


@test
def refuse_test_flag_in_real_mode():
    expect_refusal(4, 'tune', os.path.join(HOD, 'tune'), T_SHA, returns_root=SCR)
    expect_refusal(4, 'heldout', os.path.join(HOD, 'heldout'), H_SHA, mh.FAKE_FREEZE, returns_root=SCR)


@test
def refuse_real_handoff_in_test_mode():
    d = copy('tune', 'tune_nottest'); s = rewrite(d, lambda H: H.update(test=False))
    expect_refusal(4, 'tune-test', d, s, returns_root=SCR)
    d = copy('heldout', 'heldout_nottest'); s = rewrite(d, lambda H: H.update(test=False))
    expect_refusal(4, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = copy('tune', 'tune_noflag'); s = rewrite(d, lambda H: H.pop('test'))
    expect_refusal(4, 'tune-test', d, s, returns_root=SCR); expect_refusal(4, 'tune', d, s, returns_root=SCR)


@test
def refuse_freeze_sha():
    expect_refusal(5, 'heldout-test', os.path.join(HOD, 'heldout'), H_SHA, '1' * 64, returns_root=SCR)
    d = copy('heldout', 'heldout_otherfreeze'); s = rewrite(d, lambda H: H.update(freeze_sha256='2' * 64))
    expect_refusal(5, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)


@test
def refuse_file_hashes():
    d = copy('tune', 'tune_changedfile')
    p = os.path.join(d, 'ranked', 'RRF_pool.jsonl.gz'); open(p, 'ab').write(b'\x00')
    expect_refusal(6, 'tune-test', d, T_SHA, returns_root=SCR)
    d = copy('tune', 'tune_missingfile'); os.remove(os.path.join(d, 'answers', 'CO.jsonl.gz'))
    expect_refusal(6, 'tune-test', d, T_SHA, returns_root=SCR)
    d = copy('tune', 'tune_unlisted'); s = rewrite(d, lambda H: H['files'].pop('ranked/DIR_unrestricted.jsonl.gz'))
    expect_refusal(6, 'tune-test', d, s, returns_root=SCR)
    d = copy('heldout', 'heldout_changedcounts'); open(os.path.join(d, 'tables', 'counts.json'), 'a').write(' ')
    expect_refusal(6, 'heldout-test', d, H_SHA, mh.FAKE_FREEZE, returns_root=SCR)


@test
def refuse_split():
    d = os.path.join(HOD, 'shell_split')
    s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, extra=dict(split='tune'), chosen_arm='E3')
    expect_refusal(7, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = copy('tune', 'tune_split'); s = rewrite(d, lambda H: H.update(split='heldout'))
    expect_refusal(7, 'tune-test', d, s, returns_root=SCR)


@test
def refuse_second_heldout_grading():
    r = os.path.join(SCR, 'graded'); os.makedirs(r, exist_ok=True); open(os.path.join(r, 'heldout.json'), 'w').write('{}\n')
    d = os.path.join(HOD, 'shell_ok_heldout'); s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, chosen_arm='E3')
    msg = expect_refusal(8, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=r)
    assert 'already graded' in msg
    # the same hand-off, with no heldout.json, passes every check up to the lists (refused only because the shell has none)
    msg = expect_refusal(6, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=os.path.join(SCR, 'fresh'))
    assert 'not listed' in msg and 'ranked/' in msg, msg


@test
def refuse_variant_sets():
    d = os.path.join(HOD, 'shell_tune_10'); s = mh.shell('tune', d, set(LATE), TEN('E1'), False)
    expect_refusal(9, 'tune', d, s, returns_root=SCR)          # real tune needs all 40
    d = os.path.join(HOD, 'shell_tune_39'); s = mh.shell('tune', d, set(LATE), ALL40[:-1], False)
    expect_refusal(9, 'tune', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'shell_tune_41'); s = mh.shell('tune', d, set(LATE), ALL40 + ['E9_fused_s1'], False)
    expect_refusal(9, 'tune', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_2arms'); s = mh.shell('heldout', d, set(HELD), TEN('E3') + ['E2_fused_s1'], False, chosen_arm='E3')
    expect_refusal(9, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_otherarm'); s = mh.shell('heldout', d, set(HELD), TEN('E2'), False, chosen_arm='E3')
    expect_refusal(9, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_placebo'); s = mh.shell('heldout', d, set(HELD), TEN('PLACEBO'), False, chosen_arm='PLACEBO')
    expect_refusal(9, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = mh.make('tune', os.path.join(HOD, 'tune_dropped'), set(IDS), drop_variant='E1_alone_s2')
    expect_refusal(9, 'tune-test', os.path.join(HOD, 'tune_dropped'), d, returns_root=SCR)


@test
def refuse_task_sets():
    d = os.path.join(HOD, 'shell_tune_subset'); s = mh.shell('tune', d, set(LATE[1:]), ALL40, False)
    expect_refusal(10, 'tune', d, s, returns_root=SCR)
    inner = sorted(i for i, t in truth.items() if t['split'] == 'tune' and not t['late50'])
    d = os.path.join(HOD, 'shell_tune_inner'); s = mh.shell('tune', d, set(LATE) | {inner[0]}, ALL40, False)
    expect_refusal(10, 'tune', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_417'); s = mh.shell('heldout', d, set(HELD[:-1]), TEN('E3'), False, chosen_arm='E3')
    expect_refusal(10, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_tune'); s = mh.shell('heldout', d, set(HELD[:-1]) | {LATE[0]}, TEN('E3'), False, chosen_arm='E3')
    expect_refusal(10, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = os.path.join(HOD, 'shell_tune_ok'); s = mh.shell('tune', d, set(LATE), ALL40, False)
    msg = expect_refusal(6, 'tune', d, s, returns_root=SCR)   # the exact set passes; refused only for the missing lists
    assert 'ranked/' in msg, msg


@test
def refuse_malformed_lists():
    d = copy('tune', 'tune_dup')
    p = os.path.join(d, 'ranked', 'PPR_pool.jsonl.gz'); rows = gc.jsonl(p); rows[0]['ranked'] = ['backend/x.py', 'backend/x.py']
    mh.gz_write(p, rows); s = rewrite(d, lambda H: H['files'].update({'ranked/PPR_pool.jsonl.gz': gc.sha256_file(p)}))
    assert 'not a list of distinct paths' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d = copy('tune', 'tune_lessrows')
    p = os.path.join(d, 'ranked', 'CO_unrestricted.jsonl.gz'); mh.gz_write(p, gc.jsonl(p)[1:])
    s = rewrite(d, lambda H: H['files'].update({'ranked/CO_unrestricted.jsonl.gz': gc.sha256_file(p)}))
    assert 'task(s) missing' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d = copy('tune', 'tune_answerhead')
    p = os.path.join(d, 'answers', 'DIR.jsonl.gz'); rows = gc.jsonl(p); rows[0]['items'] = rows[0]['items'][::-1]
    mh.gz_write(p, rows); s = rewrite(d, lambda H: H['files'].update({'answers/DIR.jsonl.gz': gc.sha256_file(p)}))
    assert 'not the head of the unrestricted ranked list' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d = copy('tune', 'tune_answerarm')
    p = os.path.join(d, 'answers', 'RRF.jsonl.gz'); rows = gc.jsonl(p); rows[0]['arm'] = 'PPR'
    mh.gz_write(p, rows); s = rewrite(d, lambda H: H['files'].update({'answers/RRF.jsonl.gz': gc.sha256_file(p)}))
    msg = expect_refusal(30, 'tune-test', d, s, returns_root=SCR)
    assert 'arm field differs from the variant' in msg, msg


@test
def refuse_cli_usage():
    assert grade.main(['tune', '--handoff', os.path.join(HOD, 'tune'), '--handoff-sha256', T_SHA, '--freeze-sha256', '0' * 64]) == 2
    assert grade.main(['heldout-test', '--handoff', os.path.join(HOD, 'heldout'), '--handoff-sha256', H_SHA]) == 2
    assert grade.main(['tune-test', '--handoff', os.path.join(HOD, 'tune')]) == 2
    assert grade.main(['tune-test', '--handoff', os.path.join(HOD, 'tune'), '--handoff-sha256', T_SHA, '--out', '/tmp']) == 2
    assert grade.main(['grade', '--handoff', os.path.join(HOD, 'tune')]) == 2


# ------------------------------------------------------------------ fixes after the audit and the refuter (2026-11-15)
def facts_history(c):
    p = os.path.join('/build/facts/cache', c, 'commits.jsonl')
    return {r['sha'] for r in gc.jsonl(p)} if os.path.exists(p) else None


@test
def literal_check_uses_full_git_ancestry():
    """Audit A1. For every T1 task commit that some facts-cache checkpoint descends from (git) while that checkpoint's
    commits.jsonl leaves the commit out, one task is placed at that checkpoint: the literal check must count every
    one. With the facts cache as history (the builder's code) none of these is counted."""
    anc = {r['checkpoint']: set(r['task_commits']) for r in gc.jsonl(gc.ANCESTRY)}
    by_commit = {}
    for i, t in sorted(truth.items()): by_commit.setdefault(t['commit'], i)
    placed = {}; split = {'tune': 0, 'heldout': 0}
    for c in sorted(anc):
        fh = facts_history(c)
        if fh is None: continue
        for tc in sorted(anc[c]):
            if tc == c or tc in fh or by_commit[tc] in placed: continue
            placed[by_commit[tc]] = c; split[truth[by_commit[tc]]['split']] += 1
    assert split['heldout'] >= 30 and split['tune'] >= 1, split  # 36 and 6 at the freeze of truth/ancestry.jsonl
    rows = [dict(id=i, parent=truth[i]['parent']) for i in sorted(placed)]
    lit = gc.literal_check(rows, truth, {i: {c} for i, c in placed.items()})
    assert lit == {'tasks': len(rows), 'task_commit_in_checkpoint_history': len(rows), 'parent_mismatch': 0}, lit
    old = sum(1 for i, c in placed.items() if truth[i]['commit'] in facts_history(c) or truth[i]['commit'] == c)
    assert old == 0, old
    # control: every T1 task at its own sealed parent is clean
    allrows = [dict(id=i, parent=t['parent']) for i, t in sorted(truth.items())]
    lit = gc.literal_check(allrows, truth, {i: {t['parent']} for i, t in truth.items()})
    assert lit == {'tasks': 806, 'task_commit_in_checkpoint_history': 0, 'parent_mismatch': 0}, lit
    print('  literal probe: %d held-out and %d tuning task commits missed by the facts cache, all counted' % (split['heldout'], split['tune']))


@test
def literal_check_positive_cases_end_to_end():
    """Refuter F2. heldout-test on the fixed test set: one task's seed-2 checkpoint is a later checkpoint whose git
    history holds the task commit -> 1; one task whose hand-off parent is another sha -> parent_mismatch 1."""
    anc = {r['checkpoint']: set(r['task_commits']) for r in gc.jsonl(gc.ANCESTRY)}
    i = IDS[0]; c = truth[i]['commit']
    later = sorted(k for k, v in anc.items() if c in v and k != c)[0]
    d = os.path.join(HOD, 'heldout_leak'); s = mh.make('heldout', d, set(IDS), checkpoint_override={(2, i): later})
    assert grade.run('heldout-test', d, s, mh.FAKE_FREEZE, quiet=True)
    R = json.load(open(ret('heldout.json')))
    assert R['literal_check'] == {'tasks': len(IDS), 'task_commit_in_checkpoint_history': 1, 'parent_mismatch': 0}, R['literal_check']
    other = next(truth[j]['parent'] for j in IDS if truth[j]['parent'] != truth[i]['parent'])
    d = os.path.join(HOD, 'heldout_otherparent'); s = mh.make('heldout', d, set(IDS), parent_override={i: other})
    assert grade.run('heldout-test', d, s, mh.FAKE_FREEZE, quiet=True)
    R = json.load(open(ret('heldout.json')))
    assert R['literal_check'] == {'tasks': len(IDS), 'task_commit_in_checkpoint_history': 0, 'parent_mismatch': 1}, R['literal_check']
    # restore the plain heldout-test return
    assert grade.main(['heldout-test', '--handoff', os.path.join(HOD, 'heldout'), '--handoff-sha256', H_SHA, '--freeze-sha256', mh.FAKE_FREEZE]) == 0


def edit_counts(src, name, fn):
    d = copy(src, name); p = os.path.join(d, 'tables', 'counts.json')
    C = json.load(open(p)); fn(C)
    with open(p, 'w', encoding='utf-8', newline='\n') as f: json.dump(C, f, sort_keys=True)
    return d, rewrite(d, lambda H: H['files'].update({'tables/counts.json': gc.sha256_file(p)}))


@test
def refuse_missing_or_bad_checkpoints():
    """Audit A3 / refuter F1 / F9: counts.json must be listed and give every (seed, task) a 40-hex sealed checkpoint."""
    d = copy('heldout', 'heldout_nocounts'); os.remove(os.path.join(d, 'tables', 'counts.json'))
    s = rewrite(d, lambda H: H['files'].pop('tables/counts.json'))
    assert 'counts.json is not listed' in expect_refusal(11, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d, s = edit_counts('heldout', 'heldout_nockpt', lambda C: C['s2'][IDS[3]].pop('checkpoint'))
    assert 'no 40-hex checkpoint' in expect_refusal(11, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d, s = edit_counts('heldout', 'heldout_notask', lambda C: C['s3'].pop(IDS[1]))
    assert 'cover exactly the tasks' in expect_refusal(11, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d, s = edit_counts('heldout', 'heldout_noseed', lambda C: C.pop('s1'))
    assert 'exactly the seeds' in expect_refusal(11, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d, s = edit_counts('heldout', 'heldout_dotdot', lambda C: C['s1'][IDS[0]].update(checkpoint='../../../sealed'))
    assert 'no 40-hex checkpoint' in expect_refusal(11, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d, s = edit_counts('heldout', 'heldout_unknownckpt', lambda C: C['s1'][IDS[0]].update(checkpoint='f' * 40))
    assert 'possible checkpoints' in expect_refusal(40, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)


@test
def refuse_second_heldout_grading_by_sealed_marker():
    """Audit A2 / refuter F4: a real held-out grading writes a sealed marker before any list is read; a second run is
    refused while it, or any per-task file of the held-out work folder, exists, whatever the returns folder holds."""
    d = os.path.join(HOD, 'shell_marker'); s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, chosen_arm='E3')
    w = fresh_work()
    msg = expect_refusal(6, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=os.path.join(SCR, 'm1'), work_root=w)
    assert 'not listed' in msg, msg
    M = json.load(open(os.path.join(w, 'heldout', 'STARTED.json')))
    assert M == {'handoff_sha256': s, 'freeze_sha256': mh.FAKE_FREEZE, 'state': 'refused 6'}, M
    msg = expect_refusal(8, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=os.path.join(SCR, 'm2'), work_root=w)
    assert 'sealed marker' in msg, msg
    assert json.load(open(os.path.join(w, 'heldout', 'STARTED.json')))['state'] == 'refused 6'  # the record is kept
    w2 = fresh_work(); os.makedirs(os.path.join(w2, 'heldout')); open(os.path.join(w2, 'heldout', 'per_task_rank.jsonl.gz'), 'wb').close()
    assert 'sealed marker' in expect_refusal(8, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=os.path.join(SCR, 'm3'), work_root=w2)
    # a refusal before the hand-off is accepted (wrong HANDOFF.json sha) leaves no marker
    w3 = fresh_work(); expect_refusal(3, 'heldout', d, '0' * 64, mh.FAKE_FREEZE, returns_root=os.path.join(SCR, 'm4'), work_root=w3)
    assert not os.path.exists(os.path.join(w3, 'heldout', 'STARTED.json'))


@test
def refuse_test_sets_other_than_the_fixed_ones():
    """Refuter F3: a test hand-off must carry one of the fixed test sets (no aggregate over a set the lane chose)."""
    assert set(gc.test_sets(truth)) == {'pick8', 'late50'} and len(gc.test_sets(truth)['late50']) == 313
    d = os.path.join(HOD, 'tune_one'); s = mh.make('tune', d, {IDS[0]})
    assert 'fixed test sets' in expect_refusal(10, 'tune-test', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'tune_less1'); s = mh.make('tune', d, set(IDS[1:]))
    assert 'fixed test sets' in expect_refusal(10, 'tune-test', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'held_less1'); s = mh.make('heldout', d, set(IDS[1:]))
    assert 'fixed test sets' in expect_refusal(10, 'heldout-test', d, s, mh.FAKE_FREEZE, returns_root=SCR)


def edit_gz(src, name, rel, fn):
    d = copy(src, name); p = os.path.join(d, rel); rows = gc.jsonl(p); fn(rows); mh.gz_write(p, rows)
    return d, rewrite(d, lambda H: H['files'].update({rel: gc.sha256_file(p)}))


@test
def refuse_paths_outside_the_code_universe():
    """Refuter F5 and its failed probe: a non-code path, the seed, a code path absent at the parent, and an
    unrestricted list that is not every code file of the parent but the seed are refused."""
    i0 = gc.jsonl(os.path.join(HOD, 'tune', 'ranked', 'PPR_pool.jsonl.gz'))[0]['id']
    d, s = edit_gz('tune', 'tune_noncode', 'ranked/PPR_pool.jsonl.gz', lambda R: R[0]['ranked'].append('README.md'))
    assert 'not a code file' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_seed', 'ranked/PPR_pool.jsonl.gz', lambda R: R[0]['ranked'].append(truth[R[0]['id']]['seed']))
    assert 'its own seed' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_absent', 'ranked/RRF_pool.jsonl.gz', lambda R: R[0]['ranked'].append('backend/app/no_such_module_xyz.py'))
    assert 'does not exist at the parent' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_short', 'ranked/CO_unrestricted.jsonl.gz', lambda R: R[0]['ranked'].pop())
    assert 'not every code file' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_empty', 'ranked/DIR_unrestricted.jsonl.gz', lambda R: R[0].update(ranked=[]))
    assert 'not every code file' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    assert i0 in truth


@test
def refuse_inconsistent_answers():
    """Refuter F11: an answer's parent or seed differs from its task row, or its 8,000 budget is inconsistent."""
    d, s = edit_gz('tune', 'tune_ansparent', 'answers/PPR.jsonl.gz', lambda R: R[0].update(parent='0' * 40))
    assert 'another parent or seed' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_ansseed', 'answers/PPR.jsonl.gz', lambda R: R[0].update(seeds=['file:backend/x.py']))
    assert 'another parent or seed' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_ansover', 'answers/CO.jsonl.gz', lambda R: R[0]['budgets']['8000'].update(used=9000))
    assert 'inconsistent 8000 budget' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)
    d, s = edit_gz('tune', 'tune_anstok', 'answers/CO.jsonl.gz', lambda R: R[0]['budgets']['8000'].update(used=1))
    assert 'inconsistent 8000 budget' in expect_refusal(11, 'tune-test', d, s, returns_root=SCR)


@test
def answer_scoring_failure_message_is_fixed_vocabulary():
    """Refuter F10: a node failure reaches the message only as the fixed problem list or a pointer to the sealed log."""
    p = os.path.join(SCR, 'garbage.jsonl.gz')
    with gzip.open(p, 'wt') as f: f.write('{"id": 1, "items": 7}\nnot json\n')
    try:
        gc.answer_level_per_task(p, os.path.join(SCR, 'garbage_out.jsonl')); raise AssertionError('not refused')
    except Refuse as e:
        assert e.code == 30 and 'logs/answer_score.stderr.log' in e.msg and 'Error' not in e.msg and ' at ' not in e.msg, e.msg


@test
def return_writer_enforces_v2_ranges():
    """Refuter F8: metrics, primary and p in [0, 1], diff/lo/hi in [-1, 1], counts non-negative integers."""
    p = os.path.join(SCR, 'range.json')
    for bad in ({'rank': {'RRF': {'pool': {'P@10': 1.5}}}}, {'vs_RRF': {'X': {'pool_P@10': {'diff': -1.2}}}},
                {'labels': {'RRF': {'mean': {'primary': -0.1}}}}, {'x': {'p': 2.0}}, {'answer_level': {'RRF': 1.01}},
                {'labels': {'E1_fused_mean': {'per_seed': {'s1': 3.0}}}}, {'tasks': -1}, {'commits': 2.5}, {'other_number': 0.5}):
        try: gc.write_return(p, bad, IDS); raise AssertionError('written %s' % bad)
        except Refuse as e: assert e.code == 50, (e.code, e.msg)
    gc.write_return(p, {'tasks': 3, 'rank': {'RRF': {'pool': {'P@10': 0.0, 'MRR': 1.0}}}, 'vs_RRF': {'X': {'answer_level': {'diff': -1.0, 'lo': -1.0, 'hi': 1.0}}},
                        'answer_level': {'RRF': 0.5}}, IDS)


@test
def refuse_zero_unit_reference():
    """Refuter F7: a graded task with no reference unit is refused rather than changing the published key set."""
    real = gc.answer_level_per_task
    def fake(answer_file, out_file, expect_arm=None, expect_hash=gc.PACK_HASH):
        per, info = real(answer_file, out_file, expect_arm, expect_hash)
        per.pop(sorted(per)[0]); info = dict(info, scored=info['scored'] - 1, zero_unit_refs=1)
        return per, info
    gc.answer_level_per_task = fake
    try:
        assert 'no reference unit' in expect_refusal(11, 'tune-test', os.path.join(HOD, 'tune'), T_SHA, returns_root=SCR)
    finally:
        gc.answer_level_per_task = real


@test
def refuse_real_mode_mismatches():
    """Refuter F12: a held-out hand-off sent to real tune (split), a wrong freeze sha in real held-out, an anchor line
    that disagrees with the freeze sha, a hand-off without an anchor line in real held-out, a lane truth file that
    differs from cross_check.lane_truth_sha256, and a listed file that is a link."""
    d = os.path.join(HOD, 'shell_held_real'); s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, chosen_arm='E3')
    expect_refusal(7, 'tune', d, s, returns_root=SCR)
    assert 'freeze_sha256 differs' in expect_refusal(5, 'heldout', d, s, '1' * 64, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_anchor'); s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, chosen_arm='E3', extra=dict(anchor_line=mh.anchor('3' * 64, test=False)))
    assert 'anchor_line' in expect_refusal(5, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = os.path.join(HOD, 'shell_held_noanchor'); s = mh.shell('heldout', d, set(HELD), TEN('E3'), False, chosen_arm='E3', extra=dict(anchor_line=None))
    assert 'no anchor_line' in expect_refusal(5, 'heldout', d, s, mh.FAKE_FREEZE, returns_root=SCR)
    d = copy('tune', 'tune_lanetruth'); s = rewrite(d, lambda H: H['cross_check'].update(lane_truth_sha256='4' * 64))
    assert 'lane_truth_sha256' in expect_refusal(6, 'tune-test', d, s, returns_root=SCR)
    d = os.path.join(HOD, 'shell_tune_nocross'); s = mh.shell('tune', d, set(LATE), ALL40, False, extra=dict(cross_check=None))
    assert 'lane_truth_sha256 is missing' in expect_refusal(6, 'tune', d, s, returns_root=SCR)
    d = copy('tune', 'tune_link'); p = os.path.join(d, 'ranked', 'RRF_pool.jsonl.gz'); tgt = os.path.join(HOD, 'rrf_pool_target.gz')
    shutil.move(p, tgt)
    try: os.symlink(tgt, p)
    except OSError: raise AssertionError('symlink not possible here')
    assert 'link' in expect_refusal(6, 'tune-test', d, T_SHA, returns_root=SCR)


@test
def refuse_changed_commits_file_like_changed_truth():
    """Final check, 2026-11-15: truth/commits.jsonl is pinned. A copy of each sealed truth input with one line changed
    (the commit of its first row, last hex digit) is put in place of the pinned file; the grade refuses both with the
    same exit code (20), and the unchanged copy passes the pin check (so the refusal is the change, not the copy)."""
    assert gc.PINS.get(gc.COMMITS) == gc.sha256_file(gc.COMMITS), 'commits.jsonl is not pinned at its current sha256'
    saved = gc.PINS; codes = {}
    d = os.path.join(OUT, 'pin-copies')
    try:
        for orig in (gc.TRUTH, gc.COMMITS):
            if os.path.isdir(d): shutil.rmtree(d)
            os.makedirs(d); cp = os.path.join(d, os.path.basename(orig)); shutil.copyfile(orig, cp)
            gc.PINS = {(cp if p == orig else p): h for p, h in saved.items()}
            gc.check_pins()  # the unchanged copy passes
            lines = open(cp, encoding='utf-8').read().split('\n')
            r = json.loads(lines[0]); r['commit'] = r['commit'][:-1] + ('0' if r['commit'][-1] != '0' else '1')
            lines[0] = json.dumps(r); open(cp, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
            msg = expect_refusal(20, 'tune-test', os.path.join(HOD, 'tune'), T_SHA, returns_root=SCR)
            assert 'pinned input changed' in msg and os.path.basename(orig) in msg, msg
            codes[os.path.basename(orig)] = 20
            gc.PINS = saved
    finally:
        gc.PINS = saved
        if os.path.isdir(d): shutil.rmtree(d)
    assert codes == {'truth.jsonl': 20, 'commits.jsonl': 20}, codes


@test
def handoff_keys_unknown_to_the_grader_are_accepted():
    """HANDOFF-FORMAT v2 revision 1 keys the grader does not read (absent_tasks, test_set, mean_rows, cross_check
    extras, per-variant pool_source / pool_source_sha256, grading, packs ...) cause no refusal in either test form."""
    def v2(H):
        H.update(absent_tasks={v['name']: {'pool': 0, 'unrestricted': 0} for v in H['variants']}, test_set='pick8',
                 mean_rows={'x_mean': ['x_s1', 'x_s2', 'x_s3']}, plan_hash='0' * 16, tables_digest='0' * 64, packs={'packed': True},
                 grading={'resampling_unit': 'commit'}, truth_keys_checked=1)
        for v in H['variants']: v.update(pool_source='synthetic', pool_source_sha256='0' * 64)
        if isinstance(H.get('cross_check'), dict): H['cross_check'].update(truth_rule='item 4', extra_unknown='x')
    r = os.path.join(SCR, 'v2keys')
    d = copy('tune', 'tune_v2keys'); s = rewrite(d, v2)
    w = grade.run('tune-test', d, s, returns_root=r, work_root=fresh_work(), B=200, quiet=True)
    assert sorted(w) == ['tune-item24.json', 'tune-rank.json'], w
    d = copy('heldout', 'heldout_v2keys'); s = rewrite(d, v2)
    w = grade.run('heldout-test', d, s, mh.FAKE_FREEZE, returns_root=r, work_root=fresh_work(), B=200, quiet=True)
    assert sorted(w) == ['heldout.json'], w


@test
def test_modes_write_only_test_paths():
    after = tree(grade.RETURNS, skip=(os.path.join(grade.RETURNS, 'test'),))
    assert after == real_returns_before, 'the real returns folder changed'
    here_after = tree(HERE, skip=(OUT, os.path.join(HERE, 'logs')))
    assert here_after == here_before, sorted(set(here_after.items()) ^ set(here_before.items()))[:3]
    assert not os.path.exists(os.path.join(HERE, 'work', 'heldout')), 'a test wrote the real held-out marker folder'
    assert sorted(os.listdir(os.path.join(grade.RETURNS, 'test'))) == ['heldout.json', 'tune-item24.json', 'tune-rank.json']


ok = all(r[1] for r in RESULTS)
json.dump({'tests': [{'name': n, 'pass': p, 'detail': d} for n, p, d in RESULTS], 'pass': ok, 'scorer_files_sha256': gc.sha256_file(os.path.join(HERE, 'HASHES.txt'))},
          open(os.path.join(OUT, 'test-summary.json'), 'w'), indent=1, sort_keys=True)
print('%d of %d tests passed' % (sum(r[1] for r in RESULTS), len(RESULTS)))
sys.exit(0 if ok else 1)
