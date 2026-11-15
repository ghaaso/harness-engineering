"""Agent A, round r58c (the coordinator's item 4 after ruling 96, and ruling 97's root-level file question): the rehearsal
driver on a DAMAGED COPY of its staging must stop with an error, not pack. The staging is the rehearsal's own form, built
here with the current train/heldout_inputs.js (--parents cd806c80,2fa68134,7b3a7452 from the build's facts cache and
shared code); the driver is heldout.py run --test, as r58c/A/rehearsal.py runs it in kge-H1R, with GT_FACTS_CACHE,
GT_COMMON and GT_SRCSTORE pointing at the staged copy (kge-H1R mounts the staging at those places) and no GT_REPO (no
container of the run mounts the repository, ruling 94). One control run trains and ranks on two parents (cd806c80,
2fa68134; E1 test record, 1 epoch) and stops after `ranked`; each case resumes a copy of it (straight to the packs) on
its own staging copy:
  intact    the staging untouched: rc 0 and HANDOFF.json (the positive control);
  blob      one blob deleted: the text of a doc_section node of cd806c80 (read when the facts load, facts.js:74);
  tree      one whole tree deleted: 2fa68134's trees/<P>.json;
  both      that blob and that tree;
  rootfile  the blob of a ROOT-LEVEL non-code file of cd806c80 that no doc_section or invariant node reads (ruling 97(a):
            the held-out layer's nodes carry such a path) - reported as found, whatever it is.
Each case records rc, whether HANDOFF.json and a `packs` line were written, the error's last lines, and
heldout_inputs.js check's verdict on the damaged copy. PASS: intact packs; blob, tree and both stop (rc != 0, no packs
line, no HANDOFF.json); rootfile is RECORDED (if it packs, that is reported with the shared code's lines, not patched).
Writes r58c/A/out/negative (removed at the end). Runs in a ktest-a<N> container (EMB_ROOT=/w); reads no table."""
import os, sys, json, shutil, subprocess, re
sys.path.insert(0, os.path.join('/w', 'train', 'r58', 'tests'))
from hotest import *
show_hashes('train/heldout.py', 'train/heldout_inputs.js', 'train/answer_level.py', 'train/answer_level.js')
H = fresh(os.path.join(OUTR, 'negative'))
BIG = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'
ST = os.path.join(H, 'stage', 'inputs')
b = subprocess.run(['node', os.path.join(TRAIN, 'heldout_inputs.js'), 'build', '--plan', FPLAN, '--facts', os.environ.get('GT_FACTS_CACHE', '/gt/facts'),
                    '--common', os.environ.get('GT_COMMON', '/gt/common'), '--out', ST, '--parents', ','.join((SA, ZERO, BIG))], capture_output=True, text=True)
print('staging build rc', b.returncode, b.stderr[-300:], flush=True)
assert b.returncode == 0


def env_for(stage):
    e = dict(env0, GT_FACTS_CACHE=os.path.join(stage, 'facts'), GT_COMMON=os.path.join(stage, 'common'),
             GT_SRCSTORE=os.path.join(stage, 'common', 'srcstore'))
    e.pop('GT_REPO', None)
    return e


def copy_stage(name):
    d = os.path.join(H, name, 'inputs'); shutil.copytree(ST, d); shutil.copy(ST + '.sha256', d + '.sha256'); return d


def tree(stage, P): return json.load(open(os.path.join(stage, 'common', 'srcstore', 'trees', P + '.json')))


nodes = [json.loads(l) for l in open(os.path.join(ST, 'facts', SA, 'nodes.jsonl')) if l.strip()]
tSA = tree(ST, SA)
docsec = sorted({n['path'] for n in nodes if n.get('kind') in ('doc_section', 'invariant') and n.get('path') and n.get('line_start') and n['path'] in tSA})
BLOB = tSA[docsec[0]]
code_paths = {n['path'] for n in nodes if n.get('kind') == 'file' and n.get('path') and re.search(r'\.(py|js|jsx|ts|tsx|mjs|cjs)$', n['path'])}
read_paths = set(docsec)
root = sorted(p for p in tSA if '/' not in p and p not in code_paths and p not in read_paths and tSA[p] != BLOB
              and sum(1 for q in tSA if tSA[q] == tSA[p]) == 1)
