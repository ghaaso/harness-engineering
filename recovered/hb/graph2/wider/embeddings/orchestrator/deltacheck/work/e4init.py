"""Gate check 5 (deltacheck): E4's initial weights through the lane's own code path (kge.train -> train_single ->
make_model -> PyKEEN LCWATrainingLoop), KGE_DEVICE read at import as in the lane.
The state captured is the model's full state_dict at the FIRST optimizer step (a global optimizer step pre-hook):
PyKEEN's size probe never calls optimizer.step (OptimizerTrainingCallback skips it when only_size_probing), so this
is exactly the state training starts from, after every reset and every device move, before any update. The run is
then aborted (exception from the hook), so nothing trains. The hashes after each reset_parameters_ call are recorded
too (the lane's own e4work.py method).
usage: python e4init.py one <tag> <cid> <seed> <A|L>      -> /w/v/e4init/<tag>/<cid>-<A|L>-s<seed>.pt + .json
       python e4init.py compare <tagX> <tagY>              -> compares every tensor of matching files
"""
import os, sys, json, hashlib
OUT = '/w/v/e4init'
LARGEST_TUNE = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'


def h16(sd):
    return hashlib.sha256(b''.join(sd[k].detach().cpu().contiguous().numpy().tobytes() for k in sorted(sd))).hexdigest()[:16]


class Stop(Exception):
    pass


if sys.argv[1] == 'one':
    tag, cid, seed, where = sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
    sys.path.insert(0, '/w/train')
    import torch, kge
    holder = dict(resets=[])
    mm = kge.make_model

    def mk(arm, cfg, tf, fallback=False):
        m, k = mm(arm, cfg, tf, fallback)
        holder['m'] = m
        orig = m.reset_parameters_

        def rec():
            r = orig()
            holder['resets'].append(dict(device=str(next(m.parameters()).device), hash=h16(m.state_dict())))
            return r
        m.reset_parameters_ = rec
        return m, k
    kge.make_model = mk

    def pre_step(opt, args, kwargs):
        m = holder['m']
        holder['dev'] = str(next(m.parameters()).device)
        holder['sd'] = {k: v.detach().cpu().clone() for k, v in m.state_dict().items()}
        raise Stop()
    from torch.optim.optimizer import register_optimizer_step_pre_hook
    register_optimizer_step_pre_hook(pre_step)
    cfg = dict(kge.grid('E4'))[cid]
    sha, hold = (kge.STAGEA_SHA, True) if where == 'A' else (LARGEST_TUNE, False)
    try:
        kge.train('E4', cfg, seed, sha, holdout=hold, max_epochs=1, es=False)
        raise SystemExit('no optimizer step reached')
    except Stop:
        pass
    d = os.path.join(OUT, tag); os.makedirs(d, exist_ok=True)
    base = os.path.join(d, '%s-%s-s%d' % (cid, where, seed))
    torch.save(holder['sd'], base + '.pt')
    info = dict(tag=tag, cid=cid, seed=seed, where=where, sha=sha, holdout=hold, device=str(kge.DEVICE),
                params_device_at_first_step=holder['dev'], torch=torch.__version__, resets=holder['resets'],
                first_step_hash=h16(holder['sd']), tensors={k: list(v.shape) for k, v in holder['sd'].items()})
    json.dump(info, open(base + '.json', 'w'), indent=1)
    print(json.dumps({k: info[k] for k in ('tag', 'cid', 'where', 'seed', 'device', 'params_device_at_first_step', 'first_step_hash', 'resets')}), flush=True)

elif sys.argv[1] == 'compare':
    import torch
    X, Y = sys.argv[2], sys.argv[3]
    rows = []
    for f in sorted(os.listdir(os.path.join(OUT, X))):
        if not f.endswith('.pt') or not os.path.exists(os.path.join(OUT, Y, f)): continue
        a = torch.load(os.path.join(OUT, X, f)); b = torch.load(os.path.join(OUT, Y, f))
        assert set(a) == set(b), (f, set(a) ^ set(b))
        per = {}
        for k in sorted(a):
            ta, tb = a[k], b[k]
            same_shape = ta.shape == tb.shape and ta.dtype == tb.dtype
            mad = float((ta.double() - tb.double()).abs().max()) if same_shape and ta.numel() else (0.0 if same_shape else None)
            per[k] = dict(shape=list(ta.shape), dtype=str(ta.dtype), max_abs_diff=mad, identical=bool(same_shape and torch.equal(ta, tb)))
        rows.append(dict(file=f, tensors=len(per), all_identical=all(v['identical'] for v in per.values()),
                         max_abs_diff=max((v['max_abs_diff'] or 0.0) for v in per.values()), per_tensor=per))
        print(f, 'tensors', len(per), 'identical', rows[-1]['all_identical'], 'max_abs_diff', rows[-1]['max_abs_diff'], flush=True)
    json.dump(rows, open(os.path.join(OUT, 'compare-%s-vs-%s.json' % (X, Y)), 'w'), indent=1)
    print('SUMMARY', X, Y, 'files', len(rows), 'all identical', all(r['all_identical'] for r in rows),
          'max_abs_diff', max([r['max_abs_diff'] for r in rows] or [None]), flush=True)
