#!/usr/bin/env bash
set -euo pipefail

TRIP="${1:-3e4a1058-9218-467f-988a-c18008a14385}"
BASE="${API_BASE:-http://10.107.233.184:3000/api}"
TIMEOUT="${TIMEOUT:-45}"

probe() {
  local label="$1"
  local url="$2"
  echo "=== ${label} ==="
  local out="/tmp/pc-diag-$$.json"
  if curl -s -m "$TIMEOUT" -w " HTTP:%{http_code} TIME:%{time_total}s SIZE:%{size_download}\n" \
    -o "$out" "$url"; then
    python3 - "$out" <<'PY'
import json, sys
path = sys.argv[1]
try:
    d = json.load(open(path))
    print("success:", d.get("success", "n/a"))
    data = d.get("data", d)
    if not isinstance(data, dict):
        print("type:", type(data).__name__)
        sys.exit(0)
    if "summary" in data:
        print("conflicts total:", data.get("summary", {}).get("total"))
        print("has decisionChecker:", bool(data.get("decisionChecker")))
        print("deferred:", data.get("decisionCheckerDeferred"))
    elif "conflicts" in data:
        print("conflicts len:", len(data.get("conflicts", [])))
    else:
        print("keys:", list(data.keys())[:10])
except Exception:
    print("raw head:", open(path).read()[:240])
PY
  else
    echo "curl failed or timed out after ${TIMEOUT}s"
  fi
  echo
}

probe "trip-detail" "${BASE}/trips/${TRIP}"
probe "conflicts" "${BASE}/trips/${TRIP}/conflicts"
probe "pc-minimal" "${BASE}/trips/${TRIP}/planning-conflicts"
probe "pc+constraints" "${BASE}/trips/${TRIP}/planning-conflicts?includeConstraintsSummary=1"
probe "pc+dc" "${BASE}/trips/${TRIP}/planning-conflicts?includeDecisionChecker=1"
probe "pc+all" "${BASE}/trips/${TRIP}/planning-conflicts?includeConstraintsSummary=1&includeDecisionChecker=1"
