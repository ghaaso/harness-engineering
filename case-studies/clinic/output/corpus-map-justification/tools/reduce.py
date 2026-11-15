"""Phase 2 reducer: reduce lane findings to a verified pack without interpreting them.

Usage: python reduce.py --workdir W --cache DIR [--cap 12] [--refetch]

Steps, in order, each drop logged with its reason:
  1 schema check   2 strip recommendations   3 re-fetch sources and verify quotes
  4 cap read extent at verified-quote locations   5 support rule   6 dedupe works
  7 research ledger
Outputs: 02-pack/pack.jsonl, 02-pack/ledger.md, 02-pack/drop-log.md
"""
import argparse
import bisect
import json
import pathlib
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fetch_text  # noqa: E402
from textnorm import find_quote, normalize, offset_map  # noqa: E402
from validate_lane import PRESCRIBE, QUESTIONS, check_finding, source_key  # noqa: E402

LANES = list(QUESTIONS)
VERSION_CUE = re.compile(r"\b(?:extended|revised|earlier|preliminary|longer|journal|conference|"
                         r"updated|previous|shorter) version\b", re.I)
ABSTRACT = re.compile(r"\babstract\b", re.I)
INTRO = re.compile(r"\b(?:1\.?\s*)?introduction\b", re.I)


def _fold(s) -> str:
    """NFKC + casefold + whitespace collapse; punctuation is kept."""
    return " ".join(unicodedata.normalize("NFKC", str(s or "")).casefold().split())


def same_title_and_authors(a: dict, b: dict) -> bool:
    """Dedupe rule (a): two lane `source` objects name the same work by title AND authors.

    a, b: {"title": str, "authors": [str], "year": int|None, "venue": str, "kind": str, ...}
    DOI / arXiv / explicit version statements are handled elsewhere; this decides only
    whether title and authors match. A changed title alone must never merge two records.
    """
    def title(s):
        return _fold(s.get("title")).rstrip(" .:;,")      # no subtitle collapsing: a changed title stays distinct

    def surnames(s):
        raw = [n for n in s.get("authors") or [] if _fold(n).rstrip(".") not in ("", "et al", "others")]
        names = [(_fold(n).split(",")[0] if "," in n else _fold(n).split(" ")[-1]).strip(" .") for n in raw]
        return names, len(raw) < len(s.get("authors") or [])  # (surnames, list was truncated by "et al.")

    if not title(a) or title(a) != title(b):
        return False
    (sa, cut_a), (sb, cut_b) = surnames(a), surnames(b)
    if not sa or not sb or sa[0] != sb[0]:               # empty author lists never match
        return False
    if cut_a or cut_b:
        return set(sa) <= set(sb) or set(sb) <= set(sa)
    return set(sa) == set(sb)


def _doi(s):
    return re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:)", "", (s or "").strip(), flags=re.I).lower() or None


def _arxiv(s):
    s = re.sub(r"^(?:arxiv:|https?://arxiv\.org/(?:abs|pdf)/)", "", (s or "").strip(), flags=re.I)
    return re.sub(r"v\d+$", "", s.removesuffix(".pdf")).lower() or None


def fetch_targets(src: dict) -> list:
    out = [src.get("url")]
    if src.get("arxiv"):
        out.append(f"https://arxiv.org/abs/{_arxiv(src['arxiv'])}")
    if src.get("doi"):
        out.append(f"https://doi.org/{_doi(src['doi'])}")
    return list(dict.fromkeys(u for u in out if u))


def _fetch(job):
    url, cache = job
    return url, fetch_text.fetch_one(url, pathlib.Path(cache), {})


