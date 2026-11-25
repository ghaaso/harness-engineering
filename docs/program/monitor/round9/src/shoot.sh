#!/bin/bash
# usage: shoot.sh page-name [width height]. Headless Edge, own profile in the scratchpad, forward slashes only.
E="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
S="C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/2161cf88-256c-4792-b892-31a9974d3e29/scratchpad"
R="C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round9"
mkdir -p "$R/shots"
"$E" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$S/edge-profile" --window-size=${2:-1870},${3:-1050} --virtual-time-budget=4000 --screenshot="$R/shots/$1.png" "file:///$R/$1.html" > /dev/null 2>&1
echo "$1"
