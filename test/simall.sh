#!/bin/bash
# usage: test/simall.sh <runs> [hero] [skills...]
cd /home/claude/ilgito
mkdir -p /tmp/simsnap && cp dist/index.html /tmp/simsnap/index.html
export ILGITO_HTML=/tmp/simsnap/index.html
runs=${1:-6}; hero=${2:-0}; shift 2
for sk in ${@:-novice avg expert}; do
  for st in 0 1 2 3 4; do timeout 900 node test/run.mjs sim 390 800 $st $sk $runs $hero | grep -v "^no errors"; done
done
