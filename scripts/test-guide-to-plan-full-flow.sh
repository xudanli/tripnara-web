#!/usr/bin/env bash
# Guide-to-Plan 全流程联调（对应前端 from-guide 各步骤）
#
# 用法:
#   AUTH_TOKEN=<jwt> bash scripts/test-guide-to-plan-full-flow.sh
#
# 可选:
#   SKIP_TRIP_CREATE=1     测到草案/对比/逐项，不创建正式 Trip
#   RUN_ACCEPT_ALL=1       额外开第二个会话测 accept_all（会再创建一条 Trip）

set -euo pipefail

BACKEND_HOST="${BACKEND_HOST:-10.107.236.54}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BASE="http://${BACKEND_HOST}:${BACKEND_PORT}/api/guide-to-plan"
SKIP_TRIP_CREATE="${SKIP_TRIP_CREATE:-0}"
RUN_ACCEPT_ALL="${RUN_ACCEPT_ALL:-0}"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

pass=0
fail=0
SESSION_ID=""
CANDIDATE_ID=""
FAITHFUL_ID=""

log() { echo -e "${CYAN}$*${NC}"; }
section() { echo -e "\n${BOLD}${CYAN}━━ $* ━━${NC}"; }
ok() { echo -e "${GREEN}✅ $*${NC}"; pass=$((pass + 1)); }
bad() { echo -e "${RED}❌ $*${NC}"; fail=$((fail + 1)); }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "缺少: $1"; exit 1; }; }

api() {
  local method="$1" path="$2" body="${3:-}"
  local args=()
  [[ -n "${AUTH_TOKEN:-}" ]] && args+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE}${path}" -H "Content-Type: application/json" "${args[@]}" -d "$body"
  else
    curl -sS -X "$method" "${BASE}${path}" "${args[@]}"
  fi
}

expect_success() {
  local resp="$1" label="$2"
  if [[ "$(node -e "try{process.stdout.write(String(JSON.parse(process.argv[1]).success))}catch{process.stdout.write('')}" "$resp")" == "true" ]]; then
    ok "$label"
    return 0
  fi
  bad "$label — $(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.message||JSON.stringify(d).slice(0,200))" "$resp" 2>/dev/null || echo "$resp")"
  return 1
}

session_resume() {
  api GET "/sessions/${SESSION_ID}"
}

assert_resume_contains() {
  local expect="$1"
  local resp="$2"
  local route
  route="$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.data?.resumeRoute||'')" "$resp")"
  if [[ "$route" == *"$expect"* ]] || [[ "$route" == "$expect" ]]; then
    ok "resumeRoute=${route} (含 ${expect})"
  else
    warn "resumeRoute=${route:-空}，预期含 ${expect}"
  fi
}

validate_candidate_detail() {
  local resp="$1" label="$2"
  node -e "
const d = JSON.parse(process.argv[1]);
const c = d.data?.candidate || d.data;
const days = c?.itineraryDraft?.days || [];
const diff = c?.comparisonDiff?.length || 0;
let acc=0, hotel=0;
for (const day of days) {
  if (day.accommodation?.name) acc++;
  if ((day.items||[]).some(i => String(i.type).toLowerCase()==='hotel')) hotel++;
}
const out = { variant: c?.variant, days: days.length, acc, hotel, diff, score: c?.feasibilityScore };
console.log(JSON.stringify(out));
if (days.length === 0) process.exit(2);
if (acc === 0) process.exit(3);
process.exit(0);
" "$resp" >/tmp/gtp-validate.json 2>/dev/null && {
    local info
    info="$(cat /tmp/gtp-validate.json)"
    ok "${label}: ${info}"
  } || bad "${label}: 草案字段不完整"
}

