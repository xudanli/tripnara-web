#!/usr/bin/env bash
# Trip Constraints SSOT 联调脚本
# 用法: TRIP_ID=xxx ./scripts/test-trip-constraints-api.sh
set -euo pipefail

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api"

if [[ -z "${TRIP_ID:-}" ]]; then
  echo ">> 自动获取第一个 tripId"
  TRIP_ID="$(curl -sS -m 15 "${BASE}/trips?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])")"
fi

echo ">> Trip: ${TRIP_ID}"
echo ">> Base: ${BASE}"

pass=0
fail=0

check() {
  local name="$1"
  local code="$2"
  if [[ "$code" =~ ^2 ]]; then
    echo "✓ ${name} (HTTP ${code})"
    pass=$((pass + 1))
  else
    echo "✗ ${name} (HTTP ${code})"
    fail=$((fail + 1))
  fi
}

echo ""
echo "=== GET /constraints ==="
code=$(curl -sS -m 15 -o /tmp/tc-list.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/constraints")
check "list" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/tc-list.json"))
meta=d["data"]["meta"]
print(f"  version={meta.get('constraintsVersion')} total={meta.get('total')} conflicts={meta.get('conflictCount')}")
PY

VER=$(python3 -c "import json; print(json.load(open('/tmp/tc-list.json'))['data']['meta']['constraintsVersion'])")

echo ""
echo "=== POST /constraints (SOFT) ==="
code=$(curl -sS -m 15 -o /tmp/tc-create.json -w "%{http_code}" -X POST "${BASE}/trips/${TRIP_ID}/constraints" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"联调软偏好\",\"category\":\"CUSTOM\",\"type\":\"SOFT\",\"scope\":{\"type\":\"TRIP\"},\"operator\":\"CUSTOM\",\"value\":{\"custom\":true},\"unit\":\"score\",\"priority\":5,\"allowRelaxation\":true,\"source\":{\"type\":\"USER\"},\"visibility\":\"TEAM\",\"constraintsVersion\":${VER}}")
check "create soft" "$code"
CUSTOM_ID=$(python3 -c "import json; d=json.load(open('/tmp/tc-create.json')); print(d.get('data',{}).get('constraint',{}).get('id',''))" 2>/dev/null || true)
echo "  constraintId=${CUSTOM_ID:-<none>}"

if [[ -n "${CUSTOM_ID}" ]]; then
  echo ""
  echo "=== PATCH priority ==="
  code=$(curl -sS -m 15 -o /tmp/tc-patch.json -w "%{http_code}" -X PATCH \
    "${BASE}/trips/${TRIP_ID}/constraints/${CUSTOM_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"priority\":8,\"constraintsVersion\":${VER}}")
  check "patch" "$code"

  echo ""
  echo "=== DELETE soft ==="
  code=$(curl -sS -m 15 -o /tmp/tc-del.json -w "%{http_code}" -X DELETE \
    "${BASE}/trips/${TRIP_ID}/constraints/${CUSTOM_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"constraintsVersion\":${VER}}")
  check "delete" "$code"
fi

echo ""
echo "=== POST preview-impact ==="
code=$(curl -sS -m 20 -o /tmp/tc-preview.json -w "%{http_code}" -X POST \
  "${BASE}/trips/${TRIP_ID}/constraints/preview-impact" \
  -H "Content-Type: application/json" \
  -d '{"changes":[{"constraintId":"c_time_range","patch":{"value":{"dayCount":5}}}],"persist":false}')
check "preview-impact" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/tc-preview.json")).get("data",{})
print(f"  refreshType={d.get('refreshType')} affectedDays={d.get('affectedDays')}")
assess=d.get('assessBefore') or {}
print(f"  assessScore={assess.get('overallAverageScore')}")
PY

echo ""
echo "=== POST check ==="
code=$(curl -sS -m 20 -o /tmp/tc-check.json -w "%{http_code}" -X POST \
  "${BASE}/trips/${TRIP_ID}/constraints/check" -H "Content-Type: application/json" -d '{}')
check "check" "$code"

echo ""
echo "Summary: ${pass} passed, ${fail} failed"
[[ "$fail" -eq 0 ]]
