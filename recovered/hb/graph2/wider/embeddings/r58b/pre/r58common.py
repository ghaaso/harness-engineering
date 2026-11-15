"""Shared helpers of the ruling-58 plumbing tests (tuning data only; nothing here reads sealed/ or held-out truth)."""
import os, sys, json, hashlib, importlib.util, gzip, shutil
ROOT = os.environ.get('EMB_ROOT', '/w')
TRAIN = os.path.join(ROOT, 'train')
OUTR = os.path.join(TRAIN, 'r58', 'out')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'eval'), os.path.join(ROOT, 'export')]
OK = {}


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def show_hashes(*rels):
    for r in rels:
        print('sha256 %s %s' % (sha(os.path.join(ROOT, r)), r), flush=True)


def check(name, cond, *msg):
    OK[name] = bool(cond)
    print('%-44s %s %s' % (name, 'ok' if cond else 'FAILED', ' '.join(str(m) for m in msg)[:600]), flush=True)


def finish(role):
    print('RESULT %s %s %s' % ('PASS' if OK and all(OK.values()) else 'FAIL', role, json.dumps(OK)), flush=True)
    return all(OK.values())


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def exits(fn, *a, **k):
    """exit code of fn (SystemExit code; 0 when it returns)."""
    try:
        fn(*a, **k)
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 1
    return 0


def fresh(d):
    if os.path.exists(d): shutil.rmtree(d)
    os.makedirs(d)
    return d
