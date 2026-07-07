#!/usr/bin/env bash
# Guide-to-Plan API 联调脚本
#
# 用法:
#   AUTH_TOKEN=<jwt> bash scripts/test-guide-to-plan-api.sh
#   AUTH_TOKEN=<jwt> BACKEND_HOST=10.107.236.54 BACKEND_PORT=3000 bash scripts/test-guide-to-plan-api.sh
#
# 可选: SKIP_GENERATE=1  只测到 understanding，跳过 generate（耗时）

set -euo pipefail

BACKEND_HOST="${BACKEND_HOST:-10.107.236.54}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BASE="http://${BACKEND_HOST}:${BACKEND_PORT}/api/guide-to-plan"
SKIP_GENERATE="${SKIP_GENERATE:-0}"

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

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local extra_args=()
  if [[ -n "${AUTH_TOKEN:-}" ]]; then
    extra_args+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  fi
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE}${path}" \
      -H "Content-Type: application/json" \
      "${extra_args[@]}" \
      -d "$body"
  else
    curl -sS -X "$method" "${BASE}${path}" \
      "${extra_args[@]}"
  fi
}

json_get() {
  node -e "const d=JSON.parse(process.argv[1]); const k=process.argv[2].split('.'); let v=d; for (const p of k) v=v?.[p]; process.stdout.write(v==null?'':String(v));" "$1" "$2"
}

require_cmd curl
require_cmd node

log "Guide-to-Plan API 联调 → ${BASE}"

if [[ -z "${AUTH_TOKEN:-}" ]]; then
  warn "未设置 AUTH_TOKEN，接口将返回 401"
  resp="$(api GET /sessions || true)"
  code="$(node -e "try{const d=JSON.parse(process.argv[1]);process.stdout.write(String(d.statusCode||''))}catch{process.stdout.write('')}" "$resp")"
  if [[ "$code" == "401" ]]; then
    ok "鉴权守卫正常（401 Unauthorized）"
  else
    bad "预期 401，实际: ${resp:0:200}"
  fi
  echo
  echo "请设置 AUTH_TOKEN 后重跑完整流程："
  echo "  AUTH_TOKEN=<jwt> bash scripts/test-guide-to-plan-api.sh"
  exit 0
fi

# 1. 创建会话
log "1. POST /sessions"
create_resp="$(api POST /sessions '{"countryCode":"IS","destination":"冰岛南岸"}')"
if [[ "$(json_get "$create_resp" success)" != "true" ]]; then
  bad "创建会话失败: ${create_resp:0:300}"
  exit 1
fi
SESSION_ID="$(json_get "$create_resp" data.id)"
ok "sessionId=${SESSION_ID}"

# 2. 导入攻略
log "2. POST /import"
GUIDE_TEXT='冰岛南岸三日自驾：塞里雅兰瀑布、斯科加瀑布、维克住宿、黑沙滩、冰河湖。注意冬季不建议夜间驾驶。'
import_resp="$(api POST "/sessions/${SESSION_ID}/import" "$(node -e "console.log(JSON.stringify({sourceType:'text',title:'冰岛南岸测试',content:process.argv[1]}))" "$GUIDE_TEXT")")"
if [[ "$(json_get "$import_resp" success)" != "true" ]]; then
  bad "导入失败: ${import_resp:0:300}"
  exit 1
fi
ok "guideId=$(json_get "$import_resp" data.id)"

# 3. 导入预览
log "3. GET /import/preview"
preview_resp="$(api GET "/sessions/${SESSION_ID}/import/preview")"
if [[ "$(json_get "$preview_resp" success)" == "true" ]]; then
  ok "estimatedPlaces=$(json_get "$preview_resp" data.estimatedPlaces)"
else
  bad "import/preview 失败"
fi

# 4. 异步解析
log "4. POST /parse/async"
parse_resp="$(api POST "/sessions/${SESSION_ID}/parse/async")"
if [[ "$(json_get "$parse_resp" success)" != "true" ]]; then
  bad "parse/async 失败: ${parse_resp:0:300}"
  exit 1
fi
ok "jobId=$(json_get "$parse_resp" data.jobId)"

# 5. 轮询解析状态
log "5. GET /parse/status (poll)"
deadline=$((SECONDS + 180))
parse_done=0
while (( SECONDS < deadline )); do
  status_resp="$(api GET "/sessions/${SESSION_ID}/parse/status")"
  st="$(json_get "$status_resp" data.status)"
  prog="$(json_get "$status_resp" data.progress)"
  if [[ "$st" == "completed" ]]; then
    parse_done=1
    ok "解析完成 progress=${prog}"
    break
  fi
  if [[ "$st" == "failed" ]]; then
    bad "解析失败: $(json_get "$status_resp" data.error)"
    exit 1
  fi
  sleep 3
