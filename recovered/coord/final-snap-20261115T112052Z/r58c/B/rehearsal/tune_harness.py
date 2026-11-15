"""Agent B, round 3 (the coordinator's order after ruling 95; CONFLICTS.md note 11, option (b)): a HARNESS, not
report.main. It makes the TEST tune.json of END-ORDER 2e in the real file's shape (train/report.py's `out` keys) from
r58c/A/out/fakesel (agent A's hash-scored fake arms, whichever it holds: 3 seeds, its variants, both scopes) and the comparators, on
the grader's fixed test set pick8 (answer_level.test_set_ids('pick8'): 8 late-50 tuning commits, 37 tasks).
It calls the evalcore functions report.main calls, in report.main's order and with its arguments (evaluate_table,
read_score_table, mean_over_seeds, summary, paired with B=10,000, per_commit, holm_intervals) and report.verdict for
the words; report.py is imported, never changed, and report.main is never called. What differs from report.main:
  - the commit sets: "late50" holds the pick8 commits (the key keeps the real name, so write_result reads it as it
    reads the real file) and "late50_pilot_shared" the pilot set's commits among them; the tasks are those 37;
  - the arms and variants are read from r58c/A/out/fakesel itself, all of them, with no fixed list (the coordinator,
    round 3, CONFLICTS.md note 21): every directory is an arm, every `<variant>_<scope>_s<seed>.tsv.gz` names a
    variant; each variant must hold every scope x seed, and any other file than those and choices.json is a refusal
    (`discover`). Verdict words, Holm and the primary follow report.main on the main variants an arm holds;
    harness_check is report.main's when PLACEBO is there (its fixed-w rows from the `fused_w*` variants it holds),
    ok None and a note when it is not;
  - counts {} and choices {} (no stage-B count file and no ruling-53 choice exists for a fake arm), lag from the fake
    plan's lag for the 37 tasks; stamp: the fake stage's plan_hash and tables_digest (fakesel's choices.json), the
    harness's own sha256 and report.py's (imported, not run), and choices_sha256;
  - `producer` names this harness, and test is true.
usage (in a ktest-b container, EMB_ROOT=/w): python /w/r58c/B/rehearsal/tune_harness.py
Writes /w/r58c/B/out/harness/tune.json (the host copies it to r58c/handoff-test/report/tune.json) and prints
RESULT PASS|FAIL tune-harness. Reads nothing under train/stageB, train/selectB, train/heldout or train/report.
"""
import os, re, sys, json, hashlib, collections
sys.path.insert(0, '/w/train'); sys.path.insert(0, '/w/eval')
import evalcore as ec
import report  # its constants and verdict(); main() is not called
import answer_level as al
from atomic import put_json

SEL = '/w/r58c/A/out/fakesel'; PLAN = '/w/r58c/A/out/fakestage/stageB/plan.json'
OUT = '/w/r58c/B/out/harness/tune.json'
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
SEEDS, SCOPES, EMB, CD, B, MAIN, VS = report.SEEDS, report.SCOPES, report.EMB, report.CD, report.B, report.MAIN, report.VERDICT_SET
COMPS = ('RRF', 'PPR', 'CO', 'DIR', 'RANDOM')
TABLE = re.compile(r'^(.+)_(%s)_s(\d+)\.tsv\.gz$' % '|'.join(SCOPES))


def discover(sel):
    """The arms and variants sel holds, read from its files (no fixed list): {arm: [variant, ...]} sorted.
    Raises ValueError on an empty sel, an arm without variants or choices.json, a file that is neither
    choices.json nor a score table, a seed outside SEEDS, or a variant missing a scope x seed table."""
    arms = sorted(a for a in os.listdir(sel) if os.path.isdir(os.path.join(sel, a)))
    if not arms: raise ValueError('discover: no arm directory in %s' % sel)
    var = {}
    for a in arms:
        have = collections.defaultdict(set)
        for f in sorted(os.listdir(os.path.join(sel, a))):
            if f == 'choices.json': continue
            m = TABLE.match(f)
            if not m: raise ValueError('discover: %s/%s is neither choices.json nor a score table' % (a, f))
            if int(m.group(3)) not in SEEDS: raise ValueError('discover: %s/%s: seed outside %s' % (a, f, SEEDS))
            have[m.group(1)].add((m.group(2), int(m.group(3))))
        if not os.path.isfile(os.path.join(sel, a, 'choices.json')): raise ValueError('discover: %s has no choices.json' % a)
        if not have: raise ValueError('discover: %s holds no score table' % a)
        full = {(sc, s) for sc in SCOPES for s in SEEDS}
        for v, got in sorted(have.items()):
            if got != full: raise ValueError('discover: %s %s lacks %s' % (a, v, sorted(full - got)))
        var[a] = sorted(have)
    return var


