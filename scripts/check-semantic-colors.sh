#!/usr/bin/env bash
# TripNARA 语义色回归门禁 · 黑白灰 + success/warning/error
#
# 用法:
#   npm run check:semantic-colors
#   bash scripts/check-semantic-colors.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
warn=0

die() {
  echo "✗ $1"
  fail=$((fail + 1))
}

note() {
  echo "⚠ $1"
  warn=$((warn + 1))
}

pass() {
  echo "✓ $1"
}

echo "========================================"
echo " Semantic Colors Gate"
echo "========================================"

# ── 1. 决策产品面禁止 Tailwind 彩虹色阶（plan-studio / readiness / gate 核心）──
STRICT_PATHS=(
  'src/components/plan-studio'
  'src/pages/plan-studio'
  'src/components/readiness'
  'src/components/ui/gate-status-banner.tsx'
  'src/lib/gate-status.ts'
  'src/lib/semantic-ui-classes.ts'
)


TAILWIND_VIOLATION_PATTERN='(text|bg|border|ring|stroke|fill|from|to|via|hover:bg|hover:border|hover:text|dark:text|dark:bg|dark:border|border-l)-(green|red|blue|emerald|sky|teal|cyan|indigo|violet|purple|amber|yellow|orange|rose)-'

strict_matches=""
for p in "${STRICT_PATHS[@]}"; do
  if [[ -e "$p" ]]; then
    if [[ -d "$p" ]]; then
      m=$(grep -rE "$TAILWIND_VIOLATION_PATTERN" "$p" --include='*.tsx' --include='*.ts' 2>/dev/null || true)
    else
      m=$(grep -E "$TAILWIND_VIOLATION_PATTERN" "$p" 2>/dev/null || true)
    fi
    if [[ -n "$m" ]]; then
      # 忽略仅在行尾注释中出现的色阶名（如 // 旧: bg-orange-100）
      m=$(echo "$m" | while IFS= read -r line; do
        code="${line%%// *}"
        if echo "$code" | grep -qE "$TAILWIND_VIOLATION_PATTERN"; then
          echo "$line"
        fi
      done)
      if [[ -n "$m" ]]; then
        strict_matches+="$m"$'\n'
      fi
    fi
  fi
done

if [[ -n "$strict_matches" ]]; then
  die "决策产品面仍含 Tailwind 彩虹色阶类："
  echo "$strict_matches" | head -20
  count=$(echo "$strict_matches" | wc -l)
  if [[ "$count" -gt 20 ]]; then
    echo "  … 另有 $((count - 20)) 处"
  fi
else
  pass "决策产品面无 Tailwind 彩虹色阶类"
fi

