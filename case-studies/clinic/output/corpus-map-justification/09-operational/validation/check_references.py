"""Verify every reference quote occurs on its stated line of the stated snapshot.

Usage: python -I -B check_references.py REFERENCES_JSON S1_CORPUS_DIR S1PRIME_CORPUS_DIR
"""
import json
import sys
from pathlib import Path


def main(ref_path, s1, s1p):
    refs = json.loads(Path(ref_path).read_text(encoding="utf-8"))
    roots = {"S1": Path(s1), "S1-prime": Path(s1p)}
    cache, bad, n = {}, [], 0
    for case in refs["cases"]:
        root = roots[case["corpus"]]
        for ob in case["obligations"]:
            for ev in ob["evidence"]:
                n += 1
                path = root / refs["files"][ev["f"]]
                if path not in cache:
                    cache[path] = path.read_text(encoding="utf-8").splitlines()
                lines = cache[path]
                ok = 1 <= ev["line"] <= len(lines) and ev["quote"] in lines[ev["line"] - 1]
                if not ok:
                    bad.append(f"{ob['id']} {ev['f']}:{ev['line']} {ev['quote'][:60]!r}")
    print(f"{n - len(bad)}/{n} reference quotes verified at their stated lines")
    for b in bad:
        print("FAIL", b)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(*sys.argv[1:4])
