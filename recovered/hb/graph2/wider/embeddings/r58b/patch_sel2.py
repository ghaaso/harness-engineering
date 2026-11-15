import sys
L = sys.argv[1]
p = L + '/train/selectB.py'
s = open(p, encoding='utf-8').read()
reps = [
# guard: refactor the assemble-checks part into ac_problems() and require the tables digest
("""    # evidence-2: the assembled tables passed orchestrator/assemble_checks.py (rulings 66, 67) on the current bytes
    ac = os.path.join(root, ASSEMBLE_CHECKS)
    if 'assemble-checks' not in passed: bad.append('assemble-checks: no PASS line (orchestrator/end_of_run.sh writes it)')
    elif not os.path.exists(ac): bad.append('assemble-checks: %s missing' % ASSEMBLE_CHECKS)
    else:
        lp = os.path.join(root, passed['assemble-checks']); ha = hashlib.sha256(open(ac, 'rb').read()).hexdigest()
        txt = open(lp, encoding='utf-8', errors='replace').read() if os.path.exists(lp) else None
        if txt is None: bad.append('assemble-checks: PASS log %s missing' % passed['assemble-checks'])
        elif not re.search(r'^assemble_checks PASS\\b', txt, re.M) or re.search(r'^assemble_checks REFUSED', txt, re.M) \\
                or not re.search(r'^sha256 %s\\b' % ha, txt, re.M):
            bad.append('assemble-checks: log %s does not show assemble_checks PASS on sha256 %s' % (passed['assemble-checks'], ha[:12]))
""", """    # evidence-2: the assembled tables passed orchestrator/assemble_checks.py (rulings 66, 67) on the current bytes
    if 'assemble-checks' not in passed: bad.append('assemble-checks: no PASS line (orchestrator/end_of_run.sh writes it)')
    else: bad += ac_problems(root, passed['assemble-checks'])
"""),
("""def check_assembled(arm, cids, plan, tb=None):""", """def tables_digest(tb, plan):
    \"\"\"selection-freeze-2/-7, ruling 80: sha256 over '<name>\\\\t<sha256 or missing>\\\\n' of every planned
    <arm>_<cid>_s<seed>_meta.json (arms in sorted order, configs in plan order, seeds 1-3). The same digest is printed by
    orchestrator/assemble_checks.py --plan and stamped into choices.json and the item-27 record.\"\"\"
    h = hashlib.sha256()
    for arm in sorted(plan['configs']):
        for c in plan['configs'][arm]:
            for s in SEEDS:
                n = '%s_%s_s%d_meta.json' % (arm, c['config_id'], s); p = os.path.join(tb, n)
                h.update(('%s\\t%s\\n' % (n, hashlib.sha256(open(p, 'rb').read()).hexdigest() if os.path.exists(p) else 'missing')).encode())
    return h.hexdigest()


def ac_problems(root, rel):
    \"\"\"evidence-2: [] when the PASS assemble-checks log <root>/<rel> shows `assemble_checks PASS`, no REFUSED line, the
    sha256 of the current <root>/orchestrator/assemble_checks.py, and `tables_digest <hex>` equal to the digest of the
    current <root>/train/stageB/tables under <root>/train/stageB/plan.json (a PASS from an earlier assembly is stale).\"\"\"
    ac = os.path.join(root, ASSEMBLE_CHECKS); lp = os.path.join(root, rel)
    if not os.path.exists(ac): return ['assemble-checks: %s missing' % ASSEMBLE_CHECKS]
    if not os.path.exists(lp): return ['assemble-checks: PASS log %s missing' % rel]
    ha = hashlib.sha256(open(ac, 'rb').read()).hexdigest()
    txt = open(lp, encoding='utf-8', errors='replace').read()
    if not re.search(r'^assemble_checks PASS\\b', txt, re.M) or re.search(r'^assemble_checks REFUSED', txt, re.M) \\
            or not re.search(r'^sha256 %s\\b' % ha, txt, re.M):
        return ['assemble-checks: log %s does not show assemble_checks PASS on sha256 %s' % (rel, ha[:12])]
    pp = os.path.join(root, 'train', 'stageB', 'plan.json')
    if not os.path.exists(pp): return ['assemble-checks: %s missing' % pp]
    want = tables_digest(os.path.join(root, 'train', 'stageB', 'tables'), json.load(open(pp)))
    if not re.search(r'^tables_digest %s$' % want, txt, re.M):
        return ['assemble-checks: log %s does not carry the current tables digest %s (stale PASS)' % (rel, want[:12])]
    return []


def stamp(plan, tb=None):
    \"\"\"selection-freeze-7: what choices.json carries and report.py compares (plan hash, selectB.py bytes, tables).\"\"\"
    return dict(plan_hash=plan['plan_hash'], selectB_sha256=hashlib.sha256(open(os.path.abspath(__file__), 'rb').read()).hexdigest(),
                tables_digest=tables_digest(tb or os.path.join(HERE, 'stageB', 'tables'), plan))


def check_assembled(arm, cids, plan, tb=None):"""),
("""        json.dump(dict(rule='ruling 53', blocks=choices[''], final_all65=finals[''],""",
 """        json.dump(dict(rule='ruling 53', stamp=stamp(plan) if plan else None, blocks=choices[''], final_all65=finals[''],"""),
]
for a, b in reps:
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8', newline='\n').write(s)

p = L + '/train/report.py'
s = open(p, encoding='utf-8').read()
reps = [
("from selectB import r58_guard, WS, cand_lists\n", "from selectB import r58_guard, WS, cand_lists, stamp\n"),
("""def verdict(diff, lo, hi):
    if lo > 0 and diff >= 0.02: return 'adds'""", """def check_stamps(sel, arms, plan, tb):
    \"\"\"selection-freeze-7: refuse (exit 4) unless every arm's choices.json carries the current plan hash, selectB.py
    sha256 and tables digest (a selectB/ folder from an earlier plan, selectB or assembly is stale input).\"\"\"
    want = stamp(plan, tb); bad = []
    for a in arms:
        cj = os.path.join(sel, a, 'choices.json')
        got = json.load(open(cj)).get('stamp') if os.path.exists(cj) else 'choices.json missing'
        if got != want: bad.append('%s: %s' % (a, got if isinstance(got, str) else {k: (got or {}).get(k) == v for k, v in want.items()}))
    if bad:
        print('selection-freeze-7: refusing stale selectB output: %s' % '; '.join(bad), flush=True)
        raise SystemExit(4)


def verdict(diff, lo, hi):
    \"\"\"selection-freeze-6: diff and both bounds are rounded to 12 decimals before the thresholds.\"\"\"
    diff, lo, hi = round(diff, 12), round(lo, 12), round(hi, 12)
    if lo > 0 and diff >= 0.02: return 'adds'"""),
("""    arms = ['PLACEBO'] if test else list(EMB) + ['PLACEBO']
""", """    arms = ['PLACEBO'] if test else list(EMB) + ['PLACEBO']
    if not test:
        check_stamps(sel, arms, json.load(open(os.path.join(HERE, 'stageB', 'plan.json'))), os.path.join(HERE, 'stageB', 'tables'))
"""),
]
for a, b in reps:
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched selectB.py and report.py')