done
if [[ "$parse_done" != "1" ]]; then
  bad "解析超时（180s）"
  exit 1
fi

# 6. 理解摘要
log "6. GET /understanding"
under_resp="$(api GET "/sessions/${SESSION_ID}/understanding")"
if [[ "$(json_get "$under_resp" success)" != "true" ]]; then
  bad "understanding 失败"
  exit 1
fi
place_count="$(node -e "const d=JSON.parse(process.argv[1]); console.log((d.data?.places||[]).length)" "$under_resp")"
ok "places=${place_count}, suggestedTripDays=$(json_get "$under_resp" data.summary.suggestedTripDays)"

# 7. 出行条件
log "7. PATCH /travel-context"
ctx_resp="$(api PATCH "/sessions/${SESSION_ID}/travel-context" '{"startDate":"2026-08-01","endDate":"2026-08-06","transportMode":"self_drive","countryCode":"IS","travelerProfile":"couple","travelers":{"adults":2,"children":0,"seniors":0},"vehicleType":"4x4"}')"
if [[ "$(json_get "$ctx_resp" success)" == "true" ]]; then
  ok "travel-context 已更新"
else
  bad "travel-context 失败: ${ctx_resp:0:300}"
fi

if [[ "$SKIP_GENERATE" == "1" ]]; then
  warn "SKIP_GENERATE=1，跳过 generate / plan-candidates"
  echo
  echo "通过 ${pass}，失败 ${fail}"
  exit 0
fi

# 8. 生成草案
log "8. POST /generate"
gen_resp="$(api POST "/sessions/${SESSION_ID}/generate" '{"variants":["faithful","comfortable","risk_min"]}')"
if [[ "$(json_get "$gen_resp" success)" != "true" ]]; then
  bad "generate 失败: ${gen_resp:0:400}"
  exit 1
fi
candidate_id="$(node -e "
const d=JSON.parse(process.argv[1]);
const data=d.data;
const c=data?.candidate||data?.candidates?.[0]||(Array.isArray(data)?data[0]:null);
console.log(c?.id||'');
" "$gen_resp")"
if [[ -z "$candidate_id" ]]; then
  # generate 可能直接返回 candidates 数组
  candidate_id="$(node -e "const d=JSON.parse(process.argv[1]); const arr=d.data; console.log(Array.isArray(arr)&&arr[0]?.id?arr[0].id:'');" "$gen_resp")"
fi
ok "candidateId=${candidate_id}"

# 9. 草案列表
log "9. GET /plan-candidates"
list_resp="$(api GET "/sessions/${SESSION_ID}/plan-candidates")"
if [[ "$(json_get "$list_resp" success)" != "true" ]]; then
  bad "plan-candidates 失败"
  exit 1
fi
candidate_count="$(node -e "const d=JSON.parse(process.argv[1]); const arr=d.data?.candidates||d.data||[]; console.log(Array.isArray(arr)?arr.length:0)" "$list_resp")"
ok "candidates=${candidate_count}"

# 10. 草案详情 + accommodation 校验
log "10. GET /plan-candidates/:id"
detail_resp="$(api GET "/sessions/${SESSION_ID}/plan-candidates/${candidate_id}")"
if [[ "$(json_get "$detail_resp" success)" != "true" ]]; then
  bad "plan-candidate detail 失败"
  exit 1
fi

node -e "
const d = JSON.parse(process.argv[1]);
const candidate = d.data?.candidate || d.data;
const days = candidate?.itineraryDraft?.days || [];
let withAcc = 0;
let withHotelItem = 0;
for (const day of days) {
  if (day.accommodation && typeof day.accommodation === 'object' && day.accommodation.name) withAcc++;
  const items = day.items || [];
  if (items.some(i => String(i.type).toLowerCase() === 'hotel')) withHotelItem++;
}
console.log(JSON.stringify({ dayCount: days.length, withAcc, withHotelItem, variant: candidate?.variant }));
" "$detail_resp" | while read -r line; do
  day_count="$(node -e "console.log(JSON.parse(process.argv[1]).dayCount)" "$line")"
  with_acc="$(node -e "console.log(JSON.parse(process.argv[1]).withAcc)" "$line")"
  with_hotel="$(node -e "console.log(JSON.parse(process.argv[1]).withHotelItem)" "$line")"
  variant="$(node -e "console.log(JSON.parse(process.argv[1]).variant)" "$line")"
  ok "itineraryDraft days=${day_count}, accommodation对象=${with_acc}, hotel节点=${with_hotel}, variant=${variant}"
  if [[ "$day_count" -gt 0 && "$with_acc" -eq 0 ]]; then
    bad "days 有数据但无 accommodation 对象"
  fi
done

echo
echo -e "${CYAN}汇总: 通过 ${pass}，失败 ${fail}${NC}"
[[ "$fail" -eq 0 ]]
