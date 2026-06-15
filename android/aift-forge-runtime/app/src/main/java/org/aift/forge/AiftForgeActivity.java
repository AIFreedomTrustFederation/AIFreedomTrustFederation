package org.aift.forge;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class AiftForgeActivity extends Activity {
    private static final String HANDOFF_URL = "http://127.0.0.1:4177/api/health";
    private static final String FORGE_URL = "http://127.0.0.1:5173";
    private static final String DASHBOARD_URL = "http://127.0.0.1:3001/node-status";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startService(new Intent(this, AiftForgeRuntimeService.class));
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        setContentView(webView);
        webView.loadUrl(HANDOFF_URL);
        AiftForgeRuntimeManager.waitForForge(() -> runOnUiThread(() -> webView.loadUrl(FORGE_URL)));
        AiftForgeRuntimeManager.waitForDashboard(() -> runOnUiThread(() -> webView.loadUrl(DASHBOARD_URL)));
    }
}
