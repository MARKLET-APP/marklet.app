# ─── Capacitor ───────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ─── MainActivity + AndroidBridge JS Interface ────────────────────────────────
-keep class com.marklet.app.** { *; }
-keepclassmembers class com.marklet.app.MainActivity$AndroidBridge {
    @android.webkit.JavascriptInterface public *;
}

# ─── Firebase ─────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ─── WebView / JavaScript Interface ──────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ─── OkHttp / Networking ─────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ─── Kotlin ───────────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# ─── Coroutines ───────────────────────────────────────────────────────────────
-keepclassmembernames class kotlinx.** { volatile <fields>; }

# ─── Keep line numbers for crash reports ─────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
