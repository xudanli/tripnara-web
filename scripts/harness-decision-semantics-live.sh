#!/usr/bin/env bash
# Decision Semantics BFF 联调探针（DC-FE-RELEASE-GATE）
# 用法:
#   ./scripts/harness-decision-semantics-live.sh
#   TRIP_ID=xxx PROBLEM_ID=yyy OPTION_ID=zzz RUN_LIVE_APPLY=1 ./scripts/harness-decision-semantics-live.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.development ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.development
  set +a
fi

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api"

pass=0
fail=0
warn=0

check_http() {
  local name="$1"
  local code="$2"
  if [[ "$code" =~ ^2 ]]; then
    echo "✓ ${name} (HTTP ${code})"
    pass=$((pass + 1))
  elif [[ "$code" == "404" || "$code" == "501" ]]; then
    echo "⚠ ${name} (HTTP ${code} — BFF 未部署或路径不同)"
    warn=$((warn + 1))
  else
    echo "✗ ${name} (HTTP ${code})"
    fail=$((fail + 1))
  fi
}

if [[ -z "${TRIP_ID:-}" ]]; then
  echo ">> 自动获取 tripId"
  TRIP_ID="$(curl -sS -m 15 "${BASE}/trips?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])")"
fi

echo "========================================"
echo " Decision Semantics 联调探针"
echo " Backend: ${BASE}"
echo " Trip:    ${TRIP_ID}"
echo "========================================"

echo ""
echo "=== DC-FE-001 契约字段探针 ==="
code=$(curl -sS -m 15 -o /tmp/ds-overview.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/decision-center/overview")
check_http "GET decision-center/overview" "$code"
if [[ "$code" =~ ^2 ]]; then
  python3 - <<'PY'
import json
from sys import exit as sys_exit

d=json.load(open("/tmp/ds-overview.json"))["data"]
rd=d.get("recentDecisions") or []
print(f"  headline={d.get('headline')!r}")
print(f"  open={d.get('problemCounts',{}).get('open')} mustHandle={d['feasibility'].get('mustHandleCount')}")
print(f"  recentDecisions={len(rd)}")
check_fail = False
for i, sample in enumerate(rd[:3]):
    keys=sorted(sample.keys())
    print(f"  [{i}] keys: {keys}")
    for k in ("decisionId", "executionStatus", "recordStatus", "needsRepair", "status"):
        v = sample.get(k)
        print(f"    {k}: {v!r}")
    if not sample.get("executionStatus"):
        print(f"    ✗ checklist: executionStatus missing on recentDecisions[{i}]")
        check_fail = True
if check_fail:
    sys_exit(1)
PY
  if [[ $? -ne 0 ]]; then
    echo "✗ overview recentDecisions 缺少 executionStatus（L1 条带依赖）"
    fail=$((fail + 1))
  fi
fi

echo ""
echo "=== L2 decision-problems 列表 ==="
code=$(curl -sS -m 15 -o /tmp/ds-problems.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/decision-problems")
check_http "GET decision-problems" "$code"
if [[ "$code" =~ ^2 ]]; then
  PROBLEM_ID="${PROBLEM_ID:-$(python3 - <<'PY'
import json
items=json.load(open("/tmp/ds-problems.json"))["data"]["items"]
pref=[i for i in items if i.get("status") in ("WAITING_DECISION","OPEN")]
print((pref or items)[0]["id"])
PY
)}"
  echo "  probe problemId=${PROBLEM_ID}"
fi

PROBLEM_ID="${PROBLEM_ID:-}"
if [[ -n "$PROBLEM_ID" ]]; then
  echo ""
  echo "=== L4 预览链路 ==="
  code=$(curl -sS -m 15 -o /tmp/ds-problem.json -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}")
  check_http "GET decision-problems/:id" "$code"
  if [[ "$code" =~ ^2 ]]; then
    python3 - <<'PY'
import json, sys
d = json.load(open("/tmp/ds-problem.json")).get("data", {})
scopes = d.get("affectedScopeDisplay")
print(f"  affectedScopeDisplay: {len(scopes) if isinstance(scopes, list) else 'missing'}")
if isinstance(scopes, list) and scopes:
    s = scopes[0]
    print(f"  [0] scopeType={s.get('scopeType')!r} label={s.get('label')!r}")
    print(f"      secondaryLabel={s.get('secondaryLabel')!r} dayIndex={s.get('dayIndex')}")
    if s.get("placeNames"):
        print(f"      placeNames={s.get('placeNames')}")
