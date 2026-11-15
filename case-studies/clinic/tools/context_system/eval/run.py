"""Entry point of the context-system evaluation harness (see README.md beside this file).

    python -B -X utf8 run.py --dry-run
    python -B -X utf8 run.py --profile mechanics            (prints the plan; add --yes to start)
    python -B -X utf8 run.py --profile quality              (prints the plan; add --yes to start)
    python -B -X utf8 run.py --continue <run dir> --yes
    python -B -X utf8 run.py --report <run dir>
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # never leave __pycache__ beside the system under test
sys.path.insert(0, str(Path(__file__).resolve().parent))

from harness.driver import main  # noqa: E402

if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        try:  # readable output when redirected to a file on a console with a legacy code page
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    sys.exit(main(sys.argv[1:]))
