"""Ruling 86(b): the in-container half of the held-out driver's rehearsal in TEST mode (container kge-H1R, started by
REHEARSAL=<ARM> sh train/heldout.sh, driven by r58c/A/rehearse.sh). On the first launch it writes a TEST item-27 record
for the arm (E4: c13 or c16, deterministic; E5; E1: the first planned configuration) from the synthetic record of
r58b/out/fakeB with the current code hashes, pins and tables digest, the device of this container and its image id,
and a TEST anchor line; every launch then runs heldout.py run --test on three tuning parents (cd806c80 the smallest
with tasks, 2fa68134 without a co_changed fact, 7b3a7452 the largest) with --test-epochs 2, resuming finished units.
It reads no real table (the synthetic stage r58b/out/fakeB/stageB) and no held-out graph; it writes only
/w/r58c/rehearsal/<ARM>. Exit code = heldout.py's."""
import os, sys, json, hashlib, datetime, subprocess
ROOT = '/w'; TRAIN = os.path.join(ROOT, 'train')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'eval'), os.path.join(ROOT, 'export')]
import item27, selectB, kge
ARM = os.environ['REHEARSAL_ARM']
OUT = os.path.join(ROOT, 'r58c', 'rehearsal', ARM)
FB = os.path.join(ROOT, 'r58b', 'out', 'fakeB'); PL = os.path.join(FB, 'stageB', 'plan.json')
PARENTS = ('cd806c803c4ad8ec198790096d196460789951f0', '2fa68134d22db238b53b12e5f24315af29dce4a0', '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4')
RP = os.path.join(OUT, 'rec', 'item27.json'); ANC = os.path.join(OUT, 'rec', 'progress.jsonl')
if not os.path.exists(RP):
    plan = json.load(open(PL)); cfgs = plan['configs'][ARM]
    c = ([x for x in cfgs if x['config_id'] in ('c13', 'c16')] or cfgs)[0] if ARM == 'E4' else cfgs[0]
    rec = json.load(open(os.path.join(FB, 'heldout', 'item27.json')))
    rec['chosen'] = dict(arm=ARM, config_id=c['config_id'], cfg=c['cfg'], w=0.5, epochs=c['epochs'], figure_all65=0.0, se=0.0)
    rec['code_sha256'] = item27.code_hashes(ROOT)
    rec['pins'] = {k: v for k, v in item27.hashes(ROOT, item27.pin_paths(ROOT)[0]).items() if v}
    rec['tuning_inputs'] = {k: v for k, v in item27.hashes(ROOT, item27.tuning_paths(ROOT)).items() if v}
    rec['tables_digest'] = selectB.tables_digest(os.path.join(ROOT, rec['tables']), plan)
    rec.update(device=kge.DEVICE.type, image_id=os.environ.get('KGE_IMAGE_ID'), test=True,
               note='TEST record of the ruling-86(b) rehearsal (round r58c, agent A); not a frozen choice')
    os.makedirs(os.path.dirname(RP), exist_ok=True)
    data = json.dumps(rec, indent=1, sort_keys=True).encode(); open(RP, 'wb').write(data)
    fh = hashlib.sha256(data).hexdigest(); open(RP + '.sha256', 'w').write('%s  item27.json\n' % fh)
    open(ANC, 'w').write(json.dumps(dict(step='coordinator', unit='item27_freeze', file='train/heldout/item27.json', sha256=fh,
                                         t=datetime.datetime.utcnow().isoformat() + 'Z', test=True,
                                         note="TEST anchor of the rehearsal; not the coordinator's")) + '\n')
    print('rehearsal: wrote the test record', RP, fh, ARM, c['config_id'], flush=True)
cmd = [sys.executable, os.path.join(TRAIN, 'heldout.py'), 'run', '--test', '--freeze', RP, '--plan', PL, '--tasks', '/gt/tasks.jsonl',
       '--out', os.path.join(OUT, 'run'), '--anchor', ANC, '--parents', ','.join(PARENTS), '--test-epochs', '2']
print('rehearsal:', ' '.join(cmd), flush=True)
sys.exit(subprocess.call(cmd, cwd=TRAIN))
