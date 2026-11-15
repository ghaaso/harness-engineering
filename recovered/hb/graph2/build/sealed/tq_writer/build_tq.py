"""Build the TQ question set and its sealed reference answers.

Usage: python build_tq.py [frozen_export_dir]
Writes ../../tasks/tq_questions.jsonl (questions only) and ./answers.jsonl (everything).
If a frozen export of a31924a is given, every evidence path and line is checked against it.
"""
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tq_defs import FROZEN, SCOPE, FORM  # noqa: E402
import tq_data_a  # noqa: E402
import tq_data_b  # noqa: E402

BUILD = os.path.dirname(os.path.dirname(HERE))
TASKS = os.path.join(BUILD, "tasks", "tq_questions.jsonl")
SEALED = os.path.join(HERE, "answers.jsonl")

Q = tq_data_a.Q + tq_data_b.Q
Q.sort(key=lambda r: r["id"])


def check_evidence(root):
    problems = []
    for r in Q:
        for item, loc, _note in r["evidence"]:
            path, _, line = loc.partition(":")
            full = os.path.join(root, path)
            if not os.path.isfile(full):
                problems.append(f"Q{r['id']}: missing file {path}")
                continue
            if line:
                n = int(line.split("-")[0])
                with open(full, encoding="utf-8", errors="replace") as fh:
                    total = sum(1 for _ in fh)
                if n < 1 or n > total:
                    problems.append(f"Q{r['id']}: line {n} beyond {total} in {path}")
    return problems


def answer_items(ans):
    if isinstance(ans, list):
        return len(ans)
    return sum(len(v) for v in ans.values())


def main():
    ids = [r["id"] for r in Q]
    assert ids == list(range(1, 51)), ids
    for r in Q:
        assert r["kind"] in SCOPE, r["id"]
        if isinstance(r["answer"], dict):
            want = {"tests_reach": {"real", "fake"},
                    "route_clients": {"call_sites", "via_bff", "direct_callers"},
                    "change_reach": {"backend", "web", "mobile"}}[r["kind"]]
            assert set(r["answer"]) == want, r["id"]
    if len(sys.argv) > 1:
        probs = check_evidence(sys.argv[1])
        for p in probs:
            print("EVIDENCE:", p)
        if probs:
            sys.exit(1)

    os.makedirs(os.path.dirname(TASKS), exist_ok=True)
    with open(TASKS, "w", encoding="utf-8", newline="\n") as ft, \
         open(SEALED, "w", encoding="utf-8", newline="\n") as fs:
        for r in Q:
            split = "tune" if r["id"] <= 20 else "held_out"
            question = (f"[repo at commit {FROZEN[:7]}] " + r["q"] + " " + SCOPE[r["kind"]])
            ft.write(json.dumps({"id": r["id"], "split": split, "kind": r["kind"],
                                 "question": question, "answer_form": FORM[r["kind"]]},
                                ensure_ascii=False) + "\n")
            fs.write(json.dumps({
                "id": r["id"], "split": split, "kind": r["kind"], "commit": FROZEN,
                "target": r["target"], "selection_tags": r["tags"], "question": question,
                "answer_form": FORM[r["kind"]], "answer": r["answer"],
                "answer_items": answer_items(r["answer"]),
                "evidence": [{"item": a, "at": b, "note": c} for a, b, c in r["evidence"]],
                "hops": r["hops"], "naive_search_gets_wrong": r["naive"], "notes": r["notes"],
            }, ensure_ascii=False) + "\n")

    kinds = Counter((r["kind"], "tune" if r["id"] <= 20 else "held_out") for r in Q)
    for k in SCOPE:
        print(f"{k:24s} tune={kinds[(k, 'tune')]} held_out={kinds[(k, 'held_out')]}")
    empty = [r["id"] for r in Q if answer_items(r["answer"]) == 0]
    print("empty answers:", empty)
    print("hops:", sorted(r["hops"] for r in Q))
    print("wrote", TASKS, "and", SEALED)


if __name__ == "__main__":
    main()
