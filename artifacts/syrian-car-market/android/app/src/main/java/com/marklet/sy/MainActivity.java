package com.marklet.sy;

import android.os.Bundle;
import android.webkit.CookieManager;
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
    }

    private void applyWebViewSettings() {
        WebView webView = this.bridge.getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();

        // JavaScript وخصائص الموقع
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // عرض صحيح للصفحة داخل WebView
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // إخفاء أدوات الزوم
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // السماح بالكوكيز — لحفظ تسجيل الدخول
        // ملاحظة: لا نُعيد setWebViewClient أو setWebChromeClient
        // لأن Capacitor يتولى إدارتها داخلياً عبر BridgeActivity
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
    }
}
