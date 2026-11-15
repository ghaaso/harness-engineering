"""The evaluation guard denies unknown native tool routes before supported execution."""
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_guard import guard


class GuardTests(unittest.TestCase):
    def test_only_fixture_tools_are_allowed(self):
        for name in ("ReadFixture", "WriteFixture", "RunFixtureCheck", "functions.RecallShow"):
            self.assertEqual(guard({"tool_name": name}), {})

    def test_unknown_names_and_shell_are_denied(self):
        for name in ("Bash", "apply_patch", "mcp__fs__read", "functions.exec", "spawn_agent", "", "x.ReadFixture"):
            self.assertEqual(guard({"tool_name": name})["hookSpecificOutput"]["permissionDecision"], "deny")


if __name__ == "__main__":
    unittest.main()
