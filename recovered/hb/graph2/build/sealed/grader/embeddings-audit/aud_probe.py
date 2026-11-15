"""Runs the BUILDER's gradecore.literal_check on held-out task rows whose checkpoint (missed_pairs.jsonl) git says descends
from the task commit. Prints counts only."""
import sys, json, os
sys.path.insert(0, '/build/sealed/grader/embeddings'); import gradecore as gc
A = os.path.dirname(os.path.abspath(__file__)); tr = gc.load_truth()
P = [json.loads(l) for l in open(os.path.join(A, 'missed_pairs.jsonl')) if l.strip()]
rows = [dict(id=p['id'], parent=tr[p['id']]['parent']) for p in P]
print(json.dumps(dict(builder=gc.literal_check(rows, tr, {p['id']: {p['checkpoint']} for p in P}), git_says_leaky=len(P))))
