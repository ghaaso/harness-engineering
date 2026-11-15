"""Agent A, round r58c: the lane-side pre-check of a hand-off folder against the grader's refusals 1 to 9, in the
grader's order (coordinator, 2026-11-14). Every check is a refusal; the script lists every problem (never cut) and
ends with one line `PRECHECK PASS <split> <dir> HANDOFF.json sha256 <hex>` or `PRECHECK FAIL ...` (exit 1).
  1. HANDOFF.json sha256 against --expect-sha256 (when given; printed always); `test` present and equal to the mode;
     `split` tune / heldout.
  2. held-out: `anchor_line` present, `file` train/heldout/item27.json, `sha256` equal to the freeze sha256
     (--freeze-sha256, or the sha256 of --freeze FILE).
  3. every listed file present, sha256 equal, not a link, inside the folder.
  4. tuning: cross_check.lane_truth_sha256 equals the sha256 of eval/tune_tasks.jsonl.
  5. the variant set: real tuning 40 (4 comparators + E1..E5 and PLACEBO, alone/fused, s1-s3), real held-out 10 (the
     chosen arm alone/fused s1-s3 + 4 comparators), test 10 (4 comparators + one arm's 6); `label` and `mean_row`.
  6. the task set: real tuning the 313 late-50 tasks, real held-out the 418 held-out rows of build/tasks/tasks.jsonl,
     test exactly pick8 (37) or the late 50 (313) (answer_level.test_set_ids).
  7. ranked lists, every variant and scope: every task once; `variant` (and held-out `scope`) right; no repeated
     path; every path a code file (evalcore.CODE) that exists at the task's parent and never the seed; an unrestricted
     list holds EVERY code file of the parent except the seed (evalcore.PilotGraph.unrestricted, the task's own parent).
  8. answers: per variant every task once; `arm` the variant; `parent` and the first seed equal to the task row's;
     the items are the head of that variant's unrestricted list in order (n_ranked = list length; n_head <= n_units);
     budget 8,000, by the packer's own definition (common/packer.js pack): used <= 8,000; head_tok + tail_tok = the
     tokens of the first n_full items plus the cut, tail_tok the pad items' share; n_full + (1 if cut) + beyond =
     n_units; used = head_tok + tail_tok when everything fits, else that plus the "[+N more]" footer
     (1..FOOTER_RESERVE = 8 tokens); the items kept = the largest n_full + (1 if cut) over the budgets.
  9. held-out: tables/counts.json listed, keys exactly s1, s2, s3, every task in every seed with a 40-hex checkpoint.
usage: python precheck_handoff.py --dir D --split tune|heldout [--test] [--expect-sha256 H] [--freeze-sha256 H | --freeze F]
                                  [--tasks build/tasks/tasks.jsonl]
       python precheck_handoff.py            (no option: both TEST hand-offs of r58c/handoff-test, as built by build_handoffs.py)
"""
import os, sys, json, gzip, hashlib, re
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'train')); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import evalcore as ec
import answer_level as al

SCOPES = ('pool', 'unrestricted'); SEEDS = (1, 2, 3); COMPS = ('RRF', 'PPR', 'CO', 'DIR')
ARMS = ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO')
HEX40 = re.compile(r'^[0-9a-f]{40}$')
BUDGET = '8000'
FOOTER_RESERVE = 8  # common/config.js: tokens reserved for the "[+N more not shown]" line


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def rows_gz(p): return [json.loads(l) for l in gzip.open(p, 'rt', encoding='utf-8') if l.strip()]


def arm_names(arm): return ['%s_%s_s%d' % (arm, k, s) for k in ('alone', 'fused') for s in SEEDS]


