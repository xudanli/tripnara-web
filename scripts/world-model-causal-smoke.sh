#!/usr/bin/env bash
# 因果世界模型前端集成冒烟（vitest 聚合）
# Usage: ./scripts/world-model-causal-smoke.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

echo "== World model causal frontend smoke =="
echo ""

npx vitest run \
  src/lib/world-model-causal-smoke.test.ts \
  src/lib/world-model-segment-lock.test.ts \
  src/lib/route-run-confirmation.test.ts \
  src/lib/route-run-negotiation.test.ts \
  src/lib/physical-evidence-bundle.test.ts \
  src/lib/decision-strip-model.test.ts \
  src/lib/decision-cockpit-strip.test.ts \
  src/lib/iron-shield-evidence-ui.test.ts \
  src/utils/world-model-observability.test.ts \
  src/utils/world-model-observability.sentry.test.ts \
  src/lib/sentry-init.test.ts \
  src/utils/plan-studio-decision-strip-analytics.test.ts

echo ""
echo "OK: world model causal smoke passed"
