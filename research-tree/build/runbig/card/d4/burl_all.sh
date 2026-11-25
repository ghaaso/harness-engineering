#!/bin/bash
# usage: burl_all.sh REPO FORM SPLIT SECS THREADS XMX
cd "$(dirname "$0")"
./dpy.sh anyburl.py prep $1 $2 $3 $4 $5 | tail -1
./anyburl.sh $1 $2 $6
./dpy.sh anyburl.py score $1 $2 $3 | tail -2
