"""Probe graders use final messages and preserve source/cumulative-accounting scope."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_fixtures import Scenario, STATE_TEMPLATE, create_fixture
from eval_probes import PressureTools, final_reply


class ProbeTests(unittest.TestCase):
    def test_progress_commentary_is_not_part_of_final_json(self):
        result = {"text": 'I will check.\n{"retry_limit":7}', "items": [
            {"completed_seq": 2, "item": {"type": "agentMessage", "phase": "commentary", "text": "I will check."}},
            {"completed_seq": 3, "item": {"type": "agentMessage", "phase": "final_answer", "text": '{"retry_limit":7}'}}]}
        self.assertEqual(final_reply(result), {"retry_limit": 7})
        result["items"][1]["item"]["text"] = '{"retry_limit":9}'
        self.assertEqual(final_reply(result), {"retry_limit": 9})

    def test_pressure_file_is_one_read_and_never_an_outside_path(self):
        with tempfile.TemporaryDirectory(prefix="probe-offline-test-") as directory:
            scenario = Scenario("probe", "mechanics", "offline", 0,
                {"task.md": STATE_TEMPLATE, "large_log.txt": "synthetic\n"}, (), ("task.md",))
            create_fixture(Path(directory), scenario)
            tools = PressureTools(Path(directory), scenario)
            self.assertTrue(tools.dispatch("ReadFixture", {"path": "large_log.txt"})["ok"])
            self.assertFalse(tools.dispatch("ReadFixture", {"path": "large_log.txt"})["ok"])
            self.assertFalse(tools.dispatch("ReadFixture", {"path": "../outside"})["ok"])


if __name__ == "__main__":
    unittest.main()
