"""Native pressure allowlist and probe isolation fail closed and stay bounded."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from retention_pressure_guard import MAX_HOOK_INPUT_BYTES, MAX_MODE_BYTES, guard


class RetentionPressureGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="retention-pressure-guard-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.mode_file = self.root / "controller-mode.json"
        self.project = self.root / "participant"
        self.project.mkdir()

    def mode(self, value):
        self.mode_file.write_text(json.dumps({"mode": value}), encoding="utf-8", newline="")

    def assert_denied(self, result):
        self.assertEqual(result["hookSpecificOutput"]["hookEventName"], "PreToolUse")
        self.assertEqual(result["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertLessEqual(len(json.dumps(result, separators=(",", ":")).encode("utf-8")) + 1, 1024)

    def invoke(self, raw=b'{"tool_name":"exec_command","tool_input":{}}', args=None):
        if args is None:
            args = ["--mode-file", str(self.mode_file)]
        result = subprocess.run(
            [sys.executable, "-I", "-B", str(HERE / "retention_pressure_guard.py"), *args],
            input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=self.project, check=False, timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, b"")
        self.assertTrue(result.stdout.endswith(b"\n"))
        self.assertLessEqual(len(result.stdout), 1024)
        return json.loads(result.stdout.decode("utf-8"))

    def native_tool(self, name):
        return self.invoke(json.dumps({"hook_event_name": "PreToolUse", "tool_name": name,
                                       "tool_input": {"path": "irrelevant"}}).encode("utf-8"))

    def test_native_pressure_allows_only_exact_two_names(self):
        self.assertFalse(self.mode_file.is_relative_to(self.project))
        self.mode("pressure")
        for name in ("ReadPressure", "functions.ReadPressure"):
            with self.subTest(name=name):
                self.assertEqual(self.native_tool(name), {})
        for name in ("exec_command", "functions.exec_command", "apply_patch", "ReadFixture",
                     "WriteFixture", "mcp__fs__read", "functions.exec", "spawn_agent",
                     "readpressure", "ReadPressure.extra", "functions.functions.ReadPressure",
                     " ReadPressure", "ReadPressure ", "", "unknown"):
            with self.subTest(name=name):
                self.assert_denied(self.native_tool(name))

    def test_native_probe_denies_even_pressure_tools(self):
        self.mode("probe")
        for name in ("ReadPressure", "functions.ReadPressure", "exec_command", "ReadFixture",
                     "update_plan", "spawn_agent", "unknown", ""):
            with self.subTest(name=name):
                self.assert_denied(self.native_tool(name))

    def test_native_work_allows_ordinary_tools_and_observes_mode_changes(self):
        self.mode("work")
        for name in ("exec_command", "apply_patch", "ReadPressure", "unknown"):
            self.assertEqual(self.native_tool(name), {})
        self.mode("pressure")
        self.assert_denied(self.native_tool("exec_command"))
        self.mode("work")
        self.assertEqual(self.native_tool("exec_command"), {})

    def test_pressure_requires_valid_tool_name_and_ignores_nested_allowlist_names(self):
        self.mode("pressure")
        for payload in (None, {}, {"tool_name": None}, {"tool_name": []},
                        {"tool_name": True}, {"tool_name": {"name": "ReadPressure"}},
                        {"name": "ReadPressure"}, {"tool_input": {"tool_name": "ReadPressure"}}):
            with self.subTest(payload=payload):
                self.assert_denied(guard(self.mode_file, payload))

    def test_invalid_mode_config_never_allows_pressure_name(self):
        invalid = (b"", b"{", b"[]", b"null", b'{}', b'{"mode":true}',
                   b'{"mode":null}', b'{"mode":"PRESSURE"}', b'{"mode":"other"}',
                   b'{"mode":"work","extra":1}', b'{"mode":"probe","mode":"work"}',
                   b'{"mode":"pressure","mode":"work"}', b"\xff",
                   b'{"mode":"work"}' + b" " * MAX_MODE_BYTES)
        for raw in invalid:
            with self.subTest(raw=raw[:50]):
                self.mode_file.write_bytes(raw)
                self.assert_denied(self.native_tool("ReadPressure"))
        self.mode_file.unlink()
        self.assert_denied(self.native_tool("ReadPressure"))
        self.assert_denied(self.invoke(args=["--mode-file", "relative.json"]))
        self.assert_denied(self.invoke(args=["--mode-file", str(self.project)]))

    def test_native_malformed_payload_and_arguments_deny_even_work_mode(self):
        self.mode("work")
        for raw in (b"", b"{", b"[]", b"null", b"7", b"\xff",
                    b'{"tool_name":"exec_command","tool_name":"ReadPressure"}',
                    b'{"tool_name":"exec_command"}' + b" " * MAX_HOOK_INPUT_BYTES):
            with self.subTest(raw=raw[:60]):
                self.assert_denied(self.invoke(raw))
        for args in ([], ["--mode-file"], ["--unexpected"], ["--help"]):
            with self.subTest(args=args):
                self.assert_denied(self.invoke(args=args))

    def test_native_errors_are_constant_bounded_and_do_not_echo_or_execute_input(self):
        self.mode("probe")
        sentinel = self.project / "must-not-exist"
        marker = "private-guard-marker"
        payload = json.dumps({"tool_name": "exec_command", "tool_input": {
            "cmd": f"Write-Output '{marker}'; New-Item '{sentinel}'"
        }}).encode("utf-8")
        denied = self.invoke(payload)
        self.assert_denied(denied)
        self.assertNotIn(marker, json.dumps(denied))
        self.assertFalse(sentinel.exists())
        self.mode_file.write_bytes(b'{"mode":"' + marker.encode("utf-8") + b'"}')
        self.assertEqual(self.invoke(payload), denied)
        self.assertEqual(self.invoke(args=["--private-guard-marker"]), denied)


if __name__ == "__main__":
    unittest.main()
