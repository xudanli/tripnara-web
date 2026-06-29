#!/usr/bin/env bash
set -euo pipefail

TRIP="${1:-3e4a1058-9218-467f-988a-c18008a14385}"
BASE="${API_BASE:-http://10.107.233.184:3000/api}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"
MAX_POLLS="${MAX_POLLS:-24}"

echo "=== Step 1: fresh includeDecisionChecker=1 (trip=$TRIP) ==="
curl -s -m 30 -w " HTTP:%{http_code} TIME:%{time_total}s\n" \
  "$BASE/trips/$TRIP/planning-conflicts?includeConstraintsSummary=1&includeDecisionChecker=1" \
  -o /tmp/pc-fresh.json

python3 - <<'PY'
import json
d = json.load(open("/tmp/pc-fresh.json"))
data = d.get("data", d)
print("success:", d.get("success", "n/a"))
print("conflicts total:", data.get("summary", {}).get("total"))
print("has decisionChecker:", bool(data.get("decisionChecker")))
defr = data.get("decisionCheckerDeferred")
print("deferred:", defr)
if defr and defr.get("taskId"):
    open("/tmp/dc-task-id.txt", "w").write(defr["taskId"])
PY

if [ ! -f /tmp/dc-task-id.txt ]; then
  if python3 -c "import json; d=json.load(open('/tmp/pc-fresh.json')); exit(0 if d.get('data',d).get('decisionChecker') else 1)" 2>/dev/null; then
    echo "decisionChecker already inline — no poll needed"
    exit 0
  fi
  echo "No taskId returned"
  exit 1
fi

TASK=$(cat /tmp/dc-task-id.txt)
echo ""
echo "=== Step 2: poll taskId=$TASK (interval ${POLL_INTERVAL}s, max $MAX_POLLS) ==="
START=$(date +%s)
for i in $(seq 1 "$MAX_POLLS"); do
  EL=$(( $(date +%s) - START ))
  curl -s -m 15 -w " HTTP:%{http_code} TIME:%{time_total}s\n" \
    "$BASE/trips/$TRIP/planning-conflicts?decisionCheckerTaskId=$TASK" \
    -o "/tmp/pc-poll-$i.json"
  STATUS=$(python3 -c "import json; d=json.load(open('/tmp/pc-poll-$i.json')); data=d.get('data',d); print('ready+dc' if data.get('decisionChecker') else data.get('decisionCheckerDeferred',{}).get('status','?'))")
  echo "poll#$i +${EL}s status=$STATUS"
  if python3 -c "import json; d=json.load(open('/tmp/pc-poll-$i.json')); data=d.get('data',d); import sys; sys.exit(0 if data.get('decisionChecker') else 1)" 2>/dev/null; then
    echo "READY at +${EL}s"
    python3 -c "import json; d=json.load(open('/tmp/pc-poll-$i.json')); dc=d.get('data',d).get('decisionChecker',{}); print('hardCount', dc.get('overview',{}).get('conflict',{}).get('hardCount'))"
    break
  fi
  if [ "$i" -lt "$MAX_POLLS" ]; then
    sleep "$POLL_INTERVAL"
  fi
done

echo ""
echo "=== Step 3: dedicated GET /decision-checker ==="
curl -s -m 45 -w " HTTP:%{http_code} TIME:%{time_total}s\n" \
  "$BASE/trips/$TRIP/decision-checker" -o /tmp/dc-dedicated.json
python3 -c "import json; d=json.load(open('/tmp/dc-dedicated.json')); data=d.get('data',d); print('success', d.get('success')); print('hardCount', data.get('overview',{}).get('conflict',{}).get('hardCount')); print('generatedAt', data.get('generatedAt'))"
