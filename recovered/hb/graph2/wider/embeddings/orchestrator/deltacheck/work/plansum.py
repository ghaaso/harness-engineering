"""Gate check 6: summarise the copy's stageB/plan.json and recompute its hash from the current files."""
import os, sys, json, collections
sys.path.insert(0, '/w/train')
import stageB as sb
p = json.load(open(sb.PLAN))
units = sum(len(v) for v in p['configs'].values()) * 3 * len(p['checkpoints'])
lag = collections.Counter(p['lag'].values())
hlag = collections.Counter(p['heldout']['lag_by_parent'].values())
rec = sb.plan_hash(p['s'])
out = dict(s=p['s'], device=p['device'], lanes=p['lanes'], checkpoints=len(p['checkpoints']), units=units, tasks=len(p['lag']),
           lag_counts=dict(lag), lag_by_parent_counts=dict(collections.Counter(p['lag_by_parent'].values())),
           heldout_checkpoints=len(p['heldout']['checkpoints']), heldout_lag_counts=dict(hlag),
           configs={a: [(c['config_id'], c['epochs']) for c in v] for a, v in p['configs'].items()},
           projection_s1=p['projection'].get('1', p['projection'].get(1)),
           plan_hash=p['plan_hash'], recomputed_hash=rec, hash_matches_recomputed=(rec == p['plan_hash']),
           hash_matches_lane=(p['plan_hash'] == '43fa692efcd4b00cf4224ff9ec950917722770932db1755349b6edb44bce0d00'),
           plan_hash_inputs=p['plan_hash_inputs'], unscored_tasks=len(p['tasks_unscored_no_co_changed_in_parent']))
json.dump(out, open('/w/v/plansum.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