ROOTF = root[0] if root else None
print('blob case: %s (%s.txt, a doc_section text); rootfile case: %s; root-level paths in the tree %d' % (docsec[0], BLOB, ROOTF, sum('/' not in p for p in tSA)), flush=True)
anc = os.path.join(H, 'anchor.jsonl'); anchor(anc, open(REC + '.sha256').read().split()[0], append=False)
ctrl = os.path.join(H, 'ctrl')
rc, txt = hrun(ctrl, anc, parents=(SA, ZERO), epochs='1', env=env_for(ST), stop='ranked', label='control')
assert rc == 0, txt[-800:]
res = {}


def case(name, damage):
    d = copy_stage(name); damage(d)
    c = subprocess.run(['node', os.path.join(TRAIN, 'heldout_inputs.js'), 'check', '--plan', FPLAN, '--dir', d, '--manifest', d + '.sha256',
                        '--parents', ','.join((SA, ZERO, BIG))], capture_output=True, text=True)
    out = os.path.join(H, name, 'run'); shutil.copytree(ctrl, out)
    rc, txt = hrun(out, anc, parents=(SA, ZERO), epochs='1', env=env_for(d), label=name)
    L = lines(out)
    err = [l for l in txt.splitlines() if re.search(r'Error|ENOENT|at .*\.js:\d+|Traceback|exit', l)][-8:]
    r = dict(rc=rc, handoff=os.path.exists(os.path.join(out, 'HANDOFF.json')), packs_line=any(x.get('unit') == 'packs' for x in L),
             check_rc=c.returncode, check_problems=(json.loads(c.stdout).get('problems') if c.stdout.strip().startswith('{') else c.stdout[-300:]),
             error_lines=[l.strip()[:220] for l in err])
    res[name] = r
    print('case %-8s rc %s handoff %s packs_line %s check_rc %s' % (name, rc, r['handoff'], r['packs_line'], c.returncode), flush=True)
    for l in r['error_lines']: print('    ', l, flush=True)
    return r


def rm_blob(h):
    def f(d): os.remove(os.path.join(d, 'common', 'srcstore', 'blobs', h + '.txt'))
    return f


def rm_tree(d): os.remove(os.path.join(d, 'common', 'srcstore', 'trees', ZERO + '.json'))


case('intact', lambda d: None)
case('blob', rm_blob(BLOB))
case('tree', rm_tree)
case('both', lambda d: (rm_blob(BLOB)(d), rm_tree(d)))
if ROOTF: case('rootfile', rm_blob(tSA[ROOTF]))
stops = lambda r: r['rc'] != 0 and not r['handoff'] and not r['packs_line']
check('neg_intact_packs', res['intact']['rc'] == 0 and res['intact']['handoff'] and res['intact']['check_rc'] == 0, json.dumps(res['intact'])[:300])
check('neg_blob_stops', stops(res['blob']) and res['blob']['check_rc'] != 0, json.dumps(res['blob'])[:600])
check('neg_tree_stops', stops(res['tree']) and res['tree']['check_rc'] != 0, json.dumps(res['tree'])[:600])
check('neg_both_stops', stops(res['both']) and res['both']['check_rc'] != 0, json.dumps(res['both'])[:600])
print('ROOTFILE ' + json.dumps(dict(path=ROOTF, **(res.get('rootfile') or {}))), flush=True)
json.dump(dict(blob_case=dict(path=docsec[0], blob=BLOB), rootfile_case=ROOTF, cases=res), open(os.path.join(OUTR, 'negative.json'), 'w'), indent=1)
shutil.rmtree(H, ignore_errors=True)
ok = finish('rehearsal-negative')
sys.exit(0 if ok else 1)