def main():
    tasks = ec.load_tasks()
    ids = set(al.test_set_ids('pick8'))
    byid = {t['task_id']: t for t in tasks}
    pick = {byid[i]['commit'] for i in ids}
    late = ec.commit_set(tasks, 'late50')
    assert pick <= late and len(ids) == 37 and len(pick) == 8, (len(ids), len(pick))
    sets = {'late50': pick, 'late50_pilot_shared': ec.commit_set(tasks, 'late50_pilot') & pick}
    sub = [t for t in tasks if t['task_id'] in ids]
    var = discover(SEL); arms = sorted(var)
    plan = json.load(open(PLAN)); cjs = {a: json.load(open(os.path.join(SEL, a, 'choices.json'))) for a in arms}
    for a, j in cjs.items():
        assert j.get('test') is True and j['stamp']['plan_hash'] == plan['plan_hash'], (a, j.get('stamp'))
    digests = {j['stamp']['tables_digest'] for j in cjs.values()}
    assert len(digests) == 1, ('the arms name different fake tables', digests)
    cj = cjs[arms[0]]
    out = dict(B=B, test=True, plan_hash=plan['plan_hash'], stamp=None,
               sets={k: len(v) for k, v in sets.items()}, tasks=len(sub), arms={}, comparators={}, contrasts={},
               holm={}, verdicts={}, harness_check={}, lag={}, counts={}, choices={},
               notes=dict(late50_pilot_shared='ruling 56: pilot set on the commits shared with late50; sensitivity row, no verdict word',
                          holm='percentile intervals at Holm-adjusted levels',
                          harness='TEST tune.json made by r58c/B/rehearsal/tune_harness.py (a harness calling the evalcore functions '
                                  'report.main calls), not by report.main: "late50" holds the grader\'s pick8 commits (8 commits, '
                                  '37 tasks); the arms %s are agent A\'s hash-scored fake arms (r58c/A/out/fakesel), not '
                                  'models; arms and variants as fakesel holds them' % ', '.join(arms)),
               producer=dict(harness='r58c/B/rehearsal/tune_harness.py', harness_sha256=sha(os.path.abspath(__file__)),
                             report_main=False, report_sha256=sha(report.__file__), evalcore_sha256=sha(ec.__file__),
                             fakesel=SEL[3:], test_set='pick8'))
    pt = {}
    for sc in SCOPES:
        for n in COMPS:
            pt[(n, sc)] = ec.evaluate_table(ec.read_score_table(os.path.join(CD, '%s_%s.tsv.gz' % (n, sc))), sc, sub)
        for a in arms:
            for v in var[a]:
                per_seed = [ec.evaluate_table(ec.read_score_table(os.path.join(SEL, a, '%s_%s_s%d.tsv.gz' % (v, sc, s))), sc, sub) for s in SEEDS]
                for s, p in zip(SEEDS, per_seed): pt[('%s_%s' % (a, v), sc, s)] = p
                pt[('%s_%s' % (a, v), sc)] = ec.mean_over_seeds(per_seed)
    for setname, commits in sets.items():
        for sc in SCOPES:
            for n in COMPS:
                out['comparators'].setdefault(setname, {}).setdefault(sc, {})[n] = ec.summary(pt[(n, sc)], sub, commits)
            for a in arms:
                for v in var[a]:
                    key = '%s_%s' % (a, v)
                    d = out['arms'].setdefault(setname, {}).setdefault(sc, {}).setdefault(key, {})
                    d['seed_mean'] = ec.summary(pt[(key, sc)], sub, commits)
                    d['per_seed'] = {s: ec.summary(pt[(key, sc, s)], sub, commits) for s in SEEDS}
                    c = ec.paired(pt[(key, sc)], pt[('RRF', sc)], sub, commits, B=B)
                    cs = {s: ec.paired(pt[(key, sc, s)], pt[('RRF', sc)], sub, commits, B=B)['P@10'] for s in SEEDS}
                    row = dict(vs_RRF={m: dict(zip(('diff', 'lo', 'hi', 'p'), c[m])) for m in ec.METRICS},
                               per_seed_P10_vs_RRF={s: dict(zip(('diff', 'lo', 'hi', 'p'), cs[s])) for s in SEEDS})
                    if setname == VS and v in MAIN: row['verdict_P10'] = report.verdict(*c['P@10'][:3])
                    else: row['sensitivity'] = True
                    out['contrasts'].setdefault(setname, {}).setdefault(sc, {})[key] = row
            emb = [a for a in arms if a in EMB]
            for v in [m for m in MAIN if emb and all(m in var[a] for a in emb)]:
                for m_i, m in enumerate(ec.METRICS):
                    diffs = []
                    for a in emb:
                        _, x = ec.per_commit(pt[('%s_%s' % (a, v), sc)], sub, commits); _, y = ec.per_commit(pt[('RRF', sc)], sub, commits)
                        diffs.append((x - y)[:, m_i])
                    res = ec.holm_intervals(diffs, B=B)
                    out['holm'].setdefault(setname, {}).setdefault(sc, {}).setdefault(v, {})[m] = {
                        a: dict(zip(('diff', 'lo', 'hi', 'p_raw', 'p_holm', 'level'), r)) for a, r in zip(emb, res)}
    for a in arms:
        V = {'%s_%s' % (v, sc): out['contrasts'][VS][sc]['%s_%s' % (a, v)]['verdict_P10'] for v in MAIN if v in var[a] for sc in SCOPES}
        V['primary'] = V.get('fused_pool'); out['verdicts'].setdefault(VS, {})[a] = V
    if 'PLACEBO' in arms:
        pp = out['verdicts'][VS]['PLACEBO']['primary']
        fw = [v for v in var['PLACEBO'] if v.startswith('fused_w')]
        out['harness_check'] = dict(placebo_primary_late50=pp, ok=None if pp is None else pp != 'adds',
                                    placebo_fixed_w_late50_pool_P10_vs_RRF={
                                        v[len('fused_'):]: out['contrasts'][VS]['pool']['PLACEBO_' + v]['vs_RRF']['P@10'] for v in fw})
        if not fw: out['harness_check']['note'] = 'PLACEBO in r58c/A/out/fakesel holds no fused_w* table: no fixed-w rows in this TEST file'
    else:
        out['harness_check'] = dict(placebo_primary_late50=None, ok=None, placebo_fixed_w_late50_pool_P10_vs_RRF={},
                                    note='no PLACEBO in r58c/A/out/fakesel: no harness check in this TEST file')
    out['lag'] = dict(stride=plan.get('s'), late50_tasks=dict(sorted(collections.Counter(plan['lag'][i] for i in ids if i in plan['lag']).items())),
                      all_tune_tasks=dict(sorted(collections.Counter(plan['lag'].values()).items())))
    out['stamp'] = dict(plan_hash=plan['plan_hash'], plan_sha256=sha(PLAN), tables_digest=cj['stamp']['tables_digest'],
                        report_sha256=None, harness_sha256=out['producer']['harness_sha256'], selectB_sha256=None,
                        choices_sha256={a: sha(os.path.join(SEL, a, 'choices.json')) for a in arms})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    put_json(OUT, out)
    print('wrote', OUT, 'sha256', sha(OUT), 'tasks', out['tasks'], 'sets', out['sets'], 'verdicts', json.dumps(out['verdicts']), flush=True)
    print('arms', json.dumps(var), 'harness_check', json.dumps(out['harness_check']), flush=True)
    for sc in SCOPES:
        for key in sorted(out['arms'][VS][sc]):
            print(key, 'seed_mean', sc, json.dumps(out['arms'][VS][sc][key]['seed_mean']), flush=True)
    return out


if __name__ == '__main__':
    try:
        main(); print('RESULT PASS tune-harness', flush=True)
    except BaseException as e:
        import traceback; traceback.print_exc(); print('RESULT FAIL tune-harness %r' % e, flush=True); sys.exit(1)