def precheck(d, split, test, expect_sha=None, freeze_sha=None, tasks_path=None):
    P = []; bad = P.append
    hp = os.path.join(d, 'HANDOFF.json')
    if not os.path.isfile(hp): return ['no HANDOFF.json in %s' % d], None
    hsha = sha(hp); H = json.load(open(hp))
    # 1
    if expect_sha is not None and hsha != expect_sha: bad('1: HANDOFF.json sha256 %s, expected %s' % (hsha, expect_sha))
    if 'test' not in H or H['test'] is not bool(test): bad('1: test flag %r, the mode wants %r' % (H.get('test', 'MISSING'), bool(test)))
    if H.get('split') != split: bad('1: split %r, want %r' % (H.get('split'), split))
    # 2
    if split == 'heldout':
        try:
            an = json.loads(H['anchor_line'])
            if an.get('file') != 'train/heldout/item27.json': bad('2: anchor_line names %r' % an.get('file'))
            if freeze_sha is None: bad('2: no freeze sha256 given to compare the anchor with')
            elif an.get('sha256') != freeze_sha: bad('2: anchor_line sha256 %s, freeze %s' % (an.get('sha256'), freeze_sha))
            if an.get('step') != 'coordinator' or an.get('unit') != 'item27_freeze': bad('2: anchor_line is not an item27_freeze line')
        except (KeyError, TypeError, ValueError) as e:
            bad('2: anchor_line missing or unreadable (%s)' % e.__class__.__name__)
    # 3
    files = H.get('files') or {}
    if not files: bad('3: HANDOFF.json lists no files')
    real_d = os.path.realpath(d)
    for rel, want in sorted(files.items()):
        p = os.path.join(d, rel)
        if os.path.islink(p): bad('3: %s is a link' % rel); continue
        if not os.path.realpath(p).startswith(real_d + os.sep): bad('3: %s lies outside the folder' % rel); continue
        if not os.path.isfile(p): bad('3: %s missing' % rel); continue
        got = sha(p)
        if got != want: bad('3: %s sha256 %s, listed %s' % (rel, got, want))
    # 4
    if split == 'tune':
        tt = os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')
        got = (H.get('cross_check') or {}).get('lane_truth_sha256')
        if not got or got != sha(tt): bad('4: cross_check.lane_truth_sha256 %s, eval/tune_tasks.jsonl %s' % (got, sha(tt)))
    # 5
    vs = H.get('variants') or []
    names = [v.get('name') for v in vs]
    if len(set(names)) != len(names): bad('5: repeated variant names')
    if split == 'tune':
        arms = ARMS if not test else sorted({v.get('arm') for v in vs if v.get('seed') is not None})
        if test and len(arms) != 1: bad('5: a test tuning hand-off carries one arm, found %s' % arms)
    else:
        arms = [(H.get('chosen') or {}).get('arm')]
    want_v = set(COMPS) | {n for a in arms for n in arm_names(a)}
    if set(names) != want_v: bad('5: variants %d, want %d: extra %s, missing %s' % (len(names), len(want_v), sorted(set(names) - want_v), sorted(want_v - set(names))))
    nwant = (10 if test else 40) if split == 'tune' else 10
    if len(names) != nwant: bad('5: %d variants, the grader expects %d' % (len(names), nwant))
    for v in vs:
        s = v.get('seed'); n = v.get('name')
        lab = n if s is None else n.rsplit('_s', 1)[0]
        if 'label' in v and v['label'] != lab: bad('5: %s label %r, want %r' % (n, v['label'], lab))
        if 'mean_row' in v and v['mean_row'] != (lab if s is None else lab + '_mean'): bad('5: %s mean_row %r' % (n, v['mean_row']))
    # 6
    tf = os.path.join(d, H.get('task_file') or ('tasks.jsonl' if split == 'tune' else 'tasks_used.jsonl'))
    trows = [json.loads(l) for l in open(tf) if l.strip()] if os.path.isfile(tf) else []
    if not trows: bad('6: no task rows in %s' % os.path.basename(tf))
    ids = [r['id'] for r in trows]; byid = {r['id']: r for r in trows}
    if len(set(ids)) != len(ids): bad('6: repeated task ids in %s' % os.path.basename(tf))
    if test:
        sets = {n: set(al.test_set_ids(n)) for n in al.TEST_SETS}
        hit = [n for n, s_ in sets.items() if s_ == set(ids)]
        if not hit: bad('6: the test task set (%d) is neither pick8 (%d) nor late50 (%d)' % (len(ids), len(sets['pick8']), len(sets['late50'])))
        elif H.get('test_set') not in (None, hit[0]): bad('6: HANDOFF test_set %r but the tasks are %s' % (H.get('test_set'), hit[0]))
    elif split == 'tune':
        want = set(al.test_set_ids('late50'))
        if set(ids) != want: bad('6: tuning tasks %d, want the %d late-50 tasks' % (len(ids), len(want)))
    else:
        tp = tasks_path or os.path.join(ROOT, '..', '..', 'build', 'tasks', 'tasks.jsonl')
        want = {json.loads(l)['id'] for l in open(tp) if l.strip() and json.loads(l).get('split') == 'heldout' and json.loads(l).get('set') == 'T1'}
        if set(ids) != want or len(want) != 418: bad('6: held-out tasks %d, want the %d held-out rows' % (len(ids), len(want)))
    if H.get('tasks') != len(ids): bad('6: HANDOFF tasks %r, task rows %d' % (H.get('tasks'), len(ids)))
    # 7 and 8
    univ = {}
    for i in ids:
        r = byid[i]; g = ec.graph(r['parent'])
        univ[i] = g.unrestricted(r['seed']['path'])
    for n in sorted(names):
        lists = {}
        for sc in SCOPES:
            p = os.path.join(d, 'ranked', '%s_%s.jsonl.gz' % (n, sc))
            if not os.path.isfile(p): bad('7: ranked/%s_%s.jsonl.gz missing' % (n, sc)); continue
            rr = rows_gz(p); seen = [x.get('id') for x in rr]
            if sorted(seen) != sorted(ids): bad('7: %s %s: rows %d for %d tasks (each once: %s)' % (n, sc, len(seen), len(ids), len(set(seen)) == len(seen)))
            for x in rr:
                tid = x.get('id')
                if tid not in byid: continue
                if x.get('variant') != n: bad('7: %s %s %s: variant %r' % (n, sc, tid, x.get('variant')))
                if split == 'heldout' and x.get('scope') != sc: bad('7: %s %s %s: scope %r' % (n, sc, tid, x.get('scope')))
                L = x.get('ranked') or []; U = set(univ[tid]); seed = byid[tid]['seed']['path']
                if len(set(L)) != len(L): bad('7: %s %s %s: a repeated path' % (n, sc, tid))
                odd = [q for q in L if q not in U or not ec.CODE.match(q) or q == seed]
                if odd: bad('7: %s %s %s: %d path(s) not a code file at the parent or the seed, e.g. %s' % (n, sc, tid, len(odd), odd[0]))
                if sc == 'unrestricted' and set(L) != U: bad('7: %s unrestricted %s: %d of the %d code files of the parent' % (n, tid, len(set(L) & U), len(U)))
                lists[(sc, tid)] = L
        ap = os.path.join(d, 'answers', '%s.jsonl.gz' % n)
        if not os.path.isfile(ap): bad('8: answers/%s.jsonl.gz missing' % n); continue
        ar = rows_gz(ap)
        if sorted(a.get('id') for a in ar) != sorted(ids): bad('8: %s: answers %d for %d tasks' % (n, len(ar), len(ids)))
        for a in ar:
            tid = a.get('id')
            if tid not in byid: continue
            r = byid[tid]
            if a.get('arm') != n: bad('8: %s %s: arm %r' % (n, tid, a.get('arm')))
            if a.get('parent') != r['parent']: bad('8: %s %s: parent %r, task row %r' % (n, tid, a.get('parent'), r['parent']))
            if not a.get('seeds') or a['seeds'][0] != 'file:' + r['seed']['path']: bad('8: %s %s: first seed %r' % (n, tid, (a.get('seeds') or [None])[0]))
            L = lists.get(('unrestricted', tid)); items = [it.get('path') for it in a.get('items') or []]
            if L is not None:
                if items != L[:len(items)]: bad('8: %s %s: the items are not the head of the unrestricted list' % (n, tid))
                if a.get('n_ranked') != len(L): bad('8: %s %s: n_ranked %r, list %d' % (n, tid, a.get('n_ranked'), len(L)))
            its = a.get('items') or []; nu = a.get('n_units')
            if not (isinstance(nu, int) and isinstance(a.get('n_head'), int) and 0 <= a['n_head'] <= nu):
                bad('8: %s %s: n_head %r, n_units %r' % (n, tid, a.get('n_head'), nu))
            bs = a.get('budgets') or {}
            keep = max([v.get('n_full', 0) + (1 if v.get('cut') else 0) for v in bs.values() if isinstance(v, dict)] or [0])
            if len(its) != keep: bad('8: %s %s: %d items kept, the budgets show %d' % (n, tid, len(its), keep))
            b = bs.get(BUDGET)
            if not isinstance(b, dict): bad('8: %s %s: no %s budget' % (n, tid, BUDGET)); continue
            try:
                nf, cut, ht, tt, used, bey = b['n_full'], b.get('cut'), b['head_tok'], b['tail_tok'], b['used'], b['beyond']
                shown = its[:nf] + ([dict(its[nf], tok=cut['tok'])] if cut else [])
                tok_ok = (len(its) >= nf + (1 if cut else 0) and ht + tt == sum(x['tok'] for x in shown)
                          and tt == sum(x['tok'] for x in shown if x.get('pad')))
                foot = used - ht - tt
                fits = not cut and bey == 0 and nf == nu
                ok8 = (used <= int(BUDGET) and tok_ok and nf + (1 if cut else 0) + bey == nu
                       and (foot == 0 if fits else 1 <= foot <= FOOTER_RESERVE))
            except (KeyError, TypeError, IndexError) as e:
                ok8 = False
            if not ok8:
                bad('8: %s %s: the 8,000 budget does not add up: %s' % (n, tid, json.dumps({k: b.get(k) for k in ('used', 'head_tok', 'tail_tok', 'n_full', 'beyond')} | {'cut_tok': (b.get('cut') or {}).get('tok'), 'n_units': nu})))
    # 9
    if split == 'heldout':
        cp = os.path.join(d, 'tables', 'counts.json')
        if 'tables/counts.json' not in files: bad('9: tables/counts.json is not listed')
        if not os.path.isfile(cp): bad('9: tables/counts.json missing')
        else:
            c = json.load(open(cp))
            if sorted(c) != ['s1', 's2', 's3']: bad('9: counts.json keys %s, want s1..s3' % sorted(c))
            for k in sorted(c):
                miss = sorted(set(ids) - set(c[k]))
                if miss: bad('9: %s lacks %d task(s), e.g. %s' % (k, len(miss), miss[0]))
                odd = [t for t in ids if t in c[k] and not HEX40.match(str((c[k][t] or {}).get('checkpoint')))]
                if odd: bad('9: %s: %d task(s) without a 40-hex checkpoint, e.g. %s' % (k, len(odd), odd[0]))
    return P, hsha


