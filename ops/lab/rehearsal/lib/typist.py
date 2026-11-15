#!/usr/bin/env python3
"""Type a PIN into a command that prompts on a terminal, the way the owner does at 6.13.

  L4_PIN=<pin> typist.py <command> [args...]

Runs the command in a pseudo-terminal, waits for each prompt that ends in "PIN: " and only then
types L4_PIN and Enter, so nothing is typed before the program reads it (typing ahead into
`docker compose exec` loses the keystrokes). The prompt turns echo off, so the PIN is never in
the transcript; any echo of it is masked anyway. Exit status: the command's own; 124 when it
does not finish within 90 seconds.
"""

from __future__ import annotations

import os
import pty
import select
import sys
import time

pin = os.environ["L4_PIN"].encode()
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])

buf = b""
deadline = time.time() + 90
typed = 0
while time.time() < deadline:
    r, _, _ = select.select([fd], [], [], 0.5)
    if fd in r:
        try:
            chunk = os.read(fd, 4096)
        except OSError:
            break
        if not chunk:
            break
        buf += chunk
        if buf.rstrip().endswith(b"PIN:") and typed < 2:
            time.sleep(0.3)
            os.write(fd, pin + b"\r")
            typed += 1
            buf += b"<typed>\n"
    else:
        done, status = os.waitpid(pid, os.WNOHANG)
        if done:
            break
else:
    os.kill(pid, 9)
    sys.stdout.write(buf.decode(errors="replace").replace(pin.decode(), "<pin>"))
    sys.exit(124)

_, status = os.waitpid(pid, 0)
sys.stdout.write(buf.decode(errors="replace").replace(pin.decode(), "<pin>"))
sys.exit(os.waitstatus_to_exitcode(status))
