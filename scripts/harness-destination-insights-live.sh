#!/usr/bin/env bash
# Destination Insight BFF + decision-checker evidence 联调探针
#
# 用法:
#   ./scripts/harness-destination-insights-live.sh
#   TRIP_ID=3e4a1058-9218-467f-988a-c18008a14385 ./scripts/harness-destination-insights-live.sh
#   FOCUS_CONFLICT_ID=issue-gap-1 PROBLEM_ID=dp_id:... ./scripts/harness-destination-insights-live.sh
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

TRIP_ID="${TRIP_ID:-3e4a1058-9218-467f-988a-c18008a14385}"
FOCUS_CONFLICT_ID="${FOCUS_CONFLICT_ID:-}"
PROBLEM_ID="${PROBLEM_ID:-}"

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

echo "========================================"
echo " Destination Insights 联调探针"
echo " Backend: ${BASE}"
echo " Trip:    ${TRIP_ID}"
echo "========================================"

echo ""
echo "=== 0. 后端连通性 ==="
code=$(curl -sS -m 10 -o /tmp/di-health.json -w "%{http_code}" "${BASE}/trips?limit=1" || echo "000")
if [[ ! "$code" =~ ^2 ]]; then
  echo "✗ 无法连接后端 ${BASE} (HTTP ${code})"
  echo "  请确认 BACKEND_HOST/BACKEND_PORT 与后端进程已启动"
  exit 1
fi
echo "✓ 后端可达 (HTTP ${code})"
pass=$((pass + 1))

echo ""
echo "=== 1. decision-checker · destination_knowledge 证据 ==="
qs="constraintsVersion=0"
if [[ -n "$FOCUS_CONFLICT_ID" ]]; then
  qs="${qs}&focusConflictId=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${FOCUS_CONFLICT_ID}'))")"
fi
code=$(curl -sS -m 45 -o /tmp/di-dc.json -w "%{http_code}" \
  "${BASE}/trips/${TRIP_ID}/decision-checker?${qs}")
check_http "GET decision-checker" "$code"
if [[ "$code" =~ ^2 ]]; then
  python3 - <<'PY'
import json, sys

d = json.load(open("/tmp/di-dc.json"))
data = d.get("data", d)
items = (data.get("evidence") or {}).get("items") or []
kinds = sorted({str(i.get("kind")) for i in items})
dk = [i for i in items if i.get("kind") == "destination_knowledge"]
print(f"  evidence items: {len(items)}")
print(f"  kinds: {kinds}")
print(f"  destination_knowledge: {len(dk)}")
for i, item in enumerate(dk[:3]):
    print(f"  [dk-{i}] title={item.get('title')!r}")
    print(f"         subtitle={str(item.get('subtitle',''))[:80]!r}")
    print(f"         reliability={item.get('reliability')!r}")
if not items:
    print("  ⚠ 无 evidence items（需先跑可行性/生成方案）")
PY
fi

