"""Shared helpers of the held-out driver tests (test_heldout, test_heldout_e4, test_probe): TUNE parents and tasks only,
the item-27 TEST record of test_item27 (r58b/out/fakeB/heldout/item27.json, plan_hash 7e57..., test: true) and its
fake plan (r58b/out/fakeB/stageB/plan.json); a test anchor file stands in for the coordinator's progress.jsonl line
(ruling 80). The previous round's heldout.py (r58b/pre2/heldout.py) runs from a folder of its own (prebin/), so that
nothing of r58b/pre2/ shadows train/'s modules."""
import os, sys, json, subprocess, shutil, hashlib, datetime
from r58common import *
SA = 'cd806c803c4ad8ec198790096d196460789951f0'; ZERO = '2fa68134d22db238b53b12e5f24315af29dce4a0'
FB = os.path.join(ROOT, 'r58b', 'out', 'fakeB')  # read-only synthetic fixture (round r58c: R58_OUT is r58c/A/out)
REC0 = os.path.join(FB, 'heldout', 'item27.json')
FPLAN = os.path.join(FB, 'stageB', 'plan.json')
IMG = 'sha256:r58-test-image'


def current_record(path, **over):
    """Round r58c: the test record of test_item27 (r58b/out/fakeB) re-stamped for the CURRENT bytes: code_sha256 of the
    code as it is now, pins and tuning_inputs {relpath: sha256} (ruling 84, item27.pin_paths/tuning_paths) and the
    tables digest of selectB.tables_digest now (ruling 82); written with its .sha256 file."""
    import item27, selectB
    rec = json.load(open(REC0))
    rec['code_sha256'] = item27.code_hashes(ROOT)
    rec['pins'] = {k: v for k, v in item27.hashes(ROOT, item27.pin_paths(ROOT)[0]).items() if v}
    rec['tuning_inputs'] = {k: v for k, v in item27.hashes(ROOT, item27.tuning_paths(ROOT)).items() if v}
    tb = os.path.join(ROOT, rec['tables'])
    rec['tables_digest'] = selectB.tables_digest(tb, json.load(open(FPLAN)))
    rec.update(over)
    return rec, write_record(path, rec)
TASKS = os.environ.get('GT_TASKS', '/gt/tasks.jsonl')
env0 = dict(os.environ, KGE_DEVICE='cpu', KGE_IMAGE_ID=IMG)


def anchor(path, digest, append=True):
    with open(path, 'a' if append else 'w') as f:
        f.write(json.dumps(dict(step='coordinator', unit='item27_freeze', file='train/heldout/item27.json', sha256=digest,
                                t=datetime.datetime.utcnow().isoformat() + 'Z')) + '\n')


def write_record(path, rec):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode(); open(path, 'wb').write(data)
    h = hashlib.sha256(data).hexdigest(); open(path + '.sha256', 'w').write('%s  %s\n' % (h, os.path.basename(path)))
    return h


REC = os.path.join(OUTR, 'rec_v2', 'item27.json')
current_record(REC)


def prebin3(H):
    """r58c/A/pre/heldout.py, the bytes at the start of round r58c, in a folder of its own."""
    d = os.path.join(H, 'prebin3'); os.makedirs(d, exist_ok=True)
    shutil.copy(os.path.join(ROOT, 'r58c', 'A', 'pre', 'heldout.py'), os.path.join(d, 'heldout.py'))
    return os.path.join(d, 'heldout.py')


def prebin(H):
    d = os.path.join(H, 'prebin'); os.makedirs(d, exist_ok=True)
    shutil.copy(os.path.join(ROOT, 'r58b', 'pre2', 'heldout.py'), os.path.join(d, 'heldout.py'))
    return os.path.join(d, 'heldout.py')


def hrun(out, anc, rec=REC, parents=(SA, ZERO), epochs='2', env=None, tasks=TASKS, stop=None, pre=None, plan=FPLAN, label='', with_anchor=False):
    """heldout.py run --test ... (pre: the path of the previous round's heldout.py, run without --anchor/--stop-after)."""
    script = pre or os.path.join(TRAIN, 'heldout.py')
    cmd = [sys.executable, script, 'run', '--test', '--freeze', rec, '--plan', plan, '--tasks', tasks, '--out', out,
           '--parents', ','.join(parents), '--test-epochs', epochs]
    if not pre or with_anchor:  # with_anchor: a pre script that takes --anchor (r58c/A/pre)
        cmd += ['--anchor', anc] + (['--stop-after', stop] if stop else [])
    e = dict(env or env0)
    if pre: e['PYTHONPATH'] = TRAIN
    p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True, env=e, timeout=900)
    txt = p.stdout + p.stderr
    print('--- %sheldout.py%s exit %d, last lines:' % (label + ' ' if label else '', ' (previous round)' if pre else '', p.returncode), flush=True)
    for l in txt.strip().splitlines()[-4:]: print('   ', l[:300], flush=True)
    return p.returncode, txt


def lines(out):
    p = os.path.join(out, 'progress.jsonl')
    return [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []


def done_units(out):
    return [r for r in lines(out) if r.get('unit', '').startswith('unit/') and r['status'] == 'done']
