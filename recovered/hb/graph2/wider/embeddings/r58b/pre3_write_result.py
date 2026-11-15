"""write_result.py: RESULT.md (under 150 lines) and result.json (aggregates only, no per-task row) of the embeddings
lane (addendum 8; ruling 62's wording), from the files the other scripts wrote. It computes nothing new: every number
is copied from an input, and every input is cited with its sha256.

Inputs (defaults are the real ones; the plumbing test passes its own):
  --tune     train/report/tune.json        report.py (verdicts, intervals, Holm rows, placebo, lag, item-17 counts)
  --item22   train/report/item22.json      item22.py (ruling 61)
  --answer   train/report/answer_level/answer_level.json   answer_level.py tune: the grader's hand-off for item 24 (tune
             split) and the lane's separately labelled file recall (ruling 71)
  --answer-graded  (optional) the grader's item-24 aggregates on the tuning hand-off (JSON); absent -> "not graded yet"
  --leak     train/leak_audit/leak_audit.json  leak_audit.py's own default output (ruling 60; review audit-result-3: the
             same path; the real run refuses when it is missing, says FAIL, or is a --test audit)
  --item27   train/heldout/item27.json     item27.py (the frozen held-out choice; the real run refuses when it is missing)
  --heldout  (optional) the grader's held-out aggregates (JSON, train/HANDOFF-FORMAT.md section 3); absent -> "not graded
             yet". Refused unless its freeze_sha256 equals sha256(item27.json) and HANDOFF.json's, its handoff_sha256 equals
             sha256(HANDOFF.json), its test flag matches, its arm is the frozen arm, and every variant (arm alone and fused
             per seed and seed mean, RRF, PPR, CO, DIR) has all four metrics on both scopes and the answer-level measure
  --handoff  train/heldout/HANDOFF.json
  --plan     train/stageB/plan.json
  --protocol the repository's protocol-addendum-8.md (the limits are copied from it word for word)
  --outdir   docs/program/evidence/harness-bottlenecks/graph2/embeddings/ (in the repository)
Wording (ruling 62): the Holm rows are "percentile intervals at Holm-adjusted levels"; the N3 weights are stated in
the paper's convention (weight / 3); the E5 router's single-area case is recorded as the reading of item 13; item
17's counts are given for the chosen configuration, as distinct entities and as task-candidate occurrences. Section
G's words are copied from tune.json (late 50 only); no word is applied to held-out (item 27). Ruling 71: item 24 on the
tuning split is the GRADER's figure (full references, files and definitions); the lane's file-only recall is shown
only under its own label, "file recall within 8,000 tokens, lane-computed", never as item 24.
Review audit-result-2/-7/-8 (this round): the held-out section is a table (every variant, metric and scope, per seed and
seed mean, plus the answer-level measure; no verdict word) with item 7's four stored figures as given; the Limits carry
rulings 35, 39, 44, 45, 46, 47, 67 and 68 word for word from protocol-addendum-8.md (the real run refuses when one is
not found) and item 31's wording ("cannot tell" is printed as "cannot tell (no evidence either way at this size)");
RESULT.md has one table with all four metrics on both scopes for every arm (alone / fused) and every comparator
(RANDOM included), the sensitivity rows of rulings 53 and 56 beside the verdicts (numbers only, no word), the
placebo rows and harness_check.ok; result.json carries tune.json's comparators, the seed means and every vs_RRF row.
Refusal: a test input (item27 record with test: true, or --test) is never written to the real deliverable folder.
usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--answer-graded P] [--leak P] [--item27 P] [--heldout P]
                              [--handoff P] [--plan P] [--protocol P] [--outdir DIR]
"""
import os, sys, json, hashlib, datetime, re
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('FIXFLOW_REPO') or 'C:/Users/User/Documents/projects/EMS_workshop1'
DELIVERABLE = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'embeddings')
EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
MAX_LINES = 149
PROTOCOL = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'protocol-addendum-8.md')
LIMIT_RULINGS = (35, 39, 44, 45, 46, 47, 67, 68)
METRICS = ('P@10', 'R@10', 'R@20', 'MRR'); SCOPES = ('pool', 'unrestricted'); COMPS = ('RRF', 'PPR', 'CO', 'DIR')
ITEM7 = ('Stored arms of item 7, shown as they are (8,000-token answer recall, 75 commits; nothing of theirs is rerun): '
         'typed graph 0.700, scripted search 0.625, changed-together floor 0.638, same-folder floor 0.549.')