run_import_to_draft() {
  local tag="$1"
  local mode="${2:-full}"   # full | draft_only
  section "${tag} · 步骤 0 — 会话列表"
  list_resp="$(api GET "/sessions?limit=5&offset=0")"
  expect_success "$list_resp" "GET /sessions 分页"

  section "${tag} · 步骤 1 — 导入页 (import)"
  create_resp="$(api POST /sessions '{"countryCode":"IS","destination":"冰岛南岸"}')"
  expect_success "$create_resp" "POST /sessions" || return 1
  SESSION_ID="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.id)" "$create_resp")"
  ok "sessionId=${SESSION_ID}"

  preview_resp="$(api GET "/sessions/${SESSION_ID}/import/preview")"
  expect_success "$preview_resp" "GET /import/preview"

  GUIDE_TEXT='冰岛南岸三日自驾：塞里雅兰瀑布、斯科加瀑布、维克住宿、黑沙滩、冰河湖、钻石沙滩。注意冬季不建议夜间驾驶。'
  import_resp="$(api POST "/sessions/${SESSION_ID}/import" "$(node -e "console.log(JSON.stringify({sourceType:'text',title:'联调测试-${tag}',content:process.argv[1]}))" "$GUIDE_TEXT")")"
  expect_success "$import_resp" "POST /import"

  section "${tag} · 步骤 2 — 解析进度 (parsing)"
  parse_resp="$(api POST "/sessions/${SESSION_ID}/parse/async")"
  expect_success "$parse_resp" "POST /parse/async" || return 1

  deadline=$((SECONDS + 180))
  while (( SECONDS < deadline )); do
    status_resp="$(api GET "/sessions/${SESSION_ID}/parse/status")"
    st="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.status||'')" "$status_resp")"
    if [[ "$st" == "completed" ]]; then
      ok "parse/status=completed"
      break
    fi
    if [[ "$st" == "failed" ]]; then
      bad "解析失败"
      return 1
    fi
    sleep 3
  done

  sess_after_parse="$(session_resume)"
  assert_resume_contains "understanding" "$sess_after_parse" || assert_resume_contains "travel" "$sess_after_parse"

  section "${tag} · 步骤 3 — 理解摘要 (summary)"
  under_resp="$(api GET "/sessions/${SESSION_ID}/understanding")"
  expect_success "$under_resp" "GET /understanding" || return 1
  node -e "
const d=JSON.parse(process.argv[1]).data;
const n=(d.places||[]).length;
const pending=(d.pendingConfirmations||[]).filter(p=>p.required).map(p=>p.field);
console.log('places='+n+', requiredPending='+JSON.stringify(pending));
if(n<1) process.exit(1);
" "$under_resp" && ok "理解摘要 places>0" || bad "理解摘要无地点"

  section "${tag} · 步骤 4 — 出行条件 (travel_context)"
  ctx_resp="$(api PATCH "/sessions/${SESSION_ID}/travel-context" '{"startDate":"2026-08-01","endDate":"2026-08-06","transportMode":"self_drive","countryCode":"IS","travelerProfile":"couple","travelers":{"adults":2,"children":0,"seniors":0},"vehicleType":"4x4","preserveExperiences":["冰河湖","黑沙滩"]}')"
  expect_success "$ctx_resp" "PATCH /travel-context" || return 1

  under2="$(api GET "/sessions/${SESSION_ID}/understanding")"
  req_pending="$(node -e "
const pending=(JSON.parse(process.argv[1]).data.pendingConfirmations||[]).filter(p=>p.required);
process.stdout.write(String(pending.length));
" "$under2")"
  if [[ "${req_pending:-99}" == "0" ]]; then
    ok "必填 pendingConfirmations 已清空"
  else
    warn "仍有 ${req_pending} 个必填 pendingConfirmations"
  fi

  section "${tag} · 步骤 5 — 行程草案 (draft)"
  gen_resp="$(api POST "/sessions/${SESSION_ID}/generate" '{"variants":["faithful","comfortable","risk_min"]}')"
  expect_success "$gen_resp" "POST /generate" || return 1

  list_resp="$(api GET "/sessions/${SESSION_ID}/plan-candidates")"
  expect_success "$list_resp" "GET /plan-candidates" || return 1

  node -e "
