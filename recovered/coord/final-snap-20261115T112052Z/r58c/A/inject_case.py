"""Agent A, round r58c, rulings 96(a) and 97(e): the rehearsal's injected-kinds case. On COPIES of tuning checkpoint graphs
with a made-up relation type and two made-up node kinds (r58c/A/inject_kinds.py), two variants:
  big   the largest tuning graph 7b3a7452 (all 35 tuning relation types) with the layer;
  noco  cd806c80 with the layer and without its co_changed triples that touch 'other', so E5's 'other' specialist has no
        co_changed fact (ruling 97(e); the audit's F2: kge.py:693, 707 skip it);
each of the fifteen settings stage A selected and stage B trains (plan configs, three per arm, E1..E5; the coordinator:
"an arm's selected settings" in rulings 79, 86 and 96 means these fifteen, never selectB's choice) runs the whole unit
path in its own process: `heldout.py probe-full` (train with kge.train for --epochs epochs, kge.score on --ntasks
synthetic tasks whose seeds are the first code files of that graph, both scopes, assemble, evalcore.rank, pack with
answer_level.js on the tuning parent's facts). Each process's rc, wall time, steps (train, score, assemble, rank, pack),
tasks scored per scope, tasks ranked, kge.score's counts (counts.json; E5's seeds_unscored... counts among them), peak
RSS (ru_maxrss), the container's cgroup memory.peak after it and the card's peak are recorded in <out>/inject_case.json,
with, per variant, kge.route's specialists for each task seed on the source graph and on the copy (E5's routing, the
audit's F1). A failed setting is recorded (with the end of its output), never fixed here; no arm code is changed.
Reads the synthetic plan r58b/out/fakeB/stageB/plan.json (its configs are stage B's) and the two tuning graphs; no
stage-B table, no held-out graph. Writes only <out>.
usage: python inject_case.py --out DIR [--variants big,noco] [--arms E1,..] [--epochs N] [--ntasks N]
       (defaults: both variants, E1-E5, 2 epochs, 5 tasks)
Container: kge-H1R (REHEARSAL=INJ sh train/heldout.sh; card) or a ktest-a<N> stand-in (CPU), EMB_ROOT=/w."""
import os, sys, json, time, subprocess, datetime
ROOT = os.environ.get('EMB_ROOT') or '/w'
TRAIN = os.path.join(ROOT, 'train'); sys.path[:0] = [os.path.join(ROOT, 'r58c', 'A'), TRAIN, os.path.join(ROOT, 'export'), os.path.join(ROOT, 'eval')]
import inject_kinds
PLAN = os.path.join(ROOT, 'r58b', 'out', 'fakeB', 'stageB', 'plan.json')
VARIANTS = {'big': ('7b3a745281898d3d5808c5a15c4916d1d9dbb1b4', False),   # the largest tuning graph, every tuning relation type
            'noco': ('cd806c803c4ad8ec198790096d196460789951f0', True)}   # its 'other' specialist without co_changed (97(e))
STEPS = {'train', 'score', 'assemble', 'rank', 'pack'}


def cgroup_peak_mb():
    for p in ('/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes'):
        try: return round(int(open(p).read().strip()) / 1048576.0, 1)
        except Exception: pass
    return None


def routes(C, g_copy, ntasks):
    """kge.route (E5's routing) for probe-full's task seeds (the first ntasks code files in path order) on the source
    graph and on the copy; kge (torch) is imported only here."""
    import kge
    g_saved = kge.G0; res = {}
    for tag, root in (('source', os.path.join(ROOT, 'export', 'graphs0')), ('copy', g_copy)):
        kge.G0 = root; ents, tri = kge.read_graph(C); nb = kge.neighbours(tri)
        code = sorted(p for e, (kind, p, area, isc) in ents.items() if isc and e == 'file:' + p)[:ntasks]
        res[tag] = {p: kge.route('file:' + p, ents, nb) for p in code}
    kge.G0 = g_saved
    res['second_specialist_now_other'] = sorted(p for p in res['copy'] if res['copy'][p][1:] == ['other'] and res['source'].get(p, [None])[1:] != ['other'])
    return res


