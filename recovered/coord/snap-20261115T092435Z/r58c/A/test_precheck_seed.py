"""Agent A, round r58c, round 4: the coordinator's ruling on check 8 ("the task's file seed is among the answer's seeds,
and parent equals the task row's"). Fail before / pass after, on tampered COPIES of the pick8 TEST tuning hand-off
(r58c/handoff-test/tune, never changed; copies under r58c/A/out/precheck_seed, removed at the end):
  const_first   one answer's seeds put as [const:<seed>#X, file:<seed>]: the before bytes (r58c/A/pre/precheck_handoff_r96.py,
                c96aec98) fail it at 8 ("first seed"), the current bytes pass it (0 problems);
  no_file_seed  the file seed dropped from that answer's seeds: the current bytes fail it at 8;
  parent_diff   that answer's parent changed: the current bytes fail it at 8;
  untouched     the copy as built: both pass (0 problems).
Each tampered answers file has its listed sha256 updated, so only check 8 can see the change.
Runs in a ktest-a<N> container (EMB_ROOT=/w). Reads no table."""
import os, sys, json, gzip, shutil, hashlib, importlib.util
ROOT = '/w'; A = os.path.join(ROOT, 'r58c', 'A'); SRC = os.path.join(ROOT, 'r58c', 'handoff-test', 'tune')
T = os.path.join(A, 'out', 'precheck_seed')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()


def load(name, p):
    s = importlib.util.spec_from_file_location(name, p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


NEW = load('pc_new', os.path.join(A, 'precheck_handoff.py'))
OLD = load('pc_old', os.path.join(A, 'pre', 'precheck_handoff_r96.py'))
print('current', sha(os.path.join(A, 'precheck_handoff.py')), 'before', sha(os.path.join(A, 'pre', 'precheck_handoff_r96.py')), flush=True)
src_sum = sha(os.path.join(SRC, 'HANDOFF.json'))


def case(name, fn):
    d = os.path.join(T, name); shutil.copytree(SRC, d)
    if fn:
        p = os.path.join(d, 'answers', 'CO.jsonl.gz'); rr = NEW.rows_gz(p); fn(rr[0])
        with gzip.open(p, 'wt', encoding='utf-8') as f:
            for x in rr: f.write(json.dumps(x) + '\n')
        hp = os.path.join(d, 'HANDOFF.json'); H = json.load(open(hp)); H['files']['answers/CO.jsonl.gz'] = sha(p); json.dump(H, open(hp, 'w'))
    return d


def const_first(a):
    f = [s for s in a['seeds'] if s.startswith('file:')][0]; a['seeds'] = ['const:' + f[5:] + '#X', f]
def no_file_seed(a):
    a['seeds'] = [s for s in a['seeds'] if not s.startswith('file:')] or ['const:none#X']
def parent_diff(a):
    a['parent'] = '0' * 40


if os.path.isdir(T): shutil.rmtree(T)
os.makedirs(T)
res = {}
for name, fn in (('untouched', None), ('const_first', const_first), ('no_file_seed', no_file_seed), ('parent_diff', parent_diff)):
    d = case(name, fn)
    for tag, m in (('before', OLD), ('after', NEW)):
        P, _ = m.precheck(d, 'tune', True)
        res[(name, tag)] = P
        print('%-12s %-6s problems %d %s' % (name, tag, len(P), P[:2]), flush=True)
only8 = lambda P: bool(P) and all(p.startswith('8:') for p in P)
checks = {
    'untouched_both_pass': res[('untouched', 'before')] == [] and res[('untouched', 'after')] == [],
    'const_first_before_fails_8': only8(res[('const_first', 'before')]) and any('first seed' in p for p in res[('const_first', 'before')]),
    'const_first_after_passes': res[('const_first', 'after')] == [],
    'no_file_seed_after_fails_8': only8(res[('no_file_seed', 'after')]) and any('not among the seeds' in p for p in res[('no_file_seed', 'after')]),
    'parent_diff_after_fails_8': only8(res[('parent_diff', 'after')]) and any('parent' in p for p in res[('parent_diff', 'after')]),
    'source_unchanged': sha(os.path.join(SRC, 'HANDOFF.json')) == src_sum,
}
shutil.rmtree(T, ignore_errors=True)
ok = all(checks.values())
print('RESULT %s precheck-seed %s' % ('PASS' if ok else 'FAIL', json.dumps(checks)), flush=True)
sys.exit(0 if ok else 1)
