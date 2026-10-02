#!/usr/bin/env bash
# Usage: scripts/host-delete.sh BASE_URL rsvps=id1,id2 wishes=id3   (password read from .host-key)
set -euo pipefail
BASE=$1; shift; JAR=$(mktemp); trap 'rm -f "$JAR"' EXIT
python3 -c "import json;print(json.dumps({'password':open('$(dirname "$0")/../.host-key').read().strip()}))" | curl -s -o /dev/null -w "login %{http_code}\n" -c "$JAR" -H 'content-type: application/json' --data @- "$BASE/api/host/login"
R=""; W=""; for a in "$@"; do case $a in rsvps=*) R=${a#rsvps=};; wishes=*) W=${a#wishes=};; esac; done
python3 -c "import json,sys;r,w=sys.argv[1],sys.argv[2];print(json.dumps({'rsvps':[x for x in r.split(',') if x],'wishes':[x for x in w.split(',') if x]}))" "$R" "$W" | curl -s -b "$JAR" -H 'content-type: application/json' --data @- "$BASE/api/admin/delete"; echo
