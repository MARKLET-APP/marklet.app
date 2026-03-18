package com.marklet.sy;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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

        WebSettings webSettings = webView.getSettings();

        // تشغيل JavaScript وخصائص التطبيق
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // عرض الصفحة بشكل صحيح داخل WebView
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);

        // إخفاء أدوات الزوم
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);

        // السماح بالكوكيز لحفظ تسجيل الدخول
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // منع فتح الروابط خارج التطبيق
        webView.setWebViewClient(new WebViewClient());

        // تشغيل الفيديو والخصائص المتقدمة
        webView.setWebChromeClient(new WebChromeClient());
    }
}