# 全站扫描仅作警告（@theme 已映射遗留类名）
if all_matches=$(grep -rE "$TAILWIND_VIOLATION_PATTERN" src \
  --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$all_matches" ]]; then
    count=$(echo "$all_matches" | wc -l)
    note "全站仍有 ${count} 处彩虹色阶类（非决策面，@theme 已收敛渲染）"
  fi
fi

# ── 1b. 产品面禁止 nara-* Tailwind 类（Layer B 白名单除外）──
NARA_VIOLATION_PATTERN='nara-(glacier|tundra|lava)'
NARA_EXCLUDE_GREP='odyssey-intake|full-journey-map|pages/website|components/map/|brand-map-colors|globals\.css'
NARA_SKIP_FILES=(
  'ExecuteRouteMap.tsx'
  'MapboxTrailMap.tsx'
)

if nara_raw=$(grep -rE "$NARA_VIOLATION_PATTERN" src \
  --include='*.tsx' --include='*.ts' 2>/dev/null | grep -Ev "$NARA_EXCLUDE_GREP" || true); then
  nara_matches=""
  if [[ -n "$nara_raw" ]]; then
    for skip in "${NARA_SKIP_FILES[@]}"; do
      nara_raw=$(echo "$nara_raw" | grep -v "$skip" || true)
    done
    # 忽略纯注释行
    nara_matches=$(echo "$nara_raw" | while IFS= read -r line; do
      code="${line%%// *}"
      if echo "$code" | grep -qE "$NARA_VIOLATION_PATTERN"; then
        echo "$line"
      fi
    done)
  fi
  if [[ -n "$nara_matches" ]]; then
    die "产品面仍含 nara-* 品牌色类（Layer B 白名单除外）："
    echo "$nara_matches" | head -20
    count=$(echo "$nara_matches" | wc -l)
    if [[ "$count" -gt 20 ]]; then
      echo "  … 另有 $((count - 20)) 处"
    fi
  else
    pass "产品面无 nara-* Tailwind 类（Layer B 白名单除外）"
  fi
else
  pass "产品面无 nara-* Tailwind 类（Layer B 白名单除外）"
fi

# ── 2. 禁止语义色铺底 / 描边（仅允许 text-success|warning|error）──
SURFACE_VIOLATION_PATTERN='(bg|border|ring|from|to|via|hover:bg|hover:border|dark:bg|dark:border)-(success|warning|error)'

if surface_matches=$(grep -rE "$SURFACE_VIOLATION_PATTERN" src \
  --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$surface_matches" ]]; then
    die "发现语义色铺底/描边（卡片/Banner 必须中性）："
    echo "$surface_matches" | head -20
  else
    pass "无语义色铺底/描边"
  fi
else
  pass "无语义色铺底/描边"
fi

# ── 3. 禁止硬编码 Bootstrap / Tailwind 默认 Hex ──
FORBIDDEN_HEX_PATTERN='#(007bff|2563eb|3b82f6|38bdf8|4ade80|4CAF50|F44336|22c55e|ef4444|dc2626|16a34a|0ea5e9|0f766e|0284c7)'

if hex_matches=$(grep -rE "$FORBIDDEN_HEX_PATTERN" src \
  --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null || true); then
  hex_matches=$(echo "$hex_matches" | grep -v 'scripts/' || true)
  if [[ -n "$hex_matches" ]]; then
    die "发现禁止的硬编码 Hex（应使用 semantic-colors.ts 或 CSS token）："
    echo "$hex_matches" | head -15
  else
    pass "无禁止硬编码 Hex"
  fi
else
  pass "无禁止硬编码 Hex"
fi

# ── 4. design-tokens 主按钮不得为蓝色 ──
if grep -q "bg-blue-" src/utils/design-tokens.ts 2>/dev/null; then
  die "design-tokens.ts 仍含 bg-blue-*（主 CTA 应为 bg-primary）"
else
  pass "design-tokens.ts 主按钮未使用蓝色"
fi

# ── 5. globals 链接 hover 不得为 Bootstrap 蓝 ──
if grep -q '#007bff' src/styles/globals.css 2>/dev/null; then
  die "globals.css 仍含 #007bff"
else
  pass "globals.css 无 Bootstrap 蓝链接色"
fi

# ── 6. @theme 必须包含语义色收敛映射 ──
theme_ok=true
for token in '--color-success' '--color-warning' '--color-error' '--color-green-600' '--color-red-600' '--color-amber-600'; do
  if ! grep -F -- "$token" src/styles/globals.css >/dev/null 2>&1; then
    die "globals.css @theme 缺少 ${token} 语义映射"
    theme_ok=false
  fi
done
if [[ "$theme_ok" == true ]]; then
  pass "globals.css @theme 语义色映射完整"
fi

# ── 7. 核心常量文件存在 ──
for f in \
  src/lib/semantic-colors.ts \
  src/lib/semantic-ui-classes.ts \
  src/utils/design-tokens.ts; do
  if [[ ! -f "$f" ]]; then
    die "缺少核心色板文件: $f"
  fi
done
pass "核心色板文件齐全"

# ── 8. 可选警告：design-tokens 注释仍引用旧色名 ──
if grep -qE 'bg-red-50|text-blue-600' src/utils/design-tokens.ts 2>/dev/null; then
  note "design-tokens.ts 注释中仍提及旧 Tailwind 色名（非阻塞）"
fi

echo "========================================"
if [[ "$fail" -gt 0 ]]; then
  echo " FAILED — ${fail} error(s), ${warn} warning(s)"
  exit 1
fi
echo " PASSED — ${warn} warning(s)"
exit 0
