#!/usr/bin/env bash
# Capacitor 套壳初始化（首次执行）
# 用法: ./scripts/setup-capacitor-shell.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f capacitor.config.ts ]]; then
  echo "✗ 缺少 capacitor.config.ts"
  exit 1
fi

echo ">> 构建 Web 资源"
npm run build

if [[ ! -d android ]]; then
  echo ">> 添加 Android 工程"
  npx cap add android
fi

if [[ ! -d ios ]]; then
  echo ">> 添加 iOS 工程（需在 macOS 上构建）"
  npx cap add ios || echo "⚠ iOS 跳过（非 macOS 环境）"
fi

echo ">> 同步 Capacitor"
npx cap sync

cat <<'EOF'

✓ Capacitor 套壳就绪

下一步：
  Android: npx cap open android
  iOS:     npx cap open ios

开发时 Live Reload（手机与电脑同网）：
  1. vite.config / capacitor.config.ts 中配置 server.url 为本机 IP:5173
  2. npm run dev
  3. npx cap run android -l --external

对讲权限（需写入原生工程）：
  Android: BLUETOOTH_SCAN, BLUETOOTH_CONNECT, RECORD_AUDIO
  iOS: NSBluetoothAlwaysUsageDescription, NSMicrophoneUsageDescription

EOF
