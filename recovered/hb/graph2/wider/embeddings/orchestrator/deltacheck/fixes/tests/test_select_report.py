"""Plumbing test, rulings 53, 54, 56 and 58 (selectB.py, report.py), tuning data only (PLACEBO + comparators; no
stage-B score exists). Outputs under OUT (default /w/fixes/tests/out/<CODE>/sel).
  r53  choose() on fixed per-commit values: two w of the same configuration inside the band, the larger w with the
       higher mean -> the larger w must be chosen (simplicity = model size only, then mean, then config id, then w);
       a same-size tie in mean -> the lower config id; the builder's reading is kept as a sensitivity row.
  r54  selectB --test on the tune tasks: PLACEBO faces 3 pseudo-configurations x 3 w (9 candidates per block),
       with fixed-w rows w = 0.25, 0.5, 1.
  r56  no pilot-only commit is assembled; report --test has the pilot row on the commits shared with late50 and
       prints no verdict word for it (nor for the sensitivity rows).
  r58  `python selectB.py E1` and `python report.py` (real output, not --test) refuse with exit 3 citing ruling 58
       while RUNLOG.md lacks the four sha256 lines (they do now).
No embedding metric is computed. Prints RESULT PASS|FAIL."""
import os, sys, json, shutil, subprocess
ROOT = os.environ.get('EMB_ROOT', '/w')
TRAIN = os.path.join(ROOT, 'train')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'eval')]
import numpy as np
import evalcore as ec
import selectB, report

CODE = os.environ.get('CODE', 'post')
OUT = os.path.join(os.environ.get('OUT', os.path.join(ROOT, 'fixes', 'tests', 'out', CODE)), 'sel')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
ok = {}
# r53 on fixed values (best: c02 dim 200, mean 0.53, SE 0.02 -> band >= 0.51)
rows = [(('c02', 0.5), {'embedding_dim': 200}, 0.5, [0.51, 0.55]),
        (('c01', 0.25), {'embedding_dim': 100}, 0.25, [0.515, 0.515]),
        (('c01', 1.0), {'embedding_dim': 100}, 1.0, [0.52, 0.52]),
        (('c03', 0.5), {'embedding_dim': 100}, 0.5, [0.52, 0.52]),
        (('c04', 0.25), {'embedding_dim': 100}, 0.25, [0.50, 0.50])]
pick = selectB.choose(rows)[0]
ok['r53_choice'] = (pick['key'][0], pick['w']) == ('c01', 1.0)
ok['r53_builder_row'] = hasattr(selectB, 'choose_builder') and (selectB.choose_builder(rows)[0]['key'] == ('c01', 0.25))
print('r53 chosen', pick['key'], '(want c01, 1.0: smallest model, then higher mean, then lower id) ok', ok['r53_choice'],
      '| builder sensitivity row', ok['r53_builder_row'], flush=True)
# r54 / r56 selectB --test (PLACEBO) into OUT
selectB.run(['PLACEBO'], os.path.join(OUT, 'selectB-test'), test=True)
cj = json.load(open(os.path.join(OUT, 'selectB-test', 'PLACEBO', 'choices.json')))
ncand = [len(b['candidates']) for b in cj['blocks']]
ok['r54_nine_way'] = all(n == 9 for n in ncand) and len({c['config_id'] for c in cj['blocks'][0]['candidates']}) == 3
ok['r54_fixed_w'] = sorted(cj.get('fixed_w', {})) == ['0.25', '0.5', '1'] and all(
    os.path.exists(os.path.join(OUT, 'selectB-test', 'PLACEBO', 'fused_w%s_pool_s1.tsv.gz' % w)) for w in ('0.25', '0.5', '1'))
print('r54 candidates per block', ncand, 'pseudo-configs', sorted({c['config_id'] for c in cj['blocks'][0]['candidates']}),
      'fixed-w rows', sorted(cj.get('fixed_w', {})), 'ok', ok['r54_nine_way'], ok['r54_fixed_w'], flush=True)
tasks = ec.load_tasks()
late = ec.commit_set(tasks, 'late50'); pilot = ec.commit_set(tasks, 'late50_pilot')
assembled = set(ec.read_score_table(os.path.join(OUT, 'selectB-test', 'PLACEBO', 'fused_pool_s1.tsv.gz')))
commit_of = {t['task_id']: t['commit'] for t in tasks}
extra = sorted({commit_of[t] for t in assembled} - late)
ok['r56_no_pilot_only'] = not extra
print('r56 pilot-only commits', len(pilot - late), 'assembled outside late50', len(extra), 'ok', ok['r56_no_pilot_only'], flush=True)
# report --test reading OUT/selectB-test, writing OUT/report/test.json
report.HERE = OUT
report.main(test=True)
rj = json.load(open(os.path.join(OUT, 'report', 'test.json')))
shared = rj['sets'].get('late50_pilot_shared')
pilot_rows = [k for k in rj['contrasts'] if k != 'late50']
words = [(k, sc, a) for k in pilot_rows for sc in rj['contrasts'][k] for a, r in rj['contrasts'][k][sc].items() if 'verdict_P10' in r]
sens_words = [(sc, a) for sc in rj['contrasts']['late50'] for a, r in rj['contrasts']['late50'][sc].items()
              if ('builder' in a or '_w' in a) and 'verdict_P10' in r]
ok['r56_shared_row'] = shared == len(late & pilot) and not words and set(rj['verdicts']) == {'late50'}
ok['r53_54_rows_no_verdict'] = not sens_words and 'PLACEBO_fused_w0.25' in rj['contrasts']['late50']['pool'] \
    and 'PLACEBO_fused_builder' in rj['contrasts']['late50']['pool']
print('r56 report sets', rj['sets'], 'shared commits', len(late & pilot), 'verdict words on the pilot row', len(words),
      'verdict sets', sorted(rj['verdicts']), 'ok', ok['r56_shared_row'], flush=True)
print('r53/r54 sensitivity rows present without verdict words', ok['r53_54_rows_no_verdict'],
      'placebo primary', rj['harness_check'].get('placebo_primary_late50'),
      'fixed-w P@10 vs RRF', json.dumps(rj['harness_check'].get('placebo_fixed_w_late50_pool_P10_vs_RRF')), flush=True)
# r58: the real-output entry points refuse while RUNLOG lacks the four sha256 lines
for name, args in (('selectB', ['selectB.py', 'E1']), ('report', ['report.py'])):
    p = subprocess.run([sys.executable] + args, cwd=TRAIN, capture_output=True, text=True, timeout=600)
    msg = (p.stdout + p.stderr).strip().splitlines()
    ok['r58_' + name] = p.returncode == 3 and any('ruling 58' in l for l in msg)
    print('r58', name, 'exit', p.returncode, '|', (msg[-1] if msg else '')[:200], '| ok', ok['r58_' + name], flush=True)
json.dump(ok, open(os.path.join(OUT, 'result.json'), 'w'), indent=1)
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL', 'test_select_report', json.dumps(ok), flush=True)
