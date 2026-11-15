"""Coordinator's re-run check (END-ORDER step 2c; card window only): for each of the fifteen settings (arm x config of
the plan) one finished stage-B unit, picked by a fixed rule, is trained again in a FRESH process (one rerun_unit.py
subprocess per unit) and compared with its stage-B part under ruling 68. Container side; stdlib here, torch only in
the rerun_unit.py subprocess. Never edits orchestrator/rerun_unit.py or rerun_compare.py: it calls the first and
imports rerun_compare.compare / part_dir from the second.

Pick rule (fixed before any result is seen):
  the 100th `done` line of that setting (step stageB, status done, unit ARM/CID/sSEED/CKPT) in file order of
  TREE/progress.jsonl, which is deep inside the setting's long process. A done line with "trained": false (no
  co_changed fact: nothing was trained) is passed over for the next trained done line of the setting.
  Fewer than 100 done lines (or no trained line at or after the 100th): the setting's LAST trained done line, recorded
  with rule "fewer than 100 done lines: the last trained done line". No trained done line at all: the setting is
  reported "no unit" and the check fails (exit 3). The part must exist with counts.json and meta.json.
Determinism: E4 always with --det (rerun_unit.py: train/detrun.py's settings, ruling 67), and refused when the
  stage-B part's runner does not carry det=1; another arm with --det exactly when its part's runner carries det=1.
Criterion (rerun_compare.compare, ruling 68): E1-E4 losses, both score tables and counts byte-identical; E5 both
  score tables and counts.

usage: python rerun_check.py select --tree DIR [--nth N]
       python rerun_check.py run    --tree DIR --out DIR [--nth N] [--only ARM/CID,...] [--runner PY] [--test]
  --tree    the stage-B tree (production: /w/train, read only): progress.jsonl, stageB/plan.json, stageB/parts/
  --out     results: OUT/picks.json, OUT/units/<tag>/ (re-run parts), OUT/rerun.jsonl, OUT/compare.jsonl,
            OUT/result.json; refused when it is inside --tree
  --nth     default 100; any other value, --only and --runner need --test (plumbing tests only)
  --runner  the re-run program (default ORCH/rerun_unit.py; ORCH = $RR_ORCH or /w/orchestrator)
Exit: 0 every setting compared and equal; 1 a mismatch; 2 usage; 3 a setting without a unit, a missing part, a
  re-run error, or an E4 part without det=1.
"""
import os, sys, json, re, subprocess, time, hashlib

ORCH = os.environ.get('RR_ORCH', '/w/orchestrator')
sys.path.insert(0, ORCH)
import rerun_compare as rc  # noqa: E402  (compare, part_dir, lines, DET)

UNIT = re.compile(r'^(E\d)/(c\d+)/s(\d)/([0-9a-f]{12})$')
NTH = 100
FEWER = 'fewer than %d done lines: the last trained done line'


