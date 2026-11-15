#!/bin/bash
PY=C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
T="C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/e24f17dc-4aea-4914-a9d1-280a723d620e/tool-results"
$PY -I pdf2txt.py "$T/webfetch-$2.pdf" "$1.txt" 2>/dev/null | tail -1
wc -c "$1.txt"
