"""Installer preserves explicit byte budgets and rejects invalid input before mutation."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ADAPTER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ADAPTER))
import install


class InstallBudgetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="context-install-budget-")
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name)
        (self.project / "task.md").write_text("## Next action\nSynthetic task.\n", encoding="utf-8")

    def test_explicit_budgets_are_saved_and_validated(self):
        install.install(self.project, Path(sys.executable), ADAPTER / "ctx.py", "task.md",
                        snapshot_bytes=4096, restore_bytes=4096, recall_bytes=2048)
        config = json.loads((self.project / ".codex/context-system.json").read_text())
        self.assertEqual((config["snapshot_bytes"], config["restore_bytes"], config["recall_bytes"]),
                         (4096, 4096, 2048))
        self.assertTrue(install.doctor(self.project)["ok"])
        config["snapshot_bytes"] = 8192
        (self.project / ".codex/context-system.json").write_text(json.dumps(config))
        self.assertFalse(install.doctor(self.project)["ok"])

    def test_bad_budget_does_not_create_installation(self):
        for options in ({"snapshot_bytes": True}, {"restore_bytes": -1},
                        {"snapshot_bytes": 8192, "restore_bytes": 4096}, {"recall_bytes": "2048"}):
            with self.assertRaises((ValueError, TypeError)):
                install.install(self.project, Path(sys.executable), ADAPTER / "ctx.py", "task.md", **options)
            self.assertFalse((self.project / ".codex").exists())

    def test_legacy_caps_remain_absent(self):
        install.install(self.project, Path(sys.executable), ADAPTER / "ctx.py", "task.md")
        config = json.loads((self.project / ".codex/context-system.json").read_text())
        self.assertNotIn("snapshot_bytes", config)
        self.assertNotIn("restore_bytes", config)
        self.assertEqual(config["snapshot_chars"], 6000)


if __name__ == "__main__":
    unittest.main()
