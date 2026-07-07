#!/usr/bin/env bash
# Travel Context + Exploration Consumer 联调脚本（RFC-003）
#
# 用法:
#   AUTH_TOKEN=<jwt> bash scripts/debug-travel-context-flow.sh
#   AUTH_TOKEN=<jwt> SCENARIO_ID=<uuid> bash scripts/debug-travel-context-flow.sh   # 已有 scenario
#   AUTH_TOKEN=<jwt> TRIP_ID=<uuid> bash scripts/debug-travel-context-flow.sh     # 场景 2 resolve
#
# 环境（与 .env.development 对齐）:
#   BACKEND_HOST / BACKEND_PORT  或 VITE_BACKEND_*
#   后端需: DECISION_GATEWAY_UNIFIED=1, EXPLORATION_CONSUMER_MVP_ENABLED=1
#
# 经 Vite 代理联调:
#   PROXY=1 AUTH_TOKEN=<jwt> bash scripts/debug-travel-context-flow.sh

set -euo pipefail

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
if [[ "${PROXY:-0}" == "1" ]]; then
  HOST="localhost"
  PORT="5173"
fi

API="http://${HOST}:${PORT}/api"
EXP="${API}/exploration"
TC="${API}/travel-contexts"
SCENARIO_ID="${SCENARIO_ID:-}"
TRIP_ID="${TRIP_ID:-}"
AUTH_TOKEN="${AUTH_TOKEN:-${ACCESS_TOKEN:-}}"
SKIP_INTENTS="${SKIP_INTENTS:-0}"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

log() { echo -e "${CYAN}$*${NC}"; }
ok() { echo -e "${GREEN}✅ $*${NC}"; pass=$((pass + 1)); }
bad() { echo -e "${RED}❌ $*${NC}"; fail=$((fail + 1)); }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "缺少命令: $1"; exit 1; }
}

json_ok() {
  node -e "
    const raw = process.argv[1];
    try {
      const d = JSON.parse(raw);
      process.stdout.write(d.success === true ? '1' : '0');
    } catch { process.stdout.write('0'); }
  " "$1"
}

json_get() {
  node -e "
    const d = JSON.parse(process.argv[1]);
    const path = process.argv[2].split('.');
    let v = d;
    for (const p of path) v = v?.[p];
    process.stdout.write(v == null ? '' : String(v));
  " "$1" "$2"
}

http_code() {
  node -e "
    try {
      const d = JSON.parse(process.argv[1]);
      process.stdout.write(String(d.statusCode || d.status || ''));
    } catch { process.stdout.write(''); }
  " "$1"
}

api() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local args=(-sS -m 30 -w "\n__HTTP__%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
  [[ -n "${AUTH_TOKEN}" ]] && args+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  if [[ -n "$body" ]]; then
    curl "${args[@]}" -d "$body"
  else
    curl "${args[@]}"
  fi
}

split_resp() {
  local raw="$1"
  HTTP_STATUS="${raw##*__HTTP__}"
  RESP="${raw%__HTTP__*}"
}

require_cmd curl
require_cmd node

echo ""
log "Travel Context 联调 → ${API}"
log "  PROXY=${PROXY:-0}  SCENARIO_ID=${SCENARIO_ID:-<create>}  TRIP_ID=${TRIP_ID:-<skip>}"
echo ""

# ── 0. 鉴权探针 ──
if [[ -z "${AUTH_TOKEN}" ]]; then
  warn "未设置 AUTH_TOKEN"
  raw="$(api GET "${TC}/00000000-0000-0000-0000-000000000001" 2>/dev/null || true)"
  if [[ -z "$raw" ]]; then
    bad "无法连接后端 ${API}（检查 BACKEND_HOST/PORT 或 PROXY=1 + npm run dev）"
  else
    split_resp "$raw"
    code="${HTTP_STATUS:-$(http_code "$RESP")}"
    if [[ "$code" == "401" || "$code" == "403" ]]; then
      ok "Travel Context 鉴权守卫 (${code})"
    elif [[ "$code" == "404" ]]; then
      bad "Travel Context 路由 404 — 后端可能未部署 RFC-003"
    else
      bad "无 TOKEN 探针异常 HTTP=${code} body=${RESP:0:200}"
    fi
  fi
  echo ""
  echo "请登录前端后从 DevTools → Application → sessionStorage → accessToken 复制 JWT，然后："
  echo "  AUTH_TOKEN=<jwt> bash scripts/debug-travel-context-flow.sh"
  echo ""
  echo "或经 Vite 代理："
  echo "  PROXY=1 AUTH_TOKEN=<jwt> bash scripts/debug-travel-context-flow.sh"
  exit 0
fi

# ── 1. Exploration catalog（Gate）──
log "1. GET /exploration/conditions/catalog"
raw="$(api GET "${EXP}/conditions/catalog?destinationCode=IS")"
split_resp "$raw"
if [[ "$(json_ok "$RESP")" == "1" ]]; then
  ok "Exploration catalog OK (HTTP ${HTTP_STATUS})"
else
  code="${HTTP_STATUS:-$(http_code "$RESP")}"
  if [[ "$code" == "503" || "$code" == "501" || "$code" == "404" ]]; then
    bad "Exploration 未开启 (HTTP ${code}) — 后端需 EXPLORATION_CONSUMER_MVP_ENABLED=1"
  else
    bad "Exploration catalog 失败 HTTP=${code} ${RESP:0:300}"
  fi
fi

