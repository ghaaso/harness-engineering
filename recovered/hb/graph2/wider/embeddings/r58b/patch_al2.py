import sys
p = sys.argv[1] + '/train/answer_level.py'
s = open(p, encoding='utf-8').read()
reps = [
("""Guards: this file refuses to run unless answer_level.js hashes to JS_SHA256, and every shared file the record
lists (common/*.js) hashes to the frozen record's value (import, never edit).
""", """Guards: this file refuses to run unless answer_level.js hashes to JS_SHA256, and every shared file the record
lists (common/*.js) exists and hashes to the frozen record's value (import, never edit; answer-level-5: a missing
listed file is a refusal, exit 7). A ranked path with no file node in the facts graph is a refusal, both in tune and
in pack (answer-level-3, exit 11). tune refuses unless all 40 variants' tables exist (4 comparators + 6 arms x
alone/fused x 3 seeds; answer-level-4, exit 10) and every task row is set T1 (answer-level-7).
Naming (answer-level-6, one scheme for both splits, train/HANDOFF-FORMAT.md): <ARM>_<alone|fused>_s<seed> and the
comparators by name; HANDOFF.json lists every variant with explicit label and seed fields, and the lane's own
aggregation reads label and seed from that list, never by parsing a name.
"""),
("""        p = os.path.join(COMMON, rel[len('common/'):])
        if os.path.exists(p) and sha256_file(p) != h: bad.append('%s differs from the frozen record' % rel)
""", """        p = os.path.join(COMMON, rel[len('common/'):])
        if not os.path.exists(p): bad.append('%s is missing under %s' % (rel, COMMON))  # answer-level-5
        elif sha256_file(p) != h: bad.append('%s differs from the frozen record' % rel)
"""),
("""def pack(ranked, tasks_file, out):
    check_code()
    return node('pack', '--ranked', ranked, '--tasks', tasks_file, '--primary', PRIMARY, '--out', out)
""", """def no_dropped(pk, where):
    \"\"\"answer-level-3: a ranked path with no file node would be dropped from the pack (every later item moves up).\"\"\"
    if pk.get('ranked_paths_without_file_node', 0) != 0:
        print('item-24 adapter: refusing (exit 11): %s: %s ranked path(s) have no file node in the facts graph (e.g. %s)'
              % (where, pk.get('ranked_paths_without_file_node'), json.dumps(pk.get('sample'))[:200]), flush=True)
        raise SystemExit(11)
    return pk


def pack(ranked, tasks_file, out):
    check_code()
    return no_dropped(node('pack', '--ranked', ranked, '--tasks', tasks_file, '--primary', PRIMARY, '--out', out), ranked)
"""),
("""    for t in sub:
        r = bt[t['task_id']]
        assert r['split'] == 'tune' and r['parent'] == t['parent'] and r['seed']['path'] == t['seed'], ('task rows disagree', t['task_id'])
""", """    for t in sub:
        r = bt[t['task_id']]
        assert r['set'] == 'T1' and r['split'] == 'tune' and r['parent'] == t['parent'] and r['seed']['path'] == t['seed'], ('task rows disagree', t['task_id'])
"""),
("""    for arm in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'):
        for kind in ('alone', 'fused'):
            for s in SEEDS:
                p = os.path.join(sel, arm, '%s_unrestricted_s%d.tsv.gz' % (kind, s))
                if os.path.exists(p): variants.append(('%s_%s' % (arm, kind), s, p))
    for lab, s, p in variants:
        T = ec.read_score_table(p)
        v = lab if s is None else '%s|s%d' % (lab, s)
        for t in sub: rows.append((v, t['task_id'], ec.rank(t['task_id'], cand[t['task_id']], T.get(t['task_id'], {}))))
    rk = os.path.join(WK, 'ranked_unrestricted.jsonl.gz'); write_ranked(rk, rows)
    ans = os.path.join(WK, 'answers.jsonl.gz')
    pk = node('pack', '--ranked', rk, '--tasks', tf, '--primary', PRIMARY, '--out', ans)
    # ruling 71: the grader's hand-off, one ranked file and one pack file per variant (heldout.py's layout)
    fname = lambda v: v.replace('|', '_')
    split_by(rk, 'variant', lambda v: os.path.join(HO, 'ranked', '%s_unrestricted.jsonl.gz' % fname(v)))
    split_by(ans, 'arm', lambda v: os.path.join(HO, 'answers', '%s.jsonl.gz' % fname(v)))
""", """    missing = []
    for arm in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'):
        for kind in ('alone', 'fused'):
            for s in SEEDS:
                p = os.path.join(sel, arm, '%s_unrestricted_s%d.tsv.gz' % (kind, s))
                if os.path.exists(p): variants.append(('%s_%s' % (arm, kind), s, p))
                else: missing.append(os.path.relpath(p, sel))
    if missing or len(variants) != len(COMPARATORS) + 6 * 2 * len(SEEDS):  # answer-level-4: 40 variants, none skipped
        print('item-24 adapter: refusing (exit 10): %d variant(s), %d table(s) missing: %s' % (len(variants), len(missing), missing[:4]), flush=True)
        raise SystemExit(10)
    vname = lambda lab, s: lab if s is None else '%s_s%d' % (lab, s)  # answer-level-6: the held-out naming
    vmap = {vname(lab, s): (lab, s) for lab, s, _ in variants}
    for lab, s, p in variants:
        T = ec.read_score_table(p)
        for t in sub: rows.append((vname(lab, s), t['task_id'], ec.rank(t['task_id'], cand[t['task_id']], T.get(t['task_id'], {}))))
    rk = os.path.join(WK, 'ranked_unrestricted.jsonl.gz'); write_ranked(rk, rows)
    ans = os.path.join(WK, 'answers.jsonl.gz')
    pk = no_dropped(node('pack', '--ranked', rk, '--tasks', tf, '--primary', PRIMARY, '--out', ans), 'tune')
    # ruling 71: the grader's hand-off, one ranked file and one pack file per variant (heldout.py's layout)
    fname = lambda v: v
    split_by(rk, 'variant', lambda v: os.path.join(HO, 'ranked', '%s_unrestricted.jsonl.gz' % fname(v)))
    split_by(ans, 'arm', lambda v: os.path.join(HO, 'answers', '%s.jsonl.gz' % fname(v)))
"""),
("""    vlist = [dict(variant=fname(lab if s is None else '%s|s%d' % (lab, s)), label=lab, seed=s,""",
 """    vlist = [dict(variant=vname(lab, s), name=vname(lab, s), label=lab, seed=s, arm=lab.split('_')[0],
                  kind=('comparator' if s is None else lab.split('_')[1]),"""),
("""        lab, _, s = r['arm'].partition('|s')
        per[(lab, int(s) if s else None, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
""", """        lab, s = vmap[r['arm']]  # answer-level-6: label and seed from the variant list, not parsed from the name
        per[(lab, s, r['id'])] = {m: (r[m] if r[m] is not None else 0.0) for m in MEASURES}
"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:80]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched answer_level.py')
