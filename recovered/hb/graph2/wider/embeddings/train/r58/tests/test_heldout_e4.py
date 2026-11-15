"""Held-out driver, E4 under ruling 67 (review heldout-e4-runner-not-checked), TUNE parent cd806c80 only, one epoch:
every part's runner records det=1 (the flags are set before torch loads); a part whose runner lacks the word det=1 is
refused in assemble (exit 7). Fail before: the previous round's heldout.py (r58b/pre2) assembled it."""
import os, sys, json, shutil, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hotest import *
show_hashes('train/heldout.py', 'r58b/pre2/heldout.py')
H = fresh(os.path.join(OUTR, 'heldout_e4_test'))
PREPY = prebin(H)
rec = json.load(open(REC)); plan = json.load(open(FPLAN))
c4 = plan['configs']['E4'][1]
r4 = dict(rec); r4['chosen'] = dict(arm='E4', config_id=c4['config_id'], cfg=c4['cfg'], w=0.5, epochs=c4['epochs'], figure_all65=0.0, se=0.0)
p4 = os.path.join(H, 'e4rec', 'item27.json'); h4 = write_record(p4, r4)
A = os.path.join(H, 'progress.jsonl'); anchor(A, h4, append=False)
O4 = os.path.join(H, 'E4')
rc, txt = hrun(O4, A, rec=p4, parents=(SA,), epochs='1', stop='units')
m4 = [json.load(open(p)) for p in glob.glob(os.path.join(O4, 'parts', '**', 'meta.json'), recursive=True)]
check('ho_e4_det', rc == 0 and len(m4) == 3 and all(m.get('runner') == 'heldout.py det=1' for m in m4) and 'det True' in txt,
      'exit', rc, 'runners', sorted({m.get('runner') for m in m4}))
for tag in ('new', 'pre'):
    d = os.path.join(H, 'E4_nodet_' + tag); shutil.copytree(O4, d)
    mp = sorted(glob.glob(os.path.join(d, 'parts', '**', 'meta.json'), recursive=True))[0]
    m = json.load(open(mp)); m['runner'] = 'heldout.py'; json.dump(m, open(mp, 'w'), indent=1)
rc, txt = hrun(os.path.join(H, 'E4_nodet_new'), A, rec=p4, parents=(SA,), epochs='1')
check('e4_part_without_det_refused', rc == 7 and 'without det=1' in txt and not os.path.exists(os.path.join(H, 'E4_nodet_new', 'HANDOFF.json')), 'exit', rc)
rcp, txtp = hrun(os.path.join(H, 'E4_nodet_pre'), A, rec=p4, parents=(SA,), epochs='1', pre=PREPY)
check('e4_pre_assembled_it', rcp == 0 and os.path.exists(os.path.join(H, 'E4_nodet_pre', 'HANDOFF.json')),
      'fail before: the previous heldout.py assembled and handed off a part without det=1 (exit %d)' % rcp)
ok = finish('heldout-e4')
sys.exit(0 if ok else 1)
