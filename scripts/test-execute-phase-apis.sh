#!/usr/bin/env bash
# 执行阶段 API 联调脚本（T-01 ~ T-05）
# 用法: TRIP_ID=xxx ./scripts/test-execute-phase-apis.sh
set -euo pipefail

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api"

if [[ -z "${TRIP_ID:-}" ]]; then
  echo ">> 查找 TRAVELING 行程"
  TRIP_ID="$(curl -sS -m 15 "${BASE}/trips?limit=50" | python3 -c "
import json,sys
d=json.load(sys.stdin)
trips=d.get('data',[])
for t in trips:
    if t.get('status')=='TRAVELING':
        print(t['id']); break
else:
    print('')
")"
fi

if [[ -z "${TRIP_ID}" ]]; then
  echo "✗ 未找到 TRAVELING 行程，请 export TRIP_ID=..."
  exit 1
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
echo "=== GET /trips/:id (P0) ==="
code=$(curl -sS -m 15 -o /tmp/ex-trip.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}")
check "trip detail" "$code"
python3 - <<'PY'
import json
t=json.load(open("/tmp/ex-trip.json")).get("data",{})
print(f"  status={t.get('status')} destination={t.get('destination')}")
PY

echo ""
echo "=== GET /trips/:id/state (T-03) ==="
code=$(curl -sS -m 15 -o /tmp/ex-state.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/state")
check "trip state" "$code"
python3 - <<'PY'
import json
s=json.load(open("/tmp/ex-state.json")).get("data",{})
ns=s.get("nextStop")
print(f"  nextStop={'yes' if ns else 'null'}")
if ns and ns.get("Place"):
    p=ns["Place"]
    print(f"  coords lat={p.get('latitude')} lng={p.get('longitude')}")
PY

echo ""
echo "=== GET /trips/:id/in-trip/execution-advisory (T-01/T-02) ==="
code=$(curl -sS -m 20 -o /tmp/ex-advisory.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/in-trip/execution-advisory")
check "execution-advisory" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/ex-advisory.json"))
if not d.get("success"):
    print(f"  error={d.get('error',{}).get('code')}: {d.get('error',{}).get('message')}")
    raise SystemExit(0)
data=d["data"]
recs=data.get("recommendations",[])
ci=data.get("causalInsight")
chain=(ci or {}).get("causalStory",{}).get("chain",[])
print(f"  verdict={data.get('verdict',{}).get('status')} recommendations={len(recs)}")
print(f"  causalInsight chain={len(chain)} enforcement={(ci or {}).get('primaryEnforcement')}")
for r in recs:
    print(f"    - {r.get('id')} ({r.get('actionType')}) {r.get('label')}")
PY

echo ""
echo "=== GET /trips/:id/in-trip/today (M7) ==="
code=$(curl -sS -m 15 -o /tmp/ex-today.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/in-trip/today")
check "in-trip today" "$code"

echo ""
DATE=$(python3 -c "import json; print(json.load(open('/tmp/ex-advisory.json')).get('data',{}).get('date',''))" 2>/dev/null || true)
DATE=${DATE:-$(date -u +%F)}
echo "=== GET /trips/:id/schedule?date=${DATE} ==="
code=$(curl -sS -m 15 -o /tmp/ex-schedule.json -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/schedule?date=${DATE}")
check "schedule" "$code"
python3 - <<'PY'
import json
sch=json.load(open("/tmp/ex-schedule.json")).get("data",{}).get("schedule",{})
items=sch.get("items",[])
print(f"  items={len(items)}")
PY

PLACE_ID=$(python3 -c "
import json
sch=json.load(open('/tmp/ex-schedule.json')).get('data',{}).get('schedule',{})
items=sch.get('items',[])
print(items[0].get('placeId') if items else '')
" 2>/dev/null || true)

if [[ -n "${PLACE_ID}" ]]; then
  echo ""
  echo "=== GET /places/:placeId/evidence (T-05) placeId=${PLACE_ID} ==="
  code=$(curl -sS -m 15 -o /tmp/ex-evidence.json -w "%{http_code}" \
    "${BASE}/places/${PLACE_ID}/evidence?date=${DATE}&includeWeather=true&includeTraffic=true")
  check "place evidence" "$code"
  python3 - <<'PY'
import json
d=json.load(open("/tmp/ex-evidence.json"))
if d.get("success"):
    w=d["data"].get("evidence",{}).get("weatherWindow",{})
    print(f"  wind={w.get('wind',{}).get('speed')} condition={w.get('condition')}")
else:
    print(f"  error={d.get('error')}")
PY
fi

REC_ID=$(python3 -c "
import json
recs=json.load(open('/tmp/ex-advisory.json')).get('data',{}).get('recommendations',[])
for r in recs:
    if r.get('actionType')!='keep':
        print(r['id']); break
" 2>/dev/null || true)

if [[ -n "${REC_ID}" ]]; then
  echo ""
  echo "=== POST .../recommendations/:id/apply (T-04) rec=${REC_ID} ==="
  code=$(curl -sS -m 30 -o /tmp/ex-apply.json -w "%{http_code}" -X POST \
    "${BASE}/trips/${TRIP_ID}/in-trip/execution-advisory/recommendations/${REC_ID}/apply" \
    -H "Content-Type: application/json" \
    -d "{\"confirm\":true,\"clientTimestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}")
  check "apply recommendation" "$code"
  python3 - <<'PY'
import json
d=json.load(open("/tmp/ex-apply.json"))
if d.get("success"):
    print(f"  applied={d['data'].get('applied')} mutations={len(d['data'].get('scheduleMutations',[]))}")
else:
    err=d.get("error",{})
    print(f"  expected_if_gateway={err.get('code')}: {err.get('message','')[:80]}")
PY
fi

echo ""
echo "=== 汇总: ${pass} passed, ${fail} failed ==="
[[ "$fail" -eq 0 ]]
