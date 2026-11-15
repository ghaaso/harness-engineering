import sys
p = sys.argv[1] + '/train/r58/tests/test_write_result.py'
s = open(p, encoding='utf-8').read()
reps = [
("""rc = exits(wr.main, args)
check('wr_refuses_deliverable_for_test_input', rc == 8 and not os.path.exists(os.path.join(wr.DELIVERABLE, 'RESULT.md')) or rc == 8, 'exit', rc)
""", """dl = os.path.join(wr.DELIVERABLE, 'RESULT.md'); before = os.path.getmtime(dl) if os.path.exists(dl) else None
rc = exits(wr.main, args)
after = os.path.getmtime(dl) if os.path.exists(dl) else None
check('wr_refuses_deliverable_for_test_input', rc == 8 and after == before, 'exit', rc, '; deliverable RESULT.md untouched (mtime %s -> %s)' % (before, after))
"""),
("""print('RESULT.md head:', flush=True)
""", """# ---- this round: audit-result-2, -3, -7, -8, -10 (fail before on r58b/pre2/write_result.py, the previous round's bytes)
import hashlib, shutil
show_hashes('r58b/pre2/write_result.py')
PRE2 = load_module('write_result_pre2', os.path.join(ROOT, 'r58b', 'pre2', 'write_result.py'))
W = fresh(os.path.join(OUTR, 'write_result_r3'))
REC = os.path.join(FB, 'heldout', 'item27.json'); rec = json.load(open(REC)); arm = rec['chosen']['arm']
HOF = os.path.join(W, 'HANDOFF.json'); json.dump(dict(freeze_sha256=sha(REC), test=True, split='heldout'), open(HOF, 'w'))
vs = wr.ho_variants(arm)
ho = dict(split='heldout', arm=arm, freeze_sha256=sha(REC), handoff_sha256=sha(HOF), test=True, commits=75, tasks=418,
          rank={v: {sc: {m: round(0.1 + 0.01 * i + 0.001 * j, 4) for j, m in enumerate(wr.METRICS)} for sc in wr.SCOPES} for i, v in enumerate(vs)},
          answer_level={v: round(0.5 + 0.01 * i, 4) for i, v in enumerate(vs)})
HOP = os.path.join(W, 'heldout_aggregates.json'); json.dump(ho, open(HOP, 'w'))
labs16 = ['RRF', 'PPR', 'CO', 'DIR'] + ['%s_%s' % (x, k) for x in ('E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO') for k in ('alone', 'fused')]
AG16 = os.path.join(W, 'graded16.json')
json.dump(dict(labels={l: dict(mean=dict(primary=0.5), vs_RRF=None if l == 'RRF' else dict(primary=dict(diff=0.01, lo=-0.02, hi=0.04, p=0.5))) for l in labs16}), open(AG16, 'w'))
O4 = fresh(os.path.join(W, 'full'))
L4, J4 = wr.main(args + ['--heldout', HOP, '--handoff', HOF, '--answer-graded', AG16, '--outdir', O4])
md4 = open(os.path.join(O4, 'RESULT.md')).read()
hs = md4[md4.index('## Held-out (item 27'):]; hs = hs[:hs.index('\\n## ', 5)]
check('ar2_heldout_table', all(('| %s | ' % v) in hs for v in vs) and '| answer level (item 24) |' in hs and 'pool P@10' in hs and 'unres MRR' in hs
      and wr.ITEM7 in hs and '0.700' in hs and '0.549' in hs and '75 commits' in hs and 'arm %s is the frozen arm' % arm in hs,
      len([v for v in vs if ('| %s | ' % v) in hs]), 'of', len(vs), 'variant rows (per seed, seed mean, comparators), item 7 line')
check('ar2_no_verdict_word_on_heldout', not any(w in hs for w in ('adds', 'matches', 'cannot tell')), 'no section-G word in the held-out section')
check('ar8_worst_case_under_150_lines', len(md4.splitlines()) < 150, 'lines with the full held-out table and a 16-row graded item-24 table:', len(md4.splitlines()))
bad1 = dict(ho, freeze_sha256='0' * 64); P1 = os.path.join(W, 'bad_freeze.json'); json.dump(bad1, open(P1, 'w'))
bad2 = dict(ho, rank={k: v for k, v in ho['rank'].items() if k != vs[3]}); P2 = os.path.join(W, 'bad_missing.json'); json.dump(bad2, open(P2, 'w'))
bad3 = dict(ho, arm='E9'); P3 = os.path.join(W, 'bad_arm.json'); json.dump(bad3, open(P3, 'w'))
rcs = [exits(wr.main, args + ['--heldout', P, '--handoff', HOF, '--outdir', os.path.join(W, 'x')]) for P in (P1, P2, P3)]
check('ar2_refuses_foreign_or_incomplete_aggregates', rcs == [12, 12, 12], 'exits (other freeze, a missing seed-mean row, another arm)', rcs)
O5 = fresh(os.path.join(W, 'pre2')); PRE2.main(args + ['--heldout', HOP, '--outdir', O5])
md5 = open(os.path.join(O5, 'RESULT.md')).read()
hl = [l for l in md5.splitlines() if l.startswith('Grader aggregates (copied as given)')]
check('ar2_pre_truncated_json', hl and len(hl[0]) <= len('Grader aggregates (copied as given): ') + 400 and '0.700' not in md5 and '| %s | ' % vs[0] not in md5,
      'fail before: the previous writer printed', len(hl[0]) if hl else None, 'characters of JSON, no item-7 figures, no table; and accepted the aggregates unchecked')
# audit-result-7: limits word for word, item 31's wording
lim = md4[md4.index('## Limits'):]
check('ar7_limits_verbatim', all(('- Ruling %d. ' % n) in lim for n in wr.LIMIT_RULINGS) and all(J4['limits'][str(n)] for n in wr.LIMIT_RULINGS)
      and 'no evidence either way at this size' in lim and 'TEXT NOT FOUND' not in lim and 'protocol' in J4['inputs'],
      'rulings', [n for n in wr.LIMIT_RULINGS if ('- Ruling %d. ' % n) in lim])
vt = md4[md4.index('## Verdicts'):md4.index('## Seeds alone')]
check('ar7_cannot_tell_wording', ('cannot tell' not in vt) or ('cannot tell (no evidence either way at this size)' in vt and vt.count('cannot tell') == vt.count(wr.CT)),
      'every "cannot tell" in the verdicts carries item 31\\'s wording')
pre_lim = open(os.path.join(O3, 'RESULT.md')).read()
check('ar7_pre_had_no_ruling_limits', '- Ruling 67. ' not in pre_lim and '- Ruling 39. ' not in pre_lim, 'fail before: no ruling text in the previous Limits')
# audit-result-8: all metrics on both scopes, comparators, sensitivity, placebo
al = md4[md4.index('## All metrics, late 50'):]; al = al[:al.index('\\n## ', 5)]
check('ar8_all_metrics_table', all(('| %s | ' % n) in al for n in ('E1', 'E5', 'PLACEBO', 'RRF', 'PPR', 'CO', 'DIR', 'RANDOM')) and al.count(' / ') >= 6 * 8
      and 'unres R@20' in al, 'arms (alone / fused) and comparators, 8 metric-scope columns')
check('ar8_sensitivity_and_placebo', 'builder reading (53), sensitivity, no word' in md4 and 'pilot-shared commits (56), sensitivity, no word' in md4
      and 'harness_check.ok = ' in md4 and set(J4['tune_full']['vs_RRF']) == {'late50', 'late50_pilot_shared'}
      and 'RANDOM' in json.dumps(J4['tune_full']['comparators']) and 'E2_fused_builder' in J4['tune_full']['vs_RRF']['late50']['pool'],
      'sensitivity columns, placebo with harness_check.ok, result.json tune_full')
check('ar8_pre_p10_only', 'R@20' not in open(os.path.join(O3, 'RESULT.md')).read() and 'tune_full' not in json.load(open(os.path.join(O3, 'result.json'))),
      'fail before: the previous RESULT.md and result.json carried P@10 only')
# audit-result-3 / -10: the real run needs the real audit (same default path as leak_audit.py) and the real record
import leak_audit as la
src_wr = open(wr.__file__).read(); src_la = open(la.__file__).read(); key = "os.path.join(HERE, 'leak_audit', 'leak_audit.json')"
check('ar3_same_default_audit_path', key in src_wr and key in src_la and "os.path.join(HERE, 'report', 'leak_audit.json')" in open(PRE2.__file__).read(),
      'write_result and leak_audit both default to train/leak_audit/leak_audit.json (fail before: write_result read train/report/leak_audit.json)')
R0 = os.path.join(W, 'real_rec', 'item27.json'); os.makedirs(os.path.dirname(R0)); json.dump(dict(rec, test=False), open(R0, 'w'))
ar = list(args); ar[ar.index('--item27') + 1] = R0
rc_real = exits(wr.main, ar + ['--outdir', os.path.join(W, 'real1')])
rc_nolk = exits(wr.main, [x for x in ar] + ['--leak', os.path.join(W, 'none.json'), '--outdir', os.path.join(W, 'real2')])
rc_norec = exits(wr.main, ar[:ar.index('--item27')] + ar[ar.index('--item27') + 2:] + ['--item27', os.path.join(W, 'none27.json'), '--outdir', os.path.join(W, 'real3')])
rc_pre = exits(PRE2.main, ar + ['--leak', os.path.join(W, 'none.json'), '--outdir', os.path.join(W, 'real_pre')])
check('ar3_real_run_refuses_test_or_missing_audit', rc_real == 10 and rc_nolk == 10 and rc_norec == 10 and not os.path.exists(os.path.join(W, 'real1', 'RESULT.md')),
      'exits: test audit', rc_real, '; missing audit', rc_nolk, '; missing item27.json', rc_norec)
check('ar3_pre_wrote_without_audit', rc_pre == 0 and 'Leak audit' not in open(os.path.join(W, 'real_pre', 'RESULT.md')).read(),
      'fail before: the previous writer wrote RESULT.md with no audit and no word about it (exit %s)' % rc_pre)
print('RESULT.md head:', flush=True)
"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:80]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched test_write_result.py')
