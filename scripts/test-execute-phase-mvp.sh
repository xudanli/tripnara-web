#!/usr/bin/env bash
# 执行阶段 MVP 联调（T-01~T-05 + 导航坐标 + 可选写链断言）
#
# 常规冒烟:
#   TRIP_ID=xxx npm run test:execute-phase-mvp
#
# 写链验证（后端需 EFFECTIVE_PLAN_WRITE_CHAIN=1）:
#   TEST_WRITE_CHAIN=1 TRIP_ID=xxx npm run test:execute-phase-mvp
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> 单元: execute-navigation.util"
npm run test:execute-phase-mvp:unit

echo ""
echo ">> API 冒烟"
"${SCRIPT_DIR}/test-execute-phase-apis.sh"

if [[ "${TEST_WRITE_CHAIN:-}" != "1" ]]; then
  echo ""
  echo ">> MVP 完成（跳过写链断言；设 TEST_WRITE_CHAIN=1 可校验 WRITE_CHAIN_BLOCKED + nextStop 坐标）"
  exit 0
fi

echo ""
echo "=== MVP 写链断言 (TEST_WRITE_CHAIN=1) ==="
mvp_fail=0

assert_next_stop_coords() {
  python3 - <<'PY'
import json, sys
s = json.load(open("/tmp/ex-state.json")).get("data", {})
ns = s.get("nextStop")
if not ns:
    print("✗ nextStop is null — 前端导航需 GET /trips/:id/state，无需 STATE_NOW")
    sys.exit(1)
place = ns.get("Place") or {}
lat, lng = place.get("latitude"), place.get("longitude")
if lat is None or lng is None:
    print(f"✗ nextStop.Place.latitude/longitude 缺失 (lat={lat}, lng={lng})")
    sys.exit(1)
print(f"✓ nextStop.Place coords lat={lat} lng={lng}")
PY
}

assert_write_chain_blocked() {
  if [[ ! -f /tmp/ex-apply.json ]]; then
    echo "✗ 未执行 apply（无可用 recommendation）；无法验证 WRITE_CHAIN_BLOCKED"
    return 1
  fi
  python3 - <<'PY'
import json, sys
d = json.load(open("/tmp/ex-apply.json"))
err = d.get("error") or {}
code = err.get("code")
if code == "WRITE_CHAIN_BLOCKED":
    print(f"✓ apply → {code}（EFFECTIVE_PLAN_WRITE_CHAIN=1 符合预期）")
    sys.exit(0)
print(f"✗ 期望 apply.error.code=WRITE_CHAIN_BLOCKED，实际 success={d.get('success')} code={code}")
sys.exit(1)
PY
}

assert_next_stop_coords || mvp_fail=$((mvp_fail + 1))
assert_write_chain_blocked || mvp_fail=$((mvp_fail + 1))

if [[ "$mvp_fail" -gt 0 ]]; then
  echo ""
  echo "=== MVP 写链断言失败: ${mvp_fail} ==="
  exit 1
fi

echo ""
echo "=== MVP 写链断言通过 ==="
