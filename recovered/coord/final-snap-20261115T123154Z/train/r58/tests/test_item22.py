"""Plumbing test of train/item22.py (ruling 61), TUNING data only: the stage-A part is real (stage A ran on the tune
split; top3.json, refs.json, the kept representation files); the stage-B loss part reads a synthetic parts folder
(stage B is still training; its parts are not read here); E4's fresh model is trained for 2 epochs only."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r58common import *
import item22
show_hashes('train/item22.py')
D = fresh(os.path.join(OUTR, 'item22_test'))
P = os.path.join(D, 'parts')
L1 = [10.0 - 0.4 * i for i in range(20)]
for s, C, meta in ((1, 'ckA', dict(losses=L1)), (2, 'ckA', dict(losses=L1[:10])), (1, 'ckZ', dict(trained=False, losses=[])),
                   (3, 'ckB.part', dict(losses=[1, 2, 3]))):
    d = os.path.join(P, 'E1', 'c04', 's%d' % s, C); os.makedirs(d); json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'))
want1 = (sum(L1[-2:]) / 2) / (sum(L1[-4:-2]) / 2); want2 = L1[9] / L1[8]
check('i22_loss_ratio_unit', abs(item22.loss_ratio(L1) - want1) < 1e-12 and abs(item22.loss_ratio(L1[:10]) - want2) < 1e-12 and item22.loss_ratio([1.0]) is None,
      'ratio of 20 epochs', round(item22.loss_ratio(L1), 6), 'of 10', round(item22.loss_ratio(L1[:10]), 6))
res = item22.main(['--out', os.path.join(D, 'item22.json'), '--parts', P, '--e4-epochs', '2'])
top = json.load(open(os.path.join(TRAIN, 'stageA', 'top3.json')))
sa = res['stage_a']
check('i22_stage_a_mrr_beside_ppr_co', all([r['mrr_all_entities'] for r in sa['arms'][a]] == [c['val_mrr'] for c in top[a]['top3']] for a in sa['arms'])
      and 'mrr_all_entities' in sa['PPR'] and 'mrr_all_entities' in sa['CO'], 'PPR', round(sa['PPR']['mrr_all_entities'], 4), 'CO', round(sa['CO']['mrr_all_entities'], 4))
check('i22_stage_a_loss_ratio', all(r['loss_ratio_as_run'] is not None and r['loss_ratio_to_selection_epoch'] is not None for a in sa['arms'] for r in sa['arms'][a]),
      json.dumps({a: [round(r['loss_ratio_as_run'], 3) for r in sa['arms'][a]] for a in sa['arms']}))
sb = res['stage_b_loss_ratio']['E1']['c04']
check('i22_stage_b_loss_ratio', sb['units'] == 2 and abs(sb['median'] - (want1 + want2) / 2) < 1e-12, json.dumps(sb))
ck = res['check_predict_target']
for a in ('E1', 'E2', 'E3'):
    r = ck[a]
    check('i22_check_%s_kept_reps' % a, r['injected_reps_equal_kept'] and r['queries'] == 20 and r['top10_identical'] == 20 and r['max_abs_score_diff'] < 1e-4
          and r['train_true_tail_median_rank_higher_better'] < r['train_true_tail_median_rank_lower_better'],
          r['config_id'], 'full order', r['full_order_identical'], '/ 20, top10', r['top10_identical'], 'max|d|', r['max_abs_score_diff'])
sp = ck['E5']['specialists']
check('i22_check_E5_specialists', ck['E5']['injected_reps_equal_kept'] and all(v.get('top10_identical') == v.get('queries') == 5 and v['max_abs_score_diff'] < 1e-4
                                                                             for v in sp.values() if 'queries' in v) and sum('queries' in v for v in sp.values()) >= 1,
      json.dumps({A: (v.get('full_order_identical'), v.get('queries')) for A, v in sp.items()}))
r = ck['E4']
check('i22_check_E4_fresh', r['queries'] == 20 and r['top10_identical'] >= 18 and r['max_abs_score_diff'] < 1e-4 and r['epochs_trained'] == 2,
      r['config_id'], 'full order', r['full_order_identical'], 'top10', r['top10_identical'], 'max|d|', r['max_abs_score_diff'])
ok = finish('item22')
sys.exit(0 if ok else 1)