def sha_file(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def settings(tree):
    plan = json.load(open(os.path.join(tree, 'stageB', 'plan.json')))
    return [(a, c['config_id']) for a in sorted(plan['configs']) for c in plan['configs'][a]]


def done_lines(tree):
    """{(arm, cid): [record, ...]} of stage-B done lines of real units, in file order (a repeated unit counts once)."""
    out = {}; seen = set()
    for r in rc.lines(os.path.join(tree, 'progress.jsonl')):
        u = r.get('unit') or ''
        if r.get('step') != 'stageB' or r.get('status') != 'done' or not UNIT.match(u) or u in seen: continue
        seen.add(u); out.setdefault(tuple(u.split('/')[:2]), []).append(r)
    return out


def select(tree, nth=NTH):
    dl = done_lines(tree); picks = []
    for arm, cid in settings(tree):
        rows = dl.get((arm, cid), []); trained = lambda r: r.get('trained') is not False
        p = dict(setting='%s/%s' % (arm, cid), done_lines=len(rows), nth=nth)
        later = [i for i, r in enumerate(rows) if i >= nth - 1 and trained(r)]
        if later:
            i = later[0]; p['rule'] = ('done line %d of the setting' % nth) if i == nth - 1 else ('the first trained done line after line %d' % nth)
        else:
            tr = [i for i, r in enumerate(rows) if trained(r)]
            if not tr: p.update(rule='no unit', unit=None); picks.append(p); continue
            i = tr[-1]; p['rule'] = FEWER % nth
        u = rows[i]['unit']; d = rc.part_dir(tree, u)
        p.update(unit=u, position=i + 1, done_t=rows[i].get('t'), part=d)
        ok = bool(d) and os.path.isfile(os.path.join(d, 'counts.json')) and os.path.isfile(os.path.join(d, 'meta.json'))
        if not ok: p['problem'] = 'no finished part folder for %s' % u
        else:
            runner = json.load(open(os.path.join(d, 'meta.json'))).get('runner') or ''
            p['runner'] = runner; p['det'] = arm == 'E4' or bool(rc.DET.search(runner))
            if arm == 'E4' and not rc.DET.search(runner): p['problem'] = 'E4 part without det=1 (ruling 67)'
        picks.append(p)
    return picks


def opts(argv):
    o = {}; i = 0
    while i < len(argv):
        k = argv[i]
        if k == '--test': o['test'] = True; i += 1; continue
        if k not in ('--tree', '--out', '--nth', '--only', '--runner') or i + 1 >= len(argv):
            print('rerun_check: unknown or incomplete option %r (exit 2)' % k, flush=True); sys.exit(2)
        o[k[2:]] = argv[i + 1]; i += 2
    return o


def inside(p, d):
    p = os.path.realpath(p); d = os.path.realpath(d)
    return p == d or p.startswith(d.rstrip(os.sep) + os.sep)


def main(argv):
    if not argv or argv[0] not in ('select', 'run'): print(__doc__); return 2
    cmd = argv[0]; o = opts(argv[1:])
    if 'tree' not in o: print('rerun_check: --tree is required (exit 2)'); return 2
    if not o.get('test') and any(k in o for k in ('nth', 'only', 'runner')):
        print('rerun_check: --nth, --only and --runner are for plumbing tests (--test) only (exit 2)'); return 2
    nth = int(o.get('nth', NTH)); picks = select(o['tree'], nth)
    if o.get('only'):
        keep = set(o['only'].split(',')); picks = [p for p in picks if p['setting'] in keep]
    if cmd == 'select':
        print(json.dumps(picks, indent=1)); return 3 if any(p.get('unit') is None or p.get('problem') for p in picks) else 0
    if 'out' not in o: print('rerun_check: run needs --out (exit 2)'); return 2
    out = o['out']
    if inside(out, o['tree']): print('rerun_check: --out %s is inside the tree (exit 2)' % out); return 2
    os.makedirs(out, exist_ok=True)
    runner = o.get('runner') or os.path.join(ORCH, 'rerun_unit.py')
    head = dict(t=time.time(), tree=o['tree'], nth=nth, test=bool(o.get('test')), runner=runner, runner_sha256=sha_file(runner),
                rerun_check_sha256=sha_file(os.path.abspath(__file__)), rerun_compare_sha256=sha_file(rc.__file__), settings=len(picks))
    json.dump(dict(head, picks=picks), open(os.path.join(out, 'picks.json'), 'w'), indent=1)
    print('rerun_check picks %d (nth %d)' % (len(picks), nth), flush=True)
    rcode = 0; results = []
    for i, p in enumerate(picks):
        if p.get('unit') is None or p.get('problem'):
            res = dict(setting=p['setting'], unit=p.get('unit'), result='error', why=p.get('problem') or 'no unit'); rcode = max(rcode, 3)
        else:
            tag = 'rr%02d_%s' % (i, p['unit'].replace('/', '_'))
            cmdl = [sys.executable, runner, '--out', os.path.join(out, 'units'), '--rec', os.path.join(out, 'rerun.jsonl')] + \
                   (['--det'] if p['det'] else []) + ['%s=%s' % (p['unit'], tag)]
            t0 = time.time(); r = subprocess.run(cmdl)  # a fresh process per unit
            recs = [x for x in rc.lines(os.path.join(out, 'rerun.jsonl')) if x.get('tag') == tag and x.get('status') == 'done']
            if r.returncode != 0 or not recs:
                res = dict(setting=p['setting'], unit=p['unit'], result='error', returncode=r.returncode); rcode = max(rcode, 3)
            else:
                res = dict(setting=p['setting'], rule=p['rule'], position=p['position'], det=p['det'], runner=p['runner'],
                           wall=round(time.time() - t0, 1), **rc.compare(p['part'], recs[-1]))
                if res['result'] != 'equal': rcode = max(rcode, 1)
        results.append(res)
        with open(os.path.join(out, 'compare.jsonl'), 'a') as f: f.write(json.dumps(res) + '\n')
        print(json.dumps({k: res.get(k) for k in ('setting', 'unit', 'result', 'tables', 'counts', 'losses', 'why')}), flush=True)
    summ = dict(head, rc=rcode, equal=sum(r['result'] == 'equal' for r in results), mismatch=[r['setting'] for r in results if r['result'] == 'MISMATCH'],
                error=[r['setting'] for r in results if r['result'] == 'error'], t_end=time.time())
    json.dump(summ, open(os.path.join(out, 'result.json'), 'w'), indent=1)
    print('RERUN_CHECK %s equal %d of %d; mismatch %s; error %s' % ('PASS' if rcode == 0 else 'FAIL', summ['equal'], len(picks), summ['mismatch'], summ['error']), flush=True)
    return rcode


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
