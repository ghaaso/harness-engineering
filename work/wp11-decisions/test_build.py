import datetime as dt
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

TODAY = dt.date(2026, 11, 18)


def dec(**over):
    d = {"id": "DX", "question": "q?", "options": ["a", "b"], "recommended": "a", "blocks": ["WP1"],
         "status": "open", "answer": None, "asked_on": "2026-11-17", "source": "some/file.md:1", "waits": []}
    d.update(over)
    return d


class BuildTest(unittest.TestCase):
    def test_over_a_day_flag(self):
        rows = build.open_rows([dec(id="A", asked_on="2026-11-17"), dec(id="B", asked_on="2026-11-16")], TODAY)
        flags = {r["d"]["id"]: (r["days"], r["over"]) for r in rows}
        self.assertEqual(flags, {"A": (1, False), "B": (2, True)})
        self.assertTrue(build.summary(rows).startswith("2 open decisions, 1 over a day"))

    def test_no_source_fails(self):
        for bad in ("", None):
            with self.assertRaisesRegex(ValueError, "no source"):
                build.validate([dec(source=bad)])
        d = dec()
        del d["source"]
        with self.assertRaises(ValueError):
            build.validate([d])

    def test_unknown_status_fails(self):
        with self.assertRaisesRegex(ValueError, "unknown status"):
            build.validate([dec(status="pending")])

    def test_answered_not_flagged(self):
        old = dec(status="answered", answer="yes", asked_on="2026-11-01")
        build.validate([old])
        self.assertEqual(build.open_rows([old], TODAY), [])
        self.assertNotIn("over a day</span>", build.render_html([old], {"runs": []}, TODAY))

    def test_by_package_and_fold(self):
        ds = [dec(id="A", blocks=["WP3a"], asked_on="2026-11-16"), dec(id="B", blocks=["WP3a", "WP13"]),
              dec(id="C", blocks=[], waits=[{"package": "WP9", "from": "2026-11-17", "to": None, "note": "x"}])]
        rows = build.open_rows(ds, TODAY)
        self.assertEqual(build.by_package(rows), [("WP3a", [("B", 1), ("A", 2)]), ("WP13", [("B", 1)])])
        self.assertTrue(build.summary(rows).endswith("1 wait logged"))
        page = build.render_html(ds, {"runs": []}, TODAY)
        self.assertLess(page.index("<details"), page.index('<span class="id">C</span>'))
        self.assertGreater(page.index("<details"), page.index('<span class="id">B</span>'))

    def test_real_files_validate(self):
        here = Path(__file__).resolve().parent
        build.validate(json.loads((here / "decisions.json").read_text(encoding="utf-8"))["decisions"])
        build.validate_queue(json.loads((here / "queue.json").read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