CT = 'cannot tell (no evidence either way at this size)'


def word(w):
    """Item 31: 'cannot tell' is reported as 'no evidence either way at this size'."""
    return w.replace('cannot tell', CT, 1) if isinstance(w, str) and w.startswith('cannot tell') else w


def ruling_text(path, n):
    """The paragraph of protocol-addendum-8.md that starts '<n>. ', joined into one line (None when absent)."""
    if not path or not os.path.exists(path): return None
    out = None
    for l in open(path, encoding='utf-8'):
        if out is None:
            if re.match(r'^%d\. ' % n, l): out = [l.strip()]
        elif not l.strip() or re.match(r'^\d+\. ', l) or l.startswith('#'):
            break
        else:
            out.append(l.strip())
    return ' '.join(out) if out else None


def ho_variants(arm):
    return ['%s_%s_%s' % (arm, k, s) for k in ('alone', 'fused') for s in ('s1', 's2', 's3', 'mean')] + list(COMPS)


def check_heldout(HO, R27, a, is_test):
    """audit-result-2: the grader's held-out aggregates must belong to the frozen choice and be complete."""
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


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def f3(x): return 'n/a' if x is None else '%+.3f' % x


def iv(d): return '%s [%s, %s]' % (f3(d['diff']), f3(d['lo']), f3(d['hi']))


def load(p):
    return json.load(open(p)) if p and os.path.exists(p) else None