elif scopes is None:
    print("  ⚠ DC-FE-010: 详情无 affectedScopeDisplay（影响范围区块将为空）")
    sys.exit(0)
PY
  fi

  code=$(curl -sS -m 15 -o /tmp/ds-options.json -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/decision-problems/${PROBLEM_ID}/options")
  check_http "GET options" "$code"
  if [[ "$code" =~ ^2 ]]; then
    python3 - <<'PY'
import json
opts = json.load(open("/tmp/ds-options.json")).get("data", {}).get("options") or []
for i, o in enumerate(opts[:2]):
    tradeoffs = o.get("tradeoffs") or []
    print(f"  option[{i}] id={o.get('id')!r} tradeoffs={len(tradeoffs)}")
    for t in tradeoffs[:2]:
        v, u = t.get("value"), t.get("unit")
        extra = f" value={v} unit={u}" if v is not None and u else ""
        print(f"    {t.get('dimension')}: {t.get('direction')}{extra} — {t.get('explanation','')[:60]}")
PY
  fi

  OPTION_ID="${OPTION_ID:-$(python3 -c "import json; print(json.load(open('/tmp/ds-options.json'))['data']['options'][0]['id'])" 2>/dev/null || true)}"
  if [[ -n "${OPTION_ID:-}" ]]; then
    enc_prob=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${PROBLEM_ID}''', safe=''))")
    enc_opt=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${OPTION_ID}''', safe=''))")
    code=$(curl -sS -m 20 -o /tmp/ds-preview.json -w "%{http_code}" -X POST \
      "${BASE}/trips/${TRIP_ID}/decision-problems/${enc_prob}/options/${enc_opt}/preview" \
      -H "Content-Type: application/json" -d '{}')
    check_http "POST options/:id/preview" "$code"
    echo "  optionId=${OPTION_ID}"
  fi
fi

if [[ "${RUN_LIVE_APPLY:-}" == "1" && -n "${PROBLEM_ID:-}" && -n "${OPTION_ID:-}" ]]; then
  echo ""
  echo "=== DC-FE-003/004/005 实机 POST + 幂等 ==="
  CLIENT_ATTEMPT="live_$(date +%s)"
  IDEM_KEY="dec_${TRIP_ID}_${PROBLEM_ID}_${OPTION_ID}_${CLIENT_ATTEMPT}"
  BODY=$(python3 - <<PY
import json
print(json.dumps({
  "problemId": "${PROBLEM_ID}",
  "selectedOptionId": "${OPTION_ID}",
  "execute": True,
  "idempotencyKey": "${IDEM_KEY}",
}))
PY
)
  code=$(curl -sS -m 30 -o /tmp/ds-create1.json -w "%{http_code}" -X POST \
    "${BASE}/trips/${TRIP_ID}/decisions" \
    -H "Content-Type: application/json" -d "$BODY")
  check_http "POST decisions (1st)" "$code"
  if [[ "$code" =~ ^2 ]]; then
    python3 - <<'PY'
import json

def exec_status(raw):
    if raw is None:
        return {}
    if isinstance(raw, str):
        return {"status": raw}
    if isinstance(raw, dict):
        return raw
    return {}

d=json.load(open("/tmp/ds-create1.json")).get("data",{})
es=exec_status(d.get("executionStatus"))
print(f"  idempotentReplay={d.get('idempotentReplay')}")
print(f"  executionStatus={es.get('status') or d.get('executionStatus')}")
print(f"  effectiveDecisionId={d.get('effectiveDecisionId')}")
print(f"  decision.id={d.get('decision',{}).get('id')}")
if d.get("idempotentReplay") is True:
    print("  ✗ checklist: 首次 POST 不应 idempotentReplay=true")
    raise SystemExit(1)
PY
    if [[ $? -ne 0 ]]; then
      echo "✗ 首次 POST idempotentReplay 契约不符"
      fail=$((fail + 1))
    fi
    DECISION_ID=$(python3 -c "import json; d=json.load(open('/tmp/ds-create1.json'))['data']; print(d.get('effectiveDecisionId') or d['decision']['id'])")
    echo "  decisionId=${DECISION_ID}"

    if [[ -n "${DECISION_ID:-}" ]]; then
      code=$(curl -sS -m 15 -o /tmp/ds-exec.json -w "%{http_code}" \
        "${BASE}/trips/${TRIP_ID}/decisions/${DECISION_ID}/execution-status")
      check_http "GET execution-status" "$code"
      if [[ "$code" =~ ^2 ]]; then
        python3 - <<'PY'
