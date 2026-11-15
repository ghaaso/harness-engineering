"""Plumbing test of r58c/B/rerun/rerun_check.py (END-ORDER step 2c) on CPU, in a ktest-b container. No real table and
no real progress line is read: every tree is built here under /tmp (the frozen plan copy r58c/B/frozen/plan.json, fake
progress lines, fake or freshly trained parts). Part A (no training): the pick rule and its fallbacks, the refusals.
Part B (CPU training through the real orchestrator/rerun_unit.py, fresh process per unit): a unit trained twice is
equal under ruling 68; a part with one changed score row is a MISMATCH (exit 1). Fail-before: two mutants of
rerun_check.py (copies in /tmp, the rule broken) must fail the same checks: M1 picks line N+1 for line N; M2 never
raises the exit for a mismatch.
usage: python test_rerun_check.py      (env: BOUT, the writable folder; default /w/r58c/B/out)
"""
import os, sys, json, gzip, shutil, subprocess, hashlib

W = '/w'; B = os.path.join(W, 'r58c', 'B'); RRC = os.path.join(B, 'rerun', 'rerun_check.py')
BOUT = os.environ.get('BOUT', os.path.join(B, 'out')); OUT = os.path.join(BOUT, 'rerun-test'); T = '/tmp/rrt'
PLAN = os.path.join(B, 'frozen', 'plan.json'); plan = json.load(open(PLAN))
CK8 = [c for c in plan['checkpoints'] if c.startswith('8b506c0dac14')][0]; CK2 = [c for c in plan['checkpoints'] if c.startswith('2fa68134d22d')][0]
FAIL = []
print('sha256 %s r58c/B/rerun/rerun_check.py' % hashlib.sha256(open(RRC, 'rb').read()).hexdigest())
print('sha256 %s r58c/B/tests/test_rerun_check.py' % hashlib.sha256(open(os.path.abspath(__file__), 'rb').read()).hexdigest())


def check(name, ok, info=''):
    print('%s %s %s' % ('PASS' if ok else 'FAIL', name, info), flush=True)
    if not ok: FAIL.append(name)
    return ok


def tree(root, lines, parts):
    """A fake stage-B tree: plan.json (the frozen copy), progress.jsonl (lines), parts {unit: runner}."""
    shutil.rmtree(root, ignore_errors=True); os.makedirs(os.path.join(root, 'stageB', 'parts'))
    shutil.copy(PLAN, os.path.join(root, 'stageB', 'plan.json'))
    with open(os.path.join(root, 'progress.jsonl'), 'w') as f:
        f.write(json.dumps(dict(step='stageB', unit='plan', status='done')) + '\n')
        for l in lines: f.write(json.dumps(dict(step='stageB', status='done', **l)) + '\n')
        f.write('not json\n')
    for u, runner in parts.items():
        arm, cid, sd, ck = u.split('/'); full = [c for c in plan['checkpoints'] if c.startswith(ck)][0]
        d = os.path.join(root, 'stageB', 'parts', arm, cid, sd, full); os.makedirs(d)
        json.dump(dict(runner=runner), open(os.path.join(d, 'meta.json'), 'w')); json.dump({}, open(os.path.join(d, 'counts.json'), 'w'))
    return root


def sel(prog, root, *extra):
    r = subprocess.run([sys.executable, prog, 'select', '--tree', root] + list(extra), capture_output=True, text=True,
                       env=dict(os.environ, RR_ORCH=W + '/orchestrator'))
    try: return r.returncode, {p['setting']: p for p in json.loads(r.stdout)}
    except ValueError: return r.returncode, r.stdout + r.stderr


U = lambda cid, s, ck: 'E1/%s/s%d/%s' % (cid, s, ck)
CKS = [c[:12] for c in plan['checkpoints']]


