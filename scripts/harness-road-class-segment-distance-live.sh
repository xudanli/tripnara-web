#!/usr/bin/env bash
# 联调：PATCH c_max_segment_distance → planning-conflicts 带 cv + road_class 文案 >380km
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -f .env.development ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.development
  set +a
fi

TRIP="${1:-3e4a1058-9218-467f-988a-c18008a14385}"
HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="${API_BASE:-http://${HOST}:${PORT}/api}"
MAX_KM="${MAX_SEGMENT_KM:-380}"
CURL_OPTS=(-sS -m 25)

echo "Backend: ${BASE}"
echo "=== 1. GET constraints (current cv) ==="
CONSTRAINTS_JSON="$(curl "${CURL_OPTS[@]}" "${BASE}/trips/${TRIP}/constraints")"
CV="$(echo "$CONSTRAINTS_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',d).get('meta',{}).get('constraintsVersion',''))")"
echo "constraintsVersion=${CV}"

echo
echo "=== 2. PATCH c_max_segment_distance → ${MAX_KM}km (cv=${CV}) ==="
PATCH_BODY="$(python3 -c "import json; print(json.dumps({'value': {'maxSegmentDistanceKm': ${MAX_KM}}, 'constraintsVersion': int('${CV}') if '${CV}' else None}))")"
PATCH_JSON="$(curl "${CURL_OPTS[@]}" -X PATCH "${BASE}/trips/${TRIP}/constraints/c_max_segment_distance" \
  -H 'Content-Type: application/json' \
  -d "$PATCH_BODY")"
NEW_CV="$(echo "$PATCH_JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
data=d.get('data',d)
meta=data.get('constraints') or {}
print(meta.get('constraintsVersion') or data.get('constraintsVersion') or '')
" 2>/dev/null || true)"
if [[ -z "$NEW_CV" ]]; then
  NEW_CV="$(curl "${CURL_OPTS[@]}" "${BASE}/trips/${TRIP}/constraints" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',d).get('meta',{}).get('constraintsVersion',''))")"
fi
echo "PATCH ok, new constraintsVersion=${NEW_CV}"

echo
echo "=== 3. GET planning-conflicts ?constraintsVersion=${NEW_CV} ==="
PC_JSON="$(curl "${CURL_OPTS[@]}" "${BASE}/trips/${TRIP}/planning-conflicts?includeConstraintsSummary=1&includeDecisionChecker=1&constraintsVersion=${NEW_CV}")"
echo "$PC_JSON" | python3 -c '
import json, sys, re
d = json.load(sys.stdin)
data = d.get("data", d)
pcv = data.get("constraintsVersion") or (data.get("constraintsSummary") or {}).get("constraintsVersion")
print("response constraintsVersion:", pcv)
print("isStale:", data.get("isStale"))
msgs = []
for c in data.get("conflicts", []):
    m = c.get("message") or ""
    if re.search(r"超长距离|road_class|long_distance", m, re.I):
        msgs.append(m)
dc = (data.get("decisionChecker") or {}).get("overview", {}).get("conflict", {}).get("primary", {})
if dc.get("message"):
    msgs.append(dc["message"])
for m in msgs:
    print("road_class message:", m[:200])
    if ">250km" in m or "(>250 km)" in m.lower().replace(" ", ""):
        print("FAIL: still contains >250km")
        sys.exit(1)
    if re.search(r">\s*380\s*km", m, re.I):
        print("OK: contains >380km threshold")
if not msgs:
    print("WARN: no road_class messages found (trip may have no long segment)")
'

echo
echo "=== 4. Stale cv probe (?constraintsVersion=$((NEW_CV - 1))) ==="
if [[ "$NEW_CV" =~ ^[0-9]+$ ]] && [[ "$NEW_CV" -gt 0 ]]; then
  STALE_CV=$((NEW_CV - 1))
  curl "${CURL_OPTS[@]}" "${BASE}/trips/${TRIP}/planning-conflicts?constraintsVersion=${STALE_CV}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
data=d.get('data',d)
print('query cv:', ${STALE_CV}, 'response cv:', data.get('constraintsVersion'), 'isStale:', data.get('isStale'))
"
fi

echo
echo "=== harness complete ==="
