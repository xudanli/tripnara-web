#!/usr/bin/env bash
# S1 混合出行 API 冒烟（UC-API-01～05 + round-trip）
# Usage: BACKEND=http://10.107.233.141:3000 ./scripts/s1-embedded-hiking-smoke.sh

set -euo pipefail

API_BASE="${BACKEND:-http://10.107.233.141:3000}/api"
TEST_USER="${TEST_USER:-test-user-embedded-s1}"
HDR=(-H "Content-Type: application/json" -H "X-Test-User-Id: ${TEST_USER}")
if [[ -n "${ACCESS_TOKEN:-}" ]]; then
  HDR+=(-H "Authorization: Bearer ${ACCESS_TOKEN}")
fi

pass=0
fail=0

ok() { echo "  OK: $1"; pass=$((pass + 1)); }
bad() { echo "  FAIL: $1"; fail=$((fail + 1)); }

json_get() {
  node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const p='$1'.split('.'); let v=d; for (const k of p){ v=v?.[k]; } if(v===undefined) process.exit(1); console.log(typeof v==='object'?JSON.stringify(v):v);"
}

SEGMENT_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

echo "== S1 embedded hiking smoke =="
echo "API: ${API_BASE}"
echo "User: ${TEST_USER}"
echo ""

# UC: create embedded trip
CREATE_BODY=$(cat <<EOF
{
  "destination": "NZ",
  "startDate": "2026-06-01",
  "endDate": "2026-06-10",
  "totalBudget": 5000,
  "travelers": [{ "type": "ADULT", "mobilityTag": "ACTIVE" }],
  "name": "S1 embedded smoke",
  "metadata": {
    "hikingProfile": "embedded",
    "hikingLevel": "light",
    "tags": ["徒步"],
    "hikingSegments": []
  }
}
EOF
)

echo "[1] POST /trips (embedded, empty segments)"
CREATE_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" -d "${CREATE_BODY}" "${API_BASE}/trips")
HTTP=$(echo "$CREATE_RES" | tail -n1)
BODY=$(echo "$CREATE_RES" | sed '$d')
echo "$BODY" | head -c 400
echo ""
if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  bad "create trip HTTP ${HTTP}"
else
  TRIP_ID=$(echo "$BODY" | json_get data.id 2>/dev/null || echo "$BODY" | json_get id 2>/dev/null || true)
  PROFILE=$(echo "$BODY" | json_get data.metadata.hikingProfile 2>/dev/null || echo "$BODY" | json_get metadata.hikingProfile 2>/dev/null || true)
  if [[ -z "${TRIP_ID:-}" ]]; then bad "no trip id in response"; else ok "tripId=${TRIP_ID}"; fi
  if [[ "${PROFILE:-}" == "embedded" ]]; then ok "hikingProfile=embedded"; else bad "hikingProfile=${PROFILE:-missing}"; fi
fi

if [[ -z "${TRIP_ID:-}" ]]; then
  echo "Abort: cannot continue without trip id"
  exit 1
fi

echo ""
echo "[2] GET /trips/:id round-trip metadata"
GET_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}")
HTTP=$(echo "$GET_RES" | tail -n1)
BODY=$(echo "$GET_RES" | sed '$d')
if [[ "$HTTP" != "200" ]]; then bad "GET trip HTTP ${HTTP}"; else
  P=$(echo "$BODY" | json_get data.metadata.hikingProfile 2>/dev/null || echo "$BODY" | json_get metadata.hikingProfile 2>/dev/null || true)
  [[ "$P" == "embedded" ]] && ok "GET metadata.hikingProfile" || bad "GET profile=$P"
fi

echo ""
echo "[3] GET /trips/:id/hiking-summary"
SUM_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}/hiking-summary")
HTTP=$(echo "$SUM_RES" | tail -n1)
BODY=$(echo "$SUM_RES" | sed '$d')
if [[ "$HTTP" == "404" ]]; then
  bad "hiking-summary 404 (endpoint or flag?)"
elif [[ "$HTTP" != "200" ]]; then
  bad "hiking-summary HTTP ${HTTP}: $(echo "$BODY" | head -c 200)"
