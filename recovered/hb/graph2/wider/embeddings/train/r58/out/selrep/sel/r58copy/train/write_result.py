"""write_result.py: RESULT.md (under 150 lines) and result.json (aggregates only, no per-task row) of the embeddings
lane (addendum 8; ruling 62's wording), from the files the other scripts wrote. It computes nothing new: every number
is copied from an input, and every input is cited with its sha256.

Inputs (defaults are the real ones; the plumbing test passes its own):
  --tune     train/report/tune.json        report.py (verdicts, intervals, Holm rows, placebo, lag, item-17 counts)
  --item22   train/report/item22.json      item22.py (ruling 61)
  --answer   train/report/answer_level/answer_level.json   answer_level.py tune (item 24, tune split)
  --leak     train/report/leak_audit.json  leak_audit.py (ruling 60; its markdown goes into AUDIT.md, not here)
  --item27   train/heldout/item27.json     item27.py (the frozen held-out choice)
  --heldout  (optional) the grader's held-out aggregates (JSON); absent -> "not graded yet"
  --plan     train/stageB/plan.json
  --outdir   docs/program/evidence/harness-bottlenecks/graph2/embeddings/ (in the repository)
Wording (ruling 62): the Holm rows are "percentile intervals at Holm-adjusted levels"; the N3 weights are stated in
the paper's convention (weight / 3); the E5 router's single-area case is recorded as the reading of item 13; item
17's counts are given for the chosen configuration, as distinct entities and as task-candidate occurrences. Section
G's words are copied from tune.json (late 50 only); no word is applied to held-out (item 27).
Refusal: a test input (item27 record with test: true, or --test) is never written to the real deliverable folder.
usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--leak P] [--item27 P] [--heldout P]
                              [--plan P] [--outdir DIR]
"""
import os, sys, json, hashlib, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('FIXFLOW_REPO') or 'C:/Users/User/Documents/projects/EMS_workshop1'
DELIVERABLE = os.path.join(REPO, 'docs', 'program', 'evidence', 'harness-bottlenecks', 'graph2', 'embeddings')
EMB = ('E1', 'E2', 'E3', 'E4', 'E5')
MAX_LINES = 149


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def f3(x): return 'n/a' if x is None else '%+.3f' % x


def iv(d): return '%s [%s, %s]' % (f3(d['diff']), f3(d['lo']), f3(d['hi']))


def load(p):
    return json.load(open(p)) if p and os.path.exists(p) else None


