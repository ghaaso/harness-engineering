"""e5_route_audit.py -- ruling 97 (b) and (d), a post-run step (END-ORDER 9.2a, container ktest-r11), agent B, round 3.
It adds nothing to the held-out run and changes no frozen code; it reads what the run left, after the grader's returns:
  (b) if the arm frozen for held-out (train/heldout/item27.json `chosen.arm`) is E5: for every held-out task of the
      chosen configuration, seed 1's parts (the routing does not depend on the seed), kge.py's OWN routing function
      `kge.route` (imported, not copied) on the task's parent graph P (`kge.read_graph`, `kge.neighbours`, as kge.score
      calls them) gives the routed areas; the task counts when the second routed specialist is `other`
      (second_other), and when a routed specialist is skipped (skipped): kge.score uses only specialists with a
      co_changed relation (`rco` not None), and kge.train gives specialist A one exactly when `kge.area_triples` of the
      checkpoint C's training triples (all of C's triples on held-out, holdout=False) holds a co_changed triple. For any
      other frozen arm the counts are not computed (`applies` false) and RESULT.md says so.
  (d) the median candidate-pool size (`pool.cands` in the per-task counts) of the late-50 tuning tasks, from the
      chosen setting's seed-1 stage-B counts file train/stageB/tables/<arm>_<cid>_s1_counts.json, beside that of the
      held-out tasks, from the held-out parts' counts.json (the pool is the same list for every method).
real  python /w/r58c/B/e5_route_audit.py                 (no option; the lane's paths; writes
      /w/train/report/e5_route/e5_route.json; refuses when it exists: one run, like the result writer's inputs)
test  python /w/r58c/B/e5_route_audit.py --test --item27 P --heldout-dir D --tables T --tasks F --graphs G --out O
      (O never under /w/train; every input explicit; the output carries test: true)
Exit 0 written; 2 usage; 3 an input missing or of the wrong shape; 4 the output exists (real run).
Reads nothing under grader-returns/ and no held-out score table (only the parts' counts.json files).
"""
import collections, hashlib, json, os, statistics, sys
sys.path.insert(0, '/w/train'); sys.path.insert(0, '/w/eval')
ROOT = os.environ.get('EMB_ROOT', '/w'); TRAIN = os.path.join(ROOT, 'train')
REAL = dict(item27=os.path.join(TRAIN, 'heldout', 'item27.json'), heldout_dir=os.path.join(TRAIN, 'heldout'),
            tables=os.path.join(TRAIN, 'stageB', 'tables'), tasks='/build/tasks/tasks.jsonl', graphs=None,
            out=os.path.join(TRAIN, 'report', 'e5_route', 'e5_route.json'))
OPTS = ('item27', 'heldout-dir', 'tables', 'tasks', 'graphs', 'out')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()


def die(code, why): print('e5_route_audit: refusing (exit %d): %s' % (code, why), flush=True); raise SystemExit(code)


def parse(argv):
    a = dict(test='--test' in argv); rest = [x for x in argv if x != '--test']
    if not a['test']:
        if rest: die(2, 'the real run takes no option (got %s)' % rest)
        a.update(REAL); return a
    if len(rest) % 2: die(2, 'options come in pairs: %s' % rest)
    for k, v in zip(rest[::2], rest[1::2]):
        if not k.startswith('--') or k[2:] not in OPTS: die(2, 'unknown option %r' % k)
        a[k[2:].replace('-', '_')] = v
    miss = [k for k in ('item27', 'heldout_dir', 'tables', 'tasks', 'graphs', 'out') if k not in a]
    if miss: die(2, '--test needs every input: %s' % miss)
    if os.path.abspath(a['out']).replace('\\', '/').startswith(TRAIN.replace('\\', '/') + '/'): die(2, 'a test output is never written under %s' % TRAIN)
    return a


def counts_files(heldout_dir, arm, cid):
    d = os.path.join(heldout_dir, 'parts', arm, cid, 's1')
    if not os.path.isdir(d): die(3, 'no held-out parts for %s %s seed 1 in %s' % (arm, cid, d))
    out = sorted(os.path.join(d, C, 'counts.json') for C in os.listdir(d) if os.path.isfile(os.path.join(d, C, 'counts.json')))
    if not out: die(3, 'no counts.json under %s' % d)
    return out


def median_pool(per, ids=None):
    xs = [v['pool']['cands'] for t, v in per.items() if ids is None or t in ids]
    return dict(tasks=len(xs), median=statistics.median(xs) if xs else None)


