#!/usr/bin/env bash
# 行中团队对讲 API 联调（P2.0）
# 用法: TRIP_ID=xxx ./scripts/test-in-trip-comms-api.sh
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

CLIENT_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo ""
echo "=== POST /trips/:id/in-trip/comms/sync ==="
code=$(curl -sS -m 20 -o /tmp/comms-sync.json -w "%{http_code}" \
  -X POST "${BASE}/trips/${TRIP_ID}/in-trip/comms/sync" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"clientId\":\"${CLIENT_ID}\",\"clientSeq\":1,\"type\":\"text\",\"body\":\"联调探针 ${NOW}\",\"createdAt\":\"${NOW}\"}],\"lastKnownServerSeq\":0}")
check "comms sync" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/comms-sync.json"))
if not d.get("success"):
    print(f"  error={d.get('error',{}).get('code')}")
else:
    data=d["data"]
    print(f"  synced={len(data.get('syncedIds',[]))} serverMsgs={len(data.get('serverMessages',[]))} latestSeq={data.get('latestServerSeq')}")
PY

echo ""
echo "=== GET /trips/:id/in-trip/comms ==="
code=$(curl -sS -m 15 -o /tmp/comms-list.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/in-trip/comms?limit=10")
check "comms history" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/comms-list.json"))
if d.get("success"):
    data=d["data"]
    print(f"  messages={len(data.get('messages',[]))} latestSeq={data.get('latestServerSeq')}")
PY

echo ""
echo "=== POST /trips/:id/in-trip/comms/peers/heartbeat ==="
code=$(curl -sS -m 15 -o /tmp/comms-hb.json -w "%{http_code}" \
  -X POST "${BASE}/trips/${TRIP_ID}/in-trip/comms/peers/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"lat\":63.88,\"lng\":-22.45,\"accuracyMeters\":12,\"clientTimestamp\":\"${NOW}\",\"shareLocation\":true}")
check "comms heartbeat" "$code"

echo ""
echo "=== GET /trips/:id/in-trip/comms/peers ==="
code=$(curl -sS -m 15 -o /tmp/comms-peers.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/in-trip/comms/peers?staleAfterSec=120")
check "comms peers" "$code"
python3 - <<'PY'
import json
d=json.load(open("/tmp/comms-peers.json"))
if d.get("success"):
    print(f"  peers={len(d['data'].get('peers',[]))}")
PY

echo ""
echo "=== GET /trips/:id/in-trip/comms/summary (P2.2 optional) ==="
code=$(curl -sS -m 25 -o /tmp/comms-summary.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/in-trip/comms/summary?maxBullets=3")
if [[ "$code" =~ ^2 ]]; then
  echo "✓ comms summary (HTTP ${code})"
  pass=$((pass + 1))
elif [[ "$code" == "404" || "$code" == "503" ]]; then
  echo "○ comms summary skipped (HTTP ${code}, P2.2 未启用)"
else
  echo "✗ comms summary (HTTP ${code})"
  fail=$((fail + 1))
fi

echo ""
echo "=== 结果: ${pass} passed, ${fail} failed ==="
[[ "$fail" -eq 0 ]]
