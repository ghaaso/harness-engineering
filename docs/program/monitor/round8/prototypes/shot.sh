#!/bin/sh
# shot.sh name [height]: headless Edge screenshot of name.html at 1870 px wide
P="C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/prototypes"
U='file:///C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/prototypes'
MSYS_NO_PATHCONV=1 "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1870,${2:-1050} --virtual-time-budget=4000 --screenshot="$P/$1.png" "$U/$1.html" 2>&1 | tail -2
