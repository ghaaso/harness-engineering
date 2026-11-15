"""Probe denial is explicit, bounded and fail closed in the native CLI contract."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from retention_guard import MAX_HOOK_INPUT_BYTES, MAX_MODE_BYTES, guard


class RetentionGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="retention-guard-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.mode_file = self.root / "controller-mode.json"
        self.project = self.root / "participant"
        self.project.mkdir()

    def write_mode(self, mode):
        self.mode_file.write_text(json.dumps({"mode": mode}), encoding="utf-8", newline="")

    def assert_denied(self, response):
        self.assertEqual(response["hookSpecificOutput"]["hookEventName"], "PreToolUse")
        self.assertEqual(response["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertIn("Primary retention probe", response["hookSpecificOutput"]["permissionDecisionReason"])
        encoded = (json.dumps(response, separators=(",", ":")) + "\n").encode("utf-8")
        self.assertLessEqual(len(encoded), 1024)

    def invoke(self, args, raw=b'{"tool_name":"exec_command","tool_input":{}}'):
        result = subprocess.run(
            [sys.executable, "-I", "-B", str(HERE / "retention_guard.py"), *args],
            input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=self.project, check=False, timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, b"")
        self.assertTrue(result.stdout.endswith(b"\n"))
        self.assertLessEqual(len(result.stdout), 1024)
        return json.loads(result.stdout.decode("utf-8"))

    def test_probe_denies_every_tool_without_allowlist(self):
        self.write_mode("probe")
        for name in ("exec_command", "apply_patch", "ReadFixture", "update_plan",
                     "spawn_agent", "functions.exec", "mcp__fs__read", "", "unknown"):
            with self.subTest(name=name):
                self.assert_denied(guard(self.mode_file, {"tool_name": name}))

    def test_work_allows_ordinary_behavior_regardless_of_tool_name(self):
        self.write_mode("work")
        for name in ("exec_command", "apply_patch", "ReadFixture", "update_plan", "unknown"):
            self.assertEqual(guard(self.mode_file, {"tool_name": name}), {})

    def test_controller_mode_changes_are_read_on_each_invocation(self):
        self.write_mode("work")
        self.assertEqual(guard(self.mode_file), {})
        self.write_mode("probe")
        self.assert_denied(guard(self.mode_file))
        self.write_mode("work")
        self.assertEqual(guard(self.mode_file), {})

    def test_missing_relative_or_unreadable_mode_fails_closed(self):
        self.assert_denied(guard(None))
        self.assert_denied(guard(self.mode_file))
        self.assert_denied(guard(Path("controller-mode.json")))
        self.assert_denied(guard(self.project))

    def test_malformed_and_oversized_mode_fails_closed(self):
        invalid = (b"", b"{", b"[]", b"null", b'{}', b'{"mode":true}',
                   b'{"mode":null}', b'{"mode":"WORK"}', b'{"mode":"other"}',
                   b'{"mode":"work","extra":1}', b'{"mode":"probe","mode":"work"}', b"\xff",
                   b'{"mode":"work"}' + b" " * MAX_MODE_BYTES)
        for raw in invalid:
            with self.subTest(raw=raw[:40]):
                self.mode_file.write_bytes(raw)
                self.assert_denied(guard(self.mode_file))

    def test_invalid_payload_never_allows_tools(self):
        self.write_mode("work")
        for payload in ([], "text", 7, True):
            self.assert_denied(guard(self.mode_file, payload))

    def test_native_cli_returns_allow_then_deny_with_absolute_external_mode(self):
        self.assertFalse(self.mode_file.is_relative_to(self.project))
        self.write_mode("work")
        args = ["--mode-file", str(self.mode_file)]
        self.assertEqual(self.invoke(args), {})
        self.write_mode("probe")
        self.assert_denied(self.invoke(args))

    def test_native_cli_malformed_input_or_arguments_emit_deny_and_exit_zero(self):
        self.write_mode("work")
        args = ["--mode-file", str(self.mode_file)]
        for raw in (b"", b"{", b"[]", b"null", b"\xff"):
            with self.subTest(raw=raw):
                self.assert_denied(self.invoke(args, raw))
        for args in ([], ["--mode-file"], ["--unexpected"], ["--mode-file", "relative.json"]):
            with self.subTest(args=args):
                self.assert_denied(self.invoke(args))

    def test_native_cli_does_not_execute_or_echo_command_input(self):
        self.write_mode("probe")
        sentinel = self.project / "should-not-exist.txt"
        payload = json.dumps({"tool_name": "exec_command", "tool_input": {
            "cmd": f"Write-Output 'private-payload-marker'; New-Item '{sentinel}'"
        }}).encode("utf-8")
        response = self.invoke(["--mode-file", str(self.mode_file)], payload)
        self.assert_denied(response)
        self.assertNotIn("private-payload-marker", json.dumps(response))
        self.assertFalse(sentinel.exists())

    def test_native_cli_oversized_input_fails_closed_even_in_work_mode(self):
        self.write_mode("work")
        raw = b'{"tool_name":"exec_command"}' + b" " * MAX_HOOK_INPUT_BYTES
        self.assert_denied(self.invoke(["--mode-file", str(self.mode_file)], raw))


if __name__ == "__main__":
    unittest.main()
