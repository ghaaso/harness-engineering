"""Stage A driver (addendum 8 item 19): 16 configurations x the given arms, one seed (common.seed_stageA),
trained on the stage-A checkpoint graph with 10 % of its co_changed pairs held out; selection by filtered
MRR of (h, co_changed, ?) on those pairs.
usage: python stageA.py E1 E3 E5      (arms run in the order given)
One unit = (arm, config id), run as its own process (`kge.py unit`) so its peak RSS is its own.
Resumable: a unit whose progress line says done AND whose output folder exists is skipped; outputs are
written to <dir>.part and renamed; a failed unit is logged 'failed' and retried on the next start.
Progress: train/progress.jsonl {step: 'stageA', unit: 'E1/c03', status, t, ...}.
After every unit: train/stageA/results.tsv and train/stageA/top3.json are rebuilt from all finished units
(per arm top 3 by val MRR, ties to the smaller embedding dimension, then the config id)."""
import os, sys, json, subprocess, datetime, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SA = os.path.join(HERE, 'stageA'); LOGS = os.path.join(SA, 'logs')
PROG = os.path.join(HERE, 'progress.jsonl')
os.makedirs(LOGS, exist_ok=True)
GRID_IDS = ['c%02d' % i for i in range(1, 17)]


def done_units():
    if not os.path.exists(PROG): return set()
    out = set()
    for l in open(PROG):
        if l.strip():
            r = json.loads(l)
            if r.get('step') == 'stageA' and r.get('status') == 'done': out.add(r['unit'])
    return out


def log(unit, status, **kw):
    with open(PROG, 'a') as f:
        f.write(json.dumps(dict(step='stageA', unit=unit, status=status,
                                t=datetime.datetime.utcnow().isoformat() + 'Z', **kw)) + '\n')


def put(path, text):
    part = '%s.%d.part' % (path, os.getpid())
    open(part, 'w').write(text); os.replace(part, path)


def rebuild():
    rows = []
    for arm in sorted(os.listdir(SA)):
        d = os.path.join(SA, arm)
        if not (os.path.isdir(d) and arm.startswith('E')): continue
        for cid in sorted(os.listdir(d)):
            m = os.path.join(d, cid, 'meta.json')
            if cid.endswith('.part') or not os.path.exists(m): continue
            j = json.load(open(m))
            rows.append(dict(arm=arm, config_id=cid, val_mrr=j.get('val_mrr'), val_mrr_file=j.get('val_file_at_best'),
                             epochs=j['epochs'], best_epoch=j.get('best_epoch'), wall_s=round(j['wall_s'], 1),
                             peak_rss_mb=round(j['peak_rss_mb'], 1), dim=j['cfg']['embedding_dim'],
                             cfg=json.dumps(j['cfg'], sort_keys=True), batch_size=j.get('batch_size')))
    hdr = ['arm', 'config_id', 'val_mrr', 'val_mrr_file', 'epochs', 'best_epoch', 'wall_s', 'peak_rss_mb', 'batch_size', 'cfg']
    put(os.path.join(SA, 'results.tsv'), '\t'.join(hdr) + '\n' + ''.join(
        '\t'.join('' if r[k] is None else str(r[k]) for k in hdr) + '\n' for r in rows))
    top = {}
    for arm in sorted({r['arm'] for r in rows}):
        rs = [r for r in rows if r['arm'] == arm and r['val_mrr'] is not None]
        rs.sort(key=lambda r: (-r['val_mrr'], r['dim'], r['config_id']))
        top[arm] = dict(complete=len([r for r in rows if r['arm'] == arm]) == 16,
                        top3=[dict(config_id=r['config_id'], val_mrr=r['val_mrr'], cfg=json.loads(r['cfg'])) for r in rs[:3]])
    put(os.path.join(SA, 'top3.json'), json.dumps(top, indent=1))


if __name__ == '__main__':
    arms = sys.argv[1:]
    for arm in arms:
        for cid in GRID_IDS:
            unit = '%s/%s' % (arm, cid)
            out = os.path.join(SA, arm, cid)
            if unit in done_units() and os.path.exists(os.path.join(out, 'meta.json')):
                continue
            os.makedirs(os.path.join(SA, arm), exist_ok=True)
            t0 = time.time()
            with open(os.path.join(LOGS, '%s-%s.log' % (arm, cid)), 'w') as lf:
                rc = subprocess.call([sys.executable, os.path.join(HERE, 'kge.py'), 'unit', arm, cid, out],
                                     stdout=lf, stderr=subprocess.STDOUT)
            if rc == 0 and os.path.exists(os.path.join(out, 'meta.json')):
                j = json.load(open(os.path.join(out, 'meta.json')))
                log(unit, 'done', val_mrr=j.get('val_mrr'), epochs=j['epochs'], wall_s=round(j['wall_s'], 1),
                    peak_rss_mb=round(j['peak_rss_mb'], 1))
            else:
                log(unit, 'failed', rc=rc, wall_s=round(time.time() - t0, 1))
            rebuild()
    rebuild()
    print('stageA finished for', arms, flush=True)
