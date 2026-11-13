#!/usr/bin/env python3
"""Make a runbook block behave in the rig's shell as it does in the owner's interactive shell.

  python3 lib/guardwrap.py < block > block-for-eval

The runbook puts guards on the line itself: `: "${D:?not set ...}" && <action> || echo STOP`.
In the owner's interactive shell an unset variable there prints `bash: D: not set ...`, drops the
rest of that line, and the shell carries on with the next line. The rig evaluates blocks in a
NON-interactive bash, which would instead exit altogether. So each logical line (backslash
continuations joined; heredoc bodies untouched) that holds a `${NAME:?` guard is run in a subshell:
the guard drops the rest of the line and nothing else. Variables that line assigns (8.2's
`FX=$?`) are carried back to the rig's shell only when the line ran to its end, as they would be
interactively. Every other line is passed through unchanged. The step log shows the runbook's own
text, never this form.
"""

from __future__ import annotations

import re
import sys

NL = chr(10)
GUARD = re.compile(r"\$\{[A-Za-z_][A-Za-z0-9_]*:\?")
HEREDOC = re.compile(r"<<-?\s*'?\"?([A-Za-z_][A-Za-z0-9_]*)'?\"?")
ASSIGN = re.compile(r"(?:^|[;&|(\s])([A-Za-z_][A-Za-z0-9_]*)=(?!=)")
STATE = "/srv/l4/.guardwrap.state"


def logical_lines(text: str) -> list[tuple[str, bool]]:
    """(text, is_command) pieces: logical command lines, and heredoc bodies kept verbatim."""
    out: list[tuple[str, bool]] = []
    lines = text.split(NL)
    i = 0
    while i < len(lines):
        cur = lines[i]
        while cur.endswith("\\") and i + 1 < len(lines):
            i += 1
            cur = cur + NL + lines[i]
        out.append((cur, True))
        i += 1
        m = HEREDOC.search(cur)
        if m:
            body = []
            while i < len(lines) and lines[i].strip() != m.group(1):
                body.append(lines[i])
                i += 1
            if i < len(lines):
                body.append(lines[i])
                i += 1
            out.append((NL.join(body), False))
    return out


def wrap(line: str) -> str:
    names = sorted({n for n in ASSIGN.findall(line) if n.isupper()})
    tail = ""
    if names:
        # -g: the rig evaluates blocks inside a function, where a bare declare would be local
        tail = f"{NL}__gw=$?; declare -p {' '.join(names)} 2>/dev/null | sed 's/^declare /declare -g /' > {STATE}; exit $__gw"
    load = f"; __gw=$?; [ -s {STATE} ] && . {STATE}; rm -f {STATE}; (exit $__gw)" if names else ""
    return f"rm -f {STATE}; ({NL}{line}{tail}{NL}){load}"


def main() -> int:
    text = sys.stdin.read()
    if text.endswith(NL):
        text = text[:-1]
    out = []
    for piece, is_cmd in logical_lines(text):
        if is_cmd and GUARD.search(piece) and not HEREDOC.search(piece):
            out.append(wrap(piece))
        else:
            out.append(piece)
    sys.stdout.write(NL.join(out) + NL)
    return 0


if __name__ == "__main__":
    sys.exit(main())
