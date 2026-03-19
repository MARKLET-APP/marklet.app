#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║          MARKLET — Android APK Build Script                 ║
# ║   يقوم هذا السكريبت بتجهيز مشروع Capacitor للأندرويد       ║
# ╚══════════════════════════════════════════════════════════════╝
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  MARKLET Android Build — Starting   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─── 1. Build React app ──────────────────────────────────────
echo "▶ [1/4] Building React app with Vite..."

BASE_PATH="/" \
PORT="3000" \
API_PORT="8080" \
NODE_ENV="production" \
  pnpm --filter @workspace/syrian-car-market run build

echo "✔ Build complete → dist/public"
echo ""

# ─── 2. Init Capacitor (if android folder missing) ───────────
if [ ! -d "android" ]; then
  echo "▶ [2/4] Initializing Capacitor..."
  npx cap add android
  echo "✔ Android platform added"
else
  echo "▶ [2/4] Android folder exists, skipping cap add..."
fi
echo ""

# ─── 3. Network security config ──────────────────────────────
echo "▶ [3/4] Writing network security config..."

mkdir -p android/app/src/main/res/xml

cat > android/app/src/main/res/xml/network_security_config.xml << 'XMLEOF'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">marklet.sy</domain>
  </domain-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
XMLEOF

echo "✔ Network security config written"
echo ""

# ─── 4. Remove APK files from dist (prevent APK-in-APK bloat) ────
echo "▶ [4/5] Removing APK files from dist to avoid bloat..."
rm -f dist/public/*.apk
echo "✔ Cleaned dist/public"
echo ""

# ─── 5. Sync assets to Android ───────────────────────────────
echo "▶ [5/5] Syncing web assets to Android..."
npx cap sync android
echo "✔ Sync complete"
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║           ✅ تم الإعداد بنجاح                   ║"
echo "║                                                  ║"
echo "║  الخطوة التالية — لإنشاء APK:                   ║"
echo "║                                                  ║"
echo "║    npx cap open android                          ║"
echo "║    → Build > Generate Signed APK في Android Studio ║"
echo "║                                                  ║"
echo "║  أو لـ Debug APK مباشرة:                        ║"
echo "║    cd android && ./gradlew assembleDebug         ║"
echo "║    الملف: android/app/build/outputs/apk/debug/  ║"
echo "╚══════════════════════════════════════════════════╝"