def report(d, split, test, **kw):
    P, hsha = precheck(d, split, test, **kw)
    for p in P: print('  ' + p, flush=True)
    print('PRECHECK %s %s %s%s HANDOFF.json sha256 %s problems %d' % ('PASS' if not P else 'FAIL', split, d, ' (test)' if test else '', hsha, len(P)), flush=True)
    return not P


def main(argv):
    if not argv:  # the two TEST hand-offs of round r58c
        HT = os.path.join(ROOT, 'r58c', 'handoff-test'); rec = os.path.join(ROOT, 'r58c', 'A', 'out', 'ho_rec', 'item27.json')
        ok = report(os.path.join(HT, 'tune'), 'tune', True)
        ok = report(os.path.join(HT, 'heldout'), 'heldout', True, freeze_sha=sha(rec)) and ok
        # the pre-check itself, on tampered copies (each must fail at its step)
        import shutil
        T = os.path.join(ROOT, 'r58c', 'A', 'out', 'precheck_tamper')
        if os.path.isdir(T): shutil.rmtree(T)
        cases = []
        def tamper(name, src, fn):
            dst = os.path.join(T, name); shutil.copytree(src, dst); fn(dst); return dst
        def drop_task(dst):  # a ranked list without its first task, the listed sha256 updated (3 passes, 7 must fail)
            p = os.path.join(dst, 'ranked', 'RRF_pool.jsonl.gz'); rr = rows_gz(p)[1:]
            with gzip.open(p, 'wt', encoding='utf-8') as f:
                for x in rr: f.write(json.dumps(x) + '\n')
            hp = os.path.join(dst, 'HANDOFF.json'); H = json.load(open(hp)); H['files']['ranked/RRF_pool.jsonl.gz'] = sha(p); json.dump(H, open(hp, 'w'))
        def seed_in_list(dst):  # the seed put at the head of an unrestricted list (7)
            p = os.path.join(dst, 'ranked', 'CO_unrestricted.jsonl.gz'); rr = rows_gz(p)
            tf = [json.loads(l) for l in open(os.path.join(dst, 'tasks_used.jsonl')) if l.strip()]; sd = {r['id']: r['seed']['path'] for r in tf}
            rr[0]['ranked'] = [sd[rr[0]['id']]] + rr[0]['ranked']
            with gzip.open(p, 'wt', encoding='utf-8') as f:
                for x in rr: f.write(json.dumps(x) + '\n')
        def bump_budget(dst):  # one answer's 8,000 head_tok off by one token (8)
            p = os.path.join(dst, 'answers', 'CO.jsonl.gz'); rr = rows_gz(p); rr[0]['budgets'][BUDGET]['head_tok'] += 1
            with gzip.open(p, 'wt', encoding='utf-8') as f:
                for x in rr: f.write(json.dumps(x) + '\n')
            hp = os.path.join(dst, 'HANDOFF.json'); H = json.load(open(hp)); H['files']['answers/CO.jsonl.gz'] = sha(p); json.dump(H, open(hp, 'w'))
        def flip_test(dst):  # the test flag off (1) and an extra variant (5)
            hp = os.path.join(dst, 'HANDOFF.json'); H = json.load(open(hp)); H['test'] = False; H['variants'].append(dict(H['variants'][0], name='E9_alone_s1')); json.dump(H, open(hp, 'w'))
        for name, src, split, fn, steps in (('drop', os.path.join(HT, 'tune'), 'tune', drop_task, ('7:',)),
                                            ('seed', os.path.join(HT, 'heldout'), 'heldout', seed_in_list, ('3:', '7:')),
                                            ('flag', os.path.join(HT, 'tune'), 'tune', flip_test, ('1:', '5:')),
                                            ('budget', os.path.join(HT, 'heldout'), 'heldout', bump_budget, ('8:',))):
            P, _ = precheck(tamper(name, src, fn), split, True, freeze_sha=sha(rec))
            got = all(any(p.startswith(s) for p in P) for s in steps)
            print('tamper %-5s %s: %s; e.g. %s' % (name, 'caught' if got else 'MISSED', [s for s in steps], P[:2]), flush=True)
            ok = ok and got
        shutil.rmtree(T, ignore_errors=True)
        print('RESULT %s precheck_handoff' % ('PASS' if ok else 'FAIL'), flush=True)
        return 0 if ok else 1
    o = dict(test=False); i = 0; known = ('dir', 'split', 'expect-sha256', 'freeze-sha256', 'freeze', 'tasks')
    while i < len(argv):
        k = argv[i]
        if k == '--test': o['test'] = True; i += 1; continue
        if not k.startswith('--') or k[2:] not in known or i + 1 >= len(argv): print('precheck: unknown or incomplete option %r' % k); return 2
        o[k[2:]] = argv[i + 1]; i += 2
    if 'dir' not in o or o.get('split') not in ('tune', 'heldout'): print('precheck: --dir and --split tune|heldout are required'); return 2
    fs = o.get('freeze-sha256') or (sha(o['freeze']) if o.get('freeze') else None)
    ok = report(o['dir'], o['split'], o['test'], expect_sha=o.get('expect-sha256'), freeze_sha=fs, tasks_path=o.get('tasks'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
