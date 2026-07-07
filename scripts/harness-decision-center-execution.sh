#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> DC-FE contracts (state machine unit)"
npm run contracts:decision-semantics

echo "==> DC-FE gate (shared confirm + refresh)"
npx vitest run src/trips/decision-semantics/frontend/decision-confirm-execution-gate.util.test.ts

echo "==> DC-FE integration (execution flow E2E mocks)"
npx vitest run src/trips/decision-semantics/frontend/decision-center-execution.integration.test.ts

echo "==> DC-FE regression (decision-center + repair-bridge)"
npx vitest run \
  src/lib/decision-center.util.test.ts \
  src/lib/decision-problem-repair-bridge.util.test.ts \
  src/trips/decision-semantics/frontend/decision-center-execution-state-machine.util.test.ts

echo "==> DC-FE L1 pending strip"
npx vitest run src/components/decision-problems/DecisionCenterPendingDecisionsStrip.test.ts

echo "==> §5 QA checklist (DC-FE-014~017 + DC-FE-009)"
npm run harness:section5

echo "✅ harness:decision-center-execution — all green"