class Doc:
    """A reducer-fetched text with page/heading/abstract geometry in normalised offsets."""

    def __init__(self, entry):
        raw = pathlib.Path(entry["text_path"]).read_text(encoding="utf-8")
        meta = json.loads(pathlib.Path(entry["text_path"][:-4] + ".meta.json").read_text(encoding="utf-8"))
        self.entry, self.norm = entry, normalize(raw)
        self.pages = offset_map(raw, meta["pages"]) if meta.get("pages") else []
        heads = meta.get("headings") or []
        self.heads = list(zip(offset_map(raw, [h[0] for h in heads]), [h[1] for h in heads]))
        self.abstract = None
        if self.heads:
            for i, (off, title) in enumerate(self.heads):
                if _fold(title).strip(" .:0123456789") == "abstract":
                    end = self.heads[i + 1][0] if i + 1 < len(self.heads) else len(self.norm)
                    self.abstract = (off, end)
                    break
        else:
            a = ABSTRACT.search(self.norm, 0, 6000)
            intro = INTRO.search(self.norm, a.end()) if a else None
            if a and intro:
                self.abstract = (a.start(), intro.start())

    def where(self, offset):
        if self.pages:
            return f"page {bisect.bisect_right(self.pages, offset)}"
        if self.heads:
            i = bisect.bisect_right([h[0] for h in self.heads], offset) - 1
            return f"section: {self.heads[i][1]}" if i >= 0 else "before first heading"
        return f"offset {offset}"

    def in_abstract(self, offset):
        return bool(self.abstract and self.abstract[0] <= offset < self.abstract[1])