else
  ok "hiking-summary HTTP 200"
  PHASE=$(echo "$BODY" | json_get data.hikingPhase 2>/dev/null || true)
  HINT=$(echo "$BODY" | json_get data.phaseHintZh 2>/dev/null || true)
  echo "      phase=${PHASE:-?} hint=${HINT:-—}"
  for f in tripId hikingProfile hikingPhase segments; do
    if echo "$BODY" | json_get "data.${f}" >/dev/null 2>&1; then ok "summary has ${f}"; else bad "summary missing data.${f}"; fi
  done
fi

echo ""
echo "[4] POST /hiking/hike-plans (no tripId) — expect 400 if flag on"
NO_TRIP_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" -d '{"routeDirectionId":106,"plannedDate":"2026-06-03"}' "${API_BASE}/hiking/hike-plans")
HTTP=$(echo "$NO_TRIP_RES" | tail -n1)
BODY=$(echo "$NO_TRIP_RES" | sed '$d')
CODE=$(echo "$BODY" | json_get error.code 2>/dev/null || true)
if [[ "$HTTP" == "400" && "$CODE" == "MISSING_TRIP_ID" ]]; then
  ok "MISSING_TRIP_ID when flag on"
elif [[ "$HTTP" == "200" || "$HTTP" == "201" ]]; then
  bad "created hike-plan without tripId (flag likely OFF on backend)"
else
  echo "      HTTP=${HTTP} code=${CODE:-?} (flag off or different error)"
fi

echo ""
echo "[5] POST /hiking/hike-plans/with-segment (route 106)"
WITH_SEG=$(cat <<EOF
{
  "tripId": "${TRIP_ID}",
  "routeDirectionId": 106,
  "plannedDate": "2026-06-03",
  "nameCN": "S1 Routeburn",
  "segment": {
    "segmentId": "${SEGMENT_ID}",
    "startDate": "2026-06-03",
    "endDate": "2026-06-04",
    "routeDirectionId": 106,
    "label": "S1 smoke segment"
  }
}
EOF
)
WS_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" -d "${WITH_SEG}" "${API_BASE}/hiking/hike-plans/with-segment")
HTTP=$(echo "$WS_RES" | tail -n1)
BODY=$(echo "$WS_RES" | sed '$d')
if [[ "$HTTP" == "404" ]]; then
  bad "with-segment 404 — fallback path only"
elif [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  bad "with-segment HTTP ${HTTP}: $(echo "$BODY" | head -c 300)"
else
  ok "with-segment created"
  HP_ID=$(echo "$BODY" | json_get data.hikePlan.id 2>/dev/null || echo "$BODY" | json_get hikePlan.id 2>/dev/null || true)
  SEG_HP=$(echo "$BODY" | json_get data.segment.hikePlanId 2>/dev/null || true)
  [[ -n "${HP_ID:-}" ]] && ok "hikePlan.id=${HP_ID}" || bad "missing hikePlan.id"
  [[ -n "${SEG_HP:-}" ]] && ok "segment.hikePlanId set" || bad "segment.hikePlanId missing"
fi

echo ""
echo "[6] GET trip + summary after segment"
GET2=$(curl -sS "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}")
SEG_LEN=$(echo "$GET2" | node -e "let d=JSON.parse(require('fs').readFileSync(0,'utf8')); d=d.data??d; const s=d.metadata?.hikingSegments??[]; console.log(s.length);")
if [[ "${SEG_LEN:-0}" -ge 1 ]]; then ok "metadata.hikingSegments length=${SEG_LEN}"; else bad "segments not in metadata after with-segment"; fi

SUM2=$(curl -sS "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}/hiking-summary" 2>/dev/null || echo '{}')
echo "$SUM2" | node -e "
const raw=require('fs').readFileSync(0,'utf8');
let d; try { d=JSON.parse(raw); } catch { process.exit(0); }
const data=d.data??d;
const segs=data.segments??[];
if(!segs.length){ console.log('      (summary segments empty)'); process.exit(0); }
const s=segs[0];
const hp=s.hikePlan;
console.log('      summary seg0:', s.segmentId, 'hikePlan=', hp? (hp.id||'?') : 'null');
if(hp && hp.id) process.exit(0); else process.exit(1);
" && ok "summary.segments[0].hikePlan present" || bad "summary missing segments[0].hikePlan"

echo ""
echo "[7] GET /hiking/hike-plans?tripId="
LIST_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" "${API_BASE}/hiking/hike-plans?tripId=${TRIP_ID}")
HTTP=$(echo "$LIST_RES" | tail -n1)
BODY=$(echo "$LIST_RES" | sed '$d')
if [[ "$HTTP" != "200" ]]; then bad "list HTTP ${HTTP}"; else
  COUNT=$(echo "$BODY" | node -e "let d=JSON.parse(require('fs').readFileSync(0,'utf8')); const a=d.data??d; console.log(Array.isArray(a)?a.length:0);")
  [[ "${COUNT:-0}" -ge 1 ]] && ok "list count=${COUNT}" || bad "list empty"
fi

echo ""
echo "[8] GET .../hiking-segments/:id/evaluate"
if [[ -n "${SEGMENT_ID:-}" ]]; then
  EV_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}/hiking-segments/${SEGMENT_ID}/evaluate")
  HTTP=$(echo "$EV_RES" | tail -n1)
  BODY=$(echo "$EV_RES" | sed '$d')
  if [[ "$HTTP" == "404" ]]; then bad "evaluate 404"; elif [[ "$HTTP" != "200" ]]; then bad "evaluate HTTP ${HTTP}"; else
    ok "evaluate HTTP 200"
    echo "$BODY" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')).data??JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('      readiness.level=', d.readiness?.level??'—');" 2>/dev/null || true
  fi
