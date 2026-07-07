#!/usr/bin/env bash
# DECISION_SEMANTICS_FRONTEND_API.md §5 — 联调 QA checklist（自动化覆盖 DC-FE-014~017 + DC-FE-009）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INTEGRATION="src/trips/decision-semantics/frontend/decision-center-execution.integration.test.ts"

echo "§5 checklist — DC-FE-014 正常 apply → success + 行程 refresh gate"
npx vitest run "$INTEGRATION" -t "DC-FE-014"

echo "§5 checklist — DC-FE-015 连点确认 → replay，revision 逻辑 / 无二次 refresh"
npx vitest run "$INTEGRATION" -t "DC-FE-015"

echo "§5 checklist — DC-FE-016 Mock stale evidence → 不刷新行程"
npx vitest run "$INTEGRATION" -t "DC-FE-016"

echo "§5 checklist — DC-FE-017 Mock partial apply → warning + L1 pending"
npx vitest run "$INTEGRATION" -t "DC-FE-017"

echo "§5 checklist — DC-FE-009 刷新 gate（success only）"
npx vitest run src/trips/decision-semantics/frontend/decision-confirm-execution-gate.util.test.ts -t "refreshes itinerary only on success"

echo "✅ §5 checklist automated — 联调时请在后端 PR 确认 Harness Release Gate CI 全绿"
