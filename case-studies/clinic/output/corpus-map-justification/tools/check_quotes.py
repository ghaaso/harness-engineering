"""Quote-check passages against the frozen pilot files with the Phase 2 rule (used for G3 records and G5).

Usage: python check_quotes.py INPUT.json|INPUT.jsonl --pilot 03-pilot/files [--out RESULT.json]
Collects every object carrying "file" plus "quote" or "passage", resolves the file to the
frozen pilot copy (by its path from "docs/" onward), and reports verified/unverified with
the line range of the match. Exit status 1 if any passage fails.
"""
import argparse
import bisect
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from textnorm import find_quote, normalize, offset_map  # noqa: E402


def collect(node, path="$"):
    if isinstance(node, dict):
        text = node.get("quote", node.get("passage"))
        if "file" in node and isinstance(text, str):
            yield path, node["file"], text
        for k, v in node.items():
            yield from collect(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from collect(v, f"{path}[{i}]")


def load(p):
    raw = pathlib.Path(p).read_text(encoding="utf-8")
    if p.endswith(".jsonl"):
        return [json.loads(l) for l in raw.splitlines() if l.strip()]
    return json.loads(raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--pilot", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    pilot = pathlib.Path(a.pilot)
    cache, results = {}, []
    for where, file, quote in collect(load(a.input)):
        f = file.replace("\\", "/")
        rel = f[f.find("docs/"):] if "docs/" in f else f
        target = pilot / rel
        rec = {"at": where, "file": file, "resolved": str(target).replace("\\", "/"), "quote": quote}
        if not target.exists():
            rec.update(verified=False, reason="file is not a frozen pilot file")
        else:
            if target not in cache:
                raw = target.read_text(encoding="utf-8")
                starts = [0] + [i + 1 for i, c in enumerate(raw) if c == "\n"]
                cache[target] = (normalize(raw), offset_map(raw, starts))
            norm, line_offsets = cache[target]
            spans, reason = find_quote(quote, norm)
            rec.update(verified=spans is not None, reason=reason)
            if spans:
                first = bisect.bisect_right(line_offsets, spans[0][0])
                last = bisect.bisect_right(line_offsets, max(spans[-1][1] - 1, 0))
                rec["lines"] = f"{first}" if first == last else f"{first}-{last}"
        results.append(rec)
    ok = sum(r["verified"] for r in results)
    for r in results:
        print(f"{'OK  ' if r['verified'] else 'FAIL'} {r['at']}  {r.get('lines', r['reason'])}  {r['quote'][:70]!r}")
    print(f"-- {ok}/{len(results)} passages verified")
    if a.out:
        pathlib.Path(a.out).write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
    sys.exit(0 if ok == len(results) else 1)


if __name__ == "__main__":
    main()
