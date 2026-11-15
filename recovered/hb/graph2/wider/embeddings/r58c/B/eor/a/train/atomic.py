"""Hardened `.part` -> final renames for the lane's writers (pre-run fixes, 2026-11-14, task 2).

Why: on this host a container's os.replace onto a bind-mounted Windows folder can fail with PermissionError
(EACCES) while something on the host holds or caches the destination name; e4-gpu2 lost the rename of three
finished results that way ('/w/fixes/e4/cuda-s1.json.part' -> '.json').

replace_retry(src, dst)  os.replace with up to TRIES attempts and a short growing pause (PAUSE, 2*PAUSE, ...)
                         on any OSError (PermissionError included). If every attempt fails, src (the .part file
                         or folder) is removed (cleanup=True) and RenameFailed is raised: the caller's unit is
                         then recorded as failed and redone at the next launch; nothing is counted done and the
                         final name is never half-written (it either does not exist or is the complete old one).
put_json(path, obj)      json -> <path>.<pid>.part -> replace_retry.
retry_write(fn, path)    calls fn() (a writer that does its own .part + os.replace on `path`, such as the shared
                         evalcore.write_score_table, which is left unchanged) up to TRIES times on OSError; on
                         give-up removes <path>.part and raises RenameFailed.
os.replace is looked up at call time, so a test can monkeypatch it.
"""
import os, json, time, shutil

TRIES = 5
PAUSE = 0.25  # seconds; pauses 0.25, 0.5, 1, 2 between the five attempts (3.75 s at most)


class RenameFailed(OSError):
    """Every attempt to move a .part to its final name failed; the .part was cleaned up."""


def _remove(p):
    try:
        if os.path.isdir(p) and not os.path.islink(p): shutil.rmtree(p, ignore_errors=True)
        elif os.path.lexists(p): os.remove(p)
    except OSError:
        pass  # left behind: every reader ignores a .part name, and the next launch rewrites it


def replace_retry(src, dst, tries=None, pause=None, cleanup=True, sleep=None):
    tries = TRIES if tries is None else tries; pause = PAUSE if pause is None else pause; sleep = sleep or time.sleep
    last = None
    for i in range(tries):
        try:
            os.replace(src, dst)
            return i + 1  # attempts used
        except OSError as e:
            last = e
            if i < tries - 1: sleep(pause * (2 ** i))
    if cleanup: _remove(src)
    raise RenameFailed('rename %s -> %s failed %d times; last error: %r' % (src, dst, tries, last))


def put_json(path, obj, **kw):
    part = '%s.%d.part' % (path, os.getpid())
    with open(part, 'w') as f: json.dump(obj, f, **(kw or dict(indent=1)))
    return replace_retry(part, path)


def retry_write(fn, path, tries=None, pause=None, sleep=None):
    tries = TRIES if tries is None else tries; pause = PAUSE if pause is None else pause; sleep = sleep or time.sleep
    last = None
    for i in range(tries):
        try:
            fn()
            return i + 1
        except OSError as e:
            last = e
            if i < tries - 1: sleep(pause * (2 ** i))
    _remove(path + '.part')
    raise RenameFailed('writing %s failed %d times; last error: %r' % (path, tries, last))