def part_a(prog, tag):
    """The pick rule. E1/c04: 5 distinct done lines (one repeated); E1/c15: line 3 untrained; E1/c12: two lines only;
    E2..E5: none (exit 3). E4/c12: one line whose runner lacks det=1."""
    c04 = [dict(unit=U('c04', 1, CKS[i])) for i in range(1, 6)]
    c04.insert(2, dict(unit=U('c04', 1, CKS[1])))  # a repeated done line counts once
    c15 = [dict(unit=U('c15', 1, CKS[1])), dict(unit=U('c15', 1, CKS[2])), dict(unit=U('c15', 1, CKS[3]), trained=False),
           dict(unit=U('c15', 1, CKS[4]))]
    c12 = [dict(unit=U('c12', 1, CKS[1])), dict(unit=U('c12', 1, CKS[2]))]
    e4 = [dict(unit='E4/c12/s1/%s' % CKS[5])]
    parts = {l['unit']: 'guard x' for l in c04 + c15 + c12}; parts['E4/c12/s1/%s' % CKS[5]] = 'guard x'
    root = tree(T + '/a', c04 + c15 + c12 + e4, parts)
    rc, P = sel(prog, root, '--test', '--nth', '3')
    if not isinstance(P, dict): return check(tag + 'A0 select output parses', False, str(P)[:300])
    check(tag + 'A1 done line 3 of E1/c04 (the repeated line counts once)', P['E1/c04'].get('unit') == U('c04', 1, CKS[3]) and
          P['E1/c04'].get('rule') == 'done line 3 of the setting' and P['E1/c04'].get('position') == 3, json.dumps(P['E1/c04'])[:200])
    check(tag + 'A2 an untrained line 3 passes to the next trained line', P['E1/c15'].get('unit') == U('c15', 1, CKS[4]) and
          P['E1/c15'].get('rule') == 'the first trained done line after line 3', json.dumps(P['E1/c15'])[:200])
    check(tag + 'A3 fewer than 3 lines: the last trained line', P['E1/c12'].get('unit') == U('c12', 1, CKS[2]) and
          P['E1/c12'].get('rule') == 'fewer than 3 done lines: the last trained done line', json.dumps(P['E1/c12'])[:200])
    check(tag + 'A4 a setting without a done line: no unit, exit 3', P['E2/c07'].get('unit') is None and P['E2/c07'].get('rule') == 'no unit' and rc == 3)
    check(tag + 'A5 E4 always det, and its part without det=1 is a problem', P['E4/c12'].get('det') is True and 'det=1' in P['E4/c12'].get('problem', ''))
    check(tag + 'A6 fifteen settings in plan order', list(P) == ['%s/%s' % (a, c['config_id']) for a in sorted(plan['configs']) for c in plan['configs'][a]])
    rc, _ = sel(prog, root, '--nth', '3'); check(tag + 'A7 --nth outside --test: exit 2', rc == 2, 'rc %s' % rc)
    rc, _ = sel(prog, root, '--bogus', 'x'); check(tag + 'A8 an unknown option: exit 2', rc == 2, 'rc %s' % rc)
    r = subprocess.run([sys.executable, prog, 'run', '--tree', root, '--out', root + '/stageB/x'], capture_output=True, text=True,
                       env=dict(os.environ, RR_ORCH=W + '/orchestrator'))
    check(tag + 'A9 --out inside the tree: exit 2', r.returncode == 2, 'rc %s' % r.returncode)
    rc, P = sel(prog, tree(T + '/a2', [dict(unit='E4/c12/s1/%s' % CKS[5])], {'E4/c12/s1/%s' % CKS[5]: 'g det=1'}), '--test', '--nth', '1')
    check(tag + 'A10 an E4 part with det=1 has no problem', isinstance(P, dict) and P['E4/c12'].get('det') is True and not P['E4/c12'].get('problem'))


def mutant(src, dst, old, new):
    t = open(src).read(); assert old in t, old; open(dst, 'w').write(t.replace(old, new, 1)); return dst


def run(prog, root, out, runner=None):
    shutil.rmtree(out, ignore_errors=True)
    cmd = [sys.executable, prog, 'run', '--test', '--nth', '2', '--only', 'E2/c07', '--tree', root, '--out', out] + (['--runner', runner] if runner else [])
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=400, env=dict(os.environ, RR_ORCH=W + '/orchestrator', RERUN_TRAIN=T + '/train'))
    print(r.stdout[-1500:], r.stderr[-1500:], flush=True)
    return r.returncode, [json.loads(l) for l in open(os.path.join(out, 'compare.jsonl'))] if os.path.exists(os.path.join(out, 'compare.jsonl')) else []


part_a(RRC, '')
M1 = mutant(RRC, '/tmp/m1_rerun_check.py', 'i >= nth - 1 and trained(r)', 'i >= nth and trained(r)')
m1 = len(FAIL); part_a(M1, 'MUTANT-M1 ')
check('A-fail-before M1 (picks line N+1) fails part A', len(FAIL) > m1, '%d checks failed on the mutant' % (len(FAIL) - m1))
del FAIL[m1:]
# ---- part B: real CPU training through orchestrator/rerun_unit.py (RERUN_TRAIN: a copy of the code + the frozen plan)
os.makedirs(T + '/train/stageB', exist_ok=True)
os.makedirs(T + '/train/stageA', exist_ok=True)
for f in ('stageB.py', 'kge.py', 'proj.py', 'atomic.py', 'detrun.py', 'stageA_configs.json', 'timing.json', 'stride.json', 'stageA/top3.json'):
    if os.path.exists(os.path.join(W, 'train', f)): shutil.copy(os.path.join(W, 'train', f), T + '/train/' + f)