const d=JSON.parse(process.argv[1]);
const arr=d.data?.candidates||d.data||[];
if(!Array.isArray(arr)) process.exit(1);
console.log(JSON.stringify(arr.map(c=>({id:c.id,variant:c.variant}))));
" "$list_resp" > /tmp/gtp-candidates.json

  candidate_count="$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/gtp-candidates.json')).length)")"
  ok "plan-candidates count=${candidate_count}"

  FAITHFUL_ID="$(node -e "const a=JSON.parse(require('fs').readFileSync('/tmp/gtp-candidates.json')); console.log(a.find(c=>c.variant==='faithful')?.id||a[0]?.id||'');")"
  CANDIDATE_ID="$FAITHFUL_ID"

  while read -r line; do
    cid="$(node -e "console.log(JSON.parse(process.argv[1]).id)" "$line")"
    variant="$(node -e "console.log(JSON.parse(process.argv[1]).variant)" "$line")"
    detail="$(api GET "/sessions/${SESSION_ID}/plan-candidates/${cid}")"
    validate_candidate_detail "$detail" "草案详情 ${variant}"
  done < <(node -e "JSON.parse(require('fs').readFileSync('/tmp/gtp-candidates.json')).forEach(x=>console.log(JSON.stringify(x)))")

  sess_draft="$(session_resume)"
  if [[ "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.status||'')" "$sess_draft")" == "draft_ready" ]]; then
    ok "session status=draft_ready"
  else
    warn "session status=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.status||'')" "$sess_draft")"
  fi

  section "${tag} · 步骤 6 — 原攻略对比 (compare)"
  detail="$(api GET "/sessions/${SESSION_ID}/plan-candidates/${CANDIDATE_ID}")"
  diff_len="$(node -e "const c=JSON.parse(process.argv[1]).data?.candidate||JSON.parse(process.argv[1]).data; console.log((c.comparisonDiff||[]).length)" "$detail")"
  if [[ "${diff_len:-0}" -gt 0 ]]; then
    ok "comparisonDiff 行数=${diff_len}"
  else
    warn "comparisonDiff 为空（后端可能无调整项）"
  fi

  if [[ "$mode" == "draft_only" ]]; then
    return 0
  fi

  if [[ "$SKIP_TRIP_CREATE" == "1" ]]; then
    warn "SKIP_TRIP_CREATE=1，跳过 review / accept / trip"
    return 0
  fi

  section "${tag} · 步骤 7 — 逐项确认 (review)"
  review_list="$(api GET "/sessions/${SESSION_ID}/plan-candidates/${CANDIDATE_ID}/review-items")"
  expect_success "$review_list" "GET /review-items" || return 1
  item_count="$(node -e "console.log((JSON.parse(process.argv[1]).data?.items||[]).length)" "$review_list")"
  ok "review-items count=${item_count}"

  accept_review="$(api POST "/sessions/${SESSION_ID}/accept" "{\"acceptanceMode\":\"review_items\",\"planCandidateId\":\"${CANDIDATE_ID}\"}")"
  if [[ "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).success))" "$accept_review")" == "true" ]]; then
    review_required="$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).data?.reviewRequired||''))" "$accept_review")"
    ok "POST /accept review_items reviewRequired=${review_required}"
  else
    bad "POST /accept review_items 失败"
    return 1
  fi

  section "${tag} · 步骤 8 — 确认落地 (trip)"
  keys="$(node -e "
const items=JSON.parse(process.argv[1]).data?.items||[];
const keys=items.filter(i=>i.defaultSelected!==false).map(i=>i.reviewKey);
console.log(JSON.stringify(keys));
" "$review_list")"
  if [[ "$keys" == "[]" ]]; then
    keys="$(node -e "const items=JSON.parse(process.argv[1]).data?.items||[]; console.log(JSON.stringify(items.slice(0,1).map(i=>i.reviewKey)));" "$accept_review")"
  fi

  confirm_resp="$(api POST "/sessions/${SESSION_ID}/plan-candidates/${CANDIDATE_ID}/confirm" "{\"planCandidateId\":\"${CANDIDATE_ID}\",\"acceptedItemKeys\":${keys}}")"
  expect_success "$confirm_resp" "POST /confirm" || return 1
  trip_id="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data?.tripId||'')" "$confirm_resp")"
  if [[ -n "$trip_id" ]]; then
    ok "tripId=${trip_id}"
  else
    bad "confirm 未返回 tripId"
    return 1
  fi

  sess_final="$(session_resume)"
  if [[ "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data.status||'')" "$sess_final")" == "accepted" ]]; then
    ok "session status=accepted"
  fi
  assert_resume_contains "trip" "$sess_final" || true
}

require_cmd curl
require_cmd node

log "Guide-to-Plan 全流程联调 → ${BASE}"

if [[ -z "${AUTH_TOKEN:-}" ]]; then
  bad "需要 AUTH_TOKEN"
  echo "  AUTH_TOKEN=<jwt> bash scripts/test-guide-to-plan-full-flow.sh"
  exit 1
fi

section "会话 A — review_items → confirm 全流程"
run_import_to_draft "A" || exit 1

if [[ "$RUN_ACCEPT_ALL" == "1" ]]; then
  section "会话 B — accept_all 快速验收"
  SESSION_ID=""
  CANDIDATE_ID=""
  run_import_to_draft "B" draft_only || true
  if [[ -n "$SESSION_ID" && -n "$CANDIDATE_ID" ]]; then
    accept_all="$(api POST "/sessions/${SESSION_ID}/accept" "{\"acceptanceMode\":\"accept_all\",\"planCandidateId\":\"${CANDIDATE_ID}\"}")"
    if [[ "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).success))" "$accept_all")" == "true" ]]; then
      trip_b="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).data?.tripId||'')" "$accept_all")"
      ok "accept_all tripId=${trip_b}"
    else
      bad "accept_all 失败"
    fi
  fi
fi

echo
echo -e "${BOLD}${CYAN}━━━━━━━━ 汇总 ━━━━━━━━${NC}"
echo -e "通过: ${GREEN}${pass}${NC}  失败: ${RED}${fail}${NC}"
[[ "$fail" -eq 0 ]]
