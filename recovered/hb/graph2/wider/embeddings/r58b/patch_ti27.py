import sys
p = sys.argv[1] + '/train/r58/tests/test_item27.py'
s = open(p).read()
reps = [
("""plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
json.dump(plan, open(os.path.join(FB, 'stageB', 'plan.json'), 'w'))
""", """plan = json.load(open(os.path.join(TRAIN, 'stageB', 'plan.json')))
REAL_PLAN_HASH = plan['plan_hash']
plan = dict(plan, plan_hash='7e57' * 16)  # ruling 80: test tables never carry the real plan_hash (item27 --test refuses them)
json.dump(plan, open(os.path.join(FB, 'stageB', 'plan.json'), 'w'))
"""),
("""a3 = [x for x in args if x not in ('--test',)]
a3 = a3[:a3.index('--device')]
rc = exits(item27.main, a3 + ['--out', os.path.join(FB, 'h_real', 'item27.json')])
check('item27_real_mode_needs_ruling58_lines', rc == 3, 'exit', rc)
""", """rc = exits(item27.main, [])
check('item27_real_mode_needs_ruling58_lines', rc == 3, 'exit', rc)
# ---- ruling 80 / selection-freeze-1: real mode takes no option; --test needs explicit paths outside the real folders
PRE = load_module('item27_pre', os.path.join(ROOT, 'r58b', 'pre', 'item27.py'))
real_out = os.path.join(TRAIN, 'heldout', 'item27.json')
os.makedirs(os.path.join(FB, 'h_pre'), exist_ok=True); open(os.path.join(FB, 'h_pre', 'item27.json'), 'w').write('{}')
rc_pre = exits(PRE.main, ['--test', '--bogus', 'x', '--out', os.path.join(FB, 'h_pre', 'item27.json')])
check('sf1_pre_accepts_defaults_and_unknown_flags', rc_pre == 6, 'fail before: the stage-1 item27 took --test with the real default --tables/--plan/--sel '
      'and an unknown flag, and went on to the freeze step (exit', rc_pre, 'only because the out file existed)')
rcs = dict(
    test_defaults=exits(item27.main, ['--test']),
    test_real_tables=exits(item27.main, args[:args.index('--tables') + 1] + [os.path.join(TRAIN, 'stageB', 'tables')] + args[args.index('--tables') + 2:]
                           + ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    test_real_out=exits(item27.main, args + ['--out', real_out]),
    test_real_sel=exits(item27.main, args[:args.index('--sel') + 1] + [os.path.join(TRAIN, 'selectB')] + args[args.index('--sel') + 2:]
                        + ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    unknown_flag=exits(item27.main, args + ['--out', os.path.join(FB, 'h_x', 'item27.json'), '--bogus', 'x']),
    real_with_out=exits(item27.main, ['--out', os.path.join(FB, 'h_x', 'item27.json')]),
    real_with_tables=exits(item27.main, ['--tables', TB]))
RT = fresh(os.path.join(FB, 'realhash_tables')); json.dump(dict(plan_hash=REAL_PLAN_HASH), open(os.path.join(RT, 'E1_c01_s1_meta.json'), 'w'))
a4 = list(args); a4[a4.index('--tables') + 1] = RT
rcs['test_tables_with_real_plan_hash'] = exits(item27.main, a4 + ['--out', os.path.join(FB, 'h_x', 'item27.json')])
check('sf1_r80_refusals', all(v == 2 for v in rcs.values()) and not os.path.exists(os.path.join(FB, 'h_x')) and not os.path.exists(real_out),
      json.dumps(rcs), '; nothing written under h_x or train/heldout')
"""),
]
for a, b in reps:
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
open(p, 'w', newline='\n').write(s)
print('patched test_item27.py')
