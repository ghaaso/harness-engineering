#!/bin/bash
# usage: shoot.sh name "query" [width height]. Forward slashes only: Edge accepts them and no escapes can collapse.
E="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
B="C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/clickable/ux-designer"
"$E" --headless=new --disable-gpu --hide-scrollbars --window-size=${3:-1870},${4:-1050} --virtual-time-budget=6000 --screenshot="$B/shots/$1.png" "file:///$B/index.html?$2" > /dev/null 2>&1
echo "$1"
