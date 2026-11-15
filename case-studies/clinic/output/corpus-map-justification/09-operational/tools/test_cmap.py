"""Mechanism tests for cmap (SYNTHETIC corpora built in a temporary directory; not evidence of real-corpus performance).

Run: python -I -B test_cmap.py
Covers MC-3 (ID-8 with zero, one and several reachable referents; S3 affects only L3), pagination that never splits a
sibling group, stale-record handling, and refresh preservation/invalidation (the MC-1 mechanism on a toy corpus).
"""
import contextlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import cmap  # noqa: E402

DOC_A = """# Alpha plan

## Overview

The alpha engine depends on the [beta module](b.md#beta-module) and on the Gamma store.

| ID | Needs |
| --- | --- |
| K-01 | K-02 |
| K-02 | warm oven |

## Notes

Gamma store is mentioned again here.
"""

DOC_B = """# Beta file

## Beta module

The beta module requires calibrated scales, clean trays and labelled bins.
"""


def run(*argv):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        cmap.main(list(argv))
    return buf.getvalue()


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="cmap-test-"))
        self.corpus = self.tmp / "corpus"
        self.corpus.mkdir()
        (self.corpus / "a.md").write_text(DOC_A, encoding="utf-8")
        (self.corpus / "b.md").write_text(DOC_B, encoding="utf-8")
        self.store = self.tmp / "store"
        run("init", "--store", str(self.store), "--corpus", str(self.corpus))
        st = cmap.Store(self.store)
        self.cid = {c["file"]: c["id"] for c in st.chunks.values()}
        recs_a = [
            {"type": "edge", "lines": "5", "quote": "The alpha engine depends on the [beta module](b.md#beta-module) and on the Gamma store",
             "label": "depends on", "cue_class": "relation-phrase", "arg1": [{"quote": "The alpha engine", "lines": "5"}],
             "arg2": [{"quote": "[beta module](b.md#beta-module)", "lines": "5"}, {"quote": "the Gamma store", "lines": "5"}], "split": True},
            {"type": "header", "lines": "7", "quote": "Needs", "column": 1, "cue": True},
            {"type": "edge", "lines": "9", "quote": "K-02", "label": "Needs", "cue_class": "table-header",
             "table": {"header_line": 7, "column": 1, "row_key": "K-01"}, "arg1": [{"quote": "K-01", "lines": "9"}],
             "arg2": [{"quote": "K-02", "lines": "9"}]},
            {"type": "edge", "lines": "10", "quote": "warm oven", "label": "Needs", "cue_class": "table-header",
             "table": {"header_line": 7, "column": 1, "row_key": "K-02"}, "arg1": [{"quote": "K-02", "lines": "10"}],
             "arg2": [{"quote": "warm oven", "lines": "10"}]},
            {"type": "edge", "lines": "14", "quote": "Gamma store is mentioned again here", "label": "is mentioned", "cue_class": "other",
             "arg1": [{"quote": "Gamma store", "lines": "14"}], "arg2": []},
        ]
        recs_b = [
            {"type": "edge", "lines": "5", "quote": "The beta module requires calibrated scales, clean trays and labelled bins",
             "label": "requires", "cue_class": "relation-phrase", "arg1": [{"quote": "The beta module", "lines": "5"}],
             "arg2": [{"quote": "calibrated scales", "lines": "5"}, {"quote": "clean trays", "lines": "5"}, {"quote": "labelled bins", "lines": "5"}],
             "joint": True},
        ]
        for path, recs in (("a.md", recs_a), ("b.md", recs_b)):
            f = self.tmp / f"{path}.jsonl"
            f.write_text("".join(json.dumps(r) + "\n" for r in recs), encoding="utf-8")
            chunk = [c for c in cmap.Store(self.store).chunks.values() if c["file"] == path]
            self.assertEqual(len(chunk), 1)
            out = run("ingest", "--store", str(self.store), "--chunk", chunk[0]["id"], "--file", str(f), "--reader", "test")
            self.assertIn("0 rejected", out)
        run("resolve", "--store", str(self.store))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def edge(self, m, label, file="a.md", line=None):
        return next(r for r in m.edges if r["label"] == label and r["file"] == file and (line is None or r["lines"] == str(line)))

    def key(self, rec, slot="arg2", n=0):
        return f"{rec['id']}|{slot}|{n}"


