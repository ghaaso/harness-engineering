"""Planted-fixture tests for check_claude_files.py. Run: python3 -m unittest discover -s work/wp10b-ci"""
import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import check_claude_files as ccf  # noqa: E402

SCRIPT = HERE / "check_claude_files.py"

GOOD_AGENT = """\
---
name: good
description: A well-formed agent.
tools: Read, Grep, Glob
model: sonnet
skills: [good-skill]
---
body
"""

# Every planted file, keyed by relative path, with the exact (rule, severity) findings it must raise.
PLANTED = {
    ".claude/agents/good.md": (GOOD_AGENT, []),
    ".claude/agents/good-yaml-list.md": (
        """\
---
name: good-yaml-list
description: >-
  Folded description
  over two lines.
tools:
  - Read
  - Grep
model: "claude-sonnet-4-5"
---
""",
        [],
    ),
    ".claude/agents/no-frontmatter.md": ("# Just a heading\nno frontmatter here\n", [("FM1", "error")]),
    ".claude/agents/unclosed.md": ("---\nname: unclosed\ndescription: x\n", [("FM1", "error")]),
    ".claude/agents/unpinned.md": (GOOD_AGENT.replace("good", "unpinned", 1).replace("sonnet", "inherit"),
                                   [("AG1", "error")]),
    ".claude/agents/no-model.md": (GOOD_AGENT.replace("good", "no-model", 1).replace("model: sonnet\n", ""),
                                   [("AG1", "error")]),
    ".claude/agents/too-many-tools.md": (
        GOOD_AGENT.replace("good", "too-many-tools", 1).replace(
            "Read, Grep, Glob", "Read, Grep, Glob, Bash, Edit, Write, WebFetch, WebSearch"),
        [("AG2", "error")],
    ),
    ".claude/agents/no-tools.md": (GOOD_AGENT.replace("good", "no-tools", 1).replace("tools: Read, Grep, Glob\n", ""),
                                   [("AG2", "error")]),
    ".claude/agents/no-description.md": (
        GOOD_AGENT.replace("good", "no-description", 1).replace("description: A well-formed agent.\n", ""),
        [("FM2", "error")],
    ),
    ".claude/agents/wrong-name.md": (GOOD_AGENT, [("FM2", "warn")]),
    ".claude/agents/bad-skill-ref.md": (GOOD_AGENT.replace("good", "bad-skill-ref", 1).replace(
        "[good-skill]", "[good-skill, missing-skill]"), [("AG3", "error")]),
    ".claude/skills/good-skill/SKILL.md": ("---\nname: good-skill\ndescription: 'Quoted: fine.'\n---\n", []),
    ".claude/skills/long-desc/SKILL.md": ("---\nname: long-desc\ndescription: %s\n---\n" % ("x" * 1025),
                                          [("SK1", "error")]),
    ".claude/skills/near-cap/SKILL.md": ("---\nname: near-cap\ndescription: %s\n---\n" % ("x" * 1010),
                                         [("SK1", "warn")]),
    ".claude/skills/no-desc/SKILL.md": ("---\nname: no-desc\n---\n", [("FM2", "error")]),
}


def plant(root, paths):
    for rel in paths:
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(PLANTED[rel][0], encoding="utf-8")


def cli(*args):
    return subprocess.run([sys.executable, str(SCRIPT)] + list(args), capture_output=True, text=True)


class ParserTests(unittest.TestCase):
    def test_tool_list_forms(self):
        for text in ("tools: Read, Grep", "tools: [Read, Grep]", "tools:\n  - Read\n  - Grep", "tools:\n- Read\n- Grep"):
            fm, err = ccf.parse_frontmatter("---\n%s\n---\n" % text)
            self.assertIsNone(err, text)
            self.assertEqual(ccf.as_list(fm["tools"]), ["Read", "Grep"], text)

    def test_quotes_and_block_scalars(self):
        fm, _ = ccf.parse_frontmatter('---\na: "x: y"\nb: \'it\'\'s\'\nc: >-\n  one\n  two\nd: |\n  l1\n  l2\n---\n')
        self.assertEqual(fm, {"a": "x: y", "b": "it's", "c": "one two", "d": "l1\nl2"})


class PlantedFixtureTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_each_rule_fires_exactly_where_planted(self):
        plant(self.root, PLANTED)
        report = ccf.run(self.root, ccf.DEFAULT_MAX_TOOLS)
        got = sorted((f["path"], f["rule"], f["severity"]) for f in report["findings"])
        want = sorted((p, r, s) for p, (_, found) in PLANTED.items() for r, s in found)
        self.assertEqual(got, want)
        self.assertEqual(report["scanned"], {"agents": 11, "skills": 4})

    def test_max_tools_flag(self):
        plant(self.root, [".claude/agents/good.md", ".claude/skills/good-skill/SKILL.md"])
        self.assertEqual(ccf.run(self.root, 3)["findings"], [])
        self.assertEqual([f["rule"] for f in ccf.run(self.root, 2)["findings"]], ["AG2"])

    def test_record_only_exits_0_and_enforce_exits_1(self):
        plant(self.root, PLANTED)
        out = self.root / "report.json"
        record = cli("--root", str(self.root), "--json", str(out))
        self.assertEqual(record.returncode, 0, record.stderr)
        self.assertIn("record-only", record.stdout)
        self.assertGreater(json.loads(out.read_text())["errors"], 0)
        self.assertEqual(cli("--root", str(self.root), "--enforce").returncode, 1)

    def test_enforce_passes_when_only_good_files(self):
        plant(self.root, [".claude/agents/good.md", ".claude/skills/good-skill/SKILL.md"])
        result = cli("--root", str(self.root), "--enforce")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("(no findings)", result.stdout)


if __name__ == "__main__":
    unittest.main()
