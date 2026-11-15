"""Release-gate findings scoring-selection-3 and -4 (item-17 counts, ruling 62), on TUNING data only.
Real per-task counts from kge.score (the stage-B scoring call) with stage-A representations (E1 c04 and E5 c03,
trained at the stage-A parent cd806c80 with its hold-out) for the five tune tasks at that parent plus one synthetic
task whose seed is no entity (an unscored seed), and stage B's own no-co_changed record for the three tune tasks at
2fa68134 (the checkpoint without any co_changed fact). The same per-task counts are written as the count files of
three configurations x three seeds (whether a seed or candidate is scored does not depend on the model).
fail before: the pre-fix report block (exec'd from train/r58/pre/report.py) sums over seeds and configurations and its
E5 ruling-55 figures do not reconcile; pass after: report.count_figures gives one configuration and one seed, three
separate figures that reconcile, distinct entities, and a recompute (ScoreStatus) equal to the count files."""
import os, sys, json, collections, textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import evalcore as ec
import kge, selectB, report
show_hashes('train/report.py', 'train/r58/pre/report.py')
D = fresh(os.path.join(OUTR, 'counts'))
SA = kge.STAGEA_SHA; ZERO = '2fa68134d22db238b53b12e5f24315af29dce4a0'
G0 = os.path.join(ROOT, 'export', 'graphs0')
tasks = ec.load_tasks(); cl = selectB.cand_lists()
TA = [t for t in tasks if t['parent'] == SA]; TZ = [t for t in tasks if t['parent'] == ZERO]
syn = dict(TA[0], task_id='T1-X001', seed='no/such/file_r58.py')
for sc in ('pool', 'unrestricted'): cl[sc]['T1-X001'] = list(cl[sc][TA[0]['task_id']])
T = TA + [syn] + TZ; by_id = {t['task_id']: t for t in T}
print('tasks: %d at the stage-A parent, 1 synthetic unscored seed, %d at the no-co_changed checkpoint' % (len(TA), len(TZ)), flush=True)
G = kge.Graph(SA, holdout=True)
st = report.ScoreStatus(G0, SA, train=G.train)
pre_src = open(os.path.join(TRAIN, 'r58', 'pre', 'report.py')).read()
i0 = pre_src.index('        for a in EMB:\n            agg = collections.Counter()'); i1 = pre_src.index("            out['counts'][a] = dict(agg)\n") + len("            out['counts'][a] = dict(agg)\n")
OLD = textwrap.dedent(pre_src[i0:i1])
for arm, cid in (('E1', 'c04'), ('E5', 'c03')):
    rp = os.path.join(TRAIN, 'stageA', arm, cid, 'reps.pt')
    per = {}
    for t in TA + [syn]:
        rec = dict(parent=SA, checkpoint=SA, lag=0)
        for sc in ('pool', 'unrestricted'):
            _, rec[sc] = kge.score(rp, [(t['task_id'], t['seed'], cl[sc][t['task_id']])], SA)
        per[t['task_id']] = rec
    for t in TZ:
        per[t['task_id']] = dict(parent=ZERO, checkpoint=ZERO, lag=0, note='checkpoint has no co_changed fact (by ruling 51 neither has the parent graph)',
                                 **{sc: dict(seeds=1, seeds_unscored=1, cands=len(cl[sc][t['task_id']]), cands_unscored=len(cl[sc][t['task_id']])) for sc in ('pool', 'unrestricted')})
    F = os.path.join(D, arm); TB = os.path.join(F, 'stageB', 'tables'); os.makedirs(TB)
    cids = [cid, 'cx2', 'cx3']
    for c in cids:
        for s in (1, 2, 3): json.dump(per, open(os.path.join(TB, '%s_%s_s%d_counts.json' % (arm, c, s)), 'w'))
    # ---- before: the pre-fix block, run as written
    g = dict(os=os, json=json, collections=collections, HERE=F, SEEDS=(1, 2, 3), SCOPES=('pool', 'unrestricted'), EMB=(arm,),
             plan=dict(configs={arm: [dict(config_id=c) for c in cids]}), late_ids=set(by_id), out=dict(counts={}))
    exec(OLD, g)
    old = g['out']['counts'][arm]
    n = len(T)
    old_seeds = old.get('%s/pool/seeds' % cid, 0)
    old_abs = old.get('%s/pool/cands_unscored_absent_at_C' % cid, 0); old_nr = old.get('%s/pool/cands_unscored_not_in_routed_specialists' % cid, 0)
    old_unsc = old.get('%s/pool/cands_unscored' % cid, 0)
    configs_mixed = len({k.split('/')[0] for k in old})
    check('ss4_%s_pre_counts_three_seeds_and_configs' % arm, old_seeds == 3 * n and configs_mixed == 3,
          'fail before: pre-fix seeds count for', cid, '=', old_seeds, 'for', n, 'tasks (3 seeds summed);', configs_mixed, 'configurations in one figure; no distinct figure')
    if arm == 'E5':
        check('ss3_E5_pre_ruling55_does_not_reconcile', old_abs + old_nr != old_unsc or 'cands_unscored_seed_unscored' in {k.split('/')[-1] for k in old},
              'fail before: absent %d + not-routed %d vs cands_unscored %d; double-counted key cands_unscored_seed_unscored %d'
              % (old_abs, old_nr, old_unsc, old.get('%s/pool/cands_unscored_seed_unscored' % cid, 0)))
    # ---- after: report.count_figures for the chosen configuration, seed 1
    rc = lambda c, s: json.load(open(os.path.join(TB, '%s_%s_s%d_counts.json' % (arm, c, s)))) if os.path.exists(os.path.join(TB, '%s_%s_s%d_counts.json' % (arm, c, s))) else None
    new = report.count_figures(arm, {tid: cid for tid in by_id}, by_id, rc, cl, lambda t: st if t['parent'] == SA else None)
    p = new['pool']; o = p['occurrences']
    print(arm, 'pool occurrences', json.dumps(o), 'distinct', json.dumps(p['distinct']), flush=True)
    check('ss4_%s_new_one_config_one_seed' % arm, o.get('tasks') == n and p['same_across_seeds'] is True, 'pass after: tasks', o.get('tasks'), 'of', n)
    us = [tid for tid, r in per.items() if 'note' not in r and r['pool'].get('seeds_unscored')]  # the synthetic seed, plus any real one
    check('ss4_%s_new_distinct_figures' % arm, 'T1-X001' in us and p['distinct'].get('unscored_seeds') == len({by_id[x]['seed'] for x in us})
          and p['distinct'].get('cands_of_unscored_seeds') == len({c for x in us for c in cl['pool'][x]}), 'distinct', json.dumps(p['distinct']))
    check('ss3_%s_new_three_separate_figures' % arm, o.get('tasks_on_checkpoint_without_co_changed') == len(TZ) and o.get('tasks_with_unscored_seed') == len(us)
          and o.get('cands_of_unscored_seeds') == sum(len(cl['pool'][x]) for x in us), 'no-co tasks', o.get('tasks_on_checkpoint_without_co_changed'),
          'unscored-seed tasks', o.get('tasks_with_unscored_seed'), 'their candidates', o.get('cands_of_unscored_seeds'))
    check('ss3_%s_new_recompute_matches' % arm, p['recompute_matches_counts'] is True and new['unrestricted']['recompute_matches_counts'] is True,
          'mismatches', p['mismatches'], new['unrestricted']['mismatches'])
    if arm == 'E5':
        check('ss3_E5_new_ruling55_reconciles', p['occurrences']['ruling55_cases_reconcile'] is True and new['unrestricted']['occurrences']['ruling55_cases_reconcile'] is True,
              'pass after: absent', o.get('scored_seed_cands_unscored_absent_at_C', 0), '+ not-routed', o.get('scored_seed_cands_unscored_not_in_routed_specialists', 0),
              '= scored-seed unscored', o.get('scored_seed_cands_unscored', 0))
    # counts_section end to end (plan at s = 1, chosen config from a choices.json)
    sel = os.path.join(F, 'selectB'); os.makedirs(os.path.join(sel, arm))
    late = [t['commit'] for t in T]
    json.dump(dict(blocks=[dict(block=1, commits=sorted(set(late)), config_id=cid, w=0.5)], final_all65=dict(config_id=cid, w=0.5)),
              open(os.path.join(sel, arm, 'choices.json'), 'w'))
    plan = dict(s=1, assignment={SA: SA, ZERO: ZERO})
    sec = report.counts_section(plan, sel, T, TB, G0, cl, arms=(arm,))
    # counts_section recomputes with C's WHOLE graph (stage B trains without a hold-out); the stage-A model here had one,
    # so only the shape is checked: both choices present, the late50 figures restricted to late50 tasks
    check('counts_section_%s_shape' % arm, set(sec[arm]) == {'late50_block_choices', 'all65_final_choice'} and sec[arm]['all65_final_choice']['config_id'] == cid,
          json.dumps({k: (v['pool']['occurrences'].get('tasks') if 'pool' in v else v['figures']['pool']['occurrences'].get('tasks')) for k, v in sec[arm].items()}))
ok = finish('counts')
sys.exit(0 if ok else 1)