def build(a):
    T = load(a['tune']); I22 = load(a['item22']); AL = load(a['answer']); LK = load(a['leak']); R27 = load(a['item27'])
    HO = load(a.get('heldout')); plan = load(a['plan']); AG = load(a.get('answer_graded'))
    if T is None: raise SystemExit('write_result: the tune report %s is missing' % a['tune'])
    L = []; J = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', inputs={}, test=bool(a['test']))
    for k in ('tune', 'item22', 'answer', 'answer_graded', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'protocol'):
        p = a.get(k)
        if p and os.path.exists(p): J['inputs'][k] = dict(file=os.path.basename(p), sha256=sha(p))
    L += ['# Embedding arms on the code graph: result (addendum 8)', '',
          'Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)',
          'fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;',
          'item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals).' + (' TEST OUTPUT.' if a['test'] else ''), '']
    # ---- verdicts
    c = T['contrasts']['late50']; hol = T.get('holm', {}).get('late50', {})
    cps = T['contrasts'].get('late50_pilot_shared', {})
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
        J['verdicts'][arm] = dict(fused_pool_P10=fp['vs_RRF']['P@10'], fused_pool_word=fp['verdict_P10'], holm_fused_pool_P10=h,
                                  alone_pool_P10=ap['vs_RRF']['P@10'], alone_pool_word=ap['verdict_P10'],
                                  fused_unrestricted_P10=fu['vs_RRF']['P@10'], fused_unrestricted_word=fu['verdict_P10'])
    L += ['', 'Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02). The Holm column',
          'gives percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).', '']
    hc = T.get('harness_check', {})
    L += ['Placebo (harness check, ruling 54; harness_check.ok = %s): primary word "%s"; fixed-w pool P@10 minus RRF: %s.' % (
        hc.get('ok'), word(hc.get('placebo_primary_late50')), ', '.join('%s %s' % (k, iv(dict(zip(('diff', 'lo', 'hi'), v[:3])) if isinstance(v, list) else v))
                                                   for k, v in sorted(hc.get('placebo_fixed_w_late50_pool_P10_vs_RRF', {}).items()))), '']
    J['placebo'] = hc
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
    # ---- seeds (item 25)
    L += ['## Seeds alone (item 25): fused minus RRF, pool P@10, per seed', '']
    J['per_seed'] = {}
    for arm in EMB + ('PLACEBO',):
        r = c['pool'].get('%s_fused' % arm)
        if not r: continue
        ps = r['per_seed_P10_vs_RRF']; J['per_seed'][arm] = ps
        L.append('- %s: %s' % (arm, '; '.join('s%s %s' % (s, iv(ps[s])) for s in sorted(ps))))
    L.append('')
    # ---- answer level
    L += ['## Answer level (item 24; tuning split, late 50)', '']
    if AL:
        I24 = AL['item24']; LFR = AL['lane_file_recall']
        L.append('Item 24 is scored by the grader with its full references (files and definitions), as on held-out (ruling 71). The lane '
                 'handed over ranked lists and packs (shared packer, frozen typed primary options %s: %s form, %s granularity, pad %s; '
                 '8,000 tokens): %s, %d tasks, %d commits, %d ranked lists.' % (AL['options']['record'], AL['options']['form'],
                 AL['options']['granularity'], AL['options']['pad'], I24['handoff'], AL['tasks'], AL['commits'], AL['variants']))
        J['item24'] = dict(measure=I24['measure'], handoff=I24['handoff'], handoff_sha256=I24['handoff_sha256'])
        if AG and isinstance(AG.get('labels'), dict):
            L += ['', '| ranked list | item 24 (grader) | minus RRF [95 %] |', '|---|---|---|']
            J['item24']['labels'] = {}
            for lab in sorted(AG['labels']):
                d = AG['labels'][lab]; vs = (d.get('vs_RRF') or {}).get('primary')
                L.append('| %s | %.3f | %s |' % (lab, d['mean']['primary'], iv(vs) if vs else 'reference'))
                J['item24']['labels'][lab] = dict(primary=d['mean']['primary'], vs_RRF=vs)
        elif AG:
            L.append('Item 24 (grader): result attached, %s (no per-list table in it).' % a['answer_graded'])
            J['item24']['graded'] = AG.get('summary', AG)
        else:
            L.append('Item 24 (grader): not graded yet.')
        L += ['', '### %s' % LFR['label'][0].upper() + LFR['label'][1:], '',
              'Computed by the lane against git\'s files only (%s); a separate figure, not item 24.' % LFR['refs'],
              '', '| ranked list | file recall within 8,000 tokens, lane-computed | minus RRF [95 %] |', '|---|---|---|']
        J['lane_file_recall'] = dict(label=LFR['label'], labels={})
        for lab in sorted(LFR['labels']):
            d = LFR['labels'][lab]; vs = d.get('vs_RRF', {}).get('primary')
            L.append('| %s | %.3f | %s |' % (lab, d['mean']['primary'], iv(vs) if vs else 'reference'))
            J['lane_file_recall']['labels'][lab] = dict(file_recall=d['mean']['primary'], vs_RRF=vs, per_seed=d.get('per_seed_primary'))
    else:
        L.append('Not available (%s missing).' % a['answer'])
    L.append('')
    # ---- item 22
    L += ['## Item 22 (ruling 61): before an arm is called weak', '']
    if I22:
        sa = I22['stage_a']
        L.append('Stage-A held-out triples (%d queries at %s): PPR MRR %.3f, CO MRR %.3f (all entities).' % (
            sa['held_out']['queries'], sa['held_out']['sha'][:8], sa['PPR']['mrr_all_entities'], sa['CO']['mrr_all_entities']))
        L += ['', '| arm | config: stage-A MRR (loss ratio as run / to the selection epoch) | stage-B loss ratio median (units) | predict_target check |', '|---|---|---|---|']
        J['item22'] = dict(PPR=sa['PPR'], CO=sa['CO'], arms={})
        for arm in EMB:
            rows = sa['arms'].get(arm, [])
            cfgs = '; '.join('%s %.3f (%s / %s)' % (r['config_id'], r['mrr_all_entities'], f3(r['loss_ratio_as_run'])[1:], f3(r['loss_ratio_to_selection_epoch'])[1:]) for r in rows)
            sb = I22.get('stage_b_loss_ratio', {}).get(arm, {})
            sbs = '; '.join('%s %s (%d)' % (k, 'n/a' if v['median'] is None else '%.3f' % v['median'], v['units']) for k, v in sorted(sb.items()))
            ck = I22.get('check_predict_target', {}).get(arm)
            if ck and arm == 'E5':
                sp = ck['specialists']; cks = 'per specialist: ' + ', '.join('%s %s/%s identical' % (A, v.get('full_order_identical', '-'), v.get('queries', '-')) for A, v in sorted(sp.items()))
            elif ck:
                cks = '%s: %s/%s orders identical, max |diff| %.1e%s' % (ck['config_id'], ck.get('full_order_identical'), ck.get('queries'),
                                                                     ck.get('max_abs_score_diff', float('nan')), ' (fresh model)' if arm == 'E4' else '')
            else:
                cks = 'not run'
            L.append('| %s | %s | %s | %s |' % (arm, cfgs, sbs or 'n/a', cks))
            J['item22']['arms'][arm] = dict(stage_a=rows, stage_b_loss_ratio=sb, check={k: v for k, v in (ck or {}).items() if k != 'cfg'})
        L += ['', 'The loss ratio is a reported number, not a pass mark (ruling 36 stops at the validation peak).']
    else:
        L.append('Not available (%s missing).' % a['item22'])
    L.append('')
    # ---- item 17 counts
    L += ['## Item 17 counts for the chosen configuration (ruling 62)', '']
    cn = T.get('counts', {}); J['counts'] = {}
    for arm in EMB:
        if arm not in cn: continue
        x = cn[arm]['late50_block_choices']['pool']; o = x['occurrences']; dd = x['distinct']
        L.append('- %s (pool, late 50, block choices, seed 1; seeds equal: %s; recomputed: %s): %d tasks; %d with an unscored seed (%d candidate'
                 ' occurrences, %d distinct candidates); scored seeds: %d of %d candidate occurrences unscored (%d distinct), absent at C %d,'
                 ' not in a routed specialist %d; tasks on a checkpoint without co_changed %d; folded %d.' % (
                     arm, x['same_across_seeds'], x['recompute_matches_counts'], o.get('tasks', 0), o.get('tasks_with_unscored_seed', 0),
                     o.get('cands_of_unscored_seeds', 0), dd.get('cands_of_unscored_seeds', 0), o.get('scored_seed_cands_unscored', 0),
                     o.get('scored_seed_cands', 0), dd.get('absent_at_C', 0) + dd.get('not_in_routed_specialists', 0),
                     o.get('scored_seed_cands_unscored_absent_at_C', 0), o.get('scored_seed_cands_unscored_not_in_routed_specialists', 0),
                     o.get('tasks_on_checkpoint_without_co_changed', 0), o.get('cands_folded', 0) + o.get('seeds_folded', 0)))
        J['counts'][arm] = dict(late50_pool=dict(occurrences=o, distinct=dd), all65=cn[arm]['all65_final_choice']['config_id'])
    L.append('')
    # ---- held-out
    L += ['## Held-out (item 27; spent, descriptive only, no section-G word)', '']
    if R27:
        ch = R27['chosen']
        L.append('Frozen before any held-out unit (%s): %s %s, w %g, %d epochs, s %d, device %s; all-65 figure %.4f; tie group %s.' % (
            R27['frozen_at'][:19], ch['arm'], ch['config_id'], ch['w'], ch['epochs'], R27['s'], R27['device'], ch['figure_all65'],
            ', '.join(R27['tie_group_4dp'])))
        J['item27'] = dict(chosen={k: v for k, v in ch.items()}, s=R27['s'], device=R27['device'], test=R27.get('test'))
    else:
        L.append('No frozen record (%s).' % a['item27'])
    L.append(ITEM7)
    if HO:
        arm = R27['chosen']['arm']
        L += ['Grader aggregates (%s; %s commits, %s tasks; item 23 aggregation; descriptive only):' % (os.path.basename(a['heldout']), HO.get('commits'), HO.get('tasks')), '',
              '| variant | ' + ' | '.join('%s %s' % (sc[:5], m) for sc in SCOPES for m in METRICS) + ' | answer level (item 24) |', '|---' * 10 + '|']
        J['heldout'] = dict(freeze_sha256=HO['freeze_sha256'], handoff_sha256=HO['handoff_sha256'], commits=HO.get('commits'), tasks=HO.get('tasks'),
                            rank={}, answer_level={})
        for v in ho_variants(arm):
            L.append('| %s | %s | %.3f |' % (v, ' | '.join('%.3f' % HO['rank'][v][sc][m] for sc in SCOPES for m in METRICS), HO['answer_level'][v]))
            J['heldout']['rank'][v] = HO['rank'][v]; J['heldout']['answer_level'][v] = HO['answer_level'][v]
        L.append('Checked: the aggregates carry sha256(item27.json) and HANDOFF.json\'s hash; arm %s is the frozen arm.' % arm)
    else:
        L.append('Not graded yet: the held-out ranked lists and packs go to the grader (truth stays there).')
    L.append('')
    # ---- lag, leak audit
    lag = T.get('lag', {})
    L += ['## Lag and leak audit', '',
          '- Stride s = %s; lag (ruling 52) over late-50 tasks %s, over all tune tasks %s.' % (lag.get('stride'), lag.get('late50_tasks'), lag.get('all_tune_tasks'))]
    J['lag'] = lag
    if LK:
        L.append('- Leak audit (ruling 60): %s; checkpoints and tasks per split %s; failures %d; container mounts listed %d (table in AUDIT.md,'
                 ' with ruling 35\'s disclosure).' % ('PASS' if LK.get('ok') else 'FAIL', json.dumps({k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()}), len(LK.get('failures', [])), len(LK.get('mounts', []))))
        J['leak_audit'] = dict(ok=LK.get('ok'), checkpoints_tasks={k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()},
                               failures=len(LK.get('failures', [])), parts_rows=LK.get('c4_parts'))
    L.append('')
    # ---- readings
    n3 = []
    if plan:
        for cc in plan['configs'].get('E2', []):
            w = cc['cfg'].get('n3_weight')
            if w is not None: n3.append('%s %g / 3 = %.4g' % (cc['config_id'], w, w / 3))
    L += ['## Readings recorded', '',
          '- N3 weights in the paper\'s convention (weight / 3; the authors\' code read, kge.py docstring): ' + ('; '.join(n3) or 'n/a') + '.',
          '- E5 router (item 13): when every 1-hop neighbour of the seed is in the seed\'s own area, the seed is routed to that one',
          '  specialist only; this single-area case is the reading of item 13 (kge.route, report.py _route).',
          '- Item 17 counts are for the chosen configuration (per late-50 block; all 65 for the final choice), seed 1, as distinct',
          '  paths and as task-candidate occurrences; candidates of unscored seeds, tasks on checkpoints without co_changed and the',
          '  two ruling-55 cases among scored seeds are separate figures.', '']
    L += ['## Limits (section I, and the rulings reported as limits)', '',
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
    J['lines'] = len(L)
    return L, J


def main(argv):
    a = dict(tune=os.path.join(HERE, 'report', 'tune.json'), item22=os.path.join(HERE, 'report', 'item22.json'),
             answer=os.path.join(HERE, 'report', 'answer_level', 'answer_level.json'), leak=os.path.join(HERE, 'leak_audit', 'leak_audit.json'),
             item27=os.path.join(HERE, 'heldout', 'item27.json'), heldout=None, handoff=os.path.join(HERE, 'heldout', 'HANDOFF.json'),
             plan=os.path.join(HERE, 'stageB', 'plan.json'), protocol=PROTOCOL, outdir=DELIVERABLE, test=False)
    i = 0
    while i < len(argv):
        if argv[i] == '--test': a['test'] = True; i += 1; continue
        a[argv[i][2:].replace('-', '_')] = argv[i + 1]; i += 2
    r27 = load(a['item27'])
    is_test = a['test'] or bool(r27 and r27.get('test'))
    if is_test and os.path.normcase(os.path.abspath(a['outdir'])) == os.path.normcase(os.path.abspath(DELIVERABLE)):
        print('write_result: refusing: test input is never written to the deliverable folder %s' % DELIVERABLE, flush=True); raise SystemExit(8)
    a['test'] = is_test
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
    if len(L) > MAX_LINES:
        print('write_result: refusing: RESULT.md would have %d lines (limit %d)' % (len(L), MAX_LINES + 1), flush=True); raise SystemExit(9)
    os.makedirs(a['outdir'], exist_ok=True)
    for name, data in (('RESULT.md', '\n'.join(L) + '\n'), ('result.json', json.dumps(J, indent=1, sort_keys=True, default=str) + '\n')):
        p = os.path.join(a['outdir'], name)
        with open(p + '.part', 'w', encoding='utf-8', newline='\n') as f: f.write(data)
        os.replace(p + '.part', p)
    print('write_result: wrote %s (%d lines) and result.json to %s' % ('RESULT.md', len(L), a['outdir']), flush=True)
    return L, J


if __name__ == '__main__':
    main(sys.argv[1:])
