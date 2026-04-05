package com.lazemni.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        applyWebViewSettings();
        injectAndroidBridge();
    }

    /* ------------------------------------------------
       WEBVIEW SETTINGS
       ملاحظة: لا نُغيّر WebViewClient أو WebChromeClient
       لأن BridgeActivity تديرهما داخلياً — تغييرهما
       يكسر جسر Capacitor ويُسبّب الشاشة البيضاء.
       ------------------------------------------------ */
    private void applyWebViewSettings() {
        WebView webView = this.bridge.getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // تعطيل السحب للتحديث (يسبب خطأ 404 عند إعادة التحميل من URL داخلي)
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        // الكوكيز لحفظ تسجيل الدخول
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
    }

    /* ------------------------------------------------
       ANDROID BRIDGE — JavaScript Interface
       يُمكّن الموقع من استدعاء وظائف الهاتف
       Usage from JS: window.AndroidNative.share(url, title)
       ------------------------------------------------ */
    private void injectAndroidBridge() {
        WebView webView = this.bridge.getWebView();
        if (webView == null) return;
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidNative");
    }

    private class AndroidBridge {

        /* مشاركة رابط عبر تطبيقات الهاتف */
        @JavascriptInterface
        public void share(String url, String title) {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, url);
                if (title != null && !title.isEmpty()) {
                    intent.putExtra(Intent.EXTRA_SUBJECT, title);
                }
                startActivity(Intent.createChooser(intent, "مشاركة عبر"));
            });
        }

        /* رجوع للصفحة السابقة من JavaScript */
        @JavascriptInterface
        public void goBack() {
            runOnUiThread(() -> {
                WebView wv = bridge.getWebView();
                if (wv != null && wv.canGoBack()) {
                    wv.goBack();
                }
            });
        }

        /* التحقق من وجود WebView history */
        @JavascriptInterface
        public boolean canGoBack() {
            WebView wv = bridge.getWebView();
            return wv != null && wv.canGoBack();
        }
    }
}
