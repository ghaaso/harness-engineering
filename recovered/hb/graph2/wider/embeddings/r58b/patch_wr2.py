import sys
p = sys.argv[1] + '/train/write_result.py'
s = open(p, encoding='utf-8').read()
reps = [
# ---- docstring
("""  --leak     train/report/leak_audit.json  leak_audit.py (ruling 60; its markdown goes into AUDIT.md, not here)
  --item27   train/heldout/item27.json     item27.py (the frozen held-out choice)
  --heldout  (optional) the grader's held-out aggregates (JSON); absent -> "not graded yet"
  --plan     train/stageB/plan.json
""", """  --leak     train/leak_audit/leak_audit.json  leak_audit.py's own default output (ruling 60; review audit-result-3: the
             same path; the real run refuses when it is missing, says FAIL, or is a --test audit)
  --item27   train/heldout/item27.json     item27.py (the frozen held-out choice; the real run refuses when it is missing)
  --heldout  (optional) the grader's held-out aggregates (JSON, train/HANDOFF-FORMAT.md section 3); absent -> "not graded
             yet". Refused unless its freeze_sha256 equals sha256(item27.json) and HANDOFF.json's, its handoff_sha256 equals
             sha256(HANDOFF.json), its test flag matches, its arm is the frozen arm, and every variant (arm alone and fused
             per seed and seed mean, RRF, PPR, CO, DIR) has all four metrics on both scopes and the answer-level measure
  --handoff  train/heldout/HANDOFF.json
  --plan     train/stageB/plan.json
  --protocol the repository's protocol-addendum-8.md (the limits are copied from it word for word)
"""),
("""Refusal: a test input (item27 record with test: true, or --test) is never written to the real deliverable folder.
""", """Review audit-result-2/-7/-8 (this round): the held-out section is a table (every variant, metric and scope, per seed and
seed mean, plus the answer-level measure; no verdict word) with item 7's four stored figures as given; the Limits carry
rulings 35, 39, 44, 45, 46, 47, 67 and 68 word for word from protocol-addendum-8.md (the real run refuses when one is
not found) and item 31's wording ("cannot tell" is printed as "cannot tell (no evidence either way at this size)");
RESULT.md has one table with all four metrics on both scopes for every arm (alone / fused) and every comparator
(RANDOM included), the sensitivity rows of rulings 53 and 56 beside the verdicts (numbers only, no word), the
placebo rows and harness_check.ok; result.json carries tune.json's comparators, the seed means and every vs_RRF row.
Refusal: a test input (item27 record with test: true, or --test) is never written to the real deliverable folder.
"""),
("""usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--answer-graded P] [--leak P] [--item27 P] [--heldout P]
                              [--plan P] [--outdir DIR]
\"\"\"
import os, sys, json, hashlib, datetime
""", """usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--answer-graded P] [--leak P] [--item27 P] [--heldout P]
                              [--handoff P] [--plan P] [--protocol P] [--outdir DIR]
\"\"\"
import os, sys, json, hashlib, datetime, re
"""),
("""EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
MAX_LINES = 149
""", """EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
MAX_LINES = 149
PROTOCOL = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'protocol-addendum-8.md')
LIMIT_RULINGS = (35, 39, 44, 45, 46, 47, 67, 68)
METRICS = ('P@10', 'R@10', 'R@20', 'MRR'); SCOPES = ('pool', 'unrestricted'); COMPS = ('RRF', 'PPR', 'CO', 'DIR')
ITEM7 = ('Stored arms of item 7, shown as they are (8,000-token answer recall, 75 commits; nothing of theirs is rerun): '
         'typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549.')
CT = 'cannot tell (no evidence either way at this size)'


def word(w):
    \"\"\"Item 31: 'cannot tell' is reported as 'no evidence either way at this size'.\"\"\"
    return w.replace('cannot tell', CT, 1) if isinstance(w, str) and w.startswith('cannot tell') else w


def ruling_text(path, n):
    \"\"\"The paragraph of protocol-addendum-8.md that starts '<n>. ', joined into one line (None when absent).\"\"\"
    if not path or not os.path.exists(path): return None
    out = None
    for l in open(path, encoding='utf-8'):
        if out is None:
            if re.match(r'^%d\\. ' % n, l): out = [l.strip()]
        elif not l.strip() or re.match(r'^\\d+\\. ', l) or l.startswith('#'):
            break
        else:
            out.append(l.strip())
    return ' '.join(out) if out else None


def ho_variants(arm):
    return ['%s_%s_%s' % (arm, k, s) for k in ('alone', 'fused') for s in ('s1', 's2', 's3', 'mean')] + list(COMPS)


def check_heldout(HO, R27, a, is_test):
    \"\"\"audit-result-2: the grader's held-out aggregates must belong to the frozen choice and be complete.\"\"\"
    bad = []
    fz = sha(a['item27']) if a.get('item27') and os.path.exists(a['item27']) else None
    if not fz or HO.get('freeze_sha256') != fz: bad.append('freeze_sha256 %s is not sha256(item27.json) %s' % (str(HO.get('freeze_sha256'))[:12], str(fz)[:12]))
    hp = a.get('handoff')
    if not hp or not os.path.exists(hp): bad.append('HANDOFF.json %s missing' % hp)
    else:
        H = json.load(open(hp))
        if H.get('freeze_sha256') != HO.get('freeze_sha256'): bad.append('HANDOFF.json freeze_sha256 differs')
        if HO.get('handoff_sha256') != sha(hp): bad.append('handoff_sha256 is not sha256(HANDOFF.json)')
        if bool(H.get('test')) != bool(is_test): bad.append('HANDOFF.json test=%s' % H.get('test'))
    if bool(HO.get('test')) != bool(is_test): bad.append('aggregates test=%s' % HO.get('test'))
    arm = (R27 or {}).get('chosen', {}).get('arm')
    if HO.get('arm') != arm: bad.append('aggregates arm %s, frozen arm %s' % (HO.get('arm'), arm))
    miss = [v for v in ho_variants(arm or '?') if not all(isinstance(((HO.get('rank') or {}).get(v) or {}).get(sc, {}).get(m), (int, float))
                                                       for sc in SCOPES for m in METRICS)
            or not isinstance((HO.get('answer_level') or {}).get(v), (int, float))]
    if miss: bad.append('incomplete variants %s' % miss[:4])
    return bad
"""),
# ---- verdicts: item-31 wording and the sensitivity columns
("""    L += ['## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)', '',
          '| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word |',
          '|---|---|---|---|---|---|---|---|']
    J['verdicts'] = {}
    for arm in EMB + ('PLACEBO',):
        if '%s_fused' % arm not in c['pool']: continue
        fp = c['pool']['%s_fused' % arm]; ap = c['pool']['%s_alone' % arm]; fu = c['unrestricted']['%s_fused' % arm]
        h = hol.get('pool', {}).get('fused', {}).get('P@10', {}).get(arm)
        hs = ('[%s, %s] at %.4f' % (f3(h['lo']), f3(h['hi']), h['level'])) if h else 'n/a (not an embedding arm)'
        L.append('| %s | %s | %s | %s | %s | %s | %s | %s |' % (arm, iv(fp['vs_RRF']['P@10']), fp['verdict_P10'], hs, iv(ap['vs_RRF']['P@10']),
                                                              ap['verdict_P10'], iv(fu['vs_RRF']['P@10']), fu['verdict_P10']))
""", """    cps = T['contrasts'].get('late50_pilot_shared', {})
    L += ['## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)', '',
          '| arm | fused - RRF, pool P@10 | word | percentile interval at Holm-adjusted level | alone - RRF | word | fused, unrestricted | word '
          '| builder reading (53), sensitivity, no word | pilot-shared commits (56), sensitivity, no word |',
          '|---|---|---|---|---|---|---|---|---|---|']
    J['verdicts'] = {}
    for arm in EMB + ('PLACEBO',):
        if '%s_fused' % arm not in c['pool']: continue
        fp = c['pool']['%s_fused' % arm]; ap = c['pool']['%s_alone' % arm]; fu = c['unrestricted']['%s_fused' % arm]
        h = hol.get('pool', {}).get('fused', {}).get('P@10', {}).get(arm)
        hs = ('[%s, %s] at %.4f' % (f3(h['lo']), f3(h['hi']), h['level'])) if h else 'n/a (not an embedding arm)'
        sb = c['pool'].get('%s_fused_builder' % arm); sp = cps.get('pool', {}).get('%s_fused' % arm)
        L.append('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (arm, iv(fp['vs_RRF']['P@10']), word(fp['verdict_P10']), hs, iv(ap['vs_RRF']['P@10']),
                                                                        word(ap['verdict_P10']), iv(fu['vs_RRF']['P@10']), word(fu['verdict_P10']),
                                                                        iv(sb['vs_RRF']['P@10']) if sb else 'n/a', iv(sp['vs_RRF']['P@10']) if sp else 'n/a'))
"""),
("""    L += ['Placebo (harness check, ruling 54): primary word "%s"; fixed-w pool P@10 minus RRF: %s.' % (
        hc.get('placebo_primary_late50'), ', '.join(""", """    L += ['Placebo (harness check, ruling 54; harness_check.ok = %s): primary word "%s"; fixed-w pool P@10 minus RRF: %s.' % (
        hc.get('ok'), word(hc.get('placebo_primary_late50')), ', '.join("""),
("""    J['placebo'] = hc
""", """    J['placebo'] = hc
    # ---- every metric on both scopes (audit-result-8): seed means of arms (alone / fused) and the comparators' own values
    A = T.get('arms', {}).get('late50', {}); CM = T.get('comparators', {}).get('late50', {})
    m2 = lambda d: '%.3f' % d if isinstance(d, (int, float)) else 'n/a'
    L += ['## All metrics, late 50 (item 23; seed means; arm cells: alone / fused)', '',
          '| list | ' + ' | '.join('%s %s' % (sc[:5], m) for sc in SCOPES for m in METRICS) + ' |', '|---' * 9 + '|']
    for arm in EMB + ('PLACEBO',):
        if '%s_fused' % arm not in A.get('pool', {}): continue
        L.append('| %s | %s |' % (arm, ' | '.join('%s / %s' % (m2(A[sc]['%s_alone' % arm]['seed_mean'][m]), m2(A[sc]['%s_fused' % arm]['seed_mean'][m]))
                                                  for sc in SCOPES for m in METRICS)))
    for n in COMPS + ('RANDOM',):
        if n in CM.get('pool', {}):
            L.append('| %s | %s |' % (n, ' | '.join(m2(CM[sc][n].get(m)) for sc in SCOPES for m in METRICS)))
    L += ['', 'Every arm-minus-RRF interval for every metric and scope, the sensitivity rows (53, 56) and the comparators are in result.json.', '']
    J['tune_full'] = dict(comparators=T.get('comparators'), seed_means={st: {sc: {v: r.get('seed_mean') for v, r in d.items()} for sc, d in x.items()}
                                                                         for st, x in T.get('arms', {}).items()},
                          vs_RRF={st: {sc: {v: r.get('vs_RRF') for v, r in d.items()} for sc, d in x.items()} for st, x in T['contrasts'].items()},
                          harness_check_ok=hc.get('ok'), notes=T.get('notes'))
"""),
# ---- held-out
("""    if HO:
        L.append('Grader aggregates (copied as given): ' + json.dumps({k: v for k, v in HO.items() if not isinstance(v, (list, dict)) or k == 'summary'})[:400])
        J['heldout'] = HO.get('summary', HO)
    else:
        L.append('Not graded yet: the held-out ranked lists and packs go to the grader (truth stays there).')
    L.append('')
""", """    L.append(ITEM7)
    if HO:
        arm = R27['chosen']['arm']
        L += ['Grader aggregates (%s; %s commits, %s tasks; item 23 aggregation; descriptive only):' % (os.path.basename(a['heldout']), HO.get('commits'), HO.get('tasks')), '',
              '| variant | ' + ' | '.join('%s %s' % (sc[:5], m) for sc in SCOPES for m in METRICS) + ' | answer level (item 24) |', '|---' * 10 + '|']
        J['heldout'] = dict(freeze_sha256=HO['freeze_sha256'], handoff_sha256=HO['handoff_sha256'], commits=HO.get('commits'), tasks=HO.get('tasks'),
                            rank={}, answer_level={})
        for v in ho_variants(arm):
            L.append('| %s | %s | %.3f |' % (v, ' | '.join('%.3f' % HO['rank'][v][sc][m] for sc in SCOPES for m in METRICS), HO['answer_level'][v]))
            J['heldout']['rank'][v] = HO['rank'][v]; J['heldout']['answer_level'][v] = HO['answer_level'][v]
        L.append('Checked: the aggregates carry sha256(item27.json) and HANDOFF.json\\'s hash; arm %s is the frozen arm.' % arm)
    else:
        L.append('Not graded yet: the held-out ranked lists and packs go to the grader (truth stays there).')
    L.append('')
"""),
# ---- limits
("""    L += ['## Limits (section I)', '',
          '- One repository (about 233 commits, 5,400 nodes, 19,000 edges): a null says nothing about larger or denser graphs.',
          '- Not tested: temporal or inductive KGE models, text or code embeddings, rule learners, a longer history.',
          '- Truth is what a commit changed, at file level; no agent was run. With 50 commits only differences of several',
          '  hundredths are detectable: "cannot tell" is not "no effect".', '']
    L += ['## Sources', ''] + ['- %s `%s` sha256 %s' % (k, v['file'], v['sha256'][:16]) for k, v in sorted(J['inputs'].items())]
""", """    L += ['## Limits (section I, and the rulings reported as limits)', '',
          '- One repository (about 233 commits, 5,400 nodes, 19,000 edges): a null says nothing about larger or denser graphs.',
          '- Not tested: temporal or inductive KGE models, text or code embeddings, rule learners, a longer history.',
          '- Truth is what a commit changed, at file level; no agent was run. With 50 evaluation commits the smallest detectable',
          '  difference is several hundredths; "cannot tell" is reported as "no evidence either way at this size".']
    J['limits'] = {}
    for n in LIMIT_RULINGS:
        t = ruling_text(a.get('protocol'), n)
        J['limits'][str(n)] = t
        L.append('- Ruling %s' % (t if t else '%d: TEXT NOT FOUND in %s' % (n, a.get('protocol'))))
    L += ['', '## Sources', '', '; '.join('%s `%s` %s' % (k, v['file'], v['sha256'][:12]) for k, v in sorted(J['inputs'].items()))]
"""),
("""    for k in ('tune', 'item22', 'answer', 'answer_graded', 'leak', 'item27', 'heldout', 'plan'):""",
 """    for k in ('tune', 'item22', 'answer', 'answer_graded', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'protocol'):"""),
# ---- main: defaults and refusals
("""             answer=os.path.join(HERE, 'report', 'answer_level', 'answer_level.json'), leak=os.path.join(HERE, 'report', 'leak_audit.json'),
             item27=os.path.join(HERE, 'heldout', 'item27.json'), heldout=None, plan=os.path.join(HERE, 'stageB', 'plan.json'),
             outdir=DELIVERABLE, test=False)""",
 """             answer=os.path.join(HERE, 'report', 'answer_level', 'answer_level.json'), leak=os.path.join(HERE, 'leak_audit', 'leak_audit.json'),
             item27=os.path.join(HERE, 'heldout', 'item27.json'), heldout=None, handoff=os.path.join(HERE, 'heldout', 'HANDOFF.json'),
             plan=os.path.join(HERE, 'stageB', 'plan.json'), protocol=PROTOCOL, outdir=DELIVERABLE, test=False)"""),
("""    a['test'] = is_test
    L, J = build(a)
""", """    a['test'] = is_test
    bad = []
    lk = load(a['leak'])
    if not is_test:  # audit-result-3 / -10: the real deliverable needs the real audit and the real record
        if lk is None: bad.append('the leak audit %s is missing' % a['leak'])
        elif lk.get('ok') is not True or lk.get('test'): bad.append('the leak audit says ok=%s test=%s' % (lk.get('ok'), lk.get('test')))
        plan = load(a['plan'])
        if lk and plan and lk.get('plan_hash') != plan.get('plan_hash'): bad.append('the leak audit is of another plan')
        if r27 is None: bad.append('item27.json %s is missing' % a['item27'])
        elif plan and r27.get('plan_hash') != plan.get('plan_hash'): bad.append('item27.json is of another plan')
        miss = [n for n in LIMIT_RULINGS if not ruling_text(a.get('protocol'), n)]
        if miss: bad.append('limit text of ruling(s) %s not found in %s' % (miss, a.get('protocol')))
    if bad:
        print('write_result: refusing (exit 10): ' + '; '.join(bad), flush=True); raise SystemExit(10)
    ho = load(a.get('heldout'))
    if ho is not None:
        hb = check_heldout(ho, r27, a, is_test)
        if hb: print('write_result: refusing (exit 12): held-out aggregates: ' + '; '.join(hb), flush=True); raise SystemExit(12)
    L, J = build(a)
"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:90]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched write_result.py')