def run_variant(v, out, plan, o):
    C, drop = VARIANTS[v]
    g0 = os.path.join(out, v, 'g0')
    if not os.path.isdir(os.path.join(g0, C)):
        inj = inject_kinds.inject(os.path.join(ROOT, 'export', 'graphs0', C), os.path.join(g0, C), drop_other_co=drop)
    else:
        inj = dict(json.load(open(os.path.join(g0, C, 'sizes.json')))['injected'], reused=True)
    rt = routes(C, g0, int(o['ntasks']))
    print('inject_case: %s %s: routes of the %d task seeds; second specialist now other: %d' % (v, C[:8], len(rt['copy']), len(rt['second_specialist_now_other'])), flush=True)
    rows = []
    for arm in o['arms'].split(','):
        for c in plan['configs'][arm][:3]:
            fo = os.path.join(out, v, 'full', '%s_%s' % (arm, c['config_id']))
            cmd = [sys.executable, os.path.join(TRAIN, 'heldout.py'), 'probe-full', '--g0', g0, '--sha', C, '--arm', arm, '--cid', c['config_id'],
                   '--epochs', o['epochs'], '--plan', PLAN, '--tparent', C, '--out', fo, '--ntasks', o['ntasks']]
            t0 = time.time()
            p = subprocess.run(cmd, cwd=TRAIN, capture_output=True, text=True, env=dict(os.environ, EMB_ROOT=ROOT))
            r = dict(variant=v, graph=C, arm=arm, config_id=c['config_id'], rc=p.returncode, wall_s=round(time.time() - t0, 1))
            for l in reversed(p.stdout.strip().splitlines()):
                if l.startswith('PROBE '): r.update(json.loads(l[6:])); break
            if p.returncode != 0: r['error'] = (p.stdout + p.stderr).strip()[-1500:]
            r['cgroup_peak_mb_after'] = cgroup_peak_mb()
            cj = os.path.join(fo, 'counts.json')
            if os.path.isfile(cj): r['counts_json'] = json.load(open(cj))
            rows.append(r)
            print('inject_case: %s %s %s rc %d wall %.1f s steps %s scored %s ranked %s packed %s peak_rss_mb %s cgroup_peak_mb %s cuda_reserved_mb %s' % (
                v, arm, c['config_id'], r['rc'], r['wall_s'], r.get('steps'), r.get('scored_tasks'), r.get('ranked_tasks'), r.get('packed'),
                r.get('peak_rss_mb'), r['cgroup_peak_mb_after'], r.get('peak_cuda_reserved_mb')), flush=True)
    return rows, dict(graph=C, injected=inj, routes=rt)


def main(argv):
    o = dict(variants='big,noco', arms='E1,E2,E3,E4,E5', epochs='2', ntasks='5'); i = 0
    while i < len(argv):
        k = argv[i][2:]
        if not argv[i].startswith('--') or k not in ('out', 'variants', 'arms', 'epochs', 'ntasks') or i + 1 >= len(argv):
            print('usage: python inject_case.py --out DIR [--variants big,noco] [--arms E1,..] [--epochs N] [--ntasks N]'); return 2
        o[k] = argv[i + 1]; i += 2
    if 'out' not in o: print('inject_case: --out is required'); return 2
    out = os.path.abspath(o['out']); os.makedirs(out, exist_ok=True)
    plan = json.load(open(PLAN)); t00 = time.time(); rows = []; per = {}
    for v in o['variants'].split(','):
        rows_v, per[v] = run_variant(v, out, plan, o)
        rows += rows_v
    failed = [(r['variant'], r['arm'], r['config_id']) for r in rows if r['rc'] != 0 or set(r.get('steps') or []) < STEPS]
    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', ruling='96(a), 97(e)', variants=per, epochs=int(o['epochs']),
               ntasks=int(o['ntasks']), device=os.environ.get('KGE_DEVICE', 'cpu'), image_id=os.environ.get('KGE_IMAGE_ID'),
               settings=rows, failed=failed, wall_s=round(time.time() - t00, 1),
               max_peak_rss_mb=max([r.get('peak_rss_mb') or 0 for r in rows] or [0]),
               max_cgroup_peak_mb=max([r.get('cgroup_peak_mb_after') or 0 for r in rows] or [0]),
               max_cuda_reserved_mb=max([r.get('peak_cuda_reserved_mb') or 0 for r in rows] or [0]))
    tmp = os.path.join(out, 'inject_case.json.part'); json.dump(res, open(tmp, 'w'), indent=1); os.replace(tmp, os.path.join(out, 'inject_case.json'))
    print('inject_case: %d setting(s), %d failed, wall %.1f s, max peak RSS %s MB, container peak %s MB, card peak %s MB' % (
        len(rows), len(failed), res['wall_s'], res['max_peak_rss_mb'], res['max_cgroup_peak_mb'], res['max_cuda_reserved_mb']), flush=True)
    print('RESULT %s inject-case %s' % ('PASS' if not failed else 'FAIL', json.dumps(dict(settings=len(rows), failed=failed, wall_s=res['wall_s']))), flush=True)
    return 0 if not failed else 3


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
