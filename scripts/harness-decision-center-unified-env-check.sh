#!/usr/bin/env bash
# Unified Decision Gateway — 平台 Secret 环境自检（7/7）
# 在 Staging pod / CI 上跑，需能读到平台注入的环境变量。
#
# 用法:
#   npm run decision-center:unified-env-check
#   bash scripts/harness-decision-center-unified-env-check.sh
set -euo pipefail

pass=0
fail=0

check_var() {
  local name="$1"
  local expected="${2:-}"
  local val="${!name:-}"
  if [[ -z "$val" ]]; then
    echo "✗ ${name} — 未设置"
    fail=$((fail + 1))
    return
  fi
  if [[ -n "$expected" && "$val" != "$expected" ]]; then
    echo "✗ ${name}=${val} — 期望 ${expected}"
    fail=$((fail + 1))
    return
  fi
  echo "✓ ${name}=${val}"
  pass=$((pass + 1))
}

echo "========================================"
echo " Unified Decision — ENV 自检 (7/7)"
echo "========================================"

check_var DECISION_GATEWAY_UNIFIED 1
check_var CANONICAL_ROAD_SEGMENT_UNAVAILABLE 1
check_var CANONICAL_WEATHER_ACTIVITY_PROHIBITED 1
check_var CANONICAL_EXCESSIVE_DAILY_LOAD 1
check_var RFC001_SHADOW_MODE 0
check_var DECISION_PACK_RUNTIME 1
check_var DECISION_PACK_RULES 1

echo ""
echo "结果: pass=${pass}/7 fail=${fail}"
if [[ "$fail" -gt 0 ]]; then
  echo "✗ Secret 未齐或 RFC001_SHADOW_MODE≠0（shadow 不写 Effective Plan）"
  exit 1
fi
echo "✓ ENV 7/7"
exit 0
