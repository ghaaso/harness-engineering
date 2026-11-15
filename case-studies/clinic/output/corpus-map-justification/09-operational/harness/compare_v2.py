"""Extraction consistency on the four files that are byte-identical to the frozen pilot.

For each V2 edge (the 2026-10-08 re-application, independent whole-file readers + verifier corrections + reclassification),
is there a map edge in the same file on an overlapping line with the same whitespace-normalised label (exact), or a label
that contains / is contained in it (loose)? Reports recall per file and the unmatched labels. Neither reading is ground
truth; this measures agreement between two model readings, not completeness.

Usage: python -I -B compare_v2.py --workdir output/corpus-map-justification --store STORE --out OUT.json
"""
import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--store", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    W = Path(a.workdir)
    sys.path.insert(0, str(W / "tools"))
    sys.path.insert(0, str(W / "09-operational/tools"))
    import reapply as R  # historical evaluator, read-only use
    import cmap
    v2 = [r for r in R.load_records(W, "V2") if r.get("type") == "edge"]
    st = cmap.Store(a.store)
    mp = [r for r in st.live() if r["type"] == "edge"]
    idx = defaultdict(list)
    for r in mp:
        lo, hi = cmap.span_lines(r["lines"])
        for n in range(lo, hi + 1):
            idx[(r["file"], n)].append(cmap.ws(r["label"]).casefold())
    out = {"files": {}, "unmatched_labels": Counter()}
    for r in v2:
        lo, hi = R.span(r.get("lines"))
        lab = R.ws(r.get("label")).casefold()
        here = [l for n in range(lo, hi + 1) for l in idx.get((r["file"], n), [])]
        f = out["files"].setdefault(r["file"], {"v2_edges": 0, "exact": 0, "loose": 0})
        f["v2_edges"] += 1
        if lab in here:
            f["exact"] += 1
        elif any(lab in h or h in lab for h in here if h):
            f["loose"] += 1
        else:
            out["unmatched_labels"][lab] += 1
    for f in out["files"].values():
        f["recall_exact"] = round(f["exact"] / f["v2_edges"], 3)
        f["recall_exact_or_loose"] = round((f["exact"] + f["loose"]) / f["v2_edges"], 3)
    tot = sum(f["v2_edges"] for f in out["files"].values())
    out["overall"] = {"v2_edges": tot, "recall_exact": round(sum(f["exact"] for f in out["files"].values()) / tot, 3),
                      "recall_exact_or_loose": round(sum(f["exact"] + f["loose"] for f in out["files"].values()) / tot, 3),
                      "map_edges_on_these_files": sum(1 for r in mp if r["file"] in out["files"])}
    out["unmatched_labels"] = dict(out["unmatched_labels"].most_common(40))
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"overall": out["overall"], "files": out["files"]}, indent=1))


if __name__ == "__main__":
    main()
