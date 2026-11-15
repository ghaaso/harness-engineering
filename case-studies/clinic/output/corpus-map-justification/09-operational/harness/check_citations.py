"""Mechanical citation check (contract v1, section 6): does each cited quote occur on the cited line(s) of the case's snapshot?

Usage: python -I -B check_citations.py ANSWERS_JSON --s1 DIR --s1prime DIR --out OUT.json
ANSWERS_JSON: [{"label":..., "case":..., "answer": text}, ...]. A citation is `path:line["-line"] "quote"` (backticks optional).
Result per answer: cited, verified_exact_lines (quote on the cited lines, whitespace/markup-insensitive), verified_near (within 3 lines),
wrong_file_or_absent, and the failing citations.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
from cmap import locate  # noqa: E402

CITE = re.compile(r"`?((?:docs/)[\w./\\-]+?\.md)`?\s*[:#]\s*L?(\d+)(?:\s*[-–]\s*L?(\d+))?[^\"“\n]{0,40}?[\"“]([^\"”\n]{3,400})[\"”]")


def check(answer, root):
    cache, res = {}, {"cited": 0, "verified_exact_lines": 0, "verified_near": 0, "not_found": 0, "failures": []}
    for path, lo, hi, quote in CITE.findall(answer):
        res["cited"] += 1
        p = root / path.replace("\\", "/")
        if not p.exists():
            res["not_found"] += 1
            res["failures"].append(f"no such file {path}")
            continue
        lines = cache.setdefault(p, p.read_text(encoding="utf-8").splitlines())
        lo, hi = int(lo), int(hi or lo)
        q = quote.strip().strip(".").replace("…", "").strip()
        parts = [s.strip() for s in re.split(r"\s*(?:\.\.\.|…)\s*", quote) if s.strip()]
        span = "\n".join(lines[max(lo, 1) - 1:hi])
        if all(locate(span, s) for s in parts or [q]):
            res["verified_exact_lines"] += 1
            continue
        near = "\n".join(lines[max(lo - 3, 1) - 1:hi + 3])
        if all(locate(near, s) for s in parts or [q]):
            res["verified_near"] += 1
            res["failures"].append(f"off by up to 3 lines: {path}:{lo} {quote[:60]!r}")
            continue
        res["not_found"] += 1
        res["failures"].append(f"quote not at {path}:{lo}-{hi}: {quote[:80]!r}")
    res["accuracy_exact"] = round(res["verified_exact_lines"] / res["cited"], 3) if res["cited"] else None
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("answers")
    ap.add_argument("--s1", required=True)
    ap.add_argument("--s1prime", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    roots = {"S1": Path(a.s1), "S1-prime": Path(a.s1prime)}
    tasks = json.loads((Path(__file__).resolve().parent.parent / "validation/tasks.json").read_text(encoding="utf-8"))
    out = {}
    for item in json.loads(Path(a.answers).read_text(encoding="utf-8")):
        root = roots[tasks["cases"][item["case"]]["corpus"]]
        out[item["label"]] = check(item["answer"] or "", root)
        r = out[item["label"]]
        print(f"{item['label']}: cited {r['cited']}, exact {r['verified_exact_lines']}, near {r['verified_near']}, not found {r['not_found']}")
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
