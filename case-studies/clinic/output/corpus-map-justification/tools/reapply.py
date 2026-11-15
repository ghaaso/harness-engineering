"""Deterministic branch evaluator for the re-application of the revised design.

Plan: 08-reapply/plan.md, amended by plan-amendment-1.md.
Usage: python reapply.py --workdir W
Agents read the text. This script only applies the revised design's rules (ID-3, ID-8, ID-12, KM-9, KM-17,
GM-4, DR-3 to DR-6) to their records, for reading variants V0 (as read), V1 (+ verifier corrections) and V2
(+ reclassification + check). Each variant is computed with and without borderline records.
Writes 08-reapply/results.json and results.md.
"""
import argparse
import itertools
import json
import pathlib
import posixpath
import re
import urllib.parse
from collections import Counter, deque

FILES = ["docs/clinic-planning-brief.md", "docs/technical-plan/decision-log.md",
         "docs/technical-plan/architecture.md", "docs/technical-plan/README.md"]
SHORT = dict(zip(FILES, ["brief", "decision-log", "architecture", "README"]))
BRIEF, DLOG, READ = FILES[0], FILES[1], FILES[3]
KEEP = {"not", "no", "never", "cannot", "can't", "don't", "doesn't", "won't", "may", "might", "could",
        "should", "must", "would", "can", "will", "shall", "only", "if", "unless", "without", "except"}
EVIDENCE_LABEL = "evidence / consequence"
CYCLE_BUDGET = 200_000                      # path-expansion cap for DR-5 analysis; hitting it is reported, never silent
LAYERS = {"V0": [], "V1": ["corrections"], "V2": ["corrections", "reclass", "reclass-check"]}


def ws(s):
    return " ".join(str(s or "").split())


def span(lines):
    nums = [int(n) for n in re.findall(r"\d+", str(lines))] or [0]
    return min(nums), max(nums)


def slug(text):
    return re.sub(r"[^\w\- ]", "", ws(text).lower()).replace(" ", "-")


def fold_token(t):
    if t in KEEP:
        return t
    for suf, rep, minlen in (("ies", "y", 5), ("ied", "y", 4), ("sses", "ss", 5)):
        if t.endswith(suf) and len(t) >= minlen:
            return t[: -len(suf)] + rep
    if re.search(r"(s|x|z|ch|sh)es$", t):
        return t[:-2]
    if t.endswith("s") and not re.search(r"[sui]s$", t) and len(t) > 3:
        return t[:-1]
    if t.endswith("ed") and len(t) > 4:
        return t[:-2]
    if t.endswith("ing") and len(t) > 5:
        return t[:-3]
    return t


def fold(label):
    return " ".join(fold_token(t) for t in re.findall(r"[\w'’]+|[^\w\s]", ws(label).casefold()))


def expand_mentions(text):
    """Names an expression mentions, for reporting only (never identity)."""
    out = set()
    for m in re.finditer(r"\b([A-Za-z]+-?)(\d+)((?:/\d+)+)", text):
        prefix, nums = m.group(1), [m.group(2)] + m.group(3).strip("/").split("/")
        out |= {f"{prefix}{n.zfill(len(m.group(2)))}" for n in nums}
    for m in re.finditer(r"\b([A-Za-z]+-)(\d+)\s*[–\-]\s*(\d+)\b", text):
        a, b = int(m.group(2)), int(m.group(3))
        if 0 <= b - a <= 50:
            out |= {f"{m.group(1)}{str(n).zfill(len(m.group(2)))}" for n in range(a, b + 1)}
    return out


