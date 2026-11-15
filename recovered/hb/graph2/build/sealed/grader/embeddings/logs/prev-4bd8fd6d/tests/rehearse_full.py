"""Full-size rehearsal of both real modes on synthetic hand-offs (refuter F6), inside graphtest-kge:1 via run.sh:
  python tests/rehearse_full.py gen-tune | grade-tune | gen-heldout | grade-heldout
gen-*: writes test-out/full/<form>/ (make_handoffs.make_full: test flag false, seeded random orders of the sealed
code-file universe; tune = the 40 variants on the 313 late-50 tasks, heldout = the 10 variants of E3 on the 418
held-out tasks with checkpoint = the sealed parent). grade-*: grades it in REAL mode with returns and work under
test-out/full/ (never /returns, never work/), checks the return's shape, and for held-out runs it a second time,
which must be refused (exit 8). Each step records wall time and peak resident memory (this process and its node
children, ru_maxrss) in test-out/full/<step>.json. Prints counts, shapes and timings only.
"""
import os, sys, json, time, shutil, resource
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gradecore as gc
import grade
import make_handoffs as mh
from gradecore import Refuse

FULL = os.path.join(HERE, 'test-out', 'full')


def peak_mb():
    return {'self_mb': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0,
            'children_mb': resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024.0}


def main(step):
    os.makedirs(FULL, exist_ok=True)
    truth = gc.load_truth(); t0 = time.time(); rec = {'step': step}
    late = {i for i, t in truth.items() if t['split'] == 'tune' and t['late50']}
    held = {i for i, t in truth.items() if t['split'] == 'heldout'}
    if step == 'gen-tune':
        rec['handoff_sha256'] = mh.make_full('tune', os.path.join(FULL, 'tune'), late, list(gc.TUNE_ARMS))
    elif step == 'gen-heldout':
        rec['handoff_sha256'] = mh.make_full('heldout', os.path.join(FULL, 'heldout'), held, ['E3'])
    elif step in ('grade-tune', 'grade-heldout'):
        form = step.split('-')[1]; d = os.path.join(FULL, form)
        sha = gc.sha256_file(os.path.join(d, 'HANDOFF.json'))
        ret = os.path.join(FULL, 'returns-' + form); work = os.path.join(FULL, 'work-' + form)
        for x in (ret, work):
            if os.path.isdir(x): shutil.rmtree(x)
            os.makedirs(x)
        if form == 'tune':
            w = grade.run('tune', d, sha, returns_root=ret, work_root=work, quiet=True)
            R = json.load(open(os.path.join(ret, 'tune-rank.json'))); A = json.load(open(os.path.join(ret, 'tune-item24.json')))
            assert R['tasks'] == 313 and R['commits'] == 50 and len(R['rank']) == 52 and R['test'] is False, (R['tasks'], R['commits'], len(R['rank']))
            assert R['truth'] == {'rule': 'item 4', 'tasks_checked': 313, 'equal_to_lane': 313}, R['truth']
            assert len(A['labels']) == 16 and A['tasks'] == 313 and A['commits'] == 50
            rec['returns'] = sorted(w)
        else:
            w = grade.run('heldout', d, sha, mh.FAKE_FREEZE, returns_root=ret, work_root=work, quiet=True)
            R = json.load(open(os.path.join(ret, 'heldout.json')))
            assert R['tasks'] == 418 and R['commits'] == 75 and len(R['rank']) == 12 and len(R['answer_level']) == 12 and R['test'] is False
            assert R['literal_check'] == {'tasks': 418, 'task_commit_in_checkpoint_history': 0, 'parent_mismatch': 0}, R['literal_check']
            assert set(R['vs_RRF']) == {'E3_fused_mean', 'E3_alone_mean'}
            M = json.load(open(os.path.join(work, 'heldout', 'STARTED.json')))
            assert M['state'] == 'returned' and M['return_sha256'] == w['heldout.json'], M
            rec['literal_check'] = R['literal_check']; rec['marker_state'] = M['state']
            rec['grade_seconds'] = round(time.time() - t0, 1)
            try:
                grade.run('heldout', d, sha, mh.FAKE_FREEZE, returns_root=ret, work_root=work, quiet=True); raise AssertionError('second grading not refused')
            except Refuse as e:
                assert e.code == 8, (e.code, e.msg)
            os.remove(os.path.join(ret, 'heldout.json'))  # with the return gone, the sealed marker alone still refuses
            try:
                grade.run('heldout', d, sha, mh.FAKE_FREEZE, returns_root=ret, work_root=work, quiet=True); raise AssertionError('second grading not refused')
            except Refuse as e:
                assert e.code == 8 and 'sealed marker' in e.msg, (e.code, e.msg)
            rec['second_run_refused'] = 8
    else:
        print(__doc__); return 2
    rec['seconds'] = round(time.time() - t0, 1); rec.update(peak_mb())
    json.dump(rec, open(os.path.join(FULL, step + '.json'), 'w'), indent=1, sort_keys=True)
    print(json.dumps(rec, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ''))
