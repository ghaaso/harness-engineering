import json, sys, os
B = sys.argv[1]
def load(p):
    return {r["id"]: r for r in map(json.loads, open(p, encoding="utf-8"))}
Q = load(os.path.join(B, "tasks/tq_questions.jsonl"))
W = load(os.path.join(B, "sealed/tq_writer/answers.jsonl"))
S = load(os.path.join(B, "sealed/tq_second/answers.jsonl"))
def items(a):
    # flatten to a set of (part, item)
    if isinstance(a, list):
        return {("", json.dumps(x, sort_keys=True) if not isinstance(x, str) else x) for x in a}
    if isinstance(a, dict):
        out = set()
        for k, v in a.items():
            if isinstance(v, list):
                for x in v:
                    out.add((k, x if isinstance(x, str) else json.dumps(x, sort_keys=True)))
            else:
                out.add((k, json.dumps(v)))
        return out
    return {("", json.dumps(a))}
exact = 0; tot_union = 0; tot_inter = 0; rows = []
for i in sorted(Q):
    a, b = items(W[i]["answer"]), items(S[i]["answer"])
    same = a == b
    exact += same
    u, n = a | b, a & b
    tot_union += len(u); tot_inter += len(n)
    rows.append((i, Q[i]["split"], Q[i]["kind"], same, len(a), len(b), len(n), sorted(a - b), sorted(b - a)))
    if "--show" in sys.argv and not same:
        print(f"Q{i} [{Q[i]['split']}/{Q[i]['kind']}] W={len(a)} S={len(b)} both={len(n)}")
        print("  only writer:", sorted(a - b))
        print("  only second:", sorted(b - a))
print("exact", exact, "/", len(Q), " items union", tot_union, "inter", tot_inter)
json.dump(rows, open(os.path.join(B, "sealed/tq_resolve/compare_pre.json"), "w"), indent=0)
