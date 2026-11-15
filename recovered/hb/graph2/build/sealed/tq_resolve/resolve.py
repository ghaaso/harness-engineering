"""Resolve writer vs second reader on the 50 TQ questions.
usage: python -I resolve.py <build-dir> <frozen-export-dir>
Reads tq_resolve/tq_questions.before.jsonl (pre-resolution wording) so reruns are idempotent."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import resolve_data as D
B, X = sys.argv[1], sys.argv[2]
R = os.path.join(B, "sealed", "tq_resolve")
def load(p): return {r["id"]: r for r in map(json.loads, open(p, encoding="utf-8"))}
Q = load(os.path.join(R, "tq_questions.before.jsonl"))
W = load(os.path.join(B, "sealed/tq_writer/answers.jsonl"))
S = load(os.path.join(B, "sealed/tq_second/answers.jsonl"))
def items(a):
    if isinstance(a, list): return {("", x) for x in a}
    return {(k, x) for k, v in a.items() for x in v}
def rename_answer(a):
    if isinstance(a, list): return [D.RENAME.get(x, x) for x in a]
    return {k: [D.RENAME.get(x, x) for x in v] for k, v in a.items()}
def strip_outer(s):  # for the naming-normalised agreement figure only
    if "::" not in s: return s
    p, sym = s.split("::", 1); return p + "::" + sym.split(".")[-1] if sym.split(".")[0][:1].isupper() and p.endswith((".jsx", ".tsx")) else s
def norm_items(a): return {(k, strip_outer(x)) for k, x in items(a)}
# ---- agreement before resolution
stats = {"tune": [0, 0], "held_out": [0, 0]}; U = I = 0; NU = NI = 0; nexact = 0; jac = []
rows = []
for i in sorted(Q):
    a, b = items(W[i]["answer"]), items(S[i]["answer"])
    sp = Q[i]["split"]; stats[sp][1] += 1
    if a == b: stats[sp][0] += 1
    U += len(a | b); I += len(a & b)
    jac.append(1.0 if not (a | b) else len(a & b) / len(a | b))
    na, nb = norm_items(W[i]["answer"]), norm_items(S[i]["answer"])
    NU += len(na | nb); NI += len(na & nb); nexact += na == nb
    rows.append((i, sp, Q[i]["kind"], a == b, len(a), len(b), len(a & b)))
exact = sum(v[0] for v in stats.values())
wn = sum(len(items(W[i]["answer"])) for i in Q); sn = sum(len(items(S[i]["answer"])) for i in Q)
# ---- reworded questions
newQ = {}; reworded = []
for i in sorted(Q):
    q = dict(Q[i]); txt = q["question"]
    if q["kind"] in D.NAMING_KINDS and "::" in q["answer_form"] and "Naming:" not in txt:
        txt += D.NAMING
    if q["kind"] == "invariants_on_file":
        assert D.BASENAME_OLD in txt, i
        txt = txt.replace(D.BASENAME_OLD, D.BASENAME_NEW)
    if txt != q["question"]: reworded.append(i)
    q["question"] = txt; newQ[i] = q
with open(os.path.join(B, "tasks/tq_questions.jsonl"), "w", encoding="utf-8", newline="\n") as f:
    for i in sorted(newQ): f.write(json.dumps(newQ[i], ensure_ascii=False) + "\n")
# ---- reference
def line_ok(at):
    m = re.match(r"^(.*?):(\d+)", at)
    if not m: return None
    fp = os.path.join(X, m.group(1))
    if not os.path.isfile(fp): return False
    n = sum(1 for _ in open(fp, encoding="utf-8", errors="replace"))
    return 1 <= int(m.group(2)) <= n
bad = []; out = []
for i in sorted(Q):
    w, s = W[i], S[i]
    ans = rename_answer(w["answer"])
    ev = [dict(e, item=D.RENAME.get(e["item"], e["item"])) for e in w["evidence"]]
    if i == 24:
        for e in ev:
            if e["item"].endswith("::TravelSampleBatch"): e["at"] = "backend/app/features/jobs/schemas.py:300"; e["note"] = "class TravelSampleBatch; the cap is its samples field, Field(..., max_length=100) at :304"
    aliases = {}
    for old, new in D.RENAME.items():
        if any(x == new for _, x in items(ans)): aliases[new] = [old]
    pre = "exact" if items(w["answer"]) == items(s["answer"]) else "resolved"
    assert pre == ("resolved" if i in D.RESOLUTION else "exact"), i
    final_vs_second = items(ans) == items(s["answer"])
    rec = {"id": i, "split": w["split"], "kind": w["kind"], "commit": D.COMMIT, "target": w["target"],
           "question": newQ[i]["question"], "answer_form": newQ[i]["answer_form"],
           "answer": ans, "answer_items": len(items(ans)), "accept_aliases": aliases,
           "hops": w["hops"], "evidence": ev, "evidence_second": s["evidence"],
           "pre_resolution": pre, "final_equals_writer": items(ans) == items(w["answer"]),
           "final_equals_second": final_vs_second,
           "resolution": D.RESOLUTION.get(i), "reworded": i in reworded,
           "second_confidence": s.get("confidence"), "second_reading": s.get("reading", ""),
           "writer_notes": w.get("notes", ""), "naive_search_gets_wrong": w.get("naive_search_gets_wrong", ""),
           "selection_tags": w.get("selection_tags", [])}
    for e in ev:
        if line_ok(e["at"]) is False: bad.append((i, e["at"]))
    if i in D.RESOLUTION:
        for at in D.RESOLUTION[i]["evidence"]:
            if line_ok(at) is not True: bad.append((i, at))
    out.append(rec)
with open(os.path.join(B, "sealed/tq_reference.jsonl"), "w", encoding="utf-8", newline="\n") as f:
    for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
json.dump({"exact": exact, "stats": stats, "U": U, "I": I, "NU": NU, "NI": NI, "nexact": nexact,
           "mean_jaccard": sum(jac) / len(jac), "writer_items": wn, "second_items": sn,
           "reworded": reworded, "bad_evidence": bad, "rows": rows,
           "final_items": sum(r["answer_items"] for r in out),
           "final_eq_writer": sum(r["final_equals_writer"] for r in out),
           "final_eq_second": sum(r["final_equals_second"] for r in out)},
          open(os.path.join(R, "resolve_stats.json"), "w"), indent=1)
print("exact", exact, stats, "items", wn, sn, "union", U, "inter", I, "norm", NI, NU, nexact,
      "meanJ %.4f" % (sum(jac) / len(jac)), "reworded", len(reworded), reworded, "bad", bad,
      "final=writer", sum(r["final_equals_writer"] for r in out), "final=second", sum(r["final_equals_second"] for r in out))