class UnionFind:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)
        return ra != rb


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--cache", required=True)
    ap.add_argument("--refetch", action="store_true")
    ap.add_argument("--retry-failed", action="store_true", help="retry each failed URL once, sequentially")
    a = ap.parse_args()
    W, cache = pathlib.Path(a.workdir), pathlib.Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)
    drops, unverified, merges = [], [], []
    findings, queries, recovered = [], {}, {}

    # Step 1: schema check (no re-harvesting)
    for lane in LANES:
        path = W / "01-lanes" / f"{lane}.jsonl"
        qpath = W / "01-lanes" / f"{lane}.queries.txt"
        queries[lane] = [l.strip() for l in qpath.read_text(encoding="utf-8").splitlines()
                         if l.strip()] if qpath.exists() else []
        rpath = W / "01-lanes" / f"{lane}.queries.recovered.txt"   # aborted runs, from transcripts
        recovered[lane] = [l for l in rpath.read_text(encoding="utf-8").splitlines()
                           if l.strip() and not l.startswith("#")] if rpath.exists() else []
        if not path.exists():
            drops.append(("1 schema", f"{lane}", "lane output file missing"))
            continue
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            fid = f"{lane}-F{n:02d}"
            try:
                f = json.loads(line)
            except json.JSONDecodeError as exc:
                drops.append(("1 schema", fid, f"invalid JSON: {exc}"))
                continue
            errs, _ = check_finding(f, lane)
            if errs:
                drops.append(("1 schema", fid, "; ".join(errs)))
                continue
            f["finding_id"] = fid
            findings.append(f)
    after_schema = list(findings)

    # Step 2: strip recommendations (cue words in the claim, ignoring `code` spans)
    kept = []
    for f in findings:
        m = PRESCRIBE.search(re.sub(r"`[^`]*`", "", f["claim"]))
        if m:
            drops.append(("2 prescriptive", f["finding_id"], f"cue word {m.group(0)!r}: {f['claim'][:160]}"))
        else:
            kept.append(f)
    findings = kept

    # Step 3: re-fetch every source ourselves, verify every quote
    index_path = cache / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() and not a.refetch else {}
    wanted = sorted({u for f in findings if f["read_extent"] != "unread" for u in fetch_targets(f["source"])})
    todo = [u for u in wanted if u not in index]
    if todo:
        with ProcessPoolExecutor(max_workers=6) as pool:
            for url, entry in pool.map(_fetch, [(u, str(cache)) for u in todo]):
                index[url] = entry
                print(("OK    " if "error" not in entry else "FAIL  ") + url, file=sys.stderr)
        index_path.write_text(json.dumps(index, indent=1), encoding="utf-8")
    # A cached interstitial is a failed fetch; reclassify it, then retry each failed URL once, sequentially.
    for url in wanted:
        e = index.get(url, {})
        if e.get("text_path") and e.get("chars", 0) < 3000 and re.search(
                r"checking your browser|captcha|are you a robot|access denied",
                pathlib.Path(e["text_path"]).read_text(encoding="utf-8"), re.I):
            index[url] = {**{k: e[k] for k in ("requested_url", "fetched_url") if k in e},
                          "error": "bot-check interstitial served instead of the document (not fetched)"}
    if a.retry_failed:
        for url in [u for u in wanted if "error" in index.get(u, {})]:
            time.sleep(5)
            entry = fetch_text.fetch_one(url, cache, {})
            entry["attempt"] = 2
            if "error" in entry:
                entry["error"] = f"retry failed: {entry['error']} | first attempt: {index[url]['error']}"
            index[url] = entry
            print(("OK    " if "error" not in entry else "FAIL  ") + "retry " + url, file=sys.stderr)
    index_path.write_text(json.dumps(index, indent=1), encoding="utf-8")
    docs = {}

    def doc_for(src):
        for url in fetch_targets(src):
            entry = index.get(url, {})
            if entry.get("text_path"):
                if url not in docs:
                    docs[url] = Doc(entry)
                return url, docs[url]
        return None, None

    for f in findings:
        url, doc = (None, None) if f["read_extent"] == "unread" else doc_for(f["source"])
        f["_fetched"] = url
        qs = []
        for i, q in enumerate(f["quotes"], 1):
            rec = {"quote_id": f"{f['finding_id']}.q{i}", "text": q["text"], "locator_reported": q["locator"],
                   "verified": False}
            if doc is None:
                errors = [index.get(u, {}).get("error", "not attempted") for u in fetch_targets(f["source"])]
                rec["reason"] = "source not fetched by reducer: " + " | ".join(errors)
            else:
                spans, reason = find_quote(q["text"], doc.norm)
                rec.update(reason=reason, fetched_url=url, sha256=doc.entry["sha256"])
                if spans:
                    rec.update(verified=True, location_derived=doc.where(spans[0][0]),
                               in_abstract=all(doc.in_abstract(s) for s, _ in spans))
            if not rec["verified"]:
                unverified.append((rec["quote_id"], rec["reason"], q["text"][:120]))
            qs.append(rec)
        f["quotes"] = qs

        # Steps 4-5: cap read extent at verified-quote locations; support rule
        ver = [q for q in qs if q["verified"]]
        f["read_extent_reported"] = f.pop("read_extent")
        if f["read_extent_reported"] == "unread":
            f["read_extent_capped"], f["support"] = "unread", "listed-unread"
        elif not ver:
            f["read_extent_capped"], f["support"] = "unread", "unverified-claim: no verified quote"
        elif all(q["in_abstract"] for q in ver):
            f["read_extent_capped"], f["support"] = "abstract-only", "unverified-claim: verified quotes are abstract-only"
        else:
            f["read_extent_capped"] = sorted({q["location_derived"] for q in ver if not q["in_abstract"]})
            f["support"] = "supported"

    # Step 6: dedupe works (title+authors, DOI, arXiv ID, or a text stating a version)
    srcs = [f["source"] for f in findings]
    record = [(f["lane"], source_key(f["source"])) for f in findings]
    uf, why = UnionFind(len(srcs)), defaultdict(set)
    first_of_record = {}
    for i, r in enumerate(record):               # one lane citing one source repeatedly is one record
        if r in first_of_record:
            uf.union(first_of_record[r], i)
        first_of_record.setdefault(r, i)
    for keyname, keyfn in (("doi", lambda s: _doi(s.get("doi"))), ("arxiv", lambda s: _arxiv(s.get("arxiv")))):
        first = {}
        for i, s in enumerate(srcs):
            k = keyfn(s)
            if k:
                if k in first and uf.union(first[k], i):
                    why[(first[k], i)].add(f"{keyname} {k}")
                first.setdefault(k, i)
    for i in range(len(srcs)):
        for j in range(i + 1, len(srcs)):
            if uf.find(i) != uf.find(j) and same_title_and_authors(srcs[i], srcs[j]):
                uf.union(i, j)
                why[(i, j)].add("title+authors")
    folded = {}
    for i, f in enumerate(findings):
        url = f["_fetched"]
        if not url:
            continue
        text = folded.setdefault(url, _fold(docs[url].norm))
        for j, s in enumerate(srcs):
            t = _fold(s.get("title"))
            if j == i or len(t) < 20 or uf.find(i) == uf.find(j):
                continue
            for m in re.finditer(re.escape(t), text):
                if VERSION_CUE.search(text, max(0, m.start() - 300), m.end() + 300):
                    uf.union(i, j)
                    why[(i, j)].add(f"text fetched for {f['finding_id']} states a version relation near the title")
                    break
    groups = defaultdict(list)
    for i in range(len(srcs)):
        groups[uf.find(i)].append(i)
    works, work_of = [], {}
    for n, (root, members) in enumerate(sorted(groups.items()), 1):
        wid = f"W{n:03d}"
        ms = [findings[i] for i in members]
        for i in members:
            work_of[i] = wid
        rules = sorted({r for (x, y), rs in why.items() if uf.find(x) == root for r in rs})
        if len({record[i] for i in members}) > 1:
            merges.append((wid, ", ".join(m["finding_id"] for m in ms), "; ".join(rules) or "identical record"))
        versions = {}
        for m in ms:
            for q in m["quotes"]:
                if q.get("fetched_url"):
                    versions[q["fetched_url"]] = q["sha256"]
        works.append({
            "record": "work", "work_id": wid,
            "titles": sorted({m["source"]["title"] for m in ms}),
            "authors": sorted({tuple(m["source"]["authors"]) for m in ms}),
            "years": sorted({m["source"]["year"] for m in ms if m["source"]["year"] is not None}),
            "venues": sorted({m["source"]["venue"] for m in ms}),
            "kinds": sorted({m["source"]["kind"] for m in ms}),
            "doi": sorted({_doi(m["source"].get("doi")) for m in ms if m["source"].get("doi")}),
            "arxiv": sorted({_arxiv(m["source"].get("arxiv")) for m in ms if m["source"].get("arxiv")}),
            "urls": sorted({m["source"].get("url") for m in ms if m["source"].get("url")}),
            "fetched_versions": [{"url": u, "sha256": h} for u, h in sorted(versions.items())],
            "merge_rules": rules, "finding_ids": [m["finding_id"] for m in ms],
            "lanes": sorted({m["lane"] for m in ms}),
        })
    for i, f in enumerate(findings):
        f["work_id"] = work_of[i]
        f.pop("_fetched", None)
    # exact-duplicate findings: same work and same folded claim -> one finding keeping every quote
    seen, out = {}, []
    for f in findings:
        k = (f["work_id"], _fold(f["claim"]))
        if k in seen:
            seen[k]["quotes"] += f["quotes"]
            seen[k].setdefault("merged_findings", []).append(f["finding_id"])
            merges.append((f["work_id"], f"{seen[k]['finding_id']} <- {f['finding_id']}", "identical claim"))
        else:
            seen[k] = f
            out.append(f)
    findings = out

    # Outputs
    pack = W / "02-pack"
    pack.mkdir(exist_ok=True)
    with (pack / "pack.jsonl").open("w", encoding="utf-8") as fh:
        for w in works:
            w["authors"] = [list(t) for t in w["authors"]]
            fh.write(json.dumps(w, ensure_ascii=False) + "\n")
        for f in findings:
            fh.write(json.dumps({"record": "finding", **f}, ensure_ascii=False) + "\n")
    write_drop_log(pack, drops, unverified, merges)
    write_ledger(pack, queries, recovered, after_schema, findings, works, index, drops, merges)
    print(json.dumps({"findings_in": len(after_schema) + sum(d[0] == "1 schema" and "-F" in d[1] for d in drops),
                      "findings_out": len(findings), "works": len(works),
                      "supported": sum(f["support"] == "supported" for f in findings),
                      "quotes": sum(len(f["quotes"]) for f in findings),
                      "quotes_verified": sum(q["verified"] for f in findings for q in f["quotes"])}))