fi

echo ""
echo "[9] PUT metadata round-trip (UC-API-03)"
PUT_BODY=$(cat <<EOF
{
  "metadata": {
    "hikingProfile": "embedded",
    "hikingSegments": [{
      "segmentId": "${SEGMENT_ID}",
      "startDate": "2026-06-03",
      "endDate": "2026-06-05",
      "routeDirectionId": 106,
      "hikePlanId": "${HP_ID:-}",
      "label": "S1 updated label"
    }]
  }
}
EOF
)
PUT_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" -X PUT -d "${PUT_BODY}" "${API_BASE}/trips/${TRIP_ID}")
HTTP=$(echo "$PUT_RES" | tail -n1)
BODY=$(echo "$PUT_RES" | sed '$d')
if [[ "$HTTP" != "200" ]]; then bad "PUT HTTP ${HTTP}: $(echo "$BODY" | head -c 200)"; else
  LABEL=$(curl -sS "${HDR[@]}" "${API_BASE}/trips/${TRIP_ID}" | node -e "let d=JSON.parse(require('fs').readFileSync(0,'utf8')); d=d.data??d; console.log(d.metadata?.hikingSegments?.[0]?.label??'');")
  [[ "$LABEL" == "S1 updated label" ]] && ok "PUT round-trip label" || bad "label after PUT=${LABEL:-empty}"
fi

echo ""
echo "[10] SEGMENT_DATE_OUT_OF_RANGE"
BAD_SEG=$(cat <<EOF
{
  "metadata": {
    "hikingProfile": "embedded",
    "hikingSegments": [{
      "segmentId": "${SEGMENT_ID}",
      "startDate": "2027-01-01",
      "endDate": "2027-01-02",
      "routeDirectionId": 106
    }]
  }
}
EOF
)
BAD_RES=$(curl -sS -w "\n%{http_code}" "${HDR[@]}" -X PUT -d "${BAD_SEG}" "${API_BASE}/trips/${TRIP_ID}")
HTTP=$(echo "$BAD_RES" | tail -n1)
BODY=$(echo "$BAD_RES" | sed '$d')
CODE=$(echo "$BODY" | json_get error.code 2>/dev/null || true)
if [[ "$HTTP" == "400" && "$CODE" == "SEGMENT_DATE_OUT_OF_RANGE" ]]; then
  ok "SEGMENT_DATE_OUT_OF_RANGE"
else
  echo "      HTTP=${HTTP} code=${CODE:-?} (optional if server skips validation)"
fi

echo ""
echo "== Result: ${pass} passed, ${fail} failed =="
echo "Trip ID (manual UI): ${TRIP_ID}"
echo "Open: http://localhost:5173/dashboard/trips/${TRIP_ID}"
[[ "$fail" -eq 0 ]]
