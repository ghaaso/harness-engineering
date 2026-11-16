"""Ruling 113 (sleep check, container side). Re-trains ONE unit through heldout.py's own unit loop, Run.units()
(heldout.py:445-487: kge.train -> stageB.score_tasks -> stageB.check_no_fold -> stageB.write_parts ->
stageB.verify_parts), with its task set built by heldout.py's own Run.load_tasks(). heldout.py is imported as a
module (so its OPT is None and its __main__ block does not run); no frozen file is changed.

usage: python run_unit.py control|heldout SEED OUT
  control: the tuning checkpoint 02b9557c6bee (load_tasks in test mode: tune tasks, plan.assignment) - stage B's unit
  heldout: the held-out checkpoint f57288f1f9a1 (load_tasks in real mode: pin_tasks, plan.heldout)
The attributes Run.verify() sets (heldout.py:360-363) are set here from the anchored item-27 record, read through
item27.verify (the record's .sha256 file); verify() itself is not called (its anchor, pin and tables-digest checks
read folders this check does not mount). SEEDS is narrowed to the one seed, so units() trains one unit.
Exit 0 when units() reports no failed unit, 3 otherwise.
"""
import os, sys, json
mode, seed, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
C = {'control': '02b9557c6bee2a634ba9ae33e8705d090aade8d1', 'heldout': 'f57288f1f9a18e41171b0c5be0b0f20674fb4c42'}[mode]
sys.path.insert(0, '/w/train')
import heldout as H  # noqa: E402

assert H.OPT is None and H.DET is False and os.environ['STAGEB_RUNNER'] == 'heldout.py'
o = dict(cmd='run', test=(mode == 'control'), freeze='/w/train/heldout/item27.json', plan='/w/train/stageB/plan.json',
         tasks='/build/tasks/tasks.jsonl', out=OUT, parents=C)
r = H.Run(o)
rec, fh = H.item27.verify(o['freeze'])
plan = json.load(open(o['plan']))
assert plan.get('plan_hash') == rec['plan_hash'] and int(plan['s']) == int(rec['s'])
r.rec, r.fh, r.plan = rec, fh, plan  # as heldout.py:359-363
r.arm = rec['chosen']['arm']; r.cid = rec['chosen']['config_id']; r.cfg = rec['chosen']['cfg']
r.w = float(rec['chosen']['w']); r.epochs = int(rec['chosen']['epochs'])
print('sleep-check: %s seed %d checkpoint %s record sha256 %s: %s %s epochs %d s %d device %s det %s runner %s'
      % (mode, seed, C[:12], fh[:12], r.arm, r.cid, r.epochs, rec['s'], H.kge.DEVICE, H.DET, os.environ['STAGEB_RUNNER']), flush=True)
r.load_tasks()
assert r.ckpts == [C], r.ckpts
print('sleep-check: %d tasks at %s' % (len(r.by_ck[C]), C[:12]), flush=True)
H.SEEDS = (seed,)
failed = r.units()
print('sleep-check: units() failed %d; part %s' % (failed, r.part_dir(seed, C)), flush=True)
sys.exit(0 if failed == 0 else 3)
