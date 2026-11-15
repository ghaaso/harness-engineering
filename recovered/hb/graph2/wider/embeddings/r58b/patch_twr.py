import sys
p = sys.argv[1] + '/train/r58/tests/test_write_result.py'
s = open(p).read()
a = "show_hashes('train/write_result.py', 'train/report.py')\n"
assert s.count(a) == 1
s = s.replace(a, "show_hashes('train/write_result.py', 'train/report.py', 'r58b/pre/write_result.py')\n")
a = "print('RESULT.md head:', flush=True)\n"
assert s.count(a) == 1
s = s.replace(a, '''# ---- ruling 71: item 24 is the grader's; the lane's file recall only under its own label
sec = md[md.index('## Answer level (item 24'):]; sec = sec[:sec.index('\\n## ', 5)]
check('r71_item24_is_the_graders', 'scored by the grader with its full references' in sec and 'Item 24 (grader): not graded yet.' in sec
      and '| ranked list | recall within 8,000 tokens |' not in sec, 'item-24 paragraph names the grader; no lane figure under the item-24 header')
check('r71_lane_figure_own_label', '### File recall within 8,000 tokens, lane-computed' in sec and '| ranked list | file recall within 8,000 tokens, lane-computed |' in sec
      and 'lane_file_recall' in J and 'answer_level' not in J and J['item24']['handoff'] == 'handoff/HANDOFF.json', 'separate heading, table and JSON key')
AG = os.path.join(O, 'graded.json')
json.dump(dict(labels={'RRF': dict(mean=dict(primary=0.5)), 'E2_fused': dict(mean=dict(primary=0.55), vs_RRF=dict(primary=dict(diff=0.05, lo=-0.01, hi=0.11, p=0.1)))}), open(AG, 'w'))
O2 = fresh(os.path.join(OUTR, 'write_result_test_graded'))
L2, J2 = wr.main(args + ['--answer-graded', AG, '--outdir', O2])
md2 = open(os.path.join(O2, 'RESULT.md')).read()
check('r71_grader_figures_shown_as_item24', '| ranked list | item 24 (grader) | minus RRF [95 %] |' in md2 and 'E2_fused | 0.550' in md2 and 'answer_graded' in J2['inputs']
      and len(md2.splitlines()) < 150, 'lines', len(md2.splitlines()))
PRE = load_module('write_result_pre', os.path.join(ROOT, 'r58b', 'pre', 'write_result.py'))
O3 = fresh(os.path.join(OUTR, 'write_result_test_pre'))
a3 = list(args); a3[a3.index('--answer') + 1] = os.path.join(OUTR, 'answer_test_pre', 'answer_level.json')
PRE.main(a3 + ['--outdir', O3])
md3 = open(os.path.join(O3, 'RESULT.md')).read()
check('r71_pre_labelled_file_recall_as_item24', '## Answer level (item 24' in md3 and '| ranked list | recall within 8,000 tokens |' in md3 and 'grader' not in md3.split('## Answer level')[1].split('\\n## ')[0],
      'fail before: the pre-ruling-71 writer put the lane file recall under the item-24 header')
print('RESULT.md head:', flush=True)
''')
open(p, 'w', newline='\n').write(s)
print('patched test_write_result.py')