class ID8(Base):
    def test_one_reachable_referent_resolves(self):
        m = cmap.Map(cmap.Store(self.store), "L1")
        e = next(r for r in m.edges if r["label"] == "depends on" and "beta" in r["arg2"][0]["quote"])
        refs, basis, ext, why = m.resolve(e["arg2"][0], self.key(e), "a.md")
        self.assertEqual(len(refs), 1, why)
        self.assertEqual(m.by_id[refs[0]]["name"], "Beta module")

    def test_zero_reachable_referents_unresolved(self):
        m = cmap.Map(cmap.Store(self.store), "L1")
        e = next(r for r in m.edges if r["label"] == "depends on" and "Gamma" in r["arg2"][0]["quote"])
        refs, basis, ext, why = m.resolve(e["arg2"][0], self.key(e), "a.md")
        self.assertEqual(refs, [])
        self.assertEqual(why, "no resolution statement")

    def test_several_reachable_referents_unresolved(self):
        """An S3 'same' decision that points a link-grounded expression at a different referent makes two referents
        reachable at L3: ID-8 says the expression does not resolve (no override)."""
        st = cmap.Store(self.store)
        m1 = cmap.Map(st, "L1")
        e = next(r for r in m1.edges if r["label"] == "depends on" and "beta" in r["arg2"][0]["quote"])
        other = next(i for i in m1.intros if i["name"] == "Overview")
        dec = self.tmp / "s3.jsonl"
        dec.write_text(json.dumps({"value": "same", "referent": other["id"], "members": [self.key(e)],
                                   "spans_in_view": [e["id"]], "rationale": "synthetic conflict"}) + "\n", encoding="utf-8")
        run("decide", "s3", "--store", str(self.store), "--file", str(dec), "--analyst", "test")
        st = cmap.Store(self.store)
        m3 = cmap.Map(st, "L3")
        refs, basis, ext, why = m3.resolve(e["arg2"][0], self.key(e), "a.md")
        self.assertEqual(refs, [])
        self.assertTrue(why.startswith("conflict"), why)
        self.assertEqual(len([b for b in basis if b.get("ref")]), 2)

    def test_s3_affects_only_l3(self):
        st = cmap.Store(self.store)
        m1 = cmap.Map(st, "L1")
        e = next(r for r in m1.edges if r["label"] == "depends on" and "Gamma" in r["arg2"][0]["quote"])
        before = {lv: cmap.Map(cmap.Store(self.store), lv).resolve(e["arg2"][0], self.key(e), "a.md")[0] for lv in ("L1", "L2", "L3")}
        dec = self.tmp / "s3b.jsonl"
        dec.write_text(json.dumps({"value": "same", "referent": None, "members": [self.key(e)], "spans_in_view": [e["id"]],
                                   "rationale": "create a referent for the Gamma store"}) + "\n", encoding="utf-8")
        run("decide", "s3", "--store", str(self.store), "--file", str(dec), "--analyst", "test")
        after = {lv: cmap.Map(cmap.Store(self.store), lv).resolve(e["arg2"][0], self.key(e), "a.md")[0] for lv in ("L1", "L2", "L3")}
        self.assertEqual(before["L1"], after["L1"])
        self.assertEqual(before["L2"], after["L2"])
        self.assertEqual(before["L3"], [])
        self.assertEqual(len(after["L3"]), 1)
        self.assertTrue(after["L3"][0].startswith("S3:"))
        # gap answers at L1/L2 identical with and without the S3 record
        g = lambda lv: cmap.Map(cmap.Store(self.store), lv).gaps({})
        self.assertEqual(len([x for x in g("L2") if x.get("expr") == "the Gamma store"]), 1)
        self.assertEqual(len([x for x in g("L3") if x.get("expr") == "the Gamma store"]), 0)

    def test_equal_strings_are_not_identity(self):
        m = cmap.Map(cmap.Store(self.store), "L3")
        e = next(r for r in m.edges if r["label"] == "is mentioned")
        refs, *_ = m.resolve(e["arg1"][0], self.key(e, "arg1"), "a.md")
        self.assertEqual(refs, [])

    def test_rowkey_span_identity(self):
        m = cmap.Map(cmap.Store(self.store), "L1")
        e = self.edge(m, "Needs", line=9)
        refs, basis, *_ = m.resolve(e["arg1"][0], self.key(e, "arg1"), "a.md")
        self.assertEqual(len(refs), 1)
        self.assertEqual(m.by_id[refs[0]]["intro_kind"], "rowkey")
        k02 = m.resolve(e["arg2"][0], self.key(e), "a.md")[0]
        self.assertEqual(k02, [], "a K-02 mention in another row is not the K-02 row key by string equality")


