#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods is required for Capacitor iOS."
  echo "Install: brew install cocoapods"
  exit 1
fi

npm run build

if [ ! -d ios ]; then
  npx cap add ios
fi

npx cap sync ios
echo "iOS project ready. Open with: npm run cap:ios"
