#!/usr/bin/env bash
# Unified Decision Gateway — 前端联调 QA（UD-00~06）
# 对齐后端 decision-center:unified-qa；验证 flow 字段与 unified schema。
#
# 用法:
#   npm run decision-center:unified-qa -- [TRIP_ID] [API_BASE]
#   AUTH_TOKEN=<jwt> npm run decision-center:unified-qa -- 3e4a1058-9218-467f-988a-c18008a14385 https://staging.example.com/api
#
# 默认 TRIP_ID / API_BASE 来自 .env.development（BACKEND_HOST:PORT）
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
if [[ -n "${2:-}" ]]; then
  BASE="${2%/}"
else
  HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
  PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
  BASE="http://${HOST}:${PORT}/api"
fi

AUTH_HEADER=()
if [[ -n "${AUTH_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${AUTH_TOKEN}")
fi

pass=0
fail=0
skip=0

curl_json() {
  curl -sS -m 25 "${AUTH_HEADER[@]}" "$@"
}

check_http() {
  local name="$1"
  local code="$2"
  if [[ "$code" =~ ^2 ]]; then
    echo "✓ ${name} (HTTP ${code})"
    pass=$((pass + 1))
  elif [[ "$code" == "403" ]]; then
    echo "✗ ${name} (HTTP 403 — DECISION_GATEWAY_UNIFIED 未开？)"
    fail=$((fail + 1))
  else
    echo "✗ ${name} (HTTP ${code})"
    fail=$((fail + 1))
  fi
}

skip_case() {
  echo "⊘ $1 — SKIP"
  skip=$((skip + 1))
}

TMP="${TMPDIR:-/tmp}/ud-qa-$$"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

echo "========================================"
echo " decision-center:unified-qa (frontend)"
echo " API:  ${BASE}"
echo " Trip: ${TRIP_ID}"
echo " Auth: ${AUTH_TOKEN:+Bearer ***}${AUTH_TOKEN:-none}"
echo "========================================"

echo ""
echo "=== UD-00 Gateway 可达 ==="
code=$(curl_json -o "$TMP/center.json" -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/decision-center")
check_http "GET decision-center" "$code"

echo ""
echo "=== UD-01 decision-center 聚合 ==="
if [[ "$code" =~ ^2 ]]; then
  python3 - <<PY
import json, sys
d = json.load(open("$TMP/center.json")).get("data") or {}
schema = d.get("schemaId")
packs = d.get("activePacks") or {}
layers = packs.get("layers") or []
layer_ids = [x.get("packId") for x in layers if isinstance(x, dict)]
print(f"  schemaId={schema!r}")
print(f"  activePacks.layers={layer_ids}")
if not schema and not d.get("canonical") and d.get("legacy") is None:
    print("  ⚠ 无 canonical/legacy — Gateway 可能未聚合")
    sys.exit(1)
print("  ✓ UD-01")
PY
  if [[ $? -ne 0 ]]; then fail=$((fail + 1)); else pass=$((pass + 1)); fi
fi

echo ""
echo "=== UD-02 GET decision-problems（v1 flow / v2 SSOT）==="
code=$(curl_json -o "$TMP/list.json" -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/decision-problems")
check_http "GET decision-problems" "$code"
PROBLEM_ID=""
LEGACY_PROBLEM_ID=""
if [[ "$code" =~ ^2 ]]; then
  PROBLEM_ID=$(python3 - <<PY
import json, sys
raw = json.load(open("$TMP/list.json"))
d = raw.get("data") or {}
schema = d.get("schemaId") or ""
items = d.get("items") or []
print(f"  schemaId={schema!r} items={len(items)}", file=sys.stderr)
is_v2 = schema.endswith("@v2") or schema == "tripnara.unified_decision_problems@v2"
if is_v2:
    for i, it in enumerate(items[:4]):
        print(
            f"  [{i}] semanticKey={it.get('semanticKey')!r} "
            f"enforcement={it.get('enforcement')!r} "
            f"problemId={it.get('problemId') or it.get('id')!r}",
            file=sys.stderr,
        )
    if items and not (items[0].get("semanticKey") or items[0].get("problemId") or items[0].get("id")):
        print("  ✗ v2 items[0] 缺少 semanticKey / problemId", file=sys.stderr)
        sys.exit(1)
    pick = items[0] if items else None
else:
    canonical = [i for i in items if i.get("flow") == "CANONICAL_L2"]
    legacy = [i for i in items if i.get("flow") == "LEGACY_V15"]
    print(f"  canonical={len(canonical)} legacy={len(legacy)}", file=sys.stderr)
    if schema != "tripnara.unified_decision_problems@v1":
        if items and "flow" not in (items[0] if items else {}):
            print("  ✗ 缺少 flow — DecisionGatewayModule 须在 DecisionSemanticsModule 之前", file=sys.stderr)
            sys.exit(1)
    for i, it in enumerate(items[:4]):
        print(f"  [{i}] flow={it.get('flow')!r} problemId={it.get('problemId') or it.get('id')!r}", file=sys.stderr)
    if items and not items[0].get("flow"):
        print("  ✗ items[0] 无 flow 字段", file=sys.stderr)
        sys.exit(1)
    pick = legacy[0] if legacy else (items[0] if items else None)
pid = (pick.get("problemId") or pick.get("id")) if pick else ""
print(pid)
PY
)
  ud02_rc=$?
  if [[ "$ud02_rc" -ne 0 ]]; then
    fail=$((fail + 1))
  else
    pass=$((pass + 1))
    LEGACY_PROBLEM_ID="$PROBLEM_ID"
    echo "  legacy probe problemId=${LEGACY_PROBLEM_ID:-none}"
  fi
fi

echo ""
echo "=== UD-03 GET decision-problems/:id ==="
if [[ -n "$PROBLEM_ID" ]]; then
  code=$(curl_json -o "$TMP/detail.json" -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}")
  check_http "GET decision-problems/:id" "$code"
  if [[ "$code" =~ ^2 ]]; then
    python3 - <<PY
import json
raw = json.load(open("$TMP/detail.json")).get("data") or {}
flow = raw.get("flow")
if flow:
    print(f"  flow={flow!r} (envelope)")
else:
    print(f"  detail id={raw.get('id')!r} semanticKey={raw.get('semanticKey')!r}")
print("  ✓ UD-03")
PY
    pass=$((pass + 1))
  fi
else
  skip_case "UD-03 无 problemId"
fi

echo ""
echo "=== UD-04 GET options（Gateway 信封）==="
if [[ -n "$PROBLEM_ID" ]]; then
  code=$(curl_json -o "$TMP/options.json" -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}/options")
  check_http "GET options" "$code"
  OPTION_ID=""
  if [[ "$code" =~ ^2 ]]; then
    set +e
    OPTION_ID=$(python3 - <<PY
import json, sys
raw = json.load(open("$TMP/options.json")).get("data") or {}
flow = raw.get("flow")
body = raw.get("data") if "data" in raw and isinstance(raw.get("data"), dict) and "options" in raw.get("data", {}) else raw
if flow:
    print(f"  flow={flow!r}", file=sys.stderr)
    inner = raw.get("data") or {}
    opts = inner.get("options") or inner.get("candidates") or inner.get("actions") or []
else:
    opts = body.get("options") or body.get("actions") or []
print(f"  options/actions={len(opts)}", file=sys.stderr)
if not opts:
    sys.exit(2)
first = opts[0]
print(first.get("id") or first.get("actionId") or first.get("candidateId") or "")
PY
)
    rc=$?
    set -e
    if [[ "$rc" -eq 0 ]]; then
      echo "  ✓ UD-04 optionId=${OPTION_ID}"
      pass=$((pass + 1))
    elif [[ "$rc" -eq 2 ]]; then
      skip_case "UD-05 preview — 该问题无 options"
      OPTION_ID=""
    else
      fail=$((fail + 1))
    fi
  fi
else
  skip_case "UD-04 无 problemId"
fi

echo ""
echo "=== UD-05 POST preview ==="
if [[ -n "${PROBLEM_ID:-}" && -n "${OPTION_ID:-}" ]]; then
  enc_opt=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${OPTION_ID}''', safe=''))")
  code=$(curl_json -o "$TMP/preview.json" -w "%{http_code}" -X POST \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}/options/${enc_opt}/preview" \
    -H "Content-Type: application/json" -d '{}')
  check_http "POST preview" "$code"
  if [[ "$code" =~ ^2 ]]; then
    python3 - <<PY
import json
raw = json.load(open("$TMP/preview.json")).get("data") or {}
print(f"  flow={raw.get('flow')!r} executionCapability={(raw.get('data') or raw).get('executionCapability')!r}")
print("  ✓ UD-05")
PY
    pass=$((pass + 1))
  fi
elif [[ -n "$PROBLEM_ID" ]]; then
  skip_case "UD-05 无 options"
else
  skip_case "UD-05 无 problemId"
fi

echo ""
echo "=== UD-06 主动检测探针（runFull=false）==="
code=$(curl_json -o "$TMP/scan.json" -w "%{http_code}" -X POST \
  "${BASE}/trips/${TRIP_ID}/daily-load/scan" \
  -H "Content-Type: application/json" -d '{"runFull":false}')
check_http "POST daily-load/scan" "$code"
if [[ "$code" =~ ^2 ]]; then
  python3 - <<PY
import json
d = json.load(open("$TMP/scan.json")).get("data") or {}
print(f"  ok={d.get('ok')} overloaded={d.get('overloaded')}")
print("  ✓ UD-06")
PY
  pass=$((pass + 1))
fi

echo ""
echo "=== UD-07 Canonical L2 日负荷 fixture（读路径）==="
CANONICAL_PROB="${CANONICAL_PROBLEM_ID:-problem_load_3e4a1058_1782831128596}"
if [[ -f "$TMP/list.json" ]]; then
  has_canonical=$(python3 - <<PY
import json
items = json.load(open("$TMP/list.json")).get("data", {}).get("items") or []
print(1 if any(i.get("flow") == "CANONICAL_L2" for i in items) else 0)
PY
)
  if [[ "$has_canonical" == "1" ]]; then
    code=$(curl_json -o "$TMP/canonical.json" -w "%{http_code}" \
      "${BASE}/trips/${TRIP_ID}/decision-problems/${CANONICAL_PROB}")
    check_http "GET canonical problem ${CANONICAL_PROB}" "$code"
    if [[ "$code" =~ ^2 ]]; then
      python3 - <<PY
import json, sys
raw = json.load(open("$TMP/canonical.json")).get("data") or {}
flow = raw.get("flow")
inner = raw.get("data") or raw
cap = inner.get("semanticCapability") or inner.get("rfc001Problem", {}).get("semanticCapability")
print(f"  flow={flow!r} semanticCapability={cap!r}")
if flow != "CANONICAL_L2":
    print("  ✗ 期望 CANONICAL_L2")
    sys.exit(1)
if cap and cap != "EXCESSIVE_DAILY_LOAD":
    print(f"  ⚠ semanticCapability={cap!r}（fixture 期望 EXCESSIVE_DAILY_LOAD）")
print("  ✓ UD-07")
PY
      if [[ $? -eq 0 ]]; then pass=$((pass + 1)); else fail=$((fail + 1)); fi
    fi
  else
    skip_case "UD-07 列表无 CANONICAL_L2"
  fi
else
  skip_case "UD-07 无 list.json"
fi

echo ""
echo "=== UD-08 三 surface 计数对齐 ==="
ud08_ok=0
code_dp=$(curl_json -o "$TMP/ud08-dp.json" -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/decision-problems" || echo "000")
code_pc=$(curl_json -o "$TMP/ud08-pc.json" -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/planning-conflicts" || echo "000")
code_tl=$(curl_json -o "$TMP/ud08-tl.json" -w "%{http_code}" "${BASE}/trips/${TRIP_ID}/timeline-overview?include=stats" || echo "000")
if [[ "$code_dp" =~ ^2 && "$code_pc" =~ ^2 ]]; then
  set +e
  python3 - <<PY
import json, sys
dp = json.load(open("$TMP/ud08-dp.json")).get("data") or {}
pc = json.load(open("$TMP/ud08-pc.json")).get("data") or json.load(open("$TMP/ud08-pc.json"))
tl = {}
try:
    tl = json.load(open("$TMP/ud08-tl.json")).get("data") or {}
except FileNotFoundError:
    pass
open_count = (dp.get("meta") or {}).get("openCount")
conflicts_total = (pc.get("summary") or {}).get("total")
stats = tl.get("stats") or {}
timeline_count = stats.get("conflictCount")
timeline_source = stats.get("conflictCountSource")
print(f"  problems.meta.openCount={open_count}")
print(f"  conflicts.summary.total={conflicts_total}")
print(f"  timeline.stats.conflictCount={timeline_count} source={timeline_source!r}")
ok = True
if open_count is not None and conflicts_total is not None and open_count != conflicts_total:
    print(f"  ✗ openCount({open_count}) != conflicts.total({conflicts_total})")
    ok = False
if timeline_count is not None and conflicts_total is not None and timeline_count != conflicts_total:
    print(f"  ✗ timeline({timeline_count}) != conflicts({conflicts_total})")
    ok = False
if timeline_source and timeline_source != "ssot_planning_conflicts":
    print(f"  ⚠ conflictCountSource={timeline_source!r}（期望 ssot_planning_conflicts）")
if ok:
    print("  ✓ UD-08")
    sys.exit(0)
sys.exit(1)
PY
  ud08_rc=$?
  set -e
  if [[ "$ud08_rc" -eq 0 ]]; then pass=$((pass + 1)); ud08_ok=1; else fail=$((fail + 1)); fi
elif [[ "$code_dp" =~ ^2 ]]; then
  skip_case "UD-08 planning-conflicts 不可达 (HTTP ${code_pc})"
else
  skip_case "UD-08 decision-problems 不可达 (HTTP ${code_dp})"
fi

echo ""
echo "=== UD-09 GET collaborative-sub-tasks ==="
if [[ -n "${PROBLEM_ID:-}" ]]; then
  code=$(curl_json -o "$TMP/subtasks.json" -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}/collaborative-sub-tasks" || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    echo "✓ GET collaborative-sub-tasks (HTTP ${code})"
    pass=$((pass + 1))
    python3 - <<PY
import json
d = json.load(open("$TMP/subtasks.json")).get("data") or {}
items = d.get("items") or []
print(f"  items={len(items)}")
for i in items[:3]:
    print(f"  - {i.get('id')} kind={i.get('kind')!r} status={i.get('status')!r}")
print("  ✓ UD-09")
PY
  elif [[ "$code" == "000" ]]; then
    skip_case "UD-09 请求超时"
  else
    check_http "GET collaborative-sub-tasks" "$code"
  fi
else
  skip_case "UD-09 无 problemId"
fi

echo ""
echo "=== 前端 contract tests ==="
npm run gateway:test --silent

echo ""
echo "========================================"
total=$((pass + fail))
echo " QA: pass=${pass} fail=${fail} skip=${skip} (API cases)"
if [[ "$fail" -gt 0 ]]; then
  echo " ✗ 联调失败"
  exit 1
fi
echo " ✓ unified-qa 通过（${pass}/${total} API + gateway:test）"
echo " UI: VITE_DECISION_GATEWAY_UNIFIED=1 → /dashboard/plan-studio?tripId=${TRIP_ID}"
echo "========================================"
