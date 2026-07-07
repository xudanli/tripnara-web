#!/usr/bin/env bash
# POST .../decision-problems/:id/resolutions 联调探针
#
# 用法:
#   npm run decision-center:resolutions-probe -- [TRIP_ID] [PROBLEM_ID] [ACTION_ID]
#   npm run decision-center:resolutions-probe
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.development ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.development
  set +a
fi

TRIP_ID="${1:-${TRIP_ID:-3e4a1058-9218-467f-988a-c18008a14385}}"
PROBLEM_ID="${2:-}"
ACTION_ID="${3:-}"

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api"

AUTH_HEADER=()
if [[ -n "${AUTH_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${AUTH_TOKEN}")
fi

enc() {
  python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
}

echo "========================================"
echo " resolutions probe"
echo " API:  ${BASE}"
echo " Trip: ${TRIP_ID}"
echo " Auth: ${AUTH_TOKEN:+Bearer ***}${AUTH_TOKEN:-none}"
echo "========================================"

if [[ -z "$PROBLEM_ID" ]]; then
  echo ""
  echo "=== 自动选取第一个 detail.actions 非空的问题 ==="
  LIST=$(curl -sS -m 25 "${AUTH_HEADER[@]}" "${BASE}/trips/${TRIP_ID}/decision-problems")
  read -r PROBLEM_ID ACTION_ID <<<"$(python3 - <<PY
import json, sys, urllib.parse, urllib.request

base = "${BASE}"
trip_id = "${TRIP_ID}"
auth = "${AUTH_TOKEN:-}"

def get_json(url: str) -> dict:
    req = urllib.request.Request(url)
    if auth:
        req.add_header("Authorization", f"Bearer {auth}")
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode())

raw = json.loads('''${LIST}''')
items = (raw.get("data") or {}).get("items") or []
print(f"  list items={len(items)}", file=sys.stderr)

if not items:
    sys.exit(1)

summary = []
picked_pid = ""
picked_action = ""

for it in items:
    pid = (it.get("problemId") or it.get("id") or "").strip()
    if not pid:
        continue
    enc = urllib.parse.quote(pid, safe="")
    try:
        detail = get_json(f"{base}/trips/{trip_id}/decision-problems/{enc}")
    except Exception as exc:
        print(f"  ⚠ GET detail failed {pid!r}: {exc}", file=sys.stderr)
        continue
    data = detail.get("data") or {}
    acts = data.get("actions") or []
    title = ((data.get("problem") or {}).get("title") or it.get("title") or "")[:36]
    summary.append(f"  - {pid} actions={len(acts)} {title!r}")
    if acts and not picked_pid:
        picked_pid = pid
        picked_action = (acts[0].get("actionId") or "").strip()

for line in summary:
    print(line, file=sys.stderr)

if not picked_pid:
    print("  ✗ 列表中无任何 problem 返回 detail.actions[]", file=sys.stderr)
    sys.exit(2)

print(f"  → 选用 {picked_pid!r} actionId={picked_action!r}", file=sys.stderr)
print(picked_pid, picked_action)
PY
)" || {
    rc=$?
    if [[ "$rc" -eq 2 ]]; then
      echo ""
      echo "提示: 显式指定有 actions 的问题，例如:"
      echo "  npm run decision-center:resolutions-probe -- ${TRIP_ID} 'dp_id:coverage-gap:1' option-1"
      exit 1
    fi
    echo "✗ 无法自动选取 problemId"
    exit 1
  }
fi

ENC_PROBLEM=$(enc "$PROBLEM_ID")
DETAIL_URL="${BASE}/trips/${TRIP_ID}/decision-problems/${ENC_PROBLEM}"

echo ""
echo "=== GET detail: ${PROBLEM_ID} ==="
DETAIL=$(curl -sS -m 25 "${AUTH_HEADER[@]}" "$DETAIL_URL")
python3 - <<PY
import json, sys
raw = json.loads('''${DETAIL}''')
data = raw.get("data") or {}
acts = data.get("actions") or []
print(f"  schemaId={data.get('schemaId')!r}")
print(f"  actions={len(acts)}")
for a in acts[:6]:
    print(f"    - actionId={a.get('actionId')!r} title={str(a.get('title',''))[:40]!r} allowed={a.get('allowed')}")
if not acts:
    print("  ⚠ actions 为空 — 前端不应允许提交 resolutions")
PY

if [[ -z "$ACTION_ID" ]]; then
  ACTION_ID=$(python3 - <<PY
import json
raw = json.loads('''${DETAIL}''')
acts = (raw.get("data") or {}).get("actions") or []
if acts:
    print(acts[0].get("actionId") or "")
PY
)
fi

if [[ -z "$ACTION_ID" ]]; then
  echo ""
  echo "⊘ 跳过 POST — detail.actions 为空，无法 submit resolutions"
  echo "  显式指定: npm run decision-center:resolutions-probe -- TRIP_ID PROBLEM_ID ACTION_ID"
  exit 1
fi

RES_URL="${DETAIL_URL}/resolutions"
BODY=$(python3 - <<PY
import json
print(json.dumps({
  "selectedActionId": "${ACTION_ID}",
  "idempotencyKey": f"resolution:${TRIP_ID}:${PROBLEM_ID}:${ACTION_ID}:probe",
}, ensure_ascii=False))
PY
)

echo ""
echo "=== POST resolutions (selectedActionId=${ACTION_ID}) ==="
echo "  payload: ${BODY}"
RESP=$(curl -sS -m 25 "${AUTH_HEADER[@]}" -X POST "$RES_URL" \
  -H "Content-Type: application/json" \
  -d "$BODY")
echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"

python3 - <<PY
import json, sys
raw = json.loads('''${RESP}''')
if raw.get("success"):
    res = (raw.get("data") or {}).get("resolution") or raw.get("data") or {}
    print(f"\n✓ resolutionId={res.get('resolutionId')!r} nextStep={res.get('nextStep')!r}")
    sys.exit(0)
err = raw.get("error") or {}
msg = err.get("message") or ""
code = err.get("code") or ""
if "undefined" in msg and "DECISION_ACTION" in msg:
    print("\n✗ 后端未读到 selectedActionId（body 解析或 normalize 未部署）")
    print("  期望: VALIDATION_ERROR DECISION_ACTION_REQUIRED 或 success resolution")
    sys.exit(1)
if code == "NOT_FOUND" and "ACTION" in msg:
    print(f"\n✗ action 未匹配: {msg}")
    sys.exit(1)
print(f"\n✗ {code}: {msg}")
sys.exit(1)
PY
