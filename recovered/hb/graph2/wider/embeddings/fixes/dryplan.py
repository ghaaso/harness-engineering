"""Fresh dry `stageB.py plan` (pre-run fixes, 2026-11-14): make_plan exactly as the guard would run it, with plan.json,
the progress line and the RUNLOG lines redirected to fixes/dryplan/ (train/ is read-only in the container); refuses
to run unless every timing key of the device's timing_selected file exists, so nothing trains. stageB/parts and
stageB/tables are the real (empty) folders, so ruling 59's start check runs on them. Prints s, checkpoints, plan_hash."""
import os, sys, json, builtins
ROOT = os.environ.get('EMB_ROOT', '/w')
sys.path[:0] = [os.path.join(ROOT, 'train'), os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import stageB as sb, kge
OUT = os.path.join(ROOT, 'fixes', 'dryplan'); os.makedirs(OUT, exist_ok=True)
tp = os.path.join(sb.SB, 'timing_selected%s.json' % ('' if kge.DEVICE.type == 'cpu' else '_' + kge.DEVICE.type))
top = json.load(open(os.path.join(sb.HERE, 'stageA', 'top3.json')))
have = json.load(open(tp)) if os.path.exists(tp) else {}
miss = ['%s/%s/%s' % (a, r['config_id'], t) for a in kge.ARMS for r in top[a]['top3'] for t in 'AL' if '%s/%s/%s' % (a, r['config_id'], t) not in have]
if miss: sys.exit('timing keys missing in %s (%s): a plan would train; not run' % (tp, miss[:3]))
for f in ('plan.json', 'progress.jsonl', 'RUNLOG-lines.md'):
    if os.path.exists(os.path.join(OUT, f)): os.remove(os.path.join(OUT, f))
sb.PLAN = os.path.join(OUT, 'plan.json'); sb.PROG = os.path.join(OUT, 'progress.jsonl')
_open = builtins.open
sb.open = lambda p, *a, **k: _open(os.path.join(OUT, 'RUNLOG-lines.md') if str(p).endswith('RUNLOG.md') else p, *a, **k)
p = sb.make_plan()
assert sb.plan_hash(p['s']) == p['plan_hash']
print(json.dumps(dict(s=p['s'], device=p['device'], lanes=p['lanes'], checkpoints=len(p['checkpoints']), tasks=len(p['lag']),
                      heldout_checkpoints=len(p['heldout']['checkpoints']), plan_hash=p['plan_hash'],
                      files=p['plan_hash_inputs']['files'])), flush=True)