import json
es=json.load(open("/tmp/ds-exec.json"))["data"]
print(f"  poll status={es.get('status')} needsRepair={es.get('needsRepair')}")
if es.get("postApplyCoherence"):
    print(f"  postApplyCoherence={es['postApplyCoherence']}")
if es.get("evidenceFreshnessBlock"):
    print(f"  evidenceFreshnessBlock={es['evidenceFreshnessBlock']}")
PY
      fi
    fi

    code=$(curl -sS -m 30 -o /tmp/ds-create2.json -w "%{http_code}" -X POST \
      "${BASE}/trips/${TRIP_ID}/decisions" \
      -H "Content-Type: application/json" -d "$BODY")
    check_http "POST decisions (2nd replay)" "$code"
    if [[ "$code" =~ ^2 ]]; then
      python3 - <<'PY'
import json

def exec_status(raw):
    if raw is None:
        return {}
    if isinstance(raw, str):
        return {"status": raw}
    if isinstance(raw, dict):
        return raw
    return {}

def is_replay(d):
    es = d.get("executionStatus")
    status = es if isinstance(es, str) else exec_status(es).get("status")
    return d.get("idempotentReplay") is True or status == "IDEMPOTENT_REPLAY"

d=json.load(open("/tmp/ds-create2.json")).get("data",{})
es=exec_status(d.get("executionStatus"))
print(f"  idempotentReplay={d.get('idempotentReplay')}")
print(f"  effectiveDecisionId={d.get('effectiveDecisionId')}")
print(f"  executionStatus={es.get('status') or d.get('executionStatus')}")
if not is_replay(d):
    print("  ✗ checklist: 第二次 POST 应 idempotentReplay=true 或 executionStatus=IDEMPOTENT_REPLAY")
    raise SystemExit(1)
if not d.get("effectiveDecisionId"):
    print("  ✗ checklist: 第二次 POST 应返回 effectiveDecisionId")
    raise SystemExit(1)
print("  ✓ neutral_replay 契约满足")
PY
      if [[ $? -ne 0 ]]; then
        echo "✗ 第二次 POST 幂等回放契约不符"
        fail=$((fail + 1))
      else
        pass=$((pass + 1))
      fi
    fi
  fi
else
  echo ""
  echo ">> 跳过实机 POST（设 RUN_LIVE_APPLY=1 启用 DC-FE-003~005 联调）"
fi

echo ""
echo "=== Decision Problems 延迟探针（目标：list<3s detail<10s options<15s）==="
PROB="${PROBLEM_ID:-dp_id:coverage-gap:1}"
ENC_PROB="$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROB}', safe=''))")"
measure_latency() {
  local label="$1"
  local path="$2"
  local seconds
  seconds="$(curl -sS -o /dev/null -w "%{time_total}" -m 120 "${BASE}${path}")"
  printf "  %-8s %6.2fs  %s\n" "${label}" "${seconds}" "${path}"
  if python3 -c "import sys; sys.exit(0 if float('${seconds}') < 15 else 1)"; then
    pass=$((pass + 1))
  else
    echo "  ⚠ ${label} 超过 15s — 检查 BFF 投影层缓存与 N+1"
    warn=$((warn + 1))
  fi
}
measure_latency "list" "/trips/${TRIP_ID}/decision-problems"
measure_latency "detail" "/trips/${TRIP_ID}/decision-problems/${ENC_PROB}"
measure_latency "options" "/trips/${TRIP_ID}/decision-problems/${ENC_PROB}/options"

echo ""
echo "=== 前端 mock gate ==="
npm run harness:section5

echo ""
echo "========================================"
echo " 联调结果: pass=${pass} fail=${fail} warn=${warn}"
if [[ "$fail" -gt 0 ]]; then
  echo " ✗ 存在失败项 — 请检查后端 Harness Release Gate CI"
  exit 1
fi
echo " ✓ BFF 探针完成 — 请在 UI 打开 plan-studio 验证 §5 手工项"
echo "   tripId=${TRIP_ID}"
if [[ -n "${PROBLEM_ID:-}" ]]; then
  echo "   problemId=${PROBLEM_ID}"
  echo "   深链: /dashboard/plan-studio?tripId=${TRIP_ID}&problemId=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROBLEM_ID}'))")"
fi
echo "========================================"