echo ""
echo "=== 2. 解析 focusConflictId / problemId ==="
if [[ -z "$FOCUS_CONFLICT_ID" || -z "$PROBLEM_ID" ]]; then
  code=$(curl -sS -m 20 -o /tmp/di-pc.json -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/planning-conflicts?includeConstraintsSummary=1")
  check_http "GET planning-conflicts" "$code"
  if [[ "$code" =~ ^2 ]]; then
    readarray -t _scope_vars < <(python3 - <<'PY'
import json
d = json.load(open("/tmp/di-pc.json"))
data = d.get("data", d)
conflicts = data.get("conflicts") or []
problems = data.get("decisionProblems") or data.get("decision_problems") or []
fc = conflicts[0]["id"] if conflicts else ""
pid = problems[0]["id"] if problems else ""
if fc:
    print(f"FOCUS_CONFLICT_ID={fc}")
if pid:
    print(f"PROBLEM_ID={pid}")
print(f"echo auto focusConflictId={fc!r}")
print(f"echo auto problemId={pid!r}")
PY
)
    for line in "${_scope_vars[@]}"; do
      if [[ "$line" == FOCUS_CONFLICT_ID=* ]]; then
        FOCUS_CONFLICT_ID="${line#FOCUS_CONFLICT_ID=}"
      elif [[ "$line" == PROBLEM_ID=* ]]; then
        PROBLEM_ID="${line#PROBLEM_ID=}"
      elif [[ "$line" == echo* ]]; then
        eval "$line"
      fi
    done
  fi
fi

FOCUS_CONFLICT_ID="${FOCUS_CONFLICT_ID:-}"
PROBLEM_ID="${PROBLEM_ID:-}"

if [[ -z "$FOCUS_CONFLICT_ID" && -z "$PROBLEM_ID" ]]; then
  echo "⚠ 无冲突/决策问题 scope，跳过 destination-insights 探针"
  warn=$((warn + 1))
else
  echo ""
  echo "=== 3. GET destination-insights（默认无 RAG）==="
  params=()
  [[ -n "$FOCUS_CONFLICT_ID" ]] && params+=("focusConflictId=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${FOCUS_CONFLICT_ID}'))")")
  [[ -n "$PROBLEM_ID" ]] && params+=("problemId=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROBLEM_ID}'))")")
  query=$(IFS='&'; echo "${params[*]}")

  code=$(curl -sS -m 30 -D /tmp/di-ins-headers.txt -o /tmp/di-ins.json -w "%{http_code}" \
    "${BASE}/trips/${TRIP_ID}/destination-insights?${query}")
  check_http "GET destination-insights" "$code"
  if [[ "$code" =~ ^2 ]]; then
    ETAG=$(grep -i '^etag:' /tmp/di-ins-headers.txt | head -1 | sed 's/^[Ee][Tt][Aa][Gg]: *//' | tr -d '\r\n')
    python3 - <<'PY'
import json

d = json.load(open("/tmp/di-ins.json"))
data = d.get("data", d)
raw_insights = data.get("insights")
if isinstance(raw_insights, list):
    entries = raw_insights
    payload = {}
elif isinstance(raw_insights, dict):
    bundle = data.get("bundle") or {}
    payload = raw_insights
    entries = (bundle.get("insights") or []) + (payload.get("insights") or [])
else:
    entries = []
    payload = {}
items = payload.get("items") or []
tips = payload.get("tips") or []
rag = payload.get("rag") or []
print(f"  schemaId: {data.get('schemaId')!r}")
print(f"  insights entries: {len(entries)}")
print(f"  items/tips/rag: {len(items)}/{len(tips)}/{len(rag)}")
for i, e in enumerate(entries[:3]):
    refs = e.get("sourceRefs") or []
    ref_labels = [r.get("label") or r.get("refId") or r.get("id") for r in refs]
    print(f"  [{i}] title={e.get('title')!r} explanatoryOnly={e.get('explanatoryOnly')}")
    print(f"       summary={str(e.get('summary',''))[:80]!r}")
    if ref_labels:
        print(f"       sourceRefs={ref_labels}")
PY
    echo "  ETag: ${ETAG:-<none>}"

    if [[ -n "${ETAG:-}" ]]; then
      echo ""
      echo "=== 4. If-None-Match / 304 ==="
      code304=$(curl -sS -m 15 -D /tmp/di-ins-304-headers.txt -o /tmp/di-ins-304.body -w "%{http_code}" \
        -H "If-None-Match: ${ETAG}" \
        "${BASE}/trips/${TRIP_ID}/destination-insights?${query}")
      if [[ "$code304" == "304" ]]; then
        echo "✓ GET destination-insights (If-None-Match) → 304"
        pass=$((pass + 1))
      elif [[ "$code304" =~ ^2 ]]; then
        echo "⚠ 服务端未返回 304（HTTP ${code304}），前端仍可用 staleTime 缓存"
        warn=$((warn + 1))
      else
        echo "✗ If-None-Match 探针失败 (HTTP ${code304})"
        fail=$((fail + 1))
      fi
    fi

    echo ""
    echo "=== 5. includeRag=1（最多 3 条）==="
    code=$(curl -sS -m 45 -o /tmp/di-ins-rag.json -w "%{http_code}" \
      "${BASE}/trips/${TRIP_ID}/destination-insights?${query}&includeRag=1")
    check_http "GET destination-insights?includeRag=1" "$code"
    if [[ "$code" =~ ^2 ]]; then
      python3 - <<'PY'
import json
data = json.load(open("/tmp/di-ins-rag.json")).get("data", {})
raw = data.get("insights")
if isinstance(raw, list):
    rag = [e for e in raw if any((r.get("system") == "RAG") for r in (e.get("sourceRefs") or []))]
elif isinstance(raw, dict):
    rag = raw.get("rag") or []
else:
    rag = []
print(f"  rag entries: {len(rag)}")
if len(rag) > 3:
    print("  ✗ rag 超过 3 条上限")
    raise SystemExit(1)
for i, r in enumerate(rag[:3]):
    print(f"  [rag-{i}] {r.get('title')!r}")
PY
      if [[ $? -ne 0 ]]; then
        fail=$((fail + 1))
      fi
    fi
  fi
fi

echo ""
echo "=== 6. 前端契约测试 ==="
npm run test:destination-insights --silent 2>&1 | tail -8

echo ""
echo "========================================"
echo " 联调结果: pass=${pass} fail=${fail} warn=${warn}"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
echo ""
echo " UI 手工验证："
echo "   /dashboard/plan-studio?tripId=${TRIP_ID}"
if [[ -n "$PROBLEM_ID" ]]; then
  enc_prob=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROBLEM_ID}'))")
  echo "   &problemId=${enc_prob}"
fi
echo ""
echo " 步骤："
echo "   1. 打开决策空间 → 点一条冲突/决策问题"
echo "   2. 切到「证据」Tab → Network 应出现 GET .../destination-insights（非首屏）"
echo "   3. 证据列表应含 destination_knowledge 条目（若有 POI 准入类冲突）"
echo "   4. 下方「冲突解释」展示 bundle.insights；点「加载 RAG 补充洞察」再发 includeRag=1"
echo "========================================"
