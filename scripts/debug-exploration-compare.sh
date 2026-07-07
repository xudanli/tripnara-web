#!/usr/bin/env bash
# 联调：打印 compare 接口原始 dimensions 结构
# 用法: AUTH_TOKEN=xxx SCENARIO_ID=xxx ./scripts/debug-exploration-compare.sh

set -euo pipefail

HOST="${BACKEND_HOST:-${VITE_BACKEND_HOST:-127.0.0.1}}"
PORT="${BACKEND_PORT:-${VITE_BACKEND_PORT:-3000}}"
BASE="http://${HOST}:${PORT}/api/exploration"
SCENARIO_ID="${SCENARIO_ID:-}"
AUTH_TOKEN="${AUTH_TOKEN:-${ACCESS_TOKEN:-}}"

if [[ -z "${SCENARIO_ID}" ]]; then
  echo "SCENARIO_ID required" >&2
  exit 1
fi

hdr=(-H "Content-Type: application/json")
if [[ -n "${AUTH_TOKEN}" ]]; then
  hdr+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
fi

echo "GET ${BASE}/scenarios/${SCENARIO_ID}/candidates/compare"
resp="$(curl -sS "${hdr[@]}" "${BASE}/scenarios/${SCENARIO_ID}/candidates/compare")"

python3 - <<'PY' "${resp}"
import json, sys
raw = sys.argv[1]
try:
    body = json.loads(raw)
except json.JSONDecodeError:
    print(raw)
    sys.exit(0)

print(json.dumps(body, ensure_ascii=False, indent=2)[:12000])

data = body.get("data") if isinstance(body, dict) else None
if not isinstance(data, dict):
    print("\n[!] no data object")
    sys.exit(0)

print("\n--- top-level data keys ---")
print(sorted(data.keys()))

for key in ("dimensions", "compareDimensions", "compare", "compareMatrix"):
    if key in data:
        val = data[key]
        kind = type(val).__name__
        extra = ""
        if isinstance(val, list):
            extra = f" len={len(val)}"
            if val and isinstance(val[0], dict):
                extra += f" firstKeys={list(val[0].keys())[:8]}"
        elif isinstance(val, dict):
            extra = f" keys={list(val.keys())[:8]}"
        print(f"  {key}: {kind}{extra}")

cands = data.get("candidates")
if isinstance(cands, list) and cands:
    first = cands[0]
    if isinstance(first, dict):
        print(f"\n--- candidate[0] keys ---")
        print(sorted(first.keys()))
        if "compare" in first:
            print("  candidate.compare keys:", list(first["compare"].keys())[:10])
PY
