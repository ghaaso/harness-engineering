"""Agent B, round 3 (CONFLICTS.md note 21, the coordinator's yes): r58c/B/rehearsal/tune_harness.py takes the arms and
variants from fakesel itself, all of them, with no fixed list. Fail-before: the old bytes
(r58c/B/rehearsal/pre-sixarm/tune_harness.py, which asserted arms == ['E1']) refuse a fakesel holding other arms.
Reads agent A's r58c/A/out/fakesel (fake tables) and the comparators only; nothing under train/stageB, train/selectB,
train/heldout, train/report or grader-returns/. Writes under $R58_OUT.
usage (in a ktest-b container, through kt_inner.sh): python /w/r58c/B/tests/test_tune_harness.py
"""
import importlib.util, json, os, shutil, sys

OUT = os.environ.get('R58_OUT', '/w/r58c/B/out/test_tune_harness')
FAKESEL = '/w/r58c/A/out/fakesel'
NEW = '/w/r58c/B/rehearsal/tune_harness.py'; OLD = '/w/r58c/B/rehearsal/pre-sixarm/tune_harness.py'
n = fails = 0


def check(name, cond, detail=''):
    global n, fails
    n += 1
    if not cond: fails += 1
    print('%s %s%s' % ('PASS' if cond else 'FAIL', name, '' if cond else ' :: %s' % detail), flush=True)


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def tree(root, arms):
    """A fake fakesel: {arm: [file names]} with empty files."""
    shutil.rmtree(root, ignore_errors=True)
    for a, fs in arms.items():
        os.makedirs(os.path.join(root, a))
        for f in fs: open(os.path.join(root, a, f), 'w').close()
    return root


def tables(v):
    return ['%s_%s_s%d.tsv.gz' % (v, sc, s) for sc in ('pool', 'unrestricted') for s in (1, 2, 3)]


def raises(fn):
    try: fn(); return None
    except ValueError as e: return str(e)


os.makedirs(OUT, exist_ok=True)
new = load(NEW, 'tune_harness_new'); old = load(OLD, 'tune_harness_old')
print('sha256 %s %s' % (new.sha(NEW), NEW[3:])); print('sha256 %s %s' % (new.sha(OLD), OLD[3:]))

# 1. discover: what agent A's rebuilt fakesel holds, read from its files
got = new.discover(FAKESEL)
check('discover reads the six arms of agent A\'s fakesel, alone and fused each', got == {a: ['alone', 'fused'] for a in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO')}, got)
# 2. no fixed list: any arm name and any variant name the files carry
g = new.discover(tree(OUT + '/d1', {'Z9': ['choices.json'] + tables('alone') + tables('fused_w0.25') + tables('odd_v')}))
check('discover takes any arm and variant name (Z9: alone, fused_w0.25, odd_v)', g == {'Z9': ['alone', 'fused_w0.25', 'odd_v']}, g)
# 3. refusals
e = raises(lambda: new.discover(tree(OUT + '/d2', {'E1': ['choices.json'] + tables('alone')[:-1]})))
check('discover refuses a variant missing a scope x seed table', e is not None and 'lacks' in e, e)
e = raises(lambda: new.discover(tree(OUT + '/d3', {'E1': ['choices.json', 'notes.txt'] + tables('alone')})))
check('discover refuses a stray file', e is not None and 'notes.txt' in e, e)
e = raises(lambda: new.discover(tree(OUT + '/d4', {'E1': tables('alone')})))
check('discover refuses an arm without choices.json', e is not None and 'choices.json' in e, e)
e = raises(lambda: new.discover(tree(OUT + '/d5', {'E1': ['choices.json']})))
check('discover refuses an arm without a score table', e is not None and 'no score table' in e, e)
e = raises(lambda: new.discover(tree(OUT + '/d6', {'E1': ['choices.json'] + tables('alone') + ['alone_pool_s4.tsv.gz']})))
check('discover refuses a seed outside (1, 2, 3)', e is not None and 'seed' in e, e)
os.makedirs(OUT + '/d7', exist_ok=True); shutil.rmtree(OUT + '/d7'); os.makedirs(OUT + '/d7')
e = raises(lambda: new.discover(OUT + '/d7'))
check('discover refuses an empty fakesel', e is not None and 'no arm' in e, e)

# 4. the whole harness on a two-arm fakesel that holds neither E1 nor only E1 (E3 and PLACEBO, copied from agent A's)
sel2 = OUT + '/sel2'; shutil.rmtree(sel2, ignore_errors=True)
for a in ('E3', 'PLACEBO'): shutil.copytree(os.path.join(FAKESEL, a), os.path.join(sel2, a))
new.SEL = sel2; new.OUT = OUT + '/tune-new.json'
out = new.main()
keys = sorted(out['arms']['late50']['pool'])
check('the harness writes every arm x variant fakesel holds (E3, PLACEBO; alone, fused)', keys == ['E3_alone', 'E3_fused', 'PLACEBO_alone', 'PLACEBO_fused'], keys)
check('verdicts for both arms, primary = fused_pool', sorted(out['verdicts']['late50']) == ['E3', 'PLACEBO']
      and all(out['verdicts']['late50'][a]['primary'] == out['verdicts']['late50'][a]['fused_pool'] for a in ('E3', 'PLACEBO')), out['verdicts'])
h = out['holm']['late50']['pool']['fused']['P@10']
check('Holm over the embedding arms only (E3, not PLACEBO)', sorted(h) == ['E3'], sorted(h))
hc = out['harness_check']
check('harness_check from PLACEBO: ok is a bool, no fixed-w rows, a note', isinstance(hc['ok'], bool) and hc['placebo_fixed_w_late50_pool_P10_vs_RRF'] == {}
      and 'fused_w' in hc.get('note', ''), hc)
check('stamp choices_sha256 for both arms', sorted(out['stamp']['choices_sha256']) == ['E3', 'PLACEBO'], out['stamp'])
check('the file on disk is the returned object', json.load(open(new.OUT))['tasks'] == out['tasks'] == 37, out['tasks'])

# 5. fail-before: the old bytes refuse the same fakesel
old.SEL = sel2; old.OUT = OUT + '/tune-old.json'
try:
    old.main(); r = 'no refusal'
except AssertionError as e:
    r = 'AssertionError %r' % (e.args,)
check('fail-before: pre-sixarm/tune_harness.py refuses a fakesel that is not E1 alone', r.startswith('AssertionError') and 'E3' in r and not os.path.exists(old.OUT), r)
check('fail-before: the old bytes have no discover()', not hasattr(old, 'discover'), dir(old))

print('RESULT %s test_tune_harness (%d checks%s)' % ('PASS' if fails == 0 else 'FAIL', n, '' if fails == 0 else ', %d failed' % fails), flush=True)
sys.exit(0 if fails == 0 else 1)
