"""Blind answers for the evaluator (contract v1, section 6): opaque ids, Process sections and tool mentions removed.

Usage: python -I -B blind.py ANSWERS_JSON --out-blind BLIND_JSON --out-key KEY_JSON
The key (opaque id -> label) is kept apart from the evaluator's inputs.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

TOOL_WORDS = re.compile(r"\b(cmap|graphify|GRAPH_REPORT|graph\.json|context packet|QUICKSTART|launcher|context map|routing)\b", re.I)


def strip(answer):
    text = re.split(r"(?im)^#+\s*Process\b.*$", answer or "")[0]
    return TOOL_WORDS.sub("[tool]", text).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("answers")
    ap.add_argument("--out-blind", required=True)
    ap.add_argument("--out-key", required=True)
    ap.add_argument("--salt", default="contract-v1")
    a = ap.parse_args()
    items = json.loads(Path(a.answers).read_text(encoding="utf-8"))
    blind, key = [], {}
    for it in items:
        oid = "A" + hashlib.sha256((a.salt + it["label"]).encode()).hexdigest()[:8]
        key[oid] = it["label"]
        blind.append({"id": oid, "case": it["case"], "answer": strip(it["answer"])})
    blind.sort(key=lambda x: (x["case"], x["id"]))
    Path(a.out_blind).write_text(json.dumps(blind, indent=1, ensure_ascii=False), encoding="utf-8")
    Path(a.out_key).write_text(json.dumps(key, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(blind)} answers blinded")


if __name__ == "__main__":
    main()