def main(argv):
    a = parse(argv)
    import kge, evalcore as ec
    if a['graphs']: kge.G0 = a['graphs']
    if not a['test'] and os.path.exists(a['out']): die(4, '%s exists: the route audit runs once' % a['out'])
    for k in ('item27', 'tasks'):
        if not os.path.isfile(a[k]): die(3, '%s %s missing' % (k, a[k]))
    R27 = json.load(open(a['item27'])); ch = R27.get('chosen') or {}
    arm, cid = ch.get('arm'), ch.get('config_id')
    if not arm or not cid: die(3, 'item27.json has no chosen arm and config_id')
    if bool(R27.get('test')) != a['test']: die(3, 'item27.json test=%s in a %s run' % (R27.get('test'), 'test' if a['test'] else 'real'))
    # held-out tasks of the chosen setting (seed 1's parts): parent and checkpoint per task, and the pool size
    per = {}
    for f in counts_files(a['heldout_dir'], arm, cid):
        for t, v in json.load(open(f)).items():
            if t in per: die(3, 'task %s in two counts files' % t)
            per[t] = v
    seeds = {}
    for l in open(a['tasks'], encoding='utf-8'):
        if not l.strip(): continue
        r = json.loads(l)
        if r.get('id') in per: seeds[r['id']] = (r.get('split'), (r.get('seed') or {}).get('path'), r.get('parent'))
    bad = [t for t in per if t not in seeds or seeds[t][0] != 'heldout' or not seeds[t][1] or seeds[t][2] != per[t]['parent']]
    if bad: die(3, '%d held-out task(s) without a held-out row of the same parent in %s (e.g. %s)' % (len(bad), a['tasks'], bad[:3]))
    res = dict(test=a['test'], ruling='97 (b), (d)', arm=arm, config_id=cid, item27_sha256=sha(a['item27']), applies=arm == 'E5',
               kge_sha256=sha(kge.__file__), self_sha256=sha(os.path.abspath(__file__)), route=None)
    if arm == 'E5':
        n = collections.Counter(); byP = collections.defaultdict(list)
        for t, v in per.items(): byP[v['parent']].append(t)
        co_at = {}
        for P in sorted(byP):
            entsP, triP = kge.read_graph(P); nbP = kge.neighbours(triP)
            for t in sorted(byP[P]):
                C = per[t]['checkpoint']
                if C not in co_at:
                    entsC, triC = kge.read_graph(C)
                    co_at[C] = {A: any(x[1] == kge.CO for x in kge.area_triples(triC, entsC, A)) for A in kge.AREAS}
                r = kge.route('file:' + seeds[t][1], entsP, nbP)
                skip = [A for A in r if not co_at[C][A]]
                n['tasks'] += 1; n['two_specialists'] += int(len(r) == 2)
                n['second_other'] += int(len(r) == 2 and r[1] == 'other')
                n['skipped'] += int(bool(skip)); n['skipped_second_other'] += int(len(r) == 2 and r[1] == 'other' and 'other' in skip)
                n['skipped_first'] += int(r[0] in skip)
            del entsP, triP, nbP
        res['route'] = dict(n, parents=len(byP), checkpoints=len(co_at),
                            note='kge.route on the parent graph; a routed specialist is skipped when its area has no co_changed triple at the checkpoint')
    # (d): late-50 tuning tasks from the chosen setting's stage-B counts, held-out tasks from the parts
    tf = os.path.join(a['tables'], '%s_%s_s1_counts.json' % (arm, cid))
    if not os.path.isfile(tf): die(3, 'stage-B counts %s missing' % tf)
    tasks = ec.load_tasks(); late = ec.commit_set(tasks, 'late50'); late_ids = {t['task_id'] for t in tasks if t['commit'] in late}
    tc = json.load(open(tf))
    res['pool'] = dict(late50=median_pool(tc, late_ids), heldout=median_pool(per),
                       sources=dict(late50=os.path.basename(tf), late50_sha256=sha(tf), heldout='parts/%s/%s/s1/*/counts.json' % (arm, cid)))
    if res['pool']['late50']['tasks'] == 0: die(3, 'no late-50 task in %s' % tf)
    os.makedirs(os.path.dirname(os.path.abspath(a['out'])), exist_ok=True)
    tmp = a['out'] + '.part'; json.dump(res, open(tmp, 'w'), indent=1, sort_keys=True); os.replace(tmp, a['out'])
    print('e5_route_audit: wrote %s sha256 %s arm %s %s route %s pool %s' % (a['out'], sha(a['out']), arm, cid, json.dumps(res['route']),
                                                                          json.dumps({k: res['pool'][k] for k in ('late50', 'heldout')})), flush=True)
    print('RESULT PASS e5-route-audit', flush=True)
    return res


if __name__ == '__main__':
    main(sys.argv[1:])
