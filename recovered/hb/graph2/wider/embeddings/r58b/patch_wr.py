import sys
p = sys.argv[1] + '/train/write_result.py'
s = open(p, encoding='utf-8').read()
reps = [
("""  --answer   train/report/answer_level/answer_level.json   answer_level.py tune (item 24, tune split)
""", """  --answer   train/report/answer_level/answer_level.json   answer_level.py tune: the grader's hand-off for item 24 (tune
             split) and the lane's separately labelled file recall (ruling 71)
  --answer-graded  (optional) the grader's item-24 aggregates on the tuning hand-off (JSON); absent -> "not graded yet"
"""),
("""G's words are copied from tune.json (late 50 only); no word is applied to held-out (item 27).
""", """G's words are copied from tune.json (late 50 only); no word is applied to held-out (item 27). Ruling 71: item 24 on the
tuning split is the GRADER's figure (full references, files and definitions); the lane's file-only recall is shown
only under its own label, "file recall within 8,000 tokens, lane-computed", never as item 24.
"""),
("""usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--leak P] [--item27 P] [--heldout P]
""", """usage: python write_result.py [--test] [--tune P] [--item22 P] [--answer P] [--answer-graded P] [--leak P] [--item27 P] [--heldout P]
"""),
("""    L += ['## Answer level (item 24; tuning split, late 50)', '']
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
""", """    L += ['## Answer level (item 24; tuning split, late 50)', '']
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
              'Computed by the lane against git\\'s files only (%s); a separate figure, not item 24.' % LFR['refs'],
              '', '| ranked list | file recall within 8,000 tokens, lane-computed | minus RRF [95 %] |', '|---|---|---|']
        J['lane_file_recall'] = dict(label=LFR['label'], labels={})
        for lab in sorted(LFR['labels']):
            d = LFR['labels'][lab]; vs = d.get('vs_RRF', {}).get('primary')
            L.append('| %s | %.3f | %s |' % (lab, d['mean']['primary'], iv(vs) if vs else 'reference'))
            J['lane_file_recall']['labels'][lab] = dict(file_recall=d['mean']['primary'], vs_RRF=vs, per_seed=d.get('per_seed_primary'))
    else:
"""),
("""    HO = load(a.get('heldout')); plan = load(a['plan'])
""", """    HO = load(a.get('heldout')); plan = load(a['plan']); AG = load(a.get('answer_graded'))
"""),
("""    for k in ('tune', 'item22', 'answer', 'leak', 'item27', 'heldout', 'plan'):
""", """    for k in ('tune', 'item22', 'answer', 'answer_graded', 'leak', 'item27', 'heldout', 'plan'):
"""),
]
for x, y in reps:
    assert s.count(x) == 1, x[:80]
    s = s.replace(x, y)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched write_result.py')