# ── 2. 创建 scenario（若无 SCENARIO_ID）──
if [[ -z "${SCENARIO_ID}" ]]; then
  log "2. POST /exploration/scenarios"
  create_body='{"destinationCodes":["IS"],"dateRange":{"startDate":"2026-08-01","endDate":"2026-08-10"},"travelers":[{"type":"ADULT"},{"type":"ADULT"}],"budget":{"currency":"USD","min":3000,"max":6000},"mobilityContext":{"vehicleType":"4WD"}}'
  raw="$(api POST "${EXP}/scenarios" "$create_body")"
  split_resp "$raw"
  if [[ "$(json_ok "$RESP")" == "1" ]]; then
    SCENARIO_ID="$(json_get "$RESP" "data.scenarioId")"
    ok "创建 scenario → contextId=${SCENARIO_ID}"
  else
    bad "创建 scenario 失败 HTTP=${HTTP_STATUS} ${RESP:0:400}"
    echo ""
    echo "联调中止。检查后端日志与 Gate flags。"
    exit 1
  fi
else
  log "2. 使用已有 SCENARIO_ID=${SCENARIO_ID}"
  ok "跳过创建"
fi

CONTEXT_ID="${SCENARIO_ID}"

# ── 3. Travel Context snapshot ──
log "3. GET /travel-contexts/:contextId"
raw="$(api GET "${TC}/${CONTEXT_ID}")"
split_resp "$raw"
if [[ "$(json_ok "$RESP")" == "1" ]]; then
  REVISION="$(json_get "$RESP" "data.meta.revision")"
  STAGE="$(json_get "$RESP" "data.identity.stage")"
  ok "snapshot revision=${REVISION} stage=${STAGE}"
else
  bad "snapshot 失败 HTTP=${HTTP_STATUS} ${RESP:0:400}"
  warn "若 404：确认后端 Travel Context Phase 0+ 已部署"
fi

# ── 4. Views index + exploration + plan ──
for view in exploration plan decisions feasibility; do
  log "4. GET /travel-contexts/:contextId/views/${view}"
  raw="$(api GET "${TC}/${CONTEXT_ID}/views/${view}")"
  split_resp "$raw"
  if [[ "$(json_ok "$RESP")" == "1" ]]; then
    vrev="$(json_get "$RESP" "data.revision")"
    ok "view/${view} OK (revision=${vrev})"
    if [[ "${VERBOSE:-0}" == "1" ]]; then
      echo "${RESP}" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2).slice(0,2000))}catch{console.log(s.slice(0,500))}})"
    fi
  else
    bad "view/${view} 失败 HTTP=${HTTP_STATUS} ${RESP:0:300}"
  fi
done

# ── 5. Intent 探针（SET_PRINCIPLES 预览级）──
if [[ "${SKIP_INTENTS}" != "1" && -n "${REVISION:-}" ]]; then
  log "5. POST /travel-contexts/:contextId/intents (SET_PRINCIPLES)"
  intent_body="{\"type\":\"SET_PRINCIPLES\",\"basedOnRevision\":${REVISION},\"payload\":{\"principles\":[{\"principleId\":\"experience\",\"rank\":1},{\"principleId\":\"pace\",\"rank\":2}]}}"
  raw="$(api POST "${TC}/${CONTEXT_ID}/intents" "$intent_body")"
  split_resp "$raw"
  if [[ "$(json_ok "$RESP")" == "1" ]]; then
    NEW_REV="$(json_get "$RESP" "data.revision")"
    ok "SET_PRINCIPLES → revision ${REVISION} → ${NEW_REV}"
    REVISION="$NEW_REV"
  elif [[ "${HTTP_STATUS}" == "409" ]]; then
    warn "409 REVISION_CONFLICT — 刷新 snapshot 后重试（前端 Provider 已处理）"
    raw="$(api GET "${TC}/${CONTEXT_ID}")"
    split_resp "$raw"
    REVISION="$(json_get "$RESP" "data.meta.revision")"
    ok "refresh revision=${REVISION}"
  else
    bad "SET_PRINCIPLES 失败 HTTP=${HTTP_STATUS} ${RESP:0:400}"
  fi
else
  warn "5. 跳过 Intent 探针 (SKIP_INTENTS=1 或无 revision)"
fi

# ── 6. resolveFromTrip（场景 2）──
if [[ -n "${TRIP_ID}" ]]; then
  log "6. GET /travel-contexts/resolve/by-trip/:tripId"
  raw="$(api GET "${TC}/resolve/by-trip/${TRIP_ID}")"
  split_resp "$raw"
  if [[ "$(json_ok "$RESP")" == "1" ]]; then
    resolved="$(json_get "$RESP" "data.contextId")"
    ok "resolve trip → contextId=${resolved}"
    if [[ "$resolved" != "$CONTEXT_ID" ]]; then
      warn "contextId 与 scenarioId 不一致（materialize 后应相同）: ${resolved} vs ${CONTEXT_ID}"
    fi
  else
    bad "resolveFromTrip 失败 HTTP=${HTTP_STATUS} ${RESP:0:300}"
  fi
else
  log "6. 跳过 resolveFromTrip（设置 TRIP_ID=... 可测场景 2）"
fi

echo ""
log "── 汇总: ${pass} 通过 / ${fail} 失败 ──"
if [[ "$fail" -gt 0 ]]; then
  echo ""
  echo "前端 UI 联调路径:"
  echo "  http://localhost:5173/dashboard/explore"
  echo "  http://localhost:5173/dashboard/explore/${CONTEXT_ID}/conditions"
  echo ""
  echo "Trip 概览（场景 2）:"
  echo "  http://localhost:5173/dashboard/trips/<tripId>  → 旅行概览 Tab"
  exit 1
fi

echo ""
ok "API 联调通过。继续 UI："
echo "  explore → ${CONTEXT_ID}"
echo "  http://localhost:5173/dashboard/explore/${CONTEXT_ID}/principles"
echo ""
echo "VERBOSE=1 可打印 view payload 样例（供 adapter 对齐）"
