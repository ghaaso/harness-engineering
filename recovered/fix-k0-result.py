import json, shutil, os
P = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/widen/k0/result.json'
BK = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/page/work3/k0-result.before-fix4.json'
if not os.path.exists(BK):
    shutil.copyfile(P, BK)
b = json.loads(open(P, encoding='utf-8').read())
ar = b['results']['audit_recomputation']
add = [
    "the cause split of the 134 dependency cases of kinds 1-8 (133 pattern changes and 1 route-prefix fact change), read from the replay's own dependency records, not recomputed; the audit's 7 hand-built cases agree with it",
    "the timings (the replay's and the index bench's), read from the replay's files, not re-measured",
]
for a in add:
    if a not in ar['not_rechecked']:
        ar['not_rechecked'].append(a)
te = b['results']['token_estimate']
if 'typed_side_costs_not_counted' not in te:
    new = {}
    for k, v in te.items():
        new[k] = v
        if k == 'assumption':
            new['typed_side_costs_not_counted'] = "The typed side's own costs are not counted: knowing the schema, writing the query, and the per-kind query programs written in advance."
    b['results']['token_estimate'] = new
made = b['corrections_after_audit']['made']
note = "Second pass on 2026-11-13, after a check of the owner page: audit_recomputation.not_rechecked gains the cause split of the 134 dependency cases and the timings; token_estimate.typed_side_costs_not_counted restores the sentence on the typed side's uncounted costs that the old token_bound.wording carried. No number changed."
if note not in made:
    made.append(note)
open(P, 'w', encoding='utf-8', newline='').write(json.dumps(b, indent=1, ensure_ascii=True))
print('ok', len(ar['not_rechecked']), list(b['results']['token_estimate'].keys()))
