#!/bin/sh
# The whole check in one command: measure every pad (ROUNDS>0 also applies fixes),
# then prove the harness flags a part we deliberately got wrong.
#   bin/diffall.sh [ROUNDS] [--final]
set -eu
cd "$(dirname "$0")/.."
for pad in ps xb sw; do AUTOFIX_ARGS="${AUTOFIX_ARGS:---colour 3 --gain 0.6 --relative --skip bumper-l,bumper-r}" bin/loop.sh "$pad" "${1:-0}" ${2:-}; done
bin/negcontrol.sh ps face-right 2.0 1.0
bin/negcontrol.sh xb view 2.0 1.0
bin/negcontrol.sh sw home 0 1.1