def load_records(W, variant):
    recs = []
    for p in sorted((W / "08-reapply" / "read").glob("*.jsonl")):
        recs += [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_id = {r["item_id"]: r for r in recs}
    order = [r["item_id"] for r in recs]
    for layer in LAYERS[variant]:
        for p in sorted((W / "08-reapply" / "verify").glob(f"*.{layer}.jsonl")):
            for l in p.read_text(encoding="utf-8").splitlines():
                if not l.strip():
                    continue
                c = json.loads(l)
                if c["op"] == "drop":
                    by_id.pop(c["item_id"], None)
                elif c["op"] == "replace":
                    by_id[c["item_id"]] = c["item"]
                    if c["item_id"] not in order:
                        order.append(c["item_id"])
                elif c["op"] == "add":
                    by_id[c["item"]["item_id"]] = c["item"]
                    order.append(c["item"]["item_id"])
    recs = [by_id[i] for i in dict.fromkeys(order) if i in by_id]
    rank = {f: i for i, f in enumerate(FILES)}
    recs.sort(key=lambda r: (rank.get(r.get("file"), 9), span(r.get("lines"))[0]))
    return recs


class Model:
    def __init__(self, recs, s2=None, wholefile_to_h1=False):
        self.recs, self.s2, self.wf = recs, s2, wholefile_to_h1
        self._s3, self._splits, self._memo = {}, {}, {}
        self.edges = [r for r in recs if r.get("type") == "edge"]
        self.intros = [r for r in recs if r.get("type") == "intro"]
        self.ids = [r for r in recs if r.get("type") == "identity"]
        self.reldefs = [r for r in recs if r.get("type") == "reldef"]
        self.heading, self.first_heading, self.nodes = {}, {}, {}
        for i in self.intros:
            if i.get("intro_kind") == "heading":
                self.heading.setdefault((i["file"], slug(i.get("name") or i["quote"])), "R:" + i["item_id"])
                self.first_heading.setdefault(i["file"], "R:" + i["item_id"])
            if i.get("intro_kind") == "node-declaration" and i.get("node_id"):
                self.nodes[(i["file"], i.get("block_id"), ws(i["node_id"]))] = "R:" + i["item_id"]

    def set_overlay(self, s3, splits):
        """Analyst overlay for L3: S3 resolutions keyed by expression, and analyst item splits."""
        self._s3, self._splits, self._memo = s3, splits, {}

    def key(self, e):
        return (e.get("file"), span(e.get("lines"))[0], ws(e.get("quote")), e.get("overlay_item"))

    def slot(self, edge, slot, level):
        """Slot expressions; at L3 an analyst split replaces an expression by its item expressions."""
        out = []
        for x in edge.get(slot) or []:
            out += self._splits.get(self.key(x), [x]) if level == "L3" else [x]
        return out

    def resolve(self, e, level):
        k = (self.key(e), e.get("type"), e.get("link_target"), e.get("block_id"), level)
        if k not in self._memo:
            self._memo[k] = self._resolve(e, level)
        return self._memo[k]

    def _resolve(self, e, level):
        """-> (referents, reason, external). ID-8: a resolved expression has exactly one referent."""
        if e.get("type") == "clause":
            return ["C:" + "|".join(map(str, self.key(e)))], "clause", False
        if level == "L3" and self.key(e) in self._s3:
            return [self._s3[self.key(e)]], "S3 analyst hop", False
        tgt = e.get("link_target")
        if tgt:
            path, _, anchor = urllib.parse.unquote(tgt).partition("#")
            rp = posixpath.normpath(posixpath.join(posixpath.dirname(e["file"]), path)) if path else e["file"]
            if rp not in FILES:
                return [], "external link", True
            if not anchor:
                if self.wf and rp in self.first_heading:
                    return [self.first_heading[rp]], "whole-file link (sensitivity: first heading)", False
                return [], "whole-file link", False
            r = self.heading.get((rp, anchor.lower()))
            return ([r], "definition link", False) if r else ([], "anchor not found", False)
        text = ws(e.get("quote"))
        if e.get("block_id"):
            r = self.nodes.get((e["file"], e["block_id"], re.split(r"[\[\(\{>]", text)[0].strip()))
            if r:
                return [r], "declared identifier", False
        s, t = span(e.get("lines"))
        hits = ["R:" + i["item_id"] for i in self.intros
                if i["file"] == e["file"] and span(i.get("lines"))[0] <= t and s <= span(i.get("lines"))[1]
                and ws(i.get("name")) == text]
        if len(hits) == 1:
            return hits, "introducing span", False
        for idr in self.ids:
            if idr.get("file") == e["file"] and text in (ws(idr["b"].get("quote")), ws(idr["a"].get("quote"))):
                refs, _, _ = self.resolve(idr["a"], level)
                if refs:
                    return refs, "explicit identity statement", False
        return [], "no resolution statement", False

    def props(self, edge):
        p = {"direction": None, "consequence": None, "walkable": None, "source": None}
        for d in self.reldefs:
            if d.get("file") == edge["file"] and ws(edge.get("label")).lower() in [ws(x).lower() for x in d.get("labels", [])]:
                for k, v in (d.get("fixes") or {}).items():
                    if v is not None and p.get(k) is None:
                        p[k], p["source"] = v, "S1 " + d["item_id"]
        if self.s2 and ws(edge.get("label")).lower() == EVIDENCE_LABEL:
            sense = self.s2["assign"].get(edge["item_id"])
            if sense in self.s2["senses"]:
                for k in ("direction", "consequence", "walkable"):
                    v = self.s2["senses"][sense].get(k)
                    if p[k] is None and v:
                        p[k], p["source"] = v, f"S2-B1 sense {sense}"
        return p

    def state(self, edge):
        """walkable | terminal (walkable = no) | inert (KM-9)"""
        p = self.props(edge)
        if p["walkable"] == "yes" and p["direction"] in ("toward_arg2", "toward_arg1"):
            return "walkable", p
        if p["walkable"] == "no":
            return "terminal", p
        return "inert", p

    def gaps(self, level):
        """GM-4 (revised): (a) absent slot, or an expression that does not resolve -> dangling endpoint."""
        out = []
        for e in self.edges:
            for s in ("arg1", "arg2"):
                exprs = self.slot(e, s, level)
                if not exprs:
                    out.append({"edge": e["item_id"], "file": e["file"], "slot": s, "role": "dangling endpoint",
                                "why": "absent", "external": False, "expr": None})
                    continue
                for x in exprs:
                    refs, why, ext = self.resolve(x, level)
                    if not refs:
                        out.append({"edge": e["item_id"], "file": e["file"], "slot": s, "role": "dangling endpoint",
                                    "why": why, "external": ext, "expr": ws(x.get("quote"))})
                        break
        return out

    def refs_in(self, e, s, level):
        return [r for x in self.slot(e, s, level) for r in self.resolve(x, level)[0]]

    def answer(self, start, names, level, query, gaps_by_edge):
        """DR-3/DR-4/DR-5/DR-6: walk from start along walkable edges in the query direction, continuing from
        every reached referent on simple paths; report hops, terminal hops, unresolved vocabulary and gaps."""
        hops, terminal, inert, gaps = [], [], [], []
        dist, preds = {start: 0}, {start: []}          # minimum distance; ALL hops into each referent (DR-6)
        q = deque([start])
        while q:
            ref = q.popleft()
            for e in self.edges:
                st, p = self.state(e)
                a1, a2 = self.refs_in(e, "arg1", level), self.refs_in(e, "arg2", level)
                if ref not in a1 + a2:
                    continue
                if st == "inert":
                    inert.append({"edge": e["item_id"], "label": e.get("label"), "at": ref, "distance": dist[ref],
                                  "missing": [k for k in ("direction", "walkable") if not p.get(k)]})
                    gaps += [dict(g, distance=dist[ref]) for g in gaps_by_edge.get(e["item_id"], [])]
                    continue
                found, dep = ("arg2", "arg1") if p["direction"] == "toward_arg2" else ("arg1", "arg2")
                frm, to = (found, dep) if query == "stands_on" else (dep, found)
                if ref not in self.refs_in(e, frm, level):
                    continue
                targets = self.refs_in(e, to, level)
                gaps += [dict(g, distance=dist[ref] + 1) for g in gaps_by_edge.get(e["item_id"], [])]
                if st == "terminal":
                    terminal.append({"edge": e["item_id"], "label": e.get("label"), "at": ref, "distance": dist[ref] + 1})
                    continue
                hop = {"hop_id": f"H{len(hops) + 1}", "edge": e["item_id"], "label": e.get("label"), "from": ref,
                       "to": targets or ["(unresolved)"], "distance": dist[ref] + 1,
                       "property_source": p["source"],
                       "resolution": [{"slot": s, "expr": ws(x.get("quote")), "via": self.resolve(x, level)[1]}
                                      for s in (frm, to) for x in self.slot(e, s, level)],   # DR-8: analyst hops labelled
                       "cycles": []}
                for t in targets:
                    if t not in dist:                     # first reach: record minimum distance and walk on from it
                        dist[t] = dist[ref] + 1
                        q.append(t)
                    preds.setdefault(t, []).append(hop["hop_id"])   # converging routes are kept, not discarded
                hops.append(hop)
        # DR-5 is per path: a hop closes a cycle on a simple path from start that already contains its target.
        # Evaluated over the simple paths themselves; converging routes are not cycles.
        out = {}
        for h in hops:
            for t in h["to"]:
                if t != "(unresolved)":
                    out.setdefault(h["from"], []).append((h, t))
        stats, budget, truncated = {}, [CYCLE_BUDGET], False

        def dfs(path):
            for h, t in out.get(path[-1], []):
                budget[0] -= 1
                if budget[0] < 0:
                    raise OverflowError
                s = stats.setdefault((h["hop_id"], t), {"paths": 0, "cycle_paths": 0, "first": None, "example": None})
                s["paths"] += 1
                if t in path:
                    s["cycle_paths"] += 1
                    if s["first"] is None or path.index(t) < s["first"]:
                        s["first"], s["example"] = path.index(t), list(path)
                else:
                    dfs(path + [t])

        try:
            dfs([start])
        except OverflowError:
            truncated = True
        for h in hops:
            h["predecessors"] = list(preds.get(h["from"], []))
            for t in h["to"]:
                s = stats.get((h["hop_id"], t))
                if s and s["cycle_paths"]:
                    h["cycles"].append({"referent": t, "first_distance": s["first"], "this_distance": len(s["example"]),
                                        "closes_cycle_on": "every path reaching this hop" if s["cycle_paths"] == s["paths"]
                                        else f"{s['cycle_paths']} of {s['paths']} paths reaching this hop",
                                        "example_path": s["example"] + [t]})
        detail = {"hops": hops, "terminal": terminal, "unresolved_vocabulary": inert, "gaps": gaps,
                  "predecessors_by_referent": preds,
                  "cycle_analysis": "truncated at budget; cycle annotations incomplete" if truncated else "complete"}
        if any(t not in ("(unresolved)", start) for h in hops for t in h["to"]):
            return "chain", detail
        if any(h["cycles"] for h in hops):
            return "cycle only", detail
        if hops:
            return "walkable hop to unresolved endpoint", detail
        if terminal:
            return "terminal only", detail
        if inert:
            return "unresolved vocabulary", detail
        mentions = []
        for r in self.recs:
            if r.get("type") not in ("edge", "untyped"):
                continue
            for x, is_expr in [(r, False)] + [(x, True) for s in ("arg1", "arg2") for x in (r.get(s) or [])]:
                t = ws(x.get("quote"))
                if not any(n in t or n in expand_mentions(t) for n in names if n):
                    continue
                if is_expr and start in self.resolve(x, level)[0]:
                    continue
                mentions.append({"item": r["item_id"], "file": r["file"], "lines": x.get("lines", r.get("lines")),
                                 "text": t[:120], "method": "containment / list expansion (reporting only)"})
        detail["mentions"] = mentions
        return ("unresolved mentions", detail) if mentions else ("empty", detail)


def simple_paths(detail, start, target=None, max_len=None):
    """DR-6 path query over an answer's hop set: every simple path (no referent twice) from start, ending at
    target if given, of at most max_len hops. Paths are lists of hop ids."""
    out_hops = {}
    for h in detail["hops"]:
        for t in h["to"]:
            if t != "(unresolved)":
                out_hops.setdefault(h["from"], []).append((h["hop_id"], t))
    paths = []

    def dfs(node, visited, path):
        if path and (target is None or node == target):
            paths.append(list(path))
        if max_len is not None and len(path) >= max_len:
            return
        for hop_id, t in out_hops.get(node, []):
            if t not in visited:
                dfs(t, visited | {t}, path + [hop_id])

    dfs(start, {start}, [])
    return paths


RECORDS_FOR_CHOICE = {"set": ["S3-SET"], "two": ["S3-SPLIT", "S3-ITEM1", "S3-ITEM2"]}


def overlay(m, slash, a11):
    """Branch choices mapped to their S3 records (spec: choices are not records)."""
    return overlay_records(m, set(RECORDS_FOR_CHOICE.get(slash, []) + (["S3-A11"] if a11 else [])))


def overlay_records(m, records):
    """Analyst identity overlay for L3 built from individual S3 records, per plan-amendment-1 A2: one referent per
    expression. Items exist only after S3-SPLIT; S3-CREATE-* records are added (and counted) when an item's brief
    target has no surviving introduction."""
    s3, splits, decisions = {}, {}, []
    row = [e for e in m.edges if e["file"] == DLOG and ws((e.get("table") or {}).get("row_key")) == "A11"]
    exprs = [x for e in row for s in ("arg1", "arg2") for x in (e.get(s) or [])]
    if "S3-A11" in records:
        keys = [m.key(x) for x in exprs if ws(x.get("quote")) == "A11"]
        for k in keys:
            s3[k] = "S3:A11"
        decisions.append({"id": "S3-A11", "value": "creates a referent for the row key 'A11' (ID-2 c)", "expressions": len(keys)})
    slash_x = [x for x in exprs if ws(x.get("quote")) == "USER-04/05"]
    if "S3-SET" in records:
        for x in slash_x:
            s3[m.key(x)] = "S3:set USER-04/05"
        decisions.append({"id": "S3-SET", "value": "'USER-04/05' denotes one set; its members are not 'same' as brief IDs (ID-5)"})
    if "S3-SPLIT" in records:
        targets = {}
        for name, rec in (("USER-04", "S3-ITEM1"), ("USER-05", "S3-ITEM2")):
            if rec not in records:
                continue
            cand = [x for e in m.edges if e["file"] == BRIEF for s in ("arg1", "arg2") for x in (e.get(s) or [])
                    if ws(x.get("quote")) == name]
            refs = sorted({r for x in cand for r in m.resolve(x, "L2")[0]})
            targets[name] = refs[0] if refs else f"S3:{name}"
            if not refs:                              # no introducing statement survives: an extra analyst decision
                for x in cand:
                    s3[m.key(x)] = targets[name]
                decisions.append({"id": f"S3-CREATE-{name}",
                                  "value": f"creates an ungrounded referent for the brief's '{name}' (ID-2 c), because no "
                                           "introducing statement for it is in this reading; textual grounding is lost",
                                  "expressions": len(cand)})
        for x in slash_x:
            items = [dict(x, quote="USER-04", overlay_item=1, note="analyst split item (B2t), not in the plan map"),
                     dict(x, quote="05", overlay_item=2, note="analyst split item (B2t), not in the plan map")]
            splits[m.key(x)] = items
            if "USER-04" in targets:
                s3[m.key(items[0])] = targets["USER-04"]
            if "USER-05" in targets:
                s3[m.key(items[1])] = targets["USER-05"]
        decisions.append({"id": "S3-SPLIT", "value": "'USER-04/05' names two items, recorded as overlay sub-expressions"})
        decisions += [{"id": rec, "value": f"item {i} same as the brief's {name}"}
                      for i, (name, rec) in enumerate((("USER-04", "S3-ITEM1"), ("USER-05", "S3-ITEM2")), 1) if rec in records]
    m.set_overlay(s3, splits)
    return decisions


def hop1(m, level):
    """Reverse query from the brief's USER-04 (P1); connected when a walkable hop reaches a referent anchored
    in the decision-log A11 row (P2)."""
    p1 = [x for e in m.edges if e["file"] == BRIEF for s in ("arg1", "arg2") for x in (e.get(s) or [])
          if ws(x.get("quote")) == "USER-04"]
    p1refs = {r for x in p1 for r in m.resolve(x, level)[0]}
    row = [e for e in m.edges if e["file"] == DLOG and ws((e.get("table") or {}).get("row_key")) == "A11"
           and any(ws(x.get("quote")) == "USER-04/05" for s in ("arg1", "arg2") for x in (e.get(s) or []))]
    if not row:
        return {"connected": False, "blockers": ["no edge in the A11 row has 'USER-04/05' in a slot"]}
    blockers, connected = set(), False
    for e in row:
        st, p = m.state(e)
        found = next(s for s in ("arg1", "arg2") if any(ws(x.get("quote")) == "USER-04/05" for x in (e.get(s) or [])))
        dep = "arg1" if found == "arg2" else "arg2"
        b = []
        if st != "walkable":
            b.append(f"kind {st} (properties from: {p['source'] or 'none'})")
        elif p["direction"] != ("toward_arg2" if found == "arg2" else "toward_arg1"):
            b.append(f"direction {p['direction']} makes 'USER-04/05' the dependent")
        if not p1refs:
            b.append("brief 'USER-04' has no referent")
        elif not (set(m.refs_in(e, found, level)) & p1refs):
            b.append("no expression in the 'USER-04/05' slot resolves to the brief's USER-04")
        if not m.refs_in(e, dep, level):
            b.append("dependent 'A11' does not resolve")
        if b:
            blockers |= {f"[{e['item_id']}] {x}" for x in b}
        else:
            connected = True
    return {"connected": connected, "blockers": [] if connected else sorted(blockers)}


def compute(recs, s2, s2meta):
    base = Model(recs)
    res = {"records": dict(Counter(r.get("type") for r in recs)), "borderline_records": sum(bool(r.get("borderline")) for r in recs)}
    res["C1_edges"] = {SHORT[f]: dict(Counter(e.get("cue_class") for e in base.edges if e["file"] == f)) for f in FILES}
    res["C1_edge_totals"] = {SHORT[f]: sum(e["file"] == f for e in base.edges) for f in FILES}
    res["C1_untyped"] = {SHORT[f]: sum(r.get("type") == "untyped" and r["file"] == f for r in recs) for f in FILES}
    res["C1_header_not_cue"] = {SHORT[f]: sum(r.get("type") == "header-not-cue" and r["file"] == f for r in recs) for f in FILES}
    for mode, fn in (("raw", ws), ("folded", fold)):
        seen, per, groups = set(), Counter(), {}
        for e in base.edges:
            k = fn(e.get("label"))
            groups.setdefault(k, set()).add(ws(e.get("label")))
            if k not in seen:
                seen.add(k)
                per[SHORT[e["file"]]] += 1
        defined = {fn(l) for d in base.reldefs for l in d.get("labels", [])
                   if all((d.get("fixes") or {}).get(k) for k in ("direction", "consequence", "walkable"))}
        res[f"C2_{mode}"] = {"new_per_file": {SHORT[f]: per[SHORT[f]] for f in FILES}, "distinct": len(seen)}
        res[f"C4_labels_needing_properties_{mode}"] = len(seen - defined)
        if mode == "folded":
            res["fold_groups"] = {k: sorted(v) for k, v in groups.items() if len(v) > 1}
    res["C3"] = [{"item": d["item_id"], "labels": d.get("labels"), "fixes": d.get("fixes"), "scope": d.get("scope")}
                 for d in base.reldefs]
    res["decisions_made"] = {"B1 S2 records": 1, "B1 sense assignments": s2meta}
    branches = {}
    for name, use_s2, slash, a11, level in [
            ("B0 plan only", False, None, False, "L1"), ("B0 plan only", False, None, False, "L2"),
            ("B1 evidence walkable", True, None, False, "L2"),
            ("B2s slash = set (+B1)", True, "set", False, "L3"), ("B2t slash = two items (+B1)", True, "two", False, "L3"),
            ("B3 A11 referent (+B1)", True, None, True, "L3"), ("B2t + B3 (+B1)", True, "two", True, "L3")]:
        m = Model(recs, s2=s2 if use_s2 else None)
        decisions = overlay(m, slash, a11)
        g = [] if level == "L1" else m.gaps(level)
        gb = {}
        for x in g:
            gb.setdefault(x["edge"], []).append(x)
        unresolved_occ = {m.key(x) for e in m.edges for s in ("arg1", "arg2")
                          for x in m.slot(e, s, level) if x.get("type") != "clause" and not m.resolve(x, level)[0]}
        unresolved_names = {(k[0], k[2]) for k in unresolved_occ}   # distinct file + text (collapses repeats)
        cls, third, focus = Counter(), {}, {}
        for i in m.intros:
            ref, names = "R:" + i["item_id"], {ws(i.get("name")), ws(i.get("node_id"))} - {""}
            c, detail = m.answer(ref, names, level, "stands_on", gb)
            cls[c] += 1
            if c == "unresolved mentions":
                third[ref] = {"name": ws(i.get("name")), "file": SHORT[i["file"]], "mentions": detail["mentions"]}
            if ws(i.get("name")) in ("USER-04", "USER-05"):
                focus[f"stands on {ws(i.get('name'))} ({ref})"] = {
                    "class": c, **{k: (v[:8] if isinstance(v, list) else v) for k, v in detail.items()}}
        branches[f"{name} {level}"] = {
            "level": level, "analyst_decisions": decisions,
            "dangling_total": len(g), "dangling_by_file": {SHORT[f]: sum(x["file"] == f for x in g) for f in FILES},
            "dangling_absent": sum(x["why"] == "absent" for x in g), "dangling_external": sum(x["external"] for x in g),
            "dangling_wholefile_links": sum(x["why"] == "whole-file link" for x in g),
            "unresolved_name_expressions": {SHORT[f]: sum(k[0] == f for k in unresolved_names) for f in FILES},
            "unresolved_name_occurrences": {SHORT[f]: sum(k[0] == f for k in unresolved_occ) for f in FILES},
            "walkable_edges": sum(m.state(e)[0] == "walkable" for e in m.edges),
            "stands_on_classes": dict(cls), "third_result": third, "focus": focus,
            "readme_see_ops_gap": [x for x in g if x["file"] == READ and "operations-and-costs" in str(x.get("expr"))],
        }
    branches["B0 plan only L2"]["sensitivity_wholefile_links_to_first_heading"] = len(Model(recs, wholefile_to_h1=True).gaps("L2"))
    res["branches"] = branches
    grid = []
    for walk, slash, a11 in itertools.product([False, True], [None, "set", "two"], [False, True]):
        m = Model(recs, s2=s2 if walk else None)
        decisions = overlay(m, slash, a11)
        level = "L3" if (slash or a11) else "L2"
        grid.append({"walkable": walk, "slash": slash or "cannot tell", "A11_referent": a11, "level": level,
                     "analyst_decisions": (["S2-B1"] if walk else []) + [d["id"] for d in decisions], **hop1(m, level)})
    res["hop1_grid"] = grid
    return res


def render(out, W, s2raw, coverage):
    """results.md, generated from results.json only."""
    T = lambda d: ", ".join(f"{k} {v}" for k, v in d.items())
    L = ["# Re-application results", "",
         "Generated by `tools/reapply.py` from the readings and correction layers. Plan: [plan.md](plan.md), "
         "amended by [plan-amendment-1.md](plan-amendment-1.md). **V2 is the result.** V0 and V1 are the restricted "
         "readings (closed RP-3 word list, a rule error) and are kept only to show what that restriction did.", "",
         "## Reading variants at a glance", "",
         "| Variant | Edges | Untyped | Header not cue | Labels needing properties (raw / folded) | Dangling, B0 L2 | Hop 1 connected in |",
         "| --- | --- | --- | --- | --- | --- | --- |"]
    for k, r in out.items():
        cells = [f"walk={g['walkable']}, slash={g['slash']}, A11={g['A11_referent']}" for g in r["hop1_grid"] if g["connected"]]
        L.append(f"| {k} | {sum(r['C1_edge_totals'].values())} | {sum(r['C1_untyped'].values())} | "
                 f"{sum(r['C1_header_not_cue'].values())} | {r['C4_labels_needing_properties_raw']} / "
                 f"{r['C4_labels_needing_properties_folded']} | {r['branches']['B0 plan only L2']['dangling_total']} | "
                 f"{'; '.join(cells) or 'none'} |")
    for k in ("V2 with borderline", "V2 without borderline"):
        r = out[k]
        L += ["", f"## {k}", "", "### C1: edges by cue class, untyped cues, headers judged not cues", "",
              "| File | Edges by cue class | Edges | Untyped (RP-8) | Header not cue |", "| --- | --- | --- | --- | --- |"]
        for f in SHORT.values():
            L.append(f"| {f} | {T(r['C1_edges'][f])} | {r['C1_edge_totals'][f]} | {r['C1_untyped'][f]} | {r['C1_header_not_cue'][f]} |")
        L += ["", "### C2 to C4: labels (folding is a count, not a merge; negation and hedges are not folded)", "",
              "| | New labels per file, in reading order | Distinct labels | Labels needing properties |",
              "| --- | --- | --- | --- |",
              f"| raw (whitespace only) | {T(r['C2_raw']['new_per_file'])} | {r['C2_raw']['distinct']} | {r['C4_labels_needing_properties_raw']} |",
              f"| folded (case + inflection) | {T(r['C2_folded']['new_per_file'])} | {r['C2_folded']['distinct']} | {r['C4_labels_needing_properties_folded']} |",
              "", f"Decisions actually made: {r['decisions_made']}. Labels needing properties is not a decision count "
              "(one merge record can cover several labels).", "",
              f"C3, text relation definitions: {r['C3'] or 'none'}", "",
              f"Fold groups ({len(r['fold_groups'])}): " + "; ".join(" = ".join(v) for v in r["fold_groups"].values()), "",
              "### Branches", "",
              "| Branch | Walkable edges | Dangling (absent / external / whole-file link) | Dangling by file | Unresolved names: distinct file+text / occurrences | 'Stands on' answer classes |",
              "| --- | --- | --- | --- | --- | --- |"]
        for name, b in r["branches"].items():
            L.append(f"| {name} | {b['walkable_edges']} | {b['dangling_total']} ({b['dangling_absent']} / {b['dangling_external']} / "
                     f"{b['dangling_wholefile_links']}) | {T(b['dangling_by_file'])} | "
                     f"{sum(b['unresolved_name_expressions'].values())} / {sum(b['unresolved_name_occurrences'].values())} | "
                     f"{T(b['stands_on_classes'])} |")
        b0 = r["branches"]["B0 plan only L2"]
        L += ["", f"Sensitivity, B0 L2: if whole-file links resolved to the target file's first heading, dangling would be "
                  f"{b0['sensitivity_wholefile_links_to_first_heading']}.", "",
              "README 'See [operations and costs]' (the frozen gap's relation-shaped part), B0 L2: "
              + ("; ".join(f"{g['edge']} {g['slot']} {g['why']}" for g in b0["readme_see_ops_gap"]) or "not produced"), "",
              "### Hop 1 grid (USER-04 -> A11)", "",
              "| Walkable (B1) | USER-04/05 | A11 referent | Level | Analyst decisions used | Connected | Blockers |",
              "| --- | --- | --- | --- | --- | --- | --- |"]
        for g in r["hop1_grid"]:
            L.append(f"| {g['walkable']} | {g['slash']} | {g['A11_referent']} | {g['level']} | "
                     f"{', '.join(g['analyst_decisions']) or 'none'} | {g['connected']} | {'<br>'.join(g['blockers']) or '-'} |")
        L += ["", "### 'Stands on' answers for USER-04 and USER-05", ""]
        for name, b in r["branches"].items():
            for q, a in b["focus"].items():
                L.append(f"- {name}, {q}: **{a['class']}**; hops {len(a.get('hops', []))}, terminal {len(a.get('terminal', []))}, "
                         f"unresolved vocabulary {len(a.get('unresolved_vocabulary', []))}, gaps {len(a.get('gaps', []))}"
                         + (f", mentions {len(a['mentions'])}" if a.get("mentions") else ""))
        L += ["", "### Third result: 'stands on' answers with unresolved mentions (B0 L2)", ""]
        for ref, t in b0["third_result"].items():
            esc = lambda s: s.replace("[", "\\[").replace("]", "\\]")    # quoted pilot links display literally
            L.append(f"- {t['name']} ({t['file']}): " + "; ".join(f"{m['item']} line {m['lines']}: \"{esc(m['text'])}\"" for m in t["mentions"][:6])
                     + (f"; ... {len(t['mentions']) - 6} more" if len(t["mentions"]) > 6 else ""))
        if not b0["third_result"]:
            L.append("- none")
    L += ["", "## B1 codebook record (analyst, S2)", "",
          f"Sense 1 'Evidence': direction {s2raw['senses']['1'].get('direction')}, walkable yes, consequence unset. "
          f"Justification: {ws(s2raw['senses']['1'].get('justification'))}", "",
          f"Assignments: {dict(Counter(a['sense'] for a in s2raw['assignments']))}.", "",
          "## Coverage tally (not a gap role; completes no chain)", ""]
    for req in coverage.get("requirements", []):
        items = req.get("items", [])
        miss = [i["item"] for i in items if i["status"] != "supplied"]
        L.append(f"- {SHORT.get(req['file'], req['file'])} line {req['lines']}: {len(items) - len(miss)} of {len(items)} named items supplied"
                 + (f"; not supplied in the four files: {', '.join(miss)}" if miss else ""))
    (W / "08-reapply" / "results.md").write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", required=True)
    W = pathlib.Path(ap.parse_args().workdir)
    s2raw = json.loads((W / "08-reapply/overlay/B1-S2.json").read_text(encoding="utf-8"))
    s2 = {"senses": s2raw["senses"], "assign": {a["item_id"]: a["sense"] for a in s2raw["assignments"]}}
    s2meta = dict(Counter(a["sense"] for a in s2raw["assignments"]))
    out = {}
    for variant in ("V0", "V1", "V2"):
        recs = load_records(W, variant)
        for bl in (True, False):
            out[f"{variant} {'with' if bl else 'without'} borderline"] = compute(
                [r for r in recs if bl or not r.get("borderline")], s2, s2meta)
    (W / "08-reapply" / "results.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    cov_path = W / "08-reapply/overlay/coverage.json"
    coverage = json.loads(cov_path.read_text(encoding="utf-8")) if cov_path.exists() else {}
    render(out, W, s2raw, coverage)
    for k, r in out.items():
        cells = [f"{g['walkable']}/{g['slash']}/{g['A11_referent']}" for g in r["hop1_grid"] if g["connected"]]
        print(f"{k}: edges={sum(r['C1_edge_totals'].values())} untyped={sum(r['C1_untyped'].values())} "
              f"labels raw/folded={r['C4_labels_needing_properties_raw']}/{r['C4_labels_needing_properties_folded']} "
              f"dangling L2 B0={r['branches']['B0 plan only L2']['dangling_total']} hop1 connected in: {cells or 'none'}")


if __name__ == "__main__":
    main()
