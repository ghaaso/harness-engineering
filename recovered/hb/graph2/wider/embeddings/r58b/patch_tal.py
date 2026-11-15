import sys
p = sys.argv[1] + '/train/r58/tests/test_answer_level.py'
s = open(p).read()
a = '''host run of the same three tasks (1.0, 0.625, 0.571). Refusal: changed adapter bytes (exit 7)."""'''
assert s.count(a) == 1
s = s.replace(a, '''host run of the same three tasks (1.0, 0.625, 0.571). Refusal: changed adapter bytes (exit 7).
Ruling 71: those figures are only the lane's "file recall within 8,000 tokens, lane-computed"; item 24 itself is the
grader's, so the run must also write the grader's hand-off (handoff/: HANDOFF.json, tasks.jsonl, ranked/ and answers/
per variant, every file listed with its sha256) holding no truth key and no reference file, with the lane figure
kept apart in lane_file_recall/. The PRE-ruling-71 adapter (r58b/pre/answer_level.py) wrote no hand-off: fail before."""''')
a = "res = al.tune(os.path.join(OUTR, 'fakeB', 'selectB'), O, set(IDS), B=1000)\nlabs = res['labels']\n"
assert s.count(a) == 1
s = s.replace(a, '''res = al.tune(os.path.join(OUTR, 'fakeB', 'selectB'), O, set(IDS), B=1000)
labs = res['lane_file_recall']['labels']
# ---- ruling 71: the grader's hand-off
HO = os.path.join(O, 'handoff'); H = json.load(open(os.path.join(HO, 'HANDOFF.json')))
listed = set(H['files']); ondisk = {os.path.relpath(os.path.join(dp, f), HO).replace(os.sep, '/') for dp, dn, fn in os.walk(HO) for f in fn} - {'HANDOFF.json'}
check('r71_handoff_manifest', H['split'] == 'tune' and H['tasks'] == 3 and listed == ondisk and all(sha(os.path.join(HO, k)) == v for k, v in H['files'].items())
      and len(H['variants']) == res['variants'] and H['options']['primary_budget'] == 8000 and 'grader' in H['note'],
      'files', len(listed), 'variants', len(H['variants']), 'packs', json.dumps(H['packs'])[:120])
ans_files = sorted(f for f in listed if f.startswith('answers/')); rk_files = sorted(f for f in listed if f.startswith('ranked/'))
check('r71_handoff_per_variant', len(ans_files) == len(rk_files) == res['variants'] and 'answers/E2_fused_s1.jsonl.gz' in ans_files
      and 'ranked/RRF_unrestricted.jsonl.gz' in rk_files, 'answers', len(ans_files), 'ranked', len(rk_files))
found = al.truth_keys(HO)
hk = set(H) & (set(al.TRUTH_KEYS) - {'files'})
check('r71_handoff_no_truth', not found and not hk and not any(('ref' in f or 'truth' in f) for f in ondisk)
      and not os.path.exists(os.path.join(HO, 'tune_refs.jsonl')) and os.path.exists(os.path.join(O, 'lane_file_recall', 'tune_refs.jsonl')),
      'truth keys in hand-off rows', found, 'in HANDOFF.json', sorted(hk))
check('r71_lane_figure_labelled_apart', res['lane_file_recall']['label'].startswith('file recall within 8,000 tokens, lane-computed')
      and "not item 24's measure" in res['lane_file_recall']['label'] and 'labels' not in res and 'grader' in res['item24']['measure']
      and res['item24']['handoff_sha256'] == sha(os.path.join(HO, 'HANDOFF.json')), res['lane_file_recall']['label'], '|', res['item24']['status'])
os.makedirs(os.path.join(HO, 'extra')); open(os.path.join(HO, 'extra', 'x.jsonl'), 'w').write(json.dumps(dict(id='T1-0124', truth=['a.py'])) + '\\n')
check('r71_truth_check_catches_a_truth_key', al.truth_keys(HO) != [], al.truth_keys(HO))
import shutil; shutil.rmtree(os.path.join(HO, 'extra'))
PRE_O = fresh(os.path.join(OUTR, 'answer_test_pre'))
PRE = load_module('answer_level_pre', os.path.join(ROOT, 'r58b', 'pre', 'answer_level.py'))
rp = PRE.tune(os.path.join(OUTR, 'fakeB', 'selectB'), PRE_O, set(IDS[:1]), B=200)
check('r71_pre_wrote_no_handoff', not os.path.exists(os.path.join(PRE_O, 'handoff', 'HANDOFF.json')) and 'labels' in rp and 'item24' not in rp
      and os.path.exists(os.path.join(PRE_O, 'tune_refs.jsonl')),
      'fail before: the pre-ruling-71 adapter wrote', sorted(os.listdir(PRE_O)), 'and reported file recall as item 24 (top-level labels)')
''')
a = "rows = [json.loads(l) for l in open(os.path.join(O, 'per_task.jsonl'))]"
assert s.count(a) == 1
s = s.replace(a, "rows = [json.loads(l) for l in open(os.path.join(O, 'lane_file_recall', 'per_task.jsonl'))]")
a = "show_hashes('train/answer_level.py', 'train/answer_level.js')"
assert s.count(a) == 1
s = s.replace(a, "show_hashes('train/answer_level.py', 'train/answer_level.js', 'r58b/pre/answer_level.py')")
a = "check('al_packed_all', res['packed'].get('packed') == res['variants'] * 3 == (4 + 12 * 3) * 3 and res['tasks'] == 3 and res['scored'].get('scored') == res['variants'] * 3,"
assert s.count(a) == 1
s = s.replace(a, "check('al_packed_all', res['packed'].get('packed') == res['variants'] * 3 == (4 + 12 * 3) * 3 and res['tasks'] == 3 and res['lane_file_recall']['scored'].get('scored') == res['variants'] * 3,")
open(p, 'w', newline='\n').write(s)
print('patched test_answer_level.py')