class Packets(Base):
    def test_split_siblings_and_joint(self):
        m = cmap.Map(cmap.Store(self.store), "L1")
        sib = [r for r in m.edges if r["label"] == "depends on"]
        self.assertEqual(len(sib), 2)
        self.assertEqual(len({r["sibling_group"] for r in sib}), 1)
        joint = self.edge(m, "requires", file="b.md")
        self.assertTrue(joint["joint"])
        self.assertEqual(len(joint["arg2"]), 3)

    def test_pagination_keeps_sibling_groups_whole(self):
        out1 = run("context", "--store", str(self.store), "Overview", "--budget", "300", "--depth", "1")
        self.assertIn("page 1 of", out1)
        pages = int(out1.split("page 1 of ")[1].split()[0])
        seen = []
        for p in range(1, pages + 1):
            out = run("context", "--store", str(self.store), "Overview", "--budget", "300", "--depth", "1", "--page", str(p))
            ids = [l.split("]")[0].strip("[") for l in out.splitlines() if l.startswith("[")]
            seen.append(ids)
        m = cmap.Map(cmap.Store(self.store), "L1")
        group = {r["id"] for r in m.edges if r["label"] == "depends on"}
        holders = [i for i, ids in enumerate(seen) if group & set(ids)]
        self.assertEqual(len(holders), 1, f"sibling group split across pages: {seen}")
        self.assertTrue(group <= set(seen[holders[0]]))

    def test_levels_never_read_candidate_index(self):
        """D1/D8/D9: packets, gaps and chains are identical with the candidate index (S5) deleted."""
        cmds = [("context", "--store", str(self.store), "Overview", "--depth", "2", "--budget", "4000"),
                ("gaps", "--store", str(self.store), "--level", "L2"), ("gaps", "--store", str(self.store), "--level", "L3")]
        before = [run(*c) for c in cmds]
        (self.store / "candidates.jsonl").rename(self.store / "candidates.moved")
        after = [run(*c) for c in cmds]
        self.assertEqual(before, after)

    def test_frontier_and_external(self):
        out = run("context", "--store", str(self.store), "Overview", "--depth", "0", "--budget", "4000")
        self.assertIn("FRONTIER", out)
        self.assertIn("UNRESOLVED", out)


class Refresh(Base):
    def test_change_detection_preservation_and_staleness(self):
        st = cmap.Store(self.store)
        before = {r["id"]: r for r in st.live() if r["file"] == "b.md" and r.get("actor") == "test"}
        # change a.md only: insert two lines at the top of the Notes section (shifts later lines), keep b.md
        new = DOC_A.replace("## Notes\n", "## Notes\n\nAdded line one.\n")
        (self.corpus / "a.md").write_text(new, encoding="utf-8")
        status = run("status", "--store", str(self.store))
        self.assertIn("CHANGED: a.md", status)
        pkt = run("context", "--store", str(self.store), "Overview", "--depth", "1")
        self.assertIn("STALE (file changed since mapping", pkt)
        evidence = [l for l in pkt.splitlines() if l.startswith("[")]
        self.assertFalse([l for l in evidence if " a.md:" in l], "records from a changed file were served as evidence")
        rep = json.loads(run("refresh", "--store", str(self.store)))
        self.assertEqual(rep["changed"], ["a.md"])
        self.assertEqual(rep["unchanged"], 1)
        st = cmap.Store(self.store)
        after = {r["id"]: r for r in st.live() if r["file"] == "b.md" and r.get("actor") == "test"}
        self.assertEqual(before.keys(), after.keys())
        self.assertTrue(all(before[k]["quote"] == after[k]["quote"] and before[k]["lines"] == after[k]["lines"] for k in before))
        self.assertGreaterEqual(len(rep["new_chunks"]), 1)
        self.assertTrue(all(c["status"] in ("read", "unread", "retired") for c in st.chunks.values()))
        status = run("status", "--store", str(self.store))
        self.assertIn("all mapped files current", status)


if __name__ == "__main__":
    unittest.main(verbosity=2)
