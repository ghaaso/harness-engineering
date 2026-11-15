import sys
p = sys.argv[1] + '/train/leak_audit.py'
s = open(p, encoding='utf-8').read()
reps = [
("""Output: a markdown table for AUDIT.md (per split and checkpoint) with ruling 35's disclosure, and a JSON file.
usage: python leak_audit.py --repo <repo> --facts <facts cache> --heldout-tasks <build tasks.jsonl>
         [--plan PATH] [--scripts a.sh,b.sh] [--mounts inspect.json,...] [--parts dir,...] [--lane-host C:/...]
         [--out-md PATH] [--out-json PATH]
         [--override-assign split:P=C,...]   (tests only: replace assignments to show a violation is caught)
""", """  c6  ruling 78: the held-out container mounts the facts and the source store of the 70 held-out parents only. Every
      held-out mount (launcher line or docker inspect) is refused when its source is the whole facts cache, a
      facts/cache/<sha> folder, the whole arms/common folder or any srcstore; the staged /gt/facts and /gt/common
      sources (heldout_inputs.js) are read and must hold exactly plan.json's heldout.assignment parents (facts
      folders, trees) and only the blobs those trees name, and common/ only *.js and srcstore.
Coverage (review audit-result-3; a vacuous audit is a FAIL): at least one launcher script per container role in
--roles (default stageB,heldout; a script's role is read from its name: heldout, stageA/stageAB, stageB/guard),
and the parts rows (c4) of each split equal the planned count: tune = configs x 3 seeds x tune tasks
(15 x 3 x 388 = 17,460 at stage B's plan), held-out = 3 seeds x 418 held-out tasks (one frozen configuration).
--test marks the result test: true (write_result.py refuses it) and allows --expect-rows split=N,... instead.
Output: a markdown table for AUDIT.md (per split and checkpoint) with ruling 35's disclosure, and a JSON file
(default train/leak_audit/leak_audit.json, the path write_result.py reads).
usage: python leak_audit.py --repo <repo> --facts <facts cache> --heldout-tasks <build tasks.jsonl>
         [--plan PATH] [--scripts a.sh,b.sh] [--mounts inspect.json,...] [--parts dir,...] [--lane-host C:/...]
         [--roles stageB,heldout] [--out-md PATH] [--out-json PATH]
         [--test [--expect-rows tune=N,heldout=M] [--override-assign split:P=C,...]]   (tests only)
"""),
("""def audit_mounts(scripts, inspects, lane_host):
    rows = []
    for sp in scripts:
        txt = open(sp, encoding='utf-8', errors='replace').read()
        heldout = 'heldout' in os.path.basename(sp)
        for ln, src, dst in mounts_of_script(sp):
            hs = expand_vars(src, txt)
            cls, files = classify(hs, lane_host, 'script')
            ok = cls != 'heldout_truth'
            rows.append(dict(source='%s:%d' % (os.path.basename(sp), ln), host=hs, dest=dst, container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok))
    for ip in inspects:
        j = json.load(open(ip)); name = os.path.basename(ip)
        heldout = 'heldout' in name or 'kge-H' in name
        for m in (j if isinstance(j, list) else [j]):
            hs = m.get('Source', ''); cls, files = classify(hs, lane_host, 'inspect')
            ok = cls != 'heldout_truth'
            rows.append(dict(source=name, host=hs, dest=m.get('Destination', ''), container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok))
    return rows
""", """def role_of(name):
    \"\"\"The container role of a launcher script or an inspect file, read from its name.\"\"\"
    b = os.path.basename(name)
    if 'kge-H1P' in b or 'probe' in b: return 'heldout'  # the ruling-79 probe container (launched by heldout.sh)
    if 'heldout' in b or 'kge-H' in b: return 'heldout'
    if 'stageA' in b or 'kge-A' in b: return 'stageA'
    if 'stageB' in b or 'guard' in b or 'kge-B' in b: return 'stageB'
    return 'other'


def host_norm(s):
    \"\"\"C:/... form of a host path written as /c/..., /run/desktop/mnt/host/c/... or C:\\\\...\"\"\"
    s = s.replace('\\\\', '/')
    m = re.match(r'^(?:/run/desktop/mnt/host)?/([a-zA-Z])/(.*)$', s)
    return (m.group(1).upper() + ':/' + m.group(2)) if m and not re.match(r'^[A-Za-z]:/', s) else s


def audit_mounts(scripts, inspects, lane_host):
    rows = []
    for sp in scripts:
        txt = open(sp, encoding='utf-8', errors='replace').read()
        heldout = role_of(sp) == 'heldout'
        for ln, src, dst in mounts_of_script(sp):
            hs = expand_vars(src, txt)
            cls, files = classify(hs, lane_host, 'script')
            ok = cls != 'heldout_truth'
            rows.append(dict(source='%s:%d' % (os.path.basename(sp), ln), host=hs, dest=dst, container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok, probe='kge-H1P' in txt.splitlines()[ln - 1] or 'train/probe' in txt.splitlines()[ln - 1]))
    for ip in inspects:
        j = json.load(open(ip)); name = os.path.basename(ip)
        heldout = role_of(name) == 'heldout'
        for m in (j if isinstance(j, list) else [j]):
            hs = host_norm(m.get('Source', '')); cls, files = classify(hs, lane_host, 'inspect')
            ok = cls != 'heldout_truth'
            rows.append(dict(source=name, host=hs, dest=m.get('Destination', ''), container='held-out' if heldout else 'stage B / tuning',
                             cls=cls, files=files[:6], ok=ok, probe='kge-H1P' in name or 'probe' in name))
    return rows


FORBIDDEN_78 = re.compile(r'(/facts/cache(/[0-9a-f]{40})?|/arms/common|/srcstore(/.*)?)$')


def ruling78(rows, plan, lane_host):
    \"\"\"c6: the held-out container's mounts against the plan's held-out parents (ruling 78).\"\"\"
    parents = set(plan['heldout']['assignment'])
    out = dict(parents=len(parents), problems=[], staged={})
    ho = [m for m in rows if m['container'] == 'held-out']
    if not ho: out['problems'].append('no held-out launcher or inspect given')
    lh = lane_host.replace('\\\\', '/').rstrip('/') if lane_host else None
    for m in ho:
        h = host_norm(m['host']).rstrip('/')
        if FORBIDDEN_78.search(h): out['problems'].append('%s mounts %s (whole facts cache, a cache folder, arms/common or a srcstore)' % (m['source'], h[-60:]))
    scoring = [m for m in ho if not m.get('probe')]
    for dest in ('/gt/facts', '/gt/common'):
        ms = [m for m in scoring if m['dest'] == dest]
        if scoring and not ms: out['problems'].append('the held-out container has no staged %s mount' % dest)
        for m in ms:
            h = host_norm(m['host']).rstrip('/')
            local = os.path.join(ROOT, h[len(lh):].lstrip('/')) if lh and (h == lh or h.startswith(lh + '/')) else None
            if not local or not os.path.isdir(local):
                out['problems'].append('%s: staged source %s is not readable here (not inside the lane)' % (m['source'], h[-60:])); continue
            if dest == '/gt/facts':
                got = set(os.listdir(local))
                out['staged']['facts'] = len(got)
                if got != parents: out['problems'].append('%s: staged facts %d folders, %d not a held-out parent, %d parent(s) missing'
                                                          % (m['source'], len(got), len(got - parents), len(parents - got)))
            else:
                tdir = os.path.join(local, 'srcstore', 'trees'); bdir = os.path.join(local, 'srcstore', 'blobs')
                if not os.path.isdir(tdir) or not os.path.isdir(bdir):
                    out['problems'].append('%s: staged common/ has no srcstore/trees and blobs' % m['source']); continue
                tp, extra = set(), []
                for t in os.listdir(tdir):
                    mt = re.match(r'^([0-9a-f]{40})(\\.absent)?\\.json$', t)
                    if not mt or mt.group(1) not in parents: extra.append(t)
                    elif not mt.group(2): tp.add(mt.group(1))
                named = set()
                for P in tp: named |= {h2 + '.txt' for h2 in json.load(open(os.path.join(tdir, P + '.json'))).values()}
                blobs = set(os.listdir(bdir))
                odd = [f for f in os.listdir(local) if f != 'srcstore' and not f.endswith('.js')]
                out['staged'].update(trees=len(tp), blobs=len(blobs), common_other=odd[:3])
                if extra or tp != parents or blobs != named or odd:
                    out['problems'].append('%s: staged common/ trees %d (%d not a held-out parent), %d parent(s) without a tree, blobs %d '
                                           '(%d unnamed, %d missing), other files %s' % (m['source'], len(tp), len(extra), len(parents - tp),
                                                                                      len(blobs), len(blobs - named), len(named - blobs), odd[:3]))
    out['ok'] = not out['problems']
    return out


def planned_rows(plan, tune_tasks, n_held):
    \"\"\"Coverage: the c4 parts rows a finished run must show per split.\"\"\"
    n_cfg = sum(len(v) for v in plan['configs'].values())
    tune_n = sum(1 for t in tune_tasks if t['parent'] in plan['assignment'])
    return dict(tune=n_cfg * 3 * tune_n, heldout=3 * n_held)
"""),
("""    a = dict(plan=os.path.join(HERE, 'stageB', 'plan.json'), scripts='', mounts='', parts='', override='',
             out_md=os.path.join(HERE, 'leak_audit', 'AUDIT-leak.md'), out_json=os.path.join(HERE, 'leak_audit', 'leak_audit.json'))
    for k, v in zip(argv[::2], argv[1::2]): a[k[2:].replace('-', '_')] = v
""", """    a = dict(plan=os.path.join(HERE, 'stageB', 'plan.json'), scripts='', mounts='', parts='', override='', roles='stageB,heldout',
             out_md=os.path.join(HERE, 'leak_audit', 'AUDIT-leak.md'), out_json=os.path.join(HERE, 'leak_audit', 'leak_audit.json'))
    test = '--test' in argv; argv = [x for x in argv if x != '--test']
    for k, v in zip(argv[::2], argv[1::2]): a[k[2:].replace('-', '_')] = v
    if not test and (a.get('override_assign') or a.get('expect_rows')):
        raise SystemExit('leak audit: --override-assign and --expect-rows are for --test only')
"""),
("""    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', s=plan['s'], plan_hash=plan.get('plan_hash'), splits={}, failures=[])
""", """    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', s=plan['s'], plan_hash=plan.get('plan_hash'), splits={}, failures=[], test=test)
"""),
("""    c4 = []
    for pd in filter(None, a['parts'].split(',')):
        for dp, dn, fn in os.walk(pd):
            if 'counts.json' in fn and not dp.endswith(('.part', '.model')):
                C = os.path.basename(dp)
                for tid, rec in json.load(open(os.path.join(dp, 'counts.json'))).items():
                    P = rec.get('parent'); sp = 'tune' if P in assign['tune'] else 'heldout'
                    ok = rec.get('checkpoint') == C == assign[sp].get(P)
                    c4.append(ok)
                    if not ok: res['failures'].append(dict(split=sp, task=tid, parent=P, checkpoint=C, c4=False))
    res['c4_parts'] = dict(task_rows=len(c4), ok=sum(c4))
    res['mounts'] = audit_mounts([p for p in a['scripts'].split(',') if p], [p for p in a['mounts'].split(',') if p], a.get('lane_host'))
""", """    c4 = []; c4_by = collections.Counter()
    for pd in filter(None, a['parts'].split(',')):
        for dp, dn, fn in os.walk(pd):
            if 'counts.json' in fn and not dp.endswith(('.part', '.model')):
                C = os.path.basename(dp)
                for tid, rec in json.load(open(os.path.join(dp, 'counts.json'))).items():
                    P = rec.get('parent'); sp = 'tune' if P in assign['tune'] else 'heldout'
                    ok = rec.get('checkpoint') == C == assign[sp].get(P)
                    c4.append(ok); c4_by[sp] += 1
                    if not ok: res['failures'].append(dict(split=sp, task=tid, parent=P, checkpoint=C, c4=False))
    res['c4_parts'] = dict(task_rows=len(c4), ok=sum(c4), by_split=dict(c4_by))
    scripts = [p for p in a['scripts'].split(',') if p]
    res['mounts'] = audit_mounts(scripts, [p for p in a['mounts'].split(',') if p], a.get('lane_host'))
    # coverage (audit-result-3): every role has a launcher, every split its planned parts rows
    want = planned_rows(plan, tune, len(held))
    if test and a.get('expect_rows'): want.update({k: int(v) for k, v in (x.split('=') for x in a['expect_rows'].split(','))})
    cov = []
    roles = [r for r in a['roles'].split(',') if r]
    if not test and not {'stageB', 'heldout'} <= set(roles): cov.append('--roles must include stageB and heldout (given %s)' % roles)
    have = collections.Counter(role_of(sp) for sp in scripts)
    for r in roles:
        if not have[r]: cov.append('no launcher script for the %s role' % r)
    for sp, n in sorted(want.items()):
        if c4_by[sp] != n: cov.append('%s parts rows %d, planned %d' % (sp, c4_by[sp], n))
    res['coverage'] = dict(ok=not cov, problems=cov, planned_rows=want, roles=roles)
    res['ruling78'] = ruling78(res['mounts'], plan, a.get('lane_host'))
"""),
("""    res['ok'] = not res['failures'] and res['kge_reads_no_task_file']['ok'] and res['code_evidence']['ok']
""", """    res['ok'] = (not res['failures'] and res['kge_reads_no_task_file']['ok'] and res['code_evidence']['ok'] and res['coverage']['ok']
                 and res['ruling78']['ok'])
"""),
("""          '| mount (script:line or inspect) | container | host source | class | ok |', '|---|---|---|---|---|']""",
 """          'Coverage (a vacuous audit fails): %s.' % ('ok' if res['coverage']['ok'] else 'FAIL: ' + '; '.join(res['coverage']['problems'])), '',
          'Ruling 78 (held-out mounts = the %d held-out parents\\' facts and source store only): %s.' % (
              res['ruling78']['parents'], ('ok, staged %s' % json.dumps(res['ruling78']['staged'])) if res['ruling78']['ok'] else 'FAIL: ' + '; '.join(res['ruling78']['problems'])), '',
          '| mount (script:line or inspect) | container | host source | class | ok |', '|---|---|---|---|---|']"""),
("""    print('leak audit', 'PASS' if res['ok'] else 'FAIL', json.dumps({k: (v['checkpoints'], v['tasks']) for k, v in res['splits'].items()}),
          'failures', len(res['failures']), 'mount rows', len(res['mounts']), flush=True)""",
 """    print('leak audit', 'PASS' if res['ok'] else 'FAIL', json.dumps({k: (v['checkpoints'], v['tasks']) for k, v in res['splits'].items()}),
          'failures', len(res['failures']), 'mount rows', len(res['mounts']), 'coverage', res['coverage']['problems'] or 'ok',
          'ruling78', res['ruling78']['problems'][:3] or 'ok', 'test' if test else '', flush=True)"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:80]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched leak_audit.py')
