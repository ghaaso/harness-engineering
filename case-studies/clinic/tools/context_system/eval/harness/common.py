"""Shared helpers: paths, atomic JSON, hashing, tree manifests and copies (standard library only)."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Iterable

EVAL_DIR = Path(__file__).resolve().parent.parent      # tools/context_system/eval
CTX_SRC = EVAL_DIR.parent                              # tools/context_system (the system under test)
CHARS_PER_TOKEN = 2.4                                  # same constant the system uses (measured on real transcripts)
COPY_EXCLUDE = {"eval", "__pycache__", ".pytest_cache"}


def log(msg: str = "") -> None:
    sys.stdout.write(msg + "\n")
    sys.stdout.flush()


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def slug(path: Path | str) -> str:
    """Claude Code's project directory name for a project path (same rule as core.project_slug)."""
    return re.sub(r"[^A-Za-z0-9]", "-", str(path))


def read_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {} if default is None else default


def write_json(path: Path, data: Any) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False, default=str)
    os.replace(tmp, path)


def write_text(path: Path, text: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def sha1_bytes(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def sha1_file(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def iter_files(root: Path, exclude: Iterable[str] = ()) -> Iterable[Path]:
    root = Path(root)
    excl = set(exclude)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in excl)
        for name in sorted(filenames):
            if name in excl:
                continue
            yield Path(dirpath) / name


def manifest(root: Path, exclude: Iterable[str] = (), hashes: bool = True) -> dict[str, list]:
    """{relative posix path: [size, sha1 or mtime]} for every file under root."""
    out: dict[str, list] = {}
    root = Path(root)
    if not root.exists():
        return out
    for p in iter_files(root, exclude):
        rel = p.relative_to(root).as_posix()
        st = p.stat()
        out[rel] = [st.st_size, sha1_file(p) if hashes else int(st.st_mtime)]
    return out


def diff_manifests(before: dict, after: dict) -> dict[str, list[str]]:
    added = sorted(set(after) - set(before))
    deleted = sorted(set(before) - set(after))
    modified = sorted(k for k in set(before) & set(after) if before[k] != after[k])
    return {"added": added, "modified": modified, "deleted": deleted}


def copytree_filtered(src: Path, dst: Path, exclude: Iterable[str] = COPY_EXCLUDE) -> None:
    excl = set(exclude)
    shutil.copytree(src, dst, ignore=lambda d, names: [n for n in names if n in excl], dirs_exist_ok=False)


def sync_tree(src: Path, dst: Path) -> dict[str, list[str]]:
    """Make dst identical to src (add, replace, delete); returns what changed in dst."""
    src, dst = Path(src), Path(dst)
    before = manifest(dst)
    want = manifest(src)
    d = diff_manifests(before, want)
    for rel in d["deleted"]:
        (dst / rel).unlink()
    for rel in d["added"] + d["modified"]:
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src / rel, target)
    # remove directories that no longer hold anything and do not exist in src
    for dirpath, dirnames, filenames in sorted(os.walk(dst), key=lambda t: -len(t[0])):
        p = Path(dirpath)
        if p != dst and not any(p.iterdir()) and not (src / p.relative_to(dst)).is_dir():
            p.rmdir()
    return d


def is_under(path: Path | str, roots: Iterable[Path | str]) -> bool:
    try:
        p = os.path.normcase(os.path.abspath(str(path)))
    except (TypeError, ValueError):
        return False
    for r in roots:
        r = os.path.normcase(os.path.abspath(str(r)))
        if p == r or p.startswith(r.rstrip("\\/") + os.sep):
            return True
    return False


def run_retry(argv: list[str], attempts: int = 3, **kwargs: Any):
    """subprocess.run, retried when the process start itself is refused (an intermittent WinError 5
    'Access is denied' seen under some sandboxed shells). Nothing has run when that happens."""
    import subprocess
    for attempt in range(attempts):
        try:
            return subprocess.run(argv, **kwargs)
        except PermissionError:
            if attempt == attempts - 1:
                raise
            time.sleep(0.4 * (attempt + 1))


def tokens_of_chars(n: int) -> int:
    return int(n / CHARS_PER_TOKEN)
