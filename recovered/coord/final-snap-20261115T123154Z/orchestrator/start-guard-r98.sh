#!/bin/sh
# Coordinator's starter for ruling 98: the unchanged guard file with the cap set to 4g in the environment.
# Started detached (Start-Process bash.exe <this file>), so it does not depend on any session's tool call.
cd /c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator || exit 1
CAP=4g exec sh guard-stageB.sh