def build(a):
    T = load(a['tune']); I22 = load(a['item22']); AL = load(a['answer']); LK = load(a['leak']); R27 = load(a['item27'])
    HO = load(a.get('heldout')); plan = load(a['plan'])
    if T is None: raise SystemExit('write_result: the tune report %s is missing' % a['tune'])
    L = []; J = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', inputs={}, test=bool(a['test']))
    for k in ('tune', 'item22', 'answer', 'leak', 'item27', 'heldout', 'plan'):
        p = a.get(k)
        if p and os.path.exists(p): J['inputs'][k] = dict(file=os.path.basename(p), sha256=sha(p))
    L += ['# Embedding arms on the code graph: result (addendum 8)', '',
          'Five knowledge-graph-embedding arms (E1 RotatE, E2 ComplEx-N3, E3 TransE, E4 CompGCN, E5 routed RotatE specialists)',
          'fused with PPR and CO by weighted RRF, against RRF of PPR and CO, on the late 50 tuning commits (pool P@10;',
          'item 23 aggregation, paired bootstrap by commit, 10,000 resamples, 95 % percentile intervals).' + (' TEST OUTPUT.' if a['test'] else ''), '']
    # ---- verdicts
    c = T['contrasts']['late50']; hol = T.get('holm', {}).get('late50', {})
    L += ['## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)', '',
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
        J['verdicts'][arm] = dict(fused_pool_P10=fp['vs_RRF']['P@10'], fused_pool_word=fp['verdict_P10'], holm_fused_pool_P10=h,
                                  alone_pool_P10=ap['vs_RRF']['P@10'], alone_pool_word=ap['verdict_P10'],
                                  fused_unrestricted_P10=fu['vs_RRF']['P@10'], fused_unrestricted_word=fu['verdict_P10'])
    L += ['', 'Words from the unadjusted interval ("adds": above zero and >= +0.02; "matches": inside +-0.02). The Holm column',
          'gives percentile intervals at Holm-adjusted levels over the five arms, beside the unadjusted ones (item 26).', '']
    hc = T.get('harness_check', {})
    L += ['Placebo (harness check, ruling 54): primary word "%s"; fixed-w pool P@10 minus RRF: %s.' % (
        hc.get('placebo_primary_late50'), ', '.join('%s %s' % (k, iv(dict(zip(('diff', 'lo', 'hi'), v[:3])) if isinstance(v, list) else v))
                                                   for k, v in sorted(hc.get('placebo_fixed_w_late50_pool_P10_vs_RRF', {}).items()))), '']
    J['placebo'] = hc
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
        L.append('Shared packer and scorer, frozen typed primary options (%s: %s form, %s granularity, pad %s), 8,000 tokens; references from git'
                 % (AL['options']['record'], AL['options']['form'], AL['options']['granularity'], AL['options']['pad']))
        L.append('(file half only: %s). %d tasks, %d commits.' % (AL['refs'], AL['tasks'], AL['commits']))
        L += ['', '| ranked list | recall within 8,000 tokens | minus RRF [95 %] |', '|---|---|---|']
        J['answer_level'] = {}
        for lab in sorted(AL['labels']):
            d = AL['labels'][lab]; vs = d.get('vs_RRF', {}).get('primary')
            L.append('| %s | %.3f | %s |' % (lab, d['mean']['primary'], iv(vs) if vs else 'reference'))
            J['answer_level'][lab] = dict(primary=d['mean']['primary'], vs_RRF=vs, per_seed_primary=d.get('per_seed_primary'))
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
    if HO:
        L.append('Grader aggregates (copied as given): ' + json.dumps({k: v for k, v in HO.items() if not isinstance(v, (list, dict)) or k == 'summary'})[:400])
        J['heldout'] = HO.get('summary', HO)
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
    L += ['## Limits (section I)', '',
          '- One repository (about 233 commits, 5,400 nodes, 19,000 edges): a null says nothing about larger or denser graphs.',
          '- Not tested: temporal or inductive KGE models, text or code embeddings, rule learners, a longer history.',
          '- Truth is what a commit changed, at file level; no agent was run. With 50 commits only differences of several',
          '  hundredths are detectable: "cannot tell" is not "no effect".', '']
    L += ['## Sources', ''] + ['- %s `%s` sha256 %s' % (k, v['file'], v['sha256'][:16]) for k, v in sorted(J['inputs'].items())]
    J['lines'] = len(L)
    return L, J


def main(argv):
    a = dict(tune=os.path.join(HERE, 'report', 'tune.json'), item22=os.path.join(HERE, 'report', 'item22.json'),
             answer=os.path.join(HERE, 'report', 'answer_level', 'answer_level.json'), leak=os.path.join(HERE, 'report', 'leak_audit.json'),
             item27=os.path.join(HERE, 'heldout', 'item27.json'), heldout=None, plan=os.path.join(HERE, 'stageB', 'plan.json'),
             outdir=DELIVERABLE, test=False)
    i = 0
    while i < len(argv):
        if argv[i] == '--test': a['test'] = True; i += 1; continue
        a[argv[i][2:]] = argv[i + 1]; i += 2
    r27 = load(a['item27'])
    is_test = a['test'] or bool(r27 and r27.get('test'))
    if is_test and os.path.normcase(os.path.abspath(a['outdir'])) == os.path.normcase(os.path.abspath(DELIVERABLE)):
        print('write_result: refusing: test input is never written to the deliverable folder %s' % DELIVERABLE, flush=True); raise SystemExit(8)
    a['test'] = is_test
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
