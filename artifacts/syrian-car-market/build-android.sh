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

# ─── 0. Android SDK Setup ────────────────────────────────────
echo "▶ [0/6] Checking Android SDK..."
if [ ! -f "/home/runner/jdk21/bin/java" ]; then
  echo "  → Downloading Adoptium JDK 21 (Ubuntu-compatible)..."
  curl -sL "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse" \
    -o /tmp/jdk21.tar.gz --max-time 120
  mkdir -p /home/runner/jdk21
  tar -xzf /tmp/jdk21.tar.gz --strip-components=1 -C /home/runner/jdk21
fi
export JAVA_HOME=/home/runner/jdk21
export ANDROID_HOME=/home/runner/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

if ! command -v sdkmanager &> /dev/null; then
  echo "  → Installing cmdline-tools..."
  CMDLINE_ZIP=/tmp/commandlinetools-linux-latest.zip
  if [ ! -f "$CMDLINE_ZIP" ]; then
    curl -sL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "$CMDLINE_ZIP"
  fi
  mkdir -p /tmp/cmdline-extract
  # Use adm-zip (pure Node.js) to avoid system unzip/jar segfault issues
  if [ ! -d /tmp/adm-zip-extract/node_modules/adm-zip ]; then
    mkdir -p /tmp/adm-zip-extract
    cd /tmp/adm-zip-extract
    npm init -y > /dev/null 2>&1
    npm install adm-zip > /dev/null 2>&1
    cd -
  fi
  node -e "
    const AdmZip = require('/tmp/adm-zip-extract/node_modules/adm-zip');
    const zip = new AdmZip('$CMDLINE_ZIP');
    zip.extractAllTo('/tmp/cmdline-extract', true);
    console.log('  → ZIP extracted successfully via Node.js');
  "
  mkdir -p $ANDROID_HOME/cmdline-tools/latest
  cp -r /tmp/cmdline-extract/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/
  chmod +x $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager
fi

if [ ! -d "$ANDROID_HOME/build-tools/34.0.0" ] || [ ! -d "$ANDROID_HOME/platforms/android-35" ]; then
  echo "  → Installing SDK packages (build-tools, platform, platform-tools)..."
  yes | sdkmanager --licenses > /dev/null 2>&1
  sdkmanager "build-tools;34.0.0" "platforms;android-35" "platform-tools" 2>&1 | tail -3
fi

echo "✔ Android SDK ready"
echo ""

# ─── 1. Build React app ──────────────────────────────────────
echo "▶ [1/6] Building React app with Vite..."

BASE_PATH="/" \
PORT="3000" \
API_PORT="8080" \
NODE_ENV="production" \
  pnpm --filter @workspace/syrian-car-market run build

echo "✔ Build complete → dist/public"
echo ""

# ─── 2. Init Capacitor (if android folder missing) ───────────
if [ ! -d "android" ]; then
  echo "▶ [2/6] Initializing Capacitor..."
  npx cap add android
  echo "✔ Android platform added"
else
  echo "▶ [2/6] Android folder exists, skipping cap add..."
fi
echo ""

# ─── 3. Network security config ──────────────────────────────
echo "▶ [3/6] Writing network security config..."

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
echo "▶ [4/6] Removing APK files from dist to avoid bloat..."
rm -f dist/public/*.apk
echo "✔ Cleaned dist/public"
echo ""

# ─── 5. Sync assets to Android ───────────────────────────────
echo "▶ [5/6] Syncing web assets to Android..."
npx cap sync android
echo "✔ Sync complete"
echo ""

# ─── 6. Gradle Build ─────────────────────────────────────────
echo "▶ [6/6] Building APK with Gradle..."
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleDebug --no-daemon --max-workers=2

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -sh "$APK_PATH" | cut -f1)
  cp "$APK_PATH" "../public/marklet-latest.apk"
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║           ✅ APK جاهز للتنزيل                   ║"
  echo "║                                                  ║"
  echo "║  الملف: public/marklet-latest.apk ($APK_SIZE)   ║"
  echo "╚══════════════════════════════════════════════════╝"
else
  echo "✗ APK not found — check Gradle logs above"
  exit 1
fi
