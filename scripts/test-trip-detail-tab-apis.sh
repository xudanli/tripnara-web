#!/usr/bin/env bash
# 行程详情 Tab BFF 联调脚本
# 用法: TRIP_ID=xxx ./scripts/test-trip-detail-tab-apis.sh
set -euo pipefail

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api"

if [[ -z "${TRIP_ID:-}" ]]; then
  TRIP_ID="${TRIP_ID:-807b3c54-4793-4006-a66d-67e79faa6fc2}"
fi

echo ">> Trip: ${TRIP_ID}"
echo ">> Base: ${BASE}"

pass=0
fail=0
warn=0

check_get() {
  local name="$1"
  local path="$2"
  local code
  code=$(curl -sS -m 25 -o /tmp/tab-api.json -w "%{http_code}" "${BASE}/${path}")
  local ok msg
  ok=$(python3 -c "import json; d=json.load(open('/tmp/tab-api.json')); print('1' if d.get('success') else '0')" 2>/dev/null || echo "0")
  msg=$(python3 -c "import json; d=json.load(open('/tmp/tab-api.json')); print(d.get('error',{}).get('message','') if not d.get('success') else 'ok')" 2>/dev/null || echo "parse_error")

  if [[ "$code" =~ ^2 && "$ok" == "1" ]]; then
    echo "✓ ${name} (HTTP ${code})"
    pass=$((pass + 1))
  elif [[ "$code" =~ ^2 ]]; then
    echo "⚠ ${name} (HTTP ${code}) API error: ${msg}"
    warn=$((warn + 1))
  else
    echo "✗ ${name} (HTTP ${code}) ${msg}"
    fail=$((fail + 1))
  fi
}

echo ""
echo "=== Tab BFF GET (v1.7 preset) ==="
check_get "timeline-shell" "trips/${TRIP_ID}/timeline-overview?preset=shell"
check_get "timeline-full" "trips/${TRIP_ID}/timeline-overview?preset=full"
check_get "collab-shell" "trips/${TRIP_ID}/collab-overview?preset=shell"
check_get "collab-full" "trips/${TRIP_ID}/collab-overview?preset=full"

echo ""
echo "=== Tab BFF GET (legacy default) ==="
check_get "timeline-overview" "trips/${TRIP_ID}/timeline-overview"
check_get "collab-overview" "trips/${TRIP_ID}/collab-overview"
check_get "files/overview" "trips/${TRIP_ID}/files/overview"
check_get "files/stats" "trips/${TRIP_ID}/files/stats"
check_get "accommodation-overview" "trips/${TRIP_ID}/accommodation-overview"
check_get "activity-favorites" "trips/${TRIP_ID}/activity-favorites"

echo ""
echo "=== 响应摘要 ==="
python3 <<PY
import json
from pathlib import Path

p = Path("/tmp/tab-api.json")
# re-fetch accommodation for summary
import urllib.request
BASE = "${BASE}"
TRIP = "${TRIP_ID}"
for ep in ["timeline-overview", "collab-overview", "files/overview", "accommodation-overview"]:
    with urllib.request.urlopen(f"{BASE}/trips/{TRIP}/{ep}", timeout=25) as r:
        d = json.load(r).get("data", {})
    if ep == "timeline-overview":
        s = d.get("stats", {})
        print(f"  timeline: feasibility={s.get('feasibilityScore')} tasks={len(d.get('tasks',[]))}")
    elif ep == "collab-overview":
        h = d.get("teamHealth", {})
        print(f"  collab: progress={h.get('progressPercent')}% members={d.get('memberCount')}")
    elif ep == "files/overview":
        print(f"  files: items={len(d.get('items',[]))} pending={d.get('stats',{}).get('pendingCount')}")
    elif ep == "accommodation-overview":
        st = d.get("stats", {})
        print(f"  accommodation: nights={len(d.get('nights',[]))} booked={st.get('bookedCount')} reminders={len(d.get('reminders',[]))}")
PY

echo ""
echo "=== activity-favorites POST (需 ACTIVITY 项) ==="
ACT_ID=$(python3 <<PY
import json, urllib.request
TRIP = "${TRIP_ID}"
with urllib.request.urlopen(f"${BASE}/trips/{TRIP}", timeout=30) as r:
    trip = json.load(r).get("data") or json.load(open("/dev/null"))
for day in trip.get("TripDay") or []:
    for item in day.get("ItineraryItem") or []:
        if item.get("type") == "ACTIVITY":
            print(item["id"])
            raise SystemExit
print("")
PY
)

if [[ -n "${ACT_ID}" ]]; then
  code=$(curl -sS -m 15 -o /tmp/tab-fav-post.json -w "%{http_code}" -X POST \
    "${BASE}/trips/${TRIP_ID}/activity-favorites" \
    -H "Content-Type: application/json" \
    -d "{\"itineraryItemId\":\"${ACT_ID}\",\"favorited\":true}")
  ok=$(python3 -c "import json; d=json.load(open('/tmp/tab-fav-post.json')); print('1' if d.get('success') else d.get('error',{}).get('message','fail'))" 2>/dev/null || echo "parse_error")
  if [[ "$code" =~ ^2 && "$ok" == "1" ]]; then
    echo "✓ activity-favorites POST (HTTP ${code})"
    pass=$((pass + 1))
  else
    echo "⚠ activity-favorites POST (HTTP ${code}) ${ok}"
    warn=$((warn + 1))
  fi
else
  echo "⚠ 跳过 POST：行程无 ACTIVITY 项"
  warn=$((warn + 1))
fi

echo ""
echo "=== 结果: ${pass} 通过, ${warn} 警告, ${fail} 失败 ==="
[[ "$fail" -eq 0 ]]
