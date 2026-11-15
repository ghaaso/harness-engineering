"""Application check command. Usage: uv run --locked python scripts/check.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from clinic.devtools.check import main

if __name__ == "__main__":
    sys.exit(main())