shutil.copy(PLAN, T + '/train/stageB/plan.json')
# plumbing on CPU only: ruling 59's plan_hash covers the device, so the COPY's plan is re-hashed for cpu (the real
# run on the card uses train/stageB/plan.json unchanged)
r = subprocess.run([sys.executable, '-c', "import sys,json; sys.path.insert(0,'%s/train'); import stageB; p=json.load(open(stageB.PLAN)); "
                    "p['plan_hash']=stageB.plan_hash(p['s']); json.dump(p,open(stageB.PLAN,'w'))" % T], capture_output=True, text=True)
check('B-setup the copy plan re-hashed for cpu', r.returncode == 0, r.stderr[-300:])
UNIT = 'E2/c07/s1/%s' % CK8[:12]
r = subprocess.run([sys.executable, W + '/orchestrator/rerun_unit.py', '--out', T + '/orig', '--rec', T + '/orig.jsonl', UNIT + '=orig'],
                   capture_output=True, text=True, timeout=300, env=dict(os.environ, RERUN_TRAIN=T + '/train'))
print(r.stdout[-800:], r.stderr[-800:], flush=True)
recs = [json.loads(l) for l in open(T + '/orig.jsonl')] if os.path.exists(T + '/orig.jsonl') else []
if check('B0 the original unit trained on CPU (rerun_unit.py)', r.returncode == 0 and recs and recs[-1].get('status') == 'done'):
    lines = [dict(unit='E2/c07/s1/%s' % CK2[:12], trained=False), dict(unit='E2/c07/s2/%s' % CK2[:12], trained=False), dict(unit=UNIT, trained=True)]
    root = tree(T + '/b', lines, {})
    d = os.path.join(root, 'stageB', 'parts', 'E2', 'c07', 's1', CK8); shutil.copytree(T + '/orig/orig', d)
    rc, res = run(RRC, root, OUT + '/equal')
    check('B1 retrained in a fresh process: equal under ruling 68, exit 0', rc == 0 and len(res) == 1 and res[0]['result'] == 'equal' and
          res[0]['rule'] == 'the first trained done line after line 2' and res[0]['unit'] == UNIT, json.dumps(res)[:300])
    pj = json.load(open(OUT + '/equal/picks.json')); rj = json.load(open(OUT + '/equal/result.json'))
    check('B2 picks.json and result.json name the code by sha256', len(pj.get('rerun_check_sha256', '')) == 64 and rj.get('rc') == 0 and rj.get('equal') == 1)
    # one changed score row in the stage-B part's pool table
    p = os.path.join(d, 'pool.tsv.gz'); rows = gzip.open(p, 'rt').read().split('\n')
    i = next(k for k, l in enumerate(rows) if l and not l.startswith('#') and '\t' in l and k > 0)
    f = rows[i].split('\t'); f[-1] = f[-1] + '1' if '.' in f[-1] else f[-1] + '.5'; rows[i] = '\t'.join(f)
    with gzip.open(p, 'wt') as g: g.write('\n'.join(rows))
    rc, res = run(RRC, root, OUT + '/mismatch')
    check('B3 one changed score row: MISMATCH, exit 1', rc == 1 and res and res[0]['result'] == 'MISMATCH' and res[0]['tables']['pool'] is False,
          json.dumps(res)[:300])
    # fail-before: M2 never raises the exit for a mismatch (a fake runner replays the trained record: no training)
    fake = T + '/fake_runner.py'
    open(fake, 'w').write("import sys,json,shutil,os\na=sys.argv[1:];o=a[a.index('--out')+1];r=a[a.index('--rec')+1];u,_,t=a[-1].partition('=')\n"
                          "x=[json.loads(l) for l in open('%s/orig.jsonl')][-1];x['tag']=t\nshutil.copytree('%s/orig/orig',os.path.join(o,t))\n"
                          "open(r,'a').write(json.dumps(x)+'\\n')\n" % (T, T))
    rc, res = run(RRC, root, OUT + '/mismatch-fake', fake)
    check('B4 the same mismatch through the replaying runner: exit 1', rc == 1 and res and res[0]['result'] == 'MISMATCH')
    M2 = mutant(RRC, '/tmp/m2_rerun_check.py', "if res['result'] != 'equal': rcode = max(rcode, 1)", 'pass')
    rc, res = run(M2, root, OUT + '/mismatch-m2', fake)
    check('B-fail-before M2 (a mismatch keeps exit 0) fails B4\'s check', not (rc == 1 and res and res[0]['result'] == 'MISMATCH'), 'mutant rc %s' % rc)
print('RESULT %s test_rerun_check (%d failed: %s)' % ('PASS' if not FAIL else 'FAIL', len(FAIL), FAIL))
sys.exit(1 if FAIL else 0)