def write_drop_log(pack, drops, unverified, merges):
    lines = ["# Drop log", "", "Every exclusion, unverified quote and merge made by the reducer, with its reason.", "",
             "## Dropped findings", "", "| Step | Finding | Reason |", "| --- | --- | --- |"]
    lines += [f"| {s} | {fid} | {r.replace('|', '/')} |" for s, fid, r in drops] or ["| - | - | none |"]
    lines += ["", "## Unverified quotes (kept, marked; never support)", "", "| Quote | Reason | Text (start) |",
              "| --- | --- | --- |"]
    lines += [f"| {q} | {r.replace('|', '/')} | {t.replace('|', '/')} |" for q, r, t in unverified] or ["| - | - | none |"]
    lines += ["", "## Merges", "", "| Work | Records | Key |", "| --- | --- | --- |"]
    lines += [f"| {w} | {m} | {k} |" for w, m, k in merges] or ["| - | - | none |"]
    (pack / "drop-log.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_ledger(pack, queries, recovered, after_schema, findings, works, index, drops, merges):
    L = ["# Research ledger (PRISMA-style, per lane)", "",
         "Counts are produced by `tools/reduce.py` from lane files and the reducer's own re-fetch. "
         "'Supported' means at least one quote verified outside the abstract.", ""]
    thin = []
    for lane in LANES:
        mine = [f for f in findings if f["lane"] == lane]
        submitted = [f for f in after_schema if f["lane"] == lane]
        keys = {source_key(f["source"]) for f in submitted}
        fetched = {source_key(f["source"]) for f in mine
                   if any(index.get(u, {}).get("text_path") for u in fetch_targets(f["source"]))}
        rep = Counter(re.sub(r"^section:.*", "section:<name>", f["read_extent_reported"]) for f in mine)
        cap = Counter("located" if isinstance(f["read_extent_capped"], list) else f["read_extent_capped"] for f in mine)
        qs = [q for f in mine for q in f["quotes"]]
        excl = Counter(s for s, fid, _ in drops if fid.startswith(lane))
        per_q = {f"{lane}-Q{i}": sum(f["support"] == "supported" for f in mine if f["question_id"] == f"{lane}-Q{i}")
                 for i in range(1, QUESTIONS[lane] + 1)}
        lane_thin = [q for q, c in per_q.items() if c == 0]
        thin += lane_thin
        L += [f"## {lane}", "",
              f"- Queries run: {len(queries[lane]) + len(recovered[lane])} ({len(queries[lane])} in the lane's own log"
              f"{f'; {len(recovered[lane])} by aborted runs, recovered from transcripts' if recovered[lane] else ''})",
              f"- Sources found (distinct records after schema check): {len(keys)}",
              f"- Sources fetched by the reducer: {len(fetched)}",
              f"- Read extent as reported: {dict(rep)}; after capping: {dict(cap)}",
              f"- Quotes submitted {len(qs)} / verified {sum(q['verified'] for q in qs)} "
              f"(abstract-only {sum(q.get('in_abstract', False) for q in qs if q['verified'])}) / "
              f"failed {sum(not q['verified'] for q in qs)}",
              f"- Exclusions: {dict(excl) or 'none'}",
              f"- Supported findings per question: {per_q}",
              f"- Thin: {', '.join(lane_thin) if lane_thin else 'no question without a supported finding'}", ""]
    multi = [w for w in works if len(w["finding_ids"]) > 1]
    L += ["## Across lanes", "",
          f"- Works after dedupe: {len(works)}; works cited by more than one finding: {len(multi)}",
          f"- Merges: {len(merges)} (see drop-log.md for each key)",
          f"- Questions with no supported finding: {', '.join(thin) or 'none'}", ""]
    (pack / "ledger.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
