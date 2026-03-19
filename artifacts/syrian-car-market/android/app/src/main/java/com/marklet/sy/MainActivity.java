package com.marklet.sy;

import android.content.Intent;
import android.os.Bundle;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private GestureDetector gestureDetector;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        applyWebViewSettings();
        setupSwipeBackGesture();
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

        // عرض صحيح للصفحة
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // إخفاء أدوات الزوم
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // الكوكيز لحفظ تسجيل الدخول
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
    }

    /* ------------------------------------------------
       SWIPE BACK GESTURE
       السحب من اليسار للرجوع للصفحة السابقة
       ------------------------------------------------ */
    private void setupSwipeBackGesture() {
        gestureDetector = new GestureDetector(this,
            new GestureDetector.SimpleOnGestureListener() {
                @Override
                public boolean onFling(MotionEvent e1, MotionEvent e2,
                                       float velocityX, float velocityY) {
                    if (e1 == null || e2 == null) return false;
                    float deltaX = e2.getX() - e1.getX();
                    float deltaY = Math.abs(e2.getY() - e1.getY());
                    // سحب أفقي من اليمين لليسار بسرعة > 200
                    if (deltaX > 200 && deltaY < 150 && velocityX > 200) {
                        WebView wv = bridge.getWebView();
                        if (wv != null && wv.canGoBack()) {
                            wv.goBack();
                            return true;
                        }
                    }
                    return false;
                }
            });
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

    /* ------------------------------------------------
       DISPATCH TOUCH — يُمرّر الإيماءات للـ GestureDetector
       مع الحفاظ على Capacitor touch events
       ------------------------------------------------ */
    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        if (gestureDetector != null) {
            gestureDetector.onTouchEvent(event);
        }
        return super.dispatchTouchEvent(event);
    }

    /* ------------------------------------------------
       BACK BUTTON — الرجوع في WebView أو إغلاق التطبيق
       ------------------------------------------------ */
    @Override
    public void onBackPressed() {
        WebView webView = this.bridge.getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
